from tigerpath.models import Course, Course_Listing, Semester
from tigerpath.scraper.scrape_dist_areas import scrape_id

class ScrapeCounter:
    def __init__(self):
        self.total_courses_count = 0
        self.created_courses_count = 0
        self.total_listings_count = 0
        self.created_listings_count = 0

    def __str__(self):
        return str(self.created_courses_count) + " new courses\n" + \
            str(self.total_courses_count) + " total courses\n" + \
            str(self.created_listings_count) + " new listings\n" + \
            str(self.total_listings_count) + " total listings"

def _create_course(course, course_id, counter):
    course_object, created = Course.objects.get_or_create(
        registrar_id=course_id,
        defaults={'semester':_create_semester(course['semester'])},
    )
    if created:
        counter.created_courses_count += 1
    counter.total_courses_count += 1
    return (course_object, created)

def _create_course_listing(listing, course_object, counter):
    _, created = Course_Listing.objects.get_or_create(
        course=course_object,
        dept=listing['dept'],
        number=listing['code'],
        is_primary=listing['is_primary']
    )
    if created:
        counter.created_listings_count += 1
    counter.total_listings_count += 1

def _create_semester(semester):
    semester_object, _ = Semester.objects.get_or_create(
        start_date=semester['start_date'],
        end_date=semester['end_date'],
        term_code=semester['term_code']
    )
    return semester_object

def _append_to_all_semesters(term_code, course_object):
    year = int(term_code[1:3])
    new_semester_code = 'f{}'.format(year-1) if term_code[3] == '2' else 's{}'.format(year)
    if new_semester_code not in course_object.all_semesters:
        course_object.all_semesters.append(new_semester_code)

def _set_cross_listings(listings, course_object):
    cross_listings = []
    for l in listings:
        listing_name = l['dept'] + l['code']
        if l['is_primary']:
            cross_listings.insert(0, listing_name)
        else:
            cross_listings.append(listing_name)
    course_object.cross_listings = ' / '.join(cross_listings)

def scrape_import_course(course, counter=ScrapeCounter()):
    term_code = course['guid'][:4]
    course_id = course['guid'][4:]

    # create course object
    course_object, course_created = _create_course(course, course_id, counter)

    # set title, description, all_semesters
    course_object.title = course['title']
    course_object.description = course['description']
    _append_to_all_semesters(term_code, course_object)

    # add distribution area
    course_object.dist_area = course['distribution_area']

    # create course listings
    for listing in course['course_listings']:
        _create_course_listing(listing, course_object, counter)

    # set cross_listings
    _set_cross_listings(course['course_listings'], course_object)

    course_object.save()

    return counter
