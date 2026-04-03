import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import PlanHeader from 'components/PlanHeader';
import DegreeSidebar from 'components/DegreeSidebar';
import RequirementsPane from 'components/RequirementsPane';

const Content = styled.div`
  padding: 6px;
`;

const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 12px;
`;

function classifyRequirementType(name) {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('minor')) return 'minor';
  if (normalized.includes('cert')) return 'cert';
  return 'major';
}

function buildRequirementItems(requirements) {
  return (requirements || []).map((requirement, index) => {
    const name = typeof requirement === 'object' ? requirement.name : requirement;
    return {
      id: `requirement-${index}`,
      name: name || `Requirement ${index + 1}`,
      type: classifyRequirementType(name),
      data: requirement,
    };
  });
}

export default function PlansView({
  plans,
  activePlanId,
  requirements,
  onSetActivePlan,
  onCreatePlan,
  onRenamePlan,
  onCopyPlan,
  onDeletePlan,
}) {
  const requirementItems = useMemo(
    () => buildRequirementItems(requirements),
    [requirements]
  );

  const [selectedRequirementId, setSelectedRequirementId] = useState(null);
  const [primaryRequirementId, setPrimaryRequirementId] = useState(null);

  useEffect(() => {
    if (requirementItems.length === 0) {
      setSelectedRequirementId(null);
      setPrimaryRequirementId(null);
      return;
    }

    const hasSelected = requirementItems.some(
      (item) => item.id === selectedRequirementId
    );
    if (!hasSelected) {
      setSelectedRequirementId(requirementItems[0].id);
    }

    const hasPrimary = requirementItems.some(
      (item) => item.id === primaryRequirementId
    );
    if (!hasPrimary) {
      setPrimaryRequirementId(requirementItems[0].id);
    }
  }, [requirementItems, selectedRequirementId, primaryRequirementId]);

  const selectedRequirement = requirementItems.find(
    (item) => item.id === selectedRequirementId
  );

  return (
    <Content>
      <PlanHeader
        plans={plans}
        activePlanId={activePlanId}
        onSetActivePlan={onSetActivePlan}
        onCreatePlan={onCreatePlan}
        onRenamePlan={onRenamePlan}
        onCopyPlan={onCopyPlan}
        onDeletePlan={onDeletePlan}
      />
      <SplitLayout>
        <DegreeSidebar
          requirementItems={requirementItems}
          selectedRequirementId={selectedRequirementId}
          primaryRequirementId={primaryRequirementId}
          onSelect={setSelectedRequirementId}
          onTogglePrimary={setPrimaryRequirementId}
        />
        <RequirementsPane
          requirementName={selectedRequirement?.name}
          requirementData={selectedRequirement?.data}
        />
      </SplitLayout>
    </Content>
  );
}
