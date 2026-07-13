// ─── Icon Generator for Nahfi Bookmark Manager ─────────────────
// Generates PNG icons (16x16, 48x48, 128x128) using pure Node.js —
// no external dependencies. Creates a glassmorphism-style bookmark
// icon with a gradient background.

import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── CRC32 ──────────────────────────────────────────────────────

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── PNG Chunk ──────────────────────────────────────────────────

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ─── Create PNG ─────────────────────────────────────────────────

function createPNG(width, height, drawFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Pixel data with filter bytes
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Draw Icon ──────────────────────────────────────────────────

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function blendColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// Gradient: top-left blue → bottom-right purple
const GRADIENT_START = [0, 122, 255];   // #007AFF (Apple blue)
const GRADIENT_END = [175, 82, 222];     // #AF52DE (Apple purple)

function drawIcon(x, y, width, height) {
  const nx = x / width;
  const ny = y / height;
  const dist = Math.sqrt(nx * nx + ny * ny) / Math.sqrt(2);

  // Background gradient
  let [r, g, b] = blendColor(GRADIENT_START, GRADIENT_END, dist);

  // Rounded rectangle mask
  const radius = width * 0.22;
  const margin = 0;

  function inRoundedRect(px, py, w, h, r) {
    if (px < margin || px >= w - margin || py < margin || py >= h - margin) return false;
    const dx = Math.min(px - margin, w - margin - 1 - px);
    const dy = Math.min(py - margin, h - margin - 1 - py);
    if (dx >= r || dy >= r) return true;
    const cornerDist = Math.sqrt((r - dx) ** 2 + (r - dy) ** 2);
    return cornerDist <= r;
  }

  if (!inRoundedRect(x, y, width, height, radius)) {
    return [0, 0, 0, 0]; // transparent
  }

  // Draw a bookmark/ribbon shape in white
  // Center the bookmark
  const cx = width / 2;
  const cy = height / 2;
  const bw = width * 0.38;  // bookmark width
  const bh = height * 0.5;  // bookmark height
  const bx1 = cx - bw / 2;
  const bx2 = cx + bw / 2;
  const by1 = cy - bh / 2;
  const by2 = cy + bh / 2;

  // Check if point is inside the bookmark shape
  // The bookmark is a rectangle with a V-cut at the bottom
  const cutDepth = bh * 0.25;
  const cutWidth = bw * 0.35;

  let isBookmark = false;

  if (x >= bx1 && x <= bx2 && y >= by1 && y <= by2) {
    // Check V-cut at bottom
    const cutStartY = by2 - cutDepth;
    if (y < cutStartY) {
      isBookmark = true;
    } else {
      // V-cut: two diagonal lines from edges to center
      const progress = (y - cutStartY) / cutDepth;
      const leftEdge = bx1 + cutWidth * progress;
      const rightEdge = bx2 - cutWidth * progress;
      isBookmark = x >= leftEdge && x <= rightEdge;
    }
  }

  if (isBookmark) {
    // White with slight transparency for glass effect
    return [255, 255, 255, 240];
  }

  // Add subtle highlight at top (glass effect)
  if (ny < 0.3) {
    const highlight = (1 - ny / 0.3) * 40;
    r = Math.min(255, r + highlight);
    g = Math.min(255, g + highlight);
    b = Math.min(255, b + highlight);
  }

  return [r, g, b, 255];
}

// ─── Generate Icons ─────────────────────────────────────────────

const sizes = [16, 48, 128];
const outputDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

sizes.forEach((size) => {
  const png = createPNG(size, size, drawIcon);
  const filename = `icon${size}.png`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, png);
  console.log(`✓ Generated ${filename} (${png.length} bytes)`);
});

console.log('\nAll icons generated successfully!');
