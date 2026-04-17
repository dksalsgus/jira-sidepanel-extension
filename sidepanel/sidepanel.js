// sidepanel/sidepanel.js — Side Panel 메인 로직
import { getConfig } from '../utils/storage.js';
import { fetchAssignedIssues, ApiError } from '../utils/api.js';
import { escapeHtml } from '../shared/escape-html.js';
import { groupIssues } from '../shared/issue-grouping.js';
import { generateIssueListHtml, SIDEPANEL_CLASS_CONFIG as CLS } from '../shared/issue-renderer.js';

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

function renderEmpty() {
  filterBar.style.display = 'flex';
  contentEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">✅</div>
      <div class="empty-state__title">할당된 티켓이 없습니다</div>
      <div class="empty-state__desc">
        ${currentFilter === 'current' ? '현재 스프린트에 할당된 티켓이 없습니다.' : '할당된 티켓이 없습니다.'}
      </div>
    </div>
  `;
}

function renderIssues(issues) {
  filterBar.style.display = 'flex';

  const { groups, independent } = groupIssues(issues);
  contentEl.innerHTML = generateIssueListHtml(issues, groups, independent, CLS);

  // 전체 펼치기 / 접기 이벤트
  const btnExpandAll = contentEl.querySelector(`#${CLS.btnExpandAll}`);
  const btnCollapseAll = contentEl.querySelector(`#${CLS.btnCollapseAll}`);
  if (btnExpandAll) {
    btnExpandAll.addEventListener('click', () => {
      contentEl.querySelectorAll(`.${CLS.group}`).forEach(el => el.classList.remove('is-collapsed'));
    });
  }
  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      contentEl.querySelectorAll(`.${CLS.group}`).forEach(el => el.classList.add('is-collapsed'));
    });
  }

  // 토글 이벤트
  contentEl.querySelectorAll(`.${CLS.groupHeader}`).forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains(CLS.groupKey)) return;
      el.parentElement.classList.toggle('is-collapsed');
    });
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

  renderLoading();

  const config = await getConfig();
  if (!config) {
    isLoading = false;
    btnRefresh.disabled = false;
    renderUnconfigured();
    return;
  }

  try {
    const issues = await fetchAssignedIssues(config, currentFilter);
    if (issues.length === 0) {
      renderEmpty();
    } else {
      renderIssues(issues);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401 || err.status === 403) {
        renderError(`인증 오류 (${err.status}): 이메일과 API Token을 확인해주세요.`, true);
      } else if (err.status === 429) {
        renderError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', false);
      } else {
        renderError(`API 오류 (${err.status}): ${err.message}`, false);
      }
    } else {
      renderError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.', false);
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
