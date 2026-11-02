# Kapla Atelier

A sunlit, playable wooden-plank workshop with a real Lean 4.35.0 engine. Build on an exact grid, inspect the forces, replay an assembly, then switch to a deliberately separate rigid-body playground.

## Explore the proofs

Choose **Proof tour** in the header, or open it from the proof report. Six selectable theorems pair plain-English meaning with an interactive 3D example, “so what,” what Lean provides, how the proof works, why it matters for AI, an explicit boundary, and the exact statement extracted from the frozen Lean source.

Try a lower overlapping landing, move along the vertical insertion path, exhaust a three-plank inventory, replay a bridge, or tamper with a supporting force and restore it. The tour uses a separate Lean session and preserves your construction and Undo history. AI authored code and proposed proofs; Lean checked them at build time. There are no language-model calls during play, and the visual examples are not themselves proofs.

Run `node tests/proof-tour.mjs` with the server running for the focused tour regression suite. Existing workshop coverage remains in `node tests/browser.mjs`.

## Run the workshop

```sh
make install
make run
```

Open `http://localhost:8000`. Prerequisites are Node.js 20+, npm, make, and curl; the installer uses an existing Lean 4.35.0 or installs that exact toolchain through elan. No API key, paid service, database, account, or language-model call is required by the app.

```sh
make test       # Executable and differential tests
make verify     # Build, tests, axiom audit, spec surface, kernel replay, Comparator
```

With `make run` still running in another terminal, the standalone HTTP and browser regression checks are:

```sh
make test-http
npx playwright install chromium   # One-time browser install for the optional UI checks
make test-browser
node tests/build-provenance.mjs
```

The browser suite uses real clicks, keyboard input, downloads, and file uploads. It covers desktop, a 375px phone layout, a short window, backend failures, exact pause behavior, and computed text contrast. `FLOWS.md` records the user-facing coverage; these tests are not a substitute for the Lean proofs.

The verification target requires Linux with working `bubblewrap` and unprivileged user namespaces. On Debian/Ubuntu, install it with `sudo apt-get install bubblewrap`. The target never disables the sandbox. macOS can run the app and ordinary tests, but not the bundled Linux sandbox check.

`PORT=8080 make run` changes the standalone port. The private Computer preview uses port 8000. Its backend must remain running; this is not a claim of permanent production hosting.

## Play

- **Explore:** drag to orbit, scroll or pinch to zoom, and use Fit to reframe.
- **Add a plank:** choose Add plank, point at the table, and click. Lean computes its landing position. `R` rotates it; `T` cycles flat, edge, and upright poses. Arrow keys move the preview, and Enter places it.
- **Take it apart:** Remove deletes the selected plank in Lean, then recomputes the certificate. Undo restores an earlier canonical state. A removed support may leave an uncertified floating piece.
- **Start from an idea:** Sky tower, Little bridge, Domino garden, The tipping point, or an empty table. The overhang intentionally has no accepted equilibrium witness.
- **Inspect:** See the load paths visualizes the accepted contact forces. Replay the build shows canonical prefixes. “Check every step” separately runs the certificate checker on every released prefix.
- **Play with gravity:** Test gravity starts Rapier physics. Click a plank to nudge it, trigger an earthquake-like disturbance, pause, or use slow motion. Rebuild restores the original Lean scene, not an approximation recovered from the animation.
- **Save or open:** export an exact JSON record; reimport it for fresh checks. Saved status flags are not evidence. Imported force certificates, geometry, and any affirmative insertion-path claim are independently checked.
- **Listen:** original procedural wood taps and a quiet pentatonic ambience begin after a user gesture. The speaker button mutes both.

The browser retains no persistent local storage. Each tab receives an isolated, high-entropy session token; the private preview also binds it to the proxy's visitor identity. Export a build you want to keep. Idle backend sessions expire after four hours, and a server restart clears all sessions.

## What the proofs establish

The proved definitions are the same definitions compiled into the running engine. There is no JavaScript placement/checking engine with a disconnected Lean model.

| Theorem | Claim |
| --- | --- |
| `landingHeight_clears` | The computed landing height clears every overlapping horizontal footprint from above. |
| `landingHeight_minimal` | No lower nonnegative height clears all of those pieces from above. |
| `vertical_path_clear` | The inserted piece has no interior intersection at the landing height or any higher grid height. |
| `place_preserves_validity` | An accepted addition to a valid scene preserves inventory, distinct IDs, and non-overlap, and adds exactly one piece. |
| `replay_preserves_validity` | Accepted additions preserve the geometric scene invariant through replay. |
| `accumulate_eq_reference` | The runtime's fused force/moment accumulator equals three simpler reference sums. |
| `certificate_sound` | An accepted certificate satisfies the independent geometry, contact, force, and moment specification. |
| `certificate_complete` | Any certificate satisfying that specification is accepted by the checker. This is not solver completeness. |

Concrete examples discharge the hypotheses of all eight main theorems. Additional proofs reject overlap, duplicate IDs, insufficient inventory, negative forces, off-face forces, floating floor contacts, missing support force, and incorrect moments.

The runtime tests additionally exercise all six orientations, all presets, import/export including an honestly uncertified scene, tampered certificates, undo, inventory failures, separate sessions, and 120 seeded additions. A separate BigInt implementation in the test suite differentially checks geometry and the force/moment equations of accepted certificates; it is never used to accept a UI operation.

## The exact boundary

The model uses identical, axis-aligned **120 × 24 × 8 mm illustrative planks**, an exact 4 mm grid, equal unit weights, and an unbounded horizontal floor. Contact coordinates use a doubled grid, with arbitrary-precision integer forces and a shared positive scale. These are prototype dimensions, not a manufacturer's dimensional guarantee.

The static certificate covers vertical-force equilibrium and the two associated moment equations. It does not establish robustness, resistance to lateral disturbances, sliding friction, elastic deformation, impacts, material strength, human assembly feasibility, or real-world safety. Boundary contacts with zero robustness margin are allowed. No physical validation has been performed.

The exact-rational candidate solver is greedy and incomplete. A search failure means **not certified**, not “will collapse” or “no equilibrium exists.” A geometric placement can succeed while equilibrium certification fails; the UI must not conflate them.

The compiler, native runtime, JSON serialization, HTTP/session adapter, rendering and input mapping, and Rapier physics are outside the formal proofs. They are tested rather than proved. The geometry-preservation theorem requires a valid initial scene; parsing, removal, and protocol dispatch are not themselves separately verified theorems.

The dynamic playground copies the canonical poses but is explicitly **unverified illustrative physics**. It never inherits a green static-certification label. Render-only lighting, soft shadows, and tree decorations are not certificate subjects.

Hardware-accelerated browsers use Three.js WebGL. Software-only graphics use a full-resolution Canvas projection of the same camera, instance matrices, and Rapier bodies, with simplified wood surfaces and shadows. Persistently slow hardware graphics can switch to that projection during play without resetting the camera or simulation. This fallback reduces visual complexity, not resolution or elapsed simulation time. A WebGL 2-capable browser is still required at startup; this is not a renderer for browsers with graphics support disabled entirely.

## Frozen reference and evidence

`SPECIFICATION.md` states the intended plain-English contract. `Kapla/Spec.lean` contains the independent predicates and reference sums. The trusted reference is author-proposed and frozen, not independently approved by an organizer; human review of the specification remains necessary.

`trusted/reference/` is an independent Lake workspace containing byte-identical copies of the four frozen source modules, with their original names and boundaries. Comparator compares the live `Kapla.Proofs` module against a freshly compiled export of that reference. Its `definition_names` list is empty: no definition holes are allowed. The snapshot is not the implementation used by the application.

`scripts/check-freeze.mjs` checks the original freeze and every reference source hash before verification. `scripts/export-reference.mjs` cleans and rebuilds the independent reference, exports it with the bundled `leanexport`, and records the export hash. `make verify` supplies that export to Comparator; omitting it fails closed rather than silently comparing the live module with itself.

Two earlier packaging attempts were correctly rejected because concatenation or module renaming changed compiler-generated helper names. Their files and failure logs are preserved, and `trusted/README.md` explains the packaging repair. None of the original frozen source bytes, theorem statements, assumptions, proofs, or permitted axioms changed. Do not reset the baseline merely to make a changed implementation pass; a deliberate contract change needs human review.

Read the actual evidence rather than treating a normal compile as a final proof check:

- **`evidence/verification.json`:** machine-readable verdicts and source hashes, written only after all required commands succeed.
- **`evidence/build.txt`:** complete ordinary build output.
- **`evidence/axioms.txt`:** axiom dependencies for all main theorems.
- **`evidence/surface.txt`:** transitive project definitions mentioned by each theorem statement.
- **`evidence/integration.txt`:** executable and differential test output.
- **`evidence/lake-check.txt`:** sandboxed kernel replay output.
- **`evidence/comparator.txt`:** sandboxed Comparator output.
- **`evidence/reference-export.json`:** freshly compiled reference export hash and frozen source hashes.
- **`evidence/browser-qa.json`:** browser regression results, measured text contrast, expected injected errors, and actual runtime observations.
- **`evidence/clean-install.txt`, `evidence/clean-run.txt`:** clean-source installation and startup/HTTP checks, with Lean 4.35.0 already on PATH.

The web bundler checks the Lean-source hashes in the verification report before replacing the working bundle. Changed source with stale evidence is refused; `tests/build-provenance.mjs` exercises that refusal in a temporary copy, never by changing the frozen checkout.

Only `propext`, `Classical.choice`, and `Quot.sound` are permitted. The runtime definitions are computable. There are no proof holes, additional axioms, native-computation proof axioms, unlimited-heartbeat settings, kernel-skipping options, or unsafe replacement implementations in the project's verified sources.

`Kapla/Audit.lean` contains a partial traversal used only to print the dependency surface. It is an audit utility, not part of the executable, specification, or theorem statements.

## Source map

| Path | Responsibility |
| --- | --- |
| `Kapla/Model.lean` | Exact pieces, dimensions, contacts, and certificates |
| `Kapla/Spec.lean` | Reviewable specification and reference sums |
| `Kapla/Core.lean` | Runtime placement, replay, fused accumulator, and checker |
| `Kapla/Proofs.lean` | Proofs about those exact runtime definitions |
| `Kapla/Solver.lean` | Untrusted exact-rational certificate search |
| `Kapla/Presets.lean` | Blueprint requests executed by the same placement function |
| `Kapla/Protocol.lean`, `Main.lean` | Canonical sessions, edits, import/export, and JSON-lines I/O |
| `server.mjs` | Thin Node HTTP/session and static-file adapter |
| `web/` | Three.js / Canvas presentation, interaction, procedural audio, and Rapier playground |
| `trusted/`, `comparator.json` | Frozen comparison target and allowed axioms |
| `tests/`, `scripts/` | Executable testing, installation, bundling, and verification |

Lean has no third-party package dependencies. `lean-toolchain` and `lake-manifest.json` are checked in. JavaScript dependencies have exact versions in `package.json`, with integrity-pinned transitive dependencies in `package-lock.json`; installation uses `npm ci`.

## Hackathon and provenance

The supplied [RULES.md](https://gist.github.com/maxvonhippel/03e1f5b9a26d6926ea6ec04b8d5e3dad) asks for a nontechnical consumer demo, meaningful verification connected to the actual program, and working `make install` / `make run` targets. The supplied [CLAUDE.md](https://gist.github.com/maxvonhippel/275f7db8139d46fef4d872aba0b3706f) requires explicit specifications, concrete and negative examples, pinned versions, axiom and dependency-surface audits, kernel replay, and Comparator.

Both organizer files are included verbatim. This project implements the authoritative construction and certificate logic in Lean; browser graphics, audio, and an explicitly unverified physics library remain JavaScript/WebAssembly.

This implementation was created during the current Computer task, building on an earlier conceptual discussion, not an existing Kapla codebase. Lean, Three.js, Rapier, Lucide, esbuild, and webfonts are existing third-party components. The help/loading illustration was AI-generated for this task; the live scene is actual rendered geometry, not that image. No claim is made that all work occurred inside an organizer-defined event window, or that a judge has approved eligibility or the specification.

This is an unofficial, independent plank-building toy. KAPLA is used descriptively; no endorsement or affiliation is implied.
