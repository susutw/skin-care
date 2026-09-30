import math, random
random.seed(7)

def f(x): return f"{x:.1f}".rstrip('0').rstrip('.')

# ---------------------------------------------------------------- 1. skin cross-section
def skin():
    o = []
    X0, X1 = 120, 600
    # dermis + subcutis
    o.append(f'<rect x="{X0}" y="120" width="{X1-X0}" height="240" class="f-derm"/>')
    o.append(f'<rect x="{X0}" y="360" width="{X1-X0}" height="160" class="f-subq"/>')
    # fat lobules
    for row, y in enumerate(range(378, 520, 30)):
        off = 0 if row % 2 else 16
        for x in range(X0 + 16 + off, X1 - 10, 32):
            o.append(f'<circle cx="{x}" cy="{y}" r="15" class="f-fat"/>')
    o.append(f'<rect x="{X0}" y="360" width="{X1-X0}" height="160" fill="none" class="s-line"/>')
    # deep vessels in subcutis
    o.append(f'<path d="M{X0} 452 C 250 440, 420 468, {X1} 450" class="v-art" stroke-width="7" fill="none"/>')
    o.append(f'<path d="M{X0} 470 C 250 458, 420 486, {X1} 468" class="v-vein" stroke-width="7" fill="none"/>')
    # dermis vessels
    o.append(f'<path d="M{X0} 298 C 260 290, 420 306, {X1} 296" class="v-art" stroke-width="4" fill="none"/>')
    o.append(f'<path d="M{X0} 312 C 260 304, 420 320, {X1} 310" class="v-vein" stroke-width="4" fill="none"/>')
    # capillary loops into papillae (papillae peaks at x where wave goes up)
    for x in (360, 420, 540):
        o.append(f'<path d="M{x-4} 300 V 138 Q {x} 128 {x+4} 138 V 308" class="v-art" stroke-width="2" fill="none"/>')
    # epidermis with wavy lower border
    pts = []
    n = 24
    for i in range(n + 1):
        x = X1 - (X1 - X0) * i / n
        pts.append(x)
    d = f'M{X0} 70 H{X1} V138 '
    for i in range(n):
        xa, xb = pts[i], pts[i + 1]
        cy = 118 if i % 2 == 0 else 158
        d += f'Q {f((xa+xb)/2)} {cy} {f(xb)} 138 '
    d += 'Z'
    o.append(f'<path d="{d}" class="f-epi"/>')
    o.append(f'<rect x="{X0}" y="70" width="{X1-X0}" height="9" class="f-corn"/>')
    # nerve
    o.append('<path d="M120 345 C 250 340, 380 320, 470 280 S 550 230, 556 168" class="v-nerve" stroke-width="3" fill="none"/>')
    o.append('<path d="M556 168 l-8 -12 M556 168 l0 -14 M556 168 l8 -12" class="v-nerve" stroke-width="2" fill="none"/>')
    # apocrine gland (coil) + duct into follicle
    o.append('<path d="M226 345 C 226 260, 240 170, 250 132" class="s-sweat" stroke-width="4" fill="none"/>')
    for (cx, cy) in ((210, 350), (224, 360), (206, 366), (220, 344), (214, 374)):
        o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="11" ry="8" class="g-sweat"/>')
    # hair follicle
    o.append('<path d="M246 70 V 392 Q 246 418 260 418 Q 274 418 274 392 V 70" class="f-foll"/>')
    o.append('<ellipse cx="260" cy="404" rx="20" ry="16" class="f-foll"/>')
    o.append('<ellipse cx="260" cy="410" rx="7" ry="6" class="v-art-fill"/>')
    o.append('<line x1="260" y1="398" x2="260" y2="70" class="s-hair" stroke-width="6"/>')
    o.append('<path d="M260 72 C 256 50, 246 28, 232 10" class="s-hair" stroke-width="6" fill="none"/>')
    # sebaceous gland
    o.append('<path d="M274 152 H 286" class="s-seb" stroke-width="5"/>')
    for (cx, cy, r) in ((290, 160, 12), (302, 176, 12), (286, 184, 11), (300, 196, 9)):
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" class="g-seb"/>')
    # arrector pili
    o.append('<path d="M274 250 L 338 146" class="s-muscle" stroke-width="7" stroke-linecap="round" fill="none"/>')
    # eccrine gland: coil + duct to pore
    o.append('<path d="M470 322 V 160 Q 462 150 470 140 Q 478 130 470 120 Q 462 110 470 100 Q 478 90 470 80 V 70" class="s-sweat" stroke-width="4" fill="none"/>')
    for (cx, cy) in ((462, 330), (478, 334), (468, 342), (484, 346), (458, 344)):
        o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="10" ry="7" class="g-sweat"/>')
    # sebum film / surface line
    o.append(f'<line x1="{X0}" y1="70" x2="{X1}" y2="70" class="s-ink" stroke-width="1.5"/>')

    # left layer brackets
    def bracket(y1, y2, x, label, sub=None, small=False):
        s = f'<path d="M{x} {y1+2} H{x-6} V{y2-2} H{x}" class="s-muted" fill="none"/>'
        ym = (y1 + y2) / 2
        cls = 'lbl-s' if small else 'lbl-b'
        s += f'<text x="{x-12}" y="{f(ym + (0 if sub else 5))}" text-anchor="end" class="{cls}">{label}</text>'
        if sub:
            s += f'<text x="{x-12}" y="{f(ym + 17)}" text-anchor="end" class="lbl-s">{sub}</text>'
        return s
    o.append(bracket(70, 140, 112, '表皮', '無血管'))
    o.append(bracket(140, 360, 112, '真皮', '血管・神經・腺體'))
    o.append(bracket(140, 192, 70, '乳頭層', small=True))
    o.append(bracket(192, 360, 70, '網狀層', small=True))
    o.append(bracket(360, 520, 112, '皮下組織', '脂肪'))

    # right labels
    labels = [
        ((234, 22), 22, '毛幹', '露出皮膚的部分'),
        ((470, 70), 58, '汗孔', '小汗腺開口於皮膚表面'),
        ((416, 136), 102, '微血管', '供給表皮營養'),
        ((330, 158), 146, '豎毛肌', '自主神經支配'),
        ((306, 184), 190, '皮脂腺', '開口於毛囊'),
        ((556, 162), 234, '感覺神經末梢', '冷・熱・痛・癢'),
        ((274, 290), 278, '毛囊', ''),
        ((488, 336), 314, '小汗腺', '全身・散熱'),
        ((592, 303), 352, '動脈 / 靜脈', ''),
        ((230, 364), 390, '大汗腺（頂漿腺）', '開口於毛囊・狐臭'),
        ((280, 406), 430, '毛球 / 毛乳頭', ''),
        ((540, 480), 478, '脂肪細胞', '保溫・緩衝・儲能'),
    ]
    for (px, py), ly, t, sub in labels:
        o.append(f'<circle cx="{px}" cy="{py}" r="3" class="dot"/>')
        o.append(f'<path d="M{px} {py} L 612 {ly} H 620" class="leader" fill="none"/>')
        o.append(f'<text x="626" y="{ly+5}" class="lbl">{t}</text>')
        if sub:
            o.append(f'<text x="626" y="{ly+21}" class="lbl-s">{sub}</text>')
    return '<svg viewBox="0 0 830 540" role="img" aria-label="皮膚構造剖面圖：表皮、真皮、皮下組織與附屬器官">' + ''.join(o) + '</svg>'

# ---------------------------------------------------------------- 2. epidermis five layers
def epidermis():
    o = []
    X0, X1 = 170, 560
    o.append(f'<rect x="{X0}" y="336" width="{X1-X0}" height="50" class="f-derm"/>')
    o.append(f'<path d="M{X0} 368 C 300 360, 420 376, {X1} 366" class="v-art" stroke-width="4" fill="none"/>')
    o.append(f'<text x="{(X0+X1)/2}" y="356" text-anchor="middle" class="lbl-s">真皮：血液經基底膜供給表皮養分</text>')
    # stratum corneum flakes
    o.append(f'<rect x="{X0}" y="40" width="{X1-X0}" height="56" class="f-corn-soft"/>')
    for r, y in enumerate(range(46, 92, 9)):
        off = (r % 2) * 30
        for x in range(X0 - 30 + off, X1, 62):
            x1 = max(x, X0); x2 = min(x + 56, X1)
            if x2 - x1 > 8:
                o.append(f'<rect x="{x1}" y="{y}" width="{x2-x1}" height="6" rx="3" class="cell-corn"/>')
    for (x, y, a) in ((230, 26, -8), (330, 22, 6), (470, 28, -4)):
        o.append(f'<rect x="{x}" y="{y}" width="46" height="6" rx="3" class="cell-corn" transform="rotate({a} {x+23} {y+3})"/>')
    # stratum lucidum
    o.append(f'<rect x="{X0}" y="96" width="{X1-X0}" height="18" class="f-luc"/>')
    # granular
    o.append(f'<rect x="{X0}" y="114" width="{X1-X0}" height="46" class="f-epi"/>')
    for r, y in enumerate((126, 148)):
        off = (r % 2) * 24
        for x in range(X0 + 14 + off, X1 - 10, 48):
            o.append(f'<ellipse cx="{x}" cy="{y}" rx="22" ry="9" class="cell"/>')
            for k in range(4):
                o.append(f'<circle cx="{x-12+k*8}" cy="{y + (2 if k%2 else -2)}" r="1.8" class="gran"/>')
    # spinous
    o.append(f'<rect x="{X0}" y="160" width="{X1-X0}" height="130" class="f-epi"/>')
    for r, y in enumerate(range(178, 290, 30)):
        off = (r % 2) * 17
        for x in range(X0 + 16 + off, X1 - 10, 34):
            o.append(f'<circle cx="{x}" cy="{y}" r="17" class="cell-spine"/>')
            o.append(f'<circle cx="{x}" cy="{y}" r="14" class="cell"/>')
            o.append(f'<circle cx="{x}" cy="{y}" r="4.5" class="nuc"/>')
    # basal
    o.append(f'<rect x="{X0}" y="290" width="{X1-X0}" height="44" class="f-epi"/>')
    mel_x = []
    for i, x in enumerate(range(X0 + 4, X1 - 16, 20)):
        if i in (5, 15):
            mel_x.append(x + 9)
            continue
        o.append(f'<rect x="{x}" y="294" width="17" height="38" rx="6" class="cell"/>')
        o.append(f'<ellipse cx="{x+8.5}" cy="316" rx="4.5" ry="7" class="nuc"/>')
    for mx in mel_x:
        o.append(f'<path d="M{mx} 318 L {mx-22} 262 M{mx} 318 L {mx+4} 250 M{mx} 318 L {mx+26} 266 M{mx} 318 L {mx-30} 294" class="s-mel" stroke-width="3" fill="none" stroke-linecap="round"/>')
        o.append(f'<ellipse cx="{mx}" cy="318" rx="10" ry="12" class="f-mel"/>')
    o.append(f'<line x1="{X0}" y1="335" x2="{X1}" y2="335" class="s-ink" stroke-width="3"/>')
    o.append(f'<rect x="{X0}" y="40" width="{X1-X0}" height="294" fill="none" class="s-line"/>')

    # left: turnover arrow + nucleus brackets
    o.append('<path d="M60 330 V 40" class="s-accent" stroke-width="3" marker-end="url(#arr)" fill="none"/>')
    o.append('<text x="50" y="190" class="lbl-acc" text-anchor="middle" transform="rotate(-90 50 190)">約 28 天　往上推 → 角化 → 剝落</text>')
    def br(y1, y2, t):
        return (f'<path d="M150 {y1+2} H144 V{y2-2} H150" class="s-muted" fill="none"/>'
                f'<text x="138" y="{(y1+y2)/2+5}" text-anchor="end" class="lbl-s">{t}</text>')
    o.append(br(40, 114, '無核'))
    o.append(br(114, 334, '有核'))

    rows = [
        (68, '角質層', '最外層・扁平無核死細胞・含 N.M.F.'),
        (105, '透明層', '無核・只在手掌、腳底'),
        (137, '顆粒層', '顆粒＝角質素・開始角化'),
        (225, '有棘層', '表皮最厚・有淋巴液流通・會分裂'),
        (312, '基底層（生發層）', '最內層・最年輕・會分裂・有黑色素細胞'),
    ]
    for y, t, s in rows:
        o.append(f'<path d="M{X1} {y} H 580" class="leader" fill="none"/>')
        o.append(f'<text x="588" y="{y-2}" class="lbl">{t}</text>')
        o.append(f'<text x="588" y="{y+15}" class="lbl-s">{s}</text>')
    mx = mel_x[1]
    o.append(f'<path d="M{mx+10} 322 C {mx+40} 360, 560 400, 580 402" class="leader" fill="none"/>')
    o.append(f'<text x="588" y="406" class="lbl">黑色素細胞</text>')
    o.append(f'<text x="588" y="422" class="lbl-s">與基底細胞約 1：10</text>')
    o.append(f'<text x="{X0}" y="404" class="lbl-s">基底膜（粗線）：表皮與真皮的交界</text>')
    defs = '<defs><marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="f-accent"/></marker></defs>'
    return '<svg viewBox="0 0 860 432" role="img" aria-label="表皮五層示意圖">' + defs + ''.join(o) + '</svg>'

# ---------------------------------------------------------------- 3. UV
def uv():
    o = []
    def wave(x, y1, y2, amp=7, per=18):
        d = f'M{x} {y1} '
        y = y1
        pts = []
        while y < y2:
            pts.append((x + amp * math.sin((y - y1) / per * 2 * math.pi), y))
            y += 2
        return 'M' + ' L'.join(f'{f(a)} {f(b)}' for a, b in pts)
    o.append('<circle cx="60" cy="40" r="26" class="f-sun"/>')
    o.append('<text x="60" y="45" text-anchor="middle" class="lbl-b">太陽</text>')
    o.append('<rect x="120" y="72" width="620" height="22" class="f-ozone"/>')
    o.append('<text x="130" y="88" class="lbl-s">臭氧層</text>')
    # skin block
    o.append('<rect x="120" y="170" width="620" height="44" class="f-epi"/>')
    o.append('<rect x="120" y="214" width="620" height="66" class="f-derm"/>')
    o.append('<rect x="120" y="280" width="620" height="24" class="f-subq"/>')
    o.append('<text x="734" y="197" text-anchor="end" class="lbl-s">表皮</text>')
    o.append('<text x="734" y="252" text-anchor="end" class="lbl-s">真皮</text>')
    o.append('<text x="734" y="297" text-anchor="end" class="lbl-s">皮下組織</text>')
    o.append(f'<path d="{wave(230, 20, 72)}" class="s-uvc" stroke-width="3" fill="none"/>')
    o.append('<path d="M222 70 l16 12 M238 70 l-16 12" class="s-uvc" stroke-width="3"/>')
    o.append('<text x="248" y="36" class="lbl">UVC</text><text x="248" y="54" class="lbl-s">被臭氧層吸收</text>')
    o.append(f'<path d="{wave(400, 20, 206, 6, 15)}" class="s-uvb" stroke-width="3" fill="none"/>')
    o.append('<text x="416" y="36" class="lbl">UVB</text><text x="416" y="54" class="lbl-s">到達表皮・曬紅曬傷</text>')
    o.append(f'<path d="{wave(580, 20, 270, 8, 24)}" class="s-uva" stroke-width="3" fill="none"/>')
    o.append('<text x="596" y="36" class="lbl">UVA</text><text x="596" y="54" class="lbl-s">深入真皮・老化</text>')
    return '<svg viewBox="0 0 760 312" role="img" aria-label="紫外線穿透示意圖">' + ''.join(o) + '</svg>'

# ---------------------------------------------------------------- 4. pH
def ph():
    o = []
    X0, X1 = 40, 720
    s = (X1 - X0) / 14
    X = lambda v: X0 + v * s
    o.append('<defs><linearGradient id="phg" x1="0" x2="1"><stop offset="0" style="stop-color:var(--acid)"/><stop offset="0.5" style="stop-color:var(--neutral)"/><stop offset="1" style="stop-color:var(--alk)"/></linearGradient></defs>')
    o.append(f'<rect x="{X0}" y="70" width="{X1-X0}" height="24" rx="12" fill="url(#phg)"/>')
    for v in range(15):
        o.append(f'<line x1="{f(X(v))}" y1="94" x2="{f(X(v))}" y2="101" class="s-muted"/>')
        o.append(f'<text x="{f(X(v))}" y="116" text-anchor="middle" class="lbl-num">{v}</text>')
    o.append(f'<rect x="{f(X(4))}" y="62" width="{f(X(6)-X(4))}" height="40" rx="6" class="band"/>')
    o.append(f'<text x="{f(X(5))}" y="48" text-anchor="middle" class="lbl">皮膚 4–6 弱酸性</text>')
    o.append(f'<text x="{f(X(5))}" y="30" text-anchor="middle" class="lbl-s">健康 5–6・皮脂膜・汗水</text>')
    o.append(f'<path d="M{f(X(7))} 58 V 104" class="s-ink" stroke-width="2"/>')
    o.append(f'<text x="{f(X(7))}" y="48" text-anchor="middle" class="lbl">7 中性</text>')
    o.append(f'<path d="M{f(X(7.4))} 104 V 136" class="s-ink" stroke-width="2"/>')
    o.append(f'<text x="{f(X(7.4)+6)}" y="148" class="lbl">血液 ≈7.4 弱鹼性</text>')
    o.append(f'<text x="{X0}" y="148" class="lbl-s">← 數值愈低，酸性愈強</text>')
    o.append(f'<text x="{X1}" y="48" text-anchor="end" class="lbl-s">鹼性 →</text>')
    return '<svg viewBox="0 0 760 160" role="img" aria-label="酸鹼值刻度">' + ''.join(o) + '</svg>'

# ---------------------------------------------------------------- 5. faces
def face(cx, title, content):
    o = [f'<g transform="translate({cx} 0)">']
    o.append(f'<clipPath id="fc{cx}"><ellipse cx="170" cy="210" rx="120" ry="158"/></clipPath>')
    o.append('<ellipse cx="170" cy="210" rx="120" ry="158" class="f-face"/>')
    o.append(content(cx))
    o.append('<path d="M112 150 Q 132 140 152 150 M188 150 Q 208 140 228 150" class="s-ink" stroke-width="3" fill="none" stroke-linecap="round"/>')
    o.append('<ellipse cx="132" cy="178" rx="20" ry="9" class="f-eye"/><ellipse cx="208" cy="178" rx="20" ry="9" class="f-eye"/>')
    o.append('<path d="M170 190 V 250 Q 160 262 170 266 Q 180 262 170 250" class="s-ink" stroke-width="2" fill="none"/>')
    o.append('<path d="M140 300 Q 170 318 200 300 Q 170 292 140 300 Z" class="f-lip"/>')
    o.append(f'<text x="170" y="400" text-anchor="middle" class="lbl-b">{title}</text>')
    o.append('</g>')
    return ''.join(o)

def faces():
    def tzone(cx):
        return (f'<g clip-path="url(#fc{cx})">'
                '<rect x="40" y="50" width="260" height="84" class="f-t"/>'
                '<rect x="148" y="130" width="44" height="146" class="f-t"/>'
                '<ellipse cx="170" cy="352" rx="62" ry="36" class="f-t"/></g>'
                '<text x="170" y="100" text-anchor="middle" class="lbl">額頭</text>'
                '<text x="170" y="350" text-anchor="middle" class="lbl">下巴</text>'
                '<text x="92" y="240" text-anchor="middle" class="lbl-s">臉頰</text>'
                '<text x="248" y="240" text-anchor="middle" class="lbl-s">臉頰</text>'
                '<path d="M112 178 H 70" class="leader"/><text x="18" y="182" class="lbl-s">眼眶</text>')
    def massage(cx):
        a = 'class="s-accent" stroke-width="2.5" fill="none" marker-end="url(#arr2)"'
        return (f'<path d="M130 120 V 76" {a}/><path d="M170 120 V 70" {a}/><path d="M210 120 V 76" {a}/>'
                f'<path d="M150 240 Q 110 222 76 196" {a}/><path d="M190 240 Q 230 222 264 196" {a}/>'
                f'<path d="M150 282 Q 110 272 82 250" {a}/><path d="M190 282 Q 230 272 258 250" {a}/>'
                f'<path d="M150 336 Q 120 330 100 306" {a}/><path d="M190 336 Q 220 330 240 306" {a}/>')
    defs = '<defs><marker id="arr2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="f-accent"/></marker></defs>'
    return ('<svg viewBox="0 0 740 412" role="img" aria-label="T字部位與按摩方向">' + defs +
            face(10, 'T 字部位＝額頭・鼻子・下巴', tzone) + face(390, '按摩：由下往上、由內往外', massage) + '</svg>')

# ---------------------------------------------------------------- 6. emulsion
def emulsion():
    o = []
    o.append('<rect x="0" y="0" width="420" height="230" rx="14" class="f-water"/>')
    o.append('<text x="16" y="26" class="lbl-s">水相</text>')
    for (cx, cy, r) in ((110, 120, 46), (270, 90, 34), (300, 176, 30)):
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" class="f-oil"/>')
        n = int(2 * math.pi * r / 14)
        for i in range(n):
            t = 2 * math.pi * i / n
            x1, y1 = cx + (r - 12) * math.cos(t), cy + (r - 12) * math.sin(t)
            x2, y2 = cx + (r + 2) * math.cos(t), cy + (r + 2) * math.sin(t)
            hx, hy = cx + (r + 7) * math.cos(t), cy + (r + 7) * math.sin(t)
            o.append(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" class="s-ink" stroke-width="1.5"/>')
            o.append(f'<circle cx="{f(hx)}" cy="{f(hy)}" r="4.5" class="f-accent"/>')
    o.append('<text x="110" y="125" text-anchor="middle" class="lbl-s">油滴</text>')
    # legend
    o.append('<circle cx="440" cy="70" r="6" class="f-accent"/><text x="456" y="75" class="lbl-s">親水端：朝向水</text>')
    o.append('<line x1="434" y1="104" x2="450" y2="104" class="s-ink" stroke-width="2"/><text x="456" y="109" class="lbl-s">親油端：插進油</text>')
    o.append('<text x="434" y="150" class="lbl">界面活性劑</text><text x="434" y="168" class="lbl-s">（乳化劑）把油和水</text><text x="434" y="186" class="lbl-s">均勻混合 → 乳化</text>')
    return '<svg viewBox="0 0 600 232" role="img" aria-label="乳化示意圖">' + ''.join(o) + '</svg>'

out = {'SKIN': skin(), 'EPI': epidermis(), 'UV': uv(), 'PH': ph(), 'FACES': faces(), 'EMUL': emulsion()}
