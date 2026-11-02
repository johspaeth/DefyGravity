import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SoftwareRenderer } from './software-renderer.js';

// Rendering uses the canonical dimensions returned by Lean. It does not decide
// placement, legality, inventory or certification. Physics is a separate mode.
export const SCALE = .12;
const UP = new THREE.Vector3(0, 1, 0);
const v = new THREE.Vector3(), matrix = new THREE.Matrix4(), unit = new THREE.Vector3(1, 1, 1);
const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const qy = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2);
const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
const orientations = [new THREE.Quaternion(), qy, qx,
  qy.clone().multiply(qx), qy.clone().multiply(qz), qz];
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(UP, 0);
const hitPoint = new THREE.Vector3();

function pineTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e6c89a'; ctx.fillRect(0, 0, 1024, 256);
  let seed = 1287;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 230; i++) {
    const y = random() * 256, alpha = .025 + random() * .09;
    ctx.strokeStyle = `rgba(132,87,37,${alpha})`; ctx.lineWidth = .25 + random() * 1.2;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 24) ctx.lineTo(x, y + Math.sin(x / (130 + i) + i) * (1 + i % 6));
    ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    const y = random() * 256;
    ctx.strokeStyle = 'rgba(255,249,219,.16)'; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(400, y + 6, 700, y - 3, 1024, y); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
function centerOf(block, target = new THREE.Vector3()) {
  return target.set((block.x + block.size[0] / 2) * SCALE,
    (block.y + block.size[1] / 2) * SCALE, (block.z + block.size[2] / 2) * SCALE);
}

export class WorkshopWorld {
  blocks = [];
  physics = null;
  bodies = [];
  playing = false;
  paused = false;
  slow = false;
  manual = false;
  autoFit = true;
  viewMode = 'build';
  simulatedTime = 0;
  accumulator = 0;
  quakeRemaining = 0;
  forceVisible = false;
  hovered = -1;
  fps = 0;
  frames = 0;
  statsTime = performance.now();
  frameTimes = [];
  dirty = true;
  renderFrames = 0;
  slowWindows = 0;
  fallbackReason = null;
  shadowElapsed = 0;
  timings = { physicsMs: 0, shadowMs: 0, drawMs: 0 };
  color = new THREE.Color();

  constructor(canvas, onKnock) {
    this.canvas = canvas;
    this.onKnock = onKnock;
    const probe = document.createElement('canvas').getContext('webgl2');
    const debug = probe?.getExtension('WEBGL_debug_renderer_info');
    this.software = Boolean(debug && /SwiftShader|llvmpipe|Software/i.test(probe.getParameter(debug.UNMASKED_RENDERER_WEBGL)));
    if (this.software) this.fallbackReason = 'Software graphics detected';
    probe?.getExtension('WEBGL_lose_context')?.loseContext();
    // Software WebGL uses inexpensive baked face shading with no filmic
    // post-processing. Resolution and the physics clock are not reduced.
    if (this.software) THREE.ColorManagement.enabled = false;
    document.documentElement.classList.toggle('software-renderer', this.software);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.software ? document.createElement('canvas') : canvas,
      antialias: !this.software, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.software;
    this.renderer.shadowMap.type = this.software ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.outputColorSpace = this.software ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
    this.renderer.toneMapping = this.software ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#d1dfca');
    this.scene.fog = new THREE.Fog('#d1dfca', 55, 130);
    this.camera = new THREE.OrthographicCamera(-15, 15, 10, -10, .1, 180);
    this.camera.position.set(19, 17, 23);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = .1;
    this.controls.minPolarAngle = .16; this.controls.maxPolarAngle = Math.PI * .49;
    this.controls.minZoom = .25; this.controls.maxZoom = 5;
    this.controls.zoomSpeed = .7; this.controls.rotateSpeed = .6;
    this.controls.target.set(0, 3.6, 0);
    this.controls.addEventListener('start', () => { this.autoFit = false; });
    this.scene.add(new THREE.HemisphereLight('#fff9e9', '#a5b299', 1.65));
    this.sun = new THREE.DirectionalLight('#fff3dc', 2.6);
    this.sun.position.set(-12, 24, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.software ? 1024 : 2048, this.software ? 1024 : 2048);
    Object.assign(this.sun.shadow.camera, { left: -22, right: 22, top: 25, bottom: -22, near: .5, far: 80 });
    this.sun.shadow.bias = -.00015;
    this.sun.shadow.normalBias = .025;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300),
      this.material({ color: this.software ? '#d2dfc8' : '#b3cfae', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.012; floor.receiveShadow = true;
    this.scene.add(floor);
    this.grid = new THREE.GridHelper(60, 100, '#a7b79c', '#b0c2a5');
    this.grid.material.transparent = true; this.grid.material.opacity = .14;
    this.grid.position.y = -.008; this.scene.add(this.grid);
    this.geometry = new RoundedBoxGeometry(30 * SCALE, 2 * SCALE, 6 * SCALE, 2, .022);
    this.shadeGeometry(this.geometry);
    this.wood = this.material({ map: pineTexture(), color: this.software ? '#fffdf8' : '#fff5df',
      roughness: .8, metalness: 0, vertexColors: this.software });
    this.planks = new THREE.InstancedMesh(this.geometry, this.wood, 1000);
    this.planks.count = 0; this.planks.castShadow = true; this.planks.receiveShadow = true;
    this.planks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.planks);
    this.ghost = new THREE.Mesh(this.geometry, this.material({
      color: '#427b5b', transparent: true, opacity: .32, depthWrite: false, roughness: .9,
    }));
    this.ghost.visible = false; this.ghost.renderOrder = 3; this.scene.add(this.ghost);
    this.ghostEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.6, .24, .72)),
      new THREE.LineBasicMaterial({ color: '#3e6b4d', transparent: true, opacity: .65 }));
    this.ghost.add(this.ghostEdges);
    this.forceGroup = new THREE.Group(); this.scene.add(this.forceGroup);
    this.decorate();
    if (this.software) { this.makeSoftShadow(); this.softwareRenderer = new SoftwareRenderer(this); }
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
  }
  material(options) {
    if (!this.software) return new THREE.MeshStandardMaterial(options);
    const { roughness, metalness, flatShading, ...basic } = options;
    if (basic.map) {
      basic.map.colorSpace = THREE.NoColorSpace; basic.map.anisotropy = 1;
      basic.map.minFilter = THREE.LinearMipmapNearestFilter;
    }
    return new THREE.MeshBasicMaterial(basic);
  }
  useCanvasProjection() {
    if (this.software) return;
    // A WebGL canvas cannot change context type. Replace only that surface;
    // preserve the camera, instance matrices, simulation and canonical record.
    const replacement = this.canvas.cloneNode(false);
    replacement.width = Math.round(this.width*this.renderer.getPixelRatio());
    replacement.height = Math.round(this.height*this.renderer.getPixelRatio());
    this.canvas.replaceWith(replacement);
    this.canvas = replacement;
    this.controls.connect(replacement);
    this.software = true;
    this.fallbackReason = 'Sustained low frame rate on hardware graphics';
    document.documentElement.classList.add('software-renderer');
    this.renderer.shadowMap.enabled = false;
    this.makeSoftShadow(); this.updateSoftShadow();
    this.softwareRenderer = new SoftwareRenderer(this);
    this.onCanvasReplaced?.();
    this.dirty = true; this.draw();
  }
  shadeGeometry(geometry) {
    if (!this.software) return geometry;
    const normal = geometry.attributes.normal, colors = new Float32Array(normal.count * 3);
    const light = new THREE.Vector3(-.45,.8,.4).normalize();
    for (let i = 0; i < normal.count; i++) {
      const shade = .82 + .2 * Math.max(0, normal.getX(i)*light.x + normal.getY(i)*light.y + normal.getZ(i)*light.z);
      colors[i*3] = colors[i*3+1] = colors[i*3+2] = shade;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors,3));
    return geometry;
  }
  makeSoftShadow() {
    // A cheaper, purely visual floor silhouette for software WebGL. This is not
    // a collision surface or part of the equilibrium certificate.
    this.shadowMask = document.createElement('canvas');
    this.shadowCanvas = document.createElement('canvas');
    this.shadowMask.width = this.shadowMask.height = 384;
    this.shadowCanvas.width = this.shadowCanvas.height = 384;
    this.shadowTexture = new THREE.CanvasTexture(this.shadowCanvas);
    this.shadowTexture.colorSpace = THREE.NoColorSpace;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(64, 64),
      new THREE.MeshBasicMaterial({ map: this.shadowTexture, transparent: true, opacity: .2, alphaTest: .002, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.004;
    this.scene.add(shadow);
  }
  updateSoftShadow() {
    if (!this.software) return;
    const ctx = this.shadowMask.getContext('2d'), out = this.shadowCanvas.getContext('2d');
    const size = this.shadowMask.width, factor = size / 64;
    ctx.clearRect(0, 0, size, size); ctx.fillStyle = '#1d3821';
    const point = new THREE.Vector3();
    const convex = points => {
      points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cross = (o,a,b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
      const lower=[], upper=[];
      for (const p of points) { while(lower.length>1 && cross(lower.at(-2),lower.at(-1),p)<=0) lower.pop(); lower.push(p); }
      for (const p of [...points].reverse()) { while(upper.length>1 && cross(upper.at(-2),upper.at(-1),p)<=0) upper.pop(); upper.push(p); }
      lower.pop(); upper.pop(); return lower.concat(upper);
    };
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i], body = this.bodies[i];
      const pos = this.playing && body ? body.translation() : centerOf(b);
      const q = this.playing && body ? body.rotation() : orientations[b.orientation];
      const corners = [];
      for (const x of [-1.8,1.8]) for (const y of [-.12,.12]) for (const z of [-.36,.36]) {
        point.set(x,y,z).applyQuaternion(q).add(pos);
        corners.push([(point.x + point.y * .5 + 32) * factor, (point.z - point.y * .5 + 32) * factor]);
      }
      const hull = convex(corners);
      ctx.beginPath(); hull.forEach((p,j) => j ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.fill();
    }
    for (const [x,z,s] of [[-9,-3.5,.8],[8,-8,.65],[9.2,-6.5,1]]) {
      ctx.beginPath(); ctx.ellipse((x+.5*s+32)*factor,(z-.5*s+32)*factor,1.2*s*factor,.48*s*factor,-Math.PI/4,0,Math.PI*2);ctx.fill();
    }
    out.clearRect(0,0,size,size); out.filter = 'blur(2px)'; out.drawImage(this.shadowMask,0,0); out.filter = 'none';
    this.shadowTexture.needsUpdate = true;
  }
  decorate() {
    const foliage = this.material({ color: '#61826b', roughness: 1, flatShading: true, vertexColors: this.software });
    const trunk = this.material({ color: '#637156', roughness: 1, vertexColors: this.software });
    this.decor = new THREE.Group();
    for (const [x, z, scale] of [[-9, -3.5, .8], [8, -8, .65], [9.2, -6.5, 1]]) {
      const group = new THREE.Group();
      const stem = new THREE.Mesh(this.shadeGeometry(new THREE.CylinderGeometry(.14, .16, .6, 8)), trunk);
      stem.position.y = .3; stem.castShadow = true; group.add(stem);
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(this.shadeGeometry(new THREE.ConeGeometry(.65 - i * .13, 1, 7)), foliage);
        cone.position.y = .9 + i * .44; cone.castShadow = true; cone.receiveShadow = true; group.add(cone);
      }
      group.position.set(x, 0, z); group.scale.setScalar(scale); this.decor.add(group);
    }
    this.scene.add(this.decor);
  }
  resize() {
    const { width, height } = this.canvas.parentElement.getBoundingClientRect();
    this.width = width; this.height = height;
    this.renderer.setSize(width, height, false);
    if (this.software) {
      this.canvas.width = Math.round(width*this.renderer.getPixelRatio());
      this.canvas.height = Math.round(height*this.renderer.getPixelRatio());
    }
    if (this.autoFit) this.fit(false);
    else this.projection();
    this.draw();
  }
  projection() {
    const mobile = this.width <= 650;
    const proof = this.viewMode === 'proof';
    const span = this.span || 14, aspect = this.width / this.height;
    const leftPad = proof ? 24 : mobile ? 54 : 122;
    const rightPad = proof ? 24 : mobile ? 12 : this.width < 1000 ? 248 : 286;
    const topPad = proof ? 60 : mobile ? 104 : 92;
    const bottomPad = proof ? 60 : mobile ? (this.viewMode === 'place' || this.viewMode === 'sequence' ? 300 : 190)
      : this.playing ? 210 : this.viewMode === 'sequence' ? 300 : 72;
    const shiftX = (rightPad - leftPad) * .5 * span / this.height;
    const shiftY = (topPad - bottomPad) * .5 * span / this.height;
    Object.assign(this.camera, {
      left: -span * aspect / 2 + shiftX, right: span * aspect / 2 + shiftX,
      top: span / 2 + shiftY, bottom: -span / 2 + shiftY,
    });
    this.camera.updateProjectionMatrix();
  }
  setViewMode(mode) {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    if (this.autoFit) this.fit(false);
    else { this.projection(); this.dirty = true; }
  }
  fit(reset = true, blocks = this.blocks) {
    if (!this.width || !this.height) return;
    const box = new THREE.Box3();
    if (this.playing) {
      // Refit uses actual moving poses, not the original static tower bounds.
      for(let i=0;i<this.bodies.length;i++) {
        this.planks.getMatrixAt(i,matrix);
        for(const x of [-1.8,1.8]) for(const y of [-.12,.12]) for(const z of [-.36,.36]) {
          box.expandByPoint(v.set(x,y,z).applyMatrix4(matrix));
        }
      }
    } else for (const b of blocks) {
      box.expandByPoint(v.set(b.x * SCALE, b.y * SCALE, b.z * SCALE));
      box.expandByPoint(v.set((b.x + b.size[0]) * SCALE, (b.y + b.size[1]) * SCALE, (b.z + b.size[2]) * SCALE));
    }
    if (box.isEmpty()) box.set(new THREE.Vector3(-3, 0, -3), new THREE.Vector3(3, 3, 3));
    // Leave room above the build for the next upright plank's preview.
    if (!this.playing && this.viewMode === 'place') box.max.y += 30*SCALE;
    const center = box.getCenter(new THREE.Vector3());
    const direction = reset ? new THREE.Vector3(19, 17, 23).normalize()
      : this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.target.copy(center);
    const distance = Math.max(45, box.getSize(new THREE.Vector3()).length()*1.1);
    this.camera.position.copy(center).addScaledVector(direction, distance);
    this.camera.far = Math.max(180,distance*2+20);
    this.scene.fog.near = distance+25; this.scene.fog.far = distance+110;
    this.camera.lookAt(center); this.camera.zoom = 1; this.camera.updateMatrixWorld();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      v.set(x, y, z).applyMatrix4(this.camera.matrixWorldInverse);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
      y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
    const mobile = this.width <= 650;
    const proof = this.viewMode === 'proof';
    const availableWidth = Math.max(160, this.width - (proof ? 48 : mobile ? 76 : 424));
    const bottomPad = proof ? 60 : mobile ? (this.viewMode === 'place' || this.viewMode === 'sequence' ? 300 : 190)
      : this.playing ? 210 : this.viewMode === 'sequence' ? 300 : 72;
    const availableHeight = Math.max(120, this.height - (proof ? 60 : mobile ? 104 : 92) - bottomPad);
    this.span = Math.max(10, (y1 - y0) * this.height / availableHeight * 1.12,
      (x1 - x0) * this.height / availableWidth * 1.18);
    this.autoFit = true; this.projection(); this.controls.update(); this.dirty = true;
  }
  zoom(factor) {
    this.autoFit = false;
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * factor, .25, 5);
    this.camera.updateProjectionMatrix(); this.draw();
  }
  setRecord(record, { refit = false, preserveView = false } = {}) {
    this.blocks = record.blocks;
    this.record = record; this.planks.count = this.blocks.length;
    this.hovered = -1;
    this.setGhost(null);
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      matrix.compose(centerOf(b, v), orientations[b.orientation], unit);
      this.planks.setMatrixAt(i, matrix);
      this.color.setHSL(.095 + (b.id % 5) * .002, .12, .90 + (b.id % 7) * .012);
      this.planks.setColorAt(i, this.color);
    }
    this.planks.instanceMatrix.needsUpdate = true;
    if (this.planks.instanceColor) this.planks.instanceColor.needsUpdate = true;
    this.planks.computeBoundingSphere();
    if (!record.certified || !record.count) this.toggleForces(false);
    this.rebuildForces(record);
    this.updateSoftShadow();
    this.renderer.shadowMap.needsUpdate = true;
    if (!preserveView && (refit || this.autoFit)) this.fit(refit);
    else if (this.autoFit && this.viewMode === 'sequence') this.fit(false);
    this.draw();
  }
  setGhost(block) {
    this.dirty = true;
    this.ghostBlock = block;
    this.ghost.visible = Boolean(block) && !this.playing;
    if (!block) return;
    centerOf(block, this.ghost.position);
    this.ghost.quaternion.copy(orientations[block.orientation]);
  }
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, this.camera);
    return raycaster.intersectObject(this.planks)[0] || null;
  }
  point(clientX, clientY) {
    const hit = this.pick(clientX, clientY);
    if (hit) return hit.point.clone();
    return raycaster.ray.intersectPlane(plane, hitPoint) ? hitPoint.clone() : null;
  }
  setHover(index = -1) {
    if (index === this.hovered) return;
    if (this.hovered >= 0 && this.blocks[this.hovered]) {
      const id = this.blocks[this.hovered].id;
      this.color.setHSL(.095 + (id % 5) * .002, .12, .90 + (id % 7) * .012);
      this.planks.setColorAt(this.hovered, this.color);
    }
    this.hovered = index;
    this.dirty = true;
    if (index >= 0) this.planks.setColorAt(index, this.color.set('#e9a37c'));
    if (this.planks.instanceColor) this.planks.instanceColor.needsUpdate = true;
  }
  clearForces() {
    for (const child of [...this.forceGroup.children]) {
      child.traverse(o => { o.geometry?.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose(); });
      this.forceGroup.remove(child);
    }
  }
  rebuildForces(record) {
    this.clearForces();
    if (record.certified && record.certificate) {
      const byId = new Map(record.blocks.map(b => [b.id, b]));
      const positions = [], heads = [];
      for (const c of record.certificate.contacts) {
        const b = byId.get(c.upper);
        if (!b || c.force === '0') continue;
        // Keep arbitrary-size integer certificates out of floating-point
        // division. Only the final, bounded visualization ratio is approximate.
        const ratio = BigInt(c.force) * 10000n / BigInt(record.certificate.scale);
        const force = Number(ratio > 10000000n ? 10000000n : ratio) / 10000;
        const origin = new THREE.Vector3(c.x2 * SCALE / 2, b.y * SCALE + .018, c.z2 * SCALE / 2);
        const length = .22 + Math.min(1.4, Math.log2(1 + force) * .18);
        positions.push(origin.x, origin.y, origin.z, origin.x, origin.y + length - .1, origin.z);
        heads.push([origin.x, origin.y + length - .06, origin.z]);
      }
      if (positions.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const lines = new THREE.LineSegments(geometry,
          new THREE.LineBasicMaterial({ color: '#236749', depthTest: false }));
        const cones = new THREE.InstancedMesh(new THREE.ConeGeometry(.045, .12, 6),
          new THREE.MeshBasicMaterial({ color: '#236749', depthTest: false }), heads.length);
        const identity = new THREE.Quaternion();
        heads.forEach((point, i) => { matrix.compose(v.fromArray(point), identity, unit); cones.setMatrixAt(i, matrix); });
        cones.instanceMatrix.needsUpdate = true;
        lines.renderOrder = 8; cones.renderOrder = 8;
        this.forceGroup.add(lines, cones);
      }
    }
    this.forceGroup.visible = this.forceVisible && !this.playing;
  }
  toggleForces(value = !this.forceVisible) {
    this.forceVisible = value;
    this.forceGroup.visible = value && !this.playing;
    this.wood.transparent = value; this.wood.opacity = value ? .42 : 1;
    this.wood.depthWrite = !value; this.wood.needsUpdate = true;
    this.dirty = true;
    return value;
  }
  async startPhysics() {
    if (this.playing) return;
    if (!this.RAPIER) {
      const imported = await import('@dimforge/rapier3d-compat');
      this.RAPIER = imported.default; await this.RAPIER.init();
    }
    const R = this.RAPIER;
    this.physics = new R.World({ x: 0, y: -9.81, z: 0 });
    this.physics.timestep = 1 / 60;
    this.physics.numSolverIterations = 12;
    this.events = new R.EventQueue(true);
    this.physics.createCollider(R.ColliderDesc.cuboid(100, .5, 100).setTranslation(0, -.5, 0).setFriction(.65));
    this.bodies = this.blocks.map(b => {
      const p = centerOf(b), q = orientations[b.orientation];
      const body = this.physics.createRigidBody(R.RigidBodyDesc.dynamic()
        .setTranslation(p.x, p.y + .002, p.z).setRotation(q)
        .setLinearDamping(.05).setAngularDamping(.1).setCcdEnabled(true)
        .setAdditionalSolverIterations(4));
      this.physics.createCollider(R.ColliderDesc.cuboid(1.8, .12, .36)
        .setMass(1).setFriction(.55).setRestitution(.05)
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS), body);
      return body;
    });
    this.playing = true; this.paused = false; this.slow = false;
    this.simulatedTime = 0; this.accumulator = 0; this.quakeRemaining = 0;
    this.setGhost(null); this.setHover(-1); this.toggleForces(false);
    if (this.autoFit) this.fit(false);
  }
  stopPhysics() {
    this.physics?.free(); this.events?.free();
    this.physics = null; this.events = null; this.bodies = [];
    this.playing = false; this.paused = false; this.slow = false; this.quakeRemaining = 0;
  }
  nudge(index = null) {
    if (!this.playing || !this.bodies.length) return;
    const dominos = this.record?.title === 'Domino garden';
    const i = index ?? (dominos ? 0 : Math.floor(this.bodies.length * .4));
    const body = this.bodies[i];
    if (!body) return;
    const p = body.translation(), size = this.blocks[i].size;
    const push = 8 + (this.bodies.length - i) * .35;
    const pushAlongX = size[0] < size[2];
    const centerX = this.blocks.reduce((sum,b) => sum + (b.x+b.size[0]/2)*SCALE,0) / this.blocks.length;
    const centerZ = this.blocks.reduce((sum,b) => sum + (b.z+b.size[2]/2)*SCALE,0) / this.blocks.length;
    const signX = Math.sign(p.x-centerX) || 1, signZ = Math.sign(p.z-centerZ) || 1;
    body.applyImpulseAtPoint({ x: dominos ? 0 : (pushAlongX ? push : push*.1)*signX, y: .05,
      z: dominos ? 2.4 : (pushAlongX ? push*.1 : push)*signZ },
      { x: p.x, y: p.y + size[1] * SCALE * .35, z: p.z }, true);
    this.onKnock?.(.9);
  }
  earthquake() { if (this.playing) this.quakeRemaining = 2.4; }
  tick(dt, force = false) {
    this.dirty = this.controls.update() || this.dirty;
    if (!this.playing || this.paused || (!force && this.manual)) return;
    const start = performance.now();
    this.accumulator += Math.min(dt, 1) * (this.slow ? .22 : 1);
    while (this.accumulator >= 1 / 60) {
      if (this.quakeRemaining > 0) {
        for (const body of this.bodies) {
          const h = body.translation().y;
          const x = Math.sin(this.simulatedTime * 10 + h * .45) * .62 * (1 + h * .12);
          const z = Math.cos(this.simulatedTime * 8 + h * .38) * .48 * (1 + h * .12);
          body.applyImpulse({ x, y: .006, z }, true);
        }
        this.quakeRemaining -= 1 / 60;
      }
      this.physics.step(this.events);
      this.events.drainCollisionEvents((_a, _b, started) => {
        if (started && this.simulatedTime > .22) this.onKnock?.(.25);
      });
      this.simulatedTime += 1 / 60; this.accumulator -= 1 / 60;
    }
    const q = new THREE.Quaternion();
    for (let i = 0; i < this.bodies.length; i++) {
      const p = this.bodies[i].translation(), r = this.bodies[i].rotation();
      matrix.compose(v.set(p.x, p.y, p.z), q.set(r.x, r.y, r.z, r.w), unit);
      this.planks.setMatrixAt(i, matrix);
    }
    this.planks.instanceMatrix.needsUpdate = true;
    this.planks.computeBoundingSphere();
    this.timings.physicsMs = performance.now() - start;
    this.shadowElapsed += dt;
    if (this.shadowElapsed > .08) {
      const shadowStart = performance.now();
      this.updateSoftShadow(); this.shadowElapsed = 0;
      this.timings.shadowMs = performance.now() - shadowStart;
    }
    this.renderer.shadowMap.needsUpdate = true; this.dirty = true;
  }
  draw() {
    const start = performance.now();
    this.renderer.info.reset();
    if (this.softwareRenderer) this.softwareRenderer.draw();
    else this.renderer.render(this.scene, this.camera);
    this.timings.drawMs = performance.now() - start;
    this.dirty = false; this.renderFrames++;
  }
  updateStats(dt) {
    this.frames++; this.frameTimes.push(dt * 1000);
    const now = performance.now();
    if (now - this.statsTime < 1000) return null;
    this.fps = Math.round(this.renderFrames * 1000 / (now - this.statsTime));
    const ms = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frames = 0; this.renderFrames = 0; this.frameTimes.length = 0; this.statsTime = now;
    if (!this.software && this.playing && !this.paused && !this.manual && this.simulatedTime > 1) {
      this.slowWindows = this.fps > 0 && this.fps < 30 ? this.slowWindows+1 : 0;
      if (this.slowWindows >= 2) this.useCanvasProjection();
    }
    const info = this.renderer.info;
    const heap = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : '';
    const activity = this.manual ? 'Stepped test' : this.playing && this.paused ? 'Paused'
      : this.fps ? `${this.fps} fps · ${ms.toFixed(0)} ms` : 'Ready';
    return `${activity} · ${info.render.calls} ${this.software ? 'faces' : 'draws'}\n${this.software ? 'Canvas fallback' : (info.render.triangles / 1000).toFixed(1)+'k triangles'} · ${info.memory.geometries} geo · ${heap}`;
  }
  state() {
    return {
      camera: { position: this.camera.position.toArray(), target: this.controls.target.toArray(), zoom: this.camera.zoom },
      hoveredPlankId: this.blocks[this.hovered]?.id ?? null,
      physicsTime: Number(this.simulatedTime.toFixed(3)), paused: this.paused, slowMotion: this.slow,
      quakeRemaining: this.quakeRemaining, fps: this.fps, softwareRendering: this.software,
      renderer: this.software ? 'full-resolution Canvas projection' : 'Three.js WebGL', timings: this.timings,
      renderFallbackReason: this.fallbackReason,
      rendering: { width: this.canvas.width, height: this.canvas.height, cssWidth: this.width, cssHeight: this.height, dpr: this.renderer.getPixelRatio(),
        calls: this.renderer.info.render.calls, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures },
      bodies: this.playing ? this.bodies.map((b, i) => ({ id: this.blocks[i].id, position: b.translation(), rotation: b.rotation(), sleeping: b.isSleeping() })) : [],
    };
  }
  dispose() {
    this.stopPhysics(); this.controls.dispose(); this.resizeObserver.disconnect(); this.clearForces();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    this.scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) { materials.add(m); if (m.map) textures.add(m.map); } });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    this.renderer.dispose();
  }
}
