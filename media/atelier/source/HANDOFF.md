# Kapla Atelier: build handoff

The playable preview is implemented, and the source and evidence are preserved in the Vibecheck Project under `kapla-studio/`. This is a working preview with explicit remaining acceptance gates, not an organizer-approved final submission.

## Try it

- **Quick demo:** choose Domino garden, then Play and Nudge. Rebuild restores the original construction.
- **Formal methods × AI:** choose Proof tour. Six theorem cards explain meaning, practical value, Lean’s contribution, proof technique, AI relevance, and limitations alongside live 3D examples. Expand the exact Lean statement for the formal version.
- **Build:** choose Start fresh, add planks, rotate them, and try flat, edge, or upright poses. Undo restores earlier canonical states.
- **Explore:** orbit and zoom, inspect the accepted load paths, or replay the construction sequence. Save build exports a JSON record that Open a build sends back to Lean for fresh checks.
- **Play:** test gravity, trigger an earthquake, pause, and use slow motion. Moving physics is visibly separated from the certified static scene.

## What runs in Lean

The actual Lean 4.35.0 executable owns geometry, placement, inventory, presets, canonical edits, import/export validation, and static-equilibrium certificate checking. Three.js and a full-resolution Canvas fallback render its records; Rapier supplies the separately labeled, unverified physics playground.

Eight main theorems cover placement clearance and minimality, vertical insertion, preservation of scene validity, replay, equivalence of force accumulators, and certificate-checker soundness and completeness. Checker completeness is not completeness of the candidate solver.

A green certificate means equilibrium in the declared idealized vertical-force model. It does not prove real-world safety, robustness against nudges, friction, material strength, or correctness of the animated physics.

## Checks completed

| Layer | Result |
| --- | --- |
| Lean build and executable tests | Passed, including 19 integration/differential groups |
| Sandboxed kernel replay | Passed |
| Sandboxed Comparator | Passed for all eight main theorems against the unchanged, independently compiled frozen reference |
| Local browser regression | All 14 groups passed after adding the tour; latest earthquake observation was 43 fps, below the 60 fps target |
| Six-theorem tour | Nine focused groups passed, including six interactive examples, real rejection responses, desktop/mobile resizing, state preservation, transport failure and close-during-request recovery |
| Hosted tour update | Eleven checks passed, including all six examples, JSON export/reimport, construction preservation, entry from physics/instructions, short-window controls and mobile source disclosure |
| Fresh hosted browser | Startup, JSON export/reimport, placement/undo, mobile placement, earthquake/pause/rebuild, and short-window scrolling passed |
| Hosted performance sample | 58 fps during earthquake playback at a 1600×1000 sandbox-browser viewport |
| Browser errors and reviewed layouts | No unexpected page/console errors in the hosted pass; no horizontal overflow or inaccessible controls in the reviewed layouts |
| Clean-source install and startup | Passed with Lean 4.35.0 already installed; fresh-machine elan installation was not separately tested |

Actual logs and reports are in `evidence/`, including `verification.json`, `browser-qa.json`, `hosted-qa.json`, `clean-install.txt`, and `clean-run.txt`. The required deterministic game-client snapshot is also preserved; it is not a real-time performance benchmark.

Tour checks are in `evidence/proof-tour-qa.json` and `evidence/hosted-proof-tour-qa.json`, with screenshots under `evidence/tour/`. The six statements are extracted from the unchanged frozen proof source during bundling. The original kernel and Comparator evidence is retained, with byte-for-byte source checks; the tour introduces no new theorem or broadened guarantee. AI’s role is authoring code and candidate proofs, not runtime control or force search.

## Remaining limits and gates

- **Large Retina performance:** still below target on the tested native hardware, despite automatic Canvas fallback. An observed physics state showed 15 fps at a 6784×2384 backing buffer; universal performance signoff is withheld.
- **Human review:** the frozen specification is author-proposed, not independently approved. Review `SPECIFICATION.md` before treating the proof claims as an accepted contract.
- **Hackathon eligibility:** implementation and evidence were prepared against the supplied [RULES.md](https://gist.github.com/maxvonhippel/03e1f5b9a26d6926ea6ec04b8d5e3dad) and [CLAUDE.md](https://gist.github.com/maxvonhippel/275f7db8139d46fef4d872aba0b3706f). Organizer eligibility and event-window requirements are not established.
- **Preview lifetime:** the backend must remain running. Export builds to keep them; sessions expire after four idle hours or a server restart.
- **Browser support:** WebGL 2 is required at startup. Rendering, transport, serialization, and dynamic physics are tested components outside the formal theorems.

## Run from source

From `kapla-studio/`, run:

```sh
make install
make run
```

Open `http://localhost:8000`. Node.js 20+, npm, make, and curl are required; `make verify` additionally requires Linux with working bubblewrap and unprivileged user namespaces.

Use `make test` for executable checks and `make verify` for the full proof/evidence pipeline. No API key, paid service, or language-model call is needed to run the application.
