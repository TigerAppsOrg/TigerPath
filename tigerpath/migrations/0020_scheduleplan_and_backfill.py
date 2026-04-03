from django.db import migrations, models
import django.db.models.deletion


DEFAULT_PLAN_NAME = "My Plan"


def backfill_schedule_plans(apps, schema_editor):
    UserProfile = apps.get_model("tigerpath", "UserProfile")
    SchedulePlan = apps.get_model("tigerpath", "SchedulePlan")

    for profile in UserProfile.objects.all().iterator():
        first_plan = (
            SchedulePlan.objects.filter(user_profile_id=profile.id)
            .order_by("id")
            .first()
        )

        if not first_plan:
            first_plan = SchedulePlan.objects.create(
                user_profile_id=profile.id,
                name=DEFAULT_PLAN_NAME,
                schedule=profile.user_schedule or [],
            )

        user_state = profile.user_state or {}
        user_state["active_plan_id"] = first_plan.id
        profile.user_state = user_state
        profile.save(update_fields=["user_state"])


class Migration(migrations.Migration):

    dependencies = [
        ("tigerpath", "0019_alter_semester_term_code"),
    ]

    operations = [
        migrations.CreateModel(
            name="SchedulePlan",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=80)),
                ("schedule", models.JSONField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user_profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule_plans",
                        to="tigerpath.userprofile",
                    ),
                ),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.RunPython(backfill_schedule_plans, migrations.RunPython.noop),
    ]
