from django.forms import ModelForm, Select
from tigerpath.models import UserProfile, Major


class UserProfileForm(ModelForm):
    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ['year', 'major']
        # values that will be used in the fields
        year_choices = ((2018, '2018'), (2019, '2019'), (2020, '2020'), (2021, '2021'))
        majors = Major.objects.order_by('name').values_list('code', 'name')
        # set up the form
        labels = {
            'year': ("What year are you in?"),
            'major': ("What is your major, or what major are you planning on declaring?")
        }
        widgets = {
            'year': Select(choices=year_choices),
            'major': Select(choices=majors)
        }
