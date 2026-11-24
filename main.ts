// The World in One Day — 24 November 2026
// Deterministic poster renderer: Node 22 standard library only, no network.
// Draws a 1024x1024 news poster into a raw RGB buffer with a hand-built 5x7
// bitmap font, encodes it as PNG by hand (zlib deflate + CRC32), and writes
// entry.png into MAKEFUN_OUTPUT_DIR (default /output). The output directory
// is never removed or recreated; only the file inside it is written.

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- palette
type RGB = [number, number, number];
const INK: RGB = [13, 20, 34];        // page background, deep navy
const PAPER: RGB = [244, 241, 234];   // main text
const MUTED: RGB = [168, 180, 198];   // secondary text
const RED: RGB = [214, 48, 49];       // lead accent
const GOLD: RGB = [240, 178, 60];     // climate / markets accent
const TEAL: RGB = [42, 157, 143];     // middle east accent
const SKY: RGB = [84, 145, 220];      // ukraine accent
const GREEN: RGB = [96, 186, 92];     // asia accent
const PURPLE: RGB = [150, 110, 220];  // sport accent
const CARD: RGB = [24, 35, 54];       // card background
const CARD2: RGB = [30, 44, 66];      // lead card background
const LINE: RGB = [58, 74, 98];       // hairlines

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
}
function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = cy - r; yy <= cy + r; yy++)
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx, dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPx(xx, yy, c);
    }
}
function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let yy = cy - r - t; yy <= cy + r + t; yy++)
    for (let xx = cx - r - t; xx <= cx + r + t; xx++) {
      const d = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy));
      if (d >= r - t && d <= r + t) setPx(xx, yy, c);
    }
}

// ---------------------------------------------------------------- font 5x7
// Each glyph: 7 rows of 5 pixels, '#' = on.
const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", ".#.#.", "..#..", "..#..", "..#..", ".#.#.", "#...#"],
  Y: ["#...#", ".#.#.", "..#..", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "..##.", ".#...", "#....", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  "'": [".##..", ".##..", ".#...", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "%": ["##..#", "##.#.", "....#", "...#.", "..#..", ".#...", "#..##"],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "(": ["...##", "..#..", ".#...", ".#...", ".#...", "..#..", "...##"],
  ")": ["##...", "..#..", "...#.", "...#.", "...#.", "..#..", "##..."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "—": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
};

// Text metrics: at scale s a glyph is 5s wide, advance 6s, height 7s,
// line pitch 9s.
function textWidth(text: string, s: number): number {
  return text.length === 0 ? 0 : text.length * 6 * s - s;
}
function drawText(x: number, y: number, text: string, s: number, c: RGB): void {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS["?"];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "#") rect(cx + col * s, y + r * s, s, s, c);
    cx += 6 * s;
  }
}
function drawCentered(y: number, text: string, s: number, c: RGB): void {
  drawText(Math.round((W - textWidth(text, s)) / 2), y, text, s, c);
}
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawWrapped(
  x: number, y: number, text: string, s: number, c: RGB, maxWidth: number,
): number {
  const maxChars = Math.max(1, Math.floor((maxWidth + s) / (6 * s)));
  const lines = wrap(text, maxChars);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * 9 * s, lines[i], s, c);
  return lines.length * 9 * s;
}

// ---------------------------------------------------------------- PNG out
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    t[n] = v;
  }
  return t;
})();
function crc32(buf: Uint8Array): number {
  let v = 0xffffffff;
  for (let i = 0; i < buf.length; i++) v = CRC_TABLE[(v ^ buf[i]) & 0xff] ^ (v >>> 8);
  return (v ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
function encodePng(): Uint8Array {
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const row = y * (1 + W * 3);
    raw[row] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), row + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour RGB
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { png.set(p, off); off += p.length; }
  return png;
}

// ---------------------------------------------------------------- stories
interface Story {
  tag: string;
  color: RGB;
  headline: string;
  body: string;
}

const LEAD: Story = {
  tag: "LEAD STORY — WORLD",
  color: RED,
  headline: "Ukraine Sinks Russian Corvette off Libya",
  body:
    "Ukrainian sea drones sank the Russian corvette Merkury off Benghazi. " +
    "The UN warned Libya must not become a foreign battleground, and the " +
    "Security Council called for an inquiry.",
};

const STORIES: Story[] = [
  {
    tag: "CLIMATE",
    color: GOLD,
    headline: "COP31 Ends Without a Deal",
    body:
      "Talks in Antalya collapsed over fossil fuel wording — the first " +
      "COP failure since 2009.",
  },
  {
    tag: "MARKETS",
    color: GOLD,
    headline: "Huang Returns, Nvidia Soars 31%",
    body:
      "Jensen Huang returned as CEO after White House pressure. Nvidia " +
      "jumped 31%, the Nasdaq 6.5% and the S&P 500 4.7%.",
  },
  {
    tag: "MIDDLE EAST",
    color: TEAL,
    headline: "US Sanctions Iran Shadow Banks",
    body:
      "Washington blacklisted over 25 exchange houses and front firms, " +
      "Iran's last financial lifeline.",
  },
  {
    tag: "UKRAINE WAR",
    color: SKY,
    headline: "Russian War Dead Near 700,000",
    body:
      "Leaked government data put Russia's war deaths near 700,000, as " +
      "drone debris set fires in Kyiv.",
  },
  {
    tag: "ASIA",
    color: GREEN,
    headline: "Factory Fire Kills 24 in Indonesia",
    body:
      "A blaze at a factory in Banten killed 24 workers, with about 30 " +
      "more still unaccounted for.",
  },
  {
    tag: "SPORT",
    color: PURPLE,
    headline: "Alcaraz Claims ATP Finals Crown",
    body:
      "Carlos Alcaraz beat Alexander Zverev 6-2, 7-6 in Turin to lift " +
      "the ATP Finals trophy.",
  },
];

const ALSO_TODAY =
  "Bangladesh vaccinates 50 million children against typhoid — Melat Kiros " +
  "becomes the first Gen Z woman in the US Congress — India and New Zealand " +
  "draw their Test in Wellington.";

// ---------------------------------------------------------------- layout
function drawGlobe(cx: number, cy: number, r: number): void {
  ring(cx, cy, r, 3, TEAL);
  // simple meridian / parallel strokes to suggest a globe
  for (let a = 0; a < 360; a += 6) {
    const rad = (a * Math.PI) / 180;
    const ex = Math.round(cx + r * 0.45 * Math.cos(rad));
    const ey = Math.round(cy + r * Math.sin(rad));
    setPx(ex, ey, TEAL); setPx(ex + 1, ey, TEAL); setPx(ex, ey + 1, TEAL);
  }
  rect(cx - r, cy - 1, 2 * r + 1, 3, TEAL);
  rect(cx - 1, cy - r, 3, 2 * r + 1, TEAL);
}

function card(x: number, y: number, w: number, h: number, s: Story, headScale: number): void {
  rect(x, y, w, h, CARD);
  rect(x, y, 6, h, s.color);
  drawText(x + 22, y + 14, s.tag, 2, s.color);
  drawWrapped(x + 22, y + 42, s.headline, headScale, PAPER, w - 40);
  const bodyY = y + 42 + 2 * 9 * headScale + 4;
  drawWrapped(x + 22, bodyY, s.body, 2, MUTED, w - 40);
}

function render(): void {
  rect(0, 0, W, H, INK);
  // header
  rect(0, 0, W, 8, RED);
  drawGlobe(86, 84, 40);
  drawText(150, 40, "THE WORLD IN ONE DAY", 6, PAPER);
  drawText(152, 96, "TUESDAY 24 NOVEMBER 2026", 3, GOLD);
  drawText(152, 126, "THE DAY'S WORLD NEWS, ON ONE PAGE", 2, MUTED);
  rect(32, 168, W - 64, 3, LINE);

  // lead story, full width
  const leadY = 188;
  rect(32, leadY, W - 64, 196, CARD2);
  rect(32, leadY, W - 64, 8, RED);
  drawText(56, leadY + 24, LEAD.tag, 3, RED);
  drawWrapped(56, leadY + 62, LEAD.headline, 4, PAPER, W - 112);
  drawWrapped(56, leadY + 140, LEAD.body, 2, MUTED, W - 112);

  // grid: two columns, three rows
  const gx = 32, gw = (W - 64 - 16) / 2, gh = 160, gy = 400, gap = 12;
  for (let i = 0; i < STORIES.length; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    card(gx + col * (gw + gap), gy + row * (gh + gap), gw, gh, STORIES[i], 3);
  }

  // also today strip
  const stripY = gy + 3 * (gh + gap) - gap + 18;
  rect(32, stripY, W - 64, 3, LINE);
  drawText(32, stripY + 14, "ALSO TODAY", 3, GOLD);
  drawWrapped(32, stripY + 48, ALSO_TODAY, 2, PAPER, W - 64);
}

// ---------------------------------------------------------------- main
render();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
writeFileSync(join(outDir, "entry.png"), encodePng());
