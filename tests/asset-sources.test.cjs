const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { readPng } = require('../scripts/read-player-png.cjs');
const root = path.resolve(__dirname, '..');

test('Retained player sources reproduce all approved walk pixels, frame metadata and portraits in an isolated directory', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'null-line-assets-'));
  try {
    for (const dir of ['scripts', 'images/players', 'public/assets/players']) fs.mkdirSync(path.join(temp, dir), { recursive: true });
    for (const dir of ['source', 'portraits']) fs.cpSync(path.join(root, 'images/players', dir), path.join(temp, 'images/players', dir), { recursive: true });
    for (const file of ['read-player-png.cjs', 'pack-player-atlases.cjs', 'extract-selection-portraits.cjs'])
      fs.copyFileSync(path.join(root, 'scripts', file), path.join(temp, 'scripts', file));
    for (const file of ['pack-player-atlases.cjs', 'extract-selection-portraits.cjs'])
      execFileSync(process.execPath, [path.join(temp, 'scripts', file)], { cwd: temp, timeout: 30000, stdio: 'pipe' });
    for (const id of ['mechanic', 'signal', 'carrier']) {
      const atlas = `public/assets/players/${id}-walk.json`;
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temp, atlas))), JSON.parse(fs.readFileSync(path.join(root, atlas))), `${id}: approved frame positions and eye metadata`);
      for (const kind of ['walk', 'portrait']) {
        const file = `public/assets/players/${id}-${kind}.png`;
        const actual = readPng(path.join(temp, file)), expected = readPng(path.join(root, file));
        assert.equal(actual.width, expected.width, file);
        assert.equal(actual.height, expected.height, file);
        assert(actual.pixels.equals(expected.pixels), `${file}: exact RGBA samples`);
      }
    }
    const manifest = 'images/players/portrait-extraction.json';
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temp, manifest))), JSON.parse(fs.readFileSync(path.join(root, manifest))), 'portrait extraction provenance remains reproducible');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
