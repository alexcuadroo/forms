import test from "node:test";
import assert from "node:assert/strict";
import { compressBackground } from "../src/utils/compressBackground.ts";

test("background compression", async (t) => {
  let width = 6000, height = 4000, decodeFails = false;
  let encoder: (type: string, quality: number) => Blob | null;
  const calls: { width: number; height: number; type: string; quality: number }[] = [];
  const context = {
    imageSmoothingQuality: "low", fillStyle: "",
    drawImage() {}, fillRect() {},
  };
  const canvas = {
    width: 0, height: 0,
    getContext: () => context,
    toBlob(callback: (blob: Blob | null) => void, type: string, quality: number) {
      calls.push({ width: this.width, height: this.height, type, quality });
      callback(encoder(type, quality));
    },
  };
  const originalImage = Object.getOwnPropertyDescriptor(globalThis, "Image");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "Image", { configurable: true, value: class {
    src = "";
    naturalWidth = width;
    naturalHeight = height;
    async decode() { if (decodeFails) throw new Error("Invalid image"); }
  } });
  Object.defineProperty(globalThis, "document", {
    configurable: true, value: { createElement: () => canvas },
  });
  const revoked: string[] = [];
  t.mock.method(URL, "createObjectURL", () => "blob:background");
  t.mock.method(URL, "revokeObjectURL", (url: string) => revoked.push(url));
  t.after(() => {
    if (originalImage) Object.defineProperty(globalThis, "Image", originalImage);
    else Reflect.deleteProperty(globalThis, "Image");
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  });
  const file = () => new File([new Uint8Array(1_000_000)], "photo.png", { type: "image/png" });
  const blob = (size: number, type: string) => new Blob([new Uint8Array(size)], { type });

  await t.test("resizes large images proportionally and uploads a small WebP", async () => {
    encoder = (type) => blob(120_000, type);
    const result = await compressBackground(file());
    assert.equal(result.size, 120_000);
    assert.equal(result.type, "image/webp");
    assert.equal(result.name, "photo.webp");
    assert.deepEqual(calls[0], { width: 1920, height: 1280, type: "image/webp", quality: 0.82 });
    assert.equal(canvas.width, 0);
    assert.deepEqual(revoked, ["blob:background"]);
  });

  await t.test("falls back to JPEG when the browser returns PNG for WebP", async () => {
    encoder = (type) => blob(100_000, type === "image/webp" ? "image/png" : type);
    const result = await compressBackground(file());
    assert.equal(result.type, "image/jpeg");
    assert.equal(result.name, "photo.jpg");
    assert.equal(context.fillStyle, "#ffffff");
  });

  await t.test("reduces quality then dimensions to respect the byte budget", async () => {
    calls.length = 0;
    encoder = (type) => blob(canvas.width > 1440 ? 400_000 : 200_000, type);
    assert.equal((await compressBackground(file())).size, 200_000);
    assert.deepEqual(calls.map((c) => [c.width, c.quality]), [
      [1920, 0.82], [1920, 0.68], [1920, 0.54], [1440, 0.82],
    ]);
  });

  await t.test("keeps smaller JPEGs and never upscales them", async () => {
    width = 400; height = 600;
    encoder = (type) => blob(100_000, type);
    const original = new File([new Uint8Array(10_000)], "small.jpg", { type: "image/jpeg" });
    assert.equal(await compressBackground(original), original);
    assert.equal(calls.at(-1)?.width, 400);
    assert.equal(calls.at(-1)?.height, 600);
  });

  await t.test("rejects failed encodes and releases the object URL", async () => {
    encoder = () => null;
    const before = revoked.length;
    await assert.rejects(compressBackground(file()), /comprimir/);
    assert.equal(revoked.length, before + 1);
    assert.equal(canvas.width, 0);
  });

  await t.test("rejects corrupt images and invalid input sizes", async () => {
    decodeFails = true;
    const before = revoked.length;
    await assert.rejects(compressBackground(file()), /Invalid image/);
    assert.equal(revoked.length, before + 1);
    await assert.rejects(compressBackground(new File([], "empty.png")), /10 MB/);
    await assert.rejects(compressBackground(new File([new Uint8Array(10_000_001)], "large.png")), /10 MB/);
  });
});
