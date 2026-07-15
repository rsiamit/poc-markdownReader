import { useCallback, useEffect, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { search } from "@codemirror/search";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { useEditorStore } from "../store";
import { editorCommands } from "../lib/editorCommands";

interface Props {
  content: string;
  onChange: (value: string) => void;
  onViewRef: (view: EditorView | null) => void;
  onCursorChange?: (line: number, col: number) => void;
}

export function Editor({ content, onChange, onViewRef, onCursorChange }: Props): JSX.Element {
  const { settings } = useEditorStore();
  const isDark = settings.theme === "dark";
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    onViewRef(cmRef.current?.view ?? null);
  });

  const extensions = [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    search({ top: true }),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.selectionSet && onCursorChange) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        onCursorChange(line.number, pos - line.from + 1);
      }
    }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      { key: "Ctrl-b", run: (v) => { editorCommands.bold(v); return true; } },
      { key: "Ctrl-i", run: (v) => { editorCommands.italic(v); return true; } },
    ]),
  ];

  const handleChange = useCallback((value: string) => {
    onChange(value);
  }, [onChange]);

  return (
    <div className="flex flex-col h-full">
      <CodeMirror
        ref={cmRef}
        value={content}
        height="100%"
        onChange={handleChange}
        extensions={extensions}
        theme={isDark ? oneDark : "light"}
        style={{
          fontSize: settings.fontSize,
          fontFamily: "JetBrains Mono, Fira Code, ui-monospace, monospace",
          height: "100%",
        }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          autocompletion: true,
          indentOnInput: true,
          syntaxHighlighting: true,
        }}
      />
    </div>
  );
}
