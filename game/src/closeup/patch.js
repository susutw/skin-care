import * as THREE from 'three';
import { makeNoise, mulberry32, hexToRgb } from '../util.js';

// 一小塊可以變形的皮膚：高度場網格 + 毛孔、細紋貼圖 + 細小汗毛
// 痘痘的形狀、加壓時的凹陷與鼓起，都由 lesion.height() 疊在高度場上，
// 泛紅、發白、膿頭的顏色由 lesion.tint() 寫進頂點顏色。

const FIELD_R = 0.95; // 痘痘影響範圍，超過這個半徑的皮膚不必每幀重算

export class SkinPatch {
  constructor({ tone = '#eec4a4', seed = 1, size = 3.2, n = 256 } = {}) {
    this.size = size;
    this.n = n;
    this.d = size / n;
    this.half = size / 2;
    const rand = mulberry32(seed);
    const noise = makeNoise(rand);

    // PlaneGeometry 轉平之後：index = iz * (n + 1) + ix，x = -half + ix * d，z = -half + iz * d
    const geo = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2);
    const cnt = (n + 1) * (n + 1);
    this.base = new Float32Array(cnt);
    for (let iz = 0; iz <= n; iz++) {
      for (let ix = 0; ix <= n; ix++) {
        const x = -this.half + ix * this.d, z = -this.half + iz * this.d;
        this.base[iz * (n + 1) + ix] = (noise(x * 3 + 10, z * 3 + 10) - 0.5) * 0.012 + (noise(x * 9 + 50, z * 9) - 0.5) * 0.004;
      }
    }
    this.h = Float32Array.from(this.base);
    this.pos = geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
    this.nor = geo.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    this.col = new THREE.BufferAttribute(new Float32Array(cnt * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('color', this.col);
    this.geo = geo;

    const tex = makeTextures(tone, rand);
    this.textures = tex;
    this.mat = new THREE.MeshPhysicalMaterial({
      map: tex.map, roughnessMap: tex.rough, roughness: 1, bumpMap: tex.bump, bumpScale: 1.6,
      vertexColors: true, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffd9cc'),
      clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 0.6,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.receiveShadow = true;
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.write(0, n, 0, n);
    this.addHairs(rand);
  }

  idx(ix, iz) { return iz * (this.n + 1) + ix; }

  // 依痘痘目前的狀態重算中央區域的高度、顏色與法線
  update(lesion) {
    const { n, d, half } = this;
    const c = n / 2, k = Math.ceil(FIELD_R / d);
    const i0 = Math.max(1, c - k), i1 = Math.min(n - 1, c + k);
    const col = this.col.array, out = new THREE.Vector3();
    for (let iz = i0; iz <= i1; iz++) {
      const z = -half + iz * d;
      for (let ix = i0; ix <= i1; ix++) {
        const x = -half + ix * d;
        const r = Math.hypot(x, z);
        const i = iz * (n + 1) + ix;
        this.h[i] = this.base[i] + lesion.height(x, z, r);
        out.set(1, 1, 1);
        lesion.tint(x, z, r, out);
        col[i * 3] = out.x; col[i * 3 + 1] = out.y; col[i * 3 + 2] = out.z;
      }
    }
    this.write(i0, i1, i0, i1);
  }

  write(ix0, ix1, iz0, iz1) {
    const { n, d, h } = this;
    const P = this.pos.array, N = this.nor.array;
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const i = iz * (n + 1) + ix;
        P[i * 3 + 1] = h[i];
        const hl = h[iz * (n + 1) + Math.max(0, ix - 1)], hr = h[iz * (n + 1) + Math.min(n, ix + 1)];
        const hu = h[Math.max(0, iz - 1) * (n + 1) + ix], hd = h[Math.min(n, iz + 1) * (n + 1) + ix];
        let nx = (hl - hr) / (2 * d), nz = (hu - hd) / (2 * d);
        const len = Math.hypot(nx, 1, nz);
        N[i * 3] = nx / len; N[i * 3 + 1] = 1 / len; N[i * 3 + 2] = nz / len;
      }
    }
    // 只上傳有變動的那幾列
    const start = iz0 * (n + 1) * 3, count = (iz1 - iz0 + 1) * (n + 1) * 3;
    for (const a of [this.pos, this.nor, this.col]) {
      a.clearUpdateRanges();
      a.addUpdateRange(start, count);
      a.needsUpdate = true;
    }
  }

  heightAt(x, z) {
    const { n, d, half, h } = this;
    const fx = Math.min(n - 1e-6, Math.max(0, (x + half) / d));
    const fz = Math.min(n - 1e-6, Math.max(0, (z + half) / d));
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
    const a = h[this.idx(ix, iz)], b = h[this.idx(ix + 1, iz)], c = h[this.idx(ix, iz + 1)], e = h[this.idx(ix + 1, iz + 1)];
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + e) * tx * tz;
  }

  // 細小的汗毛：只放在痘痘影響範圍外，不用跟著變形
  addHairs(rand) {
    const mat = new THREE.MeshStandardMaterial({ color: '#c9b096', roughness: 0.6, transparent: true, opacity: 0.7 });
    const lean = rand() * Math.PI * 2;
    for (let i = 0; i < 90; i++) {
      const r = 0.5 + rand() * 1.0, a = rand() * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) > this.half - 0.1 || Math.abs(z) > this.half - 0.1) continue;
      const dir = lean + (rand() - 0.5) * 1.2, len = 0.06 + rand() * 0.1;
      const u = new THREE.Vector3(Math.cos(dir), 0, Math.sin(dir)), side = new THREE.Vector3(-u.z, 0, u.x);
      const root = new THREE.Vector3(x, this.heightAt(x, z) - 0.003, z);
      const curl = (rand() - 0.5) * 0.12;
      const pts = [0, 0.35, 0.7, 1].map((t, k) => root.clone()
        .addScaledVector(u, len * t)
        .addScaledVector(side, len * curl * t * t)
        .setY(root.y + len * [0, 0.18, 0.22, 0.15][k]));
      const hair = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.0016, 4), mat);
      hair.castShadow = true;
      this.group.add(hair);
    }
  }

  dispose() {
    this.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } });
    this.mat.dispose();
    Object.values(this.textures).forEach((t) => t.dispose());
  }
}

// 2048 的皮膚貼圖：膚色斑駁、淡淡的泛紅、毛孔；凹凸貼圖畫皮膚細紋與毛孔凹陷
function makeTextures(tone, rand) {
  const S = 2048;
  const [r, g, b] = hexToRgb(tone);
  const canvas = () => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    return [c, c.getContext('2d')];
  };
  const rgba = (k, a, dr = 0, dg = 0, db = 0) => `rgba(${Math.round(r * k + dr)},${Math.round(g * k + dg)},${Math.round(b * k + db)},${a})`;

  // 低解析度雜訊放大，當作膚色的斑駁
  const blotch = (alphaScale) => {
    const m = document.createElement('canvas');
    m.width = m.height = 48;
    const mc = m.getContext('2d');
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        const k = 0.94 + rand() * 0.12;
        mc.fillStyle = rgba(k, alphaScale, rand() * 10, -rand() * 6, -rand() * 6);
        mc.fillRect(x, y, 1, 1);
      }
    }
    return m;
  };

  const [cc, cx] = canvas();
  cx.fillStyle = rgba(1, 1);
  cx.fillRect(0, 0, S, S);
  cx.imageSmoothingEnabled = true;
  cx.drawImage(blotch(0.6), 0, 0, S, S);
  for (let i = 0; i < 16; i++) {
    const x = rand() * S, y = rand() * S, rad = 80 + rand() * 260;
    const gr = cx.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(214,96,90,0.07)');
    gr.addColorStop(1, 'rgba(214,96,90,0)');
    cx.fillStyle = gr;
    cx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  const [bc, bx] = canvas();
  bx.fillStyle = '#8a8a8a';
  bx.fillRect(0, 0, S, S);
  // 皮膚細紋：三個方向交錯的淺溝，拼出一格格的皮紋
  bx.lineCap = 'round';
  const fam = [rand() * Math.PI, 0, 0].map((a, i) => a + (i * Math.PI) / 3);
  for (let i = 0; i < 2600; i++) {
    const a = fam[i % 3] + (rand() - 0.5) * 0.35;
    const x = rand() * S, y = rand() * S, len = 20 + rand() * 60;
    bx.strokeStyle = `rgba(0,0,0,${0.08 + rand() * 0.12})`;
    bx.lineWidth = 1 + rand() * 1.2;
    bx.beginPath();
    bx.moveTo(x, y);
    bx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    bx.stroke();
  }

  // 毛孔：顏色上是一個小暗點，凹凸上是一個小凹洞
  for (let i = 0; i < 1800; i++) {
    const x = rand() * S, y = rand() * S;
    if (Math.hypot(x - S / 2, y - S / 2) < 70) continue;
    const rad = 2.5 + rand() * 3;
    let gr = cx.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, rgba(0.62, 0.5));
    gr.addColorStop(1, rgba(0.62, 0));
    cx.fillStyle = gr;
    cx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    gr = bx.createRadialGradient(x, y, 0, x, y, rad * 1.3);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    bx.fillStyle = gr;
    bx.fillRect(x - rad * 1.3, y - rad * 1.3, rad * 2.6, rad * 2.6);
  }

  const [rc, rx] = canvas();
  rx.fillStyle = '#8c8c8c';
  rx.fillRect(0, 0, S, S);
  rx.globalAlpha = 0.5;
  rx.drawImage(blotch(1), 0, 0, S, S);

  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: tex(cc, true), bump: tex(bc), rough: tex(rc) };
}
