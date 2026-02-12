# ----------------------------------------------------------------------
# mobileapp.py
# Contains MobileApp, a class used to communicate with the MobileApp API
# from the Princeton OIT.
# Credit: vr2amesh https://github.com/vr2amesh/COS333-API-Code-Examples
# ----------------------------------------------------------------------

import base64
import json
import re
from os import environ

import requests

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
        data = self._getJSON(self.configs.COURSE_COURSES, subject="list")
        return ",".join([e["code"] for e in data["term"][0]["subjects"]])

    # returns a raw JSON of all department codes

    def get_all_dept_codes_json(self):
        return self._getJSON(self.configs.COURSE_COURSES, subject="list")

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

        res = self.get_terms()
        try:
            term_codes = [res["term"][0]["code"]]
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
        request_params = kwargs if "kwargs" not in kwargs else kwargs["kwargs"]
        text = self._request(endpoint, request_params)

        # Token may be expired; refresh once and retry.
        if self._is_api_fault(text):
            self.configs._refreshToken(grant_type="client_credentials")
            text = self._request(endpoint, request_params)
            if self._is_api_fault(text):
                raise RuntimeError(
                    "Princeton API returned an error for "
                    f"{self.configs.BASE_URL}{endpoint}: {self._format_fault(text)}"
                )

        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "Expected JSON from Princeton API but got non-JSON response for "
                f"{self.configs.BASE_URL}{endpoint}: {self._shorten(text)}"
            ) from exc

    def _request(self, endpoint, params):
        try:
            req = requests.get(
                self.configs.BASE_URL + endpoint,
                params=params,
                headers={"Authorization": "Bearer " + self.configs.ACCESS_TOKEN},
                timeout=30,
            )
            return req.text
        except requests.RequestException as exc:
            raise RuntimeError(
                "Failed to reach Princeton API at "
                f"{self.configs.BASE_URL}{endpoint}: {exc}"
            ) from exc

    def _is_api_fault(self, text):
        # API faults arrive as XML in various namespaces such as <am:fault> / <ams:fault>.
        return bool(re.match(r"\s*<\w+:fault\b", text))

    def _fault_details(self, text):
        if not self._is_api_fault(text):
            return None

        def _find(tag):
            match = re.search(rf"<\w+:{tag}>(.*?)</\w+:{tag}>", text, flags=re.DOTALL)
            return match.group(1).strip() if match else ""

        return {
            "code": _find("code"),
            "message": _find("message"),
            "description": _find("description"),
        }

    def _format_fault(self, text):
        details = self._fault_details(text)
        if not details:
            return self._shorten(text)

        if details["code"] == "900908":
            return (
                "API token is not authorized for this resource "
                f"({self.configs.BASE_URL}). In Princeton API Store, subscribe your app "
                "to MobileApp API v1.0.6 and regenerate Production keys "
                "(client_credentials enabled)."
            )

        parts = [details["code"], details["message"], details["description"]]
        compact = " | ".join([p for p in parts if p])
        return compact if compact else self._shorten(text)

    def _shorten(self, text):
        return " ".join(text.split())[:200]


class Configs:
    def __init__(self):
        self.CONSUMER_KEY = CONSUMER_KEY
        self.CONSUMER_SECRET = CONSUMER_SECRET
        self.BASE_URL = None
        self.COURSE_COURSES = "/courses/courses"
        self.COURSE_DETAILS = "/courses/details"
        self.COURSE_TERMS = "/courses/terms"
        self.REFRESH_TOKEN_URL = "https://api.princeton.edu:443/token"
        self._refreshToken(grant_type="client_credentials")
        self.BASE_URL = self._resolve_base_url()

    def _refreshToken(self, **kwargs):
        try:
            req = requests.post(
                self.REFRESH_TOKEN_URL,
                data=kwargs,
                headers={
                    "Authorization": "Basic "
                    + base64.b64encode(
                        bytes(self.CONSUMER_KEY + ":" + self.CONSUMER_SECRET, "utf-8")
                    ).decode("utf-8")
                },
                timeout=30,
            )
        except requests.RequestException as exc:
            raise RuntimeError(
                f"Failed to reach Princeton token endpoint {self.REFRESH_TOKEN_URL}: {exc}"
            ) from exc
        text = req.text
        try:
            response = json.loads(text)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "Unable to parse token response from Princeton API: "
                + " ".join(text.split())[:200]
            ) from exc

        token = response.get("access_token")
        if not token:
            raise RuntimeError(
                "Princeton API token request did not return access_token: "
                + " ".join(text.split())[:200]
            )

        self.ACCESS_TOKEN = token

    def _resolve_base_url(self):
        base_url = (
            environ.get("MOBILEAPP_BASE_URL", "https://api.princeton.edu:443/mobile-app/1.0.6")
            .rstrip("/")
        )

        try:
            response = requests.get(
                base_url + self.COURSE_TERMS,
                params={"fmt": "json"},
                headers={"Authorization": "Bearer " + self.ACCESS_TOKEN},
                timeout=30,
            )
            text = response.text
            if re.match(r"\s*<\w+:fault\b", text):
                code_match = re.search(r"<\w+:code>(.*?)</\w+:code>", text, flags=re.DOTALL)
                fault_code = code_match.group(1).strip() if code_match else ""
                if fault_code == "900908":
                    raise RuntimeError(
                        "API token is not authorized for this resource "
                        f"({base_url}). In Princeton API Store, subscribe your app "
                        "to MobileApp API v1.0.6 and regenerate Production keys "
                        "(client_credentials enabled)."
                    )
                raise RuntimeError(" ".join(text.split())[:200])

            payload = json.loads(text)
            if isinstance(payload, dict) and "term" in payload:
                return base_url
            raise RuntimeError("unexpected payload from terms endpoint")
        except Exception as exc:
            raise RuntimeError(
                "Unable to use Princeton course API base URL "
                f"{base_url}. If needed, set MOBILEAPP_BASE_URL in .env. Error: {exc}"
            ) from exc


def main():
    api = MobileApp()
    # print(api.get_courses(term="1224", search="COS333"))
    # print(api.get_courses(term="1232", subject="AMS,COS"))
    print(api.get_active_term_codes(n_recent_terms=8))


if __name__ == "__main__":
    main()
