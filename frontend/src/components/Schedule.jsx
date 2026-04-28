import React, { useEffect } from 'react';
import { apiFetch } from 'utils/api';
import Semester from 'components/Semester';
import styled from 'styled-components';
import { DEFAULT_SCHEDULE } from 'utils/SemesterUtils';
import { addPopover } from 'Popover';

const YEARS = [
  { label: 'Freshman',  fall: 0, spring: 1 },
  { label: 'Sophomore', fall: 2, spring: 3 },
  { label: 'Junior',    fall: 4, spring: 5 },
  { label: 'Senior',    fall: 6, spring: 7 },
];

const MissingYearNotice = styled.p`
  margin: 0;
  padding: 0 7px 5px;
`;

const ScheduleOuter = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 2px 4px 12px;
`;

const ScheduleCard = styled.div`
  flex: 1;
  min-height: 0;
  background: white;
  border-radius: 18px;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  box-shadow:
    0 0 0 2px rgba(217, 217, 217, 0.9),
    0 3px 12px rgba(0, 0, 0, 0.10);
`;

const YearBlock = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px 14px 10px;
  min-height: 0;
  min-width: 0;
  ${({ $borderRight }) => $borderRight && `border-right: 2px solid rgba(217, 217, 217, 0.95);`}
  ${({ $borderBottom }) => $borderBottom && `border-bottom: 2px solid rgba(217, 217, 217, 0.95);`}
`;

const YearTitle = styled.h2`
  font-size: 27px;
  font-weight: 800;
  text-align: center;
  margin: 0 0 8px;
  color: #111111;
  letter-spacing: -0.03em;
`;

const SemPair = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2px minmax(0, 1fr);
`;

const SemColDivider = styled.div`
  background: ${({ theme }) => theme.lightGrey};
  opacity: 0.9;
`;

export default function Schedule({ onChange, profile, schedule }) {
  const hasLoadedProfile = profile !== null;
  const shouldShowMissingYearNotice = hasLoadedProfile && !profile?.classYear;

  useEffect(() => {
    if (schedule === null) {
      apiFetch('/api/v1/get_schedule/')
        .then((data) => {
          if (data) onChange('schedule', data);
        })
        .catch(() => {
          onChange(
            'schedule',
            DEFAULT_SCHEDULE.map((semester) => semester.slice())
          );
        });
    }
  }, [schedule, onChange]);

  useEffect(() => {
    if (schedule) {
      addPopovers(schedule);
    }
  }, [schedule]);

  const addPopovers = (sched) => {
    if (!sched) return;
    const courseNameCounts = new Map();
    for (const semester of sched) {
      for (const course of semester) {
        const normalizedName = (course?.name || '').trim().toUpperCase();
        if (!normalizedName) continue;
        courseNameCounts.set(
          normalizedName,
          (courseNameCounts.get(normalizedName) || 0) + 1
        );
      }
    }
    for (let semIndex = 0; semIndex < sched.length; semIndex++) {
      for (let courseIndex = 0; courseIndex < sched[semIndex].length; courseIndex++) {
        let course = sched[semIndex][courseIndex];
        let courseKey = `course-card-${course['semester']}-${semIndex}-${courseIndex}`;
        addPopover(course, courseKey, semIndex, courseNameCounts);
      }
    }
  };

  return (
    <ScheduleOuter>
      {shouldShowMissingYearNotice && (
        <MissingYearNotice className="warning-text">
          Set your class year in Settings to label semesters correctly.
        </MissingYearNotice>
      )}
      <ScheduleCard id="semesters">
        {YEARS.map((year, i) => (
          <YearBlock
            key={year.label}
            $borderRight={i % 2 === 0}
            $borderBottom={i < 2}
          >
            <YearTitle>{year.label}</YearTitle>
            <SemPair>
              <Semester onChange={onChange} schedule={schedule} semesterIndex={year.fall}>
                Fall
              </Semester>
              <SemColDivider />
              <Semester onChange={onChange} schedule={schedule} semesterIndex={year.spring}>
                Spring
              </Semester>
            </SemPair>
          </YearBlock>
        ))}
      </ScheduleCard>
    </ScheduleOuter>
  );
}
