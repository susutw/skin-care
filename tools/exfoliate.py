"""SVG figure for the exfoliation question on the notes page."""
import random

random.seed(5)


def panel(ox, kind):
    o = []
    W, base = 240, 150
    o.append(f'<rect x="{ox}" y="0" width="{W}" height="210" class="bg-air"/>')
    o.append(f'<rect x="{ox}" y="{base}" width="{W}" height="{210-base}" class="bg-cell"/>')
    rows = {'normal': 5, 'thick': 8, 'thin': 1}[kind]
    y = base
    for r in range(rows):
        y -= 12
        off = (r % 2) * 30
        for x in range(ox - 30 + off, ox + W, 60):
            x1, x2 = max(x, ox), min(x + 56, ox + W)
            if x2 - x1 < 10:
                continue
            if kind == 'thin' and random.random() < 0.35:
                continue
            jitter = random.uniform(-4, 4) if (kind == 'thick' and r > 5) else 0
            o.append(f'<rect x="{x1}" y="{y+jitter:.1f}" width="{x2-x1}" height="10" rx="3" class="corneo"/>')
    top = y
    if kind == 'thick':
        for (x, yy, a) in ((ox + 30, top - 16, -14), (ox + 120, top - 22, 10), (ox + 180, top - 12, -6)):
            o.append(f'<rect x="{x}" y="{yy}" width="44" height="9" rx="3" class="corneo" transform="rotate({a} {x+22} {yy+4})"/>')
    # light rays
    if kind == 'normal':
        for x in (ox + 50, ox + 150):
            o.append(f'<path d="M{x} 20 L {x+30} {top-2} L {x+60} 20" class="ray"/>')
        o.append(f'<text x="{ox+W/2}" y="{top-24}" text-anchor="middle" class="t-s">光線整齊反射→有光澤</text>')
    if kind == 'thick':
        for x, ex in ((ox + 60, -44), (ox + 160, 44)):
            o.append(f'<path d="M{x} 2 L {x+14} {top-18} L {x+14+ex} {top-30}" class="ray"/>')
        o.append(f'<text x="{ox+W/2}" y="186" text-anchor="middle" class="t-s">表面不平，光線亂射→暗沉</text>')
    if kind == 'thin':
        for x in (ox + 50, ox + 120, ox + 190):
            o.append(f'<path d="M{x} {top-4} V {top-40}" class="evap" marker-end="url(#ar7)"/>')
            o.append(f'<path d="M{x} {top-18} q -5 -8 0 -14 q 5 6 0 14 z" class="drop"/>')
        for x in (ox + 85, ox + 155):
            o.append(f'<path d="M{x} 40 V {top+18}" class="in" marker-end="url(#ar8)"/>')
        o.append(f'<text x="{ox+10}" y="30" class="t-s">水分跑掉，刺激物跑進去</text>')
    return ''.join(o)


def exfoliation():
    items = [('normal', '角質正常', '約 28 天自然更新，不必去除'),
             ('thick', '角質堆積', '更新變慢，摸起來粗、看起來暗'),
             ('thin', '過度去角質', '屏障變薄：乾、紅、刺痛')]
    o = ['<defs>'
         '<marker id="ar7" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="drop"/></marker>'
         '<marker id="ar8" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="in-head"/></marker>'
         '</defs>']
    for i, (k, t, s) in enumerate(items):
        ox = i * 256
        o.append(f'<clipPath id="ex{i}"><rect x="{ox}" y="0" width="240" height="210" rx="10"/></clipPath>')
        o.append(f'<g clip-path="url(#ex{i})">{panel(ox, k)}</g>')
        o.append(f'<rect x="{ox+0.5}" y="0.5" width="239" height="209" rx="10" class="frame"/>')
        o.append(f'<text x="{ox+8}" y="234" class="t">{t}</text>')
        o.append(f'<text x="{ox+8}" y="254" class="t-s">{s}</text>')
    return f'<svg viewBox="0 0 752 262" role="img" aria-label="角質正常、堆積與過度去角質比較">{"".join(o)}</svg>'


out = {'X_EXFOLIATE': exfoliation()}


def peel_depth():
    o = []
    X0, X1 = 90, 330
    layers = [(40, 52, 'l-corn', '角質層'), (52, 112, 'l-spin', '表皮其他層'),
              (112, 150, 'l-derm-top', '真皮乳頭層'), (150, 240, 'l-derm', '真皮網狀層')]
    for y1, y2, cls, name in layers:
        o.append(f'<rect x="{X0}" y="{y1}" width="{X1-X0}" height="{y2-y1}" class="{cls}"/>')
        o.append(f'<text x="{X0-8}" y="{(y1+y2)/2+4}" text-anchor="end" class="t-s">{name}</text>')
    o.append(f'<line x1="{X0}" y1="112" x2="{X1}" y2="112" class="membrane-thin"/>')
    o.append(f'<text x="{X1-6}" y="108" text-anchor="end" class="t-s">基底層</text>')
    cols = [('去角質', 50, '磨砂膏・低濃度果酸', 'mild'), ('淺層換膚', 110, '較高濃度果酸', 'peel'),
            ('中層換膚', 146, '較強的酸', 'peel'), ('深層換膚', 206, '強酸・雷射', 'peel')]
    for i, (name, depth, how, kind) in enumerate(cols):
        x = 380 + i * 96
        o.append(f'<line x1="{X0}" y1="{depth}" x2="{x}" y2="{depth}" class="depthline"/>')
        o.append(f'<rect x="{x-5}" y="40" width="10" height="{depth-40}" rx="4" class="{"bar-mild" if kind=="mild" else "bar-peel"}"/>')
        o.append(f'<text x="{x}" y="28" text-anchor="middle" class="t">{name}</text>')
        o.append(f'<text x="{x}" y="{depth+18}" text-anchor="middle" class="t-s">{how}</text>')
    o.append('<path d="M350 252 V 258 H 410 V 252" class="divider"/><text x="380" y="276" text-anchor="middle" class="t">美容師範圍</text>')
    o.append('<path d="M446 252 V 258 H 698 V 252" class="divider"/><text x="572" y="276" text-anchor="middle" class="t">醫療行為，由醫師執行</text>')
    o.append(f'<line x1="{X0}" y1="150" x2="{X1}" y2="150" class="divider"/>')
    return f'<svg viewBox="0 0 760 286" role="img" aria-label="去角質與各種換膚的作用深度">{"".join(o)}</svg>'


out['X_PEEL'] = peel_depth()
