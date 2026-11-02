import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';

export const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
export const SEASONS = ['Fall', 'Spring'];
export const SEMESTER_COUNT = EXTERNAL_CREDITS_SEMESTER_INDEX + 1;

export const emptySchedule = () => Array.from({ length: SEMESTER_COUNT }, () => []);

export function isCourseAlreadyScheduled(schedule, courseId) {
  return (schedule || []).flat().some((course) => !course?.external && course.id === courseId);
}

/** Only the fields the backend stores; everything else is re-derived server-side. */
export function stripSchedule(schedule) {
  return schedule.map((semester) =>
    semester.map((course) => {
      const stripped = { id: course.id, settled: course.settled };
      if (course.external) {
        stripped.external = course.external;
        stripped.name = course.name;
      }
      return stripped;
    })
  );
}

export function courseFromSearchResult(result) {
  return {
    id: result.id,
    name: result.name,
    title: result.title,
    dist_area: result.dist_area,
    semester: result.semester,
    semester_list: result.semester_list,
    quality_rating: result.quality_rating ?? null,
    settled: [],
  };
}

/** "fall" | "spring" | "both" | "external" vs. the semester index it was dropped in. */
export function isWrongSeason(course, semesterIndex) {
  if (!course || course.external || semesterIndex >= EXTERNAL_CREDITS_SEMESTER_INDEX) return false;
  const columnSeason = semesterIndex % 2 === 0 ? 'fall' : 'spring';
  return course.semester === 'fall' || course.semester === 'spring'
    ? course.semester !== columnSeason
    : false;
}

/** Same year range as forms.create_year_choices on the backend. */
export function classYearChoices(now = new Date()) {
  const offset = now.getMonth() < 6 ? 0 : 1;
  return Array.from({ length: 4 }, (_, i) => now.getFullYear() + offset + i);
}

/** princetoncourses.com term code for the most recent offering, e.g. "f25" -> "1262". */
export function latestTermCode(semesterList) {
  const last = (semesterList || []).at(-1);
  if (!last) return null;
  const year = parseInt(last.slice(1), 10);
  return last[0] === 'f' ? `1${year + 1}2` : `1${year}4`;
}
