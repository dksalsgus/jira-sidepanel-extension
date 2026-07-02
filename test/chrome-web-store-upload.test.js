import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const uploadScriptUrl = new URL('../scripts/chrome-web-store-upload.mjs', import.meta.url);

async function loadUploadHelpers() {
  const source = await readFile(uploadScriptUrl, 'utf8');
  const moduleSource = source
    .replace('const STATUS_DELAY_MS = 5_000;', 'const STATUS_DELAY_MS = 0;')
    .replace(
      /\nmain\(\)\.catch\([\s\S]*$/,
      '\nexport { main, waitForUploadCompletion };\n'
    );
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`;
  return import(moduleUrl);
}

test('accepts the Chrome Web Store V2 SUCCEEDED upload state', async () => {
  const { waitForUploadCompletion } = await loadUploadHelpers();
  const uploadResult = {
    uploadState: 'SUCCEEDED',
    crxVersion: '1.1.1',
  };

  const result = await waitForUploadCompletion({
    accessToken: 'unused',
    publisherId: 'unused',
    extensionId: 'unused',
    uploadResult,
  });

  assert.equal(result, uploadResult);
});

test('reports the Chrome Web Store V2 FAILED upload state as a failure', async () => {
  const { waitForUploadCompletion } = await loadUploadHelpers();

  await assert.rejects(
    waitForUploadCompletion({
      accessToken: 'unused',
      publisherId: 'unused',
      extensionId: 'unused',
      uploadResult: { uploadState: 'FAILED' },
    }),
    /Chrome Web Store upload failed/
  );
});

test('polls while the Chrome Web Store V2 upload state is IN_PROGRESS', async () => {
  const { waitForUploadCompletion } = await loadUploadHelpers();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ uploadState: 'SUCCEEDED', crxVersion: '1.1.1' }),
    { status: 200 }
  );

  try {
    const result = await waitForUploadCompletion({
      accessToken: 'token',
      publisherId: 'publisher',
      extensionId: 'extension',
      uploadResult: { uploadState: 'IN_PROGRESS' },
    });

    assert.equal(result.uploadState, 'SUCCEEDED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('skips re-upload when the same version is already pending review', async () => {
  const { main } = await loadUploadHelpers();
  const originalFetch = globalThis.fetch;
  const envNames = [
    'CWS_CLIENT_ID',
    'CWS_CLIENT_SECRET',
    'CWS_REFRESH_TOKEN',
    'CWS_PUBLISHER_ID',
    'CWS_EXTENSION_ID',
    'ZIP_PATH',
    'PUBLISH',
  ];
  const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  const requests = [];

  Object.assign(process.env, {
    CWS_CLIENT_ID: 'client',
    CWS_CLIENT_SECRET: 'secret',
    CWS_REFRESH_TOKEN: 'refresh',
    CWS_PUBLISHER_ID: 'publisher',
    CWS_EXTENSION_ID: 'extension',
    ZIP_PATH: 'manifest.json',
    PUBLISH: 'true',
  });

  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('oauth2.googleapis.com')) {
      return new Response(JSON.stringify({ access_token: 'token' }), { status: 200 });
    }

    return new Response(JSON.stringify({
      submittedItemRevisionStatus: {
        state: 'PENDING_REVIEW',
        distributionChannels: [{ crxVersion: '1.1.1', deployPercentage: 100 }],
      },
    }), { status: 200 });
  };

  try {
    await main();
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of envNames) {
      if (originalEnv[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = originalEnv[name];
      }
    }
  }

  assert.equal(requests.length, 2);
  assert.match(requests[1].url, /:fetchStatus$/);
  assert.equal(requests[1].options.method, 'GET');
});
