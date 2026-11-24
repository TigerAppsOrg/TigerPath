import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { importTranscript } from '../api';
import { buildImportRows } from '../helpers/transcript';

const STATUS_LABEL = { taken: 'Taken', current: 'Taking now', unclear: 'Check grade' };

/**
 * TIG-282: upload the TigerHub unofficial transcript PDF, review what was found, then add the chosen
 * courses to the active plan. Nothing is saved until "Add" (and then only through the normal save).
 */
export default function ImportTranscriptModal({ schedule, plans, activePlanId, onImport, onClose }) {
  const [file, setFile] = useState(null);
  const [targetPlanId, setTargetPlanId] = useState(activePlanId);
  const targetIsActive = targetPlanId === activePlanId;
  const targetName = (plans || []).find((p) => p.id === targetPlanId)?.name || 'this plan';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  // Rows the student flipped from their default (most start checked; "Check grade" rows start unchecked).
  const [toggled, setToggled] = useState(() => new Set());

  // Duplicates are checked against the target plan: here for the active plan (its schedule is loaded),
  // or when the rows are added for any other plan.
  const rows = useMemo(
    () => (payload ? buildImportRows(payload, targetIsActive ? schedule : null) : []),
    [payload, schedule, targetIsActive]
  );
  const isChosen = (r) => !r.reason && (r.defaultOff ? toggled.has(r.key) : !toggled.has(r.key));
  const chosen = rows.filter(isChosen);
  const unclearCount = rows.filter((r) => r.defaultOff && !r.reason).length;

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      setPayload(await importTranscript(file));
      setToggled(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Modal label="Import courses from your transcript" onClose={onClose} className="tp-import-modal">
      <h2 className="tp-path-heading">Import from transcript</h2>

      {!payload && (
        <form onSubmit={upload}>
          <p className="tp-import-help">
            Upload your <strong>unofficial transcript PDF</strong> from TigerHub. TigerPath reads the course codes and
            terms, then lets you choose which courses to add and which plan to add them to. The file isn&apos;t stored,
            and grades aren&apos;t kept.
          </p>
          <label className="tp-import-file">
            <Icon name="upload" size={18} />
            <span>{file ? file.name : 'Choose transcript PDF'}</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError('');
              }}
            />
          </label>
          {error && (
            <p className="tp-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="tp-confirm-actions">
            <button type="submit" className="tp-btn tp-btn-save" disabled={!file || busy}>
              {busy ? 'Reading…' : 'Read transcript'} <Icon name={busy ? 'loader' : 'check'} size={16} className={busy ? 'tp-spin' : ''} />
            </button>
            <button type="button" className="tp-btn tp-btn-neutral" onClick={onClose}>
              Cancel <Icon name="ban" size={16} />
            </button>
          </div>
        </form>
      )}

      {payload && (
        <div>
          {rows.length === 0 ? (
            <p className="tp-import-help">
              No Princeton courses were found in that PDF. Make sure it&apos;s the unofficial transcript from TigerHub.
            </p>
          ) : (
            <>
              <p className="tp-import-help">
                Found {rows.length} course{rows.length === 1 ? '' : 's'}. Uncheck any you don&apos;t want to add.
                {payload.classYear ? (
                  <>
                    {' '}
                    Semesters are placed for the <strong>class of {payload.classYear}</strong> (change it in Settings if
                    that&apos;s wrong).
                  </>
                ) : null}
              </p>
              {(plans || []).length > 1 && (
                <label className="tp-import-target">
                  <span>Add to</span>
                  <select
                    className="tp-select"
                    value={targetPlanId ?? ''}
                    onChange={(e) => setTargetPlanId(Number(e.target.value))}
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                        {plan.id === activePlanId ? ' (current plan)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {unclearCount > 0 && (
                <p className="tp-import-note">
                  {unclearCount} course{unclearCount === 1 ? '' : 's'} marked <strong>Check grade</strong>: TigerPath
                  couldn&apos;t tell the grade apart from the title (for example a withdrawal, W). They aren&apos;t
                  selected; check the ones you took.
                </p>
              )}
              {!targetIsActive && (
                <p className="tp-import-note">
                  TigerPath will switch to <strong>{targetName}</strong> and add the courses there, skipping any
                  already in that plan.
                </p>
              )}
              <ul className="tp-import-list" aria-label="Courses found on your transcript">
                {rows.map((row) => (
                  <li key={row.key} className={`tp-import-row ${row.reason ? 'skipped' : ''}`}>
                    <label>
                      <input
                        type="checkbox"
                        checked={isChosen(row)}
                        disabled={Boolean(row.reason)}
                        onChange={() => toggle(row.key)}
                      />
                      <span className="tp-import-code">{row.code}</span>
                      <span className="tp-import-title">{row.title}</span>
                    </label>
                    <span className="tp-import-meta">
                      <span className={`tp-import-status ${row.status}`}>{STATUS_LABEL[row.status] || row.status}</span>
                      <span>{row.reason || row.semester}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {payload.unmatched?.length > 0 && (
            <p className="tp-import-unmatched">
              Not in the TigerPath catalog, so not added: {payload.unmatched.join(', ')}.
            </p>
          )}
          <div className="tp-confirm-actions">
            <button
              type="button"
              className="tp-btn tp-btn-save"
              disabled={chosen.length === 0}
              onClick={() => {
                onImport(chosen, targetPlanId);
                onClose();
              }}
            >
              Add {chosen.length} to {targetName} <Icon name="check" size={16} />
            </button>
            <button type="button" className="tp-btn tp-btn-neutral" onClick={onClose}>
              Cancel <Icon name="ban" size={16} />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
