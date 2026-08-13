import test from 'node:test';
import assert from 'node:assert/strict';

import { betaIssueAuthMode } from './betaReportAuth.js';

test('public reporter uses user-pool auth when the browser is signed in', () => {
  assert.equal(betaIssueAuthMode({ guestMode: true, hasUserPoolTokens: true }), 'userPool');
});

test('public reporter uses guest IAM auth when the browser is signed out', () => {
  assert.equal(betaIssueAuthMode({ guestMode: true, hasUserPoolTokens: false }), 'iam');
});

test('authenticated reporter keeps the configured default auth mode', () => {
  assert.equal(betaIssueAuthMode({ guestMode: false, hasUserPoolTokens: true }), undefined);
});
