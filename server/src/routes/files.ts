import { Router, Request, Response } from "express";
import {
  readTree,
  readFile,
  writeFile,
  createPath,
  renamePath,
  deletePath,
} from "../workspace.js";
import { WORKSPACE_DIR } from "../config.js";
import fs from "fs/promises";
import path from "path";

const router = Router();

function handleError(err: unknown, res: Response): void {
  const e = err as Error;
  const msg = e.message;
  if (msg === "PATH_TRAVERSAL" || msg === "HIDDEN_PATH") {
    res.status(400).json({ error: "Invalid path" });
  } else if (msg === "INVALID_EXTENSION") {
    res.status(400).json({ error: "Only .md files are allowed" });
  } else if (msg === "FILE_TOO_LARGE") {
    res.status(413).json({ error: "File exceeds size limit" });
  } else if (msg === "CONFLICT") {
    res.status(409).json({ error: "Conflict: file was modified externally", code: "CONFLICT" });
  } else {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      res.status(404).json({ error: "Not found" });
    } else {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

// GET /api/files — full workspace tree
router.get("/", async (_req: Request, res: Response) => {
  try {
    const tree = await readTree(WORKSPACE_DIR);
    res.json(tree);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/files/search?q=
router.get("/search", async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").toLowerCase().trim();
  if (!q) {
    res.json([]);
    return;
  }
  try {
    const results: { path: string; line: number; preview: string }[] = [];
    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith(".")) continue;
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) {
          await walk(abs);
        } else if (e.isFile() && e.name.endsWith(".md")) {
          const content = await fs.readFile(abs, "utf-8");
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(q)) {
              results.push({
                path: path.relative(WORKSPACE_DIR, abs).replace(/\\/g, "/"),
                line: idx + 1,
                preview: line.trim().slice(0, 120),
              });
            }
          });
        }
      }
    };
    await walk(WORKSPACE_DIR);
    res.json(results.slice(0, 200));
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/files/:path — read a file
router.get("/:filePath(*)", async (req: Request, res: Response) => {
  try {
    const file = await readFile(req.params.filePath);
    res.json(file);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/files — create file or directory
router.post("/", async (req: Request, res: Response) => {
  try {
    const { path: relPath, type = "file" } = req.body as { path: string; type?: "file" | "dir" };
    await createPath(relPath, type);
    res.status(201).json({ path: relPath });
  } catch (err) {
    handleError(err, res);
  }
});

// PUT /api/files/:path — save file
router.put("/:filePath(*)", async (req: Request, res: Response) => {
  try {
    const { content, baseHash } = req.body as { content: string; baseHash?: string };
    const result = await writeFile(req.params.filePath, content, baseHash);
    res.json({ path: req.params.filePath, ...result });
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/files/rename
router.post("/rename", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.body as { from: string; to: string };
    await renamePath(from, to);
    res.json({ from, to });
  } catch (err) {
    handleError(err, res);
  }
});

// DELETE /api/files/:path
router.delete("/:filePath(*)", async (req: Request, res: Response) => {
  try {
    await deletePath(req.params.filePath);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
