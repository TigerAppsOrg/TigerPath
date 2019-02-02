#!/usr/bin/env python3
import json
import yaml
from pprint import pprint
import jsonschema # must be installed via pip
import os
import collections
import filecmp
import shutil

from . import verifier

DIR_PATH = os.path.dirname(os.path.realpath(__file__)) # the directory containing this file
SCHEMA_LOCATION = os.path.join(DIR_PATH, "schema.json") # path to the requirements JSON schema
TESTS_LOCATION = os.path.join(DIR_PATH, "verifier_tests") # folder where the test files are stored

def _json_format(obj):
   return json.dumps(obj, sort_keys=False, indent=2, separators=(',', ': ')) + "\n"

def main():
    test_failed = None
    for filename in sorted(os.listdir(TESTS_LOCATION)):
        if filename.endswith(".test"): 
            print("Testing: " + filename)
            file_path = os.path.join(TESTS_LOCATION, filename)
            with open (file_path, "r", encoding="utf8") as f:
                req_name = f.readline()[:-1]
                year = int(f.readline())
                courses = yaml.safe_load(f)
            if req_name in ["AB", "BSE"]: # checking degree. No validation for degree jsons
                satisfied, courses, req_tree = verifier.check_degree(req_name, courses, year)
            else: # checking major
                major_filename = req_name + "_" + str(year)  + ".json"
                major_filepath = os.path.join(DIR_PATH, verifier.MAJORS_LOCATION, major_filename)
                with open(major_filepath, 'r', encoding="utf8") as f:
                    requirements = yaml.safe_load(f)
                with open(SCHEMA_LOCATION, 'r', encoding="utf8") as s:
                    schema = yaml.safe_load(s)
                jsonschema.validate(requirements,schema)
                satisfied, courses, req_tree = verifier.check_major(req_name, courses, year)
            with open (file_path+".out", "w", encoding="utf8") as f:
                f.write(_json_format(courses))
                f.write("\n")
                f.write(_json_format(req_tree))
            # use the most informative diff output
            if shutil.which("colordiff"):
                diff = "colordiff"
            elif shutil.which("diff"):
                diff = "diff"
            else:
                diff = "cmp"
            # check if output is correct
            if not filecmp.cmp(file_path+".expected", file_path+".out"):
                print("--- Failed")
                if test_failed == None:
                    test_failed = "echo 'Failed test:' %s; %s %s %s | head -10" % (file_path, diff, file_path+".expected", file_path+".out")
    if test_failed:
        os.system(test_failed)

if __name__ == "__main__":
    main()