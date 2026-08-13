function distanceInDays(laterValue, earlierValue) {
  const later = new Date(`${String(laterValue || '').slice(0, 10)}T12:00:00`);
  const earlier = new Date(`${String(earlierValue || '').slice(0, 10)}T12:00:00`);
  if (Number.isNaN(later.getTime()) || Number.isNaN(earlier.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 86400000));
}

export function selectCatchupEvents(events, {
  referenceDate,
  getDate,
  getScore,
  limit = 4,
  recentDays = 3,
  majorLookbackDays = 7,
  majorMultiplier = 1.25,
}) {
  const ranked = [...events]
    .map((entry) => ({
      entry,
      age: distanceInDays(referenceDate, getDate(entry)),
      score: Number(getScore(entry) || 0),
    }))
    .sort((left, right) => right.score - left.score);

  const selected = ranked.filter(({ age }) => age <= recentDays).slice(0, limit);
  const weakestRecentScore = selected.at(-1)?.score;
  if (weakestRecentScore == null) return [];

  const majorHoldover = ranked.find(({ age, score }) => (
    age > recentDays
    && age <= majorLookbackDays
    && score >= weakestRecentScore * majorMultiplier
  ));

  if (majorHoldover) {
    if (selected.length === limit) selected.pop();
    selected.push(majorHoldover);
    selected.sort((left, right) => right.score - left.score);
  }

  return selected.slice(0, limit).map(({ entry }) => entry);
}
