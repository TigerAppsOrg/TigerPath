
from django.conf import settings
from .scrape_parse import scrape_parse_semester
from .scrape_validate import validate_course
from .scrape_import import scrape_import_course, ScrapeCounter
from .scrape_dist_areas import scrape_all_courses
from ..models import Course
from copy import deepcopy

def get_all_courses():
    # we can generate these given settings.CURR_TERM
    term_codes = settings.ACTIVE_TERMS
    for term_code in term_codes:
        try:
            print("Scraping for semester " + str(term_code))
            courses = scrape_parse_semester(term_code)
            # just a sanity check in case we ever modify scrape_parse
            [validate_course(x) for x in courses]
            scrapeCounter = ScrapeCounter()
            [scrape_import_course(x, scrapeCounter) for x in courses]
            print(str(scrapeCounter))
            print("----------------------------------")

            # add dist_area to models
            for course in scrape_all_courses(term_code):
                try:
                    fetch_course = Course.objects.get(registrar_id = str(term_code) + str(course["courseid"]))
                    fetch_course.dist_area = course["area"]
                    fetch_course.save()
                except:
                    print(course)
                    print(str(term_code) + str(course['courseid']))
        except Exception as e:
            raise e

    # combine crosslistings and populate crosslisting field in course
    all_courses = Course.objects.all()
    for course in all_courses:
        listings = []
        listings.append(course.course_listing_set.all().filter(is_primary=True)[0])
        listings.extend(list(course.course_listing_set.all().filter(is_primary=False)))
        course.cross_listings = ' / '.join([listing.dept + listing.number for listing in listings])
        course.save()

    # update master list
    all_courses = Course.objects.all()
    for course in all_courses:
        # skip if encounter a master course
        if course.is_master:
            continue
        fetch_master = all_courses.filter(registrar_id = course.registrar_id[4:])
        # get course semester
        add_semester = ""
        # fall
        if course.registrar_id[3] == '2':
            add_semester = "f" + str(int(course.registrar_id[1:3]) - 1)
        # spring
        else:
            add_semester = "s" + course.registrar_id[1:3]

        # update master model if exists
        if fetch_master.exists():
            # get course from queryset
            fetch_master = fetch_master[0]
            course.all_semesters = deepcopy(fetch_master.all_semesters)
            if add_semester not in fetch_master.all_semesters:
                course.all_semesters.append(add_semester)
            # delete duplicate course
            fetch_master.delete()
            
        # convert course to master model
        else:
            course.all_semesters.append(add_semester)
        # strip semester off id
        course.registrar_id = course.registrar_id[4:]
        course.is_master = True
        course.save()
