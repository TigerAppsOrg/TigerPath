import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Header = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.lightGrey};
  margin-bottom: 10px;

  @media print {
    display: none;
  }
`;

const PlanTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
  background: ${({ theme }) => theme.greySemBody};
  border-radius: 999px;
  padding: 6px 10px;
`;

const PlanTab = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: ${({ theme, $active }) =>
    $active ? theme.greenSemBody : 'transparent'};
  color: ${({ theme }) => theme.darkGreyText};
  border-radius: 999px;
  padding: 4px 14px;
  min-height: 28px;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.greenSemBody : theme.greySemBody};
  }
`;

const TabLabel = styled.span`
  font-size: 14px;
`;

const EditButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.darkGreyText};
  padding: 0;
  line-height: 1;

  &:hover {
    background: ${({ theme }) => theme.darkGrey};
    color: white;
  }
`;

const PanelBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.greySemBody};
  opacity: 0.65;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 40;
`;

const EditPanel = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 41;
  width: min(560px, calc(100vw - 48px));
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 8px;
  background: white;
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px;
  column-gap: 28px;
  row-gap: 10px;
`;

const PanelSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PathTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid ${({ theme }) => theme.lightGrey};
`;

const PathTitleInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.darkGreyText};
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  width: 100%;
  min-width: 0;
  padding: 0;

  &:focus {
    outline: none;
  }

  @media (max-width: 900px) {
    font-size: 26px;
  }
`;

const PathTitleEditButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.darkGreyText};
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  padding: 0;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${({ theme }) => theme.darkGrey};
  }
`;

const PanelSelect = styled.select`
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 6px;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.darkGreyText};
  background: white;
`;

const MultiSelectWrapper = styled.div`
  position: relative;
`;

const SelectedMinorsBox = styled.div`
  position: relative;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 8px;
  background: white;
  height: 56px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 8px 38px 8px 12px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  cursor: pointer;
`;

const MinorChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ theme }) => theme.fallSemHeaderColor};
  border-radius: 999px;
  background: ${({ theme }) => theme.greySemBody};
  color: ${({ theme }) => theme.fallSemHeaderColor};
  padding: 4px 10px;
  flex: 0 0 auto;
  max-width: min(220px, calc(100% - 28px));
  min-width: 0;
  font-size: 12px;
`;

const MinorChipLabel = styled.span`
  display: block;
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveChipButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.fallSemHeaderColor};
  padding: 0;
  line-height: 1;
  font-size: 14px;
`;

const MinorsChevron = styled.i`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.lightGrey};
  font-size: 16px;
`;

const EmptyMinorHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.darkGreyText};
`;

const MultiSelectMenu = styled.div`
  position: absolute;
  top: 56px;
  left: 0;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 14px;
  max-height: 180px;
  overflow-y: auto;
  padding: 10px 12px;
  background: white;
  z-index: 42;
`;

const MinorOptionRow = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  display: flex;
  align-items: center;
  min-height: 34px;
  font-size: 14px;
  color: ${({ theme }) => theme.darkGreyText};
  font-weight: ${({ $selected }) => ($selected ? 700 : 400)};

  &:hover {
    background: ${({ theme }) => theme.greySemBody};
    border-radius: 6px;
  }
`;

const InfoRow = styled.div`
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 8px;
  align-items: center;
`;

const InfoLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.darkGreyText};
`;

const InfoValue = styled.div`
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 6px;
  height: 28px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  font-size: 12px;
  color: ${({ theme }) => theme.darkGreyText};
  background: ${({ theme }) => theme.greySemBody};
`;

const PanelActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const PanelActionButton = styled.button`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 6px;
  min-height: 30px;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 7px;
  white-space: nowrap;
  background: ${({ $variant, theme }) => {
    if ($variant === 'save') return theme.greenSemBody;
    if ($variant === 'danger') return theme.redSemBody;
    if ($variant === 'warn') return theme.greySemBody;
    return 'white';
  }};
`;

const Divider = styled.span`
  color: ${({ theme }) => theme.lightGrey};
  user-select: none;
`;

const AddButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.darkGreyText};
  border-radius: 2px;
  min-width: 22px;
  min-height: 22px;
  padding: 0;
  font-size: 32px;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.darkGrey};
  }
`;

export default function PlanHeader({
  plans,
  activePlanId,
  onSetActivePlan,
  onCreatePlan,
  onRenamePlan,
  onUpdatePlanSettings,
  onCopyPlan,
  onDeletePlan,
  planEditorOptions,
}) {
  // The active plan drives the schedule grid, requirements, and edit modal contents.
  const activePlan = plans.find((plan) => plan.id === activePlanId) || null;
  const canDelete = plans.length > 1;
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftMajorId, setDraftMajorId] = useState('');
  const [draftMinorCodes, setDraftMinorCodes] = useState([]);
  const [isMinorMenuOpen, setIsMinorMenuOpen] = useState(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (!activePlan) {
      setIsEditing(false);
      setDraftName('');
      setDraftMajorId('');
      setDraftMinorCodes([]);
      setIsMinorMenuOpen(false);
      return;
    }
    setDraftName(activePlan.name || '');
    setDraftMajorId(activePlan.majorId ? String(activePlan.majorId) : '');
    setDraftMinorCodes(activePlan.minorCodes || []);
  }, [activePlan]);

  const closeEditPanel = () => {
    // Reset unsaved modal edits whenever the popup closes.
    setIsEditing(false);
    setDraftName(activePlan?.name || '');
    setDraftMajorId(activePlan?.majorId ? String(activePlan.majorId) : '');
    setDraftMinorCodes(activePlan?.minorCodes || []);
    setIsMinorMenuOpen(false);
  };

  const handleCreate = () => {
    onCreatePlan({});
  };

  const handleSave = async () => {
    if (!activePlan) return;
    const name = draftName.trim();
    if (!name) return;
    // Persist the full modal state for the current plan in one backend update.
    try {
      await onUpdatePlanSettings({
        planId: activePlan.id,
        name,
        majorId: draftMajorId || null,
        minorCodes: draftMinorCodes,
      });
      setIsMinorMenuOpen(false);
      setIsEditing(false);
    } catch (error) {
      const backendMessage = error?.responseJSON?.error || error?.error;
      window.alert(backendMessage || 'Unable to save this plan.');
    }
  };

  const handleMinorToggle = (minorCode) => {
    // Dropdown rows act as toggles instead of native checkbox widgets to match the mock.
    setDraftMinorCodes((currentCodes) => {
      if (currentCodes.includes(minorCode)) {
        return currentCodes.filter((code) => code !== minorCode);
      }
      return [...currentCodes, minorCode];
    });
  };

  const handleMinorRemove = (minorCode) => {
    setDraftMinorCodes((currentCodes) =>
      currentCodes.filter((code) => code !== minorCode)
    );
  };

  const selectedMinorOptions = (planEditorOptions?.minorOptions || []).filter(
    (minorOption) => draftMinorCodes.includes(minorOption.code)
  );

  const handleCopy = () => {
    if (!activePlan) return;
    // Duplicate keeps schedule/metadata, while create starts a fresh empty plan.
    onCopyPlan({
      sourcePlanId: activePlan.id,
      name: `${draftName.trim() || activePlan.name} Copy`,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!activePlan || !canDelete) {
      if (!canDelete) {
        window.alert('At least one plan is required.');
      }
      return;
    }

    const confirmed = window.confirm(
      `Delete "${activePlan.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await onDeletePlan(activePlan.id);
      setIsEditing(false);
    } catch (error) {
      const backendMessage = error?.responseJSON?.error || error?.error;
      window.alert(backendMessage || 'Unable to delete this plan.');
    }
  };

  return (
    <Header>
      <PlanTabs>
        {plans.map((plan, index) => {
          const isActive = plan.id === activePlanId;
          return (
            <React.Fragment key={plan.id}>
              {/* Click the pill to switch active plan context for schedule + requirements. */}
              <PlanTab
                type="button"
                $active={isActive}
                onClick={() => onSetActivePlan(plan.id)}
              >
                <TabLabel>{plan.name}</TabLabel>
                {isActive && (
                  // Edit icon opens the in-place workflow panel.
                  <EditButton
                    type="button"
                    aria-label="Open plan editor"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDraftName(activePlan?.name || '');
                      setDraftMajorId(
                        activePlan?.majorId ? String(activePlan.majorId) : ''
                      );
                      setDraftMinorCodes(activePlan?.minorCodes || []);
                      setIsMinorMenuOpen(false);
                      setIsEditing(true);
                    }}
                  >
                    ✎
                  </EditButton>
                )}
              </PlanTab>
              {index < plans.length - 1 && <Divider>|</Divider>}
            </React.Fragment>
          );
        })}
        {/* Keep the add action inside the rail so it shifts right as plans are added. */}
        <Divider>|</Divider>
        <AddButton type="button" onClick={handleCreate} aria-label="Create plan">
          +
        </AddButton>
      </PlanTabs>
      {isEditing && <PanelBackdrop onClick={closeEditPanel} />}
      {isEditing && activePlan && (
        <EditPanel>
          <PanelSection>
            {/* Large editable title row mirrors the Figma modal header treatment. */}
            <PathTitleRow>
              <PathTitleInput
                ref={titleInputRef}
                aria-label="Path title"
                placeholder="Path Title"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                maxLength={80}
              />
              <PathTitleEditButton
                type="button"
                aria-label="Edit path title"
                onClick={() => titleInputRef.current?.focus()}
              >
                <span aria-hidden="true">✎</span>
              </PathTitleEditButton>
            </PathTitleRow>
            <InfoRow>
              <InfoLabel>Major</InfoLabel>
              <PanelSelect
                value={draftMajorId}
                onChange={(event) => setDraftMajorId(event.target.value)}
              >
                <option value="">No major selected</option>
                {(planEditorOptions?.majorOptions || []).map((majorOption) => (
                  <option key={majorOption.id} value={majorOption.id}>
                    {majorOption.name}
                  </option>
                ))}
              </PanelSelect>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Minors</InfoLabel>
              {(planEditorOptions?.minorOptions || []).length > 0 ? (
                <MultiSelectWrapper>
                  {/* Fixed-height chip field prevents long minor lists from stretching the modal. */}
                  <SelectedMinorsBox
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle minor options"
                    onClick={() => setIsMinorMenuOpen((isOpen) => !isOpen)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setIsMinorMenuOpen((isOpen) => !isOpen);
                      }
                    }}
                  >
                    {selectedMinorOptions.length > 0 ? (
                      selectedMinorOptions.map((minorOption) => (
                        <MinorChip key={minorOption.code}>
                          <RemoveChipButton
                            type="button"
                            aria-label={`Remove ${minorOption.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMinorRemove(minorOption.code);
                            }}
                          >
                            ×
                          </RemoveChipButton>
                          <MinorChipLabel title={minorOption.name}>
                            {minorOption.name}
                          </MinorChipLabel>
                        </MinorChip>
                      ))
                    ) : (
                      <EmptyMinorHint>No minors selected</EmptyMinorHint>
                    )}
                    <MinorsChevron
                      className={`fas ${isMinorMenuOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}
                      aria-hidden="true"
                    />
                  </SelectedMinorsBox>
                  {isMinorMenuOpen && (
                    <MultiSelectMenu>
                      {(planEditorOptions?.minorOptions || []).map((minorOption) => {
                        const isSelected = draftMinorCodes.includes(minorOption.code);
                        return (
                          <MinorOptionRow
                            key={minorOption.code}
                            type="button"
                            $selected={isSelected}
                            onClick={() => handleMinorToggle(minorOption.code)}
                          >
                            <span>{minorOption.name}</span>
                          </MinorOptionRow>
                        );
                      })}
                    </MultiSelectMenu>
                  )}
                </MultiSelectWrapper>
              ) : (
                <InfoValue>No minor options available</InfoValue>
              )}
            </InfoRow>
          </PanelSection>
          <PanelActions>
            <PanelActionButton type="button" $variant="save" onClick={handleSave}>
              <span>Save</span>
              <i className="fas fa-check" aria-hidden="true" />
            </PanelActionButton>
            <PanelActionButton type="button" onClick={closeEditPanel}>
              <span>Cancel</span>
              <i className="fas fa-times" aria-hidden="true" />
            </PanelActionButton>
            <PanelActionButton type="button" $variant="danger" onClick={handleDelete}>
              <span>Delete</span>
              <i className="fas fa-trash-alt" aria-hidden="true" />
            </PanelActionButton>
            <PanelActionButton type="button" $variant="warn" onClick={handleCopy}>
              <span>Duplicate</span>
              <i className="fas fa-copy" aria-hidden="true" />
            </PanelActionButton>
          </PanelActions>
        </EditPanel>
      )}
    </Header>
  );
}
