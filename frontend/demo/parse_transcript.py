"""Demo bridge: run the real TigerPath transcript parser (tigerpath/transcript.py) on a PDF and print
what it found as JSON: code, term, status and semester index. Grades are never printed.

usage: python frontend/demo/parse_transcript.py TRANSCRIPT.pdf CLASS_YEAR
"""

import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from tigerpath.transcript import (  # noqa: E402
    TranscriptError,
    extract_text,
    parse_transcript_text,
    semester_index,
)


def main():
    path, class_year = sys.argv[1], int(sys.argv[2])
    try:
        entries = parse_transcript_text(extract_text(pathlib.Path(path).read_bytes()))
    except TranscriptError as error:
        print(json.dumps({"error": str(error)}))
        return
    print(
        json.dumps(
            {
                "entries": [
                    {
                        "code": e.code,
                        "term": e.term_label,
                        "status": e.status,
                        "semesterIndex": semester_index(e.season, e.year, class_year),
                    }
                    for e in entries
                ]
            }
        )
    )


if __name__ == "__main__":
    main()
