// utils/storage.js — chrome.storage.sync 래퍼

/**
 * 저장된 설정 조회
 * @returns {Promise<{domain: string, email: string, apiToken: string} | null>}
 */
export async function getConfig() {
  const result = await chrome.storage.sync.get(['domain', 'email', 'apiToken']);
  if (!result.domain || !result.email || !result.apiToken) {
    return null;
  }
  return {
    domain: result.domain,
    email: result.email,
    apiToken: result.apiToken,
  };
}

/**
 * 설정 저장
 * @param {{domain: string, email: string, apiToken: string}} config
 */
export async function saveConfig({ domain, email, apiToken }) {
  await chrome.storage.sync.set({ domain, email, apiToken });
}

/**
 * 설정 삭제
 */
export async function clearConfig() {
  await chrome.storage.sync.remove(['domain', 'email', 'apiToken']);
}
