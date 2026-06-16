import test from 'node:test';
import assert from 'node:assert/strict';

import { generateIssueListHtml, SIDEPANEL_CLASS_CONFIG as CLS } from '../shared/issue-renderer.js';
import { groupIssues } from '../shared/issue-grouping.js';

test('renders issue groups with keyboard-accessible expanded state semantics', () => {
  const issues = [
    {
      key: 'ABC-2',
      summary: 'Child issue',
      status: 'To Do',
      statusCategory: 'blue-gray',
      priority: '',
      priorityIconUrl: '',
      issueType: '',
      issueTypeIconUrl: '',
      parent: {
        key: 'ABC-1',
        summary: 'Parent issue',
      },
    },
  ];
  const { groups, independent } = groupIssues(issues);

  const html = generateIssueListHtml(issues, groups, independent, CLS);

  assert.match(html, /role="button"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-controls="issue-group-ABC-1-children"/);
  assert.match(html, /id="issue-group-ABC-1-children"/);
});
