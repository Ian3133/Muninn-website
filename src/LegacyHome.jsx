import { useEffect, useMemo, useState } from 'react';

const categoryTitles = {
  'your-newsletter': 'Your Newsletter',
  'top-stories': 'Top Stories',
  local: 'Local News',
  happy: 'Happy News',
  science: 'Science News',
  other: 'Other News',
};

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

  const title = categoryTitles[activeCategory] || 'Muninn';
  const showDate = activeCategory === 'top-stories';
  const dateStr = useMemo(() => (showDate ? formatDate(new Date()) : ''), [showDate]);

  useEffect(() => {
    // match your template body class behavior
    document.body.classList.add('is-preload');
    return () => document.body.classList.remove('is-preload');
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
            <div className="news-item">
              <h3>No newsletter stories available</h3>
              <p>Check back later for newsletter updates.</p>
            </div>
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
            <div className="news-item">
              <h3>No local stories available</h3>
              <p>Check back later for local news.</p>
            </div>
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
    </div>
  );
}
