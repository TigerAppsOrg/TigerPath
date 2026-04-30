import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

const Header = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 14px;
  margin-bottom: 8px;

  @media print {
    display: none;
  }
`;

const PlanTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
  background: #e8e8e8;
  border-radius: 999px;
  padding: 6px 10px;
`;

const PlanTab = styled.button`
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--tp-active-plan-border)' : 'transparent')};
  box-shadow: ${({ $active }) => ($active ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.45)' : 'none')};
  background: ${({ $active }) => ($active ? 'var(--tp-active-plan-fill)' : 'transparent')};
  color: #181818;
  border-radius: 999px;
  padding: 6px 16px;
  min-height: 34px;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  position: relative;

  &:hover {
    background: ${({ $active }) => ($active ? 'var(--tp-active-plan-fill)' : 'rgba(255,255,255,0.55)')};
  }
`;

const TabLabel = styled.span`
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  max-width: calc(100% - 22px);
`;

const EditButton = styled.button`
  border: none;
  background: transparent;
  color: #111111;
  padding: 0;
  line-height: 1;
  font-size: 13px;
  opacity: 0.68;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);

  &:hover {
    color: #111111;
    opacity: 1;
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
  width: min(630px, calc(100vw - 48px));
  border: 2px solid #dddddd;
  border-radius: 16px;
  background: white;
  padding: 18px 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  column-gap: 24px;
  row-gap: 16px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.14);
`;

const PanelSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

const PathTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 3px solid #d4d4d4;
`;

const PathTitleInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.darkGreyText};
  font-size: 34px;
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
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  padding: 4px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.68;

  &:hover {
    color: var(--tp-accent);
    opacity: 1;
  }
`;

const PanelSelect = styled.select`
  appearance: none;
  -webkit-appearance: none;
  border: 2px solid #d8d8d8;
  border-radius: 12px;
  min-height: 64px;
  padding: 0 46px 0 18px;
  font-size: 15px;
  color: ${({ theme }) => theme.darkGreyText};
  background: #ffffff;
  width: 100%;
  min-width: 0;

  &:focus {
    border-color: var(--tp-accent);
    outline: none;
  }
`;

const PanelSelectWrapper = styled.div`
  position: relative;
  min-width: 0;
`;

const MultiSelectWrapper = styled.div`
  position: relative;
  min-width: 0;
`;

const SelectedMinorsBox = styled.div`
  position: relative;
  border: 2px solid #d8d8d8;
  border-radius: 12px;
  background: white;
  min-height: 76px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px 42px 12px 14px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  cursor: pointer;

  &:hover,
  &:focus {
    border-color: var(--tp-accent);
    outline: none;
  }
`;

const MinorChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--tp-course-border);
  border-radius: 999px;
  background: var(--tp-course-fill);
  color: var(--tp-course-text);
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
  color: var(--tp-course-text);
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
  pointer-events: none;
`;

const EmptyMinorHint = styled.span`
  font-size: 15px;
  color: ${({ theme }) => theme.darkGreyText};
`;

const MinorSupportHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.darkGreyText};
`;

const MultiSelectMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  border: 2px solid #d8d8d8;
  border-radius: 14px;
  max-height: 180px;
  overflow-y: auto;
  padding: 10px 12px 12px;
  background: white;
  z-index: 42;
`;

const MinorSearchInput = styled.input`
  width: 100%;
  border: 2px solid #eeeeee;
  border-radius: 10px;
  min-height: 34px;
  padding: 0 10px;
  margin-bottom: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.darkGreyText};

  &:focus {
    border-color: var(--tp-accent);
    outline: none;
  }
`;

const EmptyMinorSearch = styled.div`
  padding: 8px 2px 2px;
  color: #8b8b8b;
  font-size: 13px;
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

const MinorOptionText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MinorOptionSupportText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.darkGreyText};
  opacity: 0.8;
`;

const InfoRow = styled.div`
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
`;

const InfoLabel = styled.span`
  font-size: 15px;
  font-weight: 700;
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
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
  padding-top: 8px;
`;

const PanelActionButton = styled.button`
  width: 100%;
  border: 2px solid ${({ $variant }) => {
    if ($variant === 'save') return '#a7d84f';
    if ($variant === 'danger') return '#efb6ad';
    if ($variant === 'warn') return '#d0d0d0';
    return '#d0d0d0';
  }};
  border-radius: 10px;
  min-height: 46px;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  white-space: nowrap;
  color: #1b1b1b;
  background: ${({ $variant }) => {
    if ($variant === 'save') return '#e5ff9d';
    if ($variant === 'danger') return '#ffdcd6';
    if ($variant === 'warn') return '#f2f2f2';
    return 'white';
  }};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(0, 0, 0, 0.09);
  }
`;

const Divider = styled.span`
  color: #8e8e8e;
  user-select: none;
  font-size: 22px;
  opacity: 1;
`;

const AddButton = styled.button`
  border: none;
  background: transparent;
  color: #7d7d7d;
  border-radius: 2px;
  min-width: 20px;
  min-height: 20px;
  padding: 0 4px;
  font-size: 34px;
  line-height: 1;

  &:hover {
    color: #555555;
  }
`;

const LockIcon = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.darkGreyText};
  opacity: 0.45;
  min-width: 22px;
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: help;

  &:hover,
  &:focus {
    opacity: 0.75;
    outline: none;
  }
`;

const MAX_PLANS = 5;

export default function PlanHeader({
  plans,
  activePlanId,
  onSetActivePlan,
  onCreatePlan,
  onUpdatePlanSettings,
  onCopyPlan,
  onDeletePlan,
  planEditorOptions,
}) {
  // The active plan drives the schedule grid, requirements, and edit modal contents.
  const activePlan = plans.find((plan) => plan.id === activePlanId) || null;
  const canDelete = plans.length > 1;
  const atPlanLimit = plans.length >= MAX_PLANS;
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftMajorId, setDraftMajorId] = useState('');
  const [draftMinorCodes, setDraftMinorCodes] = useState([]);
  const [isMinorMenuOpen, setIsMinorMenuOpen] = useState(false);
  const [minorSearchQuery, setMinorSearchQuery] = useState('');
  const panelRef = useRef(null);
  const minorWrapperRef = useRef(null);
  const titleInputRef = useRef(null);
  const lockIconRef = useRef(null);

  useEffect(() => {
    if (!activePlan) {
      setIsEditing(false);
      setDraftName('');
      setDraftMajorId('');
      setDraftMinorCodes([]);
      setIsMinorMenuOpen(false);
      setMinorSearchQuery('');
      return;
    }
    setDraftName(activePlan.name || '');
    setDraftMajorId(activePlan.majorId ? String(activePlan.majorId) : '');
    setDraftMinorCodes(activePlan.minorCodes || []);
  }, [activePlan]);

  useEffect(() => {
    if (!isEditing || !isMinorMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!panelRef.current?.contains(event.target)) return;
      if (minorWrapperRef.current?.contains(event.target)) return;
      setIsMinorMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isEditing, isMinorMenuOpen]);

  useEffect(() => {
    if (!atPlanLimit || !lockIconRef.current || !window.bootstrap?.Tooltip) {
      return undefined;
    }

    const tooltip = new window.bootstrap.Tooltip(lockIconRef.current, {
      trigger: 'hover focus',
      placement: 'bottom',
      title: `You have reached the maximum of ${MAX_PLANS} plans.`,
    });

    return () => tooltip.dispose();
  }, [atPlanLimit]);

  const closeEditPanel = () => {
    // Reset unsaved modal edits whenever the popup closes.
    setIsEditing(false);
    setDraftName(activePlan?.name || '');
    setDraftMajorId(activePlan?.majorId ? String(activePlan.majorId) : '');
    setDraftMinorCodes(activePlan?.minorCodes || []);
    setIsMinorMenuOpen(false);
    setMinorSearchQuery('');
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
      setMinorSearchQuery('');
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
  const filteredMinorOptions = useMemo(() => {
    const query = minorSearchQuery.trim().toLowerCase();
    const minorOptions = planEditorOptions?.minorOptions || [];
    if (!query) return minorOptions;
    return minorOptions.filter((minorOption) => {
      const label = `${minorOption.name} ${minorOption.code}`.toLowerCase();
      return label.includes(query);
    });
  }, [minorSearchQuery, planEditorOptions]);
  const hasUnsupportedMinorSelections = selectedMinorOptions.some(
    (minorOption) => !minorOption.supported
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
      <PlanTabs id="main-view-tabs">
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
                      setMinorSearchQuery('');
                      setIsEditing(true);
                    }}
                  >
                    <i className="fas fa-pencil-alt" aria-hidden="true" />
                  </EditButton>
                )}
              </PlanTab>
              {index < plans.length - 1 && <Divider>|</Divider>}
            </React.Fragment>
          );
        })}
        {/* Keep the add/lock action inside the rail so it shifts right as plans are added. */}
        <Divider>|</Divider>
        {atPlanLimit ? (
          <LockIcon
            ref={lockIconRef}
            type="button"
            aria-label="Plan limit reached"
            data-bs-toggle="tooltip"
            data-bs-placement="bottom"
            data-bs-title={`You have reached the maximum of ${MAX_PLANS} plans.`}
          >
            <i className="fas fa-lock" aria-hidden="true" />
          </LockIcon>
        ) : (
          <AddButton type="button" onClick={handleCreate} aria-label="Create plan">
            +
          </AddButton>
        )}
      </PlanTabs>
      {isEditing && <PanelBackdrop onClick={closeEditPanel} />}
      {isEditing && activePlan && (
        <EditPanel ref={panelRef}>
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
                <i className="fas fa-pencil-alt" aria-hidden="true" />
              </PathTitleEditButton>
            </PathTitleRow>
            <InfoRow>
              <InfoLabel>Major</InfoLabel>
              <PanelSelectWrapper>
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
                <MinorsChevron className="fas fa-chevron-down" aria-hidden="true" />
              </PanelSelectWrapper>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Minors</InfoLabel>
              {(planEditorOptions?.minorOptions || []).length > 0 ? (
                <MultiSelectWrapper ref={minorWrapperRef}>
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
                            {minorOption.supported
                              ? minorOption.name
                              : `${minorOption.name} (not fully supported)`}
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
                      <MinorSearchInput
                        type="text"
                        placeholder="Search minors..."
                        value={minorSearchQuery}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setMinorSearchQuery(event.target.value)}
                      />
                      {filteredMinorOptions.length > 0 ? filteredMinorOptions.map((minorOption) => {
                        const isSelected = draftMinorCodes.includes(minorOption.code);
                        return (
                          <MinorOptionRow
                            key={minorOption.code}
                            type="button"
                            $selected={isSelected}
                            onClick={() => handleMinorToggle(minorOption.code)}
                          >
                            <MinorOptionText>
                              <span>{minorOption.name}</span>
                              {!minorOption.supported && (
                                <MinorOptionSupportText>
                                  Not fully supported yet
                                </MinorOptionSupportText>
                              )}
                            </MinorOptionText>
                          </MinorOptionRow>
                        );
                      }) : (
                        <EmptyMinorSearch>No minors found.</EmptyMinorSearch>
                      )}
                    </MultiSelectMenu>
                  )}
                </MultiSelectWrapper>
              ) : (
                <InfoValue>No minor options available</InfoValue>
              )}
            </InfoRow>
            {hasUnsupportedMinorSelections && (
              <MinorSupportHint>
                Some selected minors are not fully supported yet, so requirement progress may be incomplete.
              </MinorSupportHint>
            )}
          </PanelSection>
          <PanelActions>
            <PanelActionButton type="button" $variant="save" onClick={handleSave}>
              <span>Save</span>
              <i className="fas fa-check" aria-hidden="true" />
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
