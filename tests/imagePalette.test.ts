import test from "node:test";
import assert from "node:assert/strict";
import { paletteFromPixels } from "../src/utils/imagePalette.ts";

function pixels(...colors: number[][]) {
  return new Uint8ClampedArray(colors.flat());
}

test("derives a tinted background and a contrasting accent from a solid image", () => {
  const palette = paletteFromPixels(pixels([255, 0, 0, 255]));
  assert.equal(palette?.background, "#ffe0e0");
  assert.match(palette!.accent, /^#[0-9a-f]{6}$/);
  assert.ok(parseInt(palette!.accent.slice(1, 3), 16) < 255);
  assert.equal(palette!.accent.slice(3), "0000");
});

test("ignores transparent pixels and handles empty images without replacing colors", () => {
  assert.equal(paletteFromPixels(pixels([255, 0, 0, 0])), undefined);
  assert.equal(paletteFromPixels(pixels()), undefined);
  assert.deepEqual(
    paletteFromPixels(pixels([255, 0, 0, 0], [0, 0, 255, 255])),
    paletteFromPixels(pixels([0, 0, 255, 255])),
  );
});

test("picks a colorful accent from a neutral image without favoring isolated noise", () => {
  const neutral = Array.from({ length: 100 }, () => [240, 240, 240, 255]);
  const blue = Array.from({ length: 20 }, () => [30, 80, 180, 255]);
  const palette = paletteFromPixels(pixels(...neutral, ...blue, [255, 0, 0, 255]));
  assert.equal(palette?.accent, "#1e50b4");
  assert.equal(palette?.background, "#fdfdfd");
});

test("handles grayscale and very light images with a readable accent", () => {
  for (const value of [0, 128, 255]) {
    const palette = paletteFromPixels(pixels([value, value, value, 255]))!;
    const channels = [1, 3, 5].map((i) => parseInt(palette.accent.slice(i, i + 2), 16) / 255);
    const linear = channels.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    assert.ok(1.05 / (luminance + 0.05) >= 4.5);
  }
});
