import * as THREE from 'three';
import { makeNoise, mulberry32, clamp, hexToRgb } from './util.js';

// 依肌膚參數產生 equirect 貼圖（對應 SphereGeometry 的 UV）：
// 顏色（膚色、泛紅、雀斑）、粗糙度（T 字出油）、凹凸（毛孔）
const W = 1024, H = 512;
const RED = [214, 92, 88];

function gauss(d, c, r) {
  const dx = d[0] - c[0], dy = d[1] - c[1], dz = d[2] - c[2];
  return Math.exp(-(dx * dx + dy * dy + dz * dz) / (r * r));
}

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  return { c, ctx, img: ctx.createImageData(W, H) };
}

function toTexture({ c, ctx, img }, srgb, put = true) {
  if (put) ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeSkinMaps(skin, seed) {
  const rand = mulberry32(seed);
  const nLow = makeNoise(rand), nRed = makeNoise(rand), nPore = makeNoise(rand);
  const base = hexToRgb(skin.tone);
  const col = makeCanvas(), rough = makeCanvas(), bump = makeCanvas();
  const d = [0, 0, 0];

  for (let py = 0; py < H; py++) {
    const th = ((py + 0.5) / H) * Math.PI;
    const st = Math.sin(th), ct = Math.cos(th);
    const v = py / H;
    for (let px = 0; px < W; px++) {
      const phi = ((px + 0.5) / W) * Math.PI * 2;
      d[0] = -Math.cos(phi) * st; d[1] = ct; d[2] = Math.sin(phi) * st;
      const u = px / W;
      const i = (py * W + px) * 4;

      const low = nLow(u * 16, v * 8) * 0.6 + nLow(u * 48, v * 24) * 0.4;
      const shade = 1 + (low - 0.5) * 0.1 - Math.max(0, -d[1] - 0.6) * 0.15;

      // 泛紅：雙頰、鼻頭、隨機紅斑
      let red = (gauss(d, [0.52, -0.1, 0.84], 0.33) + gauss(d, [-0.52, -0.1, 0.84], 0.33)) * (0.18 + skin.redness * 0.35);
      red += gauss(d, [0, -0.05, 1], 0.2) * 0.12;
      red += Math.max(0, nRed(u * 28, v * 14) - 0.55) * 1.6 * skin.redness;
      red = clamp(red, 0, 0.55);

      let r = base[0] * shade, g = base[1] * shade, b = base[2] * shade;
      r += (RED[0] - r) * red; g += (RED[1] - g) * red; b += (RED[2] - b) * red;

      col.img.data[i] = r; col.img.data[i + 1] = g; col.img.data[i + 2] = b; col.img.data[i + 3] = 255;

      // T 字部位越油越亮（粗糙度越低）
      const tz = Math.max(gauss(d, [0, 0.6, 0.8], 0.38), gauss(d, [0, -0.02, 1], 0.22), gauss(d, [0, -0.75, 0.66], 0.2) * 0.6);
      const ro = clamp(0.68 - skin.oil * 0.22 - skin.oil * 0.42 * tz + (low - 0.5) * 0.08, 0.12, 0.9) * 255;
      rough.img.data[i] = ro; rough.img.data[i + 1] = ro; rough.img.data[i + 2] = ro; rough.img.data[i + 3] = 255;

      // 毛孔：鼻子、雙頰、T 字較明顯
      const pz = 0.35 + Math.max(tz, gauss(d, [0.45, -0.1, 0.88], 0.3), gauss(d, [-0.45, -0.1, 0.88], 0.3));
      const pore = Math.max(0, nPore(u * 520, v * 260) - 0.66) * 2.2 * skin.pores * pz;
      const bv = clamp(0.6 + (low - 0.5) * 0.15 - pore, 0, 1) * 255;
      bump.img.data[i] = bv; bump.img.data[i + 1] = bv; bump.img.data[i + 2] = bv; bump.img.data[i + 3] = 255;
    }
  }

  col.ctx.putImageData(col.img, 0, 0);
  if (skin.freckles) drawFreckles(col.ctx, skin.freckles, rand);
  return { map: toTexture(col, true, false), roughnessMap: toTexture(rough), bumpMap: toTexture(bump) };
}

// 雀斑：集中在鼻樑和雙頰的小圓點
function drawFreckles(ctx, amount, rand) {
  const n = Math.round(amount * 500);
  for (let i = 0; i < n; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * Math.abs((rand() + rand() - 1) * 0.7);
    const y = -0.05 + (rand() + rand() - 1) * 0.35;
    const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    const phi = (Math.atan2(z, -x) + Math.PI * 2) % (Math.PI * 2);
    const px = (phi / (Math.PI * 2)) * W, py = (Math.acos(y) / Math.PI) * H;
    ctx.fillStyle = `rgba(130,72,45,${0.12 + rand() * 0.22})`;
    ctx.beginPath();
    ctx.arc(px, py, 0.8 + rand() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
