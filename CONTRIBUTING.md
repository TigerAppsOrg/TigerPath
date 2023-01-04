# Contributing

TigerPath is an open source project maintained by and for Princeton students.
If you would like to help out, you have come to the right place!

You can contribute in any of a number of ways:

## Bug Reports and Feature Requests

This is the easiest way to contribute, and you do not need any technical know-how.
Just go to the [issues](https://github.com/PrincetonUSG/TigerPath/issues) page and tap "New Issue" at the top right of the page.

You can file a
[**Bug Report**](https://github.com/PrincetonUSG/TigerPath/issues/new?assignees=&labels=bug&template=bug_report.md&title=)
if you find a problem with the app. To help us find a solution, describe how you found the problem,
and, if relevant, provide a screenshot or link (for instance to a relevant department web page) that helps us see the problem.

If you have an idea for how to improve the app, you can also file a
[**Feature Request**](https://github.com/PrincetonUSG/TigerPath/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=)
at the same place. Describe how you envision
the app improving and how you think it will help users, including yourself.

If you don't have anything in mind, you can still help by reading through the issues page and adding your thoughts on the issues
others have posted. Do you have the same problem they do? Do you like their idea? Do you think there is a better way? Feel
free to engage in conversations about the best way to improve TigerPath.

## Adding or editing major and certificate requirements

Another way you can contribute is by adding the requirements for your major if they don't already exist, or by looking over and
correcting your major's requirements if they already appear.

You might want to familiarize yourself with the [JSON format](https://en.wikipedia.org/wiki/JSON) if you would like to make
some more extensive changes. For smaller changes, however, such as adding a new class to a requirement list for an existing major,
you could probably get by with just adding a line while maintaining the existing formatting.

The requirements appear under the [majors and certificates](https://github.com/PrincetonUSG/TigerPath/tree/master/tigerpath/majors_and_certificates)
folder, which itself is divided into folders for
[**majors**](https://github.com/PrincetonUSG/TigerPath/tree/master/tigerpath/majors_and_certificates/majors),
[**certificates**](https://github.com/PrincetonUSG/TigerPath/tree/master/tigerpath/majors_and_certificates/certificates), and
[**degrees**](https://github.com/PrincetonUSG/TigerPath/tree/master/tigerpath/majors_and_certificates/degrees).
Each file contains the requirements of one
major, certificate, or degree, and is formatted as a tree hierarchy of nested requirements.

If you want to add a course, for instance, that can satisfy your major's requirements but isn't listed yet, find the file corresponding
to your major, and then the course list within that file where that new course should appear. You may edit the file by clicking on
the pencil icon at the top right, and then add your new course, after which it will lead you through submitting a pull request.

If you would like to add a new major, this is a more technical task. The easiest way to do this is to find a major that is as
close as possible to your major in terms of the structure of its requirements (that is, does it have tracks you can choose from?
Does it have several elective requirments? Does it require junior independent work of some kind?), make a copy of it, and edit
the file to fit the needs of your major's requirements.

_Note that while we don't yet support
certificate requirements on the front end (ie. in the web app), we are already building support for it
[here](https://github.com/PrincetonUSG/TigerPath/tree/master/tigerpath/majors_and_certificates/certificates)
in anticipation of adding them
in the near future.
If you are interested in helping us add this feature on the front end GUI, please let us know! It is consistently among the
most requested features, so our fellow students will probably be very thankful._

## Contributing Code

This is only for the more technically savvy among you who would like to take on an extra challenge with the goal of helping to
improve the experiences of our student users.

If you would like to implement a new feature, first open an issue so that it can be discussed and we can come to a shared
consensus of how this feature will come about.

Second, either start a new feature branch or fork the repository and start a branch there, and implement your new feature in
this feature branch. Take a look at the [README](https://github.com/PrincetonUSG/TigerPath/blob/master/README.md)
for some help with setting up an environment with which to test your local changes.

Once you are satisfied with your changes, come back to the TigerPath GitHub and submit a pull request to the `master`
branch of TigerHub (the branch that goes into production).

There we will together discuss your changes and if anything needs to be ammended. If everything looks good, we will then
merge your code into the `master` branch and deploy it to [tigerpath.io](https://www.tigerpath.io/).

Feel free to reach out to us through GitHub at any point to ask for help with your contributions, or reach out directly by
email to Barak Nehoran (netid: bnehoran).

## Thanks!

Since this is a project that is maintained and supported by a community of Princeton students, it is only as good
as the students contributers would like it to be.

On behalf of the thousands of Princeton students who use TigerPath, thanks for helping to make it a better, more accurate,
and more user-friendly tool for ourselves and for the next generation of students.
