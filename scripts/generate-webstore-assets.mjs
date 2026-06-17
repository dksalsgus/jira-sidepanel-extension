import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = resolve(rootDir, '.webstore-assets-tmp');
const screenshotsDir = resolve(rootDir, 'screenshots');
const promotionalDir = resolve(rootDir, 'promotional');

const chromeCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

function getChromePath() {
  const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
  if (!chromePath) {
    throw new Error('Google Chrome or Chromium was not found in /Applications.');
  }
  return chromePath;
}

async function getIconDataUrl() {
  const icon = await readFile(resolve(rootDir, 'icons/icon128.png'));
  return `data:image/png;base64,${icon.toString('base64')}`;
}

function shell({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; min-height: 100%; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f5f7fb; }
    body { overflow: hidden; }
    .stage { position: relative; width: 100vw; height: 100vh; background: linear-gradient(135deg, #f7f9fc 0%, #eef3f8 58%, #fff 100%); }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand img { width: 58px; height: 58px; border-radius: 14px; box-shadow: 0 14px 34px rgba(15, 23, 42, 0.16); }
    .brand-name { font-size: 22px; font-weight: 700; letter-spacing: 0; }
    .pill { display: inline-flex; align-items: center; height: 30px; padding: 0 13px; border-radius: 999px; background: #e8f2ff; color: #0b67c2; font-size: 13px; font-weight: 650; }
    .window { position: absolute; background: rgba(255,255,255,0.92); border: 1px solid rgba(148, 163, 184, 0.28); box-shadow: 0 30px 80px rgba(15, 23, 42, 0.18); overflow: hidden; }
    .browser { left: 64px; top: 68px; width: 790px; height: 604px; border-radius: 18px; }
    .browser-bar { height: 52px; display: flex; align-items: center; gap: 8px; padding: 0 18px; background: #fff; border-bottom: 1px solid #e5eaf0; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: #d0d7e2; }
    .url { margin-left: 12px; height: 28px; flex: 1; border-radius: 999px; background: #f1f5f9; color: #64748b; display: flex; align-items: center; padding: 0 16px; font-size: 13px; }
    .jira-board { padding: 30px; }
    .board-title { font-size: 30px; font-weight: 760; letter-spacing: 0; margin-bottom: 22px; }
    .columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .column { min-height: 390px; border-radius: 14px; background: #f8fafc; border: 1px solid #e5eaf0; padding: 14px; }
    .column h3 { margin: 0 0 14px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
    .card { background: #fff; border: 1px solid #e5eaf0; border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06); }
    .key { color: #0b67c2; font-weight: 760; font-size: 13px; margin-bottom: 7px; }
    .summary { color: #172033; font-size: 15px; line-height: 1.36; }
    .panel { right: 74px; top: 58px; width: 356px; height: 650px; border-radius: 24px; }
    .panel-head { height: 70px; padding: 0 22px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5eaf0; }
    .panel-title { font-size: 20px; font-weight: 760; }
    .refresh { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: #f1f5f9; color: #0b67c2; font-size: 20px; }
    .tabs { display: flex; gap: 8px; padding: 16px 18px; }
    .tab { flex: 1; height: 34px; border-radius: 999px; display: grid; place-items: center; font-size: 13px; color: #64748b; background: #f1f5f9; }
    .tab.active { background: #0b67c2; color: #fff; }
    .count { padding: 4px 22px 12px; color: #64748b; font-size: 13px; }
    .issue { margin: 0 18px 12px; padding: 14px; border-radius: 14px; border: 1px solid #e5eaf0; background: #fff; }
    .issue-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
    .issue-key { font-size: 13px; color: #0b67c2; font-weight: 760; }
    .badge { height: 22px; padding: 0 9px; border-radius: 999px; display: inline-flex; align-items: center; background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; }
    .badge.todo { background: #eef2ff; color: #3730a3; }
    .badge.progress { background: #fef3c7; color: #92400e; }
    .issue-text { font-size: 14px; line-height: 1.36; color: #172033; }
    .floating { position: absolute; left: 734px; bottom: 84px; width: 58px; height: 58px; border-radius: 18px; display: grid; place-items: center; background: #0b67c2; color: #fff; font-weight: 800; font-size: 23px; box-shadow: 0 18px 40px rgba(11, 103, 194, 0.36); }
    ${body.styles ?? ''}
  </style>
</head>
<body>${body.html}</body>
</html>`;
}

function screenshotHtml(iconDataUrl) {
  return shell({
    title: 'Please Be Done Screenshot',
    body: {
      html: `<div class="stage">
  <div class="window browser">
    <div class="browser-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="url">mycompany.atlassian.net/jira/software/projects/APP/boards/12</div></div>
    <div class="jira-board">
      <div class="board-title">Sprint board</div>
      <div class="columns">
        <div class="column"><h3>To do</h3><div class="card"><div class="key">APP-241</div><div class="summary">Plan release checklist</div></div><div class="card"><div class="key">APP-244</div><div class="summary">Review onboarding copy</div></div></div>
        <div class="column"><h3>In progress</h3><div class="card"><div class="key">APP-252</div><div class="summary">Implement issue loading improvements</div></div></div>
        <div class="column"><h3>Done</h3><div class="card"><div class="key">APP-233</div><div class="summary">Harden Jira authentication flow</div></div></div>
      </div>
    </div>
  </div>
  <div class="window panel">
    <div class="panel-head"><div class="brand"><img src="${iconDataUrl}" alt=""><div class="panel-title">Please Be Done</div></div><div class="refresh">↻</div></div>
    <div class="tabs"><div class="tab active">All</div><div class="tab">Current Sprint</div></div>
    <div class="count">4 assigned issues</div>
    <div class="issue"><div class="issue-top"><span class="issue-key">APP-252</span><span class="badge progress">In Progress</span></div><div class="issue-text">Implement issue loading improvements</div></div>
    <div class="issue"><div class="issue-top"><span class="issue-key">APP-241</span><span class="badge todo">To Do</span></div><div class="issue-text">Plan release checklist</div></div>
    <div class="issue"><div class="issue-top"><span class="issue-key">APP-233</span><span class="badge">Done</span></div><div class="issue-text">Harden Jira authentication flow</div></div>
    <div class="issue"><div class="issue-top"><span class="issue-key">APP-244</span><span class="badge todo">To Do</span></div><div class="issue-text">Review onboarding copy</div></div>
  </div>
  <div class="floating">P</div>
</div>`,
    },
  });
}

function settingsScreenshotHtml(iconDataUrl) {
  return shell({
    title: 'Please Be Done Settings Screenshot',
    body: {
      html: `<div class="stage">
  <div style="position:absolute; left:86px; top:78px; max-width:460px;">
    <div class="brand"><img src="${iconDataUrl}" alt=""><div><div class="brand-name">Please Be Done</div><div style="margin-top:8px;"><span class="pill">Jira Cloud companion</span></div></div></div>
    <h1 style="font-size:54px; line-height:1.04; margin:54px 0 20px; letter-spacing:0;">Keep assigned Jira issues within reach.</h1>
    <p style="font-size:20px; line-height:1.5; color:#475569; margin:0;">Open a focused side panel, check your current sprint, and jump to the issue that needs attention.</p>
  </div>
  <div class="window" style="right:112px; top:88px; width:470px; height:570px; border-radius:24px; padding:34px;">
    <h2 style="font-size:24px; margin:0 0 8px;">Please Be Done Settings</h2>
    <p style="font-size:15px; color:#64748b; line-height:1.45; margin:0 0 26px;">Connect with an Atlassian API token to view your assigned Jira issues.</p>
    <div style="display:grid; gap:18px;">
      <label style="font-size:13px; font-weight:700;">Jira Domain<div style="height:46px; border-radius:999px; border:1px solid #cbd5e1; margin-top:8px; display:flex; align-items:center; padding:0 18px; color:#172033;">mycompany</div></label>
      <label style="font-size:13px; font-weight:700;">Email<div style="height:46px; border-radius:999px; border:1px solid #cbd5e1; margin-top:8px; display:flex; align-items:center; padding:0 18px; color:#172033;">you@example.com</div></label>
      <label style="font-size:13px; font-weight:700;">API Token<div style="height:46px; border-radius:999px; border:1px solid #cbd5e1; margin-top:8px; display:flex; align-items:center; padding:0 18px; color:#94a3b8;">••••••••••••••••••••</div></label>
      <div style="display:flex; align-items:center; gap:12px; margin-top:6px;"><span style="width:42px; height:24px; border-radius:999px; background:#0b67c2; position:relative;"><span style="position:absolute; right:3px; top:3px; width:18px; height:18px; border-radius:50%; background:white;"></span></span><span>Open the panel automatically on Jira</span></div>
      <div style="height:48px; border-radius:999px; background:#0b67c2; color:white; display:grid; place-items:center; font-weight:700; margin-top:12px;">Save</div>
    </div>
  </div>
</div>`,
    },
  });
}

function smallTileHtml(iconDataUrl) {
  return shell({
    title: 'Please Be Done Small Promo Tile',
    body: {
      styles: '.tile { width: 440px; height: 280px; background: linear-gradient(135deg, #ffffff 0%, #f2f7fd 100%); padding: 36px; position: relative; overflow: hidden; } .tile h1 { margin: 28px 0 10px; font-size: 31px; line-height: 1.06; letter-spacing: 0; } .tile p { margin: 0; width: 210px; color: #475569; font-size: 15px; line-height: 1.36; } .mini-panel { position: absolute; right: 22px; bottom: 26px; width: 150px; border-radius: 18px; background: white; border: 1px solid #e5eaf0; box-shadow: 0 24px 50px rgba(15,23,42,.16); padding: 16px; } .mini-line { height: 12px; border-radius: 999px; background: #dbeafe; margin-bottom: 10px; }',
      html: `<div class="tile"><img src="${iconDataUrl}" style="width:54px;height:54px;border-radius:14px;"><h1>Jira issues,<br>always nearby.</h1><p>Check assigned work from the side panel.</p><div class="mini-panel"><div class="mini-line" style="width:80px;"></div><div class="mini-line" style="width:112px;background:#e2e8f0;"></div><div class="mini-line" style="width:92px;background:#dcfce7;"></div></div></div>`,
    },
  });
}

function marqueeTileHtml(iconDataUrl) {
  return shell({
    title: 'Please Be Done Marquee Promo Tile',
    body: {
      styles: '.hero { width: 1400px; height: 560px; background: linear-gradient(135deg, #ffffff 0%, #edf5ff 52%, #f8fafc 100%); position: relative; overflow: hidden; padding: 74px 86px; } .hero h1 { margin: 42px 0 18px; width: 560px; font-size: 62px; line-height: 1.02; letter-spacing: 0; } .hero p { margin: 0; width: 500px; color: #475569; font-size: 22px; line-height: 1.42; } .hero-panel { position: absolute; right: 112px; top: 54px; width: 396px; height: 452px; border-radius: 30px; background: white; border: 1px solid #e5eaf0; box-shadow: 0 34px 90px rgba(15,23,42,.18); overflow: hidden; } .hero-panel-head { height: 78px; display: flex; align-items: center; gap: 14px; padding: 0 24px; border-bottom: 1px solid #e5eaf0; font-size: 21px; font-weight: 760; } .hero-issue { margin: 18px 22px; padding: 18px; border: 1px solid #e5eaf0; border-radius: 18px; } .hero-key { color:#0b67c2; font-weight:760; font-size:14px; margin-bottom:8px; } .hero-text { font-size:16px; color:#172033; }',
      html: `<div class="hero"><div class="brand"><img src="${iconDataUrl}" alt=""><div class="brand-name">Please Be Done</div></div><h1>Your assigned Jira work, one click away.</h1><p>Use Chrome Side Panel and a lightweight floating panel to stay on top of current sprint issues.</p><div class="hero-panel"><div class="hero-panel-head"><img src="${iconDataUrl}" style="width:42px;height:42px;border-radius:12px;">Please Be Done</div><div class="hero-issue"><div class="hero-key">APP-252</div><div class="hero-text">Implement issue loading improvements</div></div><div class="hero-issue"><div class="hero-key">APP-241</div><div class="hero-text">Plan release checklist</div></div><div class="hero-issue"><div class="hero-key">APP-233</div><div class="hero-text">Harden Jira authentication flow</div></div></div></div>`,
    },
  });
}

async function capture(chromePath, htmlName, html, outputPath, width, height) {
  const htmlPath = resolve(tmpDir, htmlName);
  const profileDir = resolve(tmpDir, `${htmlName}-profile`);
  await writeFile(htmlPath, html);
  await rm(profileDir, { recursive: true, force: true });

  const result = spawnSync(chromePath, [
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
    `--window-size=${width},${height}`,
    `--screenshot=${outputPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: 'inherit', timeout: 15_000 });

  if (result.status !== 0 && !existsSync(outputPath)) {
    throw new Error(`Chrome screenshot failed for ${htmlName}`);
  }
}

async function main() {
  const chromePath = getChromePath();
  const iconDataUrl = await getIconDataUrl();

  await mkdir(tmpDir, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(promotionalDir, { recursive: true });

  await capture(chromePath, 'screenshot-sidepanel.html', screenshotHtml(iconDataUrl), resolve(screenshotsDir, 'webstore-sidepanel.png'), 1280, 800);
  await capture(chromePath, 'screenshot-settings.html', settingsScreenshotHtml(iconDataUrl), resolve(screenshotsDir, 'webstore-settings.png'), 1280, 800);
  await capture(chromePath, 'small-promo.html', smallTileHtml(iconDataUrl), resolve(promotionalDir, 'small-promo-tile.png'), 440, 280);
  await capture(chromePath, 'marquee-promo.html', marqueeTileHtml(iconDataUrl), resolve(promotionalDir, 'marquee-promo-tile.png'), 1400, 560);

  await rm(tmpDir, { recursive: true, force: true });

  console.log('Generated Chrome Web Store assets:');
  console.log('screenshots/webstore-sidepanel.png');
  console.log('screenshots/webstore-settings.png');
  console.log('promotional/small-promo-tile.png');
  console.log('promotional/marquee-promo-tile.png');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
