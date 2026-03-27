"""
scrape_registrar.py
Fetches per-course distribution area data from Princeton Registrar's
front-end API. No OIT API Store subscription required — uses a Bearer
token scraped from the public Registrar course-offerings page.
"""

import json
import re

import requests

_REGISTRAR_PAGE_URL = "https://registrar.princeton.edu/course-offerings"
_REGISTRAR_DETAILS_URL = (
    "https://api.princeton.edu/registrar/course-offerings/course-details"
)
_USER_AGENT = "Mozilla/5.0 (compatible; TigerPath/1.0; +https://path.tigerapps.org)"

_cached_token = None


def get_registrar_token():
    """Fetch and cache the Bearer token from the Registrar page."""
    global _cached_token
    if _cached_token:
        return _cached_token

    resp = requests.get(
        _REGISTRAR_PAGE_URL,
        headers={"User-Agent": _USER_AGENT, "Accept": "text/html"},
        timeout=30,
    )
    resp.raise_for_status()
    html = resp.text

    # Primary: parse drupal-settings-json script tag
    token = ""
    m = re.search(
        r'data-drupal-selector="drupal-settings-json"[^>]*>(.*?)</script>',
        html,
        re.DOTALL,
    )
    if m:
        try:
            token = json.loads(m.group(1)).get("ps_registrar", {}).get("apiToken", "")
        except Exception:
            pass

    # Fallback: regex anywhere in HTML
    if not token:
        m2 = re.search(r'"apiToken"\s*:\s*"([^"]+)"', html)
        if m2:
            token = m2.group(1)

    if not token:
        raise RuntimeError(
            "Could not extract registrar API token from "
            f"{_REGISTRAR_PAGE_URL}. The page structure may have changed."
        )

    _cached_token = token
    return token


def get_distribution_area(term, course_id, token):
    """
    Return a comma-separated distribution area string for a course,
    e.g. "SEL" or "SA,QR" or "" if none.

    Args:
        term: Princeton term code string (e.g. "1252")
        course_id: Princeton course_id string (e.g. "005558")
        token: Bearer token from get_registrar_token()
    """
    try:
        resp = requests.get(
            _REGISTRAR_DETAILS_URL,
            params={"term": term, "course_id": course_id},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "User-Agent": _USER_AGENT,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return ""

    details_list = (data.get("course_details") or {}).get("course_detail", [])
    if not details_list:
        return ""
    detail = details_list[0] if isinstance(details_list, list) else details_list
    dist = detail.get("distribution_area_short") or ""
    return ",".join(dist.split(" or "))
