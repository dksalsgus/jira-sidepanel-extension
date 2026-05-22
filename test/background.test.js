import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const backgroundUrl = pathToFileURL(new URL('../background.js', import.meta.url).pathname).href;

async function loadBackgroundWithChrome(chromeMock) {
  globalThis.chrome = chromeMock;
  await import(`${backgroundUrl}?case=${Date.now()}-${Math.random()}`);
  return chromeMock;
}

function createChromeMock({ withSidePanel = false } = {}) {
  const listeners = {
    installed: null,
    startup: null,
    message: null,
    clicked: null,
  };

  const chromeMock = {
    runtime: {
      onInstalled: {
        addListener(listener) {
          listeners.installed = listener;
        },
      },
      onStartup: {
        addListener(listener) {
          listeners.startup = listener;
        },
      },
      onMessage: {
        addListener(listener) {
          listeners.message = listener;
        },
      },
      openOptionsPage() {},
    },
    action: {
      onClicked: {
        addListener(listener) {
          listeners.clicked = listener;
        },
      },
    },
    tabs: {
      sent: [],
      sendMessage(tabId, message) {
        this.sent.push({ tabId, message });
        return Promise.resolve();
      },
    },
  };

  if (withSidePanel) {
    chromeMock.sidePanel = {
      calls: [],
      setPanelBehavior(options) {
        this.calls.push(options);
        return Promise.resolve();
      },
    };
  }

  chromeMock.__listeners = listeners;
  return chromeMock;
}

test('background falls back to the floating panel when sidePanel API is unavailable', async () => {
  const chromeMock = await loadBackgroundWithChrome(createChromeMock());

  assert.equal(typeof chromeMock.__listeners.clicked, 'function');

  await chromeMock.__listeners.clicked({ id: 42 });

  assert.deepEqual(chromeMock.tabs.sent, [
    {
      tabId: 42,
      message: { type: 'TOGGLE_PANEL' },
    },
  ]);
});

test('background install/startup hooks do not crash without sidePanel support', async () => {
  const chromeMock = await loadBackgroundWithChrome(createChromeMock());

  assert.equal(typeof chromeMock.__listeners.installed, 'function');
  assert.equal(typeof chromeMock.__listeners.startup, 'function');

  assert.doesNotThrow(() => chromeMock.__listeners.installed());
  assert.doesNotThrow(() => chromeMock.__listeners.startup());
});
