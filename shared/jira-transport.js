import { ApiError } from '../utils/api.js';

export async function fetchViaBackground(request) {
  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_JIRA',
    request,
  });

  if (response?.error) {
    throw new ApiError(response.status ?? 0, response.error);
  }

  if (!response?.ok) {
    const message = response?.body?.errorMessages?.[0]
      ?? response?.body?.message
      ?? `HTTP ${response?.status ?? 0}`;
    throw new ApiError(response?.status ?? 0, message);
  }

  return response.body ?? {};
}
