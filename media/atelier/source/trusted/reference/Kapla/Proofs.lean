import Kapla.Core

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

#print axioms landingHeight_clears
#print axioms landingHeight_minimal
#print axioms vertical_path_clear
#print axioms place_preserves_validity
#print axioms replay_preserves_validity
#print axioms accumulate_eq_reference
#print axioms certificate_sound
#print axioms certificate_complete

end Kapla
