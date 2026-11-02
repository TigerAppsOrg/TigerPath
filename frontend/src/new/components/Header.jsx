import React from 'react';
import Icon from './Icon';

const FEEDBACK_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdjBwHsURKujVqfnUk7nyocAMnFDFI6fyubDmqYMgLElpm_Nw/viewform';

export default function Header({ onOpenSettings, onSwitchToClassic, onStartTutorial }) {
  return (
    <header className="tp-header dont-print">
      <a className="tp-brand" href="/">
        <img src="/static/app/tigerpathlogo.png" alt="" width="35" height="39" />
        <span>TigerPath</span>
      </a>
      <nav className="tp-nav" aria-label="Main">
        <button type="button" className="tp-nav-btn" onClick={onSwitchToClassic}>
          <Icon name="history" size={17} />
          <span>Classic view</span>
        </button>
        <button type="button" className="tp-nav-btn" onClick={onStartTutorial}>
          <Icon name="info" size={17} />
          <span>Tutorial</span>
        </button>
        <button type="button" id="tp-settings-btn" className="tp-nav-btn" onClick={onOpenSettings}>
          <Icon name="settings" size={17} />
          <span>Settings</span>
        </button>
        <button type="button" className="tp-nav-btn" onClick={() => window.print()}>
          <Icon name="printer" size={17} />
          <span>Print</span>
        </button>
        <a className="tp-nav-btn" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
          <Icon name="message" size={17} />
          <span>Feedback</span>
        </a>
        <a className="tp-nav-btn" href="/logout">
          <Icon name="logout" size={17} />
          <span>Logout</span>
        </a>
      </nav>
    </header>
  );
}
