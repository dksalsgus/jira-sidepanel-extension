// background.js
function supportsSidePanel() {
  return typeof chrome.sidePanel?.setPanelBehavior === 'function';
}

function configureSidePanel() {
  if (!supportsSidePanel()) return;
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  configureSidePanel();
});

chrome.runtime.onStartup.addListener(() => {
  configureSidePanel();
});

chrome.action.onClicked.addListener((tab) => {
  if (supportsSidePanel()) return;
  if (typeof tab?.id !== 'number') return;
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    return false;
  }

  if (msg.type === 'FETCH_JIRA') {
    fetch(msg.request.url, msg.request.init)
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
