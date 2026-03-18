// utils/api.js — Atlassian REST API v3 호출

import { buildAuthHeader } from './auth.js';

const MAX_RESULTS = 50;

/**
 * @typedef {{domain: string, email: string, apiToken: string}} Config
 * @typedef {{key: string, summary: string, status: string, statusCategory: string, priority: string, priorityIconUrl: string}} Issue
 */

/**
 * 인증 검증 — /rest/api/3/myself 호출
 * @param {Config} config
 * @returns {Promise<{accountId: string, displayName: string}>}
 */
export async function fetchMyself(config) {
  const url = `https://${config.domain}.atlassian.net/rest/api/3/myself`;
  const response = await fetch(url, {
    headers: buildHeaders(config),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await getErrorMessage(response));
  }

  return response.json();
}

/**
 * 내게 할당된 이슈 조회
 * @param {Config} config
 * @param {'current' | 'all'} sprintFilter
 * @returns {Promise<Issue[]>}
 */
export async function fetchAssignedIssues(config, sprintFilter) {
  const jql = buildJql(sprintFilter);
  const fields = 'summary,status,priority,issuetype';
  const url = `https://${config.domain}.atlassian.net/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=${MAX_RESULTS}`;

  const response = await fetch(url, {
    headers: buildHeaders(config),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await getErrorMessage(response));
  }

  const data = await response.json();
  return data.issues.map(normalizeIssue);
}

function buildJql(sprintFilter) {
  if (sprintFilter === 'current') {
    return 'assignee = currentUser() AND sprint in openSprints() ORDER BY priority DESC';
  }
  return 'assignee = currentUser() ORDER BY updated DESC';
}

function buildHeaders(config) {
  return {
    'Authorization': buildAuthHeader(config.email, config.apiToken),
    'Accept': 'application/json',
  };
}

function normalizeIssue(raw) {
  const fields = raw.fields;
  const statusCategory = fields.status?.statusCategory?.colorName ?? 'default';
  return {
    key: raw.key,
    summary: fields.summary ?? '(제목 없음)',
    status: fields.status?.name ?? '',
    statusCategory,
    priority: fields.priority?.name ?? '',
    priorityIconUrl: fields.priority?.iconUrl ?? '',
    issueType: fields.issuetype?.name ?? '',
    issueTypeIconUrl: fields.issuetype?.iconUrl ?? '',
  };
}

async function getErrorMessage(response) {
  try {
    const data = await response.json();
    return data.errorMessages?.[0] ?? data.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
