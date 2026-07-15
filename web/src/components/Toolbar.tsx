import type { EditorView } from "@codemirror/view";
import { editorCommands } from "../lib/editorCommands";

interface ToolbarButton {
  label: string;
  title: string;
  action: (v: EditorView) => void;
}

interface Props {
  editorView: EditorView | null;
}

const buttons: (ToolbarButton | "sep")[] = [
  { label: "B", title: "Bold (Ctrl+B)", action: (v) => editorCommands.bold(v) },
  { label: "I", title: "Italic (Ctrl+I)", action: (v) => editorCommands.italic(v) },
  { label: "S̶", title: "Strikethrough", action: (v) => editorCommands.strikethrough(v) },
  { label: "`", title: "Inline code", action: (v) => editorCommands.inlineCode(v) },
  "sep",
  { label: "H1", title: "Heading 1", action: (v) => editorCommands.heading(v, 1) },
  { label: "H2", title: "Heading 2", action: (v) => editorCommands.heading(v, 2) },
  { label: "H3", title: "Heading 3", action: (v) => editorCommands.heading(v, 3) },
  "sep",
  { label: "•", title: "Bullet list", action: (v) => editorCommands.bulletList(v) },
  { label: "1.", title: "Numbered list", action: (v) => editorCommands.orderedList(v) },
  { label: "☑", title: "Task list", action: (v) => editorCommands.taskList(v) },
  { label: "❝", title: "Blockquote", action: (v) => editorCommands.blockquote(v) },
  { label: "⚠", title: "Callout", action: (v) => editorCommands.callout(v) },
  "sep",
  { label: "🔗", title: "Link", action: (v) => editorCommands.link(v) },
  { label: "▦", title: "Table", action: (v) => editorCommands.table(v) },
  { label: "—", title: "Horizontal rule", action: (v) => editorCommands.hr(v) },
  "sep",
  { label: "</>", title: "Code block", action: (v) => editorCommands.codeBlock(v) },
  { label: "∑", title: "Math block", action: (v) => editorCommands.mathBlock(v) },
  { label: "⬡", title: "Mermaid diagram", action: (v) => editorCommands.mermaidBlock(v) },
];

export function Toolbar({ editorView }: Props): JSX.Element {
  return (
    <div
      className="flex items-center gap-0.5 px-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto"
      style={{ height: "var(--toolbar-height)" }}
    >
      {buttons.map((btn, i) => {
        if (btn === "sep") {
          return <div key={i} className="w-px h-5 bg-[var(--color-border)] mx-1 shrink-0" />;
        }
        return (
          <button
            key={btn.title}
            title={btn.title}
            className="px-2 py-1 text-sm rounded hover:bg-[var(--color-border)] text-[var(--color-text)] font-mono shrink-0 disabled:opacity-40"
            disabled={!editorView}
            onClick={() => editorView && btn.action(editorView)}
          >
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}
