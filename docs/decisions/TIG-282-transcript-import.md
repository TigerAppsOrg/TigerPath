# TIG-282: import taken and current courses (decision log)

Branch: `tig-282-import-pre-existing-taken-and-currently-taking`, cut from `parallel-planning/view`
(independent of TIG-330 and TIG-337). The issue has no description, so the decisions below set the scope.

## What ships

- **Header → Import transcript** opens a dialog. The student uploads the TigerHub *unofficial transcript*
  PDF, reviews what was found (code, title, Taken or Taking now, target semester), unchecks anything
  unwanted, and clicks **Add N courses**.
- **`POST /api/v1/import_transcript/`** (login required) parses the PDF in memory and returns a preview.
  It stores nothing and saves nothing. The chosen courses are added on the client and saved with the
  normal `update_schedule_and_get_requirements` call, as one save.
- **`tigerpath/transcript.py`** is the parser: pure functions, unit-tested, and runnable locally with
  `python -m tigerpath.transcript TRANSCRIPT.pdf [CLASS_YEAR]`, which prints codes, terms and status
  only (no grades).

## Decisions

### D1. Data source: the transcript PDF upload (chosen by you)

Alternatives considered: pasting TigerHub text (depends on page layout) and an OIT student API
(needs access the repo doesn't have).

### D2. The real transcript layout hasn't been verified yet

No real Princeton transcript was available, so the parser is tolerant by design:
- **Term headings:** "Fall 2023", "2023-2024 Fall", "Fall Term 2023-24" and "Spring Term 2022-23".
  Summer and Winter terms close the current term, so their courses aren't misfiled.
- **Course rows:** "COS 126" or "COS126" at the start of a line. Cross-listed courses map to their
  catalog course through the `Course_Listing` lookup.
- **Status:** read from the *end* of the row, after the credit and grade-point numbers. A final grade
  (A to F, P, AUD, INC) means taken. "IP", "In Progress" or no grade means currently taking. "W"
  (withdrawn) is skipped. Reading from the end means a title word like "A History…" is never taken for
  a grade.

**Before merging:** run `python -m tigerpath.transcript <your transcript>.pdf <class year>` on a real
transcript. If a heading or row style is missed, add it as a test case in `test_transcript.py`.

### D3. Privacy: no storage and no grades returned

The upload is read in memory (5 MB cap, must start with `%PDF-`, encrypted PDFs are rejected) and
discarded. Grades only decide taken versus current, and they're never sent back to the browser (a test
asserts this).

### D4. Review before adding, never auto-add

The endpoint only previews. A row can't be added if it's:
- already somewhere in the plan;
- listed twice on the transcript;
- outside the four years (for example a future term), or unplaceable because there's no class year
  (the dialog says to set it in Settings).

Courses not in the TigerPath catalog are listed as "not added".

### D5. "Taking now" isn't stored on the course

The schedule format has no status field, and adding one would touch the classic UI and the requirement
verifier. Status is shown in the review step only. Current-term courses are placed in their semester
like any other course.

### D6. Imports go into the active plan only

This matches how every other edit works. To import into another plan, switch to it first.

### D7. New dependency: `pypdf==6.21.4`

It's pure Python, with no system libraries to install, and it's pinned like the rest of `requirements.txt`.
Layout-mode extraction keeps table rows on one line; plain extraction is the fallback.
