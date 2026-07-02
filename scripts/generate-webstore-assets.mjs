import { existsSync } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const storeAssetsDir = resolve(rootDir, 'store-assets');
const sourcePath = resolve(rootDir, 'store-assets', 'source.html');
const tmpDir = resolve(rootDir, '.webstore-assets-tmp');

const assets = [
  { query: 'asset=promo', output: 'promo-small-440x280.png', width: 440, height: 280 },
  { query: 'asset=marquee', output: 'promo-marquee-1400x560.png', width: 1400, height: 560 },
  { query: 'asset=sidepanel', output: 'screenshot-sidepanel-1280x800.png', width: 1280, height: 800 },
  { query: 'asset=floating', output: 'screenshot-floating-panel-1280x800.png', width: 1280, height: 800 },
  { query: 'asset=settings', output: 'screenshot-settings-1280x800.png', width: 1280, height: 800 },
];

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean);

function getChromePath() {
  const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
  if (!chromePath) {
    throw new Error('Google Chrome or Chromium was not found. Set CHROME_PATH to its executable.');
  }
  return chromePath;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForOutput(child, outputPath, outputName) {
  const deadline = Date.now() + 15_000;
  let spawnError;
  let exitResult;

  child.once('error', (error) => {
    spawnError = error;
  });
  child.once('exit', (code, signal) => {
    exitResult = { code, signal };
  });

  while (Date.now() < deadline) {
    if (spawnError) {
      throw spawnError;
    }

    if (existsSync(outputPath) && (await stat(outputPath)).size > 0) {
      return;
    }

    if (exitResult) {
      throw new Error(
        `Chrome exited before creating ${outputName} ` +
        `(code=${exitResult.code}, signal=${exitResult.signal})`
      );
    }

    await sleep(50);
  }

  throw new Error(`Timed out waiting for Chrome to create ${outputName}`);
}

async function stopChrome(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), sleep(1_000)]);

  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await once(child, 'exit');
  }
}

async function capture(chromePath, asset) {
  const outputPath = resolve(storeAssetsDir, asset.output);
  const profileDir = resolve(tmpDir, `${asset.output}-profile`);
  const sourceUrl = new URL(pathToFileURL(sourcePath));
  sourceUrl.search = asset.query;

  await rm(outputPath, { force: true });
  await rm(profileDir, { recursive: true, force: true });

  const child = spawn(chromePath, [
    '--headless=new',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--run-all-compositor-stages-before-draw',
    `--user-data-dir=${profileDir}`,
    `--window-size=${asset.width},${asset.height}`,
    `--screenshot=${outputPath}`,
    sourceUrl.href,
  ], { stdio: 'inherit' });

  try {
    await waitForOutput(child, outputPath, asset.output);
  } finally {
    await stopChrome(child);
  }
}

async function main() {
  const chromePath = getChromePath();

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing store asset source: ${sourcePath}`);
  }

  await mkdir(storeAssetsDir, { recursive: true });
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });

  try {
    for (const asset of assets) {
      await capture(chromePath, asset);
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  console.log('Generated Chrome Web Store assets:');
  for (const asset of assets) {
    console.log(`store-assets/${asset.output}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
