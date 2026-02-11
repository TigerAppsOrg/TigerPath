from django.core.management.base import BaseCommand

from tigerpath.scraper import scrape_all


class Command(BaseCommand):
    def handle(self, *args, **options):
        scrape_all.get_all_courses()
        self.stdout.write("course selection: courses scraped successfully")
