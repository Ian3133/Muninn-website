import React, { useEffect, useMemo, useState } from 'react';
import './ReaderApp.css';

const DIGEST_URLS = ['/Current_news/digest.json', '/current_news/digest.json'];
const EVENT_URLS = ['/Current_news/event_timelines.json', '/current_news/event_timelines.json'];

const VIEW_LABELS = {
  today: 'Today',
  story: 'Story',
  event: 'Event',
};

const SOURCE_LOGO_ALIASES = {
  ap: 'ap',
  'ap news': 'ap',
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

function readRoute() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  return {
    view: VIEW_LABELS[view] ? view : 'today',
    sid: params.get('sid') || '',
    eventId: params.get('event') || '',
  };
}

function routeHref(view, extras = {}) {
  const params = new URLSearchParams();
  if (view !== 'today') params.set('view', view);
  if (extras.sid) params.set('sid', extras.sid);
  if (extras.eventId) params.set('event', extras.eventId);
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
  if (!value) return { weekday: 'Daily edition', date: 'Today', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { weekday: 'Daily edition', date: String(value), time: '' };
  }
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date),
    date: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  };
}

function cleanSourceName(value = '') {
  return String(value)
    .replace(/\s*-\s*(top stories|english|home|politics)$/i, '')
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
  const bottomRightComposed = image.is_ai_generated && (role === 'lead' || role === 'support');
  const resolvedX = bottomRightComposed ? Math.max(x ?? fallbackX, role === 'lead' ? 0.7 : 0.66) : x ?? fallbackX;
  const resolvedY = bottomRightComposed ? Math.max(y ?? fallbackY, role === 'lead' ? 0.66 : 0.62) : y ?? fallbackY;
  return {
    objectPosition: `${Math.round(resolvedX * 100)}% ${Math.round(resolvedY * 100)}%`,
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
  return story?.cluster_id || story?.story_id || '';
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

function AppLink({ view, sid, eventId, onNavigate, children, className = '', ...props }) {
  const href = routeHref(view, { sid, eventId });
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
        onNavigate(view, { sid, eventId });
      }}
      {...props}
    >
      {children}
    </a>
  );
}

function SourceMarks({ story, limit = 4, compact = false }) {
  const sources = [...new Set(sourceList(story))].slice(0, limit);
  return (
    <div className={`source-marks${compact ? ' is-compact' : ''}`}>
      <div className="source-mark-stack" aria-label={`Sources include ${sources.join(', ')}`}>
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

function Header({ view, onNavigate, defaultEventId }) {
  const todayActive = view === 'today' || view === 'story';
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
            view="event"
            eventId={defaultEventId}
            onNavigate={onNavigate}
            className={view === 'event' ? 'is-active' : ''}
            aria-current={view === 'event' ? 'page' : undefined}
          >
            Events
          </AppLink>
        </nav>
      </div>
    </header>
  );
}

function LeadStory({ story, onNavigate }) {
  return (
    <article className="lead-story">
      <AppLink
        view="story"
        sid={storyRouteId(story)}
        onNavigate={onNavigate}
        className="lead-story-link"
        aria-label={`Read ${story.title}`}
      >
        <StoryImage
          story={story}
          className="lead-story-image"
          role="lead"
          eager
          showRole={false}
        />
        <div className="lead-story-shade" />
        <div className="lead-story-copy">
          <div className="story-kicker-row">
            <span>01 · {storyTopic(story)}</span>
          </div>
          <h2>{story.title}</h2>
          <p>{conciseSummary(story.summary, 2)}</p>
          <SourceMarks story={story} />
        </div>
      </AppLink>
    </article>
  );
}

function SupportingStory({ story, rank, onNavigate }) {
  return (
    <article className="support-story">
      <AppLink
        view="story"
        sid={storyRouteId(story)}
        onNavigate={onNavigate}
        className="support-story-link"
        aria-label={`Read ${story.title}`}
      >
        <div className="support-story-copy">
          <div className="story-kicker-row">
            <span>{rank ? `${String(rank).padStart(2, '0')} · ` : ''}{storyTopic(story)}</span>
          </div>
          <h2>{story.title}</h2>
          <SourceMarks story={story} compact limit={3} />
        </div>
        <StoryImage story={story} className="support-story-image" role="support" />
      </AppLink>
    </article>
  );
}

function StreamStory({ story, rank, onNavigate, kind = 'thread', showImage = true }) {
  const context = story.story_context || {};
  const isThread = kind === 'thread';
  return (
    <article className={`stream-story is-${kind}`}>
      <AppLink
        view="story"
        sid={storyRouteId(story)}
        onNavigate={onNavigate}
        className="stream-story-link"
        aria-label={`Read ${story.title}`}
      >
        <div className="stream-rank">{String(rank).padStart(2, '0')}</div>
        <div className="stream-copy">
          <span className="stream-topic">
            {isThread ? context.event_title || storyTopic(story) : storyTopic(story)}
          </span>
          <h3>{story.title}</h3>
          {isThread ? (
            <div className="thread-state">
              <strong>{context.development_count || context.highlights?.length || 1} developments</strong>
              <span>Latest {formatDate(latestContextDate(story), { short: true, year: false })}</span>
            </div>
          ) : <SourceMarks story={story} compact limit={3} />}
        </div>
        {showImage ? <StoryImage story={story} className="stream-image" role="support" /> : null}
      </AppLink>
    </article>
  );
}

function BriefStory({ story, rank, onNavigate }) {
  return (
    <article className="brief-story">
      <AppLink
        view="story"
        sid={storyRouteId(story)}
        onNavigate={onNavigate}
        aria-label={`Read ${story.title}`}
      >
        <span className="brief-rank">{String(rank).padStart(2, '0')}</span>
        <span className="brief-topic">{storyTopic(story)}</span>
        <h3>{story.title}</h3>
        <small>{sourceCount(story)} source{sourceCount(story) === 1 ? '' : 's'}</small>
      </AppLink>
    </article>
  );
}

function TodayView({ digest, onNavigate }) {
  const stories = Array.isArray(digest?.clusters) ? digest.clusters : [];
  const edition = editionTimestamp(digest?.briefing?.as_of || digest?.generated_at);
  const featured = stories.slice(0, 5);
  const remainder = stories.slice(5);
  const ongoing = remainder
    .filter((story) => story.story_context?.available && (story.story_context?.development_count || 0) > 1)
    .slice(0, 4);
  const ongoingIds = new Set(ongoing.map(storyRouteId));
  const afterOngoing = remainder.filter((story) => !ongoingIds.has(storyRouteId(story)));
  const otherDevelopments = afterOngoing.slice(0, 6);
  const inBrief = afterOngoing.slice(6);
  return (
    <main id="main" className="page-shell today-page">
      <section className="briefing-heading">
        <div className="briefing-heading-copy">
          <p className="eyebrow">Finite daily briefing</p>
          <h1>Today’s essential stories</h1>
        </div>
        <div className="edition-date">
          <span>{edition.weekday}</span>
          <strong>{edition.date}</strong>
          {edition.time ? <small>Updated {edition.time}</small> : null}
        </div>
      </section>

      {featured.length ? (
        <section className="opening-stories" aria-label="Top stories">
          <LeadStory story={featured[0]} onNavigate={onNavigate} />
          <div className="supporting-stories">
            {featured.slice(1, 4).map((story, index) => (
              <SupportingStory
                key={storyRouteId(story)}
                story={story}
                rank={index + 2}
                onNavigate={onNavigate}
              />
            ))}
          </div>
          {featured[4] ? (
            <div className="lead-buddy">
              <SupportingStory
                story={featured[4]}
                rank={5}
                onNavigate={onNavigate}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="briefing-remainder" aria-labelledby="remainder-title">
        <header className="section-heading">
          <h2 id="remainder-title">Ongoing threads</h2>
        </header>
        <div className="stream-grid thread-grid">
          {ongoing.map((story) => (
            <StreamStory
              key={storyRouteId(story)}
              story={story}
              rank={stories.indexOf(story) + 1}
              onNavigate={onNavigate}
              kind="thread"
            />
          ))}
        </div>
      </section>

      <section className="briefing-group" aria-labelledby="developments-title">
        <header className="section-heading compact">
          <h2 id="developments-title">Other developments</h2>
        </header>
        <div className="stream-grid development-grid">
          {otherDevelopments.map((story) => (
            <StreamStory
              key={storyRouteId(story)}
              story={story}
              rank={stories.indexOf(story) + 1}
              onNavigate={onNavigate}
              kind="development"
              showImage={false}
            />
          ))}
        </div>
      </section>

      {inBrief.length ? (
        <section className="in-brief" aria-labelledby="brief-title">
          <header className="section-heading compact">
            <h2 id="brief-title">In brief</h2>
          </header>
          <div className="brief-grid">
            {inBrief.map((story) => (
              <BriefStory
                key={storyRouteId(story)}
                story={story}
                rank={stories.indexOf(story) + 1}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="caught-up" aria-label="End of today's briefing">
        <img src="/brand/muninn-mark.svg" alt="" />
        <div>
          <h2>You’re caught up.</h2>
          <p>Return tomorrow for a new finite edition. Events remain available when you want the longer view.</p>
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
  const [flowingSection, ...remainingSections] = narrativeSections;
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
        {flowingSection ? (
          <ReportSection section={flowingSection} />
        ) : null}
      </div>

      {remainingSections.length || (!flowingSection && uncertaintyNotes.length) ? (
        <div className="story-feature-body">
          <div className="story-feature-narrative">
            {remainingSections.map((section) => (
              <ReportSection section={section} key={section.id} />
            ))}
          </div>
        </div>
      ) : null}
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
  const [data, setData] = useState({ digest: null, events: null, error: '' });

  useEffect(() => {
    Promise.all([fetchFirst(DIGEST_URLS), fetchFirst(EVENT_URLS)])
      .then(([digest, events]) => setData({ digest, events, error: '' }))
      .catch((error) => setData({ digest: null, events: null, error: error.message }));
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

  const selectedStory = stories.find(
    (story) => story.story_id === route.sid || story.cluster_id === route.sid,
  )
    || defaultStory;
  const selectedEvent = events.find((event) => event.event_id === route.eventId)
    || events.find((event) => event.event_id === selectedStory?.event_id)
    || defaultEvent;
  const storyEvent = events.find((event) => event.event_id === selectedStory?.event_id);
  const relatedStories = stories.filter((story) => story.story_id !== selectedStory?.story_id);
  const otherEvents = events
    .filter((event) => event.event_id !== selectedEvent?.event_id && event.presentation?.has_full_timeline)
    .sort((a, b) => (b.presentation?.rank_score || 0) - (a.presentation?.rank_score || 0));

  return (
    <div className={`reader-app resolved-reader${route.view === 'event' ? ' event-layout-c' : ''}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header view={route.view} onNavigate={navigate} defaultEventId={defaultEvent?.event_id} />
      {route.view === 'today' ? (
        <TodayView digest={data.digest} onNavigate={navigate} />
      ) : null}
      {route.view === 'story' ? (
        <StoryView
          story={selectedStory}
          event={storyEvent}
          relatedStories={relatedStories}
          onNavigate={navigate}
        />
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
