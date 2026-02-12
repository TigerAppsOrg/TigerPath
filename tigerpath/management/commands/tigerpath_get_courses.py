import os

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    def handle(self, *args, **options):
        missing_or_empty = [
            name for name in ("CONSUMER_KEY", "CONSUMER_SECRET") if not os.getenv(name)
        ]
        if missing_or_empty:
            raise CommandError(
                "Missing required env var(s) for course scraping: "
                + ", ".join(missing_or_empty)
                + ". Set Princeton MobileApp API credentials in `.env`, "
                "then rerun `make seed-courses`."
            )

        try:
            from tigerpath.scraper import scrape_all
        except KeyError as exc:
            missing = exc.args[0]
            if missing in {"CONSUMER_KEY", "CONSUMER_SECRET"}:
                raise CommandError(
                    "Missing required env var(s) for course scraping. "
                    "Set CONSUMER_KEY and CONSUMER_SECRET (Princeton MobileApp API), "
                    "then rerun `make seed-courses`."
                ) from exc
            raise

        try:
            scrape_all.get_all_courses()
        except RuntimeError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write("course selection: courses scraped successfully")
