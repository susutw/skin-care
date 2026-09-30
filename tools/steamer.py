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


def steam_vs_massage():
    o = ['<defs><marker id="ar6" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="arrowhead"/></marker></defs>']

    def skin(ox, vessel_cls):
        s = f'<rect x="{ox}" y="30" width="360" height="60" class="bg-air"/>'
        s += f'<rect x="{ox}" y="90" width="360" height="160" class="bg-derm"/>'
        s += f'<rect x="{ox}" y="90" width="360" height="34" class="bg-cell"/>'
        s += f'<line x1="{ox}" y1="90" x2="{ox+360}" y2="90" class="surface"/>'
        cx = ox + 90
        s += f'<path d="M{cx-9} 90 L {cx-6} 210 Q {cx} 218 {cx+6} 210 L {cx+9} 90" class="foll"/>'
        s += f'<line x1="{cx}" y1="212" x2="{cx}" y2="96" class="hairline"/>'
        for (dx, dy, r) in ((22, 150, 11), (30, 166, 9)):
            s += f'<circle cx="{cx+dx}" cy="{dy}" r="{r}" class="sebum"/>'
        s += f'<path d="M{ox} 228 C {ox+120} 220, {ox+240} 236, {ox+360} 226" class="{vessel_cls}"/>'
        return s

    # steam panel
    o.append(skin(0, 'vessel-wide'))
    for (x, y, r) in ((40, 52, 12), (70, 44, 15), (106, 54, 13), (150, 46, 16), (196, 54, 13)):
        o.append(f'<circle cx="{x}" cy="{y}" r="{r}" class="steam"/>')
    o.append('<ellipse cx="90" cy="96" rx="16" ry="6" class="sebum-fill"/>')
    for x in (250, 290, 330):
        o.append(f'<path d="M{x} 86 V 52" class="evap" marker-end="url(#ar6)"/>')
        o.append(f'<path d="M{x} 70 q -5 -8 0 -14 q 5 6 0 14 z" class="drop"/>')
    o.append('<text x="12" y="20" class="t">蒸臉：熱＋濕氣</text>')
    o.append('<text x="120" y="112" class="t-s">① 皮脂、角質變軟，好清潔</text>')
    o.append('<text x="220" y="30" class="t-s">② 蒸完水分跟著蒸發</text>')
    o.append('<text x="130" y="214" class="t-s">③ 血管擴張、皮膚變紅</text>')
    # massage panel
    ox = 400
    o.append(skin(ox, 'vessel'))
    o.append(f'<path d="M{ox+170} 70 a 26 12 0 1 1 52 0 a 26 12 0 1 1 -52 0" class="rub" marker-end="url(#ar6)"/>')
    o.append(f'<path d="M{ox+260} 70 a 26 12 0 1 1 52 0 a 26 12 0 1 1 -52 0" class="rub" marker-end="url(#ar6)"/>')
    o.append(f'<rect x="{ox+150}" y="84" width="180" height="6" rx="3" class="cream"/>')
    for x in (ox + 60, ox + 170, ox + 280):
        o.append(f'<path d="M{x} 230 H {x+34}" class="flow" marker-end="url(#ar6)"/>')
    o.append(f'<circle cx="{ox+114}" cy="158" r="24" class="stim"/>')
    o.append(f'<text x="{ox+12}" y="20" class="t">按摩：手技＋按摩霜</text>')
    o.append(f'<text x="{ox+150}" y="112" class="t-s">① 按摩霜補油、幫助吸收</text>')
    o.append(f'<text x="{ox+146}" y="162" class="t-s">② 刺激皮脂腺</text>')
    o.append(f'<text x="{ox+150}" y="214" class="t-s">③ 血液循環變好，送養分</text>')
    return f'<svg viewBox="0 0 760 250" role="img" aria-label="蒸臉與按摩對皮膚的作用">{"".join(o)}</svg>'


out['S_COMPARE'] = steam_vs_massage()
