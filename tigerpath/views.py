from django.shortcuts import render, redirect
from django.db.models import Q
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, Http404
from django.urls import reverse
from . import models, forms, utils
from .majors_and_certificates.scripts.verifier import check_major, check_degree

import django_cas_ng.views
import ujson
import re
import requests
import itertools


# cas auth login
@csrf_exempt
def login(request):
    if request.user.is_authenticated:
        return redirect('index')
    else:
        return django_cas_ng.views.login(request)


# cas auth logout
def logout(request):
    return django_cas_ng.views.logout(request)


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


def save_transcript_courses(request):
    ticket = request.GET.get('ticket', None)
    if ticket:
        courses = utils.get_transcript_courses(ticket)
        if courses:
            # save courses into schedule
            current_user = models.UserProfile.objects.get(user=request.user)
            current_user.user_schedule, courses_not_imported = utils.convert_transcript_courses_to_schedule(courses)
            current_user.save()
            success_msg = 'The courses from your transcript were successfully added to the schedule.'
            if courses_not_imported:
                success_msg += '<br>However, we were not able to add the following courses: ' + ', '.join(courses_not_imported)
            messages.success(request, success_msg, extra_tags='safe')
        else:
            messages.error(request, 'Unfortunately, we weren\'t able to add the courses from your transcript to the schedule. Please add them manually.')
    else:
        raise Http404
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


# filters courses with query from react and sends back a list of filtered courses to display
@login_required
def get_courses(request, search_query='$'):
    # search query defaults to '$' which is an indicator to output nothing
    # split only by first digit occurrance ex: cee102a -> [cee, 102a]
    split_query = re.split('(\d.*)', search_query)
    queries = []
    # split again by spaces
    for query in split_query:
        queries = queries + query.split(" ")

    course_info_list = []
    course_list = filter_courses(queries)
    for course in course_list:
        course_info = {}
        course_info['title'] = course.title
        course_info['id'] = course.registrar_id
        course_info['listing'] = course.cross_listings
        course_info['semester_list'] = course.all_semesters
        course_info['dist_area'] = course.dist_area
        course_info['semester'] = get_semester_type(course.all_semesters)
        course_info_list.append(course_info)

    # sort list by dept and code
    course_info_list = sorted(course_info_list, key=lambda course: course["listing"])
    # show searched dept first
    for query in queries:
        if len(query) == 3 and query.isalpha():
            course_info_list = sorted(course_info_list, key=lambda course: not (course['listing'].startswith(query.upper())))
    return HttpResponse(ujson.dumps(course_info_list, ensure_ascii=False), content_type='application/json')


# returns list of courses filtered by query
def filter_courses(queries):
    results = models.Course.objects.all()
    for query in queries:
        if query == '':
            continue

        # is department
        if len(query) == 3 and query.isalpha():
            results = list(filter(lambda course: query.upper() in course.cross_listings, results))

        # is course number
        elif len(query) <= 3 and query.isdigit() or len(query) == 4 and query[:3].isdigit():
            results = list(filter(lambda course: any([listing[3:].startswith(query.upper()) for listing in re.split(' / ', course.cross_listings)]), results))

        # check if it matches title
        else:
            results = list(filter(lambda course: query.lower() in course.title.lower(), results))

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
    for course in list(itertools.chain(*schedule)):
        db_course = db_courses.get(registrar_id=course['id'])
        course['name'] = db_course.cross_listings
        course['title'] = db_course.title
        course['dist_area'] = db_course.dist_area
        course['semester'] = get_semester_type(db_course.all_semesters)
    return schedule


# updates user's schedules with added courses
@login_required
def update_schedule(request):
    current_user = models.UserProfile.objects.get(user=request.user)
    current_user.user_schedule = ujson.loads(list(request.POST)[0])
    current_user.save()
    return HttpResponse(ujson.dumps(request, ensure_ascii=False), content_type='application/json')


# returns user's existing schedule
@login_required
def get_schedule(request):
    curr_user = models.UserProfile.objects.get(user=request.user)
    schedule = populate_user_schedule(curr_user.user_schedule)
    return HttpResponse(ujson.dumps(schedule, ensure_ascii=False), content_type='application/json')


# returns requirements satisfied
@login_required
def get_requirements(request):
    curr_user = models.UserProfile.objects.get(user=request.user)
    schedule = populate_user_schedule(curr_user.user_schedule)
    requirements = []
    try:
        requirements.append(check_major(curr_user.major.code, curr_user.user_schedule, settings.ACTIVE_YEAR))
    except:
        # appends user major name so we can display error message
        requirements.append(curr_user.major.name)
    requirements.append(check_degree(curr_user.major.degree, curr_user.user_schedule, settings.ACTIVE_YEAR))
    return HttpResponse(ujson.dumps(requirements, ensure_ascii=False), content_type='application/json')