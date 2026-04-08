import itertools
import json
import re
import hashlib
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

import django_cas_ng.views
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.http import Http404, JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.csrf import csrf_exempt
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from functools import wraps

from . import forms, models, utils
from .majors_and_certificates.scripts.university_info import LANG_DEPTS
from .majors_and_certificates.scripts.verifier import (
    check_degree,
    check_major,
    get_courses_by_path,
)

SEARCH_RESULT_LIMIT = 200
SEARCH_CACHE_TIMEOUT_SECONDS = 300
SEARCH_CACHE_KEY_VERSION = "v1"
SEARCH_DEBUG_QUERY_LOG_MAX_LEN = 60


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
        has_major_options = models.Major.objects.exists()
        needs_year = instance.year is None
        needs_major = has_major_options and not instance.major
        needs_onboarding = needs_year or needs_major

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

        return render(request, "tigerpath/index.html", context)
    else:
        return landing(request)


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

    # Fetch quality ratings for all results in parallel and embed them
    ids = [c["id"] for c in course_info_list]
    if ids:
        ratings = {}
        with ThreadPoolExecutor(max_workers=min(len(ids), 20)) as executor:
            futures = {executor.submit(_fetch_quality_rating, cid): cid for cid in ids}
            for future in as_completed(futures):
                cid, rating = future.result()
                ratings[cid] = rating
        for c in course_info_list:
            c["quality_rating"] = ratings.get(c["id"])

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


# updates user's schedules with added courses
@login_required
def update_schedule(request):
    current_user = request.user.profile
    current_user.user_schedule = json.loads(request.POST.get("schedule", "[]"))
    current_user.save()
    return JsonResponse({"status": "ok"})


# returns user's existing schedule
@login_required
def get_schedule(request):
    curr_user = request.user.profile
    schedule = populate_user_schedule(curr_user.user_schedule) or []

    # make sure that the schedule has 9 semesters
    while len(schedule) < 9:
        schedule.append([])

    # Fetch missing ratings for all scheduled courses in parallel
    missing = [
        course for semester in schedule for course in semester
        if not course.get('external') and course.get('quality_rating') is None and course.get('id')
    ]
    if missing:
        ids = [course['id'] for course in missing]
        ratings = {}
        with ThreadPoolExecutor(max_workers=min(len(ids), 20)) as executor:
            futures = {executor.submit(_fetch_quality_rating, cid): cid for cid in ids}
            for future in as_completed(futures):
                cid, rating = future.result()
                ratings[cid] = rating
        for course in missing:
            course['quality_rating'] = ratings.get(course['id'])

    return JsonResponse(schedule, safe=False)


# returns requirements satisfied
@login_required
def get_requirements(request):
    curr_user = request.user.profile
    schedule = populate_user_schedule(curr_user.user_schedule)

    requirements = []
    if curr_user.major:
        if curr_user.major.supported:
            requirements.append(check_major(curr_user.major.code, schedule, curr_user.year))
        else:
            # appends user major name so we can display error message
            requirements.append(curr_user.major.name)
        requirements.append(check_degree(curr_user.major.degree, schedule, curr_user.year))

    return JsonResponse(requirements, safe=False)


@login_required
def update_schedule_and_get_requirements(request):
    update_schedule(request)
    return get_requirements(request)


@login_required
def get_profile(request):
    curr_user = request.user.profile
    profile = {}
    profile["classYear"] = curr_user.year
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
