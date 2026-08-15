import test from 'node:test';
import assert from 'node:assert/strict';
import { carrySourceTitle, sourceDocumentTitle } from './sourceDocumentTitle.js';

test('real article titles survive publisher and URL metadata', () => {
  assert.equal(sourceDocumentTitle({
    title: 'Trump announces White House press secretary Karoline Leavitt stepping down',
    url: 'https://abcnews.com/Politics/example',
  }, ['ABC News']), 'Trump announces White House press secretary Karoline Leavitt stepping down');
});

test('a later metadata source supplies a title when the first record has none', () => {
  assert.equal(carrySourceTitle('', 'Who Might Replace Karoline Leavitt as Press Secretary?'), 'Who Might Replace Karoline Leavitt as Press Secretary?');
  assert.equal(carrySourceTitle('Original headline', 'Later headline'), 'Original headline');
});

test('publisher suffixes are removed without replacing the article title', () => {
  assert.equal(sourceDocumentTitle({
    title: 'Karoline Leavitt to Step Down as White House Press Secretary - TIME',
    url: 'https://time.com/article/example',
  }, ['TIME']), 'Karoline Leavitt to Step Down as White House Press Secretary');
});

test('generic labels remain a fallback only when no article title exists', () => {
  assert.equal(sourceDocumentTitle({ title: 'BBC News', url: 'https://bbc.co.uk/news/example' }, ['BBC News']), '');
  assert.equal(sourceDocumentTitle({ title: '', url: 'https://example.gov/fact-sheet.pdf' }, ['Example Agency']), 'Fact sheet');
});
