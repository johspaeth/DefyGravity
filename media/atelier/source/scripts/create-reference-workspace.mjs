// One-time, byte-preserving packaging of the original frozen sources.
import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import './check-freeze.mjs';
const root = new URL('../', import.meta.url);
const manifest = new URL('trusted/reference-manifest.json', root);
try {
  await access(manifest);
  throw new Error('The reference workspace already exists. Never reset a baseline to make a proof pass.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const original = JSON.parse(await readFile(new URL('trusted/freeze-manifest.json', root)));
const files = ['Kapla/Model.lean', 'Kapla/Spec.lean', 'Kapla/Core.lean', 'Kapla/Proofs.lean', 'lean-toolchain'];
const hashes = {};
await mkdir(new URL('trusted/reference/Kapla/', root), { recursive: true });
for (const name of files) {
  const bytes = await readFile(new URL(name, root));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (original.hashes[name] && hash !== original.hashes[name]) throw new Error(`Frozen bytes changed: ${name}`);
  const target = 'trusted/reference/' + name;
  await copyFile(new URL(name, root), new URL(target, root));
  hashes[target] = hash;
}
const config = 'trusted/reference/lakefile.toml';
hashes[config] = createHash('sha256').update(await readFile(new URL(config, root))).digest('hex');
await writeFile(manifest, JSON.stringify({
  packagedAt: new Date().toISOString(),
  originalFreezeUnchanged: true,
  transformation: 'Byte-identical source copies. Original module boundaries AND names are retained in an independent Lake workspace.',
  hashes,
}, null, 2) + '\n');
console.log('Created byte-identical, independently compiled frozen reference workspace.');
