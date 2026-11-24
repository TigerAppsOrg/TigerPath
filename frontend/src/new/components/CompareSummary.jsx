import React from 'react';
import { planSummaries } from '../helpers/compare';

/**
 * Compact per-program progress for one side of compare mode. Two full RequirementsPanels do not fit
 * beside two boards, so each side gets one row per major/minor with its top-level requirements.
 */
export default function CompareSummary({ requirements }) {
  if (!requirements) return <p className="tp-empty">Loading requirements...</p>;
  const summaries = planSummaries(requirements);
  if (summaries.length === 0) {
    return <p className="tp-empty">No major or minors on this plan yet.</p>;
  }
  return (
    <ul className="tp-compare-summary" aria-label="Requirement progress">
      {summaries.map((s, i) => (
        <li key={`${s.label}-${i}`} className="tp-compare-program">
          <div className="tp-compare-program-head" title={s.name}>
            <strong>{s.label}</strong>
            {s.unsupported ? (
              <span className="tp-compare-unsupported">not supported yet</span>
            ) : (
              <span className={`tp-req-count ${s.done < s.total ? 'incomplete' : ''}`}>
                <span className="current">{s.done}</span>/{s.total} complete
              </span>
            )}
          </div>
          {!s.unsupported && s.items.length > 0 && (
            <ul className="tp-compare-reqs">
              {s.items.map((item, j) => (
                <li key={`${item.name}-${j}`} className={`tp-compare-req ${item.status}`}>
                  <span className="tp-compare-req-name">{item.name}</span>
                  {item.min > 0 && (
                    <span className="tp-compare-req-count">
                      {item.count}/{item.min}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
