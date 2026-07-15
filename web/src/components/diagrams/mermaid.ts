import type { DiagramRenderer } from "./registry";

let initialized = false;

async function ensureInit(theme: "light" | "dark"): Promise<void> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === "dark" ? "dark" : "default",
    securityLevel: "strict",
    fontFamily: "JetBrains Mono, Fira Code, ui-monospace, monospace",
    flowchart: { useMaxWidth: true, htmlLabels: false },
  });
  initialized = true;
}

let lastTheme: "light" | "dark" | null = null;

export const mermaidRenderer: DiagramRenderer = {
  async render(source: string, theme: "light" | "dark", id: string): Promise<string> {
    if (!initialized || lastTheme !== theme) {
      await ensureInit(theme);
      lastTheme = theme;
    }
    const mermaid = (await import("mermaid")).default;
    const { svg } = await mermaid.render(`mermaid-${id}`, source);
    return svg;
  },
};
