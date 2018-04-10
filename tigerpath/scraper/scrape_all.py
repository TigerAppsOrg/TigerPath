
from django.conf import settings
from .scrape_parse import scrape_parse_semester
from .scrape_validate import validate_course
from .scrape_import import scrape_import_course, ScrapeCounter

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
        except Exception as e:
            raise e