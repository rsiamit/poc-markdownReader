import { useState, useCallback } from "react";
import type { FileNode } from "shared/types";
import { useEditorStore } from "../store";
import { api } from "../lib/api";
import { showToast } from "./Toasts";

interface Props {
  nodes: FileNode[];
  onRefresh: () => void;
}

function FileEntry({
  node,
  depth,
  onRefresh,
}: {
  node: FileNode;
  depth: number;
  onRefresh: () => void;
}): JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const { openDoc, openDocs } = useEditorStore();

  const indent = depth * 14;
  const isOpen = openDocs.some((d) => d.path === node.path);

  const handleOpen = useCallback(async () => {
    if (node.type === "dir") {
      setExpanded((e) => !e);
      return;
    }
    const existing = openDocs.find((d) => d.path === node.path);
    if (existing) {
      useEditorStore.getState().setActiveId(existing.id);
      return;
    }
    try {
      const file = await api.readFile(node.path);
      openDoc({ id: crypto.randomUUID(), path: file.path, content: file.content, dirty: false, baseHash: file.hash });
    } catch {
      showToast("Failed to open file", "error");
    }
  }, [node, openDocs, openDoc]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${node.name}"?`)) return;
    try {
      await api.deleteFile(node.path);
      onRefresh();
      showToast("Deleted", "success");
    } catch {
      showToast("Delete failed", "error");
    }
  }, [node, onRefresh]);

  const handleRename = useCallback(async () => {
    const dir = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/") + 1) : "";
    const to = dir + newName;
    try {
      await api.renameFile({ from: node.path, to });
      onRefresh();
      setRenaming(false);
    } catch {
      showToast("Rename failed", "error");
    }
  }, [node.path, newName, onRefresh]);

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-0.5 cursor-pointer rounded text-sm hover:bg-[var(--color-surface)] select-none ${isOpen ? "text-[var(--color-accent)]" : ""}`}
        style={{ paddingLeft: indent + 8 }}
        onClick={handleOpen}
      >
        <span className="text-[var(--color-text-muted)] w-4 shrink-0">
          {node.type === "dir" ? (expanded ? "▾" : "▸") : "·"}
        </span>
        {renaming ? (
          <input
            autoFocus
            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-accent)] rounded px-1 text-xs"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{node.name}</span>
        )}
        <span className="hidden group-hover:flex gap-1 ml-auto">
          <button
            title="Rename"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs px-1"
            onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
          >✎</button>
          <button
            title="Delete"
            className="text-[var(--color-text-muted)] hover:text-red-500 text-xs px-1"
            onClick={handleDelete}
          >✕</button>
        </span>
      </div>
      {node.type === "dir" && expanded && node.children?.map((child) => (
        <FileEntry key={child.path} node={child} depth={depth + 1} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

export function FileTree({ nodes, onRefresh }: Props): JSX.Element {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    const path = newName.endsWith("/") ? newName.slice(0, -1) : newName;
    const type = newName.endsWith("/") ? "dir" : "file";
    const finalPath = type === "file" && !path.endsWith(".md") ? path + ".md" : path;
    try {
      await api.createFile({ path: finalPath, type });
      onRefresh();
      setNewName("");
      setCreating(false);
      showToast("Created", "success");
    } catch {
      showToast("Create failed", "error");
    }
  }, [newName, onRefresh]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Files</span>
        <div className="flex gap-1">
          <button
            title="New file"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-base w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--color-surface)]"
            onClick={() => setCreating(true)}
          >+</button>
          <button
            title="Refresh"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--color-surface)]"
            onClick={onRefresh}
          >↻</button>
        </div>
      </div>

      {creating && (
        <div className="px-3 py-1 border-b border-[var(--color-border)]">
          <input
            autoFocus
            placeholder="name.md or folder/"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-accent)] rounded px-2 py-1 text-xs"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
            onBlur={() => { if (!newName) setCreating(false); }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {nodes.length === 0 ? (
          <p className="px-3 py-4 text-xs text-[var(--color-text-muted)]">No files. Click + to create one.</p>
        ) : (
          nodes.map((node) => (
            <FileEntry key={node.path} node={node} depth={0} onRefresh={onRefresh} />
          ))
        )}
      </div>
    </div>
  );
}
