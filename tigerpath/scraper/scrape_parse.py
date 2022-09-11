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

from tigerpath.scraper.mobileapp import MobileApp

# This should technically be imported from
# ../majors_and_certificates/scripts/university_info.py
# but this import currently fails.
# TODO: find out why and merge these lists.
#       Possibly refactor this and move it somewhere else entirely.
DEPTS = {
    "AAS": "African American Studies",
    "AFS": "African Studies",
    "AMS": "American Studies",
    "ANT": "Anthropology",
    "AOS": "Atmospheric & Oceanic Sciences",
    "APC": "Appl and Computational Math",
    "ARA": "Arabic",
    "ARC": "Architecture",
    "ART": "Art and Archaeology",
    "ASA": "Asian American Studies",
    "AST": "Astrophysical Sciences",
    "ATL": "Atelier",
    "BCS": "Bosnian-Croatian-Serbian",
    "CBE": "Chemical and Biological Engr",
    "CEE": "Civil and Environmental Engr",
    "CGS": "Cognitive Science",
    "CHI": "Chinese",
    "CHM": "Chemistry",
    "CHV": "Center for Human Values",
    "CLA": "Classics",
    "CLG": "Classical Greek",
    "COM": "Comparative Literature",
    "COS": "Computer Science",
    "CTL": "Center for Teaching & Learning",
    "CWR": "Creative Writing",
    "CZE": "Czech",
    "DAN": "Dance",
    "EAS": "East Asian Studies",
    "ECE": "Electrical and Computer Engineering",
    "ECO": "Economics",
    "ECS": "European Cultural Studies",
    "EEB": "Ecology and Evol Biology",
    "EGR": "Engineering",
    "ELE": "Electrical Engineering",
    "ENE": "Energy Studies",
    "ENG": "English",
    "ENT": "Entrepreneurship",
    "ENV": "Environmental Studies",
    "EPS": "Contemporary European Politics",
    "FIN": "Finance",
    "FRE": "French",
    "FRS": "Freshman Seminars",
    "GEO": "Geosciences",
    "GER": "German",
    "GHP": "Global Health & Health Policy",
    "GLS": "Global Seminar",
    "GSS": "Gender and Sexuality Studies",
    "HEB": "Hebrew",
    "HIN": "Hindi",
    "HIS": "History",
    "HLS": "Hellenic Studies",
    "HOS": "History of Science",
    "HPD": "History/Practice of Diplomacy",
    "HUM": "Humanistic Studies",
    "ISC": "Integrated Science Curriculum",
    "ITA": "Italian",
    "JDS": "Judaic Studies",
    "JPN": "Japanese",
    "JRN": "Journalism",
    "KOR": "Korean",
    "LAO": "Latino Studies",
    "LAS": "Latin American Studies",
    "LAT": "Latin",
    "LCA": "Lewis Center for the Arts",
    "LIN": "Linguistics",
    "MAE": "Mech and Aerospace Engr",
    "MAT": "Mathematics",
    "MED": "Medieval Studies",
    "MOD": "Media and Modernity",
    "MOG": "Modern Greek",
    "MOL": "Molecular Biology",
    "MPP": "Music Performance",
    "MSE": "Materials Science and Engr",
    "MTD": "Music Theater",
    "MUS": "Music",
    "NES": "Near Eastern Studies",
    "NEU": "Neuroscience",
    "ORF": "Oper Res and Financial Engr",
    "PAW": "Ancient World",
    "PER": "Persian",
    "PHI": "Philosophy",
    "PHY": "Physics",
    "PLS": "Polish",
    "POL": "Politics",
    "POP": "Population Studies",
    "POR": "Portuguese",
    "PSY": "Psychology",
    "QCB": "Quantitative Computational Bio",
    "REL": "Religion",
    "RES": "Russian, East Europ, Eurasian",
    "RUS": "Russian",
    "SAN": "Sanskrit",
    "SAS": "South Asian Studies",
    "SLA": "Slavic Languages and Lit",
    "SML": "Statistics & Machine Learning",
    "SOC": "Sociology",
    "SPA": "Spanish",
    "SPI": "Public and International Affairs",
    "STC": "Science and Technology Council",
    "SWA": "Swahili",
    "THR": "Theater",
    "TPP": "Teacher Preparation",
    "TRA": "Translation, Intercultural Com",
    "TUR": "Turkish",
    "TWI": "Twi",
    "URB": "Urban Studies",
    "URD": "Urdu",
    "VIS": "Visual Arts",
    "WRI": "Princeton Writing Program",
    "WWS": "Public and International Affairs",
}


class ParseError(Exception):

    def __init__(self, value):
        self.value = value

    def __str__(self):
        return repr(self.value)


def scrape_parse_semester(term_code):
    TERM_CODE = term_code

    CURRENT_SEMESTER = ['']

    h = HTMLParser()

    def get_text(key, object, fail_ok=False):
        found = object.get(key)
        if fail_ok and found is None:
            return found
        elif found is None:
            ParseError("key " + key + " does not exist")
            return ''
        else:
            return h.unescape(found)

    def get_current_semester(data):
        """ get semester according to TERM_CODE
        """
        if not CURRENT_SEMESTER[0]:
            term = data['term'][0]
            CURRENT_SEMESTER[0] = {
                'start_date': get_text('start_date', term),
                'end_date': get_text('end_date', term),
                'term_code': str(TERM_CODE),
            }
        return CURRENT_SEMESTER[0]

    def scrape_all():
        """ scrape all events from Princeton's course webfeed
        """
        #global course_count
        #global section_count
        departments = list(DEPTS.keys())
        length = len(departments)
        courses = []
        for index, department in enumerate(departments):
            print('Scraping department {} of {}: {}'.format(index+1, length, department))
            courses += scrape(department)
        return courses

    # goes through the listings for this department
    def scrape(department):
        """ Scrape all events listed under department
        """
        data = MobileApp().get_courses(term=TERM_CODE, subject=department)
        parsed_courses = []
        for subject in data['term'][0]['subjects']:
            for course in subject['courses']:
                x = parse_course(data, course, subject)
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

    # Parse it for courses, sections, and lecture times (as recurring events)
    # If the course with this ID exists in the database, we update the course
    # Otherwise, create new course with the information
    def parse_course(data, course, subject):
        """ create a course with basic information.
        """
        try:
            #global new_course_count
            #global course_count
            details = MobileApp().get_course_details(term=TERM_CODE, course_id=course['course_id'])
            distribution_area = none_to_empty(details['course_details']['course_detail']['distribution_area_short'])
            distribution_area = ''.join(distribution_area.split(' or '))

            return {
                "title": course['title'],
                "guid": course['guid'],
                "distribution_area": distribution_area,
                "description": none_to_empty(course['detail']['description']),
                "semester": get_current_semester(data),
                "professors": [parse_prof(x) for x in course['instructors']],
                "course_listings": parse_listings(course, subject),
                "sections": [parse_section(x) for x in course['classes']]
            }
        except Exception as inst:
            # print inst
            raise inst
            return None

    # may decide to make this function for just one prof/listing/section, then
    # do a map
    def parse_prof(prof):
        return {
            "full_name": prof['full_name']
        }

    def parse_listings(course, subject):
        def parse_cross_listing(cross_listing):
            return {
                'dept': cross_listing['subject'],
                'code': cross_listing['catalog_number'],
                'is_primary': False
            }
        cross_listings = [parse_cross_listing(
            x) for x in none_to_empty_list(course['crosslistings'])]
        primary_listing = {
            'dept': get_text('code', subject),
            'code': course['catalog_number'],
            'is_primary': True
        }
        return cross_listings + [primary_listing]

    def parse_section(section):
        def parse_meeting(meeting):
            def get_days(meeting):
                days = ""
                for day in meeting['days']:
                    days += day + ' '
                return days[:10]

            def get_location(meeting):
                location = ''
                try:
                    building = meeting['building']['name']
                    room = meeting['room']
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
        schedule = section['schedule']
        if schedule is not None:
            meetings = schedule['meetings']
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
