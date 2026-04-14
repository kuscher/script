# Drift — A Lightweight Text Editor

**Product Requirements Document v1.1 (Augmented)**

---

## Name Rationale

**Drift** — evokes the feeling of quickly jotting something down, thoughts drifting onto a page. Short, memorable, works as a verb ("just drift it down") and a noun. Clean enough for an app icon and store listing.

---

## One-Liner

Drift is a fast, lightweight plain text editor that opens instantly, edits local files natively, and stays out of your way.

---

## Problem

ChromeOS's built-in Text app nails the simplicity of "open file, edit, save" but is being deprecated. Notepad on Windows is improving but platform-locked. There's no great editor for ChromeOS and Android that lives in the sweet spot between a sticky note and VS Code — one that respects plain text, handles light markup gracefully, and works offline with local files.

---

## Competitive Analysis

### ChromeOS Text Editor (Chrome Web Store)

The ChromeOS Text app (GoogleChromeLabs/text-app) is built on CodeMirror and provides syntax highlighting, local file access, and an offline-capable editing experience. It's minimal and fast. However, it was archived in January 2025 and is no longer maintained. The Chrome Web Store version has limited file system access compared to the original Chrome App.

**What Drift borrows from ChromeOS Text:** The philosophy of "open file, edit, save" with zero friction. CodeMirror-grade syntax highlighting. Offline-first PWA architecture.

**Where Drift differs:** Drift adds a tabbed sidebar for multi-file workflows, crash recovery via IndexedDB, a proper settings panel, and find-and-replace — features the ChromeOS Text app lacked or underserved.

### Gaps Identified and Addressed in This Revision

| Gap | Source | Resolution |
|-----|--------|------------|
| No accessibility plan | UX best practices | Added accessibility section (V1) |
| No character encoding selector | Common editor expectation | Added encoding picker to status bar (V1) |
| No print support | Common editor expectation | Added basic print via `Ctrl+P` (V1) |
| No zoom / font-size shortcut | Common editor expectation | Added `Ctrl+=` / `Ctrl+-` zoom (V1) |
| No go-to-line | CodeMirror / Sublime parity | Added `Ctrl+G` go-to-line (V1) |
| No auto-indent | CodeMirror parity | Added smart indent on Enter (V1) |
| No keyboard shortcut reference | UX best practices | Added shortcut overlay panel (V1) |
| No recent files | Common editor expectation | Moved from V2 to V1 |
| No file type indicator icon | Polish | Added subtle file-type icon to tabs |

---

## Target Users

- ChromeOS and Android laptop users who need a default text editor
- Anyone who works with .txt, .md, or .rtf files casually
- People who want to jot something down in under 2 seconds
- Developers or writers who occasionally open a markdown file but don't need a full IDE
- Users with accessibility needs who rely on keyboard navigation and screen readers

---

## Design Philosophy

1. **Instant** — App loads in under 1 second. New tab is a blank page, cursor blinking, ready.
2. **Invisible** — The UI should feel like it isn't there. The text IS the interface.
3. **Local-first** — No accounts, no cloud, no server. Files live on your device.
4. **Respectful** — Opens what you give it, saves what you wrote. No silent format conversions.
5. **Accessible** — Every action reachable by keyboard. Screen readers supported. Focus states visible.

---

## V1 Scope

### Core Functions

| # | Function | Details |
|---|----------|---------|
| 1 | **New file** | `Ctrl+N` or tap "+" in sidebar — opens a blank untitled tab |
| 2 | **Open file** | `Ctrl+O` or Open icon in sidebar header — uses File System Access API; remembers file handle for direct save-back |
| 3 | **Save** | `Ctrl+S` or Save icon in sidebar header — writes directly back to the opened file (no dialog if handle exists) |
| 4 | **Save As** | `Ctrl+Shift+S` — always prompts picker; supported types: `.txt`, `.md`, `.rtf` |
| 5 | **Print** | `Ctrl+P` — opens the browser/OS print dialog with the current tab's content. Minimal print stylesheet: content only, no sidebar or chrome. |
| 6 | **Side tabs** | Vertical tab list in a collapsible left sidebar; shows filename + file-type icon (subtle, monochrome) + unsaved dot indicator; reorderable via drag; active tab highlighted |
| 7 | **Sidebar toggle** | Hamburger icon (☰) pinned top-left of editor area — toggles sidebar open/closed; sidebar state persisted; `Ctrl+B` shortcut |
| 8 | **Close tab** | `Ctrl+W` or × on hover of tab item — prompts to save if unsaved changes; last tab closes to a new blank tab |
| 9 | **Menu** | "⋮" icon in sidebar header opens a dropdown with: New, Open, Save, Save As, Print, Find & Replace, Settings, Keyboard Shortcuts |
| 10 | **Find & Replace** | `Ctrl+F` find, `Ctrl+H` replace; inline bar at top of editor; regex toggle; match case toggle; match count indicator (e.g., "3 of 12") |
| 11 | **Go to Line** | `Ctrl+G` — opens a small input overlay. Type a line number, press Enter to jump. Esc to dismiss. |
| 12 | **Syntax highlighting** | Auto-detected from file extension; Markdown (`.md`) gets heading/bold/italic/link/code coloring; no rich rendering |
| 13 | **Word wrap** | On by default; wraps to editor width; toggleable in settings |
| 14 | **Line numbers** | Visible in a subtle gutter; toggleable in settings and via `Ctrl+L` |
| 15 | **Undo / Redo** | Full history per tab; `Ctrl+Z` / `Ctrl+Shift+Z` |
| 16 | **Drag & drop** | Drop a .txt/.md/.rtf file onto the window to open it; visual drop zone indicator on drag-over |
| 17 | **PWA install** | Registers as installable; `manifest.json` declares file handler associations for `.txt`, `.md`, `.rtf` |
| 18 | **Offline** | Service worker caches all assets; fully functional without network |
| 19 | **Unsaved state persistence** | On accidental close, restore unsaved content from IndexedDB on next launch |
| 20 | **Settings** | Accessible from sidebar menu; slides in as a panel replacing the tab list (back arrow to return) |
| 21 | **Zoom** | `Ctrl+=` to increase font size, `Ctrl+-` to decrease, `Ctrl+0` to reset to default. Applies to editor only, not UI chrome. |
| 22 | **Auto-indent** | On pressing Enter, new line matches the indentation of the previous line. Respects tab/spaces setting. |
| 23 | **Recent files** | Sidebar footer shows last 5 recently opened files (persisted via IndexedDB file handles). Cleared on "Clear recents" action. Requires user re-grant of permission on click. |
| 24 | **Keyboard shortcut reference** | Accessible from ⋮ menu or `Ctrl+/`. Opens a modal overlay listing all shortcuts grouped by category. Dismissible via Esc or clicking outside. |

### Settings (V1)

All settings stored in `localStorage`. Take effect immediately.

| Setting | Options | Default |
|---------|---------|---------|
| **Theme** | Light / Dark / System | System |
| **Font size** | 12–24px slider or stepper | 14px |
| **Font family** | Mono / Serif / Sans | Mono |
| **Line numbers** | On / Off | On |
| **Word wrap** | On / Off | On |
| **Tab behavior** | Tabs / Spaces | Spaces |
| **Tab size** | 2 / 4 / 8 | 4 |
| **Show whitespace** | On / Off | Off |
| **Auto-indent** | On / Off | On |
| **Default encoding** | UTF-8 / UTF-16 / ISO-8859-1 | UTF-8 |

### Keyboard Shortcut Map (V1)

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+P` | Print |
| `Ctrl+W` | Close tab |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find & Replace |
| `Ctrl+G` | Go to line |
| `Ctrl+L` | Toggle line numbers |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Reset zoom |
| `Ctrl+/` | Keyboard shortcuts |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Escape` | Close find bar / dismiss overlay |

*All shortcuts use `Ctrl` as the modifier key (ChromeOS / Android / Windows).*

### Accessibility (V1)

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard navigation** | All interactive elements focusable and operable via keyboard. Logical tab order: sidebar → editor → status bar. |
| **Focus indicators** | Visible 2px outline on all focusable elements. Uses accent color for contrast. Never suppressed. |
| **ARIA labels** | Sidebar labeled as `navigation`, editor as `main`, status bar as `status`. Tab items have `role="tab"` with `aria-selected`. |
| **Screen reader announcements** | File open/save/close actions announced via `aria-live` region. Find results count announced on change. |
| **Reduced motion** | Respects `prefers-reduced-motion`. Sidebar slide and find bar animations disabled when set. |
| **High contrast** | Respects `prefers-contrast: more`. Increases border visibility and adjusts accent color for WCAG AAA compliance. |
| **Color contrast** | All text meets WCAG AA minimum (4.5:1 for body, 3:1 for large text). Syntax highlighting tokens tested for contrast. |
| **Click targets** | Minimum 32×32px for all interactive elements. |

### Out of Scope (V1)

- Markdown preview / live render
- Cloud sync or accounts
- File tree / folder view
- Extensions or plugins
- Spellcheck (defers to OS-level)
- Multiple cursors
- Minimap

---

## Layout & Design

### Anatomy

```
┌───────────────────────────────────────────────────────────┐
│ ☰ │  [Find ______] [Replace ______] [3/12] [Aa] [.*] [×] │  ← Hamburger + Find bar (hidden by default)
├─────────┬─────────────────────────────────────────────────┤
│ ⋮  📂 💾│                                                 │
│─────────│                                                 │
│● note.tx│ 1│  The cursor blinks here.                     │
│  todo.md│ 2│                                              │  ← Sidebar (left) + Editor pane (right)
│  draft.m│ 3│                                              │
│         │  │                                              │
│         │  │                                              │
│─────────│  │                                              │
│ Recent: │  │                                              │
│  log.txt│  │                                              │
│   [ + ] │  │                                              │
├─────────┴──┴──────────────────────────────────────────────┤
│  UTF-8 ▾ · LF · Ln 1, Col 1 · 0 words · Plain Text       │  ← Status bar (encoding now clickable)
└───────────────────────────────────────────────────────────┘
```

**Sidebar header row**: Contains overflow menu (⋮), Open file icon (📂), Save icon (💾). The ⋮ menu opens a dropdown with: New, Open, Save, Save As, Print, Find & Replace, Settings, Keyboard Shortcuts.

**Sidebar body**: Vertical list of open tabs. Active tab has a highlighted background. Unsaved tabs show a dot (●) before the name. Hover reveals a × close button. Below the tab list, a "Recent" section shows last 5 files (muted text, smaller font). "+" button at the bottom to create a new file.

**Sidebar collapsed state**: When toggled off via ☰, the sidebar disappears entirely and the editor takes full width. The ☰ button remains pinned in the top-left corner of the editor area.

**Settings view**: Accessed from the ⋮ menu. Replaces the tab list inside the sidebar with a settings panel (back arrow at top to return to tabs). Settings never open as a modal or separate window — they live in the sidebar.

**Status bar**: Encoding is clickable (opens a small picker to change encoding for the current file). Line ending indicator (LF/CRLF) is also clickable to toggle. Cursor position, word count, and detected file type round out the bar.

### Design Direction

**Aesthetic: Utilitarian calm.** Think: a clean sheet of paper on a wooden desk. Not playful, not brutalist — just quiet and functional.

- **Background**: Very light warm gray (`#FAFAF8`) in light mode; deep charcoal (`#1E1E1E`) in dark mode (follows OS `prefers-color-scheme`, overridable in settings)
- **Sidebar**: Slightly darker/lighter than editor background to create a subtle separation. ~200px wide. No hard border — just a 1px hairline or background shift
- **Typography**: Monospace for code files, proportional for plain text. Use the system font stack for UI chrome (sidebar, status bar) to feel native. Editor font: `"Cascadia Code", "JetBrains Mono", "Fira Code", monospace` for .md/.code files; `"Georgia", "Noto Serif", serif` for .txt/.rtf
- **Tab items in sidebar**: Full-width rows, ~36px tall. Filename with subtle monochrome file-type icon (doc icon for .txt, markdown icon for .md). Active tab has a subtle left border accent + highlighted background. Truncate long names with ellipsis
- **Status bar**: Single line, small text, muted color. Shows encoding (clickable), line ending (clickable), cursor position, word count, detected file type
- **Find bar**: Slides down from below the hamburger row at the top of the editor pane. Two input fields side by side. Match count indicator. Minimal — disappears on `Esc`
- **Accent color**: One single muted color for focus states, active tab indicator, and icon hover states. Something like a soft teal (`#5A9E9E`) or warm amber — just enough to say "you're here"
- **Icons**: Use simple line icons (Lucide or similar) for the sidebar header actions. 20px, muted by default, accent on hover
- **No shadows, no borders** between sections — use only subtle background color shifts to separate regions
- **Scrollbar**: Thin, auto-hide, matches OS behavior
- **Drop zone**: When dragging a file over the window, a full-screen semi-transparent overlay with a centered "Drop to open" message and a dashed border

### Window Behavior

- Sidebar open by default on launch
- Hamburger (☰) always visible in top-left, even when sidebar is hidden
- Minimum window size: 600×400px
- Editor pane takes remaining width after sidebar (or full width when sidebar collapsed)

---

## Tech Stack & Build Approach

### Recommended Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Preact + HTM (or vanilla JS) | Tiny bundle (~4KB), fast startup, no build step required but supports one |
| **Editor engine** | Tiptap (headless) + StarterKit | Gives us undo/redo, keyboard shortcuts, extensible; can handle markdown syntax highlighting via `@tiptap/extension-code-block-lowlight` |
| **Syntax highlighting** | lowlight (highlight.js AST) | Works with Tiptap; lightweight; supports markdown, JSON, etc. |
| **File access** | File System Access API | Native open/save on Chrome, ChromeOS, Edge; fallback to `<input type="file">` + download for other browsers |
| **Persistence** | IndexedDB (via idb-keyval) | Stores unsaved tab state for crash recovery; ~1KB library |
| **Build** | Vite | Fast dev server, PWA plugin (`vite-plugin-pwa`), outputs optimized static files |
| **PWA** | vite-plugin-pwa + Workbox | Service worker generation, offline caching, manifest |
| **Android packaging** | TWA (Trusted Web Activity) via Bubblewrap | Wraps the PWA into an APK for Play Store submission; uses Chrome under the hood |

### Project Structure

```
drift/
├── index.html
├── manifest.json
├── src/
│   ├── main.js              # App entry, mounts editor
│   ├── editor.js             # Tiptap setup, extensions
│   ├── sidebar.js            # Sidebar open/close, tab list rendering
│   ├── tabs.js               # Tab state management
│   ├── menu.js               # Overflow menu (⋮) dropdown actions
│   ├── settings.js           # Settings panel UI + localStorage read/write
│   ├── file-system.js        # File System Access API wrapper + fallback
│   ├── find-replace.js       # Find & replace logic
│   ├── persistence.js        # IndexedDB crash recovery
│   ├── recent-files.js       # Recent file handles + rendering
│   ├── shortcuts.js           # Shortcut overlay panel
│   ├── status-bar.js         # Status bar updates + encoding picker
│   ├── accessibility.js       # ARIA management, live regions, focus trapping
│   └── styles/
│       ├── base.css          # CSS variables, reset, typography, themes
│       ├── editor.css        # Editor pane styles
│       ├── sidebar.css       # Sidebar + tab list + settings panel styles
│       ├── find.css          # Find bar styles
│       └── print.css         # Print-only stylesheet
├── public/
│   ├── icons/                # PWA icons (192, 512)
│   └── sw.js                 # Service worker (generated)
├── vite.config.js
└── package.json
```

### Build & Run Commands

```bash
# Scaffold
npm create vite@latest drift -- --template vanilla
cd drift
npm install @tiptap/core @tiptap/starter-kit @tiptap/extension-placeholder lowlight idb-keyval

# Dev
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

---

## Key Implementation Notes

1. **File System Access API is the backbone.** The `file-system.js` module should export `openFile()`, `saveFile(handle, content)`, `saveFileAs(content)`, and `getFileHandle()`. Store the handle per tab so `Ctrl+S` writes back silently.

2. **Tiptap in plain-text mode.** By default, configure Tiptap with minimal extensions (Document, Paragraph, Text, History, Placeholder). When a `.md` file is detected, layer on `CodeBlockLowlight` or a custom markdown highlighting extension. The editor should NOT convert markdown to rich text — it should display the raw markdown with colored tokens.

3. **Tab state is an array of objects:**
   ```js
   { id, filename, fileHandle, content, savedContent, cursorPosition, scrollPosition, encoding }
   ```
   Unsaved = `content !== savedContent`. Persist this array to IndexedDB on every change (debounced 1s).

4. **Settings live in the sidebar.** When the user taps Settings from the ⋮ menu, the tab list slides out and a settings panel slides in (with a ← back arrow). Settings write to `localStorage` under a `drift-settings` key as a JSON blob. On app load, read settings and apply CSS variables / editor config before first paint to avoid flicker (especially for theme).

5. **PWA file handling.** The `manifest.json` should include:
   ```json
   "file_handlers": [
     { "action": "/", "accept": { "text/plain": [".txt"], "text/markdown": [".md"], "text/rtf": [".rtf"] } }
   ]
   ```
   This lets ChromeOS set Drift as the default handler for these file types.

6. **Keep the bundle under 100KB gzipped.** This is a text editor — it should load faster than the user can blink.

7. **Encoding handling.** Read files using `TextDecoder` with the detected or user-selected encoding. Default to UTF-8. When the user changes encoding via the status bar picker, re-decode the file buffer and update the editor content. Save using the matching `TextEncoder`.

8. **Print stylesheet.** `print.css` hides all chrome (sidebar, status bar, find bar, hamburger) and sets the editor content to a clean, readable format with sensible margins. `Ctrl+P` triggers `window.print()`.

---

## V2 Roadmap

Features to add after V1 is stable:

| Feature | Details |
|---------|---------|
| **Markdown preview** | Toggle button or `Ctrl+Shift+P` to flip between raw edit and rendered preview; uses `marked` or `markdown-it` for rendering |
| **Additional themes** | 2-3 curated themes beyond light/dark (e.g., Solarized, Nord). CSS variable swap in settings |
| **Multiple cursors** | Tiptap collaboration cursor extension adapted for local multi-cursor |
| **Minimap** | Optional scrollbar minimap for longer files |
| **Auto-save** | Periodic write-back to the file handle (opt-in, with visual indicator) |
| **Folder open** | Open a directory and browse files in a sidebar tree |
| **Tab pinning** | Pin frequently used files |
| **RTF rendering** | Basic rich text display for .rtf files instead of showing raw RTF markup |
| **Custom keyboard shortcuts** | Let users rebind any shortcut via settings |
| **Android Play Store packaging** | TWA via Bubblewrap, with Storage Access Framework fallback fully tested, Play Store listing and assets |
| **Bracket matching** | Highlight matching brackets/parentheses in code files |

---

## Success Metrics

- **Time to first keystroke**: < 1 second from launch
- **Bundle size**: < 100KB gzipped
- **Lighthouse PWA score**: 100
- **Lighthouse Accessibility score**: ≥ 95
- **File open-to-edit time**: < 200ms for a 1MB text file
- **Zero data loss**: Crash recovery restores all unsaved tabs 100% of the time
- **Keyboard-only usability**: All features accessible without a mouse
