// Build a standalone HTML file from the preview's rendered content.
// The caller passes the already-rendered DOM innerHTML (Shiki + Mermaid SVGs + KaTeX already applied).

// ---------------------------------------------------------------------------
// DOM Sanitizer — strips broken React/Tailwind artifacts from the captured DOM
// ---------------------------------------------------------------------------
export function sanitizeExportHtml(rawHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  // Remove the SVG export button (uses URL.createObjectURL — non-functional in static HTML)
  // It sits directly inside the diagram container div (a sibling of .diagram-svg)
  doc.querySelectorAll(".diagram-svg ~ button").forEach((btn) => btn.remove());

  // Fix prose wrapper classes — React renders these as Tailwind utility classes
  // that have no effect without the Tailwind stylesheet loaded
  doc.querySelectorAll('[class*="prose"]').forEach((el) => {
    el.setAttribute("class", "export-prose");
  });

  // Fix diagram container classes — replace the Tailwind mess with a semantic export class
  doc.querySelectorAll(".diagram-svg").forEach((inner) => {
    inner.setAttribute("class", "export-diagram-inner");
    const container = inner.parentElement;
    if (container && container !== doc.body) {
      container.setAttribute("class", "export-diagram");
    }
  });

  // Wire copy buttons — button is now inside .code-block-bar, but .closest()
  // walks up to .code-block-wrapper. The Shiki <pre class="shiki"> sits as a
  // sibling of .code-block-bar so querySelector("pre") finds it correctly.
  // pre.textContent returns only the code text (::before counter content is
  // pseudo-element content, excluded from textContent — line numbers are safe).
  doc.querySelectorAll(".code-copy-btn").forEach((btn) => {
    const wrapper = btn.closest(".code-block-wrapper");
    const pre = wrapper?.querySelector("pre");
    if (pre) {
      btn.setAttribute("data-copy-text", pre.textContent ?? "");
    }
  });

  return doc.body.innerHTML;
}

// ---------------------------------------------------------------------------
// Standalone CSS — full GitHub-style prose + dark mode + all export classes
// ---------------------------------------------------------------------------
const STANDALONE_CSS = `
/* ────────────────────────────────────────────
   Theme tokens – light (default)
   ──────────────────────────────────────────── */
:root {
  --bg:             #ffffff;
  --surface:        #f6f8fa;
  --border:         #d0d7de;
  --text:           #1f2328;
  --text-muted:     #57606a;
  --accent:         #0969da;
  --code-bg:        #f6f8fa;
  --bq-border:      #d0d7de;
  --callout-bg:     #f6f8fa;
}

/* ── Dark mode via OS preference ── */
@media (prefers-color-scheme: dark) {
  :root {
    --bg:           #0d1117;
    --surface:      #161b22;
    --border:       #30363d;
    --text:         #e6edf3;
    --text-muted:   #8b949e;
    --accent:       #58a6ff;
    --code-bg:      #161b22;
    --bq-border:    #30363d;
    --callout-bg:   #161b22;
  }
}

/* ── Explicit dark theme — set when editor is in dark mode at export time ── */
[data-theme="dark"] {
  --bg:           #0d1117;
  --surface:      #161b22;
  --border:       #30363d;
  --text:         #e6edf3;
  --text-muted:   #8b949e;
  --accent:       #58a6ff;
  --code-bg:      #161b22;
  --bq-border:    #30363d;
  --callout-bg:   #161b22;
}

/* ────────────────────────────────────────────
   Base reset & layout
   ──────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }
html {
  scroll-behavior: smooth;
  font-size: 16px;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  max-width: 860px;
  margin: 2.5rem auto;
  padding: 0 2rem;
  word-break: break-word;
}

/* ────────────────────────────────────────────
   Prose wrapper (replaces Tailwind .prose class)
   ──────────────────────────────────────────── */
.export-prose { color: var(--text); max-width: none; }
.export-prose > *:first-child { margin-top: 0; }
.export-prose > *:last-child  { margin-bottom: 0; }

/* ────────────────────────────────────────────
   Headings — full 6-level hierarchy
   ──────────────────────────────────────────── */
h1, h2, h3, h4, h5, h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
  color: var(--text);
  position: relative;
}
h1 { font-size: 2em;      border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
h2 { font-size: 1.5em;    border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
h3 { font-size: 1.25em; }
h4 { font-size: 1.05em; font-weight: 600; }
h5 { font-size: 0.875em; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
h6 { font-size: 0.85em;  font-weight: 600; color: var(--text-muted); }

/* Heading anchor links (appended by rehype-autolink-headings) */
h1 a[aria-hidden="true"], h2 a[aria-hidden="true"],
h3 a[aria-hidden="true"], h4 a[aria-hidden="true"],
h5 a[aria-hidden="true"], h6 a[aria-hidden="true"] {
  color: inherit;
  text-decoration: none;
  opacity: 0;
  margin-left: 0.4em;
  font-size: 0.8em;
  font-weight: normal;
  transition: opacity 0.15s;
}
h1:hover a[aria-hidden="true"], h2:hover a[aria-hidden="true"],
h3:hover a[aria-hidden="true"], h4:hover a[aria-hidden="true"] { opacity: 0.4; }

/* ────────────────────────────────────────────
   Body text
   ──────────────────────────────────────────── */
p  { margin: 0 0 1em; }
strong { font-weight: 600; }
em     { font-style: italic; }
del    { color: var(--text-muted); text-decoration: line-through; }

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px; }

/* ────────────────────────────────────────────
   Code
   ──────────────────────────────────────────── */
code {
  background: var(--code-bg);
  border: 1px solid var(--border);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-size: 0.875em;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, "Courier New", monospace;
}
pre code { background: none; border: none; padding: 0; font-size: 1em; }

/* Plain pre fallback (shown while Shiki is loading, or for unknown languages) */
pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1rem 0;
  line-height: 1.5;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.875em;
}

/* ── Code blocks — VS Code-style ── */
.code-block-wrapper {
  margin: 1.25rem 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}
[data-theme="dark"] .code-block-wrapper { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.32); }
@media (prefers-color-scheme: dark) { .code-block-wrapper { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.32); } }

.code-block-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.8rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  min-height: 34px;
  user-select: none;
}

.code-dots { display: flex; gap: 5px; flex-shrink: 0; margin-right: 0.3rem; }
.code-dots > span { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
.code-dots > span:nth-child(1) { background: #ff5f57; }
.code-dots > span:nth-child(2) { background: #febc2e; }
.code-dots > span:nth-child(3) { background: #28c840; }

.code-block-lang {
  flex: 1;
  font-size: 0.72rem;
  font-family: "SFMono-Regular", Consolas, monospace;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.03em;
}
.code-copy-btn {
  padding: 0.15rem 0.6rem;
  font-size: 0.7rem;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.code-copy-btn:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

/* Shiki code block */
.code-block-wrapper .shiki {
  margin: 0;
  border-radius: 0;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  line-height: 1.65;
  font-size: 0.875em;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}
.code-block-wrapper .shiki code { font-size: 1em; font-family: inherit; }

/* Line numbers — CSS counter on .line::before (not in textContent, never copied) */
.code-block-wrapper .shiki code { counter-reset: ln; }
.code-block-wrapper .shiki .line::before {
  counter-increment: ln;
  content: counter(ln);
  display: inline-block;
  width: 1.8rem;
  margin-right: 1.4rem;
  text-align: right;
  opacity: 0.28;
  user-select: none;
  -webkit-user-select: none;
  font-variant-numeric: tabular-nums;
  font-size: 0.875em;
  border-right: 1px solid rgba(128, 128, 128, 0.18);
  padding-right: 0.5rem;
}
.code-block-wrapper .shiki .line:last-child:empty { display: none; }
.code-block-wrapper .shiki .line:last-child:empty::before { content: none; }

/* Plain pre fallback */
.code-block-plain {
  margin: 0;
  padding: 1rem 1.25rem;
  background: var(--surface);
  color: var(--text);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.875em;
  line-height: 1.65;
  overflow-x: auto;
}

/* ────────────────────────────────────────────
   Blockquote
   ──────────────────────────────────────────── */
blockquote {
  border-left: 4px solid var(--bq-border);
  margin: 1rem 0;
  padding: 0.6rem 1rem;
  color: var(--text-muted);
  background: var(--surface);
  border-radius: 0 4px 4px 0;
}
blockquote > p { margin: 0; }
blockquote > p + p { margin-top: 0.5em; }

/* ────────────────────────────────────────────
   Tables
   ──────────────────────────────────────────── */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
  font-size: 0.95em;
  display: block;
  overflow-x: auto;
}
th, td {
  border: 1px solid var(--border);
  padding: 0.45rem 0.75rem;
  text-align: left;
  vertical-align: top;
}
th {
  background: var(--surface);
  font-weight: 600;
  white-space: nowrap;
}
tr:nth-child(even) > td { background: var(--surface); }

/* ────────────────────────────────────────────
   Lists
   ──────────────────────────────────────────── */
ul, ol { padding-left: 1.6rem; margin: 0.5rem 0 1rem; }
li     { margin: 0.3rem 0; }
li > ul, li > ol { margin: 0.25rem 0; }

/* Task lists */
.contains-task-list { list-style: none; padding-left: 0.25rem; }
.task-list-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding-left: 0;
}
.task-list-item > input[type="checkbox"] {
  margin-top: 0.3em;
  flex-shrink: 0;
  accent-color: var(--accent);
  width: 1em;
  height: 1em;
}

/* ────────────────────────────────────────────
   Misc inline elements
   ──────────────────────────────────────────── */
img { max-width: 100%; height: auto; border-radius: 4px; }
hr  { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }

kbd {
  display: inline-block;
  padding: 0.1em 0.45em;
  font-size: 0.82em;
  font-family: monospace;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  box-shadow: inset 0 -2px 0 var(--border);
}
mark {
  background: #fff3b0;
  color: #1f2328;
  border-radius: 2px;
  padding: 0 0.15em;
}
[data-theme="dark"] mark { background: #4a3a00; color: #e6edf3; }
@media (prefers-color-scheme: dark) { mark { background: #4a3a00; color: #e6edf3; } }

details {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  margin: 1rem 0;
  background: var(--surface);
}
summary { cursor: pointer; font-weight: 600; padding: 0.25rem 0; }
details[open] > summary { margin-bottom: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }

/* ────────────────────────────────────────────
   Callouts / Admonitions
   ──────────────────────────────────────────── */
.callout {
  border-left: 4px solid var(--border);
  padding: 0.75rem 1rem;
  margin: 1.25rem 0;
  border-radius: 0 6px 6px 0;
  background: var(--callout-bg);
}
.callout-title {
  font-weight: 700;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.callout-title::before { font-size: 1.15em; }

/* Light mode callout colours */
.callout-note     { border-color: #0969da; background: #ddf4ff; }
.callout-note     .callout-title { color: #0550ae; }
.callout-note     .callout-title::before { content: "ℹ️"; }

.callout-tip      { border-color: #1a7f37; background: #dcffe4; }
.callout-tip      .callout-title { color: #116329; }
.callout-tip      .callout-title::before { content: "💡"; }

.callout-warning  { border-color: #9a6700; background: #fff8c5; }
.callout-warning  .callout-title { color: #7d4e00; }
.callout-warning  .callout-title::before { content: "⚠️"; }

.callout-important { border-color: #8250df; background: #fbefff; }
.callout-important .callout-title { color: #6639ba; }
.callout-important .callout-title::before { content: "❗"; }

.callout-caution  { border-color: #cf222e; background: #ffebe9; }
.callout-caution  .callout-title { color: #a40e26; }
.callout-caution  .callout-title::before { content: "🚫"; }

/* Dark mode callout colours */
[data-theme="dark"] .callout-note     { background: #0c2d6b; }
[data-theme="dark"] .callout-note     .callout-title { color: #79c0ff; }
[data-theme="dark"] .callout-tip      { background: #0a2e12; }
[data-theme="dark"] .callout-tip      .callout-title { color: #56d364; }
[data-theme="dark"] .callout-warning  { background: #2d2600; }
[data-theme="dark"] .callout-warning  .callout-title { color: #e3b341; }
[data-theme="dark"] .callout-important { background: #1e0a2e; }
[data-theme="dark"] .callout-important .callout-title { color: #d2a8ff; }
[data-theme="dark"] .callout-caution  { background: #2d0a0a; }
[data-theme="dark"] .callout-caution  .callout-title { color: #ffa198; }

@media (prefers-color-scheme: dark) {
  .callout-note      { background: #0c2d6b; }
  .callout-note      .callout-title { color: #79c0ff; }
  .callout-tip       { background: #0a2e12; }
  .callout-tip       .callout-title { color: #56d364; }
  .callout-warning   { background: #2d2600; }
  .callout-warning   .callout-title { color: #e3b341; }
  .callout-important { background: #1e0a2e; }
  .callout-important .callout-title { color: #d2a8ff; }
  .callout-caution   { background: #2d0a0a; }
  .callout-caution   .callout-title { color: #ffa198; }
}

/* ────────────────────────────────────────────
   Diagrams (Mermaid, etc.)
   ──────────────────────────────────────────── */
.export-diagram {
  margin: 1.5rem 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 1.25rem;
  overflow: auto;
}
.export-diagram-inner {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.export-diagram svg {
  max-width: 100%;
  height: auto;
  display: block;
}

/* ────────────────────────────────────────────
   Footnotes
   ──────────────────────────────────────────── */
.footnotes {
  font-size: 0.875em;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  margin-top: 3rem;
  padding-top: 1rem;
}
.footnotes ol { padding-left: 1.25rem; }
.footnotes li { margin: 0.4rem 0; }
.footnotes p  { margin: 0; }
.footnotes a  { color: var(--text-muted); }
.footnotes a:hover { color: var(--accent); }

/* Screen-reader only (used for footnotes heading) */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ────────────────────────────────────────────
   KaTeX math — CDN stylesheet loaded separately,
   but ensure display math has sensible margins
   ──────────────────────────────────────────── */
.math-display { margin: 1.25rem 0; overflow-x: auto; }

/* ────────────────────────────────────────────
   Scrollbar (WebKit)
   ──────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* ────────────────────────────────────────────
   Print stylesheet
   ──────────────────────────────────────────── */
@media print {
  body { max-width: none; margin: 0; padding: 1cm 2cm; font-size: 11pt; }
  .code-copy-btn, .code-block-lang { display: none; }
  a { color: inherit; text-decoration: underline; }
  a[href]::after { content: " (" attr(href) ")"; font-size: 0.8em; color: var(--text-muted); }
  a[href^="#"]::after { content: none; }
  pre, blockquote, .export-diagram, table { break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 { break-after: avoid; }
  h2, h3 { page-break-before: auto; }
  .footnotes { break-before: page; }
}
`;

// ---------------------------------------------------------------------------
// JavaScript — copy button handler (event delegation, no inline handlers)
// ---------------------------------------------------------------------------
const COPY_JS = `
(function () {
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".code-copy-btn");
    if (!btn) return;
    var text = btn.getAttribute("data-copy-text") || "";
    var restore = function (orig) { btn.textContent = orig; };
    var original = btn.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "✓ Copied";
        setTimeout(function () { restore(original); }, 1500);
      }).catch(function () { fallbackCopy(text, btn, original); });
    } else {
      fallbackCopy(text, btn, original);
    }
  });
  function fallbackCopy(text, btn, original) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); btn.textContent = "✓ Copied"; } catch (e) { btn.textContent = "✗ Failed"; }
    document.body.removeChild(ta);
    setTimeout(function () { btn.textContent = original; }, 1500);
  }
})();
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Builds a self-contained HTML document.
 *  @param renderedHtml  Already-sanitized DOM innerHTML (call sanitizeExportHtml first)
 *  @param title         Document title (shown in browser tab)
 *  @param theme         Editor theme at export time — "dark" sets data-theme on <html>
 *                       so Mermaid dark SVGs match the page background.
 */
export function buildStandaloneHtml(
  renderedHtml: string,
  title = "Export",
  theme: "light" | "dark" = "light"
): string {
  const themeAttr = theme === "dark" ? ' data-theme="dark"' : "";
  return `<!DOCTYPE html>
<html lang="en"${themeAttr}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <!-- KaTeX CSS — required for rendered math -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css" crossorigin="anonymous" />
  <style>${STANDALONE_CSS}</style>
</head>
<body>
${renderedHtml}
<script>${COPY_JS}</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
