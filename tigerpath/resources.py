from tastypie.resources import ModelResource
from .models import Course
class CourseResource(ModelResource):
    class Meta:
        queryset = Course.objects.all()
        resource_name = 'course'
        limit = 0