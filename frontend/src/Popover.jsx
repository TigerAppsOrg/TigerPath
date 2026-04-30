import {
  getSemesterType,
  isFallSemester,
  isSpringSemester,
} from 'utils/SemesterUtils';
import { bindManualHoverPopover } from 'utils/manualHoverPopover';

const COURSE_POPOVER_CLEANUP_KEY = '__tigerpathCoursePopoverCleanup';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  const courseElement = document.getElementById(courseKey);
  if (!courseElement) return;

  let titleHtml = `<span class="course-popover-title">
    <span class="course-popover-name">${escapeHtml(courseName)}</span>
    <span class="course-popover-actions">`;
  if (qualityRating != null) {
    titleHtml += `<span class="course-popover-rating" style="background:${getRatingColor(qualityRating)}">${qualityRating.toFixed(2)}</span>`;
  }
  titleHtml += `<button type="button" class="course-popover-info-link" title="View course details" aria-label="View ${escapeHtml(courseName)} details"><i class="fas fa-info-circle fa-lg fa-fw course-info" aria-hidden="true"></i></button>`;
  titleHtml += `</span></span>`;
  courseElement.setAttribute('data-bs-title', titleHtml);

  // Build content
  let content;
  if (!course['external']) {
    content = escapeHtml(courseTitle);
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
    popoverInstance,
    {
      onShow: (popoverEl) => {
        popoverEl?.querySelectorAll('.course-popover-info-link').forEach((button) => {
          button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            popoverInstance.hide();
            window.dispatchEvent(
              new CustomEvent('tigerpath:open-course-detail', {
                detail: { course },
              })
            );
          }, { once: true });
        });
      },
    }
  );
  courseElement[COURSE_POPOVER_CLEANUP_KEY] = () => {
    cleanupHoverBehavior();
    popoverInstance.dispose();
    delete courseElement[COURSE_POPOVER_CLEANUP_KEY];
  };
}
