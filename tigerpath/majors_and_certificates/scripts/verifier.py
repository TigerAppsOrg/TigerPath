#!/usr/bin/env python3
import json
from pprint import pprint
import os
import sys
import collections
import time
import copy

from .university_info import LANG_DEPTS

MAJORS_LOCATION = "../majors/" # relative path to folder containing the major requirements JSONs
CERTIFICATES_LOCATION = "../certificates/" # relative path to folder containing the certificate requirements JSONs
AB_REQUIREMENTS_LOCATION = "../degrees/AB_2018.json" # relative path to the AB requirements JSON
BSE_REQUIREMENTS_LOCATION = "../degrees/BSE_2018.json" # relative path to the BSE requirements JSON

def check_major(major_name, courses, year):
    """
    Returns information about the major requirements satisfied by the courses
    given in courses.
    
    :param major_name: the name of the major
    :param courses: a list of course-listings
    :param year: the year for which to pull the requirements \
    (by spring semester, so 2018 means 2017-2018 school year)
    :type major_name: string
    :type courses: 2D array
    :type year: int
    :returns: Whether the major requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """
    major_filename = major_name + "_" + str(year) + ".json"
    major_filepath = os.path.join(_get_dir_path(), MAJORS_LOCATION, major_filename)
    return check_requirements(major_filepath, courses, year)

def check_degree(degree_name, courses, year):
    """
    Returns information about the degree requirements satisfied by the courses
    given in courses.
    
    :param degree_name: the name of the degree
    :param courses: a list of course-listings
    :param year: the year for which to pull the requirements \
    (by spring semester, so 2018 means 2017-2018 school year)
    :type degree_name: string
    :type courses: 2D array
    :type year: int
    :returns: Whether the degree requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """
    if degree_name.upper() == "AB":
        degree_filepath = os.path.join(_get_dir_path(), AB_REQUIREMENTS_LOCATION)
    elif degree_name.upper() == "BSE":
        degree_filepath = os.path.join(_get_dir_path(), BSE_REQUIREMENTS_LOCATION)
    return check_requirements(degree_filepath, courses, year)

def check_certificate(certificate_name, courses, year):
    """
    NOTE: Not yet fully supported. Some certificate specific functionality may not 
    be present, or may break.
    
    Returns information about the certificate requirements satisfied by the courses
    given in courses.
    
    :param certificate_name: the name of the certificate
    :param courses: a list of course-listings
    :param year: the year for which to pull the requirements \
    (by spring semester, so 2018 means 2017-2018 school year)
    :type certificate_name: string
    :type courses: 2D array
    :type year: int
    :returns: Whether the certificate requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """
    certificate_filename = certificate_name + "_" + str(year) + ".json"
    certificate_filepath = os.path.join(_get_dir_path(), CERTIFICATES_LOCATION, certificate_filename)
    return check_requirements(certificate_filepath, courses, year)

def check_requirements(req_file, courses, year):
    """
    Returns information about the requirements satisfied by the courses
    given in courses.
    
    :param req_file: the name of a file containing a requirements JSON
    :param courses: a list of course-listings
    :param year: the year for which to pull the requirements \
    (by spring semester, so 2018 means 2017-2018 school year)
    :type req_file: string
    :type courses: 2D array
    :type year: int
    :returns: Whether the requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """
    with open(req_file, 'r') as f:
        req = json.load(f)
    courses = _init_courses(courses, req["name"])
    req = _init_req(req)
    _mark_possible_reqs(req, courses)
    _assign_settled_courses_to_reqs(req, courses)
    _add_course_lists_to_req(req, courses)
    formatted_courses = _format_courses_output(courses)
    formatted_req = _format_req_output(req)
    return formatted_req["satisfied"], formatted_courses, formatted_req

def _init_req(req):
    req = copy.deepcopy(req)
    _init_req_fields(req)
    _init_min_ALL(req)
    _init_double_counting_allowed(req)
    _init_path_to(req)
    return req

def _format_req_output(req):
    '''
    Enforce the type and order of fields in the req output
    '''
    output = collections.OrderedDict()
    if req["name"] == None: # hidden requirement. Do not show.
        return None
    for key in [
        "name",
        "code",
        "degree",
        "path_to",
        "urls"
    ]:
        if key in req:
            output[key] = req[key]
    if "contacts" in req:
        output["contacts"] = []
        for contact in req["contacts"]:
            contact_copy = collections.OrderedDict()
            for key in ["type", "name", "email"]:
                contact_copy[key] = contact[key]
            output["contacts"].append(contact_copy)
    for key in [
        "explanation",
        "pdfs_allowed",
        "completed_by_semester"
    ]:
        if key in req:
            output[key] = req[key]
    output["satisfied"] = (req["min_needed"]-req["count"] <= 0)
    for key in ["count", "min_needed", "max_counted"]:
        output[key] = req[key]
    if "req_list" in req: # internal node. recursively call on children
        req_list = []
        for subreq in req["req_list"]:
            child = _format_req_output(subreq)
            if (child != None):
                req_list.append(_format_req_output(subreq))
        if req_list:
            output["req_list"] = req_list
    if "settled" in req:
        output["settled"] = req["settled"]
    if "unsettled" in req:
        output["unsettled"] = req["unsettled"]
    # collapsed_course_list, collapsed_dist_list = _get_collapsed_course_and_dist_req_sets(req)
    # output["collapsed_course_list"] = sorted(list(collapsed_course_list))
    # output["collapsed_dist_list"] = sorted(list(collapsed_dist_list))
    return output
    
def _add_course_lists_to_req(req, courses):
    """
    Add course lists for each requirement that either
    (a) has no subrequirements, or
    (b) has hidden subrequirements
    """
    include_course_lists = False
    if "req_list" in req:
        for subreq in req["req_list"]:
            if subreq["name"] == None:
                include_course_lists = True
            else: # recursively for all named requirements
                _add_course_lists_to_req(subreq, courses)
    else:
        include_course_lists = True
    if include_course_lists:
        req["settled"] = []
        req["unsettled"] = []
        for sem in courses:
            for course in sem:
                if req["double_counting_allowed"]: 
                    if len(course["reqs_double_counted"]) > 0:
                        for path in course["reqs_double_counted"]:
                            if req["path_to"] in path:
                                req["settled"].append(course["name"])
                                ## add to reqs_satisfied because couldn't be added in _assign_settled_courses_to_reqs()
                                course["reqs_satisfied"].append(req["path_to"])
                elif len(course["settled"]) > 0:
                    for path in course["settled"]:
                        if req["path_to"] in path:
                            req["settled"].append(course["name"])
                else:
                    for path in course["possible_reqs"]:
                        if req["path_to"] in path:
                            req["unsettled"].append(course["name"])
                            break

def _init_courses(courses, req_name = None):
    courses = copy.deepcopy(courses)
    for sem_num,semester in enumerate(courses):
        for course in semester:
            course["name"] = course["name"].split(':')[0]
            course["possible_reqs"] = []
            course["reqs_satisfied"] = []
            course["reqs_double_counted"] = [] # reqs satisfied for which double counting allowed
            course["semester_number"] = sem_num
            course["num_settleable"] = 0 # number of reqs to which can be settled. autosettled if 1
            if "settled" not in course or course["settled"] == None:
                course["settled"] = []
            elif req_name != None: # filter out irrelevant requirements from list
                for path in course["settled"]:
                    if req_name not in path:
                        course["settled"].remove(path)
    return courses
    
def _format_courses_output(courses):
    '''
    Enforce the type and order of fields in the courses output
    '''
    output = []
    for i,sem in enumerate(courses):
        output.append([])
        for j,course in enumerate(sem):
            output[i].append(collections.OrderedDict())
            for key in ["name", "possible_reqs", "reqs_satisfied"]:
                output[i][j][key] = course[key]
            if len(course["settled"]) > 0: # only show if non-empty
                output[i][j]["settled"] = course["settled"]
    return output

def _init_req_fields(req):
    """
    Initializes all the counts to zero and ensures that min_needed and 
    max_counted exist.
    """
    req["count"] = 0
    if ("name" not in req) or (req["name"] == '') or (req["name"] == None):
        req["name"] = None
    if "min_needed" not in req or req["min_needed"] == None:
        if "type" in req: # check for root
            req["min_needed"] = "ALL"
        else:
            req["min_needed"] = 0
    if "max_counted" not in req:
        req["max_counted"] = None
    if "req_list" in req:
        for subreq in req["req_list"]:
            _init_req_fields(subreq)
    elif "num_courses" in req and req["name"] == None and "completed_by_semester" in req:
        req["name"] = "Complete " + str(req["num_courses"]) + " courses by Semester " + str(req["completed_by_semester"])
    return req

def _init_min_ALL(req):
    """
    Replaces every instance of min_needed="ALL" with the actual number.
    """
    num_counted_from_below = 0
    if "req_list" in req:
        for subreq in req["req_list"]:
            num_counted_from_below += _init_min_ALL(subreq)
    elif "course_list" in req: # written as loop in case other actions neeed later
        for _ in req["course_list"]: 
            num_counted_from_below += 1
    elif "dist_req" in req or "num_courses" in req:
        if (req["max_counted"]):
            num_counted_from_below += req["max_counted"]
    if req["min_needed"] == "ALL":
        req["min_needed"] = num_counted_from_below
    if req["max_counted"] == None:
        return num_counted_from_below
    else:
        return min(req["max_counted"], num_counted_from_below)

def _init_double_counting_allowed(req, from_parent=False):
    """
    Initializes the double_counting_allowed field in all subtrees
    """
    if "double_counting_allowed" not in req:
        req["double_counting_allowed"] = from_parent
    if "req_list" in req:
        for subreq in req["req_list"]:
            _init_double_counting_allowed(subreq, req["double_counting_allowed"])

def _init_path_to(req):
    '''
    Assign a path identifier to each node/subrequirement in the requirements 
    tree with the properties:
    1. The path is unique (no two nodes in the tree have the same path) as long 
        as no two subrequirements in the same subtree have the same name.
    2. The path gives the traversal of the tree needed to reach that node.
    '''
    separator = '//'
    if "path_to" not in req: # only for root of the tree
        req["path_to"] = req["name"]
    if "req_list" in req:
        for i,subreq in enumerate(req["req_list"]):
            # the identifier is the req name if present, or otherwise, an identifying number
            identifier = ''
            if ("name" not in subreq) or (subreq["name"] == '') or (subreq["name"] == None):
                identifier = "%03d" % i
            else:
                identifier = subreq["name"]
            subreq["path_to"] = req["path_to"] + separator + str(identifier)
            _init_path_to(subreq)

def _json_format(obj):
   return json.dumps(obj, sort_keys=False, indent=2, separators=(',', ': ')) + "\n"

def _get_dir_path():
    return os.path.dirname(os.path.realpath(__file__))

def _mark_possible_reqs(req, courses):
    """
    Finds all the requirements that each course can satisfy.
    """
    if "req_list" in req: # recursively check subrequirements
        for subreq in req["req_list"]:
            _mark_possible_reqs(subreq, courses)
    elif "course_list" in req:
        _mark_courses(req, courses)
    elif "dist_req" in req:
        _mark_dist(req, courses)

def _assign_settled_courses_to_reqs(req, courses):
    """
    Assigns only settled courses and those that can only satify one requirement,
    and updates the appropriate counts.
    """
    old_deficit = req["min_needed"] - req["count"]
    if (req["max_counted"] != None):
        old_available = req["max_counted"] - req["count"]
        if old_available <= 0: # already saturated, nothing to update
            return 0
    was_satisfied = (old_deficit <= 0)
    newly_satisfied = 0
    if "req_list" in req: # recursively check subrequirements
        for subreq in req["req_list"]:
            newly_satisfied += _assign_settled_courses_to_reqs(subreq, courses)
    elif req["double_counting_allowed"]:
        newly_satisfied = _mark_all(req, courses)
    elif "course_list" in req:
        newly_satisfied = _mark_settled(req, courses)
    elif "dist_req" in req:
        newly_satisfied = _mark_settled(req, courses)
    elif "num_courses" in req:
        newly_satisfied = _check_degree_progress(req, courses)
    req["count"] += newly_satisfied
    new_deficit = req["min_needed"] - req["count"]
    if (not was_satisfied) and (new_deficit <= 0): # this req just became satisfied
        if req["max_counted"] == None: # unlimited
            return req["count"]
        else:
            return min(req["max_counted"],req["count"]) # cut off at max
    elif (was_satisfied) and (new_deficit <= 0): # this requirement was already satisfied, but added more
        if req["max_counted"] == None: # unlimited
            return newly_satisfied
        else:
            return min(old_available,newly_satisfied) # cut off at old_available
    else: # requirement still not satisfied
        return 0

def _mark_courses(req, courses):
    num_marked = 0
    for sem in courses:
        for c in sem:
            if req["path_to"] in c["possible_reqs"]: # already used
                continue
            for pattern in req["course_list"]:
                if _course_match(c["name"], pattern):
                    num_marked += 1
                    c["possible_reqs"].append(req["path_to"])
                    if not req["double_counting_allowed"]:
                        c["num_settleable"] += 1
                    break
    return num_marked

def _mark_dist(req, courses):
    num_marked = 0
    for sem in courses:
        for c in sem:
            if req["path_to"] in c["possible_reqs"]: # already used
                continue
            if c["dist_area"] == req["dist_req"]:
                num_marked += 1
                c["possible_reqs"].append(req["path_to"])
                if not req["double_counting_allowed"]:
                    c["num_settleable"] += 1
    return num_marked

def _mark_settled(req, courses):
    """
    Finds and marks all courses in 'courses' that have been settled to 
    this requirement.
    """
    num_marked = 0
    for sem in courses:
        for c in sem:
            if len(c["reqs_satisfied"]) > 0: # already used in some subreq
                continue
            if len(c["settled"])>0:
                for p in c["settled"]: # go through the settled paths
                    if p in req["path_to"] and req["path_to"] in c["possible_reqs"]: # c was settled into this requirement
                        num_marked += 1
                        c["reqs_satisfied"].append(req["path_to"])
                        break
            elif c["num_settleable"] == 1 and req["path_to"] in c["possible_reqs"]:
                num_marked += 1
                c["reqs_satisfied"].append(req["path_to"])
                c["settled"].append(req["path_to"])
    return num_marked

def _mark_all(req, courses):
    """
    Finds and marks all courses in 'courses' that satisfy a requirement where
    double counting is allowed.
    """
    num_marked = 0
    for sem in courses:
        for c in sem:
            if req["path_to"] in c["possible_reqs"]:
                num_marked += 1
                c["reqs_double_counted"].append(req["path_to"])
    return num_marked

def _check_degree_progress(req, courses):
    """
    Checks whether the correct number of courses have been completed by the 
    end of semester number 'by_semester' (1-8)
    """
    by_semester = req["completed_by_semester"]
    num_courses = 0
    if by_semester == None or by_semester > len(courses):
        by_semester = len(courses)
    for i in range(by_semester):
        num_courses += len(courses[i])
    if num_courses >= req["num_courses"]:
        return 1
    else:
        return 0

def _course_match(course_name, pattern):
    pattern = pattern.split(':')[0] # remove course title
    pattern = ["".join(p.split()).upper() for p in pattern.split('/')] # split by '/' and
    course = ["".join(c.split()).upper() for c in course_name.split('/')] # remove spaces
    for c in course:
        for p in pattern:
            if c == p: # exact name matched
                return True
            if p[:4] == 'LANG' and c[:3] in LANG_DEPTS: # language course
                if c[3:] == p[4:]: # course numbers match
                    return True
                if (len(p)>4 and p[4] == '*'): # 'LANG*' or 'LANG***'
                    return True
                if (len(c)>4 and len(p)>5 and 
                    p[5] == '*' and c[3:4] == p[4:5]): # 'LANG1*' or 'LANG1**'
                    return True
                if (len(c)>5 and len(p)>6 and 
                    p[6] == '*' and c[3:5] == p[4:6]): # 'LANG12*'
                    return True
                if (len(c)>6 and len(p)>7 and 
                    p[7] == '*' and c[3:6] == p[4:7]): # 'LANG123*'
                    return True
            # non-language course
            if (len(c)>3 and len(p)>3 and 
                    p[3] == '*' and c[:3] == p[:3]): # 'AAA*' or 'AAA***'
                return True
            if (len(c)>4 and len(p)>4 and 
                    p[4] == '*' and c[:4] == p[:4]): # 'AAA1*' or 'AAA1**'
                return True
            if (len(c)>5 and len(p)>5 and 
                    p[5] == '*' and c[:5] == p[:5]): # 'AAA12*'  Note: not currently in format spec
                return True
            if (len(c)>6 and len(p)>6 and 
                    p[6] == '*' and c[:6] == p[:6]): # 'AAA123*' matches to 'AAA123C'
                return True
    return False

def _get_req_by_path(req, path_to):
    '''
    Returns the subrequirement of req that is pointed to by path_to
    '''
    if "path_to" not in req:
        _init_path_to(req)
    if req["path_to"] == path_to:
        return req
    if "req_list" in req:
        for subreq in req["req_list"]:
            if _get_req_by_path(subreq, path_to):
                return subreq
    return None

def _get_collapsed_course_and_dist_req_sets(req):
    '''
    Returns the sets of all courses and all distribution requirements
    in req's subtree as a tuple:
    (course_set, dist_req_set)
    Note: Sets may contain duplicate courses if a course is listed in multiple
    different ways
    '''
    if "course_list" in req:
        course_set = set()
        for course in req["course_list"]:
            course = course.split(':')[0] # strip course name
            course_set.add(course)
        return (course_set, set())
    if "dist_req" in req:
        return (set(), set([req["dist_req"]]))
    total_course_set = set()
    total_dist_req_set = set()
    if "req_list" in req:
        for subreq in req["req_list"]:
            course_set, dist_req_set = _get_collapsed_course_and_dist_req_sets(subreq)
            if course_set:
                total_course_set |= course_set # union of both sets
            if dist_req_set:
                total_dist_req_set |= dist_req_set # union of both sets
    return (total_course_set, total_dist_req_set)

def main():
    with open ("verifier_tests/1.test", "r") as f:
        major_name = f.readline()[:-1]
        year = int(f.readline())
        courses = json.loads(f.read())
    satisfied,courses,major = check_major(major_name,courses,year)
    print(_json_format(courses))
    print(_json_format(major))

if __name__ == "__main__":
    main()