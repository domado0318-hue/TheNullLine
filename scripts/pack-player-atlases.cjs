// Lossless layout only: copy the existing rendered RGBA rectangles to a physical grid.
// No drawing, resampling, color correction or regenerated art.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { readPng } = require('./read-player-png.cjs');
const outputDirectory = path.join(__dirname, '../public/assets/players');
const cell = 320, columns = 4, rows = 5;

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

function encodePng(width, height, pixels, originalFile) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6; // RGBA8, non-interlaced.
  const chunks = [originalFile.subarray(0, 8), chunk('IHDR', header)];
  // Keep original color interpretation as well as the exact RGBA samples.
  for (let at = 8; at < originalFile.length;) {
    const length = originalFile.readUInt32BE(at), type = originalFile.toString('ascii', at + 4, at + 8);
    if (['sRGB', 'gAMA', 'cHRM', 'iCCP', 'sBIT'].includes(type)) chunks.push(originalFile.subarray(at, at + length + 12));
    at += length + 12;
  }
  const stride = width * 4, raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  chunks.push(chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

for (const id of ['mechanic', 'signal', 'carrier']) {
  const sourceDirectory = path.join(__dirname, '../images/players/source');
  const originalPath = path.join(sourceDirectory, id + '-walk-source.png');
  const original = readPng(originalPath);
  const sourceAtlas = JSON.parse(fs.readFileSync(path.join(sourceDirectory, id + '-walk-source.json'), 'utf8'));
  const width = columns * cell, height = rows * cell, pixels = Buffer.alloc(width * height * 4), frames = {};
  if (Object.keys(sourceAtlas.frames).length !== columns * rows) throw Error('Expected 20 poses: ' + id);
  for (let index = 0; index < columns * rows; index++) {
    const source = sourceAtlas.frames[index], r = source.frame, offset = source.spriteSourceSize;
    if (source.sourceSize.w !== cell || source.sourceSize.h !== cell || offset.x < 0 || offset.y < 0
      || offset.x + r.w > cell || offset.y + r.h > cell || r.x < 0 || r.y < 0
      || r.x + r.w > original.width || r.y + r.h > original.height) throw Error('Invalid source pose: ' + id + '/' + index);
    const x = index % columns * cell, y = Math.floor(index / columns) * cell;
    for (let line = 0; line < r.h; line++) {
      const start = ((r.y + line) * original.width + r.x) * 4;
      original.pixels.copy(pixels, ((y + offset.y + line) * width + x + offset.x) * 4, start, start + r.w * 4);
    }
    frames[index] = { frame: { x, y, w: cell, h: cell }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: cell, h: cell }, sourceSize: { w: cell, h: cell }, eye: source.eye };
  }
  const filename = id + '-walk.png';
  fs.writeFileSync(path.join(outputDirectory, filename), encodePng(width, height, pixels, fs.readFileSync(originalPath)));
  fs.writeFileSync(path.join(outputDirectory, id + '-walk.json'), JSON.stringify({ frames,
    meta: { image: filename, size: { w: width, h: height }, scale: '1' } }, null, 2) + '\n');
  console.log(id + ': 1280x1600 PNG, 20 physical 320x320 cells, unchanged RGBA and eye anchors');
}
