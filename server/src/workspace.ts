import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { WORKSPACE_DIR, ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from "./config.js";
import type { FileNode, FileContent } from "../../shared/types.js";

/**
 * Resolve a workspace-relative path to an absolute path, rejecting any
 * attempt to escape the workspace root (path traversal, symlinks, etc.).
 */
export function safeResolve(relativePath: string): string {
  // Reject any absolute paths (both POSIX /foo and Windows C:\foo or \\server)
  if (path.isAbsolute(relativePath)) {
    throw new Error("PATH_TRAVERSAL");
  }
  // Strip leading slashes / backslashes
  const cleaned = relativePath.replace(/^[/\\]+/, "");
  const absolute = path.resolve(WORKSPACE_DIR, cleaned);

  if (!absolute.startsWith(WORKSPACE_DIR + path.sep) && absolute !== WORKSPACE_DIR) {
    throw new Error("PATH_TRAVERSAL");
  }
  return absolute;
}

/** Reject dotfiles and paths containing hidden segments */
export function assertNotHidden(relPath: string): void {
  const parts = relPath.split(/[/\\]/);
  for (const part of parts) {
    if (part.startsWith(".")) throw new Error("HIDDEN_PATH");
  }
}

/** Assert extension is in the allowed set (for write ops; not for dirs) */
export function assertAllowedExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("INVALID_EXTENSION");
  }
}

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export async function readTree(dir: string, base = WORKSPACE_DIR): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      const children = await readTree(abs, base);
      nodes.push({ path: rel, name: entry.name, type: "dir", children });
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;
      const stat = await fs.stat(abs);
      nodes.push({ path: rel, name: entry.name, type: "file", mtime: stat.mtimeMs, size: stat.size });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFile(relPath: string): Promise<FileContent> {
  assertNotHidden(relPath);
  const abs = safeResolve(relPath);
  const stat = await fs.stat(abs);

  if (stat.size > MAX_FILE_SIZE) throw new Error("FILE_TOO_LARGE");

  const content = await fs.readFile(abs, "utf-8");
  return { path: relPath, content, mtime: stat.mtimeMs, hash: hashContent(content) };
}

export async function writeFile(
  relPath: string,
  content: string,
  baseHash?: string
): Promise<{ mtime: number; hash: string }> {
  assertNotHidden(relPath);
  assertAllowedExtension(relPath);
  const abs = safeResolve(relPath);

  // Conflict detection: if file exists and baseHash given, reject mismatch
  if (baseHash) {
    try {
      const existing = await fs.readFile(abs, "utf-8");
      const diskHash = hashContent(existing);
      if (diskHash !== baseHash) throw new Error("CONFLICT");
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "ENOENT") throw err;
    }
  }

  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
  const stat = await fs.stat(abs);
  return { mtime: stat.mtimeMs, hash: hashContent(content) };
}

export async function createPath(relPath: string, type: "file" | "dir"): Promise<void> {
  assertNotHidden(relPath);
  const abs = safeResolve(relPath);
  if (type === "dir") {
    await fs.mkdir(abs, { recursive: true });
  } else {
    assertAllowedExtension(relPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    // Only create if it doesn't already exist
    try {
      await fs.access(abs);
    } catch {
      await fs.writeFile(abs, "", "utf-8");
    }
  }
}

export async function renamePath(fromRel: string, toRel: string): Promise<void> {
  assertNotHidden(fromRel);
  assertNotHidden(toRel);
  const from = safeResolve(fromRel);
  const to = safeResolve(toRel);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}

export async function deletePath(relPath: string): Promise<void> {
  assertNotHidden(relPath);
  const abs = safeResolve(relPath);
  await fs.rm(abs, { recursive: true, force: true });
}
