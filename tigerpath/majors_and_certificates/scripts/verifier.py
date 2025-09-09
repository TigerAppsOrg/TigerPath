#!/usr/bin/env python3
import yaml
from functools import lru_cache
from pprint import pprint
import os
import sys
import collections
import time
import copy
import requests

from . import university_info

# Allow overriding the data repo base via env var for easy testing
# Must end with a trailing slash and point to a raw.githubusercontent.com base
REMOTE_DATA_REPO_URL = os.getenv(
    "DEPT_DATA_URL",
    "https://raw.githubusercontent.com/TigerAppsOrg/Princeton-Departmental-Data/old/",
)

# connect/read timeouts so requests never hang workers indefinitely
_HTTP_TIMEOUT = (3.05, 7)


@lru_cache(maxsize=256)
def _fetch_remote_yaml(path: str):
    """
    Fetch and parse YAML from the remote requirements repository with a timeout.

    Results are cached in-process to avoid repeated network requests on hot paths.
    """
    resp = requests.get(REMOTE_DATA_REPO_URL + path, timeout=_HTTP_TIMEOUT)
    resp.raise_for_status()
    return yaml.safe_load(resp.text)

MAJORS_LOCATION = (
    "majors/"  # relative path to folder containing the major requirements JSONs
)
CERTIFICATES_LOCATION = "certificates/"  # relative path to folder containing the certificate requirements JSONs
DEGREES_LOCATION = (
    "degrees/"  # relative path to the folder containing the AB/BSE requirements JSONs
)

REQ_PATH_SEPARATOR = "//"
# REQ_PATH_PREFIX := <type>//<year>//<dept_code or degree_code or certificate_name>
# Limit the type to 12 characters and the code/name to 100 characters
REQ_PATH_PREFIX = "%.12s" + REQ_PATH_SEPARATOR + "%d" + REQ_PATH_SEPARATOR + "%.100s"

DEFAULT_SCHEDULE = [[]] * 8


def check_major(major_name, courses, year):
    """
    Returns information about the major requirements satisfied by the courses
    given in courses.

    :param major_name: the name of the major
    :param courses: a list of course-listings
    :param year: the user's class year for which to read the requirements
    :type major_name: string
    :type courses: 2D array
    :type year: int
    :returns: Whether the major requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """
    year = int(year)
    if year < 2000 or year > 3000:
        raise ValueError("Year is invalid.")
    if (
        major_name not in university_info.AB_CONCENTRATIONS
        and major_name not in university_info.BSE_CONCENTRATIONS
    ):
        raise ValueError("Major code not recognized.")
    major_filename = "%s.yaml" % major_name
    major_filepath = os.path.join(MAJORS_LOCATION, major_filename)
    return check_requirements(major_filepath, courses, year)


def check_degree(degree_name, courses, year):
    """
    Returns information about the degree requirements satisfied by the courses
    given in courses.

    :param degree_name: the name of the degree
    :param courses: a list of course-listings
    :param year: the user's class year for which to read the requirements
    :type degree_name: string
    :type courses: 2D array
    :type year: int
    :returns: Whether the degree requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """
    year = int(year)
    degree_name = degree_name.upper()
    if year < 2000 or year > 3000:
        raise ValueError("Year is invalid.")
    if degree_name not in ["AB", "BSE"]:
        raise ValueError("Invalid degree name: %s" % degree_name)
    degree_filename = "%s.yaml" % degree_name
    degree_filepath = os.path.join(DEGREES_LOCATION, degree_filename)
    return check_requirements(degree_filepath, courses, year)


def check_certificate(certificate_name, courses, year):
    """
    NOTE: Not yet fully supported. Some certificate specific functionality may not
    be present, or may break.

    Returns information about the certificate requirements satisfied by the courses
    given in courses.

    :param certificate_name: the name of the certificate
    :param courses: a list of course-listings
    :param year: the user's class year for which to read the requirements
    :type certificate_name: string
    :type courses: 2D array
    :type year: int
    :returns: Whether the certificate requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """
    year = int(year)
    if year < 2000 or year > 3000:
        raise ValueError("Year is invalid.")
    if certificate_name not in university_info.CERTIFICATES:
        raise ValueError("Certificate not recognized.")
    certificate_filename = "%s.yaml" % certificate_name
    certificate_filepath = os.path.join(CERTIFICATES_LOCATION, certificate_filename)
    return check_requirements(certificate_filepath, courses, year)


def check_requirements(req_file, courses, year):
    """
    Returns information about the requirements satisfied by the courses
    given in courses.

    :param req_file: the name of a file containing a requirements JSON
    :param courses: a list of course-listings
    :param year: the user's class year for which to read the requirements
    :type req_file: string
    :type courses: 2D array
    :type year: int
    :returns: Whether the requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """
    req = _fetch_remote_yaml(req_file)
    courses = _init_courses(courses, req, year)
    req = _init_req(req, year)
    _mark_possible_reqs(req, courses)
    _assign_settled_courses_to_reqs(req, courses)
    _add_course_lists_to_req(req, courses)
    formatted_courses = _format_courses_output(courses)
    formatted_req = _format_req_output(req)
    return formatted_req["satisfied"], formatted_courses, formatted_req


def get_courses_by_path(path):
    """
    Returns the sets of all courses and all distribution requirements
    in the subtree specified by path as a tuple:
    (course_set, dist_req_set)
    Note: Sets may contain duplicate courses if a course is listed in multiple
    different ways
    Note: the path parameter must be a requirement path string that was generated
    through calling _init_path_to()
    Implementation is sensitive to the path format, which must start with
    <type>//<year>//<dept_code>
    where the <>'s are replaced with the appropriate values.

    :param path: the path identifier of a requirement as generated by _init_path_to()
    :type path: string
    :raises: ValueError - if the path was not generated by _init_path_to()
    :returns: the tuple (course_set, dist_req_set)
    :rtype: (set, set)
    """
    req_type, year, req_name = path.split(REQ_PATH_SEPARATOR)[:3]
    year = int(year)
    if year < 2000 or year > 3000:
        raise ValueError("Path malformatted.")
    if not path.startswith(REQ_PATH_PREFIX % (req_type, year, req_name)):
        raise ValueError("Path malformatted.")
    if "/" in req_type or "/" in req_name:
        raise ValueError("Path malformatted.")
    filename = "%s.yaml" % req_name
    if req_type == "Major":
        if (
            req_name not in university_info.AB_CONCENTRATIONS
            and req_name not in university_info.BSE_CONCENTRATIONS
        ):
            raise ValueError("Path malformatted.")
        req_filepath = os.path.join(MAJORS_LOCATION, filename)
    elif req_type == "Certificate":
        if req_name not in university_info.CERTIFICATES:
            raise ValueError("Path malformatted.")
        req_filepath = os.path.join(CERTIFICATES_LOCATION, filename)
    elif req_type == "Degree":
        if req_name not in ["AB", "BSE"]:
            raise ValueError("Path malformatted.")
        req_filepath = os.path.join(DEGREES_LOCATION, filename)
    else:
        raise ValueError("Path malformatted.")
    req = _fetch_remote_yaml(req_filepath)
    _init_year_switch(req, year)
    subreq = _get_req_by_path(req, path, year)
    if not subreq:
        raise ValueError("Path malformatted: " + path)
    return _get_collapsed_course_and_dist_req_sets(subreq)


def _init_req(req, year):
    req = copy.deepcopy(req)
    _init_year_switch(req, year)
    _init_req_fields(req)
    _init_min_ALL(req)
    _init_double_counting_allowed(req)
    _init_path_to(req, year)
    return req


def _format_req_output(req):
    """
    Enforce the type and order of fields in the req output
    """
    output = collections.OrderedDict()
    if req["name"] == None:  # hidden requirement. Do not show.
        return None
    for key in ["name", "code", "degree", "path_to", "urls"]:
        if key in req:
            output[key] = req[key]
    if "code" in req and "description" in req:
        output["description"] = req["description"]
    if "contacts" in req:
        output["contacts"] = []
        for contact in req["contacts"]:
            contact_copy = collections.OrderedDict()
            # Be resilient to missing fields in upstream data
            contact_copy["type"] = contact.get("type", "")
            contact_copy["name"] = contact.get("name", "")
            contact_copy["email"] = contact.get("email", "")
            output["contacts"].append(contact_copy)
    for key in ["explanation", "pdfs_allowed", "completed_by_semester"]:
        if key in req:
            output[key] = req[key]
    output["satisfied"] = req["min_needed"] - req["count"] <= 0
    for key in ["count", "min_needed", "max_counted"]:
        output[key] = req[key]
    if "req_list" in req:  # internal node. recursively call on children
        req_list = []
        for subreq in req["req_list"]:
            child = _format_req_output(subreq)
            if child != None:
                req_list.append(_format_req_output(subreq))
        if req_list:
            output["req_list"] = req_list
    if "settled" in req:
        output["settled"] = req["settled"]
    if "unsettled" in req:
        output["unsettled"] = req["unsettled"]
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
            else:  # recursively for all named requirements
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
                            if path.startswith(req["path_to"]):
                                req["settled"].append(course["name"])
                                ## add to reqs_satisfied because couldn't be added in _assign_settled_courses_to_reqs()
                                course["reqs_satisfied"].append(req["path_to"])
                elif len(course["settled"]) > 0:
                    for path in course["settled"]:
                        if path.startswith(req["path_to"]):
                            req["settled"].append(course["name"])
                else:
                    for path in course["possible_reqs"]:
                        if path.startswith(req["path_to"]):
                            req["unsettled"].append(course["name"])
                            break


def _init_courses(courses, req, year):
    if not courses:
        courses = DEFAULT_SCHEDULE
    else:
        courses = copy.deepcopy(courses)
    for sem_num, semester in enumerate(courses):
        for course in semester:
            course["name"] = _get_course_name_from_pattern(course["name"])
            course["possible_reqs"] = []
            course["reqs_satisfied"] = []
            course[
                "reqs_double_counted"
            ] = []  # reqs satisfied for which double counting allowed
            course["semester_number"] = sem_num
            course[
                "num_settleable"
            ] = 0  # number of reqs to which can be settled. autosettled if 1
            if "external" not in course:
                course["external"] = False
            if "settled" not in course or course["settled"] == None:
                course["settled"] = []
            elif req["type"] in [
                "Major",
                "Degree",
            ]:  # filter out irrelevant requirements from list
                for path in course["settled"]:
                    if not path.startswith(
                        REQ_PATH_PREFIX % (req["type"], year, req["code"])
                    ):
                        course["settled"].remove(path)
            else:  # type must be "Certificate"
                for path in course["settled"]:
                    if not path.startswith(
                        REQ_PATH_PREFIX % (req["type"], year, req["name"])
                    ):
                        course["settled"].remove(path)
    return courses


def _format_courses_output(courses):
    """
    Enforce the type and order of fields in the courses output
    """
    output = []
    for i, sem in enumerate(courses):
        output.append([])
        for j, course in enumerate(sem):
            output[i].append(collections.OrderedDict())
            for key in ["name", "possible_reqs", "reqs_satisfied"]:
                output[i][j][key] = course[key]
            if len(course["settled"]) > 0:  # only show if non-empty
                output[i][j]["settled"] = course["settled"]
    return output


def _year_matches_code(year, code):
    """
    Returns whether `year` falls in the range specified by `code`
    """
    if isinstance(code, int):  # explicitly specified year as an int
        return year == code
    if not code or code.lower() == "default":  # empty indicates default case
        return True
    code = code.replace(" ", "")  # strip it of spaces for processing
    if code.startswith("<="):
        return year <= int(code[2:])
    elif code.startswith(">="):
        return year >= int(code[2:])
    elif code.startswith("<"):
        return year < int(code[1:])
    elif code.startswith(">"):
        return year > int(code[1:])
    elif code.startswith("=="):
        return year == int(code[2:])
    elif code.startswith("!="):
        return year != int(code[2:])
    elif "-" in code:  # range of years (inclusive), such as "2018-2020"
        fr, to, *_ = code.split("-")
        return year >= int(fr) and year <= int(to)
    else:  # just the year is the same as ==
        return year == int(code)


def _init_year_switch(req, year):
    """
    Checks for any year_switch primitives and selects the right subrequirements.

    Any requirement that contains a year_switch is overridden by the first
    subrequirement of that year_switch whose year code matches the user's
    class year.
    Fields in req are overridden by any explicitly listed fields of the
    overriding subrequirement, but any fields not specified by the
    subrequirement remain as is (except the year_switch, which is removed).

    If no year code matches, the requirement is unchanged and the year_switch
    is just removed (that is, the year_switch is ignored and has no effect).
    """
    if "year_switch" in req:
        newreq = {}
        for subreq in req["year_switch"]:
            code = subreq.get("year_code", None)  # year_code set to default
            if _year_matches_code(year, code):
                newreq = subreq
                break  # stop at the first year code that matches
        del req["year_switch"]
        if "year_code" in newreq:
            del newreq["year_code"]
        req.update(newreq)  # override with the values from subreq
    # Note that the recursive case below can always still happen even if the
    # year_switch above was triggered, since it may have just gained a req_list
    # from the overriding subrequirement.
    if "req_list" in req:
        for subreq in req["req_list"]:
            _init_year_switch(subreq, year)


def _init_req_fields(req):
    """
    Initializes all the counts to zero and ensures that min_needed and
    max_counted exist.
    """
    req["count"] = 0
    if ("name" not in req) or (req["name"] == "") or (req["name"] == None):
        req["name"] = None
    if "no_req" in req:  # enforce that no_req cannot require a non-zero count
        req["no_req"] = None  # ignore the contents of a no_req
        req["min_needed"] = 0
        req["max_counted"] = 0
    if "min_needed" not in req or req["min_needed"] == None:
        if "type" in req:  # check for root
            req["min_needed"] = "ALL"
        else:
            req["min_needed"] = 0
    if "max_counted" not in req:
        req["max_counted"] = None
    if "req_list" in req:
        for subreq in req["req_list"]:
            _init_req_fields(subreq)
    elif "course_list" in req and "excluded_course_list" not in req:
        req["excluded_course_list"] = []
    elif "num_courses" in req:
        req["min_needed"] = req["num_courses"]
    if "dist_req" in req and isinstance(req["dist_req"], str):
        req["dist_req"] = [
            req["dist_req"]
        ]  # backwards compatibility with non-list dist_req
    return req


def _init_min_ALL(req):
    """
    Replaces every instance of min_needed="ALL" with the actual number.
    """
    num_counted_from_below = 0
    if "req_list" in req:
        for subreq in req["req_list"]:
            num_counted_from_below += _init_min_ALL(subreq)
    elif "course_list" in req:  # written as loop in case other actions neeed later
        for _ in req["course_list"]:
            num_counted_from_below += 1
    elif "dist_req" in req or "num_courses" in req:
        if req["max_counted"]:
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


def _init_path_to(req, year):
    """
    Assign a path identifier to each node/subrequirement in the requirements
    tree with the properties:
    1. The path is unique (no two nodes in the tree have the same path) as long
        as no two subrequirements in the same subtree have the same name.
    2. The path gives the traversal of the tree needed to reach that node.
    """
    if "path_to" not in req:  # only for root of the tree
        if req["type"] in ["Major", "Degree"]:
            req["path_to"] = REQ_PATH_PREFIX % (req["type"], year, req["code"])
        else:  # type must be "Certificate"
            req["path_to"] = REQ_PATH_PREFIX % (req["type"], year, req["name"])
    if "req_list" in req:
        for i, subreq in enumerate(req["req_list"]):
            # the identifier is the req name if present, or otherwise, an identifying number
            identifier = ""
            if (
                ("name" not in subreq)
                or (subreq["name"] == "")
                or (subreq["name"] == None)
            ):
                identifier = "%03d" % i
            else:
                identifier = subreq["name"]
            subreq["path_to"] = req["path_to"] + REQ_PATH_SEPARATOR + str(identifier)
            _init_path_to(subreq, year)


def _json_format(obj):
    import json

    return json.dumps(obj, sort_keys=False, indent=2, separators=(",", ": ")) + "\n"


def _get_dir_path():
    return os.path.dirname(os.path.realpath(__file__))


def _mark_possible_reqs(req, courses):
    """
    Finds all the requirements that each course can satisfy.
    """
    if "req_list" in req:  # recursively check subrequirements
        for subreq in req["req_list"]:
            _mark_possible_reqs(subreq, courses)
    else:  # note: course_list and dist_req can both be specified for the same req
        if "course_list" in req:
            _mark_courses(req, courses)
        if "dist_req" in req:
            _mark_dist(req, courses)


def _assign_settled_courses_to_reqs(req, courses):
    """
    Assigns only settled courses and those that can only satify one requirement,
    and updates the appropriate counts.
    """
    old_deficit = req["min_needed"] - req["count"]
    if req["max_counted"] != None:
        old_available = req["max_counted"] - req["count"]
    was_satisfied = old_deficit <= 0
    newly_satisfied = 0
    if "req_list" in req:  # recursively check subrequirements
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
    if (not was_satisfied) and (new_deficit <= 0):  # this req just became satisfied
        if req["max_counted"] == None:  # unlimited
            return req["count"]
        else:
            return min(req["max_counted"], req["count"])  # cut off at max
    elif (was_satisfied) and (
        new_deficit <= 0
    ):  # this requirement was already satisfied, but added more
        if req["max_counted"] == None:  # unlimited
            return newly_satisfied
        else:
            return min(old_available, newly_satisfied)  # cut off at old_available
    else:  # requirement still not satisfied
        return 0


def _mark_courses(req, courses):
    num_marked = 0
    for sem in courses:
        for c in sem:
            if req["path_to"] in c["possible_reqs"]:  # already used
                continue
            excluded = False
            for pattern in req["excluded_course_list"]:
                if _course_match(c["name"], pattern):
                    excluded = True
            if excluded:  # this course cannot count for this req, so skip it
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
            if req["path_to"] in c["possible_reqs"]:  # already used
                continue
            if c["dist_area"] is None:
                continue
            dist_areas = c["dist_area"].split(",")
            if bool(set(dist_areas) & set(req["dist_req"])):
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
            if len(c["reqs_satisfied"]) > 0:  # already used in some subreq
                continue
            if len(c["settled"]) > 0:
                for p in c["settled"]:  # go through the settled paths
                    if p in req["path_to"] and (
                        c["external"] or req["path_to"] in c["possible_reqs"]
                    ):  # c was settled into this requirement
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
            elif c["external"]:
                for p in c["settled"]:
                    if p in req["path_to"]:
                        num_marked += 1
                        c["reqs_satisfied"].append(req["path_to"])
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
    return num_courses


def _course_match(course_name, pattern):
    pattern = _get_course_name_from_pattern(pattern)
    pattern = [
        "".join(p.split()).upper() for p in pattern.split("/")
    ]  # split by '/' and
    course = [
        "".join(c.split()).upper() for c in course_name.split("/")
    ]  # remove spaces
    for c in course:
        for p in pattern:
            if c == p:  # exact name matched
                return True
            if (
                p[:4] == "LANG" and c[:3] in university_info.LANG_DEPTS
            ):  # language course
                if c[3:] == p[4:]:  # course numbers match
                    return True
                if len(p) > 4 and p[4] == "*":  # 'LANG*' or 'LANG***'
                    return True
                if (
                    len(c) >= 4 and len(p) > 5 and p[5] == "*" and c[3:4] == p[4:5]
                ):  # 'LANG1*' or 'LANG1**'
                    return True
                if (
                    len(c) >= 5 and len(p) > 6 and p[6] == "*" and c[3:5] == p[4:6]
                ):  # 'LANG12*'
                    return True
                if (
                    len(c) >= 6 and len(p) > 7 and p[7] == "*" and c[3:6] == p[4:7]
                ):  # 'LANG123*'
                    return True
            # non-language course
            if (
                len(c) >= 3 and len(p) > 3 and p[3] == "*" and c[:3] == p[:3]
            ):  # 'AAA*' or 'AAA***'
                return True
            if (
                len(c) >= 4 and len(p) > 4 and p[4] == "*" and c[:4] == p[:4]
            ):  # 'AAA1*' or 'AAA1**'
                return True
            if (
                len(c) >= 5 and len(p) > 5 and p[5] == "*" and c[:5] == p[:5]
            ):  # 'AAA12*'  Note: not currently in format spec
                return True
            if (
                len(c) >= 6 and len(p) > 6 and p[6] == "*" and c[:6] == p[:6]
            ):  # 'AAA123*' matches to 'AAA123C'
                return True
    return False


def _get_req_by_path(req, path_to, year):
    """
    Returns the subrequirement of req that is pointed to by path_to
    """
    if "path_to" not in req:
        _init_path_to(req, year)
    if req["path_to"] == path_to:
        return req
    if "req_list" in req:
        for subreq in req["req_list"]:
            result = _get_req_by_path(subreq, path_to, year)
            if result:
                return result
    return None


def _get_collapsed_course_and_dist_req_sets(req):
    """
    Returns the sets of all courses and all distribution requirements
    in req's subtree as a tuple:
    (course_set, dist_req_set)
    Note: Sets may contain duplicate courses if a course is listed in multiple
    different ways
    """
    if "course_list" in req or "dist_req" in req:
        course_set = set()
        dist_req_set = set()
        if "course_list" in req:
            for course in req["course_list"]:
                course = _get_course_name_from_pattern(course)
                course_set.add(course)
        if "dist_req" in req:
            dist = req["dist_req"]
            if isinstance(dist, str):  # backwards compatibility with non-list dist_req
                dist = [dist]
            dist_req_set.update(dist)
        return (course_set, dist_req_set)
    total_course_set = set()
    total_dist_req_set = set()
    if "req_list" in req:
        for subreq in req["req_list"]:
            course_set, dist_req_set = _get_collapsed_course_and_dist_req_sets(subreq)
            if course_set:
                total_course_set |= course_set  # union of both sets
            if dist_req_set:
                total_dist_req_set |= dist_req_set  # union of both sets
    return (total_course_set, total_dist_req_set)


def _get_course_name_from_pattern(pattern):
    if type(pattern) == dict:
        return list(pattern.keys())[0]

    return pattern.split(":")[0]  # remove course title


def main():
    with open("verifier_tests/1.test", "r", encoding="utf8") as f:
        major_name = f.readline()[:-1]
        year = int(f.readline())
        courses = yaml.safe_load(f)
    satisfied, courses, major = check_major(major_name, courses, year)
    print(_json_format(courses))
    print(_json_format(major))


if __name__ == "__main__":
    main()
