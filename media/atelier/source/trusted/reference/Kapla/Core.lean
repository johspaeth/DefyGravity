import Kapla.Spec

namespace Kapla

/-- Find the first height reached by lowering a plank from above the whole scene. -/
def landingHeight (p : Block) : List Block → Nat
  | [] => 0
  | b :: bs =>
    if Spec.FootprintsMeet p b then max b.top (landingHeight p bs)
    else landingHeight p bs

/-- The canonical pose produced by the runtime placement algorithm. -/
def dropped (p : Block) (bs : List Block) : Block :=
  { p with y := landingHeight p bs }

instance (id : Nat) (bs : List Block) : Decidable (Spec.Fresh id bs) :=
  inferInstanceAs (Decidable (∀ b ∈ bs, id ≠ b.id))

/-- Accept one new plank only when inventory remains and its ID is unused. -/
def place (budget : Nat) (bs : List Block) (p : Block) : Option (List Block) :=
  if bs.length < budget ∧ Spec.Fresh p.id bs then
    some (dropped p bs :: bs)
  else none

/-- Check an imported scene rather than trusting a saved verification flag. -/
def checkScene (budget : Nat) (bs : List Block) : Bool :=
  decide (Spec.SceneValid budget bs)

/-- Accumulate force and both first moments together in one pass. -/
def accumulate (id : Nat) : List Contact → Int × Int × Int
  | [] => (0, 0, 0)
  | c :: cs =>
    let rest := accumulate id cs
    let delta := (if c.upper = id then c.force else 0) -
      (if c.lower = some id then c.force else 0)
    (delta + rest.1, delta * c.x2 + rest.2.1, delta * c.z2 + rest.2.2)

/-- The runtime balance check uses the combined accumulator. -/
def checkBalance (b : Block) (cert : Certificate) : Bool :=
  let totals := accumulate b.id cert.contacts
  decide (totals.1 = (cert.scale : Int) ∧
    totals.2.1 = (cert.scale : Int) * b.centerX2 ∧
    totals.2.2 = (cert.scale : Int) * b.centerZ2)

/-- Accept only exact geometry and a complete, compressive, balanced force witness. -/
def checkCertificate (budget : Nat) (bs : List Block) (cert : Certificate) : Bool :=
  decide (0 < cert.scale) &&
  checkScene budget bs &&
  cert.contacts.all (fun c => decide (Spec.ContactValid bs c)) &&
  bs.all (fun b => checkBalance b cert)

/-- Replay a list of player placement requests; one rejection rejects the plan. -/
def replay (budget : Nat) (bs : List Block) : List Block → Option (List Block)
  | [] => some bs
  | p :: ps =>
    match place budget bs p with
    | none => none
    | some next => replay budget next ps

end Kapla
