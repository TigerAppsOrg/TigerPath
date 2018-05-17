from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField, ArrayField

import uuid


class Semester(models.Model):
    # fields
    start_date = models.DateField()
    end_date = models.DateField()
    """ term_code = 1xxy, where xx is the year in which the school year ends,
    and y is the semester code. y = 2 for the fall term, y = 4 for the spring
    Example:
    1144 = 1314Spring
    1132 = 1213Fall
    """
    term_code = models.CharField(
        max_length=4, default=max(settings.ACTIVE_TERMS), db_index=True, unique=True)

    def __unicode__(self):
        end_year = int(self.term_code[1:3])
        start_year = end_year - 1
        if int(self.term_code[3]) == 2:
            sem = 'Fall'
        else:
            sem = 'Spring'
        return str(start_year) + "-" + str(end_year) + " " + sem


class Professor(models.Model):
    name = models.CharField(max_length=100)


class Course(models.Model):
    # relationships
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE)
    professors = models.ManyToManyField(Professor)

    # fields
    title = models.TextField()
    rating = models.FloatField(default=0)
    description = models.TextField()
    registrar_id = models.CharField(max_length=20)
    dist_area = models.TextField(default="")
    all_semesters = ArrayField(
        models.CharField(max_length=4),
        default=list,
        blank=True,
    )
    is_master = models.BooleanField(default=False)
    cross_listings = models.TextField(default="")

    def course_listings(self):
        # + ' ' + ': ' + self.title
        return " / ".join([unicode(course_listing) for course_listing in self.course_listing_set.all().order_by('dept')])

    course_listings.admin_order_field = 'course_listings'

    def primary_listing(self):
        """
        Returns the best course department and number string.
        """
        return unicode(self.course_listing_set.all().get(is_primary=True))

    def __unicode__(self):
        # + ' ' + ': ' + self.title
        return " / ".join([unicode(course_listing) for course_listing in self.course_listing_set.all().order_by('dept')])

    class Meta:
        pass
    # ordering = ['semester', 'course_listings']


class Section(models.Model):
    # Types
    TYPE_CLASS = "CLA"
    TYPE_DRILL = "DRI"
    TYPE_EAR = "EAR"
    TYPE_FILM = "FIL"
    TYPE_LAB = "LAB"
    TYPE_LECTURE = "LEC"
    TYPE_PRECEPT = "PRE"
    TYPE_SEMINAR = "SEM"
    TYPE_STUDIO = "STU"

    TYPE_CHOICES = (
        (TYPE_CLASS, "class"),
        (TYPE_DRILL, "drill"),
        (TYPE_EAR, "ear training"),
        (TYPE_FILM, "film"),
        (TYPE_LAB, "lab"),
        (TYPE_LECTURE, "lecture"),
        (TYPE_PRECEPT, "precept"),
        (TYPE_SEMINAR, "seminar"),
        (TYPE_STUDIO, "studio")
    )

    # relationships
    course = models.ForeignKey(Course, related_name="sections", on_delete=models.CASCADE)

    # fields
    name = models.CharField(max_length=100, default='')

    """ if true, then everyone in the course is automatically enrolled in this section """
    isDefault = models.BooleanField(default=False)
    section_type = models.CharField(max_length=3, choices=TYPE_CHOICES)
    section_enrollment = models.IntegerField(default=0)
    section_capacity = models.IntegerField(default=999)
    section_registrar_id = models.CharField(max_length=20, default="")

    def __unicode__(self):
        return self.course.primary_listing() + ' - ' + self.name

    class Meta:
        ordering = ['course', 'name']


class Meeting(models.Model):
    section = models.ForeignKey(Section, related_name="meetings", on_delete=models.CASCADE)
    start_time = models.CharField(max_length=20)
    end_time = models.CharField(max_length=20)
    days = models.CharField(max_length=10)
    location = models.CharField(max_length=50)

    def __unicode__(self):
        return unicode(self.section) + ' - ' + self.location


class Course_Listing(models.Model):
    course = models.ForeignKey(Course, related_name="course_listing_set", on_delete=models.CASCADE)
    # Even though the max_length should be 3~4, there are extreme cases.
    dept = models.CharField(max_length=10)
    number = models.CharField(max_length=10)
    is_primary = models.BooleanField(default=False)

    def __unicode__(self):
        return self.dept + ' ' + self.number

    class Meta:
        ordering = ['dept', 'number']


class Major(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=7)
    degree = models.CharField(max_length=3)
    supported = models.BooleanField(default=False)


class UserProfile(models.Model):
    user = models.OneToOneField(User,
                                on_delete=models.CASCADE,
                                related_name='profile')
    nickname = models.CharField(max_length=50, null=True, blank=True)
    major = models.ForeignKey(Major, related_name="+", on_delete=models.CASCADE, null=True)
    year = models.PositiveSmallIntegerField(null=True)
    user_state = JSONField(null=True, blank=True)
    user_schedule = JSONField(null=True, blank=True)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        profile = UserProfile.objects.create(user=instance, user_state={
            'onboarding_complete': False
            })
