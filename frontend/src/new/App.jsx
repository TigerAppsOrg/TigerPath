import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { getTigerPathThemeVariables } from 'styles/theme';
import usePlanner from './usePlanner';
import { getRequirementCourses, setUiVersion } from './api';
import startTutorial from './tutorial';
import Header from './components/Header';
import SearchPanel, { SATISFYING_PREFIX, SEARCH_DROPPABLE_ID } from './components/SearchPanel';
import PlanTabs, { MAX_PLANS } from './components/PlanTabs';
import PathModal from './components/PathModal';
import Board from './components/Board';
import RequirementsPanel from './components/RequirementsPanel';
import CourseDrawer from './components/CourseDrawer';
import SettingsModal from './components/SettingsModal';
import ImportTranscriptModal from './components/ImportTranscriptModal';
import './styles.css';

const semesterIndexOf = (droppableId) => parseInt(droppableId.replace('sem', ''), 10);

export default function App() {
  const planner = usePlanner();
  const { profile, plans, activePlan, schedule, requirements } = planner;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [draggingSeason, setDraggingSeason] = useState(null);
  const [pathModal, setPathModal] = useState(null); // {mode: 'create'|'edit', plan}
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [creditPath, setCreditPath] = useState(null);

  const themeName = profile?.theme || 'purple';
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(getTigerPathThemeVariables(themeName)).forEach(([k, v]) => root.style.setProperty(k, v));
    root.dataset.tigerpathTheme = themeName;
  }, [themeName]);

  useEffect(() => {
    if (window.__TIGERPATH_SHOW_TUTORIAL__ && schedule) {
      window.__TIGERPATH_SHOW_TUTORIAL__ = false;
      requestAnimationFrame(startTutorial);
    }
  }, [schedule]);

  const scheduledIds = useMemo(
    () => new Set((schedule || []).flat().filter((c) => !c.external).map((c) => c.id)),
    [schedule]
  );

  const findSatisfyingCourses = useCallback((pathTo) => {
    setSearchQuery(SATISFYING_PREFIX + pathTo.split('//').pop());
    setSearchLoading(true);
    getRequirementCourses(pathTo)
      .then((results) => setSearchResults(results || []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, []);

  const onDragStart = useCallback(
    (start) => {
      if (start.source.droppableId === SEARCH_DROPPABLE_ID) {
        setDraggingSeason(searchResults[start.source.index]?.semester ?? null);
      } else {
        const sem = semesterIndexOf(start.source.droppableId);
        setDraggingSeason(schedule?.[sem]?.[start.source.index]?.semester ?? null);
      }
    },
    [schedule, searchResults]
  );

  const onDragEnd = useCallback(
    (result) => {
      setDraggingSeason(null);
      const { source, destination } = result;
      if (!destination || destination.droppableId === SEARCH_DROPPABLE_ID) return;
      const toSemester = semesterIndexOf(destination.droppableId);
      if (source.droppableId === SEARCH_DROPPABLE_ID) {
        const course = searchResults[source.index];
        if (course) planner.addCourse(course, toSemester, destination.index);
      } else {
        const fromSemester = semesterIndexOf(source.droppableId);
        if (fromSemester === toSemester && source.index === destination.index) return;
        planner.moveCourse(fromSemester, source.index, toSemester, destination.index);
      }
    },
    [planner, searchResults]
  );

  const requirementCtx = {
    schedule,
    creditPath,
    setCreditPath,
    onFindCourses: findSatisfyingCourses,
    onSettle: planner.settle,
    onAddCredit: planner.addExternalCredit,
    onRemoveCredit: planner.removeExternalCredit,
  };

  const switchToClassic = () => setUiVersion('classic').then(() => window.location.reload());

  return (
    <div className="tp-app" data-theme={themeName}>
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onImportTranscript={() => setImportOpen(true)}
        onSwitchToClassic={switchToClassic}
        onStartTutorial={startTutorial}
      />

      <div className="print-only tp-print-header">
        <h1>My Four Year Schedule{activePlan ? `: ${activePlan.name}` : ''}</h1>
        <p>
          This schedule was created using <b>TigerPath - Princeton&apos;s Four-Year Course Planner</b> at{' '}
          <a href="https://path.tigerapps.org/">path.tigerapps.org</a>.
        </p>
      </div>

      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <main className="tp-main">
          <SearchPanel
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            onResultsChange={setSearchResults}
            loading={searchLoading}
            selectedCourseId={selectedCourse?.id}
            onSelectCourse={setSelectedCourse}
            scheduledIds={scheduledIds}
          />

          <div className="tp-center">
            <div className="tp-center-top">
              <PlanTabs
                plans={plans}
                activePlanId={activePlan?.id}
                onSelect={planner.selectPlan}
                onEdit={(plan) => setPathModal({ mode: 'edit', plan })}
                onCreate={() => setPathModal({ mode: 'create' })}
              />
              <span className="tp-save-state dont-print" aria-live="polite">
                {planner.saving ? 'Saving…' : ''}
              </span>
            </div>
            {planner.notice && (
              <div className={`tp-notice ${planner.notice.tone}`} role="status">
                {planner.notice.text}
              </div>
            )}
            {schedule ? (
              <Board
                schedule={schedule}
                classYear={profile?.classYear}
                draggingSeason={draggingSeason}
                onRemove={planner.removeCourse}
              />
            ) : (
              <p className="tp-empty">Loading your plan...</p>
            )}
          </div>

          <RequirementsPanel
            requirements={requirements}
            activePlan={activePlan}
            ctx={requirementCtx}
            onEditPlan={() => activePlan && setPathModal({ mode: 'edit', plan: activePlan })}
          />
        </main>
      </DragDropContext>

      <CourseDrawer
        course={selectedCourse}
        alreadyPlanned={selectedCourse ? scheduledIds.has(selectedCourse.id) : false}
        onClose={() => setSelectedCourse(null)}
        onAdd={(course, semesterIndex) => planner.addCourse(course, semesterIndex)}
      />

      {pathModal && (
        <PathModal
          key={pathModal.plan?.id ?? 'create'}
          plan={pathModal.mode === 'edit' ? pathModal.plan : null}
          defaultName={`Plan ${plans.length + 1}`}
          options={planner.editorOptions}
          canDelete={plans.length > 1}
          canDuplicate={plans.length < MAX_PLANS}
          onSave={(settings) =>
            pathModal.mode === 'create'
              ? planner.createPlanWith(settings)
              : planner.updatePlan({ planId: pathModal.plan.id, ...settings })
          }
          onDelete={planner.deletePlan}
          onDuplicate={planner.copyPlan}
          onClose={() => setPathModal(null)}
        />
      )}

      {importOpen && (
        <ImportTranscriptModal
          schedule={schedule}
          planName={activePlan?.name}
          onImport={planner.importCourses}
          onClose={() => setImportOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          profile={profile}
          onSaved={(next) => {
            planner.setProfile(next);
            planner.reloadPlan();
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
