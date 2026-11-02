// Packaging repair only: source hashes and the initial freeze are immutable.
// Concatenating modules lets Lean reuse a match helper from a different module.
// Preserve the original boundaries instead; only import paths are renamed.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import './check-freeze.mjs';

const root = new URL('../', import.meta.url);
const manifest = new URL('trusted/module-packaging.json', root);
try {
  await access(manifest);
  throw new Error('The module package already exists. Do not silently regenerate it.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const original = JSON.parse(await readFile(new URL('trusted/freeze-manifest.json', root)));
const files = ['Kapla/Model.lean', 'Kapla/Spec.lean', 'Kapla/Core.lean', 'Kapla/Proofs.lean'];
const hashes = {};
await mkdir(new URL('trusted/Challenge/', root), { recursive: true });
for (const name of files) {
  const text = await readFile(new URL(name, root), 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== original.hashes[name]) {
    throw new Error(`Original frozen bytes changed: ${name}`);
  }
  const target = 'trusted/' + name.replace('Kapla/', 'Challenge/');
  const packaged = text.replace(/^import Kapla\./gm, 'import Challenge.');
  await writeFile(new URL(target, root), packaged);
  hashes[target] = createHash('sha256').update(packaged).digest('hex');
}
await writeFile(manifest, JSON.stringify({
  packagedAt: new Date().toISOString(),
  originalFreezeUnchanged: true,
  reason: 'Preserve module boundaries and generated match-helper names. No definition, proposition, hypothesis, theorem, proof, or permitted axiom was changed.',
  transformation: 'Only import Kapla.* is changed to import Challenge.* in byte-verified frozen files.',
  hashes,
}, null, 2) + '\n');
console.log('Packaged unchanged frozen sources as separate reference modules.');
