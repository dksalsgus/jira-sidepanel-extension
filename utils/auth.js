// utils/auth.js — Atlassian Basic Auth 헤더 생성

/**
 * Basic Auth 헤더 값 생성
 * @param {string} email
 * @param {string} apiToken
 * @returns {string} "Basic base64(email:apiToken)"
 */
export function buildAuthHeader(email, apiToken) {
  const credentials = `${email}:${apiToken}`;
  const encoded = btoa(credentials);
  return `Basic ${encoded}`;
}
