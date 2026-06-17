// options/options.js — 설정 페이지 로직
import { getConfig, saveConfig, clearConfig } from '../utils/storage.js';
import { fetchMyself } from '../utils/api.js';

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

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateApiToken(token) {
  // Atlassian API Token: ATCT 또는 ATATT로 시작
  return (token.startsWith('ATCT') || token.startsWith('ATATT')) && token.length >= 20;
}

function validateDomain(domain) {
  // 도메인: 영문소문자, 숫자, 하이픈만 허용, 최소 2자
  const re = /^[a-z0-9][a-z0-9-]{1,63}$/i;
  return re.test(domain);
}

async function testConnection(domain, email, apiToken) {
  try {
    await fetchMyself({ domain, email, apiToken });
    return true;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      throw new Error('Authentication failed: check your email and API token.');
    }
    if (error.status === 404) {
      throw new Error('Domain not found.');
    }
    throw new Error('Connection failed: check your network.');
  }
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

  // 유효성 검사
  if (!domain || !email || !apiToken) {
    showStatus('Enter all required fields.', 'error');
    return;
  }

  if (!validateDomain(domain)) {
    showStatus('Enter a valid domain. Example: mycompany', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showStatus('Enter a valid email address.', 'error');
    return;
  }

  if (!validateApiToken(apiToken)) {
    showStatus('Enter a valid API token. It should start with ATCT or ATATT.', 'error');
    return;
  }

  // 연결 테스트
  showStatus('Testing connection...', 'info');
  try {
    await testConnection(domain, email, apiToken);
  } catch (error) {
    showStatus(error.message, 'error');
    return;
  }

  // 저장
  await saveConfig({ domain, email, apiToken });
  await chrome.storage.sync.set({ autoOpen: autoOpenInput.checked, showFloatOnAllSites: showFloatAllSitesInput.checked });
  domainInput.value = domain;
  showStatus('Settings saved.', 'success');
});

btnClear.addEventListener('click', async () => {
  await clearConfig();
  await chrome.storage.sync.remove(['autoOpen', 'showFloatOnAllSites']);
  domainInput.value = '';
  emailInput.value = '';
  apiTokenInput.value = '';
  autoOpenInput.checked = false;
  showFloatAllSitesInput.checked = false;
  showStatus('Settings cleared.', 'success');
});

loadSavedConfig();
