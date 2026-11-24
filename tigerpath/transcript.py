"""Parse a Princeton unofficial transcript PDF into (course code, term, status) entries (TIG-282).

The PDF is read in memory and never stored. Grades are only used to tell taken courses from
in-progress ones and are not returned. Parsing is deliberately tolerant: it recognises several
term-heading styles and course rows ("COS 126", "COS126", cross-listings like "COS 126/EGR 126").
"""

import io
import re
from dataclasses import dataclass

MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024

# "Fall 2023-2024", "Fall Term 2023-24", "Spring 2023-2024 Term"
_TERM_SEASON_FIRST_ACADEMIC = re.compile(
    r"\b(Fall|Spring)(?:\s+Term)?\s+(\d{4})\s*[-–/]\s*(\d{2,4})\b", re.IGNORECASE
)
# "2023-2024 Fall", "2023-24 Spring Term"
_TERM_YEAR_FIRST_ACADEMIC = re.compile(
    r"\b(\d{4})\s*[-–/]\s*(\d{2,4})\s+(Fall|Spring)\b", re.IGNORECASE
)
# "Fall 2023", "Spring Term 2024"
_TERM_CALENDAR = re.compile(r"\b(Fall|Spring)(?:\s+Term)?\s+(\d{4})\b", re.IGNORECASE)
# Summer and other non-fall/spring terms end the current term so their courses aren't misfiled.
# Both orders, like fall/spring: "Summer 2023", "Summer Term 2023", "2022-2023 Summer".
_TERM_OTHER = re.compile(
    r"\b(?:(?:Summer|Winter|Intersession)(?:\s+Term)?\s+\d{4}"
    r"|\d{4}\s*[-\u2013/]\s*\d{2,4}\s+(?:Summer|Winter|Intersession))\b",
    re.IGNORECASE,
)

# Course row: dept (3 capitals) + number (3 digits, optional letter). The TigerHub transcript lays
# these out in columns ("COS     226     GRD ..."), and other exports glue them ("COS126").
_COURSE = re.compile(r"^\s*([A-Z]{3})\s*(\d{3}[A-Z]?)\b(.*)$")
# Layout-mode text separates table columns with runs of 2+ spaces.
_COLUMN_GAP = re.compile(r"\s{2,}")
_GRADES = {"A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "P", "INC"}
# Final grades that earn no credit: skipped like withdrawals, so they can't satisfy requirements.
_NO_CREDIT = {"F", "W"}
# "Grade Basis" column right after the course number (graded, P/D/F, audit, ...).
_GRADE_BASIS = {"GRD", "PDF", "AUD", "NGR", "NG"}
# "Distrib Area" column at the end of a TigerHub row; skipped when looking for the grade.
_DISTRIB_AREAS = {
    "CD",
    "EC",
    "EM",
    "HA",
    "LA",
    "QCR",
    "QR",
    "SA",
    "SEL",
    "SEN",
    "ST",
    "STL",
    "STN",
    "STX",
    "NONE",
    "WRITING",
    "LANGUAGE",
    "LANG",
    "W/L",
}
_NUMERIC = re.compile(r"^[\d.,()*]+$")

TAKEN = "taken"
CURRENT = "current"
# Columns were lost and the row ends in a lone grade letter that could also end the title
# ("... Part B", "... Microeconomics W"): the student decides; the row is not pre-selected.
UNCLEAR = "unclear"


@dataclass(frozen=True)
class TranscriptEntry:
    dept: str
    number: str
    season: str  # "fall" | "spring"
    year: int  # calendar year the term falls in
    status: str  # TAKEN | CURRENT

    @property
    def code(self):
        return f"{self.dept} {self.number}"

    @property
    def term_label(self):
        return f"{self.season.capitalize()} {self.year}"


class TranscriptError(ValueError):
    """The upload isn't a readable transcript PDF. The message is safe to show the user."""


def extract_text(pdf_bytes):
    """Text of every page. Layout mode keeps table rows on one line; plain mode is the fallback."""
    if not pdf_bytes or len(pdf_bytes) > MAX_TRANSCRIPT_BYTES:
        raise TranscriptError("Upload a transcript PDF under 5 MB.")
    if not pdf_bytes.lstrip()[:5] == b"%PDF-":
        raise TranscriptError(
            "That file isn't a PDF. Upload the unofficial transcript PDF from TigerHub."
        )
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        # TigerHub's transcript is encrypted with an empty open-password (it only restricts
        # editing), so try that before treating the file as password-protected.
        if reader.is_encrypted and not reader.decrypt(""):
            raise TranscriptError("That PDF is password-protected. Download an unprotected copy.")
        pages = []
        for page in reader.pages:
            try:
                pages.append(page.extract_text(extraction_mode="layout") or "")
            except Exception:  # layout mode can fail on unusual fonts
                pages.append(page.extract_text() or "")
        return "\n".join(pages)
    except TranscriptError:
        raise
    except (PdfReadError, Exception) as exc:
        raise TranscriptError(
            "Couldn't read that PDF. Try downloading the transcript again."
        ) from exc


def _full_year(start_year, end_part):
    end = int(end_part)
    return end if end >= 1000 else (start_year // 100) * 100 + end


def parse_term(line):
    """(season, calendar_year) for a fall/spring heading, "other" for summer etc., else None."""
    m = _TERM_SEASON_FIRST_ACADEMIC.search(line)
    if m:
        season, start = m.group(1).lower(), int(m.group(2))
        end = _full_year(start, m.group(3))
        return season, start if season == "fall" else end
    m = _TERM_YEAR_FIRST_ACADEMIC.search(line)
    if m:
        start, season = int(m.group(1)), m.group(3).lower()
        end = _full_year(start, m.group(2))
        return season, start if season == "fall" else end
    m = _TERM_CALENDAR.search(line)
    if m:
        return m.group(1).lower(), int(m.group(2))
    if _TERM_OTHER.search(line):
        return "other"
    return None


def _grade_status(token):
    token = token.strip().upper()
    if token in _GRADES:
        return TAKEN
    if token in _NO_CREDIT:
        return None  # failed or withdrawn: no credit
    if token == "IP":
        return CURRENT
    return "unknown"


def _status(rest_of_line):
    """TAKEN with a passing grade, CURRENT for IP/no grade, None for F, W or audited (AUD).

    TigerHub rows read: [grade basis] title [grade] [distrib area]. When the text keeps its columns,
    the title is one column, so a title ending in "B" can't be read as a grade, and the grade basis
    (e.g. AUD) is never mistaken for one. Otherwise, fall back to scanning tokens from the end.
    """
    if re.search(r"\bin progress\b", rest_of_line, re.IGNORECASE):
        return CURRENT
    columns = [c for c in _COLUMN_GAP.split(rest_of_line.strip()) if c]
    if columns and columns[0].upper() == "AUD":
        return None  # audited: no credit, so it can't count toward requirements; skip it
    if columns and columns[0].upper() in _GRADE_BASIS:
        columns = columns[1:]
    if len(columns) >= 2:
        # columns[0] is the title; a grade can only be one of the columns after it.
        for column in columns[1:]:
            if _NUMERIC.match(column) or column.upper() in _DISTRIB_AREAS:
                continue
            found = _grade_status(column)
            if found != "unknown":
                return found
        return CURRENT
    # Single-spaced text (columns lost): scan from the end, skipping numbers and a trailing
    # distribution area. A lone grade letter is ambiguous here ("Physics Lab Part B" vs a grade of
    # B, "Intro to Microeconomics W" vs withdrawn), so it only counts as a grade next to a credit or
    # grade-point number. Otherwise the row is UNCLEAR: shown but not pre-selected, so neither is a
    # withdrawn course added nor a real course dropped without the student deciding.
    tokens = rest_of_line.split()
    if tokens and tokens[0].upper() == "AUD":
        return None
    if tokens and tokens[0].upper() in _GRADE_BASIS:
        tokens = tokens[1:]
    for i in range(len(tokens) - 1, -1, -1):
        token = tokens[i]
        if _NUMERIC.match(token) or token.upper() in _DISTRIB_AREAS:
            continue
        if len(token) == 1:
            before = tokens[i - 1] if i else ""
            after = tokens[i + 1] if i + 1 < len(tokens) else ""
            if not any(_NUMERIC.match(t) for t in (before, after) if t):
                letter = token.upper()
                return UNCLEAR if letter in _GRADES or letter in _NO_CREDIT else CURRENT
        found = _grade_status(token)
        return CURRENT if found == "unknown" else found
    return CURRENT


def parse_transcript_text(text):
    """Entries in transcript order, one per course per term (duplicates within a term dropped)."""
    entries = []
    seen = set()
    term = None
    for raw_line in (text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        course = _COURSE.match(line)
        if not course:
            found = parse_term(line)
            if found is not None:
                term = None if found == "other" else found
            continue
        if term is None:
            continue
        dept, number, rest = course.group(1), course.group(2), course.group(3)
        status = _status(rest)
        if status is None:
            continue
        key = (dept, number, term)
        if key in seen:
            continue
        seen.add(key)
        entries.append(TranscriptEntry(dept, number, term[0], term[1], status))
    return entries


def semester_index(season, year, class_year):
    """0-7 board index for a fall/spring term given the graduation year, or None if outside it."""
    if not class_year:
        return None
    first_fall = int(class_year) - 4
    index = (year - first_fall) * 2 if season == "fall" else (year - first_fall - 1) * 2 + 1
    return index if 0 <= index < 8 else None


if __name__ == "__main__":
    # Check a real transcript locally without uploading it anywhere. Prints codes, terms and
    # status only (never grades):
    #   python -m tigerpath.transcript path/to/transcript.pdf [class_year]
    import sys

    if len(sys.argv) < 2:
        sys.exit("usage: python -m tigerpath.transcript TRANSCRIPT.pdf [CLASS_YEAR]")
    with open(sys.argv[1], "rb") as fh:
        found = parse_transcript_text(extract_text(fh.read()))
    year = int(sys.argv[2]) if len(sys.argv) > 2 else None
    for entry in found:
        idx = semester_index(entry.season, entry.year, year)
        print(f"{entry.code:9} {entry.term_label:12} {entry.status:8} semester={idx}")
    print(f"{len(found)} course(s) found")
