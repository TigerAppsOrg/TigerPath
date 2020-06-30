from django.shortcuts import render, redirect
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, Http404
from . import models, forms, utils
from .majors_and_certificates.scripts.verifier import check_major, check_degree, get_courses_by_path
from .majors_and_certificates.scripts.university_info import LANG_DEPTS

import django_cas_ng.views
import ujson
import re
import itertools


# cas auth login
@csrf_exempt
def login(request):
    if request.user.is_authenticated:
        return redirect('index')
    else:
        return django_cas_ng.views.LoginView.as_view()(request)

# cas auth logout
def logout(request):
    success_msg = 'You have been successfully logged out.'
    messages.success(request, success_msg)
    return django_cas_ng.views.LogoutView.as_view()(request)

# index page
def index(request):
    # check if the user is authenticated
    if request.user.is_authenticated:
        instance = models.UserProfile.objects.get(user_id=request.user.id)
        # add settings form
        settings_form = forms.SettingsForm(instance=instance)
        context = {'settings_form': settings_form}

        # check user state
        user_state = request.user.profile.user_state
        if 'onboarding_complete' not in user_state or not user_state['onboarding_complete']:
            # the user has completed the onboarding form but not the tutorial
            if not request.user.profile.major:
                # add onboarding form
                initial_values = get_onboarding_initial_values(request.user.username)
                onboarding_form = forms.OnboardingForm(initial=initial_values)
                context['onboarding_form'] = onboarding_form
            else:
                # show tutorial
                context['show_tutorial'] = True
                user_state['onboarding_complete'] = True
                request.user.profile.save()

        return render(request, 'tigerpath/index.html', context)
    else:
        return landing(request)

# landing page
def landing(request):
    return render(request, 'tigerpath/landing.html', None)

# about page
def about(request):
    return render(request, 'tigerpath/about.html', None)

# privacy policy page
def privacy_policy(request):
    return render(request, 'tigerpath/privacy.html', None)

# save the info on the onboarding page
@login_required
def save_onboarding(request):
    update_profile(request, forms.OnboardingForm)
    return redirect('index')

# save the info on the user settings page
@login_required
def save_user_settings(request):
    update_profile(request, forms.SettingsForm)
    return redirect('index')

# checks whether the form data is valid and returns the updated user profile
def update_profile(request, profile_form):
    # if this is a POST request we need to process the form data
    if request.method == 'POST':
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
        if student_json['first_name']:
            initial_values['nickname'] = student_json['first_name']
        # get class year
        if student_json['class_year']:
            initial_values['year'] = student_json['class_year']
        # get major code
        if student_json['major_code']:
            tigerbook_major_code = student_json['major_code']
            # handle the way tigerbook stores major codes
            if tigerbook_major_code == 'COS':
                major_code = tigerbook_major_code + '-' + student_json['major_type']
                initial_values['major'] = majors.get(code=major_code).pk
            elif tigerbook_major_code == 'FRE ITA':
                initial_values['major'] = majors.get(code='FIT').pk
            elif tigerbook_major_code == 'SPA POR':
                initial_values['major'] = majors.get(code='SPO').pk
            else:
                initial_values['major'] = majors.get(code=tigerbook_major_code)
    return initial_values

def convert_courses(course_list, queries):
    course_info_list = []
    for course in course_list:
        course_info = {}
        course_info['title'] = course.title
        course_info['id'] = course.registrar_id
        course_info['name'] = course.cross_listings
        course_info['semester_list'] = course.all_semesters
        course_info['dist_area'] = course.dist_area
        course_info['semester'] = get_semester_type(course.all_semesters)
        course_info_list.append(course_info)

    # sort list by dept and code
    course_info_list = sorted(course_info_list, key=lambda course: course['name'])
    # show searched dept first
    for query in queries:
        if len(query) == 3 and query.isalpha():
            course_info_list = sorted(course_info_list, key=lambda course: not (course['name'].startswith(query.upper())))
    return course_info_list

# filters courses with query from react and sends back a list of filtered courses to display
@login_required
def get_courses(request, search_query):
    # split only by first digit occurrance ex: cee102a -> [cee, 102a]
    split_query = re.split('(\d.*)', search_query)
    queries = []
    # split again by spaces
    for query in split_query:
        queries = queries + query.split(" ")

    course_list = filter_courses(queries)
    course_info_list = convert_courses(course_list, queries)
    return HttpResponse(ujson.dumps(course_info_list, ensure_ascii=False), content_type='application/json')

# returns list of courses that match a requirement
@login_required
def get_req_courses(request, req_path):
    # put the slashes back in
    req_path = req_path.replace('$', '//')
    # prevents duplicate courses to be added in search results
    search_results = set([])
    course_list, dist_list = get_courses_by_path(req_path)
    def _update_search_results(crs):
        crs = crs.split('/')[0]  # only lookup the first listing
        if '*' in crs:  # wildcard listing, could be multiple courses
            crs = crs.replace('*', '').split(' ')
            search_results.update(set(filter_courses(crs, allow_failure=True)))
        else:  # explicit course listing
            try:
                search_results.add(models.Course_Listing.objects.get(
                    dept=crs.split(' ')[0], number=crs.split(' ')[1]).course)
            except Exception:  # if course not found, ignore and move on
                pass
    for course in course_list:
        if 'LANG' in course:
            for lang in list(LANG_DEPTS.keys()):
                _update_search_results(course.replace('LANG', lang))
        else:
            _update_search_results(course)
    for dist in dist_list:
        search_results.update(set(models.Course.objects.filter(dist_area=dist)))
    course_info_list = convert_courses(list(search_results), course_list)
    return HttpResponse(ujson.dumps(course_info_list, ensure_ascii=False), content_type='application/json')

def filter_courses(queries, allow_failure=False):
    """
    Returns a list of courses filtered by query

    If allow_failure is False, silently drop any queries that filter down to
    zero results in order to provide the best possible non-empty search
    results on user searches in case of typos.
    Setting it to True will allow failure (filtering down to empty), and is
    useful when the searches are not user defined and should not have typos.
    """
    # shortcut for an empty search
    if len(queries) == 0:
        return []
    results = models.Course.objects.all()
    # remember original length to check if any results have been filtered out
    original_length = len(results)
    for query in queries:
        if len(results) == 0:
            # no results remain. return empty
            return []
        if query == '':
            continue
        if len(query) == 3 and query.isalpha():
            # might be a 3-letter departmental code
            filtered_results = list(filter(lambda course: query.upper() in course.cross_listings, results))
            if len(filtered_results) > 0:
                results = filtered_results
                continue
        if len(query) <= 3 and query.isdigit() or len(query) == 4 and query[:3].isdigit():
            # might be a course number
            filtered_results = list(filter(lambda course: any([listing[3:].startswith(query.upper()) for listing in re.split(' / ', course.cross_listings)]), results))
            if len(filtered_results) > 0:
                results = filtered_results
                continue
        # might be part of a course title
        filtered_results = list(filter(lambda course: query.lower() in course.title.lower(), results))
        if len(filtered_results) > 0 or allow_failure:
            results = filtered_results
            continue
        # if reaches this line, query returned no results, so drop and move on
    if len(results) == original_length:
        # none of the queries were vaild
        return []
    return results

# returns 'fall', 'spring', or 'both' depending on the list of semesters
def get_semester_type(all_semesters):
    all_semesters = ''.join(all_semesters)
    if 'f' in all_semesters and 's' in all_semesters:
        return 'both'
    elif 'f' in all_semesters:
        return 'fall'
    else:
        return 'spring'

# populate the courses in the user schedule with metadata from database
def populate_user_schedule(schedule):
    if not schedule:
        return None
    db_courses = models.Course.objects.all()
    for course in itertools.chain(*schedule):
        if 'external' in course and course['external']:
            course['semester'] = 'external'
            course['dist_area'] = None
        else:
            db_course = db_courses.get(registrar_id=course['id'])
            course['name'] = db_course.cross_listings
            course['title'] = db_course.title
            course['dist_area'] = db_course.dist_area
            course["semester_list"] = db_course.all_semesters
            course['semester'] = get_semester_type(db_course.all_semesters)
            if 'settled' not in course:
                course['settled'] = []
    return schedule

# updates user's schedules with added courses
@login_required
def update_schedule(request):
    current_user = request.user.profile
    current_user.user_schedule = ujson.loads(request.POST.get('schedule', '[]'))
    current_user.save()
    return HttpResponse(ujson.dumps(request, ensure_ascii=False), content_type='application/json')

# returns user's existing schedule
@login_required
def get_schedule(request):
    curr_user = request.user.profile
    schedule = populate_user_schedule(curr_user.user_schedule)

    # make sure that the schedule has 9 semesters
    while len(schedule) < 9:
        schedule.append([])

    return HttpResponse(ujson.dumps(schedule, ensure_ascii=False), content_type='application/json')

# returns requirements satisfied
@login_required
def get_requirements(request):
    curr_user = request.user.profile
    schedule = populate_user_schedule(curr_user.user_schedule)

    requirements = []
    if curr_user.major:
        if curr_user.major.supported:
            requirements.append(check_major(curr_user.major.code, schedule, settings.ACTIVE_YEAR))
        else:
            # appends user major name so we can display error message
            requirements.append(curr_user.major.name)
        requirements.append(check_degree(curr_user.major.degree, schedule, settings.ACTIVE_YEAR))
    return HttpResponse(ujson.dumps(requirements, ensure_ascii=False), content_type='application/json')

@login_required
def update_schedule_and_get_requirements(request):
    update_schedule(request)
    return get_requirements(request)

@login_required
def get_profile(request):
    curr_user = request.user.profile
    profile = {}
    profile['classYear'] = curr_user.year
    return HttpResponse(ujson.dumps(profile, ensure_ascii=False), content_type='application/json')
