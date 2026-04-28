import datetime

from django import forms

from tigerpath.models import UserProfile


THEME_CHOICES = [
    ("purple", "Purple"),
    ("orange", "Orange"),
    ("blue", "Blue"),
    ("pink", "Pink"),
]


# returns a list of tuples (year int, year string)
def create_year_choices():
    # if the month is earlier than July, then show the seniors' class year; else, show the freshmen's class year
    now = datetime.datetime.now()
    offset = 0 if now.month < 7 else 1
    return [(now.year + i, str(now.year + i)) for i in range(offset, offset + 4)]


class OnboardingForm(forms.ModelForm):
    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ["year"]
        widgets = {
            "year": forms.Select(choices=create_year_choices()),
        }


class SettingsForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(SettingsForm, self).__init__(*args, **kwargs)
        user_state = getattr(self.instance, "user_state", None) or {}
        self.fields["theme"].initial = user_state.get("theme", "purple")

    theme = forms.ChoiceField(
        choices=THEME_CHOICES,
        widget=forms.RadioSelect,
        required=True,
    )

    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ["year"]
        widgets = {"year": forms.Select(choices=create_year_choices())}
