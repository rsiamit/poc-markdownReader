import { useEffect, useRef, useState, useCallback } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import type { EditorView } from "@codemirror/view";
import { useEditorStore } from "./store";
import { api } from "./lib/api";
import { Editor } from "./components/Editor";
import { Toolbar } from "./components/Toolbar";
import { Preview, type ParseResult, type PreviewHandle } from "./components/Preview";
import { FileTree } from "./components/FileTree";
import { Tabs } from "./components/Tabs";
import { StatusBar } from "./components/StatusBar";
import { ThemeToggle } from "./components/ThemeToggle";
import { Toasts, showToast } from "./components/Toasts";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { buildStandaloneHtml, sanitizeExportHtml, downloadFile, downloadBlob } from "./lib/exportHtml";
import { mermaidRenderer } from "./components/diagrams/mermaid";
import { registerRenderer } from "./components/diagrams/registry";
import { chartRenderer } from "./components/diagrams/chart";
import { ReadingMode } from "./components/ReadingMode";

// Register diagram engines
registerRenderer("mermaid", mermaidRenderer);
registerRenderer("chart", chartRenderer);

const AUTOSAVE_DELAY = 2000;

export default function App(): JSX.Element {
  const {
    tree,
    setTree,
    activeDoc,
    updateContent,
    markClean,
    settings,
    setSettings,
  } = useEditorStore();

  const doc = activeDoc();
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef<PreviewHandle>(null);

  // Load workspace tree
  const loadTree = useCallback(async () => {
    try {
      const nodes = await api.listFiles();
      setTree(nodes);
    } catch {
      showToast("Failed to load workspace", "error");
    }
  }, [setTree]);

  useEffect(() => { loadTree(); }, [loadTree]);

  // Update word/char count on content change
  useEffect(() => {
    if (!doc) { setWordCount(0); setCharCount(0); return; }
    const text = doc.content;
    setCharCount(text.length);
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  }, [doc?.content]);

  // Keyboard shortcut: Ctrl/Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveCurrentDoc();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const saveCurrentDoc = useCallback(async (docOverride?: typeof doc) => {
    const target = docOverride ?? activeDoc();
    if (!target || !target.dirty) return;
    try {
      const res = await api.saveFile(target.path, {
        content: target.content,
        baseHash: target.baseHash,
      });
      markClean(target.id, res.hash);
    } catch (err: unknown) {
      const e = err as { code?: string; status?: number };
      if (e.status === 409) {
        showToast("Conflict: file changed externally. Content preserved.", "warning");
      } else {
        showToast("Save failed", "error");
      }
    }
  }, [activeDoc, markClean]);

  // Autosave
  const handleContentChange = useCallback((value: string) => {
    if (!doc) return;
    updateContent(doc.id, value);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveCurrentDoc(), AUTOSAVE_DELAY);
  }, [doc, updateContent, saveCurrentDoc]);

  // Export HTML — captures the live rendered DOM so Shiki, Mermaid SVGs, KaTeX are all included
  const handleExportHtml = useCallback(async () => {
    if (!doc) return;
    // Prefer the live DOM (Shiki + Mermaid + KaTeX already applied); fall back to raw unified HTML
    const raw = previewRef.current?.getRenderedHtml() ?? parseResult?.html ?? "";
    const title = doc.path.split("/").pop() ?? "export";
    const html = buildStandaloneHtml(sanitizeExportHtml(raw), title, settings.theme);
    const name = title.replace(/\.md$/, ".html");
    downloadFile(html, name, "text/html");
    showToast("HTML exported", "success");
  }, [doc, parseResult, settings.theme]);

  // Export PDF — same: use rendered DOM so diagrams/math/code appear correctly
  const handleExportPdf = useCallback(async () => {
    if (!doc) return;
    setExporting(true);
    try {
      const raw = previewRef.current?.getRenderedHtml() ?? parseResult?.html ?? "";
      const title = doc.path.split("/").pop() ?? "export";
      const html = buildStandaloneHtml(sanitizeExportHtml(raw), title, settings.theme);
      const blob = await api.exportPdf(html, title);
      const name = title.replace(/\.md$/, ".pdf");
      downloadBlob(blob, name);
      showToast("PDF exported", "success");
    } catch {
      showToast("PDF export failed. See browser print as fallback.", "error");
    } finally {
      setExporting(false);
    }
  }, [doc, parseResult, settings.theme]);

  const isDark = settings.theme === "dark";

  return (
    <>
      {settings.viewMode === "reading" && doc && (
        <ReadingMode
          content={doc.content}
          initialResult={parseResult}
          onExit={() => setSettings({ viewMode: "split" })}
        />
      )}
      <div className={`flex flex-col h-screen overflow-hidden ${isDark ? "dark" : ""}`}
        style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
      >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0" style={{ height: 48 }}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Markdown Editor</span>
          {doc && (
            <span className="text-xs text-[var(--color-text-muted)]">
              — {doc.path}
              {doc.dirty && <span className="text-[var(--color-dirty)] ml-1">●</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View mode */}
          <div className="flex border border-[var(--color-border)] rounded overflow-hidden text-xs">
            {(["split", "editor", "preview", "reading"] as const).map((m) => (
              <button
                key={m}
                className={`px-2 py-1 ${settings.viewMode === m ? "bg-[var(--color-accent)] text-white" : "hover:bg-[var(--color-surface)]"}`}
                onClick={() => setSettings({ viewMode: m })}
              >
                {m === "split" ? "⇌" : m === "editor" ? "✎" : m === "reading" ? "📖" : "👁"} {m}
              </button>
            ))}
          </div>

          {/* Export */}
          {doc && (
            <div className="flex gap-1">
              <button
                className="px-3 py-1 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-surface)] disabled:opacity-50"
                onClick={handleExportHtml}
                disabled={!parseResult}
              >
                ↓ HTML
              </button>
              <button
                className="px-3 py-1 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-surface)] disabled:opacity-50"
                onClick={handleExportPdf}
                disabled={!parseResult || exporting}
              >
                {exporting ? "…" : "↓ PDF"}
              </button>
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: file tree */}
        <div
          className="shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex flex-col"
          style={{ width: "var(--sidebar-width)" }}
        >
          <ErrorBoundary>
            <FileTree nodes={tree} onRefresh={loadTree} />
          </ErrorBoundary>
        </div>

        {/* Editor + preview area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Tabs />

          {doc ? (
            <>
              <Toolbar editorView={editorView} />
              <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
                {settings.viewMode !== "preview" && (
                  <Panel defaultSize={50} minSize={20}>
                    <ErrorBoundary>
                      <Editor
                        content={doc.content}
                        onChange={handleContentChange}
                        onViewRef={setEditorView}
                        onCursorChange={(l, c) => { setCursorLine(l); setCursorCol(c); }}
                      />
                    </ErrorBoundary>
                  </Panel>
                )}
                {settings.viewMode === "split" && (
                  <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent)] cursor-col-resize transition-colors" />
                )}
                {settings.viewMode !== "editor" && (
                  <Panel defaultSize={50} minSize={20}>
                    <ErrorBoundary>
                      <Preview
                        ref={previewRef}
                        content={doc.content}
                        onParsed={setParseResult}
                      />
                    </ErrorBoundary>
                  </Panel>
                )}
              </PanelGroup>
              <StatusBar
                wordCount={wordCount}
                charCount={charCount}
                line={cursorLine}
                col={cursorCol}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
              <div className="text-center">
                <p className="text-4xl mb-4">📝</p>
                <p>Open a file from the sidebar to start editing</p>
                <p className="text-xs mt-2">or click <strong>+</strong> to create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toasts />
    </div>
    </>
  );
}
