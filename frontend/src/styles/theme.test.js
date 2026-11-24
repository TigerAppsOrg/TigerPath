import { describe, expect, it } from 'vitest';
import { TIGERPATH_THEME_OPTIONS, getTigerPathThemeVariables } from './theme';

const THEMES = Object.keys(TIGERPATH_THEME_OPTIONS);

function luminance(hex) {
  const channels = hex
    .replace('#', '')
    .match(/../g)
    .map((h) => parseInt(h, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text token -> every background stop it is drawn on in the new planner (styles in src/new/styles.css).
const TEXT_ON_GRADIENT = {
  courseCardText: [
    'courseCardFillStart',
    'courseCardFillEnd',
    'courseCardHoverFillStart',
    'courseCardHoverFillEnd',
    'searchCardFillStart',
    'searchCardFillEnd',
    'searchCodeFillStart',
    'searchCodeFillEnd',
  ],
  reqChipText: ['reqChipFillStart', 'reqChipFillEnd'],
};

describe('new planner theme tokens', () => {
  it.each(THEMES)('%s: text on every gradient stop meets WCAG AA (4.5:1)', (name) => {
    const theme = TIGERPATH_THEME_OPTIONS[name];
    Object.entries(TEXT_ON_GRADIENT).forEach(([text, backgrounds]) => {
      backgrounds.forEach((bg) => {
        expect(contrast(theme[text], theme[bg]), `${text} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it.each(THEMES)('%s: emits every variable with a defined value', (name) => {
    const variables = getTigerPathThemeVariables(name);
    Object.entries(variables).forEach(([cssName, value]) => {
      expect(value, cssName).toBeTruthy();
    });
    expect(variables['--tp-course-card-fill-start']).toBe(TIGERPATH_THEME_OPTIONS[name].courseCardFillStart);
    expect(variables['--tp-req-panel-fill']).toBe(TIGERPATH_THEME_OPTIONS[name].reqPanelFill);
    expect(variables['--tp-incomplete']).toBe('#e5372c');
  });
});

describe('classic UI variables', () => {
  // The classic UI (styles/Courses.css, styles/Requirements.css, components/PlanHeader.jsx) reads
  // these. TIG-330 requires it to stay visually unchanged, so pin the purple values.
  it('keeps the classic purple values', () => {
    expect(getTigerPathThemeVariables('purple')).toMatchObject({
      '--tp-course-text': '#5a23a4',
      '--tp-course-fill': '#ddd6ff',
      '--tp-course-border': '#c8bbff',
      '--tp-search-fill-start': '#ead8ff',
      '--tp-search-fill-end': '#ded3ff',
      '--tp-search-pill-fill': 'rgba(188, 137, 237, 0.45)',
      '--tp-search-text': '#5922a5',
      '--tp-active-plan-fill': '#ddd6ff',
      '--tp-active-plan-border': '#b99df7',
      '--tp-requirement-fill-start': '#dff6b4',
      '--tp-requirement-fill-end': '#e1ff9a',
      '--tp-requirement-text': '#0da745',
      '--tp-accent': '#4a1f87',
    });
  });
});
