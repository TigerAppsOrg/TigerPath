from django import forms
from tigerpath.models import UserProfile, Major
import datetime


# if the month is earlier than July, then show the seniors' class year; else, show the freshmen's class year
now = datetime.datetime.now()
offset = (0 if now.month < 7 else 1)
YEAR_CHOICES = [(now.year+i, str(now.year+i)) for i in range(offset, offset+4)]
MAJORS = Major.objects.order_by('name').values_list('code', 'name')


class OnboardingForm(forms.ModelForm):
    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ['nickname', 'year', 'major']
        widgets = {
            'nickname': forms.HiddenInput(),
            'year': forms.Select(choices=YEAR_CHOICES),
            'major': forms.Select(choices=MAJORS)
        }


class SettingsForm(forms.ModelForm):
    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ['nickname', 'year', 'major']
        widgets = {
            'year': forms.Select(choices=YEAR_CHOICES),
            'major': forms.Select(choices=MAJORS)
        }
