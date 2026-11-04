import KaplaCore.Plan

/-! # Rules a person chooses for one plan

The physics rules (`spec/physics-rules.md`) always apply. On top of them, a person can choose,
before a plan is made:

* how strict the check is: the placement error a block may have (`HumanModel.epsRel`), how
  many blocks one step may place (`HumanModel.hands`), whether small gaps and tight slots are
  checked (`BuildRules.clearance`), and whether turned blocks are allowed (`allowTurned`);
* extra rules of their own (`UserRule`), such as "no block higher than 30 cm".

This file holds the rules as plain data. What a `UserRule` *means* is defined in
`specs/KaplaSpecs/PhysicsRules/UserRules.lean` (human-owned); the physics engine checks it
(`physics/KaplaPhysics/UserRules.lean`), with a proof that the check is right. -/

namespace KaplaCore

/-- An extra rule a person adds for one plan. Every rule is about all blocks of the plan, so if
the finished plan keeps it, the build keeps it after every step too. Lengths are in block units
(one block thickness, 7.8 mm). -/
inductive UserRule where
  /-- No part of any block is higher than `h` above the ground. -/
  | maxHeight (h : Q)
  /-- No block has this face down, for example no standing blocks. -/
  | noUpright (u : Upright)
  /-- At most `n` blocks have this face down. -/
  | maxUpright (u : Upright) (n : Nat)
  /-- The whole build fits in a rectangle `w` long along `x` and `d` long along `y`, for
  example on a small table. -/
  | fitsIn (w d : Q)
  deriving Repr, BEq, DecidableEq, Inhabited

/-- The rules for one plan: the builder, and which checks apply. The defaults are the
rules the project always used: 3.9 mm placement error, one block per step, clearance on,
turned blocks allowed (checked at the planned positions only). -/
structure BuildRules where
  /-- The builder: placement error (`epsRel`) and blocks per step (`hands`). -/
  human : HumanModel := .default
  /-- Check that no placement error can close a small gap, and that no block goes into a slot
  exactly its own width. -/
  clearance : Bool := true
  /-- Allow blocks turned by 15° steps that are not quarter turns. Such a plan is checked at
  the planned positions only. -/
  allowTurned : Bool := true
  /-- Extra rules of the person's own. -/
  extra : List UserRule := []
  deriving Repr, BEq, Inhabited

/-- The most placement error a person may ask for, in block units (1 = 7.8 mm). A bigger
error makes the check stricter, and above this no useful build passes. -/
def BuildRules.maxEpsRel : Q := 1

/-- The most blocks one step may place. -/
def BuildRules.maxHands : Nat := 2

/-- The rules are within the limits: placement error from 0 to `maxEpsRel`, 1 to `maxHands`
blocks per step, and every extra rule has sizes above 0. -/
def BuildRules.valid (r : BuildRules) : Bool :=
  0 ≤ r.human.epsRel && r.human.epsRel ≤ BuildRules.maxEpsRel &&
    1 ≤ r.human.hands && r.human.hands ≤ BuildRules.maxHands &&
    r.extra.all fun
      | .maxHeight h => 0 < h
      | .fitsIn w d => 0 < w && 0 < d
      | _ => true

#guard ({} : BuildRules).valid
#guard !({ human := { HumanModel.default with epsRel := -1 } } : BuildRules).valid
#guard !({ extra := [.fitsIn 0 10] } : BuildRules).valid

/-! ## In words -/

/-- `q` rounded to one decimal place, for example `3.9`. Whole numbers have no decimals. -/
def decimal1 (q : Q) : String :=
  let tenths := (q * 10 + 1 / 2).floor
  let sign := if tenths < 0 then "-" else ""
  let t := tenths.natAbs
  if t % 10 == 0 then s!"{sign}{t / 10}" else s!"{sign}{t / 10}.{t % 10}"

#guard decimal1 (39 / 10) == "3.9" && decimal1 30 == "30" && decimal1 (1 / 3) == "0.3"

/-- A length in block units, in millimetres (1 unit = 7.8 mm). -/
def mmText (q : Q) : String := s!"{decimal1 (q * 39 / 5)} mm"

/-- A length in block units, in centimetres. -/
def cmText (q : Q) : String := s!"{decimal1 (q * 39 / 50)} cm"

#guard mmText (1 / 2) == "3.9 mm" && cmText 50 == "39 cm"

/-- A face-down choice in words, as a plural noun. -/
def Upright.plural : Upright → String
  | .flat => "flat blocks"
  | .onEdge => "blocks on edge"
  | .standing => "standing blocks"

/-- The rule in words, for the page, the terminal and Claude. -/
def UserRule.describe : UserRule → String
  | .maxHeight h => s!"no block higher than {cmText h} ({decimal1 h} block thicknesses)"
  | .noUpright u => s!"no {u.plural}"
  | .maxUpright u n => s!"at most {n} {u.plural}"
  | .fitsIn w d => s!"fits in {cmText w} × {cmText d} (along x × along y)"

#guard UserRule.describe (.maxHeight 50) == "no block higher than 39 cm (50 block thicknesses)"
#guard UserRule.describe (.noUpright .standing) == "no standing blocks"

/-- The rules in words, one line each: first the strictness, then the extra rules. -/
def BuildRules.describe (r : BuildRules) : List String :=
  [s!"placement error: up to {mmText r.human.epsRel} per block",
   s!"blocks per step: at most {r.human.hands}",
   if r.clearance then "small gaps and tight slots: checked" else "small gaps and tight slots: not checked",
   if r.allowTurned then "turned blocks: allowed (checked at the planned positions only)"
   else "turned blocks: not allowed"] ++
  r.extra.map fun x => s!"your rule: {x.describe}"

/-- The rules differ from the defaults. -/
def BuildRules.custom (r : BuildRules) : Bool := r != {}

#guard !({} : BuildRules).custom && ({ clearance := false } : BuildRules).custom

end KaplaCore
