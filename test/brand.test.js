'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function pngInfo(file) {
  const b = fs.readFileSync(file);
  assert.ok(
    b.slice(0, 8).toString('hex') === '89504e470d0a1a0a',
    `${file} is not a PNG`
  );
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    bytes: b.length,
  };
}

test('dapp.json declares the icon image with the emoji fallback', () => {
  const dapp = JSON.parse(fs.readFileSync(path.join(ROOT, 'dapp.json'), 'utf8'));
  assert.equal(dapp.icon.image, 'brand/icon.png');
  assert.equal(dapp.icon.emoji, '⛰️');
});

test('icon.png is a 1024x1024 PNG under the 256KB limit', () => {
  const info = pngInfo(path.join(ROOT, 'brand', 'icon.png'));
  assert.equal(info.width, 1024);
  assert.equal(info.height, 1024);
  assert.ok(info.bytes <= 256 * 1024, `icon.png is ${info.bytes} bytes`);
});

test('featured pictures are 1600x900 PNGs', () => {
  for (const name of ['featured-light.png', 'featured-dark.png']) {
    const info = pngInfo(path.join(ROOT, 'brand', name));
    assert.equal(info.width, 1600, `${name} width`);
    assert.equal(info.height, 900, `${name} height`);
  }
});
