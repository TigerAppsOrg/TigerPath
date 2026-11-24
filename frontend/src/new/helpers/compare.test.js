import { describe, expect, it } from 'vitest';
import { compareOptions, planSummaries, programSummary } from './compare';

const leaf = (name, count, min) => ({ name, count, min_needed: min, settled: [] });

describe('compareOptions', () => {
  it('never offers the active plan, so the same plan cannot be on both sides', () => {
    const plans = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(compareOptions(plans, 2).map((p) => p.id)).toEqual([1, 3]);
    expect(compareOptions([{ id: 1 }], 1)).toEqual([]);
  });
});

describe('programSummary', () => {
  it('counts finished top-level requirements and skips neutral ones', () => {
    const eco = {
      name: 'Economics',
      code: 'ECO',
      req_list: [leaf('Prerequisites', 3, 3), leaf('Core', 2, 3), leaf('Notes', 0, 0)],
    };
    const summary = programSummary(eco, 'major');
    expect(summary).toMatchObject({ label: 'ECO', name: 'Economics', done: 1, total: 2, unsupported: false });
    expect(summary.items.map((i) => i.status)).toEqual(['done', 'incomplete', 'neutral']);
  });

  it('marks unsupported majors (plain strings from the API)', () => {
    expect(programSummary('Astrophysics', 'major')).toMatchObject({ unsupported: true, name: 'Astrophysics' });
  });
});

describe('planSummaries', () => {
  it('lists each plan’s own majors then minors', () => {
    const reqs = {
      majors: [{ name: 'Computer Science', code: 'COS', req_list: [] }, 'Politics'],
      minors: [{ name: 'Finance', code: 'FIN', req_list: [leaf('Core', 1, 1)] }],
    };
    expect(planSummaries(reqs).map((s) => s.label)).toEqual(['COS', 'Politics', 'FIN']);
    expect(planSummaries(null)).toEqual([]);
  });
});

import { courseKey, diffSchedules } from './compare';

describe('diffSchedules', () => {
  const sched = (...semesters) => [...semesters, ...Array.from({ length: 9 - semesters.length }, () => [])];
  const c = (id, name = id) => ({ id, name });

  it('marks courses as same, moved or only, from each side', () => {
    const left = sched([c('eco100'), c('cos126')], [c('mat103')]);
    const right = sched([c('eco100')], [], [c('cos126'), c('pol220')]);
    const { left: l, right: r } = diffSchedules(left, right);
    expect(l.get('id:eco100')).toEqual({ status: 'same' });
    expect(l.get('id:cos126')).toEqual({ status: 'moved', otherIndex: 2 });
    expect(l.get('id:mat103')).toEqual({ status: 'only' });
    expect(r.get('id:cos126')).toEqual({ status: 'moved', otherIndex: 0 });
    expect(r.get('id:pol220')).toEqual({ status: 'only' });
  });

  it('matches external credits by name and ignores the external-credits slot', () => {
    const ap = { id: 'random-1', external: true, name: 'AP Calculus' };
    const left = sched([ap]);
    const right = sched([{ ...ap, id: 'random-2' }]);
    right[8] = [c('only-in-slot-9')];
    expect(diffSchedules(left, right).left.get(courseKey(ap))).toEqual({ status: 'same' });
    expect(diffSchedules(left, right).right.has('id:only-in-slot-9')).toBe(false);
  });
});
