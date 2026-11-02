import { describe, expect, it } from 'vitest';
import {
  minorLabel,
  normalizeCourseName,
  unwrapGroupedRequirements,
  remainingSlots,
  requirementStatus,
  settleCourse,
  visibleChildren,
} from './requirements';
import { isWrongSeason, stripSchedule } from './schedule';

describe('unwrapGroupedRequirements', () => {
  it('unwraps verifier tuples for every major and minor', () => {
    const eco = { name: 'Economics' };
    const cos = { name: 'Computer Science' };
    expect(
      unwrapGroupedRequirements({
        majors: [[true, [], eco], 'Astrophysics'],
        minors: [[false, [], cos]],
      })
    ).toEqual({ majors: [eco, 'Astrophysics'], minors: [cos] });
  });

  it('tolerates a missing response', () => {
    expect(unwrapGroupedRequirements(null)).toEqual({ majors: [], minors: [] });
  });
});

describe('requirementStatus', () => {
  it('matches the classic done/neutral/incomplete rules', () => {
    expect(requirementStatus({ count: 2, min_needed: 2 })).toBe('done');
    expect(requirementStatus({ count: 0, min_needed: 0 })).toBe('neutral');
    expect(requirementStatus({ count: 3, min_needed: 0 })).toBe('done');
    expect(requirementStatus({ count: 1, min_needed: 2 })).toBe('incomplete');
  });
});

describe('visibleChildren', () => {
  it('collapses a finished "any 1" group to its satisfied branches', () => {
    const a = { name: 'A', count: 1, min_needed: 1 };
    const b = { name: 'B', count: 0, min_needed: 1 };
    expect(visibleChildren({ count: 1, min_needed: 1, req_list: [a, b] })).toEqual([a]);
    expect(visibleChildren({ count: 0, min_needed: 1, req_list: [a, b] })).toEqual([a, b]);
  });
});

describe('settleCourse', () => {
  it('replaces a sibling assignment and leaves other requirements alone', () => {
    const schedule = [
      [{ id: '1', name: 'ECO 300', settled: ['Major//ECO//Core//Macro', 'Major//ECO//Dept//Economics'] }],
    ];
    const next = settleCourse(schedule, 'ECO 300', 'Major//ECO//Core//Micro');
    expect(next[0][0].settled).toEqual(['Major//ECO//Dept//Economics', 'Major//ECO//Core//Micro']);
    expect(schedule[0][0].settled).toHaveLength(2); // not mutated
  });

  it('matches crosslisted names regardless of order and spacing', () => {
    expect(normalizeCourseName('COS 126 / EGR 126')).toBe(normalizeCourseName('EGR126/COS126'));
  });
});

describe('remainingSlots', () => {
  it('counts external credits that are saved but not yet reflected by the server', () => {
    const req = { path_to: 'p', count: 0, min_needed: 2, settled_details: [] };
    const schedule = [[], [{ id: 'x', external: true, settled: ['p'] }]];
    expect(remainingSlots(req, schedule)).toBe(1);
  });
});

describe('labels and schedule helpers', () => {
  it('abbreviates minors without a code', () => {
    expect(minorLabel({ name: 'Statistics and Machine Learning Minor' })).toBe('SML');
  });

  it('flags single-season courses dropped in the other season', () => {
    expect(isWrongSeason({ semester: 'fall' }, 1)).toBe(true);
    expect(isWrongSeason({ semester: 'both' }, 1)).toBe(false);
  });

  it('strips schedules to what the backend stores', () => {
    expect(
      stripSchedule([[{ id: '1', name: 'ECO 100', title: 'x', settled: [] }, { id: 'e', external: true, name: 'AP', settled: ['p'] }]])
    ).toEqual([[{ id: '1', settled: [] }, { id: 'e', external: true, name: 'AP', settled: ['p'] }]]);
  });
});
