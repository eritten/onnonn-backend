# Onnonn Desktop

Onnonn Desktop is an Electron + React application for joining and managing Onnonn meetings from a native desktop client.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A running Onnonn backend at `https://onnonn.niveel.com`
- LiveKit available at `wss://live.niveel.com`

## Installation

1. `cd onnonn-desktop`
2. `npm install`

## Development

- Run `npm run dev`

## Production Build

- Run `npm run build`
- Package with `npm run package`
- Create installers with `npm run make`
- Build the Windows installer with `npm run package:win`

## Environment Configuration

The app currently targets:

- API base URL: `https://onnonn.niveel.com/api/v1`
- LiveKit URL: `wss://live.niveel.com`

These values are centralized in `src/shared/config.js`.

## Known Limitations

- Some desktop-specific flows such as OAuth callback handling require the app to be registered as the `onnonn://` protocol handler on the local machine.
- Native auto-update behavior requires a configured update feed in the release pipeline.
- `public/icon.ico` is currently a generated placeholder and should be replaced with the official Onnonn Windows icon before release.
