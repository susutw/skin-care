import * as THREE from 'three';
import { easeOut, lerp } from './util.js';

// 按住時出現在粉刺上的工具模型（掛在粉刺的局部座標上，Y 軸 = 皮膚法線）
export class ToolRig {
  constructor() {
    this.groups = { squeeze: makeExtractor(), refer: makeReferCard(), gel: makeGel() };
    this.cur = null;
  }

  attach(tool, pimple) {
    this.detach();
    const g = this.groups[tool];
    pimple.group.add(g);
    this.cur = { tool, g, pimple };
    this.update(0);
  }

  // 預先編譯工具材質，避免第一次使用時卡頓
  warmUp(renderer, scene, camera) {
    const gs = Object.values(this.groups);
    scene.add(...gs);
    renderer.compile(scene, camera);
    scene.remove(...gs);
  }

  detach() {
    if (!this.cur) return;
    this.cur.g.parent?.remove(this.cur.g);
    this.cur = null;
  }

  update(k) {
    if (!this.cur) return;
    const { tool, g, pimple } = this.cur;
    const { r, h } = pimple.spec;
    if (tool === 'squeeze') {
      // 圓圈套住粉刺往下壓，越壓越深
      const R = r * 1.7;
      g.userData.loop.scale.setScalar(R);
      g.userData.arm.position.x = -R;
      g.position.y = lerp(0.12, 0.002, easeOut(Math.min(1, k * 3))) - k * 0.004;
    } else if (tool === 'refer') {
      // 轉介單飄到痘痘上方，不碰皮膚
      g.position.y = lerp(0.25, h + 0.06, easeOut(Math.min(1, k * 2)));
      g.rotation.y = (1 - k) * 0.8;
    } else if (tool === 'gel') {
      g.position.y = h * 0.8;
      g.scale.setScalar(Math.max(0.001, easeOut(k)));
    }
  }
}

// 粉刺棒：前端一個小金屬圈，斜斜接一根把手
function makeExtractor() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#dfe4ea', metalness: 0.9, roughness: 0.18 });
  const loop = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 10, 40).rotateX(Math.PI / 2), steel);
  const arm = new THREE.Group();
  arm.rotation.z = 0.7;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.08, 8), steel);
  stem.position.y = 0.04;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 16),
    new THREE.MeshStandardMaterial({ color: '#f4a7b9', roughness: 0.4 }));
  handle.position.y = 0.16;
  arm.add(stem, handle);
  g.add(loop, arm);
  g.userData = { loop, arm };
  return g;
}

// 轉介單：一張印著紅十字的小卡
function makeReferCard() {
  const g = new THREE.Group();
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.004, 0.08),
    new THREE.MeshStandardMaterial({ color: '#f7fbff', roughness: 0.6 }));
  const red = new THREE.MeshStandardMaterial({ color: '#e5484d', roughness: 0.5 });
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.01), red);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.005, 0.03), red);
  bar1.position.y = bar2.position.y = 0.001;
  g.add(card, bar1, bar2);
  return g;
}

function makeGel() {
  const g = new THREE.Group();
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14),
    new THREE.MeshPhysicalMaterial({ color: '#f4fbff', roughness: 0.25, clearcoat: 1 }));
  blob.scale.y = 0.55;
  g.add(blob);
  return g;
}
