import { lessons } from './theorems.js';

const $=id=>document.getElementById(id);
const placement={x:-15,z:-3,orientation:0};
const cancelled=new Error('Tour request superseded');

// This UI owns an isolated Lean session. It never accepts geometry or forces itself.
export class ProofTour {
  constructor(world,apiBase,onClose,getEvidence) {
    Object.assign(this,{world,apiBase,onClose,getEvidence,active:false,busy:false,generation:0,index:0,statements:{}});
    $('proof-tour').innerHTML=`
      <header class="tour-header"><div><span class="eyebrow">AI BUILDS. LEAN CHECKS.</span>
        <h1>Don’t trust the picture. Explore the proof.</h1>
        <p>AI wrote code and proposed proofs. Lean checked those proofs; the same functions run these examples. No AI calls during play.</p></div>
        <button id="tour-close" class="button quiet">Back to my build</button></header>
      <nav class="tour-nav" aria-label="Six proved theorems">
        ${lessons.map((l,i)=>`<button data-lesson="${i}" aria-pressed="false"><span class="tour-number">0${i+1}</span><span>${l.short}</span></button>`).join('')}
        <p>Six guided results from eight main theorems. Your build stays untouched.</p>
      </nav>
      <section class="tour-scene" aria-label="Interactive theorem example">
        <div id="tour-viewport"><span class="tour-scene-label">LIVE EXAMPLE · DRAG TO ORBIT</span>
          <button id="tour-fit" class="button small quiet">Fit view</button><pre id="tour-hud"></pre></div>
        <div class="tour-experiment">
          <p id="tour-result" role="status" aria-live="polite"></p>
          <label id="tour-slider-label" hidden><span id="tour-slider-text"></span><input id="tour-range" type="range" min="0" max="20" value="0"></label>
          <div class="tour-actions"><button id="tour-action" class="button primary"></button><button id="tour-reset" class="button quiet">Reset example</button></div>
          <p id="tour-scene-note"></p>
        </div>
        <div class="tour-evidence"><strong>Example ≠ proof.</strong> The picture illustrates a case. The theorem covers all inputs satisfying its assumptions.<p id="tour-evidence-status"></p></div>
      </section>
      <article class="tour-copy">
        <span id="tour-kicker" class="eyebrow"></span><h2 id="tour-title"></h2><p id="tour-meaning" class="tour-meaning"></p>
        <h3>So what?</h3><p id="tour-so"></p>
        <h3>What does Lean provide?</h3><p id="tour-provides"></p>
        <h3>How does it prove that?</h3><p id="tour-how"></p>
        <h3>Why does it matter for AI?</h3><p id="tour-why"></p>
        <div class="tour-boundary"><strong>The boundary</strong><p id="tour-boundary"></p></div>
        <details id="tour-source"><summary>Read the exact Lean statement</summary><pre id="tour-statement"></pre></details>
        <p class="tour-human">A correct proof can establish the wrong specification. Human review of this author-proposed model is pending. Rendering, transport, and animated physics are outside these proofs.</p>
      </article>`;
    $('tour-close').onclick=()=>this.close();
    $('tour-reset').onclick=()=>this.select(this.index);
    $('tour-action').onclick=()=>this.act();
    $('tour-fit').onclick=()=>this.fit();
    $('tour-range').oninput=()=>this.slide(Number($('tour-range').value));
    document.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>this.select(Number(b.dataset.lesson)));
  }
  async call(payload={},init=false) {
    const generation=this.generation;
    const response=await fetch(`${this.apiBase}/api/${init?'session':'command'}`,{
      method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json',...(!init&&{'X-Session-Token':this.credentials.token})},
      body:JSON.stringify(init?{}:{...payload,session:this.credentials.session}),
      signal:AbortSignal.any([this.controller.signal,AbortSignal.timeout(25000)]),
    });
    const data=await response.json();
    if(!this.active||generation!==this.generation)throw cancelled;
    if(!response.ok||!data.ok){const e=new Error(data.error||'Lean could not complete the example.');e.status=response.status;throw e;}
    return data;
  }
  result(text,kind='neutral') {
    this.resultText=text;this.resultKind=kind;
    $('tour-result').textContent=text;$('tour-result').dataset.kind=kind;
  }
  controls() {
    document.querySelectorAll('[data-lesson],#tour-action,#tour-reset,#tour-range').forEach(b=>b.disabled=this.busy||!this.credentials);
    $('tour-action').disabled=this.busy||!this.record;
  }
  async run(work) {
    if(this.busy||!this.active)return;
    const generation=this.generation;
    const restoreRangeFocus=document.activeElement===$('tour-range');
    this.busy=true;this.result('Waiting for the Lean executable…','pending');this.controls();
    try{await work();}
    catch(e){
      if(this.active&&generation===this.generation){
        this.world.toggleForces(false);this.accepted=null;
        this.result(`No result asserted: ${e.message}`,'error');
      }
    }finally{if(this.active&&generation===this.generation){
      this.busy=false;this.controls();
      if(restoreRangeFocus&&document.activeElement===document.body)$('tour-range').focus({preventScroll:true});
    }}
  }
  async open(record) {
    if(this.active)return;
    this.active=true;this.generation++;this.credentials=null;this.record=null;this.controller=new AbortController();
    const generation=this.generation;
    this.saved={record,force:this.world.forceVisible,camera:this.world.state().camera,span:this.world.span,autoFit:this.world.autoFit};
    this.parent=this.world.canvas.parentElement;
    document.body.classList.add('proof-touring');$('proof-tour').hidden=false;
    $('tour-viewport').appendChild(this.world.canvas);this.world.resizeObserver.observe($('tour-viewport'));
    this.world.setViewMode('proof');this.world.toggleForces(false);this.world.setGhost(null);this.world.resize();
    $('tour-close').focus();
    const report=this.getEvidence();
    $('tour-evidence-status').textContent=report
      ? `Build evidence: ${report.theoremCount} main theorems. Kernel replay: ${report.lakeCheck}. Comparator: ${report.comparator}. These are build-time checks, not proofs generated by clicking.`
      : 'Build evidence unavailable. No kernel or Comparator success is asserted here.';
    await this.run(async()=>{
      this.credentials=await this.call({},true);
      try{
        const response=await fetch('./proof/theorems.json',{signal:this.controller.signal});
        if(!response.ok)throw new Error('Statement file unavailable');
        const statements=await response.json();
        if(!this.active||generation!==this.generation)throw cancelled;
        this.statements=statements;
      }catch(e){if(!this.active||generation!==this.generation)throw cancelled;this.statements={};}
    });
    if(this.active&&generation===this.generation&&this.credentials)await this.select(0);
  }
  close() {
    if(!this.active)return;
    this.active=false;this.generation++;this.controller.abort();this.busy=false;this.credentials=null;
    this.world.resizeObserver.unobserve($('tour-viewport'));this.parent.prepend(this.world.canvas);
    $('proof-tour').hidden=true;document.body.classList.remove('proof-touring');
    this.world.proofGhostInvalid=false;this.world.ghost.material.color.set('#427b5b');
    this.world.setViewMode('build');this.world.setRecord(this.saved.record,{preserveView:true});
    this.world.toggleForces(this.saved.force);this.world.resize();
    this.world.span=this.saved.span;this.world.autoFit=this.saved.autoFit;
    this.world.camera.position.fromArray(this.saved.camera.position);
    this.world.controls.target.fromArray(this.saved.camera.target);this.world.camera.zoom=this.saved.camera.zoom;
    this.world.projection();this.world.controls.update();this.world.draw();
    this.onClose();$('tour-open').focus();
  }
  async base() {
    await this.call({cmd:'preset',name:'empty'});await this.call({cmd:'budget',budget:200});
    await this.call({cmd:'place',x:-15,z:-1,orientation:4});
    this.record=(await this.call({cmd:'place',x:9,z:-1,orientation:4})).record;
    this.landing=(await this.call({cmd:'preview',...placement})).preview;
  }
  async select(index) {
    if(this.busy||!this.active)return;
    this.index=index;this.phase=0;this.record=null;this.landing=null;this.ghost=null;this.accepted=null;
    const lesson=lessons[index];
    for(const key of ['title','meaning','so','provides','how','why','boundary'])$(`tour-${key}`).textContent=lesson[key];
    $('tour-kicker').textContent=`THEOREM 0${index+1} / 06`;
    $('tour-statement').textContent=this.statements[lesson.name]||'Exact statement unavailable. No substitute statement has been generated.';
    $('tour-source').open=false;$('tour-slider-label').hidden=![2,4].includes(index);
    $('tour-scene-note').textContent='The translucent plank is a candidate, not part of the accepted construction. Exact landing positions come from a separate Lean session.';
    document.querySelectorAll('[data-lesson]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    this.world.toggleForces(false);this.world.setGhost(null);this.world.setHover(-1);
    await this.run(async()=>{
      if(index===4){
        await this.call({cmd:'budget',budget:200});
        this.full=(await this.call({cmd:'preset',name:'bridge'})).record;
        this.record=(await this.call({cmd:'prefix',count:1})).record;
        $('tour-range').max=this.full.count;$('tour-range').value=1;
        this.show();this.fit();this.replayResult();$('tour-action').textContent='Show complete bridge';
        $('tour-scene-note').textContent='Each selected prefix is checked by Lean. Geometric validity and balance are different claims.';
      }else{
        await this.base();
        if(index===3)this.record=(await this.call({cmd:'budget',budget:3})).record;
        if(index===5){
          this.record=(await this.call({cmd:'place',...placement})).record;
          const checked=await this.call({cmd:'verify',certificate:this.record.certificate});
          this.accepted=checked.accepted;this.show();this.world.toggleForces(checked.accepted);this.fit();
          this.result(checked.accepted?'Lean accepted the original force certificate.':'Lean rejected the original certificate.',checked.accepted?'accepted':'rejected');
          $('tour-action').textContent='Tamper with one force';
          $('tour-scene-note').textContent='Green arrows show accepted contact forces. Arrow lengths are illustrative; Lean checks exact integer equations.';
        }else{
          this.show();this.showGhost(this.landing.y+(index===0?20:0));this.fit();
          $('tour-action').textContent=['Lower to contact','Try one grid step lower','Raise to the top','Place the last plank'][index];
          $('tour-range').max=20;$('tour-range').value=0;
          if(index===2)this.pathResult();
          else this.result(index===3?'Lean reports 2 of 3 planks used. One remains.':`Lean computed the landing: ${this.landing.y*4} mm above the floor.`,'accepted');
        }
      }
    });
  }
  show(){this.world.setRecord(this.record,{refit:true});}
  showGhost(y,invalid=false){
    this.ghost={...this.landing,y};this.world.proofGhostInvalid=invalid;
    this.world.ghost.material.color.set(invalid?'#bc522e':'#427b5b');
    this.world.setGhost(this.ghost);this.world.draw();
  }
  fit(){
    this.world.fit(true,this.landing&&this.index<4?[...(this.record?.blocks||[]),{...this.landing,y:this.landing.y+20}]:this.record?.blocks||[]);
  }
  pathResult(){
    $('tour-slider-text').textContent=`Plank bottom: ${this.ghost.y*4} mm · landing: ${this.landing.y*4} mm`;
    this.result('Move the translucent plank along the proved, grid-aligned route.','accepted');
  }
  replayResult(){
    $('tour-slider-text').textContent=`Showing ${this.record.count} of ${this.full.count} accepted additions`;
    this.result(`Lean checked this prefix: ${this.record.count} planks. Geometry valid: ${this.record.geometryValid?'yes':'no'}.`,'accepted');
  }
  async slide(value){
    if(this.busy||!this.active)return;
    if(this.index===2){this.showGhost(this.landing.y+value);this.pathResult();}
    else if(this.index===4)await this.run(async()=>{
      this.record=(await this.call({cmd:'prefix',count:value})).record;this.show();this.replayResult();
    });
  }
  async act(){
    if(this.busy||!this.record)return;
    if(this.index===0){
      this.phase=1-this.phase;this.showGhost(this.landing.y+(this.phase?0:20));
      $('tour-action').textContent=this.phase?'Raise again':'Lower to contact';
      this.result(this.phase?`Ghost at Lean’s exact landing: ${this.landing.y*4} mm. Faces touch; interiors stay separate.`:'Ghost raised above the supports. Lower it to the computed landing.','accepted');
    }else if(this.index===2){
      const value=Number($('tour-range').value)===20?0:20;$('tour-range').value=value;
      this.slide(value);$('tour-action').textContent=value?'Lower to landing':'Raise to the top';
    }else if(this.index===4){
      const value=this.record.count===this.full.count?1:this.full.count;
      $('tour-range').value=value;await this.slide(value);
      $('tour-action').textContent=value===1?'Show complete bridge':'Back to first plank';
    }else await this.run(async()=>{
      if(this.index===1){
        const candidate={...this.landing,y:this.landing.y-1};
        try{
          await this.call({cmd:'import',record:{...this.record,blocks:[...this.record.blocks,candidate],certificate:null,insertionPathChecked:false}});
          throw new Error('Unexpected acceptance. This example is not signed off.');
        }catch(e){
          if(e.status!==422||!e.message.includes('Overlapping planks'))throw e;
          this.showGhost(candidate.y,true);this.result(`Rejected by Lean: ${e.message}`,'rejected');
          $('tour-scene-note').textContent='Orange = rejected candidate, not an accepted plank. It is 4 mm below the computed landing.';
        }
      }else if(this.index===3){
        if(this.phase===0){
          this.record=(await this.call({cmd:'place',...placement})).record;
          this.phase=1;this.ghost=null;this.show();this.fit();
          this.result(`Accepted by Lean: ${this.record.count} of 3 planks used. Geometry valid: ${this.record.geometryValid?'yes':'no'}.`,'accepted');
          $('tour-action').textContent='Try to add a fourth';
          $('tour-scene-note').textContent='All three planks are now part of the accepted construction. Try exceeding the inventory.';
        }else{
          try{await this.call({cmd:'place',x:45,z:-3,orientation:0});throw new Error('Unexpected acceptance.');}
          catch(e){if(e.status!==422||!e.message.includes('box is empty'))throw e;this.result(`Rejected by Lean: ${e.message} The three-block scene is unchanged.`,'rejected');}
        }
      }else if(this.index===5){
        const cert=structuredClone(this.record.certificate),changed=1-this.phase;
        const contact=cert.contacts.find(c=>BigInt(c.force)>0n);if(changed)contact.force='0';
        const checked=await this.call({cmd:'verify',certificate:cert});
        this.phase=changed;this.accepted=checked.accepted;this.world.toggleForces(checked.accepted);
        this.world.setHover(changed?this.record.blocks.findIndex(b=>b.id===contact.upper):-1);
        this.result(checked.accepted?'Lean accepted the original force certificate.':'Lean rejected the altered force certificate.',checked.accepted?'accepted':'rejected');
        $('tour-action').textContent=changed?'Restore the original force':'Tamper with one force';
        $('tour-scene-note').textContent=changed?'The blocks are unchanged. The highlighted block belongs to the edited contact. The invalid witness is not displayed as accepted load arrows.':'Green arrows visualize the original witness. Lean checks exact integer force and moment equations.';
      }
    });
  }
  state(){
    return this.active?{theorem:lessons[this.index].name,index:this.index,busy:this.busy,
      result:this.resultText,resultKind:this.resultKind,record:this.record,ghost:this.ghost,
      certificateAccepted:this.index===5?this.accepted:null}:null;
  }
}
