"""Kapla suspension bridge from the reference image. Phase 1: match the image, physics ignored.

usage: python3 -I bridge_build.py VERSION OUT_BLUEPRINT.json
Blocks: flat 15x3x1, edge 15x1x3, upright 3x1x15 (long side along x before turning).
x: along the bridge, y: across (front is -y), z: up. About 12 image px per unit.
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

ZD = 15                     # deck bottom; deck is two layers, top at 17
T = 25                      # tower centres at x = -25, 25
ZTOP = 48                   # top crossbeam of the towers

def cable_z(x):
    """Bottom of the main cable at x (parabola between the inner tower legs), and the side spans."""
    ax = abs(x)
    if ax <= T - 4.5:
        return 23 + (ZTOP - 23) * (ax / (T - 4.5)) ** 2
    return ZTOP - (ZTOP - 18) * (ax - (T + 4.5)) / (46 - (T + 4.5))   # straight down to the anchors

ANCHOR = (4, 3, 2, 1, 1)
def build():
    global phase
    phase = "anchors"           # stepped bands of flats along y (3 wide in x, 15 deep)
    for side in (-1, 1):
        for band, n in enumerate(ANCHOR):
            for layer in range(3):
                for i in range(n):
                    put("flat", AY, side * (F(93, 2) + 3 * i), 0, 3 * band + layer)
    phase = "tower legs (lower)"
    for t in (-T, T):
        for dx in (-3, 3):
            for y in (-1, 0, 1):
                put("upright", AX, t + dx, y, 0)
    phase = "deck"              # two staggered layers, the ends on the anchors
    for x in (-45, -30, -15, 0, 15, 30, 45):
        put("flat", AX, x, 0, ZD)
    for x in (-F(75, 2), -F(45, 2), -F(15, 2), F(15, 2), F(45, 2), F(75, 2)):
        put("flat", AX, x, 0, ZD + 1)
    phase = "tower legs (upper)"
    for t in (-T, T):
        for z, beam in ((ZD + 2, True), (ZD + 3 + 15, True)):
            for dx in (-3, 3):
                for y in (-1, 0, 1):
                    put("upright", AX, t + dx, y, z)
            put("flat", AX, t, 0, z + 15)          # crossbeam on top of this level
    phase = "hangers"           # stacks of edges along y, from the deck to the cable
    xs = [x for x in range(-18, 19, 4)] + [s * x for s in (-1, 1) for x in (33, 37, 41)]
    for x in xs:
        top = cable_z(x)
        n = max(1, round((top - (ZD + 2)) / 3))
        for k in range(n):
            put("edge", AY, x, 0, ZD + 2 + 3 * k)
    phase = "cables"            # short segments: flats along y (3 wide), resting on the hangers
    for x in xs:
        n = max(1, round((cable_z(x) - (ZD + 2)) / 3))
        put("flat", AY, x, 0, ZD + 2 + 3 * n)

def build_b2():
    """Thin upright hangers (1 wide from the side, 15 tall, one or two stacked), and a cable of
    short segments with filler flats so that it follows the curve."""
    global phase
    zt = ZD + 2                                  # deck top
    low, top = zt + 15, ZTOP                     # cable: lowest at one hanger, highest at the towers
    def cz(x):
        ax = abs(x)
        if ax <= T - 4.5:
            return low + (top - low) * (ax / (T - 4.5)) ** 2
        return top - (top - (zt + 1)) * (ax - (T + 4.5)) / (45 - (T + 4.5))
    build_base()
    phase = "hangers"
    xs = [x for x in range(-18, 19, 4)] + [s * x for s in (-1, 1) for x in (33, 37, 41)]
    plan = []
    for x in xs:
        need = cz(x) - zt                        # height from the deck top to the cable
        n_up = 2 if need >= 30 else (1 if need >= 15 else 0)
        fill = max(0, round(need - 15 * n_up))
        plan.append((x, n_up, fill))
        for k in range(n_up):
            put("upright", AY, x, 0, zt + 15 * k)
    phase = "cable"
    for x, n_up, fill in plan:
        for k in range(fill + 1):                # filler flats, then the segment itself
            put("flat", AY, x, 0, zt + 15 * n_up + k)

def build_base():
    """Anchors, lower tower legs, deck and upper towers: as b1."""
    global phase
    phase = "anchors"
    for side in (-1, 1):
        for band, n in enumerate((4, 3, 2, 1, 1)):
            for layer in range(3):
                for i in range(n):
                    put("flat", AY, side * (F(93, 2) + 3 * i), 0, 3 * band + layer)
    phase = "tower legs (lower)"
    for t in (-T, T):
        for dx in (-3, 3):
            for y in (-1, 0, 1):
                put("upright", AX, t + dx, y, 0)
    phase = "deck"
    for x in (-45, -30, -15, 0, 15, 30, 45):
        put("flat", AX, x, 0, ZD)
    for x in (-F(75, 2), -F(45, 2), -F(15, 2), F(15, 2), F(45, 2), F(75, 2)):
        put("flat", AX, x, 0, ZD + 1)
    phase = "tower legs (upper)"
    for t in (-T, T):
        for z in (ZD + 2, ZD + 3 + 15):
            for dx in (-3, 3):
                for y in (-1, 0, 1):
                    put("upright", AX, t + dx, y, z)
            put("flat", AX, t, 0, z + 15)

def build_b4(piers=False):
    """Thin upright hangers (15 or 30 tall), a two-level cable of edges (1 deep) that rests on them
    and caps the towers, towers 15 wide (legs at t +- 6, flush 15-long crossbeams), stepped anchors.
    With piers: slim piers of uprights under the deck (phase 2)."""
    global phase
    t0, zd = 27, 15                              # tower centres +-27; deck bottom 15, top 17
    zt = zd + 2
    phase = "anchors"
    for side in (-1, 1):
        for band, n in enumerate((3, 2, 1, 1, 1)):
            for layer in range(3):
                for i in range(n):
                    put("flat", AY, side * (F(93, 2) + 3 * i), 0, 3 * band + layer)
    phase = "tower legs (lower)"
    for t in (-t0, t0):
        for dx in (-6, 6):
            for y in (-1, 0, 1):
                put("upright", AX, t + dx, y, 0)
    if piers:
        phase = "piers"                          # slim piers under the deck, thin from the side
        for x in ((-12, 0, 12, -40, 40) + ((-27, 27) if VERSION >= "b6" else ())):
            put("upright", AY, x, 0, 0)
    phase = "deck"
    for x in (-45, -30, -15, 0, 15, 30, 45):
        put("flat", AX, x, 0, zd)
    ends = (-F(105, 2), F(105, 2)) if VERSION >= "b7" else ()   # upper layer out to the side hangers
    for x in (-F(75, 2), -F(45, 2), -F(15, 2), F(15, 2), F(45, 2), F(75, 2)) + ends:
        put("flat", AX, x, 0, zd + 1)
    phase = "tower legs (upper)"
    tall = VERSION >= "b9"
    for t in (-t0, t0):
        for z in ((zt, zt + 16, zt + 32) if tall else (zt, zt + 16)):
            for dx in (-6, 6):
                for y in (-1, 0, 1):
                    put("upright", AX, t + dx, y, z)
            put("flat", AX, t, 0, z + 15)        # crossbeam, flush with the legs
    phase = "hangers"
    if tall:                                     # sparser: two hangers per cable segment
        low = (-4, 4) + tuple(s * x for s in (-1, 1) for x in (47, 55))
        high = tuple(s * x for s in (-1, 1) for x in (9, 17, 36, 43))
    elif VERSION >= "b8":                        # side span: supports on both sides of each centre
        low = (-6, -2, 2, 6) + tuple(s * x for s in (-1, 1) for x in (47, 51, 55))
        high = tuple(s * x for s in (-1, 1) for x in (9, 13, 17, 36, 40, 43))
    else:
        low = (-6, -2, 2, 6) + tuple(s * x for s in (-1, 1) for x in (44, 48, 52))
        high = tuple(s * x for s in (-1, 1) for x in (9, 13, 17, 36, 40))
    for x in low:
        put("upright", AY, x, 0, zt)
    for x in high:
        put("upright", AY, x, 0, zt)
        put("upright", AY, x, 0, zt + 15)
    phase = "cable"
    put("edge", AX, 0, 0, zt + 15)               # main span, middle: on the 15-tall hangers
    for s_ in (-1, 1):
        put("edge", AX, s_ * 12, 0, zt + 30)     # main span, near the towers: on the 30-tall ones
        if not tall:
            put("edge", AX, s_ * t0, 0, zt + 32) # over the tower top
        put("edge", AX, s_ * 42, 0, zt + 30)     # side span, high
        put("edge", AX, s_ * (F(103, 2) if VERSION >= "b8" else F(99, 2)), 0, zt + 15)   # side span, low

if VERSION == "b1":
    build()
elif VERSION == "b4":
    build_b4()
elif VERSION in ("b5", "b6", "b7", "b8", "b9"):
    build_b4(piers=True)
elif VERSION == "b3":
    ANCHOR = (3, 2, 1, 1, 1)
    build()
elif VERSION == "b2":
    build_b2()
else:
    raise SystemExit(f"unknown version {VERSION}")
json.dump({"title": f"Kapla suspension bridge ({VERSION})", "steps": steps}, open(sys.argv[2], "w"), indent=1)
print(f"{VERSION}: {len(steps)} blocks")
