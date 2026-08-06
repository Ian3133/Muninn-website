import React, { useEffect, useMemo, useState } from 'react';
import './WeeklyNewsletterPreview.css';

const WEEKLY_URL = '/Current_news/weekly_newsletter.json';
const PREVIEW_URL = '/Current_news/weekly_newsletter-preview.json';

function readerHref(value = '', edition = '') {
  if (!/^\/(?:story|timeline)\.html/i.test(value)) return value;
  const url = new URL(value, window.location.origin);
  const params = new URLSearchParams();
  if (/\/story\.html$/i.test(url.pathname)) {
    params.set('view', 'story');
    if (url.searchParams.get('sid')) params.set('sid', url.searchParams.get('sid'));
    if (url.searchParams.get('archiveDate')) params.set('archiveDate', url.searchParams.get('archiveDate'));
  } else {
    params.set('view', 'event');
    if (url.searchParams.get('event')) params.set('event', url.searchParams.get('event'));
  }
  if (edition) params.set('edition', edition);
  return `/?${params.toString()}`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function Paragraph({ paragraph, linkInternal = true, edition = '' }) {
  return (
    <p>
      {(paragraph?.segments || []).map((segment, index) => {
        const key = `${segment.kind || 'text'}-${index}`;
        const internal = /^\/(?:story|timeline)\.html/i.test(segment.href || '');
        if (segment.href && (linkInternal || !internal)) {
          const external = /^https?:\/\//i.test(segment.href);
          return (
            <a
              href={readerHref(segment.href, edition)}
              key={key}
              {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {segment.text}
            </a>
          );
        }
        return <React.Fragment key={key}>{segment.text}</React.Fragment>;
      })}
    </p>
  );
}

function SectionImage({ image }) {
  if (!image?.url) return null;
  const creditParts = [image.source, image.author].filter(Boolean);
  if (
    image.is_ai_generated
    && !creditParts.some((part) => /ai illustration/i.test(part))
  ) {
    creditParts.push('AI illustration');
  }
  const credit = [...new Set(creditParts)].join(' \u00b7 ');
  return (
    <figure className="weekly-preview-image">
      <img src={image.url} alt={image.alt || ''} />
      {credit ? <figcaption>{credit}</figcaption> : null}
    </figure>
  );
}

function RelatedCoverage({ section, edition = '' }) {
  const unique = useMemo(() => {
    const seen = new Set();
    const links = [];
    (section?.paragraphs || []).forEach((paragraph) => {
      (paragraph?.segments || []).forEach((segment) => {
        if (
          !segment?.href
          || seen.has(segment.href)
          || !/^\/(?:story|timeline)\.html/i.test(segment.href)
        ) return;
        seen.add(segment.href);
        links.push({
          href: readerHref(segment.href, edition),
          label: segment.text.trim(),
          kind: segment.kind === 'event' ? 'Timeline' : 'Story',
        });
      });
    });
    return links;
  }, [edition, section]);

  if (!unique.length) return null;
  return (
    <nav className="weekly-preview-related" aria-label={`Muninn coverage for ${section.title}`}>
      <p>Related Muninn coverage</p>
      <ul>
        {unique.map((link) => (
          <li key={link.href}>
            <a href={link.href}>
              <span>{link.kind}</span>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function WeeklyCover({ cover }) {
  const credit = [...new Set([cover?.source, cover?.author].filter(Boolean))]
    .join(' \u00b7 ');
  if (!cover?.url) return null;
  return (
    <figure className="weekly-preview-intro-cover">
      <img alt={cover.alt || ''} src={cover.url} />
      {credit ? <figcaption>{credit}</figcaption> : null}
    </figure>
  );
}

export function WeeklyIssue({ issue, embedded = false, preview = false }) {
  const coverageWindow = issue.coverage_window || {};
  const edition = issue.edition_id || coverageWindow.end_date || '';
  const article = (
    <article className={`weekly-preview-issue${embedded ? ' weekly-letter-embedded' : ''}`}>
      <header className="weekly-preview-masthead">
        <p className="weekly-preview-publication">{issue.publication || 'Muninn Weekly'}</p>
        <p className="weekly-preview-edition">
          {formatDate(coverageWindow.start_date)}&ndash;{formatDate(coverageWindow.end_date)}
          <span aria-hidden="true"> &middot; </span>
          {issue.reading_time_minutes || 5} min read
        </p>
        <div className="weekly-preview-hero">
          <div className="weekly-preview-hero-copy">
            <h1>{issue.headline}</h1>
            <p className="weekly-preview-dek">{issue.dek}</p>
            <div className="weekly-preview-intro">
              {(issue.introduction || []).map((paragraph, index) => (
                <Paragraph paragraph={paragraph} edition={edition} key={`intro-${index}`} />
              ))}
            </div>
          </div>
          <WeeklyCover cover={issue.cover_image} />
        </div>
      </header>

      {(issue.sections || []).map((section, index) => (
        <section
          className={`weekly-preview-section${section.image ? ' has-image' : ''}${index === 0 ? ' is-lead' : ''}`}
          key={`${section.title}-${index}`}
        >
          <div className="weekly-preview-section-rule" aria-hidden="true">
            <span>{String(index + 1).padStart(2, '0')}</span>
          </div>
          <div className="weekly-preview-section-heading">
            {section.kicker ? <p className="weekly-preview-kicker">{section.kicker}</p> : null}
            <h2>{section.title}</h2>
          </div>
          <div className="weekly-preview-section-body">
            <div className="weekly-preview-prose">
              <SectionImage image={section.image} />
              {(section.paragraphs || []).map((paragraph, paragraphIndex) => (
                <Paragraph
                  paragraph={paragraph}
                  linkInternal={false}
                  edition={edition}
                  key={`${section.title}-paragraph-${paragraphIndex}`}
                />
              ))}
            </div>
            <RelatedCoverage section={section} edition={edition} />
          </div>
        </section>
      ))}

      <footer className="weekly-preview-footer">
        <p>
          Generated from {issue.coverage_health?.edition_count || 0} daily editions and
          validated before publication.
        </p>
        {!embedded ? <a href="/?view=weekly">Read this edition in Letter</a> : null}
      </footer>
    </article>
  );

  if (embedded) return article;

  return (
    <div className="weekly-preview-shell">
      <header className="weekly-preview-site-header">
        <a className="weekly-preview-brand" href="/">Muninn</a>
        {preview ? <span className="weekly-preview-draft">Draft preview &middot; not published</span> : null}
      </header>
      <main>{article}</main>
    </div>
  );
}

export default function WeeklyLetter({ embedded = true, preview = false, sourceUrl = '' }) {
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(sourceUrl || (preview ? PREVIEW_URL : WEEKLY_URL), { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Weekly edition returned ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (active) setIssue(data);
      })
      .catch(() => {
        if (active) setError('The weekly Letter could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [preview, sourceUrl]);

  if (error) {
    return (
      <section className="weekly-preview-state weekly-letter-state">
        <h1>Letter unavailable</h1>
        <p>{error}</p>
      </section>
    );
  }

  if (!issue) {
    return (
      <section className="weekly-preview-state weekly-letter-state" aria-live="polite">
        <p>Preparing Muninn Weekly&hellip;</p>
      </section>
    );
  }

  return <WeeklyIssue embedded={embedded} issue={issue} preview={preview} />;
}
