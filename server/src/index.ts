import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { PORT, NODE_ENV, WORKSPACE_DIR } from "./config.js";
import filesRouter from "./routes/files.js";
import exportRouter from "./routes/export.js";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // needed for inline Mermaid/KaTeX in preview
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(cors({ origin: NODE_ENV === "development" ? "*" : false }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, version: "1.0.0" });
});

// API routes
app.use("/api/files", filesRouter);
app.use("/api/export", exportRouter);

// Serve built frontend in production
// __dirname = /app/src  →  ../web/dist = /app/web/dist (where Dockerfile copies the build)
const staticDir = path.resolve(__dirname, "../web/dist");
if (NODE_ENV === "production") {
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
    console.log(`Serving frontend from: ${staticDir}`);
  } else {
    console.warn(`Frontend build not found at: ${staticDir} — run 'npm run build' in web/`);
  }
}

// Ensure workspace dir exists
fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
fs.mkdirSync(path.join(WORKSPACE_DIR, "assets"), { recursive: true });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Workspace: ${WORKSPACE_DIR}`);
  console.log(`Mode: ${NODE_ENV}`);
});
