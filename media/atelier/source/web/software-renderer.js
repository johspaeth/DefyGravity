import * as THREE from 'three';

// Orthographic, full-resolution fallback for machines without a usable GPU.
// The same camera, instance matrices, Lean record and Rapier bodies are used.
// This module decides neither geometry validity nor physical motion.
const vertices = [
  [-1.8,-.12,-.36],[1.8,-.12,-.36],[1.8,.12,-.36],[-1.8,.12,-.36],
  [-1.8,-.12,.36],[1.8,-.12,.36],[1.8,.12,.36],[-1.8,.12,.36],
];
const sides = [
  { ids:[4,5,6,7], normal:[0,0,1] }, { ids:[1,0,3,2], normal:[0,0,-1] },
  { ids:[5,1,2,6], normal:[1,0,0] }, { ids:[0,4,7,3], normal:[-1,0,0] },
  { ids:[3,7,6,2], normal:[0,1,0] }, { ids:[0,1,5,4], normal:[0,-1,0] },
];
const light = new THREE.Vector3(-.45,.8,.4).normalize();
const p = new THREE.Vector3(), n = new THREE.Vector3();
const mat = new THREE.Matrix4();
const displayColor = new THREE.Color();
const mix = (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];

export class SoftwareRenderer {
  constructor(world) {
    this.world = world;
    // Keep this fallback off the GPU that could not sustain the WebGL scene.
    // Chromium uses a CPU-backed surface for willReadFrequently; no downscaling.
    this.ctx = world.canvas.getContext('2d', {
      alpha:false, willReadFrequently:true,
    });
  }
  project(point) {
    p.copy(point).project(this.world.camera);
    return [(p.x+1)*this.world.width/2, (1-p.y)*this.world.height/2, p.z];
  }
  point(x,y,z) { return this.project(new THREE.Vector3(x,y,z)); }
  path(points) {
    const ctx = this.ctx;
    ctx.beginPath(); ctx.moveTo(points[0][0],points[0][1]);
    for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();
  }
  box(matrix, id, ghost=false) {
    const world = this.world;
    const points = vertices.map(x=>new THREE.Vector3(...x).applyMatrix4(matrix));
    const projected = points.map(x=>this.project(x));
    const faces = [];
    for (const side of sides) {
      n.set(...side.normal).transformDirection(matrix);
      if (n.dot(this.view)<.001) continue;
      const shade = .89 + .14*Math.max(0,n.dot(light));
      const grain = (id%7-3)*1.1;
      const base = ghost ? (world.proofGhostInvalid ? [190,76,40] : [100,154,111]) : id===world.blocks[world.hovered]?.id ? [244,174,123] : [235+grain,207+grain,163+grain];
      faces.push({ points:side.ids.map(i=>projected[i]),
        depth:side.ids.reduce((s,i)=>s+projected[i][2],0)/4,
        color:`rgb(${base.map(c=>Math.round(Math.min(255,c*shade))).join(',')})`,
        alpha:ghost ? .32 : world.forceVisible ? .42 : 1, wood:!ghost });
    }
    return faces;
  }
  trees() {
    const faces=[];
    this.world.decor.traverse(mesh=>{
      if (!mesh.isMesh) return;
      const geom=mesh.geometry, pos=geom.attributes.position, indices=geom.index;
      const count=indices ? indices.count : pos.count;
      for(let i=0;i<count;i+=3) {
        const vs=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,indices ? indices.getX(i+j) : i+j).applyMatrix4(mesh.matrixWorld));
        n.copy(vs[1]).sub(vs[0]).cross(new THREE.Vector3().copy(vs[2]).sub(vs[0])).normalize();
        if(n.dot(this.view)<.001) continue;
        const ps=vs.map(x=>this.project(x)), shade=.76+.3*Math.max(0,n.dot(light));
        const c=mesh.material.color.getRGB(displayColor,THREE.SRGBColorSpace);
        faces.push({points:ps,depth:ps.reduce((s,x)=>s+x[2],0)/3,
          color:`rgb(${[c.r,c.g,c.b].map(v=>Math.round(v*255*shade)).join(',')})`,alpha:1,wood:false});
      }
    });
    return faces;
  }
  drawFace(face) {
    const ctx=this.ctx, points=face.points;
    ctx.globalAlpha=face.alpha; this.path(points); ctx.fillStyle=face.color; ctx.fill();
    if(!face.wood) return;
    ctx.strokeStyle='rgba(255,247,219,.3)'; ctx.lineWidth=.55; ctx.stroke();
    let edge=0, longest=0;
    for(let i=0;i<4;i++) {
      const a=points[i],b=points[(i+1)%4],length=(a[0]-b[0])**2+(a[1]-b[1])**2;
      if(length>longest){longest=length;edge=i;}
    }
    if(longest<100) return;
    const a=points[edge],b=points[(edge+1)%4],c=points[(edge+2)%4],d=points[(edge+3)%4];
    ctx.beginPath();
    for(const t of [.25,.67]) {
      const from=mix(a,d,t),to=mix(b,c,t+.02);
      ctx.moveTo(...from);ctx.lineTo(...to);
    }
    ctx.strokeStyle='rgba(115,76,28,.075)';ctx.lineWidth=.65;ctx.stroke();
  }
  draw() {
    const w=this.world,ctx=this.ctx,dpr=w.renderer.getPixelRatio();
    w.scene.updateMatrixWorld();w.camera.updateMatrixWorld();
    this.view=w.camera.position.clone().sub(w.controls.target).normalize();
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;
    ctx.fillStyle='#d2dfc8';ctx.fillRect(0,0,w.width,w.height);
    ctx.beginPath();
    for(let i=-30;i<=30;i+=.6) {
      const a=this.point(i,0,-30),b=this.point(i,0,30),c=this.point(-30,0,i),d=this.point(30,0,i);
      ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.moveTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);
    }
    ctx.strokeStyle='rgba(126,150,113,.13)';ctx.lineWidth=.6;ctx.stroke();
    if(w.shadowCanvas) {
      const a=this.point(-32,0,-32),b=this.point(32,0,-32),c=this.point(-32,0,32),size=w.shadowCanvas.width;
      ctx.save();ctx.globalAlpha=.18;
      ctx.transform((b[0]-a[0])/size,(b[1]-a[1])/size,(c[0]-a[0])/size,(c[1]-a[1])/size,a[0],a[1]);
      ctx.drawImage(w.shadowCanvas,0,0);ctx.restore();
    }
    const faces=this.trees();
    for(let i=0;i<w.blocks.length;i++) {
      w.planks.getMatrixAt(i,mat);faces.push(...this.box(mat,w.blocks[i].id));
    }
    faces.sort((a,b)=>b.depth-a.depth);
    for(const face of faces)this.drawFace(face);
    if(w.ghost.visible) for(const face of this.box(w.ghost.matrixWorld,-1,true))this.drawFace(face);
    ctx.globalAlpha=1;
    if(w.forceGroup.visible) {
      const lines=w.forceGroup.children.find(child=>child.isLineSegments);
      if(lines) {
        const positions=lines.geometry.attributes.position;
        ctx.strokeStyle=ctx.fillStyle='#236749';ctx.lineWidth=1.5;
        for(let i=0;i<positions.count;i+=2) {
          const a=this.point(positions.getX(i),positions.getY(i),positions.getZ(i));
          const b=this.point(positions.getX(i+1),positions.getY(i+1)+.1,positions.getZ(i+1));
          ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
          const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
          this.path([[b[0],b[1]],[b[0]-ux*6-uy*3,b[1]-uy*6+ux*3],[b[0]-ux*6+uy*3,b[1]-uy*6-ux*3]]);
          ctx.fill();
        }
      }
    }
    w.renderer.info.render.calls=faces.length;
    w.renderer.info.render.triangles=faces.reduce((sum,f)=>sum+f.points.length-2,0);
    const geometries=new Set();
    w.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
    w.renderer.info.memory.geometries=geometries.size;
    w.renderer.info.memory.textures=2;
  }
}
