import itertools
import json
import re
import hashlib
import time
import copy

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
    check_minor,
    get_courses_by_path,
    list_minor_definitions,
)

SEARCH_RESULT_LIMIT = 200
SEARCH_CACHE_TIMEOUT_SECONDS = 300
SEARCH_CACHE_KEY_VERSION = "v1"
SEARCH_DEBUG_QUERY_LOG_MAX_LEN = 60
DEFAULT_PLAN_NAME = "My Plan"


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
    }


@login_required
def get_plans(request):
    return JsonResponse(get_user_plans_payload(request.user.profile))


@login_required
def create_plan(request):
    if request.method != "POST":
        raise Http404

    profile = request.user.profile
    active_plan = get_active_plan(profile)

    plan_count = profile.schedule_plans.count()
    name = (request.POST.get("name") or "").strip() or f"Plan {plan_count + 1}"
    # Creating a plan starts a fresh schedule, but inherits current plan metadata as a starting scenario.
    created_plan = models.SchedulePlan.objects.create(
        user_profile=profile,
        name=name,
        major=active_plan.major,
        minors=active_plan.minors or [],
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

    major_id = parse_plan_id(request.POST.get("majorId"))
    major = None
    if major_id is not None:
        major = models.Major.objects.filter(id=major_id).first()
        if not major:
            return JsonResponse({"error": "Major not found"}, status=404)

    minor_codes = parse_minor_codes(request.POST.get("minorCodes"))
    if minor_codes is None:
        return JsonResponse({"error": "Invalid minor selections"}, status=400)

    # Title, major, and minors are saved together so the popup behaves like a single form.
    plan.name = name
    plan.major = major
    plan.minors = minor_codes
    plan.save(update_fields=["name", "major", "minors", "updated_at"])
    return JsonResponse(get_user_plans_payload(profile))


# updates user's schedules with added courses
@login_required
def update_schedule(request):
    profile = request.user.profile
    active_plan = get_active_plan(profile)
    active_plan.schedule = json.loads(request.POST.get("schedule", "[]"))
    active_plan.save(update_fields=["schedule", "updated_at"])
    return JsonResponse({"status": "ok"})


# returns user's existing schedule
@login_required
def get_schedule(request):
    profile = request.user.profile
    active_plan = get_active_plan(profile)
    schedule = ensure_minimum_schedule(active_plan.schedule)
    return JsonResponse(schedule, safe=False)


# returns requirements satisfied
@login_required
def get_requirements(request):
    curr_user = request.user.profile
    active_plan = get_active_plan(curr_user)
    requirements = build_requirements_for_plan(curr_user, active_plan)
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
    profile["activePlanId"] = get_active_plan(curr_user).id
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
