class ScrapeCounter:

    def __init__(self):
        self.totalCoursesCount = 0
        self.createdCoursesCount = 0
        self.totalSectionsCount = 0
        self.createdSectionsCount = 0
        self.totalMeetingsCount = 0
        self.createdMeetingsCount = 0
        self.totalProfessorsCount = 0
        self.createdProfessorsCount = 0
        self.totalListingsCount = 0
        self.createdListingsCount = 0

    def __str__(self):
        return str(self.createdCoursesCount) + " new courses\n" + \
            str(self.totalCoursesCount) + " total courses\n" + \
            str(self.createdSectionsCount) + " new sections\n" + \
            str(self.totalSectionsCount) + " total sections\n" + \
            str(self.createdMeetingsCount) + " new meetings\n" + \
            str(self.totalMeetingsCount) + " total meetings\n" + \
            str(self.createdProfessorsCount) + " new professors\n" + \
            str(self.totalProfessorsCount) + " total professors\n" + \
            str(self.createdListingsCount) + " new listings\n" + \
            str(self.totalListingsCount) + " total listings"


def scrape_import_course(course, counter=ScrapeCounter()):
    from ..models import Course

    def import_section(section, course_object):
        from ..models import Section, Meeting

        def import_meeting(meeting, course_object, section_object):
            meeting_object, created = Meeting.objects.get_or_create(
                section=section_object,
                start_time=meeting['start_time'],
                end_time=meeting['end_time'],
                days=meeting['days'],
                location=meeting['location']
            )
            if created:
                counter.createdMeetingsCount += 1
            counter.totalMeetingsCount += 1
            return meeting_object
        section_object, created = Section.objects.get_or_create(
            course=course_object,
            name=section['name']
        )
        section_object.section_type = section['type']
        section_object.section_capacity = section['capacity']
        section_object.section_enrollment = section['enrollment']
        section_object.section_registrar_id = section['registrar_id']
        Meeting.objects.filter(section=section_object).delete()
        [import_meeting(x, course_object, section_object)
         for x in section['meetings']]
        section_object.save()
        if created:
            counter.createdSectionsCount += 1
        counter.totalSectionsCount += 1
        return section_object

    def import_professor(prof, course_object):
        from ..models import Professor
        prof_object, created = Professor.objects.get_or_create(
            name=prof['full_name']
        )
        course_object.professors.add(prof_object)
        prof_object.save()
        if created:
            counter.createdProfessorsCount += 1
        counter.totalProfessorsCount += 1
        return course_object

    def import_listing(listing, course_object):
        from ..models import Course_Listing
        listing_object, created = Course_Listing.objects.get_or_create(
            course=course_object,
            dept=listing['dept'],
            number=listing['code'],
            is_primary=listing['is_primary']
        )
        if created:
            counter.createdListingsCount += 1
        counter.totalListingsCount += 1
        return listing_object

    def import_semester(semester):
        from ..models import Semester
        semester_object, created = Semester.objects.get_or_create(
            start_date=semester['start_date'],
            end_date=semester['end_date'],
            term_code=semester['term_code']
        )
        return semester_object

    course_object, created = Course.objects.get_or_create(
        registrar_id=course['guid'],
        semester=import_semester(course['semester'])
    )
    course_object.title = course['title']
    course_object.description = course['description']
    [import_section(x, course_object) for x in course['sections']]
    course_object.professors.clear()
    [import_professor(x, course_object) for x in course['professors']]
    [import_listing(x, course_object) for x in course['course_listings']]
    course_object.save()
    if created:
        counter.createdCoursesCount += 1
    counter.totalCoursesCount += 1
    return counter