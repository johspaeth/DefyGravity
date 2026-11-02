# Brandenburg Gate demo

![Brandenburg Gate build](brandenburg-demo.gif)

Video: [brandenburg-demo.mp4](brandenburg-demo.mp4) (60 s)

The plan is the gallery entry `gallery/brandenburger-tor.json` (40 planks, `planner: "ai"`) at commit `63835a9`.
Checked with `kapla check` built from that commit:

```
bp.json: 40 steps, 40 blocks
  Physics (verified): well-formed and stands after every block, at the planned positions only (turned blocks: placement errors, gaps and reach not checked)
exit 0
```

The plan is what the checker verifies. The 3D animation is a replay for viewing.
