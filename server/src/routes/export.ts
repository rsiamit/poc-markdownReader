import { Router, Request, Response } from "express";
import type { ExportPdfRequest } from "../../../shared/types.js";

const router = Router();

// POST /api/export/pdf
router.post("/pdf", async (req: Request, res: Response) => {
  const { html, title, options } = req.body as ExportPdfRequest;

  if (!html || typeof html !== "string") {
    res.status(400).json({ error: "html is required" });
    return;
  }

  try {
    // Lazy-load puppeteer-core to avoid import cost on every request
    const { default: puppeteer } = await import("puppeteer-core");

    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ??
      (process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/chromium-browser");

    const browser = await puppeteer.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      headless: true,
    });

    const page = await browser.newPage();

    const printCss = `
      @page { margin: ${options?.marginCss ?? "1.5cm 2cm"}; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      pre, code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
      .mermaid svg { max-width: 100%; }
      @media print {
        .no-print { display: none !important; }
      }
    `;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title ?? "Export"}</title>
  <style>${printCss}</style>
</head>
<body class="markdown-body">
${html}
</body>
</html>`;

    await page.setContent(fullHtml, { waitUntil: "networkidle0", timeout: 30000 });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      landscape: options?.landscape ?? false,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${title ?? "export"}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error("PDF export error:", err);
    res.status(500).json({ error: "PDF generation failed. Ensure Chrome/Chromium is installed." });
  }
});

export default router;
