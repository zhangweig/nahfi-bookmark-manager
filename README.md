# Nahfi Bookmark Manager

> A modern, high-performance Chrome bookmark manager with a glassmorphism UI — built to replace Chrome's cramped default bookmark popup.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## 🚀 Quick Install

### Option A: Download Pre-built Extension (No Node.js needed)

1. Download [`nahfi-bookmark-manager.zip`](https://github.com/zhangweig/nahfi-bookmark-manager/releases/latest) from the [latest release](https://github.com/zhangweig/nahfi-bookmark-manager/releases/latest)
2. Unzip to any folder
3. Open Chrome → `chrome://extensions/`
4. Enable **Developer mode** (top right toggle)
5. Click **Load unpacked** → select the unzipped folder
6. Done! 🎉

### Option B: Build from Source

```bash
git clone https://github.com/zhangweig/nahfi-bookmark-manager.git
cd nahfi-bookmark-manager
npm install
npm run build
```

Then load the `dist/` folder in Chrome as above.

---

## Overview

Nahfi Bookmark Manager reimagines how you interact with your Chrome bookmarks. Instead of the default popup's tiny, plain list, Nahfi gives you a spacious, app-launcher-style grid with folder navigation, pinned shortcuts, visit tracking, drag-and-drop organization, and customizable folder icons — all wrapped in a polished Liquid Glass / Fluent Design aesthetic.

**Thousands of bookmarks? No problem.** A custom virtualized grid renders only visible items, keeping the DOM lean even with 10,000+ bookmarks.

---

## Key Features

### Bookmark & Folder Management

- **Virtualized Grid** — Self-implemented virtual scrolling grid that renders only visible items, smoothly handling **10,000+ bookmarks** with minimal DOM nodes
- **Multi-View Filtering** — Switch between four views:
  - **All** — Browse current folder contents
  - **Pinned** — Quick access to bookmarks you've starred (across all folders)
  - **Recent** — Recently visited bookmarks from everywhere
  - **Most Visited** — Sorted by visit frequency
- **Folder Tree Sidebar** — Collapsible tree panel for quick navigation across your entire bookmark hierarchy
- **Breadcrumb Navigation** — Always know where you are; click any segment to jump back
- **Full CRUD** — Create, edit, delete, and move bookmarks and folders through an intuitive right-click context menu and edit dialogs
- **Scroll Position Memory** — Each folder remembers where you scrolled to, so navigating back returns you to exactly where you left off

### Drag & Drop

- **External Link Drop** — Drag any link from a webpage directly into the popup to instantly create a bookmark
- **Internal Reordering** — Drag bookmarks between folders or reorder them within the current folder
- **Folder Drop Target** — Drop a bookmark onto a folder card to move it inside

### Visual & Personalization

- **Glassmorphism UI** — Liquid Glass / Fluent Design aesthetic with translucent panels, blur effects, and smooth animations
- **Custom Folder Icons** — Assign emoji icons to folders from a categorized preset library (Work, Study, Creative, Tech, Life, Social, Nature, etc.)
- **Multi-Source Favicon Fallback** — Four-tier favicon resolution chain:
  1. Google S2 favicon service
  2. Chrome's built-in `_favicon` endpoint
  3. DuckDuckGo favicon service
  4. Generated first-letter avatar (colorful, deterministic SVG data URI)
- **Light / Dark / System Themes** — Follows your OS preference or set manually
- **Adjustable Card Sizes** — Small, Medium, or Large grid cards
- **Toggle Options** — Show/hide favicons, URLs, and animations independently

### Real-Time Sync

- **Background Service Worker** — Listens to Chrome's bookmark change events (create, edit, move, delete) and pushes updates to the popup in real time, so the UI always reflects the current bookmark tree — even if changes happen in another tab or window

---

## Advantages

| Feature | Chrome Default | Nahfi |
|---|---|---|
| Layout | Plain text list | App-icon grid with virtualized scrolling |
| Large Collections | Laggy with 1000+ items | Smooth at 10,000+ via virtual DOM |
| Organization | Folders only | Folders + pins + recent + visit counts |
| Personalization | None | Folder emoji icons, themes, card sizes |
| Favicon | Single source | 4-tier fallback chain with generated avatars |
| Drag & Drop | Limited | External link drop + internal reorder + folder drop |
| Visual Design | Flat, dated | Glassmorphism with smooth animations |
| Bookmark Metadata | Not tracked | Visit counts, last visited, pinned state |
| Privacy | — | All metadata stored locally; no external servers |

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| UI Framework | React 18 | Component-based, hooks-driven architecture |
| Language | TypeScript 5.5 | Full type safety across the codebase |
| Build Tool | Vite 5 | Fast HMR, multi-entry build for extensions |
| Styling | Tailwind CSS 3 | Utility-first, dark mode, responsive design |
| State Management | Zustand 4 | Lightweight, no boilerplate, selector-based reactivity |
| Icons | Lucide React | Clean, consistent, tree-shakeable icon set |
| Extension API | Chrome Manifest V3 | Modern, service-worker-based extension standard |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm (comes with Node.js)

### Install & Build

```bash
# Install dependencies
npm install

# Build the production extension
npm run build
```

The extension files are generated in `dist/`.

### Load in Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `dist/` folder
6. Pin the extension and click its icon — or press `Ctrl+Shift+B` (`Cmd+Shift+B` on Mac)

### Development

```bash
# Start Vite dev server
npm run dev

# Lint
npm run lint

# Format code
npm run format

# Regenerate extension icons
npm run icons
```

---

## Architecture

```
src/
├── background/
│   └── index.ts          # Service worker — bookmark change listener & real-time sync
├── components/
│   ├── BookmarkCard.tsx   # Individual bookmark card (favicon, title, drag source)
│   ├── FolderCard.tsx     # Folder card with custom icon support
│   ├── VirtualGrid.tsx    # Virtualized grid renderer
│   ├── Sidebar.tsx        # Folder tree navigation panel
│   ├── Breadcrumb.tsx     # Path navigation
│   ├── FilterBar.tsx      # View switcher (All / Pinned / Recent / Most Visited)
│   ├── SettingsPanel.tsx  # Theme, card size, toggles
│   ├── ContextMenu.tsx    # Right-click actions
│   ├── EditDialog.tsx     # Create/edit bookmark or folder
│   ├── ConfirmDialog.tsx  # Deletion confirmation
│   └── EmptyState.tsx     # Friendly empty folder illustration
├── hooks/
│   ├── useTheme.ts        # Theme application (light/dark/system)
│   └── useVirtualGrid.ts  # Core virtualization logic — ResizeObserver + overscan
├── store/
│   └── useStore.ts        # Zustand store — all app state & actions
├── utils/
│   ├── bookmarks.ts        # Chrome bookmarks API wrappers
│   ├── storage.ts          # chrome.storage.local persistence
│   ├── favicon.ts          # 4-tier favicon resolution + avatar generation
│   ├── drag.ts             # Drag & drop data transfer helpers
│   └── helpers.ts          # Sorting, classnames, utilities
├── constants/
│   └── index.ts            # Storage keys, settings, card sizes, folder icon presets
├── types/
│   └── index.ts            # TypeScript type definitions
└── popup/
    ├── Popup.tsx           # Root component — orchestrates all views
    ├── main.tsx            # React entry point
    └── index.html          # Popup HTML template
```

### Key Design Decisions

- **Virtualization from scratch** — Rather than pulling in a heavy virtualization library, the project implements a focused `useVirtualGrid` hook that handles column calculation, overscan rendering, ResizeObserver-based responsive sizing, and scroll position persistence — all in ~150 lines.
- **Non-destructive data model** — Nahfi stores its own metadata (pins, visit counts, recent visits, custom folder icons, settings) in `chrome.storage.local`. It **never modifies the browser's original bookmark tree structure** — your bookmarks stay exactly as Chrome sees them.
- **Multi-entry Vite build** — A custom Vite plugin handles the Chrome extension's multi-entry output (popup HTML + background service worker) and flattens the popup HTML to the `dist/` root where Chrome expects it.
- **4-tier favicon fallback** — No single favicon source is reliable. Nahfi chains Google S2, Chrome's internal endpoint, DuckDuckGo, and a generated SVG avatar so bookmarks always have a recognizable icon.

---

## Privacy

Nahfi Bookmark Manager is privacy-first:

- Uses only Chrome's **bookmarks**, **storage**, and **favicon** permissions
- All metadata (pinned state, visit counts, recent visits, custom folder icons, settings) is stored **locally** via `chrome.storage.local`
- **No external servers**, no analytics, no tracking
- **No network requests** except favicon image loads from Google / DuckDuckGo / Chrome's internal endpoint

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Author

**Zhang WeiGuang**

- GitHub: [@zhangweig](https://github.com/zhangweig)

---

<p align="center">Made with care for people who have too many bookmarks.</p>
