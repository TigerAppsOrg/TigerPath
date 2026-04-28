import React from 'react';
import styled from 'styled-components';
import Schedule from 'components/Schedule';
import PlanHeader from 'components/PlanHeader';

export const MAIN_VIEW_TABS = Object.freeze({
  SCHEDULE_TAB: 'schedule',
});

const Content = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export default function MainView({
  onChange,
  profile,
  schedule,
  plans,
  activePlanId,
  onSetActivePlan,
  onCreatePlan,
  onUpdatePlanSettings,
  onCopyPlan,
  onDeletePlan,
  planEditorOptions,
}) {
  return (
    <>
      {/* Top multi-plan bar replaces the previous second-page/tabbed plan management view. */}
      <PlanHeader
        plans={plans}
        activePlanId={activePlanId}
        onSetActivePlan={onSetActivePlan}
        onCreatePlan={onCreatePlan}
        // The header owns the multi-plan rail and the centered edit popup workflow.
        onUpdatePlanSettings={onUpdatePlanSettings}
        onCopyPlan={onCopyPlan}
        onDeletePlan={onDeletePlan}
        planEditorOptions={planEditorOptions}
      />
      <Content>
        {/* Core scheduling UI always stays visible on this page. */}
        <Schedule
          onChange={onChange}
          profile={profile}
          schedule={schedule}
        />
      </Content>
    </>
  );
}
