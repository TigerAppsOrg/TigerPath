import React, { useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { TIGERPATH_THEME_OPTIONS } from 'styles/theme';
import { classYearChoices } from '../helpers/schedule';
import { saveSettings } from '../api';

export default function SettingsModal({ profile, onSaved, onClose }) {
  const years = classYearChoices();
  const [year, setYear] = useState(profile?.classYear ?? years[0]);
  const [theme, setTheme] = useState(profile?.theme === 'sunset' ? 'orange' : profile?.theme || 'purple');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await saveSettings({ year, theme });
      onSaved({ ...profile, classYear: Number(year), theme });
      onClose();
    } catch {
      setError('Unable to save your settings. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Modal label="Settings" onClose={onClose} className="tp-settings-modal">
      <form onSubmit={submit}>
        <h2 className="tp-path-heading">Settings</h2>
        <label className="tp-path-row">
          <span>Class year</span>
          <select className="tp-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {!years.includes(Number(year)) && <option value={year}>{year}</option>}
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="tp-theme-picker">
          <legend>Theme</legend>
          {Object.entries(TIGERPATH_THEME_OPTIONS).map(([key, t]) => (
            <label key={key} className={`tp-theme-option ${theme === key ? 'selected' : ''}`}>
              <input type="radio" name="theme" value={key} checked={theme === key} onChange={() => setTheme(key)} />
              <span className="tp-swatches" aria-hidden>
                <i style={{ background: t.courseFill }} />
                <i style={{ background: t.fallSemHeaderColor }} />
                <i style={{ background: t.accent }} />
              </span>
              {t.name}
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="tp-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="tp-confirm-actions">
          <button type="submit" className="tp-btn tp-btn-save" disabled={busy}>
            Save preferences <Icon name="check" size={16} />
          </button>
          <button type="button" className="tp-btn tp-btn-neutral" onClick={onClose}>
            Cancel <Icon name="ban" size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
