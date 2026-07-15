import type {
  FileNode,
  FileContent,
  SaveFileRequest,
  SaveFileResponse,
  CreateFileRequest,
  RenameRequest,
  HealthResponse,
} from "shared/types";

const BASE = "/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error ?? "Request failed") as Error & { status: number; code?: string };
    err.status = res.status;
    err.code = body.code;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  listFiles: () => request<FileNode[]>("/files"),

  readFile: (path: string) =>
    request<FileContent>(`/files/${encodeURIComponent(path)}`),

  saveFile: (path: string, body: SaveFileRequest) =>
    request<SaveFileResponse>(`/files/${encodeURIComponent(path)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  createFile: (body: CreateFileRequest) =>
    request<{ path: string }>("/files", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  renameFile: (body: RenameRequest) =>
    request<RenameRequest>("/files/rename", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteFile: (path: string) =>
    request<void>(`/files/${encodeURIComponent(path)}`, { method: "DELETE" }),

  search: (q: string) =>
    request<{ path: string; line: number; preview: string }[]>(
      `/files/search?q=${encodeURIComponent(q)}`
    ),

  exportPdf: async (html: string, title?: string): Promise<Blob> => {
    const res = await fetch(`${BASE}/export/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, title }),
    });
    if (!res.ok) throw new Error("PDF export failed");
    return res.blob();
  },
};
