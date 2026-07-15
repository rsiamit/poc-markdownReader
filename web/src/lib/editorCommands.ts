import type { EditorView } from "@codemirror/view";

type WrapChar = { before: string; after: string };

function wrapSelection(view: EditorView, { before, after }: WrapChar): void {
  const { state } = view;
  const changes = state.selection.ranges.map((range) => {
    const selected = state.sliceDoc(range.from, range.to);
    return {
      from: range.from,
      to: range.to,
      insert: `${before}${selected}${after}`,
    };
  });
  view.dispatch({ changes });
  view.focus();
}

function prependLine(view: EditorView, prefix: string): void {
  const { state } = view;
  const changes = state.selection.ranges.map((range) => {
    const line = state.doc.lineAt(range.from);
    const current = line.text;
    // Toggle: if already starts with prefix, remove it
    if (current.startsWith(prefix)) {
      return { from: line.from, to: line.from + prefix.length, insert: "" };
    }
    return { from: line.from, to: line.from, insert: prefix };
  });
  view.dispatch({ changes });
  view.focus();
}

function insertAtCursor(view: EditorView, text: string): void {
  const { state } = view;
  const from = state.selection.main.head;
  view.dispatch({ changes: { from, to: from, insert: text } });
  view.focus();
}

export const editorCommands = {
  bold: (v: EditorView) => wrapSelection(v, { before: "**", after: "**" }),
  italic: (v: EditorView) => wrapSelection(v, { before: "_", after: "_" }),
  strikethrough: (v: EditorView) => wrapSelection(v, { before: "~~", after: "~~" }),
  inlineCode: (v: EditorView) => wrapSelection(v, { before: "`", after: "`" }),
  link: (v: EditorView) => {
    const sel = v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to);
    wrapSelection(v, { before: "[", after: `](${sel ? "url" : "https://example.com"})` });
  },
  heading: (v: EditorView, level: 1 | 2 | 3 | 4 | 5 | 6) =>
    prependLine(v, "#".repeat(level) + " "),
  bulletList: (v: EditorView) => prependLine(v, "- "),
  orderedList: (v: EditorView) => prependLine(v, "1. "),
  taskList: (v: EditorView) => prependLine(v, "- [ ] "),
  blockquote: (v: EditorView) => prependLine(v, "> "),
  callout: (v: EditorView) =>
    insertAtCursor(v, "\n> [!NOTE]\n> Your note here\n"),
  hr: (v: EditorView) => insertAtCursor(v, "\n---\n"),
  table: (v: EditorView) =>
    insertAtCursor(v, "\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell     | Cell     | Cell     |\n"),
  codeBlock: (v: EditorView, lang = "typescript") =>
    insertAtCursor(v, `\n\`\`\`${lang}\n\n\`\`\`\n`),
  mermaidBlock: (v: EditorView) =>
    insertAtCursor(v, "\n```mermaid\nflowchart TD\n    A[Start] --> B[End]\n```\n"),
  mathBlock: (v: EditorView) =>
    insertAtCursor(v, "\n$$\n\n$$\n"),
};
