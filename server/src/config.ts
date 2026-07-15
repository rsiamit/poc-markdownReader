import path from "path";

export const PORT = parseInt(process.env.PORT ?? "3001", 10);
export const NODE_ENV = process.env.NODE_ENV ?? "development";

// Absolute path to the workspace directory
export const WORKSPACE_DIR = path.resolve(
  process.env.WORKSPACE_DIR ?? path.join(process.cwd(), "../workspace")
);

// Maximum allowed file size in bytes (5 MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Only these extensions are allowed for read/write
export const ALLOWED_EXTENSIONS = new Set([".md", ".markdown"]);

// Asset upload limit (10 MB)
export const MAX_ASSET_SIZE = 10 * 1024 * 1024;
