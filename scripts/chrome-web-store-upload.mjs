import { readFile } from 'node:fs/promises';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE_URL = 'https://chromewebstore.googleapis.com';
const MAX_STATUS_ATTEMPTS = 12;
const STATUS_DELAY_MS = 5_000;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status} ${response.statusText}): ${JSON.stringify(body)}`
    );
  }

  return body;
}

async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const tokenResponse = await requestJson(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!tokenResponse.access_token) {
    throw new Error(`Token response did not include access_token: ${JSON.stringify(tokenResponse)}`);
  }

  return tokenResponse.access_token;
}

function hasUploadErrors(status) {
  return Boolean(
    status.itemError?.length ||
    status.fieldError?.length ||
    status.uploadState === 'FAILED'
  );
}

function getStatusUrl({ publisherId, extensionId }) {
  return `${API_BASE_URL}/v2/publishers/${publisherId}/items/${extensionId}:fetchStatus`;
}

async function fetchUploadStatus({ accessToken, publisherId, extensionId }) {
  return requestJson(getStatusUrl({ publisherId, extensionId }), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function getExpectedVersion() {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  return manifest.version;
}

function getSubmittedVersions(status) {
  return status.submittedItemRevisionStatus?.distributionChannels
    ?.map((channel) => channel.crxVersion)
    .filter(Boolean) || [];
}

async function waitForUploadCompletion({ accessToken, publisherId, extensionId, uploadResult }) {
  let status = uploadResult;

  for (let attempt = 1; attempt <= MAX_STATUS_ATTEMPTS; attempt += 1) {
    if (hasUploadErrors(status)) {
      throw new Error(`Chrome Web Store upload failed: ${JSON.stringify(status)}`);
    }

    if (status.uploadState === 'SUCCEEDED') {
      return status;
    }

    if (status.uploadState !== 'IN_PROGRESS') {
      throw new Error(`Unexpected Chrome Web Store upload state: ${JSON.stringify(status)}`);
    }

    console.log(`Upload still processing; checking again (${attempt}/${MAX_STATUS_ATTEMPTS})...`);
    await sleep(STATUS_DELAY_MS);
    status = await fetchUploadStatus({ accessToken, publisherId, extensionId });
  }

  throw new Error(`Upload did not complete after ${MAX_STATUS_ATTEMPTS} status checks`);
}

async function uploadPackage({ accessToken, publisherId, extensionId, zipPath }) {
  const zipFile = await readFile(zipPath);
  const uploadUrl = `${API_BASE_URL}/upload/v2/publishers/${publisherId}/items/${extensionId}:upload`;

  return requestJson(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/zip',
    },
    body: zipFile,
  });
}

async function publishPackage({ accessToken, publisherId, extensionId }) {
  const publishUrl = `${API_BASE_URL}/v2/publishers/${publisherId}/items/${extensionId}:publish`;

  return requestJson(publishUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function main() {
  const clientId = requiredEnv('CWS_CLIENT_ID');
  const clientSecret = requiredEnv('CWS_CLIENT_SECRET');
  const refreshToken = requiredEnv('CWS_REFRESH_TOKEN');
  const publisherId = requiredEnv('CWS_PUBLISHER_ID');
  const extensionId = requiredEnv('CWS_EXTENSION_ID');
  const zipPath = process.env.ZIP_PATH || 'please-be-done.zip';
  const shouldPublish = process.env.PUBLISH === 'true';

  console.log('Requesting Chrome Web Store access token...');
  const accessToken = await getAccessToken({ clientId, clientSecret, refreshToken });

  const expectedVersion = await getExpectedVersion();
  const currentStatus = await fetchUploadStatus({ accessToken, publisherId, extensionId });
  if (currentStatus.submittedItemRevisionStatus?.state === 'PENDING_REVIEW') {
    const submittedVersions = getSubmittedVersions(currentStatus);
    if (submittedVersions.includes(expectedVersion)) {
      console.log(`Version ${expectedVersion} is already pending Chrome Web Store review.`);
      return;
    }

    throw new Error(
      `Another version is already pending Chrome Web Store review: ${JSON.stringify(submittedVersions)}`
    );
  }

  console.log(`Uploading ${zipPath} to Chrome Web Store...`);
  const uploadResult = await uploadPackage({ accessToken, publisherId, extensionId, zipPath });
  const finalStatus = await waitForUploadCompletion({
    accessToken,
    publisherId,
    extensionId,
    uploadResult,
  });
  console.log(`Upload complete: ${JSON.stringify(finalStatus)}`);

  if (!shouldPublish) {
    console.log('Publish skipped. Run with PUBLISH=true to submit for review.');
    return;
  }

  console.log('Submitting item for Chrome Web Store review...');
  const publishResult = await publishPackage({ accessToken, publisherId, extensionId });
  console.log(`Publish request complete: ${JSON.stringify(publishResult)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
