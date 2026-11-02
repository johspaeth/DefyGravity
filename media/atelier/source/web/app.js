import { createIcons, VolumeX, Volume2, CircleHelp, Download, Blocks, Play, Pause,
  MousePointer2, Plus, Eraser, Undo2, ShieldCheck, ShieldQuestion, ChevronRight,
  Route, ArrowUpRight, RotateCw, Hand, Waves, Timer, RotateCcw, X, SkipBack,
  SkipForward, ListChecks, Move, Mouse, ListVideo, Minus, Scan, Check, Upload,
  ArrowRight, Boxes, Scale } from 'lucide';
import { WorkshopWorld, SCALE } from './world.js';
import { WorkshopAudio } from './audio.js';
import { ProofTour } from './proof-tour.js';

const iconSet = { VolumeX, Volume2, CircleHelp, Download, Blocks, Play, Pause, MousePointer2,
  Plus, Eraser, Undo2, ShieldCheck, ShieldQuestion, ChevronRight, Route, ArrowUpRight,
  RotateCw, Hand, Waves, Timer, RotateCcw, X, SkipBack, SkipForward, ListChecks,
  Move, Mouse, ListVideo, Minus, Scan, Check, Upload, ArrowRight, Boxes, Scale };
const icons = () => createIcons({ icons: iconSet });
const $ = id => document.getElementById(id);
const audio = new WorkshopAudio();
const local = new Set(['localhost', '127.0.0.1', '[::1]']);
const rawBase = window.__API_BASE__ || '';
const unresolved = rawBase.startsWith('__PORT_');
const API = unresolved && local.has(location.hostname) ? location.origin : rawBase.replace(/\/$/, '');
const state = {
  session: null, token: null, record: null, viewRecord: null, revision: 0, canUndo: false,
  connected: false, busy: false, tool: 'view', orientation: 0, preset: 'tower',
  target: { x: -15, z: -3 }, ghost: null, steps: false, step: 0, stepPlaying: false,
  planResult: '', error: null, verification: null,
};
const sizes = [[30, 2, 6], [6, 2, 30], [30, 6, 2], [2, 6, 30], [6, 30, 2], [2, 30, 6]];
const subtitles = { tower: 'Small pieces. Tall possibilities.', bridge: 'A little connection goes a long way.',
  domino: 'The joy is in the chain reaction.', overhang: 'How far is a little too far?', empty: 'Every great build starts with one plank.' };
let world, proofTour, raf, lastFrame = performance.now(), previewTimer, previewRequest = 0;
let stepTimer, stepRequest = 0, toastTimer, pointerDown = null;
const abort = new AbortController();
function on(element, event, fn, options = {}) { element.addEventListener(event, fn, { ...options, signal: abort.signal }); }
function toast(message, error = false) {
  clearTimeout(toastTimer); $('toast').textContent = message;
  $('toast').classList.toggle('error', error); $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 6500 : 3300);
}
function clearToast() { clearTimeout(toastTimer); $('toast').hidden = true; }
async function api(payload, init = false) {
  if (unresolved && !local.has(location.hostname)) throw new Error('The Lean backend was not connected to this preview.');
  const response = await fetch(`${API}/api/${init ? 'session' : 'command'}`, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(!init && { 'X-Session-Token': state.token }) },
    body: JSON.stringify(init ? {} : { ...payload, session: state.session }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    const error = new Error(data.error || 'The command could not be completed.');
    error.status = response.status; throw error;
  }
  state.connected = true; return data;
}
function showError(error) {
  state.error = error.message;
  if (!error.status || error.status === 403 || /unavailable|stopped|timed out/i.test(error.message)) state.connected = false;
  toast(error.message, true); updateUI();
}
function applyState(data, options = {}) {
  state.record = data.record; state.viewRecord = data.record;
  state.revision = data.revision ?? state.revision; state.canUndo = data.canUndo ?? state.canUndo;
  state.error = null; state.ghost = null; state.planResult = '';
  world.setRecord(data.record, options); updateUI();
}
async function edit(payload, { refit = false, preset = null, message = '' } = {}) {
  if (state.busy || !state.connected || proofTour?.active) return;
  clearToast();
  if (world.playing) rebuild();
  if (state.steps) closeSteps();
  state.busy = true; previewRequest++; updateUI();
  try {
    const data = await api(payload);
    if (preset !== null) state.preset = preset;
    else if (payload.cmd === 'place' || payload.cmd === 'remove' || payload.cmd === 'import') state.preset = '';
    applyState(data, { refit });
    audio.knock(payload.cmd === 'remove' ? .45 : .8);
    if (message) toast(message);
  } catch (error) { showError(error); }
  finally {
    state.busy = false; updateUI();
    if (state.tool === 'place') requestPreview();
  }
}
function updateUI() {
  const r = state.viewRecord || state.record;
  if (!r || !world) return;
  $('tour-open').disabled = !state.connected || state.busy || Boolean(proofTour?.active);
  if (proofTour?.active) {
    $('save-btn').disabled = true;
    return;
  }
  const playing = world.playing, available = state.connected && !state.busy;
  document.body.classList.toggle('playing', playing);
  document.body.classList.toggle('sequence', state.steps);
  const placing = state.tool === 'place' && !playing && !state.steps;
  document.body.classList.toggle('placing', placing);
  world.setViewMode(state.steps ? 'sequence' : placing ? 'place' : 'build');
  $('scene-title').textContent = state.record.title;
  $('scene-subtitle').textContent = playing ? 'A small nudge. A beautiful mess.' : subtitles[state.preset] || 'There is no wrong way to wonder.';
  $('block-count').textContent = r.count;
  $('block-unit').textContent = r.count === 1 ? 'plank' : 'planks';
  $('build-height').innerHTML = r.heightMm >= 1000
    ? `${(r.heightMm / 1000).toFixed(2)}<span> m</span>`
    : `${(r.heightMm / 10).toFixed(1)}<span> cm</span>`;
  $('inventory-fill').style.width = `${r.count / r.budget * 100}%`;
  $('inventory-label').textContent = `${r.budget - r.count} left in the box`;
  let certTitle, certCaption;
  if (!state.connected) { certTitle = 'Lean disconnected'; certCaption = 'Editing is paused. Reload to reconnect.'; }
  else if (state.busy) { certTitle = 'Checking your build'; certCaption = 'Waiting for the Lean executable.'; }
  else if (playing) { certTitle = 'Physics playground'; certCaption = 'Illustrative motion, not a proof.'; }
  else if (!r.count) { certTitle = 'A clean slate'; certCaption = 'Your first plank is waiting.'; }
  else if (r.certified) { certTitle = 'Static equilibrium checked'; certCaption = 'Exact vertical loads balance.'; }
  else { certTitle = 'Not certified'; certCaption = 'No equilibrium witness found.'; }
  $('certificate-title').textContent = certTitle; $('certificate-caption').textContent = certCaption;
  $('placement-status').textContent = `${r.count} ${r.count === 1 ? 'plank' : 'planks'} · ${certTitle}`;
  $('certificate-btn').classList.toggle('warning', (!r.certified && !playing) || !state.connected);
  $('certificate-btn').classList.toggle('simulation', playing);
  $('certificate-btn').disabled = false;
  const certIcon = playing ? 'waves' : r.certified ? 'shield-check' : 'shield-question';
  $('certificate-btn').querySelector('.certificate-icon').innerHTML = `<i data-lucide="${certIcon}"></i>`;
  $('build-mode').classList.toggle('active', !playing); $('build-mode').setAttribute('aria-pressed', String(!playing));
  $('play-mode').classList.toggle('active', playing); $('play-mode').setAttribute('aria-pressed', String(playing));
  $('play-mode').disabled = !available || !r.count || state.steps;
  $('gravity-btn').disabled = !available || !r.count || state.steps;
  $('gravity-btn').innerHTML = playing
    ? '<i data-lucide="rotate-ccw"></i><span>Back to building</span><i data-lucide="arrow-up-right"></i>'
    : '<i data-lucide="play"></i><span>Test gravity</span><i data-lucide="arrow-up-right"></i>';
  $('forces-btn').disabled = !available || playing || !r.certified || !r.count;
  $('forces-btn').setAttribute('aria-pressed', String(world.forceVisible));
  $('proof-forces-btn').disabled = $('forces-btn').disabled;
  $('proof-forces-btn').setAttribute('aria-pressed', String(world.forceVisible));
  $('proof-forces-btn').textContent = world.forceVisible ? 'Hide the load paths' : 'Inspect the load paths';
  for (const t of ['view', 'place', 'remove']) {
    $(`tool-${t}`).classList.toggle('active', state.tool === t);
    $(`tool-${t}`).setAttribute('aria-pressed', String(state.tool === t));
    $(`tool-${t}`).disabled = t !== 'view' && (!available || playing || state.steps);
  }
  $('undo-btn').disabled = !available || !state.canUndo || playing || state.steps;
  $('placement-panel').hidden = state.tool !== 'place' || playing || state.steps;
  $('place-btn').disabled = !available || !state.ghost;
  $('steps-btn').disabled = !available || playing || !state.record.count;
  $('steps-panel').hidden = !state.steps;
  $('play-toolbar').hidden = !playing;
  $('pause-btn').innerHTML = `<i data-lucide="${world.paused ? 'play' : 'pause'}"></i><span>${world.paused ? 'Resume' : 'Pause'}</span>`;
  $('pause-btn').setAttribute('aria-label', world.paused ? 'Resume physics' : 'Pause physics');
  $('slow-btn').setAttribute('aria-pressed', String(world.slow));
  $('nudge-btn').disabled = world.paused;
  $('quake-btn').disabled = world.paused;
  $('save-btn').disabled = !available; $('new-btn').disabled = !available;
  $('import-btn').disabled = !available;
  document.querySelectorAll('[data-preset]').forEach(button => {
    button.disabled = !available; button.classList.toggle('active', state.preset === button.dataset.preset);
    button.setAttribute('aria-pressed', String(state.preset === button.dataset.preset));
  });
  document.querySelectorAll('[data-pose]').forEach(button => {
    const selected = Math.floor(state.orientation / 2) * 2 === Number(button.dataset.pose);
    button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected));
  });
  $('engine-status').textContent = state.connected ? 'Made with Lean 4.35.0' : 'Lean disconnected';
  $('engine-dot').style.background = state.connected ? '' : 'var(--color-warning)';
  $('workshop').dataset.tool = playing ? 'view' : state.tool;
  if (state.steps) {
    $('step-range').max = state.record.count; $('step-range').value = state.step;
    $('step-number').textContent = `${state.step} / ${state.record.count}`;
    $('step-prev').disabled = state.step === 0; $('step-next').disabled = state.step === state.record.count;
    $('step-play').innerHTML = `<i data-lucide="${state.stepPlaying ? 'pause' : 'play'}"></i>`;
    $('step-play').setAttribute('aria-label', state.stepPlaying ? 'Pause construction sequence' : 'Play construction sequence');
    const b = r.blocks[r.blocks.length - 1];
    $('step-description').textContent = b
      ? `Plank ${state.step}: ${['flat', 'flat', 'on edge', 'on edge', 'upright', 'upright'][b.orientation]}, at x ${b.x * 4} mm, z ${b.z * 4} mm. Bottom ${b.y * 4} mm. ${r.certified ? 'This prefix balances.' : 'This prefix is not certified.'}`
      : 'An empty table. Start with the first plank.';
    $('plan-result').textContent = state.planResult;
  }
  icons();
}
function setTool(tool) {
  if (proofTour?.active || world.playing || state.steps || (!state.connected && tool !== 'view')) return;
  state.tool = tool; world.setHover(-1);
  if (tool !== 'place') { previewRequest++; world.setGhost(null); state.ghost = null; }
  else requestPreview();
  updateUI();
}
function pointTarget(event) {
  const point = world.point(event.clientX, event.clientY);
  if (!point) return false;
  const size = sizes[state.orientation];
  state.target = { x: Math.round(point.x / SCALE - size[0] / 2), z: Math.round(point.z / SCALE - size[2] / 2) };
  return true;
}
function requestPreview(delay = 0) {
  clearTimeout(previewTimer);
  if (proofTour?.active || state.tool !== 'place' || world.playing || state.steps || state.busy || !state.connected) return;
  const generation = ++previewRequest;
  previewTimer = setTimeout(async () => {
    try {
      const data = await api({ cmd: 'preview', ...state.target, orientation: state.orientation });
      if (generation !== previewRequest || state.tool !== 'place' || world.playing || state.busy || state.steps) return;
      state.ghost = data.preview; world.setGhost(data.preview);
      $('placement-coordinates').textContent = `x ${data.preview.x * 4} · z ${data.preview.z * 4} · bottom ${data.preview.y * 4} mm`;
      $('place-btn').disabled = false;
    } catch (error) {
      if (generation !== previewRequest) return;
      state.ghost = null; world.setGhost(null); $('place-btn').disabled = true;
      $('placement-coordinates').textContent = error.message;
      if (!error.status || error.status === 403 || /unavailable|stopped|timed out/i.test(error.message)) showError(error);
    }
  }, delay);
}
function rotate() { state.orientation ^= 1; requestPreview(); updateUI(); audio.knock(.2); }
function pose(value) { state.orientation = value + state.orientation % 2; requestPreview(); updateUI(); }
async function place() {
  if (state.tool !== 'place' || state.busy || world.playing || state.steps) return;
  await edit({ cmd: 'place', ...state.target, orientation: state.orientation });
}
async function play() {
  if (state.busy || !state.record?.count || !state.connected || world.playing) return;
  if (state.steps) closeSteps();
  state.busy = true; previewRequest++; world.setGhost(null); updateUI();
  try {
    await world.startPhysics();
    toast('Click a plank to nudge it.');
  } catch (error) { showError(new Error('Physics could not start. Your checked build is unchanged. ' + error.message)); }
  finally { state.busy = false; updateUI(); }
}
function rebuild() {
  clearToast();
  world.stopPhysics();
  state.viewRecord = state.record; world.setRecord(state.record, { preserveView: true });
  world.manual = false; state.tool = 'view'; updateUI();
}
function pausePhysics() { if (!world.playing) return; world.paused = !world.paused; updateUI(); }
function stopSteps() {
  state.stepPlaying = false; clearTimeout(stepTimer); stepRequest++;
}
async function showStep(count) {
  const generation = ++stepRequest;
  const desired = Math.max(0, Math.min(state.record.count, count));
  try {
    const data = await api({ cmd: 'prefix', count: desired });
    if (!state.steps || generation !== stepRequest) return;
    state.step = desired; state.viewRecord = data.record;
    world.setRecord(data.record, { preserveView: true }); updateUI(); audio.knock(.3);
  } catch (error) { stopSteps(); showError(error); }
}
function openSteps() {
  if (world.playing || state.busy || !state.record?.count) return;
  state.steps = true; state.tool = 'view'; state.step = state.record.count;
  world.setGhost(null); state.ghost = null; updateUI();
}
function closeSteps() {
  stopSteps(); stepRequest++; state.steps = false; state.viewRecord = state.record;
  world.setRecord(state.record, { preserveView: true }); updateUI();
}
async function toggleStepPlayback() {
  if (state.stepPlaying) { stopSteps(); updateUI(); return; }
  state.stepPlaying = true;
  if (state.step >= state.record.count) await showStep(0);
  updateUI();
  const next = async () => {
    if (!state.stepPlaying || !state.steps) return;
    await showStep(state.step + 1);
    if (state.step >= state.record.count) { stopSteps(); updateUI(); return; }
    if (state.stepPlaying) stepTimer = setTimeout(next, 650);
  };
  stepTimer = setTimeout(next, 550);
}
async function checkPlan() {
  if (state.busy) return;
  const canonical = state.record, revision = state.revision;
  $('check-plan-btn').disabled = true; $('plan-result').textContent = 'Checking every released prefix in Lean…';
  try {
    const { record } = await api({ cmd: 'checkPlan' });
    if (canonical !== state.record || revision !== state.revision) return;
    state.planResult = record.allPrefixesCertified
      ? `All ${record.count} released steps have accepted equilibrium certificates.`
      : `Step ${record.prefixCheckedTo} has no accepted equilibrium witness. This is not a proof that no witness exists.`;
    $('plan-result').textContent = state.planResult;
  } catch (error) { showError(error); }
  finally { $('check-plan-btn').disabled = false; }
}
function openDialog(id) {
  if ($(id).open) return;
  if (id === 'proof-dialog') {
    const r = state.viewRecord || state.record;
    const status = $('proof-scene-status');
    status.classList.toggle('warning', !state.connected || !r?.certified || world.playing);
    status.textContent = !state.connected
      ? 'Lean is disconnected. The view is the last received record, not a newly checked build. Reload to reconnect before editing.'
      : world.playing
      ? 'You are in the physics playground. Moving poses carry no static certificate. Rebuild restores the canonical Lean record.'
      : r?.certified
        ? `This ${r.count}-plank scene has an accepted certificate with ${r.certificate.contacts.length} contact forces. ${r.insertionPathChecked ? 'Its recorded straight-down insertion order also replays exactly.' : 'Its recorded insertion order does not replay; removals may have left gaps.'}`
        : `${r?.reason || 'No checked scene is connected yet.'} An absent certificate is not a stability verdict.`;
  }
  $(id).showModal();
}
function updateSoundButton() {
  $('sound-btn').innerHTML = `<i data-lucide="${audio.enabled ? 'volume-2' : 'volume-x'}"></i>`;
  $('sound-btn').setAttribute('aria-pressed', String(audio.enabled));
  $('sound-btn').setAttribute('aria-label', audio.enabled ? 'Mute sound' : 'Turn sound on');
  $('sound-btn').title = audio.enabled ? 'Mute sound' : 'Turn sound on'; icons();
}
async function save() {
  if (state.busy || !state.connected) return;
  const button = $('save-btn'); button.disabled = true;
  try {
    const data = await api({ cmd: 'export' });
    const bytes = JSON.stringify(data.record, null, 2);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `kapla-${data.record.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast(world.playing ? 'Original build exported, not the moving playground.' : 'Build exported with its exact record and certificate status.');
  } catch (error) { showError(error); }
  finally { button.disabled = !state.connected; }
}
async function importFile(file) {
  if (!file) return;
  if (file.size > 1_000_000) { toast('Please choose a construction JSON file under 1 MB.', true); return; }
  try {
    const record = JSON.parse(await file.text());
    await edit({ cmd: 'import', record }, { refit: true, message: 'Build imported and rechecked in Lean.' });
  } catch (error) { toast('That file could not be opened: ' + error.message, true); }
  finally { $('import-file').value = ''; }
}
function wireCanvasControls() {
  on($('workshop'), 'pointerdown', event => { pointerDown = { x: event.clientX, y: event.clientY, button: event.button }; });
  on($('workshop'), 'pointermove', event => {
    if (proofTour?.active || state.busy || event.buttons || world.playing || state.steps) return;
    if (state.tool === 'place' && pointTarget(event)) requestPreview(60);
    else if (state.tool === 'remove') world.setHover(world.pick(event.clientX, event.clientY)?.instanceId ?? -1);
  });
  on($('workshop'), 'pointerleave', () => { if (!proofTour?.active) world.setHover(-1); });
  on($('workshop'), 'pointerup', event => {
    if (proofTour?.active || !pointerDown || pointerDown.button !== 0 || state.busy) return;
    const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    pointerDown = null;
    if (distance > 6 || state.steps) return;
    if (world.playing) {
      if (!world.paused) world.nudge(world.pick(event.clientX, event.clientY)?.instanceId ?? null);
    } else if (state.tool === 'place' && pointTarget(event)) place();
    else if (state.tool === 'remove') {
      const hit = world.pick(event.clientX, event.clientY);
      if (hit) edit({ cmd: 'remove', id: state.record.blocks[hit.instanceId].id });
      else toast('Pick a plank to remove it.');
    }
  });
}
function wireControls() {
  const openTour = () => {
    if (state.busy || !state.connected || proofTour.active) return;
    $('proof-dialog').close();
    if (world.playing) rebuild();
    if (state.steps) closeSteps();
    state.tool = 'view'; previewRequest++; clearTimeout(previewTimer); clearToast();
    state.ghost = null; world.setGhost(null);
    proofTour.open(state.record); updateUI();
  };
  on($('tour-open'), 'click', openTour);
  on($('tour-from-proof'), 'click', openTour);
  on(document, 'pointerdown', () => audio.unlock(), { once: true });
  on(document, 'keydown', () => audio.unlock(), { once: true });
  on($('sound-btn'), 'click', () => { audio.toggle(); updateSoundButton(); });
  on($('help-btn'), 'click', () => openDialog('help-dialog'));
  on($('certificate-btn'), 'click', () => openDialog('proof-dialog'));
  on($('placement-status'), 'click', () => openDialog('proof-dialog'));
  on($('proof-footer'), 'click', () => openDialog('proof-dialog'));
  document.querySelectorAll('[data-close]').forEach(button => on(button, 'click', () => $(button.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(dialog => on(dialog, 'click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  }));
  on($('save-btn'), 'click', save);
  on($('import-btn'), 'click', () => $('import-file').click());
  on($('import-file'), 'change', event => importFile(event.target.files[0]));
  for (const tool of ['view', 'place', 'remove']) on($(`tool-${tool}`), 'click', () => setTool(tool));
  on($('undo-btn'), 'click', () => edit({ cmd: 'undo' }, { message: 'Back one step.' }));
  on($('rotate-btn'), 'click', rotate); on($('place-btn'), 'click', place);
  document.querySelectorAll('[data-pose]').forEach(button => on(button, 'click', () => pose(Number(button.dataset.pose))));
  document.querySelectorAll('[data-preset]').forEach(button => on(button, 'click', () => {
    state.tool = 'view';
    edit({ cmd: 'preset', name: button.dataset.preset }, { refit: true, preset: button.dataset.preset });
  }));
  on($('new-btn'), 'click', async () => {
    await edit({ cmd: 'preset', name: 'empty' }, { refit: true, preset: 'empty', message: 'A fresh table. Your previous build is one Undo away.' });
    setTool('place');
  });
  on($('play-mode'), 'click', play);
  on($('gravity-btn'), 'click', () => world.playing ? rebuild() : play());
  on($('build-mode'), 'click', () => { if (world.playing) rebuild(); });
  on($('rebuild-btn'), 'click', rebuild);
  on($('pause-btn'), 'click', pausePhysics);
  on($('nudge-btn'), 'click', () => world.nudge());
  on($('quake-btn'), 'click', () => { world.earthquake(); toast('Hold on to your planks.'); });
  on($('slow-btn'), 'click', () => { world.slow = !world.slow; updateUI(); });
  on($('forces-btn'), 'click', () => { world.toggleForces(); updateUI(); });
  on($('proof-forces-btn'), 'click', () => {
    world.toggleForces(); $('proof-dialog').close(); updateUI();
  });
  on($('zoom-in-btn'), 'click', () => world.zoom(1.2));
  on($('zoom-out-btn'), 'click', () => world.zoom(1 / 1.2));
  on($('reset-camera-btn'), 'click', () => world.fit(true, state.viewRecord?.blocks));
  on($('steps-btn'), 'click', () => state.steps ? closeSteps() : openSteps());
  on($('steps-close'), 'click', closeSteps);
  on($('step-prev'), 'click', () => { stopSteps(); showStep(state.step - 1); });
  on($('step-next'), 'click', () => { stopSteps(); showStep(state.step + 1); });
  on($('step-range'), 'input', event => { stopSteps(); showStep(Number(event.target.value)); });
  on($('step-play'), 'click', toggleStepPlayback);
  on($('check-plan-btn'), 'click', checkPlan);
  on($('retry-btn'), 'click', () => location.reload());
  wireCanvasControls();
  world.onCanvasReplaced = wireCanvasControls;
  on(window, 'keydown', event => {
    if (proofTour.active && event.key === 'Escape') {
      event.preventDefault(); proofTour.close(); return;
    }
    if (document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (proofTour.active) {
      if (key === 'escape') { event.preventDefault(); proofTour.close(); }
      else if (key === 'c') proofTour.fit();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault(); if (!world.playing && state.canUndo) edit({ cmd: 'undo' }); return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (key === 'c') { world.fit(true, state.viewRecord?.blocks); return; }
    if (key === ' ' && world.playing) { event.preventDefault(); pausePhysics(); return; }
    if (world.playing || state.steps) return;
    if (key === 'b') setTool('place'); else if (key === 'v' || key === 'escape') setTool('view');
    else if (key === 'x') setTool('remove');
    if (state.tool !== 'place') return;
    if (key === 'r') rotate();
    else if (key === 't') pose((Math.floor(state.orientation / 2) * 2 + 2) % 6);
    else if (key === 'enter') { event.preventDefault(); place(); }
    else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
      event.preventDefault();
      const step = event.shiftKey ? 6 : 2;
      if (key === 'arrowleft') state.target.x -= step;
      if (key === 'arrowright') state.target.x += step;
      if (key === 'arrowup') state.target.z -= step;
      if (key === 'arrowdown') state.target.z += step;
      requestPreview();
    }
  });
}
function miniatures() {
  // Decorative blueprint sketches, not an alternate placement implementation.
  for (const element of document.querySelectorAll('[data-mini]')) {
    const type = element.dataset.mini, boxes = [];
    if (type === 'tower') {
      for (let i = 0; i < 24; i++) for (const side of [0, 4.8])
        boxes.push(i % 2 ? [side, i * .4, 0, 1.2, .4, 6] : [0, i * .4, side, 6, .4, 1.2]);
    } else if (type === 'bridge') {
      for (let y = 0; y < 8; y++) for (const x of [0, 7.2]) boxes.push([x, y * .4, 0, 1.2, .4, 6]);
      for (let z = 0; z < 5; z++) boxes.push([0, 3.2, z * 1.2, 8.4, .4, 1.2]);
    } else if (type === 'domino') {
      for (let z = 0; z < 7; z++) boxes.push([0, 0, z * 2, 1.2, 6, .4]);
    } else boxes.push([0, 0, 0, 6, .4, 1.2], [5.4, .4, 0, 6, .4, 1.2]);
    const p = ([x, y, z]) => [(x - z) * .866, (x + z) * .5 - y];
    const faces = [];
    for (const [x, y, z, w, h, d] of boxes) {
      const a = [x,y+h,z], b = [x+w,y+h,z], c = [x+w,y+h,z+d], e = [x,y+h,z+d];
      faces.push({ points: [b, [x+w,y,z], [x+w,y,z+d], c].map(p), fill: '#c6a273' });
      faces.push({ points: [e, c, [x+w,y,z+d], [x,y,z+d]].map(p), fill: '#dfbd8d' });
      faces.push({ points: [a,b,c,e].map(p), fill: '#f3dbb5' });
    }
    const points = faces.flatMap(f => f.points);
    const xmin = Math.min(...points.map(p => p[0])), xmax = Math.max(...points.map(p => p[0]));
    const ymin = Math.min(...points.map(p => p[1])), ymax = Math.max(...points.map(p => p[1]));
    element.innerHTML = `<svg viewBox="${xmin-1} ${ymin-1} ${xmax-xmin+2} ${ymax-ymin+2}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${faces.map(f => `<polygon points="${f.points.map(p => p.join(',')).join(' ')}" fill="${f.fill}" stroke="#b99769" stroke-width=".035" stroke-linejoin="round"/>`).join('')}</svg>`;
  }
}
async function verification() {
  try {
    const response = await fetch('./proof/verification.json');
    if (!response.ok) throw new Error('No build evidence is available.');
    const report = await response.json(); state.verification = report;
    $('verification-status').textContent = `Toolchain: ${report.toolchain}. Kernel replay: ${report.lakeCheck}. Comparator: ${report.comparator}. ${report.theoremCount} main theorems. Accepted axioms: propext, Classical.choice, Quot.sound.`;
  } catch {
    $('verification-status').textContent = 'Build evidence is unavailable in this preview. No kernel-replay or Comparator success is claimed here.';
  }
}
function animate(now) {
  const rawDt = (now - lastFrame) / 1000, dt = Math.min(rawDt, 1); lastFrame = now;
  world.tick(dt); audio.tick(dt);
  if (world.dirty) world.draw();
  const stats = world.updateStats(rawDt);
  if (stats) { $('debug-hud').textContent = stats; $('tour-hud').textContent = stats; }
  raf = requestAnimationFrame(animate);
}
async function boot() {
  icons(); miniatures(); updateSoundButton();
  try {
    world = new WorkshopWorld($('workshop'), intensity => audio.knock(intensity));
    proofTour = new ProofTour(world, API, updateUI, () => state.verification);
    wireControls();
    raf = requestAnimationFrame(animate);
    const data = await api({}, true);
    state.session = data.session; state.token = data.token;
    applyState(data, { refit: true }); $('loading').hidden = true;
    verification();
  } catch (error) {
    state.connected = false; state.error = error.message;
    $('loading-message').textContent = error.message.includes('WebGL')
      ? 'Your browser needs WebGL 2 with hardware acceleration to open this workshop.'
      : `The workshop could not connect: ${error.message}`;
    $('retry-btn').hidden = false; $('loading').querySelector('.loading-line').hidden = true;
    if (!world) on($('retry-btn'), 'click', () => location.reload());
  }
}

window.render_game_to_text = () => JSON.stringify({
  mode: world?.playing ? 'physics' : state.steps ? 'instructions' : 'build',
  connected: state.connected, busy: state.busy, tool: state.tool,
  revision: state.revision, title: state.record?.title, preset: state.preset,
  count: state.viewRecord?.count ?? 0, heightMm: state.viewRecord?.heightMm ?? 0,
  budget: state.record?.budget, canUndo: state.canUndo,
  certificate: world?.playing ? null : state.viewRecord?.certified ?? null,
  canonicalCertificate: state.record?.certified ?? null,
  certificateScope: 'Ideal static vertical-force equilibrium only. Physics is unverified.',
  coordinates: 'Canonical lower-left poses on a 4 mm grid: x right, y up, z toward the front. Display positions use 0.12 scene units per grid unit.',
  orientation: state.orientation, target: state.target, ghost: state.ghost,
  step: state.step, stepPlaying: state.stepPlaying, planResult: state.planResult,
  forcesVisible: world?.forceVisible ?? false, soundEnabled: audio.enabled,
  audioContextState: audio.context?.state ?? 'not-started',
  error: state.error, blocks: state.viewRecord?.blocks || [],
  ...world?.state(),
  proofTour: proofTour?.state() || null,
  ...(proofTour?.active ? {
    mode: 'proof-tour', busy: proofTour.busy, certificate: null, tool: 'view',
    count: proofTour.record?.count || 0, blocks: proofTour.record?.blocks || [],
    ghost: proofTour.ghost || null, title: 'Proof tour',
  } : {}),
});
window.advanceTime = async ms => {
  if (!world) return;
  world.manual = true;
  const steps = Math.max(1, Math.ceil(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) { world.tick(ms / steps / 1000, true); audio.tick(ms / steps / 1000); }
  world.draw();
  await Promise.resolve();
};
window.simulateInput = (key, pressed = true) => window.dispatchEvent(
  new KeyboardEvent(pressed ? 'keydown' : 'keyup', { key, bubbles: true }));
on(window, 'pagehide', () => {
  cancelAnimationFrame(raf); clearTimeout(stepTimer); clearTimeout(previewTimer); clearTimeout(toastTimer);
  world?.dispose(); audio.dispose(); abort.abort();
}, { once: true });
boot();
