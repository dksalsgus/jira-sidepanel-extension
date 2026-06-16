// content/content.js — Jira 페이지에 플로팅 패널 주입
import { getConfig } from '../utils/storage.js';
import { escapeHtml } from '../shared/escape-html.js';
import { getCategoryKey } from '../shared/status-utils.js';
import { groupIssues } from '../shared/issue-grouping.js';
import { generateIssueListHtml, CONTENT_CLASS_CONFIG as CLS } from '../shared/issue-renderer.js';
import { getIssueCacheAgeLabel } from '../shared/issue-cache.js';
import { loadIssuesWithCache } from '../shared/issue-loading.js';
import { setGroupCollapsed, toggleGroupFromEvent } from '../shared/group-toggle.js';

const PANEL_ID = 'jira-my-tickets-panel';
const TOGGLE_BTN_ID = 'jira-my-tickets-toggle';

let currentSprintFilter = 'all'; // 'current' | 'all'
let currentStatusFilter = 'all';     // 'all' | 'todo' | 'inprogress' | 'done'
let currentView = 'tickets';         // 'tickets' | 'settings'
let isLoading = false;
let allIssues = [];

// ── 스토리지 ────────────────────────────────────────────────
function getPrefs() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['autoOpen', 'showFloatOnAllSites'], resolve);
  });
}

// ── 패널 헬퍼 ───────────────────────────────────────────────
function getPanelEl() {
  return document.getElementById(PANEL_ID);
}

function setFilterBarVisible(visible) {
  const panel = getPanelEl();
  panel.querySelectorAll('.jmt-filter-bar').forEach((el) => {
    el.style.display = visible ? 'flex' : 'none';
  });
}

// ── 티켓 뷰 렌더링 ──────────────────────────────────────────
function renderLoading() {
  setFilterBarVisible(false);
  getPanelEl().querySelector('.jmt-body').innerHTML = `
    <div class="jmt-loading">
      <div class="jmt-spinner"></div>
      <span>불러오는 중...</span>
    </div>
  `;
}

function renderUnconfigured() {
  setFilterBarVisible(false);
  const body = getPanelEl().querySelector('.jmt-body');
  body.innerHTML = `
    <div class="jmt-empty">
      <div class="jmt-empty__icon">⚙️</div>
      <div class="jmt-empty__title">설정이 필요합니다</div>
      <div class="jmt-empty__desc">우측 상단 ⚙ 버튼에서 Jira 정보를 입력하세요.</div>
      <button class="jmt-btn-primary jmt-goto-settings">설정으로 이동</button>
    </div>
  `;
  body.querySelector('.jmt-goto-settings').addEventListener('click', () => showView('settings'));
}

function renderError(message, isAuth) {
  setFilterBarVisible(false);
  const body = getPanelEl().querySelector('.jmt-body');
  body.innerHTML = `
    <div class="jmt-empty">
      <div class="jmt-empty__icon">⚠️</div>
      <div class="jmt-empty__title">${isAuth ? '인증 실패' : '오류 발생'}</div>
      <div class="jmt-empty__desc">${escapeHtml(message)}</div>
      ${isAuth ? '<button class="jmt-btn-primary jmt-goto-settings">설정 확인</button>' : ''}
    </div>
  `;
  if (isAuth) {
    body.querySelector('.jmt-goto-settings').addEventListener('click', () => showView('settings'));
  }
}

function getCacheNoticeHtml(cacheEntry, state) {
  if (!cacheEntry) return '';
  const age = getIssueCacheAgeLabel(cacheEntry.cachedAt);
  const message = state === 'stale'
    ? `최신 조회에 실패해 ${age} 데이터를 표시합니다.`
    : `${age} 데이터를 표시하는 중입니다.`;
  return `<div class="jmt-cache-notice">${escapeHtml(message)}</div>`;
}

function getFilteredIssues() {
  if (currentStatusFilter === 'all') return allIssues;
  return allIssues.filter((i) => i.categoryKey === currentStatusFilter);
}

function withCategoryKey(issue) {
  return {
    ...issue,
    categoryKey: issue.categoryKey ?? getCategoryKey(issue.statusCategory),
  };
}

function updateStatusFilterCounts() {
  const panel = getPanelEl();
  const counts = {
    all: allIssues.length,
    todo: allIssues.filter((i) => i.categoryKey === 'todo').length,
    inprogress: allIssues.filter((i) => i.categoryKey === 'inprogress').length,
    done: allIssues.filter((i) => i.categoryKey === 'done').length,
  };
  panel.querySelectorAll('.jmt-status-btn').forEach((btn) => {
    const countEl = btn.querySelector('.jmt-status-btn__count');
    if (countEl) countEl.textContent = counts[btn.dataset.status] ?? 0;
  });
}

function renderIssues(cacheEntry = null, state = null) {
  setFilterBarVisible(true);
  updateStatusFilterCounts();

  const issues = getFilteredIssues();
  const body = getPanelEl().querySelector('.jmt-body');

  if (issues.length === 0) {
    body.innerHTML = `
      ${getCacheNoticeHtml(cacheEntry, state)}
      <div class="jmt-empty">
        <div class="jmt-empty__icon">✅</div>
        <div class="jmt-empty__title">티켓이 없습니다</div>
        <div class="jmt-empty__desc">조건에 맞는 티켓이 없습니다.</div>
      </div>
    `;
    return;
  }

  const { groups, independent } = groupIssues(issues);
  body.innerHTML = `
    ${getCacheNoticeHtml(cacheEntry, state)}
    ${generateIssueListHtml(issues, groups, independent, CLS)}
  `;

  // 펼치기/접기 이벤트
  const btnExpandAll = body.querySelector(`#${CLS.btnExpandAll}`);
  const btnCollapseAll = body.querySelector(`#${CLS.btnCollapseAll}`);
  if (btnExpandAll) {
    btnExpandAll.addEventListener('click', () => {
      body.querySelectorAll(`.${CLS.groupHeader}`).forEach(el => setGroupCollapsed(el, false));
    });
  }
  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      body.querySelectorAll(`.${CLS.groupHeader}`).forEach(el => setGroupCollapsed(el, true));
    });
  }

  body.querySelectorAll(`.${CLS.groupHeader}`).forEach(el => {
    el.addEventListener('click', (e) => toggleGroupFromEvent(el, e, CLS.groupKey));
    el.addEventListener('keydown', (e) => toggleGroupFromEvent(el, e, CLS.groupKey));
  });

  body.querySelectorAll(`.${CLS.groupKey}, .${CLS.issue}`).forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      getConfig().then((config) => {
        if (config) window.open(`https://${config.domain}.atlassian.net/browse/${el.dataset.key}`, '_blank');
      });
    });
  });
}

// ── 설정 뷰 렌더링 ──────────────────────────────────────────
async function renderSettings() {
  setFilterBarVisible(false);
  const body = getPanelEl().querySelector('.jmt-body');

  const config = await getConfig().then((c) => c ?? { domain: '', email: '', apiToken: '' });
  const prefs = await getPrefs();

  body.innerHTML = `
    <div class="jmt-settings">
      <div class="jmt-settings__section">
        <div class="jmt-settings__title">Jira 연결</div>

        <div class="jmt-field">
          <label class="jmt-label" for="jmt-domain">도메인</label>
          <input class="jmt-input" id="jmt-domain" type="text" placeholder="mycompany" value="${escapeHtml(config.domain)}" spellcheck="false" />
          <span class="jmt-hint">mycompany.atlassian.net</span>
        </div>

        <div class="jmt-field">
          <label class="jmt-label" for="jmt-email">이메일</label>
          <input class="jmt-input" id="jmt-email" type="email" placeholder="you@example.com" value="${escapeHtml(config.email)}" />
        </div>

        <div class="jmt-field">
          <label class="jmt-label" for="jmt-token">API Token</label>
          <input class="jmt-input" id="jmt-token" type="password" placeholder="API Token" value="${escapeHtml(config.apiToken)}" />
        </div>
      </div>

      <div class="jmt-settings__section">
        <div class="jmt-settings__title">옵션</div>

        <label class="jmt-toggle">
          <input type="checkbox" id="jmt-auto-open" ${prefs.autoOpen ? 'checked' : ''} />
          <span class="jmt-toggle__track"></span>
          <span class="jmt-toggle__label">Jira 진입 시 패널 자동 열기</span>
        </label>

        <label class="jmt-toggle">
          <input type="checkbox" id="jmt-float-all" ${prefs.showFloatOnAllSites ? 'checked' : ''} />
          <span class="jmt-toggle__track"></span>
          <span class="jmt-toggle__label">모든 사이트에서 플로팅 버튼 표시</span>
        </label>
      </div>

      <div class="jmt-settings__actions">
        <button class="jmt-btn-primary" id="jmt-save">저장</button>
        <div class="jmt-save-msg" id="jmt-save-msg"></div>
      </div>
    </div>
  `;

  body.querySelector('#jmt-save').addEventListener('click', async () => {
    const domain = body.querySelector('#jmt-domain').value.trim()
      .replace(/^https?:\/\//, '').replace(/\.atlassian\.net.*$/, '').replace(/\/$/, '');
    const email = body.querySelector('#jmt-email').value.trim();
    const apiToken = body.querySelector('#jmt-token').value.trim();
    const autoOpen = body.querySelector('#jmt-auto-open').checked;
    const showFloatOnAllSites = body.querySelector('#jmt-float-all').checked;

    if (!domain || !email || !apiToken) {
      showSaveMsg('모든 필드를 입력해주세요.', false);
      return;
    }

    await new Promise((resolve) => chrome.storage.sync.set({ domain, email, apiToken, autoOpen, showFloatOnAllSites }, resolve));

    // 플로팅 버튼 표시 여부 즉시 반영
    const toggleBtn = document.getElementById(TOGGLE_BTN_ID);
    if (toggleBtn) toggleBtn.style.display = showFloatOnAllSites || isJiraSite() ? '' : 'none';

    showView('tickets');
  });

  function showSaveMsg(msg, ok) {
    const el = body.querySelector('#jmt-save-msg');
    el.textContent = msg;
    el.className = `jmt-save-msg jmt-save-msg--${ok ? 'ok' : 'err'}`;
    setTimeout(() => { el.textContent = ''; el.className = 'jmt-save-msg'; }, 2500);
  }
}

// ── 뷰 전환 ─────────────────────────────────────────────────
function showView(view) {
  currentView = view;
  const panel = getPanelEl();
  const btnSettings = panel.querySelector('.jmt-btn-settings');
  const btnBack = panel.querySelector('.jmt-btn-back');

  if (view === 'settings') {
    btnSettings.classList.add('jmt-btn-settings--active');
    btnBack.style.display = '';
    renderSettings();
  } else {
    btnSettings.classList.remove('jmt-btn-settings--active');
    btnBack.style.display = 'none';
    loadIssues();
  }
}

// ── 데이터 로드 ──────────────────────────────────────────────
async function loadIssues() {
  if (isLoading) return;
  isLoading = true;

  const panel = getPanelEl();
  const btnRefresh = panel.querySelector('.jmt-btn-refresh');
  if (btnRefresh) btnRefresh.disabled = true;

  try {
    const result = await loadIssuesWithCache(currentSprintFilter, {
      onCached: ({ issues, cacheEntry }) => {
        allIssues = issues.map(withCategoryKey);
        renderIssues(cacheEntry, 'refreshing');
      },
      onCacheMiss: renderLoading,
    });

    if (result.state === 'unconfigured') {
      renderUnconfigured();
    } else if (result.state === 'success') {
      allIssues = result.issues.map(withCategoryKey);
      renderIssues();
    } else if (result.state === 'stale') {
      allIssues = result.issues.map(withCategoryKey);
      renderIssues(result.cacheEntry, 'stale');
    } else if (result.state === 'error') {
      renderError(result.message, result.kind === 'auth');
    }
  } finally {
    isLoading = false;
    if (btnRefresh) btnRefresh.disabled = false;
  }
}

// ── 패널 DOM 생성 ────────────────────────────────────────────
function createPanel() {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="jmt-header">
      <button class="jmt-btn-back" title="뒤로" style="display:none">←</button>
      <span class="jmt-header__title">Please Be Done</span>
      <div class="jmt-header__actions">
        <button class="jmt-btn-refresh" title="새로고침">↻</button>
        <button class="jmt-btn-settings" title="설정">⚙</button>
        <button class="jmt-btn-close" title="닫기">✕</button>
      </div>
    </div>

    <div class="jmt-filter-bar jmt-sprint-bar" style="display:none">
      <button class="jmt-sprint-btn jmt-sprint-btn--active" data-sprint="all">전체</button>
      <button class="jmt-sprint-btn" data-sprint="current">현재 스프린트</button>
    </div>

    <div class="jmt-filter-bar jmt-status-bar" style="display:none">
      <button class="jmt-status-btn jmt-status-btn--active" data-status="all">
        전체 <span class="jmt-status-btn__count">0</span>
      </button>
      <button class="jmt-status-btn" data-status="todo">
        할 일 <span class="jmt-status-btn__count">0</span>
      </button>
      <button class="jmt-status-btn" data-status="inprogress">
        진행 중 <span class="jmt-status-btn__count">0</span>
      </button>
      <button class="jmt-status-btn" data-status="done">
        완료 <span class="jmt-status-btn__count">0</span>
      </button>
    </div>

    <div class="jmt-body"></div>
  `;

  panel.querySelector('.jmt-btn-close').addEventListener('click', () => {
    panel.classList.remove('jmt-panel--open');
  });

  panel.querySelector('.jmt-btn-back').addEventListener('click', () => {
    showView('tickets');
  });

  panel.querySelector('.jmt-btn-refresh').addEventListener('click', () => {
    if (currentView === 'tickets') loadIssues();
  });

  panel.querySelector('.jmt-btn-settings').addEventListener('click', () => {
    showView(currentView === 'settings' ? 'tickets' : 'settings');
  });

  panel.querySelectorAll('.jmt-sprint-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.jmt-sprint-btn').forEach((b) => b.classList.remove('jmt-sprint-btn--active'));
      btn.classList.add('jmt-sprint-btn--active');
      currentSprintFilter = btn.dataset.sprint;
      currentStatusFilter = 'all';
      panel.querySelectorAll('.jmt-status-btn').forEach((b) => b.classList.remove('jmt-status-btn--active'));
      panel.querySelector('.jmt-status-btn[data-status="all"]').classList.add('jmt-status-btn--active');
      loadIssues();
    });
  });

  panel.querySelectorAll('.jmt-status-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.jmt-status-btn').forEach((b) => b.classList.remove('jmt-status-btn--active'));
      btn.classList.add('jmt-status-btn--active');
      currentStatusFilter = btn.dataset.status;
      renderIssues();
    });
  });

  document.body.appendChild(panel);
  return panel;
}

// ── 토글 버튼 ────────────────────────────────────────────────
function createToggleBtn() {
  const btn = document.createElement('button');
  btn.id = TOGGLE_BTN_ID;
  btn.title = 'Please Be Done';
  btn.innerHTML = `<span>J</span>`;
  btn.addEventListener('click', togglePanel);
  document.body.appendChild(btn);
  return btn;
}

function isJiraSite() {
  return location.hostname.endsWith('.atlassian.net');
}

function togglePanel() {
  const panel = getPanelEl();
  const isOpen = panel.classList.contains('jmt-panel--open');
  if (isOpen) {
    panel.classList.remove('jmt-panel--open');
  } else {
    panel.classList.add('jmt-panel--open');
    if (currentView === 'tickets') loadIssues();
  }
}

// ── 초기화 ───────────────────────────────────────────────────
function init() {
  if (document.getElementById(PANEL_ID)) return;

  chrome.storage.sync.get(['autoOpen', 'showFloatOnAllSites'], ({ autoOpen, showFloatOnAllSites }) => {
    const shouldShowBtn = isJiraSite() || showFloatOnAllSites === true;
    if (!shouldShowBtn) return;

    createPanel();
    createToggleBtn();

    if (isJiraSite() && autoOpen === true) togglePanel();
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'TOGGLE_PANEL') togglePanel();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
