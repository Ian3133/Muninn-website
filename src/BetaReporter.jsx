import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import './BetaReporter.css';
import {
  collectBetaEvidence,
  diagnosticsSummary,
  elementSelector,
  redactText,
} from './betaDiagnostics';
import { submitBetaIssue } from './betaReports';

const CATEGORIES = [
  ['DISPLAY', 'Looks wrong'],
  ['CONTENT', 'News or wording'],
  ['FUNCTION', "Didn't work"],
  ['OTHER', 'Something else'],
];

function createIssueId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `beta-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canvasBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.78);
  });
}

async function captureViewport(annotation) {
  const scale = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
  const canvas = await html2canvas(document.body, {
    allowTaint: false,
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
    height: window.innerHeight,
    ignoreElements: (element) => element.hasAttribute?.('data-beta-reporter'),
    logging: false,
    scale,
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    useCORS: true,
    width: window.innerWidth,
    windowHeight: window.innerHeight,
    windowWidth: window.innerWidth,
    x: window.scrollX,
    y: window.scrollY,
  });

  if (annotation?.rect) {
    const context = canvas.getContext('2d');
    const rect = annotation.rect;
    context.save();
    context.strokeStyle = '#dc4d37';
    context.fillStyle = 'rgba(220, 77, 55, 0.12)';
    context.lineWidth = Math.max(3, 3 * scale);
    context.fillRect(rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale);
    context.strokeRect(rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale);
    context.restore();
  }

  const blob = await canvasBlob(canvas);
  if (!blob) throw new Error('The browser could not encode the screenshot.');
  return blob;
}

function annotationFor(element) {
  const rect = element.getBoundingClientRect();
  return {
    label: redactText(
      element.getAttribute('aria-label') || element.textContent?.replace(/\s+/g, ' ').trim() || element.tagName,
      240,
    ),
    selector: elementSelector(element),
    tagName: element.tagName.toLowerCase(),
    rect: {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      documentLeft: Math.round(rect.left + window.scrollX),
      documentTop: Math.round(rect.top + window.scrollY),
    },
  };
}

export default function BetaReporter({ cloudEnabled = false, guestMode = false }) {
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [category, setCategory] = useState('FUNCTION');
  const [description, setDescription] = useState('');
  const [annotation, setAnnotation] = useState(null);
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedIssue, setSavedIssue] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open && !savedIssue) window.setTimeout(() => textareaRef.current?.focus(), 80);
  }, [open, savedIssue]);

  useEffect(() => {
    if (!open && !marking) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (marking) setMarking(false);
      else setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [marking, open]);

  useEffect(() => {
    if (!marking) return undefined;
    document.documentElement.classList.add('beta-is-marking');
    const chooseElement = (event) => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (!element || element.closest('[data-beta-reporter]')) return;
      event.preventDefault();
      event.stopPropagation();
      setAnnotation(annotationFor(element));
      setMarking(false);
      setOpen(true);
    };
    document.addEventListener('click', chooseElement, true);
    return () => {
      document.documentElement.classList.remove('beta-is-marking');
      document.removeEventListener('click', chooseElement, true);
    };
  }, [marking]);

  const reset = () => {
    setCategory('FUNCTION');
    setDescription('');
    setAnnotation(null);
    setIncludeScreenshot(true);
    setError('');
    setSavedIssue(null);
  };

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setMarking(false);
    if (savedIssue) reset();
  };

  const beginMarking = () => {
    setError('');
    setOpen(false);
    setMarking(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!description.trim()) {
      setError('Please briefly describe what happened.');
      textareaRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError('');
    const issueId = createIssueId();
    let screenshotBlob = null;
    let screenshot = { requested: includeScreenshot, captured: false, error: '' };
    if (includeScreenshot) {
      try {
        screenshotBlob = await captureViewport(annotation);
        screenshot = {
          requested: true,
          captured: true,
          bytes: screenshotBlob.size,
          type: screenshotBlob.type,
          error: '',
        };
      } catch (captureError) {
        screenshot = {
          requested: true,
          captured: false,
          error: redactText(captureError?.message || captureError, 600),
        };
      }
    }

    const report = {
      origin: 'USER',
      category,
      description: description.trim(),
      diagnosticsSummary: diagnosticsSummary(),
    };
    const evidence = collectBetaEvidence({ issueId, description, category, annotation, screenshot });

    try {
      const issue = await submitBetaIssue({
        issueId,
        report,
        evidence,
        screenshotBlob,
        cloudEnabled,
        guestMode,
      });
      setSavedIssue(issue);
    } catch (submitError) {
      setError(submitError?.message || 'The report could not be saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="beta-reporter" data-beta-reporter>
      {annotation ? (
        <div
          className="beta-mark-highlight"
          style={{
            left: annotation.rect.left,
            top: annotation.rect.top,
            width: annotation.rect.width,
            height: annotation.rect.height,
          }}
          aria-hidden="true"
        />
      ) : null}

      {marking ? (
        <div className="beta-mark-mode" role="status">
          <span>Click the part that looks wrong</span>
          <button type="button" onClick={() => { setMarking(false); setOpen(true); }}>Cancel</button>
        </div>
      ) : null}

      {open ? (
        <section className="beta-report-panel" role="dialog" aria-modal="true" aria-labelledby="beta-report-title">
          {savedIssue ? (
            <div className="beta-report-success">
              <div className="beta-success-mark" aria-hidden="true">✓</div>
              <p className="beta-report-eyebrow">Report saved</p>
              <h2 id="beta-report-title">Thank you</h2>
              <p>We saved the page and its technical details so we can investigate it.</p>
              <code>{savedIssue.id}</code>
              {!cloudEnabled ? <small>Local preview report — it has not been sent to AWS.</small> : null}
              <button type="button" className="beta-primary-button" onClick={close}>Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <header>
                <div>
                  <p className="beta-report-eyebrow">Beta feedback</p>
                  <h2 id="beta-report-title">Report a problem</h2>
                </div>
                <button type="button" className="beta-close-button" onClick={close} aria-label="Close report form">×</button>
              </header>

              <fieldset className="beta-category-options">
                <legend>What kind of problem is it?</legend>
                <div>
                  {CATEGORIES.map(([value, label]) => (
                    <button
                      type="button"
                      className={category === value ? 'active' : ''}
                      aria-pressed={category === value}
                      onClick={() => setCategory(value)}
                      key={value}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="beta-description-field">
                <span>What happened?</span>
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(event) => setDescription(event.target.value.slice(0, 3000))}
                  placeholder="Tell us what looked wrong or what you expected to happen."
                  rows="5"
                  maxLength="3000"
                />
                <small>{description.length}/3000</small>
              </label>

              <div className={`beta-mark-summary ${annotation ? 'has-mark' : ''}`}>
                <div>
                  <strong>{annotation ? 'Problem area marked' : 'Mark something on the page'}</strong>
                  <span>{annotation ? annotation.label : 'Optional — helps us find the exact spot.'}</span>
                </div>
                <button type="button" onClick={beginMarking}>{annotation ? 'Change' : 'Mark area'}</button>
                {annotation ? <button type="button" className="beta-clear-mark" onClick={() => setAnnotation(null)}>Clear</button> : null}
              </div>

              <label className="beta-screenshot-option">
                <input type="checkbox" checked={includeScreenshot} onChange={(event) => setIncludeScreenshot(event.target.checked)} />
                <span><strong>Include a screenshot</strong><small>The feedback window itself will not appear in it.</small></span>
              </label>

              <p className="beta-privacy-note">
                We’ll save this page’s visible content, time, browser details, recent app actions, and technical errors. Passwords, cookies, and sign-in tokens are not collected.
              </p>
              {error ? <div className="beta-report-error" role="alert">{error}</div> : null}
              {!cloudEnabled ? <div className="beta-local-notice">Local preview: this report will be stored only in this browser.</div> : null}
              <button type="submit" className="beta-primary-button" disabled={submitting}>
                {submitting ? 'Saving report…' : 'Send report'}
              </button>
            </form>
          )}
        </section>
      ) : null}

      {!open && !marking ? (
        <button
          type="button"
          className="beta-report-bubble"
          onClick={() => { setOpen(true); setError(''); }}
          aria-label="Report a problem"
          title="Report a problem"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5.5 4.75h13a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-7l-4.7 3.2.7-3.2h-2a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 2-2Z" />
            <path d="M8 9h8M8 12.5h5" />
          </svg>
          <span>Feedback</span>
        </button>
      ) : null}
    </div>
  );
}
