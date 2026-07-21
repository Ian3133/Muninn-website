import { useEffect, useMemo, useState } from 'react';

const DATA_PATHS = {
  queue: ['/Current_news/event_review_queue.json', '/current_news/event_review_queue.json'],
  timelines: ['/Current_news/event_timelines.json', '/current_news/event_timelines.json'],
  digest: ['/Current_news/digest.json', '/current_news/digest.json'],
};

function humanize(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Date unavailable';
  const parsed = new Date(String(value).length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(parsed);
}

const QUALITY_STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'after', 'amid', 'into', 'over', 'event', '2026']);

function qualityTokens(value) {
  return new Set(String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((token) => token.length > 2 && !QUALITY_STOP_WORDS.has(token)));
}

function sharedTokenCount(left, right) {
  const leftTokens = qualityTokens(left);
  const rightTokens = qualityTokens(right);
  return [...leftTokens].filter((token) => rightTokens.has(token)).length;
}

function clustersLookRelated(left, right) {
  if (String(left?.category || '') !== String(right?.category || '')) return false;
  const shared = sharedTokenCount(left?.title, right?.title);
  const smaller = Math.min(qualityTokens(left?.title).size, qualityTokens(right?.title).size) || 1;
  return shared >= 4 && shared / smaller >= 0.45;
}

async function fetchJson(paths) {
  let lastError;
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${path} returned ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json')) throw new Error(`${path} returned the application shell`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Data file is unavailable');
}

function gateLabel(key) {
  const labels = {
    same_event: 'Classified as the same event',
    ai_classified: 'Reviewed by the source-grounded AI classifier',
    high_confidence: 'Confidence is at least 80%',
    two_independent_sources: 'Reported by two independent sources',
    two_recognized_sources: 'Two sources are recognized outlets',
    grounded_development: 'Proposed node is grounded in the evidence',
  };
  return labels[key] || humanize(key);
}

function Confidence({ value }) {
  const percent = Math.round(Number(value || 0) * 100);
  return (
    <div className="confidence-block">
      <strong>{percent}%</strong><span>confidence</span>
      <div className="confidence-bar"><i style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div>
    </div>
  );
}

function ReviewCard({ item, initiallyOpen }) {
  const relation = item.classification?.relation || 'unclassified';
  const status = item.review_status || item.verification?.status || 'pending';
  const proposed = item.classification?.proposed_development || {};
  const requirements = item.verification?.requirements || {};
  const citations = Array.isArray(item.citations) ? item.citations : [];
  const window = item.date_window || {};
  return (
    <details className="review-card" open={initiallyOpen}>
      <summary>
        <div>
          <div className="card-kickers">
            <span className={`badge badge-${status}`}>{humanize(status)}</span>
            <span className={`badge badge-${relation}`}>{humanize(relation)}</span>
            <span className="gap-label">{humanize(item.gap_type || 'evidence gap')}</span>
          </div>
          <h2>{item.event_title || 'Untitled event'}</h2>
          <p className="candidate-title">{proposed.title || 'No publishable development proposed yet'}</p>
        </div>
        <Confidence value={item.classification?.confidence} />
      </summary>
      <div className="card-body">
        <div className="meta-row">
          <span className="meta-chip">Window: {formatDate(window.from)} – {formatDate(window.to)}</span>
          <span className="meta-chip">{citations.length} citation{citations.length === 1 ? '' : 's'}</span>
          <span className="meta-chip">{item.classification?.model || item.classification?.classifier || 'Classifier unavailable'}</span>
        </div>
        <div className="review-grid">
          <div className="panel">
            <h3>Proposed timeline node</h3>
            <div className="proposed-title">{proposed.title || 'No proposed node'}</div>
            <p>{proposed.summary || 'The evidence did not support a publishable summary.'}</p>
            {item.classification?.rationale ? <p className="rationale">{item.classification.rationale}</p> : null}
          </div>
          <div className="panel">
            <h3>Verification gates</h3>
            <ul className="gate-list">
              {Object.entries(requirements).map(([key, passed]) => (
                <li className={passed ? 'gate-pass' : 'gate-fail'} key={key}>
                  <span className="gate-icon">{passed ? '✓' : '×'}</span><span>{gateLabel(key)}</span>
                </li>
              ))}
              {!Object.keys(requirements).length ? <li>No gate results were recorded.</li> : null}
            </ul>
          </div>
        </div>
        <div className="panel">
          <h3>Source evidence</h3>
          <div className="citation-list">
            {citations.map((citation, index) => (
              <a className="citation" href={citation.url || '#'} target="_blank" rel="noopener noreferrer" key={citation.url || index}>
                <span className="citation-source">{citation.source || 'Unknown source'}</span>
                <strong>{citation.title || 'Untitled evidence'}</strong>
                <time>{formatDate(citation.published_at)}</time>
              </a>
            ))}
            {!citations.length ? <p>No citations were stored with this candidate.</p> : null}
          </div>
        </div>
        <div className="card-footer">
          <span>Packet {item.packet_id || 'unknown'} · queued {formatDate(item.queued_at, true)}</span>
          <a className="timeline-link" href={`/timeline.html?event=${encodeURIComponent(item.event_id || '')}`}>Open current timeline →</a>
        </div>
      </div>
    </details>
  );
}

function TimelineCard({ event }) {
  const presentation = event.presentation || {};
  const timeline = Array.isArray(event.timeline) ? event.timeline : [];
  const latest = timeline[timeline.length - 1] || {};
  const dateCount = presentation.date_count ?? new Set(timeline.map((entry) => entry.date).filter(Boolean)).size;
  const sourceCount = presentation.source_count ?? new Set(timeline.flatMap((entry) => entry.source_urls || []).filter(Boolean)).size;
  return (
    <article className="catalog-card timeline-catalog-card">
      <div className="catalog-card-top">
        <span className={`badge badge-${event.status || 'active'}`}>{humanize(event.status || 'active')}</span>
        <span className="catalog-date">Updated {formatDate(event.last_seen_at || presentation.latest_date)}</span>
      </div>
      <h2>{event.canonical_title || event.title || 'Untitled timeline'}</h2>
      <p>{presentation.context_summary || event.latest_summary || event.summary || 'No context summary is available.'}</p>
      <div className="catalog-stats">
        <span><strong>{presentation.development_count ?? timeline.length}</strong> developments</span>
        <span><strong>{dateCount}</strong> dates</span>
        <span><strong>{sourceCount}</strong> sources</span>
      </div>
      {latest.title ? <div className="latest-development"><small>Latest development</small><strong>{latest.title}</strong></div> : null}
      <a className="catalog-link" href={`/timeline.html?event=${encodeURIComponent(event.event_id || '')}`}>Open timeline →</a>
    </article>
  );
}

function ClusterCard({ cluster }) {
  const sources = Array.isArray(cluster.sources) ? cluster.sources : [];
  const confidence = Number(cluster.event_match_confidence || 0);
  const hasPriorContext = Boolean(cluster.story_context?.available)
    || (Array.isArray(cluster.timeline_highlights) && cluster.timeline_highlights.length > 0);
  return (
    <article className="catalog-card cluster-catalog-card">
      <div className="catalog-card-top">
        <span className="badge badge-cluster">{cluster.category || 'Top story'}</span>
        <span className="catalog-date">{cluster.source_count || sources.length} sources</span>
      </div>
      <h2>{cluster.title || 'Untitled cluster'}</h2>
      <p>{cluster.summary || 'No summary is available.'}</p>
      <div className="source-chip-row">
        {sources.slice(0, 5).map((source) => <span className="source-chip" key={source}>{source}</span>)}
      </div>
      <div className="cluster-match">
        <span>{hasPriorContext ? 'Matched existing event' : cluster.event_id ? 'New event thread' : 'New event candidate'}</span>
        <strong>{hasPriorContext ? `${Math.round(confidence * 100)}% match` : cluster.event_id ? 'Thread created' : 'Not linked'}</strong>
      </div>
      {cluster.event_id ? <a className="catalog-link" href={`/timeline.html?event=${encodeURIComponent(cluster.event_id)}`}>Open matched timeline →</a> : null}
    </article>
  );
}

function QualityIssueCard({ tone, label, count, description, examples }) {
  return (
    <article className={`quality-issue-card quality-${tone}`}>
      <div><span>{label}</span><strong>{count}</strong></div>
      <p>{description}</p>
      {examples.length ? <ul>{examples.slice(0, 3).map((example) => <li key={example}>{example}</li>)}</ul> : <small>No problems detected in the current digest.</small>}
    </article>
  );
}

export default function AdminReview({ accountLabel, onSignOut, localPreview = false }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [payloads, setPayloads] = useState({ queue: null, timelines: null, digest: null });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [relation, setRelation] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    let mounted = true;
    Promise.all(Object.entries(DATA_PATHS).map(async ([key, paths]) => {
      try {
        return [key, await fetchJson(paths), null];
      } catch (error) {
        return [key, null, error.message];
      }
    })).then((results) => {
      if (!mounted) return;
      const nextPayloads = {};
      const nextErrors = {};
      results.forEach(([key, payload, error]) => {
        nextPayloads[key] = payload;
        if (error) nextErrors[key] = error;
      });
      setPayloads(nextPayloads);
      setErrors(nextErrors);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const queueItems = Array.isArray(payloads.queue?.items) ? payloads.queue.items : [];
  const timelineItems = Array.isArray(payloads.timelines?.events) ? payloads.timelines.events : [];
  const clusterItems = Array.isArray(payloads.digest?.clusters) ? payloads.digest.clusters : [];
  const activeItems = activeTab === 'queue' ? queueItems : activeTab === 'timelines' ? timelineItems : activeTab === 'clusters' ? clusterItems : [];

  const qualityIssues = useMemo(() => {
    const duplicatePairs = [];
    clusterItems.forEach((cluster, index) => {
      clusterItems.slice(index + 1).forEach((candidate) => {
        if (clustersLookRelated(cluster, candidate)) duplicatePairs.push(`${cluster.title} / ${candidate.title}`);
      });
    });
    const weakSources = clusterItems.filter((cluster) => Number(cluster.source_count || cluster.sources?.length || 0) < 2);
    const categoryIssues = clusterItems.filter((cluster) => !cluster.category || String(cluster.category).toLowerCase() === 'top story');
    const suspiciousMatches = clusterItems.filter((cluster) => cluster.event_id
      && Array.isArray(cluster.timeline_highlights) && cluster.timeline_highlights.length > 1
      && sharedTokenCount(cluster.title, String(cluster.event_id).replace(/^event_/, '')) < 2);
    return [
      { tone: 'warning', label: 'Possible duplicate coverage', count: duplicatePairs.length, description: 'Headlines that may belong to one reader-facing story.', examples: duplicatePairs },
      { tone: 'danger', label: 'Weakly sourced stories', count: weakSources.length, description: 'Published stories supported by only one source.', examples: weakSources.map((item) => item.title) },
      { tone: 'warning', label: 'Category cleanup', count: categoryIssues.length, description: 'Stories using a generic or missing category.', examples: categoryIssues.map((item) => item.title) },
      { tone: 'danger', label: 'Suspicious timeline matches', count: suspiciousMatches.length, description: 'The story title and stored event identifier appear misaligned.', examples: suspiciousMatches.map((item) => item.title) },
    ];
  }, [clusterItems]);
  const qualityIssueCount = qualityIssues.reduce((sum, issue) => sum + issue.count, 0);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return activeItems.filter((item) => {
      const itemStatus = item.review_status || item.verification?.status || item.status || 'pending';
      const itemRelation = item.classification?.relation;
      const text = JSON.stringify({
        title: item.event_title || item.canonical_title || item.title,
        proposed: item.classification?.proposed_development,
        sources: item.citations || item.sources,
        latest: item.latest_title,
      }).toLowerCase();
      return (!needle || text.includes(needle))
        && (activeTab !== 'queue' || relation === 'all' || itemRelation === relation)
        && (activeTab !== 'queue' || status === 'all' || itemStatus === status);
    });
  }, [activeItems, activeTab, relation, search, status]);

  const pending = queueItems.filter((item) => (item.review_status || 'pending') === 'pending').length;
  const sameEvent = queueItems.filter((item) => item.classification?.relation === 'same_event').length;
  const sourceFailures = queueItems.filter((item) => item.verification?.requirements?.two_recognized_sources === false).length;
  const averageConfidence = queueItems.length
    ? Math.round(queueItems.reduce((sum, item) => sum + Number(item.classification?.confidence || 0), 0) * 100 / queueItems.length)
    : 0;

  const labels = {
    overview: { title: 'Quality overview', empty: 'No reader-facing quality issues detected' },
    queue: { title: 'Review queue', empty: 'No evidence matches these filters' },
    timelines: { title: 'Published timelines', empty: 'No published timelines match this search' },
    clusters: { title: "Today's clusters", empty: 'No current clusters match this search' },
  };

  return (
    <div className="admin-review-app">
      <link rel="stylesheet" href="/admin-review.css" />
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark"><img className="brand-mark-image" src="/brand/muninn-mark-dark.svg" alt="" /></span><span>Muninn</span></a>
        <div className="topbar-meta"><span className="environment-dot" />Timeline administration</div>
        <div className="admin-account-links">
          <a className="reader-link" href="/">Back to reader</a>
          {onSignOut ? <button type="button" onClick={onSignOut}>Sign out</button> : null}
        </div>
      </header>

      <main className="page-shell">
        <section className="page-heading">
          <div><p className="eyebrow">Reader quality control</p><h1>Story desk</h1><p className="heading-copy">Fix what readers may notice first, then inspect the evidence behind it.</p></div>
          <div className="heading-status"><span className="read-only-pill">Read-only</span><span>{localPreview ? 'Local authenticated-layout preview' : accountLabel}</span></div>
        </section>

        {payloads.queue?.mode === 'demo' ? <div className="notice demo-notice"><strong>Demo evidence.</strong> The review tab is showing a sample packet until the search workflow publishes a real queue.</div> : null}
        <nav className="admin-tabs" aria-label="Admin data views">
          {[
            ['overview', 'Needs attention', qualityIssueCount],
            ['queue', 'Review queue', queueItems.length],
            ['timelines', 'Published timelines', timelineItems.length],
            ['clusters', "Today's clusters", clusterItems.length],
          ].map(([key, label, count]) => (
            <button className={activeTab === key ? 'active' : ''} type="button" onClick={() => { setActiveTab(key); setSearch(''); }} key={key}>
              <span>{label}</span><strong>{count}</strong>
            </button>
          ))}
        </nav>

        {activeTab === 'overview' ? (
          <>
            <section className="quality-hero">
              <div><span>Current reader experience</span><strong>{qualityIssueCount ? `${qualityIssueCount} signals need attention` : 'Looking healthy'}</strong><p>Checks cover duplicate coverage, sourcing, categories, and timeline consistency.</p></div>
              <a href="/">Preview Today →</a>
            </section>
            <section className="quality-grid" aria-label="Reader-facing quality signals">
              {qualityIssues.map((issue) => <QualityIssueCard {...issue} key={issue.label} />)}
            </section>
          </>
        ) : null}

        {activeTab === 'queue' ? (
          <section className="stats-grid" aria-label="Queue summary">
            <article className="stat-card"><span>Pending review</span><strong>{pending}</strong><small>Needs a human decision</small></article>
            <article className="stat-card"><span>Same-event candidates</span><strong>{sameEvent}</strong><small>AI believes these continue a thread</small></article>
            <article className="stat-card"><span>Source-gate failures</span><strong>{sourceFailures}</strong><small>Not enough recognized outlets</small></article>
            <article className="stat-card"><span>Average confidence</span><strong>{averageConfidence}%</strong><small>Across review candidates</small></article>
          </section>
        ) : null}

        {activeTab !== 'overview' ? <section className={`toolbar ${activeTab !== 'queue' ? 'catalog-toolbar' : ''}`} aria-label="Admin filters">
          <label className="search-field"><span>Search {labels[activeTab].title.toLowerCase()}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={activeTab === 'queue' ? 'Event, source, or proposed development' : 'Title, source, or event'} /></label>
          {activeTab === 'queue' ? <>
            <label><span>Relationship</span><select value={relation} onChange={(event) => setRelation(event.target.value)}><option value="all">All relationships</option><option value="same_event">Same event</option><option value="related_topic">Related topic</option><option value="unrelated">Unrelated</option></select></label>
            <label><span>Review status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
          </> : null}
          <button type="button" onClick={() => { setSearch(''); setRelation('all'); setStatus('all'); }}>Clear filters</button>
        </section> : null}

        {activeTab !== 'overview' ? <div className="queue-summary"><strong>{filteredItems.length} {activeTab === 'queue' ? 'candidate' : activeTab === 'timelines' ? 'timeline' : 'cluster'}{filteredItems.length === 1 ? '' : 's'}</strong><span>{labels[activeTab].title}</span></div> : null}
        {activeTab === 'overview' ? null : loading ? <div className="loading-state">Loading admin data…</div> : errors[activeTab] ? <div className="error-state"><h2>Unable to load {labels[activeTab].title.toLowerCase()}</h2><p>{errors[activeTab]}</p></div> : filteredItems.length ? (
          <section className={activeTab === 'queue' ? 'review-list' : 'catalog-grid'}>
            {activeTab === 'queue' ? filteredItems.map((item, index) => <ReviewCard item={item} initiallyOpen={index === 0} key={item.packet_id || index} />) : null}
            {activeTab === 'timelines' ? filteredItems.map((event) => <TimelineCard event={event} key={event.event_id} />) : null}
            {activeTab === 'clusters' ? filteredItems.map((cluster, index) => <ClusterCard cluster={cluster} key={cluster.cluster_id || index} />) : null}
          </section>
        ) : <div className="empty-state"><h2>{labels[activeTab].empty}</h2><p>Clear the search or wait for the next pipeline run.</p></div>}
      </main>
    </div>
  );
}

export function AdminAccessDenied({ onSignOut }) {
  return (
    <div className="admin-review-app">
      <link rel="stylesheet" href="/admin-review.css" />
      <main className="access-shell">
        <div className="brand-mark"><img className="brand-mark-image" src="/brand/muninn-mark.svg" alt="" /></div><p className="eyebrow">Muninn administration</p><h1>Admin access required</h1>
        <p>Your account is signed in but is not in the configured admin group or email allowlist.</p>
        <div><a href="/">Return to Muninn</a>{onSignOut ? <button type="button" onClick={onSignOut}>Sign out</button> : null}</div>
      </main>
    </div>
  );
}
