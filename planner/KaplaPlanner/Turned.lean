import KaplaPlanner.Build

/-! # Turned blocks

Core allows a block to be turned about the vertical axis in steps of 15° (`Rot.menu`, rule
B6), and the physics engine accepts such plans. This file adds turned blocks to a finished
grid plan (`planner/DESIGN.md` §4a).

* **What a turned block is.** It lies flat (or on its long edge, on the ground only), turned by
  15°, 30°, …, 165° but not 90° (that is a grid block). Its centre is on the middle of a cell or
  on a cell corner, and its bottom is on a course. So its height is a whole number, and the
  cells whose middle it holds (as the scorer counts them, `Pose.contains`) are one fixed
  pattern per turn, moved by whole cells.
* **What it may rest on.** On the ground, or on flat grid blocks whose top is at its bottom. It
  carries nothing. That is the same as upright blocks today (`Support.lean`).
* **When it stands (local rule, not trusted).** Its contact patches with the blocks below are
  found exactly (the overlap of two rectangles). Its weight must go down at points inside
  those patches: either right below its centre, if that is inside one patch, or shared by
  three points around its centre. Each point is a patch corner pulled a quarter of the way to
  the middle of its patch, so no load sits on an edge. The grid blocks below must still stand
  with these extra loads (`firstFailing`).
* **Physics** checks a plan with a turned block only at the planned positions: the report has
  `assurance := .nominal`. Such a check is also much slower than the full check of a grid
  plan, so the planner uses turned blocks only on plans of at most `PlannerConfig.turnMaxBlocks`
  blocks (`Search.lean`).

The pass is greedy: it adds the turned block that raises the score most, until no block raises
it or the block limit is reached. It also tries removing a few grid blocks that carry nothing
first, to make room under the limit. -/

namespace KaplaPlanner

open KaplaCore

/-! ## Plane geometry -/

/-- A point in the plane, seen from above. -/
abbrev P2 := Q × Q

/-- The cross product of `a - o` and `b - o`: positive when `o → a → b` turns left. -/
def cross (o a b : P2) : Q := (a.1 - o.1) * (b.2 - o.2) - (a.2 - o.2) * (b.1 - o.1)

/-- A rectangle seen from above: centre, half length along `(c, s)`, half width across it. -/
structure Rect where
  cx : Q
  cy : Q
  hl : Q
  hw : Q
  c : Q
  s : Q
  deriving Repr, BEq, Inhabited

/-- The size of a number, ignoring its sign. -/
def qabs (q : Q) : Q := if q < 0 then -q else q

/-- The four corners, going round counter-clockwise. -/
def Rect.corners (r : Rect) : List P2 :=
  [(-1, -1), (1, -1), (1, 1), (-1, 1)].map fun ((σ : Q), (τ : Q)) =>
    (r.cx + σ * r.hl * r.c - τ * r.hw * r.s, r.cy + σ * r.hl * r.s + τ * r.hw * r.c)

/-- Half the length of the rectangle's shadow on a line in the direction `(nx, ny)`. -/
def Rect.reach (r : Rect) (nx ny : Q) : Q :=
  r.hl * qabs (nx * r.c + ny * r.s) + r.hw * qabs (-nx * r.s + ny * r.c)

/-- The shadows on a line in the direction `(nx, ny)` overlap by more than a point. -/
def shadowsOverlap (a b : Rect) (nx ny : Q) : Bool :=
  qabs (nx * (b.cx - a.cx) + ny * (b.cy - a.cy)) < a.reach nx ny + b.reach nx ny

/-- The rectangles overlap in an area bigger than zero: their shadows overlap along each of the
four side directions. The same test as the physics engine's `FacesOverlap`. -/
def Rect.overlaps (a b : Rect) : Bool :=
  shadowsOverlap a b a.c a.s && shadowsOverlap a b (-a.s) a.c &&
    shadowsOverlap a b b.c b.s && shadowsOverlap a b (-b.s) b.c

/-- Keep the part of a convex polygon where `f ≤ 0` (`f` linear), adding the points where its
sides cross `f = 0`. -/
def clipBy (f : P2 → Q) (poly : List P2) : List P2 :=
  let n := poly.length
  (List.range n).flatMap fun i =>
    let p := poly.getD i (0, 0)
    let q := poly.getD ((i + 1) % n) (0, 0)
    let fp := f p
    let fq := f q
    let crossing : List P2 :=
      if (fp < 0 && 0 < fq) || (0 < fp && fq < 0) then
        let t := fp / (fp - fq)
        [(p.1 + t * (q.1 - p.1), p.2 + t * (q.2 - p.2))]
      else []
    (if fp ≤ 0 then [p] else []) ++ crossing

/-- The part of a convex polygon that lies over rectangle `r`. -/
def Rect.clip (r : Rect) (poly : List P2) : List P2 :=
  let along (p : P2) : Q := r.c * (p.1 - r.cx) + r.s * (p.2 - r.cy)
  let across (p : P2) : Q := -r.s * (p.1 - r.cx) + r.c * (p.2 - r.cy)
  poly |> clipBy (fun p => along p - r.hl) |> clipBy (fun p => -r.hl - along p)
    |> clipBy (fun p => across p - r.hw) |> clipBy (fun p => -r.hw - across p)

/-- Twice the area of a polygon (positive when it goes counter-clockwise). -/
def area2 (poly : List P2) : Q :=
  let n := poly.length
  (List.range n).foldl (fun acc i =>
    let p := poly.getD i (0, 0)
    let q := poly.getD ((i + 1) % n) (0, 0)
    acc + (p.1 * q.2 - q.1 * p.2)) 0

/-- The middle of a polygon's corners (inside it, for a convex polygon). -/
def middle (poly : List P2) : P2 :=
  let n : Q := (poly.length : Q)
  if poly.isEmpty then (0, 0) else
    (poly.foldl (fun a p => a + p.1) 0 / n, poly.foldl (fun a p => a + p.2) 0 / n)

/-- Is the point inside the convex polygon (counter-clockwise), edges included? -/
def insideConvex (poly : List P2) (p : P2) : Bool :=
  let n := poly.length
  n ≥ 3 && (List.range n).all fun i =>
    cross (poly.getD i (0, 0)) (poly.getD ((i + 1) % n) (0, 0)) p ≥ 0

/-- The weights of `p` in the triangle `a b c` (they add up to 1); `none` for a flat triangle. -/
def weightsIn (a b c p : P2) : Option (Q × Q × Q) :=
  let d := cross a b c
  if d == 0 then none else
    let wa := cross p b c / d
    let wb := cross a p c / d
    some (wa, wb, 1 - wa - wb)

-- A unit square, counter-clockwise, and a point inside it.
#guard insideConvex [(0, 0), (1, 0), (1, 1), (0, 1)] (1 / 2, 1 / 2)
#guard !insideConvex [(0, 0), (1, 0), (1, 1), (0, 1)] (2, 1 / 2)
#guard weightsIn (0, 0) (1, 0) (0, 1) (1 / 4, 1 / 4) == some (1 / 2, 1 / 4, 1 / 4)
#guard area2 [(0, 0), (1, 0), (1, 1), (0, 1)] == 2

/-! ## Turned blocks -/

/-- The turns a turned block may have, in steps of 15° (`Rot.step15`): 15° to 165° without
90°. A block turned 180° more covers the same space. -/
def turnSteps : List Nat := [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]

/-- A turned block: lying flat (or on its long edge), turned by `k` steps of 15°, its centre at
`(ix, iy)` or, with `half`, at `(ix + ½, iy + ½)`, its bottom at course `z`. -/
structure TBlock where
  /-- On its long edge (only on the ground); else flat. -/
  edge : Bool
  k : Nat
  ix : Int
  iy : Int
  half : Bool
  z : Int
  deriving Repr, BEq, Inhabited, Hashable

/-- Which face is down. -/
def TBlock.up (b : TBlock) : Upright := if b.edge then .onEdge else .flat

/-- The turn. -/
def TBlock.rot (b : TBlock) : Rot := Rot.step15 b.k

/-- The height of the block: 1 lying flat, 3 on edge. -/
def TBlock.sz (b : TBlock) : Int := if b.edge then 3 else 1

/-- One above the highest course the block fills. -/
def TBlock.top (b : TBlock) : Int := b.z + b.sz

/-- The centre, seen from above. -/
def TBlock.centre (b : TBlock) : P2 :=
  let h : Q := if b.half then 1 / 2 else 0
  ((b.ix : Q) + h, (b.iy : Q) + h)

/-- The core pose. -/
def TBlock.toPose (b : TBlock) : Pose :=
  ⟨b.up, b.rot, ⟨b.centre.1, b.centre.2, (b.z : Q) + (b.sz : Q) / 2⟩⟩

/-- The block seen from above. -/
def TBlock.rect (b : TBlock) : Rect :=
  let d := b.up.dims
  { cx := b.centre.1, cy := b.centre.2, hl := d.x / 2, hw := d.y / 2, c := b.rot.cos, s := b.rot.sin }

/-- A grid block seen from above. -/
def GBlock.rect (b : GBlock) : Rect :=
  { cx := (b.x : Q) + (b.sx : Q) / 2, cy := (b.y : Q) + (b.sy : Q) / 2,
    hl := (b.sx : Q) / 2, hw := (b.sy : Q) / 2, c := 1, s := 0 }

/-- The cells (as offsets) whose middle the block holds, for a block with its centre at
`(0, 0)` (or `(½, ½)` with `half`) and its bottom at course 0. -/
def cellPattern (edge : Bool) (k : Nat) (half : Bool) : Array Cell := Id.run do
  let b : TBlock := { edge, k, ix := 0, iy := 0, half, z := 0 }
  let p := b.toPose
  let mut res : Array Cell := #[]
  for z in intRange 0 (b.sz - 1) do
    for y in intRange (-9) 9 do
      for x in intRange (-9) 9 do
        if p.contains (cellCentre (x, y, z)) then res := res.push (x, y, z)
  return res

/-- The patterns of every turn, worked out once: flat then on edge, by turn, by `half`. -/
def patterns : Array (Array Cell) :=
  (([false, true].flatMap fun edge => (List.range 12).flatMap fun k =>
    [false, true].map fun half => cellPattern edge k half)).toArray

/-- The cells whose middle the block holds: the scorer's cells (`Pose.contains`). -/
def TBlock.cells (b : TBlock) : Array Cell :=
  let i := ((if b.edge then 1 else 0) * 12 + b.k % 12) * 2 + (if b.half then 1 else 0)
  (patterns[i]!).map fun (x, y, z) => (x + b.ix, y + b.iy, z + b.z)

-- An unturned block holds 45 cells; the pattern agrees with the grid block.
#guard (cellPattern false 0 false).size == 45
-- Turned blocks hold about 45 cells too (the area is 45; at 45° the count is 52 or 53).
#guard turnSteps.all fun k => [false, true].all fun h =>
  let n := (cellPattern false k h).size; 40 ≤ n && n ≤ 55
-- The cells match the scorer's rule for a moved block.
#guard
  let b : TBlock := { edge := false, k := 3, ix := 4, iy := -2, half := true, z := 5 }
  b.cells.all fun c => b.toPose.contains (cellCentre c)

/-! ## Placing turned blocks -/

/-- A grid plan with turned blocks added on top. -/
structure TurnState where
  /-- The grid blocks, with their contacts. -/
  stack : Stack
  /-- The loads the turned blocks put on grid blocks: block, force, point. -/
  extra : Array (Nat × Q × Q × Q) := #[]
  /-- The turned blocks, in build order. -/
  turned : Array TBlock := #[]
  /-- The cells of all blocks. -/
  occupied : Std.HashSet Cell := {}
  /-- The fast score. -/
  state : ScoreState
  deriving Inhabited

/-- How the weight of a turned block goes down: block below, force, point. `none` if the
block does not stand by the local rule. -/
def turnedLoads (st : Stack) (u : TBlock) : Option (List (Nat × Q × Q × Q)) := Id.run do
  let r := u.rect
  let corners := r.corners
  let p := u.centre
  -- the contact patches with the blocks whose top is at `u`'s bottom
  let mut patches : List (Nat × List P2) := []
  for j in st.tops.getD u.z [] do
    let v := (st.blocks[j]!).blk
    if !v.rect.overlaps r then continue
    -- an upright block carries nothing
    if !v.orient.isFlat then return none
    let poly := v.rect.clip corners
    if area2 poly > 0 then patches := (j, poly) :: patches
  if patches.isEmpty then return none
  -- the load points: corners pulled a quarter of the way to the middle of their patch
  let pulled := patches.map fun (j, poly) =>
    let m := middle poly
    (j, poly.map fun q => (m.1 + 3 / 4 * (q.1 - m.1), m.2 + 3 / 4 * (q.2 - m.2)))
  -- right below the centre, inside one patch
  for (j, poly) in pulled do
    if insideConvex poly p then return some [(j, 1, p.1, p.2)]
  -- shared by three points around the centre: the most even split
  let pts : Array (Nat × P2) := (pulled.flatMap fun (j, poly) => poly.map ((j, ·))).toArray
  let mut best : Option (Q × List (Nat × Q × Q × Q)) := none
  for a in [0:pts.size] do
    for b in [a + 1:pts.size] do
      for c in [b + 1:pts.size] do
        let (ja, qa) := pts[a]!
        let (jb, qb) := pts[b]!
        let (jc, qc) := pts[c]!
        match weightsIn qa qb qc p with
        | some (wa, wb, wc) =>
          let low := min wa (min wb wc)
          if 0 ≤ low && (match best with | some (b, _) => decide (b < low) | none => true) then
            best := some (low, [(ja, wa, qa.1, qa.2), (jb, wb, qb.1, qb.2), (jc, wc, qc.1, qc.2)])
        | none => pure ()
  return best.map (·.2)

/-- Is a load at `(x, y)` on placed block `p` right above its contacts, where it must be (a
see-saw, or every block in strict mode; see `loadsOutside`)? -/
def Placed.holdsAt (p : Placed) (x y : Q) (minSpan : Int) : Bool :=
  match p.span with
  | none => true
  | some (lo, hi) =>
    hi - lo ≥ minSpan ||
      (let pos := if p.blk.orient.alongX then x else y
       (lo : Q) ≤ pos && pos ≤ (hi : Q))

/-- Add a turned block if it fits and everything still stands by the local rule. -/
def TurnState.place (ts : TurnState) (u : TBlock) (margin : Q) (strict : Bool) :
    Option TurnState := Id.run do
  if u.edge && u.z != 0 then return none
  let cells := u.cells
  if cells.any ts.occupied.contains then return none
  let r := u.rect
  -- no overlap with grid blocks or turned blocks
  for z in intRange u.z (u.top - 1) do
    for j in ts.stack.occ.getD z [] do
      if (ts.stack.blocks[j]!).blk.rect.overlaps r then return none
  for v in ts.turned do
    if v.z < u.top && u.z < v.top && v.rect.overlaps r then return none
    -- a turned block carries nothing
    if v.top == u.z && v.rect.overlaps r then return none
  let mut loads : List (Nat × Q × Q × Q) := []
  if u.z != 0 then
    match turnedLoads ts.stack u with
    | some l => loads := l
    | none => return none
  let minSpan := if strict then anySpan else seesawSpan
  if !loads.all fun (j, _, x, y) => (ts.stack.blocks[j]!).holdsAt x y minSpan then return none
  let extra := ts.extra ++ loads.toArray
  if (firstFailing ts.stack.blocks margin extra).isSome then return none
  return some { ts with extra, turned := ts.turned.push u,
                        occupied := cells.foldl (·.insert ·) ts.occupied }

/-- What a turned block adds to the score, in cells: covered cells minus `score` per cell
outside the bubbles (positive exactly when the score goes up), plus `firstBonus` per bubble it
is the first to reach. -/
def turnValue (t : Table) (s : ScoreState) (d : Delta) (firstBonus : Q) : Q :=
  (d.dC : Q) - s.score t * (d.dE : Q) + firstBonus * (d.firstTouches s : Q)

/-- The smallest box (x and y ranges) around the tops of flat grid blocks at height `z`. -/
def topsBox (st : Stack) (z : Int) : Option (Int × Int × Int × Int) :=
  (st.tops.getD z []).foldl (fun acc j =>
    let b := (st.blocks[j]!).blk
    if !b.orient.isFlat then acc else
    unionBox acc (some (b.x, b.x + b.sx, b.y, b.y + b.sy))) none

/-- Every turned block that could go in now: centre near the bubbles and over flat grid tops
(off the ground), at least one cell in a bubble, no cell taken. With its value. -/
def turnCandidates (t : Table) (ts : TurnState) (firstBonus : Q) :
    Array (TBlock × Q) := Id.run do
  let mut res : Array (TBlock × Q) := #[]
  for zn in [0:t.nz] do
    let z : Int := zn
    let edges : List Bool := if z == 0 then [false, true] else [false]
    for edge in edges do
      let sz : Int := if edge then 3 else 1
      let some (xa, xb, ya, yb) :=
        (intRange z (z + sz - 1)).foldl (fun r zz => unionBox r (sliceBox t zz)) none
        | continue
      -- the centre is within 8 of a bubble cell, and over the supports
      let (xa, xb, ya, yb) := (xa - 8, xb + 8, ya - 8, yb + 8)
      let range? : Option (Int × Int × Int × Int) :=
        if z == 0 then some (xa, xb, ya, yb) else
          (topsBox ts.stack z).bind fun (ta, tb, tc, td) =>
            let r := (max xa ta, min xb tb, max ya tc, min yb td)
            if r.1 ≤ r.2.1 && r.2.2.1 ≤ r.2.2.2 then some r else none
      let some (x0, x1, y0, y1) := range? | continue
      for k in turnSteps do
        for half in [false, true] do
          for iy in intRange y0 y1 do
            for ix in intRange x0 x1 do
              let u : TBlock := { edge, k, ix, iy, half, z }
              let cells := u.cells
              if !cells.any (fun c => t.maskAt c != 0) then continue
              if cells.any ts.occupied.contains then continue
              let v := turnValue t ts.state (delta t ts.state cells.toList) firstBonus
              if 0 < v then res := res.push (u, v)
  return res

/-- Add turned blocks greedily, at most `budget`: each time the one that adds most (values are
worked out again when they may be out of date), if the local rule accepts it. -/
def addTurned (t : Table) (ts : TurnState) (budget : Nat) (margin : Q) (strict : Bool)
    (firstBonus : Q := 45) : TurnState := Id.run do
  if budget == 0 then return ts
  let cands := turnCandidates t ts firstBonus
  let mut ts := ts
  let mut vals : Array Q := cands.map (·.2)
  -- the number of blocks placed when each value was worked out
  let mut stamp : Array Nat := cands.map fun _ => 0
  let mut alive : Array Bool := cands.map fun _ => true
  let mut placed := 0
  for _ in [0:20000] do
    if placed ≥ budget then break
    let mut best : Option Nat := none
    for i in [0:cands.size] do
      if alive[i]! && 0 < vals[i]! then
        match best with
        | some b => if vals[b]! < vals[i]! then best := some i
        | none => best := some i
    let some i := best | break
    let u := cands[i]!.1
    if stamp[i]! != placed then
      if u.cells.any ts.occupied.contains then
        alive := alive.set! i false
      else
        vals := vals.set! i (turnValue t ts.state (delta t ts.state u.cells.toList) firstBonus)
        stamp := stamp.set! i placed
      continue
    alive := alive.set! i false
    match ts.place u margin strict with
    | none => pure ()
    | some ts' =>
      ts := { ts' with state := ts.state.apply (delta t ts.state u.cells.toList) }
      placed := placed + 1
  return ts

/-- The state for a grid plan: `none` if the local rule does not accept the plan as it is. -/
def TurnState.ofBlocks (t : Table) (bs : List GBlock) (margin : Q) (strict : Bool)
    (up : UprightRules) : Option TurnState :=
  (Stack.placeAll {} bs margin strict up).map fun st =>
    { stack := st, state := fastScore t bs,
      occupied := bs.foldl (fun s b => b.cells.foldl (·.insert ·) s) {} }

/-- Remove one grid block that carries nothing, the one whose loss lowers the score least
(keeping every bubble reached, if it was). `none` if there is none to remove. -/
def removeOne (t : Table) (bs : List GBlock) (margin : Q) (strict : Bool) (up : UprightRules) :
    Option (List GBlock) := Id.run do
  let some st := Stack.placeAll {} bs margin strict up | return none
  let present := t.mask.foldl (· ||| ·) (0 : UInt64)
  let coversNow := (fastScore t bs).touched &&& present == present
  let mut best : Option (Q × List GBlock) := none
  for i in [0:bs.length] do
    if !(st.carriedBy i).isEmpty then continue
    let rest := bs.eraseIdx i
    let s := fastScore t rest
    if coversNow && s.touched &&& present != present then continue
    if (Stack.placeAll {} rest margin strict up).isNone then continue
    let sc := s.score t
    let better : Bool := match best with
      | some (b, _) => decide (b < sc)
      | none => true
    if better then best := some (sc, rest)
  return best.map (·.2)

/-- The result of the turned pass on a grid plan. -/
structure Turned where
  /-- The grid blocks kept, in build order. -/
  blocks : List GBlock
  /-- The turned blocks, built after them. -/
  turned : List TBlock
  /-- The fast score. -/
  fast : Q
  /-- Every bubble with a cell at this height has a built cell. -/
  covers : Bool
  deriving Inhabited

/-- Add turned blocks to a grid plan of at most `n` blocks: as it is, and with up to
`maxRemove` grid blocks that carry nothing removed first. The best result by the fast score,
if it has a turned block and beats the plan as it is. -/
def turnPass (t : Table) (n : Nat) (bs : List GBlock) (margin : Q) (strict : Bool)
    (up : UprightRules) (maxRemove : Nat := 3) : Option Turned := Id.run do
  let present := t.mask.foldl (· ||| ·) (0 : UInt64)
  let base := fastScore t bs
  let baseCovers := base.touched &&& present == present
  let better (a b : Q × Bool) : Bool := (a.2 && !b.2) || (a.2 == b.2 && a.1 > b.1)
  let mut best : Option Turned := none
  let mut cur := bs
  for r in [0:maxRemove + 1] do
    if r > 0 then
      match removeOne t cur margin strict up with
      | some next => cur := next
      | none => break
    match TurnState.ofBlocks t cur margin strict up with
    | none => pure ()
    | some ts =>
      let ts := addTurned t ts (n - cur.length) margin strict
      if ts.turned.isEmpty then continue
      let covers := ts.state.touched &&& present == present
      let res : Turned := { blocks := cur, turned := ts.turned.toList, fast := ts.state.score t, covers }
      let key := (res.fast, res.covers)
      if better key (base.score t, baseCovers) &&
          (best.map fun b => better key (b.fast, b.covers)).getD true then
        best := some res
  return best

/-- The plan: the grid blocks, then the turned blocks, one block per step. -/
def turnedPlan (bs : List GBlock) (ts : List TBlock) : BuildPlan :=
  ⟨bs.map (fun b => { blocks := [b.toPose], phase := s!"level {b.z + (1 : Int)}" }) ++
    ts.map fun b => { blocks := [b.toPose], phase := s!"level {b.z + (1 : Int)}, turned" }⟩

/-! ## Examples -/

-- A 45° block lying across a flat block stands, with all its weight right below its centre.
#guard
  let st := (Stack.placeAll {} [⟨.flatX, 0, 0, 0⟩] 1).get!
  let u : TBlock := { edge := false, k := 3, ix := 7, iy := 1, half := true, z := 1 }
  turnedLoads st u == some [(0, 1, 15 / 2, 3 / 2)]
-- A 30° block bridging two rails 9 apart stands, its weight shared by both.
#guard
  let st := (Stack.placeAll {} [⟨.flatX, 0, 0, 0⟩, ⟨.flatX, 0, 9, 0⟩] 1).get!
  let u : TBlock := { edge := false, k := 2, ix := 7, iy := 6, half := false, z := 1 }
  match turnedLoads st u with
  | some l => (l.map (·.1)).eraseDups.length == 2 && l.foldl (fun a x => a + x.2.1) 0 == 1
  | none => false
-- Its centre far past the block below: it does not stand.
#guard
  let st := (Stack.placeAll {} [⟨.flatX, 0, 0, 0⟩] 1).get!
  let u : TBlock := { edge := false, k := 3, ix := 16, iy := 9, half := false, z := 1 }
  turnedLoads st u == none
-- A turned block may not cut into a grid block in the same course.
#guard
  let ts := (TurnState.ofBlocks (Table.make ballModel 4) [⟨.flatX, 0, 0, 0⟩] 1 false {}).get!
  (ts.place { edge := false, k := 3, ix := 7, iy := 4, half := true, z := 0 } 1 false).isNone &&
    (ts.place { edge := false, k := 3, ix := 7, iy := 12, half := true, z := 0 } 1 false).isSome

-- On the ball, the turned pass finds something better than a single grid block.
#guard
  let t := Table.make ballModel 12
  match turnPass t 4 [⟨.flatX, -7, -1, 0⟩] 1 false {} with
  | some r => !r.turned.isEmpty && r.fast > (fastScore t [⟨.flatX, -7, -1, 0⟩]).score t
  | none => false

end KaplaPlanner
