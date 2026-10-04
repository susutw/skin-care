import { TOOL_INFO, TYPE_INFO, CUSTOMERS, TAKEAWAYS, SKIN_TYPES, STEAM_BANDS, STEAM_LABEL } from './data.js';
import { fmtTime } from './util.js';

const $ = (s) => document.querySelector(s);
const overlay = $('#overlay');

// 題庫出處標籤：「皮15」→「皮 15」，跟「我的疑問」頁同一種寫法
export function refsHtml(refs = []) {
  if (!refs.length) return '';
  return `<span class="refs">${refs.map((r) => r === '補充'
    ? '<span class="ref extra">補充</span>'
    : `<span class="ref">${r[0]} ${r.slice(1)}</span>`).join('')}</span>`;
}

// 共用的彈窗：回傳一個 Promise，按下按鈕後 resolve 該按鈕的 value
export function modal(html, buttons = [], cls = '') {
  return new Promise((resolve) => {
    overlay.innerHTML = `<div class="card ${cls}">${html}<div class="actions">${buttons
      .map((b) => `<button class="btn ${b.primary ? 'primary' : ''}" data-v="${b.value}">${b.label}</button>`)
      .join('')}</div></div>`;
    overlay.classList.remove('title');
    overlay.classList.add('show');
    overlay.querySelectorAll('[data-v]').forEach((el) =>
      el.addEventListener('click', () => {
        overlay.classList.remove('show');
        overlay.innerHTML = '';
        resolve(el.dataset.v);
      }));
    overlay.querySelector('.btn.primary')?.focus();
  });
}

export function titleScreen(best) {
  const cards = CUSTOMERS.map((c, i) => {
    const locked = i > 0 && !best[CUSTOMERS[i - 1].id];
    const stars = best[c.id]?.stars || 0;
    return `<button class="level ${locked ? 'locked' : ''}" data-v="${i}" ${locked ? 'disabled' : ''}>
      <span class="level-emoji">${locked ? '🔒' : c.emoji}</span>
      <span class="level-name">${i + 1}. ${c.name}</span>
      <span class="level-job">${c.job}</span>
      <span class="level-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
    </button>`;
  }).join('');
  return new Promise((resolve) => {
    overlay.innerHTML = `<div class="card title-card">
      <nav class="crumbs"><a href="../">← 講義</a><a href="../quiz/">隨機測驗</a><a href="../notes/">我的疑問</a></nav>
      <div class="logo"><span class="logo-main">粉刺沙龍</span><span class="logo-sub">POP SALON 3D</span></div>
      <p class="tagline">你是美容師！照著美容丙級學科的原則替顧客清粉刺，提示上的標籤是題庫題號。</p>
      <div class="level-grid">${cards}</div>
      <p class="howto">🖱️ 拖曳旋轉・滾輪 / 雙指縮放・<b>按住</b>粉刺使用工具</p>
      <p class="disclaimer">遊戲規則依美容丙級學科題庫整理，僅供練習與娛樂，不能取代醫療建議。化膿、嚴重的痘痘請諮詢皮膚科醫師。</p>
    </div>`;
    overlay.classList.add('show', 'title');
    overlay.querySelectorAll('.level:not(.locked)').forEach((el) =>
      el.addEventListener('click', () => {
        overlay.classList.remove('show', 'title');
        overlay.innerHTML = '';
        resolve(+el.dataset.v);
      }));
  });
}

function meter(label, v) {
  return `<div class="meter"><span>${label}</span><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div></div>`;
}

export function customerCard(c, counts) {
  const chips = Object.entries(counts)
    .map(([t, n]) => `<span class="chip">${TYPE_INFO[t].icon} ${TYPE_INFO[t].name} ×${n}</span>`).join('');
  return modal(`
    <div class="cust-head">
      <div class="avatar">${c.emoji}</div>
      <div><h2>${c.name} <small>${c.age} 歲・${c.job}</small></h2><p>${c.desc}</p></div>
    </div>
    <div class="skin-type"><b>膚質：${SKIN_TYPES[c.skinType].name}</b><span>${SKIN_TYPES[c.skinType].note}</span>${refsHtml(SKIN_TYPES[c.skinType].refs.slice(0, 1))}</div>
    <div class="meters">${meter('出油', c.skin.oil)}${meter('泛紅', c.skin.redness)}${meter('毛孔', c.skin.pores)}</div>
    <div class="chips">${chips}</div>
    <p class="quote">「${c.greet}」</p>`,
  [{ label: '開始護理 →', value: 'go', primary: true }]);
}

export function learnCard(tools, types) {
  const items = [
    ...types.map((t) => {
      const info = TYPE_INFO[t];
      return `<div class="learn-item"><div class="learn-icon">${info.icon}</div><div>
        <h3>${info.name} <small>${info.alt}</small></h3>
        <p class="how">處理方式：${info.how}</p><p>${info.fact}</p>${refsHtml(info.refs)}</div></div>`;
    }),
    ...tools.map((t) => {
      const info = TOOL_INFO[t];
      return `<div class="learn-item learn-tool"><div class="learn-icon">${info.icon}</div><div>
        <h3>新工具：${info.name}</h3><p>${info.desc}</p>${refsHtml(info.refs)}</div></div>`;
    }),
  ].join('');
  return modal(`<h2>📚 科普小知識</h2><div class="learn">${items}</div>`,
    [{ label: '知道了！', value: 'ok', primary: true }]);
}

export function resultsCard(r) {
  return modal(`
    <div class="result-stars">${'★'.repeat(r.stars)}<span>${'★'.repeat(3 - r.stars)}</span></div>
    <h2>護理完成！</h2>
    <p class="quote">「${r.thanks}」<br><small>— ${r.c.name}</small></p>
    <div class="stat-grid">
      <div><small>處理</small><b>${r.count} 顆</b></div>
      <div><small>失誤</small><b class="${r.mistakes ? 'bad' : ''}">${r.mistakes} 次</b></div>
      <div><small>用時</small><b>${fmtTime(r.sec)}</b></div>
      <div><small>總分</small><b>${r.total}</b><small class="sub">${r.score} + 時間獎勵 ${r.timeBonus}</small></div>
    </div>
    <div class="fact"><b>💡 考點複習</b><p>${r.c.fact}</p>${refsHtml(r.c.refs)}</div>`,
  [
    { label: '選單', value: 'menu' },
    { label: '再看一次', value: 'retry' },
    { label: r.hasNext ? '下一位 →' : '看總結 →', value: 'next', primary: true },
  ]);
}

export function endingCard(stars) {
  return modal(`
    <h2>🎉 今天的預約都做完了！</h2>
    <p class="big-stars">★ ${stars} / ${CUSTOMERS.length * 3}</p>
    <h3>帶走這些皮膚知識：</h3>
    <ol class="takeaways">${TAKEAWAYS.map((t) => `<li>${t.text} ${refsHtml(t.refs)}</li>`).join('')}</ol>
    <p class="disclaimer">想再練習？到 <a href="../quiz/">隨機測驗</a> 做 25 題。</p>`,
  [{ label: '回到選單', value: 'menu', primary: true }]);
}

export function showHud(on) {
  $('#hud').hidden = !on;
  $('#toolbar').hidden = !on;
}

export function setHud({ c, left, score }) {
  if (c) {
    $('#hud-emoji').textContent = c.emoji;
    $('#hud-name').textContent = c.name;
    $('#hud-title').textContent = `${c.age} 歲・${c.job}・${SKIN_TYPES[c.skinType].name}皮膚`;
  }
  if (left !== undefined) $('#hud-left').textContent = left;
  if (score !== undefined) $('#hud-score').textContent = score;
}

export const setTime = (sec) => { $('#hud-time').textContent = fmtTime(sec); };
export const setMuteIcon = (m) => { $('#btn-mute').textContent = m ? '🔇' : '🔊'; };

export function toolbar(tools, active, onSelect, done = []) {
  const bar = $('#toolbar');
  bar.innerHTML = tools.map((t, i) => `<button class="tool ${t === active ? 'active' : ''} ${done.includes(t) ? 'used' : ''}" data-t="${t}">
    <span class="tool-icon">${TOOL_INFO[t].icon}</span><span class="tool-name">${TOOL_INFO[t].name}${done.includes(t) ? ' ✓' : ''}</span><kbd>${i + 1}</kbd></button>`).join('');
  bar.querySelectorAll('.tool').forEach((el) => el.addEventListener('click', () => onSelect(el.dataset.t)));
}

let toastTimer = 0;
export function toast(msg, { kind = 'info', ms = 3800, refs } = {}) {
  const el = $('#toast');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span>${kind === 'bad' ? '⚠️' : '💡'}</span><p>${msg} ${refsHtml(refs)}</p>`;
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}
export const hideToast = () => { clearTimeout(toastTimer); $('#toast').hidden = true; };

let bubbleTimer = 0;
export function bubble(text) {
  const el = $('#bubble');
  el.textContent = text;
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => (el.hidden = true), 1800);
}

export function floatText(x, y, text, cls = '') {
  const el = document.createElement('div');
  el.className = `float-text ${cls}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// 自訂游標 + 施力圓環
const cursor = $('#cursor'), ring = $('#ring'), label = $('#hover-label');
const RING_LEN = 2 * Math.PI * 26;
ring.style.strokeDasharray = RING_LEN;
export function cursorAt(x, y, icon, show) {
  cursor.style.transform = `translate(${x}px, ${y}px)`;
  if (icon) $('#cursor-icon').textContent = icon;
  cursor.hidden = !show;
}
export function setRing(k, show) {
  cursor.classList.toggle('holding', show);
  ring.style.strokeDashoffset = RING_LEN * (1 - k);
}
export function hoverLabel(text, x, y) {
  label.hidden = !text;
  if (!text) return;
  label.textContent = text;
  label.style.transform = `translate(${x + 18}px, ${y - 72}px)`;
}

// 蒸臉計時條：skin=null 時隱藏
const meterEl = $('#steam-meter');
meterEl.querySelector('.sm-bar').insertAdjacentHTML('afterbegin', Object.entries(STEAM_BANDS)
  .map(([k, [lo, hi]]) => `<span class="band ${k}" style="left:${lo * 100}%;width:${(hi - lo) * 100}%">${STEAM_LABEL[k]}</span>`).join(''));
export function steamMeter(skin, t = 0) {
  meterEl.hidden = !skin;
  if (!skin) return;
  $('#sm-skin').textContent = `${skin}皮膚`;
  $('#sm-fill').style.width = `${t * 100}%`;
}
