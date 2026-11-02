import Kapla.Proofs
import Kapla.Solver
import Kapla.Presets

namespace Kapla.Tests

/-- A second plank whose requested position overlaps the first before it is lowered. -/
def second : Block := ⟨1, 0, 0, 0, ⟨0, by decide⟩⟩

example : Spec.SceneValid 200 [samplePlank] := by decide
example : landingHeight second [samplePlank] = 2 := by decide
example : Spec.ClearsAbove second [samplePlank] 2 :=
  landingHeight_clears second [samplePlank]
example : landingHeight second [samplePlank] ≤ 3 :=
  landingHeight_minimal second [samplePlank] 3 (by
    intro b hb _
    simp only [List.mem_singleton] at hb
    subst b
    decide)
example : Spec.Separated { second with y := 3 } samplePlank :=
  vertical_path_clear second [samplePlank] 3 (by decide) samplePlank (by simp)
example : Spec.SceneValid 200 [dropped second [samplePlank], samplePlank] ∧
    [dropped second [samplePlank], samplePlank].length = [samplePlank].length + 1 :=
  place_preserves_validity 200 [samplePlank] _ second (by decide) (by decide)
example : Spec.SceneValid 200 [dropped second [samplePlank], samplePlank] :=
  replay_preserves_validity 200 [] [samplePlank, second] _ (by decide) (by decide)
example : Spec.Equilibrium 200 [samplePlank] Spec.sampleCertificate :=
  certificate_sound 200 [samplePlank] Spec.sampleCertificate (by decide)
example : checkCertificate 200 [samplePlank] Spec.sampleCertificate = true :=
  certificate_complete 200 [samplePlank] Spec.sampleCertificate
    (certificate_sound 200 [samplePlank] Spec.sampleCertificate (by decide))
example : accumulate 0 Spec.sampleCertificate.contacts =
    (Spec.forceSum 0 Spec.sampleCertificate.contacts,
     Spec.momentXSum 0 Spec.sampleCertificate.contacts,
     Spec.momentZSum 0 Spec.sampleCertificate.contacts) :=
  accumulate_eq_reference 0 Spec.sampleCertificate.contacts

/-- Two coincident planks violate the independent geometry specification. -/
example : ¬ Spec.SceneValid 200 [samplePlank, second] := by decide
/-- Two pieces do not fit in an inventory of one. -/
example : ¬ Spec.SceneValid 1 [dropped second [samplePlank], samplePlank] := by decide
/-- A duplicate ID is invalid even when the pieces do not overlap. -/
example : ¬ Spec.SceneValid 200 [samplePlank, {samplePlank with x := 100}] := by decide
/-- A negative contact force is not a compressive contact. -/
example : ¬ Spec.ContactValid [samplePlank] ⟨0, none, 30, 6, -1⟩ := by decide
/-- A force cannot act beyond the plank's contact face. -/
example : ¬ Spec.ContactValid [samplePlank] ⟨0, none, 300, 6, 1⟩ := by decide
/-- A floating plank cannot claim contact with the floor. -/
example : ¬ Spec.ContactValid [{samplePlank with y := 20}]
    ⟨0, none, 30, 6, 1⟩ := by decide
/-- A matching vertical force at the wrong point still violates torque balance. -/
example : ¬ Spec.Balanced samplePlank ⟨1, [⟨0, none, 0, 6, 1⟩]⟩ := by decide
/-- Removing a force does not leave a certified static scene. -/
example : ¬ Spec.Balanced samplePlank ⟨1, []⟩ := by decide

#guard checkCertificate 200 [samplePlank] Spec.sampleCertificate
#guard !(checkCertificate 200 [samplePlank] ⟨0, []⟩)
#guard !(checkCertificate 200 [samplePlank] ⟨1, [⟨0, none, 0, 6, 1⟩]⟩)
#guard (place 1 [samplePlank] second).isNone
#guard (place 200 [samplePlank] samplePlank).isNone
#guard (makePreset "tower" 200).length == 72
#guard (makePreset "bridge" 200).length == 27

-- These evaluate the actual generator and independently checked runtime certificate.
#eval (Solver.certify 200 (makePreset "tower" 200)).isOk
#eval (Solver.certify 200 (makePreset "bridge" 200)).isOk
#eval (Solver.certify 200 (makePreset "domino" 200)).isOk
#eval !(Solver.certify 200 (makePreset "overhang" 200)).isOk
#guard (Solver.certify 200 (makePreset "tower" 200)).isOk
#guard (Solver.certify 200 (makePreset "bridge" 200)).isOk
#guard (Solver.certify 200 (makePreset "domino" 200)).isOk
#guard !(Solver.certify 200 (makePreset "overhang" 200)).isOk

end Kapla.Tests
