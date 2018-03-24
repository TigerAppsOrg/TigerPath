#!/usr/bin/env python
"""
File is modified version of "cos333_scraper.py" by Alex Ogier

"Python routines for scraping data from Princeton's registrar.
by Alex Ogier '13.
Kept limping along by Brian Kernighan, with bandaids every year
as the registrar makes format changes.
If run as a python script, the module will dump information on all the courses available
on the registrar website as a JSON format.
Check out LIST_URL to adjust what courses are scraped.
Useful functions are scrape_page() and scrape_all().""
"""

from datetime import datetime
import json
import re
import string
import sqlite3
import sys
from urllib.request import urlopen
from bs4 import BeautifulSoup

TERM_CODE = 1122  # seems to be fall 11-12
TERM_CODE = 1124  # so 1124 would be spring 11-12
                  # 1134 is definitely spring 13 (course offerings link)`
TERM_CODE = 1134
TERM_CODE = 1142  # fall 2013; spring 2014 will be 1144
TERM_CODE = 1144  # spring 2014
TERM_CODE = 1154  # spring 2015

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
  "Returns a dict of {courseid, area, title, descrip, prereqs}."

#  print "DEBUG"
#  s = soup('h2')
#  print "s = "
#  print s
#  s1 = s[0].string
#  print "s1 = "
#  print s1
#  print "END DEBUG"

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
    ###'descrip': clean(descrdiv.contents[0] if descrdiv else ''),
    'descrip': clean(flatten(descrdiv)),
    'prereqs': clean(pretitle.parent.findNextSibling(text=True)) if pretitle != None else ''
  }

def flatten(dd):
  s = ""
  try:
    for i in dd.contents:
      try:
        s += i
      except:
        s += flatten(i)
  except:
    s += "oh, dear"
  return s

def get_course_listings(soup):
  "Return a list of {dept, number} dicts under which the course is listed."
  listings = soup('strong')[1].string
  return [{'dept': match.group('dept'), 'number': match.group('num')} for match in LISTING_REGEX.finditer(listings)]

def get_course_profs(soup):
  "Return a list of {uid, name} dicts for the professors teaching this course."
  prof_links = soup('a', href=PROF_URL_REGEX)
  return [{'uid': PROF_URL_REGEX.search(link['href']).group('id'), 'name': clean(link.string)} for link in prof_links]

def get_single_class(row):
  "Helper function to turn table rows into class tuples."
  cells = row('td')
  time = cells[2].string.split("-")
  bldg_link = cells[4].strong.a

  # <td><strong>Enrolled:</strong>0
  # <strong> Limit:</strong>11</td>
  enroll = ''
  limit = ''
  if cells[5] != None:    # bwk
    enroll = cells[5].strong.nextSibling.string.strip()

    limit = cells[5].strong.nextSibling.nextSibling.nextSibling
    if limit != None:
      limit = limit.string.strip()
    else:
      limit = "0"

  return {
    'classnum': cells[0].strong.string,
    'section': cells[1].strong.string,
    'days': re.sub(r'\s+', '', cells[3].strong.string),
    'starttime': time[0].strip(),
    'endtime': time[1].strip(),
    'bldg': bldg_link.string.strip(),
    'roomnum': bldg_link.nextSibling.string.replace('&nbsp;', ' ').strip(),
    'enroll': enroll, # bwk
    'limit': limit   #bwk
  }

def get_course_classes(soup):
  "Return a list of {classnum, days, starttime, endtime, bldg, roomnum} dicts for classes in this course."
  class_rows = soup('tr')[1:] # the first row is actually just column headings
  # This next bit tends to cause problems because the registrar includes precepts and canceled
  # classes. Having text in both 1st and 4th columns (class number and day of the week)
  # currently indicates a valid class.
  return [get_single_class(row) for row in class_rows if row('td')[0].strong and row('td')[3].strong.string]

def scrape_page(page):
  "Returns a dict containing as much course info as possible from the HTML contained in page."
  soup = BeautifulSoup(page).find('div', id='timetable') # was contentcontainer
  course = get_course_details(soup)
  course['listings'] = get_course_listings(soup)
  course['profs'] = get_course_profs(soup)
  course['classes'] = get_course_classes(soup)
  return course

def scrape_id(id):
  page = urlopen(COURSE_URL.format(term=TERM_CODE, courseid=id))
  return scrape_page(page)

def scrape_all():
  """
  Return an iterator over all courses listed on the registrar's site.
  
  Which courses are retrieved are governed by the globals at the top of this module,
  most importantly LIST_URL and TERM_CODE.
  To be robust in case the registrar breaks a small subset of courses, we trap
  all exceptions and log them to stdout so that the rest of the program can continue.
  """
  search_page = urlopen(LIST_URL.format(term=TERM_CODE))
  courseids = get_course_list(search_page)

  n = 0
  for id in courseids:
    try:
      if n > 99999:
        return
      n += 1
      yield scrape_id(id)
    except Exception:
      import traceback
      traceback.print_exc(file=sys.stderr)
      sys.stderr.write('Error processing course id {0}\n'.format(id))

if __name__ == "__main__":
  first = True
  for course in scrape_all():
    if first:
      first = False
      print('[')
    else:
      print (',')
    json.dump(course, sys.stdout)
  print (']')

  scrape_all()