from django.contrib import admin

from tigerpath.models import (
    Course,
    Course_Listing,
    Major,
    Meeting,
    Professor,
    Section,
    Semester,
    UserProfile,
)

# Register your models here.
admin.site.register(Semester)
admin.site.register(Professor)
admin.site.register(Course)
admin.site.register(Section)
admin.site.register(Meeting)
admin.site.register(Course_Listing)
admin.site.register(Major)
admin.site.register(UserProfile)
