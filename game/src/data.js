// 遊戲內容：工具、粉刺種類、膚質、顧客與科普小知識
// refs 是題庫題號（data/questions.json 的 id），顯示成跟「我的疑問」頁一樣的出處標籤；
// '補充' 表示題庫沒考、幫助理解的內容。

export const TOOL_ORDER = ['squeeze', 'steam', 'refer', 'gel'];

export const TOOL_INFO = {
  squeeze: {
    name: '粉刺棒', icon: '➰', dur: 1.6,
    desc: '用前端的小圓圈套住粉刺，慢慢往下壓，把堵在毛孔裡的皮脂推出來。只適合黑頭、白頭這類「粉刺」，發炎的痘痘不能擠。',
    refs: ['皮53', '護14'],
  },
  steam: {
    name: '蒸臉器', icon: '♨️', dur: 0,
    desc: '蒸氣能軟化角質，讓白頭粉刺比較好清出來。蒸多久要看膚質：油性多蒸；乾性、敏感、面皰皮膚要縮短。噴口離臉約 40 公分，噴霧裡的臭氧有殺菌、消炎作用。每位顧客只蒸一次。',
    refs: ['護37', '護51', '護52', '護53', '護54', '護55'],
  },
  refer: {
    name: '轉介單', icon: '🩺', dur: 0.7,
    desc: '化膿性的痤瘡不在美容師的處理範圍，要請顧客去看皮膚科醫師。開一張轉介建議給顧客。',
    refs: ['皮15', '護29'],
  },
  gel: {
    name: '消炎凝膠', icon: '🧴', dur: 0.9,
    desc: '護理青春痘要著重「清潔、消炎」，不是擠壓。擦上消炎鎮定的凝膠，讓紅腫慢慢退下去。',
    refs: ['護14', '護42'],
  },
};

export const TYPE_INFO = {
  blackhead: {
    name: '黑頭粉刺', alt: '開放性粉刺', icon: '⚫',
    how: '直接用 ➰ 粉刺棒壓出',
    fact: '粉刺是皮脂腺分泌失調、皮脂堵在毛孔裡形成的。黑頭的開口是開著的，皮脂接觸空氣氧化變黑，所以不是髒東西。鼻頭是皮脂分泌最多的地方，黑頭特別多。',
    refs: ['皮53', '皮95'],
  },
  whitehead: {
    name: '白頭粉刺', alt: '閉鎖性粉刺', icon: '⚪',
    how: '先 ♨️ 蒸臉軟化，再用 ➰ 粉刺棒',
    fact: '白頭粉刺的開口被角質蓋住，皮脂出不來。先蒸臉讓角質軟化再清；沒軟化就硬擠，容易把內容物推進真皮層，引發發炎。',
    refs: ['皮53', '補充'],
  },
  pustule: {
    name: '膿皰', alt: '化膿性痤瘡', icon: '🟡',
    how: '不能擠！開 🩺 轉介單，請顧客看皮膚科',
    fact: '做臉時遇到化膿性的痤瘡，正確做法是「請顧客看皮膚科醫師」，不是擠掉，也不是由美容師塗藥或給口服藥。擠膿皰容易感染、留疤。',
    refs: ['皮15'],
  },
  papule: {
    name: '紅腫丘疹', alt: '發炎的青春痘', icon: '🔴',
    how: '不能擠！擦 🧴 消炎凝膠',
    fact: '護理青春痘要著重清潔、消炎，而不是擠壓。發炎的痘痘裡沒有東西可擠，硬擠只會讓發炎擴散、留下紅印。嚴重面皰的肌膚也不做按摩。',
    refs: ['護14', '護17'],
  },
};

// 膚質決定蒸臉要「短、中、長」
export const SKIN_TYPES = {
  oily: { name: '油性', steam: 'long', note: '全臉油膩、毛孔粗大、易生面皰', rule: '油性皮膚宜多蒸臉、少按摩', refs: ['皮51', '護37'] },
  combo: { name: '混合性', steam: 'mid', note: 'T 字部位出油、毛孔粗大，雙頰偏乾', rule: '以中性皮膚的蒸臉時間為準', refs: ['皮65', '補充'] },
  sensitive: { name: '敏感性', steam: 'short', note: '容易出現小紅點、發癢', rule: '敏感皮膚蒸臉時間要比中性皮膚短', refs: ['皮43', '護51'] },
  acne: { name: '面皰性', steam: 'short', note: '有發炎的青春痘', rule: '面皰皮膚蒸臉時間要比中性皮膚短', refs: ['護38', '護52'] },
  dry: { name: '乾性', steam: 'short', note: '皮脂分泌少、缺水', rule: '乾性皮膚蒸臉時間比油性短', refs: ['護1', '護53'] },
};

// 蒸臉計時條：0..1，各區間的範圍
export const STEAM_BANDS = { short: [0.12, 0.38], mid: [0.38, 0.64], long: [0.64, 0.9] };
export const STEAM_LABEL = { short: '短', mid: '中', long: '長' };
export const STEAM_SECONDS = 4.5; // 計時條從 0 走到 1 要幾秒

// 犯錯時跳出的解說
export const TIPS = {
  whitehead_raw: { text: '白頭粉刺還被角質蓋著，沒蒸臉軟化就硬擠，內容物容易被推進皮膚深處而發炎。', refs: ['補充'] },
  pustule_squeeze: { text: '化膿性痤瘡應該請顧客看皮膚科醫師，不是擠掉！擠膿皰容易感染、留疤。', refs: ['皮15'] },
  papule_squeeze: { text: '護理青春痘要著重清潔、消炎，不是擠壓。硬擠只會讓發炎更嚴重、留下紅印。', refs: ['護14'] },
  steam_long: { text: '這位顧客的膚質要縮短蒸臉時間，蒸太久皮膚會泛紅、更敏感。', refs: ['護51', '護52', '護53'] },
  steam_short: { text: '油性皮膚宜多蒸臉，蒸太短角質還沒軟化。', refs: ['護37'] },
  steam_mid: { text: '混合性皮膚以中性皮膚的蒸臉時間為準，不用特別加長或縮短。', refs: ['補充'] },
};

export const REACTIONS = {
  happy: ['喔～好舒服！', '爽快！', '清爽多了～', '哇，出來了！', '謝謝老師！'],
  ouch: ['好痛！', '嘶——', '輕一點啦！', '嗚…臉好燙', '痛痛痛！'],
  calm: ['暖暖的～', '好放鬆…', '涼涼的好舒服'],
  tense: ['刺刺的…', '有點緊張…'],
};

export const THANKS = {
  3: '完全沒弄痛我，太專業了！下次還要找你！',
  2: '有一點點痛，不過整張臉清爽多了～',
  1: '嗚…臉好紅好痛，下次可以輕一點嗎？',
};

export const CUSTOMERS = [
  {
    id: 'xiaoming', name: '小明', age: 15, job: '國三生', emoji: '🧑‍🎓', skinType: 'oily',
    desc: '青春期皮脂分泌旺盛，鼻子跟額頭的黑頭讓他很困擾。',
    greet: '老師好…我的鼻子都是黑點點',
    skin: { tone: '#f3c9a8', oil: 0.85, redness: 0.15, pores: 0.8, freckles: 0 },
    hair: { style: 'short', color: '#211b18' }, eye: '#3b2a20', shirt: '#7cc3f0',
    acne: [{ type: 'blackhead', n: 9, zones: ['nose', 'forehead'] }],
    tools: ['squeeze'], par: 40,
    fact: '面皰、粉刺最容易在青春期出現：青春痘和青春期性荷爾蒙的變化有關，皮脂分泌最旺盛的年齡大約是 15～20 歲。',
    refs: ['皮82', '皮91', '皮103'],
  },
  {
    id: 'aze', name: '阿哲', age: 28, job: '工程師', emoji: '👨‍💻', skinType: 'combo',
    desc: 'T 字部位很油，兩頰卻有點乾。額頭和臉頰冒出一顆顆小小的白色突起。',
    greet: '摸起來粗粗的，可是又擠不出來…',
    skin: { tone: '#eec09b', oil: 0.6, redness: 0.2, pores: 0.6, freckles: 0 },
    hair: { style: 'short', color: '#2e2520' }, eye: '#2f2420', shirt: '#5b6b8a',
    acne: [
      { type: 'blackhead', n: 4, zones: ['nose'] },
      { type: 'whitehead', n: 6, zones: ['forehead', 'cheeks'] },
    ],
    tools: ['squeeze', 'steam'], par: 60,
    fact: 'T 字部位出油、毛孔粗大，但雙頰乾燥，是混合性皮膚。保養時可以分區處理：T 字加強清潔，兩頰加強保濕。',
    refs: ['皮65', '補充'],
  },
  {
    id: 'xiaomei', name: '小美', age: 21, job: '大學生', emoji: '👩‍🎓', skinType: 'sensitive',
    desc: '皮膚容易泛紅發癢。期末考週熬夜，臉頰和下巴冒出幾顆有黃色膿頭的痘痘。',
    greet: '考完試臉就爆炸了啦…',
    skin: { tone: '#f6d2b8', oil: 0.45, redness: 0.4, pores: 0.4, freckles: 0.35 },
    hair: { style: 'bun', color: '#4a2e22' }, eye: '#5a3a24', shirt: '#ff9fb2',
    acne: [
      { type: 'blackhead', n: 3, zones: ['nose'] },
      { type: 'whitehead', n: 3, zones: ['forehead'] },
      { type: 'pustule', n: 3, zones: ['cheeks', 'chin'] },
    ],
    tools: ['squeeze', 'steam', 'refer'], par: 70,
    fact: '敏感性肌膚的保養品要選不含色素、香料及酒精的；按摩力量要輕、時間要短，蒸臉時間也要縮短。',
    refs: ['護34', '護6', '護51'],
  },
  {
    id: 'zhiqiang', name: '志強', age: 24, job: '籃球員', emoji: '⛹️', skinType: 'acne',
    desc: '每天練球大量流汗，下巴與下顎線冒出紅腫的青春痘。',
    greet: '這幾顆紅紅的超痛，可以直接擠掉嗎？',
    skin: { tone: '#b98262', oil: 0.55, redness: 0.35, pores: 0.5, freckles: 0 },
    hair: { style: 'spiky', color: '#151212' }, eye: '#241814', shirt: '#ff8c42',
    acne: [
      { type: 'blackhead', n: 3, zones: ['nose'] },
      { type: 'whitehead', n: 2, zones: ['forehead'] },
      { type: 'pustule', n: 2, zones: ['forehead', 'cheeks'] },
      { type: 'papule', n: 4, zones: ['jaw', 'chin'] },
    ],
    tools: ['squeeze', 'steam', 'refer', 'gel'], par: 80,
    fact: '長青春痘時，洗臉要選刺激性小的肥皂；化粧品不要選高油度的，以免面皰惡化。',
    refs: ['護28', '護32'],
  },
  {
    id: 'meiling', name: '美玲', age: 38, job: '行銷主管', emoji: '👩‍💼', skinType: 'dry',
    desc: '皮膚偏乾、缺水，近年下巴和下顎線卻反覆冒痘。',
    greet: '都幾歲了還在長痘痘…',
    skin: { tone: '#e8b896', oil: 0.3, redness: 0.5, pores: 0.4, freckles: 0.15 },
    hair: { style: 'long', color: '#3a2418' }, eye: '#3d2616', shirt: '#9b7fd1',
    acne: [
      { type: 'blackhead', n: 3, zones: ['nose'] },
      { type: 'whitehead', n: 3, zones: ['cheeks'] },
      { type: 'pustule', n: 2, zones: ['chin'] },
      { type: 'papule', n: 4, zones: ['jaw', 'chin'] },
    ],
    tools: ['squeeze', 'steam', 'refer', 'gel'], par: 90,
    fact: '臉上有嚴重的青春痘時，不要化濃粧掩飾，要保持清潔、注意飲食作息，並去看皮膚科醫師。乾性皮膚雖然適合高油度的營養霜，但長痘時要避開高油度的化粧品。',
    refs: ['護29', '護9', '護32'],
  },
];

export const TAKEAWAYS = [
  { text: '粉刺是皮脂腺分泌失調形成的；黑頭是氧化的皮脂，不是髒東西。', refs: ['皮53'] },
  { text: '蒸臉時間看膚質：油性多蒸；乾性、敏感、面皰皮膚要縮短。', refs: ['護37', '護51', '護52', '護53'] },
  { text: '化膿性的痤瘡：請顧客看皮膚科醫師，不要擠。', refs: ['皮15'] },
  { text: '護理青春痘著重清潔、消炎；嚴重面皰不按摩。', refs: ['護14', '護17'] },
  { text: '有嚴重青春痘不要化濃粧掩飾，也別用高油度的化粧品。', refs: ['護29', '護32'] },
];
