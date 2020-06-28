import React from 'react';
import ReqCourse from './ReqCourse';

const ReqCourseList = (props) => {
  const { schedule, requirement, onChange } = props;

  const toggleSettle = (course, pathTo, shouldSettle) => {
    let pathToType = pathTo.split('//', 3).join('//');
    let newSchedule = schedule.slice();

    semLoop: for (let sem_num = 0; sem_num < newSchedule.length; sem_num++) {
      for (
        let course_index = 0;
        course_index < newSchedule[sem_num].length;
        course_index++
      ) {
        let scheduleCourse = newSchedule[sem_num][course_index];

        if (scheduleCourse['name'] === course && !scheduleCourse['external']) {
          let settledReqTypes = scheduleCourse['settled'].map((path) =>
            path.split('//', 3).join('//')
          );
          let indexOfPathToType = settledReqTypes.indexOf(pathToType);

          if (indexOfPathToType === -1 && shouldSettle) {
            scheduleCourse['settled'].push(pathTo);
            break semLoop;
          } else if (indexOfPathToType !== -1 && !shouldSettle) {
            scheduleCourse['settled'].splice(indexOfPathToType, 1);
            break semLoop;
          }
        }
      }
    }

    onChange('schedule', newSchedule);
  };

  return (
    <>
      {requirement['settled'].map((course, index) => (
        <ReqCourse
          key={index}
          course={course}
          isSettled={true}
          onClick={() => toggleSettle(course, requirement['path_to'], false)}
        />
      ))}
      {requirement['unsettled'].map((course, index) => (
        <ReqCourse
          key={index}
          course={course}
          isSettled={false}
          onClick={() => toggleSettle(course, requirement['path_to'], true)}
        />
      ))}
    </>
  );
};

export default ReqCourseList;
