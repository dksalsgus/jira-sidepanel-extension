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
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, body });
      })
      .catch((err) => {
        sendResponse({ ok: false, status: 0, body: {}, error: err.message });
      });
    return true; // 비동기 sendResponse 유지
  }
});
