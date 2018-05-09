import os
import hashlib
import requests

from os import urandom
from base64 import b64encode
from datetime import datetime
from collections import OrderedDict
from . import models

TIGERBOOK_BASE_URL = 'https://tigerbook.herokuapp.com/api/v1/undergraduates/'
TRANSCRIPT_BASE_URL = 'https://transcriptapi.tigerapps.org/transcript/?ticket='


# Get information about the student with the specified netid from Tigerbook
def get_student_info(netid):
    url = TIGERBOOK_BASE_URL + netid
    r = requests.get(url, headers=create_tigerbook_wsse_headers())
    return (r.json() if r.status_code == 200 else None)


# Helper function that creates Tigerbook WSSE headers for the request
# See https://github.com/alibresco/tigerbook-api to get api key
def create_tigerbook_wsse_headers():
    created = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    nonce = b64encode(urandom(32)).decode()
    username = os.getenv('TIGERBOOK_USERNAME')
    password = os.getenv('TIGERBOOK_API_KEY')
    hash_arg = (nonce + created + password).encode()
    generated_digest = b64encode(hashlib.sha256(hash_arg).digest()).decode()
    headers = {
        'Authorization': 'WSSE profile="UsernameToken"',
        'X-WSSE': 'UsernameToken Username="{}", PasswordDigest="{}", Nonce="{}", Created="{}"'
                  .format(username, generated_digest, b64encode(nonce.encode()).decode(), created)
    }
    return headers


# Get courses from the user's transcript api ticket
def get_transcript_courses(ticket):
    r = requests.get(TRANSCRIPT_BASE_URL + ticket)
    if r.status_code == 200:
        transcript_data = r.json()
        if 'transcript' in transcript_data and 'courses' in transcript_data['transcript']:
            return transcript_data['transcript']['courses']
    return None


# Convert Transcript API courses to the format for a user schedule
def convert_transcript_courses_to_schedule(sem_to_courses):
    courses_taken = []
    courses_not_imported = []

    # get all course listings and courses from database
    course_listings = models.Course_Listing.objects.all()
    db_courses = models.Course.objects.all()

    # iterate through transcript api courses
    sem_to_courses = OrderedDict(sorted(sem_to_courses.items(), key=get_sem_to_courses_key))
    for i, (sem, course_list) in enumerate(sem_to_courses.items()):
        courses_taken.append([])
        for course_name in course_list:
            # get dept and code from course_name
            dept, code = course_name.split(' ')
            if not dept or not code:
                courses_not_imported.push(course_name)
                continue

            # get the course from the database
            try:
                course_id = course_listings.filter(dept=dept).get(number=code).course_id
            except models.Course_Listing.DoesNotExist:
                courses_not_imported.push(course_name)
                continue
            db_course = db_courses.get(id=course_id)

            # populate course_entry with course data
            course_entry = {}
            course_entry['id'] = db_course.registrar_id
            course_entry["settled"] = []
            courses_taken[i].append(course_entry)

    return (courses_taken, courses_not_imported)


# Key function used to sort the courses in the transcript data by order of semester
def get_sem_to_courses_key(one_sem_to_courses):
    sem_type, year = one_sem_to_courses[0].split(' ')
    # Spring XXXX should be sorted before Fall XXXX
    if sem_type[0] == 'f':
        return year + '0'
    else:
        return year + '1'
