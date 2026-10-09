import * as THREE from 'three';
import { DynTube } from './tube.js';
import { clamp, easeOut, lerp } from '../util.js';

// 五種痘痘的近距離版本。每一種都提供：
//   height(x, z, r)  疊在皮膚高度場上的形狀（含加壓時的凹陷與鼓起）
//   tint(x, z, r, out) 頂點顏色的乘數（泛紅、發白、膿頭、空毛孔）
//   update(dt, inp)  inp = { loop, gel, needle } 是否正在用粉刺棒 / 凝膠 / 挑針
// 座標都在皮膚區塊的局部空間：痘痘在原點，Y 軸朝外。

const C = (hex) => new THREE.Color(hex);
const ball = new THREE.SphereGeometry(1, 20, 14);
const hemi = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
const vibrate = (p) => navigator.vibrate?.(p);
// alphaMap 讀的是綠色通道，所以要畫在不透明的黑底上
const softEdge = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, '#fff');
  gr.addColorStop(0.6, '#fff');
  gr.addColorStop(1, '#000');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

const sebumMat = () => new THREE.MeshPhysicalMaterial({
  vertexColors: true, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25,
  sheen: 0.5, sheenColor: new THREE.Color('#ffffff'),
});
const pasteMat = () => new THREE.MeshPhysicalMaterial({
  vertexColors: true, roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'),
});
const pusMat = () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1 });
const serumMat = () => new THREE.MeshPhysicalMaterial({
  vertexColors: true, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.5, depthWrite: false,
});
const glossy = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, ...extra });

export const LESION_TYPES = ['blackhead', 'whitehead', 'closed', 'pustule', 'papule'];

export function makeLesion(type, ctx) {
  const L = { blackhead: Blackhead, whitehead: Whitehead, closed: Closed, pustule: Pustule, papule: Papule }[type];
  return new L(ctx);
}

class Lesion {
  constructor({ patch, fx, sfx, rand, tone, toast }) {
    Object.assign(this, { patch, fx, sfx, rand, toast });
    this.toneLin = C(tone);
    this.group = new THREE.Group();
    patch.group.add(this.group);
    this.press = 0;
    this.progress = 0;
    this.state = 'idle';
    this.done = false;
    this.residual = 0;
    this.residues = [];
    this.dirty = true;
    this.tick = 0;
    this.RED = this.mul('#c9584e');
    this.BLANCH = new THREE.Vector3(1.12, 1.1, 1.08);
  }

  // 目標顏色 ÷ 膚色 = 頂點顏色乘數（貼圖是膚色，乘上去剛好變成目標色）
  mul(hex) {
    const c = C(hex), t = this.toneLin;
    return new THREE.Vector3(c.r / t.r, c.g / t.g, c.b / t.b);
  }

  // 粉刺棒往下壓：圈的位置凹下去，圈內被擠得鼓起來
  pressShape(r) {
    const p = this.press;
    if (p < 1e-3) return 0;
    const R = this.loopR;
    return p * (-0.03 * Math.exp(-(((r - R) / 0.035) ** 2)) + this.bulge * Math.exp(-((r / (R * 0.75)) ** 2)));
  }

  pressTint(r, out) {
    const p = this.press;
    if (p < 1e-3) return;
    out.lerp(this.BLANCH, 0.5 * p * Math.exp(-(((r - this.loopR) / 0.04) ** 2)));
    out.lerp(this.RED, 0.3 * p * Math.exp(-((r / (this.loopR * 0.85)) ** 2)));
  }

  setPress(target, dt) {
    const k = target > this.press ? 2 : 4;
    const before = this.press;
    this.press += clamp(target - this.press, -k * dt, k * dt);
    if (this.press !== before) this.dirty = true;
  }

  // 力道夠（press > 0.55）才會有進度；放開就停在原地
  advance(dt, speed) {
    if (this.press <= 0.55 || this.progress >= 1) return false;
    this.progress = Math.min(1, this.progress + dt * speed * ((this.press - 0.55) / 0.45));
    this.dirty = true;
    return true;
  }

  // 擠出時一下一下的濕黏聲
  squish(dt, vol = 0.25) {
    if ((this.tick -= dt) > 0) return;
    this.tick = 0.16 + this.rand() * 0.12;
    this.sfx.squelch(vol);
    vibrate(8);
  }

  fade(dt) {
    if (this.residual > this.residualFloor) {
      this.residual = Math.max(this.residualFloor, this.residual - dt * 0.03);
      this.dirty = true;
    }
  }

  // 進度條顯示的數值
  get meter() { return this.progress; }

  // 還沒擠完就按化妝棉時的提示
  wipeHint() { return '還沒擠完呢，先用粉刺棒加壓～'; }

  local(x, y, z) { return new THREE.Vector3(x, y, z); }
  world(v) { return this.group.localToWorld(v.clone()); }
  worldNormal() { return new THREE.Vector3(0, 1, 0).transformDirection(this.group.matrixWorld); }

  complete() {
    this.done = true;
    this.state = 'out';
    this.onDone?.();
  }

  afterWipe() { this.state = 'clean'; this.residual = this.residualFloor; this.dirty = true; }

  dispose() {
    this.group.parent?.remove(this.group);
    this.group.traverse((o) => { if (o.isMesh) o.material.dispose?.(); });
  }
}

// ---------------- 黑頭 ----------------

class Blackhead extends Lesion {
  constructor(ctx) {
    super(ctx);
    const r = this.rand;
    this.kind = 'blackhead';
    this.loopR = 0.2;
    this.bulge = 0.04;
    this.poreR = 0.028 + r() * 0.012;
    this.bumpH = 0.02 + r() * 0.015;
    this.plugR = this.poreR * 0.78;
    this.emptied = 0;
    this.residualFloor = 0.08;
    this.ph = r() * 10;
    this.RIM = this.mul('#8d6d55');
    this.HOLE = this.mul('#5e3530');
    this.cols = { tip: C('#2f2219'), mid: C('#a48d68'), wax: C('#efe2b6'), band: C('#dccb98') };

    // 先從毛孔往上冒，再彎下來躺到皮膚上
    const a = r() * Math.PI * 2;
    const u = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), v = new THREE.Vector3(-u.z, 0, u.x);
    const P = (du, y, dv) => u.clone().multiplyScalar(du).addScaledVector(v, dv).setY(y);
    const w = () => (r() - 0.5) * 0.04;
    this.curve = new THREE.CatmullRomCurve3([
      P(0, -0.03, 0), P(0, 0.05, 0), P(0.03, 0.12, w()), P(0.1, 0.15, w()), P(0.18, 0.11, w()),
      P(0.25, 0.065, w()), P(0.34, 0.048, w()), P(0.46, 0.044, w()), P(0.6, 0.044, w()), P(0.76, 0.044, w()),
    ]);
    this.clen = this.curve.getLength();
    this.L = Math.min(0.32 + r() * 0.24, this.clen * 0.95);
    this.tube = new DynTube(90, 14, sebumMat());
    this.group.add(this.tube.group);
    this.drawPlug();
  }

  drawPlug() {
    const e = 0.035 + this.progress * (this.L - 0.035);
    const n = clamp(Math.ceil(e / 0.008), 2, 90);
    const pts = [], radii = [], cols = [];
    const { tip, mid, wax, band } = this.cols;
    for (let i = 0; i < n; i++) {
      const s = (e * i) / (n - 1), d = e - s;
      pts.push(this.curve.getPointAt(Math.min(1, s / this.clen)));
      // 粗細有一點起伏；剛擠出毛孔的那段被擠得細一點
      radii.push(this.plugR * (1 + 0.12 * Math.sin(d * 38 + this.ph)) * (s < 0.05 ? 0.86 : 1));
      // 最前端是氧化的黑頭，往後漸漸變成蠟黃的皮脂，帶一圈圈角質的紋路
      let c;
      if (d < 0.02) c = tip.clone();
      else if (d < 0.07) c = tip.clone().lerp(mid, (d - 0.02) / 0.05);
      else if (d < 0.15) c = mid.clone().lerp(wax, (d - 0.07) / 0.08);
      else c = wax.clone().lerp(band, 0.5 + 0.5 * Math.sin(d * 70 + this.ph));
      cols.push(c);
    }
    this.tube.set(pts, radii, cols);
  }

  update(dt, inp) {
    this.setPress(inp.loop ? 1 : 0, dt);
    if (!this.done && this.advance(dt, 0.32)) {
      this.state = 'extruding';
      this.drawPlug();
      this.squish(dt);
      if (this.progress >= 1) this.finish();
    }
    this.fade(dt);
  }

  finish() {
    this.emptied = 1;
    this.residual = 0.35;
    this.sfx.squelch(1);
    vibrate(30);
    this.fx.shake = Math.max(this.fx.shake, 0.01);
    this.residues.push(this.tube.group);
    // 毛孔口滲出一點亮亮的皮脂
    for (let k = 0; k < 4; k++) {
      const a = this.rand() * Math.PI * 2, rr = this.poreR * (1.2 + this.rand() * 0.8);
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const drop = new THREE.Mesh(hemi, glossy('#f2e2a8'));
      const s = 0.006 + this.rand() * 0.007;
      drop.scale.set(s, s * 0.6, s);
      drop.position.set(x, this.patch.heightAt(x, z) - 0.001, z);
      this.group.add(drop);
      this.residues.push(drop);
    }
    this.complete();
  }

  height(x, z, r) {
    return this.bumpH * (1 - 0.65 * this.emptied) * Math.exp(-((r / 0.13) ** 2))
      - (0.018 + 0.012 * this.emptied) * Math.exp(-((r / this.poreR) ** 2))
      + this.pressShape(r);
  }

  tint(x, z, r, out) {
    const rim = Math.exp(-(((r - this.poreR) / (this.poreR * 0.45)) ** 2));
    out.lerp(this.RIM, 0.35 * rim * (1 - 0.6 * this.emptied));
    if (this.emptied) out.lerp(this.HOLE, 0.85 * Math.exp(-((r / (this.poreR * 0.9)) ** 2)));
    out.lerp(this.RED, this.residual * Math.exp(-((r / 0.17) ** 2)));
    this.pressTint(r, out);
  }

  stage() {
    if (this.state === 'clean') return '乾淨了 ✨ 換下一顆吧';
    if (this.done) return '擠乾淨了！用化妝棉擦一擦';
    if (this.state === 'idle') return '按住畫面，用粉刺棒慢慢加壓';
    return this.press > 0.55 ? '出來了…慢慢來～' : '再用力一點…';
  }
}

// ---------------- 白頭 ----------------

class Whitehead extends Lesion {
  constructor(ctx) {
    super(ctx);
    const r = this.rand;
    this.kind = 'whitehead';
    this.needsSteam = true;
    this.loopR = 0.24;
    this.bulge = 0.03;
    this.domeR = 0.095 + r() * 0.03;
    this.domeH = 0.055 + r() * 0.03;
    this.L = 0.26 + r() * 0.14;
    this.pasteR = 0.028;
    this.steamed = false;
    this.opened = false;
    this.drain = 0;
    this.residualFloor = 0.06;
    this.ph = [r() * 10, r() * 10];
    this.WHITE = this.mul('#f6efe2');
    this.PIT = this.mul('#a7756a');
    this.cols = { a: C('#f7f0de'), b: C('#e9dcb8') };

    // 擠出來的白色內容物會在旁邊捲成一小堆
    const a = r() * Math.PI * 2;
    const c = new THREE.Vector3(Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07);
    const a0 = Math.atan2(-c.z, -c.x);
    const pts = [new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0, 0.05, 0)];
    for (let k = 0; k <= 12; k++) {
      const ang = a0 + k * 0.6, rad = 0.07 - k * 0.0025;
      pts.push(new THREE.Vector3(c.x + Math.cos(ang) * rad, 0.105 - k * 0.0045, c.z + Math.sin(ang) * rad));
    }
    this.curve = new THREE.CatmullRomCurve3(pts);
    this.clen = this.curve.getLength();
    this.L = Math.min(this.L, this.clen * 0.95);
    this.tube = new DynTube(80, 16, pasteMat());
    this.group.add(this.tube.group);
  }

  steam() {
    this.steamed = true;
    this.needsSteam = false;
    this.dirty = true;
  }

  wipeHint() { return this.steamed ? super.wipeHint() : '還沒清呢，先蒸臉再擠～'; }

  drawPaste() {
    const e = this.drain * this.L;
    if (e < 0.01) return this.tube.set([], [], []);
    const n = clamp(Math.ceil(e / 0.008), 2, 80);
    const pts = [], radii = [], cols = [];
    for (let i = 0; i < n; i++) {
      const s = (e * i) / (n - 1), d = e - s;
      pts.push(this.curve.getPointAt(Math.min(1, s / this.clen)));
      // 凹凸不平、像乳酪一樣的質地
      const bump = 0.5 * Math.sin(d * 55 + this.ph[0]) + 0.3 * Math.sin(d * 91 + this.ph[1]) + 0.2 * Math.sin(d * 143);
      radii.push(this.pasteR * (1 + 0.2 * bump) * (s < 0.04 ? 0.8 : 1));
      cols.push(this.cols.a.clone().lerp(this.cols.b, 0.5 + 0.5 * bump));
    }
    this.tube.set(pts, radii, cols);
  }

  update(dt, inp) {
    this.setPress(inp.loop ? 1 : 0, dt);
    if (!this.steamed) {
      if (this.press > 0.8 && !this.warned) {
        this.warned = true;
        this.toast('表皮還很硬，破不開。先按住「蒸臉」軟化角質吧！', ['護37', '補充']);
      }
    } else if (!this.done && this.advance(dt, 0.38)) {
      this.state = 'extruding';
      if (this.progress >= 0.12 && !this.opened) {
        // 薄薄的表皮被撐破
        this.opened = true;
        this.sfx.squelch(0.7);
        vibrate(20);
        this.fx.burst(this.world(this.local(0, this.patch.heightAt(0, 0), 0)), this.worldNormal(),
          { n: 6, speed: 0.25, spread: 0.8, size: 0.006, life: 0.4, color: '#f7f0de', gravity: 1 });
      }
      this.drain = this.progress < 0.12 ? 0 : (this.progress - 0.12) / 0.88;
      this.drawPaste();
      if (this.opened) this.squish(dt, 0.2);
      if (this.progress >= 1) {
        this.residual = 0.3;
        this.sfx.squelch(1);
        this.residues.push(this.tube.group);
        this.complete();
      }
    }
    this.fade(dt);
  }

  height(x, z, r) {
    let h = this.domeH * (1 - 0.7 * this.drain) * Math.exp(-((r / this.domeR) ** 2)) + this.pressShape(r);
    if (this.opened) h -= (0.008 + 0.01 * this.drain) * Math.exp(-((r / 0.022) ** 2));
    return h;
  }

  tint(x, z, r, out) {
    // 表皮底下透出來的白色，加壓時更白
    const w = (0.45 + 0.35 * this.press) * (1 - this.drain) * Math.exp(-((r / (this.domeR * 0.7)) ** 2));
    out.lerp(this.WHITE, w);
    if (this.opened) out.lerp(this.PIT, 0.6 * Math.exp(-((r / 0.022) ** 2)));
    out.lerp(this.RED, this.residual * Math.exp(-((r / 0.2) ** 2)));
    this.pressTint(r, out);
  }

  stage() {
    if (this.state === 'clean') return '乾淨了 ✨ 換下一顆吧';
    if (this.done) return '清乾淨了！用化妝棉擦一擦';
    if (!this.steamed) return '先按住「蒸臉」，軟化蓋在上面的角質';
    if (!this.opened) return this.press > 0.55 ? '表皮繃緊了…' : '用粉刺棒慢慢加壓';
    return '白白的出來了～';
  }
}

// ---------------- 閉鎖性粉刺（閉口） ----------------
// 膚色的小凸起，表面被角質封住、看不到開口。蒸臉軟化後要先用挑針淺淺挑開，粉刺棒才壓得出來。

class Closed extends Whitehead {
  constructor(ctx) {
    super(ctx);
    const r = this.rand;
    this.kind = 'closed';
    this.loopR = 0.22;
    this.domeR = 0.09 + r() * 0.02;
    this.domeH = 0.07 + r() * 0.02;
    this.L = Math.min(0.15 + r() * 0.08, this.clen * 0.95);
    this.pasteR = 0.021;
    this.needleT = 0;
    this.pricking = false;
    this.bled = false;
    this.pressT = 0;
    // 不是白色，只是比周圍膚色亮一點點
    this.PALE = new THREE.Vector3(1.07, 1.05, 1.02);
    this.cols = { a: C('#f5eed9'), b: C('#e2d2a4') };
    this.bead = new THREE.Mesh(ball, glossy('#9e1528'));
    this.bead.visible = false;
    this.bead.castShadow = true;
    this.bead.scale.setScalar(0.001);
    this.group.add(this.bead);
  }

  wipeHint() {
    if (!this.steamed) return '還沒清呢，先蒸臉再挑開～';
    return this.opened ? super.wipeHint() : '還沒開口呢，先用挑針挑開～';
  }

  open() {
    this.opened = true;
    this.dirty = true;
    this.sfx.squelch(0.4);
    vibrate(15);
    this.fx.burst(this.world(this.local(0, this.patch.heightAt(0, 0), 0)), this.worldNormal(),
      { n: 4, speed: 0.15, spread: 0.9, size: 0.004, life: 0.35, color: '#f3e6cf', gravity: 1 });
    this.onOpened?.();
  }

  bleed() {
    this.bled = true;
    this.residual = Math.max(this.residual, 0.55);
    this.dirty = true;
    this.sfx.ouch();
    vibrate([40, 30, 40]);
    this.residues.push(this.bead);
    this.toast('挑太深了，流血了！挑針只要斜斜挑開最表面的角質，刺進真皮會出血、留疤。', ['補充']);
  }

  update(dt, inp) {
    this.setPress(inp.loop ? 1 : 0, dt);
    this.pricking = inp.needle && this.steamed && !this.done;
    if (inp.needle && !this.steamed && !this.warned) {
      this.warned = true;
      this.toast('角質還很硬，挑不開。先按住「蒸臉」軟化吧！', ['護37', '補充']);
    }
    // 挑針：按住一下就挑開，一直按著不放會越刺越深
    if (this.pricking) {
      this.needleT += dt;
      if (!this.opened && this.needleT >= 0.5) this.open();
      if (this.opened && !this.bled && this.needleT >= 1.8) this.bleed();
    } else {
      this.needleT = 0;
    }

    if (this.opened && this.steamed && !this.done) {
      if (this.advance(dt, 0.4)) {
        this.state = 'extruding';
        this.drain = this.progress;
        this.drawPaste();
        this.squish(dt, 0.18);
        if (this.progress >= 1) {
          this.residual = Math.max(this.residual, 0.25);
          this.sfx.squelch(1);
          this.residues.push(this.tube.group);
          this.complete();
        }
      }
    } else if (!this.done && this.press > 0.8) {
      // 沒有開口硬壓：什麼都出不來，皮膚只會被壓紅
      if ((this.pressT += dt) >= 1.2) {
        this.pressT = 0;
        this.residual = Math.min(0.7, this.residual + 0.22);
        this.dirty = true;
        this.sfx.ouch();
        vibrate([40, 30, 40]);
        this.toast(this.steamed
          ? '表面沒有開口，內容物出不來，反而把皮膚壓紅了。先用挑針挑個小開口！'
          : '角質還硬、也沒有開口，壓不出來。先蒸臉，再用挑針挑開！', ['補充']);
      }
    } else {
      this.pressT = 0;
    }

    // 血珠慢慢冒出來
    if (this.bled && this.bead.scale.x < 0.011) {
      const s = Math.min(0.011, this.bead.scale.x + dt * 0.02);
      this.bead.visible = true;
      this.bead.scale.set(s, s * 0.6, s);
      this.bead.position.set(0.018, this.patch.heightAt(0.018, 0.012) + s * 0.25, 0.012);
    }
    this.fade(dt);
  }

  get meter() {
    if (!this.opened) return Math.min(1, this.needleT / 0.5);
    return this.progress;
  }

  height(x, z, r) {
    let h = this.domeH * (1 - 0.75 * this.drain) * Math.exp(-((r / this.domeR) ** 2)) + this.pressShape(r);
    if (this.opened) h -= (0.012 + 0.01 * this.drain) * Math.exp(-((r / 0.032) ** 2));
    return h;
  }

  tint(x, z, r, out) {
    out.lerp(this.PALE, (0.5 + 0.3 * this.press) * (1 - this.drain) * Math.exp(-((r / (this.domeR * 0.7)) ** 2)));
    if (this.opened) {
      // 挑開的小口：一圈暗暗的破口，中間露出一點白色硬芯
      out.lerp(this.PIT, 0.85 * Math.exp(-((r / 0.036) ** 2)));
      out.lerp(this.WHITE, 0.7 * (1 - this.drain) * Math.exp(-((r / 0.017) ** 2)));
    }
    out.lerp(this.RED, this.residual * Math.exp(-((r / 0.19) ** 2)));
    this.pressTint(r, out);
  }

  stage() {
    if (this.state === 'clean') return '乾淨了 ✨ 換下一顆吧';
    if (this.done) return '清乾淨了！用化妝棉擦一擦';
    if (!this.steamed) return '先按住「蒸臉」，軟化封住開口的角質';
    if (!this.opened) return this.pricking ? '斜斜挑開最表面…' : '換「挑針」，在頂端挑一個小開口';
    if (this.pricking) return this.bled ? '流血了！快放開挑針' : '開口了，可以放開了';
    if (this.state !== 'extruding') return this.bled ? '有點出血…換粉刺棒輕輕壓' : '開口了！換粉刺棒慢慢加壓';
    return this.press > 0.55 ? '小小的白色硬芯出來了～' : '再用力一點…';
  }
}

// ---------------- 膿皰 ----------------

class Pustule extends Lesion {
  constructor(ctx) {
    super(ctx);
    const r = this.rand;
    this.kind = 'pustule';
    this.demo = true;
    this.loopR = 0.3;
    this.bulge = 0.03;
    this.baseR = 0.2;
    this.baseH = 0.07 + r() * 0.02;
    this.headR = 0.07 + r() * 0.02;
    this.headH = 0.04;
    this.burst = false;
    this.drain = 0;
    this.residual = 0.7;
    this.residualFloor = 0.45;
    this.ph = r() * 10;
    this.side = (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.25); // 斜斜往下流，從鏡頭才看得出在流
    this.PUS = this.mul('#f0d98c');
    this.WHITE = this.mul('#fbf3d8');
    this.CRATER = this.mul('#86302c');
    this.cols = { pus: C('#ead07a'), pus2: C('#d9bd57'), serum: C('#fff3c8'), blood: C('#9e1528') };

    this.ooze = new DynTube(60, 14, pusMat());
    this.serum = new DynTube(50, 10, serumMat());
    this.pool = new THREE.Mesh(hemi, glossy('#ead07a'));
    this.blood = new THREE.Mesh(ball, glossy('#9e1528'));
    this.pool.visible = this.blood.visible = false;
    this.pool.castShadow = this.blood.castShadow = true;
    this.group.add(this.ooze.group, this.serum.group, this.pool, this.blood);
  }

  // 沿著皮膚斜斜往下坡（+z）流的一條液體
  flow(tube, len, r0, r1, xoff, col, wob) {
    if (len < 0.01) return tube.set([], [], []);
    const n = clamp(Math.ceil(len / 0.01), 2, tube.max);
    const pts = [], radii = [], cols = [];
    for (let i = 0; i < n; i++) {
      const s = (len * i) / (n - 1);
      const x = xoff + Math.sin(s * 9 + this.ph) * wob + s * this.side;
      const z = s * 0.85;
      // 前端積成一顆往下垂的液滴
      const t = s / len;
      const rad = lerp(r0, r1, Math.min(1, s / Math.max(len, 0.15))) + r1 * 0.7 * Math.exp(-(((1 - t) / 0.12) ** 2));
      // 液體貼著皮膚流，大半截埋在表面下，看起來是扁扁的一道
      pts.push(new THREE.Vector3(x, this.patch.heightAt(x, z) + rad * 0.2, z));
      radii.push(rad);
      cols.push(col(s));
    }
    tube.set(pts, radii, cols);
  }

  update(dt, inp) {
    this.setPress(inp.loop ? 1 : 0, dt);
    if (!this.done && this.advance(dt, 0.42)) {
      this.state = 'extruding';
      if (this.progress >= 0.3 && !this.burst) {
        this.burst = true;
        const p = this.world(this.local(0, this.patch.heightAt(0, 0) + 0.02, 0)), n = this.worldNormal();
        this.fx.squirt(p, n);
        this.fx.burst(p, n, { n: 10, speed: 0.7, spread: 0.4, size: 0.007, life: 0.45, color: '#efd68a', stretch: 2.6, gravity: 1.5 });
        this.sfx.squirt();
        vibrate(40);
        this.fx.shake = Math.max(this.fx.shake, 0.02);
      }
      this.drain = clamp((this.progress - 0.3) / 0.7, 0, 1);
      if (this.burst) this.squish(dt, 0.3);
      if (this.progress >= 1) {
        this.residues.push(this.ooze.group, this.serum.group, this.pool, this.blood);
        this.sfx.squelch(0.8);
        this.complete();
      }
    }
    if (this.burst) this.drawFluids();
    this.fade(dt);
  }

  drawFluids() {
    const d = this.drain;
    const hc = this.patch.heightAt(0, 0);
    // 膿：先在破口積成一小灘，再沿著皮膚往下流
    const { pus, pus2, serum, blood } = this.cols;
    this.flow(this.ooze, easeOut(d) * 0.22, 0.026, 0.013, 0, (s) => pus.clone().lerp(pus2, 0.5 + 0.5 * Math.sin(s * 30)), 0.008);
    this.pool.visible = true;
    const ps = 0.028 + 0.02 * Math.sin(Math.min(1, d * 1.6) * Math.PI * 0.5) * (1 - 0.35 * d);
    this.pool.scale.set(ps, ps * 0.55, ps);
    this.pool.position.set(0, hc - 0.004, 0);
    // 後面跟著透明的組織液
    const sd = clamp((this.progress - 0.7) / 0.3, 0, 1);
    this.flow(this.serum, sd * 0.24, 0.011, 0.007, 0.03, () => serum, 0.005);
    // 最後滲出一點血
    const bd = clamp((this.progress - 0.9) / 0.1, 0, 1);
    this.blood.visible = bd > 0;
    // 血珠冒在破口靠上坡那一側，才不會被膿蓋住
    const bs = 0.005 + 0.022 * bd;
    this.blood.scale.set(bs, bs * 0.55, bs);
    this.blood.position.set(-this.side * 0.03, this.patch.heightAt(-this.side * 0.03, -0.035) + bs * 0.3, -0.035);
    this.blood.material.color.copy(blood);
  }

  height(x, z, r) {
    const tight = 1 + 0.6 * this.press * (1 - this.drain);
    let h = this.baseH * (1 - 0.35 * this.drain) * Math.exp(-((r / this.baseR) ** 2))
      + this.headH * (1 - this.drain) * tight * Math.exp(-((r / this.headR) ** 2))
      + this.pressShape(r);
    if (this.burst) h -= 0.014 * this.drain * Math.exp(-((r / 0.045) ** 2));
    return h;
  }

  tint(x, z, r, out) {
    out.lerp(this.RED, this.residual * Math.exp(-((r / 0.27) ** 2)));
    const head = Math.exp(-((r / (this.headR * 0.85)) ** 2)) * (1 - this.drain);
    out.lerp(this.PUS, 0.9 * head);
    out.lerp(this.WHITE, 0.35 * this.press * head);
    if (this.burst) out.lerp(this.CRATER, 0.8 * this.drain * Math.exp(-((r / 0.045) ** 2)));
    this.pressTint(r, out);
  }

  stage() {
    if (this.state === 'clean') return '擦乾淨了。現實中化膿性痤瘡請轉介皮膚科';
    if (this.done) return '擠完了，還帶了點血。用化妝棉擦一擦';
    if (!this.burst) return this.state === 'idle' ? '示範：按住加壓，看看會發生什麼' : '膿頭越繃越緊…';
    if (this.progress < 0.7) return '噗！膿流出來了';
    return this.progress < 0.9 ? '後面跟著透明的組織液' : '最後滲出了一點血';
  }
}

// ---------------- 紅腫丘疹 ----------------

class Papule extends Lesion {
  constructor(ctx) {
    super(ctx);
    const r = this.rand;
    this.kind = 'papule';
    this.loopR = 0.32;
    this.bulge = 0.02;
    this.R = 0.22 + r() * 0.04;
    this.H = 0.11 + r() * 0.04;
    this.inflam = 0.8;
    this.spread = 1;
    this.swellK = 1;
    this.gel = 0;
    this.calmT = 0;
    this.sparkT = 0;
    this.residualFloor = 0;
    this.DEEP = this.mul('#b04a46');
    this.dollop = new THREE.Mesh(ball, glossy('#eef8ff', { transparent: true, opacity: 0.8 }));
    this.dollop.visible = false;
    this.dollop.castShadow = true;
    // 推開後的凝膠：一層貼著皮膚起伏的透明薄膜，邊緣淡出
    const fg = new THREE.PlaneGeometry(1, 1, 64, 64).rotateX(-Math.PI / 2);
    this.filmBase = Float32Array.from(fg.attributes.position.array);
    this.film = new THREE.Mesh(fg, glossy('#f2fbff', {
      transparent: true, opacity: 0, depthWrite: false, alphaMap: softEdge, roughness: 0.03,
    }));
    this.film.visible = false;
    this.film.renderOrder = 1;
    this.group.add(this.dollop, this.film);
  }

  update(dt, inp) {
    this.setPress(inp.loop ? 1 : 0, dt);
    // 硬擠：什麼都擠不出來，只會更紅更腫
    if (!this.done && this.advance(dt, 0.55) && this.progress >= 1) {
      this.progress = 0;
      this.inflam = Math.min(1, this.inflam + 0.2);
      this.spread += 0.25;
      this.swellK += 0.12;
      this.sfx.ouch();
      vibrate([40, 30, 40]);
      this.toast('什麼都沒出來，反而更紅更腫了。護理青春痘要著重清潔、消炎，不是擠壓！', ['護14']);
    }
    const top = this.patch.heightAt(0, 0);
    if (this.state === 'idle' || this.state === 'gelling') {
      if (inp.gel) {
        if (this.state === 'idle') this.sfx.cream();
        this.state = 'gelling';
        this.gel = Math.min(1, this.gel + dt / 1.2);
      } else if (this.state === 'gelling' && this.gel < 0.5) {
        this.gel = Math.max(0, this.gel - dt);
        if (this.gel === 0) this.state = 'idle';
      }
      if (this.gel >= 1 || (this.state === 'gelling' && !inp.gel && this.gel >= 0.5)) {
        this.state = 'spreading';
        this.calmT = 0;
      }
      // 一坨凝膠從上面擠下來
      this.dollop.visible = this.gel > 0;
      const s = 0.02 + 0.07 * easeOut(this.gel);
      this.dollop.scale.set(s, s * 0.75, s);
      this.dollop.position.set(0, top + s * 0.5, 0);
    } else if (this.state === 'spreading' || this.state === 'calming' || this.state === 'calm') {
      this.calmT += dt;
      // 一坨凝膠被推開：坨坨縮小，貼著皮膚的薄膜擴大，紅腫在底下慢慢消
      const k = easeOut(Math.min(1, this.calmT / 0.8));
      const s0 = 0.09 * (1 - k);
      this.dollop.visible = s0 > 0.004;
      this.dollop.scale.set(s0, s0 * 0.75, s0);
      this.dollop.position.set(0, top + s0 * 0.4, 0);
      this.film.visible = true;
      this.film.material.opacity = 0.32 * k;
      this.drawFilm(lerp(0.3, 1, k));
      if (this.state === 'spreading' && k >= 1) this.state = 'calming';
      if (this.state === 'calming') {
        const c = Math.min(1, (this.calmT - 0.8) / 5);
        this.inflam = lerp(this.inflam, 0.18, dt * 0.6);
        this.swellK = lerp(this.swellK, 0.55, dt * 0.5);
        this.spread = lerp(this.spread, 1, dt * 0.5);
        this.dirty = true;
        if ((this.sparkT -= dt) <= 0) {
          this.sparkT = 0.35;
          const a = this.rand() * Math.PI * 2, rr = this.rand() * this.R;
          const p = this.local(Math.cos(a) * rr, 0, Math.sin(a) * rr);
          p.y = this.patch.heightAt(p.x, p.z) + 0.01;
          this.fx.sparkle(this.world(p), this.worldNormal(), '#c8f3ff', 3);
        }
        if (c >= 1) {
          this.state = 'calm';
          this.done = true;
          this.onDone?.();
        }
      }
    }
  }

  drawFilm(k) {
    const span = this.R * 2.8 * k;
    const P = this.film.geometry.attributes.position, B = this.filmBase;
    for (let i = 0; i < P.count; i++) {
      const x = B[i * 3] * span, z = B[i * 3 + 2] * span;
      P.setXYZ(i, x, this.patch.heightAt(x, z) + 0.004, z);
    }
    P.needsUpdate = true;
    this.film.geometry.computeVertexNormals();
  }

  get meter() {
    if (this.state === 'gelling') return this.gel;
    if (this.state === 'idle') return this.progress;
    return Math.min(1, this.calmT / 5.8);
  }

  height(x, z, r) {
    const R = this.R * Math.sqrt(this.spread);
    return this.H * this.swellK * Math.exp(-((r / R) ** 2)) + this.pressShape(r) * 0.7;
  }

  tint(x, z, r, out) {
    out.lerp(this.RED, this.inflam * Math.exp(-((r / (0.3 * this.spread)) ** 2)));
    out.lerp(this.DEEP, 0.25 * this.inflam * Math.exp(-((r / (this.R * 0.5)) ** 2)));
    this.pressTint(r, out);
  }

  stage() {
    if (this.state === 'calm') return '紅腫退下去了 ✨ 換下一顆吧';
    if (this.state === 'calming' || this.state === 'spreading') return '涼涼的…紅腫慢慢退了';
    if (this.state === 'gelling') return '擠一坨消炎凝膠上去…';
    return '紅腫丘疹裡沒有東西可擠。試試消炎凝膠';
  }
}
