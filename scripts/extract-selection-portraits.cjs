// Extract the selected existing drawings; never redraw or resample the character art.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { readPng } = require('./read-player-png.cjs');
const root = path.join(__dirname, '..');
const crops = {
  mechanic: { x: 580, y: 85, w: 500, h: 530 }, // B: upper middle, px.
  signal: { x: 580, y: 65, w: 490, h: 570 }, // B: upper middle, px.
  carrier: { x: 75, y: 55, w: 490, h: 560 }, // A: upper left, px.
};
const padding = 6; // Transparent trim margin, px.

function chunk(type, data) {
  const bytes = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length); bytes.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
  return result;
}

function encodePng(width, height, pixels, sourceFile) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  const chunks = [sourceFile.subarray(0, 8), chunk('IHDR', header)];
  for (let at = 8; at < sourceFile.length;) {
    const length = sourceFile.readUInt32BE(at), type = sourceFile.toString('ascii', at + 4, at + 8);
    if (['sRGB', 'gAMA', 'cHRM', 'iCCP', 'sBIT'].includes(type)) chunks.push(sourceFile.subarray(at, at + length + 12));
    at += length + 12;
  }
  const stride = width * 4, raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  chunks.push(chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

const manifest = {};
for (const [id, crop] of Object.entries(crops)) {
  const source = `images/players/portraits/${id}-comparison.png`;
  const sourceFile = fs.readFileSync(path.join(root, source));
  const original = readPng(path.join(root, source));
  const { w, h } = crop, count = w * h;
  const samples = Buffer.alloc(count * 4);
  for (let y = 0; y < h; y++) {
    const from = ((crop.y + y) * original.width + crop.x) * 4;
    original.pixels.copy(samples, y * w * 4, from, from + w * 4);
  }
  const lightness = index => (samples[index * 4] + samples[index * 4 + 1] + samples[index * 4 + 2]) / 3;
  const neighbors = index => {
    const x = index % w, y = Math.floor(index / w), result = [];
    if (x) result.push(index - 1);
    if (x + 1 < w) result.push(index + 1);
    if (y) result.push(index - w);
    if (y + 1 < h) result.push(index + w);
    return result;
  };
  // Only flood the light exterior. The closed dark outline protects ivory cloth and eyes.
  // Paper and the tan floor shadow are both lighter than the outline threshold.
  const exterior = new Uint8Array(count), queue = [];
  const visit = index => {
    if (!exterior[index] && lightness(index) > 150) { exterior[index] = 1; queue.push(index); }
  };
  for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
  for (let at = 0; at < queue.length; at++) for (const next of neighbors(queue[at])) visit(next);

  const pixels = Buffer.alloc(count * 4);
  for (let index = 0; index < count; index++) {
    const x = index % w, y = Math.floor(index / w);
    const boundary = neighbors(index).some(next => exterior[next] !== exterior[index]);
    if (!boundary) {
      if (!exterior[index]) samples.copy(pixels, index * 4, index * 4, index * 4 + 4);
      continue;
    }
    // Recover edge alpha against the local paper/shadow matte, avoiding pale fringes.
    let foreground = index, background = index, darkest = Infinity, nearest = Infinity;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const next = ny * w + nx, distance = dx * dx + dy * dy;
      if (!exterior[next] && distance <= 9 && lightness(next) < darkest) { darkest = lightness(next); foreground = next; }
      if (exterior[next] && distance >= 9 && distance < nearest && lightness(next) > 160) { nearest = distance; background = next; }
    }
    if (!Number.isFinite(darkest) || !Number.isFinite(nearest)) continue;
    let numerator = 0, denominator = 0;
    for (let channel = 0; channel < 3; channel++) {
      const bg = samples[background * 4 + channel], fg = samples[foreground * 4 + channel];
      numerator += (bg - samples[index * 4 + channel]) * (bg - fg);
      denominator += (bg - fg) ** 2;
    }
    let alpha = Math.max(0, Math.min(1, numerator / denominator));
    if (alpha < 0.08) continue;
    if (alpha > 0.96) alpha = 1;
    for (let channel = 0; channel < 3; channel++) {
      const bg = samples[background * 4 + channel];
      pixels[index * 4 + channel] = Math.round(Math.max(0, Math.min(255,
        (samples[index * 4 + channel] - bg * (1 - alpha)) / alpha)));
    }
    pixels[index * 4 + 3] = Math.round(alpha * samples[index * 4 + 3]);
  }
  let left = w, top = h, right = -1, bottom = -1;
  for (let index = 0; index < count; index++) if (pixels[index * 4 + 3]) {
    left = Math.min(left, index % w); right = Math.max(right, index % w);
    top = Math.min(top, Math.floor(index / w)); bottom = Math.max(bottom, Math.floor(index / w));
  }
  const width = right - left + 1 + padding * 2, height = bottom - top + 1 + padding * 2;
  const trimmed = Buffer.alloc(width * height * 4);
  for (let y = top; y <= bottom; y++) {
    const from = (y * w + left) * 4;
    pixels.copy(trimmed, ((y - top + padding) * width + padding) * 4, from, from + (right - left + 1) * 4);
  }
  const output = `public/assets/players/${id}-portrait.png`;
  fs.writeFileSync(path.join(root, output), encodePng(width, height, trimmed, sourceFile));
  manifest[id] = { source, output, sourceX: crop.x + left, sourceY: crop.y + top, padding, width, height };
  console.log(`${id}: ${width}x${height}, original drawing trimmed with transparent background`);
}
fs.mkdirSync(path.join(root, 'images/players'), { recursive: true });
fs.writeFileSync(path.join(root, 'images/players/portrait-extraction.json'), JSON.stringify(manifest, null, 2) + '\n');
