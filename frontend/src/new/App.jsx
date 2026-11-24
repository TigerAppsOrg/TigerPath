import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { applyTigerPathTheme, getStoredTigerPathTheme } from 'styles/theme';
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
import ComparePicker from './components/ComparePicker';
import CompareSummary from './components/CompareSummary';
import ImportTranscriptModal from './components/ImportTranscriptModal';
import CompareByYear from './components/CompareByYear';
import './styles.css';

const semesterIndexOf = (droppableId) => parseInt(droppableId.replace('sem', ''), 10);

export default function App() {
  const planner = usePlanner();
  const { profile, plans, activePlan, schedule, requirements, comparePlan } = planner;
  const comparing = Boolean(comparePlan);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [draggingSeason, setDraggingSeason] = useState(null);
  const [pathModal, setPathModal] = useState(null); // {mode: 'create'|'edit', plan}
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [creditPath, setCreditPath] = useState(null);
  // Below 1100px compare mode shows one board at a time; this picks which.
  const [compareView, setCompareView] = useState('active');
  // 'year': semesters lined up across both plans (default); 'boards': two four-year boards.
  const [compareLayout, setCompareLayout] = useState('year');

  // main.jsx already applied the last-used theme before the first paint. Only apply (and remember)
  // a theme once the profile says which one, so there is no flash to purple while it loads and a
  // failed profile request never overwrites the remembered theme.
  const profileTheme = profile?.theme || null;
  const themeName = profileTheme || getStoredTigerPathTheme();
  useEffect(() => {
    if (profileTheme) applyTigerPathTheme(profileTheme);
  }, [profileTheme]);

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

  const centerTop = (
    <div className="tp-center-top">
      <PlanTabs
        plans={plans}
        activePlanId={activePlan?.id}
        onSelect={planner.selectPlan}
        onEdit={(plan) => setPathModal({ mode: 'edit', plan })}
        onCreate={() => setPathModal({ mode: 'create' })}
      />
      <ComparePicker
        plans={plans}
        activePlanId={activePlan?.id}
        comparePlanId={comparePlan?.id ?? null}
        onChange={(id) => {
          setCompareView('active');
          planner.setComparePlanId(id);
        }}
      />
      <span className="tp-save-state dont-print" aria-live="polite">
        {planner.saving ? 'Saving…' : ''}
      </span>
    </div>
  );

  const activeBoard = schedule ? (
    <Board
      schedule={schedule}
      classYear={profile?.classYear}
      draggingSeason={draggingSeason}
      onRemove={planner.removeCourse}
    />
  ) : (
    <p className="tp-empty">Loading your plan...</p>
  );

  return (
    <div className="tp-app" data-theme={themeName}>
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onImportTranscript={() => setImportOpen(true)}
        onSwitchToClassic={switchToClassic}
        onStartTutorial={() => {
          // The tour points at the search pane and requirements panel, which compare mode hides.
          if (!comparing) return startTutorial();
          planner.setComparePlanId(null);
          return requestAnimationFrame(() => requestAnimationFrame(startTutorial));
        }}
      />

      <div className="print-only tp-print-header">
        <h1>My Four Year Schedule{activePlan ? `: ${activePlan.name}` : ''}</h1>
        <p>
          This schedule was created using <b>TigerPath - Princeton&apos;s Four-Year Course Planner</b> at{' '}
          <a href="https://path.tigerapps.org/">path.tigerapps.org</a>.
        </p>
      </div>

      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {comparing ? (
          <main className="tp-main comparing">
            <div className="tp-compare" data-show={compareView}>
              {centerTop}
              {planner.notice && (
                <div className={`tp-notice ${planner.notice.tone}`} role="status">
                  {planner.notice.text}
                </div>
              )}
              <div className="tp-compare-controls dont-print">
              <div className="tp-compare-layout" role="tablist" aria-label="Compare layout">
                <button
                  type="button"
                  role="tab"
                  aria-selected={compareLayout === 'year'}
                  className={compareLayout === 'year' ? 'active' : ''}
                  onClick={() => setCompareLayout('year')}
                >
                  By year
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={compareLayout === 'boards'}
                  className={compareLayout === 'boards' ? 'active' : ''}
                  onClick={() => setCompareLayout('boards')}
                >
                  Boards
                </button>
              </div>
              <div className="tp-compare-toggle" role="tablist" aria-label="Plan shown">
                <button
                  type="button"
                  role="tab"
                  aria-selected={compareView === 'active'}
                  className={compareView === 'active' ? 'active' : ''}
                  onClick={() => setCompareView('active')}
                >
                  {activePlan?.name || 'Active plan'}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={compareView === 'compare'}
                  className={compareView === 'compare' ? 'active' : ''}
                  onClick={() => setCompareView('compare')}
                >
                  {comparePlan.name}
                </button>
              </div>
              </div>
              {planner.compareError ? (
                <div className="tp-notice error tp-compare-error" role="alert">
                  <p>Couldn&apos;t load {comparePlan.name} to compare. Your own plan is unaffected.</p>
                  <div className="tp-confirm-actions">
                    <button type="button" className="tp-btn tp-btn-save tp-btn-sm" onClick={planner.retryCompare}>
                      Try again
                    </button>
                    <button
                      type="button"
                      className="tp-btn tp-btn-neutral tp-btn-sm"
                      onClick={() => planner.setComparePlanId(null)}
                    >
                      Close compare
                    </button>
                  </div>
                </div>
              ) : compareLayout === 'year' ? (
                <>
                  <div className="dont-print tp-byyear-wrap">
                    <CompareByYear
                      activePlan={activePlan}
                      comparePlan={comparePlan}
                      schedule={schedule}
                      compareSchedule={planner.compareSchedule}
                      requirements={requirements}
                      compareRequirements={planner.compareRequirements}
                      draggingSeason={draggingSeason}
                      onRemove={planner.removeCourse}
                    />
                  </div>
                  {/* Printing while comparing prints the active plan as a normal board. */}
                  <div className="print-only">
                    {schedule && <Board readOnly schedule={schedule} classYear={profile?.classYear} />}
                  </div>
                </>
              ) : (
              <div className="tp-compare-sides">
                <section className="tp-compare-side active-side" aria-label={`${activePlan?.name || 'Active plan'} (editable)`}>
                  <header className="tp-compare-head">
                    <h2>{activePlan?.name || 'Active plan'}</h2>
                    <span className="tp-compare-tag editable">Editing</span>
                  </header>
                  <div className="dont-print">
                    <CompareSummary requirements={requirements} />
                  </div>
                  {activeBoard}
                </section>
                <section className="tp-compare-side compare-side dont-print" aria-label={`${comparePlan.name} (read-only)`}>
                  <header className="tp-compare-head">
                    <h2>{comparePlan.name}</h2>
                    <span className="tp-compare-tag">Read-only</span>
                  </header>
                  <CompareSummary requirements={planner.compareRequirements} />
                  {planner.compareSchedule ? (
                    <Board
                      readOnly
                      schedule={planner.compareSchedule}
                      classYear={profile?.classYear}
                      label={`${comparePlan.name} four-year plan (read-only)`}
                    />
                  ) : (
                    <p className="tp-empty">Loading {comparePlan.name}...</p>
                  )}
                </section>
              </div>
              )}
            </div>
          </main>
        ) : (
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
            {centerTop}
            {planner.notice && (
              <div className={`tp-notice ${planner.notice.tone}`} role="status">
                {planner.notice.text}
              </div>
            )}
            {activeBoard}
          </div>

          <RequirementsPanel
            requirements={requirements}
            activePlan={activePlan}
            ctx={requirementCtx}
            onEditPlan={() => activePlan && setPathModal({ mode: 'edit', plan: activePlan })}
          />
        </main>
        )}
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
          plans={plans}
          activePlanId={activePlan?.id}
          readPlanSchedule={planner.readPlanSchedule}
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
