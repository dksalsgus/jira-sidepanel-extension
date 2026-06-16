// sidepanel/sidepanel.js — Side Panel 메인 로직
import { getConfig } from '../utils/storage.js';
import { escapeHtml } from '../shared/escape-html.js';
import { groupIssues } from '../shared/issue-grouping.js';
import { generateIssueListHtml, SIDEPANEL_CLASS_CONFIG as CLS } from '../shared/issue-renderer.js';
import { getIssueCacheAgeLabel } from '../shared/issue-cache.js';
import { loadIssuesWithCache } from '../shared/issue-loading.js';
import { setGroupCollapsed, toggleGroupFromEvent } from '../shared/group-toggle.js';

let currentFilter = 'all'; // 'current' | 'all'
let isLoading = false;

const contentEl = document.getElementById('content');
const filterBar = document.getElementById('filter-bar');
const btnRefresh = document.getElementById('btn-refresh');
const btnCurrent = document.getElementById('btn-current');
const btnAll = document.getElementById('btn-all');

function renderLoading() {
  filterBar.style.display = 'none';
  contentEl.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <span>불러오는 중...</span>
    </div>
  `;
}

function renderUnconfigured() {
  filterBar.style.display = 'none';
  contentEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">⚙️</div>
      <div class="empty-state__title">설정이 필요합니다</div>
      <div class="empty-state__desc">
        Jira 도메인, 이메일, API Token을 입력하여 내 티켓을 확인하세요.
      </div>
      <button class="empty-state__btn" id="btn-open-options">설정 열기</button>
    </div>
  `;
  document.getElementById('btn-open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function renderError(message, isAuthError) {
  filterBar.style.display = 'none';
  contentEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">⚠️</div>
      <div class="empty-state__title">${isAuthError ? '인증 실패' : '오류 발생'}</div>
      <div class="empty-state__desc">${escapeHtml(message)}</div>
      ${isAuthError ? '<button class="empty-state__btn" id="btn-open-options">설정 확인</button>' : ''}
    </div>
  `;
  if (isAuthError) {
    document.getElementById('btn-open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
}

function getCacheNoticeHtml(cacheEntry, state) {
  if (!cacheEntry) return '';
  const age = getIssueCacheAgeLabel(cacheEntry.cachedAt);
  const message = state === 'stale'
    ? `최신 조회에 실패해 ${age} 데이터를 표시합니다.`
    : `${age} 데이터를 표시하는 중입니다.`;
  return `<div class="cache-notice">${escapeHtml(message)}</div>`;
}

function renderEmpty(cacheEntry = null, state = null) {
  filterBar.style.display = 'flex';
  contentEl.innerHTML = `
    ${getCacheNoticeHtml(cacheEntry, state)}
    <div class="empty-state">
      <div class="empty-state__icon">✅</div>
      <div class="empty-state__title">할당된 티켓이 없습니다</div>
      <div class="empty-state__desc">
        ${currentFilter === 'current' ? '현재 스프린트에 할당된 티켓이 없습니다.' : '할당된 티켓이 없습니다.'}
      </div>
    </div>
  `;
}

function renderIssues(issues, cacheEntry = null, state = null) {
  filterBar.style.display = 'flex';

  const { groups, independent } = groupIssues(issues);
  contentEl.innerHTML = `
    ${getCacheNoticeHtml(cacheEntry, state)}
    ${generateIssueListHtml(issues, groups, independent, CLS)}
  `;

  // 전체 펼치기 / 접기 이벤트
  const btnExpandAll = contentEl.querySelector(`#${CLS.btnExpandAll}`);
  const btnCollapseAll = contentEl.querySelector(`#${CLS.btnCollapseAll}`);
  if (btnExpandAll) {
    btnExpandAll.addEventListener('click', () => {
      contentEl.querySelectorAll(`.${CLS.groupHeader}`).forEach(el => setGroupCollapsed(el, false));
    });
  }
  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      contentEl.querySelectorAll(`.${CLS.groupHeader}`).forEach(el => setGroupCollapsed(el, true));
    });
  }

  // 토글 이벤트
  contentEl.querySelectorAll(`.${CLS.groupHeader}`).forEach(el => {
    el.addEventListener('click', (e) => toggleGroupFromEvent(el, e, CLS.groupKey));
    el.addEventListener('keydown', (e) => toggleGroupFromEvent(el, e, CLS.groupKey));
  });

  // 티켓 및 부모 키 클릭 시 새 탭으로 열기
  contentEl.querySelectorAll(`.${CLS.groupKey}, .${CLS.issue}`).forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = el.dataset.key;
      getConfig().then((config) => {
        if (config) {
          chrome.tabs.create({ url: `https://${config.domain}.atlassian.net/browse/${key}` });
        }
      });
    });
  });
}

async function loadIssues() {
  if (isLoading) return;
  isLoading = true;
  btnRefresh.disabled = true;

  try {
    const result = await loadIssuesWithCache(currentFilter, {
      onCached: ({ issues, cacheEntry }) => {
        if (issues.length === 0) {
          renderEmpty(cacheEntry, 'refreshing');
        } else {
          renderIssues(issues, cacheEntry, 'refreshing');
        }
      },
      onCacheMiss: renderLoading,
    });

    if (result.state === 'unconfigured') {
      renderUnconfigured();
    } else if (result.state === 'success') {
      if (result.issues.length === 0) {
        renderEmpty();
      } else {
        renderIssues(result.issues);
      }
    } else if (result.state === 'stale') {
      renderIssues(result.issues, result.cacheEntry, 'stale');
    } else if (result.state === 'error') {
      renderError(result.message, result.kind === 'auth');
    }
  } finally {
    isLoading = false;
    btnRefresh.disabled = false;
  }
}

function setFilter(filter) {
  currentFilter = filter;
  btnCurrent.classList.toggle('filter-btn--active', filter === 'current');
  btnAll.classList.toggle('filter-btn--active', filter === 'all');
  loadIssues();
}

// 이벤트 바인딩
btnRefresh.addEventListener('click', loadIssues);
btnCurrent.addEventListener('click', () => setFilter('current'));
btnAll.addEventListener('click', () => setFilter('all'));

// 초기 로드
loadIssues();
