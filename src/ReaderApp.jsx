import React, { useEffect, useMemo, useRef, useState } from 'react';
import WeeklyLetter from './WeeklyLetter';
import './ReaderApp.css';

const DIGEST_URLS = ['/Current_news/digest.json', '/current_news/digest.json'];
const EVENT_URLS = ['/Current_news/event_timelines.json', '/current_news/event_timelines.json'];
const RECENT_URLS = ['/Current_news/recent_news.json', '/current_news/recent_news.json'];
const COVERAGE_URLS = ['/Current_news/coverage_collections.json', '/current_news/coverage_collections.json'];

const VIEW_LABELS = {
  today: 'Today',
  events: 'Events',
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
  dw: 'dw',
  'dw english': 'dw',
  euronews: 'euronews',
  'fox news': 'fox-news',
  'france 24': 'france-24',
  'google news': 'google-news',
  'nbc news': 'nbc-news',
  npr: 'npr',
  'pbs news': 'pbs-news',
  reuters: 'reuters',
  'rte news': 'rte-news',
  'the guardian': 'the-guardian',
};

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
  };
}

function routeHref(view, extras = {}) {
  const params = new URLSearchParams();
  if (view !== 'today') params.set('view', view);
  if (extras.sid) params.set('sid', extras.sid);
  if (extras.eventId) params.set('event', extras.eventId);
  if (extras.mode && extras.mode !== 'all') params.set('mode', extras.mode);
  if (extras.topic && extras.topic !== 'all') params.set('topic', extras.topic);
  const query = params.toString();
  return `/${query ? `?${query}` : ''}`;
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

function cleanSourceName(value = '') {
  return String(value)
    .replace(/\s*-\s*(top stories|latest|world|english|home|politics)$/i, '')
    .trim();
}

function sourceLogoPath(value = '') {
  const clean = cleanSourceName(value).toLowerCase();
  const slug = SOURCE_LOGO_ALIASES[clean];
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
  return story?.topic_label || story?.primary_category || story?.category || 'Today';
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
]);

function eventTitle(event) {
  const rawTitle = event?.presentation?.base_title
    || event?.topic_label
    || event?.canonical_title
    || event?.title
    || 'Tracked event';
  return EVENT_TITLE_OVERRIDES.get(event?.event_id) || rawTitle;
}

function eventCategory(event, relatedStory) {
  return relatedStory?.primary_category
    || relatedStory?.category
    || event?.primary_category
    || event?.category
    || event?.presentation?.primary_category
    || '';
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
  if (Array.isArray(story?.sources) && story.sources.length) return story.sources;
  return (story?.items || []).map((item) => item.source).filter(Boolean);
}

function sourceCount(story) {
  return story?.source_count || sourceList(story).length || 1;
}

function AppLink({
  view,
  sid,
  eventId,
  mode,
  topic,
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

function Header({ view, onNavigate }) {
  const todayActive = view === 'today' || view === 'story' || view === 'archive';
  const eventsActive = view === 'events' || view === 'event';
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <AppLink view="today" onNavigate={onNavigate} className="wordmark" aria-label="Muninn Today">
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
            Today
          </AppLink>
          <AppLink
            view="events"
            onNavigate={onNavigate}
            className={eventsActive ? 'is-active' : ''}
            aria-current={eventsActive ? 'page' : undefined}
          >
            Events
          </AppLink>
          <AppLink
            view="weekly"
            onNavigate={onNavigate}
            className={view === 'weekly' ? 'is-active' : ''}
            aria-current={view === 'weekly' ? 'page' : undefined}
          >
            Weekly
          </AppLink>
        </nav>
      </div>
    </header>
  );
}

function LeadStory({ story, onNavigate }) {
  const update = storyUpdateLabel(story);
  return (
    <article className={`lead-story${update ? ' is-update' : ''}`}>
      <AppLink
        view="story"
        sid={storyRouteId(story)}
        onNavigate={onNavigate}
        className="lead-story-link"
        aria-label={`Read ${story.title}`}
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
            <SourceMarks story={story} limit={3} />
          </div>
        </div>
      </AppLink>
    </article>
  );
}

function storyUpdateLabel(story) {
  const context = story?.story_context || {};
  if (!context.available || (context.development_count || context.highlights?.length || 0) < 2) return '';
  const eventLabel = context.event_title || context.display_title || '';
  return eventLabel && eventLabel.length <= 48 ? eventLabel : storyTopic(story);
}

function SupportingStory({ story, onNavigate }) {
  const update = storyUpdateLabel(story);
  return (
    <article className={`support-story${update ? ' is-update' : ''}`}>
      <AppLink
        view="story"
        sid={storyRouteId(story)}
        onNavigate={onNavigate}
        className="support-story-link"
        aria-label={`Read ${story.title}`}
      >
          <div className="support-story-copy">
            <div className={`story-kicker-row${update ? ' is-update' : ''}`}>
              <span>
                {update ? <span className="today-update-dot" aria-label="Updated" data-tooltip="Updated" /> : null}
                {update || storyTopic(story)}
              </span>
            </div>
          <h2>{story.title}</h2>
          <SourceMarks story={story} compact limit={3} />
        </div>
        <StoryImage story={story} className="support-story-image" role="support" />
      </AppLink>
    </article>
  );
}

function VisualStory({ story, onNavigate }) {
  const update = storyUpdateLabel(story);
  return (
    <article className={`today-visual-story${update ? ' is-update' : ''}`}>
      <AppLink
        view="story"
        sid={storyRouteId(story)}
        onNavigate={onNavigate}
        className="today-visual-story-link"
        aria-label={`Read ${story.title}`}
      >
        <div className="today-visual-copy">
          <span className={`today-story-label${update ? ' is-update' : ''}`}>
            {update ? <span className="today-update-dot" aria-label="Updated" data-tooltip="Updated" /> : null}
            {storyTopic(story)}
          </span>
          <h3>{story.title}</h3>
          <SourceMarks story={story} compact limit={3} />
        </div>
        <StoryImage story={story} className="today-visual-image" role="standard" showRole={false} />
      </AppLink>
    </article>
  );
}

function HeadlineStory({ story, onNavigate }) {
  const update = storyUpdateLabel(story);
  return (
    <article className={`today-headline-story${update ? ' is-update' : ''}`}>
      <AppLink
        view="story"
        sid={storyRouteId(story)}
        onNavigate={onNavigate}
        aria-label={`Read ${story.title}`}
      >
        <span className={`today-story-label${update ? ' is-update' : ''}`}>
          {update ? <span className="today-update-dot" aria-label="Updated" data-tooltip="Updated" /> : null}
          {storyTopic(story)}
        </span>
        <h3>{story.title}</h3>
      </AppLink>
    </article>
  );
}

function TodayView({ digest, onNavigate }) {
  const stories = Array.isArray(digest?.clusters) ? digest.clusters : [];
  const edition = editionTimestamp(digest?.briefing?.as_of || digest?.generated_at);
  const opening = stories.slice(0, 4);
  const visualStories = stories.slice(4, 10);
  const headlineStories = stories.slice(10);
  const displayedHeadlineStories = headlineStories.length % 3 === 1
    ? headlineStories.slice(0, -1)
    : headlineStories;
  return (
    <main id="main" className="page-shell today-page">
      <section className="briefing-heading">
        <div className="briefing-heading-copy">
          <h1>Latest News</h1>
        </div>
        <p className="edition-date">{edition.weekday}, {edition.date}</p>
      </section>

      {opening.length ? (
        <section className="opening-stories" aria-label="Top stories">
          <LeadStory story={opening[0]} onNavigate={onNavigate} />
          <div className="supporting-stories">
            {opening.slice(1).map((story) => (
              <SupportingStory
                key={storyRouteId(story)}
                story={story}
                onNavigate={onNavigate}
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
            />
          ))}
        </section>
      ) : null}

      <section className="caught-up" aria-label="End of today's briefing">
        <img src="/brand/muninn-mark.svg" alt="" />
        <div>
          <h2>You’re caught up</h2>
          <p>Follow developing stories in Events or browse previous weekly newsletters. These stories—and others—will be brought together in the next weekly edition, published Saturday.</p>
          <AppLink view="archive" onNavigate={onNavigate}>Browse previous editions →</AppLink>
        </div>
      </section>
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
        <span>Part of an ongoing story</span>
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
      heading: section.heading,
      body: section.body,
      role: section.role || 'background',
    }));
  }
  return (Array.isArray(story?.explore_lenses) ? story.explore_lenses : []).map((lens, index) => ({
    id: lens.id || `section-${index + 1}`,
    heading: lens.title || lens.label,
    body: lens.summary,
    role: 'background',
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

function ReportSection({ section, unresolved = [] }) {
  return (
    <section
      className={`story-report-paragraph is-${section.role}${unresolved.length ? ' has-unknown' : ''}`}
    >
      <div className="story-report-copy">
        <h2>{section.heading}</h2>
        <p>{section.body}</p>
      </div>
      {unresolved.length ? (
        <div className="story-still-unknown">
          <strong>Still unknown:</strong>
          <ul>
            {unresolved.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function EditorialFeatureReport({ story }) {
  const sections = reportSections(story);
  const uncertaintyNotes = unresolvedReportItems(story);
  const [, ...narrativeSections] = sections;
  const imageLabel = story.image?.image_role_label;

  return (
    <div className="story-feature-report">
      <div className="story-feature-opening">
        <div className="story-feature-image-wrap">
          <StoryImage story={story} className="story-hero-image" role="lead" eager />
          {imageLabel ? (
            <p className="story-image-caption">{imageLabel} · Created for this Muninn briefing</p>
          ) : null}
        </div>
        <div className="what-happened story-feature-summary">
          <p className="eyebrow">The short version</p>
          <p>{conciseSummary(story.story_report?.summary || story.summary, 3)}</p>
        </div>
        {narrativeSections.map((section) => (
          <ReportSection section={section} key={section.id} />
        ))}
      </div>

      {uncertaintyNotes.length ? (
        <aside className="story-still-unknown is-standalone" aria-label="What remains unknown">
          <p className="eyebrow">What remains unresolved</p>
          <strong>Still unknown</strong>
          <ul>
            {uncertaintyNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}

function SourcesSection({ story }) {
  const items = Array.isArray(story?.items) ? story.items : [];
  const researchSources = Array.from(new Map(
    (story?.explore_lenses || [])
      .flatMap((lens) => lens.sources || [])
      .filter((source) => source?.url)
      .map((source) => [source.url, source]),
  ).values());
  if (!items.length && !researchSources.length) return null;
  return (
    <section className="sources-section" aria-labelledby="sources-title">
      <header className="story-simple-section-heading sources-heading">
        <h2 id="sources-title">Sources</h2>
        <p>
          {items.length} {items.length === 1 ? 'report' : 'reports'}
          {researchSources.length ? ` · ${researchSources.length} research references` : ''}
        </p>
      </header>
      {items.length ? (
        <div className="source-list">
          {items.map((item) => {
            const logo = sourceLogoPath(item.source);
            return (
              <a href={item.link} target="_blank" rel="noreferrer" key={`${item.link}-${item.title}`}>
                <span className="source-list-logo">
                  {logo
                    ? <img src={logo} alt="" />
                    : cleanSourceName(item.source).slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <small>{cleanSourceName(item.source)}</small>
                  <strong>{item.title}</strong>
                </span>
                <b aria-hidden="true">↗</b>
              </a>
            );
          })}
        </div>
      ) : null}
      {researchSources.length ? (
        <details className="research-sources">
          <summary>
            View {researchSources.length} research and primary
            {' '}{researchSources.length === 1 ? 'reference' : 'references'}
          </summary>
          <div className="research-source-list">
            {researchSources.map((source) => (
              <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                <span>{source.source_type || 'Research'}</span>
                <strong>{source.title || source.publisher}</strong>
                {source.publisher && source.publisher !== source.title
                  ? <small>{source.publisher}</small>
                  : null}
                <b aria-hidden="true">↗</b>
              </a>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function StoryView({ story, event, relatedStories, onNavigate }) {
  if (!story) return <MissingState message="That story is not in the current edition." />;
  const researchCount = Array.from(new Map(
    (story?.explore_lenses || [])
      .flatMap((lens) => lens.sources || [])
      .filter((source) => source?.url)
      .map((source) => [source.url, source]),
  ).values()).length;
  return (
    <main id="main" className="page-shell story-page">
      <AppLink view="today" onNavigate={onNavigate} className="back-link">
        <span aria-hidden="true">←</span> Back to Today
      </AppLink>

      <article className="story-article">
        <header className="story-hero">
          <div className="story-meta">
            <span>{storyTopic(story)}</span>
            <time>{formatDate(storyDate(story))}</time>
          </div>
          <div className="story-title-row">
            <h1>{story.title}</h1>
          </div>
          <div className="story-trust-bar" aria-label="Briefing provenance">
            <span><strong>{sourceCount(story)}</strong> reported sources</span>
            {researchCount ? <span><strong>{researchCount}</strong> primary references</span> : null}
            <span><strong>Muninn</strong> synthesized briefing</span>
          </div>
          <EditorialFeatureReport story={story} />
        </header>

        <TimelineMarker event={event} currentStory={story} onNavigate={onNavigate} />

        <SourcesSection story={story} />
      </article>

      {relatedStories.length ? (
        <section className="related-section" aria-labelledby="related-title">
          <header className="story-simple-section-heading">
            <h2 id="related-title">More from today</h2>
          </header>
          <div className="related-grid">
            {relatedStories.slice(0, 3).map((item, index) => (
              <SupportingStory
                key={storyRouteId(item)}
                story={item}
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
      {event.hero_image?.image_role_label ? (
        <span className="image-role">{event.hero_image.image_role_label}</span>
      ) : null}
    </div>
  );
}

function EventTimeline({ event, currentStoryId, onNavigate }) {
  const entries = [...(event.timeline || [])].reverse();
  const milestones = new Set(event.presentation?.milestone_development_ids || []);
  return (
    <div className="event-timeline">
      {entries.map((entry, index) => {
        const id = entry.daily_story_id || entry.development_id;
        const current = id === currentStoryId;
        const milestone = milestones.has(entry.development_id);
        const latest = index === 0;
        const showDate = latest || entries[index - 1]?.date !== entry.date;
        const expanded = latest || milestone || current;
        const visibleSources = (entry.sources || []).slice(0, 2).map(cleanSourceName);
        const hiddenSourceCount = Math.max(0, (entry.sources || []).length - visibleSources.length);
        return (
          <article
            className={`${milestone ? 'is-milestone' : ''}${current ? ' is-current' : ''}${showDate ? '' : ' is-same-date'}`}
            key={entry.development_id || `${entry.date}-${entry.title}`}
          >
            <div className="timeline-date">
              {showDate ? <time>{formatDate(entry.date, { short: true })}</time> : null}
              {latest ? <span>Latest</span> : milestone ? <span>Milestone</span> : null}
            </div>
            <div className="timeline-node" aria-hidden="true"><i /></div>
            <div className="timeline-copy">
              {current ? <p className="current-marker">Current story</p> : null}
              <h3>
                {id ? (
                  <AppLink view="story" sid={id} onNavigate={onNavigate}>
                    {entry.title}
                  </AppLink>
                ) : entry.title}
              </h3>
              {expanded ? <p>{entry.summary}</p> : (
                <details className="timeline-update-details">
                  <summary>Read update</summary>
                  <p>{entry.summary}</p>
                </details>
              )}
              <div className="timeline-sources">
                <strong>{entry.source_count || entry.sources?.length || 1} sources</strong>
                <span>
                  {visibleSources.join(' · ')}
                  {hiddenSourceCount ? ` + ${hiddenSourceCount} more` : ''}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function EventOverview({ event }) {
  const overview = event.event_overview;
  const facts = Array.isArray(overview?.facts) ? overview.facts.slice(0, 4) : [];
  const primaryFacts = facts.slice(0, 2);
  const additionalFacts = facts.slice(2);
  const factList = (items) => (
    <dl>
      {items.map((fact) => (
        <div key={fact.label}>
          <dt>{normalizeOverviewLabel(fact.label)}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
  return (
    <aside className="event-overview" id="story-so-far">
      <p className="eyebrow">Story so far</p>
      <h2>{overview?.title || `About ${event.topic_label || 'this event'}`}</h2>
      <p>{overview?.summary || event.event_summary?.summary || event.summary}</p>
      {primaryFacts.length ? factList(primaryFacts) : null}
      {additionalFacts.length ? (
        <details className="event-more-background">
          <summary>More background</summary>
          {factList(additionalFacts)}
        </details>
      ) : null}
      {overview?.scope_note ? (
        <details>
          <summary>Coverage scope</summary>
          <p>{overview.scope_note}</p>
        </details>
      ) : null}
    </aside>
  );
}

function EarlierCoverageBoundary({ event }) {
  const presentation = event.presentation || {};
  const archive = event.archive_summary || event.historical_summary || {};
  const cutoff = archive.cutoff_date
    || presentation.timeline_window_start
    || event.first_seen_at;
  const summary = archive.summary;
  return (
    <section className="earlier-coverage" aria-labelledby="earlier-coverage-title">
      <div className="archive-rule" aria-hidden="true"><span /></div>
      <p className="eyebrow">Earlier coverage, summarized</p>
      <h3 id="earlier-coverage-title">Before {formatDate(cutoff, { short: true })}</h3>
      {summary ? <p>{conciseSummary(summary, 1)}</p> : null}
      <small>
        Detailed entries begin here. Older reporting is condensed into the story-so-far
        summary instead of remaining in the day-by-day stream.
      </small>
      <a href="#story-so-far">Read the earlier summary →</a>
    </section>
  );
}

function EventView({ event, currentStoryId, otherEvents, onNavigate }) {
  if (!event) return <MissingState message="That event is not available in the current timeline data." />;
  const presentation = event.presentation || {};
  const title = presentation.base_title || event.topic_label || event.canonical_title || event.title;
  const overview = event.event_overview;
  const currentState = overview?.summary || event.event_summary?.summary || event.summary;
  const latestTitle = presentation.latest_update_title || event.timeline?.at(-1)?.title;
  return (
    <main id="main" className="page-shell event-page">
      <AppLink view="events" onNavigate={onNavigate} className="back-link">
        <span aria-hidden="true">←</span> Back to Events
      </AppLink>

      <header className="event-hero">
        <div className="event-hero-copy">
          <div className="event-status">
            <i aria-hidden="true" />
            <span>{event.status === 'active' ? 'Active event' : event.status || 'Tracked event'}</span>
          </div>
          <h1>{title}</h1>
          <p className="event-current-state">{conciseSummary(currentState, 2)}</p>
          {latestTitle ? (
            <p className="event-latest-line"><span>Latest</span>{latestTitle}</p>
          ) : null}
          <div className="event-stats">
            <div><strong>{presentation.development_count || event.timeline?.length || 0}</strong><span>updates</span></div>
            <div><strong>{presentation.date_count || '—'}</strong><span>days tracked</span></div>
            <div><strong>{presentation.independent_source_count || presentation.source_count || '—'}</strong><span>independent sources</span></div>
          </div>
        </div>
        <EventHeroImage event={event} />
      </header>

      <section className="event-content" aria-labelledby="timeline-title">
        <div className="timeline-column">
          <header className="section-heading compact">
            <div>
              <p className="eyebrow">Newest first</p>
              <h2 id="timeline-title">How the story developed</h2>
            </div>
            <p>{formatDate(event.first_seen_at, { short: true })}–{formatDate(event.last_seen_at, { short: true })}</p>
          </header>
          <EventTimeline event={event} currentStoryId={currentStoryId} onNavigate={onNavigate} />
          <EarlierCoverageBoundary event={event} />
        </div>
        <EventOverview event={event} />
      </section>

      {otherEvents.length ? (
        <section className="other-events" aria-labelledby="other-events-title">
          <header className="section-heading compact">
            <div>
              <p className="eyebrow">Explore coverage</p>
              <h2 id="other-events-title">Other ongoing stories</h2>
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
                <small>{item.presentation?.development_count || item.timeline?.length || 0} updates</small>
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

function EventArtwork({ event, relatedStory, className = '', role = 'support', showLabel = false }) {
  const stableImage = eventImage(event);
  const fallbackImage = storyImage(relatedStory);
  const image = stableImage || fallbackImage;
  const imageData = stableImage ? event?.hero_image : relatedStory?.image;
  return (
    <div className={`${className}${image ? '' : ' is-empty'}`.trim()}>
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

function EventMeta({ event, showHelp = false }) {
  const latestDate = eventLatestDate(event);
  const publisherCount = Number(event?.presentation?.independent_source_count || 0);
  const sourceLinkCount = Number(event?.presentation?.source_count || 0);
  return (
    <div className="catchup-event-meta">
      {latestDate ? <span>Updated {formatDate(latestDate, { short: true, year: false })}</span> : null}
      <span title="Distinct trusted updates in this Event timeline">{eventDevelopmentCount(event)} updates</span>
      {publisherCount ? (
        <span title="Distinct publisher names represented across the Event timeline">{publisherCount} publishers</span>
      ) : sourceLinkCount ? (
        <span title="Distinct source links represented across the Event timeline">{sourceLinkCount} source links</span>
      ) : null}
      {showHelp ? (
        <details className="event-meta-help">
          <summary aria-label="How Event counts are calculated">?</summary>
          <span className="event-meta-help-popover">
            <b>Updates</b> are distinct trusted changes in this Event timeline.
            <b>Publishers</b> are distinct publisher names represented across those updates.
          </span>
        </details>
      ) : null}
    </div>
  );
}

function EventParentLabel({ storyline, event, relatedStory }) {
  const label = storyline
    ? storyline.legacy_event_id === event?.event_id ? 'Storyline' : storyline.title
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
    return storyline.legacy_event_id === event?.event_id ? 'Storyline' : storyline.title;
  }
  return eventCategory(event, relatedStory) || 'Continuing story';
}

function floatingEventPreviewStyle(target) {
  if (!target || typeof window === 'undefined') return undefined;
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12;
  const gap = 0;
  const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || margin;
  const topInset = Math.max(margin, Math.ceil(headerBottom + 4));
  const width = Math.min(544, viewportWidth - (margin * 2));
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
  const [previewStyle, setPreviewStyle] = useState(undefined);
  const closeTimer = useRef(undefined);
  const lastKeyboardTrigger = useRef(undefined);
  const keepPreviewOpen = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };
  const openPreview = (interaction) => {
    keepPreviewOpen();
    if (interaction.type === 'focus' || interaction.type === 'click') {
      lastKeyboardTrigger.current = interaction.currentTarget;
    }
    const anchor = interaction.currentTarget.closest('.event-preview-trigger')
      || interaction.currentTarget;
    setPreviewStyle(floatingEventPreviewStyle(anchor));
  };
  const requestPreviewClose = () => {
    keepPreviewOpen();
    closeTimer.current = window.setTimeout(() => setPreviewStyle(undefined), 140);
  };
  const closePreview = () => {
    keepPreviewOpen();
    setPreviewStyle(undefined);
  };
  const dismissPreview = () => {
    closePreview();
    window.requestAnimationFrame(() => lastKeyboardTrigger.current?.focus?.());
  };
  const togglePreview = (interaction) => {
    if (previewStyle) closePreview();
    else openPreview(interaction);
  };
  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);
  useEffect(() => {
    if (!previewStyle) return undefined;
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismissPreview();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewStyle]);
  return {
    previewStyle,
    openPreview,
    keepPreviewOpen,
    requestPreviewClose,
    closePreview,
    dismissPreview,
    togglePreview,
  };
}

function EventHoverPreview({
  event,
  relatedStory,
  storyline,
  style,
  onMouseEnter,
  onMouseLeave,
  onNavigate,
  onClose,
}) {
  const title = eventTitle(event);
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
      <EventArtwork event={event} relatedStory={relatedStory} className="event-movement-preview-art" role="wide" />
      <div className="event-movement-preview-copy">
        <div className="event-movement-preview-heading">
          <div>
            <span className="event-movement-preview-parent">
              {eventPreviewParentLabel(storyline, event, relatedStory)}
            </span>
            <h3>{title}</h3>
          </div>
          <AppLink
            view="event"
            eventId={event.event_id}
            onNavigate={onNavigate}
            className="event-movement-preview-title-action"
          >
            Read more <span aria-hidden="true">→</span>
          </AppLink>
        </div>
        <div className="event-movement-preview-brief">
          <p><span>What changed</span>{latestMovement}</p>
        </div>
        <EventMeta event={event} showHelp />
      </div>
    </div>
  );
}

function CatchupLeadEvent({ event, relatedStory, storyline, onNavigate }) {
  return (
    <article className="catchup-lead-event">
      <AppLink
        view="event"
        eventId={event.event_id}
        onNavigate={onNavigate}
        className="catchup-lead-link"
        aria-label={`Catch up on ${eventTitle(event)}`}
      >
        <EventArtwork event={event} relatedStory={relatedStory} className="catchup-lead-art" role="wide" />
        <div className="catchup-lead-shade" aria-hidden="true" />
        <div className="catchup-lead-copy">
          <EventParentLabel storyline={storyline} event={event} relatedStory={relatedStory} />
          <h2>{eventTitle(event)}</h2>
          <div className="catchup-lead-brief">
            <p><span>The situation</span>{eventSituation(event)}</p>
            <p><span>What changed</span>{eventLatestSummary(event, relatedStory)}</p>
          </div>
          <EventMeta event={event} />
          <strong className="catchup-open">Catch up on the full Event <span aria-hidden="true">→</span></strong>
        </div>
      </AppLink>
      {relatedStory ? (
        <AppLink
          view="story"
          sid={storyRouteId(relatedStory)}
          onNavigate={onNavigate}
          className="catchup-latest-report"
        >
          Read latest report <span aria-hidden="true">→</span>
        </AppLink>
      ) : null}
    </article>
  );
}

function CatchupSupportEvent({ event, relatedStory, storyline, onNavigate }) {
  return (
    <article className="catchup-support-event">
      <AppLink
        view="event"
        eventId={event.event_id}
        onNavigate={onNavigate}
        className="catchup-support-link"
        aria-label={`Catch up on ${eventTitle(event)}`}
      >
        <div className="catchup-support-copy">
          <EventParentLabel storyline={storyline} event={event} relatedStory={relatedStory} />
          <h3>{eventTitle(event)}</h3>
          <p><span>What changed</span>{eventLatestSummary(event, relatedStory)}</p>
          <EventMeta event={event} />
        </div>
        <EventArtwork event={event} relatedStory={relatedStory} className="catchup-support-art" role="support" />
      </AppLink>
    </article>
  );
}

function DevelopingEventCard({ event, relatedStory, storyline, onNavigate }) {
  return (
    <article className="developing-event-card">
      <AppLink
        view="event"
        eventId={event.event_id}
        onNavigate={onNavigate}
        aria-label={`Open ${eventTitle(event)}`}
      >
        <div className="developing-event-copy">
          <EventParentLabel storyline={storyline} event={event} relatedStory={relatedStory} />
          <h3>{eventTitle(event)}</h3>
          <p>{eventLatestTitle(event)}</p>
          <EventMeta event={event} />
        </div>
        <EventArtwork event={event} relatedStory={relatedStory} className="developing-event-art" role="support" showLabel />
      </AppLink>
    </article>
  );
}

function EventRailCard({ event, relatedStory, storyline, onNavigate }) {
  const title = eventTitle(event);
  const latestDate = eventLatestDate(event);
  const formattedDate = formatDate(latestDate, { short: true, year: false });
  const {
    previewStyle,
    openPreview,
    keepPreviewOpen,
    requestPreviewClose,
    dismissPreview,
    togglePreview,
  } = useEventHoverPreview();
  return (
    <article className={`event-catchup-card event-preview-trigger${previewStyle ? ' is-preview-open' : ''}`}>
      <AppLink
        view="event"
        eventId={event.event_id}
        onNavigate={onNavigate}
        className="event-rail-card-link"
        aria-label={`Open Event: ${title}${latestDate ? `, updated ${formattedDate}` : ''}`}
        onFocus={openPreview}
        onBlur={requestPreviewClose}
      >
        <div className="event-rail-tile">
          <EventArtwork event={event} relatedStory={relatedStory} className="event-rail-art" role="support" />
          <span className="event-rail-shade" aria-hidden="true" />
          <div className="event-rail-tile-copy">
            <h3
              className="event-preview-title-trigger"
              onMouseEnter={openPreview}
              onMouseLeave={requestPreviewClose}
            >
              {title}
            </h3>
            <p className="event-tile-update"><span>Latest</span>{' '}{eventLatestTitle(event)}</p>
            <div className="event-tile-glance">
              <span className="event-tile-topic">{eventCategory(event, relatedStory)}</span>
              <span className="event-tile-glance-stats">
                {latestDate ? <time dateTime={latestDate}>Updated {formattedDate}</time> : null}
                <span>{eventDevelopmentCount(event)} updates</span>
              </span>
            </div>
          </div>
        </div>
      </AppLink>
      <button
        type="button"
        className="event-quick-view-button"
        onClick={togglePreview}
        aria-expanded={Boolean(previewStyle)}
        aria-label={`Quick view: ${title}`}
      >
        Quick view
      </button>
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
    </article>
  );
}

function EventMovementRow({ event, relatedStory, storyline, onNavigate }) {
  const title = eventTitle(event);
  const latestDate = eventLatestDate(event);
  const formattedDate = formatDate(latestDate, { short: true, year: false });
  const {
    previewStyle,
    openPreview,
    keepPreviewOpen,
    requestPreviewClose,
    dismissPreview,
    togglePreview,
  } = useEventHoverPreview();
  return (
    <article className={`event-movement-row event-preview-trigger${previewStyle ? ' is-preview-open' : ''}`}>
      <AppLink
        view="event"
        eventId={event.event_id}
        onNavigate={onNavigate}
        className="event-movement-link"
        aria-label={`Open Event: ${title}${latestDate ? `, updated ${formattedDate}` : ''}`}
        onFocus={openPreview}
        onBlur={requestPreviewClose}
      >
        <div className="event-movement-tile">
          <EventArtwork event={event} relatedStory={relatedStory} className="event-movement-art" role="support" />
          <span className="event-movement-shade" aria-hidden="true" />
          <div className="event-movement-tile-copy">
            <h3
              className="event-preview-title-trigger"
              onMouseEnter={openPreview}
              onMouseLeave={requestPreviewClose}
            >
              {title}
            </h3>
            <p className="event-tile-update"><span>Changed</span>{' '}{eventLatestTitle(event)}</p>
            <div className="event-tile-glance">
              <span className="event-tile-topic">{eventCategory(event, relatedStory)}</span>
              <span className="event-tile-glance-stats">
                {latestDate ? <time dateTime={latestDate}>Updated {formattedDate}</time> : null}
                <span>{eventDevelopmentCount(event)} updates</span>
              </span>
            </div>
          </div>
        </div>
      </AppLink>
      <button
        type="button"
        className="event-quick-view-button"
        onClick={togglePreview}
        aria-expanded={Boolean(previewStyle)}
        aria-label={`Quick view: ${title}`}
      >
        Quick view
      </button>
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
    </article>
  );
}

function StorylineCard({ storyline, rootEvent, onNavigate }) {
  const childEvents = Array.isArray(storyline?.child_events) ? storyline.child_events : [];
  const activeCount = childEvents.filter((item) => item.state !== 'earlier_phase').length;
  return (
    <article className="storyline-overview-card">
      <AppLink
        view="event"
        eventId={storyline.legacy_event_id}
        onNavigate={onNavigate}
        aria-label={`Open the ${storyline.title} storyline`}
      >
        <EventArtwork event={rootEvent} className="storyline-overview-art" role="wide" />
        <div className="storyline-overview-copy">
          <span className="catchup-event-parent">Storyline</span>
          <h3>{storyline.title}</h3>
          <p>{conciseSummary(storyline.overview || storyline.current_status, 1)}</p>
          {storyline.current_status ? (
            <div className="storyline-latest">
              <span>Where it stands</span>
              <strong>{conciseSummary(storyline.current_status, 1)}</strong>
            </div>
          ) : null}
          <div className="storyline-overview-meta">
            <span>{childEvents.length} connected Events</span>
            {activeCount ? <span>{activeCount} currently developing</span> : null}
            {storyline.current_status_as_of ? (
              <span>Updated {formatDate(storyline.current_status_as_of, { short: true, year: false })}</span>
            ) : null}
          </div>
          <b>See the bigger picture <span aria-hidden="true">→</span></b>
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
      kind: 'Storyline',
      title: item.title,
      summary: conciseSummary(item.overview || item.current_status, 1),
      view: 'event',
      eventId: item.legacy_event_id,
      score: score(item.title, `${item.overview || ''} ${item.current_status || ''}`),
    })).filter((item) => item.score).sort((left, right) => right.score - left.score);
    const storylineRootIds = new Set(storylines.map((item) => item.legacy_event_id).filter(Boolean));
    const eventResults = events.filter((item) => !storylineRootIds.has(item.event_id)).map((item) => ({
      key: item.event_id,
      kind: 'Event',
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
          placeholder="Stories, Events, and Storylines"
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
                  ['Storylines', resultGroups.storylines],
                  ['Events', resultGroups.events],
                  ['Stories', resultGroups.stories],
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
              <span>Try a person, place, subject, or Event name.</span>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function EventRailControls({ railRef, label }) {
  const move = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * .82, behavior: 'smooth' });
  };
  return (
    <div className="event-rail-controls" aria-label={`${label} navigation`}>
      <button type="button" onClick={() => move(-1)} aria-label={`Previous ${label}`}>←</button>
      <button type="button" onClick={() => move(1)} aria-label={`Next ${label}`}>→</button>
    </div>
  );
}

function EventsDirectoryView({
  events,
  stories,
  storylines,
  initialMode,
  initialTopic,
  onNavigate,
}) {
  const primaryRailRef = useRef(null);
  const movementRailRef = useRef(null);
  const [query, setQuery] = useState('');
  const [directoryOpen, setDirectoryOpen] = useState(initialMode !== 'all');
  const [status, setStatus] = useState(initialMode === 'latest' ? 'recent' : 'all');
  const [topic, setTopic] = useState(initialTopic || 'all');

  useEffect(() => {
    setDirectoryOpen(initialMode !== 'all');
    if (initialMode === 'latest') setStatus('recent');
  }, [initialMode]);

  const relatedStories = useMemo(() => {
    const map = new Map();
    stories.forEach((story) => {
      if (story.event_id && !map.has(story.event_id)) map.set(story.event_id, story);
    });
    return map;
  }, [stories]);
  const storylineChildIds = useMemo(
    () => new Set(storylines.flatMap((item) => (
      item.child_events || []
    )).map((item) => item.event_id).filter(Boolean)),
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
      .filter((event) => eventDevelopmentCount(event) >= 2 && !storylineChildIds.has(event.event_id))
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
    [events, latestAvailableDate, relatedStories, storylineByEventId, storylineChildIds],
  );
  const currentEvents = ordered.filter(
    (event) => eventDevelopmentCount(event) >= 3
      && dateDistanceInDays(latestAvailableDate, eventLatestDate(event)) <= 7,
  );
  const featuredEvents = currentEvents.slice(0, 5);
  const moreDevelopingEvents = currentEvents.slice(5, 10);
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
    onNavigate('events');
  };

  if (directoryOpen) {
    return (
      <main id="main" className="page-shell events-directory-page event-browse-page">
        <button type="button" className="event-directory-back" onClick={closeDirectory}>
          <span aria-hidden="true">←</span> Events briefing
        </button>
        <PageIntroduction
          eyebrow="Complete directory"
          title="Browse all Events"
          description="Search and filter the complete record of continuing stories."
          aside={`${ordered.length} Events`}
        />
        <section className="event-directory-tools" aria-label="Filter the Event directory">
          <label>
            <span>Filter Events</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by Event name or subject"
            />
          </label>
          <div className="event-directory-status" aria-label="Filter by activity">
            {[
              ['all', 'All Events'],
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
              <h2 id="event-directory-results-title">{topic !== 'all' ? topic : 'All Events'}</h2>
            </div>
            <p>{filtered.length} results</p>
          </header>
          {filtered.length ? (
            <div className="event-directory-result-grid">
              {filtered.map((event) => (
                <DevelopingEventCard
                  event={event}
                  relatedStory={relatedStories.get(event.event_id)}
                  storyline={storylineByEventId.get(event.event_id)}
                  onNavigate={onNavigate}
                  key={event.event_id}
                />
              ))}
            </div>
          ) : (
            <div className="event-directory-no-results">
              <h2>No matching Events</h2>
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
          <h1>Events</h1>
          <GlobalCoverageSearch
            stories={stories}
            events={ordered}
            storylines={storylines}
            onNavigate={onNavigate}
          />
        </div>
        <div className="events-home-status" aria-label={`${currentEvents.length} active Events`}>
          <strong>{currentEvents.length}</strong>
          <span>updated within 7 days</span>
        </div>
      </header>

      {featuredEvents.length ? (
        <section className="event-catchup-rail-section" aria-labelledby="worth-catching-up-title">
          <header className="event-rail-heading">
            <div>
              <h2 id="worth-catching-up-title">Lead ongoing Events</h2>
            </div>
            <EventRailControls railRef={primaryRailRef} label="ongoing Events" />
          </header>
          <div ref={primaryRailRef} className="event-catchup-rail" tabIndex="0" aria-label="Horizontally scroll through important Events">
            {featuredEvents.map((event) => (
              <EventRailCard
                event={event}
                relatedStory={relatedStories.get(event.event_id)}
                storyline={storylineByEventId.get(event.event_id)}
                onNavigate={onNavigate}
                key={event.event_id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {moreDevelopingEvents.length ? (
        <section className="event-movement-section" aria-labelledby="more-developing-events-title">
          <header className="event-rail-heading">
            <div>
              <h2 id="more-developing-events-title">Other recent changes</h2>
            </div>
            <EventRailControls railRef={movementRailRef} label="latest changes" />
          </header>
          <div ref={movementRailRef} className="event-movement-list">
            {moreDevelopingEvents.map((event) => (
              <EventMovementRow
                event={event}
                relatedStory={relatedStories.get(event.event_id)}
                storyline={storylineByEventId.get(event.event_id)}
                onNavigate={onNavigate}
                key={event.event_id}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="browse-events-callout" aria-labelledby="browse-events-title">
        <div>
          <p className="eyebrow">Event index</p>
          <h2 id="browse-events-title">Explore the full Event index</h2>
          <p>Find developing and recently quiet Events by subject, activity, or name.</p>
        </div>
        <button type="button" onClick={openDirectory}>Browse all Events <span aria-hidden="true">→</span></button>
      </section>
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
        eyebrow="Recent editions"
        title="Archive"
        description="A short record of the daily briefings that came before today."
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

function WeeklyView() {
  return (
    <main id="main" className="page-shell weekly-page">
      <div className="weekly-reader-frame">
        <WeeklyLetter />
      </div>
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
  const [data, setData] = useState({
    digest: null,
    events: null,
    recent: null,
    coverage: null,
    error: '',
  });

  useEffect(() => {
    Promise.all([
      fetchFirst(DIGEST_URLS),
      fetchFirst(EVENT_URLS),
      fetchOptional(RECENT_URLS),
      fetchOptional(COVERAGE_URLS),
    ])
      .then(([digest, events, recent, coverage]) => setData({
        digest,
        events,
        recent,
        coverage,
        error: '',
      }))
      .catch((error) => setData((current) => ({
        ...current,
        digest: null,
        events: null,
        error: error.message,
      })));
  }, []);

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

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
  const storylines = useMemo(
    () => (Array.isArray(data.coverage?.collections) ? data.coverage.collections : []),
    [data.coverage],
  );
  const allStories = useMemo(
    () => [
      ...stories,
      ...archiveStories,
    ],
    [stories, archiveStories],
  );

  const defaultStory = stories[1] || stories[0];
  const defaultEvent = useMemo(() => {
    const connected = events.find((item) => item.event_id === defaultStory?.event_id);
    return connected
      || events.find((item) => item.presentation?.has_full_timeline)
      || events[0];
  }, [defaultStory, events]);
  const navigate = (view, extras = {}) => {
    const href = routeHref(view, extras);
    window.history.pushState({}, '', href);
    setRoute(readRoute());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (data.error) return <MissingState message={data.error} />;
  if (!data.digest || !data.events) return <LoadingState />;

  const selectedStory = allStories.find(
    (story) => storyRouteId(story) === route.sid
      || story.story_id === route.sid
      || story.cluster_id === route.sid,
  )
    || (/^\d+$/.test(route.sid) ? stories[Number(route.sid)] : null)
    || defaultStory;
  const selectedEvent = events.find((event) => event.event_id === route.eventId)
    || events.find((event) => event.event_id === selectedStory?.event_id)
    || defaultEvent;
  const storyEvent = events.find((event) => event.event_id === selectedStory?.event_id);
  const relatedStories = stories.filter((story) => storyRouteId(story) !== storyRouteId(selectedStory));
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
      <Header view={route.view} onNavigate={navigate} />
      {route.view === 'today' ? (
        <TodayView digest={data.digest} onNavigate={navigate} />
      ) : null}
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
          onNavigate={navigate}
        />
      ) : null}
      {route.view === 'weekly' ? <WeeklyView /> : null}
      {route.view === 'archive' ? (
        <ArchiveView recent={data.recent} onNavigate={navigate} />
      ) : null}
      {route.view === 'event' ? (
        <EventView
          event={selectedEvent}
          currentStoryId={route.sid}
          otherEvents={otherEvents}
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
