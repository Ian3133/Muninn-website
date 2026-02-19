import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getUserState } from './graphql/queries';
import { createUserState, updateUserState } from './graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';
import CustomizeModal from './CustomizeModal';

const client = generateClient();

const categoryTitles = {
  'your-newsletter': 'Your Newsletter',
  'top-stories': 'Top Stories',
  local: 'Local News',
  happy: 'Happy News',
  science: 'Science News',
  other: 'Other News',
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
  { code: 'WY', name: 'Wyoming' }
];

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

export default function LegacyHome() {
  const [activeCategory, setActiveCategory] = useState('top-stories');
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(activeCategory === 'top-stories');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newsletterData, setNewsletterData] = useState({
    comment: '',
    checkbox1: false,
    checkbox2: false,
    checkbox3: false
  });
  const [userId, setUserId] = useState(null);
  const [loadingNewsletter, setLoadingNewsletter] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [localStories, setLocalStories] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [localError, setLocalError] = useState('');

  const title = categoryTitles[activeCategory] || 'Muninn';
  const showDate = activeCategory === 'top-stories';
  const dateStr = useMemo(() => (showDate ? formatDate(new Date()) : ''), [showDate]);

  useEffect(() => {
    // match your template body class behavior
    document.body.classList.add('is-preload');
    return () => document.body.classList.remove('is-preload');
  }, []);

  // Load selected state from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        const response = await client.graphql({
          query: getUserState,
          variables: { id: user.userId }
        });

        if (response.data.getUserState?.selectedState) {
          setSelectedState(response.data.getUserState.selectedState);
          // Also save to localStorage for quick access
          localStorage.setItem('muninn-selected-state', response.data.getUserState.selectedState);
        } else {
          // Fallback to localStorage if not in backend
          const saved = localStorage.getItem('muninn-selected-state');
          if (saved) {
            setSelectedState(saved);
          }
        }
      } catch (e) {
        console.error('Error loading selected state:', e);
        // Fallback to localStorage
        const saved = localStorage.getItem('muninn-selected-state');
        if (saved) {
          setSelectedState(saved);
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
        const user = await getCurrentUser();
        setUserId(user.userId);

        const response = await client.graphql({
          query: getUserState,
          variables: { id: user.userId }
        });

        if (response.data.getUserState) {
          setNewsletterData({
            comment: response.data.getUserState.newsletterComment || '',
            checkbox1: response.data.getUserState.checkbox1 || false,
            checkbox2: response.data.getUserState.checkbox2 || false,
            checkbox3: response.data.getUserState.checkbox3 || false
          });
        }
      } catch (e) {
        console.error('Error loading newsletter preferences:', e);
      } finally {
        setLoadingNewsletter(false);
      }
    })();
  }, [activeCategory]);

  // Load local news when local tab is active and state is selected
  useEffect(() => {
    if (activeCategory !== 'local' || !selectedState) return;

    (async () => {
      try {
        setLocalError('');
        setLoadingLocal(true);

        const res = await fetch(`/Local_news/${selectedState}-news.json`, { cache: 'no-store' });
        if (!res.ok) {
          // File doesn't exist yet
          setLocalError('not-available');
          setLocalStories([]);
          return;
        }

        const data = await res.json();
        const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
        setLocalStories(clusters);
      } catch (e) {
        setLocalError('not-available');
        setLocalStories([]);
      } finally {
        setLoadingLocal(false);
      }
    })();
  }, [activeCategory, selectedState]);

  async function handleSavePreferences(data) {
    if (!userId) return;

    try {
      const existing = await client.graphql({
        query: getUserState,
        variables: { id: userId }
      });

      if (!existing.data.getUserState) {
        await client.graphql({
          query: createUserState,
          variables: {
            input: {
              id: userId,
              newsletterComment: data.comment,
              checkbox1: data.checkbox1,
              checkbox2: data.checkbox2,
              checkbox3: data.checkbox3,
              updatedAt: new Date().toISOString()
            }
          }
        });
      } else {
        await client.graphql({
          query: updateUserState,
          variables: {
            input: {
              id: userId,
              newsletterComment: data.comment,
              checkbox1: data.checkbox1,
              checkbox2: data.checkbox2,
              checkbox3: data.checkbox3,
              updatedAt: new Date().toISOString()
            }
          }
        });
      }

      setNewsletterData(data);
      setModalOpen(false);
    } catch (e) {
      console.error('Error saving preferences:', e);
      alert('Failed to save preferences. Please try again.');
    }
  }

  async function handleStateSelection(stateCode) {
    setSelectedState(stateCode);
    localStorage.setItem('muninn-selected-state', stateCode);

    // Save to backend
    if (!userId) {
      try {
        const user = await getCurrentUser();
        setUserId(user.userId);
        await saveStateToBackend(user.userId, stateCode);
      } catch (e) {
        console.error('Error saving state selection:', e);
      }
    } else {
      await saveStateToBackend(userId, stateCode);
    }
  }

  async function saveStateToBackend(id, stateCode) {
    try {
      const existing = await client.graphql({
        query: getUserState,
        variables: { id }
      });

      if (!existing.data.getUserState) {
        await client.graphql({
          query: createUserState,
          variables: {
            input: {
              id,
              selectedState: stateCode,
              updatedAt: new Date().toISOString()
            }
          }
        });
      } else {
        await client.graphql({
          query: updateUserState,
          variables: {
            input: {
              id,
              selectedState: stateCode,
              updatedAt: new Date().toISOString()
            }
          }
        });
      }
    } catch (e) {
      console.error('Error saving state to backend:', e);
    }
  }

  async function handleChangeState() {
    setSelectedState(null);
    localStorage.removeItem('muninn-selected-state');
    setLocalStories([]);
    setLocalError('');

    // Remove from backend
    if (userId) {
      try {
        const existing = await client.graphql({
          query: getUserState,
          variables: { id: userId }
        });

        if (existing.data.getUserState) {
          await client.graphql({
            query: updateUserState,
            variables: {
              input: {
                id: userId,
                selectedState: null,
                updatedAt: new Date().toISOString()
              }
            }
          });
        }
      } catch (e) {
        console.error('Error removing state from backend:', e);
      }
    }
  }

  return (
    <div id="wrapper" className="fade-in">
      <header id="header">
        <a href="#" className="logo" onClick={(e) => { e.preventDefault(); setActiveCategory('top-stories'); }}>
          Muninn
        </a>
      </header>

      <nav id="nav">
        <ul className="links">
          {Object.keys(categoryTitles).map((key) => (
            <li key={key} className={activeCategory === key ? 'active' : ''}>
              <a
                href="#"
                data-category={key}
                onClick={(e) => { e.preventDefault(); setActiveCategory(key); }}
              >
                {categoryTitles[key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div id="main">
        <section className="post">
          <header className="major">
            <h1>{title}</h1>
            <div className="header-date">{dateStr}</div>
          </header>

          {/* Your Newsletter */}
          <div id="your-newsletter" className={`category-content ${activeCategory === 'your-newsletter' ? 'active' : ''}`}>
            {loadingNewsletter && <div className="loading">Loading preferences...</div>}

            {!loadingNewsletter && (newsletterData.comment || newsletterData.checkbox1 || newsletterData.checkbox2 || newsletterData.checkbox3) && (
              <div className="newsletter-preferences-card">
                <div className="preferences-header">
                  <h3>Your Preferences</h3>
                  <button className="edit-button" onClick={() => setModalOpen(true)}>
                    Edit
                  </button>
                </div>
                <div className="preferences-content">
                  {newsletterData.comment && (
                    <p>Comment: {newsletterData.comment}</p>
                  )}
                  {(newsletterData.checkbox1 || newsletterData.checkbox2 || newsletterData.checkbox3) && (
                    <div className="preferences-options">
                      Options selected: {[
                        newsletterData.checkbox1 && '1',
                        newsletterData.checkbox2 && '2',
                        newsletterData.checkbox3 && '3'
                      ].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!loadingNewsletter && !newsletterData.comment && !newsletterData.checkbox1 && !newsletterData.checkbox2 && !newsletterData.checkbox3 && (
              <div className="news-item">
                <h3>Customize Your Newsletter</h3>
                <p>Click the button below to set your newsletter preferences.</p>
                <button className="customize-button" onClick={() => setModalOpen(true)}>
                  Customize
                </button>
              </div>
            )}
          </div>

          {/* Top Stories */}
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

          {/* Local */}
          <div id="local" className={`category-content ${activeCategory === 'local' ? 'active' : ''}`}>
            {!selectedState ? (
              <div className="news-item state-selector-container">
                <h3>Where are you from?</h3>
                <p>Select your state to see local news tailored to your area.</p>
                <select
                  className="state-selector"
                  onChange={(e) => handleStateSelection(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Select your state</option>
                  {US_STATES.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                {loadingLocal && <div className="loading">Loading local news...</div>}

                {!loadingLocal && localError === 'not-available' && (
                  <div className="news-item">
                    <div className="state-header">
                      <h3>
                        {US_STATES.find(s => s.code === selectedState)?.name || selectedState} News
                      </h3>
                      <button className="change-state-button" onClick={handleChangeState}>
                        Change State
                      </button>
                    </div>
                    <p>
                      We haven't expanded our news pipeline to cover {US_STATES.find(s => s.code === selectedState)?.name} yet,
                      but we're working on it! Check back soon for local news from your area.
                    </p>
                  </div>
                )}

                {!loadingLocal && !localError && localStories.length === 0 && (
                  <div className="news-item">
                    <div className="state-header">
                      <h3>
                        {US_STATES.find(s => s.code === selectedState)?.name || selectedState} News
                      </h3>
                      <button className="change-state-button" onClick={handleChangeState}>
                        Change State
                      </button>
                    </div>
                    <p>No local stories available right now. Check back later for updates.</p>
                  </div>
                )}

                {!loadingLocal && !localError && localStories.map((story, index) => (
                  <div className="news-item" key={index}>
                    {index === 0 && (
                      <div className="state-header">
                        <h3 style={{ marginBottom: '1rem' }}>
                          {US_STATES.find(s => s.code === selectedState)?.name || selectedState} News
                        </h3>
                        <button className="change-state-button" onClick={handleChangeState}>
                          Change State
                        </button>
                      </div>
                    )}
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
              </>
            )}
          </div>

          {/* Happy */}
          <div id="happy" className={`category-content ${activeCategory === 'happy' ? 'active' : ''}`}>
            <div className="news-item">
              <h3>No happy stories available</h3>
              <p>Check back later for happy news.</p>
            </div>
          </div>

          {/* Science */}
          <div id="science" className={`category-content ${activeCategory === 'science' ? 'active' : ''}`}>
            <div className="news-item">
              <h3>No science stories available</h3>
              <p>Check back later for science updates.</p>
            </div>
          </div>

          {/* Other */}
          <div id="other" className={`category-content ${activeCategory === 'other' ? 'active' : ''}`}>
            <div className="news-item">
              <h3>No other stories available</h3>
              <p>Check back later for updates.</p>
            </div>
          </div>
        </section>
      </div>

      <div id="copyright">
        <ul><li>&copy; Muninn</li></ul>
      </div>

      <CustomizeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePreferences}
        initialData={newsletterData}
      />
    </div>
  );
}
