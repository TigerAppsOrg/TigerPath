// Pure requirement helpers, ported unchanged in behavior from the classic
// components/Requirements.jsx so both UIs interpret the verifier output the same way.

const COS_REFERENCE_URLS = [
  'https://ua.princeton.edu/fields-study/departmental-majors-degree-bachelor-arts/computer-science',
  'https://www.cs.princeton.edu/',
];

export const LINK_LABELS = {
  major: ['Major Offerings', 'Department Site'],
  minor: ['Program Overview'],
  degree: ['Program Overview', 'General Education Requirements'],
};

export const UNSUPPORTED_MAJOR_FORM_URL = 'https://goo.gl/forms/pKxjmubIOSCOeR8L2';

/** Verifier results are [satisfied, courses, tree] tuples, or a plain string for unsupported majors. */
const unwrap = (item) => (Array.isArray(item) ? item[2] : item);

/** Grouped API response -> {majors, minors} of requirement trees. */
export const unwrapGroupedRequirements = (data) => ({
  majors: (data?.majors || []).map(unwrap),
  minors: (data?.minors || []).map(unwrap),
});

export function getRequirementKind(req) {
  const path = String(req?.path_to || '');
  if (path.startsWith('Major//')) return 'major';
  if (path.startsWith('Minor//')) return 'minor';
  if (path.startsWith('Degree//')) return 'degree';
  if (req?.degree) return 'major';
  return 'degree';
}

export function majorLabel(req) {
  if (!req) return 'Major';
  if (typeof req === 'string') return req.split(/[\s(]/)[0];
  if (req.code) return req.code.split('-')[0];
  const m = (req.name || '').match(/\(([A-Z]{2,6})[-\s)]/);
  if (m) return m[1];
  return (req.name || 'Major').split(' ')[0];
}

const STOPWORDS = new Set(['and', 'the', 'of', 'for', 'in', 'a', 'an', 'at', 'to']);

export function minorLabel(req) {
  if (!req) return 'Minor';
  if (typeof req === 'object' && req.code) return req.code.replace(/-.*/, '');
  const name = typeof req === 'object' ? req.name || '' : String(req);
  const words = name
    .replace(/\s*minor\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w.toLowerCase()));
  return words.map((w) => w[0].toUpperCase()).join('') || 'Minor';
}

function orderReferenceUrls(urls) {
  if (!Array.isArray(urls) || urls.length < 2) return urls;
  const ua = urls.find((u) => /ua\.princeton\.edu/i.test(String(u)));
  const other = urls.find((u) => !/ua\.princeton\.edu/i.test(String(u)));
  return ua && other ? [ua, other] : urls;
}

/** Contacts + reference links shown in a program's info popover, or null if there are none. */
export function programInfo(req) {
  if (!req || typeof req !== 'object') return null;
  const kind = getRequirementKind(req);
  const contacts = Array.isArray(req.contacts) ? req.contacts : [];
  let urls = orderReferenceUrls((req.urls || []).filter(Boolean)) || [];
  if (kind === 'major' && urls.length < 2) {
    const code = String(req.code || '').toUpperCase();
    if (code === 'COS-AB' || code === 'COS-BSE') urls = COS_REFERENCE_URLS.slice();
  }
  if (contacts.length === 0 && !urls[0] && !urls[1]) return null;
  return { kind, contacts, urls };
}

export function shortenContactRole(role) {
  if (!role) return '';
  return role
    .replace(/Director of Undergraduate Studies for (Majors?)/i, 'DUS ($1)')
    .replace(/Director of Undergraduate Studies for .*/i, 'DUS (pre-majors & abroad)')
    .replace(/Undergraduate Studies Program Manager/i, 'Program Manager');
}

export const isLeaf = (req) => !('req_list' in req);

export function requirementStatus(req) {
  const min = req.min_needed;
  const count = req.count;
  if (count === 0 && min === 0) return 'neutral';
  if ((min === 0 && count >= 0) || (min > 0 && count >= min)) return 'done';
  return 'incomplete';
}

export const isOrGroup = (req) =>
  !isLeaf(req) && req.min_needed === 1 && req.req_list.length > 1;

/** A finished "any 1" group only shows the branches that satisfied it. */
export function visibleChildren(req) {
  if (isOrGroup(req) && requirementStatus(req) === 'done') {
    const satisfied = req.req_list.filter((r) => r.count >= r.min_needed);
    if (satisfied.length > 0) return satisfied;
  }
  return req.req_list;
}

export function settledItems(req) {
  if (Array.isArray(req?.settled_details)) return req.settled_details;
  return (req?.settled || []).map((name) => ({ name, external: false }));
}

export const parentPath = (path) => {
  const parts = String(path || '').split('//');
  return parts.length <= 1 ? String(path || '') : parts.slice(0, -1).join('//');
};

export function normalizeCourseName(courseName) {
  const name = typeof courseName === 'object' && courseName !== null ? courseName.name : courseName;
  return String(name || '')
    .split('/')
    .map((part) => part.replace(/\s+/g, '').toUpperCase())
    .filter(Boolean)
    .sort()
    .join('/');
}

/** Assign an ambiguous course to this leaf, replacing any sibling assignment. */
export function settleCourse(schedule, courseName, pathTo) {
  const target = normalizeCourseName(courseName);
  const targetParent = parentPath(pathTo);
  let done = false;
  return schedule.map((semester) =>
    semester.map((course) => {
      if (done || course.external || normalizeCourseName(course.name) !== target) return course;
      done = true;
      const settled = (course.settled || []).filter((p) => parentPath(p) !== targetParent);
      return { ...course, settled: [...settled, pathTo] };
    })
  );
}

export function remainingSlots(req, schedule) {
  const min = Number(req?.min_needed || 0);
  if (min <= 0) return 0;
  const rendered = settledItems(req).filter((c) => c?.external).length;
  const scheduled = (schedule || [])
    .flat()
    .filter((c) => c?.external && Array.isArray(c.settled) && c.settled.includes(req.path_to)).length;
  const pending = Math.max(0, scheduled - rendered);
  return Math.max(0, min - (Number(req?.count || 0) + pending));
}
