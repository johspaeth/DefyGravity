import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const processLean = spawn(fileURLToPath(new URL('.lake/build/bin/kapla', root)), [], { stdio: ['pipe', 'pipe', 'inherit'] });
const pending = [];
let tests = 0;
createInterface({ input: processLean.stdout }).on('line', line => {
  const resolve = pending.shift(); assert.ok(resolve, 'No unsolicited engine output');
  resolve(JSON.parse(line));
});
function command(cmd, values = {}, session = 'test') {
  return new Promise(resolve => { pending.push(resolve); processLean.stdin.write(JSON.stringify({ cmd, ...values, session }) + '\n'); });
}
function pass(name) { tests++; console.log(`PASS ${name}`); }
function geometry(record) {
  const bs = record.blocks;
  assert.ok(bs.length <= record.budget);
  assert.equal(new Set(bs.map(b => b.id)).size, bs.length);
  for (let i = 0; i < bs.length; i++) for (let j = 0; j < i; j++) {
    const a = bs[i], b = bs[j];
    assert.ok(a.x+a.size[0] <= b.x || b.x+b.size[0] <= a.x ||
      a.y+a.size[1] <= b.y || b.y+b.size[1] <= a.y ||
      a.z+a.size[2] <= b.z || b.z+b.size[2] <= a.z, 'No intersecting interiors');
  }
}
// Independent BigInt differential oracle, used only by tests, never the UI.
function equilibrium(record) {
  assert.ok(record.certified);
  geometry(record);
  const scale = BigInt(record.certificate.scale); assert.ok(scale > 0n);
  const byId = new Map(record.blocks.map(b => [b.id, b]));
  const sums = new Map(record.blocks.map(b => [b.id, [0n,0n,0n]]));
  const inFace = (b, c) => 2*b.x <= c.x2 && c.x2 <= 2*(b.x+b.size[0]) &&
    2*b.z <= c.z2 && c.z2 <= 2*(b.z+b.size[2]);
  for (const c of record.certificate.contacts) {
    const f = BigInt(c.force), upper = byId.get(c.upper);
    assert.ok(f >= 0n && upper && inFace(upper, c));
    if (c.lower === null) assert.equal(upper.y, 0);
    else {
      const lower = byId.get(c.lower);
      assert.ok(lower && lower.id !== upper.id && inFace(lower,c));
      assert.equal(lower.y+lower.size[1], upper.y);
      assert.ok(lower.x < upper.x+upper.size[0] && upper.x < lower.x+lower.size[0] &&
        lower.z < upper.z+upper.size[2] && upper.z < lower.z+lower.size[2]);
      const down = sums.get(c.lower); down[0] -= f; down[1] -= f*BigInt(c.x2); down[2] -= f*BigInt(c.z2);
    }
    const up = sums.get(c.upper); up[0] += f; up[1] += f*BigInt(c.x2); up[2] += f*BigInt(c.z2);
  }
  for (const b of record.blocks) assert.deepEqual(sums.get(b.id),
    [scale, scale*BigInt(2*b.x+b.size[0]), scale*BigInt(2*b.z+b.size[2])]);
}
try {
  let response = await command('init');
  assert.equal(response.record.count, 72); equilibrium(response.record);
  pass('default tower, exact force and moment differential check');
  const initial = structuredClone(response.record);
  for (const [name, count, certified] of [['tower',72,true],['bridge',27,true],['domino',24,true],['overhang',2,false],['empty',0,true]]) {
    response = await command('preset', { name });
    assert.ok(response.ok); assert.equal(response.record.count,count); assert.equal(response.record.certified,certified);
    geometry(response.record); if (certified) equilibrium(response.record);
    const exported = await command('export');
    const imported = await command('import', { record: exported.record });
    assert.ok(imported.ok, imported.error);
    assert.deepEqual(imported.record.blocks, exported.record.blocks);
    pass(`${name} preset, expected certification, export/import`);
  }
  await command('preset', { name: 'empty' });
  for (let orientation = 0; orientation < 6; orientation++) {
    const x = orientation*40-120, z = -20;
    const preview = await command('preview', { x,z,orientation });
    response = await command('place', { x,z,orientation });
    assert.ok(response.ok); assert.deepEqual(response.record.blocks.at(-1), preview.preview);
    equilibrium(response.record);
  }
  pass('all six orientations, preview exactly equals accepted placement');
  const before = structuredClone(response.record.blocks);
  for (const bad of [{x:301,z:0,orientation:0},{x:0,z:0,orientation:6},{x:1.5,z:0,orientation:0},{x:0,z:0,orientation:-1}]) {
    assert.equal((await command('place',bad)).ok,false);
  }
  assert.deepEqual((await command('state')).record.blocks,before);
  pass('invalid coordinates and orientations rejected without mutations');
  response = await command('place',{x:-120,z:-20,orientation:0});
  assert.ok(response.ok);
  assert.equal(response.record.blocks.at(-1).y,2);
  await command('remove',{id:0});
  const floating = await command('export');
  assert.equal(floating.record.certified,false);
  assert.equal(floating.record.insertionPathChecked,false);
  assert.ok((await command('import',{record:floating.record})).ok, 'Uncertified but honest saved scene round-trips');
  const falsePath = structuredClone(floating.record); falsePath.insertionPathChecked = true;
  assert.equal((await command('import',{record:falsePath})).ok,false);
  pass('remove support, invalidate certificate, preserve honest snapshot round-trip, reject false path claim');
  await command('preset',{name:'empty'});
  await command('budget',{budget:1});
  await command('place',{x:0,z:0,orientation:0});
  assert.equal((await command('place',{x:100,z:100,orientation:0})).ok,false);
  assert.equal((await command('preset',{name:'tower'})).ok,false);
  assert.equal((await command('state')).record.count,1);
  pass('inventory enforced on placement and presets, with no silent empty fallback');
  await command('undo');
  assert.equal((await command('state')).record.count,0);
  pass('undo restores canonical scene');
  await command('budget',{budget:200});
  const imported = await command('import',{record:initial});
  assert.ok(imported.ok); equilibrium(imported.record);
  for (const corrupt of [
    c => c.contacts[0].force = '-1',
    c => c.scale = '0',
    c => c.contacts[0].upper = 999999,
    c => c.contacts[0].x2 = 99999,
    c => c.contacts[0].force = (BigInt(c.contacts[0].force)+1n).toString(),
    c => c.contacts.splice(0,1),
  ]) {
    const certificate = structuredClone(initial.certificate); corrupt(certificate);
    const result = await command('verify',{certificate});
    assert.ok(!result.ok || result.accepted === false);
    const tampered = structuredClone(initial); tampered.certificate = certificate;
    assert.equal((await command('import',{record:tampered})).ok,false);
  }
  pass('negative, zero-scale, dangling, out-of-face, altered and missing force certificates rejected');
  for (const corrupt of [
    r => r.blocks[1].id = r.blocks[0].id,
    r => Object.assign(r.blocks[1],{x:r.blocks[0].x,y:r.blocks[0].y,z:r.blocks[0].z,orientation:r.blocks[0].orientation}),
    r => r.budget = 1,
    r => r.gridMm = 5,
    r => r.model = 'different',
  ]) {
    const record = structuredClone(initial); corrupt(record);
    assert.equal((await command('import',{record})).ok,false);
  }
  pass('import rejects duplicate IDs, overlap, insufficient inventory and model mismatch');
  for (const name of ['tower','bridge','domino']) {
    await command('preset',{name});
    const plan = await command('checkPlan');
    assert.ok(plan.record.allPrefixesCertified, `${name}: prefix ${plan.record.prefixCheckedTo}`);
    for (const count of [0,1,Math.floor(plan.record.count/2),plan.record.count]) {
      const step = await command('prefix',{count});
      assert.equal(step.record.count,count); equilibrium(step.record);
    }
    pass(`${name}: every released prefix certified and sampled instructions checked`);
  }
  await command('init',{},'other');
  await command('preset',{name:'empty'});
  assert.equal((await command('state',{},'other')).record.count,72);
  pass('independent in-memory sessions');
  let seed = 20261031;
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed / 2**32; };
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(random()*240)-120, z = Math.floor(random()*240)-120, orientation = Math.floor(random()*6);
    response = await command('place',{x,z,orientation});
    assert.ok(response.ok,response.error);
    assert.equal(response.record.count,i+1); geometry(response.record);
    if (response.record.certified) equilibrium(response.record);
  }
  pass('120 seeded legal additions; runtime geometry and accepted certificates differentially checked');
  const saved = (await command('state')).record;
  assert.equal((await command('unknownOperation')).ok,false);
  assert.deepEqual((await command('state')).record,saved);
  pass('unknown operation fails closed without state change');
  console.log(`ALL TESTS PASSED (${tests} scenario groups)`);
} finally {
  processLean.stdin.end(); processLean.kill();
}
