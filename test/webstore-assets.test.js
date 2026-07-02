import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const generatorUrl = new URL('../scripts/generate-webstore-assets.mjs', import.meta.url);
const sourceUrl = new URL('../store-assets/source.html', import.meta.url);

const assets = [
  ['promo', 'promo-small-440x280.png', 'Assigned Jira issues at a glance'],
  ['marquee', 'promo-marquee-1400x560.png', 'Your assigned Jira issues, ready when you need them.'],
  ['sidepanel', 'screenshot-sidepanel-1280x800.png', 'Current sprint or every assigned issue.'],
  ['floating', 'screenshot-floating-panel-1280x800.png', 'Open assigned issues from any page.'],
  ['settings', 'screenshot-settings-1280x800.png', 'Connect directly to Jira Cloud with your API token.'],
];

test('web store asset generator renders the canonical source into five release assets', async () => {
  const [generator, source] = await Promise.all([
    readFile(generatorUrl, 'utf8'),
    readFile(sourceUrl, 'utf8'),
  ]);

  assert.match(generator, /store-assets[^\n]+source\.html/);

  for (const [renderer, output, message] of assets) {
    assert.match(generator, new RegExp(`asset=${renderer}`));
    assert.match(generator, new RegExp(output.replaceAll('.', '\\.')));
    assert.ok(source.includes(message), `missing ${renderer} message: ${message}`);
  }
});

test('web store asset generator stops Chrome after each screenshot is written', async () => {
  const generator = await readFile(generatorUrl, 'utf8');

  assert.match(generator, /spawn\(/);
  assert.match(generator, /await waitForOutput\(/);
  assert.match(generator, /if \(!child\.pid/);
  assert.match(generator, /child\.kill\('SIGTERM'\)/);
});

test('store screenshots reserve a clear copy area above the placeholder board', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /\.webpage--store-copy/);
  assert.match(source, /webPage\('webpage--store-copy'\)/);
  assert.match(source, /webPage\('webpage--wide webpage--store-copy'\)/);
});

test('settings screenshot gives its longer title enough horizontal space', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /\.screen-title--settings\s*{[^}]*width:\s*660px/s);
  assert.match(source, /class="screen-title screen-title--settings"/);
});
