import React, { Component } from 'react';
import styled from 'styled-components'
import Semester, { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'components/Semester';
import CourseCard from 'components/CourseCard';
import ExternalCreditForm from 'components/ExternalCreditForm';

const ExternalCreditsContent = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: 1fr;
  height: inherit;
  grid-gap: 5px;
`;

const StyledSemester = styled(Semester)`

`;

export default class ExternalCreditsView extends Component {
  courseCardList = (courseList, semIndex) => {
    return (
      <React.Fragment>
        {courseList.map((course, courseIndex) => {
          let courseKey = `course-card-${semIndex}-${courseIndex}`;
          return (
            <CourseCard key={courseKey} course={course} showSearchInfo={false}
                        onCourseRemove={this.removeCourse} semIndex={semIndex} courseIndex={courseIndex} />
          );
        })}
      </React.Fragment>
    );
  }

  render() {
    return (
      <ExternalCreditsContent>
        <StyledSemester
          onChange={this.props.onChange}
          schedule={this.props.schedule}
          semesterIndex={EXTERNAL_CREDITS_SEMESTER_INDEX}
        >
          External Credits You've Added
        </StyledSemester>
        <ExternalCreditForm onChange={this.props.onChange} schedule={this.props.schedule} requirements={this.props.requirements} />
      </ExternalCreditsContent>
    );
  }
}
