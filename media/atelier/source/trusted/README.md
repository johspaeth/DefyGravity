# Frozen reference

The active reference is the independent Lake workspace in `reference/`. Its four Lean source files are byte-identical to the original frozen `Kapla/Model.lean`, `Spec.lean`, `Core.lean`, and `Proofs.lean`, with exactly the same module names and boundaries.

Run `make verify` from the application root. It checks all frozen hashes, replays the application through `lake check`, freshly rebuilds and exports the reference with this toolchain's `leanexport`, then runs sandboxed Comparator against the live solution and the reference export.

The exact Comparator invocation is:

```sh
lake comparator --config comparator.json \
  --challenge-from-export .lake/frozen-reference.ndjson
```

`scripts/export-reference.mjs` creates that export only after checking hashes and cleaning the reference's compiled cache. Its export hash and source hashes are recorded in `evidence/reference-export.json`.

## Fail-closed configuration

`FrozenReference` in `comparator.json` is an intentionally unavailable module name. Forgetting `--challenge-from-export` must fail, not silently compare the live module with itself. The theorem names, permitted axioms, and empty definition-hole list are unchanged.

## Packaging history

- **Original freeze:** `freeze-manifest.json` and the initial concatenated `Challenge.lean` remain unchanged. Concatenation let Lean reuse `Kapla.Spec.forceSum.match_1` instead of `Kapla.accumulate.match_1`, and Comparator correctly rejected it.
- **Renamed-module attempt:** `Challenge/` and `module-packaging.json` preserve the second attempt. Separate files preserved public helper names but renamed a private splitter from `_private.Kapla.Spec...` to `_private.Challenge.Spec...`, which Comparator also correctly rejected.
- **Active packaging:** `reference/` preserves both source bytes and module identities in a separate workspace. This fixes packaging without altering any definition, theorem statement, hypothesis, proof, or permitted axiom.

The two failed comparison logs are retained in `evidence/`. This is an author-proposed reference with independent human specification review still pending, not an organizer-supplied or independently approved challenge.
