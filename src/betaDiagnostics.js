const MAX_ERRORS = 30;
const MAX_INTERACTIONS = 40;
const MAX_REQUESTS = 50;
const MAX_CONTENT_BYTES = 6 * 1024 * 1024;
const MAX_TEXT_LENGTH = 160000;
const MAX_HTML_LENGTH = 500000;

const state = {
  started: false,
  errors: [],
  interactions: [],
  requests: [],
  contentResponses: [],
};

function nowIso() {
  return new Date().toISOString();
}

function trimList(list, maximum) {
  if (list.length > maximum) list.splice(0, list.length - maximum);
}

export function redactText(value, maximum = 1200) {
  return String(value || '')
    .replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, '[token removed]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email removed]')
    .replace(/(authorization|cookie|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, '$1=[removed]')
    .slice(0, maximum);
}

function safeUrl(value) {
  try {
    const parsed = new URL(String(value), window.location.origin);
    const allowed = new URLSearchParams();
    parsed.searchParams.forEach((item, key) => {
      if (!/(token|key|code|auth|email|password|secret)/i.test(key)) allowed.append(key, redactText(item, 160));
    });
    const query = allowed.toString();
    return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}`;
  } catch (_error) {
    return redactText(value, 500);
  }
}

function elementLabel(element) {
  if (!(element instanceof Element)) return 'unknown element';
  const role = element.getAttribute('role');
  const label = element.getAttribute('aria-label');
  const text = element.textContent?.replace(/\s+/g, ' ').trim();
  return redactText(label || text || role || element.tagName.toLowerCase(), 180);
}

export function elementSelector(element) {
  if (!(element instanceof Element)) return '';
  if (element.id && !/^(root|main)$/i.test(element.id)) return `#${CSS.escape(element.id)}`;
  const parts = [];
  let current = element;
  while (current && current !== document.body && parts.length < 5) {
    let part = current.tagName.toLowerCase();
    const stableClass = [...current.classList].find((name) => !/^(active|open|selected|is-)/.test(name));
    if (stableClass) part += `.${CSS.escape(stableClass)}`;
    if (current.parentElement) {
      const siblings = [...current.parentElement.children].filter((item) => item.tagName === current.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = current.parentElement;
  }
  return parts.join(' > ');
}

function recordError(kind, message, source = '') {
  state.errors.push({
    at: nowIso(),
    kind,
    message: redactText(message, 1800),
    source: redactText(source, 600),
  });
  trimList(state.errors, MAX_ERRORS);
}

function shouldCaptureContent(url, response) {
  try {
    const parsed = new URL(url, window.location.origin);
    const contentType = response.headers.get('content-type') || '';
    return parsed.origin === window.location.origin
      && /^\/(Current_news|current_news)\//.test(parsed.pathname)
      && (contentType.includes('json') || parsed.pathname.endsWith('.json'));
  } catch (_error) {
    return false;
  }
}

function rememberContentResponse(url, response) {
  response.clone().text().then((raw) => {
    if (!raw || raw.length > MAX_CONTENT_BYTES) return;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (_error) {
      return;
    }
    const entry = {
      capturedAt: nowIso(),
      url: safeUrl(url),
      etag: response.headers.get('etag') || '',
      lastModified: response.headers.get('last-modified') || '',
      payload,
      bytes: raw.length,
    };
    state.contentResponses = state.contentResponses.filter((item) => item.url !== entry.url);
    state.contentResponses.push(entry);
    while (
      state.contentResponses.length > 1
      && state.contentResponses.reduce((sum, item) => sum + item.bytes, 0) > MAX_CONTENT_BYTES
    ) {
      state.contentResponses.shift();
    }
  }).catch(() => {});
}

function recordInteraction(event) {
  const element = event.target instanceof Element ? event.target.closest('a, button, summary, [role="button"]') : null;
  if (!element || element.closest('[data-beta-reporter]')) return;
  state.interactions.push({
    at: nowIso(),
    action: 'click',
    element: elementLabel(element),
    selector: elementSelector(element),
    page: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  });
  trimList(state.interactions, MAX_INTERACTIONS);
}

export function startBetaDiagnostics() {
  if (state.started || typeof window === 'undefined') return;
  state.started = true;

  window.addEventListener('error', (event) => {
    recordError('javascript', event.message || event.error?.message, event.filename || event.error?.stack);
  });
  window.addEventListener('unhandledrejection', (event) => {
    recordError('promise', event.reason?.message || event.reason, event.reason?.stack);
  });
  document.addEventListener('click', recordInteraction, true);

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const input = args[0];
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    const startedAt = performance.now();
    try {
      const response = await originalFetch(...args);
      state.requests.push({
        at: nowIso(),
        url: safeUrl(url),
        method: args[1]?.method || input?.method || 'GET',
        status: response.status,
        ok: response.ok,
        durationMs: Math.round(performance.now() - startedAt),
      });
      trimList(state.requests, MAX_REQUESTS);
      if (shouldCaptureContent(url, response)) rememberContentResponse(url, response);
      return response;
    } catch (error) {
      state.requests.push({
        at: nowIso(),
        url: safeUrl(url),
        method: args[1]?.method || input?.method || 'GET',
        status: 0,
        ok: false,
        durationMs: Math.round(performance.now() - startedAt),
        error: redactText(error?.message || error, 600),
      });
      trimList(state.requests, MAX_REQUESTS);
      throw error;
    }
  };
}

function sanitizedPageHtml() {
  const main = document.querySelector('main') || document.querySelector('#root');
  if (!main) return '';
  const clone = main.cloneNode(true);
  clone.querySelectorAll('script, style, iframe, [data-beta-reporter], .account-controls').forEach((item) => item.remove());
  clone.querySelectorAll('input, textarea, select').forEach((item) => {
    item.removeAttribute('value');
    if ('value' in item) item.value = '';
  });
  clone.querySelectorAll('[href], [src]').forEach((item) => {
    ['href', 'src'].forEach((attribute) => {
      if (item.hasAttribute(attribute)) item.setAttribute(attribute, safeUrl(item.getAttribute(attribute)));
    });
  });
  return clone.outerHTML.slice(0, MAX_HTML_LENGTH);
}

function pagePreferences() {
  return {
    theme: document.documentElement.dataset.theme || 'default',
    colorScheme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    reducedMotion: Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function collectBetaEvidence({ issueId, description, category, annotation, screenshot }) {
  const main = document.querySelector('main') || document.querySelector('#root');
  return {
    schemaVersion: 1,
    issueId,
    capturedAt: nowIso(),
    report: {
      category,
      description: redactText(description, 5000),
    },
    application: {
      version: import.meta.env.VITE_APP_VERSION || '0.0.1',
      release: import.meta.env.VITE_COMMIT_SHA || import.meta.env.VITE_GIT_SHA || 'local-or-unset',
      environment: import.meta.env.MODE,
    },
    page: {
      url: safeUrl(window.location.href),
      path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      title: redactText(document.title, 300),
      scrollX: Math.round(window.scrollX),
      scrollY: Math.round(window.scrollY),
      text: redactText(main?.innerText || '', MAX_TEXT_LENGTH),
      html: sanitizedPageHtml(),
    },
    device: {
      userAgent: redactText(navigator.userAgent, 800),
      platform: redactText(navigator.userAgentData?.platform || navigator.platform, 120),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      screenWidth: window.screen?.width,
      screenHeight: window.screen?.height,
      devicePixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      preferences: pagePreferences(),
    },
    annotation,
    screenshot,
    errors: [...state.errors],
    requests: [...state.requests],
    interactions: [...state.interactions],
    contentResponses: [...state.contentResponses],
  };
}

export function diagnosticsSummary() {
  return {
    errorCount: state.errors.length,
    failedRequestCount: state.requests.filter((request) => !request.ok).length,
    capturedContentCount: state.contentResponses.length,
    interactionCount: state.interactions.length,
  };
}
