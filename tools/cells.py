"""SVG close-ups of epidermal cells for the notes page."""
import math, random

random.seed(3)
W, H = 420, 210


def f(x):
    return f"{x:.1f}".rstrip('0').rstrip('.')


def panel(cid, body, label):
    return (f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{label}">'
            f'<defs><clipPath id="{cid}"><rect x="0" y="0" width="{W}" height="{H}" rx="10"/></clipPath></defs>'
            f'<g clip-path="url(#{cid})">{body}</g>'
            f'<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" rx="10" class="frame"/></svg>')


def lens(cx, cy, w, h):
    """A flattened spindle cell: two arcs meeting at pointed ends."""
    x1, x2 = cx - w / 2, cx + w / 2
    return f'M{f(x1)} {f(cy)} Q {f(cx)} {f(cy - h)} {f(x2)} {f(cy)} Q {f(cx)} {f(cy + h)} {f(x1)} {f(cy)} Z'


# ---------------------------------------------------------------- 基底層
def basal():
    o = [f'<rect width="{W}" height="{H}" class="bg-cell"/>',
         f'<rect y="182" width="{W}" height="{H-182}" class="bg-derm"/>']
    xs = [14, 70, 184, 240, 296, 352]
    for i, x in enumerate(xs):
        o.append(f'<rect x="{x}" y="66" width="50" height="112" rx="16" class="cell"/>')
        if i == 4:  # dividing cell
            o.append(f'<ellipse cx="{x+25}" cy="98" rx="11" ry="13" class="nuc"/>')
            o.append(f'<ellipse cx="{x+25}" cy="148" rx="11" ry="13" class="nuc"/>')
            o.append(f'<line x1="{x+4}" y1="123" x2="{x+46}" y2="123" class="split"/>')
        else:
            o.append(f'<ellipse cx="{x+25}" cy="128" rx="14" ry="22" class="nuc"/>')
            o.append(f'<path d="M{x+13} 102 Q {x+25} 94 {x+37} 102" class="cap"/>')
    # melanocyte with dendrites between cells
    mx = 152
    for d in (f'M{mx} 150 C {mx-8} 110, {mx-30} 70, {mx-58} 40', f'M{mx} 150 C {mx+4} 100, {mx+6} 60, {mx+14} 24',
              f'M{mx} 150 C {mx+14} 110, {mx+40} 80, {mx+74} 50'):
        o.append(f'<path d="{d}" class="dendrite"/>')
    o.append(f'<ellipse cx="{mx}" cy="152" rx="18" ry="24" class="mel"/>')
    for (x, y) in ((mx-40, 60), (mx-50, 50), (mx+8, 44), (mx+50, 68), (mx+62, 58)):
        o.append(f'<circle cx="{x}" cy="{y}" r="3" class="mel"/>')
    o.append(f'<line x1="0" y1="181" x2="{W}" y2="181" class="membrane"/>')
    o.append('<text x="10" y="200" class="t-s">基底膜</text>')
    o.append(f'<text x="{mx+24}" y="176" class="t-s">黑色素細胞</text>')
    o.append('<text x="308" y="60" class="t-s">分裂中</text>')
    o.append('<text x="10" y="26" class="t">柱狀、細胞核大、會分裂</text>')
    return panel('cp-basal', ''.join(o), '基底層細胞')


# ---------------------------------------------------------------- 有棘層
def spinous():
    o = [f'<rect width="{W}" height="{H}" class="bg-lymph"/>']
    Rg, R = 38, 31
    dx, dy = math.sqrt(3) * Rg, 1.5 * Rg
    centers = []
    for r in range(-1, 6):
        for c in range(-1, 9):
            cx = c * dx + (dx / 2 if r % 2 else 0)
            cy = r * dy + 20
            centers.append((cx, cy))
    # spines across each gap
    for i, (x1, y1) in enumerate(centers):
        for (x2, y2) in centers[i + 1:]:
            d = math.hypot(x2 - x1, y2 - y1)
            if abs(d - dx) > 1:
                continue
            ux, uy = (x2 - x1) / d, (y2 - y1) / d
            px, py = -uy, ux
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            for t in (-14, -5, 5, 14):
                a = (mx + px * t - ux * 9, my + py * t - uy * 9)
                b = (mx + px * t + ux * 9, my + py * t + uy * 9)
                o.append(f'<line x1="{f(a[0])}" y1="{f(a[1])}" x2="{f(b[0])}" y2="{f(b[1])}" class="spine"/>')
    for (cx, cy) in centers:
        pts = ' '.join(f'{f(cx + R*math.cos(math.radians(60*k-90)))},{f(cy + R*math.sin(math.radians(60*k-90)))}' for k in range(6))
        o.append(f'<polygon points="{pts}" class="cell"/>')
        o.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="10" class="nuc"/>')
    o.append(f'<rect x="6" y="6" width="232" height="30" rx="6" class="tag-bg"/>')
    o.append('<text x="14" y="26" class="t">多角形、有核、用「刺」互相拉住</text>')
    o.append(f'<rect x="{W-164}" y="{H-34}" width="158" height="28" rx="6" class="tag-bg"/>')
    o.append(f'<text x="{W-156}" y="{H-15}" class="t-s">縫隙裡是淋巴液（藍色）</text>')
    return panel('cp-spin', ''.join(o), '有棘層細胞')


# ---------------------------------------------------------------- 顆粒層
def granular():
    o = [f'<rect width="{W}" height="{H}" class="bg-lipid"/>']
    rows = [(52, 0), (100, 60), (148, 0), (196, 60)]
    for cy, off in rows:
        for cx in range(-40 + off, W + 80, 124):
            o.append(f'<path d="{lens(cx, cy, 118, 26)}" class="cell"/>')
            o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="8" ry="4.5" class="nuc-dying"/>')
            for _ in range(9):
                gx = cx + random.uniform(-40, 40)
                gy = cy + random.uniform(-6, 6) * (1 - abs(gx - cx) / 60)
                if abs(gx - cx) < 12 and abs(gy - cy) < 6:
                    continue
                o.append(f'<circle cx="{f(gx)}" cy="{f(gy)}" r="{f(random.uniform(1.8, 3.4))}" class="granule"/>')
            for sgn in (-1, 1):
                o.append(f'<circle cx="{f(cx + sgn*44)}" cy="{f(cy + sgn*3)}" r="2.4" class="lamellar"/>')
    o.append(f'<rect x="6" y="4" width="266" height="30" rx="6" class="tag-bg"/>')
    o.append('<text x="14" y="24" class="t">變扁、核縮小、塞滿角質素顆粒</text>')
    return panel('cp-gran', ''.join(o), '顆粒層細胞')


# ---------------------------------------------------------------- 透明層
def lucid():
    o = ['<defs><linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">'
         '<stop offset="0" style="stop-color:var(--glass-hi)"/><stop offset="1" style="stop-color:var(--glass)"/></linearGradient></defs>']
    o.append(f'<rect width="{W}" height="{H}" class="bg-cell"/>')
    y, r = 44, 0
    while y < H + 10:
        off = (r % 2) * 70
        for x in range(-70 + off, W + 10, 140):
            o.append(f'<rect x="{x+2}" y="{y}" width="136" height="16" rx="8" fill="url(#gl)" class="glass"/>')
        y += 18; r += 1
    o.append(f'<path d="M-20 {H} L 120 40 L 170 40 L 30 {H} Z" class="shine"/>')
    o.append(f'<path d="M220 {H} L 340 40 L 356 40 L 236 {H} Z" class="shine"/>')
    o.append('<text x="10" y="26" class="t">非常扁、無核、均勻透亮</text>')
    return panel('cp-luc', ''.join(o), '透明層細胞')


# ---------------------------------------------------------------- 角質層
def corneum():
    o = [f'<rect width="{W}" height="{H}" class="bg-lipid"/>']
    y, r = 70, 0
    while y < H + 10:
        off = (r % 2) * 50
        for x in range(-50 + off, W + 10, 100):
            o.append(f'<rect x="{x+3}" y="{y}" width="94" height="13" rx="3" class="corneo"/>')
        y += 18; r += 1
    for (x, yy, a) in ((40, 48, -9), (170, 40, 7), (300, 50, -5)):
        o.append(f'<rect x="{x}" y="{yy}" width="86" height="12" rx="3" class="corneo" transform="rotate({a} {x+43} {yy+6})"/>')
    o.append('<text x="10" y="26" class="t">扁平死細胞＝磚；脂質＝水泥</text>')
    return panel('cp-corn', ''.join(o), '角質層細胞')


# ---------------------------------------------------------------- 厚皮膚 vs 薄皮膚
def thick_thin():
    o = []
    def column(x0, title, sub, layers, hair):
        s = []
        w = 250
        y = 60
        for name, h, cls, note in layers:
            s.append(f'<rect x="{x0}" y="{y}" width="{w}" height="{h}" class="{cls}"/>')
            if note:
                s.append(f'<text x="{x0+w+10}" y="{y+h/2+5}" class="t-s">{note}</text>')
                s.append(f'<line x1="{x0+w}" y1="{y+h/2}" x2="{x0+w+6}" y2="{y+h/2}" class="lead"/>')
            y += h
        s.append(f'<rect x="{x0}" y="{y}" width="{w}" height="{380-y}" class="bg-derm"/>')
        s.append(f'<text x="{x0+w/2}" y="{y+26}" text-anchor="middle" class="t-s">真皮</text>')
        if hair:
            s.append(f'<path d="M{x0+228} {y+100} V 60 C {x0+230} 50, {x0+236} 46, {x0+244} 42" class="hair"/>')
            for (cx, cy, r) in ((x0+210, y+34, 10), (x0+214, y+50, 9)):
                s.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" class="sebum"/>')
            s.append(f'<text x="{x0+120}" y="{y+86}" class="t-s">毛囊・皮脂腺</text>')
        else:
            s.append(f'<path d="M{x0+60} 60 V {y+80}" class="sweat"/>')
            s.append(f'<text x="{x0+70}" y="{y+76}" class="t-s">汗腺很多，沒有毛、沒有皮脂腺</text>')
        s.append(f'<text x="{x0}" y="30" class="t-b">{title}</text>')
        s.append(f'<text x="{x0}" y="48" class="t-s">{sub}</text>')
        return ''.join(s)
    thick = [('角質層', 96, 'l-corn', '角質層很厚'), ('透明層', 22, 'l-luc', '透明層（看得到）'),
             ('顆粒層', 24, 'l-gran', '顆粒層'), ('有棘層', 70, 'l-spin', '有棘層'), ('基底層', 12, 'l-basal', '基底層')]
    thin = [('角質層', 16, 'l-corn', '角質層薄'), ('顆粒層', 10, 'l-gran', '顆粒層'),
            ('有棘層', 36, 'l-spin', '有棘層'), ('基底層', 10, 'l-basal', '基底層')]
    o.append(column(10, '手掌・腳底（厚皮膚）', '表皮最厚可達約 1.5 mm', thick, False))
    o.append(column(440, '手臂・臉等（薄皮膚）', '表皮約 0.1 mm；眼瞼更薄', thin, True))
    return f'<svg viewBox="0 0 830 390" role="img" aria-label="厚皮膚與薄皮膚比較">{"".join(o)}</svg>'


out = {'C_BASAL': basal(), 'C_SPIN': spinous(), 'C_GRAN': granular(), 'C_LUC': lucid(),
       'C_CORN': corneum(), 'THICKTHIN': thick_thin()}
