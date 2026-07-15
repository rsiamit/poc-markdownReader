import { useState, useEffect, memo } from "react";
import { useEditorStore } from "../store";

// Shiki highlighter singleton
let highlighterPromise: Promise<import("shiki").Highlighter> | null = null;

async function getHighlighter(): Promise<import("shiki").Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(({ createHighlighter }) =>
      createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: [
          "typescript",
          "javascript",
          "tsx",
          "jsx",
          "python",
          "rust",
          "go",
          "java",
          "c",
          "cpp",
          "css",
          "html",
          "json",
          "yaml",
          "toml",
          "bash",
          "sh",
          "markdown",
          "sql",
          "dockerfile",
          "terraform",
        ],
      })
    );
  }
  return highlighterPromise;
}

interface Props {
  code: string;
  lang: string;
}

export const CodeBlock = memo(function CodeBlock({ code, lang }: Props): JSX.Element {
  const { settings } = useEditorStore();
  const theme = settings.theme === "dark" ? "github-dark" : "github-light";
  const [html, setHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (cancelled) return;
      try {
        const highlighted = hl.codeToHtml(code, { lang: lang || "text", theme });
        setHtml(highlighted);
      } catch {
        // Unknown language — fallback to plain
        try {
          const fallback = hl.codeToHtml(code, { lang: "text", theme });
          setHtml(fallback);
        } catch {
          setHtml(`<pre><code>${code.replace(/</g, "&lt;")}</code></pre>`);
        }
      }
    });
    return () => { cancelled = true; };
  }, [code, lang, theme]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block-wrapper">
      {lang && <span className="code-block-lang">{lang}</span>}
      <button className="code-copy-btn" onClick={handleCopy}>
        {copied ? "✓" : "Copy"}
      </button>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="p-4 bg-[var(--color-surface)] rounded overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
});
