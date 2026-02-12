import datetime

from django import forms

from tigerpath.models import Major, UserProfile


# returns a list of tuples (year int, year string)
def create_year_choices():
    # if the month is earlier than July, then show the seniors' class year; else, show the freshmen's class year
    now = datetime.datetime.now()
    offset = 0 if now.month < 7 else 1
    return [(now.year + i, str(now.year + i)) for i in range(offset, offset + 4)]


def create_major_queryset():
    return Major.objects.order_by("name")


def configure_major_field(field):
    majors = create_major_queryset()
    has_majors = majors.exists()

    field.queryset = majors
    field.required = has_majors
    field.empty_label = "Select your major"

    if not has_majors:
        field.help_text = (
            "Major options are currently unavailable. You can continue now "
            "and set your major later in Settings."
        )
        field.widget.attrs["disabled"] = True


class OnboardingForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(OnboardingForm, self).__init__(*args, **kwargs)
        configure_major_field(self.fields["major"])

    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ["nickname", "year", "major"]
        widgets = {
            "nickname": forms.HiddenInput(),
            "year": forms.Select(choices=create_year_choices()),
        }


class SettingsForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(SettingsForm, self).__init__(*args, **kwargs)
        configure_major_field(self.fields["major"])

    class Meta:
        # model and fields used for the form
        model = UserProfile
        fields = ["nickname", "year", "major"]
        widgets = {"year": forms.Select(choices=create_year_choices())}
