import React from 'react';
import styled from 'styled-components';

const Pane = styled.section`
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 2px;
  padding: 12px;
  min-height: 520px;
  overflow: auto;
`;

const Heading = styled.h3`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.darkGreyText};
`;

const EmptyState = styled.p`
  color: ${({ theme }) => theme.darkGreyText};
`;

const Node = styled.div`
  border-left: 2px solid ${({ theme }) => theme.lightGrey};
  padding-left: 10px;
  margin-bottom: 8px;
`;

const NodeHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 4px 6px;
  border-radius: 2px;
  background: ${({ theme, $status }) => {
    if ($status === 'done') return theme.greenSemBody;
    if ($status === 'neutral') return '#f3eab4';
    return '#ffc0cb';
  }};
  color: ${({ theme }) => theme.darkGreyText};
`;

const CoursePill = styled.span`
  display: inline-block;
  margin: 2px 6px 2px 0;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 12px;
  background: ${({ $settled, theme }) => ($settled ? theme.greenSemBody : theme.greySemBody)};
`;

function getRequirementStatus(requirement) {
  if (requirement.min_needed === 0 && requirement.count === 0) {
    return 'neutral';
  }
  if (
    (requirement.min_needed === 0 && requirement.count >= 0) ||
    (requirement.min_needed > 0 && requirement.count >= requirement.min_needed)
  ) {
    return 'done';
  }
  return 'pending';
}

function getCountLabel(requirement) {
  if (requirement.min_needed === 0) {
    return String(requirement.count);
  }
  return `${requirement.count}/${requirement.min_needed}`;
}

function renderRequirementNode(requirement, key) {
  if (!requirement || typeof requirement !== 'object') return null;
  const status = getRequirementStatus(requirement);
  const children = Array.isArray(requirement.req_list) ? requirement.req_list : [];

  return (
    <Node key={key}>
      <NodeHeader $status={status}>
        <span>{requirement.name}</span>
        <strong>{getCountLabel(requirement)}</strong>
      </NodeHeader>
      {children.length > 0 && (
        <div style={{ marginTop: '6px' }}>
          {children.map((child, index) =>
            renderRequirementNode(child, `${key}-${index}`)
          )}
        </div>
      )}
      {Array.isArray(requirement.settled) && requirement.settled.length > 0 && (
        <div style={{ marginTop: '6px' }}>
          {requirement.settled.map((course, index) => (
            <CoursePill key={`${key}-settled-${index}`} $settled>
              {course}
            </CoursePill>
          ))}
        </div>
      )}
      {Array.isArray(requirement.unsettled) && requirement.unsettled.length > 0 && (
        <div style={{ marginTop: '6px' }}>
          {requirement.unsettled.map((course, index) => (
            <CoursePill key={`${key}-unsettled-${index}`}>
              {course}
            </CoursePill>
          ))}
        </div>
      )}
    </Node>
  );
}

export default function RequirementsPane({ requirementName, requirementData }) {
  if (!requirementData) {
    return (
      <Pane>
        <Heading>Requirements</Heading>
        <EmptyState>Select a major, minor, or cert to view details.</EmptyState>
      </Pane>
    );
  }

  if (typeof requirementData !== 'object') {
    return (
      <Pane>
        <Heading>{requirementName || 'Requirements'}</Heading>
        <EmptyState>
          This requirement set is not supported yet. Degree progress still appears in TigerPath.
        </EmptyState>
      </Pane>
    );
  }

  return (
    <Pane>
      <Heading>{requirementName}</Heading>
      {renderRequirementNode(requirementData, 'root')}
    </Pane>
  );
}
