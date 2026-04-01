"""
Clear stale 'settled' paths from all users' schedules and add new Major records.

When the requirement YAML data is updated with new category names, existing users'
settled paths (stored in user_schedule JSON) no longer match the new requirement
tree structure. This command clears those stale paths and adds Major records for
newly available concentrations.

The verifier's auto-settle feature will re-assign courses that can only satisfy
one requirement; users only need to manually re-settle ambiguous courses.

Usage:
    python manage.py clear_settled_paths          # dry-run (default)
    python manage.py clear_settled_paths --apply  # actually write changes
"""

from django.core.management.base import BaseCommand

from tigerpath.models import Major, UserProfile

NEW_MAJORS = [
    {"name": "Portuguese", "code": "POR", "degree": "AB"},
    {"name": "Spanish", "code": "SPA", "degree": "AB"},
]


class Command(BaseCommand):
    help = "Clear stale settled paths and add new Major records for updated requirement data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Actually write changes to the database (default is dry-run)",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        mode = "APPLIED" if apply else "DRY-RUN"

        # --- Step 1: Add new Major records ---
        self.stdout.write(f"\n[{mode}] Step 1: Adding new Major records")
        for m in NEW_MAJORS:
            exists = Major.objects.filter(code=m["code"]).exists()
            if exists:
                self.stdout.write(f"  {m['code']} already exists, skipping")
            else:
                self.stdout.write(f"  {m['code']} ({m['name']}) - will create")
                if apply:
                    Major.objects.create(
                        name=m["name"],
                        code=m["code"],
                        degree=m["degree"],
                        supported=True,
                    )

        # --- Step 2: Clear settled paths ---
        self.stdout.write(f"\n[{mode}] Step 2: Clearing settled paths from user schedules")
        profiles = UserProfile.objects.exclude(user_schedule__isnull=True)
        total = profiles.count()
        affected = 0
        courses_cleared = 0

        for profile in profiles.iterator():
            schedule = profile.user_schedule
            if not schedule:
                continue

            modified = False
            for semester in schedule:
                if not isinstance(semester, list):
                    continue
                for course in semester:
                    if not isinstance(course, dict):
                        continue
                    settled = course.get("settled")
                    if settled and isinstance(settled, list) and len(settled) > 0:
                        course["settled"] = []
                        modified = True
                        courses_cleared += 1

            if modified:
                affected += 1
                if apply:
                    profile.user_schedule = schedule
                    profile.save(update_fields=["user_schedule"])

        self.stdout.write(f"\n[{mode}] Results:")
        self.stdout.write(f"  Scanned {total} profiles")
        self.stdout.write(f"  {affected} profiles had settled paths")
        self.stdout.write(f"  {courses_cleared} course-requirement bindings cleared")
        if not apply:
            self.stdout.write(
                self.style.WARNING("\nNo changes written. Pass --apply to commit changes.")
            )
        else:
            self.stdout.write(self.style.SUCCESS("\nDone. Migration complete."))
