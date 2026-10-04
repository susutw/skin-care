import * as THREE from 'three';
import { makeSkinMaps } from './skin.js';

// 卡通頭部：把球體壓成鵝蛋臉，再加上五官、頭髮、身體
const HEAD_Y = 1.12;
const ray = new THREE.Raycaster();
const FWD = new THREE.Vector3(0, 0, -1);
const ball = new THREE.SphereGeometry(1, 32, 24);

export function deform(v) {
  const r = v.length();
  const x = v.x / r, y = v.y / r, z = v.z / r;
  let nx = x, ny = y * HEAD_Y, nz = z;
  if (y < 0) {
    const k = Math.pow(-y, 1.6);
    nx *= 1 - 0.22 * k;
    nz *= 1 - 0.08 * k;
  }
  nz *= z > 0 ? 0.93 : 0.97;
  v.set(nx * r, ny * r, nz * r);
}

function deformed(geo, extra) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    deform(v);
    extra?.(v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function mesh(geo, mat, scale, pos) {
  const m = new THREE.Mesh(geo, mat);
  if (scale) Array.isArray(scale) ? m.scale.set(...scale) : m.scale.setScalar(scale);
  if (pos) m.position.set(...pos);
  return m;
}

export function buildCustomer(c, seed) {
  const group = new THREE.Group();
  const maps = makeSkinMaps(c.skin, seed);
  const skinMat = new THREE.MeshPhysicalMaterial({
    map: maps.map, roughnessMap: maps.roughnessMap, roughness: 1,
    bumpMap: maps.bumpMap, bumpScale: 0.25, envMapIntensity: 0.5,
    sheen: 0.2, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffd9cc'),
    clearcoat: c.skin.oil * 0.2, clearcoatRoughness: 0.4,
  });
  const plainSkin = new THREE.MeshPhysicalMaterial({
    color: c.skin.tone, roughness: 0.6, sheen: 0.35, sheenColor: new THREE.Color('#ffd9cc'),
  });
  const hairMat = new THREE.MeshStandardMaterial({ color: c.hair.color, roughness: 0.55, side: THREE.DoubleSide });

  const head = new THREE.Mesh(deformed(new THREE.SphereGeometry(1, 128, 96)), skinMat);
  head.userData.skin = true;
  group.add(head);
  group.updateMatrixWorld(true);
  const surf = (x, y) => {
    ray.set(new THREE.Vector3(x, y, 5), FWD);
    return ray.intersectObject(head, false)[0]?.point.z ?? 0.8;
  };

  const nose = mesh(new THREE.SphereGeometry(1, 40, 30), skinMat, [0.12, 0.15, 0.13], [0, -0.08, surf(0, -0.08) - 0.03]);
  nose.userData.skin = true;
  group.add(nose);

  const ears = [-1, 1].map((s) => {
    const ear = mesh(ball, skinMat, [0.09, 0.2, 0.13], [s * 0.99, -0.02, -0.02]);
    ear.rotation.y = s * 0.3;
    group.add(ear);
    return ear;
  });

  // 眼睛
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
  const irisMat = new THREE.MeshStandardMaterial({ color: c.eye, roughness: 0.3 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: '#141014', roughness: 0.2 });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyes = [-1, 1].map((s) => {
    const eg = new THREE.Group();
    const ex = s * 0.3, ey = 0.07;
    eg.position.set(ex, ey, surf(ex, ey) - 0.02);
    eg.rotation.y = s * 0.18;
    eg.add(mesh(ball, white, [0.12, 0.13, 0.07]));
    eg.add(mesh(ball, irisMat, [0.068, 0.074, 0.03], [0, 0, 0.05]));
    eg.add(mesh(ball, pupilMat, [0.036, 0.04, 0.02], [0, 0, 0.068]));
    eg.add(mesh(ball, shine, 0.018, [0.022, 0.028, 0.082]));
    group.add(eg);
    return eg;
  });

  const browGeo = new THREE.CapsuleGeometry(0.024, 0.13, 4, 8).rotateZ(Math.PI / 2);
  const brows = [-1, 1].map((s) => {
    const b = mesh(browGeo, hairMat, null, [s * 0.3, 0.27, surf(s * 0.3, 0.27) + 0.005]);
    group.add(b);
    return b;
  });

  // 嘴巴：微笑 / 喊痛 / 平常
  const lipMat = new THREE.MeshStandardMaterial({ color: '#b5485a', roughness: 0.5 });
  const my = -0.46, mz = surf(0, my);
  const smile = mesh(new THREE.TorusGeometry(0.1, 0.02, 10, 24, Math.PI), lipMat, null, [0, my + 0.05, mz - 0.01]);
  smile.rotation.set(-0.15, 0, Math.PI);
  const ouch = mesh(ball, new THREE.MeshStandardMaterial({ color: '#5a1f2a', roughness: 0.6 }), [0.065, 0.08, 0.03], [0, my, mz]);
  const flat = mesh(new THREE.CapsuleGeometry(0.018, 0.1, 4, 8).rotateZ(Math.PI / 2), lipMat, null, [0, my, mz]);
  group.add(smile, ouch, flat);

  addHair(c.hair.style, group, hairMat, surf, ears);
  addHeadband(group);
  addBody(c, group, plainSkin);

  const occluders = [];
  group.traverse((o) => o.isMesh && occluders.push(o));

  // 表情
  let mood = 'neutral', moodT = 0, blinkT = 2 + Math.random() * 3, blink = 0, t = 0;
  function setExpression(m, dur = 1.3) { mood = m; moodT = dur; }
  function update(dt, holding) {
    t += dt;
    if (moodT > 0 && (moodT -= dt) <= 0) mood = 'neutral';
    if ((blinkT -= dt) < 0) { blink = 0.13; blinkT = 2 + Math.random() * 4; }
    if (blink > 0) blink -= dt;

    let eyeY = blink > 0 ? 0.1 : 1, browRot = 0, browY = 0;
    if (mood === 'happy') { eyeY = Math.min(eyeY, 0.35); browY = 0.025; }
    if (mood === 'calm') eyeY = 0.12;
    if (mood === 'ouch') { eyeY = 0.12; browRot = 0.32; browY = -0.01; }
    if (mood === 'tense') { eyeY = Math.min(eyeY, 0.6); browRot = 0.18; }
    smile.visible = mood === 'happy' || mood === 'calm';
    ouch.visible = mood === 'ouch' || mood === 'tense';
    flat.visible = !smile.visible && !ouch.visible;
    ouch.scale.y = mood === 'tense' ? 0.035 : 0.08;

    const k = Math.min(1, dt * 25);
    for (const e of eyes) e.scale.y += (eyeY - e.scale.y) * k;
    brows.forEach((b, i) => {
      const s = i ? -1 : 1;
      b.rotation.z += (s * browRot - b.rotation.z) * k;
      b.position.y += (0.27 + browY - b.position.y) * k;
    });
    if (!holding) {
      group.rotation.y = Math.sin(t * 0.6) * 0.035;
      group.rotation.x = Math.sin(t * 0.45) * 0.015;
    }
  }

  function dispose() {
    const mats = new Set();
    group.traverse((o) => {
      if (!o.isMesh) return;
      if (o.geometry !== ball) o.geometry.dispose();
      [].concat(o.material).forEach((m) => mats.add(m));
    });
    mats.forEach((m) => m.dispose());
    Object.values(maps).forEach((t) => t.dispose());
  }

  return { group, occluders, setExpression, update, dispose };
}

// 美容院的毛巾頭帶：沿著髮際線繞一圈，把頭髮往後收
function addHeadband(group) {
  const terry = new THREE.MeshStandardMaterial({ color: '#ffd6df', roughness: 1 });
  const band = new THREE.TorusGeometry(1.03, 0.085, 14, 96).rotateX(Math.PI / 2);
  band.translate(0, 0.16, 0);
  band.rotateX(-0.6);
  group.add(new THREE.Mesh(deformed(band), terry));
}

function addHair(style, group, mat, surf, ears) {
  // 帽狀頭髮往後傾，露出額頭；先轉再套用同樣的臉型變形，才會貼合頭形
  const cap = new THREE.SphereGeometry(1.07, 72, 36, 0, Math.PI * 2, 0, Math.PI * 0.47);
  cap.rotateX(-0.6);
  group.add(new THREE.Mesh(deformed(cap), mat));

  if (style === 'bun') {
    group.add(mesh(ball, mat, 0.3, [0, 1.12, -0.42]));
  }
  if (style === 'spiky') {
    const cone = new THREE.ConeGeometry(0.11, 0.32, 10);
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 14; i++) {
      const pol = 0.15 + (i % 3) * 0.22, az = (i / 14) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az));
      dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.35);
      const p = dir.clone().multiplyScalar(1.02);
      deform(p);
      const spike = new THREE.Mesh(cone, mat);
      spike.position.copy(p);
      spike.quaternion.setFromUnitVectors(up, dir);
      group.add(spike);
    }
  }
  if (style === 'long') {
    const back = new THREE.SphereGeometry(1.1, 48, 32, Math.PI, Math.PI, Math.PI * 0.18, Math.PI * 0.62);
    group.add(new THREE.Mesh(deformed(back, (v) => { if (v.y < 0) v.y *= 1.55; v.x *= 1.04; }), mat));
    for (const s of [-1, 1]) {
      const lock = mesh(new THREE.CapsuleGeometry(0.13, 0.75, 6, 12), mat, [1, 1, 0.6], [s * 0.88, -0.42, -0.02]);
      lock.rotation.z = s * 0.1;
      group.add(lock);
    }
    ears.forEach((e) => (e.visible = false));
  }
}

function addBody(c, group, skin) {
  const shirt = new THREE.MeshStandardMaterial({ color: c.shirt, roughness: 0.75 });
  group.add(mesh(new THREE.CylinderGeometry(0.33, 0.38, 0.7, 32), skin, null, [0, -1.25, -0.08]));
  group.add(mesh(new THREE.CapsuleGeometry(0.55, 1.5, 8, 24).rotateZ(Math.PI / 2), shirt, [1, 1, 0.6], [0, -1.9, -0.1]));
  const collar = mesh(new THREE.TorusGeometry(0.37, 0.07, 12, 32).rotateX(Math.PI / 2), shirt, null, [0, -1.5, -0.08]);
  group.add(collar);
}
