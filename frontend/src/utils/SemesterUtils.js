export const SEMESTER_TYPE = Object.freeze({
  FALL_SEM: Symbol('fallSem'),
  SPRING_SEM: Symbol('springSem'),
  DEFAULT: Symbol('default'),
});

export const EXTERNAL_CREDITS_SEMESTER_INDEX = 8;

export function isFallSemester(semesterType) {
  return semesterType === SEMESTER_TYPE.FALL_SEM;
}

export function isSpringSemester(semesterType) {
  return semesterType === SEMESTER_TYPE.SPRING_SEM;
}

export function getSemesterType(semNum) {
  if (semNum % 2 === 0 && semNum !== EXTERNAL_CREDITS_SEMESTER_INDEX) {
    return SEMESTER_TYPE.FALL_SEM;
  } else if (semNum % 2 === 1 && semNum !== EXTERNAL_CREDITS_SEMESTER_INDEX) {
    return SEMESTER_TYPE.SPRING_SEM;
  } else {
    return SEMESTER_TYPE.DEFAULT;
  }
}

export function getSemesterNames(classYear) {
    let semesterNames = [];
    let year = classYear - 4;
    let semesterType = SEMESTER_TYPE.FALL_SEM;

    for (let i = 0; i < 8; i++) {
      let semester = isFallSemester(semesterType) ? 'Fall' : 'Spring';

      semesterNames.push(`${semester} ${year}`);

      semesterType = isFallSemester(semesterType) ? SEMESTER_TYPE.SPRING_SEM : SEMESTER_TYPE.FALL_SEM;
      if (isFallSemester(semesterType)) year++;
    }

    return semesterNames;
}