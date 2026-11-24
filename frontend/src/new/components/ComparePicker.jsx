import React from 'react';
import Icon from './Icon';
import { compareOptions } from '../helpers/compare';

/**
 * "Compare with…" control next to the plan tabs. Only offers plans other than the active one,
 * so the same plan can never be on both sides. Choosing or clearing a plan only reads data.
 */
export default function ComparePicker({ plans, activePlanId, comparePlanId, onChange }) {
  const options = compareOptions(plans, activePlanId);
  const comparing = comparePlanId != null;

  if (!comparing) {
    const disabled = options.length === 0;
    return (
      <button
        type="button"
        className="tp-compare-btn dont-print"
        disabled={disabled}
        title={disabled ? 'Create a second plan to compare plans side by side' : 'Compare two plans side by side'}
        onClick={() => onChange(options[0].id)}
      >
        <Icon name="columns" size={16} /> Compare
      </button>
    );
  }

  return (
    <div className="tp-compare-picker dont-print">
      <label>
        <Icon name="columns" size={16} />
        <span>Compare with</span>
        <select
          className="tp-select"
          value={comparePlanId}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Plan to compare with"
        >
          {options.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="tp-icon-btn" aria-label="Close compare" title="Close compare" onClick={() => onChange(null)}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
