// LRU-like cache for rendered diagram SVGs keyed by hash(source+theme)
const CACHE_SIZE = 64;
const cache = new Map<string, string>();
const order: string[] = [];

function hash(source: string, theme: string): string {
  // Simple djb2-style hash
  let h = 5381;
  const str = source + "|" + theme;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

export function getCachedDiagram(source: string, theme: string): string | undefined {
  return cache.get(hash(source, theme));
}

export function setCachedDiagram(source: string, theme: string, svg: string): void {
  const key = hash(source, theme);
  if (cache.has(key)) return;
  if (order.length >= CACHE_SIZE) {
    const oldest = order.shift()!;
    cache.delete(oldest);
  }
  cache.set(key, svg);
  order.push(key);
}

export function invalidateDiagramCache(): void {
  cache.clear();
  order.length = 0;
}
