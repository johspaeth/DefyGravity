import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scratch=await mkdtemp(path.join(tmpdir(),'kapla-stale-evidence-'));
try {
  const report=JSON.parse(await readFile(path.join(root,'evidence/verification.json'),'utf8'));
  for(const name of ['scripts/build.mjs','evidence/verification.json',...Object.keys(report.sources)]){
    await mkdir(path.dirname(path.join(scratch,name)),{recursive:true});
    await cp(path.join(root,name),path.join(scratch,name));
  }
  await symlink(path.join(root,'node_modules'),path.join(scratch,'node_modules'),'dir');
  await mkdir(path.join(scratch,'dist'));
  await writeFile(path.join(scratch,'dist/keep.txt'),'Existing preview');
  const fixture=path.join(scratch,'Kapla/Core.lean');
  await writeFile(fixture,(await readFile(fixture,'utf8'))+'\n-- Test-only mutation outside the source checkout.\n');
  assert.throws(()=>execFileSync(process.execPath,['scripts/build.mjs'],{
    cwd:scratch,encoding:'utf8',stdio:'pipe',
  }),error=>error.status!==0&&error.stderr.includes('Verification evidence is stale for Kapla/Core.lean'));
  assert.equal(await readFile(path.join(scratch,'dist/keep.txt'),'utf8'),'Existing preview');
  console.log('PASS Changed Lean source is refused before replacing the working bundle; the frozen checkout was not modified.');
} finally {
  await rm(scratch,{recursive:true,force:true});
}
