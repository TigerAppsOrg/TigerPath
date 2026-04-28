import React from 'react';
import styled from 'styled-components';

const Sidebar = styled.aside`
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 2px;
  padding: 10px;
  min-height: 520px;
`;

const SectionTitle = styled.h3`
  font-size: 15px;
  margin: 0 0 8px;
  color: ${({ theme }) => theme.darkGreyText};
`;

const DegreeList = styled.div`
  margin-bottom: 14px;
`;

const DegreeRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
`;

const DegreeButton = styled.button`
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.springSemHeaderColor : theme.lightGrey)};
  border-radius: 2px;
  background: ${({ theme, $selected }) => ($selected ? theme.greySemBody : 'white')};
  color: ${({ theme }) => theme.darkGreyText};
  padding: 6px 8px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SecondaryButton = styled.button`
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 2px;
  background: ${({ theme, $active }) => ($active ? theme.fallSemHeaderColor : 'white')};
  color: ${({ $active }) => ($active ? 'white' : '#555')};
  padding: 6px 8px;
`;

const EmptyState = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.darkGreyText};
  font-size: 13px;
`;

function sectionItems(items, type) {
  return items.filter((item) => item.type === type);
}

function DegreeSection({
  title,
  items,
  selectedRequirementId,
  primaryRequirementId,
  onSelect,
  onTogglePrimary,
}) {
  return (
    <DegreeList>
      <SectionTitle>{title}</SectionTitle>
      {items.length === 0 && <EmptyState>None selected</EmptyState>}
      {items.map((item) => (
        <DegreeRow key={item.id}>
          <DegreeButton
            type="button"
            $selected={item.id === selectedRequirementId}
            onClick={() => onSelect(item.id)}
            title={item.name}
          >
            {item.name}
          </DegreeButton>
          <SecondaryButton
            type="button"
            $active={item.id === primaryRequirementId}
            onClick={() => onTogglePrimary(item.id)}
            title="Set as primary"
          >
            {item.id === primaryRequirementId ? 'Primary' : 'Set Primary'}
          </SecondaryButton>
          <SecondaryButton type="button" disabled title="Add/remove in settings">
            View
          </SecondaryButton>
        </DegreeRow>
      ))}
    </DegreeList>
  );
}

export default function DegreeSidebar({
  requirementItems,
  selectedRequirementId,
  primaryRequirementId,
  onSelect,
  onTogglePrimary,
}) {
  return (
    <Sidebar>
      <DegreeSection
        title="Majors"
        items={sectionItems(requirementItems, 'major')}
        selectedRequirementId={selectedRequirementId}
        primaryRequirementId={primaryRequirementId}
        onSelect={onSelect}
        onTogglePrimary={onTogglePrimary}
      />
      <DegreeSection
        title="Minors"
        items={sectionItems(requirementItems, 'minor')}
        selectedRequirementId={selectedRequirementId}
        primaryRequirementId={primaryRequirementId}
        onSelect={onSelect}
        onTogglePrimary={onTogglePrimary}
      />
      <DegreeSection
        title="Certs"
        items={sectionItems(requirementItems, 'cert')}
        selectedRequirementId={selectedRequirementId}
        primaryRequirementId={primaryRequirementId}
        onSelect={onSelect}
        onTogglePrimary={onTogglePrimary}
      />
    </Sidebar>
  );
}
