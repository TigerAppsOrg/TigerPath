# Generated by Django 2.0.4 on 2018-05-05 18:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tigerpath', '0014_remove_course_semesters'),
    ]

    operations = [
        migrations.AddField(
            model_name='major',
            name='degree',
            field=models.CharField(default='AB', max_length=3),
            preserve_default=False,
        ),
    ]
