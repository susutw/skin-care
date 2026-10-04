import * as THREE from 'three';
import { easeOut } from './util.js';

// 擠出過程：先蓄壓（皮膚鼓起），過了臨界點後內容物才慢慢出來
//   黑頭 / 白頭：一條皮脂從毛孔擠出、捲曲，最後斷開掉落
//   膿皰：「噗」地噴出膿滴，接著膿液慢慢冒出來
// 全部掛在粉刺的局部座標（Y 軸 = 皮膚法線）

const SEGS = 48, RAD = 10;
const ball = new THREE.SphereGeometry(1, 16, 12);
const hemi = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);

const PLUG = {
  // 黑頭：細長、蠟狀米黃色，最前端氧化變黑
  blackhead: { color: '#eadcae', tip: '#2e2117', r: 0.0085, len: 0.1, curl: 0.06, build: 0.4 },
  // 白頭：短而粗的白色軟膏，比較容易彎
  whitehead: { color: '#f6eed8', tip: '#f8f0dc', r: 0.0105, len: 0.06, curl: 0.045, build: 0.45 },
};
const PUS_BUILD = 0.6;

const sebum = (color) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'),
});

export class Extraction {
  constructor(pimple, fx, sfx) {
    this.p = pimple;
    this.fx = fx;
    this.sfx = sfx;
    this.group = new THREE.Group();
    pimple.group.add(this.group);
    if (pimple.type === 'pustule') this.buildPus();
    else this.buildPlug(PLUG[pimple.type]);
  }

  buildPlug(L) {
    this.look = L;
    const a = Math.random() * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    const y0 = this.p.spec.h * 0.5;
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const bend = Math.sin(t * Math.PI * 0.5) ** 2 * L.curl * (1 + t);
      const wob = Math.sin(t * 9 + a) * L.r * 0.25;
      pts.push(new THREE.Vector3(dx * bend - dz * wob, y0 + t * L.len, dz * bend + dx * wob));
    }
    this.curve = new THREE.CatmullRomCurve3(pts);
    this.geo = new THREE.TubeGeometry(this.curve, SEGS, L.r, RAD, false);
    this.geo.setDrawRange(0, 0);
    this.tube = new THREE.Mesh(this.geo, sebum(L.color));
    this.cap = new THREE.Mesh(ball, sebum(L.tip));
    this.cap.scale.setScalar(L.r * 1.08);
    this.cap.visible = false;
    this.group.add(this.tube, this.cap);
  }

  buildPus() {
    this.burst = false;
    this.ooze = new THREE.Mesh(hemi, new THREE.MeshPhysicalMaterial({
      color: '#f3e2a0', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12,
    }));
    this.ooze.position.y = this.p.spec.h * 0.9;
    this.ooze.visible = false;
    this.group.add(this.ooze);
  }

  update(k) {
    if (this.ooze) return this.updatePus(k);
    const e = Math.max(0, (k - this.look.build) / (1 - this.look.build));
    // 一開始出來得快，越後面越慢（越擠越緊）
    const n = Math.round(Math.pow(e, 0.8) * SEGS);
    this.geo.setDrawRange(0, n * RAD * 6);
    this.cap.visible = n > 0;
    if (n > 0) this.cap.position.copy(this.curve.getPointAt(n / SEGS));
    if (n > 0 && !this.started) {
      this.started = true;
      this.sfx.squelch(0.5);
    }
  }

  updatePus(k) {
    const e = Math.max(0, (k - PUS_BUILD) / (1 - PUS_BUILD));
    if (e > 0 && !this.burst) {
      this.burst = true;
      this.fx.squirt(this.p.worldPoint(), this.p.worldNormal());
      this.sfx.squirt();
      this.p.burst();
    }
    this.p.drain = easeOut(e);
    this.ooze.visible = e > 0;
    // 膿從鼓包頂端冒出來：跟著（被擠高、又慢慢消下去的）鼓包頂端走
    const p = this.p;
    this.ooze.position.y = p.spec.h * p.swell * p.shape * (1 + k * 1.1) * (1 - p.drain * 0.45) * 0.92;
    const s = 0.012 + easeOut(e) * 0.025;
    this.ooze.scale.set(s, s * 0.7, s);
  }

  // 擠完：內容物離開皮膚（交給 FX 掉落、淡出）
  finish() {
    const n = this.p.worldNormal();
    this.fx.scene.attach(this.group);
    if (this.ooze) {
      // 膿液留在皮膚上，像被棉片擦掉一樣慢慢縮小
      this.fx.adopt(this.group, n.multiplyScalar(0), { gravity: 0, life: 1.2 });
    } else {
      this.fx.adopt(this.group, n.multiplyScalar(0.3).add(new THREE.Vector3(0, 0.15, 0)), { gravity: 1.6, life: 1.4, spin: 1.5 });
    }
  }

  cancel() {
    this.group.parent?.remove(this.group);
    this.group.traverse((o) => o.isMesh && o.material.dispose());
    this.geo?.dispose();
  }
}
