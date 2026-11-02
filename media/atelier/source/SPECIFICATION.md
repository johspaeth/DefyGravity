# Kapla Atelier: verification contract

This file states the intended contract before proof implementation. The corresponding Lean definitions live in `Kapla/Spec.lean`; they are not to be weakened to make a proof pass. This is an author-proposed specification, not an independently approved engineering standard.

## Exact world

Every plank is an axis-aligned rectangular box on a 4 mm grid. Its prototype dimensions are 120 × 24 × 8 mm, so the six permitted orientations are permutations of 30 × 6 × 2 grid units. These are illustrative dimensions, not a manufacturer's dimensional guarantee. Each plank has the same positive unit weight. The floor is horizontal, rigid, and unbounded.

Positions and checks use arbitrary-precision integers. Centers and contact points use doubled grid coordinates. A construction uses no more than its declared inventory. Two boxes may touch at their boundaries but their interiors must not overlap. Every currently placed plank has a distinct identifier.

## Placement and instructions

The executable landing algorithm returns the maximum top height of every existing block whose horizontal footprint intersects the new block, or zero when there is none.

The principal placement claim is that:

- Every accepted addition uses exactly one plank, stays within inventory, and preserves distinct IDs and non-overlap, provided the initial scene has those properties.
- The returned landing height is the lowest nonnegative height that clears all horizontally intersecting blocks from above.
- At the landing height and every higher grid height, the inserted plank does not intersect any existing block.
- Replaying accepted additions preserves these properties at every prefix, not only at the final arrangement.

Geometric clearance is not static equilibrium. A placement can pass the geometric test and still be uncertified for balance. The UI must distinguish those outcomes. The insertion claim covers only the plank, not hands, robots, tools, or arbitrary insertion directions.

## Static-equilibrium certificate

A candidate certificate names a positive integer weight scale and a list of point contacts. Each contact records an upper plank, a lower plank or the floor, an exact doubled-grid horizontal point, and a nonnegative integer vertical force.

The checker must independently verify:

- Scene geometry and inventory are valid.
- Every contact refers to existing, distinct planks, or the floor.
- Each inter-plank contact is between coincident horizontal faces with positive-area footprint overlap.
- The force point belongs to both faces. A floor contact belongs to a plank whose bottom is at floor height.
- Each force is nonnegative, so a contact cannot pull.
- For each plank, upward contact forces minus downward contact forces equal its weight.
- For each plank, the corresponding two horizontal first-moment balances equal weight times the plank's center.

The same contact record supplies an equal and opposite force to its two incident bodies. All forces and gravity are vertical, so the two horizontal force equations and vertical-axis torque are zero in this model. The two first-moment equations specify the other torques.

The certificate soundness theorem relates the runtime's combined accumulator to separate reference force and moment sums. Acceptance implies all of the conditions above for every plank and contact, not merely a stored Boolean field.

The candidate solver is not trusted. Failure to produce an accepted witness means “not certified,” not “will collapse” or “impossible.” Contacts on a boundary are allowed and can have zero robustness margin.

## Scope and trust

The claim is static equilibrium in the declared idealized model. It excludes impacts, lateral forces, frictional sliding, deformation, breakage, uncertainty, human assembly feasibility, and real-world safety. No physical validation has been performed.

The Three.js renderer, HTTP bridge, JSON parser/serializer, Lean compiler and native runtime, and Rapier animation are outside the proved theorems. Rendering and record fidelity are tested, not formally proved. The Lean kernel checks proofs about the Lean definitions. Comparator checks them against separately frozen declarations; it does not approve the specification or validate wood.

When physics starts, the app leaves the certified static scene and prominently labels the result illustrative. A rebuild returns to the last canonical Lean scene.

## Required evidence

Build the source, execute concrete accepted and rejected examples, audit each main theorem's axioms and transitive project-definition surface, run kernel replay, and run Comparator against the frozen statements. Keep the actual outputs and report any sandbox limitations without substituting an ordinary build for a successful sandboxed check.
