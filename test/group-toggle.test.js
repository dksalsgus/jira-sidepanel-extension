import test from 'node:test';
import assert from 'node:assert/strict';

import { setGroupCollapsed, toggleGroupFromEvent } from '../shared/group-toggle.js';

function createHeader() {
  const classes = new Set();
  const group = {
    classList: {
      add(className) {
        classes.add(className);
      },
      remove(className) {
        classes.delete(className);
      },
      toggle(className) {
        if (classes.has(className)) {
          classes.delete(className);
          return false;
        }
        classes.add(className);
        return true;
      },
      contains(className) {
        return classes.has(className);
      },
    },
  };

  return {
    attrs: {},
    parentElement: group,
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    hasClass(className) {
      return classes.has(className);
    },
  };
}

test('setGroupCollapsed keeps collapsed class and aria-expanded in sync', () => {
  const header = createHeader();

  setGroupCollapsed(header, true);
  assert.equal(header.hasClass('is-collapsed'), true);
  assert.equal(header.attrs['aria-expanded'], 'false');

  setGroupCollapsed(header, false);
  assert.equal(header.hasClass('is-collapsed'), false);
  assert.equal(header.attrs['aria-expanded'], 'true');
});

test('toggleGroupFromEvent supports click and keyboard activation only', () => {
  const header = createHeader();
  let prevented = 0;

  assert.equal(toggleGroupFromEvent(header, {
    type: 'keydown',
    key: 'Escape',
    target: { classList: { contains: () => false } },
    preventDefault() {
      prevented += 1;
    },
  }, 'issue-group__key'), false);
  assert.equal(prevented, 0);

  assert.equal(toggleGroupFromEvent(header, {
    type: 'keydown',
    key: 'Enter',
    target: { classList: { contains: () => false } },
    preventDefault() {
      prevented += 1;
    },
  }, 'issue-group__key'), true);
  assert.equal(prevented, 1);
  assert.equal(header.hasClass('is-collapsed'), true);
  assert.equal(header.attrs['aria-expanded'], 'false');
});
