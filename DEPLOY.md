# Chrome Web Store Release Guide

Use this checklist before uploading Please Be Done to the Chrome Web Store.

## 1. Confirm the Manifest

- `manifest.json` has the correct `version`.
- `name`, `description`, and icons match the store listing.
- Permissions are limited to what the extension needs:
  - `storage`
  - `sidePanel`
  - `https://*.atlassian.net/*`

## 2. Run Verification

```bash
npm test
npm run build:prod
```

Load `dist/` in Chrome and verify:

- The side panel opens.
- Jira settings can be saved.
- A connection test succeeds with a valid Jira API token.
- Current sprint and all-issues views load.
- The floating panel opens and filters issues correctly.
- Issue links open the expected Jira issue page.

## 3. Create the Upload Zip

```bash
npm run package
```

The script creates `please-be-done-v<version>.zip` from the production `dist/` directory. The zip root must contain `manifest.json`.

Check the zip contents:

```bash
unzip -l please-be-done-v<version>.zip
```

The zip should not include source docs, tests, local logs, dependency folders, or agent configuration files.

## 4. Store Listing Assets

Chrome Web Store listing assets are kept in `store-assets/`.

Recommended assets:

- Screenshots: `1280x800`
- Small promo tile: `440x280`
- Marquee promo tile: `1400x560`
- Icon: `128x128`

## 5. Store Listing Copy

Short description:

```text
See assigned Jira Cloud issues and current sprint work in Chrome's side panel without switching tabs.
```

Detailed description:

```text
Keep your assigned Jira Cloud issues visible while you work. Please Be Done shows current sprint and all assigned issues in Chrome's side panel or an optional floating panel, so you can check priorities and open tickets without returning to Jira.

Requirements:
- Jira Cloud workspace under *.atlassian.net
- Atlassian account email and API token

Key features:
- View assigned issues in the Chrome Side Panel
- Use a floating panel for quick access on web pages
- Switch between current sprint and all assigned issues
- Group child issues under their parent issue
- Collapse, expand, and filter issue lists
- Open Jira issues with one click

Privacy:
- Jira credentials are stored in Chrome storage and may sync through your Chrome account
- Credentials are not sent to or accessible by the developer
- Jira issue data is requested directly from your configured Jira Cloud workspace
- No external analytics, tracking, or project-owned server is used

Please Be Done is an independent extension and is not affiliated with, endorsed by, or sponsored by Atlassian.
```

The extension name shown in the listing must match `manifest.json`:

```text
Please Be Done for Jira: My Issues
```

Before publishing, confirm that the listing uses the independent Please Be Done icon and does not use Jira or Atlassian logos or visual identity.

## 6. Privacy Policy

Use the hosted or repository version of [privacy.html](privacy.html) as the Chrome Web Store privacy policy URL.

Before submitting, confirm that the privacy policy still matches the extension behavior.

## 7. GitHub Actions Release

The `Chrome Web Store` workflow can upload the extension package when the required repository secrets are configured:

- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`
- `CWS_PUBLISHER_ID`
- `CWS_EXTENSION_ID`

The workflow runs tests, builds the extension, creates a zip from `dist/`, and uploads it. Manual runs can optionally submit the uploaded package for review.
