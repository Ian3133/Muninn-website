import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getUserState } from './graphql/queries';
import { createUserState, updateUserState } from './graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';
import NewsletterWizardModal from './NewsletterWizardModal';
import NewsSectionsModal from './NewsSectionsModal';

const client = generateClient();

const PINNED_CATEGORY_ORDER = ['your-newsletter', 'top-stories'];
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
const DEFAULT_CUSTOM_SELECTED = ['local', 'happy', 'science'];
const SECTION_STORAGE_KEY = 'muninn-selected-sections';
const STATE_STORAGE_KEY = 'muninn-selected-state';
const NOTE_TEXT_PREFIX = '[muninn-sections]';
const NEWSLETTER_TEXT_PREFIX = '[muninn-newsletters]';

const categoryTitles = {
  'top-stories': 'Top Stories',
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

function formatDate(d) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

export default function LegacyHome() {
  const [activeCategory, setActiveCategory] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const requested = (params.get('category') || '').trim();
      const allowed = [...PINNED_CATEGORY_ORDER, ...CUSTOMIZABLE_CATEGORY_ORDER];
      if (allowed.includes(requested)) return requested;
    } catch (_e) {
      // no-op
    }
    return 'top-stories';
  });
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sectionsModalOpen, setSectionsModalOpen] = useState(false);
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false);
  const [newsletterDraft, setNewsletterDraft] = useState(null);
  const [newsletters, setNewsletters] = useState([]);
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

  const visibleCategories = useMemo(
    () => [...PINNED_CATEGORY_ORDER, ...selectedSections],
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

        const backendSections = parseSectionsFromNoteText(backendState?.noteText);
        if (backendSections !== null) {
          setSelectedSections(backendSections);
          localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(backendSections));
        } else {
          const localSections = parseSectionsFromLocalStorage();
          if (localSections !== null) setSelectedSections(localSections);
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
        const localSections = parseSectionsFromLocalStorage();
        if (localSections !== null) setSelectedSections(localSections);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeCategory !== 'top-stories') return;

    (async () => {
      try {
        setError('');
        setLoading(true);

        const res = await fetch('/Current_news/digest.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load digest.json (${res.status})`);
        const data = await res.json();

        const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
        setStories(clusters.slice(0, 20));
      } catch (e) {
        setError(e?.message || String(e));
        setStories([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== 'your-newsletter') return;

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

        const res = await fetch(`/Local_news/${selectedState}-news.json`, { cache: 'no-store' });
        if (!res.ok) {
          setLocalError('load-failed');
          setLocalStories([]);
          return;
        }

        const data = await res.json();
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

        const res = await fetch('/Current_news/happy_digest.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load happy_digest.json (${res.status})`);
        const data = await res.json();
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

        const res = await fetch('/Current_news/ai_digest.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load ai_digest.json (${res.status})`);
        const data = await res.json();
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

        const res = await fetch('/Current_news/health_digest.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load health_digest.json (${res.status})`);
        const data = await res.json();
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
    if (selectedSections.includes(activeCategory)) return;

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
    if (userId) return userId;
    const user = await getCurrentUser();
    setUserId(user.userId);
    return user.userId;
  }

  async function saveNewslettersToBackend(nextNewsletters) {
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
      alert('Generation request saved. This will run once the pipeline is wired up.');
    }
  }

  async function handleDeleteNewsletter(id) {
    const next = newsletters.filter((entry) => entry.id !== id);
    setNewsletters(next);
    await saveNewslettersToBackend(next);
  }

  async function handleGenerateNow(id) {
    const next = newsletters.map((entry) => {
      if (entry.id !== id) return entry;
      return { ...entry, lastGeneratedAt: new Date().toISOString() };
    });
    setNewsletters(next);
    await saveNewslettersToBackend(next);
    alert('Generation request saved. This will run once the pipeline is wired up.');
  }

  async function saveSectionsToBackend(nextSections) {
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

    try {
      const id = await ensureUserId();
      await saveStateToBackend(id, stateCode);
    } catch (e) {
      console.error('Error saving state selection:', e);
    }
  }

  async function saveStateToBackend(id, stateCode) {
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

    if (!userId) return;

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
        <a href="#" className="logo" onClick={(e) => { e.preventDefault(); setActiveCategory('top-stories'); }}>
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
                    href="#"
                    data-category={key}
                    onClick={(e) => { e.preventDefault(); setActiveCategory(key); }}
                  >
                    {categoryTitles[key]}
                  </a>
                </li>
              );
            })}
          </ul>
          <ul className="links" style={{ flex: '0 0 auto' }}>
            <li className={sectionsModalOpen ? 'active' : ''}>
              <a href="#" style={{ color: '#ffffff' }} onClick={(e) => { e.preventDefault(); setSectionsModalOpen(true); }}>
                Add News
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div id="main">
        <section className="post">
          <header className="major">
            <h1>{title}</h1>
            <div className="header-date">{dateStr}</div>
          </header>

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

            {!loading && !error && stories.map((story, index) => (
              <div className="news-item" key={index}>
                <h3
                  onClick={() => { window.location.href = `/story.html?id=${index}`; }}
                  style={{ cursor: 'pointer' }}
                  title={story?.title}
                >
                  {story?.title}
                </h3>

                <div className="news-item-content-row">
                  <div className="news-item-text">
                    <p>{truncateText(story?.summary || '', 350)}</p>
                  </div>

                  {story?.image?.url || story?.image?.thumbnail_url ? (
                    <div className="news-item-image">
                      <img
                        src={story.image.url || story.image.thumbnail_url}
                        alt={story.image.title || story.title || 'Story image'}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
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
          { key: 'top-stories', label: 'Top Stories' },
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

      <NewsSectionsModal
        isOpen={sectionsModalOpen}
        onClose={() => setSectionsModalOpen(false)}
        onSave={handleSaveSections}
        options={addNewsOptions}
        selectedKeys={selectedSections}
      />
    </div>
  );
}
