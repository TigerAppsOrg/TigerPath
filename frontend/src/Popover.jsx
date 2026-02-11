import {
  getSemesterType,
  isFallSemester,
  isSpringSemester,
  convertSemToTermCode,
} from 'utils/SemesterUtils';

const BASE_COURSE_OFFERINGS_URL = 'https://www.princetoncourses.com/course/';

export function addPopover(course, courseKey, semIndex) {
  let courseName = course['name'];
  let courseTitle = course['title'];
  let courseSemType = course['semester'];

  const courseElement = document.getElementById(courseKey);
  if (!courseElement) return;

  courseElement.setAttribute('title', courseName);

  // Build content
  let content;
  if (!course['external']) {
    content = courseTitle;
  } else {
    content = "This is an external credit that you've added.";
  }

  const addedCoursesWithSameName = document.querySelectorAll(
    `.semester [title="${courseName}"]`
  );
  if (addedCoursesWithSameName.length > 1) {
    content +=
      "<div class='popover-warning'>This course has already been added to your schedule.</div>";
  }

  if (courseSemType === 'fall' && isSpringSemester(getSemesterType(semIndex))) {
    content +=
      "<div class='popover-warning'>This course has previously only been offered in the Fall.</div>";
  } else if (
    courseSemType === 'spring' &&
    isFallSemester(getSemesterType(semIndex))
  ) {
    content +=
      "<div class='popover-warning'>This course has previously only been offered in the Spring.</div>";
  }

  let courseId = course['id'];
  let courseSemList = course['semester_list'];
  if (courseSemList && courseSemList.length > 0) {
    let termCode = convertSemToTermCode(
      courseSemList[courseSemList.length - 1]
    );
    let courseInfoLink = BASE_COURSE_OFFERINGS_URL + termCode + courseId;

    content += "<div class='search-card-links'>";
    content +=
      '<a href=' +
      courseInfoLink +
      " target='_blank' rel='noopener noreferrer'> ";
    content += "<i class='fas fa-info-circle fa-lg fa-fw course-info'></i>";
    content += '</a> ';
    content += '</div>';
  }

  courseElement.setAttribute('data-bs-content', content);

  // Use Bootstrap 5 Popover API
  const Popover = window.bootstrap?.Popover;
  if (!Popover) return;

  // Dispose existing popover if any
  const existing = Popover.getInstance(courseElement);
  if (existing) existing.dispose();

  const popoverInstance = new Popover(courseElement, {
    trigger: 'manual',
    html: true,
    animation: true,
    sanitize: false,
  });

  courseElement.addEventListener('mouseenter', () => {
    popoverInstance.show();
    const popoverEl = document.querySelector('.popover');
    if (popoverEl) {
      popoverEl.addEventListener('mouseleave', () => {
        popoverInstance.hide();
      });
    }
  });

  courseElement.addEventListener('mouseleave', () => {
    setTimeout(() => {
      if (!document.querySelector('.popover:hover')) {
        popoverInstance.hide();
      }
    }, 100);
  });
}
