import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createIssueCacheEntry,
  getIssueCacheKey,
  getIssueCacheAgeLabel,
  getUsableIssueCacheEntry,
} from '../shared/issue-cache.js';

test('creates a cache entry for a filter with issues and timestamp', () => {
  const issues = [{ key: 'ABC-1', summary: 'First issue' }];

  assert.deepEqual(createIssueCacheEntry('all', issues, 1710000000000), {
    filter: 'all',
    issues,
    cachedAt: 1710000000000,
  });
});

test('builds a distinct storage key for each sprint filter', () => {
  assert.equal(getIssueCacheKey('all'), 'jiraIssueCache:all');
  assert.equal(getIssueCacheKey('current'), 'jiraIssueCache:current');
});

test('returns only cache entries that match the requested filter and shape', () => {
  const entry = {
    filter: 'current',
    issues: [{ key: 'ABC-2' }],
    cachedAt: 1710000000000,
  };

  assert.deepEqual(getUsableIssueCacheEntry(entry, 'current'), entry);
  assert.equal(getUsableIssueCacheEntry(entry, 'all'), null);
  assert.equal(getUsableIssueCacheEntry({ ...entry, issues: null }, 'current'), null);
  assert.equal(getUsableIssueCacheEntry({ ...entry, cachedAt: '1710000000000' }, 'current'), null);
  assert.equal(getUsableIssueCacheEntry(null, 'current'), null);
});

test('formats cache age for stale-data messages', () => {
  const now = 1710000000000;

  assert.equal(getIssueCacheAgeLabel(now - 30 * 1000, now), 'just now');
  assert.equal(getIssueCacheAgeLabel(now - 60 * 1000, now), '1 minute ago');
  assert.equal(getIssueCacheAgeLabel(now - 5 * 60 * 1000, now), '5 minutes ago');
  assert.equal(getIssueCacheAgeLabel(now - 60 * 60 * 1000, now), '1 hour ago');
  assert.equal(getIssueCacheAgeLabel(now - 2 * 60 * 60 * 1000, now), '2 hours ago');
  assert.equal(getIssueCacheAgeLabel(now - 24 * 60 * 60 * 1000, now), '1 day ago');
  assert.equal(getIssueCacheAgeLabel(now - 3 * 24 * 60 * 60 * 1000, now), '3 days ago');
});
