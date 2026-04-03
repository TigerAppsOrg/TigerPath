"""
scrape_registrar.py
Fetches course data from Princeton Registrar's front-end API.
No OIT API Store subscription required — uses a Bearer token scraped
from the public Registrar course-offerings page (via cloudscraper to
bypass Cloudflare).
"""

import json
import re
from concurrent.futures import ThreadPoolExecutor

import cloudscraper
import requests

_REGISTRAR_PAGE_URL = "https://registrar.princeton.edu/course-offerings"
_REGISTRAR_DETAILS_URL = (
    "https://api.princeton.edu/registrar/course-offerings/course-details"
)
_USER_AGENT = "Mozilla/5.0 (compatible; TigerPath/1.0; +https://path.tigerapps.org)"

_cached_token = None
_cached_api_base_url = None


def _fetch_registrar_page():
    """Fetch the registrar page with cloudscraper (handles Cloudflare) and cache token + base URL."""
    global _cached_token, _cached_api_base_url

    scraper = cloudscraper.create_scraper()
    resp = scraper.get(
        _REGISTRAR_PAGE_URL,
        headers={"User-Agent": _USER_AGENT},
        timeout=30,
    )
    resp.raise_for_status()
    html = resp.text

    token = ""
    api_base_url = ""

    m = re.search(
        r'data-drupal-selector="drupal-settings-json"[^>]*>(.*?)</script>',
        html,
        re.DOTALL,
    )
    if m:
        try:
            ps = json.loads(m.group(1)).get("ps_registrar", {})
            token = ps.get("apiToken", "")
            api_base_url = ps.get("apiBaseUrl", "")
        except Exception:
            pass

    # Fallback regex for token
    if not token:
        m2 = re.search(r'"apiToken"\s*:\s*"([^"]+)"', html)
        if m2:
            token = m2.group(1)

    if not token:
        raise RuntimeError(
            "Could not extract registrar API token from "
            f"{_REGISTRAR_PAGE_URL}. Page structure may have changed."
        )

    if not api_base_url:
        api_base_url = "https://api.princeton.edu/registrar/course-offerings/1.0.6"

    _cached_token = token
    _cached_api_base_url = api_base_url


def get_registrar_token():
    """Return (and cache) the Bearer token from the Registrar page."""
    global _cached_token
    if not _cached_token:
        _fetch_registrar_page()
    return _cached_token


def get_api_base_url():
    """Return (and cache) the registrar API base URL from the Registrar page."""
    global _cached_api_base_url
    if not _cached_api_base_url:
        _fetch_registrar_page()
    return _cached_api_base_url


def get_course_ids_for_term(term, token, api_base_url):
    """
    Fetch all unique course IDs for a term using the registrar /classes/{term} endpoint.
    Returns an empty list when the term has no data (e.g. historical terms).
    """
    resp = requests.get(
        f"{api_base_url}/classes/{term}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "User-Agent": _USER_AGENT,
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    classes = (data.get("classes") or {}).get("class", []) or []
    if not classes:
        return []
    seen = set()
    course_ids = []
    for cls in classes:
        cid = cls.get("course_id", "")
        if cid and cid not in seen:
            seen.add(cid)
            course_ids.append(cid)
    return course_ids


def get_full_course_details(term, course_id, token):
    """
    Call the course-details endpoint and return a dict with all fields needed
    by scrape_parse.  Returns None on failure.

    Returned dict keys:
        title, description, distribution_area, instructors,
        crosslistings, subject, catnum, course_id, term, sections
    """
    try:
        resp = requests.get(
            _REGISTRAR_DETAILS_URL,
            params={"term": term, "course_id": course_id},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "User-Agent": _USER_AGENT,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        print(
            f"[scrape_registrar][warn] course-details failed for "
            f"term={term} course_id={course_id}: {exc}",
            flush=True,
        )
        return None

    details_list = (data.get("course_details") or {}).get("course_detail", [])
    if not details_list:
        return None
    detail = details_list[0] if isinstance(details_list, list) else details_list

    # Distribution area: "QR" or "SA or QR" → "SA,QR"
    dist_raw = detail.get("distribution_area_short") or ""
    distribution_area = ",".join(dist_raw.split(" or "))

    # Instructors
    inst_data = detail.get("course_instructors") or {}
    inst_list = inst_data.get("course_instructor", [])
    if isinstance(inst_list, dict):
        inst_list = [inst_list]
    instructors = [
        {"full_name": i.get("name", "")}
        for i in inst_list
        if i.get("name")
    ]

    # Sections
    sec_data = detail.get("course_sections") or {}
    sec_list = sec_data.get("course_section", [])
    if isinstance(sec_list, dict):
        sec_list = [sec_list]
    sections = [s for s in (_parse_section(s) for s in sec_list) if s is not None]

    return {
        "title": detail.get("long_title") or "",
        "description": detail.get("description") or "",
        "distribution_area": distribution_area,
        "instructors": instructors,
        "crosslistings": detail.get("crosslistings") or "",
        "subject": detail.get("subject") or "",
        "catnum": (detail.get("catnum") or "").strip(),
        "course_id": detail.get("course_id") or course_id,
        "term": str(detail.get("term") or term),
        "sections": sections,
    }


def _parse_section(sec):
    """Parse a course_section dict into TigerPath's section format, or None to skip."""
    class_number = sec.get("class_number") or ""
    section_name = sec.get("section") or ""
    if not class_number or not section_name:
        return None

    sec_type = _section_type_from_name(section_name)

    # Build days string from Y/N day flags
    days = ""
    if sec.get("mon") == "Y":   days += "M "
    if sec.get("tues") == "Y":  days += "T "
    if sec.get("wed") == "Y":   days += "W "
    if sec.get("thurs") == "Y": days += "Th "
    if sec.get("fri") == "Y":   days += "F "
    if sec.get("sat") == "Y":   days += "Sa "
    if sec.get("sun") == "Y":   days += "Su "
    days = days.strip()[:10]

    start_time = sec.get("start_time") or "12:00 am"
    end_time = sec.get("end_time") or "12:00 am"

    building = (sec.get("building_name") or "").strip()
    room = (sec.get("room") or "").strip()
    location = (building + " " + room).strip()

    # Enrollment data moved to a different API — use "0" as placeholder
    enrl_cap = sec.get("enrl_cap") or ""
    enrl_tot = sec.get("enrl_tot") or ""
    capacity = (
        "0" if not enrl_cap or "Data moved" in enrl_cap else enrl_cap
    )
    enrollment = (
        "0" if not enrl_tot or "Data moved" in enrl_tot else enrl_tot
    )

    return {
        "registrar_id": class_number,
        "name": section_name,
        "type": sec_type,
        "capacity": capacity,
        "enrollment": enrollment,
        "meetings": [
            {
                "start_time": start_time,
                "end_time": end_time,
                "days": days,
                "location": location,
            }
        ],
    }


def _section_type_from_name(section_name):
    """Map a section name prefix (L01→LEC, P01→PRE, …) to a 3-char uppercase type."""
    prefix = (section_name or "")[:1].upper()
    return {
        "L": "LEC",
        "P": "PRE",
        "S": "SEM",
        "B": "LAB",
        "C": "CLA",
        "E": "EAR",
        "D": "DRL",
        "F": "FLD",
        "R": "REC",
        "T": "STU",
    }.get(prefix, "CLA")
