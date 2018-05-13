import json

from tigerpath.scraper import scrape_all
from django.conf import settings
from django.core.cache import caches
from django.core.management.base import BaseCommand


class Command(BaseCommand):

    def handle(self, *args, **options):
        scrape_all.get_all_courses()
        self.stdout.write('course selection: courses scraped successfully')