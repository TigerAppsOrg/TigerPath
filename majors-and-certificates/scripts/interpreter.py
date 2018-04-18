#!/usr/bin/env python
import json
from pprint import pprint
import jsonschema # must be installed via pip

schemalocation = "schema.json" # specify the requirements JSON schema


def validate(data,schema):
    """
    Validates the JSON stored in data based on the JSON schema stored in schema
    
    :param data: the requirements JSON to be validated
    :param schema: the JSON schema
    :type data: dict (representing a requirements JSON)
    :type schema: dict (representing a JSON schema)
    :returns: true if the data conforms to the JSON schema specified
    :rtype: bool
    """
    try:
        jsonschema.validate(data,schema)
        return True
    except():
        return False

def check_major(major_filename, courses, user_info=None):
    """
    Returns information about the major requirements satisfied by the courses
    given in courses.
    
    :param major_filename: the name of the major requirements JSON
    :param courses: a list of course-listing strings (if 2D, the first \
    dimension is taken to be the semester from 0 to 7)
    :param user_info: supplementary information about the user
    :type major_filename: string
    :type courses: 1D array, 2D array
    :type user_info: dict
    :returns: Whether the major requirements are satisfied
    :rtype: bool, dict
    """
    major = {}
    with open(major_filename, 'r') as f:
        major = json.load(f)
        with open(schemalocation, 'r') as s:
            schema = json.load(s)
    validate(major,schema)
    # for req in major["req_list"]:
    #     print (req["name"])
    #     print (req["explanation"])
        # pprint(major)
    _init_counts(major)
    _init_min_ALL(major)
    _init_path_to(major)
    courses = [[{
        "name": c.split(':')[0],
        "used": False,
        "reqs_satisfied": []
    } for c in sem] for sem in courses]
    _update_paths(major, courses)
    pprint(courses)
    print("\n")
    print(json.dumps(major, sort_keys=False, indent=2, separators=(',', ': ')))
    return (major["min_needed"]-major["count"] <= 0)

def _init_counts(major):
    """
    Initializes all the counts to zero and ensures that min_needed and 
    max_counted exist.
    """
    major["count"] = 0
    if "min_needed" not in major:
        if "type" in major: # check for root
            major["min_needed"] = "ALL"
        else:
            major["min_needed"] = 0
    if major["min_needed"] == None:
        major["min_needed"] = 0
    if "max_counted" not in major:
        major["max_counted"] = None
    if "req_list" in major:
        num_subreqs = 0
        for req in major["req_list"]:
            num_subreqs += 1
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
    if major["min_needed"] == "ALL":
        major["min_needed"] = num_counted_from_below
    if major["max_counted"] == None:
        return num_counted_from_below
    else:
        return min(major["max_counted"], num_counted_from_below)

def _update_paths(major, courses):
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
            newly_satisfied += _update_paths(req, courses)
    elif "course_list" in major:
        newly_satisfied = _mark_courses(major["path_to"],major["course_list"],courses)
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
        pass
    else: # requirement still not satisfied
        return 0

def _init_path_to(major, path_to_parent = ''):
    major["path_to"] = str(path_to_parent) + "::" + str(major["name"])
    if "req_list" in major:
        for req in major["req_list"]:
           _init_path_to(req, major["path_to"])
    pass

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

def _course_match(course_name, pattern):
    pattern = pattern.split(':')[0]
    pattern = pattern.split('/')
    if course_name in pattern:
        return True
    return False

def main():
    courses = [
        [
            "COS 126",
            "COS 226",
            "COS 217",
        ],
        [
            "COS 340",
            "COS 333",
        ],
        [
            "COS 398",
            "COS 306",
            "MUS 314",
            "COS 423",
            "COS 436",
        ],
        [
            "ABC 123",
            "NEU 437",
            "COS 498",
        ]
    ]
    major_filename = "../majors/COS-BSE_2018.json"
    satisfied = check_major(major_filename,courses)
    print (satisfied)
    pass

if __name__ == "__main__":
    main()