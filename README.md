# Markdown Editor POC

A professional-grade markdown editor with live preview, Mermaid diagrams, KaTeX math, Shiki syntax highlighting, and GitHub-Flavored Markdown — with local file access and Docker support for all operating systems.

## Features

- **Split-pane editor** — CodeMirror 6 source editor + live rendered preview, resizable
- **Mermaid diagrams** — flowchart, sequence, class, state, ER, gantt, pie, mindmap
- **Math** — KaTeX inline `$...$` and block `$$...$$`
- **Code highlighting** — Shiki (VS Code-grade) with 20+ languages, copy button
- **GFM extras** — tables, task lists, strikethrough, footnotes, autolinks, emoji
- **Callouts** — `> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`, `> [!IMPORTANT]`
- **Heading anchors** + **frontmatter** (YAML)
- **Folder tree**, **multi-file tabs**, autosave, conflict detection
- **Export** — standalone HTML, PDF via Puppeteer
- **Light/dark theme**
- **Security** — sanitized HTML (rehype-sanitize), Mermaid `securityLevel:strict`, CSP headers, no path traversal

---

## Quick Start

### Option 1: Docker (all OS, recommended)

```bash
docker compose up --build
```

Open [http://localhost:3001](http://localhost:3001).

The `./workspace` directory is mounted as the editor workspace. Any files you create or save appear there on your host machine.

> **Windows note:** If you see file permission errors, ensure Docker Desktop has access to the drive and the `workspace/` folder. Line endings are handled automatically (`.editorconfig` enforces LF).

---

### Option 2: Local development (hot reload)

**Prerequisites:** Node 20+, npm 10+

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev
# → http://localhost:3001

# Terminal 2 — frontend (hot reload)
cd web
npm install
npm run dev
# → http://localhost:5173 (proxies /api to :3001)
```

Open [http://localhost:5173](http://localhost:5173).

---

## Configuration

| Environment variable      | Default              | Description                              |
|---------------------------|----------------------|------------------------------------------|
| `PORT`                    | `3001`               | Backend port                             |
| `WORKSPACE_DIR`           | `../workspace`       | Absolute path to files workspace         |
| `PUPPETEER_EXECUTABLE_PATH` | auto-detected     | Path to Chrome/Chromium for PDF export   |

---

## PDF Export

PDF export uses Puppeteer with the system Chrome/Chromium.

- **Docker:** Chromium is installed in the image automatically.
- **Local (Windows):** Install [Google Chrome](https://www.google.com/chrome/) — the server auto-detects it at the default install path.
- **Local (macOS):** Install Chrome; the server checks `/Applications/Google Chrome.app/...`
- **Local (Linux):** Install `chromium-browser` via your package manager and set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`.

If PDF export fails, the browser-print button (Ctrl/Cmd+P) works as a fallback.

---

## Project Structure

```
poc-markdownReader/
├─ shared/types.ts          # API DTOs shared by web and server
├─ workspace/               # Mounted workspace (your .md files)
│  └─ welcome.md            # Demo file showcasing all features
├─ server/
│  ├─ Dockerfile            # Multi-stage, non-root, Chromium included
│  └─ src/
│     ├─ index.ts           # Express server, helmet/CSP, health check
│     ├─ config.ts          # Port, workspace dir, limits
│     ├─ workspace.ts       # Safe path resolver + file ops
│     └─ routes/
│        ├─ files.ts        # REST file API
│        └─ export.ts       # PDF export via Puppeteer
└─ web/
   └─ src/
      ├─ App.tsx            # Main layout, autosave, keyboard shortcuts
      ├─ store.ts           # Zustand state (tabs, dirty map, settings)
      ├─ workers/           # Markdown parsing (unified) in a Web Worker
      ├─ components/        # Editor, Preview, FileTree, Toolbar, etc.
      ├─ components/diagrams/ # Mermaid registry + per-diagram cache
      └─ lib/               # API client, editor commands, export helpers
```

---

## Running Tests

```bash
# Server unit tests (path-safety, hash, conflict detection)
cd server && npm test

# Frontend unit tests
cd web && npm test

# End-to-end (requires dev server running)
cd web && npm run test:e2e
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+S` | Save current file |
| `Ctrl+B` | Bold selection |
| `Ctrl+I` | Italic selection |
| `Ctrl+F` | Find & replace (CodeMirror built-in) |
