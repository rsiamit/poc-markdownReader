import { useMemo } from "react";
import { useEditorStore } from "../store";

interface Props {
  wordCount: number;
  charCount: number;
  line?: number;
  col?: number;
}

export function StatusBar({ wordCount, charCount, line, col }: Props): JSX.Element {
  const { activeDoc, settings, setSettings } = useEditorStore();
  const doc = activeDoc();

  const readingTime = useMemo(() => {
    const mins = Math.max(1, Math.round(wordCount / 200));
    return `${mins} min read`;
  }, [wordCount]);

  return (
    <div
      className="flex items-center justify-between px-3 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0"
      style={{ height: "var(--statusbar-height)" }}
    >
      <div className="flex items-center gap-3">
        {doc && (
          <>
            <span className={doc.dirty ? "text-[var(--color-dirty)]" : ""}>{doc.dirty ? "● Unsaved" : "Saved"}</span>
            <span>|</span>
          </>
        )}
        {line != null && <span>Ln {line}, Col {col}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span>{wordCount} words</span>
        <span>{charCount} chars</span>
        <span>{readingTime}</span>
        <span>|</span>
        <button
          className="hover:text-[var(--color-text)]"
          onClick={() => setSettings({ viewMode: settings.viewMode === "split" ? "editor" : settings.viewMode === "editor" ? "preview" : "split" })}
          title="Toggle view mode"
        >
          {settings.viewMode === "split" ? "⇌ Split" : settings.viewMode === "editor" ? "✎ Editor" : "👁 Preview"}
        </button>
      </div>
    </div>
  );
}
