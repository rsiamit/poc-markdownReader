import { create } from "zustand";
import type { FileNode } from "shared/types";

export interface OpenDoc {
  id: string;
  path: string;
  content: string;
  dirty: boolean;
  baseHash: string;
}

export interface Settings {
  theme: "light" | "dark";
  viewMode: "split" | "editor" | "preview";
  fontSize: number;
  wordWrap: boolean;
}

interface EditorState {
  tree: FileNode[];
  openDocs: OpenDoc[];
  activeId: string | null;
  settings: Settings;

  setTree: (tree: FileNode[]) => void;
  openDoc: (doc: OpenDoc) => void;
  closeDoc: (id: string) => void;
  setActiveId: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  markClean: (id: string, hash: string) => void;
  setSettings: (patch: Partial<Settings>) => void;

  // Derived helpers
  activeDoc: () => OpenDoc | undefined;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tree: [],
  openDocs: [],
  activeId: null,
  settings: {
    theme: (localStorage.getItem("theme") as "light" | "dark") ?? "light",
    viewMode: "split",
    fontSize: 14,
    wordWrap: true,
  },

  setTree: (tree) => set({ tree }),

  openDoc: (doc) =>
    set((s) => {
      const exists = s.openDocs.find((d) => d.path === doc.path);
      if (exists) return { activeId: exists.id };
      return { openDocs: [...s.openDocs, doc], activeId: doc.id };
    }),

  closeDoc: (id) =>
    set((s) => {
      const remaining = s.openDocs.filter((d) => d.id !== id);
      const newActive = s.activeId === id
        ? (remaining[remaining.length - 1]?.id ?? null)
        : s.activeId;
      return { openDocs: remaining, activeId: newActive };
    }),

  setActiveId: (id) => set({ activeId: id }),

  updateContent: (id, content) =>
    set((s) => ({
      openDocs: s.openDocs.map((d) =>
        d.id === id ? { ...d, content, dirty: true } : d
      ),
    })),

  markClean: (id, hash) =>
    set((s) => ({
      openDocs: s.openDocs.map((d) =>
        d.id === id ? { ...d, dirty: false, baseHash: hash } : d
      ),
    })),

  setSettings: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch };
      if (patch.theme) {
        localStorage.setItem("theme", patch.theme);
        document.documentElement.classList.toggle("dark", patch.theme === "dark");
      }
      return { settings: next };
    }),

  activeDoc: () => {
    const { openDocs, activeId } = get();
    return openDocs.find((d) => d.id === activeId);
  },
}));

// Apply saved theme on load
const savedTheme = localStorage.getItem("theme") ?? "light";
if (savedTheme === "dark") document.documentElement.classList.add("dark");
