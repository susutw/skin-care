"""SVG figures for the acne questions on the notes page."""
import math, random

random.seed(11)


def f(x):
    return f"{x:.1f}".rstrip('0').rstrip('.')


def bugs(pts, r=2.6):
    return ''.join(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{r+1}" ry="{r*0.7}" class="bug" transform="rotate({random.randint(-50,50)} {f(x)} {f(y)})"/>' for x, y in pts)


def scatter(n, cx, cy, rx, ry):
    out = []
    while len(out) < n:
        a, b = random.uniform(-1, 1), random.uniform(-1, 1)
        if a * a + b * b <= 1:
            out.append((cx + a * rx, cy + b * ry))
    return out


# ---------------------------------------------------------------- acne stages
def stage(ox, kind):
    o = []
    cx = ox + 100
    S = 48  # skin surface
    bump = {'white': 8, 'inflamed': 22}.get(kind, 0)
    # dermis & epidermis
    o.append(f'<rect x="{ox}" y="{S}" width="200" height="{230-S}" class="bg-derm"/>')
    top = f'M{ox} {S} H{cx-50} Q {cx} {S-bump*2} {cx+50} {S} H{ox+200}'
    o.append(f'<path d="{top} V{S+40} H{ox} Z" class="bg-cell"/>')
    o.append(f'<path d="{top}" class="surface"/>')
    # inflammation halo
    if kind == 'inflamed':
        o.append(f'<ellipse cx="{cx}" cy="{S+52}" rx="64" ry="62" class="inflame"/>')
    # sebaceous glands
    for sgn in (-1, 1):
        gx = cx + sgn * 30
        o.append(f'<path d="M{cx+sgn*10} {S+96} L {gx} {S+104}" class="duct"/>')
        for (dx, dy, r) in ((0, 108, 13), (sgn * 12, 124, 11), (-sgn * 2, 136, 9)):
            o.append(f'<circle cx="{gx+dx}" cy="{S+dy}" r="{r}" class="sebum"/>')
    # follicle shape by stage
    if kind in ('normal', 'micro'):
        wall = f'M{cx-14} {S} L {cx-9} {S+150} Q {cx} {S+162} {cx+9} {S+150} L {cx+14} {S}'
        o.append(f'<path d="{wall}" class="foll"/>')
    elif kind in ('white', 'black'):
        wall = (f'M{cx-10} {S} C {cx-12} {S+14}, {cx-34} {S+20}, {cx-34} {S+52} '
                f'C {cx-34} {S+84}, {cx-12} {S+96}, {cx-9} {S+150} Q {cx} {S+162} {cx+9} {S+150} '
                f'C {cx+12} {S+96}, {cx+34} {S+84}, {cx+34} {S+52} C {cx+34} {S+20}, {cx+12} {S+14}, {cx+10} {S}')
        o.append(f'<path d="{wall}" class="foll"/>')
    else:  # inflamed: ruptured wall
        o.append(f'<path d="M{cx-9} {S+150} C {cx-12} {S+100}, {cx-40} {S+90}, {cx-40} {S+50}" class="foll-broken"/>')
        o.append(f'<path d="M{cx+9} {S+150} C {cx+12} {S+100}, {cx+40} {S+90}, {cx+40} {S+50} C {cx+40} {S+30}, {cx+30} {S+18}, {cx+22} {S+10}" class="foll-broken"/>')
        o.append(f'<ellipse cx="{cx}" cy="{S+42}" rx="30" ry="34" class="pus"/>')
    # hair
    o.append(f'<line x1="{cx}" y1="{S+152}" x2="{cx}" y2="{S+60 if kind != "normal" else S-30}" class="hairline"/>')
    # contents
    if kind == 'normal':
        for y in range(S + 20, S + 140, 22):
            o.append(f'<circle cx="{cx + (3 if y % 44 else -3)}" cy="{y}" r="3.5" class="sebum-drop"/>')
        o.append(bugs(scatter(3, cx, S + 110, 5, 30)))
    elif kind == 'micro':
        for i, y in enumerate(range(S + 4, S + 60, 8)):
            o.append(f'<rect x="{cx-12}" y="{y}" width="24" height="6" rx="3" class="keratin"/>')
        o.append(f'<rect x="{cx-9}" y="{S+64}" width="18" height="80" rx="8" class="sebum-fill"/>')
        o.append(bugs(scatter(5, cx, S + 110, 5, 30)))
    elif kind in ('white', 'black'):
        o.append(f'<ellipse cx="{cx}" cy="{S+54}" rx="30" ry="40" class="sebum-fill"/>')
        for y in range(S + 26, S + 84, 9):
            w = 44 - abs(y - (S + 54)) * 0.7
            o.append(f'<rect x="{f(cx-w/2)}" y="{y}" width="{f(w)}" height="6" rx="3" class="keratin"/>')
        o.append(bugs(scatter(10, cx, S + 60, 20, 26)))
        if kind == 'white':
            o.append(f'<path d="M{cx-12} {S-4} Q {cx} {S-16} {cx+12} {S-4}" class="closed"/>')
        else:
            o.append(f'<ellipse cx="{cx}" cy="{S+4}" rx="12" ry="7" class="blackhead"/>')
    else:
        o.append(bugs(scatter(16, cx, S + 50, 24, 28)))
        for (x, y) in scatter(8, cx, S + 110, 44, 30):
            o.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="3.2" class="immune"/>')
    return ''.join(o)


def stages():
    items = [('normal', '① 正常毛孔', '皮脂順著毛孔流出'),
             ('micro', '② 微粉刺', '角質塞住毛孔口・肉眼看不見'),
             ('white', '③ 白頭粉刺', '毛孔口封住・皮膚微微隆起'),
             ('black', '④ 黑頭粉刺', '毛孔口打開・頂端氧化變黑'),
             ('inflamed', '⑤ 發炎痘痘', '毛囊破裂・紅腫化膿')]
    o = ['<defs><marker id="ar3" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="arrowhead"/></marker></defs>']
    for i, (k, t, s) in enumerate(items):
        ox = i * 216
        o.append(f'<g clip-path="url(#st{i})"><clipPath id="st{i}"><rect x="{ox}" y="0" width="200" height="230" rx="10"/></clipPath>{stage(ox, k)}</g>')
        o.append(f'<rect x="{ox+0.5}" y="0.5" width="199" height="229" rx="10" class="frame"/>')
        o.append(f'<text x="{ox+8}" y="254" class="t">{t}</text>')
        o.append(f'<text x="{ox+8}" y="274" class="t-s">{s}</text>')
        if i < 4:
            o.append(f'<path d="M{ox+202} 115 H {ox+212}" class="arrow" marker-end="url(#ar3)"/>')
    return f'<svg viewBox="0 0 1064 284" role="img" aria-label="青春痘形成的五個階段">{"".join(o)}</svg>'


# ---------------------------------------------------------------- surface vs clogged pore
def surface_vs_pore():
    o = []
    # left: open surface
    o.append('<rect x="0" y="0" width="360" height="250" rx="10" class="bg-air"/>')
    o.append('<rect x="0" y="150" width="360" height="100" class="bg-cell"/>')
    o.append('<rect x="0" y="136" width="360" height="14" class="film"/>')
    o.append('<text x="12" y="147" class="t-s">皮脂膜：弱酸性 pH 4.5–6＋脂肪酸</text>')
    for (x, y) in ((70, 100), (150, 86), (250, 104), (310, 90)):
        o.append(f'<circle cx="{x}" cy="{y}" r="11" class="bad"/>')
        o.append(f'<path d="M{x-7} {y-7} L {x+7} {y+7}" class="nope"/>')
    o.append('<text x="12" y="28" class="t">皮膚表面：抑菌有效</text>')
    o.append('<text x="12" y="48" class="t-s">外來的壞菌（如金黃色葡萄球菌）不容易存活</text>')
    o.append('<text x="12" y="200" class="t-s">有氧氣・一直在剝落更新</text>')
    # right: clogged pore
    ox = 400
    o.append(f'<rect x="{ox}" y="0" width="360" height="250" rx="10" class="bg-derm"/>')
    o.append(f'<rect x="{ox}" y="60" width="360" height="30" class="bg-cell"/>')
    cx = ox + 180
    o.append(f'<path d="M{cx-14} 60 C {cx-16} 80, {cx-50} 90, {cx-50} 140 C {cx-50} 190, {cx-14} 200, {cx-10} 240 H {cx+10} C {cx+14} 200, {cx+50} 190, {cx+50} 140 C {cx+50} 90, {cx+16} 80, {cx+14} 60" class="foll"/>')
    o.append(f'<ellipse cx="{cx}" cy="140" rx="44" ry="58" class="sebum-fill"/>')
    for y in range(56, 90, 8):
        o.append(f'<rect x="{cx-16}" y="{y}" width="32" height="6" rx="3" class="keratin"/>')
    o.append(bugs(scatter(22, cx, 145, 32, 44)))
    o.append(f'<text x="{ox+12}" y="28" class="t">毛孔裡面：抑菌管不到</text>')
    o.append(f'<text x="{ox+12}" y="48" class="t-s">角質堵住 → 沒有氧氣</text>')
    o.append(f'<text x="{cx+60}" y="130" class="t-s">痤瘡桿菌</text>')
    o.append(f'<text x="{cx+60}" y="148" class="t-s">以皮脂為食</text>')
    o.append(f'<text x="{cx+60}" y="166" class="t-s">大量繁殖</text>')
    o.append(f'<text x="{ox+12}" y="232" class="t-s">角質栓</text>')
    o.append(f'<path d="M{ox+56} 228 L {cx-18} 84" class="lead"/>')
    return f'<svg viewBox="0 0 760 250" role="img" aria-label="皮膚表面與堵住的毛孔比較">{"".join(o)}</svg>'


# ---------------------------------------------------------------- timeline (log scale)
def timeline():
    X0, X1 = 250, 800
    lo, hi = math.log(1), math.log(420)
    X = lambda d: X0 + (math.log(d) - lo) / (hi - lo) * (X1 - X0)
    rows = [
        ('微粉刺長成看得見的粉刺', 42, 84, '約 6–12 週', False),
        ('粉刺發炎，冒出紅腫', 1, 3, '1–3 天', False),
        ('紅腫痘（丘疹、膿皰）消退', 5, 14, '約 1–2 週', False),
        ('結節、囊腫型的大顆痘', 14, 90, '數週到數月', False),
        ('紅印（發炎後紅斑）', 14, 180, '數週到半年', False),
        ('黑印（色素沉澱）', 90, 400, '3 個月到 1 年以上', True),
    ]
    ticks = [(1, '1 天'), (7, '1 週'), (30, '1 個月'), (90, '3 個月'), (180, '半年'), (365, '1 年')]
    top, rh = 34, 42
    bottom = top + rh * len(rows) + 6
    o = []
    for d, t in ticks:
        x = X(d)
        o.append(f'<line x1="{f(x)}" y1="{top-8}" x2="{f(x)}" y2="{bottom}" class="grid"/>')
        o.append(f'<text x="{f(x)}" y="{top-14}" text-anchor="middle" class="axis">{t}</text>')
    for i, (label, a, b, txt, arrow) in enumerate(rows):
        y = top + i * rh + rh / 2
        o.append(f'<text x="{X0-14}" y="{f(y+5)}" text-anchor="end" class="row">{label}</text>')
        xa, xb = X(a), X(b)
        o.append(f'<g class="mark"><title>{label}：{txt}</title>'
                 f'<rect x="{f(xa-4)}" y="{f(y-14)}" width="{f(xb-xa+8)}" height="28" class="hit"/>'
                 f'<rect x="{f(xa)}" y="{f(y-5)}" width="{f(max(xb-xa, 6))}" height="10" rx="4" class="bar"/>')
        if arrow:
            o.append(f'<path d="M{f(xb)} {f(y-8)} L {f(xb+9)} {f(y)} L {f(xb)} {f(y+8)} Z" class="bar"/>')
        o.append('</g>')
        tx = xb + (16 if arrow else 8)
        anchor = 'start'
        if tx > X1 - 60:
            tx, anchor = xa - 8, 'end'
        o.append(f'<text x="{f(tx)}" y="{f(y+4.5)}" text-anchor="{anchor}" class="val">{txt}</text>')
    y = bottom + 24
    o.append(f'<text x="{X0-14}" y="{y}" text-anchor="end" class="row">凹洞疤痕</text>')
    o.append(f'<text x="{X0}" y="{y}" class="val">不會自己消失，要找皮膚科處理</text>')
    return f'<svg viewBox="0 0 830 {bottom+40}" role="img" aria-label="青春痘形成與消退時間軸（對數時間軸）">{"".join(o)}</svg>'


out = {'A_STAGES': stages(), 'A_SURFACE': surface_vs_pore(), 'A_TIME': timeline()}


# ---------------------------------------------------------------- comedones vs inflamed lesions
def lesion(ox, kind):
    o = []
    cx, S, W = ox + 85, 80, 170
    bump = {'white': 7, 'black': 0, 'papule': 12, 'pustule': 16, 'nodule': 20}[kind]
    o.append(f'<rect x="{ox}" y="44" width="{W}" height="{S-44}" class="bg-air"/>')
    o.append(f'<rect x="{ox}" y="{S}" width="{W}" height="{250-S}" class="bg-derm"/>')
    half = 60 if kind == 'nodule' else 34
    top = f'M{ox} {S} H{cx-half} Q {cx} {S-bump*2} {cx+half} {S} H{ox+W}'
    o.append(f'<path d="{top} V{S+30} H{ox} Z" class="bg-cell"/>')
    if kind == 'papule':
        o.append(f'<ellipse cx="{cx}" cy="{S+26}" rx="36" ry="36" class="inflame"/>')
    elif kind == 'pustule':
        o.append(f'<ellipse cx="{cx}" cy="{S+26}" rx="38" ry="38" class="inflame"/>')
    elif kind == 'nodule':
        o.append(f'<ellipse cx="{cx}" cy="{S+90}" rx="66" ry="64" class="inflame"/>')
        o.append(f'<ellipse cx="{cx}" cy="{S+92}" rx="36" ry="38" class="pus"/>')
        o.append(bugs(scatter(10, cx, S + 92, 24, 26)))
    o.append(f'<path d="{top}" class="surface"/>')
    if kind in ('white', 'black', 'papule', 'pustule'):
        o.append(f'<path d="M{cx-8} {S} C {cx-10} {S+10}, {cx-22} {S+14}, {cx-22} {S+34} C {cx-22} {S+52}, {cx-8} {S+58}, {cx-6} {S+100} H {cx+6} C {cx+8} {S+58}, {cx+22} {S+52}, {cx+22} {S+34} C {cx+22} {S+14}, {cx+10} {S+10}, {cx+8} {S}" class="foll"/>')
        o.append(f'<ellipse cx="{cx}" cy="{S+34}" rx="18" ry="24" class="sebum-fill"/>')
        o.append(bugs(scatter(5 if kind in ('white', 'black') else 9, cx, S + 38, 12, 16)))
    if kind == 'white':
        o.append(f'<path d="M{cx-9} {S-3} Q {cx} {S-12} {cx+9} {S-3}" class="closed"/>')
        o.append(f'<circle cx="{cx}" cy="{S-6}" r="5" class="pus"/>')
    if kind == 'black':
        o.append(f'<ellipse cx="{cx}" cy="{S+2}" rx="9" ry="5" class="blackhead"/>')
    if kind == 'pustule':
        o.append(f'<ellipse cx="{cx}" cy="{S-10}" rx="12" ry="9" class="pus"/>')
    if kind == 'nodule':
        o.append(f'<line x1="{ox+W-14}" y1="{S}" x2="{ox+W-14}" y2="{S+156}" class="lead"/>')
        o.append(f'<text x="{ox+W-18}" y="{S+150}" text-anchor="end" class="t-s">深</text>')
    return ''.join(o)


def lesion_types():
    items = [('white', '白頭粉刺', '膚色小凸起、不痛'), ('black', '黑頭粉刺', '毛孔口有黑點、不痛'),
             ('papule', '丘疹', '紅、硬、壓了會痛'), ('pustule', '膿皰', '紅腫＋頂端白黃色膿'),
             ('nodule', '結節・囊腫', '又大又深、很痛、易留疤')]
    o = []
    for i, (k, t, s) in enumerate(items):
        ox = i * 182
        o.append(f'<clipPath id="lt{i}"><rect x="{ox}" y="44" width="170" height="206" rx="10"/></clipPath>')
        o.append(f'<g clip-path="url(#lt{i})">{lesion(ox, k)}</g>')
        o.append(f'<rect x="{ox+0.5}" y="44.5" width="169" height="205" rx="10" class="frame"/>')
        o.append(f'<text x="{ox+8}" y="274" class="t">{t}</text>')
        o.append(f'<text x="{ox+8}" y="294" class="t-s">{s}</text>')
    o.append('<path d="M2 32 V 24 H 350 V 32" class="brk-calm"/><text x="176" y="16" text-anchor="middle" class="t">粉刺：沒有發炎</text>')
    o.append('<path d="M366 32 V 24 H 896 V 32" class="brk-hot"/><text x="631" y="16" text-anchor="middle" class="t">痘痘：已經發炎</text>')
    return f'<svg viewBox="0 0 898 302" role="img" aria-label="粉刺與發炎痘痘的五種型態">{"".join(o)}</svg>'


# ---------------------------------------------------------------- containers
def containers():
    o = []
    # tube
    o.append('<path d="M40 40 H 120 L 112 180 H 48 Z" class="c-plastic"/>')
    o.append('<rect x="36" y="32" width="88" height="10" rx="3" class="c-seal"/>')
    o.append('<rect x="66" y="180" width="28" height="30" rx="4" class="c-cap"/>')
    # plastic pump bottle
    o.append('<rect x="220" y="80" width="84" height="130" rx="16" class="c-plastic"/>')
    o.append('<rect x="244" y="60" width="36" height="22" rx="4" class="c-cap"/>')
    o.append('<path d="M262 60 V 42 H 292" class="c-pump"/>')
    # vial
    o.append('<rect x="410" y="100" width="56" height="110" rx="10" class="c-glass"/>')
    o.append('<rect x="416" y="84" width="44" height="18" rx="3" class="c-cap"/>')
    o.append('<rect x="416" y="150" width="44" height="54" rx="6" class="c-liquid"/>')
    # ampoule
    o.append('<path d="M596 210 H 644 Q 652 210 652 200 V 128 Q 652 112 632 104 V 88 Q 640 80 632 70 V 50 Q 632 40 620 40 Q 608 40 608 50 V 70 Q 600 80 608 88 V 104 Q 588 112 588 128 V 200 Q 588 210 596 210 Z" class="c-glass"/>')
    o.append('<rect x="592" y="150" width="56" height="56" rx="6" class="c-liquid"/>')
    o.append('<line x1="600" y1="78" x2="640" y2="78" class="c-snap"/>')
    for (x, y, a) in ((670, 70, 20), (684, 92, -30), (662, 100, 60)):
        o.append(f'<path d="M{x} {y} l 8 -4 l -2 9 z" class="c-shard" transform="rotate({a} {x} {y})"/>')
    o.append('<text x="660" y="62" class="t-s">折斷處</text>')
    labels = [(80, '軟管', '擠出使用、手不碰到內容物', True), (262, '塑膠瓶', '按壓或倒出、可重複開關', True),
              (438, '小瓶', '有蓋子、可重複開關', True), (620, '玻璃安瓿', '全密封，要折斷瓶頸才打得開', False)]
    for x, t, s, ok in labels:
        cls = 'ok' if ok else 'ng'
        mark = '✓ 適用' if ok else '✗ 不適用'
        o.append(f'<text x="{x}" y="240" text-anchor="middle" class="t">{t}</text>')
        o.append(f'<text x="{x}" y="258" text-anchor="middle" class="{cls}">{mark}</text>')
        o.append(f'<text x="{x}" y="276" text-anchor="middle" class="t-s">{s}</text>')
    return f'<svg viewBox="0 0 740 286" role="img" aria-label="化粧品容器比較">{"".join(o)}</svg>'


out.update({'A_TYPES': lesion_types(), 'CONTAINERS': containers()})
