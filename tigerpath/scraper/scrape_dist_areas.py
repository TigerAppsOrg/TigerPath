#!/usr/bin/env python
"""
Python routines for scraping data from Princeton's registrar.
by Alex Ogier '13.

Kept limping along by Brian Kernighan, with bandaids every year
as the registrar makes format changes.

If run as a python script, the module will dump information on all the courses available
on the registrar website as a JSON format.

Check out LIST_URL to adjust what courses are scraped.

Useful functions are scrape_page() and scrape_all().

Modified by TigerPath Team
"""

from datetime import datetime
import json
import re
import string
import sqlite3
import sys
import urllib.request
from bs4 import BeautifulSoup

URL_PREFIX = "http://registrar.princeton.edu/course-offerings/"
LIST_URL = URL_PREFIX + "search_results.xml?term={term}"
COURSE_URL = URL_PREFIX + "course_details.xml?courseid={courseid}&term={term}"

COURSE_URL_REGEX = re.compile(r'courseid=(?P<id>\d+)')
PROF_URL_REGEX = re.compile(r'dirinfo\.xml\?uid=(?P<id>\d+)')
LISTING_REGEX = re.compile(r'(?P<dept>[A-Z]{3})\s+(?P<num>\d{3})')

def get_course_list(search_page):
  "Grep through the document for a list of course ids."
  soup = BeautifulSoup(search_page)
  links = soup('a', href=COURSE_URL_REGEX)
  courseids = [COURSE_URL_REGEX.search(a['href']).group('id') for a in links]
  return courseids

def clean(str):
  "Return a string with leading and trailing whitespace gone and all other whitespace condensed to a single space."
  return re.sub('\s+', ' ', str.strip())

def get_course_details(soup):
  "Returns a dict of {courseid, area}."


  area = clean(soup('strong')[1].findAllNext(text=True)[1])  # balanced on a pinhead
  if re.match(r'^\((LA|SA|HA|EM|EC|QR|STN|STL)\)$', area):
    area = area[1:-1]
  else:
    area = ''

  match = re.match(r'\(([A-Z]+)\)', clean(soup('strong')[1].findNext(text=True)))
  pretitle = soup.find(text="Prerequisites and Restrictions:")
  descrdiv = soup.find('div', id='descr')
  return {
    'courseid': COURSE_URL_REGEX.search(soup.find('a', href=COURSE_URL_REGEX)['href']).group('id'),
    'area': area, #bwk: this was wrong[1:-1],    # trim parens #  match.group(1) if match != None else ''
    'title': clean(soup('h2')[0].string),  # was [1]
  }

def get_course_listings(soup):
  "Return a list of {dept, number} dicts under which the course is listed."
  listings = soup('strong')[1].string
  return [{'dept': match.group('dept'), 'number': match.group('num')} for match in LISTING_REGEX.finditer(listings)]

def scrape_page(page):
  "Returns a dict containing as much course info as possible from the HTML contained in page."
  soup = BeautifulSoup(page).find('div', id='timetable') # was contentcontainer
  course = get_course_details(soup)
  course['listings'] = get_course_listings(soup)
  return course

def scrape_id(id, TERM_CODE):
  page = urllib.request.urlopen(COURSE_URL.format(term=TERM_CODE, courseid=id))
  return scrape_page(page)

def scrape_all_courses(TERM_CODE):
  """
  Return an iterator over all courses listed on the registrar's site.
  
  Which courses are retrieved are governed by the globals at the top of this module,
  most importantly LIST_URL and TERM_CODE.

  To be robust in case the registrar breaks a small subset of courses, we trap
  all exceptions and log them to stdout so that the rest of the program can continue.
  """
  search_page = urllib.request.urlopen(LIST_URL.format(term=TERM_CODE))
  courseids = get_course_list(search_page)

  n = 0
  for id in courseids:
    try:
      if n > 99999:
        return
      n += 1
      yield scrape_id(id, TERM_CODE)
    except Exception:
      import traceback
      traceback.print_exc(file=sys.stderr)
      sys.stderr.write('Error processing course id {0}\n'.format(id))