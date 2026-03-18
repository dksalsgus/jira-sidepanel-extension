// options/options.js — 설정 페이지 로직
import { getConfig, saveConfig, clearConfig } from '../utils/storage.js';

const form = document.getElementById('settings-form');
const domainInput = document.getElementById('domain');
const emailInput = document.getElementById('email');
const apiTokenInput = document.getElementById('api-token');
const autoOpenInput = document.getElementById('auto-open');
const showFloatAllSitesInput = document.getElementById('show-float-all-sites');
const btnClear = document.getElementById('btn-clear');
const statusEl = document.getElementById('status');

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status status--${type}`;
  statusEl.style.display = 'block';
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

async function loadSavedConfig() {
  const config = await getConfig();
  if (config) {
    domainInput.value = config.domain;
    emailInput.value = config.email;
    apiTokenInput.value = config.apiToken;
  }
  const { autoOpen, showFloatOnAllSites } = await chrome.storage.sync.get(['autoOpen', 'showFloatOnAllSites']);
  autoOpenInput.checked = autoOpen === true;
  showFloatAllSitesInput.checked = showFloatOnAllSites === true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const domain = domainInput.value.trim().replace(/^https?:\/\//, '').replace(/\.atlassian\.net.*$/, '').replace(/\/$/, '');
  const email = emailInput.value.trim();
  const apiToken = apiTokenInput.value.trim();

  if (!domain || !email || !apiToken) {
    showStatus('모든 필드를 입력해주세요.', 'error');
    return;
  }

  await saveConfig({ domain, email, apiToken });
  await chrome.storage.sync.set({ autoOpen: autoOpenInput.checked, showFloatOnAllSites: showFloatAllSitesInput.checked });
  domainInput.value = domain;
  showStatus('설정이 저장되었습니다.', 'success');
});

btnClear.addEventListener('click', async () => {
  await clearConfig();
  await chrome.storage.sync.remove(['autoOpen', 'showFloatOnAllSites']);
  domainInput.value = '';
  emailInput.value = '';
  apiTokenInput.value = '';
  autoOpenInput.checked = false;
  showFloatAllSitesInput.checked = false;
  showStatus('설정이 초기화되었습니다.', 'success');
});

loadSavedConfig();
