import test from 'node:test';
import assert from 'node:assert/strict';

import { loadIssuesWithCache } from '../shared/issue-loading.js';
import { ApiError } from '../utils/api.js';

const CONFIG = {
  domain: 'example',
  email: 'user@example.com',
  apiToken: 'ATCT-example-token',
};

test('loadIssuesWithCache emits cached issues before returning fresh issues', async () => {
  const cachedEntry = {
    filter: 'all',
    issues: [{ key: 'ABC-1' }],
    cachedAt: 1710000000000,
  };
  const cachedStates = [];
  const writes = [];

  const result = await loadIssuesWithCache('all', {
    getConfig: async () => CONFIG,
    readIssueCache: async () => cachedEntry,
    writeIssueCache: async (filter, issues) => writes.push({ filter, issues }),
    fetchMyself: async () => ({ accountId: 'account-1' }),
    fetchAssignedIssues: async () => [{ key: 'ABC-2' }],
    transport: async () => ({}),
    onCached: (state) => cachedStates.push(state),
  });

  assert.deepEqual(cachedStates, [
    {
      state: 'cached',
      issues: cachedEntry.issues,
      cacheEntry: cachedEntry,
    },
  ]);
  assert.deepEqual(writes, [{ filter: 'all', issues: [{ key: 'ABC-2' }] }]);
  assert.deepEqual(result, { state: 'success', issues: [{ key: 'ABC-2' }] });
});

test('loadIssuesWithCache returns stale cached issues when refresh fails', async () => {
  const cachedEntry = {
    filter: 'current',
    issues: [{ key: 'ABC-3' }],
    cachedAt: 1710000000000,
  };

  const result = await loadIssuesWithCache('current', {
    getConfig: async () => CONFIG,
    readIssueCache: async () => cachedEntry,
    writeIssueCache: async () => assert.fail('stale refresh must not rewrite cache'),
    fetchMyself: async () => {
      throw new ApiError(0, 'offline');
    },
    fetchAssignedIssues: async () => assert.fail('assigned issues should not load after myself fails'),
    transport: async () => ({}),
  });

  assert.deepEqual(result, {
    state: 'stale',
    issues: cachedEntry.issues,
    cacheEntry: cachedEntry,
  });
});

test('loadIssuesWithCache classifies auth and rate-limit failures without cache', async () => {
  const authResult = await loadIssuesWithCache('all', {
    getConfig: async () => CONFIG,
    readIssueCache: async () => null,
    writeIssueCache: async () => assert.fail('failed loads must not write cache'),
    fetchMyself: async () => {
      throw new ApiError(401, 'Unauthorized');
    },
    fetchAssignedIssues: async () => [],
    transport: async () => ({}),
  });

  assert.deepEqual(authResult, {
    state: 'error',
    kind: 'auth',
    status: 401,
    message: 'Authentication error (401): check your email and API token.',
  });

  const rateLimitResult = await loadIssuesWithCache('all', {
    getConfig: async () => CONFIG,
    readIssueCache: async () => null,
    writeIssueCache: async () => assert.fail('failed loads must not write cache'),
    fetchMyself: async () => ({ accountId: 'account-1' }),
    fetchAssignedIssues: async () => {
      throw new ApiError(429, 'Too Many Requests');
    },
    transport: async () => ({}),
  });

  assert.deepEqual(rateLimitResult, {
    state: 'error',
    kind: 'rate-limit',
    status: 429,
    message: 'Too many requests. Try again in a moment.',
  });
});
