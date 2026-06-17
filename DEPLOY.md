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
Quickly check your assigned Jira issues from the Chrome Side Panel.
```

Detailed description:

```text
Please Be Done helps you keep track of Jira issues assigned to you without keeping a separate Jira tab open.

Key features:
- View assigned issues in the Chrome Side Panel
- Use a floating panel for quick access on web pages
- Switch between current sprint and all assigned issues
- Group child issues under their parent issue
- Collapse, expand, and filter issue lists
- Open Jira issues with one click

Privacy:
- Jira credentials are stored in Chrome storage
- Jira issue data is requested directly from your Jira Cloud workspace
- No external analytics, tracking, or project-owned server is used
```

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
