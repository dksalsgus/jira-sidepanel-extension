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
 * @param {{transport?: (request: {url: string, init: RequestInit}) => Promise<any>}} [options]
 * @returns {Promise<{accountId: string, displayName: string}>}
 */
export async function fetchMyself(config, options = {}) {
  const url = `https://${config.domain}.atlassian.net/rest/api/3/myself`;
  return requestJson({
    url,
    init: {
      headers: buildHeaders(config),
    },
  }, options.transport);
}

/**
 * 내게 할당된 이슈 조회
 * @param {Config} config
 * @param {'current' | 'all'} sprintFilter
 * @param {{transport?: (request: {url: string, init: RequestInit}) => Promise<any>, accountId?: string}} [options]
 * @returns {Promise<Issue[]>}
 */
export async function fetchAssignedIssues(config, sprintFilter, options = {}) {
  const jql = buildJql(sprintFilter, options.accountId, config.email);
  const fields = ['summary', 'status', 'priority', 'issuetype', 'parent'];
  const url = `https://${config.domain}.atlassian.net/rest/api/3/search/jql`;
  const data = await requestJson({
    url,
    init: {
      method: 'POST',
      headers: {
        ...buildHeaders(config),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql,
        fields,
        maxResults: MAX_RESULTS,
      }),
    },
  }, options.transport);
  const issues = Array.isArray(data.issues)
    ? data.issues
    : Array.isArray(data.values)
      ? data.values
      : [];
  return issues.map(normalizeIssue);
}

function buildJql(sprintFilter, accountId = '', email = '') {
  const assigneeTerms = ['assignee = currentUser()'];

  if (accountId) {
    assigneeTerms.push(`assignee = "${escapeJqlValue(accountId)}"`);
  }

  if (email) {
    assigneeTerms.push(`assignee = "${escapeJqlValue(email)}"`);
  }

  const assigneeClause = assigneeTerms.length === 1
    ? assigneeTerms[0]
    : `(${assigneeTerms.join(' OR ')})`;

  if (sprintFilter === 'current') {
    return `${assigneeClause} AND sprint in openSprints() ORDER BY priority DESC`;
  }
  return `${assigneeClause} ORDER BY updated DESC`;
}

function escapeJqlValue(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function buildHeaders(config) {
  return {
    'Authorization': buildAuthHeader(config.email, config.apiToken),
    'Accept': 'application/json',
  };
}

async function requestJson(request, transport = fetchJsonDirect) {
  return transport(request);
}

async function fetchJsonDirect(request) {
  const response = await fetch(request.url, request.init);

  if (!response.ok) {
    throw new ApiError(response.status, await getErrorMessage(response));
  }

  return response.json();
}

function normalizeIssue(raw) {
  const fields = raw.fields;
  const statusCategory = fields.status?.statusCategory?.colorName ?? 'default';
  const parent = fields.parent ? {
    key: fields.parent.key,
    summary: fields.parent.fields?.summary ?? '(No title)'
  } : null;
  return {
    key: raw.key,
    summary: fields.summary ?? '(No title)',
    status: fields.status?.name ?? '',
    statusCategory,
    priority: fields.priority?.name ?? '',
    priorityIconUrl: fields.priority?.iconUrl ?? '',
    issueType: fields.issuetype?.name ?? '',
    issueTypeIconUrl: fields.issuetype?.iconUrl ?? '',
    parent,
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
