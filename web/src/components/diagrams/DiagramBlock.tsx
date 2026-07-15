import { useState, useEffect, useRef, memo } from "react";
import { useEditorStore } from "../../store";
import { getRenderer } from "./registry";
import { getCachedDiagram, setCachedDiagram } from "../../lib/diagramCache";

interface Props {
  lang: string;
  source: string;
}

let diagramCounter = 0;

export const DiagramBlock = memo(function DiagramBlock({ lang, source }: Props): JSX.Element {
  const { settings } = useEditorStore();
  const theme = settings.theme;
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const idRef = useRef(`d${++diagramCounter}`);

  useEffect(() => {
    const renderer = getRenderer(lang);
    if (!renderer) {
      setError(`No renderer for: ${lang}`);
      setLoading(false);
      return;
    }

    // Cache hit — render immediately, no async
    const cached = getCachedDiagram(source, theme);
    if (cached) {
      setSvg(cached);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    renderer.render(source, theme, idRef.current).then((result) => {
      if (cancelled) return;
      setCachedDiagram(source, theme, result);
      setSvg(result);
      setError("");
      setLoading(false);
    }).catch((err: Error) => {
      if (cancelled) return;
      setError(err.message ?? "Diagram render failed");
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [source, theme, lang]);

  const handleExportSvg = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${idRef.current}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="my-4 p-4 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)]">
        Rendering {lang} diagram…
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-4 p-3 rounded border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          {lang} parse error
        </p>
        <pre className="mt-1 text-xs text-red-500 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div className="group my-4 relative overflow-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <div
        className="diagram-svg flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-[var(--color-border)] rounded hover:bg-[var(--color-text-muted)] hover:text-white transition-opacity"
        onClick={handleExportSvg}
        title="Export as SVG"
      >
        ↓ SVG
      </button>
    </div>
  );
});
