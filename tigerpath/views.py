from django.shortcuts import render
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
import django_cas_ng.views

from .models import Course
from django.db.models import Q
from .models import Professor


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

def display_courses(request):
    professor_list = Professor.objects.all()
    return render(request, 'tigerpath/test.html', {"item_list": professor_list})
    
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
