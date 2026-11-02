import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import './check-freeze.mjs';

const root = new URL('../', import.meta.url);
const cwd = fileURLToPath(new URL('trusted/reference/', root));
const config = JSON.parse(readFileSync(new URL('comparator.json', root), 'utf8'));
if (config.definition_names.length !== 0) throw new Error('The frozen reference has no definition holes.');
// Never consume a possibly stale reference object file.
execFileSync('lake', ['clean'], { cwd, stdio: 'inherit' });
execFileSync('lake', ['build'], { cwd, stdio: 'inherit' });
mkdirSync(new URL('.lake/', root), { recursive: true });
const output = new URL('.lake/frozen-reference.ndjson', root);
const fd = openSync(output, 'w');
// These are exactly Lean 4.35.0 Lake/CLI/Check.lean's builtinTargets and
// primitiveTargets. The same bundled exporter handles every declaration.
const builtins = ['Quot', 'Quot.mk', 'Quot.lift', 'Quot.ind'];
const primitives = ['Nat.add', 'Nat.sub', 'Nat.mul', 'Nat.pow', 'Nat.gcd',
  'Nat.div', 'Nat.mod', 'Nat.beq', 'Nat.ble', 'Nat.land', 'Nat.lor', 'Nat.xor',
  'Nat.shiftLeft', 'Nat.shiftRight', 'String.ofList', 'Char.ofNat', 'List',
  'eagerReduce', 'Nat', 'String', 'String.mk', 'Char', 'optParam', 'autoParam',
  'semiOutParam', 'outParam'];
try {
  execFileSync('lake', ['env', 'leanexport', 'Kapla.Proofs', '--',
    ...builtins, ...config.theorem_names, ...config.permitted_axioms, ...primitives],
    { cwd, stdio: ['ignore', fd, 'inherit'] });
} finally { closeSync(fd); }
const hash = createHash('sha256').update(readFileSync(output)).digest('hex');
writeFileSync(new URL('evidence/reference-export.json', root), JSON.stringify({
  compiledAt: new Date().toISOString(),
  file: '.lake/frozen-reference.ndjson',
  sha256: hash,
  reference: 'trusted/reference/Kapla/Proofs.lean',
  toolchain: execFileSync('lean', ['--version'], { encoding: 'utf8' }).trim(),
  sourceHashes: JSON.parse(readFileSync(new URL('trusted/reference-manifest.json', root), 'utf8')).hashes,
}, null, 2) + '\n');
console.log(`Exported freshly compiled frozen reference: sha256 ${hash}`);
