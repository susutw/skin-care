import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SkinPatch } from './patch.js';
import { makeLesion, LESION_TYPES } from './lesions.js';
import { FX } from '../fx.js';
import { sfx, holdSound, setMuted, isMuted } from '../audio.js';
import { TYPE_INFO } from '../data.js';
import { mulberry32, pick } from '../util.js';

// 近距離療癒模式：放大鏡下的一小塊皮膚，一次只處理一顆

const SAVE_KEY = 'skin-care-closeup-v1';
// 自動化測試在軟體算圖下 FPS 很低，?fast 允許比較大的時間步
const DT_MAX = new URLSearchParams(location.search).has('fast') ? 0.3 : 0.05;
const TONES = ['#f3cfb3', '#eec4a4', '#e2b08c', '#c99572', '#a8714f'];
const TOOLS = {
  loop: { icon: '➰', name: '粉刺棒' },
  steam: { icon: '♨️', name: '蒸臉' },
  gel: { icon: '🧴', name: '消炎凝膠' },
  wipe: { icon: '🧽', name: '化妝棉' },
  next: { icon: '↻', name: '下一顆' },
};
const KIT = {
  blackhead: ['loop', 'wipe', 'next'],
  whitehead: ['steam', 'loop', 'wipe', 'next'],
  pustule: ['loop', 'wipe', 'next'],
  papule: ['gel', 'loop', 'next'],
};
const HOW = {
  blackhead: '按住畫面（或空白鍵）用粉刺棒慢慢加壓，力道夠了，皮脂栓就會被推出來。',
  whitehead: '先按住「蒸臉」軟化角質，再用粉刺棒加壓。表皮破開後，白色內容物會被擠出來。',
  pustule: '這頁是示範，讓你看清楚擠膿皰會發生什麼。現實中化膿性痤瘡要請顧客看皮膚科。',
  papule: '紅腫丘疹裡面沒有東西。可以試著擠擠看，再改用消炎凝膠讓紅腫退下去。',
};

const $ = (s) => document.querySelector(s);
const save = (() => {
  try { return { count: 0, muted: false, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch { return { count: 0, muted: false }; }
})();
const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} };
setMuted(save.muted);

// ---------- 場景 ----------

const canvas = $('#cu-scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(38, 1, 0.02, 20);
const controls = new OrbitControls(camera, canvas);
// 左鍵 / 單指留給「按住加壓」，右鍵 / 雙指才轉動、縮放
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 0.6;
controls.maxDistance = 3;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = 1.15;
controls.minAzimuthAngle = -0.9;
controls.maxAzimuthAngle = 0.9;
// 斜斜地看，才看得到擠出來的東西「冒出來」的高度
camera.position.set(0.15, 0.72, 1.4);
controls.target.set(0, 0.02, 0);
controls.update();

scene.add(new THREE.HemisphereLight('#ffffff', '#c98f8f', 0.45));
const key = new THREE.DirectionalLight('#fff3e6', 1.9);
key.position.set(-1.2, 2.6, 1.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9, near: 0.5, far: 6 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.01;
scene.add(key);
const fill = new THREE.DirectionalLight('#dbe8ff', 0.5);
fill.position.set(2, 1, 1.5);
scene.add(fill);

const seed = (Date.now() & 0xffffff) >>> 0;
const rand = mulberry32(seed);
const tone = pick(TONES);
const patch = new SkinPatch({ tone, seed });
patch.group.rotation.x = 0.35; // 微微傾斜，膿液才會往下流
scene.add(patch.group);
const fx = new FX(scene);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  // 直式手機稍微退遠一點
  camera.fov = camera.aspect < 0.8 ? 52 : 38;
  camera.updateProjectionMatrix();
}
resize();
addEventListener('resize', resize);

// ---------- 工具模型 ----------

const steel = new THREE.MeshStandardMaterial({ color: '#e0e5eb', metalness: 0.9, roughness: 0.16 });
const loopRig = new THREE.Group();
const loopRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 12, 64).rotateX(Math.PI / 2), steel);
const arm = new THREE.Group();
arm.rotation.z = -0.9;
const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 10), steel);
stem.position.y = 0.13;
const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.36, 16), new THREE.MeshStandardMaterial({ color: '#f4a7b9', roughness: 0.4 }));
handle.position.y = 0.44;
arm.add(stem, handle);
loopRig.add(loopRing, arm);
loopRig.traverse((o) => { o.castShadow = true; });
patch.group.add(loopRig);

const nozzle = new THREE.Group();
const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 20), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }));
bottle.position.y = 0.2;
const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 20).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: '#7fd1b9', roughness: 0.4 }));
tip.position.y = 0.05;
nozzle.add(bottle, tip);
nozzle.visible = false;
patch.group.add(nozzle);

const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.045, 40),
  new THREE.MeshPhysicalMaterial({ color: '#fbfaf6', roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffffff') }));
pad.castShadow = true;
pad.visible = false;
patch.group.add(pad);

// ---------- 狀態 ----------

let type = LESION_TYPES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'blackhead';
let lesion = null;
let tool = KIT[type][0];
let holding = false;
let holdSnd = null;
let steamT = 0;
let wipe = null;
const pointers = new Set();

function newLesion() {
  lesion?.dispose();
  wipe = null;
  pad.visible = false;
  steamT = 0;
  lesion = makeLesion(type, { patch, fx, sfx, rand, tone, toast });
  lesion.onDone = () => {
    save.count++;
    store();
    $('#cu-count').textContent = save.count;
    if (KIT[type].includes('wipe')) highlight('wipe');
    else highlight('next');
  };
  if (!KIT[type].includes(tool)) tool = KIT[type][0];
  renderTools();
}

function setType(t) {
  if (t === type && lesion) return;
  type = t;
  try { history.replaceState(null, '', `#${t}`); } catch {}
  tool = KIT[t][0];
  renderInfo();
  renderTabs();
  newLesion();
}

// ---------- 輸入 ----------

function setHolding(on) {
  if (on === holding) return;
  holding = on;
  holdSnd?.stop();
  holdSnd = on && (tool === 'loop' || tool === 'steam') ? holdSound(tool === 'loop' ? 'squeeze' : 'steam') : null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  pointers.add(e.pointerId);
  setHolding(pointers.size === 1 && !wipe);
});
const release = (e) => {
  pointers.delete(e.pointerId);
  if (!pointers.size) setHolding(false);
};
addEventListener('pointerup', release);
addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat && e.target === document.body) { e.preventDefault(); setHolding(true); }
});
addEventListener('keyup', (e) => { if (e.code === 'Space') setHolding(false); });
addEventListener('blur', () => { pointers.clear(); setHolding(false); });

// ---------- 蒸臉 ----------

const dropMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55 });
const hemi = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);

function updateSteam(dt) {
  if (!(holding && tool === 'steam')) return;
  if ((updateSteam.puff = (updateSteam.puff || 0) - dt) <= 0) {
    updateSteam.puff = 0.05;
    const p = new THREE.Vector3(-0.8 + rand() * 0.7, 0.04, rand() * 0.9 - 0.45);
    fx.puff(patch.group.localToWorld(p), new THREE.Vector3(0.22 + rand() * 0.15, 0.18 + rand() * 0.12, -0.06), 0.2 + rand() * 0.16, 2.4);
  }
  if (lesion.kind !== 'whitehead' || lesion.steamed) return;
  steamT += dt;
  holdSnd?.set(Math.min(1, steamT / 1.6));
  if (steamT >= 1.6) {
    lesion.steam();
    sfx.steam();
    // 皮膚上冒出一層小水珠
    for (let i = 0; i < 70; i++) {
      const a = rand() * Math.PI * 2, r = 0.33 + rand() * 0.65;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const d = new THREE.Mesh(hemi, dropMat);
      const s = 0.005 + rand() * 0.009;
      d.scale.set(s, s * 0.7, s);
      d.position.set(x, patch.heightAt(x, z) - 0.0005, z);
      lesion.group.add(d);
      lesion.residues.push(d);
    }
    toast('角質軟化了！換粉刺棒慢慢加壓吧', ['護37', '護51']);
    setHolding(false);
    tool = 'loop';
    renderTools();
  }
}

// ---------- 化妝棉擦拭 ----------

function startWipe() {
  if (!lesion.done || wipe || !lesion.residues.length) {
    if (!lesion.done) toast(lesion.kind === 'whitehead' && !lesion.steamed ? '還沒清呢，先蒸臉再擠～' : '還沒擠完呢，先用粉刺棒加壓～');
    return;
  }
  setHolding(false);
  const items = lesion.residues.map((o) => {
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    return { o, x: patch.group.worldToLocal(c).x, grabbed: false };
  });
  wipe = { t: 0, x: -1.5, items };
  pad.visible = true;
  sfx.swish();
}

function updateWipe(dt) {
  if (!wipe) return;
  wipe.t += dt;
  const k = Math.min(1, wipe.t / 1.2);
  const x = -1.5 + k * 3.2, dx = x - wipe.x;
  wipe.x = x;
  pad.position.set(x, patch.heightAt(Math.max(-1.5, Math.min(1.5, x)), 0.05) + 0.035, 0.05);
  pad.rotation.y += dt * 2;
  // 化妝棉經過時把擠出來的東西一起帶走
  for (const it of wipe.items) {
    if (!it.grabbed && x + 0.2 >= it.x) it.grabbed = true;
    if (it.grabbed) {
      it.o.position.x += dx;
      it.o.position.y = Math.min(it.o.position.y + dt * 0.05, 0.03);
    }
  }
  if (k >= 1) {
    for (const it of wipe.items) it.o.parent?.remove(it.o);
    lesion.residues.length = 0;
    lesion.afterWipe();
    pad.visible = false;
    wipe = null;
    highlight('next');
  }
}

// ---------- 主迴圈 ----------

let last = performance.now();
let lastStage = '', lastMeter = -1;
const shake = new THREE.Vector3();
function frame(now) {
  // rAF 的時間戳可能比載入時的 performance.now() 還早，第一幀會算出負的 dt
  const dt = Math.max(0, Math.min(DT_MAX, (now - last) / 1000));
  last = now;
  const inp = { loop: holding && tool === 'loop', gel: holding && tool === 'gel' };
  updateSteam(dt);
  lesion.update(dt, inp);
  if (inp.loop) holdSnd?.set(lesion.press);
  if (lesion.dirty) {
    patch.update(lesion);
    lesion.dirty = false;
  }

  // 粉刺棒：按住時壓進皮膚，放開時抬起來
  const R = lesion.loopR;
  loopRig.visible = tool === 'loop' || lesion.press > 0.01;
  loopRing.scale.setScalar(R);
  arm.position.x = R;
  // 按住時圈套到痘痘上、貼著被壓出來的凹痕（heightAt 已含凹陷）；放開時移到旁邊，不擋住痘痘
  const tx = inp.loop ? 0 : R + 0.3;
  const ty = inp.loop ? patch.heightAt(R, 0) + 0.006 : 0.1;
  const ease = Math.min(1, dt * 10);
  loopRig.position.x += (tx - loopRig.position.x) * ease;
  loopRig.position.y += (ty - loopRig.position.y) * ease;
  nozzle.visible = inp.gel && !lesion.done;
  nozzle.position.y = patch.heightAt(0, 0) + 0.12;

  updateWipe(dt);
  fx.update(dt);
  controls.update();
  shake.set((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake, 0);
  camera.position.add(shake);
  renderer.render(scene, camera);
  camera.position.sub(shake);

  const st = lesion.stage();
  if (st !== lastStage) $('#cu-stage').textContent = lastStage = st;
  const m = Math.round(lesion.meter * 100);
  if (m !== lastMeter) $('#cu-bar').style.width = `${(lastMeter = m)}%`;
  requestAnimationFrame(frame);
}

// ---------- UI ----------

function refsHtml(refs = []) {
  return refs.length ? `<span class="refs">${refs.map((r) => r === '補充'
    ? '<span class="ref extra">補充</span>'
    : `<span class="ref">${r[0]} ${r.slice(1)}</span>`).join('')}</span>` : '';
}

let toastTimer = 0;
function toast(msg, refs) {
  const el = $('#toast');
  el.className = 'toast';
  el.innerHTML = `<span>💡</span><p>${msg} ${refsHtml(refs)}</p>`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4500);
}

function renderTabs() {
  $('#cu-tabs').innerHTML = LESION_TYPES.map((t) => `<button role="tab" aria-selected="${t === type}" class="cu-tab ${t === type ? 'active' : ''}" data-t="${t}">
    <span>${TYPE_INFO[t].icon}</span>${TYPE_INFO[t].name}</button>`).join('');
  $('#cu-tabs').querySelectorAll('.cu-tab').forEach((b) => b.addEventListener('click', () => { sfx.click(); setType(b.dataset.t); }));
}

function renderInfo() {
  const info = TYPE_INFO[type];
  const demo = type === 'pustule'
    ? `<p class="cu-demo">⚠️ 示範用。考試和現實中，化膿性痤瘡要請顧客看皮膚科醫師，不是擠掉。${refsHtml(['皮15'])}</p>` : '';
  $('#cu-info-body').innerHTML = `${demo}<p class="cu-how">${HOW[type]}</p><p>${info.fact}</p>${refsHtml(info.refs)}`;
  $('#cu-info-title').textContent = `${info.icon} ${info.name}（${info.alt}）`;
}

function renderTools() {
  $('#toolbar').innerHTML = KIT[type].map((t) => `<button class="tool ${t === tool ? 'active' : ''}" data-t="${t}">
    <span class="tool-icon">${TOOLS[t].icon}</span><span class="tool-name">${TOOLS[t].name}</span></button>`).join('');
  $('#toolbar').querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.t;
    sfx.click();
    if (t === 'wipe') return startWipe();
    if (t === 'next') return newLesion();
    tool = t;
    renderTools();
  }));
}

function highlight(t) {
  const b = $(`#toolbar .tool[data-t="${t}"]`);
  b?.classList.add('nudge');
}

$('#cu-count').textContent = save.count;
$('#btn-mute').textContent = save.muted ? '🔇' : '🔊';
$('#btn-mute').addEventListener('click', () => {
  save.muted = !isMuted();
  setMuted(save.muted);
  $('#btn-mute').textContent = save.muted ? '🔇' : '🔊';
  store();
});
// 手機上說明卡預設收起來
if (matchMedia('(max-width: 640px)').matches) $('#cu-info').open = false;

renderTabs();
renderInfo();
newLesion();
requestAnimationFrame(frame);

// 給自動化測試用
window.__closeup = {
  get lesion() { return lesion; },
  get tool() { return tool; },
  setType,
  setTool(t) { tool = t; renderTools(); },
  hold: setHolding,
  wipe: startWipe,
  next: newLesion,
  camera, controls,
};
