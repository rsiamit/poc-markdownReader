import type { DiagramRenderer } from "./registry";

interface Dataset {
  label?: string;
  data: number[];
  color?: string;
}

interface ChartConfig {
  type: "bar" | "line" | "pie" | "donut";
  title?: string;
  labels: string[];
  datasets: Dataset[];
}

const PALETTE = [
  "#6366f1", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#0ea5e9",
];

function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const rough = Math.ceil(v / exp) * exp;
  return rough > v * 1.15 ? rough * 0.5 + rough * 0.5 : rough;
}

function parseConfig(source: string): ChartConfig {
  const cfg = JSON.parse(source.trim()) as ChartConfig;
  if (!cfg.type || !cfg.labels || !cfg.datasets) {
    throw new Error('Chart config requires "type", "labels", and "datasets" fields.');
  }
  return cfg;
}

/* ── Bar chart ── */
function renderBar(cfg: ChartConfig, isDark: boolean): string {
  const W = 640, H = 400;
  const ml = 62, mr = 20, mt = 52, mb = 70;
  const cw = W - ml - mr, ch = H - mt - mb;

  const bg     = isDark ? "#1e1e2e" : "#ffffff";
  const fg     = isDark ? "#cdd6f4" : "#374151";
  const grid   = isDark ? "#2d2d44" : "#f3f4f6";
  const axLine = isDark ? "#45475a" : "#d1d5db";

  const allData = cfg.datasets.flatMap((d) => d.data);
  const maxV = niceMax(Math.max(...allData, 1));
  const nTicks = 5;

  const toY = (v: number) => mt + ch - (Math.max(0, v) / maxV) * ch;

  const nGroups = cfg.labels.length;
  const nSets   = cfg.datasets.length;
  const gw      = cw / nGroups;
  const bw      = Math.min((gw - 8) / nSets, 52);
  const gpad    = (gw - bw * nSets) / 2;

  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" `
        + `style="border-radius:8px;width:100%;max-width:${W}px;background:${bg}">`;

  if (cfg.title) {
    s += `<text x="${W / 2}" y="32" text-anchor="middle" fill="${fg}" `
       + `font-family="system-ui,sans-serif" font-size="14" font-weight="600">${esc(cfg.title)}</text>`;
  }

  // Grid + Y labels
  for (let i = 0; i <= nTicks; i++) {
    const v = (maxV / nTicks) * i;
    const y = toY(v);
    s += `<line x1="${ml}" y1="${y}" x2="${ml + cw}" y2="${y}" stroke="${grid}" stroke-width="1"/>`;
    const label = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
    s += `<text x="${ml - 6}" y="${y + 4}" text-anchor="end" fill="${fg}" `
       + `font-family="system-ui,sans-serif" font-size="11" opacity="0.7">${label}</text>`;
  }

  // Axis lines
  s += `<line x1="${ml}" y1="${mt}" x2="${ml}" y2="${mt + ch}" stroke="${axLine}" stroke-width="1.5"/>`;
  s += `<line x1="${ml}" y1="${mt + ch}" x2="${ml + cw}" y2="${mt + ch}" stroke="${axLine}" stroke-width="1.5"/>`;

  // Bars + X labels
  cfg.labels.forEach((lbl, li) => {
    const gx = ml + li * gw + gpad;
    cfg.datasets.forEach((ds, di) => {
      const c  = ds.color ?? PALETTE[di % PALETTE.length];
      const v  = Math.max(0, ds.data[li] ?? 0);
      const bx = gx + di * bw;
      const by = toY(v);
      const bh = Math.max(2, (v / maxV) * ch);
      s += `<rect x="${bx}" y="${by}" width="${bw - 2}" height="${bh}" fill="${c}" rx="3" opacity="0.9"/>`;
    });
    const lx = ml + li * gw + gw / 2;
    s += `<text x="${lx}" y="${H - mb + 20}" text-anchor="middle" fill="${fg}" `
       + `font-family="system-ui,sans-serif" font-size="11" opacity="0.8">${esc(lbl)}</text>`;
  });

  // Legend
  if (nSets > 1 || cfg.datasets[0]?.label) {
    let lx = ml;
    cfg.datasets.forEach((ds, di) => {
      const c   = ds.color ?? PALETTE[di % PALETTE.length];
      const lbl = ds.label ?? `Series ${di + 1}`;
      s += `<rect x="${lx}" y="${H - 14}" width="12" height="12" fill="${c}" rx="2"/>`;
      s += `<text x="${lx + 16}" y="${H - 4}" fill="${fg}" font-family="system-ui,sans-serif" font-size="11" opacity="0.8">${esc(lbl)}</text>`;
      lx += lbl.length * 6.5 + 30;
    });
  }

  s += `</svg>`;
  return s;
}

/* ── Line chart ── */
function renderLine(cfg: ChartConfig, isDark: boolean): string {
  const W = 640, H = 400;
  const ml = 62, mr = 20, mt = 52, mb = 70;
  const cw = W - ml - mr, ch = H - mt - mb;

  const bg     = isDark ? "#1e1e2e" : "#ffffff";
  const fg     = isDark ? "#cdd6f4" : "#374151";
  const grid   = isDark ? "#2d2d44" : "#f3f4f6";
  const axLine = isDark ? "#45475a" : "#d1d5db";

  const allData = cfg.datasets.flatMap((d) => d.data);
  const maxV = niceMax(Math.max(...allData, 1));
  const minV = Math.min(0, ...allData);
  const range = maxV - minV || 1;
  const nTicks = 5;

  const nPts = cfg.labels.length;
  const toX  = (i: number) => ml + (i / Math.max(nPts - 1, 1)) * cw;
  const toY  = (v: number) => mt + ch - ((v - minV) / range) * ch;

  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" `
        + `style="border-radius:8px;width:100%;max-width:${W}px;background:${bg}">`;

  if (cfg.title) {
    s += `<text x="${W / 2}" y="32" text-anchor="middle" fill="${fg}" `
       + `font-family="system-ui,sans-serif" font-size="14" font-weight="600">${esc(cfg.title)}</text>`;
  }

  // Grid
  for (let i = 0; i <= nTicks; i++) {
    const v = minV + (range / nTicks) * i;
    const y = toY(v);
    s += `<line x1="${ml}" y1="${y}" x2="${ml + cw}" y2="${y}" stroke="${grid}" stroke-width="1"/>`;
    const raw   = Math.abs(v) < 0.001 ? 0 : v;
    const label = raw >= 1000 ? `${(raw / 1000).toFixed(1)}k` : String(raw % 1 === 0 ? Math.round(raw) : raw.toFixed(1));
    s += `<text x="${ml - 6}" y="${y + 4}" text-anchor="end" fill="${fg}" `
       + `font-family="system-ui,sans-serif" font-size="11" opacity="0.7">${label}</text>`;
  }
  s += `<line x1="${ml}" y1="${mt}" x2="${ml}" y2="${mt + ch}" stroke="${axLine}" stroke-width="1.5"/>`;
  s += `<line x1="${ml}" y1="${mt + ch}" x2="${ml + cw}" y2="${mt + ch}" stroke="${axLine}" stroke-width="1.5"/>`;

  // X labels
  cfg.labels.forEach((lbl, i) => {
    s += `<text x="${toX(i)}" y="${H - mb + 20}" text-anchor="middle" fill="${fg}" `
       + `font-family="system-ui,sans-serif" font-size="11" opacity="0.8">${esc(lbl)}</text>`;
  });

  // Lines + area + dots
  cfg.datasets.forEach((ds, di) => {
    const c    = ds.color ?? PALETTE[di % PALETTE.length];
    const pts  = ds.data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    const base = toY(minV);
    s += `<polygon points="${toX(0)},${base} ${pts} ${toX(ds.data.length - 1)},${base}" fill="${c}" opacity="0.1"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2.5" `
       + `stroke-linejoin="round" stroke-linecap="round"/>`;
    ds.data.forEach((v, i) => {
      s += `<circle cx="${toX(i)}" cy="${toY(v)}" r="4" fill="${c}" stroke="${bg}" stroke-width="2"/>`;
    });
  });

  // Legend
  if (cfg.datasets.length > 1 || cfg.datasets[0]?.label) {
    let lx = ml;
    cfg.datasets.forEach((ds, di) => {
      const c   = ds.color ?? PALETTE[di % PALETTE.length];
      const lbl = ds.label ?? `Series ${di + 1}`;
      s += `<line x1="${lx}" y1="${H - 8}" x2="${lx + 16}" y2="${H - 8}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`;
      s += `<circle cx="${lx + 8}" cy="${H - 8}" r="3.5" fill="${c}" stroke="${bg}" stroke-width="2"/>`;
      s += `<text x="${lx + 24}" y="${H - 4}" fill="${fg}" font-family="system-ui,sans-serif" font-size="11" opacity="0.8">${esc(lbl)}</text>`;
      lx += lbl.length * 6.5 + 40;
    });
  }

  s += `</svg>`;
  return s;
}

/* ── Pie / Donut chart ── */
function renderPie(cfg: ChartConfig, isDark: boolean, donut: boolean): string {
  const W = 520, H = 360;
  const bg = isDark ? "#1e1e2e" : "#ffffff";
  const fg = isDark ? "#cdd6f4" : "#374151";

  const data   = cfg.datasets[0]?.data ?? [];
  const sliceColors = data.map((_, i) => PALETTE[i % PALETTE.length]);
  const total  = data.reduce((a, b) => a + b, 0) || 1;
  const cx = 175, cy = H / 2 + 15, r = 115, ir = donut ? 62 : 0;

  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" `
        + `style="border-radius:8px;width:100%;max-width:${W}px;background:${bg}">`;

  if (cfg.title) {
    s += `<text x="${W / 2}" y="26" text-anchor="middle" fill="${fg}" `
       + `font-family="system-ui,sans-serif" font-size="14" font-weight="600">${esc(cfg.title)}</text>`;
  }

  let angle = -Math.PI / 2;
  data.forEach((v, i) => {
    const slice = (v / total) * 2 * Math.PI;
    const mid   = angle + slice / 2;
    const c     = sliceColors[i];
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + slice), y2 = cy + r * Math.sin(angle + slice);
    const large = slice > Math.PI ? 1 : 0;

    if (donut) {
      const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle);
      const ix2 = cx + ir * Math.cos(angle + slice), iy2 = cy + ir * Math.sin(angle + slice);
      s += `<path d="M${ix1},${iy1} A${ir},${ir} 0 ${large},1 ${ix2},${iy2} `
         + `L${x2},${y2} A${r},${r} 0 ${large},0 ${x1},${y1} Z" `
         + `fill="${c}" stroke="${bg}" stroke-width="2" opacity="0.92"/>`;
    } else {
      s += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" `
         + `fill="${c}" stroke="${bg}" stroke-width="2" opacity="0.92"/>`;
    }

    // Percentage label inside slice
    if (slice > 0.35) {
      const dist = donut ? (r + ir) / 2 : r * 0.62;
      const lx = cx + dist * Math.cos(mid);
      const ly = cy + dist * Math.sin(mid);
      s += `<text x="${lx}" y="${ly + 4}" text-anchor="middle" fill="#fff" `
         + `font-family="system-ui,sans-serif" font-size="12" font-weight="700">`
         + `${Math.round((v / total) * 100)}%</text>`;
    }
    angle += slice;
  });

  // Center label for donut
  if (donut && cfg.title) {
    s += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="${fg}" font-family="system-ui,sans-serif" font-size="11" font-weight="600" opacity="0.7">${esc(cfg.title)}</text>`;
  }

  // Legend (right side)
  const legendX = cx + r + 22;
  const legendStart = cy - (data.length * 22) / 2 + 8;
  data.forEach((v, i) => {
    const lbl = cfg.labels[i] ?? `Item ${i + 1}`;
    const c   = sliceColors[i];
    const pct = Math.round((v / total) * 100);
    const ly  = legendStart + i * 22;
    s += `<rect x="${legendX}" y="${ly - 8}" width="12" height="12" fill="${c}" rx="2"/>`;
    s += `<text x="${legendX + 18}" y="${ly + 2}" fill="${fg}" font-family="system-ui,sans-serif" font-size="12">`
       + `${esc(lbl)} <tspan opacity="0.6">${pct}%</tspan></text>`;
  });

  s += `</svg>`;
  return s;
}

/* ── Public renderer ── */
export const chartRenderer: DiagramRenderer = {
  async render(source: string, theme: "light" | "dark", _id: string): Promise<string> {
    const cfg = parseConfig(source);
    const isDark = theme === "dark";
    switch (cfg.type) {
      case "bar":   return renderBar(cfg, isDark);
      case "line":  return renderLine(cfg, isDark);
      case "pie":   return renderPie(cfg, isDark, false);
      case "donut": return renderPie(cfg, isDark, true);
      default:
        throw new Error(`Unknown chart type: "${(cfg as ChartConfig).type}". Use bar, line, pie, or donut.`);
    }
  },
};
