#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p evidence
node scripts/check-freeze.mjs
lake build 2>&1 | tee evidence/build.txt
lake env lean Kapla/Proofs.lean 2>&1 | tee evidence/axioms.txt
lake env lean Kapla/Audit.lean 2>&1 | tee evidence/surface.txt
node tests/integration.mjs 2>&1 | tee evidence/integration.txt
# Never bypass the sandbox and never substitute an ordinary build for these checks.
lake check 2>&1 | tee evidence/lake-check.txt
node scripts/export-reference.mjs 2>&1 | tee evidence/reference-build.txt
lake comparator --config comparator.json --challenge-from-export .lake/frozen-reference.ndjson 2>&1 | tee evidence/comparator.txt
node scripts/verification-report.mjs
echo "All required checks passed. Evidence is in evidence/."
