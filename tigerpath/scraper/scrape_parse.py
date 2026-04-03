"""
scrape_parse.py
Fetches and parses Princeton course data from the Registrar front-end API.
Replaces the deprecated OIT MobileApp/StudentApp API.
"""

from concurrent.futures import ThreadPoolExecutor

from tigerpath.scraper.scrape_registrar import (
    get_api_base_url,
    get_course_ids_for_term,
    get_full_course_details,
    get_registrar_token,
)


class ParseError(Exception):
    def __init__(self, value):
        self.value = value

    def __str__(self):
        return repr(self.value)


def _semester_from_term_code(term_code):
    """
    Derive semester start/end dates from a Princeton 4-digit term code.

    Term code format: 1{AA}{S}
      AA  = 2-digit academic-year-end (e.g. 26 for the 2025-26 academic year)
      S   = 2 (Fall) or 4 (Spring)

    Examples:
      1262 → Fall 2025  (2025-26 Fall)   → Sep 1 2025 – Jan 15 2026
      1264 → Spring 2026 (2025-26 Spring) → Feb 1 2026 – Jun 15 2026
    """
    tc = str(term_code)
    aa = int(tc[1:3])
    season = tc[3]
    if season == "4":  # Spring
        cal_year = 2000 + aa
        return {
            "term_code": tc,
            "start_date": f"{cal_year}-02-01",
            "end_date": f"{cal_year}-06-15",
        }
    else:  # Fall
        cal_year = 2000 + aa - 1
        return {
            "term_code": tc,
            "start_date": f"{cal_year}-09-01",
            "end_date": f"{cal_year + 1}-01-15",
        }


def _parse_crosslistings(crosslistings_str, primary_subject, primary_catnum):
    """
    Parse a crosslistings string like "CEE 520 / COS 520 / SML 520" into
    a list of {"dept": str, "code": str, "is_primary": bool} dicts.
    """
    primary_code = (primary_catnum or "").strip()
    primary_subject = (primary_subject or "").strip()

    if not crosslistings_str:
        if primary_subject and primary_code:
            return [{"dept": primary_subject, "code": primary_code, "is_primary": True}]
        return []

    listings = []
    primary_found = False
    for part in crosslistings_str.split(" / "):
        tokens = part.strip().split()
        if len(tokens) < 2:
            continue
        dept = tokens[0].strip()
        code = tokens[-1].strip()
        if not dept or not code:
            continue
        is_primary = dept == primary_subject and code == primary_code
        if is_primary:
            primary_found = True
        listings.append({"dept": dept, "code": code, "is_primary": is_primary})

    if not primary_found and primary_subject and primary_code:
        listings.append({"dept": primary_subject, "code": primary_code, "is_primary": True})

    return listings


def _parse_course(details, semester, term_code):
    """Build a TigerPath course dict from a get_full_course_details() result."""
    title = (details.get("title") or "").strip()
    if not title:
        return None

    course_id = details["course_id"]
    guid = term_code + course_id

    crosslistings = _parse_crosslistings(
        details.get("crosslistings", ""),
        details.get("subject", ""),
        details.get("catnum", ""),
    )
    if not crosslistings:
        return None

    professors = [
        {"full_name": i["full_name"]}
        for i in details.get("instructors", [])
        if i.get("full_name")
    ]

    return {
        "title": title,
        "guid": guid,
        "distribution_area": details.get("distribution_area", ""),
        "description": details.get("description") or "",
        "semester": semester,
        "professors": professors,
        "course_listings": crosslistings,
        "sections": details.get("sections", []),
    }


def scrape_parse_semester(term_code):
    TERM_CODE = str(term_code)
    semester = _semester_from_term_code(TERM_CODE)

    print("[scrape] Fetching registrar token and API base URL...", flush=True)
    token = get_registrar_token()
    api_base_url = get_api_base_url()
    print(
        f"[scrape] Token obtained. Fetching course IDs for term {TERM_CODE}...",
        flush=True,
    )

    course_ids = get_course_ids_for_term(TERM_CODE, token, api_base_url)
    if not course_ids:
        print(
            f"[scrape] No courses found for term {TERM_CODE} in the registrar API "
            "(this is expected for historical terms not yet in the system).",
            flush=True,
        )
        return []

    total = len(course_ids)
    print(
        f"[scrape] Found {total} unique courses. Fetching course details...",
        flush=True,
    )

    def _fetch(cid):
        try:
            return cid, get_full_course_details(TERM_CODE, cid, token)
        except Exception as exc:
            print(
                f"[scrape][warn] course-details failed for course_id={cid}: {exc}",
                flush=True,
            )
            return cid, None

    details_by_id = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        for cid, details in executor.map(lambda c: _fetch(c), course_ids):
            details_by_id[cid] = details

    fetched_ok = sum(1 for v in details_by_id.values() if v is not None)
    print(
        f"[scrape] Fetched details for {fetched_ok}/{total} courses. Parsing...",
        flush=True,
    )

    parsed_courses = []
    failed = 0
    for i, course_id in enumerate(course_ids, start=1):
        details = details_by_id.get(course_id)
        if details is None:
            failed += 1
            continue
        try:
            course = _parse_course(details, semester, TERM_CODE)
            if course is not None:
                parsed_courses.append(course)
            else:
                failed += 1
        except Exception as exc:
            failed += 1
            print(
                f"[scrape][warn] Failed parsing course_id={course_id}: {exc}",
                flush=True,
            )

        if i % 100 == 0 or i == total:
            print(
                f"[scrape] Parsed {i}/{total} "
                f"(ok={len(parsed_courses)}, failed={failed})",
                flush=True,
            )

    return parsed_courses
