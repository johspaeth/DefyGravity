import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { hashes } = JSON.parse(await readFile(new URL('../trusted/freeze-manifest.json', import.meta.url)));
for (const name of ['module-packaging.json', 'reference-manifest.json']) {
  try {
    const packaging = JSON.parse(await readFile(new URL('../trusted/' + name, import.meta.url)));
    Object.assign(hashes, packaging.hashes);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
for (const [name, expected] of Object.entries(hashes)) {
  const bytes = await readFile(new URL('../' + name, import.meta.url));
  if (createHash('sha256').update(bytes).digest('hex') !== expected) {
    throw new Error(`Frozen proof surface changed: ${name}. Review the change; do not silently update the baseline.`);
  }
}
console.log('Frozen proof surface: byte-for-byte match.');
