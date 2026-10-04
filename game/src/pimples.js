import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const hemiGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
const ballGeo = new THREE.SphereGeometry(1, 16, 12);
const discGeo = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
const hitGeo = new THREE.SphereGeometry(1, 10, 8);
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

export function radialTexture(rgb) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.45, `rgba(${rgb},0.7)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const haloTex = radialTexture('214,72,72');

export const SPEC = {
  blackhead: { r: 0.03, h: 0.011, top: { c: '#2b1c13', s: 0.75, y: 0.5 }, halo: 0, hit: 0.075 },
  whitehead: { r: 0.038, h: 0.03, top: { c: '#fff4e0', s: 0.42, y: 0.85 }, halo: 0, hit: 0.08 },
  papule: { r: 0.055, h: 0.036, color: '#d9655e', halo: 0.55, haloR: 2.1, hit: 0.09 },
  pustule: { r: 0.05, h: 0.034, color: '#d86c60', top: { c: '#fff1b8', s: 0.5, y: 0.8 }, halo: 0.5, haloR: 2.0, hit: 0.085 },
};

const ZONES = {
  forehead: { x: 0, y: 0.52, rx: 0.42, ry: 0.12 },
  nose: { x: 0, y: -0.08, rx: 0.1, ry: 0.14 },
  cheekL: { x: -0.45, y: -0.2, rx: 0.17, ry: 0.16 },
  cheekR: { x: 0.45, y: -0.2, rx: 0.17, ry: 0.16 },
  chin: { x: 0, y: -0.74, rx: 0.2, ry: 0.1 },
  jawL: { x: -0.5, y: -0.55, rx: 0.14, ry: 0.12 },
  jawR: { x: 0.5, y: -0.55, rx: 0.14, ry: 0.12 },
};
const ZONE_ALIAS = { cheeks: ['cheekL', 'cheekR'], jaw: ['jawL', 'jawR'] };

// 從正面往臉上打射線找位置；被眼睛、頭髮等擋住或太斜的點不要
export function placePimples(rand, acne, occluders) {
  const ray = new THREE.Raycaster();
  const dir = new THREE.Vector3(0, 0, -1);
  const nm = new THREE.Matrix3();
  const out = [];
  for (const { type, n, zones } of acne) {
    const zl = zones.flatMap((z) => ZONE_ALIAS[z] || [z]);
    let placed = 0;
    for (let tries = 0; placed < n && tries < 800; tries++) {
      const z = ZONES[zl[Math.floor(rand() * zl.length)]];
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand());
      ray.set(new THREE.Vector3(z.x + Math.cos(a) * rr * z.rx, z.y + Math.sin(a) * rr * z.ry, 5), dir);
      const hit = ray.intersectObjects(occluders, false)[0];
      if (!hit?.object.userData.skin) continue;
      const normal = hit.face.normal.clone().applyMatrix3(nm.getNormalMatrix(hit.object.matrixWorld)).normalize();
      if (normal.z < 0.2) continue;
      const r = SPEC[type].r;
      if (out.some((o) => o.point.distanceTo(hit.point) < r + SPEC[o.type].r + 0.035)) continue;
      out.push({ type, point: hit.point.clone(), normal });
      placed++;
    }
  }
  return out;
}

export class Pimple {
  constructor(type, point, normal, tone) {
    this.point = point.clone();
    this.normal = normal.clone();
    this.tone = new THREE.Color(tone);
    this.group = new THREE.Group();
    this.group.position.copy(point);
    this.group.quaternion.setFromUnitVectors(UP, normal);
    this.softened = false;
    this.done = false;
    this.damage = 0;
    this.swell = 1;
    this.pressure = 0;
    this.squeezing = false;
    this.shape = 1;        // 擠完後塌陷：1 → shapeTo
    this.shapeTo = 1;
    this.residual = 0;     // 擠完留下的紅暈，會慢慢消退
    this.residualFloor = 0;
    this.drain = 0;        // 膿皰破掉後膿流出，鼓包跟著消下去
    this.build(type);
  }

  build(type) {
    if (this.vis) {
      this.group.remove(this.vis, this.halo, this.hit);
      this.vis.traverse((o) => o.isMesh && o.material.dispose());
      this.halo.material.dispose();
    }
    const s = SPEC[type];
    this.type = type;
    this.spec = s;
    this.vis = new THREE.Group();
    const baseColor = s.color ? new THREE.Color(s.color)
      : type === 'whitehead' ? this.tone.clone().lerp(new THREE.Color('#ffffff'), 0.3)
      : this.tone.clone().multiplyScalar(0.86);
    const matte = type === 'blackhead';
    this.bumpMat = new THREE.MeshPhysicalMaterial({
      color: baseColor, roughness: matte ? 0.65 : 0.45, clearcoat: matte ? 0 : 0.3, clearcoatRoughness: 0.4,
    });
    const bump = new THREE.Mesh(hemiGeo, this.bumpMat);
    bump.scale.set(s.r, s.h, s.r);
    this.vis.add(bump);
    this.topMat = null;
    this.top = null;
    if (s.top) {
      this.topMat = new THREE.MeshPhysicalMaterial({ color: s.top.c, roughness: 0.35, clearcoat: 0.5 });
      const top = new THREE.Mesh(ballGeo, this.topMat);
      top.scale.set(s.r * s.top.s, s.r * s.top.s * 0.6, s.r * s.top.s);
      top.position.y = s.h * s.top.y;
      this.vis.add(top);
      this.top = top;
      this.topBase = top.scale.clone();
    }
    this.halo = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({
      map: haloTex, transparent: true, depthWrite: false, opacity: s.halo,
      polygonOffset: true, polygonOffsetFactor: -2,
    }));
    this.halo.scale.setScalar(s.r * (s.haloR || 2.2));
    this.halo.position.y = 0.002;
    this.hit = new THREE.Mesh(hitGeo, hitMat);
    this.hit.scale.setScalar(s.hit);
    this.hit.userData.pimple = this;
    this.group.add(this.vis, this.halo, this.hit);
  }

  worldPoint(v = new THREE.Vector3()) {
    return this.group.getWorldPosition(v).addScaledVector(this.worldNormal(), this.spec.h);
  }

  worldNormal(v = new THREE.Vector3()) {
    return v.copy(this.normal).transformDirection(this.group.parent.matrixWorld);
  }

  soften() {
    this.softened = true;
    this.topMat?.color.set('#ffffff');
    this.bumpMat.roughness = 0.15;
    this.bumpMat.clearcoat = 0.9;
    this.swell = 1.12;
  }

  // 已轉介皮膚科：不動它，在旁邊圈一個藍色記號
  refer() {
    this.done = true;
    this.residual = this.residualFloor = this.spec.halo;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(this.spec.r * 2.3, 0.0035, 6, 40).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#4c9bf0' }));
    ring.position.y = 0.004;
    this.group.add(ring);
  }

  inflameTo(type) {
    this.build(type);
    this.softened = false;
    this.swell = 1.15;
  }

  // 膿頭破掉的那一刻
  burst() {
    if (this.top) this.top.visible = false;
  }

  // 清乾淨了：鼓包塌下去，留下毛孔或小傷口和一圈紅暈
  popOut() {
    this.done = true;
    if (this.top) this.top.visible = false;
    const after = { blackhead: [0.12, 0.3, 0.06], whitehead: [0.25, 0.4, 0.1], pustule: [0.3, 0.6, 0.18] }[this.type];
    [this.shapeTo, this.residual, this.residualFloor] = after;
    this.bumpMat.color.lerp(new THREE.Color('#d9776d'), this.type === 'blackhead' ? 0.25 : 0.5);
    if (this.type === 'pustule' && Math.random() < 0.5) {
      // 擠膿皰有時會帶一點血，現實中記得消毒
      const drop = new THREE.Mesh(ballGeo, new THREE.MeshPhysicalMaterial({ color: '#a3142a', roughness: 0.15, clearcoat: 1 }));
      drop.scale.set(0.006, 0.004, 0.006);
      drop.position.y = this.spec.h * 0.25;
      this.group.add(drop);
    }
  }

  // 鎮定：紅腫不會馬上消，但會退一點，表面多一層凝膠光澤
  calm() {
    this.done = true;
    this.shapeTo = 0.85;
    this.residual = this.spec.halo * 0.5;
    this.residualFloor = this.spec.halo * 0.35;
    this.spec = { ...this.spec, halo: 0 };
    const gel = new THREE.Mesh(hemiGeo, new THREE.MeshPhysicalMaterial({
      color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05, clearcoat: 1,
    }));
    gel.scale.set(this.spec.r * 1.6, this.spec.h * 1.4, this.spec.r * 1.6);
    this.vis.add(gel);
  }

  update(dt) {
    this.shape += (this.shapeTo - this.shape) * Math.min(1, dt * 8);
    if (this.residual > this.residualFloor) this.residual = Math.max(this.residualFloor, this.residual - dt * 0.04);
    let s = this.swell * this.shape * (1 - this.drain * 0.45), sx = 1, sy = 1;
    let halo = this.done ? this.residual : this.spec.halo;
    const p = this.pressure;
    if (this.squeezing) {
      sx = 1 - p * 0.12;
      sy = 1 + p * 1.1;
      halo += p * 0.45;
    }
    // 擠壓時膿頭 / 白頭被撐大、繃緊
    if (this.top) this.top.scale.copy(this.topBase).multiplyScalar(this.squeezing ? 1 + p * 0.35 : 1);
    this.vis.scale.set(s * sx, s * sy, s * sx);
    this.halo.material.opacity = Math.min(0.9, halo);
  }
}
