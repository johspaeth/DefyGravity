/- Generated once by scripts/freeze-spec.mjs. Author-proposed reference, not independent organizer approval. -/
import Lean

/- Frozen from Kapla/Model.lean. -/

namespace Kapla

/-- A plank pose. Horizontal coordinates are on a 4 mm grid; the floor is height zero. -/
structure Block where
  id : Nat
  x : Int
  y : Nat
  z : Int
  orientation : Fin 6
  deriving Repr, DecidableEq

/-- The six axis-aligned orientations of one 120 × 24 × 8 mm prototype plank. -/
def dimensions (o : Fin 6) : Nat × Nat × Nat :=
  match o.val with
  | 0 => (30, 2, 6)
  | 1 => (6, 2, 30)
  | 2 => (30, 6, 2)
  | 3 => (2, 6, 30)
  | 4 => (6, 30, 2)
  | _ => (2, 30, 6)

/-- Plank extent in the horizontal x direction. -/
def Block.width (b : Block) : Nat := (dimensions b.orientation).1
/-- Plank extent in the vertical direction. -/
def Block.height (b : Block) : Nat := (dimensions b.orientation).2.1
/-- Plank extent in the horizontal z direction. -/
def Block.depth (b : Block) : Nat := (dimensions b.orientation).2.2
/-- The rightmost face of the plank. -/
def Block.right (b : Block) : Int := b.x + b.width
/-- The farthest face of the plank. -/
def Block.back (b : Block) : Int := b.z + b.depth
/-- The top face of the plank. -/
def Block.top (b : Block) : Nat := b.y + b.height
/-- Twice the horizontal x coordinate of the center of uniform mass. -/
def Block.centerX2 (b : Block) : Int := 2 * b.x + b.width
/-- Twice the horizontal z coordinate of the center of uniform mass. -/
def Block.centerZ2 (b : Block) : Int := 2 * b.z + b.depth

/-- A shared vertical contact. It pushes the upper body up and the lower body down. -/
structure Contact where
  upper : Nat
  lower : Option Nat
  x2 : Int
  z2 : Int
  force : Int
  deriving Repr, DecidableEq

/-- The equal plank weight is represented by a positive integer scale. -/
structure Certificate where
  scale : Nat
  contacts : List Contact
  deriving Repr, DecidableEq

/-- A concrete single plank, used to show the specifications are satisfiable. -/
def samplePlank : Block := ⟨0, 0, 0, 0, ⟨0, by decide⟩⟩

end Kapla

/- Frozen from Kapla/Spec.lean. -/

namespace Kapla.Spec

/-- Two footprints meet over positive area, rather than only at an edge. -/
def FootprintsMeet (a b : Block) : Prop :=
  a.x < b.right ∧ b.x < a.right ∧ a.z < b.back ∧ b.z < a.back

instance (a b : Block) : Decidable (FootprintsMeet a b) :=
  inferInstanceAs (Decidable (_ ∧ _ ∧ _ ∧ _))

/-- At least one pair of faces separates the two interiors. Boundary contact is allowed. -/
def Separated (a b : Block) : Prop :=
  a.right ≤ b.x ∨ b.right ≤ a.x ∨ a.back ≤ b.z ∨ b.back ≤ a.z ∨
  a.top ≤ b.y ∨ b.top ≤ a.y

instance (a b : Block) : Decidable (Separated a b) :=
  inferInstanceAs (Decidable (_ ∨ _ ∨ _ ∨ _ ∨ _ ∨ _))

/-- Distinct IDs and non-overlap for every pair, within the available inventory. -/
def SceneValid (budget : Nat) (bs : List Block) : Prop :=
  bs.length ≤ budget ∧ bs.Pairwise (fun a b => a.id ≠ b.id ∧ Separated a b)

instance (budget : Nat) (bs : List Block) : Decidable (SceneValid budget bs) :=
  inferInstanceAs (Decidable (_ ∧ _))

/-- Every earlier intersecting footprint is below the proposed insertion height. -/
def ClearsAbove (p : Block) (bs : List Block) (h : Nat) : Prop :=
  ∀ b ∈ bs, FootprintsMeet p b → b.top ≤ h

/-- The identifier is not used by any current plank. -/
def Fresh (id : Nat) (bs : List Block) : Prop :=
  ∀ b ∈ bs, id ≠ b.id

/-- A doubled-grid point lies on or inside the horizontal plank rectangle. -/
def InFace (b : Block) (x2 z2 : Int) : Prop :=
  2 * b.x ≤ x2 ∧ x2 ≤ 2 * b.right ∧
  2 * b.z ≤ z2 ∧ z2 ≤ 2 * b.back

instance (b : Block) (x2 z2 : Int) : Decidable (InFace b x2 z2) :=
  inferInstanceAs (Decidable (_ ∧ _ ∧ _ ∧ _))

/-- A downward support is an actual touching lower face, or the floor. -/
def LowerFace (bs : List Block) (upper : Block) (c : Contact) : Prop :=
  match c.lower with
  | none => upper.y = 0
  | some id => ∃ lower ∈ bs,
      lower.id = id ∧ lower.id ≠ upper.id ∧ lower.top = upper.y ∧
      FootprintsMeet upper lower ∧ InFace lower c.x2 c.z2

instance (bs : List Block) (upper : Block) (c : Contact) :
    Decidable (LowerFace bs upper c) := by
  unfold LowerFace
  split <;> infer_instance

/-- A compressive force at a point on an independently checked contact patch. -/
def ContactValid (bs : List Block) (c : Contact) : Prop :=
  0 ≤ c.force ∧ ∃ upper ∈ bs,
    upper.id = c.upper ∧ InFace upper c.x2 c.z2 ∧ LowerFace bs upper c

instance (bs : List Block) (c : Contact) : Decidable (ContactValid bs c) :=
  inferInstanceAs (Decidable (_ ∧ _))

/-- The signed force applied by one shared contact to the selected plank. -/
def signedForce (id : Nat) (c : Contact) : Int :=
  (if c.upper = id then c.force else 0) -
  (if c.lower = some id then c.force else 0)

/-- Reference net vertical force, defined separately from the runtime accumulator. -/
def forceSum (id : Nat) : List Contact → Int
  | [] => 0
  | c :: cs => signedForce id c + forceSum id cs

/-- Reference first moment about the z axis, using doubled x coordinates. -/
def momentXSum (id : Nat) : List Contact → Int
  | [] => 0
  | c :: cs => signedForce id c * c.x2 + momentXSum id cs

/-- Reference first moment about the x axis, using doubled z coordinates. -/
def momentZSum (id : Nat) : List Contact → Int
  | [] => 0
  | c :: cs => signedForce id c * c.z2 + momentZSum id cs

/-- Gravity is balanced in force and both nontrivial torque components. -/
def Balanced (b : Block) (cert : Certificate) : Prop :=
  forceSum b.id cert.contacts = cert.scale ∧
  momentXSum b.id cert.contacts = (cert.scale : Int) * b.centerX2 ∧
  momentZSum b.id cert.contacts = (cert.scale : Int) * b.centerZ2

instance (b : Block) (cert : Certificate) : Decidable (Balanced b cert) :=
  inferInstanceAs (Decidable (_ ∧ _ ∧ _))

/-- Static equilibrium in the declared ideal vertical-force model, not physical safety. -/
def Equilibrium (budget : Nat) (bs : List Block) (cert : Certificate) : Prop :=
  0 < cert.scale ∧ SceneValid budget bs ∧
  (∀ c ∈ cert.contacts, ContactValid bs c) ∧
  (∀ b ∈ bs, Balanced b cert)

/-- A single central floor force is a concrete candidate witness. -/
def sampleCertificate : Certificate :=
  ⟨1, [⟨0, none, 30, 6, 1⟩]⟩

end Kapla.Spec

/- Frozen from Kapla/Core.lean. -/

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

/- Frozen from Kapla/Proofs.lean. -/

namespace Kapla

/-- The landing algorithm clears every previously placed, intersecting footprint. -/
theorem landingHeight_clears (p : Block) (bs : List Block) :
    Spec.ClearsAbove p bs (landingHeight p bs) := by
  induction bs with
  | nil => simp [Spec.ClearsAbove]
  | cons a bs ih =>
    intro b hb hmeet
    rcases List.mem_cons.mp hb with h | h
    · subst b
      simpa [landingHeight, hmeet] using Nat.le_max_left a.top (landingHeight p bs)
    · have lower := ih b h hmeet
      by_cases ha : Spec.FootprintsMeet p a
      · simpa [landingHeight, ha] using
          Nat.le_trans lower (Nat.le_max_right a.top (landingHeight p bs))
      · simpa [landingHeight, ha] using lower

/-- No smaller nonnegative height clears all obstacles from above. -/
theorem landingHeight_minimal (p : Block) (bs : List Block) (h : Nat)
    (clear : Spec.ClearsAbove p bs h) : landingHeight p bs ≤ h := by
  induction bs with
  | nil => simp [landingHeight]
  | cons a bs ih =>
    have tailClear : Spec.ClearsAbove p bs h := by
      intro b hb hm
      exact clear b (List.mem_cons_of_mem a hb) hm
    by_cases ha : Spec.FootprintsMeet p a
    · simp only [landingHeight, ite_eq_left ha]
      exact Nat.max_le.mpr ⟨clear a (List.mem_cons_self) ha, ih tailClear⟩
    · simpa [landingHeight, ha] using ih tailClear

/-- The plank has clearance throughout its vertical, grid-aligned insertion path. -/
theorem vertical_path_clear (p : Block) (bs : List Block) (h : Nat)
    (above : landingHeight p bs ≤ h) (b : Block) (hb : b ∈ bs) :
    Spec.Separated { p with y := h } b := by
  by_cases hm : Spec.FootprintsMeet p b
  · have ht := Nat.le_trans (landingHeight_clears p bs b hb hm) above
    exact Or.inr (Or.inr (Or.inr (Or.inr (Or.inr ht))))
  · unfold Spec.FootprintsMeet at hm
    change p.right ≤ b.x ∨ b.right ≤ p.x ∨ p.back ≤ b.z ∨ b.back ≤ p.z ∨
      h + p.height ≤ b.y ∨ b.top ≤ h
    omega

/-- The actual placement function preserves geometry, identity, and inventory. -/
theorem place_preserves_validity (budget : Nat) (bs out : List Block) (p : Block)
    (valid : Spec.SceneValid budget bs)
    (accepted : place budget bs p = some out) :
    Spec.SceneValid budget out ∧ out.length = bs.length + 1 := by
  unfold place at accepted
  split at accepted
  next guard =>
    have eq := Option.some.inj accepted
    subst out
    constructor
    · constructor
      · simp only [List.length_cons]
        omega
      · apply List.pairwise_cons.mpr
        constructor
        · intro b hb
          exact ⟨guard.2 b hb,
            vertical_path_clear p bs (landingHeight p bs) (Nat.le_refl _) b hb⟩
        · exact valid.2
    · rfl
  next guard => cases accepted

/-- A successful replay is safe after any accepted starting scene. -/
theorem replay_preserves_validity (budget : Nat) (bs actions out : List Block)
    (valid : Spec.SceneValid budget bs)
    (accepted : replay budget bs actions = some out) :
    Spec.SceneValid budget out := by
  induction actions generalizing bs with
  | nil =>
    have h : bs = out := Option.some.inj accepted
    exact h ▸ valid
  | cons p ps ih =>
    simp only [replay] at accepted
    cases hp : place budget bs p with
    | none => simp [hp] at accepted
    | some next =>
      simp only [hp] at accepted
      exact ih next (place_preserves_validity budget bs next p valid hp).1 accepted

/-- The efficient combined accumulator equals the three independent reference sums. -/
theorem accumulate_eq_reference (id : Nat) (cs : List Contact) :
    accumulate id cs =
      (Spec.forceSum id cs, Spec.momentXSum id cs, Spec.momentZSum id cs) := by
  induction cs with
  | nil => rfl
  | cons c cs ih =>
    simp only [accumulate, ih, Spec.forceSum, Spec.momentXSum,
      Spec.momentZSum, Spec.signedForce]

/-- Each runtime balance test is equivalent to the independently stated equations. -/
theorem checkBalance_iff (b : Block) (cert : Certificate) :
    checkBalance b cert = true ↔ Spec.Balanced b cert := by
  simp [checkBalance, accumulate_eq_reference, Spec.Balanced]

/-- Accepted witnesses establish every stated static-equilibrium condition. -/
theorem certificate_sound (budget : Nat) (bs : List Block) (cert : Certificate)
    (accepted : checkCertificate budget bs cert = true) :
    Spec.Equilibrium budget bs cert := by
  simpa [checkCertificate, checkScene, Spec.Equilibrium,
    List.all_eq_true, checkBalance_iff, and_assoc] using accepted

/-- The checker also accepts every witness that meets the exact specification. -/
theorem certificate_complete (budget : Nat) (bs : List Block) (cert : Certificate)
    (valid : Spec.Equilibrium budget bs cert) :
    checkCertificate budget bs cert = true := by
  simpa [checkCertificate, checkScene, Spec.Equilibrium,
    List.all_eq_true, checkBalance_iff, and_assoc] using valid


end Kapla

