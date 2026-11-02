import React, { useState } from 'react';
import Icon from './Icon';
import Popover from './Popover';
import {
  isLeaf,
  isOrGroup,
  remainingSlots,
  requirementStatus,
  settledItems,
  visibleChildren,
} from '../helpers/requirements';

function Count({ req }) {
  const status = requirementStatus(req);
  if (req.min_needed === 0) return <span className="tp-req-count">{req.count}</span>;
  return (
    <span className={`tp-req-count ${status === 'incomplete' ? 'incomplete' : ''}`}>
      <span className="current">{req.count}</span>/{req.min_needed}
      {isOrGroup(req) && status !== 'done' ? ' (any 1)' : ''}
    </span>
  );
}

function RequirementPopover({ req, anchor, slots, onClose, onFindCourses, onAddCredit }) {
  return (
    <Popover anchor={anchor} onClose={onClose} label={req.name} className="tp-req-popover">
      <h3>{req.name}</h3>
      <button
        type="button"
        className="tp-popover-action find"
        onClick={() => {
          onFindCourses(req.path_to);
          onClose();
        }}
      >
        <Icon name="search" size={15} /> Find satisfying courses
      </button>
      {isLeaf(req) && req.min_needed > 0 && slots > 0 && (
        <button
          type="button"
          className="tp-popover-action credit"
          onClick={() => {
            onAddCredit(req.path_to);
            onClose();
          }}
        >
          <Icon name="plusCircle" size={15} /> Add external credit
        </button>
      )}
      {req.explanation && (
        <div className="tp-req-explanation">
          {req.explanation.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </Popover>
  );
}

function ExternalCreditForm({ req, onAdd, onCancel }) {
  const [name, setName] = useState('');
  return (
    <form
      className="tp-credit-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onAdd(req.path_to, name.trim());
      }}
    >
      <input
        autoFocus
        value={name}
        placeholder="Credit name (e.g. AP Calculus BC)"
        aria-label={`External credit for ${req.name}`}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="tp-btn tp-btn-save tp-btn-sm" disabled={!name.trim()}>
        Add
      </button>
      <button type="button" className="tp-btn tp-btn-neutral tp-btn-sm" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

function LeafCourses({ req, ctx }) {
  return (
    <ul className="tp-req-courses">
      {settledItems(req).map((course, i) => {
        const name = typeof course === 'object' ? course.name : String(course);
        if (course?.external) {
          return (
            <li key={`s-${i}`} className="tp-req-chip settled external">
              <span>{name}</span>
              <span className="tp-badge">External credit</span>
              <button
                type="button"
                aria-label={`Remove external credit ${name}`}
                onClick={() => ctx.onRemoveCredit(course.id, req.path_to)}
              >
                <Icon name="x" size={13} />
              </button>
            </li>
          );
        }
        return (
          <li key={`s-${i}`} className="tp-req-chip settled" title="Counts toward this requirement">
            {name}
          </li>
        );
      })}
      {(req.unsettled || []).map((name, i) => (
        <li key={`u-${i}`}>
          <button
            type="button"
            className="tp-req-chip unsettled"
            title="This course could satisfy multiple requirements. Click to settle it here."
            onClick={() => ctx.onSettle(name, req.path_to)}
          >
            {name} <Icon name="alert" size={14} />
          </button>
        </li>
      ))}
      {ctx.creditPath === req.path_to && (
        <li>
          <ExternalCreditForm
            req={req}
            onAdd={(path, name) => {
              ctx.onAddCredit(path, name);
              ctx.setCreditPath(null);
            }}
            onCancel={() => ctx.setCreditPath(null)}
          />
        </li>
      )}
    </ul>
  );
}

function RequirementNode({ req, depth, ctx }) {
  const [open, setOpen] = useState(true);
  const [anchor, setAnchor] = useState(null);
  const status = requirementStatus(req);
  const leaf = isLeaf(req);
  const children = leaf ? null : visibleChildren(req);

  return (
    <li className={`tp-req ${status}`} style={{ '--depth': depth }}>
      <div className="tp-req-row">
        <button
          type="button"
          className="tp-req-toggle"
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${req.name}`}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} />
        </button>
        <button
          type="button"
          className={`tp-req-name ${anchor ? 'active' : ''}`}
          title={req.name}
          onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
          aria-haspopup="dialog"
        >
          {req.name}
        </button>
        <Count req={req} />
      </div>
      {anchor && (
        <RequirementPopover
          req={req}
          anchor={anchor}
          slots={leaf ? remainingSlots(req, ctx.schedule) : 0}
          onClose={() => setAnchor(null)}
          onFindCourses={ctx.onFindCourses}
          onAddCredit={ctx.setCreditPath}
        />
      )}
      {open &&
        (leaf ? (
          <LeafCourses req={req} ctx={ctx} />
        ) : (
          <ul className="tp-req-list">
            {children.map((child, i) => (
              <RequirementNode key={`${child.path_to || child.name}-${i}`} req={child} depth={depth + 1} ctx={ctx} />
            ))}
          </ul>
        ))}
    </li>
  );
}

/** Renders the children of a top-level program tree (the card tab already names the program). */
export default function RequirementTree({ tree, ctx }) {
  if (!tree?.req_list) return null;
  return (
    <ul className="tp-req-list tp-req-root">
      {tree.req_list.map((req, i) => (
        <RequirementNode key={`${req.path_to || req.name}-${i}`} req={req} depth={0} ctx={ctx} />
      ))}
    </ul>
  );
}
