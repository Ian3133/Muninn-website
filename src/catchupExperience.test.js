import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./ReaderApp.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('./ReaderApp.jsx', import.meta.url), 'utf8');

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1] || '';
}

test('Catch-Up uses one minimal, accessible 2-5 day slider', () => {
  assert.match(app, /type="range"/);
  assert.match(app, /min=\{CATCHUP_MIN_DAYS\}/);
  assert.match(app, /max=\{CATCHUP_MAX_DAYS\}/);
  assert.match(app, /<span>Catch up on<\/span>/);
  assert.match(app, /contextLabel=\{rangeLabel\}/);
  assert.match(rule('.reader-app .today-mode-days'), /grid-template-rows:\s*12px 13px 12px/);
  assert.match(rule('.reader-app .today-mode-days > label'), /margin:\s*0/);
  assert.match(rule('.reader-app .catchup-days-slider'), /height:\s*13px/);
  assert.match(rule('.reader-app .catchup-days-slider input'), /height:\s*44px/);
});

test('Latest News is the shared layout and interaction source for Catch-Up', () => {
  assert.match(app, /function TodayStoryFeed/);
  assert.match(app, /<TodayStoryFeed stories=\{stories\} onNavigate=\{onNavigate\}/);
  assert.match(app, /<TodayStoryFeed[\s\S]+stories=\{briefing\.groups\}[\s\S]+briefingMode="catch-up"/);
  assert.match(app, /function catchupDestination[\s\S]+view: 'story'/);
  assert.match(app, /returnContext=\{returnContext\}/);
});

test('the selected digest title stays first and the primary destination is Digests', () => {
  assert.match(app, /today: 'Digests'/);
  assert.match(app, /mode === 'catch-up'[\s\S]+key: 'catch-up'[\s\S]+key: 'latest'/);
  assert.match(app, /key: 'latest'[\s\S]+key: 'catch-up'/);
  assert.match(app, />\s*Digests\s*</);
});

test('switching digest modes keeps the shared header height stable', () => {
  assert.match(rule('.reader-app .today-mode-tabs'), /align-items:\s*flex-end/);
  assert.match(rule('.reader-app .today-mode-context'), /min-height:\s*37px/);
  assert.match(rule('.reader-app .today-mode-days'), /grid-template-rows:\s*12px 13px 12px/);
});

test('digest titles expose a hover and keyboard-focus affordance', () => {
  assert.match(app, /data-hint=\{mode === tab\.key \? 'Current view' : `Switch to \$\{tab\.label\}`\}/);
  assert.match(css, /\.today-mode-tabs > a:hover::before/);
  assert.match(css, /\.today-mode-tabs > a:focus-visible::before/);
});
