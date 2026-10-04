import * as THREE from 'three';

// 每一幀都可以重新塑形的管子：給一串中心點、各點半徑與顏色，
// 用平行移動（parallel transport）算出不會扭轉的截面方向。
// 皮脂栓、白頭內容物、膿液、組織液都用它來畫。

const ball = new THREE.SphereGeometry(1, 18, 12);
const tmp = new THREE.Vector3(), nPrev = new THREE.Vector3(), t = new THREE.Vector3(), b = new THREE.Vector3();

export class DynTube {
  constructor(maxRings, radial, material) {
    this.max = maxRings;
    this.radial = radial;
    const vpr = radial + 1, cnt = maxRings * vpr;
    const g = new THREE.BufferGeometry();
    const attr = (k) => new THREE.BufferAttribute(new Float32Array(cnt * k), k).setUsage(THREE.DynamicDrawUsage);
    this.p = attr(3); this.nrm = attr(3); this.c = attr(3);
    g.setAttribute('position', this.p);
    g.setAttribute('normal', this.nrm);
    g.setAttribute('color', this.c);
    const idx = [];
    for (let i = 0; i < maxRings - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * vpr + j, bb = (i + 1) * vpr + j, cc = (i + 1) * vpr + j + 1, dd = i * vpr + j + 1;
        // 截面是逆時針繞（cos, sin），三角形要這樣排才會朝外
        idx.push(a, dd, bb, bb, dd, cc);
      }
    }
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    // 兩端用球收圓；顏色另外設，因為球不吃頂點顏色
    const capMat = material.clone();
    capMat.vertexColors = false;
    this.tip = new THREE.Mesh(ball, capMat);
    this.tail = new THREE.Mesh(ball, capMat.clone());
    this.tip.castShadow = this.tail.castShadow = true;
    this.tip.visible = this.tail.visible = false;
    this.group = new THREE.Group();
    this.group.add(this.mesh, this.tip, this.tail);
  }

  // pts: Vector3[]（從尾到頭），radii: number[]，colors: Color[]
  set(pts, radii, colors, showTail = false) {
    const n = Math.min(pts.length, this.max);
    if (n < 2) {
      this.geo.setDrawRange(0, 0);
      this.tip.visible = this.tail.visible = false;
      return;
    }
    const P = this.p.array, N = this.nrm.array, C = this.c.array, vpr = this.radial + 1;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)];
      t.subVectors(c, a).normalize();
      if (i === 0) {
        tmp.set(0, 1, 0);
        if (Math.abs(t.y) > 0.9) tmp.set(1, 0, 0);
        nPrev.copy(tmp).addScaledVector(t, -tmp.dot(t)).normalize();
      } else {
        nPrev.addScaledVector(t, -nPrev.dot(t)).normalize();
      }
      b.crossVectors(t, nPrev);
      const r = radii[i], col = colors[i], p = pts[i];
      for (let j = 0; j <= this.radial; j++) {
        const ang = (j / this.radial) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang);
        const k = (i * vpr + j) * 3;
        const dx = nPrev.x * cs + b.x * sn, dy = nPrev.y * cs + b.y * sn, dz = nPrev.z * cs + b.z * sn;
        P[k] = p.x + dx * r; P[k + 1] = p.y + dy * r; P[k + 2] = p.z + dz * r;
        N[k] = dx; N[k + 1] = dy; N[k + 2] = dz;
        C[k] = col.r; C[k + 1] = col.g; C[k + 2] = col.b;
      }
    }
    for (const a of [this.p, this.nrm, this.c]) a.needsUpdate = true;
    this.geo.setDrawRange(0, (n - 1) * this.radial * 6);
    this.tip.visible = true;
    this.tip.position.copy(pts[n - 1]);
    this.tip.scale.setScalar(radii[n - 1]);
    this.tip.material.color.copy(colors[n - 1]);
    this.tail.visible = showTail;
    if (showTail) {
      this.tail.position.copy(pts[0]);
      this.tail.scale.setScalar(radii[0]);
      this.tail.material.color.copy(colors[0]);
    }
  }

  dispose() {
    this.geo.dispose();
    this.mesh.material.dispose();
    this.tip.material.dispose();
    this.tail.material.dispose();
  }
}
