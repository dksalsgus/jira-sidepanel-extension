import { escapeHtml } from './escape-html.js';
import { getStatusBadgeClass } from './status-utils.js';

/**
 * CSS 클래스명 매핑 설정
 * @typedef {Object} ClassConfig
 */

/** content.js용 클래스 설정 (jmt- 접두사) */
export const CONTENT_CLASS_CONFIG = {
  issue: 'jmt-issue',
  priorityIcon: 'jmt-priority-icon',
  issueBody: 'jmt-issue__body',
  issueKey: 'jmt-issue__key',
  issueSummary: 'jmt-issue__summary',
  issueMeta: 'jmt-issue__meta',
  badge: 'jmt-badge',
  group: 'jmt-group',
  groupHeader: 'jmt-group__header',
  groupToggle: 'jmt-group__toggle',
  groupKey: 'jmt-group__key',
  groupSummary: 'jmt-group__summary',
  groupChildren: 'jmt-group__children',
  issueCountBar: 'jmt-issue-count-bar',
  issueCount: 'jmt-issue-count',
  issueControls: 'jmt-issue-controls',
  issueControlBtn: 'jmt-issue-control-btn',
  issueList: 'jmt-issue-list',
  btnExpandAll: 'jmt-btn-expand-all',
  btnCollapseAll: 'jmt-btn-collapse-all',
  issueTypeIcon: null,
};

/** sidepanel.js용 클래스 설정 */
export const SIDEPANEL_CLASS_CONFIG = {
  issue: 'issue-item',
  priorityIcon: 'issue-item__priority',
  issueBody: 'issue-item__body',
  issueKey: 'issue-item__key',
  issueSummary: 'issue-item__summary',
  issueMeta: 'issue-item__meta',
  badge: 'status-badge',
  group: 'issue-group',
  groupHeader: 'issue-group__header',
  groupToggle: 'issue-group__toggle',
  groupKey: 'issue-group__key',
  groupSummary: 'issue-group__summary',
  groupChildren: 'issue-group__children',
  issueCountBar: 'issue-count-bar',
  issueCount: 'issue-count',
  issueControls: 'issue-controls',
  issueControlBtn: 'issue-control-btn',
  issueList: 'issue-list',
  btnExpandAll: 'btn-expand-all',
  btnCollapseAll: 'btn-collapse-all',
  issueTypeIcon: 'issue-type-icon',
};

/**
 * 단일 이슈 HTML 생성
 * @param {object} issue
 * @param {ClassConfig} cls
 * @returns {string}
 */
export function generateIssueHtml(issue, cls) {
  const badgeClass = getStatusBadgeClass(issue.statusCategory);

  const priorityImg = issue.priorityIconUrl
    ? `<img class="${cls.priorityIcon}" src="${escapeHtml(issue.priorityIconUrl)}" alt="${escapeHtml(issue.priority)}" />`
    : `<span class="${cls.priorityIcon}"></span>`;

  const issueTypeImg = cls.issueTypeIcon && issue.issueTypeIconUrl
    ? `<img class="${cls.issueTypeIcon}" src="${escapeHtml(issue.issueTypeIconUrl)}" alt="${escapeHtml(issue.issueType)}" />`
    : '';

  return `
    <a class="${cls.issue}" href="#" data-key="${escapeHtml(issue.key)}" title="${escapeHtml(issue.summary)}">
      ${priorityImg}
      <div class="${cls.issueBody}">
        <div class="${cls.issueKey}">${escapeHtml(issue.key)}</div>
        <div class="${cls.issueSummary}">${escapeHtml(issue.summary)}</div>
        <div class="${cls.issueMeta}">
          <span class="${cls.badge} ${cls.badge}--${badgeClass}">${escapeHtml(issue.status)}</span>
          ${issueTypeImg}
        </div>
      </div>
    </a>
  `;
}

/**
 * 이슈 목록 전체 HTML 생성
 * @param {Array} issues
 * @param {Map} groups
 * @param {Array} independent
 * @param {ClassConfig} cls
 * @returns {string}
 */
export function generateIssueListHtml(issues, groups, independent, cls) {
  const groupHtml = Array.from(groups.values()).map(group => `
    <div class="${cls.group}">
      <div class="${cls.groupHeader}" role="button" tabindex="0" aria-expanded="true" aria-controls="${cls.group}-${escapeHtml(group.parent.key)}-children">
        <span class="${cls.groupToggle}">\u25BC</span>
        <span class="${cls.groupKey}" data-key="${escapeHtml(group.parent.key)}">${escapeHtml(group.parent.key)}</span>
        <span class="${cls.groupSummary}">${escapeHtml(group.parent.summary)}</span>
      </div>
      <div class="${cls.groupChildren}" id="${cls.group}-${escapeHtml(group.parent.key)}-children">
        ${group.children.map(issue => generateIssueHtml(issue, cls)).join('')}
      </div>
    </div>
  `).join('');

  const indepHtml = independent.map(issue => generateIssueHtml(issue, cls)).join('');

  return `
    <div class="${cls.issueCountBar}">
      <span class="${cls.issueCount}">${issues.length} issue${issues.length === 1 ? '' : 's'}</span>
      <div class="${cls.issueControls}">
        <button class="${cls.issueControlBtn}" id="${cls.btnExpandAll}">Expand All</button>
        <button class="${cls.issueControlBtn}" id="${cls.btnCollapseAll}">Collapse All</button>
      </div>
    </div>
    <div class="${cls.issueList}">${groupHtml}${indepHtml}</div>
  `;
}
