# Drift — Design Document for Figma

**Version 1.0 — Prepared for UI/UX Design Phase**

---

## Purpose of This Document

This design doc translates Drift's PRD into actionable specifications for Figma. It defines every screen, component, state, color token, type scale, spacing rule, and interaction so that a designer can build a complete, pixel-accurate prototype without ambiguity. The goal: hand this to Figma, build the design system and screens, then hand those frames directly to code.

---

## 1. Design Principles (Figma Interpretation)

| Principle | What It Means in Figma |
|-----------|----------------------|
| **Instant** | No splash screen. No loading skeleton. The first frame IS the editor with a blinking cursor. |
| **Invisible** | UI chrome uses muted colors and thin weights. The editor text is the highest-contrast, most prominent element on screen. |
| **Local-first** | No sign-in screens, no cloud icons, no account avatars anywhere in the design. |
| **Respectful** | No "upgrade" banners, no tips, no onboarding modals. First launch = blank editor, ready. |
| **Accessible** | Every interactive element has a visible focus state. Color is never the only differentiator. |

---

## 2. Color System

### Design Tokens

Define these as Figma variables (or styles) so every component references them, and theme switching is a single variable mode swap.

#### Light Theme

| Token | Value | Usage |
|-------|-------|-------|
| `bg-editor` | `#FAFAF8` | Editor background |
| `bg-sidebar` | `#F3F3F0` | Sidebar background |
| `bg-statusbar` | `#F3F3F0` | Status bar background |
| `bg-tab-active` | `#EAEAE6` | Active tab highlight |
| `bg-tab-hover` | `#F0F0EC` | Tab hover state |
| `bg-find` | `#FFFFFF` | Find bar background |
| `bg-input` | `#FFFFFF` | Input field backgrounds |
| `bg-overlay` | `rgba(0,0,0,0.4)` | Modal/shortcut overlay backdrop |
| `text-primary` | `#1A1A1A` | Editor text, primary labels |
| `text-secondary` | `#6B6B6B` | Status bar, muted labels, recent files |
| `text-placeholder` | `#AAAAAA` | Input placeholders, empty states |
| `border-hairline` | `#E5E5E2` | Sidebar edge, find bar bottom, settings dividers |
| `accent` | `#5A9E9E` | Active tab left border, focus rings, icon hover, links |
| `accent-subtle` | `rgba(90,158,158,0.12)` | Active tab background tint |
| `danger` | `#D94545` | Unsaved dot, destructive actions |
| `icon-default` | `#8C8C8C` | Default icon color |
| `icon-hover` | `#5A9E9E` | Icon hover color (matches accent) |

#### Dark Theme

| Token | Value | Usage |
|-------|-------|-------|
| `bg-editor` | `#1E1E1E` | Editor background |
| `bg-sidebar` | `#252525` | Sidebar background |
| `bg-statusbar` | `#252525` | Status bar background |
| `bg-tab-active` | `#333333` | Active tab highlight |
| `bg-tab-hover` | `#2C2C2C` | Tab hover state |
| `bg-find` | `#2A2A2A` | Find bar background |
| `bg-input` | `#333333` | Input field backgrounds |
| `bg-overlay` | `rgba(0,0,0,0.6)` | Modal backdrop |
| `text-primary` | `#E0E0E0` | Editor text, primary labels |
| `text-secondary` | `#888888` | Status bar, muted labels |
| `text-placeholder` | `#555555` | Placeholders |
| `border-hairline` | `#333333` | Dividers |
| `accent` | `#6BB3B3` | Accent (slightly brighter for dark bg contrast) |
| `accent-subtle` | `rgba(107,179,179,0.15)` | Active tab background tint |
| `danger` | `#E06060` | Unsaved dot |
| `icon-default` | `#777777` | Default icons |
| `icon-hover` | `#6BB3B3` | Icon hover |

### Syntax Highlighting Palette (Markdown)

| Token | Light | Dark | Applies To |
|-------|-------|------|------------|
| `syntax-heading` | `#1A1A1A` (bold) | `#E0E0E0` (bold) | `# Headings` |
| `syntax-bold` | `#1A1A1A` (bold) | `#E0E0E0` (bold) | `**bold**` |
| `syntax-italic` | `#6B6B6B` (italic) | `#AAAAAA` (italic) | `*italic*` |
| `syntax-code` | `#C25A5A` | `#E08080` | `` `inline code` `` |
| `syntax-link` | `#5A9E9E` | `#6BB3B3` | `[text](url)` |
| `syntax-list-marker` | `#5A9E9E` | `#6BB3B3` | `- ` and `1. ` |
| `syntax-blockquote` | `#8C8C8C` | `#666666` | `> quotes` |
| `syntax-hr` | `#CCCCCC` | `#444444` | `---` |

---

## 3. Typography

### Type Scale

| Role | Font Stack | Size | Weight | Line Height | Letter Spacing |
|------|-----------|------|--------|-------------|---------------|
| **Editor (mono)** | `"Cascadia Code", "JetBrains Mono", "Fira Code", monospace` | 14px (default, user-adjustable 12–24px) | 400 | 1.6 | 0 |
| **Editor (serif)** | `"Georgia", "Noto Serif", serif` | 14px (default) | 400 | 1.7 | 0 |
| **Editor (sans)** | `"Inter", system-ui, "Roboto", sans-serif` | 14px (default) | 400 | 1.6 | 0 |
| **Sidebar filename** | System UI stack | 13px | 400 (active: 500) | 1.3 | 0 |
| **Sidebar section label** | System UI stack | 11px | 600 | 1.3 | 0.5px |
| **Status bar** | System UI stack | 11px | 400 | 1.0 | 0.2px |
| **Find bar input** | System UI stack | 13px | 400 | 1.3 | 0 |
| **Settings label** | System UI stack | 13px | 500 | 1.4 | 0 |
| **Settings value** | System UI stack | 13px | 400 | 1.4 | 0 |
| **Shortcut overlay heading** | System UI stack | 15px | 600 | 1.4 | 0 |
| **Shortcut overlay item** | System UI stack | 13px | 400 | 1.6 | 0 |

### System UI Font Stack

```css
font-family: "Segoe UI", "Inter", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

---

## 4. Spacing & Layout

### Spacing Scale

Use a 4px base grid. All spacing values are multiples of 4.

| Token | Value | Common Usage |
|-------|-------|-------------|
| `space-1` | 4px | Inline icon gap, tight padding |
| `space-2` | 8px | Input padding, icon margins |
| `space-3` | 12px | Sidebar horizontal padding, status bar padding |
| `space-4` | 16px | Section gaps, settings item padding |
| `space-5` | 20px | Settings group gaps |
| `space-6` | 24px | Modal padding |
| `space-8` | 32px | Large section breaks |

### Layout Dimensions

| Element | Measurement |
|---------|------------|
| Sidebar width | 200px (collapsed: 0px) |
| Sidebar header height | 44px |
| Tab item height | 36px |
| Status bar height | 28px |
| Find bar height | 40px |
| Line number gutter width | 48px (adjusts for 4+ digit line numbers) |
| Hamburger button area | 40×40px |
| Sidebar icon size | 20×20px |
| Close (×) button size | 16×16px (click target 32×32px) |
| New tab (+) button area | full-width × 36px |
| Settings panel width | 200px (same as sidebar) |
| Shortcut overlay | 480×auto, centered, max-height 80vh |
| Go-to-line input | 200×36px, centered top of editor |

---

## 5. Component Library

Build these as Figma components with variants. Each component below specifies its states and properties.

### 5.1 Sidebar Tab Item

**Properties:** `filename` (text), `fileTypeIcon` (instance swap), `isActive` (boolean), `isUnsaved` (boolean), `isHovered` (boolean)

| State | Background | Left Border | Close Button | Unsaved Dot |
|-------|-----------|-------------|-------------|-------------|
| Default | transparent | none | hidden | hidden |
| Hover | `bg-tab-hover` | none | visible (icon-default) | if unsaved: visible |
| Active | `bg-tab-active` | 3px `accent` | hidden | if unsaved: visible |
| Active + Hover | `bg-tab-active` | 3px `accent` | visible | if unsaved: visible |

**Layout:** Row, 12px left padding (or 9px + 3px border), 8px right padding. Icon (16px) → 8px gap → Filename (flex, truncate ellipsis) → Unsaved dot (6px circle, `danger`) → Close button (16px, visible on hover only).

### 5.2 Sidebar Header

**Layout:** Row, space-between, 44px tall, 12px horizontal padding.

**Children:** Overflow menu icon (⋮) | Open icon (📂) | Save icon (💾)

**Icon states:** Default (`icon-default`), Hover (`icon-hover`), Active/Pressed (accent at 80% opacity).

### 5.3 Sidebar — Recent Files Section

**Layout:** Below tab list, separated by a 1px `border-hairline` line. Section label "RECENT" in `text-secondary`, 11px, 600 weight, 12px left padding.

**Items:** Same as tab items but muted: filename in `text-secondary`, no unsaved dot, no close button. On hover: `bg-tab-hover` and filename becomes `text-primary`.

**Footer:** "+" button spanning full width, 36px tall, centered `+` icon (20px) in `icon-default`. Hover: `bg-tab-hover`, icon becomes `icon-hover`.

### 5.4 Find Bar

**Visibility:** Hidden by default. Slides down from top of editor area (below hamburger row) when triggered.

**Layout:** Row, 40px tall, 12px padding. Two input fields side by side (flex), separated by 8px. Then: match count label ("3 of 12" in `text-secondary`, 11px), match case button (Aa), regex button (.*), close button (×). All buttons are 28×28px toggle icons.

**Input fields:** 13px font, `bg-input` background, 1px `border-hairline` border, 8px padding. On focus: border becomes `accent`.

**Toggle button states:** Off = `icon-default` on transparent. On = `accent` on `accent-subtle`.

### 5.5 Status Bar

**Layout:** Row, 28px tall, 12px horizontal padding, items separated by ` · ` (middle dot in `text-placeholder`).

**Items (left to right):**
1. Encoding — e.g., "UTF-8" — clickable, shows underline on hover, opens encoding picker dropdown
2. Line ending — "LF" or "CRLF" — clickable, toggles on click
3. Cursor position — "Ln 4, Col 12"
4. Word count — "128 words"
5. File type — "Markdown" or "Plain Text"

**Encoding picker:** Small dropdown (140px wide), appears above the status bar anchored to the encoding label. `bg-find` background, 4px border-radius, subtle shadow. Lists: UTF-8, UTF-16 LE, UTF-16 BE, ISO-8859-1. Each item 32px tall, 12px padding. Active item has a check mark icon (`check`, 14px, `accent`) on the left. Hover: `bg-tab-hover`.

**Line ending toggle:** Clickable label. On click, toggles between LF and CRLF. Shows underline on hover (like encoding). No dropdown — single click toggles. Current value updates immediately in the status bar and applies to the file on next save.

### 5.6 Overflow Menu (⋮)

**Trigger:** Click on ⋮ icon in sidebar header.

**Layout:** Dropdown, 180px wide, 4px border-radius, `bg-find` background, subtle box shadow (`0 2px 8px rgba(0,0,0,0.12)`). This is the ONE exception to the "no shadows" rule — menus need elevation.

**Items:** Full-width rows, 36px tall, 12px horizontal padding. Icon (16px) → 12px gap → Label (13px) → Right-aligned shortcut hint (`text-secondary`, 11px).

| Item | Icon | Shortcut |
|------|------|----------|
| New | `file-plus` | Ctrl+N |
| Open | `folder-open` | Ctrl+O |
| Save | `save` | Ctrl+S |
| Save As | `save` | Ctrl+Shift+S |
| Print | `printer` | Ctrl+P |
| ─ divider ─ | | |
| Find & Replace | `search` | Ctrl+F |
| Go to Line | `arrow-down-to-line` | Ctrl+G |
| ─ divider ─ | | |
| Settings | `settings` | |
| Keyboard Shortcuts | `keyboard` | Ctrl+/ |

**Hover state:** `bg-tab-hover`. **Dividers:** 1px `border-hairline`, 8px vertical margin.

### 5.7 Settings Panel

**Replaces tab list inside sidebar.** Same width (200px).

**Header:** Back arrow (←) icon + "Settings" label. 44px tall, 12px padding.

**Content:** Scrollable list of setting items. Each item is a row with label on top and control below, separated by 16px vertical spacing.

**Control types:**
- **Toggle (On/Off):** Small pill toggle, 32×18px. Off = `border-hairline` bg. On = `accent` bg with white circle.
- **Segmented control (2-3 options):** Row of buttons, each 1/n width. Active = `accent` text + `accent-subtle` bg. Inactive = `text-secondary` on transparent.
- **Slider (font size):** Thin track in `border-hairline`, circle thumb in `accent`, 14px. Current value label to the right.
- **Stepper (tab size):** Three options as segmented control: 2 | 4 | 8.

**Setting groups:**

1. **Appearance** — Theme (segmented: Light / Dark / System), Font size (slider 12–24), Font family (segmented: Mono / Serif / Sans)
2. **Editor** — Line numbers (toggle), Word wrap (toggle), Auto-indent (toggle), Show whitespace (toggle)
3. **Tabs** — Tab behavior (segmented: Tabs / Spaces), Tab size (segmented: 2 / 4 / 8)
4. **File** — Default encoding (segmented: UTF-8 / UTF-16 / ISO-8859-1)

### 5.8 Keyboard Shortcut Overlay

**Trigger:** ⋮ menu → "Keyboard Shortcuts" or `Ctrl+/`.

**Layout:** Centered modal, 480px wide, max-height 80vh, scrollable. Background `bg-find`, 24px padding, 8px border-radius. Backdrop `bg-overlay`.

**Content:** Grouped by category. Category headings in 15px/600, followed by a list of shortcut rows.

**Shortcut row:** Label on left (13px, `text-primary`), key combo on right (styled as keyboard key badges: `text-secondary` text, `bg-sidebar` background, 1px `border-hairline` border, 4px border-radius, 4px 8px padding).

**Categories:** File, Edit, View, Navigation.

**Dismiss:** Click backdrop, press Esc, or click × in top-right corner of overlay.

### 5.9 Go-to-Line Input

**Trigger:** `Ctrl+G`.

**Layout:** Small floating input centered at the top of the editor pane. 200px wide, 36px tall. `bg-find` background, 1px `border-hairline` border, 8px border-radius, subtle shadow.

**Placeholder:** "Go to line..."

**Behavior:** Type number, press Enter to jump. Esc to dismiss. Invalid input (non-numeric, out-of-range) shows input border as `danger` briefly.

### 5.10 Save Confirmation Dialog

**Trigger:** Closing a tab or the app with unsaved changes.

**Single file:** Inline bar at the top of the editor (same position as find bar). Text: "Save changes to [filename]?" followed by three buttons: **Save** (`accent` bg, white text), **Don't Save** (transparent, `text-secondary`), **Cancel** (transparent, `text-primary`). 40px tall, 12px padding.

**Multiple files (app close):** Same position, but text: "You have [N] unsaved files." Buttons: **Save All** (`accent`), **Discard All** (`danger` text, transparent bg), **Cancel** (transparent). Each button has 8px horizontal padding, 28px tall, 4px border-radius.

**Keyboard:** Enter = Save/Save All, Esc = Cancel. Tab moves between buttons.

### 5.11 Crash Recovery Banner

**Trigger:** App launches and IndexedDB contains unsaved tab state from a previous session.

**Layout:** Thin bar at the top of the editor area, 36px tall, `accent-subtle` background. Text: "Restored [N] unsaved file(s) from your last session." Dismiss button (×) on right. Auto-dismisses after 5 seconds.

**No user action needed** — files are restored silently into tabs. The banner is informational only.

### 5.12 Drag & Drop Overlay

**Trigger:** File dragged over the window.

**Layout:** Full-screen overlay, `bg-overlay` backdrop. Centered content: dashed 2px `accent` border rounded rectangle (200×120px), with a file icon (32px, `accent`) and "Drop to open" label (15px, `text-primary` on the overlay's surface).

### 5.13 Hamburger Button (☰)

**Position:** Fixed top-left of the editor area. Always visible regardless of sidebar state.

**Size:** 40×40px.

**States:** Default (`icon-default`), Hover (`icon-hover`), Active (`accent`).

**When sidebar is open:** Visually integrated into the top-left corner. The hamburger sits at the left edge of the editor, immediately right of the sidebar boundary.

**When sidebar is closed:** Hamburger sits at the absolute top-left of the window, with editor content starting below it.

---

## 6. Screens to Build in Figma

Build each screen as a separate Figma frame at **1440×900** (desktop). Use Auto Layout for all frames.

### Screen List

| # | Screen Name | Description |
|---|------------|-------------|
| 1 | **Default — Empty Editor** | Sidebar open, one untitled tab active, empty editor with blinking cursor. Status bar shows defaults. |
| 2 | **Editor with Content** | 2-3 tabs open, one active with markdown content visible. Syntax highlighting visible. Line numbers in gutter. |
| 3 | **Sidebar Collapsed** | Sidebar hidden. Hamburger visible top-left. Editor takes full width. |
| 4 | **Find Bar Open** | Find bar visible at top of editor. One input focused. Match count visible. |
| 5 | **Find & Replace Open** | Both find and replace fields visible. Regex and match-case toggles shown. |
| 6 | **Overflow Menu Open** | ⋮ menu dropdown visible over sidebar. |
| 7 | **Settings Panel** | Sidebar shows settings instead of tabs. All controls visible in their default states. |
| 8 | **Keyboard Shortcuts Overlay** | Centered modal with shortcut list. Dark backdrop. |
| 9 | **Go-to-Line Input** | Small floating input at top-center of editor. |
| 10 | **Unsaved Tab State** | Tab with red unsaved dot. Same tab hovered to show × close button. |
| 11 | **Close Unsaved — Confirmation** | Small inline prompt: "Save changes to untitled.txt?" with Save / Don't Save / Cancel buttons. Appears at the top of the editor or as a small dialog. |
| 12 | **Drag & Drop Overlay** | File being dragged over window, overlay with dashed border and "Drop to open" label. |
| 13 | **Encoding Picker** | Small dropdown anchored above the encoding label in the status bar. |
| 14 | **Dark Theme — Editor with Content** | Same as Screen 2 but in dark mode. Validates that all tokens work. |
| 15 | **Dark Theme — Settings** | Same as Screen 7 in dark mode. |
| 16 | **Print Preview** | How content looks when printed: no chrome, just text with margins. Note: `Ctrl+P` goes straight to OS print dialog. This screen is for design reference only. |
| 17 | **Recent Files** | Sidebar with 2 open tabs and 5 recent files listed below the divider. |
| 18 | **Crash Recovery Banner** | Editor on launch with restoration banner visible at top. 2 restored tabs in sidebar. |
| 19 | **Save Confirmation — Single File** | Inline save prompt at top of editor: "Save changes to notes.txt?" with Save / Don't Save / Cancel. |
| 20 | **Save Confirmation — Multiple Files** | Inline prompt: "You have 3 unsaved files." with Save All / Discard All / Cancel. |

---

## 7. Interaction & Animation Specs

All animations respect `prefers-reduced-motion`. When reduced motion is active, transitions are instant (0ms).

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Sidebar open/close | Slide left/right + editor width expands/contracts | 200ms | ease-out |
| Find bar show/hide | Slide down/up from top edge | 150ms | ease-out |
| Settings panel swap | Tab list slides left, settings slides in from right (within sidebar) | 200ms | ease-in-out |
| Menu dropdown open | Fade in + scale from 0.95 to 1.0 | 120ms | ease-out |
| Menu dropdown close | Fade out | 80ms | ease-out |
| Tab reorder (drag) | Tab follows pointer, others shift with 150ms slide | 150ms | ease-out |
| Overlay appear | Backdrop fades in, content scales from 0.95 | 200ms | ease-out |
| Overlay dismiss | Fade out | 150ms | ease-in |
| Focus ring | Appears immediately (no transition) | 0ms | — |
| Hover states | Background color transition | 100ms | ease |
| Unsaved dot appear | Fade in | 200ms | ease |
| Go-to-line input | Fade in + slide down 8px | 120ms | ease-out |
| Drag overlay | Fade in | 150ms | ease |
| Status bar encoding picker | Fade in + slide up 4px | 120ms | ease-out |

---

## 8. Iconography

Use **Lucide** icons throughout. All icons are 20×20px in the sidebar header, 16×16px inside menus and tab items.

| Usage | Lucide Icon Name |
|-------|-----------------|
| Overflow menu | `more-vertical` |
| Open file | `folder-open` |
| Save | `save` |
| New file | `file-plus` |
| Close tab | `x` |
| Close find bar | `x` |
| Hamburger/menu | `menu` |
| Find | `search` |
| Settings | `settings` |
| Keyboard shortcuts | `keyboard` |
| Back arrow | `arrow-left` |
| Print | `printer` |
| Go to line | `arrow-down-to-line` |
| Regex toggle | Custom: `.*` as text, not icon |
| Match case toggle | Custom: `Aa` as text, not icon |
| File type: .txt | `file-text` |
| File type: .md | `file-code` |
| File type: .rtf | `file-type` |
| New tab (+) | `plus` |
| Drop zone file | `file-down` |

---

## 9. Window Behavior

| Property | Value |
|----------|-------|
| **Default size** | 1024×700px |
| **Minimum size** | 600×400px |
| **Sidebar** | Open by default, push layout (editor resizes when sidebar toggles) |
| **Status bar** | Always shows full info (encoding, line ending, cursor pos, word count, file type) |
| **Click targets** | Minimum 32×32px for all interactive elements |

---

## 10. Edge Cases to Design For

| Case | Behavior |
|------|----------|
| Very long filename | Truncate with ellipsis in tab. Full name in tooltip on hover. |
| 20+ tabs open | Tab list scrolls vertically. Active tab scrolled into view. |
| Empty editor, no files | Single untitled tab. Editor shows placeholder text: "Start typing..." in `text-placeholder`. |
| Large file (1MB+) | Line numbers may be 5+ digits — gutter width expands to fit. |
| No File System Access API | Fallback: Save shows browser download dialog. Open uses `<input type="file">`. Status bar shows a subtle "limited mode" indicator. Uses Android Storage Access Framework when available. |
| Offline state | No visible indicator needed (app works fully offline). If user was previously online, no change in UI. |
| OS dark mode switches mid-session | If theme is "System," editor instantly transitions to the new theme. |
| Multiple unsaved tabs on close | Show save prompt for each unsaved tab sequentially, or a summary: "You have 3 unsaved files. Save all?" with Save All / Discard All / Cancel. |
| Print with sidebar open | Print stylesheet hides sidebar regardless. |
| File opened externally (PWA file handler) | App launches (or focuses) with the file opened in a new tab. If app was already open, new tab is added. |
| Permission denied on recent file | Show brief toast: "File access expired. Please re-open the file." Remove from recents. |

---

## 11. Figma Organization

### Page Structure

```
Drift (Figma File)
├── Cover
├── Design Tokens (color, type, spacing variables)
├── Components (all components with variants)
├── Screens — Light Theme
├── Screens — Dark Theme
├── Interactions & Prototyping Notes
└── Edge Cases
```

### Naming Convention

- Frames: `Screen / [Name] / [Variant]` — e.g., `Screen / Editor / Dark / Find Open`
- Components: `[Category] / [Name] / [State]` — e.g., `Sidebar / Tab Item / Active + Hover`
- Tokens: Use Figma variables with modes for Light and Dark

### Prototyping Connections

Wire up these key flows in Figma's prototype mode for the design review:

1. **Sidebar toggle** — Click ☰ to open/close sidebar (smart animate between Screen 1 and Screen 3)
2. **Find flow** — Press conceptual Ctrl+F → find bar appears → type → see matches → Esc to close
3. **Settings flow** — Click ⋮ → click Settings → settings panel slides in → change a toggle → click ← to return to tabs
4. **Tab management** — Click between tabs → editor content swaps → close a tab with unsaved changes → save prompt appears

---

## 12. Handoff Checklist

Before handing the Figma file to development, verify:

- [ ] All color tokens defined as Figma variables with Light and Dark modes
- [ ] All components have interactive variants (default, hover, active, focused, disabled where applicable)
- [ ] Desktop frames exist for every screen listed in Section 6
- [ ] Dark theme screens validate that all tokens produce correct contrast
- [ ] WCAG AA contrast ratios verified for all text/background combinations (use Figma plugin: "Contrast")
- [ ] All icon instances use Lucide and are swappable
- [ ] Auto Layout applied to all frames (no fixed positioning except hamburger)
- [ ] Spacing follows the 4px grid exclusively
- [ ] Prototype connections wired for the 4 flows listed above
- [ ] Edge case screens built for: long filename, many tabs, save prompt, drag overlay
- [ ] Annotations added for any behavior not obvious from the visual (e.g., "this input auto-focuses on appear")
