from django.shortcuts import render
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import django_cas_ng.views
import ujson
import re
from . import models
from django.db.models import Q


# cas auth login
@csrf_exempt
def login(request):
    if request.user.is_authenticated:
        return render(request, 'tigerpath/index.html', None)
    else:
        return django_cas_ng.views.login(request)


# cas auth logout
def logout(request):
    return django_cas_ng.views.logout(request)


# index page
def index(request):
    if request.user.is_authenticated:
        return render(request, 'tigerpath/index.html', None)
    else:
        return render(request, 'tigerpath/landing.html', None)


# landing page
def landing(request):
    return render(request, 'tigerpath/landing.html', None)


# about page
def about(request):
    return render(request, 'tigerpath/about.html', None)


# filters courses with query from react and sends back a list of filtered courses to display
def get_courses(request, search_query):
    course_info_list = []
    course_list = filter_courses(search_query);
    models.Course.objects.prefetch_related('course_listing_set');
    for course in course_list:
        course_info = {}
        course_info['title'] = course.title
        course_info['id'] = course.registrar_id
        course_info['listing'] = ' / '.join([listing.dept + listing.number for listing in course.course_listing_set.all()])
        course_info_list.append(course_info)
    return HttpResponse(ujson.dumps(course_info_list, ensure_ascii=False), content_type='application/json')


# returns list of courses filterd by query
def filter_courses(search_query):
    # split only by first digit occurrance ex: cee102a -> [cee, 102a]
    split_query = re.split('(\d.*)', search_query)
    queries = []
    # split again by spaces
    for query in split_query:
        queries = queries + query.split(" ")

# populate with all of semester's courses and convert to course_listings
    results = models.Semester.objects.get(term_code=max(settings.ACTIVE_TERMS)).course_set.prefetch_related('course_listing_set')
    results = models.Course_Listing.objects.filter(course__in=results)

    for query in queries:
        if(query == ''):
            continue
        query = query.upper()

        # is department
        if(len(query) <= 3 and query.isalpha()):
            results = list(filter(lambda x: x.dept == query, results))

        # is course number
        elif(len(query) <= 3 and query.isdigit() or len(query) == 4 and query[:3].isdigit()):
            results = list(filter(lambda x: x.number.startswith(query), results))

        # check if it matches title
        else:
            # convert course_listings to courses to filter
            results = models.Course.objects.filter(course_listing_set__in=results)
            results = list(filter(lambda x: query.lower() in x.title.lower(), results))

            # convert courses back to course_listings
            results = models.Course_Listing.objects.filter(course__in=results)

    # convert course_listings to course to output
    return models.Course.objects.filter(course_listing_set__in=results)


# updates users schedules with added courses
def update_schedule(request):
    print(request.POST)
    return HttpResponse(ujson.dumps(request, ensure_ascii=False), content_type='application/json')


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
