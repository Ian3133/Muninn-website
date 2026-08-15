import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import WeeklyLetter from './WeeklyLetter';
import { carrySourceTitle, sourceDocumentTitle } from './sourceDocumentTitle';
import {
  buildCatchupBriefing,
  CATCHUP_DEFAULT_DAYS,
  CATCHUP_MAX_DAYS,
  CATCHUP_MIN_DAYS,
  clampCatchupDays,
} from './catchupRanking';
import './ReaderApp.css';

const DIGEST_URLS = ['/Current_news/digest.json', '/current_news/digest.json'];
const EVENT_URLS = ['/Current_news/event_timelines.json', '/current_news/event_timelines.json'];
const RECENT_URLS = ['/Current_news/recent_news.json', '/current_news/recent_news.json'];
const CATCHUP_URLS = ['/Current_news/catchup.json', '/current_news/catchup.json'];
const COVERAGE_URLS = ['/Current_news/coverage_collections.json', '/current_news/coverage_collections.json'];
const WEEKLY_INDEX_URLS = [
  '/Current_news/weekly_newsletters/index.json',
  '/current_news/weekly_newsletters/index.json',
];

const VIEW_LABELS = {
  today: 'Digests',
  'catch-up': 'Catch-Up',
  // digest: 'Digest', // Temporarily hidden; keep the view implementation for a future return.
  events: 'Timelines',
  'my-news': 'My News',
  story: 'Story',
  event: 'Event',
  weekly: 'Weekly',
  archive: 'Archive',
};

const LEGACY_CATEGORY_VIEWS = {
  'top-stories': { view: 'today' },
  timelines: { view: 'events' },
  'your-newsletter': { view: 'weekly' },
  local: { view: 'events', topic: 'Local' },
  happy: { view: 'events' },
  science: { view: 'events', topic: 'Science & Environment' },
  sports: { view: 'events', topic: 'Sports' },
  politics: { view: 'events', topic: 'Politics' },
  business: { view: 'events', topic: 'Business & Economy' },
  technology: { view: 'events', topic: 'Technology & AI' },
  health: { view: 'events', topic: 'Health' },
  world: { view: 'events', topic: 'World' },
  other: { view: 'events', topic: 'Other' },
};

const SOURCE_LOGO_ALIASES = {
  'abc news': 'abc-news',
  africanews: 'africanews',
  ap: 'ap',
  'ap news': 'ap',
  'al jazeera': 'al-jazeera',
  'al jazeera english': 'al-jazeera',
  bbc: 'bbc',
  'bbc news': 'bbc',
  cbc: 'cbc-news',
  'cbc news': 'cbc-news',
  cbs: 'cbs-news',
  'cbs news': 'cbs-news',
  'channel newsasia': 'channel-newsasia',
  cnn: 'cnn',
  dw: 'dw',
  'dw english': 'dw',
  euronews: 'euronews',
  'fox news': 'fox-news',
  'france 24': 'france-24',
  'google news': 'google-news',
  'japan times': 'japan-times',
  'los angeles times': 'los-angeles-times',
  'nbc news': 'nbc-news',
  'new york times': 'new-york-times',
  newsnation: 'newsnation',
  npr: 'npr',
  'pbs news': 'pbs-news',
  politico: 'politico',
  reuters: 'reuters',
  'roll call': 'roll-call',
  'rte news': 'rte-news',
  'rté news': 'rte-news',
  'sbs news': 'sbs-news',
  'sky news': 'sky-news',
  'the hill': 'the-hill',
  'the guardian': 'the-guardian',
  'the hindu': 'the-hindu',
  time: 'time',
  upi: 'upi',
  'usa today': 'usa-today',
  vox: 'vox',
};

const SOURCE_NAME_ALIASES = {
  abc: 'ABC News',
  'abc news': 'ABC News',
  africanews: 'Africanews',
  'al jazeera': 'Al Jazeera',
  'al jazeera english': 'Al Jazeera',
  ap: 'AP News',
  'ap news': 'AP News',
  'ap top news via google news': 'AP News',
  bbc: 'BBC News',
  'bbc news': 'BBC News',
  cbc: 'CBC News',
  'cbc news': 'CBC News',
  cbs: 'CBS News',
  'cbs news': 'CBS News',
  centcom: 'U.S. Central Command',
  channelnewsasia: 'Channel NewsAsia',
  'channel newsasia': 'Channel NewsAsia',
  congress: 'U.S. Congress',
  dw: 'DW',
  'dw english': 'DW',
  euronews: 'Euronews',
  'fox news': 'Fox News',
  'france 24': 'France 24',
  'google news': 'Google News',
  investing: 'Investing.com',
  'investing.com': 'Investing.com',
  icrc: 'International Committee of the Red Cross',
  aljazeera: 'Al Jazeera',
  acleddata: 'ACLED',
  criticalthreats: 'Critical Threats Project',
  npr: 'NPR',
  'pbs news': 'PBS News',
  rte: 'RTÉ News',
  'rte news': 'RTÉ News',
  sky: 'Sky News',
  'sky news': 'Sky News',
  state: 'U.S. Department of State',
  'the guardian': 'The Guardian',
  time: 'TIME',
};

const VAGUE_SOURCE_NAMES = new Set([
  'government', 'official', 'president', 'source', 'staff', 'unknown',
]);

const SOURCE_DOMAIN_IDENTITIES = [
  ['gov.bc.ca', { name: 'Government of British Columbia', mark: 'BC', kind: 'institution' }],
  ['travel.state.gov', { name: 'U.S. Department of State', mark: 'US', kind: 'institution' }],
  ['state.gov', { name: 'U.S. Department of State', mark: 'US', kind: 'institution' }],
  ['congress.gov', { name: 'U.S. Congress', mark: 'US', kind: 'institution' }],
  ['senate.gov', { name: 'U.S. Senate', mark: 'US', kind: 'institution' }],
  ['house.gov', { name: 'U.S. House of Representatives', mark: 'US', kind: 'institution' }],
  ['whitehouse.gov', { name: 'The White House', mark: 'US', kind: 'institution' }],
  ['justice.gov', { name: 'U.S. Department of Justice', mark: 'DOJ', kind: 'institution' }],
  ['fbi.gov', { name: 'FBI', mark: 'FBI', kind: 'institution' }],
  ['centcom.mil', { name: 'U.S. Central Command', mark: 'US', kind: 'institution' }],
  ['army.mil', { name: 'U.S. Army', mark: 'US', kind: 'institution' }],
  ['navy.mil', { name: 'U.S. Navy', mark: 'US', kind: 'institution' }],
  ['energy.gov', { name: 'U.S. Department of Energy', mark: 'US', kind: 'institution' }],
  ['nhc.noaa.gov', { name: 'National Hurricane Center', mark: 'NHC', kind: 'institution' }],
  ['noaa.gov', { name: 'NOAA', mark: 'NOAA', kind: 'institution' }],
  ['nasa.gov', { name: 'NASA', mark: 'NASA', kind: 'institution' }],
  ['si.edu', { name: 'Smithsonian Institution', mark: 'SI', kind: 'institution' }],
  ['press.un.org', { name: 'United Nations', mark: 'UN', kind: 'institution' }],
  ['documents.un.org', { name: 'United Nations', mark: 'UN', kind: 'institution' }],
  ['digitallibrary.un.org', { name: 'United Nations', mark: 'UN', kind: 'institution' }],
  ['un.org', { name: 'United Nations', mark: 'UN', kind: 'institution' }],
  ['unhcr.org', { name: 'UNHCR', mark: 'UN', kind: 'institution' }],
  ['ohchr.org', { name: 'UN Human Rights Office', mark: 'UN', kind: 'institution' }],
  ['unep.org', { name: 'UN Environment Programme', mark: 'UN', kind: 'institution' }],
  ['iom.int', { name: 'International Organization for Migration', mark: 'IOM', kind: 'institution' }],
  ['imo.org', { name: 'International Maritime Organization', mark: 'IMO', kind: 'institution' }],
  ['iaea.org', { name: 'IAEA', mark: 'IAEA', kind: 'institution' }],
  ['icc-cpi.int', { name: 'International Criminal Court', mark: 'ICC', kind: 'institution' }],
  ['icj-cij.org', { name: 'International Court of Justice', mark: 'ICJ', kind: 'institution' }],
  ['consilium.europa.eu', { name: 'European Council', mark: 'EU', kind: 'institution' }],
  ['europarl.europa.eu', { name: 'European Parliament', mark: 'EU', kind: 'institution' }],
  ['eur-lex.europa.eu', { name: 'EUR-Lex', mark: 'EU', kind: 'institution' }],
  ['gov.uk', { name: 'UK Government', mark: 'UK', kind: 'institution' }],
  ['parliament.uk', { name: 'UK Parliament', mark: 'UK', kind: 'institution' }],
  ['judiciary.uk', { name: 'Courts and Tribunals Judiciary', mark: 'UK', kind: 'institution' }],
  ['fifa.com', { name: 'FIFA', mark: 'FIFA', kind: 'institution' }],
  ['uefa.com', { name: 'UEFA', mark: 'UEFA', kind: 'institution' }],
  ['concacaf.com', { name: 'Concacaf', mark: 'CCF', kind: 'institution' }],
  ['the-afc.com', { name: 'Asian Football Confederation', mark: 'AFC', kind: 'institution' }],
  ['formula1.com', { name: 'Formula 1', mark: 'F1', kind: 'institution' }],
  ['fia.com', { name: 'FIA', mark: 'FIA', kind: 'institution' }],
  ['boe.es', { name: "Spain's Official State Gazette", mark: 'ES', kind: 'institution' }],
  ['gob.pe', { name: 'Government of Peru', mark: 'PE', kind: 'institution' }],
  ['tse.jus.br', { name: 'Brazilian Superior Electoral Court', mark: 'BR', kind: 'institution' }],
  ['openai.com', { name: 'OpenAI', mark: 'AI', kind: 'institution' }],
  ['icrc.org', { name: 'International Committee of the Red Cross', mark: 'ICRC', kind: 'institution' }],
  ['investing.com', { name: 'Investing.com', logo: 'investing-com', mark: 'IN' }],
  ['acleddata.com', { name: 'ACLED', mark: 'ACLED', kind: 'institution' }],
  ['criticalthreats.org', { name: 'Critical Threats Project', mark: 'CTP', kind: 'institution' }],
  ['apnews.com', { name: 'AP News', logo: 'ap' }],
  ['reutersconnect.com', { name: 'Reuters', logo: 'reuters' }],
  ['reuters.com', { name: 'Reuters', logo: 'reuters' }],
  ['bbc.co.uk', { name: 'BBC News', logo: 'bbc' }],
  ['bbc.com', { name: 'BBC News', logo: 'bbc' }],
  ['cbsnews.com', { name: 'CBS News', logo: 'cbs-news' }],
  ['abcnews.com', { name: 'ABC News', logo: 'abc-news' }],
  ['nbcnews.com', { name: 'NBC News', logo: 'nbc-news' }],
  ['npr.org', { name: 'NPR', logo: 'npr' }],
  ['pbs.org', { name: 'PBS News', logo: 'pbs-news' }],
  ['aljazeera.com', { name: 'Al Jazeera', logo: 'al-jazeera' }],
  ['dw.com', { name: 'DW', logo: 'dw' }],
  ['france24.com', { name: 'France 24', logo: 'france-24' }],
  ['rte.ie', { name: 'RTÉ News', logo: 'rte-news' }],
  ['euronews.com', { name: 'Euronews', logo: 'euronews' }],
  ['theguardian.com', { name: 'The Guardian', logo: 'the-guardian' }],
  ['cbc.ca', { name: 'CBC News', logo: 'cbc-news' }],
  ['news.sky.com', { name: 'Sky News', logo: 'sky-news' }],
  ['africanews.com', { name: 'Africanews', logo: 'africanews' }],
  ['channelnewsasia.com', { name: 'Channel NewsAsia', logo: 'channel-newsasia' }],
  ['sbs.com.au', { name: 'SBS News', logo: 'sbs-news' }],
  ['foxnews.com', { name: 'Fox News', logo: 'fox-news' }],
  ['nytimes.com', { name: 'The New York Times', logo: 'new-york-times' }],
  ['time.com', { name: 'TIME', logo: 'time' }],
  ['newsnationnow.com', { name: 'NewsNation', logo: 'newsnation' }],
  ['thehindu.com', { name: 'The Hindu', logo: 'the-hindu' }],
  ['politico.com', { name: 'Politico', logo: 'politico' }],
  ['news.google.com', { name: 'Google News', logo: 'google-news' }],
  ['elpais.com', { name: 'El País', mark: 'EP' }],
  ['lemonde.fr', { name: 'Le Monde', mark: 'LM' }],
  ['thedailybeast.com', { name: 'The Daily Beast', mark: 'DB' }],
  ['europapress.es', { name: 'Europa Press', mark: 'EP' }],
  ['cadenaser.com', { name: 'Cadena SER', mark: 'SER' }],
  ['tradlinx.com', { name: 'Tradlinx', mark: 'TL' }],
];

async function fetchFirst(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return response.json();
    } catch {
      // Try the legacy path casing.
    }
  }
  throw new Error('Muninn preview data could not be loaded.');
}

async function fetchOptional(urls) {
  try {
    return await fetchFirst(urls);
  } catch {
    return null;
  }
}

function readRoute() {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get('view');
  const legacy = LEGACY_CATEGORY_VIEWS[params.get('category')];
  const view = VIEW_LABELS[requestedView]
    ? requestedView
    : legacy?.view || 'today';
  return {
    view,
    sid: params.get('sid') || params.get('id') || '',
    eventId: params.get('event') || '',
    mode: params.get('mode') || params.get('type') || 'all',
    topic: params.get('topic') || legacy?.topic || 'all',
    edition: params.get('edition') || '',
    archiveDate: params.get('archiveDate') || '',
    days: clampCatchupDays(params.get('days')),
    from: params.get('from') || '',
  };
}

function routeHref(view, extras = {}) {
  const params = new URLSearchParams();
  if (view !== 'today') params.set('view', view);
  if (extras.sid) params.set('sid', extras.sid);
  if (extras.eventId) params.set('event', extras.eventId);
  if (extras.mode && extras.mode !== 'all') params.set('mode', extras.mode);
  if (extras.topic && extras.topic !== 'all') params.set('topic', extras.topic);
  if (extras.edition) params.set('edition', extras.edition);
  if (extras.archiveDate) params.set('archiveDate', extras.archiveDate);
  if (extras.from) params.set('from', extras.from);
  if (extras.days && clampCatchupDays(extras.days) !== CATCHUP_DEFAULT_DAYS) {
    params.set('days', clampCatchupDays(extras.days));
  }
  const query = params.toString();
  const hash = extras.hash
    ? `#${String(extras.hash).replace(/^#/, '')}`
    : '';
  return `/${query ? `?${query}` : ''}${hash}`;
}

let scrollResetFrame = null;
let savedInlineScrollBehavior = null;

function resetPageScroll() {
  const root = document.documentElement;
  if (savedInlineScrollBehavior === null) {
    savedInlineScrollBehavior = root.style.scrollBehavior;
  }
  if (scrollResetFrame !== null) window.cancelAnimationFrame(scrollResetFrame);
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  // Keep the override through the next paint. Restoring it synchronously lets
  // the global CSS `scroll-behavior: smooth` turn this reset into an animation.
  scrollResetFrame = window.requestAnimationFrame(() => {
    scrollResetFrame = window.requestAnimationFrame(() => {
      root.style.scrollBehavior = savedInlineScrollBehavior || '';
      savedInlineScrollBehavior = null;
      scrollResetFrame = null;
    });
  });
}

function formatDate(value, options = {}) {
  if (!value) return '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: options.short ? 'short' : 'long',
    day: 'numeric',
    year: options.year === false ? undefined : 'numeric',
  }).format(date);
}

function editionTimestamp(value) {
  if (!value) return { weekday: 'Daily edition', date: 'Today' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { weekday: 'Daily edition', date: String(value) };
  }
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date),
    date: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
    }).format(date),
  };
}

function sourceIdentity(value = '', url = '') {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    hostname = '';
  }
  const domainIdentity = SOURCE_DOMAIN_IDENTITIES.find(
    ([domain]) => hostname === domain || hostname.endsWith(`.${domain}`),
  )?.[1];
  const clean = String(value)
    .replace(/\s*-\s*(top stories|top news via google news|headlines|latest|world|english|home|politics|news)$/i, '')
    .trim();
  const namedIdentity = SOURCE_NAME_ALIASES[clean.toLowerCase()];
  const explicitName = VAGUE_SOURCE_NAMES.has(clean.toLowerCase()) ? '' : clean;
  const aggregatorCarriesPublisher = hostname === 'news.google.com' && namedIdentity;
  const hostnameName = hostname
    ? hostname.replace(/^www\./, '').split('.').slice(-2).join('.')
    : '';
  const name = aggregatorCarriesPublisher
    ? namedIdentity
    : domainIdentity?.name || namedIdentity || explicitName || hostnameName || 'Source details unavailable';
  return {
    name,
    logo: (aggregatorCarriesPublisher ? SOURCE_LOGO_ALIASES[name.toLowerCase()] : domainIdentity?.logo)
      || SOURCE_LOGO_ALIASES[name.toLowerCase()] || '',
    mark: domainIdentity?.mark || name.match(/\b[A-Z]{2,5}\b/)?.[0] || name.slice(0, 2).toUpperCase(),
    kind: aggregatorCarriesPublisher ? 'publisher' : domainIdentity?.kind || 'publisher',
  };
}

function cleanSourceName(value = '', url = '') {
  return sourceIdentity(value, url).name;
}

function sourceLogoPath(value = '', url = '') {
  const slug = sourceIdentity(value, url).logo;
  return slug ? `/assets/logos/${slug}.png` : '';
}

function storyImage(story) {
  return story?.image?.url || story?.image?.thumbnail_url || '';
}

function eventImage(event) {
  return event?.hero_image?.url || event?.hero_image?.thumbnail_url || '';
}

function imagePresentation(image, role = 'wide') {
  if (!image) return {};
  const roleX = image[`focal_${role}_x`];
  const roleY = image[`focal_${role}_y`];
  const tall = role === 'support' || role === 'tall';
  const x = roleX ?? (tall ? image.focal_tall_x : image.focal_wide_x);
  const y = roleY ?? (tall ? image.focal_tall_y : image.focal_wide_y);
  const fallbackX = image.focal_x ?? 0.5;
  const fallbackY = image.focal_y ?? 0.48;
  return {
    objectPosition: `${Math.round((x ?? fallbackX) * 100)}% ${Math.round((y ?? fallbackY) * 100)}%`,
  };
}

function canCrop(image) {
  return Boolean(image?.safe_to_crop && image?.allows_crop !== false);
}

function storyTopic(story) {
  const labels = [story?.topic_label, story?.primary_category, story?.category]
    .map((value) => String(value || '').trim())
    .filter((value) => value && !['other', 'unclassified', 'top story'].includes(value.toLowerCase()));
  return labels[0] || 'Today';
}

function storyDate(story) {
  return story?.occurred_at || story?.first_seen_at || '';
}

function storyRouteId(story) {
  return story?.__route_id || story?.cluster_id || story?.story_id || '';
}

function scopedStories(payload, scope) {
  const stories = Array.isArray(payload?.clusters)
    ? payload.clusters
    : Array.isArray(payload?.stories)
      ? payload.stories
      : [];
  return stories.map((story, index) => ({
    ...story,
    __route_id: `${scope}:${story.story_id || story.cluster_id || index + 1}`,
    __scope: scope,
  }));
}

const EVENT_TITLE_OVERRIDES = new Map([
  ['event_multiple-women-accuse-jared-leto-of-sexual-m_0c6248adc4', 'Jared Leto Misconduct Allegations'],
  ['event_sen-lindsey-graham-honored-at-funeral-servic_a603ee973f', 'Lindsey Graham Memorial'],
  ['event_trump-directs-signage-at-smithsonian-to-addr_10c62992ab', 'Smithsonian History Dispute'],
  ['event_search-underway-for-missing-north-carolina-w_91c1cb162b', 'North Carolina Traveler Missing in Grenada'],
  ['event_avalanche-on-broad-peak-leaves-renowned-clim_7fab36fdc8', 'Broad Peak Avalanche and Recovery'],
]);

function eventTitle(event) {
  const rawTitle = event?.presentation?.base_title
    || event?.canonical_title
    || event?.title
    || event?.topic_label
    || 'Tracked event';
  return EVENT_TITLE_OVERRIDES.get(event?.event_id) || rawTitle;
}

function eventCategory(event, relatedStory) {
  const rawCategory = relatedStory?.primary_category
    || relatedStory?.category
    || event?.primary_category
    || event?.category
    || event?.presentation?.primary_category
    || '';
  const aliases = {
    Business: 'Business & Economy',
    Economy: 'Business & Economy',
    Environment: 'Science & Environment',
    Science: 'Science & Environment',
    Technology: 'Technology & AI',
    International: 'World',
    Safety: 'Public Safety',
    Crime: 'Public Safety',
  };
  const normalizedRaw = aliases[rawCategory] || rawCategory;
  const subject = [
    eventTitle(event),
    event?.topic_label,
    event?.summary,
    eventLatestTitle(event),
    relatedStory?.title,
    relatedStory?.summary,
  ].filter(Boolean).join(' ').toLowerCase();
  const inferredRules = [
    ['Public Safety', /wildfire|evacuat|earthquake|avalanche|landslide|storm|typhoon|hurricane|shooting|explosion|plane crash|ferry|collision|missing person/],
    ['Health', /ebola|hospital|disease|outbreak|cancer|health|medical|vaccine|poisoning|recall/],
    ['Sports', /world cup|fifa|football|soccer|formula 1|grand prix|tournament|championship/],
    ['Technology & AI', /artificial intelligence|\bai\b|technology|cyber|semiconductor|software|social media|meta fined/],
    ['Science & Environment', /climate|environment|emissions|nuclear disarmament|research|space|nasa/],
    ['World', /ukraine|russia|gaza|israel|iran|war|military|missile|drone strike|border|migrant|diplomacy|sanctions/],
    ['Politics', /election|senate|congress|government|white house|president|prime minister|attorney general|supreme court|federal court|tariff/],
    ['Business & Economy', /business|economy|market|company|merger|interest rate|federal reserve|oil price|trade/],
    ['Culture', /film|music|actor|artist|museum|smithsonian|celebrity|television/],
  ];
  const inferred = inferredRules.find(([, pattern]) => pattern.test(subject))?.[0];
  if (inferred) return inferred;
  if (normalizedRaw && !['Other', 'Unclassified', 'Ongoing coverage'].includes(normalizedRaw)) {
    return normalizedRaw;
  }
  return 'World';
}

function eventDevelopmentCount(event) {
  return event?.presentation?.development_count || event?.timeline?.length || 0;
}

function eventLatestDate(event) {
  return event?.presentation?.latest_date
    || event?.last_seen_at
    || event?.timeline?.at(-1)?.date
    || '';
}

function eventLatestTitle(event) {
  return event?.presentation?.latest_update_title
    || event?.latest_title
    || event?.timeline?.at(-1)?.title
    || 'A new development is available';
}

function eventSituation(event) {
  return conciseSummary(
    event?.event_overview?.summary
      || event?.event_summary?.summary
      || event?.summary
      || event?.presentation?.context_summary
      || '',
    1,
  );
}

function eventLatestSummary(event, relatedStory) {
  return conciseSummary(
    relatedStory?.summary
      || event?.latest_summary
      || event?.timeline?.at(-1)?.summary
      || eventLatestTitle(event),
    1,
  );
}

function dateDistanceInDays(laterValue, earlierValue) {
  const later = new Date(`${String(laterValue || '').slice(0, 10)}T12:00:00`);
  const earlier = new Date(`${String(earlierValue || '').slice(0, 10)}T12:00:00`);
  if (Number.isNaN(later.getTime()) || Number.isNaN(earlier.getTime())) return 0;
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 86400000));
}

function eventBriefingScore(event, latestAvailableDate, hasRelatedStory, isStoryline) {
  const age = dateDistanceInDays(latestAvailableDate, eventLatestDate(event));
  const editorialRank = Number(event?.presentation?.rank_score || 0);
  const developments = Math.min(12, eventDevelopmentCount(event));
  const independentSources = Math.min(
    20,
    Number(event?.presentation?.independent_source_count || event?.presentation?.source_count || 0),
  );
  return (editorialRank * 60)
    + (developments * 3)
    + (independentSources * 1.5)
    + (Math.max(0, 7 - age) * 2)
    + (hasRelatedStory ? 4 : 0)
    + (isStoryline ? 12 : 0);
}

const EVENT_TITLE_NOISE = new Set([
  'a', 'an', 'and', 'event', 'events', 'the', 'of', 'in', 'for',
  'war', 'conflict', 'crisis', 'emergency', '2026',
]);

function comparableEventTokens(event) {
  return new Set(
    eventTitle(event)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .map((token) => (token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token))
      .filter((token) => token && !EVENT_TITLE_NOISE.has(token)),
  );
}

function eventsShareSubject(left, right) {
  const leftTitle = eventTitle(left).trim().toLowerCase();
  const rightTitle = eventTitle(right).trim().toLowerCase();
  if (leftTitle === rightTitle) return true;
  const leftTokens = comparableEventTokens(left);
  const rightTokens = comparableEventTokens(right);
  if (!leftTokens.size || !rightTokens.size) return false;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / Math.min(leftTokens.size, rightTokens.size) >= .66;
}

function deduplicateEvents(events) {
  return events.reduce((kept, event) => (
    kept.some((candidate) => eventsShareSubject(candidate, event)) ? kept : [...kept, event]
  ), []);
}

function splitSentences(value = '') {
  const protectedText = String(value)
    .replace(/(\d)\.(\d)/g, '$1∯$2')
    .replace(
      /\b(?:Mr|Mrs|Ms|Dr|Sen|Rep|Gov|Gen|Prof|St|U\.S)\./g,
      (abbreviation) => abbreviation.replaceAll('.', '∯'),
    );
  return (protectedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((sentence) => sentence.replaceAll('∯', '.').trim());
}

function conciseSummary(value = '', sentenceLimit = 2) {
  const sentences = splitSentences(value);
  return sentences.slice(0, sentenceLimit).join(' ').trim() || value;
}

function weeklySnapshotStory(story, edition) {
  const sources = Array.isArray(story?.sources) ? story.sources : [];
  return {
    ...story,
    cluster_id: story.story_id,
    occurred_at: story.edition_date,
    primary_category: story.category,
    canonical_topic_label: story.topic_label,
    items: sources.map((source) => ({
      title: source.title,
      source: source.publisher,
      link: source.url,
    })),
    sources: sources.map((source) => source.publisher).filter(Boolean),
    story_report: {
      summary: story.summary,
      source_urls: sources.map((source) => source.url).filter(Boolean),
    },
    __route_id: story.story_id,
    __scope: `weekly-${edition}`,
  };
}

function weeklySnapshotEvent(event, edition) {
  const timeline = [...(event?.prior_context || []), ...(event?.week_developments || [])]
    .map((entry) => ({
      ...entry,
      daily_story_id: entry.development_id,
      source_details: (entry.sources || []).map((source) => ({
        title: source.title,
        source: source.publisher,
        link: source.url,
      })),
    }));
  return {
    ...event,
    topic_label: event.title,
    canonical_title: event.title,
    timeline,
    latest_summary: timeline.at(-1)?.summary || event.summary,
    presentation: {
      base_title: event.title,
      has_full_timeline: true,
      rank_score: event.rank_score || 0,
      source_count: event.source_count || 0,
    },
    __scope: `weekly-${edition}`,
  };
}

function weeklyReaderSnapshot(issue) {
  const snapshot = issue?.reader_snapshot || {};
  const edition = issue?.edition_id || '';
  return {
    stories: (Array.isArray(snapshot.stories) ? snapshot.stories : [])
      .map((story) => weeklySnapshotStory(story, edition)),
    events: (Array.isArray(snapshot.events) ? snapshot.events : [])
      .map((event) => weeklySnapshotEvent(event, edition)),
  };
}

function adaptiveSummaryParagraphs(value = '') {
  const text = String(value || '').trim();
  const sentences = splitSentences(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 85 || sentences.length < 3) return text ? [text] : [];

  const target = Math.ceil(wordCount / 2);
  let runningWords = 0;
  let splitIndex = 1;
  for (let index = 0; index < sentences.length - 1; index += 1) {
    runningWords += sentences[index].split(/\s+/).filter(Boolean).length;
    splitIndex = index + 1;
    if (runningWords >= target) break;
  }
  return [
    sentences.slice(0, splitIndex).join(' '),
    sentences.slice(splitIndex).join(' '),
  ].filter(Boolean);
}

function latestContextDate(story) {
  const dates = (story?.story_context?.highlights || [])
    .map((item) => item.date || item.first_seen_at)
    .filter(Boolean)
    .sort();
  return dates.at(-1) || storyDate(story);
}

function normalizeOverviewLabel(value = '') {
  return String(value)
    .replace(/\bpurpos$/i, 'purpose')
    .replace(/\bUnited St$/i, 'United States');
}

function sourceList(story) {
  const values = Array.isArray(story?.sources) && story.sources.length
    ? story.sources.map((source) => cleanSourceName(source))
    : (story?.items || []).map((item) => cleanSourceName(item.source, item.link || item.url));
  return [...new Set(values.filter(Boolean))];
}

function sourceCount(story) {
  return sourceList(story).length || story?.source_count || 1;
}

function developmentSourceCount(event, relatedStory) {
  if (relatedStory) {
    return Number(relatedStory.source_count || sourceList(relatedStory).length || 0);
  }
  const latest = event?.timeline?.at(-1);
  return Number(
    latest?.source_count
      || latest?.source_details?.length
      || latest?.source_urls?.length
      || latest?.sources?.length
      || 0,
  );
}

function AppLink({
  view,
  sid,
  eventId,
  mode,
  topic,
  edition,
  archiveDate,
  days,
  from,
  hash,
  onNavigate,
  children,
  className = '',
  ...props
}) {
  const href = routeHref(view, {
    sid,
    eventId,
    mode,
    topic,
    edition,
    archiveDate,
    days,
    from,
    hash,
  });
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (
          event.defaultPrevented
          || event.button !== 0
          || event.metaKey
          || event.ctrlKey
          || event.shiftKey
          || event.altKey
        ) return;
        event.preventDefault();
        onNavigate(view, {
          sid,
          eventId,
          mode,
          topic,
          edition,
          archiveDate,
          days,
          from,
          hash,
        });
      }}
      {...props}
    >
      {children}
    </a>
  );
}

function SourceMarks({ story, limit = 4, compact = false }) {
  const allSources = [...new Set(sourceList(story))];
  const sources = allSources.slice(0, limit);
  return (
    <div className={`source-marks${compact ? ' is-compact' : ''}`}>
      <div className="source-mark-stack" aria-label={`Sources include ${allSources.join(', ')}`}>
        {sources.map((source) => {
          const logo = sourceLogoPath(source);
          return (
            <span className="source-mark" key={source} title={cleanSourceName(source)}>
              {logo
                ? <img src={logo} alt="" />
                : <span>{cleanSourceName(source).slice(0, 2).toUpperCase()}</span>}
            </span>
          );
        })}
      </div>
      <strong>{sourceCount(story)} source{sourceCount(story) === 1 ? '' : 's'}</strong>
    </div>
  );
}

function StoryImage({
  story,
  className = '',
  role = 'wide',
  eager = false,
  showRole = true,
}) {
  const src = storyImage(story);
  if (!src) return <div className={`story-image is-empty ${className}`} aria-hidden="true" />;
  return (
    <div className={`story-image ${canCrop(story.image) ? 'may-crop' : 'preserve'} ${className}`}>
      <img
        src={src}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        style={imagePresentation(story.image, role)}
      />
      {showRole && story.image?.image_role_label ? (
        <span className="image-role">{story.image.image_role_label}</span>
      ) : null}
    </div>
  );
}

function QuickReadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.5 4.5h9l4 4v11h-13z" />
      <path d="M14.5 4.5v4h4M8.5 12h7M8.5 15.5h5" />
    </svg>
  );
}

function useFloatingPreview({
  anchorSelector,
  popupSelector,
  preferredWidth = 520,
  closeDelay = 140,
}) {
  const [previewStyle, setPreviewStyle] = useState(undefined);
  const closeTimer = useRef(undefined);
  const triggerRef = useRef(undefined);
  const suppressNextFocusOpen = useRef(false);
  const keepPreviewOpen = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };
  const openPreview = (interaction) => {
    if (interaction.type === 'focus' && suppressNextFocusOpen.current) {
      suppressNextFocusOpen.current = false;
      return;
    }
    keepPreviewOpen();
    if (interaction.type === 'focus' || interaction.type === 'click') {
      triggerRef.current = interaction.currentTarget;
    }
    const anchor = interaction.currentTarget.closest(anchorSelector) || interaction.currentTarget;
    setPreviewStyle(floatingEventPreviewStyle(anchor, preferredWidth));
  };
  const requestPreviewClose = () => {
    keepPreviewOpen();
    closeTimer.current = window.setTimeout(() => setPreviewStyle(undefined), closeDelay);
  };
  const closePreview = ({ restoreFocus = false } = {}) => {
    keepPreviewOpen();
    setPreviewStyle(undefined);
    if (restoreFocus) {
      suppressNextFocusOpen.current = true;
      window.requestAnimationFrame(() => triggerRef.current?.focus?.());
    }
  };
  const dismissPreview = () => closePreview({ restoreFocus: true });

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);
  useEffect(() => {
    if (!previewStyle) return undefined;
    const handleKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismissPreview();
    };
    const handlePointer = (event) => {
      if (event.target.closest?.(`${popupSelector}, ${anchorSelector}`)) return;
      closePreview();
    };
    const handleScroll = (event) => {
      if (event.target?.closest?.(popupSelector)) return;
      closePreview();
    };
    const handleResize = () => closePreview();
    window.addEventListener('keydown', handleKey);
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [previewStyle]);

  return {
    previewStyle,
    openPreview,
    keepPreviewOpen,
    requestPreviewClose,
    closePreview,
    dismissPreview,
  };
}

function StoryQuickRead({ story }) {
  const {
    previewStyle,
    openPreview,
    keepPreviewOpen,
    requestPreviewClose,
    dismissPreview,
  } = useFloatingPreview({
    anchorSelector: '.story-quick-read',
    popupSelector: '.story-quick-read-popover',
    preferredWidth: 440,
    closeDelay: 120,
  });
  return (
    <div className={`story-quick-read${previewStyle ? ' is-open' : ''}`}>
      <button
        type="button"
        className="story-quick-read-button"
        aria-expanded={Boolean(previewStyle)}
        aria-label={`Quick read: ${story.title}`}
        title="Quick read"
        onClick={openPreview}
        onMouseEnter={openPreview}
        onMouseLeave={requestPreviewClose}
        onFocus={openPreview}
        onBlur={requestPreviewClose}
      >
        <QuickReadIcon />
      </button>
      {previewStyle ? (
        <div
          className="story-quick-read-popover"
          style={previewStyle}
          role="dialog"
          aria-label={`Quick read: ${story.title}`}
          onMouseEnter={keepPreviewOpen}
          onMouseLeave={requestPreviewClose}
          onFocus={keepPreviewOpen}
          onBlur={requestPreviewClose}
        >
          <button type="button" className="story-quick-read-close" onClick={dismissPreview} aria-label="Close quick read" title="Close">×</button>
          <span>{storyTopic(story)}</span>
          <h3>{story.title}</h3>
          <p>{conciseSummary(story.summary || story.story_report?.summary, 2)}</p>
        </div>
      ) : null}
    </div>
  );
}

function Header({ view, from, onNavigate }) {
  const returningToCatchup = from === 'catch-up' && (view === 'story' || view === 'event');
  const todayActive = view === 'today' || view === 'catch-up' || view === 'story' || view === 'archive' || returningToCatchup;
  // const digestActive = view === 'digest'; // Digest navigation is temporarily disabled.
  const eventsActive = view === 'events' || (view === 'event' && !returningToCatchup);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <AppLink view="today" onNavigate={onNavigate} className="wordmark" aria-label="Muninn Digests">
          <img src="/brand/muninn-mark.svg" alt="" />
          <span>
            <strong>Muninn</strong>
            <small>News, Simplified.</small>
          </span>
        </AppLink>
        <nav className="primary-nav" aria-label="Primary navigation">
          <AppLink
            view="today"
            onNavigate={onNavigate}
            className={todayActive ? 'is-active' : ''}
            aria-current={todayActive ? 'page' : undefined}
          >
            Digests
          </AppLink>
          {/*
          <AppLink
            view="digest"
            onNavigate={onNavigate}
            className={digestActive ? 'is-active' : ''}
            aria-current={digestActive ? 'page' : undefined}
          >
            Digest
          </AppLink>
          */}
          <AppLink
            view="events"
            onNavigate={onNavigate}
            className={eventsActive ? 'is-active' : ''}
            aria-current={eventsActive ? 'page' : undefined}
          >
            Timelines
          </AppLink>
          <AppLink
            view="weekly"
            onNavigate={onNavigate}
            className={view === 'weekly' ? 'is-active' : ''}
            aria-current={view === 'weekly' ? 'page' : undefined}
          >
            Weekly
          </AppLink>
          <AppLink
            view="my-news"
            onNavigate={onNavigate}
            className={`nav-my-news${view === 'my-news' ? ' is-active' : ''}`}
            aria-current={view === 'my-news' ? 'page' : undefined}
          >
            <span>My News</span>
            <small>Preview</small>
          </AppLink>
        </nav>
      </div>
    </header>
  );
}

function LeadStory({ story, onNavigate, briefingMode = 'latest', briefingDays }) {
  const isCatchup = briefingMode === 'catch-up';
  const update = storyUpdateLabel(story);
  const destination = isCatchup
    ? catchupDestination(story, briefingDays)
    : { view: 'story', sid: storyRouteId(story) };
  return (
    <article className={`lead-story${update ? ' is-update' : ''}`}>
      <AppLink
        {...destination}
        onNavigate={onNavigate}
        className="lead-story-link"
        aria-label={`${isCatchup ? 'Catch up on' : 'Read'} ${story.title}`}
      >
        <div className="lead-story-media">
          <StoryImage
            story={story}
            className="lead-story-image"
            role="lead"
            eager
            showRole={false}
          />
          <div className="lead-story-shade" />
          <div className="lead-story-copy">
            <div className={`story-kicker-row${update ? ' is-update' : ''}`}>
              <span>
                {update ? <span className="today-update-dot" aria-label="Updated" data-tooltip="Updated" /> : null}
                {update || storyTopic(story)}
              </span>
            </div>
            <h2>{story.title}</h2>
            <TodayDevelopmentCount story={story} />
            <SourceMarks story={story} limit={3} />
          </div>
        </div>
      </AppLink>
      <StoryQuickRead story={story} />
    </article>
  );
}

function storyUpdateLabel(story) {
  const context = story?.story_context || {};
  if (!context.available || (context.development_count || context.highlights?.length || 0) < 2) return '';
  const eventLabel = context.event_title || context.display_title || '';
  return eventLabel && eventLabel.length <= 48 ? eventLabel : storyTopic(story);
}

function SupportingStory({ story, onNavigate, briefingMode = 'latest', briefingDays }) {
  const isCatchup = briefingMode === 'catch-up';
  const update = storyUpdateLabel(story);
  const destination = isCatchup
    ? catchupDestination(story, briefingDays)
    : { view: 'story', sid: storyRouteId(story) };
  return (
    <article className={`support-story${update ? ' is-update' : ''}`}>
      <AppLink
        {...destination}
        onNavigate={onNavigate}
        className="support-story-link"
        aria-label={`${isCatchup ? 'Catch up on' : 'Read'} ${story.title}`}
      >
          <div className="support-story-copy">
            <div className={`story-kicker-row${update ? ' is-update' : ''}`}>
              <span>
                {update ? <span className="today-update-dot" aria-label="Updated" data-tooltip="Updated" /> : null}
                {update || storyTopic(story)}
              </span>
          </div>
          <h2>{story.title}</h2>
          <TodayDevelopmentCount story={story} />
          <SourceMarks story={story} compact limit={3} />
        </div>
        <StoryImage story={story} className="support-story-image" role="support" />
      </AppLink>
      <StoryQuickRead story={story} />
    </article>
  );
}

function VisualStory({ story, onNavigate, briefingMode = 'latest', briefingDays }) {
  const isCatchup = briefingMode === 'catch-up';
  const update = storyUpdateLabel(story);
  const destination = isCatchup
    ? catchupDestination(story, briefingDays)
    : { view: 'story', sid: storyRouteId(story) };
  return (
    <article className={`today-visual-story${update ? ' is-update' : ''}`}>
      <AppLink
        {...destination}
        onNavigate={onNavigate}
        className="today-visual-story-link"
        aria-label={`${isCatchup ? 'Catch up on' : 'Read'} ${story.title}`}
      >
        <div className="today-visual-copy">
          <span className={`today-story-label${update ? ' is-update' : ''}`}>
            {update ? <span className="today-update-dot" aria-label="Updated" data-tooltip="Updated" /> : null}
            {storyTopic(story)}
          </span>
          <h3>{story.title}</h3>
          <TodayDevelopmentCount story={story} />
          <SourceMarks story={story} compact limit={3} />
        </div>
        <StoryImage story={story} className="today-visual-image" role="standard" showRole={false} />
      </AppLink>
      <StoryQuickRead story={story} />
    </article>
  );
}

function HeadlineStory({ story, onNavigate, briefingMode = 'latest', briefingDays }) {
  const isCatchup = briefingMode === 'catch-up';
  const update = storyUpdateLabel(story);
  const destination = isCatchup
    ? catchupDestination(story, briefingDays)
    : { view: 'story', sid: storyRouteId(story) };
  return (
    <article className={`today-headline-story${update ? ' is-update' : ''}`}>
      <AppLink
        {...destination}
        onNavigate={onNavigate}
        aria-label={`${isCatchup ? 'Catch up on' : 'Read'} ${story.title}`}
      >
        <span className={`today-story-label${update ? ' is-update' : ''}`}>
          {update ? <span className="today-update-dot" aria-label="Updated" data-tooltip="Updated" /> : null}
          {storyTopic(story)}
        </span>
        <h3>{story.title}</h3>
        <TodayDevelopmentCount story={story} />
      </AppLink>
      <StoryQuickRead story={story} />
    </article>
  );
}

function groupTodayStories(stories) {
  const grouped = [];
  const representativeByEvent = new Map();
  stories.forEach((story) => {
    if (!story?.event_id) {
      grouped.push({ ...story, __today_development_count: 1 });
      return;
    }
    const representative = representativeByEvent.get(story.event_id);
    if (representative) {
      representative.__today_development_count += 1;
      representative.__today_developments.push(story);
      return;
    }
    const groupedStory = {
      ...story,
      __today_development_count: 1,
      __today_developments: [story],
    };
    representativeByEvent.set(story.event_id, groupedStory);
    grouped.push(groupedStory);
  });
  return grouped;
}

function TodayDevelopmentCount({ story }) {
  const count = Number(story?.__today_development_count || story?.__catchup_development_count || 0);
  if (count < 2) return null;
  return (
    <span className="today-development-count">
      {count} developments{story?.__catchup_development_count ? '' : ' today'}
    </span>
  );
}

function TodayModeNavigation({
  mode,
  days = CATCHUP_DEFAULT_DAYS,
  contextLabel = '',
  onNavigate,
}) {
  const selectedDays = clampCatchupDays(days);
  const tabs = mode === 'catch-up'
    ? [
      { key: 'catch-up', view: 'catch-up', label: 'Catch-Up' },
      { key: 'latest', view: 'today', label: 'Latest News' },
    ]
    : [
      { key: 'latest', view: 'today', label: 'Latest News' },
      { key: 'catch-up', view: 'catch-up', label: 'Catch-Up' },
    ];
  return (
    <section className="today-mode-navigation" aria-label="Choose a digest">
      <nav className="today-mode-tabs" aria-label="Digest views">
        {tabs.map((tab) => (
          <AppLink
            view={tab.view}
            onNavigate={onNavigate}
            className={mode === tab.key ? 'is-active' : ''}
            aria-current={mode === tab.key ? 'page' : undefined}
            data-hint={mode === tab.key ? 'Current view' : `Switch to ${tab.label}`}
            key={tab.key}
          >
            {mode === tab.key ? <h1>{tab.label}</h1> : <span>{tab.label}</span>}
          </AppLink>
        ))}
      </nav>
      <div className="today-mode-context">
        {mode === 'catch-up' ? (
          <div className="today-mode-days" aria-label="Days of missed news">
            <label htmlFor="catchup-days">
              <span>Catch up on</span>
              <strong>{selectedDays} days</strong>
            </label>
            <div className="catchup-days-slider">
              <span>2</span>
              <input
                id="catchup-days"
                type="range"
                min={CATCHUP_MIN_DAYS}
                max={CATCHUP_MAX_DAYS}
                step="1"
                value={selectedDays}
                aria-valuetext={`${selectedDays} days of news`}
                onChange={(event) => onNavigate('catch-up', { days: Number(event.target.value), replace: true })}
              />
              <span>5</span>
            </div>
            {contextLabel ? <p>{contextLabel}</p> : null}
          </div>
        ) : null}
        {mode !== 'catch-up' && contextLabel ? <p>{contextLabel}</p> : null}
      </div>
    </section>
  );
}

function TodayStoryFeed({ stories, onNavigate, briefingMode = 'latest', briefingDays }) {
  const opening = stories.slice(0, 4);
  const visualStories = stories.slice(4, 10);
  const headlineStories = stories.slice(10);
  const displayedHeadlineStories = headlineStories.length % 3 === 1
    ? headlineStories.slice(0, -1)
    : headlineStories;
  return (
    <>
      {opening.length ? (
        <section className="opening-stories" aria-label="Top stories">
          <LeadStory story={opening[0]} onNavigate={onNavigate} briefingMode={briefingMode} briefingDays={briefingDays} />
          <div className="supporting-stories">
            {opening.slice(1).map((story) => (
              <SupportingStory
                key={storyRouteId(story)}
                story={story}
                onNavigate={onNavigate}
                briefingMode={briefingMode}
                briefingDays={briefingDays}
              />
            ))}
          </div>
        </section>
      ) : null}

      {visualStories.length ? (
        <section className="today-visual-grid" aria-label="More ranked news">
          {visualStories.map((story) => (
            <VisualStory
              key={storyRouteId(story)}
              story={story}
              onNavigate={onNavigate}
              briefingMode={briefingMode}
              briefingDays={briefingDays}
            />
          ))}
        </section>
      ) : null}

      {displayedHeadlineStories.length ? (
        <section className="today-headline-grid" aria-label="More headlines">
          {displayedHeadlineStories.map((story) => (
            <HeadlineStory
              key={storyRouteId(story)}
              story={story}
              onNavigate={onNavigate}
              briefingMode={briefingMode}
              briefingDays={briefingDays}
            />
          ))}
        </section>
      ) : null}

      <section className="caught-up" aria-label="End of today's briefing">
        <img src="/brand/muninn-mark.svg" alt="" />
        <div>
          <h2>You’re caught up</h2>
          <p>Follow developing stories in Timelines or browse previous weekly newsletters. These stories—and others—will be brought together in the next weekly edition, published Saturday.</p>
          <AppLink view="archive" onNavigate={onNavigate}>Browse previous editions →</AppLink>
        </div>
      </section>
    </>
  );
}

function TodayView({ digest, onNavigate }) {
  const rawStories = Array.isArray(digest?.clusters) ? digest.clusters : [];
  const stories = groupTodayStories(rawStories);
  const edition = editionTimestamp(digest?.briefing?.as_of || digest?.generated_at);
  return (
    <main id="main" className="page-shell today-page">
      <TodayModeNavigation
        mode="latest"
        contextLabel={`${edition.weekday}, ${edition.date}`}
        onNavigate={onNavigate}
      />
      <TodayStoryFeed stories={stories} onNavigate={onNavigate} />
    </main>
  );
}

function catchupEditions(catchup) {
  return (Array.isArray(catchup?.days) ? catchup.days : []).map((edition) => ({
    date: edition.date,
    stories: scopedStories(edition, `catchup-${edition.date}`),
  }));
}

function catchupRangeLabel(referenceDate, days) {
  if (!referenceDate) return `the last ${days} days`;
  const end = new Date(`${referenceDate}T12:00:00Z`);
  if (Number.isNaN(end.getTime())) return `the last ${days} days`;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startValue = start.toISOString().slice(0, 10);
  return `${formatDate(startValue, { short: true, year: false })}–${formatDate(referenceDate, { short: true, year: false })}`;
}

function catchupDestination(group, days) {
  return {
    view: 'story',
    sid: storyRouteId(group),
    from: 'catch-up',
    days: clampCatchupDays(days),
  };
}

function CatchupView({ catchup, days, onNavigate }) {
  const editions = useMemo(() => catchupEditions(catchup), [catchup]);
  const briefing = useMemo(() => buildCatchupBriefing(editions, { days }), [days, editions]);
  const { availableDays, referenceDate, days: selectedDays } = briefing;
  const rangeLabel = catchupRangeLabel(referenceDate, selectedDays);

  return (
    <main id="main" className="page-shell today-page catchup-page">
      <TodayModeNavigation
        mode="catch-up"
        days={selectedDays}
        contextLabel={rangeLabel}
        onNavigate={onNavigate}
      />
      {availableDays < selectedDays ? (
        <p className="catchup-availability-note" role="status">
          {availableDays} daily {availableDays === 1 ? 'edition is' : 'editions are'} currently available in this preview.
        </p>
      ) : null}

      {briefing.groups.length ? (
        <TodayStoryFeed
          stories={briefing.groups}
          briefingMode="catch-up"
          briefingDays={selectedDays}
          onNavigate={onNavigate}
        />
      ) : (
        <section className="catchup-empty">
          <h2>No daily editions are available yet.</h2>
          <p>Try Today, or return when the next archive update is published.</p>
        </section>
      )}
    </main>
  );
}

function TimelineMarker({ event, currentStory, onNavigate }) {
  if (!event) return null;
  const entries = (event.timeline || []).slice(-3);
  const displayTitle = event.presentation?.base_title
    || event.topic_label
    || event.canonical_title
    || event.title;
  return (
    <section className="story-event-marker" aria-label={`Part of ${displayTitle}`}>
      <AppLink
        view="event"
        eventId={event.event_id}
        sid={currentStory.story_id}
        onNavigate={onNavigate}
        className="event-marker-title"
      >
        <span>Part of an ongoing timeline</span>
        <strong>{displayTitle}</strong>
        <b aria-hidden="true">View event →</b>
      </AppLink>
      <div className="mini-timeline">
        {entries.map((entry) => {
          const current = entry.daily_story_id === currentStory.story_id
            || entry.development_id === currentStory.story_id;
          return (
            <div className={current ? 'is-current' : ''} key={entry.development_id || entry.title}>
              <i aria-hidden="true" />
              <span>{current ? 'Current story' : formatDate(entry.date, { short: true, year: false })}</span>
              <strong>{entry.title}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function reportSections(story) {
  const composed = story?.story_report?.status === 'complete'
    && Array.isArray(story.story_report.sections)
    ? story.story_report.sections
    : [];
  if (composed.length) {
    return composed.map((section, index) => ({
      id: `${section.role || 'section'}-${index + 1}`,
      questionId: section.question_id || section.lens_id || '',
      heading: section.heading,
      body: section.body,
      role: section.role || 'background',
      evidenceIds: section.evidence_ids || [],
    }));
  }
  return (Array.isArray(story?.explore_lenses) ? story.explore_lenses : []).map((lens, index) => ({
    id: lens.id || `section-${index + 1}`,
    questionId: lens.id || '',
    heading: lens.title || lens.label,
    body: lens.summary,
    role: 'background',
    evidenceIds: [],
  }));
}

function unresolvedReportItems(story) {
  const composed = story?.story_report?.status === 'complete'
    && Array.isArray(story.story_report.unresolved)
    ? story.story_report.unresolved
    : [];
  if (composed.length) {
    return composed.map((item) => item.text).filter(Boolean);
  }
  return (Array.isArray(story?.explore_lenses) ? story.explore_lenses : [])
    .map((lens) => lens.uncertainty_note)
    .filter(Boolean);
}

function storyQuestions(story) {
  const lenses = Array.isArray(story?.explore_lenses) ? story.explore_lenses.slice(0, 5) : [];
  const sections = reportSections(story);
  const usedSectionIds = new Set();

  return lenses.map((lens, index) => {
    const evidencePrefix = `lens-${index + 1}-`;
    let section = sections.find(
      (candidate) => candidate.questionId && candidate.questionId === lens.id,
    );
    if (!section) {
      section = sections.find(
        (candidate) => !usedSectionIds.has(candidate.id)
          && candidate.evidenceIds.some((evidenceId) => String(evidenceId).startsWith(evidencePrefix)),
      );
    }
    if (!section && sections[index] && !usedSectionIds.has(sections[index].id)) {
      section = sections[index];
    }
    if (section) usedSectionIds.add(section.id);

    const previewSource = lens.summary || section?.body || lens.title || lens.label;
    return {
      id: lens.id || `question-${index + 1}`,
      label: lens.label || lens.title || section?.heading || 'What else should I know?',
      preview: conciseSummary(previewSource, 1),
      answer: section?.body || lens.summary || '',
      sources: Array.isArray(lens.sources) ? lens.sources : [],
    };
  }).filter((question) => question.preview || question.answer);
}

const QUESTION_LABEL_STOP_WORDS = new Set([
  'about', 'after', 'does', 'from', 'have', 'into', 'known', 'next', 'that', 'this',
  'what', 'when', 'where', 'which', 'while', 'with', 'would',
]);

function questionCoversUnknown(note, questions) {
  const noteTokens = new Set(String(note || '').toLowerCase().match(/[a-z]{5,}/g) || []);
  return questions.some((question) => {
    const labelTokens = String(question.label || '').toLowerCase().match(/[a-z]{5,}/g) || [];
    return labelTokens.some(
      (token) => !QUESTION_LABEL_STOP_WORDS.has(token) && noteTokens.has(token),
    );
  });
}

function QuestionSourceLine({ sources }) {
  if (!sources.length) return null;
  const visible = sources.slice(0, 3);
  return (
    <div className="question-source-line" aria-label="Sources supporting this answer">
      <span>Sources</span>
      <div>
        {visible.map((source) => (
          <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
            {cleanSourceName(source.publisher || source.title, source.url)}
          </a>
        ))}
        {sources.length > visible.length ? <em>+{sources.length - visible.length} more</em> : null}
      </div>
    </div>
  );
}

function digestUpdateTime(value, timezone = 'America/New_York') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return '';
  }
}

function digestStoryArchiveDate(item, briefing) {
  const editionDate = item?.edition_date || '';
  const currentDate = briefing?.coverage_window?.end_date || '';
  return editionDate && currentDate && editionDate !== currentDate ? editionDate : '';
}

function DigestParagraph({ paragraph, itemByStoryId, briefing, onNavigate }) {
  const segments = (paragraph?.segments || []).map((segment) => ({ ...segment }));
  segments.forEach((segment, index) => {
    if (!index) return;
    const previous = String(segments[index - 1].text || '');
    let current = String(segment.text || '');
    if (!previous || !current || /\s$/.test(previous) || /^\s/.test(current)) return;
    if (/^[.,!?;:][A-Za-z0-9]/.test(current)) current = `${current[0]} ${current.slice(1)}`;
    if (/[A-Za-z0-9.,!?;:]$/.test(previous) && /^[A-Za-z0-9]/.test(current)) current = ` ${current}`;
    segment.text = current;
  });
  return (
    <p>
      {segments.map((segment, index) => {
        const key = `${segment.kind || 'text'}-${segment.story_id || segment.event_id || index}-${index}`;
        if (segment.kind === 'story' && segment.story_id) {
          const item = itemByStoryId.get(segment.story_id);
          return (
            <AppLink
              view="story"
              sid={segment.story_id}
              archiveDate={digestStoryArchiveDate(item, briefing)}
              onNavigate={onNavigate}
              key={key}
            >
              {segment.text}
            </AppLink>
          );
        }
        if (segment.kind === 'event' && segment.event_id) {
          return (
            <AppLink view="event" eventId={segment.event_id} onNavigate={onNavigate} key={key}>
              {segment.text}
            </AppLink>
          );
        }
        if (/^https?:\/\//i.test(segment.href || '')) {
          return <a href={segment.href} target="_blank" rel="noreferrer" key={key}>{segment.text}</a>;
        }
        return <React.Fragment key={key}>{segment.text}</React.Fragment>;
      })}
    </p>
  );
}

function DigestImage({ story, item, briefing, onNavigate, supporting = false }) {
  const src = storyImage(story);
  if (!src) return null;
  const image = story.image || {};
  const credit = [...new Set([image.source, image.author].filter(Boolean))].join(' · ');
  const alt = image.is_ai_generated
    ? `Editorial illustration for ${story.title}`
    : (image.alt || story.title || '');
  return (
    <figure className={`digest-image${supporting ? ' is-supporting' : ' is-lead'}`}>
      <AppLink
        view="story"
        sid={item?.story_id || story.story_id || story.cluster_id}
        archiveDate={digestStoryArchiveDate(item, briefing)}
        onNavigate={onNavigate}
        aria-label={`Read ${story.title}`}
      >
        <img
          src={src}
          alt={alt}
          loading={supporting ? 'lazy' : 'eager'}
          style={imagePresentation(image, supporting ? 'support' : 'lead')}
        />
      </AppLink>
      <figcaption>
        {supporting ? <strong>{story.title}</strong> : null}
        {credit ? <span>{credit}</span> : null}
      </figcaption>
    </figure>
  );
}

const DIGEST_CHANGE_STATUSES = new Set(['narrowed', 'escalated', 'continued', 'new', 'eased']);

function digestChangeFallbackStatus(item, story) {
  const copy = `${story?.title || item?.title || ''} ${item?.text || story?.summary || ''}`.toLowerCase();
  if (/reject|declin|impasse|stall|block|halt/.test(copy)) return 'narrowed';
  if (item?.recency_role === 'continuing_today') return 'continued';
  if (/escalat|evacuat|surge|rise|rises|wildfire|state of emergency/.test(copy)) return 'escalated';
  return item?.recency_role === 'new_today' ? 'new' : 'continued';
}

function digestChangeFallbackText(item, story) {
  const copy = String(item?.text || story?.summary || '').split(/\s+Earlier context:/i)[0].trim();
  const sentence = copy.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || copy;
  return sentence.length > 220 ? `${sentence.slice(0, 217).trimEnd()}…` : sentence;
}

function digestLeadChanges(briefing, selected) {
  const selectedById = new Map(selected.map((entry) => [entry.item.story_id, entry]));
  const supplied = Array.isArray(briefing?.changes) ? briefing.changes : [];
  const changes = supplied.slice(0, 3).map((change) => {
    const entry = selectedById.get(change?.story_id);
    const status = String(change?.status || '').toLowerCase();
    if (!entry || !DIGEST_CHANGE_STATUSES.has(status) || !change?.topic || !change?.text) return null;
    return { ...entry, status, topic: change.topic, text: change.text };
  }).filter(Boolean);
  if (changes.length === 3) return changes;

  return selected.slice(0, 3).map(({ item, story }) => ({
    item,
    story,
    status: digestChangeFallbackStatus(item, story),
    topic: story.topic_label || story.canonical_topic_label || story.title || item.title,
    text: digestChangeFallbackText(item, story),
  }));
}

function DigestView({ digest, stories, onNavigate }) {
  const briefing = digest?.briefing && typeof digest.briefing === 'object'
    ? digest.briefing
    : null;
  const edition = editionTimestamp(briefing?.as_of || digest?.generated_at);
  const timezone = briefing?.coverage_window?.timezone || 'America/New_York';
  const updateTime = digestUpdateTime(briefing?.as_of || digest?.generated_at, timezone);
  const items = Array.isArray(briefing?.items) ? briefing.items : [];
  const itemByStoryId = new Map(items.map((item) => [item.story_id, item]));
  const storyById = new Map();
  (stories || []).forEach((story) => {
    if (story?.story_id) storyById.set(story.story_id, story);
    if (story?.cluster_id) storyById.set(story.cluster_id, story);
  });
  const selected = items
    .map((item) => ({ item, story: storyById.get(item.story_id) }))
    .filter(({ story }) => story);
  const visualStories = selected.filter(({ story }) => storyImage(story));
  const leadVisual = visualStories[0] || null;
  const supportingVisual = visualStories.find(
    ({ item }) => item.story_id !== leadVisual?.item?.story_id,
  ) || null;
  const leadChanges = digestLeadChanges(briefing, selected);
  const paragraphs = Array.isArray(briefing?.paragraphs) && briefing.paragraphs.length
    ? briefing.paragraphs
    : items.slice(0, 6).map((item) => ({
      segments: [{ text: item.text || item.title, kind: 'story', story_id: item.story_id }],
    }));

  return (
    <main id="main" className="page-shell digest-page">
      <header className="digest-heading">
        <div>
          <h1>Daily Digest</h1>
        </div>
        <div className="digest-edition">
          <strong>{edition.weekday}, {edition.date}</strong>
          {updateTime ? <span>Updated {updateTime}</span> : null}
        </div>
      </header>

      {briefing ? (
        <article className="digest-issue">
          <section className={`digest-lead${leadVisual ? ' has-image' : ''}`}>
            <div className="digest-lead-copy">
              <p className="eyebrow">What matters now</p>
              <h2>{briefing.headline || 'What matters today'}</h2>
              {briefing.summary ? <p className="digest-dek">{briefing.summary}</p> : null}
              {leadChanges.length ? (
                <nav className="digest-lead-changes" aria-label="How the news picture changed">
                  <div className="digest-lead-changes-heading">
                    <p>How the picture changed</p>
                    <span>Since recent digests</span>
                  </div>
                  <ul>
                    {leadChanges.map(({ item, topic, text }) => (
                      <li key={`digest-lead-change-${item.story_id}`}>
                        <AppLink
                          view="story"
                          sid={item.story_id}
                          archiveDate={digestStoryArchiveDate(item, briefing)}
                          onNavigate={onNavigate}
                        >
                          <span className="digest-change-copy">
                            <strong>{topic}</strong>
                            <span>{text}</span>
                          </span>
                        </AppLink>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
            </div>
            {leadVisual ? (
              <DigestImage
                story={leadVisual.story}
                item={leadVisual.item}
                briefing={briefing}
                onNavigate={onNavigate}
              />
            ) : null}
          </section>

          <section className={`digest-body${supportingVisual ? ' has-supporting-image' : ''}`}>
            <div className="digest-prose">
              {paragraphs.map((paragraph, index) => (
                <DigestParagraph
                  paragraph={paragraph}
                  itemByStoryId={itemByStoryId}
                  briefing={briefing}
                  onNavigate={onNavigate}
                  key={`digest-paragraph-${index}`}
                />
              ))}
            </div>
            {supportingVisual ? (
              <DigestImage
                story={supportingVisual.story}
                item={supportingVisual.item}
                briefing={briefing}
                onNavigate={onNavigate}
                supporting
              />
            ) : null}
          </section>

          {selected.length ? (
            <section className="digest-related" aria-labelledby="digest-related-title">
              <div className="digest-related-heading">
                <div>
                  <p className="eyebrow">Go deeper</p>
                  <h2 id="digest-related-title">Stories in this Digest</h2>
                </div>
                <AppLink view="today" onNavigate={onNavigate}>View all of Today →</AppLink>
              </div>
              <div className="digest-related-list">
                {selected.map(({ item, story }, index) => (
                  <AppLink
                    view="story"
                    sid={item.story_id}
                    archiveDate={digestStoryArchiveDate(item, briefing)}
                    onNavigate={onNavigate}
                    key={item.story_id}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <small>
                        {item.recency_role === 'earlier_context' ? 'Earlier context' : storyTopic(story)}
                      </small>
                      <strong>{story.title || item.title}</strong>
                    </div>
                    <b aria-hidden="true">→</b>
                  </AppLink>
                ))}
              </div>
            </section>
          ) : null}

          <footer className="digest-note">
            <img src="/brand/muninn-mark.svg" alt="" />
            <p>The Digest is assembled from Muninn’s source-grounded Stories and continuing Event history.</p>
          </footer>
        </article>
      ) : (
        <section className="digest-unavailable">
          <h2>Today’s Digest is still being assembled.</h2>
          <p>The ranked news edition remains available while the connected write-up is prepared.</p>
          <AppLink view="today" onNavigate={onNavigate}>Read Today’s news →</AppLink>
        </section>
      )}
    </main>
  );
}

function StoryQuestionTabs({ questions, uncertaintyNotes, openItemId, setOpenItemId }) {
  const railRef = useRef(null);
  const selectedTabRef = useRef(null);
  const activeQuestion = questions.find(
    (question) => openItemId === `question:${question.id}`,
  );
  const uncertaintyOpen = openItemId === 'uncertainty';
  const panelId = 'story-question-panel';
  const activeTabId = activeQuestion
    ? `story-question-tab-${activeQuestion.id}`
    : uncertaintyOpen ? 'story-uncertainty-tab' : '';

  useEffect(() => {
    const rail = railRef.current;
    const selected = selectedTabRef.current;
    if (!rail || !selected) return;
    const leftEdge = selected.offsetLeft;
    const rightEdge = leftEdge + selected.offsetWidth;
    if (leftEdge < rail.scrollLeft) {
      rail.scrollTo({ left: Math.max(0, leftEdge - 12), behavior: 'smooth' });
    } else if (rightEdge > rail.scrollLeft + rail.clientWidth) {
      rail.scrollTo({ left: rightEdge - rail.clientWidth + 12, behavior: 'smooth' });
    }
  }, [openItemId]);

  if (!questions.length && !uncertaintyNotes.length) return null;
  return (
    <section className="story-question-tabs" aria-label="Questions about this story">
      <p className="story-question-tabs-label">Questions</p>
      <div className="story-question-tab-rail">
        <div className="story-question-tab-list" role="group" aria-label="Choose a question" ref={railRef}>
          {uncertaintyNotes.length ? (
            <button
              className={`story-uncertainty-tab${uncertaintyOpen ? ' is-selected' : ''}`}
              type="button"
              id="story-uncertainty-tab"
              aria-expanded={uncertaintyOpen}
              aria-controls={panelId}
              aria-pressed={uncertaintyOpen}
              onClick={() => setOpenItemId(uncertaintyOpen ? '' : 'uncertainty')}
              ref={uncertaintyOpen ? selectedTabRef : null}
            >
              <span>What Remains Unclear</span>
            </button>
          ) : null}
          {questions.map((question) => {
            const itemId = `question:${question.id}`;
            const isSelected = openItemId === itemId;
            return (
              <button
                className={isSelected ? 'is-selected' : ''}
                type="button"
                id={`story-question-tab-${question.id}`}
                aria-expanded={isSelected}
                aria-controls={panelId}
                aria-pressed={isSelected}
                onClick={() => setOpenItemId(isSelected ? '' : itemId)}
                ref={isSelected ? selectedTabRef : null}
                key={question.id}
              >
                <span>{question.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {activeQuestion ? (
        <div className="story-question-tab-panel" id={panelId} role="region" aria-labelledby={activeTabId}>
          {activeQuestion.answer ? <p>{activeQuestion.answer}</p> : null}
          <QuestionSourceLine sources={activeQuestion.sources} />
        </div>
      ) : null}
      {uncertaintyOpen ? (
        <div
          className="story-question-tab-panel is-uncertainty"
          id={panelId}
          role="region"
          aria-labelledby={activeTabId}
        >
          {uncertaintyNotes.length === 1 ? (
            <p>{uncertaintyNotes[0]}</p>
          ) : (
            <ul>
              {uncertaintyNotes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

function EditorialFeatureReport({ story }) {
  const questions = storyQuestions(story);
  const uncertaintyNotes = unresolvedReportItems(story)
    .filter((note) => !questionCoversUnknown(note, questions));
  const [openItemId, setOpenItemId] = useState(
    uncertaintyNotes.length ? 'uncertainty' : '',
  );
  const imageLabel = story.image?.image_role_label;
  const summaryParagraphs = adaptiveSummaryParagraphs(
    story.story_report?.summary || story.summary,
  );

  return (
    <div className="story-feature-report">
      <div className="story-opening-grid">
        <div className="story-opening-left">
          <div className="story-opening-copy">
            <p className="eyebrow">Summary</p>
            {summaryParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
        <div className="story-opening-right">
          <div className="story-feature-image-wrap">
            <StoryImage story={story} className="story-hero-image" role="lead" eager />
            {imageLabel ? (
              <p className="story-image-caption">{imageLabel} · Created for this Muninn briefing</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="story-context-wide">
        <StoryQuestionTabs
          questions={questions}
          uncertaintyNotes={uncertaintyNotes}
          openItemId={openItemId}
          setOpenItemId={setOpenItemId}
        />
      </div>
    </div>
  );
}

function storySourceRecords(story) {
  const reportSourceUrls = new Set(story?.story_report?.source_urls || []);
  const recordsByUrl = new Map();
  (story?.items || []).forEach((item, index) => {
    const url = item.link || item.url;
    if (!url) return;
    recordsByUrl.set(url, {
      url,
      title: carrySourceTitle('', item.title),
      publisher: cleanSourceName(item.source, url),
      sourceType: 'reporting',
      isReport: true,
      order: index,
    });
  });
  (story?.explore_lenses || []).flatMap((lens) => lens.sources || []).forEach((source, index) => {
    if (!source?.url) return;
    const existing = recordsByUrl.get(source.url);
    recordsByUrl.set(source.url, {
      url: source.url,
      title: carrySourceTitle(existing?.title, source.title),
      publisher: existing?.publisher || cleanSourceName(source.publisher || source.title, source.url),
      sourceType: source.source_type || existing?.sourceType || 'reporting',
      isReport: Boolean(existing?.isReport),
      order: existing?.order ?? (100 + index),
    });
  });
  return [...recordsByUrl.values()].sort((left, right) => {
    const score = (source) => (
      (source.isReport ? 45 : 0)
      + (source.sourceType === 'primary' || source.sourceType === 'official' ? 30 : 0)
      + (source.sourceType === 'expert' ? 30 : 0)
      + (reportSourceUrls.has(source.url) ? 20 : 0)
    );
    return score(right) - score(left) || left.order - right.order;
  });
}

function storySourceGroups(story) {
  const groupsByPublisher = new Map();
  storySourceRecords(story).forEach((source) => {
    const identity = sourceIdentity(source.publisher, source.url);
    const publisherId = identity.name.toLowerCase();
    const group = groupsByPublisher.get(publisherId) || {
      identity,
      documents: [],
      order: source.order,
      score: 0,
    };
    group.documents.push(source);
    group.order = Math.min(group.order, source.order);
    group.score = Math.max(
      group.score,
      (source.isReport ? 45 : 0)
        + (source.sourceType === 'primary' || source.sourceType === 'official' ? 30 : 0)
        + (source.sourceType === 'expert' ? 30 : 0),
    );
    groupsByPublisher.set(publisherId, group);
  });
  return [...groupsByPublisher.values()]
    .sort((left, right) => right.score - left.score || left.order - right.order);
}

function SourceCard({ group }) {
  const { identity, documents } = group;
  const primary = documents[0];
  const logo = sourceLogoPath(identity.name, primary.url);
  return (
    <article className="source-publisher-card">
      <header>
        <span className={`source-list-logo${identity.kind === 'institution' ? ' is-institution' : ''}`}>
          {logo ? <img src={logo} alt="" /> : identity.mark}
        </span>
        <span>
          <strong>{identity.name}</strong>
          <small>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</small>
        </span>
      </header>
      <div className="source-document-list">
        {documents.map((source, index) => (
          <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
            <span>{sourceDocumentTitle(source, [identity.name, source.publisher]) || `${identity.name} report ${index + 1}`}</span>
            <b aria-hidden="true">↗</b>
          </a>
        ))}
      </div>
    </article>
  );
}

function SourcesSection({ story }) {
  const sourceGroups = storySourceGroups(story);
  const documentCount = sourceGroups.reduce((total, group) => total + group.documents.length, 0);
  const featuredSources = sourceGroups.slice(0, 3);
  const remainingSources = sourceGroups.slice(3);
  if (!sourceGroups.length) return null;
  return (
    <section className="sources-section" aria-labelledby="sources-title">
      <header className="story-simple-section-heading sources-heading">
        <h2 id="sources-title">Sources</h2>
        <p>
          {sourceGroups.length} {sourceGroups.length === 1 ? 'publisher' : 'publishers'} · {documentCount} cited {documentCount === 1 ? 'document' : 'documents'}
        </p>
      </header>
      <div className="source-list source-list-featured">
        {featuredSources.map((group) => <SourceCard group={group} key={group.identity.name} />)}
      </div>
      {remainingSources.length ? (
        <details className="all-sources">
          <summary>
            <span className="all-sources-closed">
              Show {remainingSources.length} more {remainingSources.length === 1 ? 'publisher' : 'publishers'}
            </span>
            <span className="all-sources-open">Hide additional sources</span>
          </summary>
          <div className="source-list">
            {remainingSources.map((group) => <SourceCard group={group} key={group.identity.name} />)}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function storyRelationScore(currentStory, candidate) {
  let score = 0;
  if (currentStory?.event_id && currentStory.event_id === candidate?.event_id) score += 12;
  const currentTopic = currentStory?.canonical_topic_label;
  const candidateTopic = candidate?.canonical_topic_label;
  if (currentTopic && currentTopic === candidateTopic) score += 6;
  const currentCategory = currentStory?.primary_category || currentStory?.category;
  const candidateCategory = candidate?.primary_category || candidate?.category;
  if (currentCategory && currentCategory === candidateCategory) score += 3;
  return score;
}

function selectRelatedStories(story, candidates) {
  const scored = candidates
    .map((candidate, index) => ({
      candidate,
      index,
      score: storyRelationScore(story, candidate),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const genuinelyRelated = scored.filter((item) => item.score >= 6);
  const useRelated = genuinelyRelated.length >= 2;
  return {
    heading: useRelated ? 'Related coverage' : 'More from today',
    stories: (useRelated ? genuinelyRelated : scored).slice(0, 3).map((item) => item.candidate),
  };
}

function StoryEventBridge({ story, event, returnContext, onNavigate }) {
  if (!event) return null;
  const timeline = Array.isArray(event.timeline) ? event.timeline : [];
  const latest = timeline.at(-1);
  const currentId = story?.story_id || story?.development_id;
  const isLatest = Boolean(currentId && latest
    && (latest.daily_story_id === currentId || latest.development_id === currentId));
  const firstDate = timeline.find((entry) => entry.date)?.date || event.first_seen_at;
  const developmentCount = eventDevelopmentCount(event);
  return (
    <section className="story-event-bridge" aria-label={`Part of the ${eventTitle(event)} event`}>
      <AppLink
        view="event"
        eventId={event.event_id}
        sid={story.story_id || story.development_id || storyRouteId(story)}
        {...returnContext}
        onNavigate={onNavigate}
        className="story-event-bridge-link"
      >
        <div className="story-event-bridge-title">
          <p><span aria-hidden="true" />{isLatest ? 'Latest development' : 'Ongoing event'}</p>
          <h2>{eventTitle(event)}</h2>
        </div>
        <div className="story-event-bridge-context">
          <p>
            {developmentCount} {developmentCount === 1 ? 'development' : 'developments'}
            {firstDate ? ` · Tracking since ${formatDate(firstDate, { year: false })}` : ''}
          </p>
          {!isLatest && latest?.title ? (
            <p className="story-event-bridge-latest"><span>Latest</span>{latest.title}</p>
          ) : null}
        </div>
        <strong>Explore the full event <span aria-hidden="true">→</span></strong>
      </AppLink>
    </section>
  );
}

function StoryView({ story, event, relatedStories, returnContext, onNavigate }) {
  if (!story) return <MissingState message="That story is not available in this edition." />;
  const isCatchup = returnContext?.from === 'catch-up';
  const catchupDays = clampCatchupDays(returnContext?.days);
  const displayDate = formatDate(storyDate(story));
  const sameEventStories = event
    ? relatedStories.filter((item) => item.event_id === event.event_id).slice(0, 3)
    : [];
  const selectedRelated = sameEventStories.length
    ? { heading: `More from the ${eventTitle(event)}`, stories: sameEventStories }
    : selectRelatedStories(story, relatedStories);
  const related = isCatchup
    ? { ...selectedRelated, heading: `More from your ${catchupDays}-day Catch-Up` }
    : selectedRelated;
  return (
    <main id="main" className="page-shell story-page">
      <AppLink
        view={isCatchup ? 'catch-up' : 'today'}
        days={isCatchup ? catchupDays : undefined}
        onNavigate={onNavigate}
        className="back-link"
      >
        <span aria-hidden="true">←</span>{' '}
        {isCatchup ? `Back to ${catchupDays}-day Catch-Up` : 'Back to Today'}
      </AppLink>

      <article className="story-article">
        <header className="story-hero">
          <div className="story-meta">
            <span>{storyTopic(story)}</span>
            {displayDate ? <time dateTime={storyDate(story)}>{displayDate}</time> : null}
          </div>
          <div className="story-title-row">
            <h1>{story.title}</h1>
          </div>
          <div className="story-trust-bar" aria-label="Briefing provenance">
            <span>
              Synthesized by <strong>Muninn</strong> from <strong>{sourceCount(story)}</strong>{' '}
              {sourceCount(story) === 1 ? 'news report' : 'news reports'}
            </span>
          </div>
          <StoryEventBridge story={story} event={event} returnContext={returnContext} onNavigate={onNavigate} />
          <EditorialFeatureReport key={storyRouteId(story)} story={story} />
        </header>

        <SourcesSection story={story} />
      </article>

      {related.stories.length ? (
        <section className="related-section" aria-labelledby="related-title">
          <header className="story-simple-section-heading">
            <h2 id="related-title">{related.heading}</h2>
          </header>
          <div className="related-grid">
            {related.stories.map((item) => (
              <SupportingStory
                key={storyRouteId(item)}
                story={item}
                briefingMode={isCatchup ? 'catch-up' : 'latest'}
                briefingDays={isCatchup ? catchupDays : undefined}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function EventHeroImage({ event }) {
  const src = eventImage(event);
  if (!src) return null;
  return (
    <div className={`event-hero-image ${canCrop(event.hero_image) ? 'may-crop' : 'preserve'}`}>
      <img src={src} alt="" style={imagePresentation(event.hero_image, 'event')} />
    </div>
  );
}

function TimelineUpdateImage({ storyId, story, event }) {
  const initialImage = story?.image || null;
  const [imageData, setImageData] = useState(initialImage);

  useEffect(() => {
    let cancelled = false;
    setImageData(initialImage);
    if (initialImage || !storyId) return () => { cancelled = true; };
    fetch(`/Current_news/v1/stories/${encodeURIComponent(storyId)}.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setImageData(payload?.story?.image || payload?.image || null);
      })
      .catch(() => {
        if (!cancelled) setImageData(null);
      });
    return () => { cancelled = true; };
  }, [initialImage, storyId]);

  const resolvedImage = imageData || event?.hero_image;
  const src = resolvedImage?.url || resolvedImage?.thumbnail_url || '';
  if (!src) return null;
  return (
    <div className="timeline-update-visual">
      <img src={src} alt="" loading="lazy" style={imagePresentation(resolvedImage, 'wide')} />
    </div>
  );
}

function EventTimeline({ event, storyline, currentStoryId, stories, onNavigate, requestedOpen }) {
  const entries = [...(event.timeline || [])].reverse();
  const storyById = new Map();
  (stories || []).forEach((story) => {
    [story.story_id, story.development_id, storyRouteId(story)].filter(Boolean).forEach((id) => {
      if (!storyById.has(id)) storyById.set(id, story);
    });
  });
  const entryId = (entry) => entry.daily_story_id || entry.development_id;
  const currentIndex = entries.findIndex((entry) => entryId(entry) === currentStoryId);
  const visibleLimit = Math.max(6, currentIndex >= 0 ? currentIndex + 1 : 0);
  const [openId, setOpenId] = useState(
    currentIndex >= 0 ? entryId(entries[currentIndex]) : entryId(entries[0]),
  );
  const [showEarlier, setShowEarlier] = useState(false);

  useEffect(() => {
    const nextCurrentIndex = entries.findIndex((entry) => entryId(entry) === currentStoryId);
    setOpenId(nextCurrentIndex >= 0 ? entryId(entries[nextCurrentIndex]) : entryId(entries[0]));
    setShowEarlier(false);
  }, [event.event_id, currentStoryId]);

  useEffect(() => {
    const requestedId = requestedOpen?.id;
    if (!requestedId) return undefined;
    const requestedIndex = entries.findIndex((entry) => entryId(entry) === requestedId);
    if (requestedIndex < 0) return undefined;
    setOpenId(requestedId);
    if (requestedIndex >= visibleLimit) setShowEarlier(true);
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(`timeline-entry-${requestedId}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestedOpen?.id, requestedOpen?.request, event.event_id, visibleLimit]);

  const visibleEntries = showEarlier ? entries : entries.slice(0, visibleLimit);
  const hiddenCount = Math.max(0, entries.length - visibleEntries.length);
  return (
    <div className="event-timeline">
      {visibleEntries.map((entry, index) => {
        const id = entryId(entry);
        const current = id === currentStoryId;
        const latest = index === 0;
        const startsNewDate = index === 0 || visibleEntries[index - 1]?.date !== entry.date;
        const expanded = openId === id;
        const threadLabel = storyline?.update_event_labels?.[entry.development_id];
        const visibleSources = (entry.sources || []).slice(0, 2).map(
          (source) => cleanSourceName(source),
        );
        const hiddenSourceCount = Math.max(0, (entry.sources || []).length - visibleSources.length);
        const panelId = `timeline-update-${entry.development_id || index}`;
        return (
          <article
            className={`${startsNewDate ? 'is-new-day' : 'is-same-day'}${current ? ' is-current' : ''}${expanded ? ' is-open' : ''}`}
            id={`timeline-entry-${id}`}
            key={entry.development_id || `${entry.date}-${entry.title}`}
          >
            <div className="timeline-date">
              {startsNewDate ? <time dateTime={entry.date}>{formatDate(entry.date, { short: true })}</time> : null}
              {latest ? <span>Latest</span> : null}
            </div>
            <div className="timeline-node" aria-hidden="true"><i /></div>
            <div className="timeline-copy">
              {current ? <p className="current-marker">Current story</p> : null}
              <button
                type="button"
                className="timeline-update-toggle"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpenId(expanded ? '' : id)}
              >
                <span>
                  {threadLabel ? <small>{threadLabel}</small> : null}
                  <strong>{entry.title}</strong>
                </span>
                <i aria-hidden="true">{expanded ? '⌃' : '⌄'}</i>
              </button>
              {expanded ? (
                <div className="timeline-update-body has-image" id={panelId}>
                  <TimelineUpdateImage
                    storyId={id}
                    story={storyById.get(id)}
                    event={event}
                  />
                  <p>{entry.summary}</p>
                  <div className="timeline-update-footer">
                    <div className="timeline-sources">
                      <strong>
                        {entry.source_count || entry.sources?.length || 1}{' '}
                        {(entry.source_count || entry.sources?.length || 1) === 1 ? 'source' : 'sources'}
                      </strong>
                      {visibleSources.length ? (
                        <span>
                          {visibleSources.join(' · ')}
                          {hiddenSourceCount ? ` + ${hiddenSourceCount} more` : ''}
                        </span>
                      ) : null}
                    </div>
                    {id ? (
                      <AppLink view="story" sid={id} onNavigate={onNavigate}>
                        Read the full story <span aria-hidden="true">→</span>
                      </AppLink>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
      {hiddenCount ? (
        <button type="button" className="timeline-show-earlier" onClick={() => setShowEarlier(true)}>
          Show {hiddenCount} earlier {hiddenCount === 1 ? 'development' : 'developments'}
        </button>
      ) : showEarlier && entries.length > visibleLimit ? (
        <button type="button" className="timeline-show-earlier" onClick={() => setShowEarlier(false)}>
          Show fewer developments
        </button>
      ) : null}
    </div>
  );
}

function backgroundTopicLabel(value = '') {
  const label = normalizeOverviewLabel(value);
  const normalized = label.toLowerCase();
  if (normalized.includes('start') || normalized.includes('belligerent')) return 'Origins';
  if (normalized.includes('geographic')) return 'Region';
  if (normalized.includes('maritime') || normalized.includes('legal')) return 'Shipping & law';
  if (normalized.includes('diplomatic')) return 'Diplomacy';
  return label;
}

function overviewSourceLabel(source) {
  let hostname = '';
  try {
    hostname = new URL(source?.url || '').hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    hostname = '';
  }
  if (hostname === 'documents.un.org') return 'UN Security Council letter';
  if (hostname.endsWith('everycrsreport.com')) return 'Congressional Research Service';
  if (hostname.endsWith('imo.org')) {
    if (source.url?.includes('safe-passage')) return 'IMO safe-passage framework';
    if (source.url?.includes('shipping-lanes')) return 'IMO shipping-lanes statement';
    return 'International Maritime Organization';
  }
  if (hostname.endsWith('un.org')) return 'United Nations';
  return cleanSourceName(source?.publisher || source?.title, source?.url);
}

function StorylineBackgroundTopics({ facts, sources, context }) {
  const sourceById = new Map((sources || []).map((source) => [source.id, source]));
  const topics = facts.map((fact) => ({
    key: fact.label,
    label: backgroundTopicLabel(fact.label),
    value: fact.value,
    sources: (fact.source_ids || []).map((id) => sourceById.get(id)).filter(Boolean),
  }));
  const backgroundSources = [...new Map(
    topics.flatMap((topic) => topic.sources).map((source) => [source.id || source.url, source]),
  ).values()];
  const contextPreview = String(context[0] || '').trim().split(/\s+/).slice(0, 15).join(' ');
  const [openKey, setOpenKey] = useState('');
  const selected = topics.find((topic) => topic.key === openKey);
  const backgroundOpen = openKey === 'background';
  if (!topics.length && !context.length) return null;
  return (
    <div className="event-background-topics">
      <h2 className="event-background-semantic-title" id="event-overview-title">
        <button
          type="button"
          className={`event-background-lead${backgroundOpen ? ' is-active' : ''}`}
          aria-expanded={backgroundOpen}
          aria-controls="event-background-panel"
          onClick={() => setOpenKey(backgroundOpen ? '' : 'background')}
        >
          <span className="event-background-lead-copy">
            <strong>Essential context</strong>
            {!backgroundOpen && contextPreview ? <small aria-hidden="true">{contextPreview}…</small> : null}
          </span>
          <i aria-hidden="true">{backgroundOpen ? '⌃' : '⌄'}</i>
        </button>
      </h2>
      {backgroundOpen ? (
        <div className="event-background-topic-panel is-background" id="event-background-panel">
          <div className="event-background-summary">
            {context.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
            ))}
          </div>
          {backgroundSources.length ? (
            <details className="event-background-source-disclosure">
              <summary>
                {backgroundSources.length} context {backgroundSources.length === 1 ? 'source' : 'sources'}
              </summary>
              <div className="event-background-topic-sources">
                {backgroundSources.map((source) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.id || source.url}>
                    {overviewSourceLabel(source)}
                  </a>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
      {topics.length ? (
        <div className="event-background-topic-list" aria-label="Background topics">
          {topics.map((topic) => {
            const expanded = topic.key === openKey;
            return (
              <button
                type="button"
                className={expanded ? 'is-active' : ''}
                aria-expanded={expanded}
                aria-controls="event-background-topic-detail"
                key={topic.key}
                onClick={() => setOpenKey(expanded ? '' : topic.key)}
              >
                {topic.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {selected ? (
        <div className="event-background-topic-panel" id="event-background-topic-detail">
          <p>{selected.value}</p>
          {selected.sources.length ? (
            <div className="event-background-topic-sources">
              <span>Sources</span>
              {selected.sources.map((source) => (
                <a href={source.url} target="_blank" rel="noreferrer" key={source.id || source.url}>
                  {overviewSourceLabel(source)}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EventOverview({ event, storyline }) {
  const overview = event.event_overview;
  const facts = Array.isArray(overview?.facts) ? overview.facts.slice(0, 4) : [];
  const context = storyline ? [
    overview?.summary || storyline.overview || event.event_summary?.summary || event.summary,
    [facts[1]?.value, facts[3] ? conciseSummary(facts[3].value, 1) : ''].filter(Boolean).join(' '),
  ].filter(Boolean) : [
    overview?.summary || event.event_summary?.summary || event.summary,
    overview?.scope_note,
  ].filter(Boolean);
  return (
    <section className="event-overview" id="story-so-far" aria-labelledby="event-overview-title">
      <div className="event-overview-layout is-storyline">
        <StorylineBackgroundTopics facts={facts} sources={overview?.sources} context={context} />
      </div>
    </section>
  );
}

function StorylineThreads({ storyline, events, fallbackEvent, onNavigate, onTimelineFocus }) {
  const [openKey, setOpenKey] = useState('');
  const isCurrentFocus = (thread) => String(thread?.state_label || '').toLowerCase() === 'current focus';
  const threads = Array.isArray(storyline?.child_events)
    ? [...storyline.child_events].sort((left, right) => {
      const focusDifference = Number(isCurrentFocus(right)) - Number(isCurrentFocus(left));
      if (focusDifference) return focusDifference;
      return String(right.latest_date || '').localeCompare(String(left.latest_date || ''));
    })
    : [];
  if (!threads.length) return null;
  const eventById = new Map((events || []).map((event) => [event.event_id, event]));
  const threadImage = (thread) => {
    const relatedEvent = eventById.get(thread.event_id);
    return {
      src: eventImage(relatedEvent) || eventImage(fallbackEvent),
      data: relatedEvent?.hero_image || fallbackEvent?.hero_image,
    };
  };
  const threadStateLabel = (thread) => {
    if (!thread.available || !thread.event_id) return thread.state_label || 'Summary only';
    return thread.state_label || 'Tracked thread';
  };
  const threadDate = (thread) => (
    isCurrentFocus(thread) && storyline?.current_status_as_of
      ? storyline.current_status_as_of
      : thread.latest_date
  );
  const timelineTarget = (thread) => {
    const title = String(thread.title || '').toLowerCase();
    return [...(fallbackEvent?.timeline || [])].reverse().find((entry) => {
      const label = String(storyline?.update_event_labels?.[entry.development_id] || '').toLowerCase();
      return label && title.includes(label);
    });
  };
  const threadContent = (thread, image, expanded) => (
    <>
      {image.src ? (
        <div className="storyline-thread-media">
          <img src={image.src} alt="" loading="lazy" style={imagePresentation(image.data, 'support')} />
        </div>
      ) : null}
      <div className="storyline-thread-heading">
        <span>{threadStateLabel(thread)}</span>
        {threadDate(thread) ? <time>{formatDate(threadDate(thread), { short: true, year: false })}</time> : null}
      </div>
      <h3>{thread.title}</h3>
      <small>
        {thread.development_count || 0}{' '}
        {(thread.development_count || 0) === 1 ? 'development' : 'developments'}
      </small>
      <b aria-hidden="true">{expanded ? '⌃' : '⌄'}</b>
    </>
  );
  const threadEntries = threads.map((thread, index) => ({
    thread,
    index,
    key: thread.event_id || `${thread.title}-${index}`,
  }));
  const threadRows = [];
  for (let index = 0; index < threadEntries.length; index += 2) {
    threadRows.push(threadEntries.slice(index, index + 2));
  }
  const threadDetail = (thread, detailId) => {
    const selectedTarget = timelineTarget(thread);
    return (
      <div className="storyline-thread-detail" id={detailId}>
        <div>
          <span>{threadStateLabel(thread)}</span>
          <p>{conciseSummary(thread.summary, 2)}</p>
        </div>
        {thread.available && thread.event_id ? (
          <AppLink view="event" eventId={thread.event_id} onNavigate={onNavigate}>
            Open thread <span aria-hidden="true">→</span>
          </AppLink>
        ) : selectedTarget ? (
          <a
            href={`#timeline-entry-${selectedTarget.daily_story_id || selectedTarget.development_id}`}
            onClick={(clickEvent) => {
              clickEvent.preventDefault();
              onTimelineFocus(selectedTarget.daily_story_id || selectedTarget.development_id);
            }}
          >
            Jump to update <span aria-hidden="true">↓</span>
          </a>
        ) : null}
      </div>
    );
  };
  return (
    <section className="storyline-threads" id="storyline-threads" aria-labelledby="storyline-threads-title">
      <header className="event-section-heading is-single-title">
        <h2 id="storyline-threads-title">Events in this Situation</h2>
      </header>
      <div className="storyline-thread-grid">
        {threadRows.map((row, rowIndex) => {
          const selectedPosition = row.findIndex((entry) => entry.key === openKey);
          const selectedEntry = selectedPosition >= 0 ? row[selectedPosition] : null;
          const rowClass = selectedPosition === 0
            ? ' has-first-selected'
            : selectedPosition === 1 ? ' has-second-selected' : '';
          return (
            <div className={`storyline-thread-row${rowClass}`} key={row[0].key}>
              {row.map(({ thread, index, key }) => {
                const image = threadImage(thread);
                const imageClass = image.src ? ' has-image' : '';
                const expanded = key === openKey;
                return (
                  <button
                    type="button"
                    className={`storyline-thread${!thread.event_id ? ' is-summary' : ''}${expanded ? ' is-selected' : ''}${imageClass}`}
                    aria-expanded={expanded}
                    aria-controls={`storyline-thread-detail-${index}`}
                    onClick={() => setOpenKey(expanded ? '' : key)}
                    key={key}
                  >
                    {threadContent(thread, image, expanded)}
                  </button>
                );
              })}
              {selectedEntry
                ? threadDetail(selectedEntry.thread, `storyline-thread-detail-${selectedEntry.index}`)
                : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function eventReportingSources(event) {
  const sourceRecords = new Map();
  (event?.timeline || []).forEach((entry) => {
    const namesInUpdate = new Set();
    (entry.source_details || []).forEach((detail) => {
      const url = detail?.link || detail?.url || '';
      const name = cleanSourceName(detail?.source || detail?.publisher || '', url);
      if (!name || name === 'Google News') return;
      const existing = sourceRecords.get(name) || {
        name,
        updateCount: 0,
        title: '',
        url: '',
      };
      const title = String(detail?.title || '').trim();
      sourceRecords.set(name, {
        ...existing,
        title: title || existing.title,
        url: url || existing.url,
      });
      namesInUpdate.add(name);
    });
    (entry.sources || []).forEach((source) => {
      const name = cleanSourceName(source);
      if (!name || name === 'Google News') return;
      if (!sourceRecords.has(name)) {
        sourceRecords.set(name, { name, updateCount: 0, title: '', url: '' });
      }
      namesInUpdate.add(name);
    });
    namesInUpdate.forEach((name) => {
      const existing = sourceRecords.get(name);
      sourceRecords.set(name, { ...existing, updateCount: existing.updateCount + 1 });
    });
  });
  return [...sourceRecords.values()]
    .map((source) => ({
      ...source,
      logo: sourceLogoPath(source.name, source.url),
      mark: sourceIdentity(source.name, source.url).mark,
    }))
    .sort((left, right) => right.updateCount - left.updateCount || left.name.localeCompare(right.name));
}

function EventSourceItem({ source }) {
  const identity = sourceIdentity(source.name, source.url);
  const articleTitle = sourceDocumentTitle({
    title: source.title,
    publisher: source.name,
    url: source.url,
  }, [identity.name, source.name]);
  const Wrapper = source.url ? 'a' : 'div';
  return (
    <Wrapper
      className={`event-source-item${source.url ? ' has-link' : ''}`}
      href={source.url || undefined}
      target={source.url ? '_blank' : undefined}
      rel={source.url ? 'noreferrer' : undefined}
    >
      <span className="event-source-mark" aria-hidden="true">
        {source.logo ? <img src={source.logo} alt="" /> : <span>{source.mark}</span>}
      </span>
      <span className="event-source-copy">
        {articleTitle ? <small>{source.name}</small> : null}
        <strong>{articleTitle || source.name}</strong>
        <em>
          {source.updateCount} {source.updateCount === 1 ? 'development' : 'developments'}
        </em>
      </span>
      {source.url ? <b aria-hidden="true">↗</b> : null}
    </Wrapper>
  );
}

function EventSourceIndex({ sources, developmentCount }) {
  if (!sources.length) return null;
  const visibleSources = sources.slice(0, 8);
  const additionalSources = sources.slice(8);
  return (
    <section className="event-source-index" id="event-sources" aria-labelledby="event-sources-title">
      <header className="event-section-heading">
        <h2 id="event-sources-title">Reporting sources</h2>
        <p>
          {sources.length} sources represented across {developmentCount}{' '}
          {developmentCount === 1 ? 'development' : 'developments'}.
        </p>
      </header>
      <div className="event-source-grid">
        {visibleSources.map((source) => <EventSourceItem source={source} key={source.name} />)}
      </div>
      {additionalSources.length ? (
        <details className="event-source-more">
          <summary>
            <span className="event-source-more-closed">Show {additionalSources.length} more sources</span>
            <span className="event-source-more-open">Show fewer sources</span>
          </summary>
          <div className="event-source-grid">
            {additionalSources.map((source) => <EventSourceItem source={source} key={source.name} />)}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function EventView({ event, storyline, parentStoryline, currentStoryId, events, stories, otherEvents, returnContext, onNavigate }) {
  const [timelineRequest, setTimelineRequest] = useState(null);
  if (!event) return <MissingState message="That event is not available in this edition." />;
  const presentation = event.presentation || {};
  const parentThread = parentStoryline?.child_events?.find(
    (thread) => thread.event_id === event.event_id,
  );
  const title = storyline?.title || parentThread?.title || eventTitle(event);
  const overview = event.event_overview;
  const currentState = storyline?.current_status
    || event.latest_summary
    || event.timeline?.at(-1)?.summary
    || overview?.summary
    || event.event_summary?.summary
    || event.summary;
  const timelineStart = event.timeline?.find((entry) => entry.date)?.date || event.first_seen_at;
  const timelineEnd = event.timeline?.at(-1)?.date || event.last_seen_at;
  const originDate = storyline?.origin_date;
  const isStoryline = Boolean(storyline);
  const currentAsOf = storyline?.current_status_as_of || timelineEnd;
  const latestDevelopmentTitle = eventLatestTitle(event);
  const showLatestDevelopmentTitle = !isStoryline
    && latestDevelopmentTitle
    && latestDevelopmentTitle !== title;
  const reportingSources = eventReportingSources(event);
  const developmentCount = presentation.development_count || event.timeline?.length || 0;
  const reportingSourceCount = reportingSources.length
    || presentation.independent_source_count
    || presentation.source_count
    || 0;
  const requestTimelineFocus = (id) => {
    setTimelineRequest((current) => ({ id, request: (current?.request || 0) + 1 }));
  };
  const isCatchup = returnContext?.from === 'catch-up';
  const catchupDays = clampCatchupDays(returnContext?.days);
  return (
    <main id="main" className={`page-shell event-page${isStoryline ? ' is-storyline' : ' is-event'}`}>
      <AppLink
        view={isCatchup ? 'catch-up' : 'events'}
        days={isCatchup ? catchupDays : undefined}
        onNavigate={onNavigate}
        className="back-link event-back-link"
      >
        <span aria-hidden="true">←</span>{' '}
        {isCatchup ? `Back to ${catchupDays}-day Catch-Up` : 'Timelines'}
      </AppLink>

      <header className="event-hero">
        <div className="event-hero-copy">
          <div className="event-status">
            <i aria-hidden="true" />
            <span>
              {isStoryline
                ? 'Ongoing Situation'
                : event.status === 'active' ? 'Active event' : event.status || 'Tracked event'}
            </span>
          </div>
          {parentStoryline?.legacy_event_id ? (
            <AppLink
              view="event"
              eventId={parentStoryline.legacy_event_id}
              onNavigate={onNavigate}
              className="event-parent-link"
            >
              Part of the {parentStoryline.title} Situation <span aria-hidden="true">→</span>
            </AppLink>
          ) : null}
          <h1>{title}</h1>
          <p className="event-current-state-label">
            {showLatestDevelopmentTitle ? 'Latest development' : 'Current situation'}
          </p>
          {showLatestDevelopmentTitle ? (
            <h2 className="event-current-development-title">{latestDevelopmentTitle}</h2>
          ) : null}
          <p className="event-current-state">{conciseSummary(currentState, 2)}</p>
          {currentAsOf ? (
            <p className="event-current-as-of">
              Current as of {formatDate(currentAsOf, { short: true, year: false })}
            </p>
          ) : null}
          {originDate ? (
            <div className="event-coverage-dates">
              <span>{title} began {formatDate(originDate, { year: false })}</span>
            </div>
          ) : null}
          <div className="event-stats">
            <a href="#event-timeline">
              <strong>{developmentCount}</strong>
              <span>developments</span>
            </a>
            {isStoryline ? (
              <a href="#storyline-threads">
                <strong>{storyline.child_events?.length || 0}</strong>
                <span>connected Events</span>
              </a>
            ) : (
              <a href="#event-timeline"><strong>{presentation.date_count || '—'}</strong><span>days covered</span></a>
            )}
            <a href={reportingSources.length ? '#event-sources' : '#event-timeline'}>
              <strong>{reportingSourceCount || '—'}</strong>
              <span>sources</span>
            </a>
          </div>
        </div>
        <EventHeroImage event={event} />
      </header>

      <EventOverview event={event} storyline={storyline} />
      <StorylineThreads
        storyline={storyline}
        events={events}
        fallbackEvent={event}
        onNavigate={onNavigate}
        onTimelineFocus={requestTimelineFocus}
      />

      <section id="event-timeline" className="event-content" aria-labelledby="timeline-title">
        <div className="timeline-column">
          <header className="section-heading compact">
            <div>
              <h2 id="timeline-title">How the story developed</h2>
            </div>
            <p>{formatDate(timelineStart, { short: true })}–{formatDate(timelineEnd, { short: true })}</p>
          </header>
          <EventTimeline
            event={event}
            storyline={storyline}
            currentStoryId={currentStoryId}
            stories={stories}
            onNavigate={onNavigate}
            requestedOpen={timelineRequest}
          />
        </div>
      </section>

      <EventSourceIndex sources={reportingSources} developmentCount={developmentCount} />

      {otherEvents.length ? (
        <section className="other-events" aria-labelledby="other-events-title">
          <header className="section-heading compact">
            <div>
              <p className="eyebrow">Explore coverage</p>
              <h2 id="other-events-title">Other active timelines</h2>
            </div>
          </header>
          <div>
            {otherEvents.slice(0, 3).map((item) => (
              <AppLink
                view="event"
                eventId={item.event_id}
                onNavigate={onNavigate}
                key={item.event_id}
              >
                <span>{item.presentation?.stage_label || 'Event'}</span>
                <strong>{item.presentation?.base_title || item.topic_label || item.canonical_title}</strong>
                <small>{item.presentation?.development_count || item.timeline?.length || 0} developments</small>
                <b aria-hidden="true">→</b>
              </AppLink>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function DirectoryStoryCard({ story, onNavigate, featured = false }) {
  return (
    <article className={`directory-story-card${featured ? ' is-featured' : ''}`}>
      <AppLink
        view="story"
        sid={storyRouteId(story)}
        onNavigate={onNavigate}
        aria-label={`Read ${story.title}`}
      >
        <StoryImage
          story={story}
          className="directory-story-image"
          role={featured ? 'lead' : 'support'}
          showRole={false}
        />
        <div className="directory-story-copy">
          <p className="eyebrow">{storyTopic(story)}</p>
          <h2>{story.title}</h2>
          <p>{conciseSummary(story.summary, featured ? 2 : 1)}</p>
          <SourceMarks story={story} compact limit={3} />
        </div>
      </AppLink>
    </article>
  );
}

function PageIntroduction({ eyebrow, title, description, aside }) {
  return (
    <header className="directory-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {aside ? <p className="directory-heading-aside">{aside}</p> : null}
    </header>
  );
}

function EventArtwork({
  event,
  relatedStory,
  className = '',
  role = 'support',
  showLabel = false,
  preferStory = false,
  preserveFull = false,
}) {
  const stableImage = eventImage(event);
  const fallbackImage = storyImage(relatedStory);
  const image = preferStory ? (fallbackImage || stableImage) : (stableImage || fallbackImage);
  const imageData = preferStory && fallbackImage
    ? relatedStory?.image
    : stableImage ? event?.hero_image : relatedStory?.image;
  return (
    <div className={`${className}${image ? '' : ' is-empty'}${preserveFull && image ? ' preserve-full-event-art' : ''}`.trim()}>
      {image ? <img src={image} alt="" style={imagePresentation(imageData, role)} /> : null}
      {showLabel ? <EventImageDisclosure label={imageData?.image_role_label} className="event-artwork-label" /> : null}
      {!image ? (
        <span className="event-artwork-placeholder" aria-hidden="true">
          <img src="/brand/muninn-mark.svg" alt="" />
          <b>Event file</b>
        </span>
      ) : null}
    </div>
  );
}

function EventImageDisclosure({ label, className = 'event-art-label' }) {
  if (!label) return null;
  const shortLabel = /^ai\s+illustration$/i.test(label) ? 'AI' : label;
  return <span className={className} aria-label={label} title={label}>{shortLabel}</span>;
}

function EventMeta({ event, updateStory = null }) {
  const latestDate = eventLatestDate(event);
  const reportingSourceCount = updateStory
    ? developmentSourceCount(event, updateStory)
    : eventReportingSourceCount(event);
  return (
    <div className="catchup-event-meta">
      {latestDate ? <span>Updated {formatDate(latestDate, { short: true, year: false })}</span> : null}
      <span title="Distinct trusted updates in this timeline">{eventDevelopmentCount(event)} updates</span>
      {reportingSourceCount ? (
        <span>{reportingSourceCount} {updateStory ? 'update sources' : 'timeline sources'}</span>
      ) : null}
    </div>
  );
}

function EventParentLabel({ storyline, event, relatedStory }) {
  const label = storyline
    ? storyline.legacy_event_id === event?.event_id ? 'Situation' : storyline.title
    : eventCategory(event, relatedStory);
  if (!label) return null;
  return (
    <span className="catchup-event-parent">
      {label}
    </span>
  );
}

function eventPreviewParentLabel(storyline, event, relatedStory) {
  if (storyline) {
    return storyline.legacy_event_id === event?.event_id ? 'Situation' : storyline.title;
  }
  return eventCategory(event, relatedStory) || 'Continuing timeline';
}

function floatingEventPreviewStyle(target, preferredWidth = 544) {
  if (!target || typeof window === 'undefined') return undefined;
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12;
  const gap = 0;
  const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || margin;
  const topInset = Math.max(margin, Math.ceil(headerBottom + 4));
  const width = Math.min(preferredWidth, viewportWidth - (margin * 2));
  const left = Math.max(
    margin,
    Math.min(viewportWidth - width - margin, rect.left + (rect.width / 2) - (width / 2)),
  );
  const roomBelow = Math.max(0, viewportHeight - rect.bottom - gap - margin);
  const roomAbove = Math.max(0, rect.top - gap - topInset);
  const useViewportOverlay = Math.max(roomAbove, roomBelow) < 360;
  const placeAbove = !useViewportOverlay && roomBelow < 320 && roomAbove > roomBelow;
  const availableHeight = useViewportOverlay
    ? Math.max(0, viewportHeight - topInset - margin)
    : placeAbove ? roomAbove : roomBelow;
  const maxHeight = Math.max(140, Math.min(512, availableHeight));
  return {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: placeAbove
      ? 'auto'
      : `${Math.round(useViewportOverlay ? topInset : rect.bottom + gap)}px`,
    right: 'auto',
    bottom: placeAbove ? `${Math.round(viewportHeight - rect.top + gap)}px` : 'auto',
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
    '--event-preview-origin': useViewportOverlay
      ? 'center center'
      : placeAbove ? 'bottom center' : 'top center',
  };
}

function useEventHoverPreview() {
  return useFloatingPreview({
    anchorSelector: '.event-preview-trigger',
    popupSelector: '.event-movement-preview',
  });
}

function EventHoverPreview({
  event,
  relatedStory,
  storyline,
  variant = 'event',
  style,
  onMouseEnter,
  onMouseLeave,
  onNavigate,
  onClose,
}) {
  const title = eventTitle(event);
  const development = variant === 'development';
  const previewTitle = development ? eventLatestTitle(event) : title;
  const readingView = development && relatedStory ? 'story' : 'event';
  const latestMovement = conciseSummary(
    event?.latest_summary
      || event?.timeline?.at(-1)?.summary
      || relatedStory?.summary
      || eventLatestTitle(event),
    2,
  );
  return (
    <div
      className={`event-movement-preview${style ? ' is-positioned' : ''}`}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onMouseEnter}
      onBlur={onMouseLeave}
      role="dialog"
      aria-label={`Quick view: ${title}`}
    >
      <button type="button" className="event-preview-close" onClick={onClose} aria-label="Close quick view">Close</button>
      <EventArtwork
        event={event}
        relatedStory={relatedStory}
        className="event-movement-preview-art"
        role="wide"
        preferStory={development}
      />
      <div className="event-movement-preview-copy">
        <div className="event-movement-preview-heading">
          <div>
            <span className="event-movement-preview-parent">
              {development
                ? developmentParentLabel(event, storyline)
                : eventPreviewParentLabel(storyline, event, relatedStory)}
            </span>
            <h3>{previewTitle}</h3>
          </div>
          <AppLink
            view={readingView}
            sid={development && relatedStory ? storyRouteId(relatedStory) : undefined}
            eventId={readingView === 'event' ? event.event_id : undefined}
            onNavigate={onNavigate}
            className="event-movement-preview-title-action"
          >
            {development && relatedStory ? 'Read update' : 'Open event'} <span aria-hidden="true">→</span>
          </AppLink>
        </div>
        <div className="event-movement-preview-brief">
          <p><span>{development ? 'What changed' : 'Current situation'}</span>{latestMovement}</p>
        </div>
        <EventMeta event={event} updateStory={development ? relatedStory : null} />
      </div>
    </div>
  );
}

function DevelopingEventCard({ event, relatedStory, storyline, onNavigate, quiet = false }) {
  return (
    <article className={`developing-event-card${quiet ? ' is-quiet' : ''}`}>
      <div className="developing-event-card-inner">
        <div className="developing-event-copy">
          <EventParentLabel storyline={storyline} event={event} relatedStory={relatedStory} />
          <AppLink
            view="event"
            eventId={event.event_id}
            onNavigate={onNavigate}
            className="developing-event-title-link"
            aria-label={`Open ${eventTitle(event)}`}
          >
            <h3>{eventTitle(event)}</h3>
          </AppLink>
          {quiet ? (
            <p className="active-event-latest">
              <span>Latest</span>
              <strong>{eventLatestTitle(event)}</strong>
            </p>
          ) : <p>{eventLatestTitle(event)}</p>}
          <EventMeta event={event} />
        </div>
        <div className="developing-event-media">
          <EventArtwork
            event={event}
            relatedStory={relatedStory}
            className="developing-event-art"
            role={quiet ? 'wide' : 'support'}
          />
        </div>
      </div>
    </article>
  );
}

function EventPreviewCard({ event, relatedStory, storyline, onNavigate, variant = 'rail' }) {
  const title = eventTitle(event);
  const latestDate = eventLatestDate(event);
  const formattedDate = formatDate(latestDate, { short: true, year: false });
  const {
    previewStyle,
    openPreview,
    keepPreviewOpen,
    requestPreviewClose,
    dismissPreview,
  } = useEventHoverPreview();
  const readingView = relatedStory ? 'story' : 'event';
  const readingId = relatedStory ? storyRouteId(relatedStory) : undefined;
  const movement = variant === 'movement';
  const cardTitle = movement ? eventLatestTitle(event) : title;
  const articleClass = movement ? 'event-movement-row' : 'event-catchup-card';
  const artworkClass = movement ? 'event-movement-art' : 'event-rail-art';
  const copyClass = movement ? 'event-movement-tile-copy' : 'event-rail-tile-copy';
  return (
    <article className={`${articleClass} event-preview-trigger${previewStyle ? ' is-preview-open' : ''}`}>
      <button
        type="button"
        className="event-image-preview-button"
        aria-expanded={Boolean(previewStyle)}
        aria-label={`Quick view: ${title}`}
        title="Quick view"
        onClick={openPreview}
      >
        <EventArtwork
          event={event}
          relatedStory={relatedStory}
          className={artworkClass}
          role="support"
          preferStory={movement}
        />
        <span className="event-preview-icon"><QuickReadIcon /></span>
      </button>
      <div className={copyClass}>
        {movement ? (
          <EventParentLabel storyline={storyline} event={event} relatedStory={relatedStory} />
        ) : null}
        <AppLink
          view={readingView}
          sid={readingId}
          eventId={relatedStory ? undefined : event.event_id}
          onNavigate={onNavigate}
          className="event-card-reading-link"
          aria-label={`${movement ? 'Read update' : 'Read'} ${cardTitle}`}
        >
          <h3>{cardTitle}</h3>
        </AppLink>
        <AppLink
          view={readingView}
          sid={readingId}
          eventId={relatedStory ? undefined : event.event_id}
          onNavigate={onNavigate}
          className="event-card-detail-link"
        >
          <span>{movement ? 'Recent development' : `${eventDevelopmentCount(event)} updates`}</span>
          {latestDate ? <time dateTime={latestDate}>Updated {formattedDate}</time> : null}
          <b>{movement && relatedStory ? 'Read update →' : relatedStory ? 'Read report →' : 'Open event →'}</b>
        </AppLink>
      </div>
      {previewStyle ? (
        <EventHoverPreview
          event={event}
          relatedStory={relatedStory}
          storyline={storyline}
          style={previewStyle}
          onMouseEnter={keepPreviewOpen}
          onMouseLeave={requestPreviewClose}
          onNavigate={onNavigate}
          onClose={dismissPreview}
        />
      ) : null}
    </article>
  );
}

function developmentParentLabel(event, situation) {
  if (situation?.legacy_event_id === event?.event_id) return `${situation.title} Situation`;
  return eventTitle(event);
}

function DevelopmentLedgerRow({ event, relatedStory, situation, dayLabel, onNavigate }) {
  const latestDate = eventLatestDate(event);
  const reportingSourceCount = developmentSourceCount(event, relatedStory);
  const readingView = relatedStory ? 'story' : 'event';
  return (
    <li className="development-ledger-row">
      <div className="development-ledger-media">
        <EventArtwork
          event={event}
          relatedStory={relatedStory}
          className="development-ledger-art"
          role="wide"
          preferStory
          preserveFull
        />
      </div>
      <div className="development-ledger-copy">
        <div className="development-ledger-context">
          {dayLabel ? <span className="development-ledger-day">{dayLabel}</span> : null}
          <span className="catchup-event-parent">{developmentParentLabel(event, situation)}</span>
        </div>
        <AppLink
          view={readingView}
          sid={relatedStory ? storyRouteId(relatedStory) : undefined}
          eventId={relatedStory ? undefined : event.event_id}
          onNavigate={onNavigate}
          className="development-ledger-reading-link"
        >
          <h3>{eventLatestTitle(event)}</h3>
        </AppLink>
        <div className="development-ledger-footer">
          {latestDate ? (
            <div className="development-ledger-meta">
              <time className="development-ledger-date" dateTime={latestDate}>
                {formatDate(latestDate, { short: true, year: false })}
              </time>
              {reportingSourceCount ? (
                <span>{reportingSourceCount} {reportingSourceCount === 1 ? 'source' : 'sources'}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function HalfStepCarousel({
  className,
  ariaLabel,
  itemCount,
  children,
  itemsPerColumn = 2,
  singleColumnOnMobile = false,
  header = null,
}) {
  const railRef = useRef(null);
  const [position, setPosition] = useState(0);
  const [isNarrow, setIsNarrow] = useState(() => (
    singleColumnOnMobile && typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 760px)').matches
      : false
  ));
  const columnCount = React.Children.count(children);
  const visibleColumns = singleColumnOnMobile && isNarrow ? 1 : 2;
  const maxPosition = Math.max(0, columnCount - visibleColumns);

  useEffect(() => {
    if (!singleColumnOnMobile || typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(max-width: 760px)');
    const sync = () => setIsNarrow(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [singleColumnOnMobile]);

  useEffect(() => {
    setPosition((current) => Math.min(current, maxPosition));
  }, [maxPosition]);

  const stepSize = () => {
    const rail = railRef.current;
    const firstColumn = rail?.firstElementChild;
    if (!rail || !firstColumn) return 0;
    const styles = window.getComputedStyle(rail);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    return firstColumn.getBoundingClientRect().width + gap;
  };
  const syncPosition = () => {
    const rail = railRef.current;
    const step = stepSize();
    if (!rail || !step) return;
    setPosition(Math.min(maxPosition, Math.max(0, Math.round(rail.scrollLeft / step))));
  };
  const move = (direction) => {
    const rail = railRef.current;
    const step = stepSize();
    if (!rail || !step) return;
    rail.scrollTo({ left: (position + direction) * step, behavior: 'smooth' });
  };
  const visibleStart = itemCount ? Math.min(position * itemsPerColumn + 1, itemCount) : 0;
  const visibleEnd = itemCount
    ? Math.min(visibleStart + (visibleColumns * itemsPerColumn) - 1, itemCount)
    : 0;
  const controls = maxPosition > 0 ? (
    <div className="event-carousel-controls" aria-label={`${ariaLabel} controls`}>
      <span aria-live="polite">{visibleStart}–{visibleEnd} of {itemCount}</span>
      <button
        type="button"
        aria-label={`Previous ${ariaLabel}`}
        disabled={position === 0}
        onClick={() => move(-1)}
      >
        <span aria-hidden="true">←</span>
      </button>
      <button
        type="button"
        aria-label={`Next ${ariaLabel}`}
        disabled={position === maxPosition}
        onClick={() => move(1)}
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  ) : null;

  return (
    <div className={`event-carousel-shell${header ? ' has-integrated-header' : ''}`}>
      {header ? (
        <div className="event-carousel-integrated-header">
          {header}
          {controls}
        </div>
      ) : null}
      <div ref={railRef} className={className} aria-label={ariaLabel} onScroll={syncPosition}>
        {children}
      </div>
      {!header ? controls : null}
    </div>
  );
}

function DevelopmentTimeline({ events, referenceDate, relatedStories, situationByEventId, onNavigate }) {
  const groups = [
    ['latest', '', (age) => age === 0],
    ['previous', 'Previous day', (age) => age === 1],
    ['earlier', 'Earlier', (age) => age >= 2],
  ].map(([key, label, matches]) => ({
    key,
    label,
    events: events.filter((event) => matches(dateDistanceInDays(referenceDate, eventLatestDate(event)))),
  })).filter((group) => group.events.length);
  const developments = groups.flatMap((group) => group.events.map((event) => ({
    event,
    dayLabel: group.label,
  })));

  return (
    <div className="development-timeline" aria-label="Latest developments by day">
      <HalfStepCarousel
        className="development-ledger latest-development-carousel"
        ariaLabel="Latest developments"
        itemCount={developments.length}
        singleColumnOnMobile
        header={(
          <header className="event-rail-heading">
            <div>
              <p className="eyebrow">What changed</p>
              <h2 id="latest-developments-title">Latest developments</h2>
            </div>
            {referenceDate ? (
              <p>Coverage current through {formatDate(referenceDate, { short: true, year: false })} · Sources shown on every update</p>
            ) : null}
          </header>
        )}
      >
        {Array.from({ length: Math.ceil(developments.length / 2) }, (_, columnIndex) => (
          <ol className="development-ledger-page" key={`development-column-${columnIndex + 1}`}>
            {developments.slice(columnIndex * 2, columnIndex * 2 + 2).map(({ event, dayLabel }) => (
              <DevelopmentLedgerRow
                event={event}
                relatedStory={relatedStories.get(event.event_id)}
                situation={situationByEventId.get(event.event_id)}
                dayLabel={dayLabel}
                onNavigate={onNavigate}
                key={event.event_id}
              />
            ))}
          </ol>
        ))}
      </HalfStepCarousel>
    </div>
  );
}

function eventReportingSourceCount(event) {
  return eventReportingSources(event).length
    || Number(event?.presentation?.independent_source_count || event?.presentation?.source_count || 0);
}

function LatestDevelopmentLead({ event, relatedStory, situation, onNavigate }) {
  if (!event) return null;
  const readingView = relatedStory ? 'story' : 'event';
  const latestDate = eventLatestDate(event);
  return (
    <article className="latest-development-lead">
      <AppLink
        view={readingView}
        sid={relatedStory ? storyRouteId(relatedStory) : undefined}
        eventId={relatedStory ? undefined : event.event_id}
        onNavigate={onNavigate}
        aria-label={`Read ${eventLatestTitle(event)}`}
      >
        <EventArtwork
          event={event}
          relatedStory={relatedStory}
          className="latest-development-art"
          role="wide"
          preferStory
        />
        <div className="latest-development-copy">
          <span className="catchup-event-parent">{developmentParentLabel(event, situation)}</span>
          <h3>{eventLatestTitle(event)}</h3>
          <p>{eventLatestSummary(event, relatedStory)}</p>
          <div className="latest-development-meta">
            {latestDate ? <time dateTime={latestDate}>{formatDate(latestDate, { short: true, year: false })}</time> : null}
            <span>Latest Development</span>
            <b>{relatedStory ? 'Read Report' : 'Open Event'} <span aria-hidden="true">→</span></b>
          </div>
        </div>
      </AppLink>
    </article>
  );
}

function DevelopmentList({ events, relatedStories, situationByEventId, onNavigate }) {
  return (
    <ol className="latest-development-list">
      {events.map((event, index) => {
        const relatedStory = relatedStories.get(event.event_id);
        const latestDate = eventLatestDate(event);
        return (
          <li key={event.event_id}>
            <AppLink
              view={relatedStory ? 'story' : 'event'}
              sid={relatedStory ? storyRouteId(relatedStory) : undefined}
              eventId={relatedStory ? undefined : event.event_id}
              onNavigate={onNavigate}
            >
              <span className="development-list-number">{String(index + 2).padStart(2, '0')}</span>
              <div>
                <span className="catchup-event-parent">
                  {developmentParentLabel(event, situationByEventId.get(event.event_id))}
                </span>
                <h3>{eventLatestTitle(event)}</h3>
              </div>
              {latestDate ? <time dateTime={latestDate}>{formatDate(latestDate, { short: true, year: false })}</time> : null}
              <b aria-hidden="true">→</b>
            </AppLink>
          </li>
        );
      })}
    </ol>
  );
}

function SituationCard({ situation, rootEvent, onNavigate, compact = false }) {
  const childEvents = Array.isArray(situation?.child_events) ? situation.child_events : [];
  const activeCount = childEvents.filter((item) => item.state !== 'earlier_phase').length;
  return (
    <article className={`storyline-overview-card situation-overview-card${compact ? ' is-compact' : ''}`}>
      <AppLink
        view="event"
        eventId={situation.legacy_event_id}
        onNavigate={onNavigate}
        aria-label={`Open the ${situation.title} situation`}
      >
        <EventArtwork event={rootEvent} className="storyline-overview-art" role="wide" />
        <div className="storyline-overview-copy">
          <span className="catchup-event-parent">Current situation</span>
          <h3>{situation.title}</h3>
          <p>{conciseSummary(situation.overview || situation.current_status, compact ? 1 : 2)}</p>
          {situation.current_status ? (
            <div className="storyline-latest">
              <span>Where it stands</span>
              <strong>{conciseSummary(situation.current_status, compact ? 1 : 2)}</strong>
            </div>
          ) : null}
          {childEvents.length ? (
            <ul className="situation-event-list" aria-label={`Events within ${situation.title}`}>
              {childEvents.slice(0, compact ? 3 : 4).map((event, index) => (
                <li key={event.event_id || `${situation.storyline_id || situation.title}-${index}`}>
                  {event.title}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="storyline-overview-meta">
            <span>{childEvents.length} connected {childEvents.length === 1 ? 'Event' : 'Events'}</span>
            {activeCount ? <span>{activeCount} active</span> : null}
            {situation.current_status_as_of ? (
              <span>Updated {formatDate(situation.current_status_as_of, { short: true, year: false })}</span>
            ) : null}
          </div>
          <b>Understand the Situation <span aria-hidden="true">→</span></b>
        </div>
      </AppLink>
    </article>
  );
}

function GlobalCoverageSearch({ stories, events, storylines, onNavigate }) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const resultGroups = useMemo(() => {
    if (normalized.length < 2) return { storylines: [], events: [], stories: [], best: null };
    const score = (title, haystack) => {
      const cleanTitle = String(title || '').toLowerCase();
      if (cleanTitle === normalized) return 100;
      if (cleanTitle.startsWith(normalized)) return 80;
      if (cleanTitle.includes(normalized)) return 60;
      return String(haystack || '').toLowerCase().includes(normalized) ? 30 : 0;
    };
    const storylineResults = storylines.map((item) => ({
      key: item.coverage_id,
      kind: 'Situation',
      title: item.title,
      summary: conciseSummary(item.overview || item.current_status, 1),
      view: 'event',
      eventId: item.legacy_event_id,
      score: score(item.title, `${item.overview || ''} ${item.current_status || ''}`),
    })).filter((item) => item.score).sort((left, right) => right.score - left.score);
    const storylineRootIds = new Set(storylines.map((item) => item.legacy_event_id).filter(Boolean));
    const eventResults = events.filter((item) => !storylineRootIds.has(item.event_id)).map((item) => ({
      key: item.event_id,
      kind: 'Timeline',
      title: eventTitle(item),
      summary: eventLatestTitle(item),
      view: 'event',
      eventId: item.event_id,
      score: score(eventTitle(item), `${item.search_text || ''} ${item.summary || ''} ${eventLatestTitle(item)}`),
    })).filter((item) => item.score).sort((left, right) => right.score - left.score);
    const storyResults = stories.map((item) => ({
      key: storyRouteId(item),
      kind: 'Story',
      title: item.title,
      summary: conciseSummary(item.summary, 1),
      view: 'story',
      sid: storyRouteId(item),
      date: storyDate(item),
      score: score(item.title, `${storyTopic(item)} ${item.summary || ''}`),
    })).filter((item) => item.score).sort((left, right) => right.score - left.score);
    const best = [...storylineResults, ...eventResults, ...storyResults]
      .sort((left, right) => right.score - left.score)[0] || null;
    const withoutBest = (items) => items.filter(
      (item) => !best || item.kind !== best.kind || item.key !== best.key,
    );
    return {
      storylines: withoutBest(storylineResults).slice(0, 3),
      events: withoutBest(eventResults).slice(0, 4),
      stories: withoutBest(storyResults).slice(0, 4),
      best,
    };
  }, [events, normalized, stories, storylines]);
  const renderResult = (item, featured = false) => (
    <AppLink
      view={item.view}
      eventId={item.eventId}
      sid={item.sid}
      onNavigate={onNavigate}
      className={`global-search-result${featured ? ' is-best' : ''}`}
      key={`${item.kind}:${item.key}`}
    >
      <span>{featured ? 'Best match' : item.kind}{item.date ? ` · ${formatDate(item.date, { short: true, year: false })}` : ''}</span>
      <strong>{item.title}</strong>
      {item.summary ? <small>{item.summary}</small> : null}
      <b aria-hidden="true">→</b>
    </AppLink>
  );
  return (
    <section className={`global-coverage-search${normalized.length >= 2 ? ' is-open' : ''}`} aria-label="Search all Muninn coverage">
      <label>
        <span className="global-search-icon" aria-hidden="true" />
        <span className="global-search-label">Search coverage</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="People, places, and ongoing coverage"
        />
      </label>
      {query ? <button type="button" onClick={() => setQuery('')}>Clear</button> : null}
      {normalized.length >= 2 ? (
        <div className="global-search-panel">
          {resultGroups.best ? (
            <>
              {renderResult(resultGroups.best, true)}
              <div className="global-search-groups">
                {[
                  ['Situations', resultGroups.storylines],
                  ['Timelines', resultGroups.events],
                  ['Reports', resultGroups.stories],
                ].map(([label, items]) => items.length ? (
                  <section aria-label={`${label} search results`} key={label}>
                    <h2>{label}</h2>
                    <div>{items.map((item) => renderResult(item))}</div>
                  </section>
                ) : null)}
              </div>
            </>
          ) : (
            <div className="global-search-empty">
              <strong>No matching coverage</strong>
              <span>Try a person, place, subject, or timeline name.</span>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

const EVENT_DIRECTORY_PAGE_SIZE = 18;

function EventsDirectoryView({
  events,
  stories,
  storylines,
  initialMode,
  initialTopic,
  onNavigate,
}) {
  const hasSituationDirectory = storylines.length >= 2;
  const [query, setQuery] = useState('');
  const [directoryOpen, setDirectoryOpen] = useState(['browse', 'latest'].includes(initialMode));
  const [homeMode, setHomeMode] = useState(
    initialMode === 'situations' && hasSituationDirectory ? 'situations' : 'activity',
  );
  const [status, setStatus] = useState(initialMode === 'latest' ? 'recent' : 'all');
  const [topic, setTopic] = useState(initialTopic || 'all');
  const [visibleLimit, setVisibleLimit] = useState(EVENT_DIRECTORY_PAGE_SIZE);

  useEffect(() => {
    setDirectoryOpen(['browse', 'latest'].includes(initialMode));
    if (initialMode === 'situations') {
      setHomeMode(hasSituationDirectory ? 'situations' : 'activity');
    }
    if (initialMode === 'all') setHomeMode('activity');
    if (initialMode === 'latest') setStatus('recent');
  }, [hasSituationDirectory, initialMode]);

  useEffect(() => {
    setVisibleLimit(EVENT_DIRECTORY_PAGE_SIZE);
  }, [directoryOpen, query, status, topic]);

  const relatedStories = useMemo(() => {
    const map = new Map();
    stories.forEach((story) => {
      if (story.event_id && !map.has(story.event_id)) map.set(story.event_id, story);
    });
    return map;
  }, [stories]);
  const situationRootIds = useMemo(
    () => new Set(storylines.map((item) => item.legacy_event_id).filter(Boolean)),
    [storylines],
  );
  const storylineByEventId = useMemo(() => {
    const map = new Map();
    storylines.forEach((storyline) => {
      if (storyline.legacy_event_id) map.set(storyline.legacy_event_id, storyline);
      (storyline.child_events || []).forEach((child) => {
        if (child.event_id) map.set(child.event_id, storyline);
      });
    });
    return map;
  }, [storylines]);
  const latestAvailableDate = useMemo(
    () => [...events].map(eventLatestDate).filter(Boolean).sort().at(-1) || '',
    [events],
  );
  const ordered = useMemo(
    () => deduplicateEvents(events
      .filter((event) => eventDevelopmentCount(event) >= 2 && !situationRootIds.has(event.event_id))
      .sort((left, right) => {
        const leftStoryline = storylineByEventId.get(left.event_id);
        const rightStoryline = storylineByEventId.get(right.event_id);
        const leftScore = eventBriefingScore(
          left,
          latestAvailableDate,
          relatedStories.has(left.event_id),
          leftStoryline?.legacy_event_id === left.event_id,
        );
        const rightScore = eventBriefingScore(
          right,
          latestAvailableDate,
          relatedStories.has(right.event_id),
          rightStoryline?.legacy_event_id === right.event_id,
        );
        return rightScore - leftScore || String(eventLatestDate(right)).localeCompare(String(eventLatestDate(left)));
      })),
    [events, latestAvailableDate, relatedStories, storylineByEventId, situationRootIds],
  );
  const recentDevelopmentCandidates = deduplicateEvents(events
    .filter((event) => eventDevelopmentCount(event) >= 2))
    .filter((event) => dateDistanceInDays(latestAvailableDate, eventLatestDate(event)) <= 7)
    .sort((left, right) => (
      String(eventLatestDate(right)).localeCompare(String(eventLatestDate(left)))
      || eventDevelopmentCount(right) - eventDevelopmentCount(left)
    ));
  const recentlyUpdatedEvents = recentDevelopmentCandidates.slice(0, 8);
  const recentlyUpdatedEventIds = new Set(
    recentDevelopmentCandidates.slice(0, 5).map((event) => event.event_id),
  );
  const activeEvents = ordered
    .filter((event) => (
      eventDevelopmentCount(event) >= 3
      && dateDistanceInDays(latestAvailableDate, eventLatestDate(event)) <= 30
      && !recentlyUpdatedEventIds.has(event.event_id)
    ))
    .slice(0, 6);
  const orderedSituations = [...storylines].sort((left, right) => (
    String(right.current_status_as_of || '').localeCompare(String(left.current_status_as_of || ''))
    || (right.child_events?.length || 0) - (left.child_events?.length || 0)
  ));
  const activeEventCount = ordered.filter((event) => (
    eventDevelopmentCount(event) >= 3
    && dateDistanceInDays(latestAvailableDate, eventLatestDate(event)) <= 7
  )).length;
  const categoryFor = (event) => eventCategory(event, relatedStories.get(event.event_id));
  const topics = useMemo(() => {
    const counts = new Map();
    ordered.forEach((event) => {
      const label = eventCategory(event, relatedStories.get(event.event_id));
      if (!label || label === 'Ongoing coverage') return;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 10);
  }, [ordered, relatedStories]);
  const filtered = ordered.filter((event) => {
    const haystack = [
      eventTitle(event),
      event.topic_label,
      categoryFor(event),
      event.summary,
      eventLatestTitle(event),
    ].filter(Boolean).join(' ').toLowerCase();
    const age = dateDistanceInDays(latestAvailableDate, eventLatestDate(event));
    const matchesStatus = status === 'all'
      || (status === 'recent' && age <= 3)
      || (status === 'quiet' && age > 3);
    const matchesTopic = topic === 'all' || categoryFor(event) === topic;
    return matchesStatus
      && matchesTopic
      && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  });
  const visibleEvents = filtered.slice(0, visibleLimit);
  const remainingEventCount = Math.max(0, filtered.length - visibleEvents.length);
  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setTopic('all');
  };
  const openDirectory = () => {
    setDirectoryOpen(true);
    onNavigate('events', { mode: 'browse' });
  };
  const closeDirectory = () => {
    setDirectoryOpen(false);
    resetFilters();
    onNavigate('events', hasSituationDirectory && homeMode === 'situations' ? { mode: 'situations' } : {});
  };
  const showHomeMode = (nextMode) => {
    const availableMode = nextMode === 'situations' && !hasSituationDirectory ? 'activity' : nextMode;
    setDirectoryOpen(false);
    setHomeMode(availableMode);
    onNavigate('events', availableMode === 'situations' ? { mode: 'situations' } : {});
  };

  if (directoryOpen) {
    return (
      <main id="main" className="page-shell events-directory-page event-browse-page">
        <button type="button" className="event-directory-back" onClick={closeDirectory}>
          <span aria-hidden="true">←</span> Timelines
        </button>
        <PageIntroduction
          title="Browse timelines"
          aside={`${ordered.length} timelines`}
        />
        <section className="event-directory-tools" aria-label="Filter the timeline directory">
          <label>
            <span>Filter timelines</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by timeline name or subject"
            />
          </label>
          <div className="event-directory-status" aria-label="Filter by activity">
            {[
              ['all', 'All timelines'],
              ['recent', 'Updated recently'],
              ['quiet', 'Recently quiet'],
            ].map(([value, label]) => (
              <button
                type="button"
                className={status === value ? 'is-active' : ''}
                onClick={() => setStatus(value)}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="event-directory-topics" aria-label="Filter by topic">
            <button type="button" className={topic === 'all' ? 'is-active' : ''} onClick={() => setTopic('all')}>All topics</button>
            {topics.map(([label, count]) => (
              <button
                type="button"
                className={topic === label ? 'is-active' : ''}
                onClick={() => setTopic(label)}
                key={label}
              >
                {label} <small>{count}</small>
              </button>
            ))}
          </div>
        </section>
        <section className="event-directory-results" aria-labelledby="event-directory-results-title">
          <header className="event-briefing-section-heading">
            <div>
              <p className="eyebrow">Directory</p>
              <h2 id="event-directory-results-title">{topic !== 'all' ? topic : 'All timelines'}</h2>
            </div>
            <p>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</p>
          </header>
          {filtered.length ? (
            <>
              <div className="event-directory-result-grid">
                {visibleEvents.map((event) => (
                  <DevelopingEventCard
                    event={event}
                    relatedStory={relatedStories.get(event.event_id)}
                    storyline={storylineByEventId.get(event.event_id)}
                    onNavigate={onNavigate}
                    key={event.event_id}
                  />
                ))}
              </div>
              {remainingEventCount ? (
                <div className="event-directory-more">
                  <p>Showing {visibleEvents.length} of {filtered.length} timelines</p>
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((current) => current + EVENT_DIRECTORY_PAGE_SIZE)}
                  >
                    Show {Math.min(EVENT_DIRECTORY_PAGE_SIZE, remainingEventCount)} more
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="event-directory-no-results">
              <h2>No matching timelines</h2>
              <p>Try a broader subject or clear the directory filters.</p>
              <button type="button" onClick={resetFilters}>Clear filters</button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main id="main" className="page-shell events-directory-page events-briefing-page">
      <header className="events-home-intro">
        <div className="events-home-title-group">
          <div className="events-home-title-row">
            <div className="events-home-heading">
              <h1>Timelines</h1>
            </div>
            <GlobalCoverageSearch
              stories={stories}
              events={ordered}
              storylines={storylines}
              onNavigate={onNavigate}
            />
            <div className="events-home-status" aria-label={`${activeEventCount} timelines updated this week`}>
              <strong>{activeEventCount}</strong>
              <span>Updated<small>this week</small></span>
            </div>
          </div>
        </div>
      </header>

      <nav className="events-view-tabs" aria-label="Choose a Timelines view">
        <button
          type="button"
          className={homeMode === 'activity' ? 'is-active' : ''}
          aria-current={homeMode === 'activity' ? 'page' : undefined}
          onClick={() => showHomeMode('activity')}
        >
          <span>Latest changes</span>
        </button>
        {hasSituationDirectory ? (
          <button
            type="button"
            className={homeMode === 'situations' ? 'is-active' : ''}
            aria-current={homeMode === 'situations' ? 'page' : undefined}
            onClick={() => showHomeMode('situations')}
          >
            <span>Situations</span>
            <small>{orderedSituations.length}</small>
          </button>
        ) : null}
        <button type="button" onClick={openDirectory}>
          <span>All timelines</span>
        </button>
      </nav>

      {orderedSituations.length === 1 ? (
        <aside className="events-featured-situation" aria-label="Featured Situation">
          <span>Featured Situation</span>
          <AppLink
            view="event"
            eventId={orderedSituations[0].legacy_event_id}
            onNavigate={onNavigate}
            className="events-single-situation-link"
            aria-label={`Open the ${orderedSituations[0].title} Situation`}
          >
            <strong>{orderedSituations[0].title}</strong>
            <small>See the connected coverage</small>
            <b aria-hidden="true">→</b>
          </AppLink>
        </aside>
      ) : null}

      {homeMode === 'activity' ? (
        <div className="events-activity-view">
          {recentlyUpdatedEvents.length ? (
            <section className="event-movement-section event-latest-developments" aria-labelledby="latest-developments-title">
              <DevelopmentTimeline
                events={recentlyUpdatedEvents}
                referenceDate={latestAvailableDate}
                relatedStories={relatedStories}
                situationByEventId={storylineByEventId}
                onNavigate={onNavigate}
              />
            </section>
          ) : null}

          {orderedSituations.length > 1 ? (
            <section className="current-situation-feature" aria-labelledby="current-situation-feature-title">
              <header className="event-briefing-section-heading">
                <div>
                  <p className="eyebrow">The larger picture</p>
                  <h2 id="current-situation-feature-title">Current Situation</h2>
                </div>
                {orderedSituations.length > 1 ? (
                  <button type="button" onClick={() => showHomeMode('situations')}>
                    View all {orderedSituations.length} Situations <span aria-hidden="true">→</span>
                  </button>
                ) : null}
              </header>
              <SituationCard
                situation={orderedSituations[0]}
                rootEvent={events.find((event) => event.event_id === orderedSituations[0].legacy_event_id)}
                onNavigate={onNavigate}
                compact
              />
            </section>
          ) : null}

          {activeEvents.length ? (
            <section className="event-active-section" aria-labelledby="active-events-title">
              <header className="event-briefing-section-heading">
                <div>
                  <p className="eyebrow">Still unfolding</p>
                  <h2 id="active-events-title">Active timelines</h2>
                </div>
              </header>
              <HalfStepCarousel
                className="active-event-carousel"
                ariaLabel="Active timelines"
                itemCount={activeEvents.length}
                itemsPerColumn={1}
                singleColumnOnMobile
              >
                {activeEvents.map((event) => (
                  <div className="developing-event-grid active-event-column" key={`active-event-column-${event.event_id}`}>
                    <DevelopingEventCard
                      event={event}
                      relatedStory={relatedStories.get(event.event_id)}
                      storyline={storylineByEventId.get(event.event_id)}
                      onNavigate={onNavigate}
                      quiet
                    />
                  </div>
                ))}
              </HalfStepCarousel>
            </section>
          ) : null}
        </div>
      ) : (
        <section className="situations-home-section" aria-labelledby="current-situations-title">
          <header className="event-briefing-section-heading">
            <div>
              <p className="eyebrow">The larger picture</p>
              <h2 id="current-situations-title">Current situations</h2>
            </div>
            <p>Specific evolving contexts formed by multiple connected Events.</p>
          </header>
          {orderedSituations.length ? (
            <div className="storyline-overview-grid situation-overview-grid">
              {orderedSituations.map((situation) => (
                <SituationCard
                  situation={situation}
                  rootEvent={events.find((event) => event.event_id === situation.legacy_event_id)}
                  onNavigate={onNavigate}
                  key={situation.coverage_id || situation.storyline_id || situation.title}
                />
              ))}
            </div>
          ) : (
            <div className="situations-empty-state">
              <h3>No multi-Event Situations yet</h3>
              <p>A Situation will appear here when several distinct Events form one larger, bounded context.</p>
            </div>
          )}
        </section>
      )}

    </main>
  );
}

function ArchiveView({ recent, onNavigate }) {
  const days = Array.isArray(recent?.days) ? recent.days : [];
  return (
    <main id="main" className="page-shell directory-page archive-page">
      <AppLink view="today" onNavigate={onNavigate} className="back-link">
        <span aria-hidden="true">←</span> Back to Today
      </AppLink>
      <PageIntroduction
        title="Archive"
        aside={`${days.length} recent ${days.length === 1 ? 'edition' : 'editions'}`}
      />
      {days.map((day) => {
        const stories = scopedStories(day, `archive-${day.date}`);
        return (
          <section className="archive-edition" key={day.date}>
            <header className="section-heading compact">
              <div>
                <p className="eyebrow">Daily edition</p>
                <h2>{formatDate(day.date)}</h2>
              </div>
              <p>{stories.length} stories</p>
            </header>
            <div className="archive-story-grid">
              {stories.slice(0, 6).map((story) => (
                <DirectoryStoryCard story={story} onNavigate={onNavigate} key={storyRouteId(story)} />
              ))}
            </div>
          </section>
        );
      })}
      {!days.length ? (
        <section className="directory-empty">
          <p className="eyebrow">Archive</p>
          <h2>Recent editions are temporarily unavailable.</h2>
          <p>Today’s briefing is still available from the main navigation.</p>
        </section>
      ) : null}
    </main>
  );
}

function weeklyIssueMetadata(issue) {
  const topics = [];
  const seenTopics = new Set();
  (issue?.sections || []).forEach((section, sectionIndex) => {
    const label = section.kicker || section.contents_label || section.title;
    if (!label || seenTopics.has(label)) return;
    seenTopics.add(label);
    topics.push({ label, sectionIndex });
  });
  return {
    edition_id: issue?.edition_id || '',
    publication: issue?.publication || 'Muninn Weekly',
    headline: issue?.headline || 'Weekly edition',
    dek: issue?.dek || '',
    coverage_window: issue?.coverage_window || {},
    reading_time_minutes: issue?.reading_time_minutes || 5,
    cover_image: issue?.cover_image || null,
    categories: topics.map((topic) => topic.label),
    topics,
  };
}

function WeeklyView({ edition, onNavigate }) {
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (edition) return undefined;
    let active = true;
    Promise.all([
      fetchFirst(['/Current_news/weekly_newsletter.json', '/current_news/weekly_newsletter.json']),
      fetchOptional(WEEKLY_INDEX_URLS),
    ]).then(([latest, index]) => {
      if (!active) return;
      const latestMetadata = weeklyIssueMetadata(latest);
      const archived = Array.isArray(index?.issues) ? index.issues : [];
      setIssues([
        latestMetadata,
        ...archived.filter((item) => item.edition_id !== latestMetadata.edition_id),
      ]);
      setError('');
    }).catch(() => {
      if (active) setError('The weekly archive could not be loaded.');
    });
    return () => { active = false; };
  }, [edition]);

  if (edition) {
    return (
      <main id="main" className="page-shell weekly-page weekly-issue-page">
        <AppLink view="weekly" onNavigate={onNavigate} className="back-link weekly-back-link">
          <span aria-hidden="true">←</span> Weekly archive
        </AppLink>
        <div className="weekly-reader-frame">
          <WeeklyLetter sourceUrl={`/Current_news/weekly_newsletters/${encodeURIComponent(edition)}.json`} />
        </div>
      </main>
    );
  }

  if (error) return <MissingState message={error} />;
  if (!issues.length) return <LoadingState />;
  const [latest, ...archive] = issues;
  const latestWindow = latest.coverage_window || {};
  return (
    <main id="main" className="page-shell weekly-page weekly-index-page">
      <header className="weekly-index-heading">
        <div>
          <h1>Muninn Weekly</h1>
        </div>
        <span>Published Saturdays</span>
      </header>

      <section className="weekly-latest-card" aria-labelledby="latest-weekly-title">
        <div className="weekly-latest-copy">
          <p className="eyebrow">Latest edition</p>
          <p className="weekly-card-date">
            {formatDate(latestWindow.start_date, { short: true })}–{formatDate(latestWindow.end_date, { short: true })}
            <span> · {latest.reading_time_minutes} min read</span>
          </p>
          <h2 id="latest-weekly-title">
            <AppLink view="weekly" edition={latest.edition_id} onNavigate={onNavigate} className="weekly-latest-title-link">
              {latest.headline}
            </AppLink>
          </h2>
          <p>{latest.dek}</p>
          {latest.topics?.length ? (
            <div className="weekly-category-list" aria-label="Topics in this edition">
              {latest.topics.map((topic) => (
                <AppLink
                  view="weekly"
                  edition={latest.edition_id}
                  hash={`weekly-section-${topic.sectionIndex + 1}`}
                  onNavigate={onNavigate}
                  key={topic.label}
                >
                  {topic.label}
                </AppLink>
              ))}
            </div>
          ) : null}
          <AppLink view="weekly" edition={latest.edition_id} onNavigate={onNavigate} className="weekly-read-link">
            Read the latest edition <span aria-hidden="true">→</span>
          </AppLink>
        </div>
        {latest.cover_image?.url ? (
          <AppLink view="weekly" edition={latest.edition_id} onNavigate={onNavigate} className="weekly-latest-cover" aria-label={`Read ${latest.headline}`}>
            <img src={latest.cover_image.url} alt={latest.cover_image.alt || ''} />
          </AppLink>
        ) : null}
      </section>

      {archive.length ? (
        <section className="weekly-archive" aria-labelledby="weekly-archive-title">
          <header>
            <div>
              <p className="eyebrow">Previous journals</p>
              <h2 id="weekly-archive-title">Earlier editions</h2>
            </div>
            <p>{archive.length} {archive.length === 1 ? 'edition' : 'editions'}</p>
          </header>
          <div className="weekly-archive-list">
            {archive.map((issue) => {
              const coverage = issue.coverage_window || {};
              return (
                <article key={issue.edition_id}>
                  <AppLink view="weekly" edition={issue.edition_id} onNavigate={onNavigate}>
                    <div>
                      <time dateTime={issue.edition_id}>{formatDate(coverage.end_date || issue.edition_id)}</time>
                      <h3>{issue.headline}</h3>
                      <p>{issue.dek}</p>
                      {issue.categories?.length ? (
                        <div className="weekly-category-list">
                          {issue.categories.map((category) => <span key={category}>{category}</span>)}
                        </div>
                      ) : null}
                    </div>
                    <span>{formatDate(coverage.start_date, { short: true, year: false })}–{formatDate(coverage.end_date, { short: true, year: false })}</span>
                    <b aria-hidden="true">→</b>
                  </AppLink>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <p className="weekly-archive-empty">The archive begins with the next Saturday edition.</p>
      )}
    </main>
  );
}

function MyNewsIcon({ name }) {
  const paths = {
    compass: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m15.7 8.3-2.1 5.3-5.3 2.1 2.1-5.3 5.3-2.1Z" />
      </>
    ),
    place: (
      <>
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    ),
    focus: (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
      </>
    ),
    follow: (
      <>
        <path d="M5 6.5h14v10H8l-3 3v-13Z" />
        <path d="M8.5 10h7M8.5 13h4.5" />
      </>
    ),
    bookmark: (
      <path d="M7 4.5h10v15l-5-3.2-5 3.2v-15Z" />
    ),
    mail: (
      <>
        <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
        <path d="m4.5 7 7.5 6 7.5-6" />
      </>
    ),
  };
  return (
    <svg className="mn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name] || paths.compass}
    </svg>
  );
}

function MyNewsPreview() {
  return (
    <main id="main" className="page-shell my-news-page">
      <header className="mn-hero">
        <div className="mn-hero-copy">
          <div className="mn-preview-label"><span>Preview</span> What comes next</div>
          <h1>You choose what Muninn follows.</h1>
          <p>Choose interests and places, track stories, and subscribe to newsletters.</p>
        </div>

        <aside className="mn-profile-card" aria-label="The three choices in My News">
          <header>
            <span><i /> What you will control</span>
            <strong>Make Muninn yours.</strong>
          </header>
          <ol className="mn-control-list">
            <li><b>01</b><span><strong>Choose your focus</strong></span></li>
            <li><b>02</b><span><strong>Track stories</strong></span></li>
            <li><b>03</b><span><strong>Choose newsletters</strong></span></li>
          </ol>
          <p>Coming after the beta.</p>
        </aside>
      </header>

      <div className="mn-concept-note" role="note">
        <strong>Preview only</strong>
        <span>These features are not active yet.</span>
      </div>

      <section className="mn-future-section" aria-labelledby="mn-future-title">
        <header className="mn-section-heading">
          <div>
            <p className="eyebrow">The choices</p>
            <h2 id="mn-future-title">Three ways to make Muninn yours</h2>
          </div>
        </header>

        <div className="mn-dashboard" aria-label="The three future choices in My News">
          <div className="mn-dashboard-bar">
            <div><img src="/brand/muninn-mark.svg" alt="" /><strong>My News</strong></div>
            <span>Your choices</span>
          </div>

          <div className="mn-dashboard-intro">
            <div>
              <small>Future controls</small>
              <h3>What you will choose</h3>
            </div>
          </div>

          <div className="mn-dashboard-grid">
            <article className="mn-essential-card">
              <div className="mn-card-index">01</div>
              <div className="mn-card-icon"><MyNewsIcon name="focus" /></div>
              <p className="mn-card-kicker">Choose your focus</p>
              <h3>Choose the interests and places you care about.</h3>
              <div className="mn-focus-preview">
                <div>
                  <span>Places</span>
                  <strong>Connecticut + Boston</strong>
                </div>
                <div>
                  <span>Interest</span>
                  <strong>Rowing</strong>
                </div>
                <div>
                  <span>Fields</span>
                  <strong>AI · Science · Business</strong>
                </div>
              </div>
            </article>

            <article className="mn-focus-card">
              <div className="mn-card-index">02</div>
              <div className="mn-card-icon"><MyNewsIcon name="follow" /></div>
              <p className="mn-card-kicker">Track stories</p>
              <h3>Follow a Story, Event, or topic.</h3>
              <div className="mn-follow-preview">
                <div><i /><span><small>Tracked Event</small><strong>New developments gathered together</strong></span><b>2 new</b></div>
                <div><i /><span><small>Tracked topic</small><strong>Coverage appears when the subject moves</strong></span><b>Today</b></div>
              </div>
            </article>

            <article className="mn-follow-card">
              <div className="mn-card-index">03</div>
              <div className="mn-card-icon"><MyNewsIcon name="mail" /></div>
              <p className="mn-card-kicker">Choose newsletters</p>
              <h3>Subscribe to the editions you want.</h3>
              <div className="mn-newsletter-list">
                <div><span><strong>Muninn Weekly</strong><small>The big picture, every Saturday</small></span><b>Coming soon</b></div>
                <div><span><strong>More editions</strong><small>New choices as Muninn grows</small></span><b>Coming</b></div>
              </div>
              <p className="mn-alert-note">Static preview · No email is collected on this page.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mn-library-section" aria-label="What stays broad and an example reader mix">
        <article className="mn-saved-card">
          <div className="mn-feature-heading">
            <span><MyNewsIcon name="compass" /></span>
            <div><p className="eyebrow">Still included</p><h2>Important news stays visible.</h2></div>
          </div>
          <p>Your choices change emphasis, not access.</p>
          <ul className="mn-promise-list">
            <li>Essential headlines</li>
            <li>Source-grounded reporting</li>
            <li>All Muninn coverage</li>
          </ul>
        </article>
      </section>

      <footer className="mn-preview-footer">
        <img src="/brand/muninn-mark.svg" alt="" />
        <div><strong>My News is coming next.</strong><span>Choose what Muninn should emphasize, track, and deliver.</span></div>
      </footer>
    </main>
  );
}

function MissingState({ message }) {
  return (
    <main id="main" className="page-shell missing-state">
      <p className="eyebrow">Muninn</p>
      <h1>Nothing to show here yet.</h1>
      <p>{message}</p>
      <a href="/">Return to Today</a>
    </main>
  );
}

function LoadingState() {
  return (
    <main id="main" className="page-shell loading-state">
      <img src="/brand/muninn-mark.svg" alt="" />
      <p>Assembling the briefing…</p>
    </main>
  );
}

export default function ReaderApp() {
  const [route, setRoute] = useState(readRoute);
  const [archiveContext, setArchiveContext] = useState({
    edition: '',
    status: 'idle',
    stories: [],
    events: [],
  });
  const [data, setData] = useState({
    digest: null,
    events: null,
    recent: null,
    catchup: null,
    coverage: null,
    recentStatus: 'idle',
    catchupStatus: 'idle',
    error: '',
  });

  useEffect(() => {
    Promise.all([
      fetchFirst(DIGEST_URLS),
      fetchFirst(EVENT_URLS),
      fetchOptional(COVERAGE_URLS),
    ])
      .then(([digest, events, coverage]) => setData((current) => ({
        ...current,
        digest,
        events,
        coverage,
        error: '',
      })))
      .catch((error) => setData((current) => ({
        ...current,
        digest: null,
        events: null,
        error: error.message,
      })));
  }, []);

  const needsRecent = ['events', 'event', 'archive'].includes(route.view)
    || (route.view === 'story' && route.sid.startsWith('archive-'));
  const needsCatchup = route.view === 'catch-up'
    || route.from === 'catch-up'
    || (route.view === 'story' && route.sid.startsWith('catchup-'));

  useEffect(() => {
    if (!needsRecent || data.recentStatus !== 'idle') return undefined;
    setData((current) => ({ ...current, recentStatus: 'loading' }));
    fetchOptional(RECENT_URLS).then((recent) => {
      setData((current) => ({ ...current, recent, recentStatus: 'ready' }));
    });
    return undefined;
  }, [data.recentStatus, needsRecent]);

  useEffect(() => {
    if (!needsCatchup || data.catchupStatus !== 'idle') return undefined;
    setData((current) => ({ ...current, catchupStatus: 'loading' }));
    fetchOptional(CATCHUP_URLS).then((catchup) => {
      setData((current) => ({ ...current, catchup, catchupStatus: 'ready' }));
    });
    return undefined;
  }, [data.catchupStatus, needsCatchup]);

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    // Route changes must never paint at the previous page's scroll position.
    // Hash destinations are resolved after the new view mounts, but still begin
    // from the top so a slow/mobile render cannot expose the outgoing position.
    resetPageScroll();
    const targetId = window.location.hash.replace(/^#/, '');
    if (!targetId) return undefined;

    let active = true;
    let timer = null;
    let attempts = 0;
    const scrollToTarget = () => {
      if (!active) return;
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      attempts += 1;
      if (attempts < 40) timer = window.setTimeout(scrollToTarget, 75);
    };
    timer = window.setTimeout(scrollToTarget, 0);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [
    route.view,
    route.sid,
    route.eventId,
    route.mode,
    route.topic,
    route.edition,
    route.archiveDate,
    route.days,
    route.from,
  ]);

  useEffect(() => {
    if (!route.edition || !['story', 'event'].includes(route.view)) {
      setArchiveContext({ edition: '', status: 'idle', stories: [], events: [] });
      return undefined;
    }
    let active = true;
    setArchiveContext({ edition: route.edition, status: 'loading', stories: [], events: [] });
    fetch(`/Current_news/weekly_newsletters/${encodeURIComponent(route.edition)}.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Weekly edition returned ${response.status}`);
        return response.json();
      })
      .then((issue) => {
        if (!active) return;
        const snapshot = weeklyReaderSnapshot(issue);
        setArchiveContext({ edition: route.edition, status: 'ready', ...snapshot });
      })
      .catch(() => {
        if (active) {
          setArchiveContext({ edition: route.edition, status: 'unavailable', stories: [], events: [] });
        }
      });
    return () => { active = false; };
  }, [route.edition, route.view]);

  const stories = useMemo(
    () => (Array.isArray(data.digest?.clusters) ? data.digest.clusters : []),
    [data.digest],
  );
  const events = useMemo(
    () => (Array.isArray(data.events?.events) ? data.events.events : []),
    [data.events],
  );
  const archiveStories = useMemo(
    () => (Array.isArray(data.recent?.days) ? data.recent.days : [])
      .flatMap((day) => scopedStories(day, `archive-${day.date}`)),
    [data.recent],
  );
  const catchupStories = useMemo(
    () => (Array.isArray(data.catchup?.days) ? data.catchup.days : [])
      .flatMap((day) => scopedStories(day, `catchup-${day.date}`)),
    [data.catchup],
  );
  const catchupGroups = useMemo(() => {
    if (!data.catchup) return [];
    return buildCatchupBriefing(catchupEditions(data.catchup), { days: route.days }).groups;
  }, [data.catchup, route.days]);
  const storylines = useMemo(
    () => (Array.isArray(data.coverage?.collections) ? data.coverage.collections : []),
    [data.coverage],
  );
  const allStories = useMemo(
    () => [
      ...stories,
      ...archiveStories,
      ...catchupStories,
      ...archiveContext.stories,
    ],
    [stories, archiveStories, catchupStories, archiveContext.stories],
  );
  const allEvents = useMemo(
    () => deduplicateEvents([...archiveContext.events, ...events]),
    [archiveContext.events, events],
  );

  const defaultStory = stories[1] || stories[0];
  const defaultEvent = useMemo(() => {
    const connected = events.find((item) => item.event_id === defaultStory?.event_id);
    return connected
      || events.find((item) => item.presentation?.has_full_timeline)
      || events[0];
  }, [defaultStory, events]);

  useEffect(() => {
    const routeStory = allStories.find(
      (story) => storyRouteId(story) === route.sid
        || story.story_id === route.sid
        || story.cluster_id === route.sid,
    ) || (/^\d+$/.test(route.sid) ? stories[Number(route.sid)] : null);
    const routeEvent = allEvents.find((event) => event.event_id === route.eventId)
      || allEvents.find((event) => event.event_id === routeStory?.event_id);
    const routeStoryline = storylines.find(
      (storyline) => storyline.legacy_event_id === routeEvent?.event_id,
    );
    const labels = {
      today: 'Digests',
      'catch-up': `Catch-Up · ${route.days} days`,
      digest: 'Daily Digest',
      events: route.mode === 'browse'
        ? 'Browse Timelines'
        : route.mode === 'situations' ? 'Situations' : 'Timelines',
      story: routeStory?.title || 'Story',
      event: routeStoryline?.title || eventTitle(routeEvent),
      weekly: 'Weekly',
      'my-news': 'My News',
      archive: 'Archive',
    };
    document.title = `${labels[route.view] || 'Muninn'} — Muninn`;
  }, [allEvents, allStories, route, stories, storylines]);

  const navigate = (view, extras = {}) => {
    let contextualExtras = extras;
    if (route.edition && ['story', 'event'].includes(view)) {
      contextualExtras = { edition: route.edition, ...contextualExtras };
    }
    if (route.from === 'catch-up' && ['story', 'event'].includes(view)) {
      contextualExtras = {
        from: 'catch-up',
        days: route.days,
        ...contextualExtras,
      };
    }
    const href = routeHref(view, contextualExtras);
    // Reset before React swaps views; otherwise the destination briefly paints
    // halfway down the page while a smooth scroll animation catches up.
    if (!extras.replace) resetPageScroll();
    window.history[extras.replace ? 'replaceState' : 'pushState']({}, '', href);
    setRoute(readRoute());
  };

  if (route.view !== 'my-news' && data.error) return <MissingState message={data.error} />;
  if (route.view !== 'my-news' && (!data.digest || !data.events)) return <LoadingState />;
  if (needsRecent && data.recentStatus !== 'ready') return <LoadingState />;
  if (needsCatchup && data.catchupStatus !== 'ready') return <LoadingState />;
  if (route.view !== 'my-news' && archiveContext.status === 'loading') return <LoadingState />;

  const matchedStory = allStories.find(
    (story) => storyRouteId(story) === route.sid
      || story.story_id === route.sid
      || story.cluster_id === route.sid,
  )
    || (/^\d+$/.test(route.sid) ? stories[Number(route.sid)] : null);
  const selectedStory = route.sid ? matchedStory : defaultStory;
  const matchedEvent = allEvents.find((event) => event.event_id === route.eventId);
  const selectedEvent = route.eventId
    ? matchedEvent
    : allEvents.find((event) => event.event_id === selectedStory?.event_id) || defaultEvent;
  const selectedStoryline = storylines.find(
    (storyline) => storyline.legacy_event_id === selectedEvent?.event_id,
  );
  const parentStoryline = storylines.find(
    (storyline) => (storyline.child_events || []).some(
      (child) => child.event_id === selectedEvent?.event_id,
    ),
  );
  const storyEvent = allEvents.find((event) => event.event_id === selectedStory?.event_id);
  const relatedStories = (route.from === 'catch-up' ? catchupGroups : stories)
    .filter((story) => storyRouteId(story) !== storyRouteId(selectedStory)
      && (route.from !== 'catch-up' || !selectedStory?.event_id || story.event_id !== selectedStory.event_id));
  const returnContext = route.from === 'catch-up'
    ? { from: 'catch-up', days: route.days }
    : undefined;
  const storylineChildIds = new Set(
    storylines.flatMap((item) => item.child_events || []).map((item) => item.event_id).filter(Boolean),
  );
  const otherEvents = deduplicateEvents(events
    .filter((event) => event.event_id !== selectedEvent?.event_id
      && event.presentation?.has_full_timeline
      && !storylineChildIds.has(event.event_id))
    .sort((a, b) => (b.presentation?.rank_score || 0) - (a.presentation?.rank_score || 0)));
  return (
    <div className={`reader-app resolved-reader${route.view === 'event' ? ' event-layout-c' : ''}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header view={route.view} from={route.from} onNavigate={navigate} />
      {route.view === 'today' ? (
        <TodayView digest={data.digest} onNavigate={navigate} />
      ) : null}
      {route.view === 'catch-up' ? (
        <CatchupView
          catchup={data.catchup}
          days={route.days}
          onNavigate={navigate}
        />
      ) : null}
      {/*
      {route.view === 'digest' ? (
        <DigestView digest={data.digest} stories={allStories} onNavigate={navigate} />
      ) : null}
      */}
      {route.view === 'events' ? (
        <EventsDirectoryView
          events={events}
          stories={allStories}
          storylines={storylines}
          initialMode={route.mode}
          initialTopic={route.topic}
          onNavigate={navigate}
        />
      ) : null}
      {route.view === 'story' ? (
        <StoryView
          story={selectedStory}
          event={storyEvent}
          relatedStories={relatedStories}
          returnContext={returnContext}
          onNavigate={navigate}
        />
      ) : null}
      {route.view === 'weekly' ? (
        <WeeklyView edition={route.edition} onNavigate={navigate} />
      ) : null}
      {route.view === 'my-news' ? (
        <MyNewsPreview />
      ) : null}
      {route.view === 'archive' ? (
        <ArchiveView recent={data.recent} onNavigate={navigate} />
      ) : null}
      {route.view === 'event' ? (
        <EventView
          event={selectedEvent}
          storyline={selectedStoryline}
          parentStoryline={parentStoryline}
          currentStoryId={route.sid}
          events={events}
          stories={allStories}
          otherEvents={otherEvents}
          returnContext={returnContext}
          onNavigate={navigate}
        />
      ) : null}
      <footer className="site-footer">
        <div>
          <img src="/brand/muninn-mark.svg" alt="" />
          <span><strong>Muninn</strong><small>News, Simplified.</small></span>
        </div>
        <p>Independent synthesis · Current edition</p>
      </footer>
    </div>
  );
}
