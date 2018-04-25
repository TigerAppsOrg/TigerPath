import json

from tigerpath.scraper import scrape_all
from tigerpath.views import get_courses_by_term_code
from django.conf import settings
from django.core.cache import caches
from django.core.management.base import BaseCommand


class Command(BaseCommand):

    def handle(self, *args, **options):
        scrape_all.get_all_courses()
#        self.stdout.write('course selection: courses scraped successfully')
#        for term_code in settings.ACTIVE_TERMS:
#            results = get_courses_by_term_code(term_code)
#            data = json.dumps(results)
#            caches['courses'].set(term_code, data)
#            self.stdout.write(
#                'course selection: cache regenerated for term ' + str(term_code))
#        caches['courseapi'].clear()
#        self.stdout.write('course selection: courseapi cache cleared.')
