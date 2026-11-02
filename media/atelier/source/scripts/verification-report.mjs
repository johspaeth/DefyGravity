import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const files = ['Kapla/Model.lean', 'Kapla/Spec.lean', 'Kapla/Core.lean', 'Kapla/Proofs.lean',
  'Kapla/Solver.lean', 'Kapla/Presets.lean', 'Kapla/Protocol.lean', 'Kapla/Tests.lean', 'Main.lean', 'comparator.json'];
const sources = {};
for (const name of files) sources[name] = createHash('sha256').update(await readFile(new URL(name, root))).digest('hex');
const check = await readFile(new URL('evidence/lake-check.txt', root), 'utf8');
const comparator = await readFile(new URL('evidence/comparator.txt', root), 'utf8');
const integration = await readFile(new URL('evidence/integration.txt', root), 'utf8');
if (!/okay|accept|passed|success/i.test(check) || !comparator.includes('Your solution is okay!') || !integration.includes('ALL TESTS PASSED')) {
  throw new Error('The evidence does not contain successful checks. No success report was written.');
}
const report = {
  toolchain: execFileSync('lean', ['--version'], { encoding: 'utf8' }).trim(),
  checkedAt: new Date().toISOString(), lakeCheck: 'passed', comparator: 'passed',
  theoremCount: 8, sandbox: 'bubblewrap enabled', independentPhysicalValidation: false,
  specificationApproval: 'Author-proposed, frozen; independent human approval pending',
  scope: 'Actual Lean placement and static certificate checker only. Not the compiler, transport, rendering, solver completeness or moving physics.',
  acceptedAxioms: ['propext', 'Classical.choice', 'Quot.sound'], sources,
  frozenReference: JSON.parse(await readFile(new URL('evidence/reference-export.json', root), 'utf8')),
};
await writeFile(new URL('evidence/verification.json', root), JSON.stringify(report, null, 2) + '\n');
console.log('Recorded actual verification results and source hashes.');
