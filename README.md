# Nahfi Bookmark Manager

A modern Chrome bookmark manager extension built with React, TypeScript, Vite, Tailwind CSS, and Zustand.

Nahfi Bookmark Manager replaces the cramped default bookmark popup with a polished grid interface, folder navigation, pinned bookmarks, recent visits, visit counts, drag-and-drop organization, and customizable folder icons.

## Features

- Fast bookmark and folder browsing with a virtualized grid
- Folder tree sidebar and breadcrumb navigation
- Pinned, recent, most visited, and current-folder views
- Create, edit, delete, and move bookmarks or folders
- Drag external links into the popup to create bookmarks
- Drag bookmarks into folders or reorder them
- Custom folder emoji icons
- Multi-source favicon fallback with generated letter avatars
- Light, dark, and system themes
- Adjustable card size, favicon visibility, URL visibility, and animations

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Chrome Extension Manifest V3

## Getting Started

Install dependencies:

```bash
npm install
```

Run development build:

```bash
npm run dev
```

Create a production extension build:

```bash
npm run build
```

The extension files are generated in `dist/`.

## Load In Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist/` folder.

## Available Scripts

- `npm run dev` starts Vite development mode.
- `npm run build` type-checks and builds the extension.
- `npm run lint` runs ESLint.
- `npm run format` formats source files with Prettier.
- `npm run icons` regenerates extension icons.

## Privacy

This extension uses Chrome's bookmarks and storage APIs. Bookmark metadata such as pinned state, recent visits, visit counts, settings, and custom folder icons are stored locally with `chrome.storage.local`.

## License

MIT
