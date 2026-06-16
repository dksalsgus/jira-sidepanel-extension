import { fetchAssignedIssues, fetchMyself, ApiError } from '../utils/api.js';
import { getConfig } from '../utils/storage.js';
import { readIssueCache, writeIssueCache } from './issue-cache.js';
import { fetchViaBackground } from './jira-transport.js';

export async function loadIssuesWithCache(filter, options = {}) {
  const deps = {
    getConfig,
    readIssueCache,
    writeIssueCache,
    fetchMyself,
    fetchAssignedIssues,
    transport: fetchViaBackground,
    onCached: () => {},
    onCacheMiss: () => {},
    ...options,
  };

  const config = await deps.getConfig();
  if (!config) return { state: 'unconfigured' };

  const cacheEntry = await deps.readIssueCache(filter);
  if (cacheEntry) {
    deps.onCached({
      state: 'cached',
      issues: cacheEntry.issues,
      cacheEntry,
    });
  } else {
    deps.onCacheMiss();
  }

  try {
    const myself = await deps.fetchMyself(config, {
      transport: deps.transport,
    });
    const issues = await deps.fetchAssignedIssues(config, filter, {
      transport: deps.transport,
      accountId: myself.accountId,
    });
    await deps.writeIssueCache(filter, issues);
    return { state: 'success', issues };
  } catch (error) {
    if (cacheEntry?.issues?.length > 0) {
      return {
        state: 'stale',
        issues: cacheEntry.issues,
        cacheEntry,
      };
    }

    return classifyIssueLoadError(error, cacheEntry);
  }
}

function classifyIssueLoadError(error, cacheEntry) {
  if (cacheEntry) {
    return {
      state: 'error',
      kind: 'stale-empty',
      status: 0,
      message: '최신 티켓을 불러오지 못했습니다. 설정과 네트워크를 확인한 뒤 다시 시도해주세요.',
    };
  }

  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return {
      state: 'error',
      kind: 'auth',
      status: error.status,
      message: `인증 오류 (${error.status}): 이메일과 API Token을 확인해주세요.`,
    };
  }

  if (error instanceof ApiError && error.status === 429) {
    return {
      state: 'error',
      kind: 'rate-limit',
      status: error.status,
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  if (error instanceof ApiError) {
    return {
      state: 'error',
      kind: 'api',
      status: error.status,
      message: `API 오류 (${error.status}): ${error.message}`,
    };
  }

  return {
    state: 'error',
    kind: 'network',
    status: 0,
    message: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
  };
}
