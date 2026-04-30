import {
  getSemesterType,
  isFallSemester,
  isSpringSemester,
  convertSemToTermCode,
} from 'utils/SemesterUtils';
import { bindManualHoverPopover } from 'utils/manualHoverPopover';

const BASE_COURSE_OFFERINGS_URL = 'https://www.princetoncourses.com/course/';
const COURSE_POPOVER_CLEANUP_KEY = '__tigerpathCoursePopoverCleanup';

function getRatingColor(rating) {
  if (rating == null) return '#e0e0e0';
  const stops = [
    [0,   [224, 82,  82 ]],
    [2,   [224, 112, 48 ]],
    [3,   [224, 144, 32 ]],
    [3.5, [200, 176, 32 ]],
    [4,   [144, 176, 32 ]],
    [4.5, [92,  184, 92 ]],
    [5,   [45,  176, 45 ]],
  ];
  const r = Math.max(0, Math.min(5, rating));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (r >= stops[i][0] && r <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const t = hi[0] === lo[0] ? 0 : (r - lo[0]) / (hi[0] - lo[0]);
  const c = lo[1].map((v, i) => Math.round(v + t * (hi[1][i] - v)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function addPopover(course, courseKey, semIndex, duplicateCourseCounts = null) {
  let courseName = course['name'];
  let courseTitle = course['title'];
  let courseSemType = course['semester'];
  let qualityRating = course['quality_rating'] ?? null;
  let courseInfoLink = '';

  const courseElement = document.getElementById(courseKey);
  if (!courseElement) return;

  const existingCleanup = courseElement[COURSE_POPOVER_CLEANUP_KEY];
  if (typeof existingCleanup === 'function') {
    existingCleanup();
  }

  let courseId = course['id'];
  let courseSemList = course['semester_list'];
  if (courseSemList && courseSemList.length > 0) {
    let termCode = convertSemToTermCode(
      courseSemList[courseSemList.length - 1]
    );
    courseInfoLink = BASE_COURSE_OFFERINGS_URL + termCode + courseId;
  }

  let titleHtml = `<span class="course-popover-title">
    <span class="course-popover-name">${courseName}</span>
    <span class="course-popover-actions">`;
  if (qualityRating != null) {
    titleHtml += `<span class="course-popover-rating" style="background:${getRatingColor(qualityRating)}">${qualityRating.toFixed(2)}</span>`;
  }
  if (courseInfoLink) {
    titleHtml += `<a class="course-popover-info-link" href="${courseInfoLink}" target="_blank" rel="noopener noreferrer" title="View course details"><i class="fas fa-info-circle fa-lg fa-fw course-info"></i></a>`;
  }
  titleHtml += `</span></span>`;
  courseElement.setAttribute('data-bs-title', titleHtml);

  // Build content
  let content;
  if (!course['external']) {
    content = courseTitle;
  } else {
    content = "This is an external credit that you've added.";
  }

  let duplicateCount = 0;
  if (duplicateCourseCounts instanceof Map) {
    const normalizedName = (courseName || '').trim().toUpperCase();
    duplicateCount = duplicateCourseCounts.get(normalizedName) || 0;
  }

  if (duplicateCount > 1) {
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
    template:
      '<div class="popover course-popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
  });

  const cleanupHoverBehavior = bindManualHoverPopover(
    courseElement,
    popoverInstance
  );
  courseElement[COURSE_POPOVER_CLEANUP_KEY] = () => {
    cleanupHoverBehavior();
    popoverInstance.dispose();
    delete courseElement[COURSE_POPOVER_CLEANUP_KEY];
  };
}
