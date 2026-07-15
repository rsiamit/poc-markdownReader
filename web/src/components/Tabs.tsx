import { useEditorStore, type OpenDoc } from "../store";

export function Tabs(): JSX.Element {
  const { openDocs, activeId, setActiveId, closeDoc } = useEditorStore();

  if (openDocs.length === 0) return <div className="h-[var(--tabs-height)] border-b border-[var(--color-border)]" />;

  return (
    <div
      className="flex items-end overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ height: "var(--tabs-height)" }}
    >
      {openDocs.map((doc: OpenDoc) => {
        const isActive = doc.id === activeId;
        const name = doc.path.split("/").pop() ?? doc.path;
        return (
          <div
            key={doc.id}
            className={`group flex items-center gap-1 px-3 h-full cursor-pointer text-sm border-r border-[var(--color-border)] select-none shrink-0 ${
              isActive
                ? "bg-[var(--color-bg)] border-t-2 border-t-[var(--color-accent)] -mt-px"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
            }`}
            onClick={() => setActiveId(doc.id)}
          >
            <span className={`max-w-[140px] truncate ${doc.dirty ? "italic text-[var(--color-dirty)]" : ""}`}>
              {doc.dirty ? "● " : ""}{name}
            </span>
            <button
              className="opacity-0 group-hover:opacity-100 ml-1 text-[var(--color-text-muted)] hover:text-red-500 leading-none"
              onClick={(e) => { e.stopPropagation(); closeDoc(doc.id); }}
              title="Close"
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
