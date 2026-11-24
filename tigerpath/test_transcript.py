"""TIG-282: transcript PDF import. Builds tiny real PDFs so pypdf extraction is exercised too."""

import datetime

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase

from tigerpath.models import Course, Course_Listing, Semester
from tigerpath.transcript import (
    CURRENT,
    TAKEN,
    UNCLEAR,
    TranscriptError,
    extract_text,
    parse_term,
    parse_transcript_text,
    semester_index,
)


def make_pdf(lines):
    """A minimal one-page PDF with one Helvetica text line per entry."""

    def esc(text):
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    ops = ["BT", "/F1 10 Tf", "12 TL", "40 760 Td"]
    for line in lines:
        ops.append(f"({esc(line)}) Tj T*")
    ops.append("ET")
    stream = "\n".join(ops).encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    return bytes(out)


TRANSCRIPT_LINES = [
    "Princeton University - Unofficial Transcript",
    "2022-2023 Fall",
    "COS 126 Computer Science: An Interdisciplinary Approach 1.00 1.00 A 4.00",
    "HIS 214 A History of the Atlantic World 1.00 1.00 B+ 3.30",
    "ECO 100 Introduction to Microeconomics 1.00 0.00 W",
    "Spring Term 2022-23",
    "COS226 Algorithms and Data Structures 1.00 1.00 A- 3.70",
    "Summer 2023",
    "ENV 101 Field Course 1.00 1.00 A",
    "Fall 2023",
    "COS 217 Introduction to Programming Systems 1.00 0.00 IP",
    "ZZZ 999 Not In The Catalog 1.00",
]


class ParseTranscriptTest(SimpleTestCase):
    def test_term_heading_styles(self):
        self.assertEqual(parse_term("2022-2023 Fall"), ("fall", 2022))
        self.assertEqual(parse_term("2022-2023 Spring"), ("spring", 2023))
        self.assertEqual(parse_term("Spring Term 2022-23"), ("spring", 2023))
        self.assertEqual(parse_term("Fall 2023"), ("fall", 2023))
        self.assertEqual(parse_term("Summer 2023"), "other")
        self.assertEqual(parse_term("2022-2023 Summer"), "other")
        self.assertEqual(parse_term("2022-23 Winter"), "other")
        # Season-first with an academic year, like "Spring Term 2022-23".
        self.assertEqual(parse_term("Summer Term 2022-23"), "other")
        self.assertEqual(parse_term("Summer 2022-2023"), "other")
        self.assertEqual(parse_term("Intersession 2023-2024"), "other")
        self.assertIsNone(parse_term("Cumulative GPA 3.80"))

    def test_statuses_and_terms(self):
        entries = parse_transcript_text("\n".join(TRANSCRIPT_LINES))
        got = [(e.code, e.term_label, e.status) for e in entries]
        self.assertEqual(
            got,
            [
                ("COS 126", "Fall 2022", TAKEN),
                # A title word "A" is not a grade; the row's real grade (B+) is.
                ("HIS 214", "Fall 2022", TAKEN),
                ("COS 226", "Spring 2023", TAKEN),
                ("COS 217", "Fall 2023", CURRENT),
                ("ZZZ 999", "Fall 2023", CURRENT),
            ],
        )  # ECO 100 (withdrawn) and the summer course are skipped

    def test_year_first_summer_heading_ends_the_spring_term(self):
        text = (
            "2022-2023 Spring\nCOS 226  GRD  Algorithms  A  QCR\n"
            "2022-2023 Summer\nENV 101  GRD  Field Course  A  SEN\n"
            "2023-2024 Fall\nCOS 217  GRD  Programming Systems    SEN\n"
        )
        got = [(e.code, e.term_label) for e in parse_transcript_text(text)]
        # The summer course is skipped, not filed under Spring 2023.
        self.assertEqual(got, [("COS 226", "Spring 2023"), ("COS 217", "Fall 2023")])

    def test_season_first_summer_heading_ends_the_spring_term(self):
        text = (
            "Spring 2022-2023\nCOS 226  GRD  Algorithms  A  QCR\n"
            "Summer Term 2022-23\nENV 101  GRD  Field Course  A  SEN\n"
        )
        got = [(e.code, e.term_label) for e in parse_transcript_text(text)]
        self.assertEqual(got, [("COS 226", "Spring 2023")])

    def test_courses_before_any_term_are_ignored(self):
        self.assertEqual(parse_transcript_text("COS 126 Something A\nFall 2023"), [])

    def test_semester_index(self):
        # Class of 2026: freshman fall is Fall 2022.
        self.assertEqual(semester_index("fall", 2022, 2026), 0)
        self.assertEqual(semester_index("spring", 2023, 2026), 1)
        self.assertEqual(semester_index("spring", 2026, 2026), 7)
        self.assertIsNone(semester_index("fall", 2026, 2026))
        self.assertIsNone(semester_index("fall", 2021, 2026))
        self.assertIsNone(semester_index("fall", 2022, None))

    def test_extract_text_rejects_non_pdfs(self):
        with self.assertRaises(TranscriptError):
            extract_text(b"not a pdf")
        with self.assertRaises(TranscriptError):
            extract_text(b"")

    def test_extract_text_reads_a_pdf(self):
        text = extract_text(make_pdf(TRANSCRIPT_LINES))
        self.assertIn("COS 126", text)
        self.assertEqual(len(parse_transcript_text(text)), 5)


# Mirrors the TigerHub "Undergraduate Internal Transcript" layout (made-up courses, no student
# data):
# layout-mode text keeps table columns, separated by runs of spaces, and rows end in a distrib area.
TIGERHUB_LAYOUT = """Undergraduate Internal Transcript
(not for External Use)
2025-2026 Fall
    Course              Grade    Title                                   Grade   Distrib Area
                        Basis
    COS       126       GRD      Computer Science: An Approach    A       QCR
    HIS       214       PDF      The Atlantic World                      P       HA
    ECO       100       GRD      Intro to Microeconomics          W       SA
2026-2027 Fall
    PHY       104       GRD      Physics Lab Part B                              SEN
    MUS       105       AUD      Music Theory                                    LA
    WRI       140       GRD      Writing Seminar                                 Writing
Number of Elected PDFs: 0
Unofficial GPA: .000
"""


class TigerHubLayoutTest(SimpleTestCase):
    def test_columns_grades_and_distrib_areas(self):
        got = [(e.code, e.term_label, e.status) for e in parse_transcript_text(TIGERHUB_LAYOUT)]
        self.assertEqual(
            got,
            [
                ("COS 126", "Fall 2025", TAKEN),
                ("HIS 214", "Fall 2025", TAKEN),  # P/D/F basis, graded P
                # ECO 100 withdrawn (W) and MUS 105 audited (AUD) are skipped: no credit.
                ("PHY 104", "Fall 2026", CURRENT),  # title ends in "B"; no grade column yet
                ("WRI 140", "Fall 2026", CURRENT),  # "Writing" is the distrib area
            ],
        )

    def test_failed_courses_are_skipped(self):
        text = (
            "Fall 2025\nCOS 126  GRD  Intro  F  QCR\n"
            "COS 226  GRD  Algorithms  B  QCR\nMAT 103 GRD Calculus 1.00 F 0.00"
        )
        self.assertEqual([e.code for e in parse_transcript_text(text)], ["COS 226"])

    def test_audited_rows_are_skipped(self):
        text = (
            "Fall 2025\nMUS 105  AUD  Music Theory    LA\n"
            "MUS 106 AUD Music Theory II LA\nCOS 126  GRD  Intro  A  QCR"
        )
        self.assertEqual([e.code for e in parse_transcript_text(text)], ["COS 126"])

    def test_single_spaced_rows_without_columns(self):
        # Columns lost: a lone trailing grade letter could be a grade or the end of the title, so
        # the row is UNCLEAR (shown, not pre-selected) unless a credit number sits next to it.
        text = (
            "Fall 2025\nCOS 126 GRD Computer Science A QCR\nPHY 104 GRD Physics Lab Part B SEN\n"
            "ECO 100 GRD Intro to Microeconomics W SA\nHIN 105 GRD Intermediate Hindi I NONE\n"
            "COS 226 GRD Algorithms 1.00 A 4.00\nMAT 202 GRD Linear Algebra A- QCR\n"
            "COS 217 GRD Systems 1.00 F 0.00"
        )
        got = [(e.code, e.status) for e in parse_transcript_text(text)]
        self.assertEqual(
            got,
            [
                ("COS 126", UNCLEAR),
                ("PHY 104", UNCLEAR),
                ("ECO 100", UNCLEAR),  # maybe withdrawn: never added without the student choosing
                ("HIN 105", CURRENT),  # "I" isn't a grade letter
                ("COS 226", TAKEN),
                ("MAT 202", TAKEN),
            ],
        )  # COS 217: F next to credit numbers is a real failing grade, so skipped

    def test_empty_password_pdf_opens_but_real_password_is_refused(self):
        import io

        from pypdf import PdfReader, PdfWriter

        def encrypted(user_password):
            writer = PdfWriter()
            for page in PdfReader(io.BytesIO(make_pdf(TRANSCRIPT_LINES))).pages:
                writer.add_page(page)
            writer.encrypt(user_password=user_password, owner_password="owner-only")
            out = io.BytesIO()
            writer.write(out)
            return out.getvalue()

        # TigerHub's PDFs are like the first: encrypted, but with an empty open-password.
        self.assertIn("COS 126", extract_text(encrypted("")))
        with self.assertRaises(TranscriptError):
            extract_text(encrypted("secret"))


class ImportTranscriptApiTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="transcript_user", password="testpass")
        self.client.force_login(self.user)
        profile = self.user.profile
        profile.year = 2026
        profile.save(update_fields=["year"])
        semester = Semester.objects.create(
            start_date=datetime.date(2025, 9, 1),
            end_date=datetime.date(2025, 12, 20),
            term_code="1262",
        )
        for registrar_id, dept, number, title in [
            ("002051", "COS", "126", "Computer Science: An Interdisciplinary Approach"),
            ("002065", "COS", "226", "Algorithms and Data Structures"),
            ("002062", "COS", "217", "Introduction to Programming Systems"),
            ("004210", "HIS", "214", "The Atlantic World"),
        ]:
            course = Course.objects.create(
                semester=semester,
                title=title,
                description="",
                registrar_id=registrar_id,
                cross_listings=f"{dept} {number}",
                all_semesters=["f25"],
                is_master=True,
            )
            Course_Listing.objects.create(course=course, dept=dept, number=number, is_primary=True)
        self.plan = profile.schedule_plans.get()

    def upload(self, data, name="transcript.pdf"):
        return self.client.post(
            "/api/v1/import_transcript/",
            {"transcript": SimpleUploadedFile(name, data, content_type="application/pdf")},
        )

    def test_preview_places_courses_and_never_saves(self):
        schedule_before = self.plan.schedule
        response = self.upload(make_pdf(TRANSCRIPT_LINES))
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["classYear"], 2026)
        rows = [
            (c["code"], c["semesterIndex"], c["status"], c["course"]["id"])
            for c in payload["courses"]
        ]
        self.assertEqual(
            rows,
            [
                ("COS 126", 0, TAKEN, "002051"),
                ("HIS 214", 0, TAKEN, "004210"),
                ("COS 226", 1, TAKEN, "002065"),
                ("COS 217", 2, CURRENT, "002062"),
            ],
        )
        self.assertEqual(payload["unmatched"], ["ZZZ 999"])
        # Grades are never sent back.
        self.assertNotIn("grade", response.content.decode().lower())
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.schedule, schedule_before)

    def test_rejects_bad_uploads(self):
        self.assertEqual(self.upload(b"hello", name="notes.txt").status_code, 400)
        self.assertEqual(self.client.post("/api/v1/import_transcript/").status_code, 400)
        self.assertEqual(self.client.get("/api/v1/import_transcript/").status_code, 404)

    def test_requires_login(self):
        self.client.logout()
        response = self.upload(make_pdf(TRANSCRIPT_LINES))
        self.assertEqual(response.status_code, 302)

    def test_without_class_year_courses_are_unplaced(self):
        profile = self.user.profile
        profile.year = None
        profile.save(update_fields=["year"])
        payload = self.upload(make_pdf(TRANSCRIPT_LINES)).json()
        self.assertTrue(all(c["semesterIndex"] is None for c in payload["courses"]))
