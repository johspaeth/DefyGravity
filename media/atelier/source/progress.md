Original prompt: Build a Kapla block simulator in Lean v4.35.0. It should look awesome and be fun, and adhere to the supplied RULES.md and CLAUDE.md.

# Kapla Atelier build log

## Six-theorem interactive tour

- Added the user-requested proof tour, accessible from both the header and proof report. Six existing theorems have plain-English explanations, practical significance, proof technique, AI relevance, explicit boundaries and source-extracted exact statements.
- The experiments use a separate real Lean session. They cover computed landing, rejected overlap, the vertical path, inventory exhaustion, bridge replay and certificate tampering/restoration. No runtime AI or new proof claims were added.
- Preserved a single full-resolution canvas, original construction/revision/Undo history and force display when returning to the workshop. Network errors never assert acceptance; closing aborts requests and prevents stale updates.
- Fixed keyboard focus loss during asynchronous replay slider updates; Escape also exits when a range input is focused.
- Nine focused tour groups and all 14 existing workshop browser groups passed. Computed visible-label contrast passed; desktop/mobile/desktop resizing and failure/recovery paths were exercised.
- Reviewed the six example states, overlap/force rejections, completed replay and mobile explanation/source views. The required game client captured a real two-support scene and authoritative 120 mm landing.
- Frozen-source comparison and the stale-provenance build rejection test passed. No Lean model, specification, theorem or frozen reference was modified.
- Latest local physics regression sampled 43 fps. Existing large-Retina performance limitations remain open; this feature does not establish a new performance guarantee.
- Refreshed the existing private app in place. Eleven hosted checks passed: all six interactive examples, construction preservation, real JSON export/reimport, entry from physics/instructions, Escape with slider focus, short-window controls and mobile source disclosure. No page exceptions were observed.
- Saved hosted results in `evidence/hosted-proof-tour-qa.json` and reviewed the short-window and final desktop captures. QA browser sessions are closed; the Lean backend remains required for the private preview.

## Scope

- The actual Lean executable owns placement, exact geometry, inventory, presets, canonical construction records, and static-equilibrium certificate checking.
- Three.js renders that record. Rapier provides a separately labeled, unverified rigid-body playground.
- Static certification is not resistance to a disturbance or a real-world safety claim.
- No paid API, credentials, or language-model calls are needed to run the app.
- Keep the organizer files unchanged.

## Preflight

- Read both supplied gists in full, including proof-hygiene instructions.
- Confirmed official Lean v4.35.0 release and tag through GitHub.
- No prior app exists in the Project catalog.
- Project knowledge checkout is empty. Read the relevant earlier Kapla discussion, but the current request is the build authorization.
- Runtime dependencies are pinned. No third-party Lean dependencies are planned.

## Working preview milestone

- The Lean 4.35.0 executable, all eight main proofs, concrete positive/negative examples, and 19 integration-test groups pass.
- Sandboxed `lake check` accepts the program; sandboxed Comparator accepts all eight main theorems.
- Original frozen source hashes are unchanged. The reference uses an independent, byte-identical workspace to preserve generated helper identities; failed packaging attempts remain in the evidence.
- The real workshop is implemented with building, presets, forces, instructions, import/export, procedural audio, and separate Rapier physics.
- Software-rendered browsers now use a full-resolution Canvas projection of the same 3D scene and physics bodies; an observed active earthquake run reached 60 fps.
- Desktop and mobile previews have been inspected. The comprehensive browser/HTTP test scripts, clean-install check, and hosted-preview QA are still in progress.

## Local regression milestone

- Re-ran `make verify`: the kernel and Comparator accepted the eight main theorems. The frozen reference export hash is still `801e7e92291a25d8c57d1a707f91241a7496d8bf9d12afb92b62ea9aa634ecd7`.
- All 14 browser-test groups passed. Desktop, phone, short-window, and live resize layouts were exercised; every captured enabled text label met 4.5:1 computed CSS-surface contrast.
- Real JSON download/import, malformed certificate rejection, six orientations, pointer picking, undo, all presets, every-prefix checks, audio activation, physics pause/resume, slow motion, quake, and all 24 falling dominos passed.
- Both edit and placement-preview network failures disable writes and clear the live green status. The HTTP suite passed visitor/token isolation and malformed/oversized-request checks.
- Fixed mobile placement and sequence framing, temporary hint overlap, stale hint cleanup, and secondary-label contrast. Added a hardware-to-Canvas fallback for sustained low frame rate; actual hardware transition still needs the updated hosted check.
- Added a bundling guard that refuses stale Lean verification evidence before touching the previous bundle. Its mutation test runs outside the frozen checkout and passes.
- Inspected mobile help and proof dialogs through their scrollable bottom content; their close action and disclosure links remain accessible.
- Re-ran the required game client on the latest physics build. Its snapshot is a genuinely stepped, paused simulation, not a real-time performance benchmark.

## Preview handoff

- Clean-source `make install` and `make run` passed, including HTTP isolation/rejection checks. Lean 4.35.0 was already on PATH; the fresh-machine elan installation branch was not independently exercised.
- The existing private app was refreshed in place. A fresh hosted browser context passed startup, real JSON download and checked reimport, placement/undo, mobile upright placement, and real-time earthquake/pause/rebuild.
- Hosted earthquake playback reached 58 fps at a 1600×1000 viewport in the sandbox browser. That is not a claim about every GPU or display size.
- Inspected the bottom of the short 1280×600 layout after actual scrolling. Footer, presets, and controls remain reachable. Inspected and refreshed the full workshop screenshot.
- Preserved the hosted results in `evidence/hosted-qa.json`. There were no page exceptions or console errors in that pass.
- Actual Comet testing confirmed the hardware-to-Canvas transition, but large native Retina surfaces still missed the performance target. One observed physics state showed 15 fps at a 6784×2384 backing buffer. A final native capture was not completed because that browser session expired. Do not report universal performance signoff.
- `HANDOFF.md` records the delivered scope, evidence, run instructions, and remaining acceptance gates. No further features were added after the user asked whether the work was almost done.

## Open acceptance gates

- Improve and recheck large-Retina hardware performance, including post-transition interaction coverage. Do not lower backing-buffer sharpness or slow simulation time to disguise the issue.
- Obtain human review of the author-proposed specification and confirmation of organizer eligibility. Neither is approved.
- Permanent hosting is not configured. The private preview depends on the running backend; exported JSON is the way to retain a build.

## QA inventory

- Startup: rendered 3D tower, Lean connection, no fake verification status.
- Presets: tower, bridge, domino garden, tipping point, and empty workshop; correct inventory and framing.
- Placement: pointer and keyboard, all six orientations, boundary and inventory rejection.
- Undo and removal: state changes, certificate recomputation, no stale green status.
- Construction instructions: step slider and play/pause match the exact canonical order.
- Certificate: independent checks, explicit non-certification, scope and proof report.
- Physics: start, pause, resume, earthquake, poke, slow motion, rebuild; status becomes illustrative.
- Audio: user-gesture start, mute and unmute.
- Import/export: exact record round trip; reject malformed/tampered data.
- Camera: orbit, zoom, reset.
- Responsive: desktop, 375px, short viewport, desktop-mobile-desktop.
- Error paths: unavailable Lean backend and malformed commands fail visibly.
- Hosted preview: repeat startup, placement, physics, and export through the actual proxy.
