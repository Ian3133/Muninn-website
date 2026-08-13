import test from 'node:test';
import assert from 'node:assert/strict';

import { selectCatchupEvents } from './timelineCatchup.js';

const item = (id, latestDate, score) => ({ id, latestDate, score });

const options = {
  referenceDate: '2026-08-13',
  getDate: (entry) => entry.latestDate,
  getScore: (entry) => entry.score,
};

test('Catch-up stays within the current day plus the prior three days', () => {
  const selected = selectCatchupEvents([
    item('today', '2026-08-13', 100),
    item('three-days', '2026-08-10', 90),
    item('four-days', '2026-08-09', 85),
  ], options);

  assert.deepEqual(selected.map((entry) => entry.id), ['today', 'three-days']);
});

test('an exceptionally important older timeline can replace the weakest recent item', () => {
  const selected = selectCatchupEvents([
    item('lead', '2026-08-13', 120),
    item('update-2', '2026-08-12', 100),
    item('update-3', '2026-08-11', 90),
    item('update-4', '2026-08-10', 80),
    item('major-holdover', '2026-08-08', 110),
    item('ordinary-holdover', '2026-08-09', 90),
  ], options);

  assert.deepEqual(
    selected.map((entry) => entry.id),
    ['lead', 'major-holdover', 'update-2', 'update-3'],
  );
});

test('even a high-score item cannot carry over beyond the seven-day exception window', () => {
  const selected = selectCatchupEvents([
    item('lead', '2026-08-13', 120),
    item('update-2', '2026-08-12', 100),
    item('update-3', '2026-08-11', 90),
    item('update-4', '2026-08-10', 80),
    item('too-old', '2026-08-05', 500),
  ], options);

  assert.deepEqual(selected.map((entry) => entry.id), ['lead', 'update-2', 'update-3', 'update-4']);
});
