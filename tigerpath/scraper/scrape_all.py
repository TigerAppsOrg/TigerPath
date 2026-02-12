from django.conf import settings
from django.db import connection

from tigerpath.scraper import scrape_import, scrape_parse, scrape_validate


def get_all_courses():
    term_codes = sorted([str(code) for code in settings.ACTIVE_TERMS], key=int)
    if len(term_codes) == 0:
        raise RuntimeError("ACTIVE_TERMS is empty; no terms to scrape.")

    print(
        f"Scraping {len(term_codes)} semesters: {', '.join(term_codes)}",
        flush=True,
    )

    aggregate_counter = scrape_import.ScrapeCounter()

    for term_code in term_codes:
        try:
            print("\n" + "=" * 72, flush=True)
            print("Scraping for semester " + str(term_code), flush=True)
            courses = scrape_parse.scrape_parse_semester(term_code)
            print(f"Finished scraping/parsing {len(courses)} courses", flush=True)
            if len(courses) == 0:
                raise RuntimeError(
                    "Parsed zero courses from API response. "
                    "Check scraper warnings above for malformed records or API payload changes."
                )

            print("Validating courses", flush=True)
            total_courses = len(courses)
            valid_courses = []
            invalid_courses = 0
            for index, course in enumerate(courses, start=1):
                try:
                    scrape_validate.validate_course(
                        course
                    )  # just a sanity check in case we ever modify scrape_parse
                    valid_courses.append(course)
                except Exception as exc:
                    invalid_courses += 1
                    print(
                        f"[validate][warn] Skipping invalid course {course.get('guid', '<unknown>')}: {exc}",
                        flush=True,
                    )

                if index % 250 == 0 or index == total_courses:
                    print(
                        f"Validated {index}/{total_courses} courses (valid={len(valid_courses)}, invalid={invalid_courses})",
                        flush=True,
                    )

            if len(valid_courses) == 0:
                raise RuntimeError("All parsed courses failed validation.")

            print("Updating database", flush=True)
            term_counter = scrape_import.ScrapeCounter()
            length = len(valid_courses)
            for index, course in enumerate(valid_courses):
                print(f"Updating course {index + 1} of {length}")
                for _ in range(3):
                    try:
                        scrape_import.scrape_import_course(course, term_counter)
                    except Exception as e:
                        if connection.connection is not None:
                            connection.connection.close()
                        connection.connection = None
                        print(f"Updating course {course} failed, retrying...")
                        print(e)
                    else:
                        break
                else:
                    print(f"Updating course {course} failed")

            print(f"[term {term_code}]")
            print(str(term_counter), flush=True)

            aggregate_counter.total_courses_count += term_counter.total_courses_count
            aggregate_counter.created_courses_count += term_counter.created_courses_count
            aggregate_counter.total_listings_count += term_counter.total_listings_count
            aggregate_counter.created_listings_count += term_counter.created_listings_count
        except Exception as e:
            raise RuntimeError(f"Failed while scraping term {term_code}: {e}") from e

    print("\n" + "=" * 72, flush=True)
    print("Aggregate totals across all scraped semesters:", flush=True)
    print(str(aggregate_counter), flush=True)
