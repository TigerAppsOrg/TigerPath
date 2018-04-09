from django.db import models
from django.db.models.signals import post_save
#from django.contrib.auth.models import AbstractBaseUser, User
from django.conf import settings
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
        max_length=4, default=settings.CURR_TERM, db_index=True, unique=True)

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


class Color_Palette(models.Model):
    DEFAULT_ID = 1

    """
    these are hex values of colors
    """
    light = models.CharField(max_length=7, default="#FFFFFF")
    dark = models.CharField(max_length=7, default="#000000")

    def __unicode__(self):
        return "light: " + self.light + '\n' + "dark: " + self.dark


class Course(models.Model):
    # relationships
    semester = models.ForeignKey(Semester, on_delete=models.PROTECT)
    professors = models.ManyToManyField(Professor)

    # fields
    title = models.TextField()
    rating = models.FloatField(default=0)
    description = models.TextField()
    registrar_id = models.CharField(max_length=20)

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
    course = models.ForeignKey(Course, related_name="sections", on_delete=models.PROTECT)

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
    section = models.ForeignKey(Section, related_name="meetings", on_delete=models.PROTECT)
    start_time = models.CharField(max_length=20)
    end_time = models.CharField(max_length=20)
    days = models.CharField(max_length=10)
    location = models.CharField(max_length=50)

    def __unicode__(self):
        return unicode(self.section) + ' - ' + self.location


class Course_Listing(models.Model):
    # TODO: this line causes admin site to fail, commenting out related_name
    # causes tastypie to fail
    course = models.ForeignKey(Course, related_name="course_listing_set", on_delete=models.PROTECT)
    # Even though the max_length should be 3~4, there are extreme cases.
    dept = models.CharField(max_length=10)
    number = models.CharField(max_length=10)
    is_primary = models.BooleanField(default=False)

    def __unicode__(self):
        return self.dept + ' ' + self.number

    class Meta:
        ordering = ['dept', 'number']

'''
class Schedule(models.Model):
    """
    NOTE: ical_uuid must be migrated in a careful way to create unique field.
    See https://github.com/django/django/commit/1f9e44030e9c5300b97ef7b029f482c53a66f13b and https://docs.djangoproject.com/en/1.9/howto/writing-migrations/#migrations-that-add-unique-fields
    It is done in migrations 23-25. Note that you have to split data from schema migrations. So we do a schema migration, a data migration, and then a schema migration.
    """
    # relationships
    semester = models.ForeignKey(Semester, on_delete=models.PROTECT)
    user = models.ForeignKey('Nice_User', on_delete=models.PROTECT)

    # fields
    available_colors = models.TextField(null=True)
    enrollments = models.TextField(null=True)
    title = models.CharField(max_length=100, default="schedule")
    # uuid.uuid4 generates a random UUID (Universally Unique ID)
    ical_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

# class Enrollment(models.Model):
#    # each course enrollment has
#    # a course, a color, and a few sections
#    # and belongs to a schedule
#    course = models.ForeignKey(Course, related_name="enrollment")
#    sections = models.ManyToManyField(Section)
#    color = models.ForeignKey(Color_Palette)
#    schedule = models.ForeignKey(Schedule)


class Nice_User(AbstractBaseUser):
    netid = models.CharField(max_length=20, unique=True)
    friends = models.ManyToManyField(
        'self', symmetrical=True, related_name='friends')
    USERNAME_FIELD = 'netid'

# create user profile as soon as a user is added


def make_new_nice_user(sender, instance, created, **kwargs):
    # see http://stackoverflow.com/a/965883/130164
    # Use a try because the first user (super user) is created before other tables are created.
    # That is, this fails during syncdb upon initial database setup, because
    # it creates a superuser before User_Profile table is added (we add that
    # by running migrations after).
    try:
        if created:
            nice_user, created = Nice_User.objects.get_or_create(
                netid=instance.username)
            if created:
                try:
                    nice_user.save()
                except Exception as e:
                    if settings.DEBUG:
                        raise e
    except Exception as e:
        if settings.DEBUG:
            raise e

post_save.connect(make_new_nice_user, sender=User)



class Friend_Request(models.Model):
    from_user = models.ForeignKey(Nice_User, related_name='from_users', on_delete=models.PROTECT)
    to_user = models.ForeignKey(Nice_User, related_name='to_users', on_delete=models.PROTECT)

    class Meta:
        unique_together = ('from_user', 'to_user')


class NetID_Name_Table(models.Model):
    # table for netid--name lookups
    netid = models.CharField(max_length=100, primary_key=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    def __unicode__(self):
        if self.first_name and self.last_name:
            return '%s %s' % (self.first_name, self.last_name)
        else:
            return self.netid
'''

