"""Write a self-contained three.js page for a build with inclined blocks.
usage: python3 -I make_tilt_viewer.py DEMO.json OUT.html TITLE"""
import json, sys
d = json.load(open(sys.argv[1]))
def q(v):
    if isinstance(v, str):
        a, *b = v.split("/"); return int(a) / int(b[0]) if b else float(a)
    return float(v)
SIZE = {"flat": (15, 3, 1), "edge": (15, 1, 3), "upright": (3, 1, 15)}
boxes = []
for st in d["steps"]:
    for b in st["blocks"]:
        c, s = q(b["rot"]["c"]), q(b["rot"]["s"])
        import math
        boxes.append({"size": SIZE[b["up"]], "c": [q(v) for v in b["center"]], "yaw": math.atan2(s, c), "pitch": 0, "inc": False})
for b in d.get("inclined", []):
    sx, sy, sz = SIZE[b["up"]]
    boxes.append({"size": (b.get("length", 15), sy, sz), "c": b["center"], "yaw": 0, "pitch": math.radians(b["pitchDeg"]), "inc": True})
html = """<!doctype html><html><head><meta charset="utf-8"><title>%s</title>
<style>body{margin:0;background:#faf7f2;font:14px system-ui;color:#2b2420}#v{width:100vw;height:100vh}
#t{position:absolute;left:14px;top:10px;background:rgba(255,255,255,.85);padding:6px 10px;border-radius:8px}</style>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script></head><body><div id="t">%s<br><small>%d blocks (%d inclined, drawn in a darker tone with ?mark=1)</small></div><div id="v"></div>
<script>
const B=%s, q=new URLSearchParams(location.search), mark=q.has('mark'), view=q.get('view')||'q';
const el=document.getElementById('v'), W=innerWidth, H=innerHeight;
const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(32,W/H,1,3000); cam.up.set(0,0,1);
const ren=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); ren.setSize(W,H); ren.setClearColor(0xfaf7f2); el.appendChild(ren.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x887766,0.9)); const sun=new THREE.DirectionalLight(0xffffff,0.6); sun.position.set(40,-80,120); scene.add(sun);
const g=new THREE.Mesh(new THREE.PlaneGeometry(260,120),new THREE.MeshLambertMaterial({color:0xb8b0a6})); scene.add(g);
const wood=new THREE.MeshLambertMaterial({color:0xe2b47a}), dark=new THREE.MeshLambertMaterial({color:mark?0xb87a3a:0xe2b47a});
const em=new THREE.LineBasicMaterial({color:0x6b4a2b,transparent:true,opacity:.45});
for(const b of B){const geo=new THREE.BoxGeometry(...b.size), m=new THREE.Mesh(geo,b.inc?dark:wood);
  m.position.set(...b.c); m.rotation.order='ZYX'; m.rotation.z=b.yaw; m.rotation.y=-b.pitch;
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),em)); scene.add(m);}
const views={side:[0,-260,34], q:[150,-210,120], low:[110,-170,30]};
const p=views[view]||views.q; cam.position.set(...p); cam.lookAt(0,0,30);
if (THREE.OrbitControls) {}
let ang=0; function draw(){ren.render(scene,cam);} draw();
// drag to turn
let down=null; el.onmousedown=e=>down=[e.clientX,ang]; onmouseup=()=>down=null;
onmousemove=e=>{if(!down)return; ang=down[1]+(e.clientX-down[0])*0.005; const r=Math.hypot(p[0],p[1]), a0=Math.atan2(p[1],p[0]);
  cam.position.set(r*Math.cos(a0+ang), r*Math.sin(a0+ang), p[2]); cam.lookAt(0,0,30); draw();};
</script></body></html>""" % (sys.argv[3], sys.argv[3], len(boxes), sum(b["inc"] for b in boxes), json.dumps(boxes))
open(sys.argv[2], "w").write(html)
print("wrote", sys.argv[2], len(boxes), "boxes")
