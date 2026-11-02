import React, { useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';

const MAX_NAME_LENGTH = 80;

/**
 * Searchable multi-select with removable chips. `options` are {value, label, search};
 * with `primaryLabel`, the first chip is marked primary and others can be promoted.
 */
function MultiPicker({ label, options, selected, onChange, max, emptyText, searchPlaceholder, primaryLabel }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const filterRef = useRef(null);

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const atMax = max != null && selected.length >= max;
  const q = filter.trim().toLowerCase();
  const matches = options.filter((o) => !q || o.search.toLowerCase().includes(q));

  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else if (!atMax) onChange([...selected, value]);
  };
  const makePrimary = (value) => onChange([value, ...selected.filter((v) => v !== value)]);

  return (
    <div className="tp-minor-picker">
      <div
        className="tp-select tp-chip-box"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`Choose ${label}`}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => filterRef.current?.focus(), 0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        {selected.length === 0 && <span className="tp-muted">{emptyText}</span>}
        {selected.map((value, i) => {
          const name = byValue.get(value)?.label || value;
          const isPrimary = primaryLabel && i === 0 && selected.length > 1;
          return (
            <span key={value} className={`tp-chip ${isPrimary ? 'primary' : ''}`}>
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(value);
                }}
              >
                <Icon name="x" size={12} />
              </button>
              {name}
              {isPrimary && <span className="tp-chip-tag">{primaryLabel}</span>}
              {primaryLabel && i > 0 && (
                <button
                  type="button"
                  className="tp-chip-promote"
                  onClick={(e) => {
                    e.stopPropagation();
                    makePrimary(value);
                  }}
                >
                  Make {primaryLabel.toLowerCase()}
                </button>
              )}
            </span>
          );
        })}
        <Icon name="chevronDown" size={16} className="tp-muted tp-push-right" />
      </div>
      {open && (
        <div className="tp-dropdown">
          <input
            ref={filterRef}
            type="text"
            placeholder={searchPlaceholder}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={searchPlaceholder}
          />
          {atMax && <p className="tp-dropdown-note">You can choose up to {max}. Remove one to add another.</p>}
          <ul role="listbox" aria-multiselectable="true">
            {matches.length === 0 && <li className="tp-muted">No matches found.</li>}
            {matches.map((o) => {
              const isSelected = selected.includes(o.value);
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={!isSelected && atMax}
                  className={`${isSelected ? 'selected' : ''} ${!isSelected && atMax ? 'disabled' : ''}`}
                  onClick={() => toggle(o.value)}
                >
                  {o.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Create New Path / edit path dialog from the Figma. `plan` null means create mode.
 * `onSave` receives {name, majorIds, minorCodes}; the first major is the primary.
 */
export default function PathModal({
  plan,
  defaultName,
  options,
  canDelete,
  canDuplicate,
  onSave,
  onDelete,
  onDuplicate,
  onClose,
}) {
  const isCreate = !plan;
  const [name, setName] = useState(plan?.name ?? defaultName);
  const [majorIds, setMajorIds] = useState(plan?.majorIds ?? (plan?.majorId ? [plan.majorId] : []));
  const [minorCodes, setMinorCodes] = useState(plan?.minorCodes ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const nameRef = useRef(null);

  const majorOptions = useMemo(
    () =>
      options.majorOptions.map((m) => ({
        value: m.id,
        label: `${m.name} (${m.degree})`,
        search: `${m.name} ${m.code} ${m.degree}`,
      })),
    [options.majorOptions]
  );
  const minorOptions = useMemo(
    () => options.minorOptions.map((m) => ({ value: m.code, label: m.name, search: `${m.name} ${m.code}` })),
    [options.minorOptions]
  );

  const run = async (action, failure) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onClose();
    } catch {
      setError(failure);
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give this path a title.');
      nameRef.current?.focus();
      return;
    }
    run(
      () => onSave({ name: trimmed, majorIds, minorCodes }),
      isCreate ? 'Unable to create this path.' : 'Unable to save this path.'
    );
  };

  if (confirmingDelete) {
    return (
      <Modal label="Delete path" onClose={() => setConfirmingDelete(false)} className="tp-confirm">
        <p>
          Are you sure you want to delete <strong>{plan.name}</strong>? This cannot be undone.
        </p>
        {error && <p className="tp-form-error">{error}</p>}
        <div className="tp-confirm-actions">
          <button
            type="button"
            className="tp-btn tp-btn-danger"
            disabled={busy}
            onClick={() => run(() => onDelete(plan.id), 'Unable to delete this path.')}
          >
            Yes, delete <Icon name="check" size={16} />
          </button>
          <button type="button" className="tp-btn tp-btn-neutral" onClick={() => setConfirmingDelete(false)}>
            No <Icon name="ban" size={16} />
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal label={isCreate ? 'Create new path' : 'Edit path'} onClose={onClose} className="tp-path-modal">
      <form onSubmit={submit} className="tp-path-form">
        <div className="tp-path-fields">
          {isCreate && <h2 className="tp-path-heading">Create New Path</h2>}
          <div className="tp-path-title-row">
            <input
              ref={nameRef}
              className="tp-path-title"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Path Title"
              aria-label="Path title"
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              className="tp-icon-btn"
              aria-label="Edit title"
              onClick={() => nameRef.current?.focus()}
            >
              <Icon name="pencil" size={18} />
            </button>
          </div>

          <div className="tp-path-row">
            <span>{majorIds.length > 1 ? 'Majors' : 'Major'}</span>
            <MultiPicker
              label="majors"
              options={majorOptions}
              selected={majorIds}
              onChange={setMajorIds}
              max={options.maxMajors}
              emptyText="No major selected"
              searchPlaceholder="Search majors..."
              primaryLabel="Primary"
            />
          </div>

          <div className="tp-path-row">
            <span>Minors</span>
            <MultiPicker
              label="minors"
              options={minorOptions}
              selected={minorCodes}
              onChange={setMinorCodes}
              emptyText="No minors selected"
              searchPlaceholder="Search minors..."
            />
          </div>

          {error && (
            <p className="tp-form-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="tp-path-actions">
          <button type="submit" className="tp-btn tp-btn-save" disabled={busy}>
            {isCreate ? 'Create' : 'Save'} <Icon name="check" size={16} />
          </button>
          <button type="button" className="tp-btn tp-btn-neutral" onClick={onClose}>
            Cancel <Icon name="ban" size={16} />
          </button>
          {!isCreate && (
            <>
              <button
                type="button"
                className="tp-btn tp-btn-danger"
                disabled={busy || !canDelete}
                title={canDelete ? undefined : 'At least one plan is required.'}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete <Icon name="trash" size={16} />
              </button>
              <button
                type="button"
                className="tp-btn tp-btn-copy"
                disabled={busy || !canDuplicate}
                title={canDuplicate ? undefined : 'You have reached the maximum number of plans.'}
                onClick={() =>
                  run(() => onDuplicate(plan.id, `${name.trim() || plan.name} Copy`), 'Unable to duplicate this path.')
                }
              >
                Duplicate <Icon name="copy" size={16} />
              </button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
