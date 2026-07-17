import { useEffect, useMemo, useState } from 'react';
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
const NEWSLETTER_TEXT_PREFIX = '[muninn-newsletters]';

const categoryTitles = {
  'top-stories': 'Today',
  timelines: 'Events',
  'your-newsletter': 'Your Newsletter',
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

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + ' ...';
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
    ['Technology', ['artificial intelligence', 'openai', 'chatgpt', 'software', 'cyber', 'technology', 'robot']],
    ['Health', ['health', 'hospital', 'disease', 'vaccine', 'medical', 'doctor', 'patient']],
    ['Science', ['science', 'space', 'nasa', 'research', 'study', 'climate', 'wildfire', 'earthquake', 'astronomer', 'archaeology', 'ancient mayan', 'ruins']],
    ['Business', ['market', 'business', 'economy', 'trade', 'tariff', 'bank', 'stock', 'tax']],
    ['Politics', ['election', 'congress', 'congressional', 'senate', 'campaign', 'president', 'trump', 'parliament', 'political', 'politician', 'politburo', 'minister', 'legislation', 'bill']],
    ['World', ['war', 'missile', 'ceasefire', 'military', 'diplomatic', 'border', 'iran', 'israel', 'ukraine', 'russia']],
    ['Public Safety', ['police', 'shooting', 'murder', 'killed', 'crime', 'missing', 'rescue']],
  ];
  return rules.find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] || 'News';
}

function normalizedStoryCategory(story) {
  const category = String(story?.category || '').trim();
  const inferred = inferDisplayCategory(story);
  if (!category || category.toLowerCase() === 'top story') return inferred;
  const text = `${story?.title || ''} ${story?.summary || ''}`.toLowerCase();
  if (category.toLowerCase() === 'science' && /politburo|political figure|politician|parliament|senate|congress|election/.test(text)) return 'Politics';
  if (category.toLowerCase() === 'science' && ['Politics', 'Sports', 'Business'].includes(inferred)) return inferred;
  return category;
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
  if (normalizedStoryCategory(left) !== normalizedStoryCategory(right)) return false;
  const leftTokens = storyTopicTokens(left);
  const rightTokens = storyTopicTokens(right);
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const smaller = Math.min(leftTokens.size, rightTokens.size) || 1;
  return shared >= 4 && shared / smaller >= 0.45;
}

function groupStoriesForToday(stories) {
  return stories.reduce((groups, story) => {
    const match = groups.find((group) => group.stories.some((candidate) => storiesLookRelated(candidate, story)));
    if (match) match.stories.push(story);
    else groups.push({ stories: [story] });
    return groups;
  }, []).map((group) => ({ primary: group.stories[0], related: group.stories.slice(1) }));
}

function uniqueSourceCount(stories) {
  const keys = new Set();
  stories.forEach((story) => {
    const items = Array.isArray(story?.items) ? story.items : [];
    if (items.length) items.forEach((item) => keys.add(item.link || item.source));
    else (Array.isArray(story?.sources) ? story.sources : []).forEach((source) => keys.add(source));
  });
  return keys.size || stories.reduce((sum, story) => sum + Number(story?.source_count || 0), 0) || 1;
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

function storyCardContext(groupedStories, relatedCount, timelineCount) {
  const group = { primary: groupedStories[0], related: groupedStories.slice(1) };
  const navigationLabel = groupNavigationTopic(group);
  const contextStory = groupedStories.find((story) => (
    story?.story_context?.available
    || Number(story?.story_context?.development_count || 0) > 1
  ));
  const hasConnectedCoverage = relatedCount > 0;
  if (!contextStory && !hasConnectedCoverage) {
    return navigationLabel ? { label: navigationLabel, detail: '' } : null;
  }

  const context = contextStory?.story_context || {};
  const label = String(
    context.display_title
    || context.event_title
    || contextStory?.event_title
    || navigationLabel
    || 'Developing event'
  ).trim();
  const developmentCount = Math.max(
    Number(context.development_count || 0),
    Number(timelineCount || 0),
  );

  if (hasConnectedCoverage) {
    return { label, detail: `${groupedStories.length} connected reports` };
  }
  if (context.stage === 'timeline') {
    return { label, detail: developmentCount > 1 ? `${developmentCount} developments` : 'Timeline' };
  }
  return {
    label,
    detail: developmentCount > 1 ? `${developmentCount} developments` : 'Developing event',
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
  const [stories, setStories] = useState([]);
  const [digestGeneratedAt, setDigestGeneratedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  const [loadingTimelines, setLoadingTimelines] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const [timelineQuery, setTimelineQuery] = useState('');
  const [eventStageFilter, setEventStageFilter] = useState('all');
  const client = useMemo(() => (ENABLE_CLOUD_SETTINGS ? generateClient() : null), []);

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
  const dateStr = useMemo(() => (showDate ? formatDate(new Date()) : ''), [showDate]);
  const availableLocalStates = useMemo(
    () => US_STATES.filter((state) => SUPPORTED_LOCAL_STATE_CODES.has(state.code)),
    []
  );
  const todayGroups = useMemo(() => groupStoriesForToday(stories), [stories]);
  const filteredTimelineEvents = useMemo(() => {
    const query = timelineQuery.trim().toLowerCase();
    return [...timelineEvents]
      .sort((left, right) => {
        const rankDelta = Number(right?.presentation?.rank_score || 0) - Number(left?.presentation?.rank_score || 0);
        if (rankDelta) return rankDelta;
        return String(right?.last_seen_at || '').localeCompare(String(left?.last_seen_at || ''));
      })
      .filter((event) => eventStageFilter === 'all' || (event?.presentation?.stage || event?.event_stage) === eventStageFilter)
      .filter((event) => !query || [
        event?.title,
        event?.canonical_title,
        event?.latest_title,
        event?.search_text,
        ...(Array.isArray(event?.entities) ? event.entities : []),
      ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [timelineEvents, timelineQuery, eventStageFilter]);

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
    document.body.classList.add('is-preload');
    const timeoutId = window.setTimeout(() => {
      document.body.classList.remove('is-preload');
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
      document.body.classList.remove('is-preload');
    };
  }, []);

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
    if (activeCategory !== 'top-stories') return;

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
      } catch (e) {
        setError(e?.message || String(e));
        setStories([]);
        setDigestGeneratedAt('');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== 'timelines') return;

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
      } catch (e) {
        setTimelineError(e?.message || String(e));
        setTimelineEvents([]);
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
    <div id="wrapper" className="fade-in">
      <header id="header">
        <a href="/" className="logo" onClick={(e) => { e.preventDefault(); setActiveCategory('top-stories'); }}>
          Muninn
        </a>
      </header>

      <nav id="nav">
        <div style={{ display: 'flex', alignItems: 'stretch', width: '100%', minWidth: 0 }}>
          <ul className="links news-tabs-scroll" style={{ display: 'flex', flex: '1 1 auto' }}>
            {visibleCategories.map((key) => {
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
                    {key === 'your-newsletter' ? 'Newsletter' : categoryTitles[key]}
                  </a>
                </li>
              );
            })}
          </ul>
          {ENABLE_EXTRA_SECTIONS ? (
            <ul className="links" style={{ flex: '0 0 auto' }}>
              <li className={sectionsModalOpen ? 'active' : ''}>
                <a href="#" style={{ color: '#ffffff' }} onClick={(e) => { e.preventDefault(); setSectionsModalOpen(true); }}>
                  Add News
                </a>
              </li>
            </ul>
          ) : null}
        </div>
      </nav>

      <div id="main">
        <section className={`post ${activeCategory === 'top-stories' ? 'top-stories-post' : ''}`}>
          <header className="major">
            <h1>{title}</h1>
            <div className="header-date">{dateStr}</div>
            {activeCategory === 'timelines' ? <p className="today-intro">Follow stories that are still developing, from their latest update to the broader timeline.</p> : null}
          </header>

          {ENABLE_NEWSLETTERS ? (
          <div id="your-newsletter" className={`category-content ${activeCategory === 'your-newsletter' ? 'active' : ''}`}>
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
              <div className="top-stories-grid">
                {todayGroups.map(({ primary: story, related }, index) => {
                  const groupedStories = [story, ...related];
                  const sourceCount = uniqueSourceCount(groupedStories);
                  const timelineCount = Math.max(...groupedStories.map((item) => Array.isArray(item?.timeline_highlights) ? item.timeline_highlights.length : 0));
                  const imageUrl = story?.image?.url || story?.image?.thumbnail_url || '';
                  const imageRoleLabel = story?.image?.image_role_label
                    || (story?.image?.image_role === 'contextual'
                      ? 'Context image'
                      : story?.image?.image_role === 'illustrative'
                        ? 'Illustration'
                        : '');
                  const isLead = index === 0;
                  const imageCrop = storyImageCropPresentation(story, isLead ? 'wide' : 'tall');
                  const displayTitle = cleanDisplayTitle(story?.title, story?.sources);
                  const cardContext = storyCardContext(groupedStories, related.length, timelineCount);
                  const freshness = formatCardFreshness(digestGeneratedAt);
                  const openStory = () => {
                    const storyIndex = stories.indexOf(story);
                    const storyRef = story?.story_id
                      ? `sid=${encodeURIComponent(story.story_id)}`
                      : `id=${storyIndex}`;
                    window.location.href = `/story.html?${storyRef}`;
                  };

                  return (
                    <article
                      className={`top-story-card ${isLead ? 'is-lead' : ''}`}
                      key={story?.story_id || displayTitle}
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
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                              event.currentTarget.parentElement?.classList.add('is-placeholder');
                            }}
                          />
                        ) : null}
                        {imageUrl && imageRoleLabel ? <span className="top-story-image-role">{imageRoleLabel}</span> : null}
                      </div>

                      <div className="top-story-card-body">
                        <h3 title={displayTitle}>{displayTitle}</h3>

                        {cardContext ? (
                          <div className="top-story-context-label" title={cardContext.detail ? `${cardContext.label} · ${cardContext.detail}` : cardContext.label}>
                            <span className="top-story-timeline-dot" aria-hidden="true" />
                            <span className="top-story-context-name">{cardContext.label}</span>
                            {cardContext.detail ? <span className="top-story-context-detail">{cardContext.detail}</span> : null}
                          </div>
                        ) : null}

                        {related.length ? (
                          <div className="connected-coverage">
                            <span>Also in this event</span>
                            <strong>{cleanDisplayTitle(related[0]?.title, related[0]?.sources)}</strong>
                            {related.length > 1 ? <small>+{related.length - 1} more development{related.length === 2 ? '' : 's'}</small> : null}
                          </div>
                        ) : null}

                        <div className="top-story-card-footer">
                          <div className="top-story-meta">
                            <span>{sourceCount} {sourceCount === 1 ? 'source' : 'sources'}</span>
                            {freshness ? <span>{freshness}</span> : null}
                          </div>
                          <span className="top-story-open">Open story <span aria-hidden="true">→</span></span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>)}
          </div>

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

            {!loadingTimelines && !timelineError && timelineEvents.length === 0 && (
              <div className="news-item">
                <h3>No developing events yet</h3>
                <p>Standalone stories stay on Today. Stories appear here after they receive a meaningful follow-up.</p>
              </div>
            )}

            {!loadingTimelines && !timelineError && timelineEvents.length > 0 && (
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

            {!loadingTimelines && !timelineError && (timelineQuery || eventStageFilter !== 'all') && filteredTimelineEvents.length === 0 ? (
              <div className="timeline-empty-search"><h3>No matching events</h3><p>Try another topic or change the event filter.</p></div>
            ) : null}

            {!loadingTimelines && !timelineError && filteredTimelineEvents.map((event) => {
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
            })}
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
      </div>

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
