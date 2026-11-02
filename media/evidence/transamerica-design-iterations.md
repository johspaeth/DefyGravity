r0 ta200-design.json  exit=1  first: step 5 falls (layers float 0.4: pitch 17/5 > edge height 3); 31 overlaps (wings in body, top-layer corners, crown ring corners, spire in core); 40 small gaps; 31 reach warnings
r1 pitch 3, W1=33/2, wings sized from W at their bottom, crown ring to +/-5, spire raised 3  -> exit=1  0 overlaps, 40 small gaps, step 5 still falls
r2 base W 30->24 (alternating pinwheel can't overlap at W=30)  -> exit=1  step 5 falls, 44 small gaps
r3 no pinwheel alternation (each face plank directly on the one below) -> exit=1 step 5 falls (edge plank 1 wide on 1-wide edge: 0.5-unit error can slide it off)
r4 body planks flat (P=1, h=W/2-3/2) -> exit=1 body stands to step 44, step 45 fails; 36 overlaps, 116 small gaps; body only 44 tall
r5 widths quantized to 1/2, W1=18, wings +1 out -> exit=1 0 overlaps, 20 small gaps, step 53 fails (4-plank pinwheel columns don't interlock)
r6 body rebuilt as 2-plank log-cabin crib (86 layers, half-gap 6->5/2), wings planks at +/-(h+3) on layers 66-85, 4-layer crib crown -> exit=1 only: blocks 197 and 198 small gap
r7 crown layer h 7/4 -> 3/2 -> exit=0 "Physics (verified): well-formed and solid after every block, for 3.9 mm placement errors"
