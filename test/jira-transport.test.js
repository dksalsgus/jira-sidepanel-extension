import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchViaBackground } from '../shared/jira-transport.js';
import { ApiError } from '../utils/api.js';

test('fetchViaBackground returns response body from successful background fetches', async () => {
  globalThis.chrome = {
    runtime: {
      async sendMessage(message) {
        assert.deepEqual(message, {
          type: 'FETCH_JIRA',
          request: { url: 'https://example.atlassian.net/rest/api/3/myself' },
        });
        return { ok: true, status: 200, body: { accountId: 'abc' } };
      },
    },
  };

  const body = await fetchViaBackground({ url: 'https://example.atlassian.net/rest/api/3/myself' });

  assert.deepEqual(body, { accountId: 'abc' });
});

test('fetchViaBackground converts failed background responses into ApiError', async () => {
  globalThis.chrome = {
    runtime: {
      async sendMessage() {
        return {
          ok: false,
          status: 429,
          body: { errorMessages: ['Rate limit exceeded'] },
        };
      },
    },
  };

  await assert.rejects(
    fetchViaBackground({ url: 'https://example.atlassian.net/rest/api/3/search/jql' }),
    (error) => {
      assert.equal(error instanceof ApiError, true);
      assert.equal(error.status, 429);
      assert.equal(error.message, 'Rate limit exceeded');
      return true;
    }
  );
});
