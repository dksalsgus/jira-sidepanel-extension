import test from 'node:test';
import assert from 'node:assert/strict';

import { getStatusBadgeClass } from '../shared/status-utils.js';

test('maps Jira blue-gray status categories to the existing todo badge class', () => {
  assert.equal(getStatusBadgeClass('blue-gray'), 'blue-grey');
  assert.equal(getStatusBadgeClass('blue-grey'), 'blue-grey');
});
