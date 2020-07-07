from django import forms
from tigerpath.models import UserProfile, Major
import datetime


# returns a list of tuples (year int, year string)
def create_year_choices():
    # if the month is earlier than July, then show the seniors' class year; else, show the freshmen's class year
    now = datetime.datetime.now()
    offset = (0 if now.month < 7 else 1)
    return [(now.year+i, str(now.year+i)) for i in range(offset, offset+4)]


# returns a list of tuples (major code, major name)
def create_major_choices():
    return Major.objects.order_by('name').values_list('id', 'name')


class OnboardingForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(OnboardingForm, self).__init__(*args, **kwargs)
        self.fields['major'].choices = create_major_choices()

    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ['nickname', 'year', 'major']
        widgets = {
            'nickname': forms.HiddenInput(),
            'year': forms.Select(choices=create_year_choices())
        }


class SettingsForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(SettingsForm, self).__init__(*args, **kwargs)
        self.fields['major'].choices = create_major_choices()

    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ['nickname', 'year', 'major']
        widgets = {
            'year': forms.Select(choices=create_year_choices())
        }
