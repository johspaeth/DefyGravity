# Implementation and verification plan

1. Translate troubleshooting intent into `spec.md`; distinguish formal contracts from integration and browser acceptance.
2. Define a closed `Operation` and numeric-only `Event` in `KaplaWeb.DiagnosticsModel`. Specify matching theorem statements independently in `KaplaSpecs.Diagnostics`; implement proofs in `KaplaWeb.Diagnostics`. Register the comparator to catch statement mismatch. Definitions are shared and require review.
3. Route actual JSON replies through one logging function. Compute timing from the monotonic clock and status from the reply, append atomically to an IO reference, and invoke the proven retention function with capacity 200. Route classification discards supplied path segments. Diagnostics operations bypass logging and remain behind the existing host/origin guard.
4. Add an accessible disclosure panel using existing site styles. Render with textContent; fetch a fresh snapshot on export; create a local JSON download; show fixed actionable network failures.
5. Build the changed modules, run `make check`, exercise HTTP scenarios, inspect in a browser, and audit Lean dependencies. Run a deliberately broken retention variant as a negative control. Push a feature branch and use PR Linux CI for kernel replay and comparator. Do not merge before that verification and human review.
6. Feed observed gaps into the VS Code extension: configurable dependency policy, nonzero-exit rejection, declaration-specific output matching, and evidence invalidation when policy changes. Keep formal, integration, browser and pending Linux evidence distinct in the feature ledger.

No changes to physics, planner behavior, model semantics, provider calls or the pinned toolchain are needed. API requests already rejected by the host/origin check are excluded so untrusted callers cannot fill or clear the journal. A server restart drops the in-memory buffer. No automatic polling is used.
