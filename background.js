// background.js
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
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
