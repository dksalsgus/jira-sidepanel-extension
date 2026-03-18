// options/options.js — 설정 페이지 로직
import { getConfig, saveConfig, clearConfig } from '../utils/storage.js';
import { fetchAssignedIssues } from '../utils/api.js';

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
    await fetchAssignedIssues({ domain, email, apiToken }, 'current');
    return true;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      throw new Error('인증 실패: 이메일과 API Token을 확인해주세요.');
    }
    if (error.status === 404) {
      throw new Error('도메인을 찾을 수 없습니다.');
    }
    throw new Error('연결 실패: 네트워크를 확인해주세요.');
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
    showStatus('모든 필드를 입력해주세요.', 'error');
    return;
  }

  if (!validateDomain(domain)) {
    showStatus('유효하지 않은 도메인입니다. (예: mycompany)', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showStatus('유효하지 않은 이메일 형식입니다.', 'error');
    return;
  }

  if (!validateApiToken(apiToken)) {
    showStatus('유효하지 않은 API Token입니다. ATCT로 시작해야 합니다.', 'error');
    return;
  }

  // 연결 테스트
  showStatus('연결 테스트 중...', 'info');
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
