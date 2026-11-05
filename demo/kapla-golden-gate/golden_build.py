"""Kapla suspension bridge, larger (no 200-block cap). Phase 1 look first; supports from below.

usage: python3 -I golden_build.py VERSION OUT_BLUEPRINT.json
x: along the bridge, y: across (front -y), z: up. About 8 image px per unit.
Blocks: flat 15x3x1, edge 15x1x3, upright 3x1x15 (long side along x before turning).
"""
import json, math, sys
from fractions import Fraction as F

VERSION = sys.argv[1]
AX, AY = {"s": 0, "c": 1}, {"s": 1, "c": 0}
TH = {"flat": 1, "edge": 3, "upright": 15}
steps, phase = [], ""

def num(v):
    v = F(v).limit_denominator(1000)
    return int(v) if v.denominator == 1 else f"{v.numerator}/{v.denominator}"

def put(up, rot, x, y, z):
    steps.append({"phase": phase, "blocks": [{"up": up, "rot": rot,
                  "center": [num(x), num(y), num(F(z) + F(TH[up], 2))]}]})

YG = 6                       # girders, hangers, tower legs and cables at y = -6 and +6
T = F(75, 2)                 # tower centres at +-37.5
ZG, ZD = 15, 17              # girders z 15..17 (two layers); deck top 17
ZTOP = 65                    # tower top
X_END = F(165, 2)            # deck ends at +-82.5, on the anchors

def cable_z(x):
    """Height of the cable top at x: a parabola in the main span, a curve down to the anchors."""
    ax = abs(x)
    inner = T - 6            # inner tower face
    if ax <= inner:
        return 31 + (ZTOP - 2 - 31) * (ax / inner) ** 2
    outer = T + 6
    u = (ax - outer) / (78 - outer)             # 0 at the tower, 1 near the anchor
    return (ZTOP - 2) - (ZTOP - 2 - 21) * (1 - (1 - u) ** 2)

def build(stations_every=4):
    global phase
    phase = "anchors"        # stepped bands of flats along y (3 wide, 15 deep)
    for side in (-1, 1):
        for band, n in enumerate((5, 4, 3, 2, 1)):
            for layer in range(3):
                for i in range(n):
                    put("flat", AY, side * (F(161, 2) + 3 * i), 0, 3 * band + layer)
    phase = "piers"          # slim piers under the girder joints (front and back)
    joints = [F(-135, 2) + 15 * k for k in range(10)]           # -67.5 ... 67.5
    for x in joints:
        for y in (-YG, YG):
            put("upright", AX, x, y, 0)
    phase = "tower legs (lower)"
    for t in (-T, T):
        for dx in (F(-9, 2), F(9, 2)):
            for y in (-YG, YG):
                put("upright", AX, t + dx, y, 0)
    phase = "girders"        # two layers, front and back; lower joints on the piers
    for y in (-YG, YG):
        for k in range(11):
            put("flat", AX, F(-165, 2) + F(15, 2) + 15 * k, y, ZG)
    for y in (-YG, YG):
        for k in range(10):
            put("flat", AX, F(-135, 2) + F(15, 2) + 15 * k - F(15, 2) + F(15, 2), y, ZG + 1)
    phase = "towers"
    for t in (-T, T):
        for z in (ZD, ZD + 16, ZD + 32):
            for dx in (F(-9, 2), F(9, 2)):
                for y in (-YG, YG):
                    put("upright", AX, t + dx, y, z)
            for y in (-YG, YG):
                put("flat", AX, t, y, z + 15)            # crossbeam, front and back
    phase = "hangers and cable"
    xs = [x for x in range(-30, 31, stations_every)]
    xs += [s * x for s in (-1, 1) for x in range(46, 79, stations_every)]
    for x in xs:
        H = cable_z(x) - ZD
        L = int(H // 15)
        r = H - 15 * L
        a, b = int(r // 3), int(round(r - 3 * (r // 3)))
        if b == 3: a, b = a + 1, 0
        for k in range(L):                                # thin hangers, front and back
            for y in (-YG, YG):
                put("upright", AY, x, y, ZD + 15 * k)
        z = ZD + 15 * L
        for k in range(a):                                # thin spacers across both hangers
            put("edge", AY, x, 0, z); z += 3
        for k in range(b + 1):                            # fine height, then the cable bead
            put("flat", AY, x, 0, z); z += 1

# ---------------------------------------------------------------- g2: inclined blocks (demo only)
inclined = []          # blocks with a tilt: drawn by the demo viewer, not checked by the engine
def tilt(kind, x0, z0, x1, z1, y, label):
    """A plank whose long side runs from (x0, z0) to (x1, z1) in the plane y; it lies on that line.
    kind "flat": 3 wide across (y), 1 thick; "edge": 1 wide across, 3 thick."""
    L = math.hypot(x1 - x0, z1 - z0)
    th = math.atan2(z1 - z0, x1 - x0)
    thick = 1 if kind == "flat" else 3
    nx, nz = -math.sin(th), math.cos(th)
    cx, cz = (x0 + x1) / 2 + nx * thick / 2, (z0 + z1) / 2 + nz * thick / 2
    inclined.append({"label": label, "up": kind, "center": [cx, float(y), cz],
                     "pitchDeg": math.degrees(th), "length": L})

def chords(p0, p1, n, sag_dir):
    """n chords of length 15 from p0 to p1 whose angles change evenly (a, a+d, a+2d, ...):
    search (a, d) for the smallest miss at p1, with d >= 0 (the curve bends upward, like a cable)."""
    (x0, z0), (x1, z1) = p0, p1
    def miss(a, d):
        x, z = x0, z0
        for i in range(n):
            t = a + i * d
            x += 15 * math.cos(t); z += 15 * math.sin(t)
        return math.hypot(x - x1, z - z1)
    best = min((miss(ai / 200, di / 400), ai / 200, di / 400)
               for ai in range(-314, 315) for di in range(0, 241))
    _, a, d = best
    step = 1 / 400
    for _ in range(40):                       # refine
        cands = [(miss(a + da, d + dd), a + da, d + dd) for da in (-step, 0, step) for dd in (-step, 0, step) if d + dd >= 0]
        best2 = min(cands)
        if best2[0] >= best[0]: step /= 2
        else: best = best2; _, a, d = best
    pts, x, z = [(x0, z0)], x0, z0
    for i in range(n):
        t = a + i * d
        x += 15 * math.cos(t); z += 15 * math.sin(t); pts.append((x, z))
    return pts, best[0]

def build_g2():
    global phase
    build_base_g()
    inner, outer = float(T - 6), float(T + 6)
    zt = float(ZTOP)                       # cable meets the tower tops
    g3 = VERSION >= "g3"
    zl = 35.0 if g3 else 31.0              # lowest point of the main cable
    for y in (-YG, YG):
        side = "front" if y < 0 else "back"
        if not g3:
            tilt("flat", -7.5, zl, 7.5, zl, y, f"cable {side} middle")
        for s_ in (-1, 1):
            # g3: three chords from the middle (no flat piece): 25, 44 and 62 degrees
            pts, err = chords((0.0, zl) if g3 else (7.5, zl), (inner, zt), 3, 1)
            for (xa, za), (xb, zb) in zip(pts, pts[1:]):
                tilt("flat", s_ * xa, za, s_ * xb, zb, y, f"cable {side} main")
            pts2, err2 = chords((outer, zt), (78.0, 19.0), 4, 1)
            for (xa, za), (xb, zb) in zip(pts2, pts2[1:]):
                tilt("flat", s_ * xa, za, s_ * xb, zb, y, f"cable {side} side")
    # X-braces between the two legs of each tower panel, front and back (1 apart so they cross)
    for t in (-T, T):
        for z in (ZD, ZD + 16, ZD + 32):
            for y in (-YG, YG):
                tilt("edge", float(t) - 3, z + 0.6, float(t) + 3, z + 14.4 - 0.3, y - 0.5, "x-brace")
                tilt("edge", float(t) - 3, z + 14.4 - 0.3, float(t) + 3, z + 0.6, y + 0.5, "x-brace")
    # hangers: thin uprights + thin spacers up to just under the cable (axis-aligned, checked)
    phase = "hangers"
    for x in [x for x in range(-28, 29, 4) if abs(x) > 2] + [s * x for s in (-1, 1) for x in range(47, 76, 4)]:
        H = cable_z_g2(x, zl, inner, outer, zt) - ZD - 0.5
        L = int(H // 15); a = int((H - 15 * L) // 3)
        for k in range(L):
            for y in (-YG, YG):
                put("upright", AY, x, y, ZD + 15 * k)
        if L == 0: continue                # spacers need the two hangers under them
        for k in range(a):
            put("edge", AY, x, 0, ZD + 15 * L + 3 * k)

def cable_z_g2(x, zl, inner, outer, zt):
    """Underside of the drawn cable at x, from the inclined planks (front plane)."""
    best = None
    for b in inclined:
        if not b["label"].startswith("cable front"): continue
        th = math.radians(b["pitchDeg"]); L = b["length"]
        cx, cz = b["center"][0], b["center"][2]
        x0 = cx - math.cos(th) * L / 2 + math.sin(th) * 0.5
        x1 = cx + math.cos(th) * L / 2 + math.sin(th) * 0.5
        if min(x0, x1) <= x <= max(x0, x1):
            z0 = cz - math.sin(th) * L / 2 - math.cos(th) * 0.5
            z = z0 + math.tan(th) * (x - (cx - math.cos(th) * L / 2))
            best = z if best is None else min(best, z)
    return best if best is not None else ZD + 15

def build_base_g():
    """g1 without the cable stations: anchors, piers, lower legs, girders, towers."""
    global phase
    phase = "anchors"
    for side in (-1, 1):
        for band, n in enumerate((5, 4, 3, 2, 1)):
            for layer in range(3):
                for i in range(n):
                    put("flat", AY, side * (F(161, 2) + 3 * i), 0, 3 * band + layer)
    phase = "piers"
    for x in [F(-135, 2) + 15 * k for k in range(10)]:
        for y in (-YG, YG):
            put("upright", AX, x, y, 0)
    phase = "tower legs (lower)"
    for t in (-T, T):
        for dx in (F(-9, 2), F(9, 2)):
            for y in (-YG, YG):
                put("upright", AX, t + dx, y, 0)
    phase = "girders"
    for y in (-YG, YG):
        for k in range(11):
            put("flat", AX, F(-165, 2) + F(15, 2) + 15 * k, y, ZG)
    for y in (-YG, YG):
        for k in range(10):
            put("flat", AX, F(-135, 2) + F(15, 2) + 15 * k, y, ZG + 1)
    phase = "towers"
    for t in (-T, T):
        for z in (ZD, ZD + 16, ZD + 32):
            for dx in (F(-9, 2), F(9, 2)):
                for y in (-YG, YG):
                    put("upright", AX, t + dx, y, z)
            for y in (-YG, YG):
                put("flat", AX, t, y, z + 15)

if VERSION == "g1":
    build()
elif VERSION in ("g2", "g3"):
    build_g2()
else:
    raise SystemExit(f"unknown version {VERSION}")
json.dump({"title": f"Kapla suspension bridge ({VERSION})", "steps": steps}, open(sys.argv[2], "w"), indent=1)
if len(sys.argv) > 3:
    json.dump({"steps": steps, "inclined": inclined}, open(sys.argv[3], "w"), indent=1)
    print(f"  + {len(inclined)} inclined blocks (not checked)")
print(f"{VERSION}: {len(steps)} blocks")
