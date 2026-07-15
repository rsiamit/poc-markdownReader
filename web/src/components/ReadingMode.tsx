import { useState, useEffect, useRef, useCallback } from "react";
import { parseMarkdown, type ParseResult } from "../lib/markdownWorker";
import { renderHtmlWithDiagrams } from "./Preview";
import { useEditorStore } from "../store";

interface Props {
  content: string;
  initialResult?: ParseResult | null;
  onExit: () => void;
}

function estimateReadingTime(content: string): number {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
}

export function ReadingMode({ content, initialResult, onExit }: Props) {
  const { settings } = useEditorStore();
  const [result, setResult] = useState<ParseResult | null>(initialResult ?? null);
  const [scrollPct, setScrollPct] = useState(0);
  const [tocOpen, setTocOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    parseMarkdown(content).then(setResult).catch(() => {});
  }, [content]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setScrollPct(max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100)));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onExit(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExit]);

  const isDark = settings.theme === "dark";
  const fm = result?.frontmatter ?? {};
  const fmTitle = fm.title != null ? String(fm.title) : undefined;
  const fmAuthor = fm.author != null ? String(fm.author) : undefined;
  const fmDate = fm.date != null ? String(fm.date) : undefined;
  const headings = result?.headings ?? [];
  const readingTime = estimateReadingTime(content);

  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id);
    const container = scrollRef.current;
    if (!el || !container) return;
    const offset = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 72;
    container.scrollTo({ top: offset, behavior: "smooth" });
  }, []);

  const bg = isDark ? "#18181b" : "#fffdf7";
  const text = isDark ? "#f4f4f5" : "#1c1917";
  const border = isDark ? "#3f3f46" : "#e7e5e4";
  const sidebarBg = isDark ? "#1c1c1f" : "#fafaf8";
  const mutedText = isDark ? "#71717a" : "#a8a29e";
  const progressColor = isDark ? "#818cf8" : "#1e3a8a";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col${isDark ? " dark" : ""}`}
      style={{ background: bg, color: text }}
    >
      {/* Reading progress bar */}
      <div
        className="fixed top-0 left-0 h-[3px] z-50 transition-all duration-200"
        style={{ width: `${scrollPct}%`, background: progressColor }}
      />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 shrink-0 border-b"
        style={{ height: 52, borderColor: border }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTocOpen((o) => !o)}
            className="text-xs px-2.5 py-1 rounded border transition-colors"
            style={{ borderColor: border, color: mutedText }}
            title="Toggle table of contents"
          >
            ☰ Contents
          </button>
          <span className="text-xs" style={{ color: mutedText }}>
            {headings.length > 0 && `${headings.length} sections · `}{readingTime} min read
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: mutedText }}>{scrollPct}%</span>
          <button
            onClick={onExit}
            className="text-xs px-3 py-1.5 rounded border font-medium transition-colors hover:opacity-80"
            style={{ borderColor: border, color: text }}
            title="Exit reading mode (Esc)"
          >
            ✕ Exit Reading
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* TOC sidebar */}
        {tocOpen && headings.length > 0 && (
          <aside
            className="shrink-0 overflow-y-auto border-r py-6 px-4"
            style={{ width: 240, borderColor: border, background: sidebarBg }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: mutedText }}
            >
              On This Page
            </p>
            <nav className="flex flex-col gap-px">
              {headings.map((h, idx) => (
                <button
                  key={`${h.id}-${idx}`}
                  onClick={() => scrollToHeading(h.id)}
                  className="text-left truncate rounded px-2 py-1 text-xs transition-colors hover:opacity-80"
                  style={{
                    paddingLeft: `${(h.depth - 1) * 12 + 8}px`,
                    color: mutedText,
                    fontWeight: h.depth <= 2 ? 600 : 400,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  title={h.text}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          <article
            className="reading-mode mx-auto px-8 py-12"
            style={{ maxWidth: 760 }}
          >
            {/* Frontmatter header */}
            {(fmTitle || fmAuthor || fmDate) && (
              <header
                className="mb-12 pb-8 border-b"
                style={{ borderColor: border }}
              >
                {fmTitle && (
                  <h1 className="reading-fm-title mb-3">
                    {fmTitle}
                  </h1>
                )}
                <div className="flex flex-wrap gap-4 text-sm" style={{ color: mutedText }}>
                  {fmAuthor && <span>by {fmAuthor}</span>}
                  {fmDate && <span>{fmDate}</span>}
                  <span>{readingTime} min read</span>
                </div>
              </header>
            )}

            {result ? (
              renderHtmlWithDiagrams(result.html)
            ) : (
              <div className="text-sm" style={{ color: mutedText }}>
                Preparing document…
              </div>
            )}
          </article>
        </main>
      </div>
    </div>
  );
}
