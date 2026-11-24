const BASE_THEME = {
  darkGreyText: '#181818',
  lightGrey: '#d9d9d9',
  darkGrey: '#767676',
  greySemBody: '#f5f5f5',
  greenSemBody: '#eaffb8',
  redSemBody: '#ffe9e4',
  incompleteText: '#e5372c',
};

export const TIGERPATH_THEME_OPTIONS = {
  purple: {
    ...BASE_THEME,
    name: 'Purple',
    fallSemHeaderColor: '#b67be2',
    springSemHeaderColor: '#ddd6ff',
    ECHeaderColor: '#ec775f',
    courseText: '#5a23a4',
    courseFill: '#ddd6ff',
    courseBorder: '#c8bbff',
    searchFillStart: '#ead8ff',
    searchFillEnd: '#ded3ff',
    searchPillFill: 'rgba(188, 137, 237, 0.45)',
    searchText: '#5922a5',
    activePlanFill: '#ddd6ff',
    activePlanBorder: '#b99df7',
    requirementFillStart: '#dff6b4',
    requirementFillEnd: '#e1ff9a',
    requirementText: '#0da745',
    accent: '#4a1f87',
    // New planner (src/new) only. The classic UI keeps reading the keys above.
    courseCardFillStart: '#f1e9ff',
    courseCardFillEnd: '#e2deff',
    courseCardHoverFillStart: '#cfa2d8',
    courseCardHoverFillEnd: '#bc7aea',
    searchCardFillStart: '#f1e9ff',
    searchCardFillEnd: '#e3d4fe',
    searchCodeFillStart: '#cfa2d8',
    searchCodeFillEnd: '#c88bee',
    reqChipFillStart: '#daf6be',
    reqChipFillEnd: '#ecffb6',
    courseCardText: '#42116f',
    reqChipText: '#0b7a2c',
    planTabActiveFill: '#dcfdad',
    planTabsFill: '#e5e5e5',
    reqPanelFill: '#faf8ff',
  },
  orange: {
    ...BASE_THEME,
    name: 'Orange',
    fallSemHeaderColor: '#ffad7a',
    springSemHeaderColor: '#ffe7d6',
    ECHeaderColor: '#ef6c45',
    courseText: '#ef3f22',
    courseFill: '#ffe6da',
    courseBorder: '#ffc9b0',
    searchFillStart: '#ffd1bd',
    searchFillEnd: '#ffe0d2',
    searchPillFill: 'rgba(255, 151, 104, 0.36)',
    searchText: '#d9471c',
    activePlanFill: '#ffe6da',
    activePlanBorder: '#ffad7a',
    requirementFillStart: '#eaffb8',
    requirementFillEnd: '#e1ff9a',
    requirementText: '#289b2f',
    accent: '#c64019',
    // New planner (src/new) only. The classic UI keeps reading the keys above.
    courseCardFillStart: '#fff3ed',
    courseCardFillEnd: '#ffebe2',
    courseCardHoverFillStart: '#f0c1ab',
    courseCardHoverFillEnd: '#f7ae8c',
    searchCardFillStart: '#fff3ed',
    searchCardFillEnd: '#ffe3d7',
    searchCodeFillStart: '#f0c1ab',
    searchCodeFillEnd: '#f8b596',
    reqChipFillStart: '#effaaa',
    reqChipFillEnd: '#e2f498',
    courseCardText: '#922310',
    reqChipText: '#597112',
    planTabActiveFill: '#ecf9a5',
    planTabsFill: '#eeeeee',
    reqPanelFill: '#ffffff',
  },
  blue: {
    ...BASE_THEME,
    name: 'Blue',
    fallSemHeaderColor: '#80d4de',
    springSemHeaderColor: '#dff7fb',
    ECHeaderColor: '#4cb7c3',
    courseText: '#0c8192',
    courseFill: '#dcf4f6',
    courseBorder: '#bee9ef',
    searchFillStart: '#c7eef5',
    searchFillEnd: '#dff6fb',
    searchPillFill: 'rgba(116, 205, 218, 0.34)',
    searchText: '#087789',
    activePlanFill: '#dcf4f6',
    activePlanBorder: '#80d4de',
    requirementFillStart: '#eaffb8',
    requirementFillEnd: '#e1ff9a',
    requirementText: '#17a244',
    accent: '#006f80',
    // New planner (src/new) only. The classic UI keeps reading the keys above.
    courseCardFillStart: '#edfeff',
    courseCardFillEnd: '#e2fdff',
    courseCardHoverFillStart: '#abe8f0',
    courseCardHoverFillEnd: '#8ceaf7',
    searchCardFillStart: '#edfcff',
    searchCardFillEnd: '#d7f9ff',
    searchCodeFillStart: '#abe8f0',
    searchCodeFillEnd: '#96ecf8',
    reqChipFillStart: '#daf6be',
    reqChipFillEnd: '#ecffb6',
    courseCardText: '#0b6875',
    reqChipText: '#0b7a2c',
    planTabActiveFill: '#dcfdad',
    planTabsFill: '#e5e5e5',
    reqPanelFill: '#f8feff',
  },
  pink: {
    ...BASE_THEME,
    name: 'Pink',
    fallSemHeaderColor: '#ff9fc7',
    springSemHeaderColor: '#ffe4ef',
    ECHeaderColor: '#f46196',
    courseText: '#f02372',
    courseFill: '#ffe3ef',
    courseBorder: '#ffc1da',
    searchFillStart: '#ffd2e5',
    searchFillEnd: '#ffe2ef',
    searchPillFill: 'rgba(255, 135, 186, 0.35)',
    searchText: '#d71b68',
    activePlanFill: '#ffe3ef',
    activePlanBorder: '#ff9fc7',
    requirementFillStart: '#eaffb8',
    requirementFillEnd: '#e1ff9a',
    requirementText: '#17a340',
    accent: '#b70f55',
    // New planner (src/new) only. The classic UI keeps reading the keys above.
    courseCardFillStart: '#fff2fa',
    courseCardFillEnd: '#ffe5e9',
    courseCardHoverFillStart: '#ffbed2',
    courseCardHoverFillEnd: '#ffa3d4',
    searchCardFillStart: '#fff2fa',
    searchCardFillEnd: '#ffdbe0',
    searchCodeFillStart: '#ffbed2',
    searchCodeFillEnd: '#ffa3d4',
    reqChipFillStart: '#effaaa',
    reqChipFillEnd: '#e2f498',
    courseCardText: '#970c48',
    reqChipText: '#597112',
    planTabActiveFill: '#ecf9a5',
    planTabsFill: '#eeeeee',
    reqPanelFill: '#ffffff',
  },
};

export const DEFAULT_TIGERPATH_THEME = 'purple';

export function getTigerPathTheme(themeName) {
  const normalizedThemeName = themeName === 'sunset' ? 'orange' : themeName;
  return TIGERPATH_THEME_OPTIONS[normalizedThemeName] || TIGERPATH_THEME_OPTIONS[DEFAULT_TIGERPATH_THEME];
}

// Shared with the classic UI (components/App.jsx); values here must not change without
// checking styles/Courses.css, styles/Requirements.css and components/PlanHeader.jsx.
const CLASSIC_VARIABLES = {
  '--tp-course-text': 'courseText',
  '--tp-course-fill': 'courseFill',
  '--tp-course-border': 'courseBorder',
  '--tp-search-fill-start': 'searchFillStart',
  '--tp-search-fill-end': 'searchFillEnd',
  '--tp-search-pill-fill': 'searchPillFill',
  '--tp-search-text': 'searchText',
  '--tp-active-plan-fill': 'activePlanFill',
  '--tp-active-plan-border': 'activePlanBorder',
  '--tp-requirement-fill-start': 'requirementFillStart',
  '--tp-requirement-fill-end': 'requirementFillEnd',
  '--tp-requirement-text': 'requirementText',
  '--tp-accent': 'accent',
};

// Theme-independent colors the new planner reads (previously redefined in new/styles.css :root).
const BASE_VARIABLES = {
  '--tp-text': 'darkGreyText',
  '--tp-border': 'lightGrey',
  '--tp-muted': 'darkGrey',
  '--tp-drop-ok': 'greenSemBody',
  '--tp-drop-warn': 'redSemBody',
  '--tp-incomplete': 'incompleteText',
};

// New planner gradient and surface tokens: <surface>FillStart -> --tp-<surface>-fill-start.
const NEW_PLANNER_KEYS = [
  'courseCardFillStart',
  'courseCardFillEnd',
  'courseCardHoverFillStart',
  'courseCardHoverFillEnd',
  'searchCardFillStart',
  'searchCardFillEnd',
  'searchCodeFillStart',
  'searchCodeFillEnd',
  'reqChipFillStart',
  'reqChipFillEnd',
  'courseCardText',
  'reqChipText',
  'planTabActiveFill',
  'planTabsFill',
  'reqPanelFill',
];

const toCssVariable = (key) => `--tp-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

export function getTigerPathThemeVariables(themeName) {
  const theme = getTigerPathTheme(themeName);
  const variables = {};
  Object.entries({ ...CLASSIC_VARIABLES, ...BASE_VARIABLES }).forEach(([cssName, key]) => {
    variables[cssName] = theme[key];
  });
  NEW_PLANNER_KEYS.forEach((key) => {
    variables[toCssVariable(key)] = theme[key];
  });
  return variables;
}

const THEME_STORAGE_KEY = 'tigerpath-theme';

/** Writes the theme's CSS variables onto <html> and remembers the choice for the next first paint. */
export function applyTigerPathTheme(themeName, root = document.documentElement) {
  Object.entries(getTigerPathThemeVariables(themeName)).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.tigerpathTheme = themeName;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeName);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this page.
  }
}

/** Last theme this browser used, so the first paint is themed before the profile request returns. */
export function getStoredTigerPathTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_TIGERPATH_THEME;
  } catch {
    return DEFAULT_TIGERPATH_THEME;
  }
}
