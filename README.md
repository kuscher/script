# Script

**Script** is a beautifully designed, privacy-first, lightning-fast plain text editor built directly for the modern web. 

It provides an unparalleled, distraction-free writing environment that lives entirely within your browser while seamlessly interacting with your local file system. From managing complex code syntax to intelligently querying an inline AI assistant, Script elevates your raw text workflow without compromising extreme speed or local-first data integrity.

### ✨ Features
- **Local-First Architecture:** By leveraging the native File System Access API, Script reads and writes locally. No centralized cloud servers scraping your data.
- **Material Expressive UI:** Built cleanly on strict Material Design primitives, featuring dynamic sidebar navigation, elegant dark mode transitions, and extremely polished typography scaling.
- **Instant Syntax Highlighting:** Integrated with a headless ProseMirror / Tiptap engine and Lowlight, code snippets elegantly format on the fly with custom semantic coloring.
- **Inline `@` AI Engine:** Highlight text seamlessly by typing `@` anywhere on the page to instantly fetch absolute, terse context answers pushed straight from Google's bleeding-edge **Gemini 3 Flash Preview** models. (Powered strictly via local API storage).
- **Auto-Naming AI:** Just brain dump in an Untitled document. After a short pause, the AI will automatically name it, pick an emoji, and assign the correct file extension based on content.
- **Smart Formatting (Markdownifier):** A magic wand tool that perfectly formats messy walls of text into structured Markdown with headers and bullet points.
- **Generative Ghostwriter & Tone Adjuster:** Highlight text to seamlessly adjust its tone from blunt to diplomatic using an intelligent slider, or trigger smart contextual completion.
- **Kuscher Judgement:** An always-on AI Persona that gives brutally honest feedback on your writing.
- **Progressive Web App (PWA) Ready:** Natively caches offline configurations, allowing the entire application footprint to work offline.

### 🚀 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Locally:**
   ```bash
   npm run dev
   ```

3. **Production Build:**
   ```bash
   npm run build
   ```

### ⚙️ Using AI Features
To activate the powerful AI engines (Auto-Naming, Smart Formatting, Tone Slider, Kuscher Judgement, and `@` Queries):
1. Hit the settings gear in the sidebar.
2. Toggle the features you want (e.g. **Enable @ queries**).
3. Provide a valid Google AI Studio Key (saved securely directly into isolated LocalStorage).
4. For `@` queries, simply type words and invoke `@` (e.g. `height of Tokyo Tower @`). The engine will natively highlight contextual text and replace the `@` with actionable facts cleanly via atomic undo-history mapping!
5. For Tone Adjustments, highlight any block of text to summon the AI action bubble.
6. For Smart Formatting, click the magic wand (`✨`) in the top right header.

---

*Co-developed by **Alexander Kuscher** and **Gemini**, seamlessly paired using the **Antigravity** autonomous computing architecture.*
