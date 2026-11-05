# Verification record

Local checks on 2026-11-05, Lean 4.35.0:

- `make check`: passed import/forbidden-word rules, warnings-as-errors implementation build, separate spec elaboration, and all nine gallery checks. The spec modules intentionally contain statement placeholders, as required by this repository; implementation proofs contain none.
- `KAPLA_SMOKE_PORT=8129 scripts/smoke_test.sh`: passed the existing app smoke workflow, including gallery reads and a local stand-in plan without a provider call.
- `python3 scripts/test_diagnostics.py`: passed schema/version, real failure statuses, private sentinel exclusion, route-label sanitization, 205-request overflow, repeated reads, clearing, and external-origin GET/DELETE denial. The test starts and terminates its own server.
- Edge: expanded Diagnostic logs, observed real gallery/planners/status records, clicked Export JSON, and observed `defy-gravity-diagnostics.json` in downloads. No AI request was sent.
- Dependency audit (`#print axioms`): `retain_bounded` and `retain_latest` use propext/Quot.sound; `operation_allowlist` uses propext; `event_schema` reports propext/Classical.choice/Quot.sound. All are in the configured standard allowlist.
- Negative control: replacing retention with identity leaves the goal `events.length ≤ capacity` unsolved. Lean exited nonzero; this would allow an unbounded log and is rejected by the contract.

The `.prooftree/ledger.jsonl` records real declaration checks and an HTTP check performed through the updated VS Code fork's ProofTree CLI. These are content-bound machine results, attributed to an agent, not fabricated human approvals. The config includes definition modules, independent statements, comparator policy and toolchain files as inputs. Changed inputs make evidence stale. The CLI bundle is generated from the fork and is not vendored into this app.

Pending separately: Linux `lake check`, statement comparator, and human review of definitions and call sites. Local compilation does not substitute for comparator or independent review. See the PR's **Kernel check and comparator** job; the repository currently does not include that job in its aggregate CI OK gate, so inspect it explicitly.

To reproduce in the IDE, open this checkout with the ProofTree extension from `suv11235/vscode`'s `feature/lean-in-loop-development-plan` branch. Build once with `lake build kapla`, open the claims view, and rerun named checks from `.prooftree/config.json`. Run one Lean/Lake command at a time in this checkout. The open Linux/review claims keep the parent obligation blocked until real evidence is supplied.
