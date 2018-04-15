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
    # _update_path(major)
    print (json.dumps(major, sort_keys=False, indent=2, separators=(',', ': ')))
    return False

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

def _update_path(major):
    deficit = major["min_needed"] - major["count"]
    available = major["max_counted"] - major["count"]
    if available <= 0: # already saturated, nothing to update
        return 0
    newly_satisfied = 0
    if "req_list" in major:
        for req in major["req_list"]:
            newly_satisfied += _update_path(req)
    major["count"] += newly_satisfied
    deficit = major["min_needed"] - major["count"]
    available = major["max_counted"] - major["count"]
    if deficit <= 0: # this req is now satisfied
        if major["max_counted"] == None:
            return major["count"]
        else:
            return min(major["max_counted"],major["count"])
    return 0

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
        ]
    ]
    major_filename = "../majors/COS-BSE_2018.json"
    satisfied = check_major(major_filename,courses)
    print (satisfied)
    pass

if __name__ == "__main__":
    main()