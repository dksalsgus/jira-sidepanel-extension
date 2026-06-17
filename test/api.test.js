import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchAssignedIssues, fetchMyself } from '../utils/api.js';

const BASE_CONFIG = {
  domain: 'example',
  email: 'user@example.com',
  apiToken: 'fake-token-for-tests',
};

test('fetchAssignedIssues posts JQL search requests with structured fields', async () => {
  let capturedRequest = null;

  const issues = await fetchAssignedIssues(BASE_CONFIG, 'all', {
    transport: async (request) => {
      capturedRequest = request;
      return {
        issues: [
          {
            key: 'ABC-123',
            fields: {
              summary: 'Investigate empty sidepanel',
              status: {
                name: 'In Progress',
                statusCategory: {
                  colorName: 'blue-gray',
                },
              },
              priority: {
                name: 'High',
                iconUrl: 'https://example/icon.svg',
              },
              issuetype: {
                name: 'Task',
                iconUrl: 'https://example/type.svg',
              },
              parent: {
                key: 'ABC-100',
                fields: {
                  summary: 'Parent issue',
                },
              },
            },
          },
        ],
      };
    },
  });

  assert.deepEqual(capturedRequest, {
    url: 'https://example.atlassian.net/rest/api/3/search/jql',
    init: {
      method: 'POST',
      headers: {
        'Authorization': 'Basic dXNlckBleGFtcGxlLmNvbTpmYWtlLXRva2VuLWZvci10ZXN0cw==',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql: '(assignee = currentUser() OR assignee = "user@example.com") ORDER BY updated DESC',
        fields: ['summary', 'status', 'priority', 'issuetype', 'parent'],
        maxResults: 50,
      }),
    },
  });

  assert.deepEqual(issues, [
    {
      key: 'ABC-123',
      summary: 'Investigate empty sidepanel',
      status: 'In Progress',
      statusCategory: 'blue-gray',
      priority: 'High',
      priorityIconUrl: 'https://example/icon.svg',
      issueType: 'Task',
      issueTypeIconUrl: 'https://example/type.svg',
      parent: {
        key: 'ABC-100',
        summary: 'Parent issue',
      },
    },
  ]);
});

test('fetchAssignedIssues includes explicit accountId fallback in JQL when provided', async () => {
  let capturedRequest = null;

  await fetchAssignedIssues(BASE_CONFIG, 'current', {
    accountId: '70121:9ae0ab01-7bf2-4b1b-a957-e96e54c49e45',
    transport: async (request) => {
      capturedRequest = request;
      return { issues: [] };
    },
  });

  assert.equal(
    JSON.parse(capturedRequest.init.body).jql,
    '(assignee = currentUser() OR assignee = "70121:9ae0ab01-7bf2-4b1b-a957-e96e54c49e45" OR assignee = "user@example.com") AND sprint in openSprints() ORDER BY priority DESC'
  );
});

test('fetchMyself keeps a simple GET request shape for auth verification', async () => {
  let capturedRequest = null;

  await fetchMyself(BASE_CONFIG, {
    transport: async (request) => {
      capturedRequest = request;
      return { accountId: 'abc', displayName: 'Tester' };
    },
  });

  assert.deepEqual(capturedRequest, {
    url: 'https://example.atlassian.net/rest/api/3/myself',
    init: {
      headers: {
        'Authorization': 'Basic dXNlckBleGFtcGxlLmNvbTpmYWtlLXRva2VuLWZvci10ZXN0cw==',
        'Accept': 'application/json',
      },
    },
  });
});
