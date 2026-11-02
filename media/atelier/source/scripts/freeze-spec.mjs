import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'trusted', 'Challenge.lean');
try {
  await access(target);
  throw new Error('The challenge is already frozen. Never regenerate it just to make Comparator pass.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const files = ['Kapla/Model.lean', 'Kapla/Spec.lean', 'Kapla/Core.lean', 'Kapla/Proofs.lean'];
let text = '/- Generated once by scripts/freeze-spec.mjs. Author-proposed reference, not independent organizer approval. -/\nimport Lean\n\n';
const hashes = {};
for (const name of files) {
  const bytes = await readFile(path.join(root, name), 'utf8');
  hashes[name] = createHash('sha256').update(bytes).digest('hex');
  text += `/- Frozen from ${name}. -/\n` + bytes.replace(/^import .*\n/gm, '').replace(/^#print axioms .*\n/gm, '') + '\n';
}
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, text);
hashes['trusted/Challenge.lean'] = createHash('sha256').update(text).digest('hex');
await writeFile(path.join(root, 'trusted', 'freeze-manifest.json'),
  JSON.stringify({ frozenAt: new Date().toISOString(), status: 'author-proposed; human review pending', hashes }, null, 2) + '\n');
console.log('Frozen the exact specification, implementation definitions, and theorem types.');
