import itertools
import json
import re
import hashlib
import time
import copy
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

import django_cas_ng.views
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.http import Http404, JsonResponse
from django.shortcuts import redirect, render
from django.core.files.uploadhandler import MemoryFileUploadHandler
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from functools import wraps

from . import forms, models, utils
from .transcript import (
    MAX_TRANSCRIPT_BYTES,
    TranscriptError,
    extract_text,
    parse_transcript_text,
    semester_index,
)
from .majors_and_certificates.scripts.university_info import LANG_DEPTS
from .majors_and_certificates.scripts.verifier import (
    check_degree,
    check_major,
    check_minor,
    get_courses_by_path,
    list_minor_definitions,
)

SEARCH_RESULT_LIMIT = 200
MAX_PLANS_PER_USER = 5
MAX_MAJORS_PER_PLAN = 3
SEARCH_CACHE_TIMEOUT_SECONDS = 300
SEARCH_CACHE_KEY_VERSION = "v1"
SEARCH_DEBUG_QUERY_LOG_MAX_LEN = 60
DEFAULT_PLAN_NAME = "My Plan"
# Which planner frontend a user sees; "classic" keeps the original React UI.
UI_VERSIONS = ("new", "classic")
DEFAULT_UI_VERSION = "new"


def get_ui_version(profile):
    ui_version = (profile.user_state or {}).get("ui_version")
    return ui_version if ui_version in UI_VERSIONS else DEFAULT_UI_VERSION


def get_minor_options_catalog():
    return list_minor_definitions()


def get_minor_codes():
    return {minor["code"] for minor in get_minor_options_catalog()}


def get_minor_name_by_code(code):
    for minor in get_minor_options_catalog():
        if minor["code"] == code:
            return minor["name"]
    return None


# cas auth login
@csrf_exempt
def login(request):
    if request.user.is_authenticated:
        return redirect("index")
    else:
        return django_cas_ng.views.LoginView.as_view()(request)


# cas auth logout
def logout(request):
    success_msg = "You have been successfully logged out."
    messages.success(request, success_msg)
    return django_cas_ng.views.LogoutView.as_view()(request)


# index page
def index(request):
    # check if the user is authenticated
    if request.user.is_authenticated:
        instance = models.UserProfile.objects.get(user_id=request.user.id)
        # add settings form
        settings_form = forms.SettingsForm(instance=instance)
        context = {"settings_form": settings_form}

        # check user state
        user_state = instance.user_state or {}
        needs_year = instance.year is None
        needs_onboarding = needs_year

        if needs_onboarding:
            # Always collect missing profile basics before showing the planner UI.
            context["onboarding_form"] = forms.OnboardingForm(instance=instance)

            # Keep onboarding status in sync if this user was previously marked complete.
            if user_state.get("onboarding_complete"):
                user_state["onboarding_complete"] = False
                instance.user_state = user_state
                instance.save(update_fields=["user_state"])
        elif not user_state.get("onboarding_complete"):
            # show tutorial
            context["show_tutorial"] = True
            user_state["onboarding_complete"] = True
            instance.user_state = user_state
            instance.save(update_fields=["user_state"])

        # Pre-compute requirements so the right sidebar renders instantly.
        # Requirements should always come from the active plan's major/minors settings.
        preloaded_requirements = []
        active_plan = get_active_plan(instance)
        try:
            preloaded_requirements = build_requirements_for_plan(instance, active_plan)
        except Exception:
            preloaded_requirements = []
        context["preloaded_requirements_json"] = json.dumps(preloaded_requirements)
        # Onboarding still lives in the classic template until the new UI ships its own flow.
        if get_ui_version(instance) == "new" and not needs_onboarding:
            return render(request, "tigerpath/index_new.html", context)
        return render(request, "tigerpath/index.html", context)
    else:
        return render(request, "tigerpath/new_landing.html")


# landing page
def landing(request):
    return render(request, "tigerpath/landing.html", None)


# about page
def about(request):
    return render(request, "tigerpath/about.html", None)


# privacy policy page
def privacy_policy(request):
    return render(request, "tigerpath/privacy.html", None)


# save the info on the onboarding page
@login_required
def save_onboarding(request):
    if request.method == "POST":
        instance = models.UserProfile.objects.get(user_id=request.user.id)
        form = forms.OnboardingForm(request.POST, instance=instance)

        if form.is_valid():
            profile = form.save(commit=False)
            profile.user = request.user
            profile.save()
            return redirect("index")

        settings_form = forms.SettingsForm(instance=instance)
        context = {"settings_form": settings_form, "onboarding_form": form}
        return render(request, "tigerpath/index.html", context, status=400)

    raise Http404


# save the info on the user settings page
@login_required
def save_user_settings(request):
    update_profile(request, forms.SettingsForm)
    return redirect("index")


# checks whether the form data is valid and returns the updated user profile
def update_profile(request, profile_form):
    # if this is a POST request we need to process the form data
    if request.method == "POST":
        # create a form instance and populate it with data from the request
        instance = models.UserProfile.objects.get(user_id=request.user.id)
        form = profile_form(request.POST, instance=instance)
        # check whether it's valid:
        if form.is_valid():
            # save data to database and redirect to app
            profile = form.save(commit=False)
            if "theme" in form.cleaned_data:
                user_state = profile.user_state or {}
                user_state["theme"] = form.cleaned_data["theme"]
                profile.user_state = user_state
            profile.user = request.user
            profile.save()
    # if it's any other request, we raise a 404 error
    else:
        raise Http404


# get onboarding initial values from tigerbook
def get_onboarding_initial_values(username):
    majors = models.Major.objects.all()
    initial_values = {}
    student_json = utils.get_student_info(username)
    if student_json:
        # get first name
        if student_json["first_name"]:
            initial_values["nickname"] = student_json["first_name"]
        # get class year
        if student_json["class_year"]:
            initial_values["year"] = student_json["class_year"]
        # get major code
        if student_json["major_code"]:
            tigerbook_major_code = student_json["major_code"]
            # handle the way tigerbook stores major codes
            if tigerbook_major_code == "COS":
                major_code = tigerbook_major_code + "-" + student_json["major_type"]
                initial_values["major"] = majors.get(code=major_code).pk
            elif tigerbook_major_code == "FRE ITA":
                initial_values["major"] = majors.get(code="FIT").pk
            elif tigerbook_major_code == "SPA POR":
                initial_values["major"] = majors.get(code="SPO").pk
            else:
                initial_values["major"] = majors.get(code=tigerbook_major_code)
    return initial_values


def convert_courses(course_list, queries):
    course_info_list = []
    for course in course_list:
        course_info = {}
        course_info["title"] = course.title
        course_info["id"] = course.registrar_id
        course_info["name"] = course.cross_listings
        course_info["semester_list"] = course.all_semesters
        course_info["dist_area"] = course.dist_area
        course_info["semester"] = get_semester_type(course.all_semesters)
        course_info_list.append(course_info)

    # sort list by dept and code
    course_info_list = sorted(course_info_list, key=lambda course: course["name"])
    # show searched dept first
    for query in queries:
        if len(query) == 3 and query.isalpha():
            course_info_list = sorted(
                course_info_list,
                key=lambda course: not (course["name"].startswith(query.upper())),
            )
    return course_info_list


JUNCTION_ENGINE_BASE_URL = "https://junction-engine.tigerapps.org"
JUNCTION_EVAL_CACHE_TIMEOUT = 3600       # per-course detail cache: 1 hour
JUNCTION_EVAL_CACHE_VERSION = "v5"       # bump to bust stale per-course entries
JUNCTION_COURSES_ALL_CACHE_KEY = "junction_courses_all_v1"
JUNCTION_COURSES_ALL_CACHE_TIMEOUT = 6 * 3600  # courses/all cache: 6 hours


def _term_code_to_name(code):
    """
    Convert a term code integer to a human-readable semester name.
    Format: 1{YY}{S} where YY = ending school-year digits, S = 2(Fall) or 4(Spring).
    Examples: 1262 -> "Fall 2025", 1264 -> "Spring 2026"
    """
    try:
        s = str(int(code))
        year = int(s[1:3])
        season = s[3]
        if season == '2':
            return f'Fall 20{year - 1:02d}'
        if season == '4':
            return f'Spring 20{year:02d}'
    except (ValueError, IndexError, TypeError):
        pass
    return str(code)


@login_required
def get_course_details(request, course_id):
    import logging
    logger = logging.getLogger(__name__)

    empty = {
        "has_pdf": False, "dists": [], "offerings": [],
        "quality_rating": None, "comments": [], "comments_semester": None, "description": "",
    }

    cache_key = f"course_details_{JUNCTION_EVAL_CACHE_VERSION}_{course_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return JsonResponse(cached)

    try:
        eval_resp = requests.get(
            f"{JUNCTION_ENGINE_BASE_URL}/api/evaluations/{course_id}",
            timeout=5,
            headers={"User-Agent": "TigerPath/1.0"},
        )
        if eval_resp.status_code != 200:
            return JsonResponse(empty)

        evaluations = eval_resp.json().get("data", [])
        if not evaluations:
            return JsonResponse(empty)

        evaluations.sort(key=lambda e: e.get("evalTerm", ""), reverse=True)
        most_recent = evaluations[0]
        most_recent_term = most_recent.get("evalTerm")

        courses_all = cache.get(JUNCTION_COURSES_ALL_CACHE_KEY)
        if courses_all is None:
            try:
                all_resp = requests.get(
                    f"{JUNCTION_ENGINE_BASE_URL}/api/courses/all",
                    timeout=30,
                    headers={"User-Agent": "TigerPath/1.0"},
                )
                courses_all = all_resp.json().get("data", []) if all_resp.status_code == 200 else []
            except Exception:
                courses_all = []
            cache.set(JUNCTION_COURSES_ALL_CACHE_KEY, courses_all, JUNCTION_COURSES_ALL_CACHE_TIMEOUT)

        instructors_by_term = {}
        has_pdf = False
        dists = []
        for c in courses_all:
            if c.get("listingId") == course_id:
                term_key = str(c.get("term", ""))
                names = ", ".join(
                    i.get("name", "") for i in c.get("instructors", []) if i.get("name")
                )
                if names:
                    instructors_by_term[term_key] = names
                if c.get("gradingBasis", "") in ("FUL", "PDF"):
                    has_pdf = True
                if not dists:
                    dists = c.get("dists", [])

        description = ""
        try:
            db_course = models.Course.objects.filter(registrar_id=course_id).first()
            if db_course:
                description = db_course.description or ""
        except Exception:
            pass

        offerings = []
        for ev in evaluations:
            term = ev.get("evalTerm")
            raw_rating = ev.get("rating")
            offerings.append({
                "semester": _term_code_to_name(term),
                "professors": instructors_by_term.get(term, ""),
                "rating": round(float(raw_rating), 2) if raw_rating is not None else None,
            })

        comments = [c for c in most_recent.get("comments", []) if c and c.strip()]
        comments_semester = _term_code_to_name(most_recent_term)
        raw_rating = most_recent.get("rating")
        quality_rating = round(float(raw_rating), 2) if raw_rating is not None else None

        data = {
            "has_pdf": has_pdf, "dists": dists, "offerings": offerings,
            "quality_rating": quality_rating, "comments": comments,
            "comments_semester": comments_semester, "description": description,
        }
        cache.set(cache_key, data, JUNCTION_EVAL_CACHE_TIMEOUT)
        return JsonResponse(data)

    except Exception as e:
        logger.error("get_course_details(%s): %s", course_id, e)
        return JsonResponse(empty)


def _fetch_quality_rating(course_id):
    """Return (course_id, quality_rating) — checks cache first, then fetches evaluations only."""
    cache_key = f"course_details_{JUNCTION_EVAL_CACHE_VERSION}_{course_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return course_id, cached.get("quality_rating")
    try:
        eval_resp = requests.get(
            f"{JUNCTION_ENGINE_BASE_URL}/api/evaluations/{course_id}",
            timeout=5,
            headers={"User-Agent": "TigerPath/1.0"},
        )
        if eval_resp.status_code != 200:
            return course_id, None
        evaluations = eval_resp.json().get("data", [])
        if not evaluations:
            return course_id, None
        evaluations.sort(key=lambda e: e.get("evalTerm", ""), reverse=True)
        raw_rating = evaluations[0].get("rating")
        rating = round(float(raw_rating), 2) if raw_rating is not None else None
        return course_id, rating
    except Exception:
        return course_id, None


@login_required
def get_quality_ratings(request):
    """
    POST {"ids": ["COS126", "MAT201", ...]}
    Returns {"COS126": 4.2, "MAT201": null, ...}
    Fetches all ratings in parallel; cached results resolve instantly.
    """
    try:
        body = json.loads(request.body)
        ids = body.get("ids", [])
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({"error": "invalid body"}, status=400)

    if not ids:
        return JsonResponse({})

    ids = ids[:200]
    ratings = {}
    with ThreadPoolExecutor(max_workers=min(len(ids), 20)) as executor:
        futures = {executor.submit(_fetch_quality_rating, cid): cid for cid in ids}
        for future in as_completed(futures):
            cid, rating = future.result()
            ratings[cid] = rating

    return JsonResponse(ratings)


# filters courses with query from react and sends back a list of filtered courses to display
@login_required
def get_courses(request, search_query):
    search_start = time.monotonic()

    # split only by first digit occurrance ex: cee102a -> [cee, 102a]
    split_query = re.split(r"(\d.*)", search_query)
    queries = []
    # split again by spaces
    for query in split_query:
        queries = queries + query.split(" ")
    queries = [query.strip() for query in queries if query.strip()]

    def truncate_for_log(value):
        if len(value) <= SEARCH_DEBUG_QUERY_LOG_MAX_LEN:
            return value
        return value[: SEARCH_DEBUG_QUERY_LOG_MAX_LEN - 3] + "..."

    if len(queries) == 0:
        if settings.DEBUG:
            print("[search-cache] SKIP empty query", flush=True)
        return JsonResponse([], safe=False)

    normalized_query = " ".join(queries).lower()
    cache_key_hash = hashlib.sha1(normalized_query.encode("utf-8")).hexdigest()
    cache_key = f"course-search:{SEARCH_CACHE_KEY_VERSION}:{SEARCH_RESULT_LIMIT}:{cache_key_hash}"
    cached_results = cache.get(cache_key)
    if cached_results is not None:
        if settings.DEBUG:
            elapsed_ms = (time.monotonic() - search_start) * 1000
            print(
                "[search-cache] HIT "
                f"key={cache_key_hash[:10]} "
                f'query="{truncate_for_log(normalized_query)}" '
                f"count={len(cached_results)} "
                f"elapsed_ms={elapsed_ms:.1f}",
                flush=True,
            )
        return JsonResponse(cached_results, safe=False)
    elif settings.DEBUG:
        print(
            "[search-cache] MISS "
            f"key={cache_key_hash[:10]} "
            f'query="{truncate_for_log(normalized_query)}"',
            flush=True,
        )

    course_list = filter_courses(queries)
    course_list = course_list.only(
        "title", "registrar_id", "cross_listings", "all_semesters", "dist_area"
    )[:SEARCH_RESULT_LIMIT]
    course_info_list = convert_courses(course_list, queries)

    for c in course_info_list:
        c["quality_rating"] = None

    cache.set(cache_key, course_info_list, timeout=SEARCH_CACHE_TIMEOUT_SECONDS)
    if settings.DEBUG:
        elapsed_ms = (time.monotonic() - search_start) * 1000
        print(
            "[search-cache] STORE "
            f"key={cache_key_hash[:10]} "
            f'query="{truncate_for_log(normalized_query)}" '
            f"count={len(course_info_list)} "
            f"elapsed_ms={elapsed_ms:.1f}",
            flush=True,
        )
    return JsonResponse(course_info_list, safe=False)


# returns list of courses that match a requirement
@login_required
def get_req_courses(request, req_path):
    # put the slashes back in
    req_path = req_path.replace("$", "//")
    # prevents duplicate courses to be added in search results
    search_results = set([])
    course_list, dist_list = get_courses_by_path(req_path)

    def _update_search_results(crs):
        crs = crs.split("/")[0]  # only lookup the first listing
        if "*" in crs:  # wildcard listing, could be multiple courses
            crs = crs.replace("*", "").split(" ")
            search_results.update(set(filter_courses(crs, allow_failure=True)))
        else:  # explicit course listing
            try:
                search_results.add(
                    models.Course_Listing.objects.get(
                        dept=crs.split(" ")[0], number=crs.split(" ")[1]
                    ).course
                )
            except Exception:  # if course not found, ignore and move on
                pass

    for course in course_list:
        if "LANG" in course:
            for lang in list(LANG_DEPTS.keys()):
                _update_search_results(course.replace("LANG", lang))
        else:
            _update_search_results(course)
    for dist in dist_list:
        search_results.update(set(models.Course.objects.filter(dist_area=dist)))
    course_info_list = convert_courses(list(search_results), course_list)
    return JsonResponse(course_info_list, safe=False)


def filter_courses(queries, allow_failure=False):
    """
    Returns a list of courses filtered by query

    If allow_failure is False, silently drop any queries that filter down to
    zero results in order to provide the best possible non-empty search
    results on user searches in case of typos.
    Setting it to True will allow failure (filtering down to empty), and is
    useful when the searches are not user defined and should not have typos.
    """
    cleaned_queries = [query.strip() for query in queries if query and query.strip()]
    if len(cleaned_queries) == 0:
        return models.Course.objects.none()

    results = models.Course.objects.all()
    has_applied_filter = False

    for query in cleaned_queries:
        query_upper = query.upper()
        if len(query) == 3 and query.isalpha():
            # might be a 3-letter departmental code
            filtered_results = results.filter(course_listing_set__dept__iexact=query_upper)
            filtered_results = filtered_results.distinct()
        elif (len(query) <= 3 and query.isdigit()) or (
            len(query) == 4 and query[:3].isdigit()
        ):
            # might be a course number
            filtered_results = results.filter(course_listing_set__number__istartswith=query_upper)
            filtered_results = filtered_results.distinct()
        else:
            # might be part of a course title
            filtered_results = results.filter(title__icontains=query)

        if allow_failure:
            results = filtered_results
            has_applied_filter = True
            continue

        if filtered_results.exists():
            results = filtered_results
            has_applied_filter = True
            continue
        # if reaches this line, query returned no results, so drop and move on

    if not has_applied_filter:
        # none of the queries were valid
        return models.Course.objects.none()

    return results.distinct()


# returns 'fall', 'spring', or 'both' depending on the list of semesters
def get_semester_type(all_semesters):
    all_semesters = "".join(all_semesters)
    if "f" in all_semesters and "s" in all_semesters:
        return "both"
    elif "f" in all_semesters:
        return "fall"
    else:
        return "spring"


# populate the courses in the user schedule with metadata from database
def populate_user_schedule(schedule):
    if not schedule:
        return None
    db_courses = models.Course.objects.all()
    for course in itertools.chain(*schedule):
        if "external" in course and course["external"]:
            course["semester"] = "external"
            course["dist_area"] = None
        else:
            db_course = db_courses.get(registrar_id=course["id"])
            course["name"] = db_course.cross_listings
            course["title"] = db_course.title
            course["dist_area"] = db_course.dist_area
            course["semester_list"] = db_course.all_semesters
            course["semester"] = get_semester_type(db_course.all_semesters)
            if "settled" not in course:
                course["settled"] = []
            if "quality_rating" not in course:
                cache_key = f"course_details_{JUNCTION_EVAL_CACHE_VERSION}_{course['id']}"
                cached = cache.get(cache_key)
                course["quality_rating"] = cached.get("quality_rating") if cached else None
    return schedule


def ensure_minimum_schedule(schedule):
    populated_schedule = populate_user_schedule(schedule) or []
    while len(populated_schedule) < 9:
        populated_schedule.append([])
    return populated_schedule

def build_requirements_for_plan(profile, plan):
    if not profile.year:
        return []

    schedule = populate_user_schedule(plan.schedule)
    requirements = []

    if plan.major:
        if plan.major.supported:
            try:
                requirements.append(check_major(plan.major.code, schedule, profile.year))
            except Exception:
                requirements.append(plan.major.name)
        else:
            # appends user major name so we can display error message
            requirements.append(plan.major.name)
        try:
            requirements.append(check_degree(plan.major.degree, schedule, profile.year))
        except Exception:
            pass

    for minor_code in plan.minors or []:
        try:
            requirements.append(check_minor(minor_code, schedule, profile.year))
        except ValueError:
            continue

    return requirements


def get_plan_majors(plan):
    """Primary major first, then the plan's additional majors (missing ids skipped)."""
    majors = [plan.major] if plan.major else []
    extra_ids = [i for i in (plan.additional_major_ids or []) if i != plan.major_id]
    if extra_ids:
        by_id = models.Major.objects.in_bulk(extra_ids)
        majors.extend(by_id[i] for i in extra_ids if i in by_id)
    return majors


def _check_major_or_name(major, schedule, year):
    if not major.supported:
        return major.name
    try:
        return check_major(major.code, schedule, year)
    except Exception:
        return major.name


def build_grouped_requirements(profile, plan):
    """Requirements for every major and minor on the plan (new UI only), grouped by kind."""
    grouped = {"majors": [], "minors": []}
    if not profile.year:
        return grouped

    schedule = populate_user_schedule(plan.schedule)
    for major in get_plan_majors(plan):
        grouped["majors"].append(_check_major_or_name(major, schedule, profile.year))

    for minor_code in plan.minors or []:
        try:
            grouped["minors"].append(check_minor(minor_code, schedule, profile.year))
        except ValueError:
            continue

    return grouped


def get_active_plan(profile):
    plans = profile.schedule_plans.order_by("id")
    if not plans.exists():
        created_plan = models.SchedulePlan.objects.create(
            user_profile=profile,
            name=DEFAULT_PLAN_NAME,
            major=profile.major,
            minors=[],
            schedule=profile.user_schedule or [],
        )
        user_state = profile.user_state or {}
        user_state["active_plan_id"] = created_plan.id
        profile.user_state = user_state
        profile.save(update_fields=["user_state"])
        return created_plan

    user_state = profile.user_state or {}
    active_plan_id = user_state.get("active_plan_id")
    active_plan = None
    if active_plan_id:
        active_plan = plans.filter(id=active_plan_id).first()
    if not active_plan:
        active_plan = plans.first()
        user_state["active_plan_id"] = active_plan.id
        profile.user_state = user_state
        profile.save(update_fields=["user_state"])
    return active_plan


def serialize_plan(plan, active_plan_id):
    # Include plan-specific academic metadata so the frontend can edit/render each scenario independently.
    majors = get_plan_majors(plan)
    minor_names = []
    for minor_code in plan.minors or []:
        minor_name = get_minor_name_by_code(minor_code)
        if minor_name:
            minor_names.append(minor_name)

    return {
        "id": plan.id,
        "name": plan.name,
        "isActive": plan.id == active_plan_id,
        "majorId": plan.major_id,
        "majorName": plan.major.name if plan.major else None,
        "majorIds": [major.id for major in majors],
        "majorNames": [major.name for major in majors],
        "minorCodes": plan.minors or [],
        "minorNames": minor_names,
    }


def get_user_plans_payload(profile):
    active_plan = get_active_plan(profile)
    plans = [
        serialize_plan(plan, active_plan.id)
        for plan in profile.schedule_plans.order_by("id")
    ]
    return {
        "plans": plans,
        "activePlanId": active_plan.id,
    }


def parse_plan_id(raw_plan_id):
    try:
        return int(raw_plan_id)
    except (TypeError, ValueError):
        return None


def parse_minor_codes(raw_minor_codes):
    if raw_minor_codes is None:
        return []

    try:
        parsed = json.loads(raw_minor_codes)
    except (TypeError, json.JSONDecodeError):
        return None

    if not isinstance(parsed, list):
        return None

    certificate_codes = get_minor_codes()
    cleaned_codes = []
    for value in parsed:
        code = str(value).strip().upper()
        if not code:
            continue
        if code in certificate_codes and code not in cleaned_codes:
            cleaned_codes.append(code)

    return cleaned_codes


def parse_major_ids(raw_major_ids):
    """JSON list of Major ids -> deduplicated, existing ids in order, or None if invalid."""
    try:
        parsed = json.loads(raw_major_ids)
    except (TypeError, json.JSONDecodeError):
        return None
    if not isinstance(parsed, list):
        return None

    major_ids = []
    for value in parsed:
        major_id = parse_plan_id(value)
        if major_id is None:
            return None
        if major_id not in major_ids:
            major_ids.append(major_id)

    if len(major_ids) > MAX_MAJORS_PER_PLAN:
        return None
    if models.Major.objects.filter(id__in=major_ids).count() != len(major_ids):
        return None
    return major_ids


def serialize_plan_editor_options():
    # Frontend modal uses these precomputed option lists for its major and minor selectors.
    major_options = [
        {
            "id": major.id,
            "name": major.name,
            "code": major.code,
            "degree": major.degree,
        }
        for major in models.Major.objects.order_by("name")
    ]
    minor_options = [
        {
            "code": minor_option["code"],
            "name": minor_option["name"],
            "supported": True,
        }
        for minor_option in get_minor_options_catalog()
    ]
    return {
        "majorOptions": major_options,
        "minorOptions": minor_options,
        "maxMajors": MAX_MAJORS_PER_PLAN,
    }


@login_required
def get_plans(request):
    return JsonResponse(get_user_plans_payload(request.user.profile))


@login_required
def create_plan(request):
    if request.method != "POST":
        raise Http404

    profile = request.user.profile
    if profile.schedule_plans.count() >= MAX_PLANS_PER_USER:
        return JsonResponse({"error": f"Plans are limited to {MAX_PLANS_PER_USER}."}, status=400)

    active_plan = get_active_plan(profile)

    plan_count = profile.schedule_plans.count()
    name = (request.POST.get("name") or "").strip() or f"Plan {plan_count + 1}"
    created_plan = models.SchedulePlan.objects.create(
        user_profile=profile,
        name=name,
        major=None,
        minors=[],
        schedule=[],
    )

    user_state = profile.user_state or {}
    user_state["active_plan_id"] = created_plan.id
    profile.user_state = user_state
    profile.save(update_fields=["user_state"])
    return JsonResponse(get_user_plans_payload(profile))


@login_required
def copy_plan(request):
    if request.method != "POST":
        raise Http404

    profile = request.user.profile
    if profile.schedule_plans.count() >= MAX_PLANS_PER_USER:
        return JsonResponse({"error": f"Plans are limited to {MAX_PLANS_PER_USER}."}, status=400)

    active_plan = get_active_plan(profile)
    source_plan_id = parse_plan_id(request.POST.get("sourcePlanId"))
    source_plan = active_plan
    if source_plan_id:
        source_plan = profile.schedule_plans.filter(id=source_plan_id).first()
        if not source_plan:
            return JsonResponse({"error": "Source plan not found"}, status=404)

    default_copy_name = f"{source_plan.name} Copy"
    name = (request.POST.get("name") or "").strip() or default_copy_name
    copied_schedule = copy.deepcopy(source_plan.schedule or [])
    # Copy preserves both classes and academic metadata for quick what-if planning.
    created_plan = models.SchedulePlan.objects.create(
        user_profile=profile,
        name=name,
        major=source_plan.major,
        minors=source_plan.minors or [],
        additional_major_ids=list(source_plan.additional_major_ids or []),
        schedule=copied_schedule,
    )

    user_state = profile.user_state or {}
    user_state["active_plan_id"] = created_plan.id
    profile.user_state = user_state
    profile.save(update_fields=["user_state"])
    return JsonResponse(get_user_plans_payload(profile))


@login_required
def rename_plan(request):
    if request.method != "POST":
        raise Http404

    profile = request.user.profile
    plan_id = parse_plan_id(request.POST.get("planId"))
    plan = profile.schedule_plans.filter(id=plan_id).first()
    if not plan:
        return JsonResponse({"error": "Plan not found"}, status=404)

    name = (request.POST.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "Plan name is required"}, status=400)
    if len(name) > 80:
        return JsonResponse({"error": "Plan name must be 80 characters or fewer"}, status=400)

    plan.name = name
    plan.save(update_fields=["name", "updated_at"])
    return JsonResponse(get_user_plans_payload(profile))


@login_required
def delete_plan(request):
    if request.method != "POST":
        raise Http404

    profile = request.user.profile
    plans = profile.schedule_plans.order_by("id")
    if plans.count() <= 1:
        return JsonResponse(
            {"error": "At least one plan is required"},
            status=400,
        )

    plan_id = parse_plan_id(request.POST.get("planId"))
    plan = plans.filter(id=plan_id).first()
    if not plan:
        return JsonResponse({"error": "Plan not found"}, status=404)

    active_plan = get_active_plan(profile)
    if active_plan.id == plan.id:
        replacement_plan = plans.exclude(id=plan.id).first()
        user_state = profile.user_state or {}
        user_state["active_plan_id"] = replacement_plan.id
        profile.user_state = user_state
        profile.save(update_fields=["user_state"])

    plan.delete()
    return JsonResponse(get_user_plans_payload(profile))


@login_required
def set_active_plan(request):
    if request.method != "POST":
        raise Http404

    profile = request.user.profile
    plan_id = parse_plan_id(request.POST.get("planId"))
    plan = profile.schedule_plans.filter(id=plan_id).first()
    if not plan:
        return JsonResponse({"error": "Plan not found"}, status=404)

    user_state = profile.user_state or {}
    user_state["active_plan_id"] = plan.id
    profile.user_state = user_state
    profile.save(update_fields=["user_state"])
    return JsonResponse(get_user_plans_payload(profile))


@login_required
def get_plan_editor_options(request):
    return JsonResponse(serialize_plan_editor_options())


@login_required
def update_plan_settings(request):
    if request.method != "POST":
        raise Http404

    profile = request.user.profile
    plan_id = parse_plan_id(request.POST.get("planId"))
    plan = profile.schedule_plans.filter(id=plan_id).first()
    if not plan:
        return JsonResponse({"error": "Plan not found"}, status=404)

    name = (request.POST.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "Plan name is required"}, status=400)
    if len(name) > 80:
        return JsonResponse({"error": "Plan name must be 80 characters or fewer"}, status=400)

    if "majorIds" in request.POST:
        # New UI: the full ordered list of majors; the first one is the primary.
        major_ids = parse_major_ids(request.POST.get("majorIds"))
        if major_ids is None:
            return JsonResponse(
                {"error": f"Choose up to {MAX_MAJORS_PER_PLAN} valid majors."}, status=400
            )
        major = models.Major.objects.get(id=major_ids[0]) if major_ids else None
        additional_major_ids = major_ids[1:]
    else:
        # Classic UI: only the primary major; keep any additional majors the new UI set.
        major_id = parse_plan_id(request.POST.get("majorId"))
        major = None
        if major_id is not None:
            major = models.Major.objects.filter(id=major_id).first()
            if not major:
                return JsonResponse({"error": "Major not found"}, status=404)
        additional_major_ids = [
            i for i in (plan.additional_major_ids or []) if not major or i != major.id
        ]

    minor_codes = parse_minor_codes(request.POST.get("minorCodes"))
    if minor_codes is None:
        return JsonResponse({"error": "Invalid minor selections"}, status=400)

    # Title, majors, and minors are saved together so the popup behaves like a single form.
    plan.name = name
    plan.major = major
    plan.additional_major_ids = additional_major_ids
    plan.minors = minor_codes
    plan.save(
        update_fields=["name", "major", "additional_major_ids", "minors", "updated_at"]
    )
    return JsonResponse(get_user_plans_payload(profile))


def get_requested_plan(request, profile):
    """The plan named by ?planId= (read-only compare view), else the active plan.

    Looking up a plan this way never changes which plan is active. Returns None when
    planId is given but is not one of this user's plans.
    """
    raw_plan_id = request.GET.get("planId") if request.method == "GET" else None
    if raw_plan_id in (None, ""):
        return get_active_plan(profile)
    plan_id = parse_plan_id(raw_plan_id)
    if plan_id is None:
        return None
    return profile.schedule_plans.filter(id=plan_id).first()


def get_posted_plan(request, profile):
    """The plan a save names with planId, else the active plan (the classic UI sends none).

    Naming the plan means a save always lands on the plan it was loaded from, even if the active
    plan changed while the request was in flight. Returns None for a plan the user does not own.
    """
    raw_plan_id = request.POST.get("planId")
    if raw_plan_id in (None, ""):
        return get_active_plan(profile)
    plan_id = parse_plan_id(raw_plan_id)
    if plan_id is None:
        return None
    return profile.schedule_plans.filter(id=plan_id).first()


def save_posted_schedule(request):
    """Write the posted schedule to its plan and return that plan (None if it is not the user's)."""
    plan = get_posted_plan(request, request.user.profile)
    if plan is not None:
        plan.schedule = json.loads(request.POST.get("schedule", "[]"))
        plan.save(update_fields=["schedule", "updated_at"])
    return plan


def plan_not_found():
    return JsonResponse({"error": "Plan not found"}, status=404)


def requirements_response(request, profile, plan):
    # The new UI asks for every major and minor on the plan; the classic response is unchanged.
    if request.GET.get("layout") == "grouped":
        return JsonResponse(build_grouped_requirements(profile, plan))
    return JsonResponse(build_requirements_for_plan(profile, plan), safe=False)


# updates user's schedules with added courses
@login_required
def update_schedule(request):
    if save_posted_schedule(request) is None:
        return plan_not_found()
    return JsonResponse({"status": "ok"})


# returns user's existing schedule (the active plan, or ?planId=)
@login_required
def get_schedule(request):
    profile = request.user.profile
    plan = get_requested_plan(request, profile)
    if plan is None:
        return plan_not_found()
    schedule = ensure_minimum_schedule(plan.schedule)
    return JsonResponse(schedule, safe=False)


# returns requirements satisfied
@login_required
def get_requirements(request):
    curr_user = request.user.profile
    plan = get_requested_plan(request, curr_user)
    if plan is None:
        return plan_not_found()
    return requirements_response(request, curr_user, plan)


# saves the schedule to the plan it names (planId), then returns that plan's requirements
@login_required
def update_schedule_and_get_requirements(request):
    plan = save_posted_schedule(request)
    if plan is None:
        return plan_not_found()
    return requirements_response(request, request.user.profile, plan)


def match_transcript_courses(entries):
    """(dept, number) -> catalog Course for every course code on the transcript."""
    from django.db.models import Q

    codes = {(e.dept, e.number) for e in entries}
    if not codes:
        return {}
    query = Q()
    for dept, number in codes:
        query |= Q(dept=dept, number=number)
    matched = {}
    listings = (
        models.Course_Listing.objects.filter(query)
        .select_related("course")
        .order_by("-course__is_master", "-course__id")
    )
    for listing in listings:
        matched.setdefault((listing.dept, listing.number), listing.course)
    return matched


TRANSCRIPT_TOO_LARGE = "Upload a transcript PDF under 2 MB."


# TIG-282: parse an uploaded transcript PDF into a preview. Nothing is stored and nothing is saved;
# the client adds the courses the student confirms through the normal schedule save.
# The upload must never touch disk: oversized requests are refused before the body is read, and
# the rest use only the in-memory upload handler (Django would otherwise spool large files to a
# temporary file). Upload handlers can only be swapped before CSRF checking reads the body, hence
# csrf_exempt here with csrf_protect on the inner view.
@csrf_exempt
def import_transcript(request):
    try:
        content_length = int(request.META.get("CONTENT_LENGTH") or 0)
    except ValueError:
        content_length = 0
    # Room for the multipart headers around the file itself.
    if content_length > MAX_TRANSCRIPT_BYTES + 64 * 1024:
        return JsonResponse({"error": TRANSCRIPT_TOO_LARGE}, status=400)
    request.upload_handlers = [MemoryFileUploadHandler(request)]
    return _import_transcript(request)


@csrf_protect
@login_required
def _import_transcript(request):
    if request.method != "POST":
        raise Http404
    upload = request.FILES.get("transcript")
    if upload is None:
        return JsonResponse({"error": "Choose your transcript PDF to upload."}, status=400)
    if upload.size > MAX_TRANSCRIPT_BYTES:
        return JsonResponse({"error": TRANSCRIPT_TOO_LARGE}, status=400)
    try:
        entries = parse_transcript_text(extract_text(upload.read()))
    except TranscriptError as error:
        return JsonResponse({"error": str(error)}, status=400)

    class_year = request.user.profile.year
    matched = match_transcript_courses(entries)
    courses = []
    unmatched = []
    for entry in entries:
        course = matched.get((entry.dept, entry.number))
        if course is None:
            unmatched.append(entry.code)
            continue
        courses.append(
            {
                "code": entry.code,
                "term": entry.term_label,
                "status": entry.status,
                "semesterIndex": semester_index(entry.season, entry.year, class_year),
                "course": convert_courses([course], [])[0],
            }
        )
    return JsonResponse(
        {"classYear": class_year, "courses": courses, "unmatched": sorted(set(unmatched))}
    )


@login_required
def set_ui_version(request):
    if request.method != "POST":
        raise Http404

    ui_version = request.POST.get("uiVersion")
    if ui_version not in UI_VERSIONS:
        return JsonResponse({"error": "Invalid UI version"}, status=400)

    profile = request.user.profile
    user_state = profile.user_state or {}
    user_state["ui_version"] = ui_version
    profile.user_state = user_state
    profile.save(update_fields=["user_state"])
    return JsonResponse({"uiVersion": ui_version})


@login_required
def get_profile(request):
    curr_user = request.user.profile
    profile = {}
    profile["classYear"] = curr_user.year
    profile["theme"] = (curr_user.user_state or {}).get("theme", "purple")
    profile["activePlanId"] = get_active_plan(curr_user).id
    profile["uiVersion"] = get_ui_version(curr_user)
    return JsonResponse(profile)

def admin_required(view_func):
    """Custom decorator to bounce non-admins to the home page with an error."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Not logged in, so send to login page
        if not request.user.is_authenticated:
            return redirect('login')
        
        # Not an admin, so send to home page
        if not request.user.is_staff:
            messages.error(request, "Access Denied: You must be an Admin to view the admin dashboard.")
            return redirect('index')
            
        # Admin, so go to admin page
        return view_func(request, *args, **kwargs)
    return _wrapped_view

@admin_required
def admin_dashboard(request):
    if request.method == 'POST':
        action = request.POST.get('action')
        netid = request.POST.get('netid')

        try:
            target_user = User.objects.get(username=netid)

            if action == 'add':
                if target_user.is_staff:
                    messages.error(request, f"{netid} is already an admin.")
                else:
                    target_user.is_staff = True
                    target_user.save()
                    messages.success(request, f"Successfully made {netid} an admin.")

            elif action == 'remove':
                # Only superusers (Owners) can remove admins
                if not request.user.is_superuser:
                    messages.error(request, "Action Denied: You must be an Owner to remove admins.")
                elif target_user.is_superuser:
                    messages.error(request, "You cannot remove an owner's admin status!")
                else:
                    target_user.is_staff = False
                    target_user.save()
                    messages.success(request, f"Successfully removed admin rights from {netid}.")
            
            elif action == 'add_owner':
                if not request.user.is_superuser:
                    messages.error(request, "Action Denied: You must be an Owner to add owners.")
                elif target_user.is_superuser:
                   messages.error(request, f"{netid} is already an owner.")
                else: 
                    target_user.is_staff = True
                    target_user.is_superuser = True
                    target_user.save()
                    messages.success(request, f"Successfully made {netid} an owner.")

        except User.DoesNotExist:
            messages.error(request, f"User with NetID {netid} not found.")

        return redirect('admin_dashboard')

    return render(request, 'tigerpath/admin/admin_dashboard.html')
