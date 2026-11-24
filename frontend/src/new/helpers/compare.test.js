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
