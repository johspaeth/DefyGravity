# Defy Gravity: media release

Videos, renders, diagrams and team shirt art made for the Defy Gravity (KaplaBuilder) demo at Vibecheck, TheGP, San Francisco, Nov 1 2026.

This folder is a staging copy for review. Nothing in it has been committed or pushed. Every file is a byte-for-byte copy of the final version on the build box; nothing was re-encoded.

## Layout

```
video/        the 90-second stage cut
renders/      one folder per build: video, stills, inspector screenshots
diagrams/     how-it-works diagram
presentation/ inspector hub screenshot
gear/         team shirt art (print files and previews)
evidence/     saved `kapla check` output behind each claim
atelier/      Kapla Atelier, a separate Lean-backed plank toy (web front end, Lean source, proof logs)
perplexity/   docs and images from the Perplexity Vibecheck project
contact-sheet.png, MANIFEST.sha256
```

## What the checker says (read before captioning anything)

- **Golden Gate, 200 planks.** Proven to stand after every plank, even with each plank placed up to 3.9 mm off its planned spot (exit 0, robust). The checker warns that steps 180 and 199 may be hard to reach (warnings only). The orange bridge, cables, fog and bay are decorative overlay and are not checked.
- **Brandenburg Gate, 94 planks.** Passes **at the planned positions only** (exit 0, nominal). The 3.9 mm claim does **not** apply: placement errors, gaps and reach are not checked for its turned planks. The sandstone gate and quadriga are decorative overlay.
- **Transamerica.** The look-alike design (the one in draft PR #68 and in `transamerica-lookalike-concept-unchecked.mp4`) **fails** the checker (exit 1). After seven rounds of fixes, round 7 passes (exit 0, robust). The round 7 plan and its pass exist only in local files and are not in the repo. The white pyramid skin was fitted to the look-alike and is decorative.
- **Duck, 200 planks (rubber duck on a pond).** Passes (exit 0, robust). The duck skin is decorative. An earlier "duck in a tree" build was described as failing at step 122, but no saved checker output for that run exists, so don't caption it as a measured failure. The Perplexity rule-lab write-up (`perplexity/docs/kapla-rule-lab-20-kid-requests.md`) and its viewer screenshot say the opposite: the 200-plank duck in a tree stands at its planned positions at all 200 steps (viewer: "0 falling, 79 risky"); from the leg onward it is only *not certified* at 2 mm placement error. That run used the unmerged PR #14 engine at 2 mm, not the release checker, and no checker output file for it is saved here. Do not say it fell.
- Verdicts come from saved `kapla check` output (see `evidence/`), built from DefyGravity commit `fdb157d`. They are not live Lean runs. Only the planks are checked; every skin and overlay is decoration.

## Assets

| Path | What it shows | Source / how made | Dimensions / duration | Size |
|---|---|---|---|---|
| `video/defy-gravity-90s-v2.mp4` | The 90-second cut used on stage (v2): title card, Brandenburg Gate, Golden Gate, Transamerica look-alike to round 7, duck, closing line. No audio. | /workspace/v90/defygravity-90s-v2.mp4; ffmpeg concat of six rendered segments | 1280x720, 90 s | 9.8 MB |
| `renders/golden-gate/golden-gate-200-overlay.mp4` | Golden Gate, 200 planks: plank build, then decorative orange-bridge overlay fades in and back. | kapla-demo/gg/overlay200 (Three.js replay of gg200-pass.json, headless frame capture, ffmpeg; synthesized music) | 1280x720, 22 s | 2.8 MB |
| `renders/golden-gate/golden-gate-200-planks.png` | Golden Gate, finished 200-plank build (planks only). | kapla-demo/gg/overlay200/shots/blocks.png | 1280x720 | 246 KB |
| `renders/golden-gate/golden-gate-200-morph.png` | Golden Gate, mid-morph between planks and decorative overlay. | kapla-demo/gg/overlay200/shots/mid.png | 1280x720 | 277 KB |
| `renders/golden-gate/golden-gate-200-overlay.png` | Golden Gate, decorative overlay (bridge skin, cables, bay). Not checked. | kapla-demo/gg/overlay200/shots/bridge.png | 1280x720 | 174 KB |
| `renders/golden-gate/golden-gate-200-mathematician-view.png` | Golden Gate in the Mathematician inspector view, with checker verdict panel. | kapla-demo/inspectors/goldengate/shots/math.png | 1600x1000 | 366 KB |
| `renders/brandenburg-gate/brandenburg-gate-94-sandstone-overlay.mp4` | Brandenburg Gate, 94 planks: plank build, then decorative sandstone columns and quadriga fade in and back. | bt-video/v2/brandenburg-v2.mp4 (Three.js replay of bt100.json; synthesized music) | 1280x720, 30 s | 3.6 MB |
| `renders/brandenburg-gate/brandenburg-gate-94-sandstone-overlay.gif` | GIF version of the same Brandenburg clip (640x360) for README embedding. | bt-video/v2/brandenburg-v2.gif | 640x360, 30 s | 6.5 MB |
| `renders/brandenburg-gate/brandenburg-gate-94-planks.png` | Brandenburg Gate, finished 94-plank build (planks only). | bt-video/v2/still-blocks.png | 1280x720 | 41 KB |
| `renders/brandenburg-gate/brandenburg-gate-94-overlay.png` | Brandenburg Gate with decorative sandstone overlay. Not checked. | bt-video/v2/still-overlay.png | 1280x720 | 56 KB |
| `renders/brandenburg-gate/brandenburg-gate-mathematician-view.png` | Brandenburg Gate in the Mathematician inspector view. | kapla-demo/inspectors/brandenburg/shots/math.png | 1600x1000 | 208 KB |
| `renders/transamerica/transamerica-inspector-lookalike-vs-round7.mp4` | Transamerica inspector walkthrough: Family/Mathematician toggle, look-alike design (fails, exit 1) vs round 7 (passes, exit 0). | kapla-demo/ta/inspect/ta-inspect.mp4 | 1280x720, 25 s | 4.1 MB |
| `renders/transamerica/transamerica-lookalike-concept-unchecked.mp4` | Transamerica look-alike concept: planks plus decorative white skin. Physics NOT checked; this plan fails the checker. Byte-identical to demo/transamerica/transamerica-concept.mp4 in draft PR #68. | kapla-demo/ta/overlay-design/ta200-design.mp4 | 1280x720, 22 s | 2.4 MB |
| `renders/transamerica/transamerica-lookalike-planks.png` | Transamerica look-alike, planks only (unchecked design; fails). | kapla-demo/ta/overlay-design/shots/blocks.png | 1280x720 | 166 KB |
| `renders/transamerica/transamerica-lookalike-skin.png` | Transamerica look-alike with decorative skin (unchecked design; fails). | kapla-demo/ta/overlay-design/shots/tower.png | 1280x720 | 231 KB |
| `renders/transamerica/transamerica-lookalike-family-view.png` | Inspector Family view, look-alike design selected (fails, exit 1). | kapla-demo/ta/inspect/shots/family-design.png | 1280x720 | 213 KB |
| `renders/transamerica/transamerica-lookalike-mathematician-view.png` | Inspector Mathematician view, look-alike design with checker failures listed. | kapla-demo/ta/inspect/shots/math-design.png | 1280x720 | 282 KB |
| `renders/transamerica/transamerica-round7-family-view.png` | Inspector Family view, round 7 plan (passes). No skin: the skin was fitted to the look-alike only. | kapla-demo/ta/inspect/shots/family-r7.png | 1280x720 | 199 KB |
| `renders/transamerica/transamerica-round7-mathematician-view.png` | Inspector Mathematician view, round 7 plan with verbatim checker output (exit 0). | kapla-demo/ta/inspect/shots/math-r7.png | 1280x720 | 295 KB |
| `renders/duck/duck-200-pond-overlay.mp4` | Rubber duck on a pond, 200 planks: plank build, then decorative duck skin fades in and back. | kapla-demo/duck200-v3/overlay (Three.js replay of duck200.json v3; synthesized music) | 1280x720, 22 s | 1.9 MB |
| `renders/duck/duck-200-planks.png` | Duck, finished 200-plank build (planks only). | kapla-demo/duck200-v3/overlay/shots/blocks.png | 1280x720 | 177 KB |
| `renders/duck/duck-200-morph.png` | Duck, mid-morph between planks and decorative skin. | kapla-demo/duck200-v3/overlay/shots/mid.png | 1280x720 | 218 KB |
| `renders/duck/duck-200-overlay.png` | Duck with decorative rubber-duck skin. Not checked. | kapla-demo/duck200-v3/overlay/shots/duck.png | 1280x720 | 124 KB |
| `renders/duck/duck-200-mathematician-view.png` | Duck in the Mathematician inspector view. | kapla-demo/inspectors/duck/shots/math.png | 1600x1000 | 217 KB |
| `diagrams/how-it-works-v2.png` | How-it-works diagram: Ask, Propose, Prove (Lean checks), Build; fail loop back to the AI. | /workspace/v90/how-it-works-v2.png (rendered from v90/flow2.html) | 1600x900 | 216 KB |
| `presentation/inspector-hub.png` | Screenshot of the local inspector hub (four builds, verdicts, Lean proof list below the fold). | kapla-demo/inspectors/_ev/hub.png | 1600x1100 | 180 KB |
| `gear/defy-gravity-front-print.png` | Team shirt front, print-ready (300 dpi). | /workspace/tees/defy_gravity_FRONT_print.png (how it was made is not recorded on the box) | 3600x4800 | 13.5 MB |
| `gear/vibe-verified-back-print.png` | Team shirt back, "Vibe Verified" paisley, print-ready (300 dpi). Final (v4). | /workspace/tees/vibe_verified_BACK_print_v4.png (how it was made is not recorded on the box) | 3600x4800 | 20.7 MB |
| `gear/defy-gravity-front-preview.png` | Small preview of the shirt front. | KaplaBuilder branch gear/defy-gravity, assets/gear/ | 900x1200 | 1.5 MB |
| `gear/vibe-verified-back-preview.png` | Small preview of the shirt back. | KaplaBuilder branch gear/defy-gravity, assets/gear/ | 900x1200 | 2.2 MB |
| `evidence/golden-gate-200-check.txt` | Saved kapla check output for gg200-pass.json (exit 0, robust, reach warnings at steps 180 and 199). | kapla-demo/inspectors/_ev/ | text | 233 B |
| `evidence/brandenburg-gate-94-check.txt` | Saved kapla check output for bt100.json (exit 0, planned positions only). | kapla-demo/inspectors/_ev/ | text | 195 B |
| `evidence/duck-200-check.txt` | Saved kapla check output for duck200.json v3 (exit 0, robust). | kapla-demo/inspectors/_ev/ | text | 134 B |
| `evidence/transamerica-lookalike-check.txt` | Saved kapla check output for the look-alike design (exit 1). | kapla-demo/ta/design-check.txt | text | 4 KB |
| `evidence/transamerica-round7-check.txt` | Saved kapla check output for round 7 (exit 0, robust). | kapla-demo/ta/check-r7.txt | text | 142 B |
| `evidence/transamerica-design-iterations.md` | Log of the look-alike and repair rounds r0 to r7. | kapla-demo/ta/design-iterations.md | text | 1 KB |
| `evidence/checker-commit.txt` | DefyGravity commit the checker was built from for the saved outputs (fdb157d). | kapla-demo/inspectors/_ev/commit.txt | text | 41 B |
| `contact-sheet.png` | Contact sheet of every image plus one frame per video, labeled, for quick review. The bottom band adds the 7 Atelier and Perplexity images. | generated here (PIL + ffmpeg) | 2096x2492 | 1.6 MB |
Overlay videos were made by replaying the plank plan in Three.js, capturing frames with headless Playwright and encoding with ffmpeg. Their music is synthesized in code (numpy), not a licensed track.

## Kapla Atelier

Source: Perplexity Vibecheck project, made by Patrick with Perplexity Computer (built Oct 31 2026; the proof run in `proof/verification.json` is stamped 2026-11-01 01:09 UTC, which is Oct 31, 9:09 PM ET). Downloaded as the project's own ZIP and unpacked here byte-for-byte. It is a **separate project from the team's DefyGravity / KaplaBuilder app**: different code, a different Lean model, and a different plank size (120 x 24 x 8 mm on a 4 mm grid, not the 117 x 23.4 x 7.8 mm used by the team's checker). None of the 3.9 mm robustness claims above apply to it.

> **Read this before using the Atelier files.**
> - The top of `atelier/` (`index.html`, `app.js`, `chunks/`, `style.css`, `assets/`) is the **pre-built web front end** from the Perplexity ZIP. On its own it cannot build, check or play. The **full source with the Lean backend is now in `atelier/source/`** (the `kapla-studio/` folder from the Perplexity project), and it runs: see "Running it" below.
> - `index.html` line 118 ("The Lean source is included in the project.") is now true for this release: the source is in `atelier/source/`.
> - `index.html` (lines 176 to 616) contains a hosting script Perplexity injects into its apps (`data-pplx-inline-edit`). It is not part of the Atelier itself and is left unchanged.
> - `proof/README.md` lists evidence files (`evidence/build.txt`, `integration.txt`, `browser-qa.json`, `reference-export.json`, `clean-install.txt`, `clean-run.txt` and others). They are now in `atelier/source/evidence/`, except `evidence/component-audit/` (see the exclusions under "Running it").
> - The proofs cover an **idealized static model only**. Not proven: robustness to placement error (zero-margin edge contacts are allowed), friction or sliding, sideways forces, bumps or impacts, bending and material strength, whether a person can actually build it by hand, real-world safety, the Rapier "Test gravity" physics, and the renderer, JSON bridge, server and compiler. The candidate solver is also unverified: "not certified" does not mean "will fall". The specification is author-proposed and not independently approved.

**What it is.** A playable wooden-plank workshop. You add, rotate and remove planks; a Lean 4.35.0 backend computes where each plank lands and checks a static-equilibrium certificate for the scene. A separate "Test gravity" mode runs Rapier physics, which the app itself labels illustrative and unverified.

**Running it.** Run it from `atelier/source/`, not from the pre-built files at the top of `atelier/`. Re-checked on Nov 2 2026 on a Linux box with elan 4.2.4, Lean 4.35.0 (commit `eb6cafb`, the same one recorded in `verification.json`) and Node v24.22.1. These commands were run on a scratch copy of `atelier/source/`, so the staged files are unchanged:

```
make install            # npm ci --ignore-scripts, lake build, npm run build  -> "Build completed successfully (18 jobs)." / "Installed."
make test               # Lean protocol tests -> "ALL TESTS PASSED (19 scenario groups)"
PORT=8811 make run      # or: PORT=8811 node server.mjs  (default port 8000) -> "Kapla Atelier: http://localhost:8811 (Lean-authoritative)"
TEST_URL=http://127.0.0.1:8811 node tests/transport.mjs   # needs the server above running -> "HTTP TESTS PASSED: startup, default scene, token and visitor isolation, ..."
make verify             # full proof re-check, about 3 min -> "Your solution is okay!" / "All required checks passed."
```

What works:
- `GET /api/health` returns `{"ok":true,"engine":"Lean 4.35.0"}`. `POST /api/session` opens a Lean session. A `place` command returned "Plank placed by Lean.", and `checkPlan` then reported `certified: true`, `geometryValid: true` and "Exact vertical force and moment balance." A wrong session token is refused with HTTP 403.
- Opened in headless Chrome, `http://127.0.0.1:8811/` connects (`POST /api/session 200`), shows the Sky tower preset (72 planks, "Static equilibrium checked") and logs no page errors. Choosing a preset and pressing Undo both went through Lean (`POST /api/command 200`).
- `make test-http` with no arguments expects a server already running on port 8000. Give it `TEST_URL` to use another port, as above.
- `make verify` (`scripts/verify.sh`) runs, in order: the freeze check, `lake build`, the axiom audit, the surface audit, the integration tests, `lake check` (sandboxed kernel replay) and Comparator against a freshly compiled frozen reference. Lake runs its sandbox with bubblewrap, which mounts `--tmpfs /run/user`, so `/run/user` must exist on the host. On a minimal box without it, the run fails with `bwrap: Can't create file /run/user: Read-only file system`. Creating the directory (`sudo mkdir -p /run/user`) fixes this, and the sandbox stays on.

What the rerun shows: the new `axioms.txt`, `surface.txt`, `lake-check.txt` and `comparator.txt` are byte-identical to the ones in `atelier/proof/`. The new `verification.json` matches too, except for two timestamps (`checkedAt` and `frozenReference.compiledAt`). The frozen reference again hashes to `801e7e92291a25d8c57d1a707f91241a7496d8bf9d12afb92b62ea9aa634ecd7`, Lean's kernel "accepts the solution", and Comparator reports "Your solution is okay!". This re-confirms the same eight theorems in the same idealized model; it does not prove anything new. The evidence files shipped in `atelier/source/evidence/` are the originals from the Perplexity run (Oct 31), not the rerun.

Left out of `atelier/source/` (all still in the original ZIP): `.lake/` build output (including `trusted/reference/.lake`), `node_modules/` and `dist/` (`make install` rebuilds all three); the organizers' `CLAUDE.md` and `RULES.md` (replaced by `ORGANIZER-FILES.md`, which points to `../proof/ORGANIZER-FILES.md`; the build works without them); `COMPONENT-COMPATIBILITY-AUDIT.md` and `evidence/component-audit/` (an internal audit of teammates' DefyGravity components, which names teammates and includes Johannes's bunny proposal and render). No API keys, tokens, `.env` files, email addresses or phone numbers were found in what is included. `progress.md`, `README.md` and `HANDOFF.md` still mention the private Perplexity preview and "Computer" task, and `evidence/clean-install.txt` shows a Perplexity sandbox path; none of this is a secret.

The pre-built front end at the top of `atelier/` behaves as before: opened from disk (`file://`), Chrome blocks the ES module `app.js`. Served by a static server, the page renders and then shows "The workshop could not connect" because nothing answers `/api/session`. Fonts load from `api.fontshare.com` / `cdn.fontshare.com` and fall back to system fonts offline. `index.html` lines 176 to 616 are a script Perplexity injects into hosted apps (`data-pplx-inline-edit`) and are left unchanged.

**What the proofs establish (in its own idealized model).** The logs in `proof/` show Lean's kernel replay (`lake-check.txt`) and Comparator (`comparator.txt`, "Your solution is okay!") accepting eight theorems, using only the standard axioms `propext`, `Classical.choice`, `Quot.sound` (`axioms.txt`):

| Theorem | Plain meaning |
|---|---|
| `landingHeight_clears` | The computed landing height clears every plank underneath it. |
| `landingHeight_minimal` | No lower height would clear them. |
| `vertical_path_clear` | Dropping the plank straight down to that height never passes through another plank. |
| `place_preserves_validity` | An accepted placement keeps the scene valid (inventory, unique IDs, no overlap) and adds exactly one plank. |
| `replay_preserves_validity` | The same holds across a replayed sequence of placements. |
| `accumulate_eq_reference` | The fast force/moment sum equals three simple reference sums. |
| `certificate_sound` | If the checker accepts a force certificate, every plank's vertical forces and both moments balance, with no pulling contacts and every contact on a real shared face. |
| `certificate_complete` | Any certificate that meets that specification is accepted. This is about the checker, not the solver: a search failure means "not certified", not "will fall". |

It does **not** establish robustness to placement error (zero-margin edge contacts are allowed), friction, sideways forces, bumps, material strength, buildability by hand, or real-world safety, and the Rapier "Test gravity" mode is outside the proofs. The specification is author-proposed and has not been independently approved (`verification.json`: `"independentPhysicalValidation": false`). These are **saved logs, not something this folder can re-run**: the Lean sources they hash are not included. The app originally bundled the Vibecheck organizers' `CLAUDE.md` and `RULES.md`. They are third-party, so this folder replaces them with links in `proof/ORGANIZER-FILES.md`.

| Path | What it is | Size |
|---|---|---|
| `atelier/index.html` | App page (UI text, proof dialog). | 32 KB |
| `atelier/app.js` | Bundled front end (Three.js, Canvas fallback, UI, backend client). | 619 KB |
| `atelier/chunks/rapier-DEFE34J7.js` | Rapier physics engine (WebAssembly bundle) for the unverified gravity mode. | 2.2 MB |
| `atelier/style.css` | Styles. | 38 KB |
| `atelier/assets/atelier-cover.png` | Loading/help illustration, AI-generated per the app's own README; not rendered geometry and not checked. 1024x1536. | 2.0 MB |
| `atelier/proof/README.md`, `SPECIFICATION.md` | The app's README and its verification contract. The README's evidence list names files (`build.txt`, `integration.txt`, `browser-qa.json`, …) and an `evidence/` folder that are not in the ZIP. | 14 KB, 5 KB |
| `atelier/proof/verification.json`, `theorems.json`, `axioms.txt`, `surface.txt`, `lake-check.txt`, `comparator.txt` | Proof-run record, the six tour theorem statements, axiom audit, definition surface, kernel replay log, Comparator log. | 12 KB total |
| `atelier/source/` | Full `kapla-studio` source: `Kapla/*.lean`, `Main.lean`, `trusted/` (frozen challenge and reference), `web/`, `server.mjs`, `scripts/`, `tests/`, `Makefile`, `lakefile.toml`, `lake-manifest.json`, `package.json`, `package-lock.json`, docs and `evidence/` (original proof run, QA screenshots and tour). 122 files. See "Running it" for what was left out. | 7.9 MB |
| `atelier/proof/ORGANIZER-FILES.md` | Links to the organizers' original `RULES.md` and `CLAUDE.md` gists (Max von Hippel), with the SHA-256 of the copies the app had bundled. The copies themselves are not included. | 1 KB |

## Perplexity project items

Source: Perplexity Vibecheck project, made by Patrick with Perplexity Computer, unless the row says otherwise. Downloaded through each item's own download button; the three interactive visuals offer no download, so they are screenshots. Screenshots include Perplexity's page chrome ("Back to session", "Share", "Publish") and should be cropped before public use.

| Path | What it is | Source / how made | Dimensions | Size |
|---|---|---|---|---|
| `perplexity/docs/vibecheck-recap.md` | Recap of what the team's DefyGravity repo built and what its verification does and does not establish, with PR links. Written to Patrick in the second person ("your contribution"). | Perplexity Computer, from the repo, PRs and CI (Nov 2), not a new Lean run | text | 9 KB |
| `perplexity/docs/kapla-atelier-build-handoff.md` | Atelier handoff: how to try it, what runs in Lean, checks completed, remaining limits. | Perplexity Computer | text | 6 KB |
| `perplexity/docs/kapla-rule-lab-20-kid-requests.md` | Rule lab: 21 kid-style requests (heading says 21, file name and some lines say 20) run through the PR #14 checker at 2 mm and 1 mm, including the 200-plank duck in a tree. | Perplexity Computer, PR #14 engine at `4a2dc0a` (unmerged), not the release checker | text | 13 KB |
| `perplexity/images/kapla-atelier-workshop-preview.jpg` | Atelier, Sky tower preset, "Static equilibrium checked". | Perplexity Computer | 1356x848 | 163 KB |
| `perplexity/images/kapla-atelier-running-screenshot.png` | Atelier running in the Perplexity preview, Sky tower preset. | screenshot of the Perplexity artifact | 1920x1072 | 572 KB |
| `perplexity/images/duck-in-tree-200-planks-screenshot.png` | Rule-lab viewer, 200-plank duck on one leg in a tree, step 200 of 200: "plan: 0 falling, 79 risky" at 2 mm. | screenshot of the Perplexity artifact | 1920x1072 | 118 KB |
| `perplexity/images/kapla-rule-lab-duck-in-tree-37-screenshot.png` | Rule-lab viewer, 37-plank duck in a tree at 2 mm: "0 falling, 8 risky steps". | screenshot of the Perplexity artifact | 1920x1072 | 89 KB |
| `perplexity/images/kapla-lab-simulator-preview-screenshot.png` | "KAPLA Lab" simulator preview, lean-out-5-planks example. | screenshot of the Perplexity artifact | 1920x1072 | 71 KB |
| `perplexity/images/pr55-gallery-contact-sheet.jpg` | Contact sheet of the six gallery plans in DefyGravity PR #55 (arch, bridge, dog, horse, pyramid, tower) with scores and "robust physics: pass". | Sheet made in Patrick's Perplexity project; the plans are the team's PR #55 gallery work | 1016x1132 | 139 KB |

Left out on purpose: "Johannes Bunny Render" (Johannes's work) and the KAPLA Grok and Gemini packs.

## Credits

- Team: _TODO (names and roles, as the team wants them shown)_
- Kapla planner, checker and web app: the DefyGravity repo contributors
- Kapla Atelier and the Perplexity project items: Patrick, with Perplexity Computer (PR #55 gallery plans: the DefyGravity contributors; Vibecheck organizer files linked from `atelier/proof/ORGANIZER-FILES.md`: Max von Hippel)
- Renders, videos, diagram and shirt art: _TODO_

## Size notes

The total is about 88.4 MB: 183 files plus this README and the manifest (38 original assets, 14 Atelier front-end and proof files, 122 Atelier source files in `atelier/source/` (7.9 MB), 9 Perplexity files; the contact sheet was regenerated). No single file is over 50 MB; the largest is `gear/vibe-verified-back-print.png` at about 20.7 MB, so plain git will work. If the repo should stay light, consider moving the two print-ready shirt PNGs (34 MB together) and the 90-second cut (9.8 MB) to Git LFS or attaching them to a GitHub release.
