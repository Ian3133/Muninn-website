import React, { useEffect, useMemo, useRef, useState } from 'react';
import WeeklyLetter from './WeeklyLetter';
import './ReaderApp.css';

const DIGEST_URLS = ['/Current_news/digest.json', '/current_news/digest.json'];
const EVENT_URLS = ['/Current_news/event_timelines.json', '/current_news/event_timelines.json'];
const RECENT_URLS = ['/Current_news/recent_news.json', '/current_news/recent_news.json'];

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

function eventTitle(event) {
  return event?.presentation?.base_title
    || event?.topic_label
    || event?.canonical_title
    || event?.title
    || 'Tracked event';
}

function eventCategory(event, relatedStory) {
  return relatedStory?.primary_category
    || relatedStory?.category
    || event?.primary_category
    || event?.category
    || event?.presentation?.primary_category
    || 'Ongoing coverage';
}

function eventDevelopmentCount(event) {
  return event?.presentation?.development_count || event?.timeline?.length || 0;
}

function splitSentences(value = '') {
  const protectedText = String(value).replace(
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
      <AppLink view="today" onNavigate={onNavigate} className="back-link">
        <span aria-hidden="true">←</span> Back to Today
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
            <div><strong>{presentation.development_count || event.timeline?.length || 0}</strong><span>developments</span></div>
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

function eventIsOngoing(event) {
  const stage = event?.presentation?.stage || event?.event_stage || '';
  return stage === 'storyline' || stage === 'timeline' || eventDevelopmentCount(event) >= 4;
}

function EventRailCard({
  event,
  relatedStory,
  onNavigate,
  showType = false,
  kind = 'event',
}) {
  const isUpdate = kind === 'update' && relatedStory;
  const image = isUpdate ? storyImage(relatedStory) || eventImage(event) : eventImage(event);
  const imageData = isUpdate && storyImage(relatedStory) ? relatedStory.image : event.hero_image;
  const latestEntry = event?.timeline?.at(-1) || {};
  const latest = event?.presentation?.latest_update_title || latestEntry.title;
  const cardTitle = isUpdate ? relatedStory.title : eventTitle(event);
  const cardSummary = isUpdate
    ? conciseSummary(relatedStory.summary, 1)
    : latest || 'Latest development available';
  return (
    <article className={`event-rail-card is-${kind}`}>
      <AppLink
        view={isUpdate ? 'story' : 'event'}
        sid={isUpdate ? storyRouteId(relatedStory) : undefined}
        eventId={isUpdate ? undefined : event.event_id}
        onNavigate={onNavigate}
        aria-label={`Open ${cardTitle}`}
      >
        <div className={`event-rail-media${image ? '' : ' is-empty'}`}>
          {image ? (
            <img src={image} alt="" style={imagePresentation(imageData, 'support')} />
          ) : null}
          <div className="event-rail-scrim" aria-hidden="true" />
          <div className="event-rail-title">
            {isUpdate ? <span>{eventTitle(event)}</span> : null}
            {!isUpdate && showType ? <span>Ongoing story</span> : null}
            <h3>{cardTitle}</h3>
          </div>
        </div>
        <div className="event-rail-footer">
          <small>
            {isUpdate ? 'Latest update' : 'Ongoing coverage'}
            {latestEntry.date ? ` · ${formatDate(latestEntry.date, { short: true, year: false })}` : ''}
          </small>
          <strong>{cardSummary}</strong>
          <div>
            <span>{eventDevelopmentCount(event)} developments</span>
            <span>
              {isUpdate
                ? sourceCount(relatedStory)
                : event.presentation?.independent_source_count || event.presentation?.source_count || '—'} sources
            </span>
          </div>
        </div>
      </AppLink>
    </article>
  );
}

function EventSwipeSection({
  title,
  items,
  relatedStories,
  showType = false,
  kind = 'event',
  onSeeAll,
  onNavigate,
}) {
  const railRef = useRef(null);
  const scroll = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(280, Math.round(rail.clientWidth * .88)),
      behavior: 'smooth',
    });
  };
  if (!items.length) return null;
  return (
    <section className="event-swipe-section" aria-label={title}>
      <header className="event-swipe-heading">
        <h2>{title}</h2>
        <div>
          <button type="button" className="event-see-all" onClick={onSeeAll}>See all →</button>
          <span className="event-swipe-controls">
            <button type="button" onClick={() => scroll(-1)} aria-label={`Previous ${title}`}>←</button>
            <button type="button" onClick={() => scroll(1)} aria-label={`More ${title}`}>→</button>
          </span>
        </div>
      </header>
      <div className="event-swipe-rail" ref={railRef} tabIndex={0}>
        {items.map((event) => (
          <EventRailCard
            event={event}
            relatedStory={relatedStories.get(event.event_id)}
            onNavigate={onNavigate}
            showType={showType}
            kind={kind}
            key={event.event_id}
          />
        ))}
      </div>
    </section>
  );
}

function EventsDirectoryView({
  events,
  stories,
  initialMode,
  initialTopic,
  onNavigate,
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(
    ['all', 'latest', 'developing', 'ongoing'].includes(initialMode) ? initialMode : 'all',
  );
  const [topic, setTopic] = useState(initialTopic || 'all');
  const ordered = useMemo(
    () => [...events].sort((left, right) => (
      (right.presentation?.rank_score || 0) - (left.presentation?.rank_score || 0)
      || String(right.last_seen_at || '').localeCompare(String(left.last_seen_at || ''))
    )),
    [events],
  );
  const ongoing = ordered.filter(eventIsOngoing);
  const relatedStories = useMemo(() => {
    const map = new Map();
    stories.forEach((story) => {
      if (story.event_id && !map.has(story.event_id)) map.set(story.event_id, story);
    });
    return map;
  }, [stories]);
  const categoryFor = (event) => eventCategory(event, relatedStories.get(event.event_id));
  const latestUpdates = ordered.filter((event) => relatedStories.has(event.event_id));
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
      event.presentation?.latest_update_title,
    ].filter(Boolean).join(' ').toLowerCase();
    const isOngoing = eventIsOngoing(event);
    const matchesMode = mode === 'all'
      || (mode === 'latest' && relatedStories.has(event.event_id))
      || (mode === 'ongoing' && isOngoing)
      || (mode === 'developing' && !isOngoing);
    const matchesTopic = topic === 'all' || categoryFor(event) === topic;
    return matchesMode
      && matchesTopic
      && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  });
  const browsing = Boolean(query.trim() || mode !== 'all' || topic !== 'all');
  const resetFilters = () => {
    setQuery('');
    setMode('all');
    setTopic('all');
  };
  return (
    <main id="main" className="page-shell events-directory-page">
      <PageIntroduction
        eyebrow="Living coverage"
        title="Events"
        description="Follow the stories that outlast a single headline, with the latest change first and the full record close at hand."
        aside={`${events.length} tracked events`}
      />

      <section className="event-search-bar" aria-label="Search events">
        <label>
          <span>Search coverage</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a topic or event"
          />
        </label>
        {browsing ? <button type="button" onClick={resetFilters}>Clear</button> : null}
      </section>

      {!browsing ? (
        <div className="events-landing-rails">
          <EventSwipeSection
            title="Latest updates"
            items={latestUpdates.slice(0, 12)}
            relatedStories={relatedStories}
            kind="update"
            onSeeAll={() => setMode('latest')}
            onNavigate={onNavigate}
          />
          <EventSwipeSection
            title="Ongoing stories"
            items={ongoing.slice(0, 12)}
            relatedStories={relatedStories}
            showType
            kind="ongoing"
            onSeeAll={() => setMode('ongoing')}
            onNavigate={onNavigate}
          />
          <section className="event-explore" aria-labelledby="event-explore-title">
            <header>
              <h2 id="event-explore-title">Explore</h2>
              <p>Follow a subject or return to long-running coverage.</p>
            </header>
            <div className="event-ongoing-links">
              {ongoing.slice(0, 4).map((event) => (
                <AppLink
                  view="event"
                  eventId={event.event_id}
                  onNavigate={onNavigate}
                  key={event.event_id}
                >
                  <span>Ongoing coverage</span>
                  <strong>{eventTitle(event)}</strong>
                  <b aria-hidden="true">→</b>
                </AppLink>
              ))}
            </div>
            <div className="event-topic-list" aria-label="Browse event topics">
              <span>Topics</span>
              {topics.map(([label, count]) => (
                <button type="button" onClick={() => setTopic(label)} key={label}>
                  {label} <small>{count}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {browsing && filtered.length ? (
        <section className="event-results" aria-labelledby="event-results-title">
          <header className="event-swipe-heading">
            <h2 id="event-results-title">
              {topic !== 'all'
                ? topic
                : mode === 'ongoing'
                  ? 'Ongoing coverage'
                  : mode === 'developing'
                    ? 'Developing events'
                    : mode === 'latest'
                      ? 'Latest updates'
                      : 'Search results'}
            </h2>
            <p>{filtered.length} results</p>
          </header>
          <div className="event-results-grid">
            {filtered.map((event) => (
              <EventRailCard
                event={event}
                relatedStory={relatedStories.get(event.event_id)}
                onNavigate={onNavigate}
                showType
                kind={mode === 'latest' ? 'update' : mode === 'ongoing' ? 'ongoing' : 'event'}
                key={event.event_id}
              />
            ))}
          </div>
        </section>
      ) : null}
      {!filtered.length ? (
        <section className="directory-empty">
          <p className="eyebrow">No results</p>
          <h2>No tracked event matches that search.</h2>
          <p>Try a broader topic or return to all coverage.</p>
          <button type="button" onClick={resetFilters}>Clear filters</button>
        </section>
      ) : null}
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
    error: '',
  });

  useEffect(() => {
    Promise.all([
      fetchFirst(DIGEST_URLS),
      fetchFirst(EVENT_URLS),
      fetchOptional(RECENT_URLS),
    ])
      .then(([digest, events, recent]) => setData({
        digest,
        events,
        recent,
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
  const otherEvents = events
    .filter((event) => event.event_id !== selectedEvent?.event_id && event.presentation?.has_full_timeline)
    .sort((a, b) => (b.presentation?.rank_score || 0) - (a.presentation?.rank_score || 0));
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
          stories={stories}
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
