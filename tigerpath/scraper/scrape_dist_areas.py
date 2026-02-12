#!/usr/bin/env python
"""
Python routines for scraping data from Princeton's registrar.
by Alex Ogier '13.

Kept limping along by Brian Kernighan, with bandaids every year
as the registrar makes format changes.

Modified by TigerPath Team
"""

import re
import urllib.request
from http.client import RemoteDisconnected

from bs4 import BeautifulSoup

URL_PREFIX = "http://registrar.princeton.edu/course-offerings/"
COURSE_URL = URL_PREFIX + "course_details.xml?courseid={courseid}&term={term}"
COURSE_URL_REGEX = re.compile(r"courseid=(?P<id>\d+)")


def clean(str):
    """Return a string with leading and trailing whitespace gone and all other whitespace condensed to a single space."""
    return re.sub(r"\s+", " ", str.strip())


def get_course_details(soup):
    """Returns a dict of {courseid, area}."""

    area = clean(soup("strong")[1].findAllNext(text=True)[1])  # balanced on a pinhead
    if re.match(r"^\((LA|SA|HA|EM|EC|QR|STN|STL)\)$", area):
        area = area[1:-1]
    else:
        area = ""

    return {
        "courseid": COURSE_URL_REGEX.search(soup.find("a", href=COURSE_URL_REGEX)["href"]).group(
            "id"
        ),
        "area": area,  # bwk: this was wrong[1:-1],    # trim parens #  match.group(1) if match != None else ''
    }


def scrape_page(page):
    """Returns a dict containing as much course info as possible from the HTML contained in page."""
    soup = BeautifulSoup(page, "lxml").find("div", id="timetable")  # was contentcontainer
    course = get_course_details(soup)
    return course


def scrape_id(id, TERM_CODE):
    for _ in range(3):
        try:
            page = urllib.request.urlopen(COURSE_URL.format(term=TERM_CODE, courseid=id))
            return scrape_page(page)
        except RemoteDisconnected as e:
            print(f"Retrying scraping course id {id}")
            print(e)
        else:
            break
    else:
        raise Exception(f"Scraping course id {id} failed")
