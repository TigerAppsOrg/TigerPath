"""
Scrapes OIT's Web Feeds to add courses and sections to database.
Procedure:
- Get list of departments (3-letter department codes)
- Run this: http://etcweb.princeton.edu/webfeeds/courseofferings/?term=current&subject=COS
- Parse it for courses, sections, and lecture times (as recurring events)
"""

from lxml import etree
from html.parser import HTMLParser
from urllib.request import urlopen
from bs4 import BeautifulSoup
import re


class ParseError(Exception):

    def __init__(self, value):
        self.value = value

    def __str__(self):
        return repr(self.value)


def scrape_parse_semester(term_code):
    TERM_CODE = term_code
    COURSE_OFFERINGS = "http://registrar.princeton.edu/course-offerings/"
    FEED_PREFIX = "http://etcweb.princeton.edu/webfeeds/courseofferings/"

    # Could also use 'current' instead of str(TERM_CODE), which automatically
    # gets the current semester. caveat: cannot get next semester's schedule
    # ahead of time
    TERM_PREFIX = FEED_PREFIX + "?term=" + str(TERM_CODE)
    DEP_PREFIX = TERM_PREFIX + "&subject="

    # for now hardwire the namespaces--too annoying
    PTON_NAMESPACE = u'http://as.oit.princeton.edu/xml/courseofferings-1_4'

    CURRENT_SEMESTER = ['']

    h = HTMLParser()

    def get_text(key, object):
        return h.unescape(raise_if_none(object.find(key), "key " + key + " does not exist").text)

    def get_current_semester():
        """ get semester according to TERM_CODE
        """
        #global CURRENT_SEMESTER
        if not CURRENT_SEMESTER[0]:
            parser = etree.XMLParser(ns_clean=True)
            termxml = urlopen(TERM_PREFIX)
            tree = etree.parse(termxml, parser)
            remove_namespace(tree, PTON_NAMESPACE)
            term = tree.getroot().find('term')
            CURRENT_SEMESTER[0] = {
                'start_date': get_text('start_date', term),
                'end_date': get_text('end_date', term),
                'term_code': str(TERM_CODE),
            }
        return CURRENT_SEMESTER[0]

    def get_department_list(seed_page):
        """ get list of departments
        Parses seed_page and returns a list of the departments' names.
        Seed page should be "http://registrar.princeton.edu/course-offerings/"
        Automatically gets the courses for the current term.
        """
        soup = BeautifulSoup(seed_page, "lxml")
        # Example tag:
        # <input name="subject" type="checkbox" value="COS">
        dept_tags = soup('input', {"name": "subject"})
        departments = map(lambda t: t.attrs['value'], dept_tags)
        return departments

    def scrape_all():
        """ scrape all events from Princeton's course webfeed
        """
        #global course_count
        #global section_count
        seed_page = urlopen(COURSE_OFFERINGS)
        departments = get_department_list(seed_page)
        courses = []
        for department in departments:
            courses += scrape(department)
        return courses

    # goes through the listings for this department
    def scrape(department):
        """ Scrape all events listed under department
        """
        parser = etree.XMLParser(ns_clean=True)
        link = DEP_PREFIX + department
        xmldoc = urlopen(link)
        tree = etree.parse(xmldoc, parser)
        dep_courses = tree.getroot()
        remove_namespace(dep_courses, PTON_NAMESPACE)
        parsed_courses = []
        for term in dep_courses:
            for subjects in term:
                for subject in subjects:
                    for courses in subject:
                        for course in courses:
                            x = parse_course(course, subject)
                            if x is not None:
                                parsed_courses.append(x)
        return parsed_courses

    def none_to_empty(text):
        if text is None:
            return ''
        else:
            return text

    def none_to_empty_list(x):
        if x is None:
            return []
        else:
            return x

    def raise_if_none(text, error_message):
        if text is None:
            raise ParseError(error_message)
        return text

    # Parse it for courses, sections, and lecture times (as recurring events)
    # If the course with this ID exists in the database, we update the course
    # Otherwise, create new course with the information
    def parse_course(course, subject):
        """ create a course with basic information.
        """
        try:
            #global new_course_count
            #global course_count
            return {
                "title": get_text('title', course),
                "guid": get_text('guid', course),
                "description": none_to_empty(course.find('detail').find('description').text),
                "semester": get_current_semester(),
                "professors": [parse_prof(x) for x in course.find('instructors')],
                "course_listings": parse_listings(course, subject),
                "sections": [parse_section(x) for x in course.find('classes')]
            }
        except Exception as inst:
            # print inst
            raise inst
            return None

    # may decide to make this function for just one prof/listing/section, then
    # do a map
    def parse_prof(prof):
        return {
            "full_name": get_text('full_name', prof)
        }

    def parse_listings(course, subject):
        def parse_cross_listing(cross_listing):
            return {
                'dept': get_text('subject', cross_listing),
                'code': get_text('catalog_number', cross_listing),
                'is_primary': False
            }
        cross_listings = [parse_cross_listing(
            x) for x in none_to_empty_list(course.find('crosslistings'))]
        primary_listing = {
            'dept': get_text('code', subject),
            'code': get_text('catalog_number', course),
            'is_primary': True
        }
        return cross_listings + [primary_listing]

    def parse_section(section):
        def parse_meeting(meeting):
            def get_days(meeting):
                days = ""
                for day in meeting.find('days'):
                    days += day.text + ' '
                return days[:10]

            def get_location(meeting):
                location = ''
                try:
                    building = meeting.find('building').find('name').text
                    room = meeting.find('room').text
                    location = building + " " + room
                except Exception as e:
                    raise e
                finally:
                    return location
            # the times are in the format:
            # HH:MM AM/PM
            return {
                'start_time': get_text('start_time', meeting),
                'end_time': get_text('end_time', meeting),
                'days': get_days(meeting),
                'location': get_location(meeting),
            }
        # NOTE: section.find('schedule') doesn't seem to be used
        meetings = None
        schedule = section.find('schedule')
        if schedule is not None:
            meetings = schedule.find('meetings')
        return {
            'registrar_id': get_text('class_number', section),
            'name': get_text('section', section),
            'type': get_text('type_name', section)[0:3].upper(),
            'capacity': get_text('capacity', section),
            'enrollment': get_text('enrollment', section),
            'meetings': [parse_meeting(x) for x in none_to_empty_list(meetings)]
        }

    def remove_namespace(doc, namespace):
        """Hack to remove namespace in the document in place.
        """
        ns = u'{%s}' % namespace
        nsl = len(ns)
        for elem in doc.getiterator():
            if elem.tag.startswith(ns):
                elem.tag = elem.tag[nsl:]

    return scrape_all()