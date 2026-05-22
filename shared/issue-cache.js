const CACHE_KEY_PREFIX = 'jiraIssueCache';

export function getIssueCacheKey(filter) {
  return `${CACHE_KEY_PREFIX}:${filter}`;
}

export function createIssueCacheEntry(filter, issues, cachedAt = Date.now()) {
  return {
    filter,
    issues,
    cachedAt,
  };
}

export function getUsableIssueCacheEntry(entry, filter) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.filter !== filter) return null;
  if (!Array.isArray(entry.issues)) return null;
  if (typeof entry.cachedAt !== 'number') return null;
  return entry;
}

export function getIssueCacheAgeLabel(cachedAt, now = Date.now()) {
  const elapsedMs = Math.max(0, now - cachedAt);
  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return '방금 전';

  const hours = Math.floor(minutes / 60);
  if (hours < 1) return `${minutes}분 전`;

  const days = Math.floor(hours / 24);
  if (days < 1) return `${hours}시간 전`;

  return `${days}일 전`;
}

export async function readIssueCache(filter) {
  const key = getIssueCacheKey(filter);
  const result = await chrome.storage.local.get([key]);
  return getUsableIssueCacheEntry(result[key], filter);
}

export async function writeIssueCache(filter, issues) {
  const key = getIssueCacheKey(filter);
  await chrome.storage.local.set({
    [key]: createIssueCacheEntry(filter, issues),
  });
}
