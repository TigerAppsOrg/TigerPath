from django.conf import settings
from django.db import connection
from tigerpath.scraper import scrape_parse, scrape_validate, scrape_import


def get_all_courses():
    # we can generate these given settings.CURR_TERM
    term_code = settings.ACTIVE_TERMS[-1]
    try:
        print("Scraping for semester " + str(term_code))
        courses = scrape_parse.scrape_parse_semester(term_code)

        print("Validating courses")
        for course in courses:
            scrape_validate.validate_course(
                course
            )  # just a sanity check in case we ever modify scrape_parse

        print("Updating database")
        scrape_counter = scrape_import.ScrapeCounter()
        length = len(courses)
        for index, course in enumerate(courses):
            print("Updating course {} of {}".format(index + 1, length))
            for _ in range(3):
                try:
                    scrape_import.scrape_import_course(course, scrape_counter)
                except Exception as e:
                    connection.connection.close()
                    connection.connection = None
                    print("Updating course {} failed, retrying...".format(course))
                    print(e)
                else:
                    break
            else:
                print("Updating course {} failed".format(course))

        print(str(scrape_counter))
    except Exception as e:
        raise e
