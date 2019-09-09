import $ from 'jquery';
import { getSemesterType, isFallSemester, isSpringSemester } from 'utils/SemesterUtils';

export function addPopover(course, courseKey, semIndex) {
  let courseName = course['name'];
  let courseTitle = course['title'];
  let courseSemType = course['semester'];

  let courseElement = $(`#${courseKey}`)
  courseElement.attr("title", courseName);
  courseElement.attr("data-html", "true");

  // Add content to the popover
  let content;
  if (!course['external']) {
    content = courseTitle;
  } else {
    content = 'This is an external credit that you\'ve added.';
  }
  let addedCoursesWithSameName = $(".semester").find(`[title="${courseName}"]`);

  if (addedCoursesWithSameName.length > 1) {
    content += "<div class='popover-warning'>This course has already been added to your schedule.</div>";
  }

  if (courseSemType === 'fall' && isSpringSemester(getSemesterType(semIndex))) {
    content += "<div class='popover-warning'>This course has previously only been offered in the Fall.</div>";
  } else if (courseSemType === 'spring' && isFallSemester(getSemesterType(semIndex))) {
    content += "<div class='popover-warning'>This course has previously only been offered in the Spring.</div>";
  }

  courseElement.attr("data-content", content);

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
}