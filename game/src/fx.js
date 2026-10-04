import * as THREE from 'three';
import { radialTexture } from './pimples.js';

const sphere = new THREE.SphereGeometry(1, 8, 6);
const octa = new THREE.OctahedronGeometry(1);
const markTex = { red: radialTexture('200,60,66'), pore: radialTexture('190,110,110') };
const mistTex = radialTexture('255,255,255');
const decalGeo = new THREE.CircleGeometry(1, 32);
const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
    this.mats = new Map();
    this.shake = 0;
  }

  mat(color, basic) {
    const key = color + basic;
    if (!this.mats.has(key)) {
      this.mats.set(key, basic
        ? new THREE.MeshBasicMaterial({ color })
        : new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 1 }));
    }
    return this.mats.get(key);
  }

  spawn(pos, vel, o) {
    const m = new THREE.Mesh(o.geo || sphere, this.mat(o.color, o.basic));
    m.position.copy(pos);
    this.scene.add(m);
    this.parts.push({ m, vel, age: 0, life: o.life, size: o.size, g: o.gravity ?? 3, spin: o.spin || 0, stretch: o.stretch || 1 });
    this.update(0);
  }

  // 把現成的物件（例如擠出來的皮脂）交給 FX：受重力掉落，最後一段時間才縮小消失
  adopt(obj, vel, o) {
    this.parts.push({ m: obj, vel, age: 0, life: o.life, size: obj.scale.x, g: o.gravity, spin: o.spin || 0, stretch: 1, late: true, own: true });
  }

  burst(pos, normal, o) {
    for (let i = 0; i < o.n; i++) {
      const dir = normal.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(o.spread)).normalize();
      this.spawn(pos, dir.multiplyScalar(o.speed * (0.5 + Math.random())), { ...o, size: o.size * (0.6 + Math.random() * 0.8) });
    }
  }

  // 膿皰破掉：幾道細長的膿滴往外噴，加上細小飛沫
  squirt(pos, normal) {
    this.burst(pos, normal, { n: 8, speed: 0.5, spread: 0.45, size: 0.006, life: 0.35, color: '#f1dc94', stretch: 2.6, gravity: 1.2 });
    this.burst(pos, normal, { n: 6, speed: 0.25, spread: 0.9, size: 0.004, life: 0.3, color: '#f6ecc4', gravity: 1 });
    this.shake = Math.max(this.shake, 0.014);
  }

  steam(pos, normal) {
    this.burst(pos, normal, { n: 10, speed: 0.25, spread: 0.6, size: 0.03, life: 1.1, color: '#ffffff', basic: true, gravity: -0.5 });
  }

  // 蒸臉：從畫面右側飄過臉前的霧氣
  mist() {
    const pos = new THREE.Vector3(0.9 + Math.random() * 0.3, -0.5 + Math.random() * 1.2, 0.95 + Math.random() * 0.25);
    const vel = new THREE.Vector3(-0.45 - Math.random() * 0.3, 0.08 + Math.random() * 0.1, 0);
    const m = new THREE.Sprite(this.mistMat || (this.mistMat = new THREE.SpriteMaterial({
      map: mistTex, transparent: true, opacity: 0.32, depthWrite: false,
    })));
    m.position.copy(pos);
    this.scene.add(m);
    this.parts.push({ m, vel, age: 0, life: 3.2, size: 0.18 + Math.random() * 0.16, g: -0.02, spin: 0, stretch: 1, grow: true });
  }

  // 任意位置的一團柔和霧氣（近距離模式的蒸臉用）
  puff(pos, vel, size, life) {
    const m = new THREE.Sprite(this.puffMat || (this.puffMat = new THREE.SpriteMaterial({
      map: mistTex, transparent: true, opacity: 0.5, depthWrite: false,
    })));
    m.position.copy(pos);
    this.scene.add(m);
    this.parts.push({ m, vel, age: 0, life, size, g: -0.02, spin: 0, stretch: 1, grow: true });
  }

  sparkle(pos, normal, color, n) {
    this.burst(pos, normal, { n, speed: 0.5, spread: 1, size: 0.014, life: 0.8, color, basic: true, geo: octa, gravity: 0.3, spin: 6 });
  }

  // 紅印、毛孔痕跡：貼在臉的局部座標上，跟著頭轉
  addMark(parent, point, normal, r, opacity, kind) {
    const m = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({
      map: markTex[kind], transparent: true, opacity, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    }));
    m.position.copy(point).addScaledVector(normal, 0.003);
    m.quaternion.setFromUnitVectors(Z, normal);
    m.scale.setScalar(r);
    parent.add(m);
    return m;
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.remove(p);
        this.parts.splice(i, 1);
        continue;
      }
      p.vel.y -= p.g * dt;
      p.m.position.addScaledVector(p.vel, dt);
      if (p.spin) p.m.rotation.x += p.spin * dt;
      const r = p.age / p.life;
      const s = p.size * (p.grow ? 0.6 + r * 1.2 : p.late ? (r < 0.7 ? 1 : Math.sqrt((1 - r) / 0.3)) : Math.sqrt(1 - r));
      p.m.scale.set(s, s * p.stretch, s);
      if (p.stretch > 1) p.m.quaternion.setFromUnitVectors(Y, tmp.copy(p.vel).normalize());
    }
    this.shake = Math.max(0, this.shake - dt * Math.max(0.02, this.shake * 8));
  }

  remove(p) {
    this.scene.remove(p.m);
    if (p.own) p.m.traverse((o) => { if (o.isMesh) { o.material.dispose(); if (o.geometry.type === 'TubeGeometry') o.geometry.dispose(); } });
  }

  clear() {
    for (const p of this.parts) this.remove(p);
    this.parts.length = 0;
  }
}
