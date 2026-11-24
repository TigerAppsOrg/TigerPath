# TIG-282: import taken and current courses (decision log)

Branch: `tig-282-import-pre-existing-taken-and-currently-taking`, cut from `parallel-planning/view`
(independent of TIG-330 and TIG-337). The issue has no description, so the decisions below set the scope.

## What ships

- **Header → Import transcript** opens a dialog. The student uploads the TigerHub *unofficial transcript*
  PDF, reviews what was found (code, title, Taken or Taking now, target semester), unchecks anything
  unwanted, and clicks **Add N courses**.
- **`POST /api/v1/import_transcript/`** (login required) parses the PDF in memory and returns a preview.
  It stores nothing and saves nothing. The chosen courses are added on the client and saved with the
  normal `update_schedule_and_get_requirements` call, as one save, into the plan the student picks.
- **`tigerpath/transcript.py`** is the parser: pure functions, unit-tested, and runnable locally with
  `python -m tigerpath.transcript TRANSCRIPT.pdf [CLASS_YEAR]`, which prints codes, terms and status
  only (no grades).

## Decisions

### D1. Data source: the transcript PDF upload (chosen by you)

Alternatives considered: pasting TigerHub text (depends on page layout) and an OIT student API
(needs access the repo doesn't have).

### D2. Checked against a real TigerHub transcript

A real "Undergraduate Internal Transcript" PDF from TigerHub (Oracle/PeopleSoft) showed three things the
first version got wrong. All three are fixed and covered by tests that use made-up courses in the same
layout (no student data is in the repo):

1. **The PDF is encrypted with an empty open-password** (it only restricts editing). It's now opened with
   `decrypt("")`; a PDF with a real password is still refused.
2. **The table is laid out in columns** (`COS     226     GRD     Title     Grade     Distrib Area`), so the
   department and number are separated by several spaces. The course pattern now allows any spacing.
3. **Each row ends with a Distrib Area** (`QCR`, `NONE`, `Writing`, …) after the Grade column, and the
   Grade column is blank while a course is in progress. Status is now read column by column: grade basis
   (`GRD`/`PDF`/`AUD`), title, then grade, skipping distribution areas. A title ending in "B" or an `AUD`
   basis is never read as a grade. Single-spaced text without columns falls back to reading tokens from
   the end, skipping numbers and distribution areas; there a lone grade letter only counts as a grade next to a credit or grade-point number, since without columns it could also end the title ("Part B", "Microeconomics W"). Such rows are marked **Check grade** and are not pre-selected: the student decides, so a possible withdrawal is never added automatically and a real course is never silently dropped.

**Grades:** a passing final grade (A to D, P) means taken; an incomplete (`INC`) is marked **Check grade**, since the course wasn't finished at the end of the term. A blank grade, `IP` or "In Progress" means
currently taking. Failed (`F`), withdrawn (`W`) and audited (grade basis `AUD`) rows are skipped, since none earns credit. Term headings like "2026-2027 Fall", "Fall 2023" and
"Spring Term 2022-23" are recognised; Summer and Winter terms are skipped.

**Still unverified:** a transcript with *finished* terms (letter grades in the Grade column). The layout
is the same, and the tests cover it, but run `python -m tigerpath.transcript` on a multi-term
transcript when one is available.

### D3. Privacy: no storage and no grades returned

The upload is read in memory (5 MB cap, must start with `%PDF-`, PDFs that need a real password are
rejected) and discarded. Grades only decide taken versus current, and they're never sent back to the browser (a test
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

### D6. The student picks which plan to import into (revised)

The first version imported into the active plan only. Review asked for a choice, so the review step now has an
**Add to** dropdown with every plan, defaulting to the current one.
- **Current plan:** duplicates are checked in the review list, and Add makes one normal save.
- **Another plan:** the server only saves the active plan's schedule, so Add switches to that plan
  (`set_active_plan`, the same as clicking its tab), waits for its schedule to load, then adds the courses with
  one save. Duplicates already in that plan are skipped at that point and counted in the confirmation ("Added 3
  courses … to plan b (1 already there)"). The dialog says this before you confirm. If the switch fails, nothing
  is imported and an error notice says so.
- **No backend change**, so #547 stays independent of #545 and #546.

### D7. New dependency: `pypdf==6.21.4`

It's pure Python, with no system libraries to install, and it's pinned like the rest of `requirements.txt`.
Layout-mode extraction keeps table rows on one line; plain extraction is the fallback.
