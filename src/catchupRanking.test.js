import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCatchupBriefing,
  catchupBriefingLimit,
  CATCHUP_DEFAULT_DAYS,
  clampCatchupDays,
  rankCatchupGroups,
} from './catchupRanking.js';

const story = (id, rankScore, extra = {}) => ({
  story_id: id,
  development_id: id,
  event_id: `event-${id}`,
  title: id,
  catchup_rank_score: rankScore,
  today_eligible: true,
  ...extra,
});

test('day selection is constrained to 2–5 and defaults to four', () => {
  assert.equal(clampCatchupDays(), CATCHUP_DEFAULT_DAYS);
  assert.equal(clampCatchupDays(1), 2);
  assert.equal(clampCatchupDays(5), 5);
  assert.equal(clampCatchupDays(9), 5);
});

test('a four-day catch-up includes today and the prior three editions', () => {
  const editions = [0, 1, 2, 3, 4].map((age) => ({
    date: `2026-08-${String(13 - age).padStart(2, '0')}`,
    stories: [story(`day-${age}`, 1 - (age * 0.05))],
  }));

  const ranked = rankCatchupGroups(editions, { days: 4, referenceDate: '2026-08-13' });

  assert.deepEqual(ranked.map((item) => item.story_id), ['day-0', 'day-1', 'day-2', 'day-3']);
});

test('a consequential older story outranks a minor newer story', () => {
  const ranked = rankCatchupGroups([
    { date: '2026-08-13', stories: [story('newer-minor', 0.65)] },
    { date: '2026-08-10', stories: [story('older-major', 1)] },
  ], { days: 4, referenceDate: '2026-08-13' });

  assert.equal(ranked[0].story_id, 'older-major');
  assert.ok(ranked[0].__catchup_score < 1);
});

test('distinct developments in one event become one chronological briefing', () => {
  const ranked = rankCatchupGroups([
    { date: '2026-08-13', stories: [story('latest', 0.9, { event_id: 'shared-event' })] },
    { date: '2026-08-12', stories: [story('earlier', 1, { event_id: 'shared-event' })] },
  ], { days: 4, referenceDate: '2026-08-13' });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].story_id, 'latest');
  assert.equal(ranked[0].__catchup_development_count, 2);
  assert.deepEqual(
    ranked[0].__catchup_developments.map((item) => item.story_id),
    ['earlier', 'latest'],
  );
});

test('the same development is represented once using its latest coverage', () => {
  const ranked = rankCatchupGroups([
    { date: '2026-08-13', stories: [story('latest-story', 0.9, { development_id: 'shared-development', event_id: 'shared-event' })] },
    { date: '2026-08-12', stories: [story('earlier-story', 1, { development_id: 'shared-development', event_id: 'shared-event' })] },
  ], { days: 4, referenceDate: '2026-08-13' });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].story_id, 'latest-story');
  assert.equal(ranked[0].__catchup_development_count, 1);
  assert.equal(ranked[0].__catchup_coverage_count, 2);
  assert.deepEqual(ranked[0].__catchup_dates, ['2026-08-13', '2026-08-12']);
});

test('near-identical headlines within an event are treated as one updated development', () => {
  const ranked = rankCatchupGroups([
    {
      date: '2026-08-13',
      stories: [story('latest', 0.9, {
        event_id: 'assad-case',
        title: 'Bashar al-Assad Sentenced to Death in Absentia for War Crimes',
      })],
    },
    {
      date: '2026-08-12',
      stories: [story('earlier', 1, {
        event_id: 'assad-case',
        title: 'Syrian Court Sentences Bashar al-Assad to Death in Absentia for War Crimes',
      })],
    },
  ], { days: 3, referenceDate: '2026-08-13' });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].__catchup_development_count, 1);
  assert.equal(ranked[0].__catchup_coverage_count, 2);
});

test('sustained coverage modestly boosts an otherwise equal briefing', () => {
  const ranked = rankCatchupGroups([
    {
      date: '2026-08-13',
      stories: [
        story('continuing-latest', 0.8, { event_id: 'continuing' }),
        story('standalone', 0.8),
      ],
    },
    {
      date: '2026-08-12',
      stories: [story('continuing-earlier', 0.75, { event_id: 'continuing' })],
    },
  ], { days: 3, referenceDate: '2026-08-13' });

  assert.equal(ranked[0].event_id, 'continuing');
  assert.ok(ranked[0].__catchup_score > ranked[1].__catchup_score);
});

test('a repeated specific subject does not displace a distinct briefing subject', () => {
  const ranked = rankCatchupGroups([{
    date: '2026-08-13',
    stories: [
      story('quake', 1, { topic_label: 'Colombia Earthquake' }),
      story('rescue', 0.99, { topic_label: 'Colombia Earthquake' }),
      story('election', 0.95, { topic_label: 'Wisconsin Election' }),
    ],
  }], { days: 2, referenceDate: '2026-08-13' });

  assert.deepEqual(ranked.map((item) => item.story_id), ['quake', 'election', 'rescue']);
});

test('a repeated specific subject is deferred outside a full briefing', () => {
  const ranked = rankCatchupGroups([{
    date: '2026-08-13',
    stories: [
      story('quake', 1, { topic_label: 'Colombia Earthquake' }),
      story('rescue', 0.99, { topic_label: 'Colombia Earthquake' }),
      ...Array.from({ length: 7 }, (_, index) => story(`distinct-${index}`, 0.98 - (index * 0.01), {
        topic_label: `Specific subject ${index}`,
      })),
    ],
  }], { days: 2, limit: 8, referenceDate: '2026-08-13' });

  assert.equal(ranked.length, 8);
  assert.equal(ranked.filter((item) => item.topic_label === 'Colombia Earthquake').length, 1);
  assert.ok(!ranked.some((item) => item.story_id === 'rescue'));
});

test('briefing depth adapts to the selected window', () => {
  assert.equal(catchupBriefingLimit(2), 8);
  assert.equal(catchupBriefingLimit(3), 10);
  assert.equal(catchupBriefingLimit(4), 12);
  assert.equal(catchupBriefingLimit(5), 12);
});

test('the public briefing seam returns selection metadata with ranked groups', () => {
  const briefing = buildCatchupBriefing([
    { date: '2026-08-13', stories: [story('today', 1)] },
    { date: '2026-08-12', stories: [story('yesterday', 0.9)] },
  ], { days: 2 });

  assert.equal(briefing.days, 2);
  assert.equal(briefing.limit, 8);
  assert.equal(briefing.referenceDate, '2026-08-13');
  assert.equal(briefing.availableDays, 2);
  assert.deepEqual(briefing.groups.map((item) => item.story_id), ['today', 'yesterday']);
});

test('recirculation-only stories are not treated as missed developments', () => {
  const ranked = rankCatchupGroups([
    {
      date: '2026-08-13',
      stories: [story('repeated', 1, { update_kind: 'recirculation', today_eligible: false })],
    },
  ], { days: 2, referenceDate: '2026-08-13' });

  assert.deepEqual(ranked, []);
});
