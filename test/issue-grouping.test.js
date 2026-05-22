import test from 'node:test';
import assert from 'node:assert/strict';

import { groupIssues } from '../shared/issue-grouping.js';

test('keeps parent issues out of the independent list when they also own grouped children', () => {
  const parent = {
    key: 'ABC-1',
    summary: 'Parent issue',
    parent: null,
  };
  const child = {
    key: 'ABC-2',
    summary: 'Child issue',
    parent: {
      key: 'ABC-1',
      summary: 'Parent issue',
    },
  };

  const { groups, independent } = groupIssues([parent, child]);

  assert.equal(groups.size, 1);
  assert.deepEqual(groups.get('ABC-1'), {
    parent: child.parent,
    children: [child],
  });
  assert.deepEqual(independent, []);
});

test('keeps unrelated top-level issues in the independent list', () => {
  const topLevel = {
    key: 'ABC-10',
    summary: 'Standalone issue',
    parent: null,
  };
  const child = {
    key: 'ABC-11',
    summary: 'Grouped child',
    parent: {
      key: 'ABC-9',
      summary: 'Another parent',
    },
  };

  const { groups, independent } = groupIssues([topLevel, child]);

  assert.equal(groups.size, 1);
  assert.deepEqual(independent, [topLevel]);
});
