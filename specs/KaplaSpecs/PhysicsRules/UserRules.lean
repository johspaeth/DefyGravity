import KaplaCore

/-! # What a person's own rules mean (human-owned)

A person can add rules of their own to a plan (`KaplaCore.UserRule`), such as "no block higher
than 30 cm". This file says what it means that a list of blocks keeps such a rule. It is
written with the corners of each block (`KaplaCore.Pose.corners`), so it does not depend on
how the engine computes it.

The engine's check is `KaplaPhysics.checkRule` (`physics/KaplaPhysics/UserRules.lean`).
`specs/KaplaSpecs/Physics.lean` states that it says yes exactly when the rule holds. -/

namespace KaplaPhysics

open KaplaCore (UserRule Upright)

/-- The blocks `ps` keep the rule `r`:
* `maxHeight h`: every corner of every block is at most `h` above the ground;
* `noUpright u`: no block has face `u` down;
* `maxUpright u n`: at most `n` blocks have face `u` down;
* `fitsIn w d`: for any two corners of any two blocks, the one is at most `w` further along
  `x` than the other, and at most `d` further along `y`. So the whole build fits in a
  `w` × `d` rectangle with sides along `x` and `y`. -/
def RuleHolds : UserRule → List KaplaCore.Pose → Prop
  | .maxHeight h, ps => ∀ p ∈ ps, ∀ c ∈ p.corners, c.z ≤ h
  | .noUpright u, ps => ∀ p ∈ ps, p.up ≠ u
  | .maxUpright u n, ps => (ps.filter (·.up == u)).length ≤ n
  | .fitsIn w d, ps =>
      ∀ p ∈ ps, ∀ q ∈ ps, ∀ c ∈ p.corners, ∀ c' ∈ q.corners, c.x - c'.x ≤ w ∧ c.y - c'.y ≤ d

instance (r : UserRule) (ps : List KaplaCore.Pose) : Decidable (RuleHolds r ps) := by
  cases r <;> unfold RuleHolds <;> infer_instance

/-- The blocks keep every rule in the list. -/
def KeepsRules (rules : List UserRule) (ps : List KaplaCore.Pose) : Prop := ∀ r ∈ rules, RuleHolds r ps

/-- The blocks keep every rule in the list after every step: the first `k` blocks keep them,
for every `k`. -/
def KeepsRulesThroughout (rules : List UserRule) (ps : List KaplaCore.Pose) : Prop :=
  ∀ k, KeepsRules rules (ps.take k)

/-! ## Examples -/

/-- Three flat blocks stacked at the origin: 3 units tall, 15 × 3 across. -/
def flatStack3 : List KaplaCore.Pose :=
  [⟨.flat, .id, ⟨0, 0, 1 / 2⟩⟩, ⟨.flat, .id, ⟨0, 0, 3 / 2⟩⟩, ⟨.flat, .id, ⟨0, 0, 5 / 2⟩⟩]

-- The stack is 3 tall, so it keeps "no block higher than 3", and not "no higher than 5/2".
example : RuleHolds (.maxHeight 3) flatStack3 := by decide +kernel
example : ¬ RuleHolds (.maxHeight (5 / 2)) flatStack3 := by decide +kernel
-- It has no standing block, and three flat ones: more than two.
example : RuleHolds (.noUpright .standing) flatStack3 := by decide +kernel
example : ¬ RuleHolds (.maxUpright .flat 2) flatStack3 := by decide +kernel
-- It fits in 15 × 3, but not in 14 × 3.
example : RuleHolds (.fitsIn 15 3) flatStack3 := by decide +kernel
example : ¬ RuleHolds (.fitsIn 14 3) flatStack3 := by decide +kernel
-- A block turned by 90° lies along `y`, so the stack plus that block no longer fits in 15 × 3.
example : ¬ RuleHolds (.fitsIn 15 3) (flatStack3 ++ [⟨.flat, .quarter, ⟨0, 0, 7 / 2⟩⟩]) := by
  decide +kernel

end KaplaPhysics
