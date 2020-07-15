import React, { Component } from 'react';
import styled from 'styled-components';
import Semester from 'components/Semester';
import CourseCard from 'components/CourseCard';
import ExternalCreditForm from 'components/ExternalCreditForm';
import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';

const ECContent = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(1, 1fr);
  grid-gap: 20px;
  grid-template-areas: 'sem add';
  padding: 20px 10px 20px 10px;
`;

const ECSemester = styled(Semester)`
  grid-area: sem;
`;

const ECForm = styled(ExternalCreditForm)`
  grid-area: add;
`;

export default class ExternalCreditsView extends Component {
  courseCardList = (courseList, semIndex) => {
    return (
      <React.Fragment>
        {courseList.map((course, courseIndex) => {
          let courseKey = `course-card-${semIndex}-${courseIndex}`;
          return (
            <CourseCard
              key={courseKey}
              course={course}
              showSearchInfo={false}
              onCourseRemove={this.removeCourse}
              semIndex={semIndex}
              courseIndex={courseIndex}
            />
          );
        })}
      </React.Fragment>
    );
  };

  render() {
    return (
      <ECContent>
        <ECSemester
          onChange={this.props.onChange}
          schedule={this.props.schedule}
          semesterIndex={EXTERNAL_CREDITS_SEMESTER_INDEX}
        >
          Your External Credits
        </ECSemester>
        <ECForm
          onChange={this.props.onChange}
          profile={this.props.profile}
          schedule={this.props.schedule}
          requirements={this.props.requirements}
        />
      </ECContent>
    );
  }
}
