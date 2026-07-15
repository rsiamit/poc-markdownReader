import { useState, useEffect, memo } from "react";
import { useEditorStore } from "../store";

// Shiki highlighter singleton — loaded once, reused for all blocks
let highlighterPromise: Promise<import("shiki").Highlighter> | null = null;

async function getHighlighter(): Promise<import("shiki").Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(({ createHighlighter }) =>
      createHighlighter({
        // VS Code's own default themes for authentic color coding
        themes: ["light-plus", "dark-plus"],
        langs: [
          "typescript", "javascript", "tsx", "jsx",
          "python", "rust", "go", "java", "c", "cpp", "csharp",
          "css", "html", "json", "yaml", "toml",
          "bash", "sh", "powershell", "markdown", "sql",
          "dockerfile", "terraform", "ruby", "php",
          "swift", "kotlin", "scala", "r", "matlab",
          "vue", "svelte", "graphql", "xml", "regex",
          "dart", "lua", "perl", "elixir", "haskell",
        ],
      })
    );
  }
  return highlighterPromise;
}

// Normalise fenced-code language identifiers to Shiki's canonical IDs
const LANG_ALIASES: Record<string, string> = {
  "c#":       "csharp",
  "cs":       "csharp",
  "js":       "javascript",
  "ts":       "typescript",
  "py":       "python",
  "rb":       "ruby",
  "sh":       "bash",
  "zsh":      "bash",
  "shell":    "bash",
  "console":  "bash",
  "ps1":      "powershell",
  "ps":       "powershell",
  "yml":      "yaml",
  "tf":       "terraform",
  "kt":       "kotlin",
  "rs":       "rust",
  "dockerfile": "dockerfile",
};

function normaliseLang(lang: string): string {
  return LANG_ALIASES[lang.toLowerCase()] ?? lang.toLowerCase();
}

interface Props {
  code: string;
  lang: string;
}

export const CodeBlock = memo(function CodeBlock({ code, lang }: Props): JSX.Element {
  const { settings } = useEditorStore();
  const shikiTheme = settings.theme === "dark" ? "dark-plus" : "light-plus";
  const displayLang = normaliseLang(lang || "");
  const [html, setHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (cancelled) return;
      const resolved = normaliseLang(lang || "text");
      try {
        setHtml(hl.codeToHtml(code, { lang: resolved, theme: shikiTheme }));
      } catch {
        try {
          setHtml(hl.codeToHtml(code, { lang: "text", theme: shikiTheme }));
        } catch {
          setHtml("");
        }
      }
    });
    return () => { cancelled = true; };
  }, [code, lang, shikiTheme]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block-wrapper">
      {/* VS Code-style title bar */}
      <div className="code-block-bar">
        <span className="code-dots" aria-hidden="true">
          <span /><span /><span />
        </span>
        {displayLang && <span className="code-block-lang">{displayLang}</span>}
        <button
          className="code-copy-btn"
          onClick={handleCopy}
          title="Copy code to clipboard"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      {/* Highlighted code (or plain fallback while Shiki loads) */}
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="code-block-plain">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
});
