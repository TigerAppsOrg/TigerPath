from django.shortcuts import render, redirect
from django.db.models import Q
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, Http404
from django.urls import reverse
from . import models, forms, utils
from .majors_and_certificates.scripts.verifier import check_major, check_degree

import django_cas_ng.views
import ujson
import re


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
        # add onboarding form
        if not request.user.profile.user_state['onboarding_complete']:
            initial_values = get_onboarding_initial_values(request.user.username)
            onboarding_form = forms.OnboardingForm(initial=initial_values)
            context['onboarding_form'] = onboarding_form
        return render(request, 'tigerpath/index.html', context)
    else:
        return landing(request)


# landing page
def landing(request):
    return render(request, 'tigerpath/landing.html', None)


# about page
def about(request):
    return render(request, 'tigerpath/about.html', None)


# onboarding page
@login_required
def onboarding(request):
    profile = update_profile(request, forms.OnboardingForm)
    profile.user_state['onboarding_complete'] = True
    profile.save()
    return redirect('index')


# user settings page
@login_required
def user_settings(request):
    profile = update_profile(request, forms.SettingsForm)
    profile.save()
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
            return profile
    # if it's any other request, we raise a 404 error
    else:
        raise Http404


# get onboarding initial values from tigerbook
def get_onboarding_initial_values(username):
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
            initial_values['major'] = student_json['major_code']
            # handle the way tigerbook stores major codes
            if initial_values['major'] == 'COS':
                initial_values['major'] += '-' + student_json['major_type']
            elif initial_values['major'] == 'FRE ITA':
                initial_values['major'] = 'FIT'
            elif initial_values['major'] == 'SPA POR':
                initial_values['major'] = 'SPO'
    return initial_values


# filters courses with query from react and sends back a list of filtered courses to display
@login_required
def get_courses(request, search_query):
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
        # tag semester
        all_semesters = ''.join(course.all_semesters)
        if 'f' in all_semesters and 's' in all_semesters:
            course_info['semester'] = 'both'
        elif 'f' in all_semesters:
            course_info['semester'] = 'fall'
        else:
            course_info['semester'] = 'spring'
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
    schedule = models.UserProfile.objects.get(user=request.user).user_schedule
    return HttpResponse(ujson.dumps(schedule, ensure_ascii=False), content_type='application/json')

# returns requirements satisfied
@login_required
def get_requirements(request):
    curr_user = models.UserProfile.objects.get(user=request.user)
    requirements = []
    requirements.append(check_major(curr_user.major, curr_user.user_schedule, 2018))
    requirements.append(check_degree(models.Major.objects.get(code=curr_user.major).degree, curr_user.user_schedule, 2018))
    return HttpResponse(ujson.dumps(requirements, ensure_ascii=False), content_type='application/json')


# course scraper functions from recal, they are called in the base command tigerpath_get_courses, 
# these functions may not be necessary, it seems recal uses these functions for memcache which we are not using
def hydrate_meeting_dict(meeting):
    return {
        'days': meeting.days,
        'start_time': meeting.start_time,
        'end_time': meeting.end_time,
        'location': meeting.location,
        'id': meeting.id
    }


def hydrate_section_dict(section, course):
    meetings = [hydrate_meeting_dict(meeting)
                for meeting in section.meetings.all()]
    return {
        'id': section.id,
        'name': section.name,
        'section_type': section.section_type,
        'section_capacity': section.section_capacity,
        'section_enrollment': section.section_enrollment,
        'course': "/course_selection/api/v1/course/" + str(course.id) + "/",
        'meetings': meetings
    }


def hydrate_course_listing_dict(course_listing):
    return {
        'dept': course_listing.dept,
        'number': course_listing.number,
        'is_primary': course_listing.is_primary,
    }


def hydrate_semester(semester):
    return {
        'id': semester.id,
        'start_date': str(semester.start_date),
        'end_date': str(semester.end_date),
        'name': str(semester),
        'term_code': semester.term_code
    }


def hydrate_course_dict(course):
    sections = [hydrate_section_dict(section, course)
                for section in course.sections.all()]
    course_listings = [hydrate_course_listing_dict(
        cl) for cl in course.course_listing_set.all()]
    return {
        'course_listings': course_listings,
        'description': course.description,
        'id': course.id,
        'registrar_id': course.registrar_id,
        'title': course.title,
        'sections': sections,
        'semester': hydrate_semester(course.semester),
    }


def get_courses_by_term_code(term_code):
    filtered = Course.objects.filter(Q(semester__term_code=term_code))
    return [hydrate_course_dict(c) for c in filtered]
