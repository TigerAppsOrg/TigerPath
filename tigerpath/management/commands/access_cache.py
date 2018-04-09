from django.conf import settings
from django.core.cache import caches
from django.core.management.base import BaseCommand


class Command(BaseCommand):

    def handle(self, *args, **options):
        #scrape_all.get_all_courses()
        print(caches['courses'].get(1182))
        