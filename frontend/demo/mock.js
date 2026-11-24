// Dev-only fetch mock so the new planner renders without Django. Not part of the PR.
const params = new URLSearchParams(location.search);
const theme = params.get('theme') || 'purple';

const course = (id, name, title, semester = 'both') => ({
  id: String(id),
  name,
  title,
  semester,
  semester_list: ['s25', 'f25'],
  dist_area: 'SA',
  quality_rating: 4.1,
  settled: [],
});

const schedule = [
  [course(1, 'ECO 100', 'Introduction to Microeconomics'), course(2, 'CHI 103', 'Intermediate Chinese I'), course(3, 'MAT 103', 'Calculus I'), course(4, 'HIS 214', 'The Atlantic World')],
  [course(5, 'COS 126 / EGR 126', 'Computer Science: An Interdisciplinary Approach'), course(6, 'CHI 108', 'Intensive Chinese'), course(7, 'ECO 210', 'Mathematics for Economists'), course(8, 'WRI 159', 'Writing Seminar')],
  [course(9, 'ECO 101', 'Introduction to Macroeconomics'), course(10, 'ECO 202', 'Statistics and Data Analysis'), course(11, 'COS 226', 'Algorithms and Data Structures'), course(12, 'ANT 201', 'Introduction to Anthropology'), course(13, 'VIS 214', 'Drawing I')],
  [course(14, 'ECO 301', 'Microeconomics'), course(15, 'COS 217', 'Systems Programming'), course(16, 'SML 201', 'Data Science'), course(17, 'VIS 208', 'Sculpture')],
  [course(18, 'ECO 332 / GHP 332', 'Economics of Health'), course(19, 'ECO 300', 'Microeconomic Theory'), course(20, 'HUM 290 / REL 290', 'Religion and Society')],
  [course(21, 'SPI 305 / ECO 305', 'Public Finance'), course(22, 'COS 333', 'Advanced Programming Techniques'), course(23, 'PSY 101', 'Introduction to Psychology')],
  [course(24, 'ECO 302', 'Macroeconomics'), course(25, 'ECE 206 / COS 306', 'Contemporary Logic Design')],
  [course(26, 'ECO 984', 'Senior Thesis Workshop'), course(27, 'MUS 314 / COS 314', 'Computer and Electronic Music')],
  [],
];

const leaf = (path, name, min, settled, unsettled = []) => ({
  name,
  path_to: path,
  min_needed: min,
  count: settled.length,
  settled,
  unsettled,
  explanation: 'Fixture requirement used for screenshots.',
});

const eco = {
  name: 'Economics',
  code: 'ECO',
  degree: 'AB',
  path_to: 'Major//ECO',
  min_needed: 2,
  count: 2,
  urls: [],
  contacts: [],
  req_list: [
    {
      name: 'Prerequisites',
      path_to: 'Major//ECO//Prerequisites',
      min_needed: 3,
      count: 3,
      req_list: [
        leaf('Major//ECO//Prerequisites//Intro', 'Intro Economics', 2, ['ECO 100', 'ECO 101']),
        leaf('Major//ECO//Prerequisites//Stats', 'Statistics', 1, ['ECO 202']),
        leaf('Major//ECO//Prerequisites//Math', 'Mathematics', 1, ['ECO 210']),
      ],
    },
    {
      name: 'Core',
      path_to: 'Major//ECO//Core',
      min_needed: 3,
      count: 2,
      req_list: [
        leaf('Major//ECO//Core//Micro', 'Microeconomics', 1, ['ECO 300']),
        leaf('Major//ECO//Core//Macro', 'Macroeconomics', 1, ['ECO 302']),
        leaf('Major//ECO//Core//Econometrics', 'Econometrics', 1, []),
      ],
    },
  ],
};

const cos = {
  name: 'Computer Science Minor',
  code: 'COS',
  path_to: 'Minor//COS',
  min_needed: 2,
  count: 1,
  urls: [],
  contacts: [],
  req_list: [
    leaf('Minor//COS//Core', 'Core', 3, ['COS 126', 'COS 226'], ['COS 217']),
    leaf('Minor//COS//Electives', 'Electives', 2, ['COS 333']),
  ],
};

const searchResults = Array.from({ length: 6 }, (_, i) => ({
  id: `s${i}`,
  name: i % 2 ? 'COS 217' : 'COS 126 / EGR 126',
  title: i % 2 ? 'Introduction to Programming Systems' : 'Computer Science: An Interdisciplinary Approach',
  semester: 'both',
  semester_list: ['s25', 'f25'],
  dist_area: 'QCR',
  quality_rating: 4.3,
}));

const spi = {
  name: 'School of Public and International Affairs',
  code: 'SPI',
  degree: 'AB',
  path_to: 'Major//SPI',
  min_needed: 2,
  count: 1,
  urls: [],
  contacts: [],
  req_list: [
    leaf('Major//SPI//Prereqs', 'Prerequisites', 3, ['ECO 100', 'SPI 200', 'POL 220']),
    leaf('Major//SPI//Core', 'Core Courses', 4, ['SPI 305 / ECO 305']),
    leaf('Major//SPI//Policy', 'Policy Seminar', 1, []),
  ],
};
const pol = {
  name: 'Politics',
  code: 'POL',
  degree: 'AB',
  path_to: 'Major//POL',
  min_needed: 2,
  count: 2,
  urls: [],
  contacts: [],
  req_list: [
    leaf('Major//POL//Intro', 'Introductory', 2, ['POL 220', 'POL 230']),
    leaf('Major//POL//Fields', 'Subfields', 2, ['POL 351', 'POL 380']),
  ],
};
const fin = {
  name: 'Finance Minor',
  code: 'FIN',
  path_to: 'Minor//FIN',
  min_needed: 1,
  count: 0,
  urls: [],
  contacts: [],
  req_list: [leaf('Minor//FIN//Core', 'Core', 2, ['ECO 202'])],
};

const schedule2 = [
  [course(101, 'ECO 100', 'Introduction to Microeconomics'), course(102, 'POL 220', 'American Politics'), course(103, 'MAT 103', 'Calculus I')],
  [course(104, 'SPI 200', 'Public Policy'), course(105, 'POL 230', 'Political Theory'), course(106, 'WRI 159', 'Writing Seminar')],
  [course(107, 'ECO 202', 'Statistics and Data Analysis'), course(108, 'SOC 101', 'Introduction to Sociology')],
  [course(109, 'POL 351', 'Comparative Politics'), course(110, 'SPI 305 / ECO 305', 'Public Finance')],
  [course(111, 'POL 380', 'International Relations'), course(112, 'HIS 214', 'The Atlantic World')],
  [course(113, 'SPI 331', 'Urban Policy')],
  [course(114, 'SPI 401', 'Policy Task Force')],
  [course(115, 'POL 495', 'Senior Thesis')],
  [],
];
const schedule3 = schedule.map((sem, i) => (i % 3 === 0 ? sem.slice(0, 2) : sem.slice(0, 3)));

const PLANS = {
  1: { schedule, majors: [[true, [], eco]], minors: [[false, [], cos]] },
  // Plan b has two majors (additional_major_ids) and no minor.
  2: { schedule: schedule2, majors: [[false, [], spi], [true, [], pol]], minors: [] },
  // Plan c has an unsupported major (plain string from the API) and a minor.
  3: { schedule: schedule3, majors: ['Astrophysics'], minors: [[false, [], fin]] },
};
let activePlanId = Number(params.get('active') || 1);
window.__writes = [];

const planFor = (url) => PLANS[Number(new URL(url, location.origin).searchParams.get('planId')) || activePlanId];
const plansPayload = () => ({
  plans: [
    { id: 1, name: 'plan a: econ', majorNames: ['Economics'] },
    { id: 2, name: 'plan b: spia', majorNames: ['SPIA', 'Politics'] },
    { id: 3, name: 'plan c: rip', majorNames: ['Astrophysics'] },
  ],
  activePlanId,
});

const routes = [
  [/get_profile/, () => ({ classYear: 2027, theme, username: 'preview', activePlanId })],
  [/get_plans/, plansPayload],
  [/set_active_plan/, (url, body) => {
    activePlanId = Number(new URLSearchParams(body).get('planId'));
    return plansPayload();
  }],
  [/get_plan_editor_options/, () => ({ majorOptions: [], minorOptions: [], maxMajors: 3 })],
  [/get_schedule/, (url) => planFor(url).schedule],
  [/layout=grouped/, (url) => ({ majors: planFor(url).majors, minors: planFor(url).minors })],
  [/get_requirements|update_schedule_and_get_requirements/, (url) => [...planFor(url).majors, ...planFor(url).minors]],
  [/import_transcript/, () => ({
    classYear: 2027,
    courses: [
      { code: 'ECO 100', term: 'Fall 2023', status: 'taken', semesterIndex: 0, course: { id: '1', name: 'ECO 100', title: 'Introduction to Microeconomics', semester: 'both', semester_list: ['f23'], dist_area: 'SA' } },
      { code: 'COS 126', term: 'Fall 2023', status: 'taken', semesterIndex: 0, course: { id: 'c126', name: 'COS 126 / EGR 126', title: 'Computer Science: An Interdisciplinary Approach', semester: 'both', semester_list: ['f23'], dist_area: 'QCR' } },
      { code: 'MAT 175', term: 'Spring 2024', status: 'taken', semesterIndex: 1, course: { id: 'm175', name: 'MAT 175', title: 'Mathematics for Economics', semester: 'both', semester_list: ['s24'], dist_area: 'QCR' } },
      { code: 'PHI 201', term: 'Fall 2025', status: 'current', semesterIndex: 4, course: { id: 'p201', name: 'PHI 201', title: 'Introductory Logic', semester: 'fall', semester_list: ['f25'], dist_area: 'EC' } },
      { code: 'PHY 104', term: 'Fall 2027', status: 'current', semesterIndex: null, course: { id: 'y104', name: 'PHY 104', title: 'Physics for the Life Sciences', semester: 'fall', semester_list: ['f25'], dist_area: 'SEL' } },
    ],
    unmatched: ['ZZZ 999'],
  })],
  [/get_courses\//, () => searchResults],
  [/get_req_courses\//, () => searchResults],
  [/get_course_details\//, () => ({})],
  [/./, () => ({})],
];

window.fetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') window.__writes.push(`${method} ${url}`);
  const [, handler] = routes.find(([re]) => re.test(String(url)));
  const body = options.body ? String(options.body) : '';
  return new Response(JSON.stringify(handler(String(url), body)), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
