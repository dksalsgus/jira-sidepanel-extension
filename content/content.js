// content/content.js — Jira 페이지에 플로팅 패널 주입

const PANEL_ID = 'jira-my-tickets-panel';
const TOGGLE_BTN_ID = 'jira-my-tickets-toggle';

let currentSprintFilter = 'current'; // 'current' | 'all'
let currentStatusFilter = 'all';     // 'all' | 'todo' | 'inprogress' | 'done'
let currentView = 'tickets';         // 'tickets' | 'settings'
let isLoading = false;
let allIssues = [];

// ── 유틸 ───────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStatusBadgeClass(colorName) {
  const map = { 'blue-grey': 'blue-grey', yellow: 'yellow', green: 'green' };
  return map[colorName] ?? 'default';
}

function getCategoryKey(colorName) {
  if (colorName === 'yellow') return 'inprogress';
  if (colorName === 'green') return 'done';
  return 'todo';
}

// ── 스토리지 ────────────────────────────────────────────────
function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['domain', 'email', 'apiToken'], (result) => {
      if (!result.domain || !result.email || !result.apiToken) {
        resolve(null);
      } else {
        resolve({ domain: result.domain, email: result.email, apiToken: result.apiToken });
      }
    });
  });
}

function getPrefs() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['autoOpen', 'showFloatOnAllSites'], resolve);
  });
}

function savePrefs(prefs) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(prefs, resolve);
  });
}

// ── API ─────────────────────────────────────────────────────
async function fetchIssues(config, sprintFilter) {
  const jqlMap = {
    current: 'assignee = currentUser() AND sprint in openSprints() ORDER BY priority DESC',
    all: 'assignee = currentUser() ORDER BY updated DESC',
  };
  const jql = jqlMap[sprintFilter] ?? jqlMap.all;
  const fields = 'summary,status,priority,issuetype,parent';
  const url = `https://${config.domain}.atlassian.net/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=50`;

  const credentials = btoa(`${config.email}:${config.apiToken}`);
  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'FETCH_JIRA',
      url,
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
    }, resolve);
  });

  if (res?.error) {
    throw { status: 0, message: res.error };
  }

  if (!res?.ok) {
    const msg = res.body?.errorMessages?.[0] ?? res.body?.message ?? `HTTP ${res.status}`;
    throw { status: res.status, message: msg };
  }

  return res.body.issues.map((raw) => {
    const f = raw.fields;
    const colorName = f.status?.statusCategory?.colorName ?? 'default';
    const parent = f.parent ? {
      key: f.parent.key,
      summary: f.parent.fields?.summary ?? '(제목 없음)'
    } : null;
    return {
      key: raw.key,
      summary: f.summary ?? '(제목 없음)',
      status: f.status?.name ?? '',
      statusCategory: colorName,
      categoryKey: getCategoryKey(colorName),
      priority: f.priority?.name ?? '',
      priorityIconUrl: f.priority?.iconUrl ?? '',
      parent,
    };
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

function getFilteredIssues() {
  if (currentStatusFilter === 'all') return allIssues;
  return allIssues.filter((i) => i.categoryKey === currentStatusFilter);
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

function renderIssues() {
  setFilterBarVisible(true);
  updateStatusFilterCounts();

  const issues = getFilteredIssues();
  const body = getPanelEl().querySelector('.jmt-body');

  if (issues.length === 0) {
    body.innerHTML = `
      <div class="jmt-empty">
        <div class="jmt-empty__icon">✅</div>
        <div class="jmt-empty__title">티켓이 없습니다</div>
        <div class="jmt-empty__desc">조건에 맞는 티켓이 없습니다.</div>
      </div>
    `;
    return;
  }

  const groups = new Map();
  const independent = [];
  issues.forEach(issue => {
    if (issue.parent) {
      if (!groups.has(issue.parent.key)) {
        groups.set(issue.parent.key, { parent: issue.parent, children: [] });
      }
      groups.get(issue.parent.key).children.push(issue);
    } else {
      independent.push(issue);
    }
  });

  const generateIssueHtml = (issue) => {
    const badgeClass = getStatusBadgeClass(issue.statusCategory);
    const priorityImg = issue.priorityIconUrl
      ? `<img class="jmt-priority-icon" src="${escapeHtml(issue.priorityIconUrl)}" alt="${escapeHtml(issue.priority)}" />`
      : '<span class="jmt-priority-icon"></span>';
    return `
      <a class="jmt-issue" href="#" data-key="${escapeHtml(issue.key)}" title="${escapeHtml(issue.summary)}">
        ${priorityImg}
        <div class="jmt-issue__body">
          <div class="jmt-issue__key">${escapeHtml(issue.key)}</div>
          <div class="jmt-issue__summary">${escapeHtml(issue.summary)}</div>
          <div class="jmt-issue__meta">
            <span class="jmt-badge jmt-badge--${badgeClass}">${escapeHtml(issue.status)}</span>
          </div>
        </div>
      </a>
    `;
  };

  const groupHtml = Array.from(groups.values()).map(group => `
    <div class="jmt-group">
      <div class="jmt-group__header">
        <span class="jmt-group__toggle">▼</span>
        <span class="jmt-group__key" data-key="${escapeHtml(group.parent.key)}">${escapeHtml(group.parent.key)}</span>
        <span class="jmt-group__summary">${escapeHtml(group.parent.summary)}</span>
      </div>
      <div class="jmt-group__children">
        ${group.children.map(generateIssueHtml).join('')}
      </div>
    </div>
  `).join('');

  const indepHtml = independent.map(generateIssueHtml).join('');

  body.innerHTML = `
    <div class="jmt-issue-count">${issues.length}개의 티켓</div>
    <div class="jmt-issue-list">${groupHtml}${indepHtml}</div>
  `;

  body.querySelectorAll('.jmt-group__header').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('jmt-group__key')) return;
      el.parentElement.classList.toggle('is-collapsed');
    });
  });

  body.querySelectorAll('.jmt-group__key, .jmt-issue').forEach((el) => {
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

  renderLoading();

  const config = await getConfig();
  if (!config) {
    isLoading = false;
    if (btnRefresh) btnRefresh.disabled = false;
    renderUnconfigured();
    return;
  }

  try {
    allIssues = await fetchIssues(config, currentSprintFilter);
    renderIssues();
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      renderError(`인증 오류 (${err.status}): 이메일과 API Token을 확인해주세요.`, true);
    } else if (err.status === 429) {
      renderError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', false);
    } else {
      renderError(`API 오류 (${err.status ?? ''}): ${err.message ?? '알 수 없는 오류'}`, false);
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
      <button class="jmt-sprint-btn jmt-sprint-btn--active" data-sprint="current">현재 스프린트</button>
      <button class="jmt-sprint-btn" data-sprint="all">전체</button>
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
