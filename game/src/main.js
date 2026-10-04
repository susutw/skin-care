import * as THREE from 'three';
import { createStage } from './scene.js';
import { buildCustomer } from './head.js';
import { Pimple, placePimples } from './pimples.js';
import { ToolRig } from './tools.js';
import { Extraction } from './extract.js';
import { FX } from './fx.js';
import { sfx, holdSound, setMuted, isMuted } from './audio.js';
import { CUSTOMERS, TOOL_INFO, TIPS, REACTIONS, THANKS, SKIN_TYPES, STEAM_BANDS, STEAM_SECONDS } from './data.js';
import * as ui from './ui.js';
import { mulberry32, hashString, pick } from './util.js';

const SAVE_KEY = 'skin-care-pop-salon-v1';
const save = loadSave();
const stage = createStage(document.getElementById('scene'));
const canvas = stage.renderer.domElement;
const fx = new FX(stage.scene);
const rig = new ToolRig();
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointer = { x: innerWidth / 2, y: innerHeight / 2, type: 'mouse', overCanvas: false };
const activePointers = new Set();
// 粉刺棒要壓多久：越難清的越久；硬擠紅腫丘疹很快就會痛
const SQUEEZE_DUR = { blackhead: 1.7, whitehead: 1.6, pustule: 1.4, papule: 1.0 };

let G = null;        // 目前關卡狀態
let preview = null;  // 標題畫面背後的展示顧客

function loadSave() {
  const empty = { best: {}, seen: [], muted: false };
  try { return { ...empty, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch { return empty; }
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
}

setMuted(save.muted);
ui.setMuteIcon(save.muted);

// ---------- 關卡流程 ----------

function spawnCustomer(c) {
  const cust = buildCustomer(c, hashString(c.id));
  stage.scene.add(cust.group);
  cust.group.updateMatrixWorld(true);
  return cust;
}

function teardown() {
  if (G) {
    cancelHold();
    G.steam = null;
    ui.steamMeter(null);
    stage.scene.remove(G.cust.group);
    G.cust.dispose();
    G = null;
  }
  if (preview) {
    stage.scene.remove(preview.group);
    preview.dispose();
    preview = null;
  }
  fx.clear();
  ui.hideToast();
  ui.hoverLabel(null);
}

async function showTitle() {
  teardown();
  ui.showHud(false);
  document.body.classList.remove('playing');
  preview = spawnCustomer(CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)]);
  stage.frameFace(true);
  const idx = await ui.titleScreen(save.best);
  sfx.click();
  startLevel(idx);
}

async function startLevel(idx) {
  teardown();
  const c = CUSTOMERS[idx];
  const cust = spawnCustomer(c);
  const rand = mulberry32(hashString(c.id) ^ Date.now());
  const pimples = placePimples(rand, c.acne, cust.occluders).map((s) => {
    const p = new Pimple(s.type, s.point, s.normal, c.skin.tone);
    cust.group.add(p.group);
    return p;
  });
  G = {
    idx, c, cust, pimples, tool: c.tools[0], score: 0, mistakes: 0, time: 0,
    running: false, paused: true, hold: null, sec: -1, steamed: false, steam: null,
  };
  stage.frameFace();
  rig.warmUp(stage.renderer, stage.scene, stage.camera);
  ui.showHud(true);
  ui.setHud({ c, left: pimples.length, score: 0 });
  ui.setTime(0);
  renderTools();
  document.body.classList.add('playing');

  const counts = {};
  for (const p of pimples) counts[p.type] = (counts[p.type] || 0) + 1;
  await ui.customerCard(c, counts);
  await introduce(c.tools, Object.keys(counts));
  G.running = true;
  G.paused = false;
  ui.bubble(c.greet);
}

// 第一次遇到的工具 / 粉刺種類跳出科普卡
async function introduce(tools, types) {
  const nt = tools.filter((t) => !save.seen.includes(`tool:${t}`));
  const ny = types.filter((t) => !save.seen.includes(`type:${t}`));
  if (!nt.length && !ny.length) return;
  const wasPaused = G.paused;
  G.paused = true;
  cancelHold();
  await ui.learnCard(nt, ny);
  save.seen.push(...nt.map((t) => `tool:${t}`), ...ny.map((t) => `type:${t}`));
  writeSave();
  if (G) G.paused = wasPaused;
}

function renderTools() {
  ui.toolbar(G.c.tools, G.tool, selectTool, G.steamed ? ['steam'] : []);
}

function selectTool(t) {
  if (!G || !G.c.tools.includes(t) || G.tool === t) return;
  G.tool = t;
  sfx.click();
  renderTools();
  ui.cursorAt(pointer.x, pointer.y, TOOL_INFO[t].icon, cursorVisible());
}

function updateHud() {
  ui.setHud({ left: G.pimples.filter((p) => !p.done).length, score: G.score });
}

async function finishLevel() {
  const { c, idx } = G;
  const sec = Math.round(G.time);
  const stars = G.mistakes === 0 ? 3 : G.mistakes <= 2 ? 2 : 1;
  const timeBonus = Math.max(0, (c.par - sec) * 2);
  const total = G.score + timeBonus;
  const prev = save.best[c.id] || { score: 0, stars: 0 };
  save.best[c.id] = { score: Math.max(prev.score, total), stars: Math.max(prev.stars, stars) };
  writeSave();
  sfx.win();
  G.cust.setExpression('happy', 999);
  const hasNext = idx + 1 < CUSTOMERS.length;
  const choice = await ui.resultsCard({
    c, stars, score: G.score, timeBonus, total, sec, mistakes: G.mistakes,
    count: G.pimples.length, thanks: THANKS[stars], hasNext,
  });
  sfx.click();
  if (choice === 'retry') startLevel(idx);
  else if (choice === 'next' && hasNext) startLevel(idx + 1);
  else if (choice === 'next') showEnding();
  else showTitle();
}

async function showEnding() {
  const stars = CUSTOMERS.reduce((s, c) => s + (save.best[c.id]?.stars || 0), 0);
  await ui.endingCard(stars);
  showTitle();
}

// ---------- 工具判定：這是遊戲的核心規則 ----------

function resolve(p, tool) {
  const t = p.type;
  const canInflame = G.c.tools.includes('gel');
  if (tool === 'squeeze') {
    if (t === 'blackhead') return { kind: 'pop', pts: 10 };
    if (t === 'whitehead') return p.softened ? { kind: 'pop', pts: 15 } : { kind: 'damage', tip: 'whitehead_raw', inflame: canInflame };
    if (t === 'pustule') return { kind: 'damage', tip: 'pustule_squeeze', popped: true };
    return { kind: 'damage', tip: 'papule_squeeze', grow: true };
  }
  if (tool === 'refer') {
    if (t === 'pustule') return { kind: 'refer', pts: 15 };
    if (t === 'papule') return { kind: 'refer', pts: 10, msg: '也可以！嚴重的青春痘本來就該建議顧客看皮膚科。', refs: ['護29'] };
    return { kind: 'noop', msg: '粉刺在美容師的處理範圍內，用粉刺棒清就好，不用轉介。' };
  }
  // gel
  if (t === 'papule') return { kind: 'calm', pts: 15 };
  if (t === 'pustule') return { kind: 'wrong', tip: { text: '化膿性痤瘡不是由美容師塗藥處理，要請顧客看皮膚科醫師。', refs: ['皮15'] } };
  return { kind: 'noop', msg: '這顆是粉刺，消炎凝膠清不掉它，要用粉刺棒。' };
}

function react(mood, text) {
  G.cust.setExpression(mood, 1.4);
  ui.bubble(text || pick(REACTIONS[mood]));
}

function gain(pts) {
  if (!pts) return;
  G.score += pts;
  ui.floatText(pointer.x, pointer.y - 30, `+${pts}`, 'good');
}

const vibrate = (p) => navigator.vibrate?.(p);

function apply(p, o) {
  const wp = p.worldPoint(), wn = p.worldNormal();
  switch (o.kind) {
    case 'pop':
      p.popOut();
      fx.addMark(G.cust.group, p.point, p.normal, 0.024, 0.35, 'pore');
      sfx.squelch(); vibrate(30);
      fx.shake = Math.max(fx.shake, 0.008);
      gain(o.pts);
      react('happy');
      break;
    case 'refer':
      p.refer();
      fx.sparkle(wp, wn, '#9fd0ff', 8);
      sfx.cream();
      gain(o.pts);
      react('calm', '好，我去掛皮膚科！');
      if (o.msg) ui.toast(o.msg, { refs: o.refs });
      break;
    case 'wrong':
      G.mistakes++;
      G.score = Math.max(0, G.score - 5);
      ui.floatText(pointer.x, pointer.y - 30, '-5', 'bad');
      sfx.soft();
      ui.toast(o.tip.text, { kind: 'bad', ms: 5500, refs: o.tip.refs });
      break;
    case 'calm':
      p.calm();
      fx.sparkle(wp, wn, '#b8ffe0', 14);
      sfx.cream();
      gain(o.pts);
      react('calm', '涼涼的～');
      if (!G.calmTip) {
        G.calmTip = true;
        ui.toast('已消炎鎮定！護理青春痘要著重清潔、消炎，不是擠壓。', { refs: ['護14'] });
      }
      break;
    case 'damage': {
      G.mistakes++;
      G.score = Math.max(0, G.score - 8);
      ui.floatText(pointer.x, pointer.y - 30, '-8', 'bad');
      sfx.ouch(); vibrate([50, 40, 50]);
      fx.shake = 0.035;
      p.damage++;
      fx.addMark(G.cust.group, p.point, p.normal, 0.07 + p.damage * 0.02, 0.45, 'red');
      react('ouch');
      const tip = TIPS[o.tip];
      let msg = tip.text;
      if (o.popped) {
        // 擠破了：留下傷口，這顆也算「處理掉」了，但扣分
        p.popOut();
        fx.addMark(G.cust.group, p.point, p.normal, 0.11, 0.5, 'red');
      } else if (o.inflame) {
        p.inflameTo('papule');
        msg += '<br><b>這顆發炎變成紅腫丘疹了！</b>';
      } else if (o.grow) {
        p.swell = Math.min(1.5, p.swell + 0.15);
      }
      ui.toast(msg, { kind: 'bad', ms: 5500, refs: tip.refs });
      if (o.inflame) setTimeout(() => G?.running && introduce([], ['papule']), 900);
      break;
    }
    default:
      ui.toast(o.msg);
      sfx.soft();
  }
  updateHud();
  if (G.pimples.every((p) => p.done)) {
    G.running = false;
    ui.hoverLabel(null);
    setTimeout(() => G && finishLevel(), 1200);
  }
}

// ---------- 輸入 ----------

function pickPimple(x, y) {
  if (!G) return null;
  const r = canvas.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, stage.camera);
  const targets = G.cust.occluders.concat(G.pimples.filter((p) => !p.done).map((p) => p.hit));
  return ray.intersectObjects(targets, false)[0]?.object.userData.pimple || null;
}

function pimpleLabel(p) {
  const name = { blackhead: '黑頭粉刺', whitehead: '白頭粉刺', pustule: '膿皰', papule: '紅腫丘疹' }[p.type];
  const state = p.type === 'whitehead' && p.softened ? ' · 已蒸臉 ✓' : '';
  return name + state;
}

const playing = () => G && G.running && !G.paused;
const cursorVisible = () => !!G && pointer.overCanvas && (pointer.type === 'mouse' || !!G.hold);

function startHold(p) {
  const tool = G.tool;
  const dur = tool === 'squeeze' ? SQUEEZE_DUR[p.type] : TOOL_INFO[tool].dur;
  G.hold = { p, tool, start: performance.now(), dur, off: 0, snd: holdSound(tool) };
  p.squeezing = tool === 'squeeze';
  // 擠對了才會真的擠出東西；擠錯只會越壓越紅
  // 擠膿皰是錯的，但還是讓玩家看到後果：噴出來、留傷口
  if (tool === 'squeeze' && (resolve(p, tool).kind === 'pop' || p.type === 'pustule')) G.hold.ext = new Extraction(p, fx, sfx);
  rig.attach(tool, p);
  ui.setRing(0, true);
  ui.cursorAt(pointer.x, pointer.y, TOOL_INFO[tool].icon, true);
  ui.hoverLabel(pimpleLabel(p), pointer.x, pointer.y);
}

function cancelHold() {
  const h = G?.hold;
  if (!h) return;
  h.snd?.stop();
  h.ext?.cancel();
  rig.detach();
  h.p.pressure = 0;
  h.p.squeezing = false;
  G.hold = null;
  ui.setRing(0, false);
  ui.cursorAt(pointer.x, pointer.y, null, cursorVisible());
  if (pointer.type !== 'mouse') ui.hoverLabel(null);
}

function updateHold() {
  const h = G.hold;
  if (!h) return;
  const now = performance.now();
  if (h.off && now - h.off > 160) return cancelHold();
  const k = Math.min(1, (now - h.start) / 1000 / h.dur);
  h.p.pressure = k;
  rig.update(k);
  ui.setRing(k, true);
  h.snd?.set(k);
  h.ext?.update(k);
  if (h.tool === 'squeeze' && k > 0.3) G.cust.setExpression('tense', 0.2);
  if (h.tool === 'squeeze' && k > 0.7) fx.shake = Math.max(fx.shake, 0.004);
  if (k >= 1) {
    h.ext?.finish();
    h.ext = null;
    cancelHold();
    apply(h.p, resolve(h.p, h.tool));
  }
}

// ---------- 蒸臉：全臉一次，按住計時，依膚質在對的區間放開 ----------

function startSteam() {
  if (G.steamed) {
    ui.toast('這位顧客已經蒸過臉了，接著清粉刺吧。');
    return;
  }
  stage.controls.enabled = false;
  G.steam = { start: performance.now(), puff: 0, snd: holdSound('steam') };
  ui.steamMeter(SKIN_TYPES[G.c.skinType].name, 0);
  ui.cursorAt(pointer.x, pointer.y, null, false);
}

function updateSteam(dt) {
  const st = G.steam;
  if (!st) return;
  const t = (performance.now() - st.start) / 1000 / STEAM_SECONDS;
  ui.steamMeter(SKIN_TYPES[G.c.skinType].name, Math.min(1, t));
  st.snd?.set(Math.min(1, t));
  if ((st.puff -= dt) <= 0) {
    st.puff = 0.07;
    fx.mist();
  }
  if (t >= 1) endSteam();
}

function endSteam() {
  const st = G.steam;
  if (!st) return;
  G.steam = null;
  st.snd?.stop();
  stage.controls.enabled = true;
  const t = Math.min(1, (performance.now() - st.start) / 1000 / STEAM_SECONDS);
  ui.steamMeter(null);
  if (t < 0.05) return; // 只是點一下，不算
  G.steamed = true;
  renderTools();
  for (const p of G.pimples) if (!p.done && (p.type === 'whitehead' || p.type === 'blackhead')) p.soften();
  const skin = SKIN_TYPES[G.c.skinType];
  const [lo, hi] = STEAM_BANDS[skin.steam];
  sfx.steam();
  if (t >= lo && t <= hi) {
    gain(10);
    react('calm', '暖暖的好舒服～');
    ui.toast(`蒸得剛好！${skin.rule}。`, { refs: skin.refs.filter((r) => r.startsWith('護')) });
  } else {
    G.mistakes++;
    G.score = Math.max(0, G.score - 5);
    ui.floatText(pointer.x, pointer.y - 30, '-5', 'bad');
    const tip = TIPS[skin.steam === 'long' ? 'steam_short' : skin.steam === 'mid' ? 'steam_mid' : 'steam_long'];
    const how = t > hi ? '蒸太久了' : '蒸太短了';
    react(t > hi ? 'tense' : 'neutral', t > hi ? '好熱…' : '這樣就好了嗎？');
    ui.toast(`${how}！${skin.name}皮膚：${skin.rule}。${skin.steam === 'mid' ? '' : tip.text}`, { kind: 'bad', ms: 6000, refs: skin.refs });
  }
  updateHud();
}

addEventListener('pointerdown', (e) => {
  if (e.target !== canvas) return;
  activePointers.add(e.pointerId);
  Object.assign(pointer, { x: e.clientX, y: e.clientY, type: e.pointerType, overCanvas: true });
  if (!playing()) return;
  if (activePointers.size > 1) { cancelHold(); endSteam(); stage.controls.enabled = true; return; }
  if (G.tool === 'steam') return startSteam();
  const p = pickPimple(e.clientX, e.clientY);
  if (p) {
    stage.controls.enabled = false; // 搶在 OrbitControls 之前（capture 階段），避免按粉刺時轉動鏡頭
    startHold(p);
  }
}, true);

addEventListener('pointermove', (e) => {
  Object.assign(pointer, { x: e.clientX, y: e.clientY, type: e.pointerType, overCanvas: e.target === canvas || !!G?.hold });
  ui.cursorAt(e.clientX, e.clientY, G ? TOOL_INFO[G.tool].icon : null, cursorVisible());
  if (!playing()) return;
  if (G.hold) {
    const p = pickPimple(e.clientX, e.clientY);
    G.hold.off = p === G.hold.p ? 0 : G.hold.off || performance.now();
    ui.hoverLabel(pimpleLabel(G.hold.p), e.clientX, e.clientY);
  } else if (e.pointerType === 'mouse' && e.target === canvas && !activePointers.size) {
    const p = pickPimple(e.clientX, e.clientY);
    ui.hoverLabel(p ? pimpleLabel(p) : null, e.clientX, e.clientY);
  } else {
    ui.hoverLabel(null);
  }
}, true);

function pointerEnd(e) {
  activePointers.delete(e.pointerId);
  if (G?.steam) endSteam();
  cancelHold();
  stage.controls.enabled = true;
}
addEventListener('pointerup', pointerEnd, true);
addEventListener('pointercancel', pointerEnd, true);
canvas.addEventListener('pointerleave', () => {
  pointer.overCanvas = false;
  ui.cursorAt(pointer.x, pointer.y, null, false);
  ui.hoverLabel(null);
});

addEventListener('keydown', (e) => {
  if (!G) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= G.c.tools.length) selectTool(G.c.tools[n - 1]);
});

document.getElementById('btn-mute').addEventListener('click', () => {
  save.muted = !isMuted();
  setMuted(save.muted);
  ui.setMuteIcon(save.muted);
  writeSave();
});
document.getElementById('btn-menu').addEventListener('click', () => showTitle());

// ---------- 主迴圈 ----------

let last = performance.now();
const shakeOff = new THREE.Vector3();
function frame(now) {
  // 計時與按住用真實時間（低 FPS 的裝置也不會變慢），動畫才用夾住的 dt
  const real = Math.min(0.5, (now - last) / 1000);
  const dt = Math.min(0.05, real);
  last = now;
  if (G) {
    if (playing()) {
      G.time += real;
      updateHold();
      updateSteam(real);
      const s = Math.floor(G.time);
      if (s !== G.sec) ui.setTime((G.sec = s));
    }
    G.cust.update(dt, !!G.hold);
    for (const p of G.pimples) p.update(dt);
  }
  preview?.update(dt, false);
  fx.update(dt);
  stage.controls.update();
  shakeOff.set((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake, 0);
  stage.camera.position.add(shakeOff);
  stage.renderer.render(stage.scene, stage.camera);
  stage.camera.position.sub(shakeOff);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => stage.frameFace(!!preview));

showTitle();

// 給自動化測試用的小窗口
window.__game = {
  get state() { return G; },
  start: startLevel,
  select: selectTool,
  stage,
  // 粉刺在螢幕上的位置（拿來模擬點擊）
  screen(i) {
    const v = G.pimples[i].worldPoint().project(stage.camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  },
};
