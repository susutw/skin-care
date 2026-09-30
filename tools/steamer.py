"""SVG figures for the facial-steamer ozone question on the notes page."""


def steamer():
    o = ['<defs><marker id="ar4" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="arrowhead"/></marker></defs>']
    # stand + base
    o.append('<rect x="60" y="250" width="160" height="16" rx="8" class="c-cap"/>')
    o.append('<rect x="132" y="170" width="16" height="82" class="c-cap"/>')
    # water tank with heater
    o.append('<rect x="80" y="100" width="120" height="74" rx="12" class="c-glass"/>')
    o.append('<rect x="84" y="128" width="112" height="42" rx="8" class="water"/>')
    o.append('<path d="M100 160 q 8 -12 16 0 t 16 0 t 16 0 t 16 0" class="heater"/>')
    o.append('<text x="72" y="134" text-anchor="end" class="t-s">水箱</text><text x="72" y="152" text-anchor="end" class="t-s">＋加熱器</text>')
    # arm to nozzle
    o.append('<path d="M140 100 V 60 H 262" class="arm"/>')
    # nozzle with UV lamp
    o.append('<path d="M262 44 H 330 L 350 36 V 84 L 330 76 H 262 Z" class="nozzle"/>')
    o.append('<rect x="276" y="54" width="46" height="12" rx="6" class="uvlamp"/>')
    o.append('<rect x="270" y="48" width="58" height="24" rx="12" class="uvglow"/>')
    o.append('<path d="M299 44 V 20 H 330" class="lead"/>')
    o.append('<text x="336" y="24" class="t-s">紫外線燈：把空氣中的氧氣變成臭氧</text>')
    # steam
    for i, (x, y, r) in enumerate(((372, 60, 10), (398, 52, 13), (428, 64, 15), (460, 54, 17), (494, 66, 18), (528, 58, 19))):
        o.append(f'<circle cx="{x}" cy="{y}" r="{r}" class="steam"/>')
    for (x, y) in ((388, 62), (420, 54), (446, 70), (482, 58), (514, 70), (548, 60)):
        o.append(f'<circle cx="{x}" cy="{y}" r="3.2" class="o3dot"/>')
    o.append('<text x="372" y="112" class="t-s">含臭氧的蒸氣（紫點）</text>')
    # face profile
    o.append('<path d="M640 20 C 604 20, 588 44, 592 62 L 580 80 L 594 84 C 590 96, 596 104, 592 112 C 600 118, 598 128, 596 136 C 604 150, 630 150, 640 160 V 280 H 700 V 20 Z" class="face"/>')
    o.append('<text x="650" y="196" class="t-s">顧客</text>')
    # distance
    o.append('<path d="M352 150 H 588" class="dim" marker-start="url(#ar4)" marker-end="url(#ar4)"/>')
    o.append('<text x="470" y="140" text-anchor="middle" class="t">約 40 公分</text>')
    o.append('<text x="470" y="172" text-anchor="middle" class="t-s">太近會燙傷、吸入太多臭氧</text>')
    return f'<svg viewBox="0 0 720 280" role="img" aria-label="蒸臉機產生臭氧的位置">{"".join(o)}</svg>'


def reaction():
    def mol(cx, cy, n, cls='o-atom'):
        s = ''
        offs = {1: [(0, 0)], 2: [(-13, 0), (13, 0)], 3: [(-22, 6), (0, -10), (22, 6)]}[n]
        for dx, dy in offs:
            s += f'<circle cx="{cx+dx}" cy="{cy+dy}" r="15" class="{cls}"/><text x="{cx+dx}" y="{cy+dy+5}" text-anchor="middle" class="atom-t">O</text>'
        return s
    o = ['<defs><marker id="ar5" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="arrowhead"/></marker></defs>']
    y = 70
    o.append(mol(60, y, 2))
    o.append(f'<text x="60" y="{y+44}" text-anchor="middle" class="t">氧氣 O₂</text><text x="60" y="{y+62}" text-anchor="middle" class="t-s">空氣裡本來就有</text>')
    o.append(f'<path d="M100 {y} H 170" class="arrow" marker-end="url(#ar5)"/>')
    o.append(f'<text x="135" y="{y-16}" text-anchor="middle" class="t-s">紫外線</text>')
    o.append(mol(200, y, 1) + mol(250, y, 1))
    o.append(f'<text x="225" y="{y+44}" text-anchor="middle" class="t">拆成 2 個氧原子</text>')
    o.append(f'<path d="M285 {y} H 345" class="arrow" marker-end="url(#ar5)"/>')
    o.append(f'<text x="315" y="{y-16}" text-anchor="middle" class="t-s">＋ O₂</text>')
    o.append(mol(400, y, 3, 'o-atom o3'))
    o.append(f'<text x="400" y="{y+44}" text-anchor="middle" class="t">臭氧 O₃</text><text x="400" y="{y+62}" text-anchor="middle" class="t-s">不穩定、氧化力強</text>')
    o.append(f'<path d="M440 {y} H 500" class="arrow" marker-end="url(#ar5)"/>')
    o.append(f'<text x="470" y="{y-16}" text-anchor="middle" class="t-s">碰到細菌</text>')
    o.append(f'<ellipse cx="560" cy="{y}" rx="34" ry="20" class="bug-big"/>')
    o.append(f'<path d="M538 {y-12} L 582 {y+12} M 582 {y-12} L 538 {y+12}" class="nope"/>')
    o.append(f'<text x="560" y="{y+44}" text-anchor="middle" class="t">破壞細胞膜</text><text x="560" y="{y+62}" text-anchor="middle" class="t-s">→ 殺菌</text>')
    o.append(mol(660, y, 2))
    o.append(f'<text x="660" y="{y+44}" text-anchor="middle" class="t">變回氧氣</text><text x="660" y="{y+62}" text-anchor="middle" class="t-s">放一陣子就分解</text>')
    return f'<svg viewBox="0 0 720 140" role="img" aria-label="氧氣變成臭氧再殺菌的過程">{"".join(o)}</svg>'


out = {'S_STEAMER': steamer(), 'S_REACTION': reaction()}
