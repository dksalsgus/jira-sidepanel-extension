# Please Be Done

A Chrome extension for quickly checking Jira issues assigned to you from the Chrome Side Panel or an in-page floating panel.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-orange)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)

## Features

- **Chrome Side Panel**: keep assigned Jira issues visible without opening a separate Jira tab.
- **Floating panel**: open a compact issue panel on web pages for faster access.
- **Current sprint and all-issues views**: switch between active sprint work and every issue assigned to you.
- **Parent issue grouping**: group subtasks and child issues under their parent issue.
- **Collapsible groups**: collapse or expand individual groups, or toggle all groups at once.
- **Status filtering**: filter floating panel issues by to-do, in-progress, and done states.
- **One-click navigation**: open a Jira issue directly from its key or title.

## Privacy

Please Be Done does not send Jira data to any external server owned by this project.

- Jira domain, email, API token, preferences, and issue cache are stored in Chrome storage.
- Jira API requests are sent directly from the extension to the configured `*.atlassian.net` site.
- The extension does not use cookies, analytics, or tracking.

See [privacy.html](privacy.html) for the full privacy policy.

## Requirements

- Chrome 114 or later
- Jira Cloud workspace under `*.atlassian.net`
- Atlassian API token for your Jira account

## Setup

1. Create an Atlassian API token from [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Install or load the extension in Chrome.
3. Open the extension options page.
4. Enter:
   - **Domain**: the Jira subdomain only, for example `mycompany` for `mycompany.atlassian.net`
   - **Email**: your Atlassian account email
   - **API Token**: the token created in step 1
5. Save the settings and open the side panel.

## Local Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build the extension:

```bash
npm run build:prod
```

Load the extension locally:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the generated `dist/` directory.

## Packaging

Create a Chrome Web Store upload zip:

```bash
npm run package
```

The package script builds the production extension and creates `please-be-done-v<version>.zip` from the `dist/` directory only.

## Project Structure

```text
jira-sidepanel-extension/
├── manifest.json
├── background.js
├── content/
├── sidepanel/
├── options/
├── shared/
├── utils/
├── icons/
├── scripts/
├── test/
└── privacy.html
```

## Chrome Web Store Release

Release notes and checklist details are in [DEPLOY.md](DEPLOY.md).

## License

No open source license has been published yet.
