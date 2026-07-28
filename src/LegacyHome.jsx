import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getUserState } from './graphql/queries';
import { createUserState, updateUserState } from './graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';
import NewsletterWizardModal from './NewsletterWizardModal';
import NewsSectionsModal from './NewsSectionsModal';

const GENERATE_URL = import.meta.env.VITE_NEWSLETTER_GENERATE_URL || '';
const ENABLE_CLOUD_SETTINGS = import.meta.env.VITE_ENABLE_CLOUD_SETTINGS === 'true';
const ENABLE_NEWSLETTERS = import.meta.env.VITE_ENABLE_NEWSLETTERS !== 'false';
const ENABLE_NEWSLETTER_GENERATION = import.meta.env.VITE_ENABLE_NEWSLETTER_GENERATION === 'true';
const ENABLE_EXTRA_SECTIONS = import.meta.env.VITE_ENABLE_EXTRA_SECTIONS === 'true';

const PINNED_CATEGORY_ORDER = ENABLE_NEWSLETTERS
  ? ['top-stories', 'timelines', 'your-newsletter']
  : ['top-stories', 'timelines'];
const CUSTOMIZABLE_CATEGORY_ORDER = [
  'local',
  'happy',
  'science',
  'sports',
  'politics',
  'business',
  'technology',
  'health',
  'world',
  'other',
];
const DEFAULT_CUSTOM_SELECTED = [];
const SECTION_STORAGE_KEY = 'muninn-selected-sections';
const STATE_STORAGE_KEY = 'muninn-selected-state';
const NEWSLETTER_STORAGE_KEY = 'muninn-newsletters';
const NOTE_TEXT_PREFIX = '[muninn-sections]';
const THEME_STORAGE_KEY = 'muninn-theme';
const NEWSLETTER_TEXT_PREFIX = '[muninn-newsletters]';

const categoryTitles = {
  'top-stories': 'Today',
  timelines: 'Events',
  'your-newsletter': 'Newsletter',
  local: 'Local News',
  happy: 'Happy News',
  science: 'Science News',
  sports: 'Sports News',
  politics: 'Politics News',
  business: 'Business News',
  technology: 'AI News',
  health: 'Health News',
  world: 'World News',
  other: 'Other News',
};

const EVENT_BROWSE_CATEGORIES = [
  { key: 'all', label: 'All coverage' },
  { key: 'Politics', label: 'Politics' },
  { key: 'World', label: 'World' },
  { key: 'Business & Economy', label: 'Business & Economy' },
  { key: 'Technology & AI', label: 'Technology & AI' },
  { key: 'Science & Environment', label: 'Science & Environment' },
  { key: 'Health', label: 'Health' },
  { key: 'Public Safety', label: 'Public Safety' },
  { key: 'Sports', label: 'Sports' },
  { key: 'Culture', label: 'Culture' },
  { key: 'Local', label: 'Local' },
  { key: 'Other', label: 'Other' },
];

const placeholderCopy = {
  happy: 'No happy stories available yet.',
  science: 'No science stories available yet.',
  sports: 'No sports stories available yet.',
  politics: 'No politics stories available yet.',
  business: 'No business stories available yet.',
  technology: 'No AI stories available yet.',
  health: 'No health stories available yet.',
  world: 'No world stories available yet.',
  other: 'No other stories available yet.',
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const SUPPORTED_LOCAL_STATE_CODES = new Set(['CT', 'MA', 'CA']);
const WEEKLY_LOOKBACK_DAYS = 7;
const EVENTS_RAIL_LIMIT = 10;
const LATEST_EVENTS_RAIL_LIMIT = 6;
const EVENTS_BROWSE_PAGE_SIZE = 24;

function resolveStateName(code) {
  if (!code) return '';
  const match = US_STATES.find((state) => state.code === code);
  return match ? match.name : code;
}

function buildNewsletterSectionLabel(topic, stateCode) {
  if (topic === 'local') {
    const stateName = resolveStateName(stateCode);
    return stateName ? `${stateName} News` : (categoryTitles[topic] || topic);
  }
  return categoryTitles[topic] || topic;
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatStoredDate(value) {
  if (!value) return 'Recent update';
  const parsed = new Date(String(value).length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCardFreshness(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const elapsedMs = Date.now() - parsed.getTime();
  if (elapsedMs >= 0 && elapsedMs < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(elapsedMs / (60 * 1000)));
    return minutes <= 5 ? 'Updated recently' : `Updated ${minutes}m ago`;
  }
  if (elapsedMs >= 0 && elapsedMs < 24 * 60 * 60 * 1000) {
    return `Updated ${Math.max(1, Math.round(elapsedMs / (60 * 60 * 1000)))}h ago`;
  }
  return `Updated ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function formatEditionSchedule(value, nowValue = Date.now()) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;
  const cycleMs = 24 * hourMs;
  const elapsedMs = Math.max(0, nowValue - parsed.getTime());
  const elapsedMinutes = Math.max(1, Math.floor(elapsedMs / minuteMs));
  const elapsedHours = Math.floor(elapsedMs / hourMs);
  const updatedLabel = elapsedHours < 1
    ? `Updated ${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'} ago`
    : `Updated ${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`;
  const remainingMs = cycleMs - elapsedMs;

  if (remainingMs <= 0) return updatedLabel;

  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / minuteMs));
  const remainingHours = Math.ceil(remainingMs / hourMs);
  const nextLabel = remainingHours <= 1
    ? `Next update in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`
    : `Next update in ${remainingHours} hours`;
  return `${updatedLabel} \u00b7 ${nextLabel}`;
}

function toLocalDateKey(value = new Date()) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + ' ...';
}

function toUtcDateKey(value) {
  if (!value) return '';
  const raw = String(value);
  const parsed = new Date(raw.length === 10 ? `${raw}T12:00:00Z` : raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function eventTimelineEntries(event) {
  const seen = new Set();
  return (Array.isArray(event?.timeline) ? event.timeline : [])
    .filter((entry) => {
      const title = String(entry?.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const identity = entry?.development_id || `${toUtcDateKey(entry?.date)}:${title}`;
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .sort((left, right) => String(left?.date || '').localeCompare(String(right?.date || '')));
}

function eventDisplayTitle(event) {
  return String(
    event?.presentation?.display_title
    || event?.presentation?.base_title
    || event?.topic_label
    || event?.canonical_title
    || event?.title
    || 'Tracked event'
  ).replace(/\s+Timeline$/i, '').trim();
}

function coverageTextMatchesQuery(value, query) {
  const searchable = String(value || '').toLowerCase();
  if (!query) return true;
  if (query.length > 4) return searchable.includes(query);
  return searchable
    .split(/[^a-z0-9]+/)
    .some((token) => token === query || token.startsWith(query));
}

function eventActivityStatus(event, currentDateKey) {
  const entries = eventTimelineEntries(event);
  if (entries.length < 2) return 'emerging';
  const latestKey = toUtcDateKey(event?.presentation?.latest_date || entries[entries.length - 1]?.date || event?.last_seen_at);
  if (!latestKey || !currentDateKey) return 'ongoing';
  if (latestKey === currentDateKey) return 'active';
  const latestDate = new Date(`${latestKey}T12:00:00Z`);
  const currentDate = new Date(`${currentDateKey}T12:00:00Z`);
  const daysSinceUpdate = Math.max(0, Math.round((currentDate - latestDate) / (24 * 60 * 60 * 1000)));
  return daysSinceUpdate >= 4 ? 'archive' : 'ongoing';
}

function eventDateRange(event) {
  const entries = eventTimelineEntries(event);
  if (!entries.length) return '';
  const firstKey = toUtcDateKey(event?.presentation?.first_date || entries[0]?.date);
  const latestKey = toUtcDateKey(event?.presentation?.latest_date || entries[entries.length - 1]?.date);
  if (!firstKey || !latestKey) return '';
  if (firstKey === latestKey) return formatStoredDate(firstKey);
  const first = new Date(`${firstKey}T12:00:00Z`);
  const latest = new Date(`${latestKey}T12:00:00Z`);
  const firstLabel = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const latestLabel = latest.toLocaleDateString('en-US', {
    month: first.getUTCMonth() === latest.getUTCMonth() ? undefined : 'short',
    day: 'numeric',
  });
  return `${firstLabel}\u2013${latestLabel}`;
}

function eventCoverageType(event) {
  const explicit = String(event?.coverage_type || event?.container_type || event?.type || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const stage = String(event?.presentation?.stage || event?.event_stage || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (explicit === 'storyline' || explicit === 'ongoing_story' || stage === 'timeline' || stage === 'storyline') {
    return 'Ongoing Story';
  }
  return 'Developing Event';
}

function eventCoverageIdentity(event) {
  return `${eventCoverageType(event)}:${eventDisplayTitle(event)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function eventLatestDateKey(event) {
  const entries = eventTimelineEntries(event);
  return toUtcDateKey(
    event?.presentation?.latest_date
    || entries[entries.length - 1]?.date
    || event?.last_seen_at
  );
}

function eventUpdateGroupLabel(event, currentDateKey) {
  const daysSinceUpdate = coverageDaysSinceUpdate(event, currentDateKey);
  if (daysSinceUpdate === 0) return 'Today';
  if (daysSinceUpdate === 1) return 'Yesterday';
  return formatStoredDate(eventLatestDateKey(event));
}

function eventFirstDateKey(event) {
  const entries = eventTimelineEntries(event);
  return toUtcDateKey(
    event?.presentation?.first_date
    || entries[0]?.date
    || event?.first_seen_at
  );
}

function coverageDaysSinceUpdate(event, currentDateKey) {
  const latestKey = eventLatestDateKey(event);
  if (!latestKey || !currentDateKey) return 30;
  const latest = new Date(`${latestKey}T12:00:00Z`);
  const current = new Date(`${currentDateKey}T12:00:00Z`);
  if (Number.isNaN(latest.getTime()) || Number.isNaN(current.getTime())) return 30;
  return Math.max(0, Math.round((current - latest) / (24 * 60 * 60 * 1000)));
}

function coverageRecencySignal(event, currentDateKey, halfLifeDays) {
  return Math.exp(-coverageDaysSinceUpdate(event, currentDateKey) / Math.max(1, halfLifeDays));
}

function coverageImportanceSignal(event) {
  const explicit = Number(
    event?.presentation?.editorial_importance_score
    ?? event?.editorial_importance_score
    ?? event?.importance_score
    ?? event?.presentation?.rank_score
    ?? 0
  );
  return Math.min(1, Math.max(0, explicit));
}

function coverageDepthSignal(event) {
  const developmentCount = eventTimelineEntries(event).length;
  const sourceCount = Number(
    event?.presentation?.independent_source_count
    || event?.presentation?.source_count
    || 0
  );
  const developmentSignal = Math.min(1, developmentCount / 8);
  const sourceSignal = Math.min(1, sourceCount / 12);
  return (developmentSignal * 0.65) + (sourceSignal * 0.35);
}

function storylineSectionScore(event, currentDateKey) {
  return (
    coverageImportanceSignal(event) * 0.45
    + coverageRecencySignal(event, currentDateKey, 10) * 0.35
    + coverageDepthSignal(event) * 0.20
  );
}

function developingEventSectionScore(event, currentDateKey) {
  return (
    coverageRecencySignal(event, currentDateKey, 4) * 0.65
    + coverageImportanceSignal(event) * 0.25
    + coverageDepthSignal(event) * 0.10
  );
}

function eventDisplayCategory(event, relatedStory) {
  if (relatedStory) return normalizedStoryCategory(relatedStory);
  const coverageTitle = eventDisplayTitle(event);
  const coverageText = `${coverageTitle} ${event?.summary || ''} ${event?.latest_summary || ''}`;
  const normalizedTitle = coverageTitle.toLowerCase();
  if (/iran war|ukraine war|ukraine conflict/.test(normalizedTitle)) return 'World';
  if (/fifa world cup|world cup 2026|2026 world cup/.test(normalizedTitle)) return 'Sports';
  if (/trade dispute|tariff|oil price|market|econom/.test(normalizedTitle)) return 'Business & Economy';
  if (/protest|police crackdown|arrest|shooting|investigation/.test(normalizedTitle)) return 'Public Safety';
  const explicit = String(event?.category || event?.primary_category || '').trim();
  const normalizedExplicit = normalizeControlledCategoryLabel(explicit);
  const inferred = normalizeControlledCategoryLabel(inferDisplayCategory({
    title: coverageTitle,
    summary: coverageText,
  }));
  const staleLegacyPair = (
    (normalizedExplicit === 'Science & Environment' && inferred === 'Business & Economy')
    || (normalizedExplicit === 'Health' && inferred === 'Public Safety')
  );
  if (!explicit || normalizedExplicit === 'Other' || staleLegacyPair) return inferred;
  return normalizedExplicit;
}

function eventBrowseCategoryKey(category) {
  const knownCategories = new Set(EVENT_BROWSE_CATEGORIES.map((entry) => entry.key));
  return knownCategories.has(category) ? category : 'Other';
}

function eventVisual(event, relatedStory) {
  const candidates = [
    event?.hero_image,
    event?.image,
    event?.presentation?.image,
    relatedStory?.image,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return { url: candidate.trim(), alt: '', roleLabel: '' };
    }
    if (!candidate || typeof candidate !== 'object') continue;
    const url = String(candidate.url || candidate.thumbnail_url || candidate.src || '').trim();
    if (!url) continue;
    return {
      url,
      alt: String(candidate.alt || candidate.alt_text || '').trim(),
      roleLabel: String(candidate.image_role_label || candidate.role_label || '').trim(),
    };
  }
  return { url: '', alt: '', roleLabel: '' };
}

function EventArtwork({ event, relatedStory, compact = false }) {
  const visual = eventVisual(event, relatedStory);
  const category = eventBrowseCategoryKey(eventDisplayCategory(event, relatedStory));
  const crop = relatedStory ? storyImageCropPresentation(relatedStory, 'wide') : null;
  if (visual.url) {
    return (
      <div className={`coverage-art ${compact ? 'is-compact' : ''}`}>
        <img
          src={visual.url}
          alt={visual.alt}
          loading="lazy"
          style={crop ? { objectPosition: crop.position } : undefined}
        />
      </div>
    );
  }
  return (
    <div
      className={`coverage-art coverage-art-placeholder ${compact ? 'is-compact' : ''}`}
      data-category={category}
      role="img"
      aria-label={`${eventDisplayTitle(event)} editorial image placeholder`}
    >
      <span>Muninn</span>
      <strong>Event file</strong>
    </div>
  );
}

function CoverageLandingCard({ event, relatedStory, showType = false }) {
  const entries = eventTimelineEntries(event);
  const latest = entries[entries.length - 1] || {};
  const visual = eventVisual(event, relatedStory);
  const category = eventDisplayCategory(event, relatedStory);
  const coverageType = eventCoverageType(event);
  const sourceCount = Number(
    event?.presentation?.independent_source_count
    || event?.presentation?.source_count
    || 0
  );
  const crop = relatedStory ? storyImageCropPresentation(relatedStory, 'tall') : null;
  const title = eventDisplayTitle(event);

  return (
    <article className={`coverage-landing-card ${visual.url ? 'has-image' : 'no-image'}`}>
      <a href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`} aria-label={`Open ${title}`}>
        <div
          className={`coverage-landing-media ${visual.url ? '' : 'coverage-landing-placeholder'}`}
          data-category={eventBrowseCategoryKey(category)}
          style={crop ? { '--story-focus': crop.position } : undefined}
        >
          {visual.url ? (
            <img src={visual.url} alt={visual.alt} loading="lazy" />
          ) : (
            <div className="coverage-placeholder-copy" aria-hidden="true">
              <span>Muninn</span>
              <strong>Event file</strong>
            </div>
          )}
          <div className="coverage-landing-title">
            {showType ? <span>{coverageType}</span> : null}
            <h3 title={title}>{title}</h3>
          </div>
        </div>
        <div className="coverage-landing-footer">
          <small>
            Latest update{latest.date ? ` \u00b7 ${formatStoredDate(latest.date)}` : ''}
          </small>
          <strong title={latest.title || 'Latest development available'}>
            {latest.title || 'Latest development available'}
          </strong>
          <div>
            {sourceCount ? <span>{sourceCount} sources</span> : null}
            <span>{entries.length} developments</span>
          </div>
        </div>
      </a>
    </article>
  );
}

function CoverageDirectoryCard({ event, relatedStory, showType = false }) {
  const entries = eventTimelineEntries(event);
  const latest = entries[entries.length - 1] || {};
  const visual = eventVisual(event, relatedStory);
  const category = eventDisplayCategory(event, relatedStory);
  const coverageType = eventCoverageType(event);
  const sourceCount = Number(
    event?.presentation?.independent_source_count
    || event?.presentation?.source_count
    || 0
  );
  const crop = relatedStory ? storyImageCropPresentation(relatedStory, 'wide') : null;
  const title = eventDisplayTitle(event);

  return (
    <article className={`events-directory-card ${visual.url ? 'has-image' : 'no-image'}`}>
      <a href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`} aria-label={`Open ${title}`}>
        <div
          className={`coverage-directory-media ${visual.url ? '' : 'coverage-directory-placeholder'}`}
          data-category={eventBrowseCategoryKey(category)}
          style={crop ? { '--story-focus': crop.position } : undefined}
        >
          {visual.url ? (
            <img src={visual.url} alt={visual.alt} loading="lazy" />
          ) : (
            <div className="coverage-placeholder-copy" aria-hidden="true">
              <span>Muninn</span>
              <strong>Event file</strong>
            </div>
          )}
        </div>
        <div className="coverage-directory-body">
          {showType ? <span className="coverage-directory-type">{coverageType}</span> : null}
          <h2>{title}</h2>
          <small>Latest update{latest.date ? ` \u00b7 ${formatStoredDate(latest.date)}` : ''}</small>
          <strong>{latest.title || 'Latest development available'}</strong>
          <div>
            {sourceCount ? <span>{sourceCount} sources</span> : null}
            <span>{entries.length} developments</span>
          </div>
        </div>
      </a>
    </article>
  );
}

function LatestUpdateRow({ event, relatedStory }) {
  const entries = eventTimelineEntries(event);
  const latest = entries[entries.length - 1] || {};
  const visual = eventVisual(event, relatedStory);
  const category = eventDisplayCategory(event, relatedStory);
  const coverageType = eventCoverageType(event);
  const sourceCount = Number(
    event?.presentation?.independent_source_count
    || event?.presentation?.source_count
    || 0
  );
  const crop = relatedStory ? storyImageCropPresentation(relatedStory, 'wide') : null;
  const title = eventDisplayTitle(event);

  return (
    <article className="latest-update-row">
      <a href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`} aria-label={`Open latest update for ${title}`}>
        <div
          className={`latest-update-media ${visual.url ? '' : 'latest-update-placeholder'}`}
          data-category={eventBrowseCategoryKey(category)}
          style={crop ? { '--story-focus': crop.position } : undefined}
        >
          {visual.url ? (
            <img src={visual.url} alt={visual.alt} loading="lazy" />
          ) : (
            <span aria-hidden="true">Event file</span>
          )}
        </div>
        <div className="latest-update-copy">
          <span className="latest-update-context">{coverageType} · {title}</span>
          <h2>{latest.title || 'Latest development available'}</h2>
          <div>
            <time dateTime={toUtcDateKey(latest.date || eventLatestDateKey(event))}>
              {formatStoredDate(latest.date || eventLatestDateKey(event))}
            </time>
            {sourceCount ? <span>{sourceCount} sources</span> : null}
            <span>{entries.length} developments</span>
          </div>
        </div>
        <span className="latest-update-arrow" aria-hidden="true">{'\u2192'}</span>
      </a>
    </article>
  );
}

function EventsSwipeSection({ title, items, relatedStories, browseType, showType = false }) {
  const railRef = useRef(null);
  const scrollRail = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    const distance = Math.max(260, Math.round(rail.clientWidth * 0.9));
    rail.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <section className="events-swipe-section" aria-labelledby={`events-${browseType}-title`}>
      <header className="events-section-header">
        <h2 id={`events-${browseType}-title`}>{title}</h2>
        <div>
          <a href={`/?category=timelines&view=browse&type=${browseType}`}>See all <span aria-hidden="true">{'\u2192'}</span></a>
          {items.length > 4 ? (
            <span className="events-swipe-controls" aria-label={`${title} carousel controls`}>
              <button type="button" onClick={() => scrollRail(-1)} aria-label={`Show previous ${title}`}>
                <span aria-hidden="true">←</span>
              </button>
              <button type="button" onClick={() => scrollRail(1)} aria-label={`Show more ${title}`}>
                <span aria-hidden="true">→</span>
              </button>
            </span>
          ) : null}
        </div>
      </header>
      <div className="events-swipe-rail" ref={railRef} role="region" aria-label={title} tabIndex={0}>
        {items.map((event) => (
          <CoverageLandingCard
            event={event}
            relatedStory={relatedStories.get(event.event_id)}
            showType={showType}
            key={event.event_id || event.title}
          />
        ))}
      </div>
    </section>
  );
}

function CoverageRail({ children, label, itemCount, className = '', metaText = '' }) {
  const railRef = useRef(null);
  const scrollRail = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    const distance = Math.max(280, Math.round(rail.clientWidth * 0.82));
    rail.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };
  return (
    <div className="coverage-rail-shell">
      <div className="coverage-rail-toolbar">
        <span>{metaText || `${itemCount} ${itemCount === 1 ? 'item' : 'items'} · swipe for more`}</span>
        {itemCount > 1 ? (
          <div className="coverage-rail-controls" aria-label={`${label} carousel controls`}>
            <button type="button" onClick={() => scrollRail(-1)} aria-label={`Show earlier ${label}`}>
              <span aria-hidden="true">{'\u2190'}</span>
            </button>
            <button type="button" onClick={() => scrollRail(1)} aria-label={`Show more ${label}`}>
              <span aria-hidden="true">{'\u2192'}</span>
            </button>
          </div>
        ) : null}
      </div>
      <div
        className={`coverage-rail ${className}`.trim()}
        ref={railRef}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

function trackedCoverageForStories(stories) {
  const story = (Array.isArray(stories) ? stories : [stories]).find((item) => {
    const context = item?.story_context || {};
    return (
      context.available
      || Number(context.development_count || 0) > 1
      || context.stage === 'timeline'
      || context.stage === 'storyline'
    );
  });
  if (!story) return null;
  const context = story.story_context || {};
  const stage = String(context.stage || '').toLowerCase();
  const type = stage === 'timeline' || stage === 'storyline' ? 'Ongoing Story' : 'Developing Event';
  const name = String(
    context.base_title
    || context.event_title
    || story.event_title
    || story.topic_label
    || 'Tracked coverage'
  ).replace(/\s+Timeline$/i, '').trim();
  return {
    name,
    type,
    label: `${name} · ${type === 'Ongoing Story' ? 'Ongoing' : 'Developing'}`,
  };
}

function buildWeeklyRoundup(events, generatedAt) {
  const endKey = toUtcDateKey(generatedAt) || toUtcDateKey(new Date());
  const endDate = new Date(`${endKey}T12:00:00Z`);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (WEEKLY_LOOKBACK_DAYS - 1));
  const startKey = toUtcDateKey(startDate);

  const weeklyEvents = (Array.isArray(events) ? events : []).map((event) => {
    const seenDevelopments = new Set();
    const developments = (Array.isArray(event?.timeline) ? event.timeline : [])
      .filter((entry) => {
        const entryKey = toUtcDateKey(entry?.date);
        return entryKey && entryKey >= startKey && entryKey <= endKey;
      })
      .sort((left, right) => String(left?.date || '').localeCompare(String(right?.date || '')))
      .filter((entry) => {
        const normalizedTitle = String(entry?.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const identity = entry?.development_id || normalizedTitle;
        if (!identity || seenDevelopments.has(identity)) return false;
        seenDevelopments.add(identity);
        return true;
      });

    if (!developments.length) return null;
    const latest = developments[developments.length - 1];
    return {
      event,
      developments,
      latestDate: toUtcDateKey(latest?.date),
      rankScore: Number(event?.presentation?.rank_score || 0),
    };
  }).filter(Boolean).sort((left, right) => (
    right.rankScore - left.rankScore
    || right.developments.length - left.developments.length
    || right.latestDate.localeCompare(left.latestDate)
  ));

  return {
    startKey,
    endKey,
    events: weeklyEvents,
    developmentCount: weeklyEvents.reduce((total, item) => total + item.developments.length, 0),
  };
}

function sanitizeSelectedSections(sections) {
  if (!Array.isArray(sections)) return [...DEFAULT_CUSTOM_SELECTED];
  const allowed = new Set(CUSTOMIZABLE_CATEGORY_ORDER);
  const seen = new Set();
  const ordered = [];
  for (const key of sections) {
    if (!allowed.has(key) || seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }
  return ordered;
}

function parseSectionsFromNoteText(noteText) {
  if (!noteText || typeof noteText !== 'string') return null;
  const line = noteText.split('\n').find((entry) => entry.startsWith(NOTE_TEXT_PREFIX));
  if (!line) return null;

  try {
    const parsed = JSON.parse(line.slice(NOTE_TEXT_PREFIX.length));
    return sanitizeSelectedSections(parsed);
  } catch (_e) {
    return null;
  }
}

function upsertSectionsInNoteText(noteText, sections) {
  const cleaned = typeof noteText === 'string' ? noteText.split('\n').filter((line) => !line.startsWith(NOTE_TEXT_PREFIX)) : [];
  cleaned.push(`${NOTE_TEXT_PREFIX}${JSON.stringify(sections)}`);
  return cleaned.filter(Boolean).join('\n');
}

function parseNewslettersFromNoteText(noteText) {
  if (!noteText || typeof noteText !== 'string') return [];
  const line = noteText.split('\n').find((entry) => entry.startsWith(NEWSLETTER_TEXT_PREFIX));
  if (!line) return [];

  try {
    const parsed = JSON.parse(line.slice(NEWSLETTER_TEXT_PREFIX.length));
    if (Array.isArray(parsed)) {
      return parsed.filter((entry) => entry && typeof entry === 'object');
    }
    if (parsed && typeof parsed === 'object') return [parsed];
    return [];
  } catch (_e) {
    return [];
  }
}

function upsertNewslettersInNoteText(noteText, newsletters) {
  const cleaned = typeof noteText === 'string'
    ? noteText.split('\n').filter((line) => !line.startsWith(NEWSLETTER_TEXT_PREFIX))
    : [];
  cleaned.push(`${NEWSLETTER_TEXT_PREFIX}${JSON.stringify(newsletters)}`);
  return cleaned.filter(Boolean).join('\n');
}

function createNewsletterId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `nl_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function parseSectionsFromLocalStorage() {
  try {
    const saved = localStorage.getItem(SECTION_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return sanitizeSelectedSections(parsed);
  } catch (_e) {
    return null;
  }
}

function escapeRegex(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanDisplayTitle(title, sources = []) {
  let cleaned = String(title || '').replace(/\s+/g, ' ').trim();
  const knownOutlets = [
    'AP News', 'AP', 'Reuters', 'Politico', 'UPI.com', 'UPI', 'BBC News', 'BBC', 'NPR',
    'ABC News', 'CBS News', 'NBC News', 'The Guardian', 'New York Times', 'Al Jazeera',
    'The Hill', 'Fox News', 'USA Today', 'Roll Call', 'Axios', 'CNN', 'CNBC', 'Bloomberg',
  ];
  const outletNames = [...new Set([...knownOutlets, ...(Array.isArray(sources) ? sources : [])])]
    .filter(Boolean)
    .sort((left, right) => String(right).length - String(left).length);

  outletNames.forEach((outlet) => {
    const suffix = new RegExp(`\\s*(?:[-–—|]\\s*|\\s+)${escapeRegex(outlet)}\\s*$`, 'i');
    cleaned = cleaned.replace(suffix, '').trim();
  });

  const trailingAttribution = cleaned.match(/^(.*?)\s+[-–—|]\s*([^–—|]{2,40})$/);
  if (trailingAttribution) {
    const normalizeOutlet = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const suffixKey = normalizeOutlet(trailingAttribution[2]);
    const isDomain = /^[a-z0-9-]+\.(?:com|org|net|co|news)$/i.test(trailingAttribution[2].trim());
    const isOutletPrefix = outletNames.some((outlet) => {
      const outletKey = normalizeOutlet(outlet);
      return suffixKey === outletKey || (suffixKey.length >= 4 && outletKey.startsWith(suffixKey));
    });
    if (isDomain || isOutletPrefix) cleaned = trailingAttribution[1].trim();
  }
  return cleaned || 'Untitled story';
}

function inferDisplayCategory(story) {
  const text = `${story?.title || ''} ${story?.summary || ''}`.toLowerCase();
  const rules = [
    ['Sports', ['world cup', 'tournament', 'match', 'league', 'playoff', 'semifinal', 'quarterfinal', 'football', 'soccer', 'athlete', 'player', 'coach']],
    ['Culture', ['actor', 'actress', 'film', 'movie', 'musician', 'singer', 'television', 'jurassic park']],
    ['Technology & AI', ['artificial intelligence', 'openai', 'chatgpt', 'software', 'cyber', 'technology', 'robot', 'sign-in', 'account access', 'selfie video']],
    ['Health', ['health', 'hospital', 'disease', 'vaccine', 'medical', 'doctor', 'patient']],
    ['Science & Environment', ['science', 'space', 'nasa', 'research', 'study', 'climate', 'wildfire', 'earthquake', 'hurricane', 'tropical storm', 'astronomer', 'archaeology', 'ancient mayan', 'ruins']],
    ['Business & Economy', ['market', 'business', 'economy', 'trade', 'tariff', 'bank', 'stock', 'tax']],
    ['Politics', ['election', 'congress', 'congressional', 'senate', 'campaign', 'president', 'trump', 'parliament', 'political', 'politician', 'politburo', 'minister', 'legislation', 'bill']],
    ['World', ['war', 'missile', 'ceasefire', 'military', 'diplomatic', 'border', 'iran', 'israel', 'ukraine', 'russia']],
    ['Public Safety', ['police', 'shooting', 'murder', 'killed', 'crime', 'missing', 'rescue', 'protest', 'crackdown', 'arrest']],
  ];
  return rules.find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] || 'Other';
}

function normalizeControlledCategoryLabel(value) {
  const normalized = String(value || '').toLowerCase().replace(/[_&-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const known = {
    politics: 'Politics',
    government: 'Politics',
    world: 'World',
    international: 'World',
    business: 'Business & Economy',
    economy: 'Business & Economy',
    'business economy': 'Business & Economy',
    technology: 'Technology & AI',
    tech: 'Technology & AI',
    ai: 'Technology & AI',
    'ai technology': 'Technology & AI',
    'technology ai': 'Technology & AI',
    science: 'Science & Environment',
    environment: 'Science & Environment',
    'science environment': 'Science & Environment',
    health: 'Health',
    'public safety': 'Public Safety',
    sports: 'Sports',
    culture: 'Culture',
    local: 'Local',
    other: 'Other',
    news: 'Other',
    'top story': 'Other',
  };
  return known[normalized] || 'Other';
}

function normalizedStoryCategory(story) {
  const category = String(story?.primary_category || story?.category || '').trim();
  const inferred = inferDisplayCategory(story);
  const topicLabel = String(story?.canonical_topic_label || story?.topic_label || '').toLowerCase();
  if (/iran war|u\.?s\.?-iran conflict|iran-us tensions|ukraine war|ukraine conflict|ukraine-russia conflict/.test(topicLabel)) return 'World';
  if (/fifa world cup|world cup 2026|2026 world cup|world cup final/.test(topicLabel)) return 'Sports';
  if (!category || category.toLowerCase() === 'top story') return inferred;
  const text = `${story?.title || ''} ${story?.summary || ''}`.toLowerCase();
  if (category.toLowerCase() === 'science' && /politburo|political figure|politician|parliament|senate|congress|election/.test(text)) return 'Politics';
  if (category.toLowerCase() === 'science' && ['Politics', 'Sports', 'Business & Economy'].includes(inferred)) return inferred;
  if (inferred === 'Science & Environment' && /wildfire|hurricane|tropical storm|earthquake|climate/.test(text)) return inferred;
  if (inferred === 'Public Safety' && /police|shooting|murder|crime|arrest|rescue|protest/.test(text)) return inferred;
  return normalizeControlledCategoryLabel(category);
}

const TOPIC_STOP_WORDS = new Set([
  'about', 'after', 'amid', 'and', 'are', 'as', 'at', 'for', 'from', 'has', 'have', 'in',
  'into', 'is', 'its', 'new', 'of', 'on', 'over', 'says', 'set', 'the', 'their', 'to',
  'with', 'against', 'following', 'prepare', 'prepares', 'latest', '2026',
]);

function storyTopicTokens(story) {
  return new Set(String(story?.title || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !TOPIC_STOP_WORDS.has(token)));
}

function storiesLookRelated(left, right) {
  const leftDevelopment = String(left?.development_id || left?.story_id || '');
  const rightDevelopment = String(right?.development_id || right?.story_id || '');
  if (leftDevelopment && rightDevelopment) return leftDevelopment === rightDevelopment;
  if (left?.event_id && right?.event_id && left.event_id !== right.event_id) return false;
  if (normalizedStoryCategory(left) !== normalizedStoryCategory(right)) return false;
  const leftTokens = storyTopicTokens(left);
  const rightTokens = storyTopicTokens(right);
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const smaller = Math.min(leftTokens.size, rightTokens.size) || 1;
  return shared >= 4 && shared / smaller >= 0.45;
}

function storyEditorialRankScore(story) {
  const publishedScore = Number(story?.today_rank_score);
  if (Number.isFinite(publishedScore) && publishedScore > 0) return publishedScore;

  const quality = Math.max(0, Math.min(1, Number(story?.quality_score || 0)));
  const novelty = Math.max(0, Math.min(1, Number(story?.novelty_score || 0)));
  const sourceBreadth = Math.min(1, Number(story?.source_count || 0) / 6);
  return (quality * 0.55) + (novelty * 0.3) + (sourceBreadth * 0.15);
}

function groupStoriesForToday(stories) {
  return stories.filter((story) => story?.today_eligible !== false).reduce((groups, story) => {
    const match = groups.find((group) => group.stories.some((candidate) => storiesLookRelated(candidate, story)));
    if (match) match.stories.push(story);
    else groups.push({ stories: [story] });
    return groups;
  }, []).map((group) => {
    const ordered = [...group.stories].sort((left, right) => (
      Number(right?.novelty_score || 0) - Number(left?.novelty_score || 0)
      || Number(left?.today_rank || 999) - Number(right?.today_rank || 999)
    ));
    return { primary: ordered[0], related: ordered.slice(1) };
  }).sort((left, right) => (
    storyEditorialRankScore(right.primary) - storyEditorialRankScore(left.primary)
    || Number(left.primary?.today_rank || 999) - Number(right.primary?.today_rank || 999)
    || uniqueSourceCount([right.primary, ...right.related]) - uniqueSourceCount([left.primary, ...left.related])
  ));
}

function uniqueSourceCount(stories) {
  const keys = new Set();
  stories.forEach((story) => {
    const items = Array.isArray(story?.items) ? story.items : [];
    if (items.length) {
      items.forEach((item) => {
        const outlet = String(item?.source || item?.station || '').trim().toLowerCase();
        if (outlet) keys.add(outlet);
      });
    } else {
      (Array.isArray(story?.sources) ? story.sources : []).forEach((source) => {
        const outlet = String(source || '').trim().toLowerCase();
        if (outlet) keys.add(outlet);
      });
    }
  });
  return keys.size || stories.reduce((sum, story) => sum + Number(story?.source_count || 0), 0) || 1;
}

const SOURCE_LOGO_MATCHES = [
  ['google news', 'google-news'],
  ['new york times', 'new-york-times'],
  ['japan times', 'japan-times'],
  ['associated press', 'ap'],
  ['ap news', 'ap'],
  ['npr', 'npr'],
  ['nbc', 'nbc-news'],
  ['abc news', 'abc-news'],
  ['cbs', 'cbs-news'],
  ['politico', 'politico'],
  ['cnn', 'cnn'],
  ['fox', 'fox-news'],
  ['pbs', 'pbs-news'],
  ['newsnation', 'newsnation'],
  ['bbc', 'bbc'],
  ['al jazeera', 'al-jazeera'],
  ['guardian', 'the-guardian'],
  ['sky news', 'sky-news'],
  ['france 24', 'france-24'],
  ['deutsche welle', 'dw'],
  ['cbc', 'cbc-news'],
  ['channel newsasia', 'channel-newsasia'],
  ['sbs news', 'sbs-news'],
  ['africanews', 'africanews'],
  ['the hindu', 'the-hindu'],
  ['rte news', 'rte-news'],
  ['euronews', 'euronews'],
  ['time', 'time'],
  ['reuters', 'reuters'],
  ['los angeles times', 'los-angeles-times'],
  ['roll call', 'roll-call'],
  ['the hill', 'the-hill'],
  ['upi', 'upi'],
  ['usa today', 'usa-today'],
  ['vox', 'vox'],
];

function sourceLogoUrl(sourceName) {
  const normalized = String(sourceName || '').toLowerCase().trim();
  if (normalized === 'ap' || normalized.startsWith('ap -')) return '/assets/logos/ap.png';
  if (normalized === 'dw' || normalized.startsWith('dw -')) return '/assets/logos/dw.png';
  const match = SOURCE_LOGO_MATCHES.find(([name]) => normalized.includes(name));
  return `/assets/logos/${match ? match[1] : 'news_placeholder'}.png`;
}

function cleanSourceDisplayName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^ap\s*-\s*top news(?:\s+via\s+google news)?$/i.test(raw)) return 'AP';
  if (/^dw(?:\s*-\s*english)?$/i.test(raw)) return 'DW';
  return raw
    .replace(/\s+via\s+Google News$/i, '')
    .replace(/\s*-\s*(?:English|Latest|Headlines|World)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceEntriesForStories(stories) {
  const byOutlet = new Map();
  const addSource = (entry) => {
    const name = cleanSourceDisplayName(
      typeof entry === 'string'
        ? entry
        : (entry?.station || entry?.source || entry?.publisher || entry?.name || '')
    );
    if (!name || byOutlet.has(name.toLowerCase())) return;
    byOutlet.set(name.toLowerCase(), {
      name,
      bias: typeof entry === 'string' ? '' : (entry?.source_bias || entry?.bias || ''),
    });
  };

  stories.forEach((story) => {
    const items = Array.isArray(story?.items) ? story.items : (story?.items ? [story.items] : []);
    const sources = Array.isArray(story?.sources) ? story.sources : (story?.sources ? [story.sources] : []);
    items.forEach(addSource);
    sources.forEach(addSource);
  });
  return [...byOutlet.values()];
}

const SOURCE_LOGO_DISPLAY_LIMIT = 3;

function sourceSummaryText(sourceEntries, fallbackCount, visibleNameLimit = 2) {
  const count = sourceEntries.length || Number(fallbackCount || 1);
  const names = sourceEntries.slice(0, visibleNameLimit).map((entry) => entry.name);
  const remainder = Math.max(0, count - names.length);
  return `${count} source${count === 1 ? '' : 's'}${names.length ? ` · ${names.join(', ')}${remainder ? ` +${remainder}` : ''}` : ''}`;
}

function sourceOrientationCounts(sourceEntries) {
  return sourceEntries.reduce((counts, entry) => {
    const bias = String(entry?.bias || '').toLowerCase().replace(/_/g, '-');
    if (bias.includes('left')) counts.left += 1;
    else if (bias.includes('right')) counts.right += 1;
    else if (bias === 'center' || bias === 'mixed') counts.center += 1;
    else counts.unknown += 1;
    return counts;
  }, { left: 0, center: 0, right: 0, unknown: 0 });
}

function SourceOrientationBar({ sourceEntries }) {
  const counts = sourceOrientationCounts(sourceEntries);
  const total = counts.left + counts.center + counts.right + counts.unknown;
  if (!total) return null;
  const segments = [
    { key: 'left', label: 'Left', count: counts.left },
    { key: 'center', label: 'Center / mixed', count: counts.center },
    { key: 'right', label: 'Right', count: counts.right },
    { key: 'unknown', label: 'Not classified', count: counts.unknown },
  ].filter((segment) => segment.count > 0);
  const description = segments.map((segment) => `${segment.count} ${segment.label.toLowerCase()}`).join(', ');
  return (
    <div className="source-orientation" aria-label={`Source orientation: ${description}`}>
      <div className="source-orientation-bar" aria-hidden="true">
        {segments.map((segment) => (
          <span
            className={`source-orientation-segment is-${segment.key}`}
            style={{ flexGrow: segment.count }}
            title={`${segment.label}: ${segment.count} of ${total}`}
            key={segment.key}
          />
        ))}
      </div>
    </div>
  );
}

function storyCoverageReason(sourceEntries, fallbackCount) {
  const outletCount = sourceEntries.length || fallbackCount || 1;
  const sides = new Set(sourceEntries.map((entry) => {
    const bias = String(entry?.bias || '').toLowerCase().replace(/_/g, '-');
    if (bias.includes('left')) return 'left';
    if (bias.includes('right')) return 'right';
    if (bias === 'center' || bias === 'mixed') return 'center';
    return '';
  }).filter(Boolean));

  if (sides.has('left') && sides.has('right')) return `${outletCount} outlets \u00b7 left/right coverage`;
  if (outletCount >= 4 && sides.size > 1) return `${outletCount} outlets \u00b7 varied source mix`;
  if (outletCount >= 4) return `${outletCount} outlets \u00b7 broad coverage`;
  if (outletCount >= 2) return `${outletCount} outlets covering this event`;
  return 'One outlet report';
}

function storyArchiveHref(story, editionDate, currentDate) {
  const params = new URLSearchParams();
  if (story?.story_id) params.set('sid', story.story_id);
  else params.set('id', '0');
  if (editionDate && editionDate !== currentDate) params.set('archiveDate', editionDate);
  params.set('returnMore', '1');
  return `/story.html?${params.toString()}`;
}

function briefingStoryHref(item) {
  const href = String(item?.story_url || '').trim();
  return href.startsWith('/story.html?') ? href : '';
}

function briefingSegmentHref(segment) {
  const href = String(segment?.href || '').trim();
  return href.startsWith('/story.html?') || href.startsWith('/timeline.html?') ? href : '';
}

function storyContinuityKeys(story) {
  const keys = [];
  const eventId = String(story?.event_id || '').trim();
  if (eventId) keys.push(`event:${eventId}`);
  const topic = String(story?.event_title || story?.topic_label || storyNavigationTopic(story) || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (topic && topic.split(/\s+/).length >= 2 && !['top stories', 'world news', 'general news'].includes(topic)) {
    keys.push(`topic:${topic}`);
  }
  return keys;
}

function latestDevelopmentForStory(story, editionDate, latestByKey) {
  const matches = storyContinuityKeys(story)
    .map((key) => latestByKey.get(key))
    .filter(Boolean)
    .sort((left, right) => String(right.date).localeCompare(String(left.date)));
  const latest = matches[0];
  if (!latest || latest.story?.story_id === story?.story_id || String(latest.date) <= String(editionDate)) return null;
  return latest;
}

function EditionStoryCard({ story, editionDate, currentDate, todayCard = false }) {
  const title = cleanDisplayTitle(story?.title, story?.sources);
  const sourceEntries = sourceEntriesForStories([story]);
  const visibleSourceEntries = sourceEntries.slice(0, SOURCE_LOGO_DISPLAY_LIMIT);
  const hiddenSourceCount = Math.max(0, sourceEntries.length - visibleSourceEntries.length);
  const sourceCount = sourceEntries.length || Number(story?.source_count || 1);
  const imageUrl = story?.image?.url || story?.image?.thumbnail_url || '';
  const imageCrop = storyImageCropPresentation(story, 'tall');
  const category = normalizedStoryCategory(story);
  const trackedCoverage = trackedCoverageForStories([story]);
  return (
    <div className="top-story-item edition-story-item">
      <a
        className={`top-story-card edition-story-card ${todayCard ? 'is-today-card' : ''} ${imageUrl ? 'has-image' : 'no-image'}`}
        href={storyArchiveHref(story, editionDate, currentDate)}
        aria-label={`Read ${title}`}
      >
        <div
          className={`top-story-card-image ${imageUrl ? '' : 'is-placeholder'} ${imageCrop.preserveFullImage ? 'preserve-full-image' : ''}`}
          style={imageUrl ? { '--story-focus': imageCrop.position } : undefined}
        >
          {imageUrl ? (
            <img
              className="top-story-card-image-primary"
              src={imageUrl}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                event.currentTarget.parentElement?.classList.add('is-placeholder');
              }}
            />
          ) : null}
          {imageUrl && todayCard ? (
            <div className="story-image-title">
              <div className="story-card-labels">
                {trackedCoverage ? (
                  <span className="story-tracked-label story-continuity-label">{trackedCoverage.name}</span>
                ) : (
                  <span className="edition-story-category story-desk-label">{category}</span>
                )}
              </div>
              <h3>{title}</h3>
            </div>
          ) : null}
          {imageUrl && !todayCard ? <div className="story-image-title"><h3>{title}</h3></div> : null}
          {imageUrl && !todayCard && sourceEntries.length ? (
            <div className="image-source-logos" aria-label={`Sources include ${sourceEntries.map((entry) => entry.name).join(', ')}`}>
              <div className="top-story-source-logos">
                {visibleSourceEntries.map((entry) => (
                  <span className="top-story-source-logo" title={entry.name} key={entry.name}>
                    <img
                      src={sourceLogoUrl(entry.name)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = '/assets/logos/news_placeholder.png';
                      }}
                    />
                  </span>
                ))}
                {hiddenSourceCount ? <span className="top-story-source-more" title={`${hiddenSourceCount} more sources`}>+{hiddenSourceCount}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="top-story-card-body">
          {!imageUrl && todayCard ? (
            <div className="edition-story-text-title">
              <div className="story-card-labels">
                {trackedCoverage ? (
                  <span className="story-tracked-label story-continuity-label">{trackedCoverage.name}</span>
                ) : (
                  <span className="edition-story-category story-desk-label">{category}</span>
                )}
              </div>
              <h3 title={title}>{title}</h3>
            </div>
          ) : null}
          {!imageUrl && !todayCard ? <h3 title={title}>{title}</h3> : null}
          {!todayCard ? (
            <div className="top-story-evidence">
              {sourceEntries.length ? (
                <div className="top-story-source-logos" aria-label={`Sources include ${sourceEntries.map((entry) => entry.name).join(', ')}`}>
                  {visibleSourceEntries.map((entry) => (
                    <span className="top-story-source-logo" title={entry.name} key={entry.name}>
                      <img
                        src={sourceLogoUrl(entry.name)}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = '/assets/logos/news_placeholder.png';
                        }}
                      />
                    </span>
                  ))}
                  {hiddenSourceCount ? <span className="top-story-source-more" title={`${hiddenSourceCount} more sources`}>+{hiddenSourceCount}</span> : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="top-story-card-footer edition-story-footer">
            {todayCard && visibleSourceEntries.length ? (
              <span
                className="today-rail-source-stack"
                aria-label={`Sources include ${sourceEntries.map((entry) => entry.name).join(', ')}`}
              >
                <span className="today-rail-source-stack-logos" aria-hidden="true">
                  {visibleSourceEntries.map((entry, index) => (
                    <span
                      className="today-rail-stacked-logo"
                      style={{ zIndex: visibleSourceEntries.length - index }}
                      title={entry.name}
                      key={entry.name}
                    >
                      <img
                        src={sourceLogoUrl(entry.name)}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = '/assets/logos/news_placeholder.png';
                        }}
                      />
                    </span>
                  ))}
                </span>
              </span>
            ) : null}
            {todayCard ? <strong>{sourceCount} sources</strong> : <span>{sourceSummaryText(sourceEntries, sourceCount)}</span>}
            <span aria-hidden="true">→</span>
          </div>
        </div>
      </a>
    </div>
  );
}

function TodayRailStory({ group, variant, storyIndex, generatedAt, editorialRank = 0 }) {
  const story = group?.primary;
  const related = Array.isArray(group?.related) ? group.related : [];
  const groupedStories = [story, ...related].filter(Boolean);
  const title = cleanDisplayTitle(story?.title, story?.sources);
  const sourceEntries = sourceEntriesForStories(groupedStories);
  const visibleSources = sourceEntries.slice(0, SOURCE_LOGO_DISPLAY_LIMIT);
  const sourceCount = sourceEntries.length || Number(story?.source_count || 1);
  const hiddenSourceCount = Math.max(0, sourceCount - visibleSources.length);
  const imageUrl = story?.image?.url || story?.image?.thumbnail_url || '';
  const imageCrop = storyImageCropPresentation(story, ['rail', 'equal', 'small'].includes(variant) ? 'tall' : 'wide');
  const category = normalizedStoryCategory(story);
  const trackedCoverage = trackedCoverageForStories(groupedStories);
  const storyRef = story?.story_id
    ? `sid=${encodeURIComponent(story.story_id)}`
    : `id=${Math.max(0, storyIndex)}`;
  const freshness = formatCardFreshness(generatedAt);

  return (
    <article className={`today-rail-story is-${variant} ${imageUrl ? 'has-image' : 'no-image'}`}>
      <a className="today-rail-story-link" href={`/story.html?${storyRef}`} aria-label={`Read ${title}`}>
        <div className="today-rail-copy">
          <div className="today-rail-eyebrow">
            {variant === 'equal' && editorialRank ? (
              <span className="today-rail-editorial-rank" aria-label={`Editorial rank ${editorialRank}`}>
                {String(editorialRank).padStart(2, '0')}
              </span>
            ) : null}
            {trackedCoverage ? (
              <span className="story-tracked-label story-continuity-label">{trackedCoverage.name}</span>
            ) : (
              <span className="story-desk-label">{category}</span>
            )}
            {variant === 'lead' && freshness ? <time>{freshness}</time> : null}
          </div>
          <h2 title={title}>{title}</h2>
          {variant === 'lead' && story?.summary ? (
            <p className="today-rail-deck">{truncateText(story.summary, 310)}</p>
          ) : null}
          <div className="today-rail-source-line">
            {sourceEntries.length ? (
              <span className="today-rail-source-names">
                {sourceEntries.slice(0, 2).map((entry) => entry.name).join(', ')}
                {sourceEntries.length > 2 ? ` +${sourceEntries.length - 2}` : ''}
              </span>
            ) : null}
            {visibleSources.length ? (
              <span
                className="today-rail-source-stack"
                aria-label={`Sources include ${visibleSources.map((entry) => entry.name).join(', ')}${hiddenSourceCount ? ` and ${hiddenSourceCount} more` : ''}`}
              >
                <span className="today-rail-source-stack-logos" aria-hidden="true">
                  {visibleSources.map((entry, index) => (
                    <span
                      className="today-rail-stacked-logo"
                      style={{ zIndex: visibleSources.length - index }}
                      title={entry.name}
                      key={entry.name}
                    >
                      <img
                        src={sourceLogoUrl(entry.name)}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = '/assets/logos/news_placeholder.png';
                        }}
                      />
                    </span>
                  ))}
                </span>
              </span>
            ) : null}
            <strong>{sourceCount} sources</strong>
          </div>
        </div>

        {imageUrl ? (
          <div
            className={`today-rail-image ${imageCrop.preserveFullImage ? 'preserve-full-image' : ''}`}
            style={{ '--story-focus': imageCrop.position }}
          >
            <img className="today-rail-image-backdrop" src={imageUrl} alt="" aria-hidden="true" loading="lazy" />
            <img
              className="today-rail-image-primary"
              src={imageUrl}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                event.currentTarget.parentElement?.classList.add('is-placeholder');
              }}
            />
          </div>
        ) : null}

        <div className="today-rail-action">
          {visibleSources.length ? (
            <span className="today-rail-source-logos" aria-label={`Sources include ${visibleSources.map((entry) => entry.name).join(', ')}`}>
              {visibleSources.map((entry) => (
                <span className="today-rail-source-logo" title={entry.name} key={entry.name}>
                  <img
                    src={sourceLogoUrl(entry.name)}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/assets/logos/news_placeholder.png';
                    }}
                  />
                </span>
              ))}
            </span>
          ) : null}
          <span className="today-rail-open">Open <span aria-hidden="true">→</span></span>
        </div>
      </a>
    </article>
  );
}

function storyNavigationTopic(story) {
  const explicit = String(story?.topic_label || '').trim();
  if (explicit) return explicit;

  const text = `${story?.title || ''} ${story?.summary || ''}`;
  if (/\b(fifa|world cup)\b/i.test(text)) return 'FIFA World Cup';
  if (/\biran\b/i.test(text) && /\b(war|strike|missile|hormuz|blockade|ceasefire)\b/i.test(text)) return 'Iran War';
  if (/\b(russia|russian|ukraine|ukrainian)\b/i.test(text) && /\b(war|invasion|missile|strike|troops)\b/i.test(text)) return 'Russia-Ukraine War';
  if (/\b(openai|chatgpt)\b/i.test(text)) return 'OpenAI';
  if (/\b(gaza|israel-hamas)\b/i.test(text) && /\b(war|strike|ceasefire|hostage|aid)\b/i.test(text)) return 'Israel-Gaza War';

  const namedStorm = text.match(/\b(?:Typhoon|Hurricane|Cyclone)\s+[A-Z][A-Za-z'-]+/);
  if (namedStorm) return namedStorm[0];

  const eventTitle = String(story?.event_title || '').trim();
  if (eventTitle && eventTitle.length <= 40 && eventTitle.split(/\s+/).length <= 5) return eventTitle;
  return '';
}

function groupNavigationTopic(group) {
  return [group.primary, ...group.related].map(storyNavigationTopic).find(Boolean) || '';
}

function storyCardContext(groupedStories, _relatedCount, timelineCount) {
  const group = { primary: groupedStories[0], related: groupedStories.slice(1) };
  const navigationLabel = groupNavigationTopic(group);
  const contextStory = groupedStories.find((story) => (
    story?.story_context?.available
    || Number(story?.story_context?.development_count || 0) > 1
  ));

  if (!contextStory) {
    return { kind: 'new', label: 'New story', detail: '' };
  }

  const context = contextStory.story_context || {};
  const eventLabel = String(
    context.display_title
    || context.event_title
    || contextStory.event_title
    || navigationLabel
    || 'Earlier coverage'
  ).trim();
  const developmentCount = Math.max(
    Number(context.development_count || 0),
    Number(timelineCount || 0),
  );
  const earlierUpdateCount = Math.max(0, developmentCount - 1);

  return {
    kind: 'update',
    label: `Event update \u00b7 ${eventLabel}`,
    detail: earlierUpdateCount > 0
      ? `${earlierUpdateCount} earlier update${earlierUpdateCount === 1 ? '' : 's'}`
      : 'Previous coverage',
  };
}
function normalizeFocalCoordinate(value, fallback) {
  const numeric = Number.parseFloat(String(value ?? '').replace('%', ''));
  if (!Number.isFinite(numeric)) return fallback;
  const percentage = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
  return Math.min(100, Math.max(0, percentage));
}

function storyImageCropPresentation(story, variant = 'tall') {
  const image = story?.image || {};
  const metadata = image?.metadata && typeof image.metadata === 'object' ? image.metadata : {};
  const focalPoint = image?.focal_point || metadata?.focal_point || metadata?.focal || {};
  const variantX = variant === 'wide' ? image?.focal_wide_x : image?.focal_tall_x;
  const variantY = variant === 'wide' ? image?.focal_wide_y : image?.focal_tall_y;
  const explicitX = variantX ?? focalPoint?.x ?? image?.focal_x ?? metadata?.focal_x;
  const explicitY = variantY ?? focalPoint?.y ?? image?.focal_y ?? metadata?.focal_y;
  const rawConfidence = image?.crop_confidence ?? metadata?.crop_confidence;
  const cropConfidence = rawConfidence == null ? null : normalizeFocalCoordinate(rawConfidence, 0) / 100;
  const cropAllowed = image?.allows_crop !== false;
  const visionMarkedUnsafe = image?.safe_to_crop === false;
  const lowConfidence = cropConfidence != null && cropConfidence < 0.55;
  const preserveFullImage = !cropAllowed || visionMarkedUnsafe || lowConfidence;

  if (!preserveFullImage && (explicitX != null || explicitY != null)) {
    return {
      position: `${normalizeFocalCoordinate(explicitX, 50)}% ${normalizeFocalCoordinate(explicitY, 42)}%`,
      preserveFullImage: false,
    };
  }

  const description = `${image?.title || ''} ${image?.alt || ''} ${story?.title || ''}`;
  let position = '50% 48%';
  if (/\b(portrait|headshot|close-up|person|people|man|men|woman|women|boy|girl|actor|president|minister|senator|player|coach|fans?)\b/i.test(description)) {
    position = '50% 34%';
  } else if (/\b(match|game|football|soccer|basketball|baseball|racing|celebrat|protest|crowd|troops?)\b/i.test(description)) {
    position = '50% 42%';
  }
  return { position, preserveFullImage };
}

function parseNewslettersFromLocalStorage() {
  try {
    const saved = localStorage.getItem(NEWSLETTER_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function saveNewslettersToLocalStorage(newsletters) {
  localStorage.setItem(NEWSLETTER_STORAGE_KEY, JSON.stringify(newsletters));
}

async function fetchJsonFrom(path, label) {
  const res = await fetch(path, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to load ${label} (${res.status})`);

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (_e) {
    throw new Error(`${label} did not return JSON from ${path}`);
  }
}

async function fetchFirstJson(paths, label) {
  const errors = [];
  for (const path of paths) {
    try {
      return await fetchJsonFrom(path, label);
    } catch (e) {
      errors.push(e);
    }
  }
  throw errors[errors.length - 1] || new Error(`Failed to load ${label}`);
}

export default function LegacyHome() {
  const [activeCategory, setActiveCategory] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const requested = (params.get('category') || '').trim();
      const allowed = [...PINNED_CATEGORY_ORDER, ...(ENABLE_EXTRA_SECTIONS ? CUSTOMIZABLE_CATEGORY_ORDER : [])];
      if (allowed.includes(requested)) return requested;
    } catch (_e) {
      // no-op
    }
    return 'top-stories';
  });
  const [theme, setTheme] = useState(() => {
    try {
      const preloadedTheme = document.documentElement.dataset.theme;
      if (preloadedTheme === 'dark' || preloadedTheme === 'light') return preloadedTheme;
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (_e) {
      return 'light';
    }
  });
  const [todayLayout, setTodayLayout] = useState(() => {
    try {
      return localStorage.getItem('muninn-today-layout') === 'cards' ? 'cards' : 'rail';
    } catch (_e) {
      return 'rail';
    }
  });
  const [stories, setStories] = useState([]);
  const [digestGeneratedAt, setDigestGeneratedAt] = useState('');
  const [dailyBriefing, setDailyBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moreNewsOpen, setMoreNewsOpen] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('moreNews') === '1'; } catch (_e) { return false; }
  });
  const [recentNewsDays, setRecentNewsDays] = useState([]);
  const [recentNewsLoaded, setRecentNewsLoaded] = useState(false);
  const [recentNewsLoading, setRecentNewsLoading] = useState(false);
  const [recentNewsError, setRecentNewsError] = useState('');
  const [sectionsModalOpen, setSectionsModalOpen] = useState(false);
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false);
  const [newsletterDraft, setNewsletterDraft] = useState(null);
  const [newsletters, setNewsletters] = useState([]);
  const [summaryByNewsletter, setSummaryByNewsletter] = useState({});
  const [summaryLoadingId, setSummaryLoadingId] = useState(null);
  const [summaryErrorById, setSummaryErrorById] = useState({});
  const [selectedSections, setSelectedSections] = useState([...DEFAULT_CUSTOM_SELECTED]);
  const [draggedSection, setDraggedSection] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loadingNewsletter, setLoadingNewsletter] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [localStories, setLocalStories] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [localError, setLocalError] = useState('');
  const [happyStories, setHappyStories] = useState([]);
  const [loadingHappy, setLoadingHappy] = useState(false);
  const [happyError, setHappyError] = useState('');
  const [aiStories, setAiStories] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [healthStories, setHealthStories] = useState([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [timelinesGeneratedAt, setTimelinesGeneratedAt] = useState('');
  const [loadingTimelines, setLoadingTimelines] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const [timelineQuery, setTimelineQuery] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('search') || ''; } catch (_e) { return ''; }
  });
  const [eventStageFilter, setEventStageFilter] = useState('active');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState(() => {
    try {
      const requested = new URLSearchParams(window.location.search).get('type');
      return ['all', 'developing', 'ongoing'].includes(requested) ? requested : 'all';
    } catch (_e) {
      return 'all';
    }
  });
  const [eventSort, setEventSort] = useState('recent');
  const [eventsView, setEventsView] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('view') === 'browse' ? 'browse' : 'landing'; } catch (_e) { return 'landing'; }
  });
  const [eventsBrowseMode] = useState(() => {
    try {
      const requested = new URLSearchParams(window.location.search).get('type');
      if (requested === 'developing' || requested === 'ongoing') return requested;
      return 'latest';
    } catch (_e) {
      return 'latest';
    }
  });
  const [eventsSearchOpen, setEventsSearchOpen] = useState(() => {
    try { return Boolean(new URLSearchParams(window.location.search).get('search')); } catch (_e) { return false; }
  });
  const [eventsSearchType, setEventsSearchType] = useState('all');
  const [eventsBrowseLimit, setEventsBrowseLimit] = useState(EVENTS_BROWSE_PAGE_SIZE);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const client = useMemo(() => (ENABLE_CLOUD_SETTINGS ? generateClient() : null), []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setClockNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const visibleCategories = useMemo(
    () => [...PINNED_CATEGORY_ORDER, ...(ENABLE_EXTRA_SECTIONS ? selectedSections : [])],
    [selectedSections]
  );
  const addNewsOptions = useMemo(
    () => CUSTOMIZABLE_CATEGORY_ORDER.map((key) => ({ key, label: categoryTitles[key] })),
    []
  );
  const title = categoryTitles[activeCategory] || 'Muninn';
  const showDate = activeCategory === 'top-stories';
  const editionIsToday = useMemo(() => {
    if (!digestGeneratedAt) return true;
    const editionDate = new Date(digestGeneratedAt);
    if (Number.isNaN(editionDate.getTime())) return true;
    return editionDate.toDateString() === new Date().toDateString();
  }, [digestGeneratedAt]);
  const topStoriesHeading = editionIsToday ? 'Today\u2019s Top Stories' : 'Latest Top Stories';
  const editionFreshnessLabel = useMemo(
    () => formatEditionSchedule(digestGeneratedAt, clockNow),
    [digestGeneratedAt, clockNow]
  );
  const headerDate = useMemo(() => new Date(clockNow), [clockNow]);
  const headerDateKey = useMemo(() => toLocalDateKey(headerDate), [headerDate]);
  const dateStr = useMemo(() => (showDate ? formatDate(headerDate) : ''), [showDate, headerDate]);
  const availableLocalStates = useMemo(
    () => US_STATES.filter((state) => SUPPORTED_LOCAL_STATE_CODES.has(state.code)),
    []
  );
  const todayGroups = useMemo(() => groupStoriesForToday(stories), [stories]);
  const primaryTodayGroups = useMemo(
    () => todayGroups.filter(({ primary, related }) => uniqueSourceCount([primary, ...related]) > 1),
    [todayGroups]
  );
  const visibleTodayGroups = useMemo(
    () => primaryTodayGroups.slice(0, 4),
    [primaryTodayGroups]
  );
  const visualCompactStoryIds = useMemo(() => new Set(), []);
  const dailyBriefingText = useMemo(() => {
    const publishedBriefing = String(
      typeof dailyBriefing === 'string' ? dailyBriefing : dailyBriefing?.summary || ''
    ).trim();
    if (publishedBriefing) return publishedBriefing;
    const leadSummary = String(primaryTodayGroups[0]?.primary?.summary || '').trim();
    return leadSummary ? truncateText(leadSummary, 360) : 'The day?s leading stories are gathered below.';
  }, [dailyBriefing, primaryTodayGroups]);
  const dailyBriefingParagraphs = useMemo(
    () => Array.isArray(dailyBriefing?.paragraphs)
      ? dailyBriefing.paragraphs
        .map((paragraph) => ({
          segments: Array.isArray(paragraph?.segments)
            ? paragraph.segments.filter((segment) => String(segment?.text || '').trim())
            : [],
        }))
        .filter((paragraph) => paragraph.segments.length)
        .slice(0, 3)
      : [],
    [dailyBriefing]
  );

  const todayAtGlance = useMemo(
    () => dailyBriefingParagraphs.length
      ? dailyBriefingParagraphs[0]
      : { segments: [{ text: dailyBriefingText }] },
    [dailyBriefingParagraphs, dailyBriefingText]
  );

  const todayAtGlanceParagraphs = useMemo(() => {
    const paragraphs = [];
    let currentSegments = [];

    todayAtGlance.segments.forEach((segment) => {
      currentSegments.push(segment);
      if (briefingSegmentHref(segment)) {
        paragraphs.push(currentSegments);
        currentSegments = [];
      }
    });

    if (currentSegments.length) paragraphs.push(currentSegments);
    return paragraphs;
  }, [todayAtGlance]);

  const moreTodayGroups = useMemo(
    () => [
      ...primaryTodayGroups.slice(4),
      ...todayGroups.filter(({ primary, related }) => uniqueSourceCount([primary, ...related]) <= 1),
    ],
    [primaryTodayGroups, todayGroups]
  );
  const currentDateKey = useMemo(
    () => toUtcDateKey(digestGeneratedAt) || toUtcDateKey(new Date()),
    [digestGeneratedAt]
  );
  const latestByContinuityKey = useMemo(() => {
    const map = new Map();
    const editions = [
      { date: currentDateKey, stories },
      ...recentNewsDays.map((day) => ({ date: day.date, stories: Array.isArray(day.stories) ? day.stories : [] })),
    ].sort((left, right) => String(right.date).localeCompare(String(left.date)));
    editions.forEach((edition) => {
      edition.stories.forEach((story) => {
        storyContinuityKeys(story).forEach((key) => {
          if (!map.has(key)) map.set(key, { story, date: edition.date });
        });
      });
    });
    return map;
  }, [stories, currentDateKey, recentNewsDays]);
  const timelineCurrentDateKey = useMemo(
    () => toUtcDateKey(timelinesGeneratedAt) || toUtcDateKey(new Date()),
    [timelinesGeneratedAt]
  );
  const allCoverageStoryRows = useMemo(() => {
    const seen = new Set();
    const rows = [
      ...stories.map((story) => ({ story, date: currentDateKey })),
      ...recentNewsDays.flatMap((day) => (
        (Array.isArray(day?.stories) ? day.stories : []).map((story) => ({ story, date: day.date }))
      )),
    ];
    return rows.filter(({ story, date }) => {
      const identity = story?.story_id || `${date}:${story?.title || story?.cluster_id || ''}`;
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  }, [stories, currentDateKey, recentNewsDays]);
  const eventStoryById = useMemo(() => {
    const matches = new Map();
    allCoverageStoryRows.forEach(({ story }) => {
      if (!story?.event_id) return;
      const existing = matches.get(story.event_id);
      const hasImage = Boolean(story?.image?.url || story?.image?.thumbnail_url);
      const existingHasImage = Boolean(existing?.image?.url || existing?.image?.thumbnail_url);
      if (!existing || (hasImage && !existingHasImage)) matches.set(story.event_id, story);
    });
    return matches;
  }, [allCoverageStoryRows]);
  const eligibleTimelineEvents = useMemo(
    () => timelineEvents
      .filter((event) => eventTimelineEntries(event).length >= 2)
      .sort((left, right) => {
        const rankDelta = Number(right?.presentation?.rank_score || 0) - Number(left?.presentation?.rank_score || 0);
        if (rankDelta) return rankDelta;
        return String(right?.last_seen_at || '').localeCompare(String(left?.last_seen_at || ''));
      }),
    [timelineEvents]
  );
  const publicTimelineEvents = useMemo(() => {
    const seen = new Set();
    return eligibleTimelineEvents.filter((event) => {
      const identity = eventCoverageIdentity(event);
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  }, [eligibleTimelineEvents]);
  const eventStatusCounts = useMemo(
    () => publicTimelineEvents.reduce((counts, event) => {
      const status = eventActivityStatus(event, timelineCurrentDateKey);
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, { active: 0, ongoing: 0, archive: 0 }),
    [publicTimelineEvents, timelineCurrentDateKey]
  );
  const eventCoverageSummary = useMemo(
    () => publicTimelineEvents.reduce((summary, event) => {
      const type = eventCoverageType(event);
      summary.developmentCount += eventTimelineEntries(event).length;
      summary.updatedToday += eventLatestDateKey(event) === timelineCurrentDateKey ? 1 : 0;
      if (type === 'Ongoing Story') summary.ongoing += 1;
      else summary.developing += 1;
      return summary;
    }, { developing: 0, ongoing: 0, developmentCount: 0, updatedToday: 0 }),
    [publicTimelineEvents, timelineCurrentDateKey]
  );
  const latestTimelineEvents = useMemo(
    () => [...publicTimelineEvents]
      .sort((left, right) => (
        String(eventLatestDateKey(right)).localeCompare(String(eventLatestDateKey(left)))
        || Number(right?.presentation?.rank_score || 0) - Number(left?.presentation?.rank_score || 0)
      ))
      .slice(0, LATEST_EVENTS_RAIL_LIMIT),
    [publicTimelineEvents]
  );
  const storylineTimelineEvents = useMemo(
    () => publicTimelineEvents
      .filter((event) => eventCoverageType(event) === 'Ongoing Story')
      .sort((left, right) => (
        storylineSectionScore(right, timelineCurrentDateKey) - storylineSectionScore(left, timelineCurrentDateKey)
        || String(eventLatestDateKey(right)).localeCompare(String(eventLatestDateKey(left)))
      ))
      .slice(0, EVENTS_RAIL_LIMIT),
    [publicTimelineEvents, timelineCurrentDateKey]
  );
  const rankedDevelopingTimelineEvents = useMemo(
    () => {
      const latestIds = new Set(latestTimelineEvents.map((event) => event.event_id));
      return publicTimelineEvents
      .filter((event) => eventCoverageType(event) === 'Developing Event')
      .filter((event) => !latestIds.has(event.event_id))
      .sort((left, right) => (
        developingEventSectionScore(right, timelineCurrentDateKey) - developingEventSectionScore(left, timelineCurrentDateKey)
        || String(eventLatestDateKey(right)).localeCompare(String(eventLatestDateKey(left)))
      ))
      .slice(0, EVENTS_RAIL_LIMIT);
    },
    [publicTimelineEvents, latestTimelineEvents, timelineCurrentDateKey]
  );
  const newestTimelineEvents = useMemo(() => {
    const currentDate = new Date(`${timelineCurrentDateKey}T12:00:00Z`);
    return publicTimelineEvents
      .filter((event) => eventCoverageType(event) === 'Developing Event')
      .filter((event) => {
        const firstKey = eventFirstDateKey(event);
        if (!firstKey || Number.isNaN(currentDate.getTime())) return false;
        const firstDate = new Date(`${firstKey}T12:00:00Z`);
        const age = Math.round((currentDate - firstDate) / (24 * 60 * 60 * 1000));
        return age >= 0 && age <= 7;
      })
      .sort((left, right) => (
        String(eventFirstDateKey(right)).localeCompare(String(eventFirstDateKey(left)))
        || Number(right?.presentation?.rank_score || 0) - Number(left?.presentation?.rank_score || 0)
      ))
      .slice(0, 6);
  }, [publicTimelineEvents, timelineCurrentDateKey]);
  const eventCategoryCounts = useMemo(
    () => publicTimelineEvents.reduce((counts, event) => {
      const category = eventBrowseCategoryKey(eventDisplayCategory(event, eventStoryById.get(event.event_id)));
      counts[category] = (counts[category] || 0) + 1;
      counts.all += 1;
      return counts;
    }, { all: 0 }),
    [publicTimelineEvents, eventStoryById]
  );
  const filteredTimelineEvents = useMemo(() => {
    const query = timelineQuery.trim().toLowerCase();
    return publicTimelineEvents
      .filter((event) => (
        eventCategoryFilter === 'all'
        || eventBrowseCategoryKey(eventDisplayCategory(event, eventStoryById.get(event.event_id))) === eventCategoryFilter
      ))
      .filter((event) => (
        eventTypeFilter === 'all'
        || (eventTypeFilter === 'ongoing' && eventCoverageType(event) === 'Ongoing Story')
        || (eventTypeFilter === 'developing' && eventCoverageType(event) === 'Developing Event')
      ))
      .filter((event) => !query || coverageTextMatchesQuery([
        eventDisplayTitle(event),
        eventCoverageType(event),
        eventDisplayCategory(event, eventStoryById.get(event.event_id)),
        event?.title,
        event?.canonical_title,
        event?.latest_title,
        event?.search_text,
        ...(Array.isArray(event?.entities) ? event.entities : []),
      ].filter(Boolean).join(' '), query))
      .sort((left, right) => {
        if (eventSort === 'developments') {
          const developmentDelta = eventTimelineEntries(right).length - eventTimelineEntries(left).length;
          if (developmentDelta) return developmentDelta;
        }
        if (eventSort === 'newest') {
          const startedDelta = String(eventFirstDateKey(right)).localeCompare(String(eventFirstDateKey(left)));
          if (startedDelta) return startedDelta;
        }
        return (
          String(eventLatestDateKey(right)).localeCompare(String(eventLatestDateKey(left)))
          || Number(right?.presentation?.rank_score || 0) - Number(left?.presentation?.rank_score || 0)
        );
      });
  }, [
    publicTimelineEvents,
    eventStoryById,
    eventCategoryFilter,
    eventTypeFilter,
    eventSort,
    timelineQuery,
  ]);
  const coverageSearchCounts = useMemo(() => ({
    all: allCoverageStoryRows.length + publicTimelineEvents.length,
    stories: allCoverageStoryRows.length,
    developing: publicTimelineEvents.filter((event) => eventCoverageType(event) === 'Developing Event').length,
    ongoing: publicTimelineEvents.filter((event) => eventCoverageType(event) === 'Ongoing Story').length,
  }), [allCoverageStoryRows, publicTimelineEvents]);
  const coverageSearchResults = useMemo(() => {
    const query = timelineQuery.trim().toLowerCase();
    if (!query) return [];
    const results = [];
    if (eventsSearchType === 'all' || eventsSearchType === 'stories') {
      allCoverageStoryRows.forEach(({ story, date }) => {
        const searchable = [
          story?.title,
          story?.summary,
          story?.topic_label,
          story?.event_title,
          story?.category,
          normalizedStoryCategory(story),
          ...(Array.isArray(story?.entities) ? story.entities : []),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!coverageTextMatchesQuery(searchable, query)) return;
        results.push({
          key: `story:${story?.story_id || story?.cluster_id || `${date}:${story?.title}`}`,
          href: storyArchiveHref(story, date, currentDateKey),
          type: 'Story',
          title: story?.title || 'Untitled Story',
          meta: `${formatStoredDate(date)} · ${Number(story?.source_count || uniqueSourceCount([story]) || 0)} sources`,
        });
      });
    }
    publicTimelineEvents.forEach((event) => {
      const type = eventCoverageType(event);
      const typeKey = type === 'Ongoing Story' ? 'ongoing' : 'developing';
      if (eventsSearchType !== 'all' && eventsSearchType !== typeKey) return;
      const entries = eventTimelineEntries(event);
      const searchable = [
        eventDisplayTitle(event),
        type,
        event?.title,
        event?.canonical_title,
        event?.latest_title,
        event?.summary,
        event?.search_text,
        eventDisplayCategory(event, eventStoryById.get(event.event_id)),
        ...entries.map((entry) => entry?.title),
        ...(Array.isArray(event?.entities) ? event.entities : []),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!coverageTextMatchesQuery(searchable, query)) return;
      const sourceCount = Number(event?.presentation?.independent_source_count || event?.presentation?.source_count || 0);
      results.push({
        key: `coverage:${event.event_id}`,
        href: `/timeline.html?event=${encodeURIComponent(event.event_id)}`,
        type,
        title: eventDisplayTitle(event),
        meta: `${formatStoredDate(eventLatestDateKey(event))}${sourceCount ? ` · ${sourceCount} sources` : ''}`,
      });
    });
    return results.slice(0, 12);
  }, [timelineQuery, eventsSearchType, allCoverageStoryRows, publicTimelineEvents, currentDateKey, eventStoryById]);
  const eventTopics = useMemo(() => {
    const topics = new Map();
    const categoryTopics = {
      'Technology & AI': 'AI',
      Health: 'Health',
      'Science & Environment': 'Science',
      Politics: 'Politics',
      'Business & Economy': 'Business',
      Sports: 'Sports',
      Culture: 'Culture',
      'Public Safety': 'Public Safety',
      World: 'World',
    };
    const addTopic = (label, weight) => {
      const clean = String(label || '').trim().replace(/\s+/g, ' ');
      const key = clean.toLowerCase();
      if (!clean || clean.length > 34) return;
      const current = topics.get(key) || { label: clean, score: 0, mentions: 0 };
      current.score += weight;
      current.mentions += 1;
      topics.set(key, current);
    };
    allCoverageStoryRows.forEach(({ story, date }) => {
      const weight = date === currentDateKey ? 3 : 1;
      const category = normalizedStoryCategory(story);
      addTopic(categoryTopics[category], weight);
    });
    return [...topics.values()]
      .sort((left, right) => right.score - left.score || right.mentions - left.mentions || left.label.localeCompare(right.label))
      .slice(0, 8);
  }, [allCoverageStoryRows, currentDateKey]);
  const showDedicatedOngoingSection = storylineTimelineEvents.length >= 3;
  const exploreOngoingStories = useMemo(
    () => (showDedicatedOngoingSection ? [] : storylineTimelineEvents.slice(0, 2)),
    [showDedicatedOngoingSection, storylineTimelineEvents]
  );
  const exploreTopics = useMemo(() => {
    const ongoingLabels = new Set(
      exploreOngoingStories.map((event) => eventDisplayTitle(event).toLowerCase())
    );
    const availableSlots = Math.max(0, 10 - exploreOngoingStories.length);
    return eventTopics
      .filter((topic) => !ongoingLabels.has(topic.label.toLowerCase()))
      .slice(0, availableSlots);
  }, [eventTopics, exploreOngoingStories]);
  const latestBrowseGroups = useMemo(() => {
    const groups = new Map();
    filteredTimelineEvents.slice(0, eventsBrowseLimit).forEach((event) => {
      const label = eventUpdateGroupLabel(event, timelineCurrentDateKey);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(event);
    });
    return [...groups.entries()].map(([label, items]) => ({ label, items }));
  }, [filteredTimelineEvents, eventsBrowseLimit, timelineCurrentDateKey]);
  const eventsBrowseTitle = eventsBrowseMode === 'developing'
    ? 'Developing events'
    : eventsBrowseMode === 'ongoing'
      ? 'Ongoing stories'
      : 'Latest updates';
  const featuredTimelineEvents = useMemo(
    () => latestTimelineEvents,
    [latestTimelineEvents]
  );
  const directoryTimelineEvents = useMemo(
    () => filteredTimelineEvents,
    [filteredTimelineEvents]
  );
  const weeklyRoundup = useMemo(
    () => buildWeeklyRoundup(timelineEvents, timelinesGeneratedAt),
    [timelineEvents, timelinesGeneratedAt]
  );

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (activeCategory === 'top-stories') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', activeCategory);
      }
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, '', next);
    } catch (_e) {
      // no-op
    }
  }, [activeCategory]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', theme === 'dark' ? '#11191e' : '#f3f5f4'
    );
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_e) {
      // no-op
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('muninn-today-layout', todayLayout);
    } catch (_e) {
      // no-op
    }
  }, [todayLayout]);

  useEffect(() => {
    (async () => {
      if (!ENABLE_CLOUD_SETTINGS) {
        const savedState = localStorage.getItem(STATE_STORAGE_KEY);
        if (savedState && SUPPORTED_LOCAL_STATE_CODES.has(savedState)) {
          setSelectedState(savedState);
        } else {
          localStorage.removeItem(STATE_STORAGE_KEY);
        }

        if (ENABLE_EXTRA_SECTIONS) {
          const localSections = parseSectionsFromLocalStorage();
          if (localSections !== null) setSelectedSections(localSections);
        }

        if (ENABLE_NEWSLETTERS) {
          setNewsletters(parseNewslettersFromLocalStorage());
        }
        return;
      }

      try {
        const user = await getCurrentUser();
        setUserId(user.userId);

        const response = await client.graphql({
          query: getUserState,
          variables: { id: user.userId },
        });

        const backendState = response.data.getUserState;
        if (backendState?.selectedState && SUPPORTED_LOCAL_STATE_CODES.has(backendState.selectedState)) {
          setSelectedState(backendState.selectedState);
          localStorage.setItem(STATE_STORAGE_KEY, backendState.selectedState);
        } else {
          const savedState = localStorage.getItem(STATE_STORAGE_KEY);
          if (savedState && SUPPORTED_LOCAL_STATE_CODES.has(savedState)) {
            setSelectedState(savedState);
          } else {
            localStorage.removeItem(STATE_STORAGE_KEY);
          }
        }

        if (ENABLE_EXTRA_SECTIONS) {
          const backendSections = parseSectionsFromNoteText(backendState?.noteText);
          if (backendSections !== null) {
            setSelectedSections(backendSections);
            localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(backendSections));
          } else {
            const localSections = parseSectionsFromLocalStorage();
            if (localSections !== null) setSelectedSections(localSections);
          }
        }

        const backendNewsletters = parseNewslettersFromNoteText(backendState?.noteText);
        if (backendNewsletters.length) {
          setNewsletters(backendNewsletters);
        }
      } catch (e) {
        console.error('Error loading user state:', e);
        const savedState = localStorage.getItem(STATE_STORAGE_KEY);
        if (savedState && SUPPORTED_LOCAL_STATE_CODES.has(savedState)) {
          setSelectedState(savedState);
        } else {
          localStorage.removeItem(STATE_STORAGE_KEY);
        }
        if (ENABLE_EXTRA_SECTIONS) {
          const localSections = parseSectionsFromLocalStorage();
          if (localSections !== null) setSelectedSections(localSections);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (activeCategory !== 'top-stories' && activeCategory !== 'timelines') return;

    (async () => {
      try {
        setError('');
        setLoading(true);

        const data = await fetchFirstJson(
          ['/Current_news/digest.json', '/current_news/digest.json'],
          'digest.json'
        );

        const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
        setStories(clusters.slice(0, 20));
        setDigestGeneratedAt(data?.generated_at || '');
        const structuredBriefing = data?.briefing && typeof data.briefing === 'object' ? data.briefing : null;
        const publishedBriefing = typeof data?.daily_briefing === 'string' ? data.daily_briefing.trim() : '';
        setDailyBriefing(structuredBriefing || publishedBriefing || null);
      } catch (e) {
        setError(e?.message || String(e));
        setStories([]);
        setDailyBriefing(null);
        setDigestGeneratedAt('');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== 'top-stories') return undefined;

    const refreshDigest = async () => {
      try {
        const data = await fetchFirstJson(
          ['/Current_news/digest.json', '/current_news/digest.json'],
          'digest.json'
        );
        if (!data?.generated_at || data.generated_at === digestGeneratedAt) return;
        const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
        const structuredBriefing = data?.briefing && typeof data.briefing === 'object' ? data.briefing : null;
        const publishedBriefing = typeof data?.daily_briefing === 'string' ? data.daily_briefing.trim() : '';
        setStories(clusters.slice(0, 20));
        setDigestGeneratedAt(data.generated_at);
        setDailyBriefing(structuredBriefing || publishedBriefing || null);
      } catch (_error) {
        // Keep the current edition visible; the normal load path handles surfaced errors.
      }
    };

    const intervalId = window.setInterval(refreshDigest, 10 * 60 * 1000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshDigest();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [activeCategory, digestGeneratedAt]);

  useEffect(() => {
    const needsRecentCoverage = moreNewsOpen || activeCategory === 'timelines';
    if (!needsRecentCoverage || recentNewsLoaded || recentNewsLoading) return;
    (async () => {
      try {
        setRecentNewsError('');
        setRecentNewsLoading(true);
        const data = await fetchFirstJson(
          ['/Current_news/recent_news.json', '/current_news/recent_news.json'],
          'recent_news.json'
        );
        setRecentNewsDays(Array.isArray(data?.days) ? data.days : []);
      } catch (e) {
        setRecentNewsError(e?.message || String(e));
        setRecentNewsDays([]);
      } finally {
        setRecentNewsLoaded(true);
        setRecentNewsLoading(false);
      }
    })();
  }, [activeCategory, moreNewsOpen, recentNewsLoaded, recentNewsLoading]);

  useEffect(() => {
    if (activeCategory !== 'timelines' && activeCategory !== 'your-newsletter') return;

    (async () => {
      try {
        setTimelineError('');
        setLoadingTimelines(true);

        const data = await fetchFirstJson(
          ['/Current_news/event_timelines.json', '/current_news/event_timelines.json'],
          'event_timelines.json'
        );

        const events = Array.isArray(data?.events) ? data.events : [];
        setTimelineEvents(events);
        setTimelinesGeneratedAt(data?.generated_at || '');
      } catch (e) {
        setTimelineError(e?.message || String(e));
        setTimelineEvents([]);
        setTimelinesGeneratedAt('');
      } finally {
        setLoadingTimelines(false);
      }
    })();
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== 'your-newsletter') return;
    if (!ENABLE_NEWSLETTERS || !ENABLE_CLOUD_SETTINGS) return;

    (async () => {
      try {
        setLoadingNewsletter(true);
        const id = userId || (await getCurrentUser()).userId;
        if (!userId) setUserId(id);

        const response = await client.graphql({
          query: getUserState,
          variables: { id },
        });

        if (response.data.getUserState) {
          const backendNewsletters = parseNewslettersFromNoteText(response.data.getUserState.noteText);
          setNewsletters(backendNewsletters);
        }
      } catch (e) {
        console.error('Error loading newsletter preferences:', e);
      } finally {
        setLoadingNewsletter(false);
      }
    })();
  }, [activeCategory, userId]);

  useEffect(() => {
    if (activeCategory !== 'local' || !selectedState) return;
    if (!SUPPORTED_LOCAL_STATE_CODES.has(selectedState)) {
      setLocalStories([]);
      setLocalError('');
      return;
    }

    (async () => {
      try {
        setLocalError('');
        setLoadingLocal(true);

        const data = await fetchFirstJson(
          [`/Local_news/${selectedState}-news.json`, `/local_news/${selectedState}-news.json`],
          `${selectedState}-news.json`
        ).catch(() => null);
        if (!data) {
          setLocalError('load-failed');
          setLocalStories([]);
          return;
        }

        const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
        setLocalStories(clusters);
      } catch (_e) {
        setLocalError('load-failed');
        setLocalStories([]);
      } finally {
        setLoadingLocal(false);
      }
    })();
  }, [activeCategory, selectedState]);

  useEffect(() => {
    if (activeCategory !== 'happy') return;

    (async () => {
      try {
        setHappyError('');
        setLoadingHappy(true);

        const data = await fetchFirstJson(
          ['/Current_news/happy_digest.json', '/current_news/happy_digest.json'],
          'happy_digest.json'
        );
        const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
        setHappyStories(clusters.slice(0, 20));
      } catch (e) {
        setHappyError(e?.message || String(e));
        setHappyStories([]);
      } finally {
        setLoadingHappy(false);
      }
    })();
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== 'technology') return;

    (async () => {
      try {
        setAiError('');
        setLoadingAi(true);

        const data = await fetchFirstJson(
          ['/Current_news/ai_digest.json', '/current_news/ai_digest.json'],
          'ai_digest.json'
        );
        const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
        setAiStories(clusters.slice(0, 20));
      } catch (e) {
        setAiError(e?.message || String(e));
        setAiStories([]);
      } finally {
        setLoadingAi(false);
      }
    })();
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== 'health') return;

    (async () => {
      try {
        setHealthError('');
        setLoadingHealth(true);

        const data = await fetchFirstJson(
          ['/Current_news/health_digest.json', '/current_news/health_digest.json'],
          'health_digest.json'
        );
        const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
        setHealthStories(clusters.slice(0, 20));
      } catch (e) {
        setHealthError(e?.message || String(e));
        setHealthStories([]);
      } finally {
        setLoadingHealth(false);
      }
    })();
  }, [activeCategory]);

  useEffect(() => {
    if (PINNED_CATEGORY_ORDER.includes(activeCategory)) return;
    if (ENABLE_EXTRA_SECTIONS && selectedSections.includes(activeCategory)) return;

    try {
      const params = new URLSearchParams(window.location.search);
      const requested = (params.get('category') || '').trim();
      const isCustomCategory = CUSTOMIZABLE_CATEGORY_ORDER.includes(activeCategory);
      if (requested === activeCategory && isCustomCategory) {
        setSelectedSections((prev) => {
          if (prev.includes(activeCategory)) return prev;
          const next = sanitizeSelectedSections([...prev, activeCategory]);
          localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
        return;
      }
    } catch (_e) {
      // no-op
    }

    setActiveCategory('top-stories');
  }, [activeCategory, selectedSections]);

  async function ensureUserId() {
    if (!ENABLE_CLOUD_SETTINGS) return 'local-user';
    if (userId) return userId;
    const user = await getCurrentUser();
    setUserId(user.userId);
    return user.userId;
  }

  async function saveNewslettersToBackend(nextNewsletters) {
    if (!ENABLE_CLOUD_SETTINGS) {
      saveNewslettersToLocalStorage(nextNewsletters);
      return;
    }

    try {
      const id = await ensureUserId();
      const existing = await client.graphql({
        query: getUserState,
        variables: { id },
      });

      const existingState = existing.data.getUserState;
      const noteText = upsertNewslettersInNoteText(existingState?.noteText, nextNewsletters);

      if (!existingState) {
        await client.graphql({
          query: createUserState,
          variables: {
            input: {
              id,
              selectedState: selectedState || null,
              noteText,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      } else {
        await client.graphql({
          query: updateUserState,
          variables: {
            input: {
              id,
              noteText,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      }
    } catch (e) {
      console.error('Error saving newsletter preferences:', e);
      alert('Failed to save newsletter preferences. Please try again.');
    }
  }

  async function handleSaveNewsletter(payload, generateNow) {
    const next = [...newsletters];
    const existingIndex = next.findIndex((item) => item.id === payload.id);
    if (existingIndex >= 0) {
      next[existingIndex] = payload;
    } else {
      next.push(payload);
    }

    setNewsletters(next);
    await saveNewslettersToBackend(next);
    setNewsletterModalOpen(false);
    setNewsletterDraft(null);

    if (generateNow) {
      await triggerGenerateNow(payload.id);
    }
  }

  async function handleDeleteNewsletter(id) {
    const next = newsletters.filter((entry) => entry.id !== id);
    setNewsletters(next);
    await saveNewslettersToBackend(next);
  }

  async function fetchSummaryFromUrl(url, newsletterId) {
    if (!url) return null;
    setSummaryLoadingId(newsletterId);
    setSummaryErrorById((prev) => ({ ...prev, [newsletterId]: null }));

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to fetch output (${res.status})`);
      }
      const data = await res.json();
      const summaryText = data?.summary || data?.newsletter?.summary || '';
      if (!summaryText) {
        throw new Error('Summary not found in output.');
      }
      setSummaryByNewsletter((prev) => ({ ...prev, [newsletterId]: summaryText }));
      return summaryText;
    } catch (e) {
      console.error('Failed to load summary:', e);
      setSummaryErrorById((prev) => ({ ...prev, [newsletterId]: e?.message || 'Failed to load summary.' }));
      return null;
    } finally {
      setSummaryLoadingId((prev) => (prev === newsletterId ? null : prev));
    }
  }

  async function triggerGenerateNow(newsletterId) {
    try {
      if (!ENABLE_NEWSLETTER_GENERATION) {
        alert('Newsletter generation is disabled for the public site build.');
        return;
      }
      if (!GENERATE_URL) {
        alert('Generate URL not configured. Set VITE_NEWSLETTER_GENERATE_URL.');
        return;
      }
      const id = await ensureUserId();
      const selectedNewsletter = newsletters.find((entry) => entry.id === newsletterId);
      const topics = selectedNewsletter?.topics || [];
      const topicDepths = selectedNewsletter?.topicDepths || {};
      const localStateCode = selectedNewsletter?.location?.state || selectedState || '';
      const localStateName = resolveStateName(localStateCode);
      const localSectionLabel = buildNewsletterSectionLabel('local', localStateCode);
      const sectionLabels = topics
        .map((topic) => buildNewsletterSectionLabel(topic, localStateCode))
        .filter(Boolean);
      const sectionDepths = {};
      topics.forEach((topic) => {
        const label = buildNewsletterSectionLabel(topic, localStateCode);
        if (!label) return;
        const rawDepth = Number(topicDepths?.[topic]);
        sectionDepths[label] = Number.isFinite(rawDepth) ? rawDepth : 2;
      });
      const overallDepthValues = Object.values(sectionDepths);
      const overallDepth = overallDepthValues.length
        ? Math.max(...overallDepthValues.map((value) => (Number.isFinite(value) ? value : 2)))
        : 2;
      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: id,
          newsletterId,
          tone: selectedNewsletter?.tone || 'neutral',
          sections: sectionLabels,
          sectionDepths,
          overallDepth,
          topics,
          topicDepths,
          keywords: selectedNewsletter?.keywords || {},
          personName: selectedNewsletter?.personName || '',
          newsletterName: selectedNewsletter?.newsletterName || '',
          location: {
            ...(selectedNewsletter?.location || {}),
            state: localStateCode,
            stateName: localStateName,
          },
          selectedState: localStateCode,
          state: localStateCode,
          stateCode: localStateCode,
          stateName: localStateName,
          localState: localStateCode,
          localStateName,
          selectedLocalState: localStateCode,
          localSectionLabel,
          lookbackDays: selectedNewsletter?.schedule?.lookbackDays || 7,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      let bodyJson = data?.body;
      if (typeof bodyJson === 'string') {
        try {
          bodyJson = JSON.parse(bodyJson);
        } catch (_e) {
          bodyJson = null;
        }
      }
      const key = data?.key || bodyJson?.key || data?.body?.key || data?.keyPath;
      const bucket = data?.bucket || bodyJson?.bucket || data?.body?.bucket;
      const urlFromResponse = data?.url || bodyJson?.url || data?.body?.url;
      const summaryFromResponse = data?.summary || bodyJson?.summary || data?.body?.summary;
      const url = urlFromResponse || (key && bucket ? `https://${bucket}.s3.amazonaws.com/${key}` : '');
      const nowIso = new Date().toISOString();

      if (key) {
        setNewsletters((prev) => prev.map((entry) => {
          if (entry.id !== newsletterId) return entry;
          return {
            ...entry,
            lastGeneratedAt: nowIso,
            lastGeneratedKey: key,
            lastGeneratedUrl: url,
          };
        }));
        await saveNewslettersToBackend(
          newsletters.map((entry) => {
            if (entry.id !== newsletterId) return entry;
            return {
              ...entry,
              lastGeneratedAt: nowIso,
              lastGeneratedKey: key,
              lastGeneratedUrl: url,
            };
          })
        );
      }

      if (summaryFromResponse) {
        setSummaryByNewsletter((prev) => ({ ...prev, [newsletterId]: summaryFromResponse }));
      } else if (url) {
        await fetchSummaryFromUrl(url, newsletterId);
      }

      alert(key ? `Generated: ${key}` : 'Generation complete.');
    } catch (e) {
      console.error('Generate now failed:', e);
      alert('Failed to generate newsletter. Check Lambda logs.');
    }
  }

  async function handleGenerateNow(id) {
    const next = newsletters.map((entry) => {
      if (entry.id !== id) return entry;
      return { ...entry, lastGeneratedAt: new Date().toISOString() };
    });
    setNewsletters(next);
    await saveNewslettersToBackend(next);
    await triggerGenerateNow(id);
  }

  async function saveSectionsToBackend(nextSections) {
    if (!ENABLE_CLOUD_SETTINGS) return;

    try {
      const id = await ensureUserId();
      const existing = await client.graphql({
        query: getUserState,
        variables: { id },
      });

      const existingState = existing.data.getUserState;
      const noteText = upsertSectionsInNoteText(existingState?.noteText, nextSections);

      if (!existingState) {
        await client.graphql({
          query: createUserState,
          variables: {
            input: {
              id,
              selectedState: selectedState || null,
              noteText,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      } else {
        await client.graphql({
          query: updateUserState,
          variables: {
            input: {
              id,
              noteText,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      }
    } catch (e) {
      console.error('Error saving section preferences:', e);
    }
  }

  async function handleSaveSections(nextSections) {
    const sanitized = sanitizeSelectedSections(nextSections);
    setSelectedSections(sanitized);
    localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(sanitized));
    setSectionsModalOpen(false);
    await saveSectionsToBackend(sanitized);
  }

  async function reorderSectionTabs(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    if (!selectedSections.includes(sourceKey) || !selectedSections.includes(targetKey)) return;

    const next = [...selectedSections];
    const fromIndex = next.indexOf(sourceKey);
    const toIndex = next.indexOf(targetKey);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    setSelectedSections(next);
    localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next));
    await saveSectionsToBackend(next);
  }

  async function handleStateSelection(stateCode) {
    if (!SUPPORTED_LOCAL_STATE_CODES.has(stateCode)) return;
    setSelectedState(stateCode);
    localStorage.setItem(STATE_STORAGE_KEY, stateCode);

    if (ENABLE_CLOUD_SETTINGS) {
      try {
        const id = await ensureUserId();
        await saveStateToBackend(id, stateCode);
      } catch (e) {
        console.error('Error saving state selection:', e);
      }
    }
  }

  async function saveStateToBackend(id, stateCode) {
    if (!ENABLE_CLOUD_SETTINGS) return;

    try {
      const existing = await client.graphql({
        query: getUserState,
        variables: { id },
      });

      const existingData = existing.data.getUserState;
      const noteText = upsertSectionsInNoteText(existingData?.noteText, selectedSections);

      if (!existingData) {
        await client.graphql({
          query: createUserState,
          variables: {
            input: {
              id,
              selectedState: stateCode,
              noteText,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      } else {
        await client.graphql({
          query: updateUserState,
          variables: {
            input: {
              id,
              selectedState: stateCode,
              newsletterComment: existingData.newsletterComment,
              checkbox1: existingData.checkbox1,
              checkbox2: existingData.checkbox2,
              checkbox3: existingData.checkbox3,
              noteText,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      }
    } catch (e) {
      console.error('Error saving state to backend:', e);
    }
  }

  async function handleChangeState() {
    setSelectedState(null);
    localStorage.removeItem(STATE_STORAGE_KEY);
    setLocalStories([]);
    setLocalError('');

    if (!ENABLE_CLOUD_SETTINGS || !userId) return;

    try {
      const existing = await client.graphql({
        query: getUserState,
        variables: { id: userId },
      });

      if (existing.data.getUserState) {
        const backendState = existing.data.getUserState;
        const noteText = upsertSectionsInNoteText(backendState.noteText, selectedSections);
        await client.graphql({
          query: updateUserState,
          variables: {
            input: {
              id: userId,
              selectedState: null,
              newsletterComment: backendState.newsletterComment,
              checkbox1: backendState.checkbox1,
              checkbox2: backendState.checkbox2,
              checkbox3: backendState.checkbox3,
              noteText,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      }
    } catch (e) {
      console.error('Error removing state from backend:', e);
    }
  }

  function renderPlaceholderSection(sectionKey) {
    if (!selectedSections.includes(sectionKey) || activeCategory !== sectionKey) return null;

    return (
      <div id={sectionKey} className="category-content active">
        <div className="news-item">
          <h3>{categoryTitles[sectionKey]}</h3>
          <p>{placeholderCopy[sectionKey] || 'No stories available yet.'}</p>
          <p>Check back later for updates.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="wrapper" className="muninn-app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <a href="/" className="brand-lockup" onClick={(e) => { e.preventDefault(); setActiveCategory('top-stories'); }}>
            <span className="brand-mark" aria-hidden="true">
              <img className="brand-logo" src="/brand/muninn-mark.svg" alt="" />
            </span>
            <span>
              <strong>Muninn</strong>
              <small>News, Simplified.</small>
            </span>
          </a>

          <nav className="primary-navigation" aria-label="Primary navigation">
            <ul className="news-tabs-scroll">
            {PINNED_CATEGORY_ORDER.map((key) => {
              const isCustomSection = selectedSections.includes(key);
              return (
                <li
                  key={key}
                  className={activeCategory === key ? 'active' : ''}
                  style={{
                    flex: '0 0 auto',
                    cursor: isCustomSection ? 'grab' : 'default',
                    opacity: draggedSection === key ? 0.6 : 1,
                  }}
                  draggable={isCustomSection}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', key);
                    setDraggedSection(key);
                  }}
                  onDragEnd={() => setDraggedSection(null)}
                  onDragOver={(e) => {
                    if (!isCustomSection || !draggedSection) return;
                    e.preventDefault();
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    if (!isCustomSection) return;
                    await reorderSectionTabs(draggedSection, key);
                    setDraggedSection(null);
                  }}
                >
                  <a
                    href={key === 'top-stories' ? '/' : `/?category=${encodeURIComponent(key)}`}
                    data-category={key}
                    onClick={(e) => { e.preventDefault(); setActiveCategory(key); }}
                  >
                    {categoryTitles[key]}
                  </a>
                </li>
              );
            })}
            </ul>
          </nav>

          <div className="header-actions">
            {activeCategory === 'top-stories' ? (
              <div className="today-layout-switch is-header-control" role="group" aria-label="Today story layout">
                <button
                  className={todayLayout === 'rail' ? 'active' : ''}
                  type="button"
                  aria-pressed={todayLayout === 'rail'}
                  onClick={() => setTodayLayout('rail')}
                >
                  Rail
                </button>
                <button
                  className={todayLayout === 'cards' ? 'active' : ''}
                  type="button"
                  aria-pressed={todayLayout === 'cards'}
                  onClick={() => setTodayLayout('cards')}
                >
                  Cards
                </button>
              </div>
            ) : null}
            <button
              className="theme-toggle"
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
            >
              <span className="theme-toggle-icon" aria-hidden="true" />
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            {ENABLE_EXTRA_SECTIONS ? (
              <button className="header-action" type="button" onClick={() => setSectionsModalOpen(true)}>Customize</button>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main" className={`view-${activeCategory}`}>
        <section className={`post app-view ${activeCategory === 'top-stories' ? 'top-stories-post' : ''} ${activeCategory === 'timelines' ? 'events-post' : ''}`}>
          {activeCategory === 'timelines' ? (
            <header className="events-page-header">
              <div>
                {eventsView === 'browse' ? <a href="/?category=timelines">{'\u2190'} Events</a> : null}
                <h1>{eventsView === 'browse' ? eventsBrowseTitle : 'Events'}</h1>
              </div>
              {eventsView === 'landing' ? (
                <button
                  className="events-search-button"
                  type="button"
                  aria-label={eventsSearchOpen ? 'Close coverage search' : 'Search coverage'}
                  aria-expanded={eventsSearchOpen}
                  onClick={() => setEventsSearchOpen((open) => !open)}
                >
                  {eventsSearchOpen ? <span aria-hidden="true">{'\u00d7'}</span> : <span className="events-search-glyph" aria-hidden="true" />}
                </button>
              ) : null}
            </header>
          ) : (
            <header className="major page-intro">
              <div className="page-intro-copy">
                {activeCategory !== 'top-stories' ? <span className="page-kicker">Made for you</span> : null}
                <h1>{activeCategory === 'top-stories' ? topStoriesHeading : title}</h1>
                {activeCategory === 'your-newsletter' ? <p className="today-intro">A focused briefing built around the stories, places, and events that matter to you.</p> : null}
              </div>
              {showDate ? (
                <div className="today-view-actions">
                  <div className="today-edition-time">
                    <time className="header-date" dateTime={headerDateKey}>{dateStr}</time>
                    {editionFreshnessLabel ? (
                      <span className={`today-edition-freshness ${editionIsToday ? '' : 'is-stale'}`.trim()}>
                        {editionFreshnessLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </header>
          )}

          {activeCategory === 'timelines' && eventsView === 'landing' && eventsSearchOpen ? (
            <section
              className="coverage-search-panel"
              aria-label="Search Stories, Events, and Ongoing Stories"
              onKeyDown={(event) => {
                if (event.key === 'Escape') setEventsSearchOpen(false);
              }}
            >
              <div className="coverage-search-field">
                <span className="events-search-glyph" aria-hidden="true" />
                <input
                  type="search"
                  value={timelineQuery}
                  onChange={(event) => setTimelineQuery(event.target.value)}
                  placeholder="Search Stories, Events, and Ongoing Stories"
                  aria-label="Search coverage"
                  autoFocus
                />
                {timelineQuery ? <button type="button" onClick={() => setTimelineQuery('')}>Clear</button> : null}
              </div>
              <div className="coverage-search-tabs" aria-label="Filter search results">
                {[
                  ['all', 'All', coverageSearchCounts.all],
                  ['stories', 'Stories', coverageSearchCounts.stories],
                  ['developing', 'Events', coverageSearchCounts.developing],
                  ['ongoing', 'Ongoing stories', coverageSearchCounts.ongoing],
                ].map(([value, label, count]) => (
                  <button
                    type="button"
                    className={eventsSearchType === value ? 'active' : ''}
                    onClick={() => setEventsSearchType(value)}
                    key={value}
                  >
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </button>
                ))}
              </div>
              {timelineQuery ? (
                <div className="coverage-search-results" aria-live="polite">
                  {coverageSearchResults.length ? coverageSearchResults.map((result) => (
                    <a href={result.href} key={result.key}>
                      <span>{result.type}</span>
                      <strong>{result.title}</strong>
                      <small>{result.meta}</small>
                    </a>
                  )) : (
                    <p>No matching coverage. Try a person, place, or subject.</p>
                  )}
                </div>
              ) : (
                <p className="coverage-search-prompt">Search recent reporting and tracked coverage in one place.</p>
              )}
            </section>
          ) : null}

          {ENABLE_NEWSLETTERS ? (
          <div id="your-newsletter" className={`category-content ${activeCategory === 'your-newsletter' ? 'active' : ''}`}>
            <section className="weekly-roundup" aria-labelledby="weekly-roundup-title">
              <div className="weekly-roundup-heading">
                <div>
                  <span className="weekly-roundup-kicker">Seven-day briefing</span>
                  <h2 id="weekly-roundup-title">The week in events</h2>
                  <p>{formatStoredDate(weeklyRoundup.startKey)}–{formatStoredDate(weeklyRoundup.endKey)}</p>
                </div>
                {!loadingTimelines && !timelineError ? (
                  <div className="weekly-roundup-totals" aria-label={`${weeklyRoundup.events.length} events and ${weeklyRoundup.developmentCount} developments`}>
                    <strong>{weeklyRoundup.events.length}</strong>
                    <span>events</span>
                    <strong>{weeklyRoundup.developmentCount}</strong>
                    <span>developments</span>
                  </div>
                ) : null}
              </div>

              {loadingTimelines ? <div className="loading">Building this week’s briefing...</div> : null}

              {!loadingTimelines && timelineError ? (
                <div className="weekly-roundup-empty">
                  <h3>The weekly briefing is unavailable</h3>
                  <p>Muninn could not load the current event record. Please try again shortly.</p>
                </div>
              ) : null}

              {!loadingTimelines && !timelineError && weeklyRoundup.events.length === 0 ? (
                <div className="weekly-roundup-empty">
                  <h3>No developing events this week</h3>
                  <p>New events will appear here after Muninn identifies meaningful follow-up coverage.</p>
                </div>
              ) : null}

              {!loadingTimelines && !timelineError && weeklyRoundup.events.length > 0 ? (
                <div className="weekly-event-list">
                  {weeklyRoundup.events.map(({ event, developments }, index) => {
                    const presentation = event?.presentation || {};
                    const stage = presentation.stage || event?.event_stage || 'developing_event';
                    const stageLabel = presentation.stage_label || (stage === 'timeline' ? 'Timeline' : 'Developing event');
                    const sourceCount = Number(presentation.independent_source_count || presentation.source_count || 0);
                    return (
                      <article className={`weekly-event-card ${index < 3 ? 'is-leading' : ''}`} key={event.event_id || event.title}>
                        <div className="weekly-event-card-heading">
                          <span className={`weekly-event-stage event-stage-${stage}`}>{stageLabel}</span>
                          <span>{developments.length} distinct development{developments.length === 1 ? '' : 's'} this week</span>
                        </div>
                        <h3>{event.canonical_title || event.title || 'Tracked event'}</h3>
                        {presentation.context_summary || event.summary ? (
                          <p className="weekly-event-context">{truncateText(presentation.context_summary || event.summary, 320)}</p>
                        ) : null}
                        <ol className="weekly-development-list">
                          {developments.map((entry, entryIndex) => (
                            <li key={entry.development_id || `${event.event_id || event.title}-${entry.date || entryIndex}`}>
                              <time dateTime={toUtcDateKey(entry.date)}>{formatStoredDate(entry.date)}</time>
                              <span>{entry.title || 'Event update'}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="weekly-event-footer">
                          {sourceCount ? <span>{sourceCount} independent source{sourceCount === 1 ? '' : 's'}</span> : <span>Source-grounded coverage</span>}
                          <a href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`}>Open full event <span aria-hidden="true">→</span></a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <div className="personal-newsletters-divider">
              <span>Your personal newsletters</span>
            </div>
            {loadingNewsletter && <div className="loading">Loading preferences...</div>}

            {!loadingNewsletter && newsletters.length === 0 && (
              <div className="news-item">
                <h3>Create your first newsletter custom to you</h3>
                <p>Tell us what you care about and we’ll build a weekly (or daily) newsletter just for you.</p>
                <button
                  className="customize-button"
                  onClick={() => {
                    setNewsletterDraft({
                      id: createNewsletterId(),
                      newsletterName: '',
                      personName: '',
                      location: { state: selectedState || '', district: '' },
                      topics: ['top-stories'],
                      schedule: { frequency: 'weekly', days: ['Mon'], lookbackDays: 7 },
                      emails: [],
                    });
                    setNewsletterModalOpen(true);
                  }}
                >
                  Create your first newsletter
                </button>
              </div>
            )}

            {!loadingNewsletter && newsletters.length > 0 && (
              <div className="newsletter-preferences-card">
                <div className="preferences-header">
                  <h3>Your Newsletters</h3>
                  <button
                    className="edit-button"
                    onClick={() => {
                      setNewsletterDraft({
                        id: createNewsletterId(),
                        newsletterName: '',
                        personName: '',
                        location: { state: selectedState || '', district: '' },
                        topics: ['top-stories'],
                        schedule: { frequency: 'weekly', days: ['Mon'], lookbackDays: 7 },
                        emails: [],
                      });
                      setNewsletterModalOpen(true);
                    }}
                  >
                    Create another
                  </button>
                </div>

                <div className="preferences-content">
                  {newsletters.map((entry) => (
                    <div key={entry.id} className="news-item" style={{ marginBottom: '1rem' }}>
                      <h3>{entry.newsletterName || 'Personal Newsletter'}</h3>
                      <p>
                        <strong>For:</strong> {entry.personName || 'Unnamed'}{' '}
                        {entry?.location?.state ? `(${entry.location.state})` : ''}
                      </p>
                      <p>
                        <strong>Topics:</strong> {(entry.topics || []).join(', ') || 'None'}
                      </p>
                      {entry?.topicDepths && Object.keys(entry.topicDepths).length > 0 && (
                        <p>
                          <strong>Depth:</strong>{' '}
                          {Object.entries(entry.topicDepths)
                            .map(([topic, depth]) => {
                              const label = depth === 1 ? 'Brief' : depth === 3 ? 'Deep' : 'Standard';
                              return `${topic}: ${label}`;
                            })
                            .join(', ')}
                        </p>
                      )}
                      {entry?.tone && (
                        <p>
                          <strong>Tone:</strong> {entry.tone}
                        </p>
                      )}
                      {entry?.keywords?.include?.length ? (
                        <p>
                          <strong>Keywords:</strong>{' '}
                          include [{entry.keywords.include.join(', ')}]
                        </p>
                      ) : null}
                      <p>
                        <strong>Schedule:</strong>{' '}
                        {entry?.schedule?.frequency === 'daily'
                          ? 'Daily'
                          : `Weekly on ${(entry?.schedule?.days || []).join(', ') || 'unspecified days'}`}
                      </p>
                      <p>
                        <strong>Lookback:</strong> {entry?.schedule?.lookbackDays || 7} days
                      </p>
                      {entry?.emails?.length ? (
                        <p><strong>Emails:</strong> {entry.emails.join(', ')}</p>
                      ) : null}
                      {entry?.lastGeneratedKey ? (
                        <p style={{ wordBreak: 'break-word' }}>
                          <strong>Last Output:</strong> {entry.lastGeneratedKey}
                        </p>
                      ) : null}

                      {summaryLoadingId === entry.id ? (
                        <p style={{ opacity: 0.8 }}>Loading summary...</p>
                      ) : null}
                      {summaryErrorById[entry.id] ? (
                        <p style={{ color: '#ffb3b3' }}>{summaryErrorById[entry.id]}</p>
                      ) : null}

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="edit-button"
                          onClick={() => {
                            setNewsletterDraft(entry);
                            setNewsletterModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        {entry?.lastGeneratedUrl ? (
                          <button
                            className="edit-button"
                            onClick={() => {
                              const key = entry.lastGeneratedKey || '';
                              const lambdaUrl = GENERATE_URL;
                              const query = new URLSearchParams();
                              if (key) query.set('key', key);
                              if (lambdaUrl) query.set('lambda', lambdaUrl);
                              if (entry?.newsletterName) query.set('newsletterName', entry.newsletterName);
                              if (entry?.location?.state) query.set('state', entry.location.state);
                              if (entry?.location?.state) {
                                const stateName = resolveStateName(entry.location.state);
                                if (stateName) query.set('stateName', stateName);
                              }
                              window.open(`/summary.html?${query.toString()}`, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            View Summary
                          </button>
                        ) : null}
                        <button
                          className="edit-button"
                          onClick={() => handleGenerateNow(entry.id)}
                        >
                          Generate Now
                        </button>
                        <button
                          className="button-secondary delete-button"
                          onClick={() => handleDeleteNewsletter(entry.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          ) : null}

          <div id="top-stories" className={`category-content ${activeCategory === 'top-stories' ? 'active' : ''}`}>
            {loading && <div className="loading">Loading news...</div>}

            {!loading && error && (
              <div className="news-item">
                <h3>Error loading news</h3>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && stories.length === 0 && (
              <div className="news-item">
                <h3>No stories available</h3>
                <p>Check back later for updates.</p>
              </div>
            )}

            {!loading && !error && stories.length > 0 && (<>
              <div className={`today-image-rail layout-${todayLayout}`}>
                <div className="today-rail-equal-grid">
                  {visibleTodayGroups.map((group, index) => (
                    <TodayRailStory
                      group={group}
                      variant="equal"
                      editorialRank={index + 1}
                      storyIndex={stories.indexOf(group.primary)}
                      generatedAt={digestGeneratedAt}
                      key={group.primary?.story_id || group.primary?.title}
                    />
                  ))}
                </div>

                {moreTodayGroups.length ? (
                  <section className="today-secondary-news" aria-labelledby="today-secondary-news-title">
                    <header className="today-secondary-heading">
                      <div>
                        <h2 id="today-secondary-news-title">More from this edition</h2>
                      </div>
                      <p>{moreTodayGroups.length} stories</p>
                    </header>
                    {todayLayout === 'cards' ? (
                      <div className="top-stories-grid edition-stories-grid today-current-edition-grid">
                        {moreTodayGroups.map(({ primary }, index) => (
                          <EditionStoryCard
                            story={primary}
                            editionDate={currentDateKey}
                            currentDate={currentDateKey}
                            todayCard
                            key={`today-edition-${primary?.story_id || 'story'}-${index}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="today-secondary-grid">
                        {moreTodayGroups.map((group) => (
                          <TodayRailStory
                            group={group}
                            variant="small"
                            storyIndex={stories.indexOf(group.primary)}
                            generatedAt={digestGeneratedAt}
                            key={`today-secondary-${group.primary?.story_id || group.primary?.title}`}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}

              </div>

              {false ? (<div className="top-stories-grid legacy-today-cards" aria-hidden="true">
                {visibleTodayGroups.map(({ primary: story, related }, index) => {
                  const groupedStories = [story, ...related];
                  const sourceEntries = sourceEntriesForStories(groupedStories);
                  const visibleSourceEntries = sourceEntries.slice(0, SOURCE_LOGO_DISPLAY_LIMIT);
                  const hiddenSourceCount = Math.max(0, sourceEntries.length - visibleSourceEntries.length);
                  const timelineCount = Math.max(...groupedStories.map((item) => Array.isArray(item?.timeline_highlights) ? item.timeline_highlights.length : 0));
                  const isLead = index === 0;
                  const isSecondaryFeature = index > 0 && index <= 2;
                  const isCompact = index > 2;
                  const isVisualCompact = index > 2 && visualCompactStoryIds.has(story?.story_id);
                  const imageUrl = isCompact && !isVisualCompact ? '' : (story?.image?.url || story?.image?.thumbnail_url || '');
                  const imageCrop = storyImageCropPresentation(story, isLead || isSecondaryFeature ? 'wide' : 'tall');
                  const displayTitle = cleanDisplayTitle(story?.title, story?.sources);
                  const cardContext = storyCardContext(groupedStories, related.length, timelineCount);
                  const visibleContextLabel = cardContext.kind === 'update'
                    ? cardContext.label.replace(/^Event update\s*/i, '').replace(/^[^\w]+/, '')
                    : normalizedStoryCategory(story);
                  const eventStory = cardContext.kind === 'update'
                    ? groupedStories.find((item) => item?.story_context?.timeline_url || item?.event_id)
                    : null;
                  const eventHref = eventStory?.story_context?.timeline_url
                    || (eventStory?.event_id ? `/timeline.html?event=${encodeURIComponent(eventStory.event_id)}` : '');
                  const freshness = formatCardFreshness(digestGeneratedAt);
                  const openStory = () => {
                    const storyIndex = stories.indexOf(story);
                    const storyRef = story?.story_id
                      ? `sid=${encodeURIComponent(story.story_id)}`
                      : `id=${storyIndex}`;
                    window.location.href = `/story.html?${storyRef}`;
                  };

                  return (
                    <Fragment key={story?.story_id || displayTitle}>
                      <div className={`top-story-item ${isLead ? 'is-lead' : ''} ${isSecondaryFeature ? 'is-secondary-feature' : ''} ${isCompact ? 'is-compact' : ''} ${isVisualCompact ? 'is-visual-compact' : ''}`}>
                      {cardContext ? (
                        eventHref ? <a className={`top-story-context-label is-${cardContext.kind}-story`} href={eventHref} title={cardContext.detail ? `${cardContext.label} · ${cardContext.detail}` : cardContext.label}>
                          <span className="top-story-timeline-dot" aria-hidden="true" />
                          <span className="top-story-context-name">{visibleContextLabel}</span>
                          {cardContext.detail ? <span className="top-story-context-detail">{cardContext.detail}</span> : null}
                        </a> : <div className={`top-story-context-label is-${cardContext.kind}-story`} title={cardContext.detail ? `${cardContext.label} · ${cardContext.detail}` : cardContext.label}>
                          <span className="top-story-timeline-dot" aria-hidden="true" />
                          <span className="top-story-context-name">{visibleContextLabel}</span>
                          {cardContext.detail ? <span className="top-story-context-detail">{cardContext.detail}</span> : null}
                        </div>
                      ) : null}

                      <article
                        className={`top-story-card ${isLead ? 'is-lead' : ''} ${isSecondaryFeature ? 'is-secondary-feature' : ''} ${isCompact ? 'is-compact' : ''} ${isVisualCompact ? 'is-visual-compact' : ''} ${imageUrl ? 'has-image' : 'no-image'}`}
                        role="link"
                        tabIndex={0}
                        aria-label={`Read ${displayTitle}`}
                        onClick={openStory}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openStory();
                          }
                        }}
                      >
                      <div
                        className={`top-story-card-image ${imageUrl ? '' : 'is-placeholder'} ${imageCrop.preserveFullImage ? 'preserve-full-image' : ''}`}
                        style={imageUrl ? { '--story-focus': imageCrop.position } : undefined}
                      >
                        {imageUrl ? (<>
                          <img className="top-story-card-image-backdrop" src={imageUrl} alt="" aria-hidden="true" loading="lazy" />
                          <img
                            className="top-story-card-image-primary"
                            src={imageUrl}
                            alt=""
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                              event.currentTarget.parentElement?.classList.add('is-placeholder');
                            }}
                          />
                        </>) : null}
                        {imageUrl && story?.image?.is_ai_generated ? (
                          <span className="top-story-ai-label">AI illustration</span>
                        ) : null}
                        {!isLead && imageUrl ? (
                          <div className="story-image-title">
                            <h3>{displayTitle}</h3>
                          </div>
                        ) : null}
                        {!isLead && imageUrl && sourceEntries.length ? (
                          <div className="image-source-logos" aria-label={`Sources include ${sourceEntries.map((entry) => entry.name).join(', ')}`}>
                            <div className="top-story-source-logos">
                              {visibleSourceEntries.map((entry) => (
                                <span className="top-story-source-logo" title={entry.name} key={entry.name}>
                                  <img
                                    src={sourceLogoUrl(entry.name)}
                                    alt=""
                                    aria-hidden="true"
                                    loading="lazy"
                                    onError={(event) => {
                                      event.currentTarget.onerror = null;
                                      event.currentTarget.src = '/assets/logos/news_placeholder.png';
                                    }}
                                  />
                                </span>
                              ))}
                              {hiddenSourceCount ? <span className="top-story-source-more" title={`${hiddenSourceCount} more sources`}>+{hiddenSourceCount}</span> : null}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="top-story-card-body">
                        {isLead || isSecondaryFeature || isCompact || !imageUrl ? <h3 title={displayTitle}>{displayTitle}</h3> : null}
                        {isLead && story?.summary ? <p className="top-story-deck">{truncateText(story.summary, 300)}</p> : null}
                        {sourceEntries.length ? (
                          <p className="top-story-source-line">
                            <strong>{sourceEntries.length} outlets</strong>
                            <span>{sourceEntries.slice(0, 3).map((entry) => entry.name).join(', ')}{sourceEntries.length > 3 ? ` +${sourceEntries.length - 3}` : ''}</span>
                          </p>
                        ) : null}

                        <div className="top-story-evidence" title="Based on distinct outlets represented in this story. This is not an accuracy score.">
                          <div className="top-story-source-stack">
                            {sourceEntries.length ? (
                              <div className="top-story-source-logos" aria-label={`Sources include ${sourceEntries.map((entry) => entry.name).join(', ')}`}>
                                {visibleSourceEntries.map((entry) => (
                                  <span className="top-story-source-logo" title={entry.name} key={entry.name}>
                                    <img
                                      src={sourceLogoUrl(entry.name)}
                                      alt=""
                                      aria-hidden="true"
                                      loading="lazy"
                                      onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = '/assets/logos/news_placeholder.png';
                                      }}
                                    />
                                  </span>
                                ))}
                                {hiddenSourceCount ? <span className="top-story-source-more" title={`${hiddenSourceCount} more sources`}>+{hiddenSourceCount}</span> : null}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="top-story-card-footer">
                          {cardContext ? (
                            eventHref ? <a
                              className={`top-story-context-label card-inline-context is-${cardContext.kind}-story`}
                              href={eventHref}
                              title={cardContext.label}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <span className="top-story-timeline-dot" aria-hidden="true" />
                              <span className="top-story-context-name">{visibleContextLabel}</span>
                              {cardContext.detail ? <span className="top-story-context-detail">{cardContext.detail}</span> : null}
                            </a> : <div className={`top-story-context-label card-inline-context is-${cardContext.kind}-story`} title={cardContext.label}>
                              <span className="top-story-timeline-dot" aria-hidden="true" />
                              <span className="top-story-context-name">{visibleContextLabel}</span>
                              {cardContext.detail ? <span className="top-story-context-detail">{cardContext.detail}</span> : null}
                            </div>
                          ) : null}
                          <div className="top-story-meta">
                            {isLead && freshness ? <span>{freshness}</span> : null}
                          </div>
                          <span className="top-story-open">Open story <span aria-hidden="true">→</span></span>
                        </div>
                      </div>
                      </article>
                      </div>
                    </Fragment>
                  );
                })}
              </div>) : null}
            </>)}
          </div>

          {activeCategory === 'top-stories' && !loading && !error && stories.length ? (
            <div className="more-news-inline">
              <button
                className="more-news-trigger"
                type="button"
                onClick={() => setMoreNewsOpen((current) => !current)}
                aria-expanded={moreNewsOpen}
                aria-controls="more-news-editions"
              >
                <span>
                  {moreNewsOpen
                    ? `Hide ${editionIsToday ? 'yesterday\u2019s' : 'previous'} edition`
                    : `${editionIsToday ? 'Yesterday\u2019s' : 'Previous'} edition`}
                </span>
                {recentNewsDays[0] ? (
                  <small>
                    {formatStoredDate(recentNewsDays[0].date)} · {Array.isArray(recentNewsDays[0].stories) ? recentNewsDays[0].stories.length : 0} stories
                  </small>
                ) : null}
                <span className="more-news-trigger-icon" aria-hidden="true">{moreNewsOpen ? '↑' : '↓'}</span>
              </button>
              {moreNewsOpen ? (
                <div id="more-news-editions" className="more-news-editions">
                  {false && moreTodayGroups.length ? (
                    <section className="news-edition-section is-today">
                      <header className="news-edition-heading">
                        <span>Still developing</span>
                        <h2>More of Today’s News</h2>
                        <time dateTime={currentDateKey}>{formatStoredDate(currentDateKey)}</time>
                      </header>
                      <div className="top-stories-grid edition-stories-grid">
                          {moreTodayGroups.map(({ primary }, index) => (
                            <EditionStoryCard
                              story={primary}
                              editionDate={currentDateKey}
                              currentDate={currentDateKey}
                              key={`${currentDateKey}-${primary?.story_id || 'story'}-${index}`}
                            />
                          ))}
                      </div>
                    </section>
                  ) : null}

                  {recentNewsLoading ? <div className="more-news-status">Loading the previous edition...</div> : null}
                  {recentNewsError ? <div className="more-news-status caution">The previous edition is temporarily unavailable.</div> : null}
                  {recentNewsDays.slice(0, 1).map((day) => (
                    <section className="news-edition-section is-archive" key={day.date}>
                      <header className="news-edition-heading">
                        <span>Previous edition</span>
                        <h2>{editionIsToday ? 'Yesterday\u2019s News' : 'Previous News'}</h2>
                        <time dateTime={day.date}>{formatStoredDate(day.date)}</time>
                      </header>
                      <div className="top-stories-grid edition-stories-grid">
                          {(Array.isArray(day.stories) ? day.stories : []).map((story, index) => (
                            <EditionStoryCard
                              story={story}
                              editionDate={day.date}
                              currentDate={currentDateKey}
                              key={`${day.date}-${story?.story_id || 'story'}-${index}`}
                            />
                          ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div id="timelines" className={`category-content ${activeCategory === 'timelines' ? 'active' : ''}`}>
            {loadingTimelines && <div className="loading">Loading events...</div>}

            {!loadingTimelines && timelineError && (
              <div className="news-item">
                <h3>No event file published yet</h3>
                <p>
                  The Events tab reads <code>/Current_news/event_timelines.json</code>. Run the daily pipeline once
                  after the event-memory changes are deployed, then refresh this page.
                </p>
              </div>
            )}

            {!loadingTimelines && !timelineError && eligibleTimelineEvents.length === 0 && (
              <div className="news-item">
                <h3>No developing events yet</h3>
                <p>Standalone stories stay on Today. Stories appear here after they receive a meaningful follow-up.</p>
              </div>
            )}

            {!loadingTimelines && !timelineError && publicTimelineEvents.length > 0 && eventsView === 'landing' && (
              <div className="events-landing-view">
                <EventsSwipeSection
                  title="Latest updates"
                  items={latestTimelineEvents}
                  relatedStories={eventStoryById}
                  browseType="latest"
                  showType
                />
                <EventsSwipeSection
                  title="Developing events"
                  items={rankedDevelopingTimelineEvents}
                  relatedStories={eventStoryById}
                  browseType="developing"
                />
                {showDedicatedOngoingSection ? (
                  <EventsSwipeSection
                    title="Ongoing stories"
                    items={storylineTimelineEvents}
                    relatedStories={eventStoryById}
                    browseType="ongoing"
                  />
                ) : null}
                {exploreOngoingStories.length || exploreTopics.length ? (
                  <section className="events-explore-section" aria-labelledby="events-explore-title">
                    <header>
                      <div>
                        <h2 id="events-explore-title">Explore</h2>
                        <p>Follow a subject or return to a long-running story.</p>
                      </div>
                    </header>
                    {exploreOngoingStories.length ? (
                      <div className="events-explore-ongoing">
                      {exploreOngoingStories.map((event) => {
                        const title = eventDisplayTitle(event);
                        return (
                          <a
                            className="events-explore-item is-ongoing"
                            href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`}
                            aria-label={`Open ongoing story: ${title}`}
                            key={`ongoing:${event.event_id || title}`}
                          >
                            <span>Ongoing story</span>
                            <strong>{title}</strong>
                            <span aria-hidden="true">{'\u2192'}</span>
                          </a>
                        );
                      })}
                      </div>
                    ) : null}
                    {exploreTopics.length ? (
                      <div className="events-explore-topics" aria-label="Browse topics">
                        <span>Topics</span>
                      {exploreTopics.map((topic) => (
                        <button
                          type="button"
                          className="events-explore-item is-topic"
                          onClick={() => {
                            setTimelineQuery(topic.label);
                            setEventsSearchType('all');
                            setEventsSearchOpen(true);
                            window.requestAnimationFrame(() => {
                              document.querySelector('.events-page-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            });
                          }}
                          key={`topic:${topic.label}`}
                        >
                          {topic.label}
                        </button>
                      ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </div>
            )}

            {!loadingTimelines && !timelineError && publicTimelineEvents.length > 0 && eventsView === 'browse' && (
              <section
                className={`events-browse-view is-${eventsBrowseMode}`}
                aria-label={eventsBrowseTitle}
              >
                <div className={`events-browse-toolbar ${eventsBrowseMode === 'latest' ? 'is-updates' : 'is-directory'}`}>
                  {eventsBrowseMode === 'latest' ? (
                    <div className="events-browse-types" aria-label="Filter updates by coverage type">
                      {[
                        ['all', 'All updates', publicTimelineEvents.length],
                        ['developing', 'Events', eventCoverageSummary.developing],
                        ['ongoing', 'Ongoing stories', eventCoverageSummary.ongoing],
                      ].map(([value, label, count]) => (
                        <button
                          type="button"
                          className={eventTypeFilter === value ? 'active' : ''}
                          onClick={() => {
                            setEventTypeFilter(value);
                            setEventsBrowseLimit(EVENTS_BROWSE_PAGE_SIZE);
                          }}
                          key={value}
                        >
                          <span>{label}</span>
                          <strong>{count}</strong>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <label className="events-browse-search">
                    <span>{eventsBrowseMode === 'latest' ? 'Filter updates' : 'Filter these events'}</span>
                    <input
                      type="search"
                      value={timelineQuery}
                      onChange={(event) => {
                        setTimelineQuery(event.target.value);
                        setEventsBrowseLimit(EVENTS_BROWSE_PAGE_SIZE);
                      }}
                      placeholder="Search current coverage"
                    />
                  </label>
                  {eventsBrowseMode !== 'latest' ? (
                    <label className="events-browse-sort">
                      <span>Sort</span>
                      <select value={eventSort} onChange={(event) => setEventSort(event.target.value)}>
                        <option value="recent">Latest update</option>
                        <option value="newest">Newest event</option>
                        <option value="developments">Most developed</option>
                      </select>
                    </label>
                  ) : null}
                </div>
                <div className="events-browse-summary">
                  <strong>{filteredTimelineEvents.length}</strong>
                  <span>
                    {eventsBrowseMode === 'latest'
                      ? (filteredTimelineEvents.length === 1 ? 'current update' : 'current updates')
                      : eventsBrowseMode === 'ongoing'
                        ? (filteredTimelineEvents.length === 1 ? 'ongoing story' : 'ongoing stories')
                        : (filteredTimelineEvents.length === 1 ? 'developing event' : 'developing events')}
                  </span>
                </div>
                {filteredTimelineEvents.length ? (
                  <>
                    {eventsBrowseMode === 'latest' ? (
                      <div className="latest-updates-feed">
                        {latestBrowseGroups.map((group) => (
                          <section className="latest-update-group" aria-labelledby={`updates-${group.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`} key={group.label}>
                            <h2 id={`updates-${group.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>{group.label}</h2>
                            <div>
                              {group.items.map((event) => (
                                <LatestUpdateRow
                                  event={event}
                                  relatedStory={eventStoryById.get(event.event_id)}
                                  key={event.event_id || event.title}
                                />
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div className="events-browse-grid">
                        {filteredTimelineEvents.slice(0, eventsBrowseLimit).map((event) => (
                          <CoverageDirectoryCard
                            event={event}
                            relatedStory={eventStoryById.get(event.event_id)}
                            showType={false}
                            key={event.event_id || event.title}
                          />
                        ))}
                      </div>
                    )}
                    {filteredTimelineEvents.length > eventsBrowseLimit ? (
                      <button
                        className="events-load-more"
                        type="button"
                        onClick={() => setEventsBrowseLimit((current) => current + EVENTS_BROWSE_PAGE_SIZE)}
                      >
                        Load more
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="events-browse-empty">
                    <h2>No matching coverage</h2>
                    <p>Try a broader search or another coverage type.</p>
                  </div>
                )}
              </section>
            )}

            {false && !loadingTimelines && !timelineError && eligibleTimelineEvents.length > 0 && (
              <>
                {featuredTimelineEvents.length ? (
                  <section className="event-latest-section" aria-labelledby="event-latest-title">
                    <div className="event-section-heading">
                      <div>
                        <span>Across all tracked coverage</span>
                        <h2 id="event-latest-title">Latest updates</h2>
                      </div>
                      <p>Pure recency first, with editorial weight breaking ties between updates published together.</p>
                    </div>
                    <CoverageRail
                      label="latest Event and Ongoing Story updates"
                      itemCount={featuredTimelineEvents.length}
                      className="coverage-rail-featured"
                      metaText={`${featuredTimelineEvents.length} newest changes · Events and Ongoing Stories`}
                    >
                      {featuredTimelineEvents.map((event) => {
                        const entries = eventTimelineEntries(event);
                        const latest = entries[entries.length - 1] || {};
                        const sourceCount = Number(event?.presentation?.independent_source_count || event?.presentation?.source_count || 0);
                        const relatedStory = eventStoryById.get(event.event_id);
                        const category = eventDisplayCategory(event, relatedStory);
                        const coverageType = eventCoverageType(event);
                        return (
                          <a
                            className="coverage-feature-card"
                            href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`}
                            key={event.event_id || event.title}
                          >
                            <div className="coverage-feature-copy">
                              <div className="event-card-labels">
                                <span className="story-desk-label">{category}</span>
                                <span className="story-tracked-label">{coverageType}</span>
                              </div>
                              <h3>{eventDisplayTitle(event)}</h3>
                              <div className="coverage-latest-change">
                                <span>What changed</span>
                                <strong>{latest.title || 'New development'}</strong>
                              </div>
                              <div className="coverage-card-footer">
                                <span>
                                  <time dateTime={latest.date}>{formatStoredDate(latest.date)}</time>
                                  {' \u00b7 '}{entries.length} developments
                                  {sourceCount ? ` \u00b7 ${sourceCount} sources` : ''}
                                </span>
                                <strong>Story so far <span aria-hidden="true">{'\u2192'}</span></strong>
                              </div>
                            </div>
                            <EventArtwork event={event} relatedStory={relatedStory} />
                          </a>
                        );
                      })}
                    </CoverageRail>
                  </section>
                ) : null}

                <section className="event-storylines-section" aria-labelledby="event-storylines-title">
                  <div className="event-section-heading">
                    <div>
                      <span>Long-running coverage</span>
                      <h2 id="event-storylines-title">Ongoing Stories</h2>
                    </div>
                    <p>Ranked by editorial importance, then freshness and the depth of the record.</p>
                  </div>
                  {storylineTimelineEvents.length ? (
                    <CoverageRail
                      label="Ongoing Stories"
                      itemCount={storylineTimelineEvents.length}
                      className="coverage-rail-storylines"
                      metaText={`${storylineTimelineEvents.length} ${storylineTimelineEvents.length === 1 ? 'Ongoing Story' : 'Ongoing Stories'} · significance + freshness`}
                    >
                      {storylineTimelineEvents.map((event) => {
                        const entries = eventTimelineEntries(event);
                        const latest = entries[entries.length - 1] || {};
                        const relatedStory = eventStoryById.get(event.event_id);
                        const category = eventDisplayCategory(event, relatedStory);
                        return (
                          <a
                            className="coverage-new-card coverage-storyline-card"
                            href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`}
                            key={event.event_id || event.title}
                          >
                            <EventArtwork event={event} relatedStory={relatedStory} compact />
                            <div className="coverage-new-copy">
                              <div className="event-card-labels">
                                <span className="story-desk-label">{category}</span>
                                <span className="story-tracked-label">Ongoing Story</span>
                              </div>
                              <h3>{eventDisplayTitle(event)}</h3>
                              <p>{latest.title || 'Latest development available'}</p>
                            </div>
                            <div className="coverage-new-footer">
                              <span>Updated {formatStoredDate(eventLatestDateKey(event))}</span>
                              <strong>{entries.length} developments</strong>
                            </div>
                          </a>
                        );
                      })}
                    </CoverageRail>
                  ) : (
                    <div className="event-section-empty">
                      <p>No Ongoing Stories are public yet. Confirmed long-running coverage will appear here.</p>
                    </div>
                  )}
                </section>

                <section className="event-ranked-section" aria-labelledby="event-ranked-title">
                  <div className="event-section-heading">
                    <div>
                      <span>Bounded developing coverage</span>
                      <h2 id="event-ranked-title">Developing Events</h2>
                    </div>
                    <p>Recency leads the ranking, with editorial importance and reporting depth as supporting signals.</p>
                  </div>
                  {rankedDevelopingTimelineEvents.length ? (
                    <CoverageRail
                      label="Developing Events"
                      itemCount={rankedDevelopingTimelineEvents.length}
                      className="coverage-rail-events"
                      metaText={`${rankedDevelopingTimelineEvents.length} Events · recency-weighted`}
                    >
                      {rankedDevelopingTimelineEvents.map((event) => {
                        const entries = eventTimelineEntries(event);
                        const latest = entries[entries.length - 1] || {};
                        const relatedStory = eventStoryById.get(event.event_id);
                        return (
                          <a
                            className="coverage-directory-card"
                            href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`}
                            key={event.event_id || event.title}
                          >
                            <EventArtwork event={event} relatedStory={relatedStory} compact />
                            <div className="coverage-directory-copy">
                              <div className="event-card-labels">
                                <span className="story-desk-label">{eventDisplayCategory(event, relatedStory)}</span>
                                <span className="story-tracked-label">{eventCoverageType(event)}</span>
                              </div>
                              <h3>{eventDisplayTitle(event)}</h3>
                              <div className="coverage-directory-update">
                                <span>Latest</span>
                                <p>{latest.title || 'Latest development available'}</p>
                              </div>
                            </div>
                            <div className="coverage-directory-footer">
                              <span>{eventDateRange(event)}</span>
                              <strong>{entries.length} developments <span aria-hidden="true">{'\u2192'}</span></strong>
                            </div>
                          </a>
                        );
                      })}
                    </CoverageRail>
                  ) : (
                    <div className="event-section-empty">
                      <p>No Developing Events are public yet.</p>
                    </div>
                  )}
                </section>
              </>
            )}

            {false && !loadingTimelines && !timelineError && eligibleTimelineEvents.length > 0 && (
              <>
                <div className="timeline-search-panel event-browser-tools">
                  <div className="event-search-field">
                    <label htmlFor="timeline-search">Find an event</label>
                    <input
                      id="timeline-search"
                      type="search"
                      value={timelineQuery}
                      onChange={(event) => setTimelineQuery(event.target.value)}
                      placeholder="Search topics, places, or developments"
                    />
                  </div>
                  <div className="event-filter-row" aria-label="Filter events by activity">
                    {[
                      ['active', 'Updated today', eventStatusCounts.active],
                      ['ongoing', 'Ongoing', eventStatusCounts.ongoing],
                      ['archive', 'Archive', eventStatusCounts.archive],
                    ].map(([value, label, count]) => (
                      <button
                        type="button"
                        className={eventStageFilter === value && !timelineQuery ? 'active' : ''}
                        onClick={() => {
                          setTimelineQuery('');
                          setEventStageFilter(value);
                        }}
                        key={value}
                      >
                        <span>{label}</span>
                        <strong>{count}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                {timelineQuery ? (
                  <div className="event-results-heading">
                    <p><strong>{filteredTimelineEvents.length}</strong> results for “{timelineQuery}”</p>
                    <button type="button" onClick={() => setTimelineQuery('')}>Clear search</button>
                  </div>
                ) : null}

                {filteredTimelineEvents.length === 0 ? (
                  <div className="timeline-empty-search"><h3>No matching events</h3><p>Try another topic or change the activity filter.</p></div>
                ) : null}

                {featuredTimelineEvents.length ? (
                  <section className="event-spotlight" aria-labelledby="event-spotlight-title">
                    <div className="event-section-heading">
                      <div>
                        <span>Latest developments</span>
                        <h2 id="event-spotlight-title">Updated today</h2>
                      </div>
                      <p>The latest meaningful changes across the day’s most active stories.</p>
                    </div>
                    <div className="event-spotlight-grid">
                      {featuredTimelineEvents.map((event, eventIndex) => {
                        const entries = eventTimelineEntries(event);
                        const latest = entries[entries.length - 1] || {};
                        const sourceCount = Number(event?.presentation?.independent_source_count || event?.presentation?.source_count || 0);
                        const relatedStory = eventStoryById.get(event.event_id);
                        const imageUrl = relatedStory?.image?.url || relatedStory?.image?.thumbnail_url || '';
                        return (
                          <a
                            className={`event-spotlight-card ${eventIndex === 0 ? 'is-lead' : ''} ${imageUrl ? 'has-image' : ''}`}
                            href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`}
                            key={event.event_id || event.title}
                          >
                            <div className="event-card-heading">
                              <time dateTime={latest.date}>{formatStoredDate(latest.date)}</time>
                            </div>
                            {imageUrl ? (
                              <div className="event-spotlight-media">
                                <img src={imageUrl} alt="" loading="lazy" />
                                {imageUrl ? (
                                  <div className="event-image-title">
                                    <span>Event timeline</span>
                                    <h3>{eventDisplayTitle(event)}</h3>
                                  </div>
                                ) : null}
                                {relatedStory?.image?.image_role_label ? (
                                  <span className="event-image-role">{relatedStory.image.image_role_label}</span>
                                ) : null}
                              </div>
                            ) : null}
                            {!imageUrl ? <h3>{eventDisplayTitle(event)}</h3> : null}
                            <div className="event-change">
                              <span>What changed</span>
                              <strong>{latest.title || 'New development'}</strong>
                              {eventIndex === 0 && (latest.summary || event.summary) ? (
                                <p>{truncateText(latest.summary || event.summary, 260)}</p>
                              ) : null}
                            </div>
                            <div className="event-card-meta">
                              <span>{entries.length} updates</span>
                              <span>{eventDateRange(event)}</span>
                              {sourceCount ? <span>{sourceCount} sources</span> : null}
                              <strong className="event-card-action">Open timeline <span aria-hidden="true">→</span></strong>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {directoryTimelineEvents.length ? (
                  <section className="event-directory" aria-labelledby="event-directory-title">
                    <div className="event-section-heading">
                      <div>
                        <span>{timelineQuery ? 'Search results' : eventStageFilter === 'active' ? 'More today' : 'Event directory'}</span>
                        <h2 id="event-directory-title">
                          {timelineQuery ? 'Matching events' : eventStageFilter === 'active' ? 'Also updated today' : eventStageFilter === 'ongoing' ? 'Ongoing events' : 'Archive'}
                        </h2>
                      </div>
                      <p>{timelineQuery ? 'Results are ordered by the most recently updated event.' : 'A compact view of the rest of the reporting thread.'}</p>
                    </div>
                    <div className="event-directory-list">
                      {directoryTimelineEvents.map((event) => {
                        const entries = eventTimelineEntries(event);
                        const latest = entries[entries.length - 1] || {};
                        const status = eventActivityStatus(event, timelineCurrentDateKey);
                        return (
                          <a
                            className="event-directory-row"
                            href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`}
                            key={event.event_id || event.title}
                          >
                            <span className={`event-status-dot event-status-${status}`} aria-hidden="true" />
                            <div className="event-directory-copy">
                              <h3>{eventDisplayTitle(event)}</h3>
                              <p>{latest.title || 'Latest development available'}</p>
                            </div>
                            <div className="event-directory-meta">
                              <strong>{entries.length} updates</strong>
                              <span>{eventDateRange(event)}</span>
                            </div>
                            <span className="event-directory-arrow" aria-hidden="true">→</span>
                          </a>
                        );
                      })}
                    </div>
                  </section>
                ) : null}
              </>
            )}

            {false && (
              <div className="timeline-search-panel event-browser-tools">
                <label htmlFor="timeline-search">Find an event</label>
                <input
                  id="timeline-search"
                  type="search"
                  value={timelineQuery}
                  onChange={(event) => setTimelineQuery(event.target.value)}
                  placeholder="Try Iran, Hormuz, elections..."
                />
                <div className="event-filter-row" aria-label="Filter events by stage">
                  {[
                    ['all', 'All events'],
                    ['developing_event', 'Developing'],
                    ['timeline', 'Timelines'],
                  ].map(([value, label]) => (
                    <button
                      type="button"
                      className={eventStageFilter === value ? 'active' : ''}
                      onClick={() => setEventStageFilter(value)}
                      key={value}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {false && (timelineQuery || eventStageFilter !== 'all') && filteredTimelineEvents.length === 0 ? (
              <div className="timeline-empty-search"><h3>No matching events</h3><p>Try another topic or change the event filter.</p></div>
            ) : null}

            {false ? <div className="events-grid">{filteredTimelineEvents.map((event) => {
              const entries = Array.isArray(event?.timeline) ? event.timeline.slice(-3).reverse() : [];
              const presentation = event?.presentation || {};
              const developmentCount = Number(presentation.development_count || event?.timeline?.length || entries.length);
              const hasFullTimeline = Boolean(presentation.has_full_timeline);
              const stage = presentation.stage || event?.event_stage || (hasFullTimeline ? 'timeline' : 'developing_event');
              const stageLabel = presentation.stage_label || (stage === 'timeline' ? 'Timeline' : 'Developing event');
              const latest = entries[0] || {};
              return (
                <article className="news-item timeline-overview-card" key={event.event_id || event.title}>
                  <div className="event-card-heading">
                    <div className={`timeline-overview-kicker event-stage-${stage}`}>{stageLabel}</div>
                    <span>Updated {formatStoredDate(presentation.latest_date || event.last_seen_at)}</span>
                  </div>
                  <h3>{event.canonical_title || event.title || 'Tracked Event'}</h3>
                  {presentation.context_summary || event.summary ? (
                    <p>{truncateText(presentation.context_summary || event.summary, 360)}</p>
                  ) : null}
                  <div className="timeline-overview-stats">
                    <span>{developmentCount} developments</span>
                    {presentation.date_count ? <span>{presentation.date_count} dates</span> : null}
                    {presentation.independent_source_count || presentation.source_count ? <span>{presentation.independent_source_count || presentation.source_count} sources</span> : null}
                  </div>

                  {latest.title ? (
                    <div className="event-latest-update">
                      <span>Latest development</span>
                      <strong>{latest.title}</strong>
                      {latest.date ? <small>{formatStoredDate(latest.date)}</small> : null}
                    </div>
                  ) : null}

                  {entries.length > 1 ? (
                    <div className="timeline-overview-updates">
                      {entries.slice(1).map((entry, entryIndex) => {
                        return (
                          <div key={entry.development_id || `${event.event_id || event.title}-${entry.date || entryIndex}-${entryIndex}`}>
                            <p>
                              <strong>{formatStoredDate(entry.date)}:</strong> {entry.title || 'Update'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {hasFullTimeline ? (
                    <a className="timeline-overview-link" aria-label="Explore full timeline" href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`}>
                      {presentation.cta_label || 'Explore full timeline'} →
                    </a>
                  ) : (
                    <a className="event-overview-link" aria-label="Open event" href={`/timeline.html?event=${encodeURIComponent(event.event_id)}`}>
                      Open event
                    </a>
                  )}
                </article>
              );
            })}</div> : null}
          </div>

          <div id="local" className={`category-content ${activeCategory === 'local' ? 'active' : ''}`}>
            {activeCategory === 'local' && !selectedState ? (
              <div className="news-item state-selector-container">
                <h3>Where are you from?</h3>
                <p>Select your state to see local news tailored to your area.</p>
                <select
                  className="state-selector"
                  onChange={(e) => handleStateSelection(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Select your state</option>
                  {availableLocalStates.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {activeCategory === 'local' && selectedState ? (
              <>
                {loadingLocal && <div className="loading">Loading local news...</div>}

                {!loadingLocal && localStories.length === 0 && (
                  <div className="news-item">
                    <div className="state-header">
                      <h3>
                        {US_STATES.find((s) => s.code === selectedState)?.name || selectedState} News
                      </h3>
                      <button className="change-state-button" onClick={handleChangeState}>
                        Change State
                      </button>
                    </div>
                    <p>No local stories available right now. Check back later for updates.</p>
                  </div>
                )}

                {!loadingLocal && localStories.map((story, index) => {
                  const sourceLink = story?.items?.[0]?.link;
                  return (
                  <div className="news-item" key={index}>
                    {index === 0 && (
                      <div className="state-header">
                        <h3 style={{ marginBottom: '1rem' }}>
                          {US_STATES.find((s) => s.code === selectedState)?.name || selectedState} News
                        </h3>
                        <button className="change-state-button" onClick={handleChangeState}>
                          Change State
                        </button>
                      </div>
                    )}
                    <h3
                      onClick={() => {
                        if (sourceLink) window.open(sourceLink, '_blank', 'noopener,noreferrer');
                      }}
                      style={{
                        cursor: sourceLink ? 'pointer' : 'default',
                        display: 'block',
                        WebkitLineClamp: 'unset',
                        WebkitBoxOrient: 'initial',
                        overflow: 'visible',
                        textOverflow: 'unset',
                        whiteSpace: 'normal',
                      }}
                      title={story?.title}
                    >
                      {story?.title}
                    </h3>
                  </div>
                )})}
              </>
            ) : null}
          </div>

          <div id="happy" className={`category-content ${activeCategory === 'happy' ? 'active' : ''}`}>
            {loadingHappy && <div className="loading">Loading happy news...</div>}

            {!loadingHappy && happyError && (
              <div className="news-item">
                <h3>Error loading happy news</h3>
                <p>{happyError}</p>
              </div>
            )}

            {!loadingHappy && !happyError && happyStories.length === 0 && (
              <div className="news-item">
                <h3>No happy stories available</h3>
                <p>Check back later for updates.</p>
              </div>
            )}

            {!loadingHappy && !happyError && happyStories.map((story, index) => (
              <div className="news-item" key={index}>
                <h3
                  onClick={() => {
                    const link = story?.items?.[0]?.link;
                    if (link) window.open(link, '_blank', 'noopener,noreferrer');
                  }}
                  style={{ cursor: story?.items?.[0]?.link ? 'pointer' : 'default' }}
                  title={story?.title}
                >
                  {story?.title}
                </h3>
                <div className="news-item-content-row">
                  <div className="news-item-text">
                    <p>{truncateText(story?.summary || '', 350)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {renderPlaceholderSection('science')}
          {renderPlaceholderSection('sports')}
          {renderPlaceholderSection('politics')}
          {renderPlaceholderSection('business')}
          <div id="technology" className={`category-content ${activeCategory === 'technology' ? 'active' : ''}`}>
            {loadingAi && <div className="loading">Loading AI news...</div>}

            {!loadingAi && aiError && (
              <div className="news-item">
                <h3>Error loading AI news</h3>
                <p>{aiError}</p>
              </div>
            )}

            {!loadingAi && !aiError && aiStories.length === 0 && (
              <div className="news-item">
                <h3>No AI stories available</h3>
                <p>Check back later for updates.</p>
              </div>
            )}

            {!loadingAi && !aiError && aiStories.map((story, index) => (
              <div className="news-item" key={index}>
                <h3
                  onClick={() => {
                    const sourceCount = Number(
                      story?.source_count || (Array.isArray(story?.sources) ? story.sources.length : 0)
                    );
                    if (sourceCount > 1) {
                      window.location.href = `/story.html?id=${index}&feed=ai&returnCategory=technology`;
                      return;
                    }

                    const link = story?.items?.[0]?.link;
                    if (link) window.open(link, '_blank', 'noopener,noreferrer');
                  }}
                  style={{
                    cursor: (
                      Number(story?.source_count || (Array.isArray(story?.sources) ? story.sources.length : 0)) > 1
                      || !!story?.items?.[0]?.link
                    ) ? 'pointer' : 'default',
                  }}
                  title={story?.title}
                >
                  {story?.title}
                </h3>
                {(() => {
                  const sourceCount = Number(
                    story?.source_count || (Array.isArray(story?.sources) ? story.sources.length : 0)
                  );
                  if (sourceCount < 2) {
                    const sourceName = story?.sources?.[0] || story?.items?.[0]?.source || 'Unknown source';
                    return (
                      <div className="news-item-content-row">
                        <div className="news-item-text">
                          <p>Source: {sourceName}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="news-item-content-row">
                      <div className="news-item-text">
                        <p>{truncateText(story?.summary || '', 350)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
          <div id="health" className={`category-content ${activeCategory === 'health' ? 'active' : ''}`}>
            {loadingHealth && <div className="loading">Loading health news...</div>}

            {!loadingHealth && healthError && (
              <div className="news-item">
                <h3>Error loading health news</h3>
                <p>{healthError}</p>
              </div>
            )}

            {!loadingHealth && !healthError && healthStories.length === 0 && (
              <div className="news-item">
                <h3>No health stories available</h3>
                <p>Check back later for updates.</p>
              </div>
            )}

            {!loadingHealth && !healthError && healthStories.map((story, index) => (
              <div className="news-item" key={index}>
                <h3
                  onClick={() => {
                    const link = story?.items?.[0]?.link;
                    if (link) window.open(link, '_blank', 'noopener,noreferrer');
                  }}
                  style={{ cursor: story?.items?.[0]?.link ? 'pointer' : 'default' }}
                  title={story?.title}
                >
                  {story?.title}
                </h3>
                <div className="news-item-content-row">
                  <div className="news-item-text">
                    <p>{truncateText(story?.summary || '', 350)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {renderPlaceholderSection('world')}
          {renderPlaceholderSection('other')}
        </section>
      </main>

      <div id="copyright">
        <ul><li>&copy; Muninn</li></ul>
      </div>

      {ENABLE_NEWSLETTERS ? (
        <NewsletterWizardModal
          isOpen={newsletterModalOpen}
          onClose={() => {
            setNewsletterModalOpen(false);
            setNewsletterDraft(null);
          }}
          onSave={handleSaveNewsletter}
          initialData={newsletterDraft}
          allStates={US_STATES}
          topicOptions={[
            { key: 'top-stories', label: 'Today' },
            { key: 'local', label: 'Local News' },
            { key: 'technology', label: 'AI News' },
            { key: 'health', label: 'Health' },
            { key: 'business', label: 'Business' },
            { key: 'science', label: 'Science' },
            { key: 'sports', label: 'Sports' },
            { key: 'politics', label: 'Politics' },
            { key: 'world', label: 'World' },
            { key: 'happy', label: 'Happy News' },
            { key: 'other', label: 'Other' },
          ]}
        />
      ) : null}

      {ENABLE_EXTRA_SECTIONS ? (
        <NewsSectionsModal
          isOpen={sectionsModalOpen}
          onClose={() => setSectionsModalOpen(false)}
          onSave={handleSaveSections}
          options={addNewsOptions}
          selectedKeys={selectedSections}
        />
      ) : null}
    </div>
  );
}
