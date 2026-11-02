import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import Popover from './Popover';
import RequirementTree from './RequirementTree';
import {
  LINK_LABELS,
  UNSUPPORTED_MAJOR_FORM_URL,
  majorLabel,
  minorLabel,
  programInfo,
  shortenContactRole,
} from '../helpers/requirements';

function InfoButton({ req }) {
  const [anchor, setAnchor] = useState(null);
  const info = programInfo(req);
  if (!info) return null;
  const labels = LINK_LABELS[info.kind];
  const isProgram = info.kind === 'major' || info.kind === 'minor';
  return (
    <>
      <button
        type="button"
        className="tp-icon-btn tp-card-info"
        aria-label="Program contacts and links"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
      >
        <Icon name="info" size={17} />
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} label="Program info" className="tp-info-popover">
          {info.contacts.length > 0 && (
            <section>
              <h4>Contacts</h4>
              {info.contacts.map((c, i) => (
                <div key={i} className="tp-contact">
                  {c.type && <span className="tp-muted">{shortenContactRole(c.type)}:</span>}
                  <div>{c.name}</div>
                  {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                </div>
              ))}
            </section>
          )}
          <section>
            <h4>Reference {labels.length === 1 ? 'link' : 'links'}</h4>
            {labels.map((label, i) =>
              info.urls[i] ? (
                <a key={label} href={info.urls[i]} target="_blank" rel="noopener noreferrer" className="tp-ref-link">
                  {label} <Icon name="external" size={13} />
                </a>
              ) : isProgram ? (
                <span key={label} className="tp-ref-link disabled">
                  {label}
                </span>
              ) : null
            )}
          </section>
        </Popover>
      )}
    </>
  );
}

export default function RequirementsPanel({ requirements, activePlan, ctx, onEditPlan }) {
  // Per the Figma, the top card is one tab per major (no degree or progress tabs).
  const [majorIndex, setMajorIndex] = useState(0);
  const [minorIndex, setMinorIndex] = useState(0);
  const majors = requirements?.majors || [];
  const minors = requirements?.minors || [];

  useEffect(() => setMajorIndex(0), [activePlan?.id]);
  useEffect(() => setMajorIndex((i) => Math.min(i, Math.max(0, majors.length - 1))), [majors.length]);
  useEffect(() => setMinorIndex((i) => Math.min(i, Math.max(0, minors.length - 1))), [minors.length]);

  if (!requirements) {
    return (
      <aside id="requirements" className="tp-reqs dont-print">
        <p className="tp-empty">Loading requirements...</p>
      </aside>
    );
  }

  const selectedMajor = majors[majorIndex] ?? null;
  const selectedMinor = minors[minorIndex] || null;

  return (
    <aside id="requirements" className="tp-reqs break dont-print" aria-label="Requirements">
      <div className="tp-card tp-card-major">
        <div className="tp-card-tabs" role="tablist">
          {majors.length === 0 && <span className="tp-card-tab active">Major</span>}
          {majors.map((major, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === majorIndex}
              className={`tp-card-tab ${i === majorIndex ? 'active' : ''}`}
              title={`${typeof major === 'object' ? major.name : major}${
                i === 0 && majors.length > 1 ? ' (primary)' : ''
              }`}
              onClick={() => setMajorIndex(i)}
            >
              {majorLabel(major)}
            </button>
          ))}
          <button
            type="button"
            className="tp-icon-btn"
            aria-label="Change majors and minors"
            title="Change majors and minors"
            onClick={onEditPlan}
          >
            <Icon name="pencil" size={15} />
          </button>
          <InfoButton req={selectedMajor} />
        </div>
        <div className="tp-card-body">
          {majors.length === 0 && (
            <div className="tp-card-empty">
              <p>Choose a major for this plan to see requirement progress.</p>
              <button type="button" className="tp-btn tp-btn-save" onClick={onEditPlan}>
                Choose a major
              </button>
            </div>
          )}
          {typeof selectedMajor === 'string' && (
            <div className="tp-card-empty">
              <p>
                The {selectedMajor} major is not supported yet. If you would like to request it, let us know{' '}
                <a href={UNSUPPORTED_MAJOR_FORM_URL} target="_blank" rel="noopener noreferrer">
                  here
                </a>
                .
              </p>
            </div>
          )}
          {selectedMajor && typeof selectedMajor === 'object' && (
            <RequirementTree tree={selectedMajor} ctx={ctx} />
          )}
        </div>
      </div>

      <div className={`tp-card tp-card-minors ${minors.length === 0 ? 'collapsed' : ''}`}>
        <div className="tp-card-tabs" role="tablist">
          {minors.map((minor, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === minorIndex}
              className={`tp-card-tab ${i === minorIndex ? 'active' : ''}`}
              title={typeof minor === 'object' ? minor.name : minor}
              onClick={() => setMinorIndex(i)}
            >
              {minorLabel(minor)}
            </button>
          ))}
          <button
            type="button"
            className="tp-card-tab tp-card-tab-add"
            aria-label="Add or remove minors"
            title="Add or remove minors"
            onClick={onEditPlan}
          >
            <Icon name="plus" size={15} />
            {minors.length === 0 && <span>Add a minor</span>}
          </button>
          {selectedMinor && <InfoButton req={selectedMinor} />}
        </div>
        {selectedMinor && typeof selectedMinor === 'object' && (
          <div className="tp-card-body">
            <RequirementTree tree={selectedMinor} ctx={ctx} />
          </div>
        )}
      </div>
    </aside>
  );
}
