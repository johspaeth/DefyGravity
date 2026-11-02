import Kapla.Model

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
