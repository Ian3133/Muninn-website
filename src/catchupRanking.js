export const CATCHUP_MIN_DAYS = 2;
export const CATCHUP_MAX_DAYS = 5;
export const CATCHUP_DEFAULT_DAYS = 4;

const AGE_PENALTY_PER_DAY = 0.012;
const MAX_AGE_PENALTY = 0.06;
const BRIEFING_LIMITS = new Map([
  [2, 8],
  [3, 10],
  [4, 12],
  [5, 12],
]);
const GENERIC_TOPICS = new Set([
  'business',
  'business & economy',
  'culture',
  'health',
  'local',
  'other',
  'politics',
  'public safety',
  'science & environment',
  'sports',
  'technology & ai',
  'top story',
  'world',
]);
const TITLE_STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'with',
]);

export function clampCatchupDays(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return CATCHUP_DEFAULT_DAYS;
  return Math.min(CATCHUP_MAX_DAYS, Math.max(CATCHUP_MIN_DAYS, parsed));
}

function distanceInDays(laterValue, earlierValue) {
  const later = new Date(`${String(laterValue || '').slice(0, 10)}T12:00:00Z`);
  const earlier = new Date(`${String(earlierValue || '').slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(later.getTime()) || Number.isNaN(earlier.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 86400000));
}

function developmentIdentity(story, fallback) {
  return story?.development_id
    || story?.story_id
    || story?.cluster_id
    || String(story?.title || fallback).trim().toLowerCase();
}

function briefingIdentity(story, fallback) {
  return story?.event_id
    ? `event:${story.event_id}`
    : `development:${developmentIdentity(story, fallback)}`;
}

function importanceScore(story) {
  const score = Number(story?.catchup_rank_score);
  return Number.isFinite(score) ? score : 0;
}

function titleTokens(title) {
  return new Set(String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !TITLE_STOP_WORDS.has(token)));
}

function titleSimilarity(leftTitle, rightTitle) {
  const left = titleTokens(leftTitle);
  const right = titleTokens(rightTitle);
  if (!left.size || !right.size) return 0;
  const shared = [...left].filter((token) => right.has(token)).length;
  return shared / Math.min(left.size, right.size);
}

function matchingDevelopmentKey(group, story, fallbackKey) {
  if (group.developments.has(fallbackKey)) return fallbackKey;
  const match = [...group.developments.entries()].find(([, development]) => (
    titleSimilarity(development.representative.title, story.title) >= 0.72
  ));
  return match?.[0] || fallbackKey;
}

function specificTopic(group) {
  const topic = String(group?.canonical_topic_label || group?.topic_label || '').trim();
  return topic && !GENERIC_TOPICS.has(topic.toLowerCase()) ? topic.toLowerCase() : '';
}

function diversifyBriefing(groups, limit) {
  const selected = [];
  const deferred = [];
  const selectedTopics = new Set();

  groups.forEach((group) => {
    const topic = specificTopic(group);
    if (topic && selectedTopics.has(topic)) {
      deferred.push(group);
      return;
    }
    if (topic) selectedTopics.add(topic);
    selected.push({ ...group, __catchup_display_score: group.__catchup_score });
  });

  // A specific subject gets one briefing slot. Only use another event with the
  // same canonical subject when the feed cannot otherwise fill the briefing.
  deferred.forEach((group) => {
    if (selected.length >= limit) return;
    selected.push({ ...group, __catchup_display_score: group.__catchup_score });
  });
  return selected.slice(0, limit);
}

function sourceNames(story) {
  return [
    ...(Array.isArray(story?.sources) ? story.sources : []),
    ...(Array.isArray(story?.items)
      ? story.items.map((item) => item?.source || item?.station)
      : []),
    story?.primary_source?.source,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function newestStory(left, right) {
  return String(right?.__catchup_date || '').localeCompare(String(left?.__catchup_date || '')) > 0
    ? right
    : left;
}

function catchupScore(group, latestDate) {
  const coverageDays = group.dates.size;
  const developmentCount = group.developments.size;
  const latestAge = distanceInDays(latestDate, group.representative.__catchup_date);
  const coverageBonus = Math.min(0.06, Math.max(0, coverageDays - 1) * 0.025);
  const developmentBonus = Math.min(0.05, Math.max(0, developmentCount - 1) * 0.02);
  const currentActivityBonus = latestAge === 0 && coverageDays > 1 ? 0.02 : 0;
  const agePenalty = Math.min(MAX_AGE_PENALTY, latestAge * AGE_PENALTY_PER_DAY);
  return {
    score: group.peakScore + coverageBonus + developmentBonus + currentActivityBonus - agePenalty,
    breakdown: {
      daily_importance: group.peakScore,
      coverage_bonus: coverageBonus,
      development_bonus: developmentBonus,
      current_activity_bonus: currentActivityBonus,
      age_penalty: agePenalty,
    },
  };
}

/**
 * Build a missed-news briefing. Stories are deduplicated at the development
 * level, then grouped into event narratives. The narratives are ranked by
 * catch-up value while their developments remain chronological for reading.
 */
export function rankCatchupGroups(editions, {
  days = CATCHUP_DEFAULT_DAYS,
  limit = 12,
  referenceDate,
} = {}) {
  const selectedDays = clampCatchupDays(days);
  const validEditions = (Array.isArray(editions) ? editions : [])
    .filter((edition) => edition?.date && Array.isArray(edition?.stories));
  const latestDate = referenceDate
    || validEditions.map((edition) => edition.date).sort().at(-1)
    || '';
  const groups = new Map();

  validEditions.forEach((edition) => {
    const age = distanceInDays(latestDate, edition.date);
    if (age >= selectedDays) return;

    edition.stories.forEach((story, position) => {
      if (!story?.title || story?.today_eligible === false || story?.update_kind === 'recirculation') return;
      const fallback = `${edition.date}-${position}`;
      const groupKey = briefingIdentity(story, fallback);
      const score = importanceScore(story);
      const candidate = {
        ...story,
        __catchup_date: edition.date,
        __catchup_score: score,
      };

      let group = groups.get(groupKey);
      if (!group) {
        group = {
          representative: candidate,
          peakScore: score,
          dates: new Set(),
          developments: new Map(),
          sources: new Set(),
          reportedSourceCount: 0,
          timelineAvailable: false,
        };
        groups.set(groupKey, group);
      }

      group.representative = newestStory(group.representative, candidate);
      group.peakScore = Math.max(group.peakScore, score);
      group.dates.add(edition.date);
      sourceNames(story).forEach((source) => group.sources.add(source));
      group.reportedSourceCount = Math.max(group.reportedSourceCount, Number(story.source_count) || 0);
      group.timelineAvailable ||= Boolean(story.timeline_available);

      const developmentKey = matchingDevelopmentKey(
        group,
        story,
        developmentIdentity(story, fallback),
      );
      const development = group.developments.get(developmentKey);
      if (!development) {
        group.developments.set(developmentKey, {
          representative: candidate,
          score,
          dates: new Set([edition.date]),
        });
        return;
      }

      development.representative = newestStory(development.representative, candidate);
      development.score = Math.max(development.score, score);
      development.dates.add(edition.date);
    });
  });

  const ranked = [...groups.values()]
    .map((group) => {
      const developments = [...group.developments.values()]
        .map((development) => ({
          ...development.representative,
          __catchup_score: development.score,
          __catchup_dates: [...development.dates].sort().reverse(),
          __catchup_coverage_count: development.dates.size,
        }))
        .sort((left, right) => (
          String(left.__catchup_date).localeCompare(String(right.__catchup_date))
          || String(left.title).localeCompare(String(right.title))
        ));
      const dates = [...group.dates].sort();
      const { score, breakdown } = catchupScore(group, latestDate);
      const representative = group.representative;

      return {
        ...representative,
        title: representative.event_title || representative.title,
        sources: [...group.sources],
        source_count: Math.max(group.sources.size, group.reportedSourceCount),
        __catchup_latest_title: representative.title,
        __catchup_developments: developments,
        __catchup_development_count: developments.length,
        __catchup_coverage_count: dates.length,
        __catchup_dates: [...dates].reverse(),
        __catchup_date_range: dates.length ? [dates[0], dates.at(-1)] : [],
        __catchup_source_count: Math.max(group.sources.size, group.reportedSourceCount),
        __catchup_score: Number(score.toFixed(3)),
        __catchup_score_breakdown: breakdown,
        timeline_available: group.timelineAvailable,
      };
    })
    .sort((left, right) => (
      right.__catchup_score - left.__catchup_score
      || String(right.__catchup_date).localeCompare(String(left.__catchup_date))
      || String(left.title).localeCompare(String(right.title))
    ));
  return diversifyBriefing(ranked, Math.max(0, limit));
}

// Retain the original export while the Catch-Up surface migrates to event groups.
export const rankCatchupStories = rankCatchupGroups;

export function catchupBriefingLimit(days) {
  return BRIEFING_LIMITS.get(clampCatchupDays(days)) || BRIEFING_LIMITS.get(CATCHUP_DEFAULT_DAYS);
}

/**
 * Public Catch-Up seam used by the UI. It owns window clamping, adaptive
 * briefing depth, ranking, and the exact range label inputs.
 */
export function buildCatchupBriefing(editions, {
  days = CATCHUP_DEFAULT_DAYS,
  referenceDate,
} = {}) {
  const selectedDays = clampCatchupDays(days);
  const validEditions = (Array.isArray(editions) ? editions : [])
    .filter((edition) => edition?.date && Array.isArray(edition?.stories));
  const resolvedReferenceDate = referenceDate
    || validEditions.map((edition) => edition.date).sort().at(-1)
    || '';
  const limit = catchupBriefingLimit(selectedDays);
  return {
    days: selectedDays,
    limit,
    referenceDate: resolvedReferenceDate,
    availableDays: availableCatchupDays(validEditions, resolvedReferenceDate),
    groups: rankCatchupGroups(validEditions, {
      days: selectedDays,
      limit,
      referenceDate: resolvedReferenceDate,
    }),
  };
}

export function availableCatchupDays(editions, referenceDate) {
  const validDates = new Set((Array.isArray(editions) ? editions : [])
    .map((edition) => edition?.date)
    .filter((date) => distanceInDays(referenceDate, date) < CATCHUP_MAX_DAYS));
  return validDates.size;
}
