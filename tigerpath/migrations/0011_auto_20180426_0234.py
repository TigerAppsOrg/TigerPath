# Generated by Django 2.0.3 on 2018-04-26 06:34

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tigerpath', '0010_course_is_master'),
    ]

    operations = [
        migrations.AlterField(
            model_name='course',
            name='semester',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tigerpath.Semester'),
        ),
        migrations.AlterField(
            model_name='course_listing',
            name='course',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='course_listing_set', to='tigerpath.Course'),
        ),
        migrations.AlterField(
            model_name='meeting',
            name='section',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='meetings', to='tigerpath.Section'),
        ),
        migrations.AlterField(
            model_name='section',
            name='course',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sections', to='tigerpath.Course'),
        ),
    ]