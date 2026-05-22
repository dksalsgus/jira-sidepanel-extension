// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    return false;
  }

  if (msg.type === 'FETCH_JIRA') {
    fetch(msg.url, { headers: msg.headers })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        sendResponse({ ok: response.ok, status: response.status, body });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          status: 0,
          body: {},
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return true;
  }
});
