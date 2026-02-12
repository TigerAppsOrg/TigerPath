"""
Scrapes OIT's Web Feeds to add courses and sections to database.
Procedure:
- Get list of departments (3-letter department codes)
- Get data from MobileApp/StudentApp API provided by OIT
- Parse it for courses, sections, and lecture times (as recurring events)
"""

from tigerpath.majors_and_certificates.scripts.university_info import DEPTS
from tigerpath.scraper.mobileapp import MobileApp


class ParseError(Exception):
    def __init__(self, value):
        self.value = value

    def __str__(self):
        return repr(self.value)


def scrape_parse_semester(term_code):
    TERM_CODE = term_code

    CURRENT_SEMESTER = [""]

    def get_text(key, object, fail_ok=False):
        found = object.get(key)
        if fail_ok and found is None:
            return found
        elif found is None:
            ParseError("key " + key + " does not exist")
            return ""
        else:
            return found

    def get_current_semester(data):
        """get semester according to TERM_CODE"""
        if not CURRENT_SEMESTER[0]:
            term = data["term"][0]
            CURRENT_SEMESTER[0] = {
                "start_date": get_text("start_date", term),
                "end_date": get_text("end_date", term),
                "term_code": str(TERM_CODE),
            }
        return CURRENT_SEMESTER[0]

    def scrape_all():
        """scrape all events from Princeton's course webfeed"""
        departments = ",".join(list(DEPTS.keys()))
        print(
            f"[scrape] Requesting course list for term {TERM_CODE} across {len(DEPTS)} departments...",
            flush=True,
        )
        return scrape(departments)

    # goes through the listings for this department
    def scrape(department):
        """Scrape all events listed under department"""
        data = MobileApp().get_courses(term=TERM_CODE, subject=department)
        if data["term"][0].get("subjects") is None:
            print("Empty MobileApp response")
            return []
        subjects = data["term"][0]["subjects"]
        total_courses = sum(len(subject.get("courses", [])) for subject in subjects)
        print(
            f"[scrape] Received {len(subjects)} subjects and {total_courses} courses. Parsing course details...",
            flush=True,
        )

        parsed_courses = []
        processed_count = 0
        failed_count = 0
        progress_every = 25
        for subject in subjects:
            subject_code = subject.get("code", "<unknown>")
            for course in subject.get("courses", []):
                course_id = course.get("course_id", "<unknown>")
                try:
                    x = parse_course(data, course, subject)
                    if x is not None:
                        parsed_courses.append(x)
                except Exception as exc:
                    failed_count += 1
                    print(
                        f"[scrape][warn] Failed parsing subject={subject_code} course_id={course_id}: {exc}",
                        flush=True,
                    )

                processed_count += 1
                if processed_count % progress_every == 0 or processed_count == total_courses:
                    print(
                        "[scrape] Processed "
                        f"{processed_count}/{total_courses} courses "
                        f"(parsed={len(parsed_courses)}, failed={failed_count}, latest subject: {subject_code})",
                        flush=True,
                    )

        if failed_count > 0:
            print(f"[scrape] Completed with {failed_count} parse failures", flush=True)

        return parsed_courses

    def none_to_empty(text):
        if text is None:
            return ""
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
        """create a course with basic information."""
        course_detail = course.get("detail") or {}
        distribution_area = none_to_empty(
            course_detail.get("distribution_area_short")
            or course_detail.get("distribution_area")
            or course.get("distribution_area_short")
            or course.get("distribution_area")
        )
        distribution_area = ",".join(distribution_area.split(" or "))

        return {
            "title": none_to_empty(course.get("title")),
            "guid": none_to_empty(course.get("guid")),
            "distribution_area": distribution_area,
            "description": none_to_empty(course_detail.get("description")),
            "semester": get_current_semester(data),
            "professors": [parse_prof(x) for x in none_to_empty_list(course.get("instructors"))],
            "course_listings": parse_listings(course, subject),
            "sections": [parse_section(x) for x in none_to_empty_list(course.get("classes"))],
        }

    # may decide to make this function for just one prof/listing/section, then
    # do a map
    def parse_prof(prof):
        return {"full_name": none_to_empty(prof.get("full_name"))}

    def parse_listings(course, subject):
        def parse_cross_listing(cross_listing):
            return {
                "dept": none_to_empty(cross_listing.get("subject")),
                "code": none_to_empty(cross_listing.get("catalog_number")),
                "is_primary": False,
            }

        cross_listings = [
            parse_cross_listing(x) for x in none_to_empty_list(course.get("crosslistings"))
        ]
        primary_listing = {
            "dept": get_text("code", subject),
            "code": none_to_empty(course.get("catalog_number")),
            "is_primary": True,
        }
        return cross_listings + [primary_listing]

    def parse_section(section):
        def parse_meeting(meeting):
            def get_days(meeting):
                days = ""
                for day in meeting.get("days", []):
                    days += day + " "
                return days[:10]

            def get_location(meeting):
                building = none_to_empty((meeting.get("building") or {}).get("name"))
                room = none_to_empty(meeting.get("room"))
                if building and room:
                    return building + " " + room
                return building or room

            # the times are in the format:
            # HH:MM AM/PM
            return {
                "start_time": "01:00 AM" if "start_time" not in meeting else meeting["start_time"],
                "end_time": "01:00 AM" if "end_time" not in meeting else meeting["end_time"],
                "days": get_days(meeting),
                "location": get_location(meeting),
            }

        # NOTE: section.find('schedule') doesn't seem to be used
        meetings = None
        schedule = section.get("schedule")
        if schedule is not None:
            meetings = schedule.get("meetings")
        return {
            "registrar_id": get_text("class_number", section),
            "name": get_text("section", section),
            "type": get_text("type_name", section)[0:3].upper(),
            "capacity": get_text("capacity", section),
            "enrollment": get_text("enrollment", section),
            "meetings": [parse_meeting(x) for x in none_to_empty_list(meetings)],
        }

    return scrape_all()
