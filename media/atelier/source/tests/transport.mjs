import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const launchDirectory = process.argv[2];
const port = launchDirectory ? 8001 : 8000;
const base = process.env.TEST_URL || `http://127.0.0.1:${port}`;
let server;
if (launchDirectory) {
  server = spawn('make', ['run'], {
    cwd: launchDirectory, detached: true,
    env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.pipe(process.stderr);
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('make run did not start in 20 seconds')),20000);
    server.stdout.on('data',data=>{
      process.stdout.write(data);
      if(data.toString().includes('Kapla Atelier:')) { clearTimeout(timer); resolve(); }
    });
    server.once('exit',code=>{clearTimeout(timer);reject(new Error(`make run exited ${code}`));});
  });
}
async function post(path, data, headers={}) {
  const response=await fetch(base+path,{
    method:'POST',headers:{'Content-Type':'application/json',...headers},
    body:typeof data==='string'?data:JSON.stringify(data),
  });
  return {status:response.status,data:await response.json()};
}
try {
  assert.equal((await fetch(base+'/api/health')).status,200);
  const a=await post('/api/session',{}, {'X-Visitor-Id':'qa-alice'});
  const b=await post('/api/session',{}, {'X-Visitor-Id':'qa-bob'});
  assert.equal(a.status,200);assert.equal(b.status,200);
  assert.equal(a.data.record.count,72);assert.equal(a.data.record.certified,true);
  assert.notEqual(a.data.session,b.data.session);assert.notEqual(a.data.token,b.data.token);
  const command={session:a.data.session,cmd:'preset',name:'empty'};
  assert.equal((await post('/api/command',command,{'X-Visitor-Id':'qa-alice'})).status,403);
  assert.equal((await post('/api/command',command,{'X-Visitor-Id':'qa-alice','X-Session-Token':b.data.token})).status,403);
  assert.equal((await post('/api/command',command,{'X-Visitor-Id':'qa-bob','X-Session-Token':a.data.token})).status,403);
  const auth={'X-Visitor-Id':'qa-alice','X-Session-Token':a.data.token};
  const empty=await post('/api/command',command,auth);
  assert.equal(empty.status,200);assert.equal(empty.data.record.count,0);
  const untouched=await post('/api/command',{session:b.data.session,cmd:'state'},
    {'X-Visitor-Id':'qa-bob','X-Session-Token':b.data.token});
  assert.equal(untouched.data.record.count,72);
  for(const cmd of ['init','close'])assert.equal((await post('/api/command',{session:a.data.session,cmd},auth)).status,400);
  const unknown=await post('/api/command',{session:a.data.session,cmd:'unrecognized-action'},auth);
  assert.equal(unknown.status,422);assert.equal(unknown.data.ok,false);
  assert.equal((await post('/api/command','{broken',auth)).status,422);
  assert.equal((await post('/api/command',JSON.stringify({padding:'x'.repeat(1_000_001)}),auth)).status,422);
  assert.equal((await fetch(base+'/not-a-real-file')).status,404);
  assert.equal((await fetch(base+'/api/command',{method:'DELETE'})).status,405);
  assert.match(await (await fetch(base+'/')).text(),/Kapla Atelier/);
  console.log('HTTP TESTS PASSED: startup, default scene, token and visitor isolation, reserved commands, malformed/oversized requests, methods and static files.');
} finally {
  if(server) {
    const exited=once(server,'exit');
    process.kill(-server.pid,'SIGTERM');
    await exited;
  }
}
