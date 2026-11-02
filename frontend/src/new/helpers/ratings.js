// Same red→orange→yellow→green scale (ratings out of 5) as PrincetonCourses and the classic UI.
const STOPS = [
  [0, [224, 82, 82]],
  [2, [224, 112, 48]],
  [3, [224, 144, 32]],
  [3.5, [200, 176, 32]],
  [4, [144, 176, 32]],
  [4.5, [92, 184, 92]],
  [5, [45, 176, 45]],
];

export function ratingColor(rating) {
  if (rating == null) return '#e0e0e0';
  const r = Math.max(0, Math.min(5, rating));
  let lo = STOPS[0];
  let hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (r >= STOPS[i][0] && r <= STOPS[i + 1][0]) {
      lo = STOPS[i];
      hi = STOPS[i + 1];
      break;
    }
  }
  const t = hi[0] === lo[0] ? 0 : (r - lo[0]) / (hi[0] - lo[0]);
  const c = lo[1].map((v, i) => Math.round(v + t * (hi[1][i] - v)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export const DIST_NAMES = {
  HA: 'Historical Analysis',
  CD: 'Culture and Difference',
  EC: 'Epistemology and Cognition',
  EM: 'Ethical Thought and Moral Values',
  LA: 'Literature and the Arts',
  SA: 'Social Analysis',
  QCR: 'Quantitative and Computational Reasoning',
  SEL: 'Science and Engineering with Lab',
  SEN: 'Science and Engineering without Lab',
};
