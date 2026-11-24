// Meeting demo backend: replaces window.fetch so the real new planner runs without Django.
// It keeps state in memory (reloading the page resets it), saves schedules per plan, works out
// requirement progress from the courses in each plan (simplified demo rules, not the real verifier),
// and sends transcript imports to the real parser through the demo server. Not part of any PR.
const params = new URLSearchParams(location.search);
const theme = params.get('theme') || 'purple';
// Class year decides which board semester a term lands in (imports). ?year=2030 sets it at load;
// saving Settings changes it, just as the real server stores it on the profile.
let classYear = Number(params.get('year')) || 2027;
window.__writes = [];

// ── Catalog ─────────────────────────────────────────────────────────────────
const CATALOG = {};
const add = (id, name, title, semester = 'both', dist = '', rating = 4.1) => {
  CATALOG[String(id)] = {
    id: String(id),
    name,
    title,
    semester,
    semester_list: semester === 'fall' ? ['f24', 'f25'] : semester === 'spring' ? ['s25', 's26'] : ['f25', 's26'],
    dist_area: dist,
    quality_rating: rating,
  };
};
[
  [1, 'ECO 100', 'Introduction to Microeconomics', 'both', 'SA', 4.1],
  [2, 'CHI 103', 'Intermediate Chinese I', 'fall', '', 4.4],
  [3, 'MAT 103', 'Calculus I', 'both', 'QCR', 3.9],
  [4, 'HIS 214', 'The Atlantic World', 'fall', 'HA', 4.3],
  [5, 'COS 126 / EGR 126', 'Computer Science: An Interdisciplinary Approach', 'both', 'QCR', 4.2],
  [6, 'CHI 108', 'Intensive Chinese', 'spring', '', 4.5],
  [7, 'ECO 210', 'Mathematics for Economists', 'both', 'QCR', 3.6],
  [8, 'WRI 159', 'Writing Seminar', 'both', '', 4.0],
  [9, 'ECO 101', 'Introduction to Macroeconomics', 'both', 'SA', 3.9],
  [10, 'ECO 202', 'Statistics and Data Analysis', 'both', 'QCR', 3.8],
  [11, 'COS 226', 'Algorithms and Data Structures', 'both', 'QCR', 4.3],
  [12, 'ANT 201', 'Introduction to Anthropology', 'fall', 'SA', 4.4],
  [13, 'VIS 214', 'Drawing I', 'both', 'LA', 4.6],
  [14, 'ECO 301', 'Macroeconomics', 'spring', 'SA', 3.7],
  [15, 'COS 217', 'Introduction to Programming Systems', 'both', 'SEN', 4.0],
  [16, 'SML 201', 'Introduction to Data Science', 'both', 'QCR', 4.1],
  [17, 'VIS 208', 'Sculpture', 'spring', 'LA', 4.5],
  [18, 'ECO 332 / GHP 332', 'Economics of Health', 'fall', 'SA', 4.2],
  [19, 'ECO 300', 'Microeconomic Theory', 'fall', 'SA', 3.6],
  [20, 'HUM 290 / REL 290', 'Religion and Society', 'fall', 'EM', 4.3],
  [21, 'SPI 305 / ECO 305', 'Public Finance', 'spring', 'SA', 4.0],
  [22, 'COS 333', 'Advanced Programming Techniques', 'spring', 'SEN', 4.2],
  [23, 'PSY 101', 'Introduction to Psychology', 'both', 'SEL', 4.1],
  [24, 'ECO 302', 'Macroeconomic Theory', 'fall', 'SA', 3.7],
  [25, 'ECE 206 / COS 306', 'Contemporary Logic Design', 'fall', 'SEN', 3.9],
  [26, 'ECO 984', 'Senior Thesis Workshop', 'spring', '', 4.0],
  [27, 'MUS 314 / COS 314', 'Computer and Electronic Music', 'spring', 'LA', 4.5],
  [102, 'POL 220', 'American Politics', 'fall', 'SA', 4.2],
  [104, 'SPI 200', 'Introduction to Public Policy', 'spring', 'SA', 4.0],
  [105, 'POL 230', 'Introduction to Political Theory', 'spring', 'EM', 4.3],
  [108, 'SOC 101', 'Introduction to Sociology', 'fall', 'SA', 4.2],
  [109, 'POL 351', 'Comparative Politics', 'spring', 'SA', 4.1],
  [111, 'POL 380', 'International Relations', 'fall', 'SA', 4.0],
  [113, 'SPI 331', 'Urban Policy', 'spring', 'SA', 4.2],
  [114, 'SPI 401', 'Policy Task Force', 'fall', 'SA', 4.4],
  [115, 'POL 495', 'Senior Thesis Research', 'spring', '', 4.1],
  ['eco310', 'ECO 310', 'Microeconomic Theory: A Mathematical Approach', 'fall', 'SA', 3.5],
  ['eco312', 'ECO 312', 'Econometrics: A Mathematical Approach', 'spring', 'QCR', 3.8],
  ['eco313', 'ECO 313', 'Econometric Applications', 'fall', 'QCR', 3.9],
  ['eco362', 'ECO 362', 'Financial Investments', 'spring', 'SA', 4.0],
  ['orf245', 'ORF 245', 'Fundamentals of Statistics', 'both', 'QCR', 3.8],
  ['spi300', 'SPI 300', 'Policy Analysis', 'fall', 'SA', 4.1],
  ['spi402', 'SPI 402', 'Policy Seminar', 'spring', 'SA', 4.3],
  ['mat175', 'MAT 175', 'Mathematics for Economics/Life Sciences', 'both', 'QCR', 3.7],
  ['mat202', 'MAT 202', 'Linear Algebra with Applications', 'both', 'QCR', 3.9],
  ['hin105', 'HIN 105', 'Intermediate Hindi I', 'fall', '', 4.6],
  ['wri140', 'WRI 140', 'Writing Seminar', 'both', '', 4.0],
].forEach((c) => add(...c));

const listings = (course) => String(course?.name || '').split('/').map((s) => s.trim());
const inSchedule = (id) => ({ ...CATALOG[String(id)], settled: [] });
const sched = (...semesters) => [...semesters.map((ids) => ids.map(inSchedule)), []];

// ── Programs (simplified demo rules) ────────────────────────────────────────
const leafDef = (name, min, accepts, explanation) => ({ name, min, accepts, explanation });
const PROGRAMS = {
  major: {
    1: { name: 'Economics', code: 'ECO', degree: 'AB', groups: [
      { name: 'Prerequisites', leaves: [
        leafDef('Intro Economics', 2, ['ECO 100', 'ECO 101'], 'Both introductory courses, ECO 100 and ECO 101.'),
        leafDef('Statistics', 1, ['ECO 202', 'SML 201', 'ORF 245'], 'One statistics course.'),
        leafDef('Mathematics', 1, ['MAT 103', 'MAT 175', 'ECO 210', 'MAT 202'], 'One calculus or mathematics course.'),
      ] },
      { name: 'Core', leaves: [
        leafDef('Microeconomics', 1, ['ECO 300', 'ECO 310'], 'ECO 300 or ECO 310.'),
        leafDef('Macroeconomics', 1, ['ECO 301', 'ECO 302'], 'ECO 301 or ECO 302.'),
        leafDef('Econometrics', 1, ['ECO 312', 'ECO 313'], 'ECO 312 or ECO 313.'),
      ] },
    ] },
    2: { name: 'School of Public and International Affairs', code: 'SPI', degree: 'AB', leaves: [
      leafDef('Prerequisites', 3, ['ECO 100', 'SPI 200', 'POL 220'], 'ECO 100, SPI 200 and POL 220.'),
      leafDef('Core Courses', 4, ['SPI 300', 'SPI 305', 'SPI 331', 'SPI 401'], 'Four SPI core courses.'),
      leafDef('Policy Seminar', 1, ['SPI 401', 'SPI 402'], 'One policy seminar or task force.'),
    ] },
    3: { name: 'Politics', code: 'POL', degree: 'AB', leaves: [
      leafDef('Introductory', 2, ['POL 220', 'POL 230'], 'Two introductory courses.'),
      leafDef('Subfields', 2, ['POL 351', 'POL 380', 'POL 495'], 'Courses in two subfields.'),
    ] },
  },
  unsupportedMajor: { 4: 'Computer Science', 5: 'Astrophysical Sciences' },
  minor: {
    COS: { name: 'Computer Science Minor', code: 'COS', leaves: [
      leafDef('Core', 3, ['COS 126', 'COS 226', 'COS 217'], 'COS 126, COS 226 and COS 217.'),
      leafDef('Electives', 2, ['COS 217', 'COS 306', 'COS 314', 'COS 333'], 'Two COS electives.'),
    ] },
    FIN: { name: 'Finance Minor', code: 'FIN', leaves: [
      leafDef('Core', 2, ['ECO 202', 'ECO 362', 'ORF 245'], 'Statistics plus one finance course.'),
    ] },
  },
};
const MAJOR_OPTIONS = [
  { id: 1, name: 'Economics', code: 'ECO', degree: 'AB' },
  { id: 2, name: 'Public and International Affairs', code: 'SPI', degree: 'AB' },
  { id: 3, name: 'Politics', code: 'POL', degree: 'AB' },
  { id: 4, name: 'Computer Science', code: 'COS', degree: 'BSE' },
  { id: 5, name: 'Astrophysical Sciences', code: 'AST', degree: 'AB' },
];
const MINOR_OPTIONS = [
  { code: 'COS', name: 'Computer Science' },
  { code: 'FIN', name: 'Finance' },
];

/** Requirement tree for one program from a plan's schedule: the shape the real API returns. */
function evaluate(def, kind, schedule) {
  const root = `${kind}//${def.code}`;
  const groups = def.groups || [{ name: null, leaves: def.leaves }];
  const leaves = [];
  groups.forEach((g) =>
    g.leaves.forEach((l) => {
      const path = g.name ? `${root}//${g.name}//${l.name}` : `${root}//${l.name}`;
      leaves.push({ ...l, path, settled: [], details: [], unsettled: [] });
    })
  );
  (schedule || []).forEach((semester) =>
    (semester || []).forEach((course) => {
      if (course.external) {
        const leaf = leaves.find((l) => (course.settled || []).includes(l.path));
        if (leaf) {
          leaf.settled.push(course.name);
          leaf.details.push({ name: course.name, external: true, id: course.id });
        }
        return;
      }
      const codes = listings(course);
      const matches = leaves.filter((l) => l.accepts.some((code) => codes.includes(code)));
      const chosen = matches.find((l) => (course.settled || []).includes(l.path)) || (matches.length === 1 ? matches[0] : null);
      if (chosen) {
        chosen.settled.push(course.name);
        chosen.details.push({ name: course.name, external: false });
      } else if (matches.length > 1) {
        matches.forEach((l) => l.unsettled.push(course.name));
      }
    })
  );
  const leafNode = (l) => ({
    name: l.name,
    path_to: l.path,
    min_needed: l.min,
    count: Math.min(l.settled.length, l.min),
    settled: l.settled,
    settled_details: l.details,
    unsettled: l.unsettled,
    explanation: l.explanation,
  });
  const done = (n) => n.count >= n.min_needed;
  const children = def.groups
    ? groups.map((g) => {
        const req_list = leaves.filter((l) => l.path.startsWith(`${root}//${g.name}//`)).map(leafNode);
        return { name: g.name, path_to: `${root}//${g.name}`, min_needed: req_list.length, count: req_list.filter(done).length, req_list };
      })
    : leaves.map(leafNode);
  const tree = {
    name: def.name,
    code: def.code,
    degree: def.degree,
    path_to: root,
    min_needed: children.length,
    count: children.filter(done).length,
    urls: [],
    contacts: [],
    req_list: children,
  };
  return [done(tree), [], tree];
}

function requirementsFor(plan) {
  const majors = (plan.majorIds || []).map((id) =>
    PROGRAMS.major[id] ? evaluate(PROGRAMS.major[id], 'Major', plan.schedule) : PROGRAMS.unsupportedMajor[id] || 'Unknown major'
  );
  const minors = (plan.minorCodes || [])
    .filter((code) => PROGRAMS.minor[code])
    .map((code) => evaluate(PROGRAMS.minor[code], 'Minor', plan.schedule));
  return { majors, minors };
}

function findLeaf(path) {
  for (const [kind, table] of [['Major', PROGRAMS.major], ['Minor', PROGRAMS.minor]]) {
    for (const def of Object.values(table)) {
      for (const g of def.groups || [{ name: null, leaves: def.leaves }]) {
        for (const l of g.leaves) {
          const p = g.name ? `${kind}//${def.code}//${g.name}//${l.name}` : `${kind}//${def.code}//${l.name}`;
          if (p === path) return l;
        }
      }
    }
  }
  return null;
}

// ── Plans ───────────────────────────────────────────────────────────────────
const planA = sched(
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12, 13],
  [14, 15, 16, 17],
  [18, 19, 20],
  [21, 22, 23],
  [24, 25],
  [26, 27]
);
// Plan b shares catalog ids with plan a for the courses both contain, as real data does.
const planB = sched([1, 102, 3], [104, 105, 8], [10, 108], [109, 21], [111, 4], [113], [114], [115]);
const planC = planA.map((sem, i) => (i % 3 === 0 ? sem.slice(0, 2) : sem.slice(0, 3)));

const PLANS = {
  1: { id: 1, name: 'plan a: econ', majorIds: [1], minorCodes: ['COS'], schedule: planA },
  2: { id: 2, name: 'plan b: spia', majorIds: [2, 3], minorCodes: [], schedule: planB },
  3: { id: 3, name: 'plan c: rip', majorIds: [5], minorCodes: ['FIN'], schedule: planC },
};
let planOrder = [1, 2, 3];
let activePlanId = Number(params.get('active') || 1);

const majorName = (id) => MAJOR_OPTIONS.find((m) => m.id === id)?.name;
const plansPayload = () => ({
  plans: planOrder.map((id) => {
    const p = PLANS[id];
    return {
      id: p.id,
      name: p.name,
      majorId: p.majorIds[0] ?? null,
      majorIds: p.majorIds,
      majorNames: p.majorIds.map(majorName).filter(Boolean),
      minorCodes: p.minorCodes,
      isActive: p.id === activePlanId,
    };
  }),
  activePlanId,
});
const form = (body) => new URLSearchParams(body);
const planFor = (url) => PLANS[Number(new URL(url, location.origin).searchParams.get('planId')) || activePlanId];
const newPlanId = () => Math.max(0, ...planOrder) + 1;
const json = (text, fallback) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

/** Schedules arrive stripped to {id, settled} (+ name for external credits): rebuild full courses. */
function hydrate(stripped) {
  return (stripped || []).map((semester) =>
    (semester || []).map((c) =>
      c.external
        ? { id: c.id, external: true, name: c.name, settled: c.settled || [], semester: 'external', dist_area: null }
        : { ...(CATALOG[c.id] || { id: c.id, name: c.id, title: '' }), settled: c.settled || [] }
    )
  );
}

function searchCatalog(query) {
  const tokens = decodeURIComponent(query).toLowerCase().split(/\s+/).filter(Boolean);
  return Object.values(CATALOG)
    .filter((c) => tokens.every((t) => `${c.name} ${c.title}`.toLowerCase().replace(/\s+/g, ' ').includes(t)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 40);
}

const routes = [
  [/get_profile/, () => ({ classYear, theme, username: 'demo', activePlanId })],
  [/get_plans/, plansPayload],
  [/set_active_plan/, (url, body) => {
    const id = Number(form(body).get('planId'));
    if (PLANS[id]) activePlanId = id;
    return plansPayload();
  }],
  [/settings\/save/, (url, body) => {
    const year = Number(form(body).get('year'));
    if (year) classYear = year;
    return { ok: true };
  }],
  [/update_plan_settings/, (url, body) => {
    const f = form(body);
    const plan = PLANS[Number(f.get('planId'))];
    if (plan) {
      if (f.get('name')) plan.name = f.get('name');
      if (f.has('majorIds')) plan.majorIds = json(f.get('majorIds'), plan.majorIds).map(Number);
      else if (f.has('majorId')) plan.majorIds = [Number(f.get('majorId'))].filter(Boolean);
      if (f.has('minorCodes')) plan.minorCodes = json(f.get('minorCodes'), plan.minorCodes);
    }
    return plansPayload();
  }],
  [/create_plan/, () => {
    const id = newPlanId();
    PLANS[id] = { id, name: `Plan ${planOrder.length + 1}`, majorIds: [], minorCodes: [], schedule: sched([], [], [], [], [], [], [], []) };
    planOrder = [...planOrder, id];
    activePlanId = id;
    return plansPayload();
  }],
  [/copy_plan/, (url, body) => {
    const f = form(body);
    const source = PLANS[Number(f.get('sourcePlanId'))] || PLANS[planOrder[0]];
    const id = newPlanId();
    PLANS[id] = { ...JSON.parse(JSON.stringify(source)), id, name: f.get('name') || `${source.name} (copy)` };
    planOrder = [...planOrder, id];
    activePlanId = id;
    return plansPayload();
  }],
  [/delete_plan/, (url, body) => {
    const id = Number(form(body).get('planId'));
    if (planOrder.length > 1) {
      planOrder = planOrder.filter((p) => p !== id);
      delete PLANS[id];
    }
    if (!PLANS[activePlanId]) activePlanId = planOrder[0];
    return plansPayload();
  }],
  [/get_plan_editor_options/, () => ({ majorOptions: MAJOR_OPTIONS, minorOptions: MINOR_OPTIONS, maxMajors: 3 })],
  [/get_schedule/, (url) => planFor(url).schedule],
  [/update_schedule_and_get_requirements/, (url, body) => {
    const plan = PLANS[Number(form(body).get('planId'))] || PLANS[activePlanId];
    plan.schedule = hydrate(json(form(body).get('schedule'), []));
    const reqs = requirementsFor(plan);
    return /layout=grouped/.test(url) ? reqs : [...reqs.majors, ...reqs.minors];
  }],
  [/get_requirements/, (url) => {
    const reqs = requirementsFor(planFor(url));
    return /layout=grouped/.test(url) ? reqs : [...reqs.majors, ...reqs.minors];
  }],
  [/get_courses\//, (url) => searchCatalog(String(url).split('/get_courses/')[1] || '')],
  [/get_req_courses\//, (url) => {
    const path = decodeURIComponent(String(url).split('/get_req_courses/')[1] || '').replace(/\$/g, '//');
    const leaf = findLeaf(path);
    return leaf ? Object.values(CATALOG).filter((c) => leaf.accepts.some((code) => listings(c).includes(code))) : [];
  }],
  [/get_course_details\//, (url) => {
    const id = decodeURIComponent(String(url).split('/get_course_details/')[1] || '').replace(/\/$/, '');
    const c = CATALOG[id];
    if (!c) return {};
    return {
      description: `${c.title}. (Demo data: the Registrar's course description appears here in the real app.)`,
      offerings: [
        { semester: 'Fall 2025', professors: 'Staff', rating: c.quality_rating },
        { semester: 'Spring 2025', professors: 'Staff', rating: Math.max(3, c.quality_rating - 0.2) },
      ],
      comments: [],
    };
  }],
  [/./, () => ({})],
];

const realFetch = window.fetch.bind(window);

window.fetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? String(options.body) : '';
  // Transcript import is real: the demo server runs the actual parser on the uploaded PDF.
  if (/import_transcript/.test(String(url))) {
    window.__writes.push(`POST ${url} (preview only)`);
    const response = await realFetch(`${url}?year=${classYear}`, options);
    const payload = await response.clone().json().catch(() => null);
    (payload?.courses || []).forEach((c) => c.course?.id && !CATALOG[c.course.id] && (CATALOG[c.course.id] = c.course));
    return response;
  }
  // "Classic view" in the demo opens the classic UI preview instead of reloading the new one.
  if (/set_ui_version/.test(String(url)) && form(body).get('uiVersion') === 'classic') {
    location.assign(`/preview-classic${location.search}`);
    return new Promise(() => {});
  }
  if (method !== 'GET') window.__writes.push(`${method} ${url}`);
  const [, handler] = routes.find(([re]) => re.test(String(url)));
  return new Response(JSON.stringify(handler(String(url), body)), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
