import Lean

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
