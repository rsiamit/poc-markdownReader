// Shared API DTOs imported by both web/ and server/.

export interface FileNode {
  path: string;
  name: string;
  type: "file" | "dir";
  mtime?: number;
  size?: number;
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  mtime: number;
  hash: string;
}

export interface SaveFileRequest {
  content: string;
  baseHash?: string;
}

export interface SaveFileResponse {
  path: string;
  mtime: number;
  hash: string;
}

export interface CreateFileRequest {
  path: string;
  type?: "file" | "dir";
}

export interface RenameRequest {
  from: string;
  to: string;
}

export interface HealthResponse {
  ok: boolean;
  version: string;
}

export interface ExportPdfRequest {
  html: string;
  title?: string;
  options?: {
    marginCss?: string;
    landscape?: boolean;
  };
}

export interface ApiError {
  error: string;
  code?: string;
}
