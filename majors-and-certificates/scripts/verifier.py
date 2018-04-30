#!/usr/bin/env python3
import json
from pprint import pprint
import jsonschema # must be installed via pip
import os
import sys
import collections
import time

schema_location = "schema.json" # path to the requirements JSON schema
majors_location = "../majors/" # path to folder conatining the major requirements JSONs
certificates_location = "../certificates/" # path to folder conatining the certificate requirements JSONs
AB_requirements_location = "../degrees/AB_2018.json" # path to the AB requirements JSON
BSE_requirements_location = "../degrees/BSE_2018.json" # path to the BSE requirements JSON

LANGs = [ # language departments
    "ARA","BCS","SLA","CHI","CZE","FRE","GER","MOG","CLG","HEB","HIN","ITA",
    "JPN","KOR","LAT","PER","PLS","POR","RUS","SPA","SWA","TUR","TWI","URD",
]

def check_major(major_name, courses, year=2018, user_info=None):
    """
    Returns information about the major requirements satisfied by the courses
    given in courses.
    
    :param major_name: the name of the major
    :param courses: a list of course-listings
    :param year: the year for which to pull the requirements
    :param user_info: supplementary information about the user
    :type major_name: string
    :type courses: 1D array, 2D array
    :type year: int
    :type user_info: dict
    :returns: Whether the major requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """
    major_filename = major_name + "_" + str(year)  + ".json"
    major_filepath = os.path.join(majors_location, major_filename)
    with open(major_filepath, 'r') as f:
        major = json.load(f)
    with open(schema_location, 'r') as s:
        schema = json.load(s)
    jsonschema.validate(major,schema)
    _init_courses(courses)
    _init_major(major)
    _assign_courses_to_reqs(major, courses)
    formatted_courses = _format_courses_output(courses)
    formatted_major = _format_major_output(major)
    
    return formatted_major["satisfied"], formatted_courses, formatted_major

def _init_major(major):
    _init_counts(major)
    _init_min_ALL(major)
    _init_path_to(major)

def _format_major_output(major):
    '''
    Enforce the type and order of fields in the major output
    '''
    output = collections.OrderedDict()
    if ("name" not in major) or (major["name"] == '') or (major["name"] == None):
        return None
    output["name"] = major["name"]
    output["path_to"] = major["path_to"]
    output["satisfied"] = (major["min_needed"]-major["count"] <= 0)
    for key in ["count", "min_needed", "max_counted"]:
        output[key] = major[key]
    if "req_list" in major: # internal node. recursively call on children
        req_list = []
        for req in major["req_list"]:
            child = _format_major_output(req)
            if (child != None):
                req_list.append(_format_major_output(req))
        if req_list:
            output["req_list"] = req_list
    # elif "course_list" in major:
    #     output["course_list"] = ["..."]
    #     # for course in major["course_list"]:
    #     #     print(course)
    return output

def _init_courses(courses):
    for sem_num,semester in enumerate(courses):
        for course in semester:
            course["name"] = course["name"].split(':')[0]
            course["used"] = False
            course["reqs_satisfied"] = []
            course["semester_number"] = sem_num
    
def _format_courses_output(courses):
    '''
    Enforce the type and order of fields in the courses output
    '''
    output = []
    for i,sem in enumerate(courses):
        output.append([])
        for j,course in enumerate(sem):
            output[i].append(collections.OrderedDict())
            for key in ["name", "used", "reqs_satisfied"]:
                output[i][j][key] = course[key]
    return output

def _json_format(obj):
   return json.dumps(obj, sort_keys=False, indent=2, separators=(',', ': ')) + "\n"

def _init_counts(major):
    """
    Initializes all the counts to zero and ensures that min_needed and 
    max_counted exist.
    """
    major["count"] = 0
    if "min_needed" not in major or major["min_needed"] == None:
        if "type" in major: # check for root
            major["min_needed"] = "ALL"
        else:
            major["min_needed"] = 0
    if "max_counted" not in major:
        major["max_counted"] = None
    if "req_list" in major:
        for req in major["req_list"]:
            _init_counts(req)
    return major

def _init_min_ALL(major):
    """
    Replaces every instance of min_needed="ALL" with the actual number.
    """
    num_counted_from_below = 0
    if "req_list" in major:
        for req in major["req_list"]:
            num_counted_from_below += _init_min_ALL(req)
    elif "course_list" in major: # written as loop in case other actions neeed later
        for _ in major["course_list"]: 
            num_counted_from_below += 1
    elif "dist_req" in major or "num_courses" in major:
        if (major["max_counted"]):
            num_counted_from_below += major["max_counted"]
    if major["min_needed"] == "ALL":
        major["min_needed"] = num_counted_from_below
    if major["max_counted"] == None:
        return num_counted_from_below
    else:
        return min(major["max_counted"], num_counted_from_below)

def _assign_courses_to_reqs(major, courses):
    """
    Finds augmenting paths from leaves to the root, and updates those paths. 
    """
    old_deficit = major["min_needed"] - major["count"]
    if (major["max_counted"] != None):
        old_available = major["max_counted"] - major["count"]
        if old_available <= 0: # already saturated, nothing to update
            return 0
    was_satisfied = (old_deficit <= 0)
    newly_satisfied = 0
    if "req_list" in major: # recursively check subrequirements
        for req in major["req_list"]:
            newly_satisfied += _assign_courses_to_reqs(req, courses)
    elif "course_list" in major:
        newly_satisfied = _mark_courses(major["path_to"],major["course_list"],courses)
    elif "dist_req" in major:
        newly_satisfied = _mark_dist(major["path_to"],major["dist_req"],courses)
    major["count"] += newly_satisfied
    new_deficit = major["min_needed"] - major["count"]
    # new_available = major["max_counted"] - major["count"]
    if (not was_satisfied) and (new_deficit <= 0): # this req just became satisfied
        if major["max_counted"] == None: # unlimited
            return major["count"]
        else:
            return min(major["max_counted"],major["count"]) # cut off at max
    elif (was_satisfied) and (new_deficit <= 0): # this requirement was already satisfied, but added more
        if major["max_counted"] == None: # unlimited
            return newly_satisfied
        else:
            return min(old_available,newly_satisfied) # cut off at old_available
    else: # requirement still not satisfied
        return 0

def _init_path_to(major):
    '''
    Assign a path identifier to each node/subrequirement in the requirements 
    tree with the properties:
    1. The path is unique (no two nodes in the tree have the same path) as long 
        as no two subrequirements in the same subtree have the same name.
    2. The path gives the traversal of the tree needed to reach that node.
    '''
    separator = '//'
    if "path_to" not in major: # only for root of the tree
        major["path_to"] = major["name"]
    if "req_list" in major:
        for i,req in enumerate(major["req_list"]):
            # the identifier is the major name if present, or otherwise, an identifying number
            identifier = ''
            if ("name" not in req) or (req["name"] == '') or (req["name"] == None):
                identifier = "%03d" % i
            else:
                identifier = req["name"]
            req["path_to"] = major["path_to"] + separator + str(identifier)
            _init_path_to(req)

def _mark_courses(path_to, course_list, courses):
    num_marked = 0
    for sem in courses:
        for c in sem:
            if path_to in c["reqs_satisfied"]: # already used
                continue
            for pattern in course_list:
                if _course_match(c["name"], pattern):
                    num_marked += 1
                    c["reqs_satisfied"].append(path_to)
                    c["used"] = True
                    break
    return num_marked

def _mark_dist(path_to, dist_req, courses):
    for sem in courses:
        for c in sem:
            if path_to in c["reqs_satisfied"]: # already used
                continue
            if c["dist_area"] == dist_req:
                c["reqs_satisfied"].append(path_to)
                c["used"] = True
                return 1
    return 0

def _course_match(course_name, pattern):
    pattern = pattern.split(':')[0] # remove course title
    pattern = ["".join(p.split()).upper() for p in pattern.split('/')] # split by '/' and
    course = ["".join(c.split()).upper() for c in course_name.split('/')] # remove spaces
    for c in course:
        for p in pattern:
            if c == p: # exact name matched
                return True
            if p[:4] == 'LANG' and c[:3] in LANGs: # language course
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

def main():
    with open ("verifier_tests/1.test", "r") as f:
        major_name = f.readline()[:-1]
        year = int(f.readline())
        courses = json.loads(f.read())
    satisfied,courses,major = check_major(major_name,courses)
    print(_json_format(courses)),
    print("\n"),
    print(_json_format(major)),

if __name__ == "__main__":
    main()