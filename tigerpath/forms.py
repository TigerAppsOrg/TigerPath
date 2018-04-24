from django.forms import ModelForm, Select
from tigerpath.models import UserProfile, Major
import datetime


# if the month is earlier than July, then show the seniors' class year; else, show the freshmen's class year
now = datetime.datetime.now()
offset = (0 if now.month < 7 else 1)
YEAR_CHOICES = [(now.year+i, str(now.year+i)) for i in range(offset, offset+4)]
MAJORS = Major.objects.order_by('name').values_list('code', 'name')


class OnboardingForm(ModelForm):
    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ['year', 'major']
        # set up the form
        labels = {
            'year': ('What year are you in?'),
            'major': ('What is your major, or what major are you planning on declaring?')
        }
        widgets = {
            'year': Select(choices=YEAR_CHOICES),
            'major': Select(choices=MAJORS)
        }


class SettingsForm(ModelForm):
    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ['nickname', 'year', 'major']
        widgets = {
            'year': Select(choices=YEAR_CHOICES),
            'major': Select(choices=MAJORS)
        }
