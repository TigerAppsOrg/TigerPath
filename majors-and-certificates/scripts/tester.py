#!/usr/bin/env python3
import json
from pprint import pprint
import jsonschema # must be installed via pip
import os
import collections
import filecmp

import verifier

tests_location = "verifier_tests"

def _json_format(obj):
   return json.dumps(obj, sort_keys=False, indent=2, separators=(',', ': ')) + "\n"

def main():
    for filename in os.listdir(tests_location):
        if filename.endswith(".test"): 
            print("Testing: " + filename)
            file_path = os.path.join(tests_location, filename)
            with open (file_path, "r") as f:
                major_name = f.readline()[:-1]
                year = int(f.readline())
                courses = json.loads(f.read())
            satisfied,courses,major = verifier.check_major(major_name,courses)
            with open (file_path+".out", "w") as f:
                f.write(_json_format(courses))
                f.write("\n")
                f.write(_json_format(major))
            # check if output is correct
            if not filecmp.cmp(file_path+".out", file_path+".d"):
                print("--- Failed")

if __name__ == "__main__":
    main()