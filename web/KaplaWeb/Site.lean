import KaplaWeb.Page

/-! # The website page

The page that `kapla serve` sends: the gallery, a save box, a PR button, a chat, the rules for the next plan, and a proposal next to the 3D view. It
reuses the viewer of `Page.lean` and shows a model with `KaplaViewer.show`. The requests it makes are
listed in `web/README.md`.
-/

namespace KaplaWeb

/-- Style for the parts the viewer page does not have. -/
def siteCss : String := "
header,main{max-width:none}
#site{display:grid;grid-template-columns:220px 320px minmax(0,1fr);gap:16px;padding:0 16px 16px}
@media (max-width:1000px){#site{grid-template-columns:minmax(0,1fr)}}
#chat{display:flex;flex-direction:column;height:min(60vh,520px);min-width:0}
#log{flex:1;overflow-y:auto;border:1px solid var(--line);border-radius:10px;background:var(--card);padding:8px;margin-bottom:8px}
.msg{margin:0 0 8px;padding:6px 10px;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere}
.msg.user{background:var(--bg);margin-left:24px}
.msg.note{color:var(--muted);font-style:italic}
.msg.bad{color:var(--bad);font-weight:600}
#chatForm{display:flex;gap:6px}
#chatText{font:inherit;flex:1;min-width:0;resize:vertical;border:1px solid var(--line);border-radius:8px;padding:4px 8px;background:var(--card);color:var(--fg)}
#models.busy button{opacity:.5;cursor:default}
#planBar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}
#planBar select,#planBar input{font:inherit;border:1px solid var(--line);border-radius:8px;padding:4px 8px;background:var(--card);color:var(--fg)}
#planBlocks{width:5em}
#generate{border-color:var(--accent);font-weight:600}
#effort{margin-left:auto}
button:disabled{opacity:.5;cursor:default}
#planStatus{color:var(--muted);flex-basis:100%}#planStatus:empty{display:none}#planStatus.bad{color:var(--bad);font-weight:600}
#scores{margin:4px 0}#physicsNotes,#tooSmall{margin:6px 0;padding-left:1.2em;color:var(--muted)}
#tooSmall button{margin-left:8px;font-size:.85rem;padding:1px 8px}
#site main{padding:0;margin:0;min-width:0}
#site h2{font-size:1rem;margin:0 0 6px}
#models{list-style:none;margin:0 0 16px;padding:0}
#models button{width:100%;text-align:left;margin:0 0 4px;overflow-wrap:anywhere}
#models button.open{border-color:var(--accent);font-weight:600}
#saveForm{display:flex;gap:6px}
#prButton{margin-top:8px;width:100%}
#saveName{font:inherit;flex:1;min-width:0;border:1px solid var(--line);border-radius:8px;padding:4px 8px;background:var(--card);color:var(--fg)}
#status{margin:8px 0;color:var(--muted);overflow-wrap:anywhere}
#status.bad{color:var(--bad);font-weight:600}
#ask{margin:8px 0}#ask div{display:flex;gap:6px;margin-top:6px}
#rulesPanel{margin:0 0 10px;border:1px solid var(--line);border-radius:10px;padding:6px 10px;background:var(--card)}
#rulesPanel summary{cursor:pointer;font-weight:600}
.ruleRow{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.ruleRow select,.ruleRow input:not([type=checkbox]){font:inherit;border:1px solid var(--line);border-radius:8px;padding:4px 8px;background:var(--bg);color:var(--fg)}
#ruleNum,#ruleNum2{width:6em}#ruleWords{flex:1;min-width:12em}
#ruleList{margin:6px 0;padding-left:1.2em}#ruleList button{margin-left:8px;font-size:.85rem;padding:1px 8px}
#rulesPanel .hint{color:var(--muted);margin:4px 0}
#ruleStatus{color:var(--muted)}#ruleStatus.bad{color:var(--bad);font-weight:600}
"

/-- What the gallery, the save box and the PR button do. -/
def siteJs : String := "
(() => {
  const get = id => document.getElementById(id);
  const list = get('models'), form = get('saveForm'), nameBox = get('saveName'), saveButton = get('saveButton'), prButton = get('prButton');
  const statusLine = get('status'), ask = get('ask'), askText = get('askText');
  const generate = get('generate'), plannerBox = get('planner'), blocksBox = get('planBlocks'), planStatus = get('planStatus');
  // How much Claude thinks, for the planners that ask Claude. One button: each click takes the next level.
  const effortButton = get('effort'), efforts = ['low', 'medium', 'high'];
  let effort = 'high', claudePlanners = [];
  const showEffort = () => { effortButton.textContent = `Reasoning: ${effort}`;
    effortButton.disabled = busy || !claudePlanners.includes(plannerBox.value); };
  effortButton.onclick = () => { effort = efforts[(efforts.indexOf(effort) + 1) % efforts.length]; showEffort(); };
  plannerBox.onchange = () => showEffort();
  const proposal = get('proposal'), badges = get('badges'), scores = get('scores'), physicsNotes = get('physicsNotes'), tooSmall = get('tooSmall');
  // The proposal on screen always belongs to the model on screen, so a new model clears it.
  // lastSaved is the proposal's plan as the server gave it: saving sends it back.
  const clearProposal = () => { proposalHeight = undefined; lastSaved = null; proposal.hidden = true; planStatus.textContent = ''; planStatus.className = ''; KaplaViewer.clearPlan(); };
  let current = null, openName = null, opening = 0, pending = null, busy = false, proposalHeight, lastSaved = null;
  const say = (text, bad) => { statusLine.textContent = text; statusLine.className = bad ? 'bad' : ''; };
  const noServer = 'Cannot reach the server. Is kapla serve still running?';
  const hideAsk = () => { ask.hidden = true; pending = null; };
  // Send a request. The answer is always JSON from the server.
  const send = async (path, options) => { const r = await fetch(path, options);
    let body = {}; try { body = await r.json(); } catch (_) {}
    return {status: r.status, ok: r.ok, body}; };
  const setOpen = (name, model) => { openName = name; current = model; saveButton.disabled = !model; generate.disabled = busy || !model;
    prButton.disabled = busy || !name;
    list.querySelectorAll('button').forEach(b => b.classList.toggle('open', b.textContent === name)); };
  const loadList = async () => { const r = await send('/gallery');
    if (!r.ok) throw new Error(r.body.error || 'the gallery did not load');
    list.textContent = '';
    if (!r.body.entries.length) { const li = document.createElement('li'); li.textContent = 'The gallery is empty.'; list.append(li); }
    r.body.entries.forEach(name => { const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.textContent = name; b.onclick = () => openModel(name); li.append(b); list.append(li); });
    setOpen(openName, current); };
  const openModel = async name => { if (busy) return; const mine = ++opening; hideAsk(); say('');
    try { const r = await send('/gallery/' + encodeURIComponent(name));
      if (mine !== opening) return;
      if (!r.ok) { clearProposal(); setOpen(null, null); KaplaViewer.showError(`${name}: ${r.body.error || 'it did not load'}`); return; }
      // With no plan there is no height: the model stays at height 1, with axes from 0 to 1.
      // The server ran physics and the scorer on a saved plan again, so the badges are fresh.
      clearProposal(); const model = r.body.model;
      if (!KaplaViewer.show(model)) { setOpen(null, null); return; }
      setOpen(name, model); if (r.body.proposal) { loadRules(r.body.proposal.rules); showProposal(model, r.body.proposal); }
    } catch (_) { if (mine === opening) say(noServer, true); } };
  const save = async (name, overwrite, model, saved) => { hideAsk(); say('Saving...');
    try { const r = await send('/gallery', {method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({name, overwrite, model, proposal: saved})});
      if (r.status === 409) { pending = {name: r.body.name, model, saved}; say('');
        askText.textContent = `A model named \"${r.body.name}\" already exists. Replace it?`; ask.hidden = false; return; }
      if (!r.ok) { say(r.body.error || 'Not saved.', true); return; }
      // With a plan on screen the picture stays as it is; the model's name is the only change.
      opening++; nameBox.value = ''; if (!saved) KaplaViewer.show(r.body.model); setOpen(r.body.name, r.body.model);
      await loadList();
      say(`Saved ${saved ? 'the model and its blocks' : 'the model'} in gallery/${r.body.name}.json. Open a PR to share it.`);
    } catch (_) { say(noServer, true); } };
  form.onsubmit = e => { e.preventDefault(); if (current) save(nameBox.value, false, current, lastSaved); };
  nameBox.oninput = hideAsk;
  get('askYes').onclick = () => { if (pending) { const p = pending; save(p.name, true, p.model, p.saved); } };
  // The PR adds the saved file gallery/NAME.json, not what is on screen now.
  prButton.onclick = async () => { const name = openName; if (busy || !name) return;
    hideAsk(); say(`Opening a PR for gallery/${name}.json...`); prButton.disabled = true;
    try { const r = await send('/gallery/' + encodeURIComponent(name) + '/pr', {method:'POST'});
      if (!r.ok) { say(r.body.error || 'The PR was not opened.', true); return; }
      say('PR opened: '); const a = document.createElement('a'); a.href = r.body.url; a.textContent = r.body.url;
      a.target = '_blank'; a.rel = 'noopener'; statusLine.append(a);
    } catch (_) { say(noServer, true); }
    finally { prButton.disabled = busy || !openName; } };
  get('askNo').onclick = () => { hideAsk(); say('Not saved.'); };
  loadList().catch(() => say(noServer, true));
  // ---------- the chat ----------
  // The conversation lives only here: it is gone when the page closes. A failed message is left out,
  // so that Claude sees only what worked.
  const log = get('log'), chatForm = get('chatForm'), chatText = get('chatText'), chatSend = get('chatSend');
  const messages = [];
  const addMsg = (text, kind) => { const d = document.createElement('div'); d.className = 'msg ' + kind; d.textContent = text;
    log.append(d); log.scrollTop = log.scrollHeight; return d; };
  const setBusy = on => { busy = on; chatSend.disabled = on; generate.disabled = on || !current; prButton.disabled = on || !openName; list.classList.toggle('busy', on); showEffort(); };
  const sendChat = async () => { const text = chatText.value.trim(); if (!text || busy) return;
    chatText.value = ''; addMsg(text, 'user'); const waiting = addMsg('Claude is working...', 'note'); setBusy(true);
    try { const r = await send('/chat', {method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({text, messages, model: current})});
      waiting.remove();
      if (!r.ok) { addMsg(r.body.error || 'Something went wrong.', 'bad'); chatText.value = text; return; }
      messages.push({role:'user', text}, {role:'assistant', text:r.body.reply});
      addMsg(r.body.reply, 'claude');
      if (r.body.model) { opening++; hideAsk(); say(''); clearProposal();
        // A new model has not been saved: nothing in the list is open now.
        if (KaplaViewer.show(r.body.model)) setOpen(null, r.body.model);
        else if (current) KaplaViewer.show(current); }
    } catch (_) { waiting.remove(); addMsg(noServer, 'bad'); chatText.value = text; }
    finally { setBusy(false); chatText.focus(); } };
  chatForm.onsubmit = e => { e.preventDefault(); sendChat(); };
  // Enter sends; Shift and Enter makes a new line.
  chatText.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } };
  // ---------- the rules ----------
  // The rules the next proposal is made and checked with. The server reads them again, and Lean
  // writes each extra rule in words: the list shows what is checked, not what was typed.
  const tolBox = get('ruleTol'), handsBox = get('ruleHands'), clearBox = get('ruleClear'), turnBox = get('ruleTurned');
  const ruleList = get('ruleList'), ruleKind = get('ruleKind'), ruleNum = get('ruleNum'), ruleNum2 = get('ruleNum2');
  const ruleUp = get('ruleUp'), ruleStatus = get('ruleStatus'), ruleWords = get('ruleWords'), rulesSummary = get('rulesSummary');
  let extraRules = [], extraLines = [];
  const rulesNow = () => ({tolerance: tolBox.value, hands: +handsBox.value, clearance: clearBox.checked, turned: turnBox.checked, extra: extraRules});
  const ruleSay = (text, bad) => { ruleStatus.textContent = text; ruleStatus.className = bad ? 'bad' : ''; };
  // Block units from centimetres, exactly: 1 cm = 50/39 units.
  const unitsOfCm = text => { const cm = Number(text); return cm > 0 && isFinite(cm) ? `${Math.round(cm * 100) * 50}/3900` : null; };
  // A tolerance such as '1/2' in millimetres (1 unit = 7.8 mm).
  const mmOf = t => { const [a, b] = String(t).split('/'); return `${+((+a) / (b ? +b : 1) * 7.8).toFixed(1)} mm`; };
  const showRules = () => { ruleList.textContent = '';
    extraLines.forEach((line, i) => { const li = item(ruleList, line), b = document.createElement('button');
      b.type = 'button'; b.textContent = 'Remove'; b.onclick = () => setExtra(extraRules.filter((_, j) => j !== i)); li.append(b); });
    const custom = tolBox.value !== '1/2' || handsBox.value !== '1' || !clearBox.checked || !turnBox.checked || extraRules.length > 0;
    rulesSummary.textContent = !custom ? 'Rules for this plan: the defaults'
      : `Rules for this plan: placement error ${mmOf(tolBox.value)}, ${extraRules.length} rule${extraRules.length === 1 ? '' : 's'} of your own`; };
  // Ask the server to read the rules; it gives each extra rule back in words.
  const setExtra = async (extra, note) => {
    try { const r = await send('/rules/describe', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({rules: {...rulesNow(), extra}})});
      if (!r.ok) { ruleSay(r.body.error || 'These rules cannot be used.', true); return false; }
      extraRules = r.body.rules.extra; extraLines = r.body.extra; showRules(); ruleSay(note || ''); return true;
    } catch (_) { ruleSay(noServer, true); return false; } };
  const showKind = () => { const k = ruleKind.value;
    ruleNum.hidden = k === 'noUpright'; ruleNum2.hidden = k !== 'fitsIn'; ruleUp.hidden = k === 'maxHeight' || k === 'fitsIn';
    ruleNum.placeholder = k === 'maxUpright' ? 'how many' : k === 'fitsIn' ? 'x in cm' : 'cm'; };
  ruleKind.onchange = showKind; showKind();
  get('ruleAdd').onclick = () => { const k = ruleKind.value; let rule;
    if (k === 'maxHeight') { const height = unitsOfCm(ruleNum.value); if (!height) return ruleSay('Give a height in cm, above 0.', true); rule = {rule: k, height}; }
    else if (k === 'fitsIn') { const x = unitsOfCm(ruleNum.value), y = unitsOfCm(ruleNum2.value); if (!x || !y) return ruleSay('Give both sizes in cm, above 0.', true); rule = {rule: k, x, y}; }
    else if (k === 'noUpright') rule = {rule: k, up: ruleUp.value};
    else { const n = Number(ruleNum.value); if (ruleNum.value.trim() === '' || !Number.isInteger(n) || n < 0) return ruleSay('Give a whole number of blocks.', true); rule = {rule: k, up: ruleUp.value, count: n}; }
    setExtra([...extraRules, rule], 'Added. The list shows the rule as Lean reads it.'); };
  [tolBox, handsBox, clearBox, turnBox].forEach(b => b.onchange = showRules);
  get('ruleSuggest').onclick = async () => { const text = ruleWords.value.trim(); if (!text) return;
    ruleSay('Asking Claude to turn this into rules...');
    try { const r = await send('/rules/suggest', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text})});
      if (!r.ok) return ruleSay(r.body.error || 'No rules.', true);
      const not = r.body.notCheckable.length ? ` Not checked, because no rule can say it: ${r.body.notCheckable.join('; ')}.` : '';
      if (!r.body.extra.length) return ruleSay('Claude found no rule that can be checked.' + not, true);
      if (await setExtra([...extraRules, ...r.body.extra], `Added ${r.body.extra.length}. Read them in the list, and remove any you did not mean.${not}`)) ruleWords.value = '';
    } catch (_) { ruleSay(noServer, true); } };
  // A plan from the gallery keeps the rules it was made with: show those.
  const loadRules = rules => { if (!rules) return;
    if (![...tolBox.options].some(o => o.value === rules.tolerance)) { const o = document.createElement('option'); o.value = rules.tolerance; o.textContent = mmOf(rules.tolerance); tolBox.append(o); }
    tolBox.value = rules.tolerance; handsBox.value = String(rules.hands); clearBox.checked = rules.clearance; turnBox.checked = rules.turned;
    extraRules = []; extraLines = []; showRules(); if (rules.extra.length) setExtra(rules.extra); };
  // ---------- the proposal ----------
  const badge = (text, kind) => { const b = document.createElement('span'); b.className = 'badge ' + kind; b.textContent = text; return b; };
  const item = (parent, text) => { const li = document.createElement('li'); li.textContent = text; parent.append(li); return li; };
  const removeBubble = label => { if (busy || !current) return;
    const smaller = {...current, bubbles: current.bubbles.filter(b => b.label !== label)};
    try { KaplaViewer.checkModel(smaller); if (!smaller.bubbles.length) throw new Error('no bubble would be left'); }
    catch (e) { say(`${label} cannot be removed: ${e.message}`, true); return; }
    // The model is not rescaled after this.
    clearProposal(); KaplaViewer.show(smaller); setOpen(null, smaller);
    say(`Removed ${label}. Generate a new proposal, and save the model to keep this change.`); };
  const showProposal = (model, p) => { const score = p.score; lastSaved = p.saved;
    proposalHeight = KaplaViewer.readNumber(score.height);
    KaplaViewer.showPlan(model, proposalHeight, p.view);
    badges.textContent = '';
    const tol = p.rules ? p.rules.tolerance : '1/2', mine = p.rules ? p.rules.extra.length : 0;
    badges.append(!p.stands ? badge('Does not pass the checks', 'bad') : p.assurance === 'robust' ? badge(tol === '0' ? 'Stands as planned (no placement error allowed)' : `Stands, even ${mmOf(tol)} off`, tol === '0' ? 'warn' : 'ok') : badge('Stands as planned (not checked for errors)', 'warn'));
    if (p.stands && mine) badges.append(badge(`Keeps your ${mine} rule${mine === 1 ? '' : 's'}`, 'ok'));
    if (p.hardToReach) badges.append(badge('May be hard to reach', 'warn'));
    badges.append(badge(score.accepted ? 'Accepted' : 'Not accepted', score.accepted ? 'ok' : 'bad'));
    scores.textContent = `Score ${score.scoreRounded} (${score.verdict}). Height ${(+proposalHeight.toFixed(2))} blocks, ${score.blockCount} blocks used. Target cells with no block: ${score.missing}. Block cells outside the target: ${score.extra}.`;
    physicsNotes.textContent = ''; p.physics.forEach(line => item(physicsNotes, line));
    if (score.outside.length) item(physicsNotes, `Not accepted: blocks outside the target: ${score.outside.length}.`);
    if (score.uncovered.length) item(physicsNotes, `Not accepted: no block in ${score.uncovered.join(', ')}.`);
    tooSmall.textContent = '';
    score.tooSmall.forEach(label => { const li = item(tooSmall, `${label} is too small to build at this height.`), b = document.createElement('button');
      b.type = 'button'; b.textContent = 'Remove'; b.onclick = () => removeBubble(label); li.append(b); });
    proposal.hidden = false; };
  generate.onclick = async () => { if (busy || !current) return; const model = current;
    // The same rule as the server: a whole number from 1 to the box's max.
    const blocks = Number(blocksBox.value), most = +blocksBox.max;
    if (blocksBox.value.trim() === '' || !Number.isInteger(blocks) || blocks < 1 || blocks > most) {
      planStatus.className = 'bad'; planStatus.textContent = `The block limit must be a whole number from 1 to ${most}.`; blocksBox.focus(); return; }
    setBusy(true);
    const usesClaude = claudePlanners.includes(plannerBox.value);
    proposal.hidden = true; planStatus.className = '';
    planStatus.textContent = !usesClaude ? 'Working on a proposal...'
      : effort === 'low' ? 'Working on a proposal, with low reasoning. This takes about a minute...'
      : `Working on a proposal, with ${effort} reasoning. This can take several minutes...`;
    try { const r = await send('/plan', {method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({planner: plannerBox.value, blocks, model, rules: rulesNow(), ...(usesClaude ? {effort} : {})})});
      if (!r.ok) { planStatus.className = 'bad'; planStatus.textContent = r.body.error || 'Something went wrong.'; if (proposalHeight !== undefined) proposal.hidden = false; return; }
      if (!r.body.proposal) { clearProposal(); KaplaViewer.show(model); planStatus.textContent = 'This planner made no proposal. The terminal running kapla serve shows why.'; return; }
      planStatus.textContent = ''; showProposal(model, r.body.proposal);
    } catch (_) { planStatus.className = 'bad'; planStatus.textContent = noServer; }
    finally { setBusy(false); } };
  send('/planners').then(r => { if (!r.ok) return; claudePlanners = r.body.claude || [];
    r.body.planners.forEach(name => { const o = document.createElement('option'); o.textContent = name; plannerBox.append(o); });
    showEffort(); }).catch(() => {});
  send('/status').then(r => { if (r.ok && !r.body.key)
    addMsg('The API key is missing, so the chat cannot work. Put it in .env in the top folder of the repo, or set ANTHROPIC_API_KEY, then start kapla serve again.', 'bad'); }).catch(() => {});
})();
"

/-- The whole page. -/
def sitePage : String :=
  let empty : ViewPlan := { title := "Defy Gravity", steps := [] }
  "<!doctype html>
<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">
<title>Defy Gravity</title><link rel=\"icon\" href=\"data:,\"><style>" ++ css ++ siteCss ++ "</style>
" ++ threeScripts ++ "
</head><body>
<header><h1>Defy Gravity</h1><div id=\"sub\"></div></header>
<div id=\"site\">
<aside>
<h2>Gallery</h2>
<ul id=\"models\"></ul>
<h2>Save to gallery</h2>
<form id=\"saveForm\"><input id=\"saveName\" placeholder=\"New name\" aria-label=\"Name for this model\" autocomplete=\"off\" maxlength=\"200\">
<button id=\"saveButton\" disabled>Save</button></form>
<button id=\"prButton\" type=\"button\" disabled title=\"Open a PR that adds the open gallery entry to the repo\">Open a PR to share it</button>
<div id=\"ask\" role=\"alertdialog\" hidden><span id=\"askText\"></span><div><button id=\"askYes\" type=\"button\">Replace</button><button id=\"askNo\" type=\"button\">Cancel</button></div></div>
<div id=\"status\" role=\"status\"></div>
</aside>
<section id=\"chat\">
<h2>Chat with Claude</h2>
<div id=\"log\" role=\"log\"></div>
<form id=\"chatForm\"><textarea id=\"chatText\" rows=\"2\" placeholder=\"Describe a model, such as: an egg\" aria-label=\"Message to Claude\"></textarea>
<button id=\"chatSend\">Send</button></form>
</section>
<main>
<div id=\"planBar\"><label>Planner <select id=\"planner\"></select></label>
<label>Block limit <input id=\"planBlocks\" type=\"number\" min=\"1\" max=\"200\" step=\"1\" value=\"40\"></label>
<button id=\"generate\" type=\"button\" disabled>Generate proposal</button>
<button id=\"effort\" type=\"button\" disabled title=\"How much Claude thinks before it answers, for the planners that ask Claude. Click for the next level. Low is fastest, and fewer of its designs pass the checks. High is slowest, and most of its designs pass.\">Reasoning: high</button>
<span id=\"planStatus\" role=\"status\"></span></div>
<details id=\"rulesPanel\"><summary id=\"rulesSummary\">Rules for this plan: the defaults</summary>
<div class=\"ruleRow\"><label>Placement error <select id=\"ruleTol\"><option value=\"0\">0 mm (exact positions only)</option><option value=\"1/4\">2 mm</option><option value=\"1/2\" selected>3.9 mm (default)</option><option value=\"3/4\">5.9 mm</option><option value=\"1\">7.8 mm (strictest)</option></select></label>
<label>Blocks per step <select id=\"ruleHands\"><option>1</option><option>2</option></select></label>
<label><input type=\"checkbox\" id=\"ruleClear\" checked> Check small gaps and tight slots</label>
<label><input type=\"checkbox\" id=\"ruleTurned\" checked> Allow turned blocks</label></div>
<p class=\"hint\">A bigger placement error makes the check stricter. The planner is told these rules, and the verified physics engine checks every one of them.</p>
<ul id=\"ruleList\"></ul>
<div class=\"ruleRow\"><select id=\"ruleKind\" aria-label=\"Kind of rule\"><option value=\"maxHeight\">No block higher than</option><option value=\"noUpright\">No blocks that are</option><option value=\"maxUpright\">At most this many blocks that are</option><option value=\"fitsIn\">Fits in an area of</option></select>
<input id=\"ruleNum\" type=\"number\" min=\"0\" step=\"any\" aria-label=\"Number\"><input id=\"ruleNum2\" type=\"number\" min=\"0\" step=\"any\" placeholder=\"y in cm\" aria-label=\"Second size in cm\">
<select id=\"ruleUp\" aria-label=\"Which blocks\"><option value=\"upright\">standing</option><option value=\"edge\">on edge</option><option value=\"flat\">flat</option></select>
<button id=\"ruleAdd\" type=\"button\">Add rule</button></div>
<div class=\"ruleRow\"><input id=\"ruleWords\" placeholder=\"Or in your words: under 30 cm tall, no standing blocks\" aria-label=\"A rule in your words\" maxlength=\"500\"><button id=\"ruleSuggest\" type=\"button\" title=\"Claude turns the words into rules. You see each one as Lean reads it before it is used.\">Turn into rules</button></div>
<div id=\"ruleStatus\" role=\"status\"></div></details>
<div id=\"error\" role=\"alert\" hidden></div>
<div id=\"view\"></div>
<div id=\"info\"></div>
<div class=\"controls\" id=\"controls\"><button id=\"prev\">◀</button><input id=\"slider\" type=\"range\" min=\"0\" step=\"1\">
<button id=\"next\">▶</button><span id=\"label\"></span><button id=\"bubbles\" hidden>Hide bubbles</button></div>
<div id=\"proposal\" hidden><div class=\"badges\" id=\"badges\"></div><div id=\"scores\"></div><ul id=\"physicsNotes\"></ul><ul id=\"tooSmall\"></ul></div>
<h3 id=\"stepsTitle\">Steps</h3><div id=\"cards\"></div>
</main>
</div>
<script>const DATA = " ++ scriptJson (pageData empty) ++ ";</script>
<script>" ++ js ++ "</script>
<script>" ++ siteJs ++ "</script>
</body></html>"

-- The page has the viewer, the gallery, the save box and the PR button.
#guard sitePage.contains "three.min.js"
#guard sitePage.contains "window.KaplaViewer"
#guard sitePage.contains "id=\"saveForm\""
#guard sitePage.contains "<h2>Gallery</h2>"
#guard sitePage.contains "id=\"prButton\""
#guard sitePage.contains "id=\"chatForm\""
#guard sitePage.contains "Generate proposal"
#guard sitePage.contains "id=\"effort\""
#guard sitePage.contains "id=\"rulesPanel\""
#guard sitePage.contains "/rules/suggest"

end KaplaWeb
