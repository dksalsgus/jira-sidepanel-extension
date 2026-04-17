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
 * @param {{transport?: (url: string, headers: Record<string, string>) => Promise<any>}} [options]
 * @returns {Promise<{accountId: string, displayName: string}>}
 */
export async function fetchMyself(config, options = {}) {
  const url = `https://${config.domain}.atlassian.net/rest/api/3/myself`;
  return requestJson(url, buildHeaders(config), options.transport);
}

/**
 * 내게 할당된 이슈 조회
 * @param {Config} config
 * @param {'current' | 'all'} sprintFilter
 * @param {{transport?: (url: string, headers: Record<string, string>) => Promise<any>}} [options]
 * @returns {Promise<Issue[]>}
 */
export async function fetchAssignedIssues(config, sprintFilter, options = {}) {
  const jql = buildJql(sprintFilter);
  const fields = 'summary,status,priority,issuetype,parent';
  const url = `https://${config.domain}.atlassian.net/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=${MAX_RESULTS}`;
  const data = await requestJson(url, buildHeaders(config), options.transport);
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

async function requestJson(url, headers, transport = fetchJsonDirect) {
  return transport(url, headers);
}

async function fetchJsonDirect(url, headers) {
  const response = await fetch(url, { headers });

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
    summary: fields.parent.fields?.summary ?? '(제목 없음)'
  } : null;
  return {
    key: raw.key,
    summary: fields.summary ?? '(제목 없음)',
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
