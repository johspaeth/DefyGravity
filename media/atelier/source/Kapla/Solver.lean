import Kapla.Core
import Init.Data.Rat

namespace Kapla.Solver

/-- A candidate contact patch. The independent checker does not trust these patches. -/
structure Patch where
  lower : Option Nat
  xlo : Int
  xhi : Int
  zlo : Int
  zhi : Int

/-- A candidate point and the lower body it belongs to. Coordinates are doubled. -/
structure Vertex where
  lower : Option Nat
  x2 : Int
  z2 : Int

/-- Intermediate exact rational force; converted to a common integer scale at the end. -/
structure QContact where
  upper : Nat
  lower : Option Nat
  x2 : Int
  z2 : Int
  force : Rat

/-- Enumerate touching horizontal faces directly from geometry. -/
def patches (bs : List Block) (b : Block) : List Patch :=
  if b.y = 0 then
    [⟨none, b.x, b.right, b.z, b.back⟩]
  else
    bs.filterMap fun a =>
      if a.id ≠ b.id ∧ a.top = b.y ∧ Spec.FootprintsMeet b a then
        some ⟨some a.id, max b.x a.x, min b.right a.right,
          max b.z a.z, min b.back a.back⟩
      else none

/-- Four corners of a positive-area patch. -/
def corners (p : Patch) : List Vertex :=
  [⟨p.lower, 2 * p.xlo, 2 * p.zlo⟩, ⟨p.lower, 2 * p.xhi, 2 * p.zlo⟩,
   ⟨p.lower, 2 * p.xhi, 2 * p.zhi⟩, ⟨p.lower, 2 * p.xlo, 2 * p.zhi⟩]

/-- Make a rational contact for a candidate support point. -/
def atPoint (id : Nat) (v : Vertex) (f : Rat) : QContact :=
  ⟨id, v.lower, v.x2, v.z2, f⟩

/-- Search for one, equal-split, or three-point nonnegative support forces. -/
def distribute (id : Nat) (ps : List Patch) (f mx mz : Rat) :
    Option (List QContact) := Id.run do
  if ps.isEmpty then return none
  let cx := mx / f
  let cz := mz / f
  if cx.den = 1 ∧ cz.den = 1 then
    for p in ps do
      if 2 * p.xlo ≤ cx.num ∧ cx.num ≤ 2 * p.xhi ∧
          2 * p.zlo ≤ cz.num ∧ cz.num ≤ 2 * p.zhi then
        return some [⟨id, p.lower, cx.num, cz.num, f⟩]
  let share := f / (ps.length : Rat)
  let equal := ps.map fun p =>
    QContact.mk id p.lower (p.xlo + p.xhi) (p.zlo + p.zhi) share
  let sx := equal.foldl (fun acc c => acc + c.force * (c.x2 : Rat)) (0 : Rat)
  let sz := equal.foldl (fun acc c => acc + c.force * (c.z2 : Rat)) (0 : Rat)
  if sx = mx ∧ sz = mz then return some equal
  let vs := ps.flatMap corners
  for (a, i) in vs.zipIdx do
    for (b, j) in (vs.drop (i + 1)).zipIdx do
      for c in vs.drop (i + j + 2) do
        let det := a.x2 * (b.z2 - c.z2) + b.x2 * (c.z2 - a.z2) +
          c.x2 * (a.z2 - b.z2)
        if det ≠ 0 then
          let wa := (mx * ((b.z2 - c.z2 : Int) : Rat) +
            mz * ((c.x2 - b.x2 : Int) : Rat) +
            f * ((b.x2 * c.z2 - c.x2 * b.z2 : Int) : Rat)) / (det : Rat)
          let wb := (mx * ((c.z2 - a.z2 : Int) : Rat) +
            mz * ((a.x2 - c.x2 : Int) : Rat) +
            f * ((c.x2 * a.z2 - a.x2 * c.z2 : Int) : Rat)) / (det : Rat)
          let wc := f - wa - wb
          if 0 ≤ wa ∧ 0 ≤ wb ∧ 0 ≤ wc then
            return some (([atPoint id a wa, atPoint id b wb, atPoint id c wc]).filter
              (fun q => q.force.num != 0))
  return none

/-- Search top-down. A failed search is not a proof of physical instability. -/
def candidate (bs : List Block) : Except Nat Certificate := Id.run do
  let ordered := bs.mergeSort (fun a b => a.y ≥ b.y)
  let mut loads : List QContact := []
  for b in ordered do
    let incoming := loads.filter (fun c => c.lower == some b.id)
    let f := incoming.foldl (fun acc c => acc + c.force) (1 : Rat)
    let mx := incoming.foldl (fun acc c => acc + c.force * (c.x2 : Rat))
      (b.centerX2 : Rat)
    let mz := incoming.foldl (fun acc c => acc + c.force * (c.z2 : Rat))
      (b.centerZ2 : Rat)
    match distribute b.id (patches bs b) f mx mz with
    | none => return .error b.id
    | some cs => loads := cs ++ loads
  let scale := loads.foldl (fun n c => Nat.lcm n c.force.den) 1
  let contacts := loads.map fun c =>
    Contact.mk c.upper c.lower c.x2 c.z2 (c.force.num * (scale / c.force.den : Nat))
  return .ok ⟨scale, contacts⟩

/-- A solver result is usable only after the separately verified runtime checker accepts it. -/
def certify (budget : Nat) (bs : List Block) : Except String Certificate :=
  match candidate bs with
  | .error id => .error s!"No support witness found for plank {id + 1}."
  | .ok cert =>
    if checkCertificate budget bs cert then .ok cert
    else .error "The independent exact-arithmetic checker rejected the candidate witness."

end Kapla.Solver
