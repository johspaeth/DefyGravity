import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
// A successful old check is not evidence for changed Lean sources.
// Check before replacing dist, so a rejected build preserves the working preview.
let report;
try {
  report = JSON.parse(await readFile(path.join(root, 'evidence/verification.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (report) {
  for (const [name, expected] of Object.entries(report.sources)) {
    const actual = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
    if (actual !== expected) throw new Error(`Verification evidence is stale for ${name}. Run make verify before bundling.`);
  }
}
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await build({
  entryPoints: [path.join(root, 'web/app.js')],
  bundle: true, format: 'esm', target: ['es2022'],
  outdir: dist, minify: true, splitting: true, sourcemap: false,
  chunkNames: 'chunks/[name]-[hash]', logLevel: 'info',
});
for (const name of ['index.html', 'style.css', 'assets']) {
  await cp(path.join(root, 'web', name), path.join(dist, name), { recursive: true });
}
await mkdir(path.join(dist, 'proof'), { recursive: true });
// Display actual frozen theorem statements, not paraphrases disguised as Lean.
const proofSource = await readFile(path.join(root, 'Kapla/Proofs.lean'), 'utf8');
const statements = {};
for (const name of ['landingHeight_clears', 'landingHeight_minimal', 'vertical_path_clear',
  'place_preserves_validity', 'replay_preserves_validity', 'certificate_sound']) {
  const start = proofSource.indexOf(`theorem ${name} `);
  const end = proofSource.indexOf(':= by', start);
  if (start < 0 || end < 0) throw new Error(`Missing theorem statement: ${name}`);
  statements[name] = proofSource.slice(start, end).trim();
}
await writeFile(path.join(dist, 'proof/theorems.json'), JSON.stringify(statements, null, 2));
for (const name of ['SPECIFICATION.md', 'README.md', 'RULES.md', 'CLAUDE.md']) {
  try { await cp(path.join(root, name), path.join(dist, 'proof', name)); } catch {}
}
for (const name of ['verification.json', 'axioms.txt', 'surface.txt', 'lake-check.txt', 'comparator.txt']) {
  try { await cp(path.join(root, 'evidence', name), path.join(dist, 'proof', name)); } catch {}
}
console.log('Workshop built. No credentials or paid APIs required.');
