// Build a standalone HTML file from the preview's rendered content.
// The caller passes the already-rendered DOM innerHTML (Shiki + Mermaid SVGs + KaTeX already applied).

const STANDALONE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #1f2328;
    background: #fff;
    max-width: 860px;
    margin: 2rem auto;
    padding: 0 2rem;
  }
  h1, h2 { border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
  h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; position: relative; }
  a { color: #0969da; }
  /* Heading anchor icon */
  .icon-link::before { content: "#"; font-size: 0.8em; opacity: 0.3; margin-left: 0.4em; }
  h1:hover .icon-link::before, h2:hover .icon-link::before,
  h3:hover .icon-link::before, h4:hover .icon-link::before { opacity: 0.6; }
  code { background: #f6f8fa; padding: 0.1em 0.35em; border-radius: 3px; font-size: 0.9em; font-family: "JetBrains Mono", "Fira Code", monospace; }
  pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; border: 1px solid #d0d7de; margin: 1rem 0; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #d0d7de; margin: 0; padding-left: 1rem; color: #57606a; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #d0d7de; padding: 0.4rem 0.75rem; }
  th { background: #f6f8fa; font-weight: 600; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #d0d7de; margin: 1.5rem 0; }
  /* Task lists */
  .contains-task-list { list-style: none; padding-left: 0.5rem; }
  .task-list-item input { margin-right: 0.5rem; }
  /* Callouts */
  .callout { border-left: 4px solid; padding: 0.75rem 1rem; margin: 1rem 0; border-radius: 0 6px 6px 0; background: #f6f8fa; }
  .callout-note { border-color: #0969da; }
  .callout-warning { border-color: #9a6700; background: #fff8c5; }
  .callout-tip { border-color: #1a7f37; }
  .callout-important { border-color: #8250df; }
  .callout-title { font-weight: 600; margin-bottom: 0.25rem; text-transform: capitalize; }
  /* Footnotes */
  .footnotes { font-size: 0.9em; color: #57606a; border-top: 1px solid #d0d7de; margin-top: 2rem; padding-top: 1rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  /* Shiki code blocks — already have inline styles, just ensure wrapping */
  .shiki { border-radius: 6px; overflow-x: auto; }
  /* Diagram SVGs */
  .diagram-svg svg { max-width: 100%; height: auto; }
  @media print { body { margin: 0; } }
`;

export function buildStandaloneHtml(
  renderedHtml: string,
  title = "Export"
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <!-- KaTeX CSS — required for rendered math to display correctly -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css" crossorigin="anonymous">
  <style>${STANDALONE_CSS}</style>
</head>
<body>
${renderedHtml}
</body>
</html>`;
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
