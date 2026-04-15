from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tigerpath', '0019_alter_semester_term_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='user_overrides',
            field=models.JSONField(blank=True, default=dict, null=True),
        ),
    ]
