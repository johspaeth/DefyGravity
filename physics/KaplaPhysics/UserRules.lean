import KaplaPhysics.CoreAdapter
import KaplaSpecs.PhysicsRules.UserRules

/-! # Checking a person's own rules

`checkRule` checks one extra rule (`KaplaCore.UserRule`) on a list of blocks. It does not try
every corner against every corner: it uses the top of each block, and the smallest and
largest `x` and `y` of all corners. `checkRule_iff` (statement in `specs/KaplaSpecs/Physics.lean`,
proof in `Proofs.lean`) says this is the same as the meaning `RuleHolds`.

`coreCheckWith` is `coreCheck` plus the extra rules: the plan is `ok` only if `coreCheck` says
`ok` and every extra rule holds. A broken rule gets a `ruleBroken` diagnostic with the first
step that breaks it. `engineFor` is the physics engine for a person's `BuildRules`. -/

namespace KaplaPhysics

open KaplaCore (UserRule BuildRules BuildPlan HumanModel PhysicsReport Diagnostic Q3)

/-- The height of the top face of a block above the ground. -/
def poseTop (p : KaplaCore.Pose) : Rat := p.center.z + p.up.dims.z / 2

/-- The largest `f c` for `c` in the list, starting from `a`. -/
def largest (f : Q3 → Rat) (a : Rat) : List Q3 → Rat
  | [] => a
  | c :: cs => largest f (if a ≤ f c then f c else a) cs

/-- The smallest `f c` for `c` in the list, starting from `a`. -/
def smallest (f : Q3 → Rat) (a : Rat) : List Q3 → Rat
  | [] => a
  | c :: cs => smallest f (if f c ≤ a then f c else a) cs

/-- The corners of the blocks span at most `w` along `x` and `d` along `y`. -/
def spanWithin (w d : Rat) : List Q3 → Bool
  | [] => true
  | c :: cs =>
      decide (largest (·.x) c.x cs - smallest (·.x) c.x cs ≤ w) &&
        decide (largest (·.y) c.y cs - smallest (·.y) c.y cs ≤ d)

/-- Check one extra rule on a list of blocks. -/
def checkRule : UserRule → List KaplaCore.Pose → Bool
  | .maxHeight h, ps => ps.all fun p => decide (poseTop p ≤ h)
  | .noUpright u, ps => ps.all fun p => p.up != u
  | .maxUpright u n, ps => decide (ps.countP (·.up == u) ≤ n)
  | .fitsIn w d, ps => spanWithin w d (ps.flatMap KaplaCore.Pose.corners)

#guard checkRule (.maxHeight 3) flatStack3 && !checkRule (.maxHeight (5 / 2)) flatStack3
#guard checkRule (.fitsIn 15 3) flatStack3 && !checkRule (.fitsIn 14 3) flatStack3
#guard !checkRule (.maxUpright .flat 2) flatStack3 && checkRule (.noUpright .onEdge) flatStack3

/-- Check every rule in the list. -/
def checkRules (rules : List UserRule) (ps : List KaplaCore.Pose) : Bool := rules.all (checkRule · ps)

/-- The first block (from 0) after which rule `r` no longer holds, if there is one. -/
def firstBreak (r : UserRule) (ps : List KaplaCore.Pose) : Option Nat :=
  (List.range ps.length).find? fun k => !checkRule r (ps.take (k + 1))

#guard firstBreak (.maxHeight 2) flatStack3 == some 2

/-- The checks of `coreCheck` that a person's `BuildRules` switch on or off. -/
def optionsOf (r : BuildRules) : PlanOptions :=
  { clearance := r.clearance, allowNominal := r.allowTurned }

/-- `coreCheck`, plus the extra rules. `ok` only if `coreCheck` says `ok` and every extra rule
holds. The assurance is the one from `coreCheck`. -/
def coreCheckWith (opts : PlanOptions) (rules : List UserRule) (h : HumanModel) (maxBlocks : Nat)
    (plan : BuildPlan) : PhysicsReport :=
  let r := coreCheck opts h maxBlocks plan
  let stepOf := fun i => (stepOfBlock plan).getD i 0
  let broken : List Diagnostic := rules.zipIdx.filterMap fun (x, i) =>
    if checkRule x plan.blocks then none
    else some (.ruleBroken i (stepOf ((firstBreak x plan.blocks).getD 0)))
  { r with ok := r.ok && checkRules rules plan.blocks, diagnostics := r.diagnostics ++ broken }

/-- The verified physics engine for a person's rules: the builder from the planner's request,
the checks and extra rules from `rules`. With the default rules it is `physicsEngine`. -/
def engineFor (rules : BuildRules) : KaplaCore.PhysicsEngine :=
  ⟨coreCheckWith (optionsOf rules) rules.extra⟩

#guard (coreCheckWith {} [.maxHeight 2] .default 200
  ⟨flatStack3.map fun p => { blocks := [p] }⟩).diagnostics == [.ruleBroken 0 2]

end KaplaPhysics
