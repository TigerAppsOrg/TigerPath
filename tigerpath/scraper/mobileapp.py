# ----------------------------------------------------------------------
# mobileapp.py
# Contains MobileApp, a class used to communicate with the MobileApp API
# from the Princeton OIT.
# Credit: vr2amesh https://github.com/vr2amesh/COS333-API-Code-Examples
# ----------------------------------------------------------------------

import requests
import json
import base64
from os import environ
import sys


CONSUMER_KEY = environ["CONSUMER_KEY"]
CONSUMER_SECRET = environ["CONSUMER_SECRET"]


class MobileApp:
    def __init__(self):
        self.configs = Configs()

    # wrapper function for _getJSON with the courses/courses endpoint.
    # kwargs must contain key "term" with the current term code, as well
    # as one or more of "subject" (department code) and "search" (course
    # title)

    def get_courses(self, **kwargs):
        kwargs["fmt"] = "json"
        return self._getJSON(self.configs.COURSE_COURSES, **kwargs)

    # wrapper function for _getJSON with the courses/details endpoint.
    # kwargs must contain key "term" with the current term code, as well
    # as "course_id"

    def get_course_details(self, **kwargs):
        kwargs["fmt"] = "json"
        return self._getJSON(self.configs.COURSE_DETAILS, **kwargs)

    # returns a commma-separated string of all department codes

    def get_all_dept_codes_csv(self):
        data = self._getJSON(self.configs.COURSE_COURSES, "subject=list")
        return ",".join([e["code"] for e in data["term"][0]["subjects"]])

    # returns a raw JSON of all department codes

    def get_all_dept_codes_json(self):
        return self._getJSON(self.configs.COURSE_COURSES, "subject=list")

    # wrapper function for _getJSON with the courses/terms endpoint.
    # takes no arguments.

    def get_terms(self):
        return self._getJSON(self.configs.COURSE_TERMS, fmt="json")

    # generates the n_recent_terms (default 3) most recent term codes

    def get_active_term_codes(self, n_recent_terms=3):
        def construct_prev_term_code(curr):
            # curr is Spring, so just change last digit
            if curr[-1] == "4":
                return curr[:-1] + "2"

            # curr is Fall, so decrement middle two digits and change last digit
            year = curr[1:3]
            new_year = str(int(year) - 1)
            return "1" + new_year + "4"

        if n_recent_terms < 1:
            raise Exception("n_recent_terms must be >= 1")

        # res = self.get_terms()
        try:
            # term_codes = [res["term"][0]["code"]]
            term_codes = [1252, 1244, 1242, 1234, 1232, 1224, 1222, 1214]
            curr = term_codes[0]
            for _ in range(n_recent_terms - 1):
                prev_term_code = construct_prev_term_code(curr)
                term_codes.append(prev_term_code)
                curr = prev_term_code
            term_codes.reverse()
            return [str(e) for e in term_codes]
        except:
            return []

    """
    This function allows a user to make a request to 
    a certain endpoint, with the BASE_URL of 
    https://api.princeton.edu:443/mobile-app

    The parameters kwargs are keyword arguments. It
    symbolizes a variable number of arguments 
    """

    def _getJSON(self, endpoint, **kwargs):
        req = requests.get(
            self.configs.BASE_URL + endpoint,
            params=kwargs if "kwargs" not in kwargs else kwargs["kwargs"],
            headers={"Authorization": "Bearer " + self.configs.ACCESS_TOKEN},
        )
        text = req.text

        # Check to see if the response failed due to invalid credentials
        text = self._updateConfigs(text, endpoint, **kwargs)
        print(text)
        sys.stdout.flush()
        return json.loads(text)

    def _updateConfigs(self, text, endpoint, **kwargs):
        if text.startswith("<ams:fault"):
            self.configs._refreshToken(grant_type="client_credentials")

            # Redo the request with the new access token
            req = requests.get(
                self.configs.BASE_URL + endpoint,
                params=kwargs if "kwargs" not in kwargs else kwargs["kwargs"],
                headers={"Authorization": "Bearer " + self.configs.ACCESS_TOKEN},
            )
            text = req.text

        return text


class Configs:
    def __init__(self):
        self.CONSUMER_KEY = CONSUMER_KEY
        self.CONSUMER_SECRET = CONSUMER_SECRET
        self.BASE_URL = "https://api.princeton.edu:443/student-app/1.0.1"
        self.COURSE_COURSES = "/courses/courses"
        self.COURSE_DETAILS = "/courses/details"
        self.COURSE_TERMS = "/courses/terms"
        self.REFRESH_TOKEN_URL = "https://api.princeton.edu:443/token"
        self._refreshToken(grant_type="client_credentials")

    def _refreshToken(self, **kwargs):
        req = requests.post(
            self.REFRESH_TOKEN_URL,
            data=kwargs,
            headers={
                "Authorization": "Basic "
                + base64.b64encode(
                    bytes(self.CONSUMER_KEY + ":" + self.CONSUMER_SECRET, "utf-8")
                ).decode("utf-8")
            },
        )
        text = req.text
        response = json.loads(text)
        self.ACCESS_TOKEN = response["access_token"]


def main():
    api = MobileApp()
    # print(api.get_courses(term="1224", search="COS333"))
    # print(api.get_courses(term="1232", subject="AMS,COS"))
    print(api.get_active_term_codes(n_recent_terms=8))


if __name__ == "__main__":
    main()
