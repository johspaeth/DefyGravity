# Defy Gravity: Vibecheck Recap

Defy Gravity, called KaplaBuilder in the repository, became a working local application connecting natural-language design, AI-generated plank plans, Lean-backed checking, resemblance scoring, and a 3D construction viewer ([repository](https://github.com/johspaeth/DefyGravity)). Its defining architecture is simple: AI proposes; the checker evaluates the proposal against explicit rules, and the interface presents the result without making the AI the authority on correctness ([application integration](https://github.com/johspaeth/DefyGravity/pull/44)).

Prepared November 2, 2026. This recap covers the team repository, not the separate Kapla Atelier implementation, and distinguishes merged functionality from experiments.

## What the team built

- **A conversational design interface:** A user describes something such as an egg or bunny, then refines a labeled 3D “bubble model” made from ellipsoids through chat; a person approves the target rather than treating the language model’s interpretation as formally correct ([semantics documentation](https://github.com/johspaeth/DefyGravity/blob/main/semantics/README.md)).
- **An AI construction planner:** Given a target and plank budget, the AI strategy proposes three designs, can repair failed candidates using checker feedback, and selects the best passing candidate by likeness score; the application independently reruns physics and scoring rather than trusting a planner-supplied badge ([merged application and planner integration](https://github.com/johspaeth/DefyGravity/pull/44)).
- **A usable construction interface:** The local website connects saved models, chat, proposal generation, a 3D plank view, a step slider, scores, and acceptance indicators; subsequent changes distinguish robust from nominal results and display hard-to-reach warnings ([website PR](https://github.com/johspaeth/DefyGravity/pull/44), [warning and assurance fixes](https://github.com/johspaeth/DefyGravity/pull/65)).
- **A runnable toolchain:** The repository supplies commands for serving the app, checking blueprint files, generating plans, exporting views, and checking gallery entries; gallery viewing and a deliberately simple stand-in tower planner work without an AI API key ([usage and quick start](https://github.com/johspaeth/DefyGravity)).

The result was more than a collection of theorem files, but less than a general-purpose construction-safety product. My assessment is that the strongest achievement was connecting a consumer-facing creative workflow to a separately specified acceptance mechanism.

## What the verification actually establishes

- **Construction properties:** The checker evaluates the plank budget, modeled geometry, and stability after intermediate placements, not merely the final silhouette; the full checking path also applies modeled placement-error and clearance rules ([guarantees and assumptions](https://github.com/johspaeth/DefyGravity)).
- **Robust versus nominal assurance:** The robust path uses a default horizontal placement-error bound of 3.9 mm along each axis, measured from each plank’s planned position; a non-quarter-turn plank instead sends the entire plan through nominal-only checking, without placement-error, gap, tight-slot, or reach checks, and `--robust-only` can refuse that weaker result ([repository limitations](https://github.com/johspaeth/DefyGravity), [explicit assurance policy](https://github.com/johspaeth/DefyGravity/pull/46)).
- **Target fit and score:** The semantics component documents six theorems covering target/block cell enumeration, the two geometric acceptance checks, and score bounds; “within” and “covers” require only a shared unit cube per block and per sufficiently large bubble, so acceptance is not a proof that the result looks convincingly like the requested object ([semantics definitions and theorems](https://github.com/johspaeth/DefyGravity/blob/main/semantics/README.md)).
- **A deliberate trust boundary:** Geometry uses exact rational arithmetic, while the AI and search procedures remain untrusted proposal generators; the compiler, unproved file readers, browser rendering, and physical-model assumptions remain outside the theorem guarantee ([trusted components](https://github.com/johspaeth/DefyGravity)).

This does not establish unrestricted real-world safety: accumulating placement drift, unequal support heights, pressing down during placement, and guaranteed hand access remain outside or weaker than the headline model-level claim ([documented limits](https://github.com/johspaeth/DefyGravity)). Nor does a refusal prove that a physical build must collapse, since the checker has conservative rejection cases and no general completeness result ([review fixes and completeness limitation](https://github.com/johspaeth/DefyGravity/pull/46), [conservative floor example](https://github.com/johspaeth/DefyGravity/pull/65)).

## The concrete demo

The merged demo package contains a 60-second video, a GIF, and a write-up for the existing 40-plank Brandenburg Gate gallery plan ([demo asset PR](https://github.com/johspaeth/DefyGravity/pull/66)). Its recorded `kapla check` result at revision `63835a9` accepts all 40 steps as well-formed and standing at the planned positions, but explicitly excludes placement-error, gap, and reach checks because the plan contains turned planks ([demo evidence](https://github.com/johspaeth/DefyGravity/blob/main/demo/brandenburg/README.md)).

The important distinction is between the checked plan and its presentation: the animation replays that plan; it is not a live proof run ([demo write-up](https://github.com/johspaeth/DefyGravity/blob/main/demo/brandenburg/README.md)). That makes it a concrete demonstration of the workflow, not evidence of physical testing or of a robust placement-error guarantee.

## Your contribution and the review-to-fix loop

- **Independent assurance review:** The review posted through `solvlabs` independently reproduced the existing edge/corner-clearance concern, added a checker/viewer rotation counterexample, and demonstrated that adding a remote turned plank could weaken the whole plan’s assurance; it also reported successful local kernel replay, physics Comparator execution, and regression tests on a pinned revision ([independent review on PR42](https://github.com/johspaeth/DefyGravity/pull/42)).
- **Changes that landed:** The follow-up implementation narrowed the clearance exemption to positive-area face contacts, aligned viewer rotations with the checker’s rational rotations, added regression tests, and introduced an explicit assurance field and robust-only policy; these fixes are merged, so the original counterexamples should not be described as unchanged defects in final main ([merged PR46](https://github.com/johspaeth/DefyGravity/pull/46)).
- **Exploratory design lab:** Your draft PR contains 21 hand-authored or generated designs, per-step results, and blueprints, including the 200-plank duck standing on one leg in a tree; it remained a draft experiment rather than a merged product feature, and its suggested rule changes were proposals only ([draft construction lab](https://github.com/johspaeth/DefyGravity/pull/26)).
- **Demo packaging:** Your `solvlabs` PR added the Brandenburg video, GIF, and evidence write-up without changing application code, and the team merged it ([merged demo PR](https://github.com/johspaeth/DefyGravity/pull/66)).

My read is that your most consequential contribution was testing whether the user-facing claim matched what the checker actually established. The review did not invalidate Lean proof terms; it exposed specification and integration boundaries that the team could then repair or label honestly ([review findings](https://github.com/johspaeth/DefyGravity/pull/42), [implemented responses](https://github.com/johspaeth/DefyGravity/pull/46)).

## Where the build ended

At the inspected main revision, `fdb157d82d7e234a278995affdc2a4f7528a21fb`, CI completed successfully, including component builds, fresh-install/application smoke testing, and the kernel-check/Comparator job ([main CI run](https://github.com/johspaeth/DefyGravity/actions/runs/41368448989)). However, kernel replay and Comparator were no longer required by the aggregate merge gate, so passing that revision is distinct from enforcing proof checks on every future merge ([current CI policy](https://github.com/johspaeth/DefyGravity)).

This recap is a repository, PR, documentation, and recorded-CI review, not a new local Lean run or browser test. It makes no claim about judging results, awards, or how the presentation was received.

## Bottom line

Defy Gravity demonstrated a useful pattern: put an expressive, fallible generator in front of a narrow, explicit, independently checked acceptance mechanism. The honest accomplishment is a working AI-assisted construction application with model-bounded formal assurance, not a proof that arbitrary AI-generated objects are safe in the physical world.
