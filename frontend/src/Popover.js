import $ from 'jquery';

export function addPopover(courseId, courseName, courseTitle) {
  let addedCourses = $(".semester").find("[id=" + courseId +"]");
  addedCourses.each((index, course) => {
    let courseElement = $(course);

    // Add content to the popover
    courseElement.attr("title", courseName);
    courseElement.attr("data-html", "true");
    if (addedCourses.length > 1) {
      courseElement.attr("data-content", courseTitle + "<br><span class='popover-warning'>Note: course already added</span>");
    } else {
      courseElement.attr("data-content", courseTitle);
    }

    // Show the popover when it's hovered over
    courseElement
      .popover({ trigger: "manual" , html: true, animation: true})
      .on("mouseenter", () => {
        courseElement.popover("show");
        $(".popover").on("mouseleave", () => {
          courseElement.popover("hide");
        });
      })
      .on("mouseleave", () => {
        setTimeout(() => {
          if (!$(".popover:hover").length) {
            courseElement.popover("hide");
          }
        }, 100);
      });
  });
}