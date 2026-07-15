import { useState, useEffect, useRef, memo, forwardRef, useImperativeHandle } from "react";
import { parseMarkdown, type ParseResult } from "../lib/markdownWorker";
import { DiagramBlock } from "./diagrams/DiagramBlock";
import { CodeBlock } from "./CodeBlock";
import { hasDiagramLang } from "./diagrams/registry";
import { ErrorBoundary } from "./ErrorBoundary";
import "katex/dist/katex.min.css";

export type { ParseResult };

export interface PreviewHandle {
  /** Returns the current rendered innerHTML — used by the export handler. */
  getRenderedHtml(): string;
}

interface Props {
  content: string;
  onParsed?: (result: ParseResult) => void;
  className?: string;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function renderHtmlWithDiagrams(html: string): JSX.Element {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const codeBlocks = doc.querySelectorAll("pre > code[class]");
  const replacements: { placeholder: string; element: JSX.Element }[] = [];

  codeBlocks.forEach((codeEl, i) => {
    const cls = codeEl.getAttribute("class") ?? "";
    const langMatch = cls.match(/language-(\S+)/);
    if (!langMatch) return;
    const lang = langMatch[1];
    // Skip language-math — it's already rendered by rehype-katex into surrounding elements
    if (lang === "math") return;
    const source = codeEl.textContent ?? "";
    const placeholder = `<!--BLOCK_${i}-->`;

    replacements.push({
      placeholder,
      element: hasDiagramLang(lang) ? (
        <ErrorBoundary key={i}><DiagramBlock lang={lang} source={source} /></ErrorBoundary>
      ) : (
        <ErrorBoundary key={i}><CodeBlock lang={lang} code={source} /></ErrorBoundary>
      ),
    });
    codeEl.parentElement!.outerHTML = placeholder;
  });

  const finalHtml = doc.body.innerHTML;
  const parts = finalHtml.split(/(<!--BLOCK_\d+-->)/);

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/<!--BLOCK_(\d+)-->/);
        if (match) {
          const idx = parseInt(match[1]);
          return replacements[idx]?.element ?? null;
        }
        return part ? (
          <div
            key={i}
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: part }}
          />
        ) : null;
      })}
    </>
  );
}

export const Preview = memo(forwardRef<PreviewHandle, Props>(function Preview(
  { content, onParsed, className },
  ref
) {
  const debouncedContent = useDebounced(content, 150);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose rendered DOM to parent (used by export)
  useImperativeHandle(ref, () => ({
    getRenderedHtml: () => containerRef.current?.innerHTML ?? "",
  }));

  useEffect(() => {
    let cancelled = false;
    parseMarkdown(debouncedContent).then((r) => {
      if (cancelled) return;
      setResult(r);
      setError("");
      onParsed?.(r);
    }).catch((err: Error) => {
      if (cancelled) return;
      setError(err.message);
    });
    return () => { cancelled = true; };
  }, [debouncedContent, onParsed]);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto h-full px-8 py-6 ${className ?? ""}`}
    >
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
          Parse error: {error}
        </div>
      )}
      {result && renderHtmlWithDiagrams(result.html)}
      {!result && !error && (
        <div className="text-sm text-[var(--color-text-muted)]">Rendering…</div>
      )}
    </div>
  );
}));
