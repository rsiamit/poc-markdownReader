export interface DiagramRenderer {
  render(source: string, theme: "light" | "dark", id: string): Promise<string>;
}

const registry = new Map<string, DiagramRenderer>();

export function registerRenderer(lang: string, renderer: DiagramRenderer): void {
  registry.set(lang.toLowerCase(), renderer);
}

export function getRenderer(lang: string): DiagramRenderer | undefined {
  return registry.get(lang.toLowerCase());
}

export function hasDiagramLang(lang: string): boolean {
  return registry.has(lang.toLowerCase());
}
