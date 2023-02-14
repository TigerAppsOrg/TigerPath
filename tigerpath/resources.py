# tastypie currently is not being used, leaving this here just in case we want to use tastsypie for get requests (may be faster)

from tastypie.resources import ModelResource
from .models import Course
from .models import Professor
from .models import Section


class ProfessorResource(ModelResource):
    class Meta:
        queryset = Professor.objects.all()
        resource_name = "professor"
        limit = 0


class CourseResource(ModelResource):
    class Meta:
        queryset = Course.objects.all()
        resource_name = "course"
        limit = 0


class SectionResource(ModelResource):
    class Meta:
        queryset = Section.objects.all()
        resource_name = "section"
        limit = 0
