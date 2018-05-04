#!/usr/bin/env python3
import json
from pprint import pprint
import jsonschema # must be installed via pip
import os
import collections
import filecmp

import verifier

schema_location = "schema.json" # path to the requirements JSON schema
tests_location = "verifier_tests" # folder where the test files are stored

def _json_format(obj):
   return json.dumps(obj, sort_keys=False, indent=2, separators=(',', ': ')) + "\n"

def main():
    test_failed = None
    for filename in sorted(os.listdir(tests_location)):
        if filename.endswith(".test"): 
            print("Testing: " + filename)
            file_path = os.path.join(tests_location, filename)
            with open (file_path, "r") as f:
                major_name = f.readline()[:-1]
                year = int(f.readline())
                courses = json.loads(f.read())
            major_filename = major_name + "_" + str(year)  + ".json"
            major_filepath = os.path.join(verifier.majors_location, major_filename)
            with open(major_filepath, 'r') as f:
                major = json.load(f)
            with open(schema_location, 'r') as s:
                schema = json.load(s)
            jsonschema.validate(major,schema)
            satisfied,courses,major = verifier.check_major(major_name,courses,year)
            with open (file_path+".out", "w") as f:
                f.write(_json_format(courses))
                f.write("\n")
                f.write(_json_format(major))
            # check if output is correct
            if not filecmp.cmp(file_path+".expected", file_path+".out"):
                print("--- Failed")
                if test_failed == None:
                    test_failed = "echo 'Failed test:' %s; colordiff %s %s | head -10" % (file_path, file_path+".expected", file_path+".out")
    if test_failed:
        os.system(test_failed)

if __name__ == "__main__":
    main()