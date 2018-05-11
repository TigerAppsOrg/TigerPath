function startIntro() {
  let intro = introJs();
  intro.setOptions({
    showStepNumbers: false,
    steps: [
      {
        intro: "Welcome to TigerPath! We'll take you on a brief tour to show you how to use the app. Click \"Next\" to begin."
      },
      {
        element: '#search-courses',
        intro: 'You can search for courses you want to add to your schedule here.',
        position: 'right'
      },
      {
        element: '#display-courses',
        intro: `Search results will appear here.
        Fall courses appear in purple, Spring courses appear in blue, and courses that are offered in both semesters appear in orange.
        You can drag courses from the search results to any semester in your schedule.`
      },
      {
        element: '#semesters',
        intro: "This is your schedule. It shows all of the courses that you've added to it. You can drag courses between semesters to rearrange your schedule."
      },
      {
        element: '#requirements',
        intro: `Each course that you've added to your schedule will automatically show up underneath the requirements that it can satisfy.
        If a course can only satisfy one of multiple requirements, it will show up underneath each of those requirements and be grayed out.
        You can click on a grayed out course to make it count for that requirement.`
      },
      {
        element: '#settings-btn',
        intro: "If you would like to change your major or modify other settings, you can do so here."
      },
      {
        element: '#help-btn',
        intro: "If you've missed anything, feel free to view this tutorial at any time by clicking here. We hope you enjoy using TigerPath!"
      },
    ]
  });
  intro.start();
}

$('#help-btn').click(startIntro);
