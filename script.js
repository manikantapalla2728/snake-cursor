(() => {
'use strict';

/* ---------- setup ---------- */
const canvas = document.getElementById('stage');
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');
const RECORD = params.has('record');
const DEMO_LEN = 15;

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: false,
  powerPreference: 'high-performance', preserveDrawingBuffer: RECORD
});
renderer.setClearColor(0x000000, 1);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 10, 5000);
let W = 1, H = 1, camDist = 1000;

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camDist = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.set(W / 2, -H / 2, camDist);
  camera.updateProjectionMatrix();
  if (particleMat) particleMat.uniforms.uPR.value = renderer.getPixelRatio();
  if (particleMat) particleMat.uniforms.uDist.value = camDist;
}

/* ---------- lights ---------- */
scene.add(new THREE.AmbientLight(0x1a2a55, 0.9));
const key = new THREE.DirectionalLight(0x9fd8ff, 1.7); key.position.set(-300, 400, 600); scene.add(key);
const rim = new THREE.DirectionalLight(0x2a55ff, 1.3); rim.position.set(300, -300, -400); scene.add(rim);
const headLight = new THREE.PointLight(0x38d7ff, 2.2, 240); scene.add(headLight);

/* ---------- textures / materials ---------- */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
const glowTex = glowTexture();
function glowSprite(color, opacity) {
  const m = new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  return new THREE.Sprite(m);
}

const bodyMat = new THREE.MeshStandardMaterial({
  color: 0x0a4fd0, metalness: 0.55, roughness: 0.28, emissive: 0x0a5cff, emissiveIntensity: 0.55
});
const headMat = new THREE.MeshStandardMaterial({
  color: 0x1368ff, metalness: 0.5, roughness: 0.25, emissive: 0x0d6bff, emissiveIntensity: 0.7
});
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xbff8ff });
const fangMat = new THREE.MeshStandardMaterial({ color: 0xe8fbff, emissive: 0x7fe9ff, emissiveIntensity: 0.6, roughness: 0.2 });
const tongueMat = new THREE.MeshBasicMaterial({ color: 0x5fe6ff });

/* ---------- geometry (shared) ---------- */
const sphereGeo = new THREE.SphereGeometry(1, 22, 16);
const torusGeo = new THREE.TorusGeometry(1, 0.17, 8, 28);
const coneGeo = new THREE.ConeGeometry(1, 1, 10);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

/* ---------- body ---------- */
const N = 60, SPACING = 5;
const segs = [];            // {g, ringMat, glow, r}
const xs = new Float32Array(N), ys = new Float32Array(N); // screen-space chain
const wx = new Float32Array(N), wy = new Float32Array(N), wz = new Float32Array(N);

function radiusAt(i) {
  const t = i / (N - 1);
  if (t < 0.22) return 5.5 + (7.6 - 5.5) * (t / 0.22);
  return 7.6 * Math.pow(1 - (t - 0.22) / 0.78, 0.85) + 0.7;
}
const UP = new THREE.Vector3(0, 0.55, 0.85);

for (let i = 1; i < N; i++) {
  const r = radiusAt(i);
  const g = new THREE.Group(); g.up.copy(UP);
  const s = new THREE.Mesh(sphereGeo, bodyMat); s.scale.set(r, r, r * 1.35); g.add(s);
  const rm = new THREE.MeshStandardMaterial({
    color: 0x66e8ff, metalness: 0.7, roughness: 0.2, emissive: 0x22ccff, emissiveIntensity: 0.9
  });
  const ring = new THREE.Mesh(torusGeo, rm); ring.scale.setScalar(r * 1.02); g.add(ring);
  if (i % 2 === 0 && r > 2) {
    const sp = new THREE.Mesh(coneGeo, fangMat);
    sp.scale.set(r * 0.28, r * 0.7, r * 0.28); sp.position.y = r * 0.95; g.add(sp);
  }
  let glow = null;
  if (i % 3 === 0) { glow = glowSprite(0x1d7bff, 0.28); glow.scale.setScalar(r * 5); g.add(glow); }
  g.scale.setScalar(0.0001);
  scene.add(g);
  segs[i] = { g, ringMat: rm, glow, r };
}

/* ---------- head ---------- */
const head = new THREE.Group(); head.up.copy(UP);
const hInner = new THREE.Group(); hInner.position.z = 4; head.add(hInner);
const skull = new THREE.Mesh(sphereGeo, headMat); skull.scale.set(6.5, 5.5, 9); hInner.add(skull);
const snout = new THREE.Mesh(sphereGeo, headMat); snout.scale.set(4, 3.2, 6.5); snout.position.set(0, -0.6, 8); hInner.add(snout);
const jawPivot = new THREE.Group(); jawPivot.position.set(0, -2.6, 3); hInner.add(jawPivot);
const jaw = new THREE.Mesh(sphereGeo, headMat); jaw.scale.set(3.6, 1.7, 8); jaw.position.set(0, -0.2, 5); jawPivot.add(jaw);
for (const sx of [-1, 1]) {
  const eye = new THREE.Mesh(sphereGeo, eyeMat); eye.scale.setScalar(1.5); eye.position.set(sx * 4.4, 2.0, 5); hInner.add(eye);
  const eg = glowSprite(0x7fefff, 0.85); eg.scale.setScalar(14); eg.position.copy(eye.position); hInner.add(eg);
  const horn = new THREE.Mesh(coneGeo, bodyMat); horn.scale.set(1.6, 9, 1.6);
  horn.position.set(sx * 3.2, 4.8, -3); horn.rotation.x = -(Math.PI / 2 - 0.5); horn.rotation.z = -sx * 0.25; hInner.add(horn);
  const fang = new THREE.Mesh(coneGeo, fangMat); fang.scale.set(0.8, 3.2, 0.8);
  fang.position.set(sx * 2.2, -3.2, 10); fang.rotation.x = Math.PI; hInner.add(fang);
}
const tongue = new THREE.Group(); tongue.position.set(0, -2.2, 13); hInner.add(tongue);
const tStem = new THREE.Mesh(boxGeo, tongueMat); tStem.scale.set(0.5, 0.4, 6); tStem.position.z = 3; tongue.add(tStem);
for (const sx of [-1, 1]) {
  const pr = new THREE.Mesh(coneGeo, tongueMat); pr.scale.set(0.4, 3, 0.4);
  pr.position.set(sx * 0.9, 0, 7); pr.rotation.x = Math.PI / 2; pr.rotation.z = sx * 0.35; tongue.add(pr);
}
const headGlow = glowSprite(0x38d7ff, 0.5); headGlow.scale.setScalar(70); hInner.add(headGlow);
head.scale.setScalar(0.0001);
scene.add(head);

const tailGlow = glowSprite(0x4fe3ff, 0.8); tailGlow.scale.setScalar(26); scene.add(tailGlow);

/* ---------- particles ---------- */
const MAXP = 520;
const pPos = new Float32Array(MAXP * 3), pVel = new Float32Array(MAXP * 3);
const pLife = new Float32Array(MAXP), pMax = new Float32Array(MAXP).fill(1), pSize = new Float32Array(MAXP);
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aLife', new THREE.BufferAttribute(pLife, 1));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
var particleMat = new THREE.ShaderMaterial({
  uniforms: { uPR: { value: 1 }, uDist: { value: 1000 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `
    attribute float aSize; attribute float aLife; varying float vLife;
    uniform float uPR; uniform float uDist;
    void main(){
      vLife = aLife;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uPR * (uDist / -mv.z) * (0.4 + aLife * 0.6);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying float vLife;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d); a *= a;
      vec3 col = mix(vec3(0.05, 0.3, 1.0), vec3(0.5, 0.95, 1.0), vLife);
      gl_FragColor = vec4(col, a * vLife);
    }`
});
const points = new THREE.Points(pGeo, particleMat); points.frustumCulled = false; scene.add(points);
let pCursor = 0;
function spawn(x, y, z, vx, vy, vz, life, size) {
  const i = pCursor; pCursor = (pCursor + 1) % MAXP;
  pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
  pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
  pMax[i] = life; pLife[i] = 1; pSize[i] = size;
}

/* ---------- input ---------- */
const ptr = { x: 0, y: 0 };
let lastMove = 0, time = 0;
function onMove(e) {
  if (DEMO) return;
  ptr.x = e.clientX; ptr.y = e.clientY; lastMove = time;
}
window.addEventListener('pointermove', onMove, { passive: true });
window.addEventListener('pointerdown', onMove, { passive: true });
window.addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') toggleFS(); });
window.addEventListener('dblclick', toggleFS);
function toggleFS() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  else document.exitFullscreen && document.exitFullscreen();
}

/* ---------- demo path (15 s) ---------- */
const ease = t => t * t * (3 - 2 * t);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
function pathA(t) { // 3-7 s: smooth figure-eight
  const u = t - 3, k = ease(cl(u / 1.2, 0, 1));
  return [0.5 + 0.30 * Math.sin(u * 1.3) * k, 0.5 + 0.20 * Math.sin(u * 2.6) * k];
}
const WP = [[0.15, 0.25], [0.85, 0.30], [0.2, 0.78], [0.82, 0.72]];
function pathB(t, start) { // 7-11 s: fast sweeps
  const pts = [start, ...WP], u = cl((t - 7) / 4, 0, 1) * (pts.length - 1);
  const i = Math.min(Math.floor(u), pts.length - 2), f = ease(u - i);
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
}
function demoPointer(t) {
  const a7 = pathA(7);
  const bEnd = WP[WP.length - 1];
  let p;
  if (t < 3) p = [0.5, 0.5];
  else if (t < 7) p = pathA(t);
  else if (t < 11) p = pathB(t, a7);
  else {
    const u = cl((t - 11) / 2.4, 0, 1), e = ease(u), th = u * Math.PI * 3, r = 0.30 * Math.sin(Math.PI * u);
    p = [bEnd[0] + (0.5 - bEnd[0]) * e + Math.cos(th) * r * 0.9, bEnd[1] + (0.5 - bEnd[1]) * e + Math.sin(th) * r * 0.9];
  }
  return [p[0] * W, p[1] * H];
}

/* ---------- simulation state ---------- */
const hp = { x: 0, y: 0, vx: 0, vy: 0 };
let idleBlend = 0, wavePhase = 0, speedF = 0, speedS = 0;
const headDir = new THREE.Vector3(1, 0, 0);
const tmp = new THREE.Vector3();

function init() {
  resize();
  ptr.x = W / 2; ptr.y = H / 2;
  hp.x = ptr.x; hp.y = ptr.y;
  for (let i = 0; i < N; i++) { xs[i] = hp.x - i * SPACING; ys[i] = hp.y; }
  burst(hp.x, -hp.y, 140);
}
function burst(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = 40 + Math.random() * 200;
    spawn(x, y, (Math.random() - 0.5) * 30, Math.cos(a) * s, Math.sin(a) * s, 0, 0.7 + Math.random() * 0.9, 4 + Math.random() * 7);
  }
}
const easeOutBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/* ---------- frame ---------- */
let last = performance.now(), emitAcc = 0, rafId = 0, recorder = null, recChunks = [], recDone = false, introPulse = 0;

function startRecording() {
  if (!RECORD || !window.MediaRecorder || !canvas.captureStream) return;
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  recorder = new MediaRecorder(canvas.captureStream(60), { mimeType: mime, videoBitsPerSecond: 12e6 });
  recorder.ondataavailable = e => e.data.size && recChunks.push(e.data);
  recorder.onstop = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(recChunks, { type: 'video/webm' }));
    a.download = 'neon_serpent_preview.webm'; a.click();
  };
  recorder.start();
}

function frame(now) {
  rafId = requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
  if (dt <= 0) return;
  time += dt;

  if (DEMO) {
    const [dx, dy] = demoPointer(Math.min(time, DEMO_LEN));
    if (Math.hypot(dx - ptr.x, dy - ptr.y) > 0.6) lastMove = time;
    ptr.x = dx; ptr.y = dy;
    if (RECORD && !recorder && !recDone) startRecording();
    if (RECORD && recorder && time >= DEMO_LEN && !recDone) { recDone = true; recorder.stop(); }
  }

  /* idle blending */
  const idleTarget = (time - lastMove) > 0.7 ? 1 : 0;
  idleBlend += (idleTarget - idleBlend) * (1 - Math.exp(-2.5 * dt));

  /* head spring (critically-ish damped, slight overshoot = inertia) */
  const a = time * 0.8;
  const tx = ptr.x + 14 + Math.cos(a) * 45 * idleBlend;
  const ty = ptr.y + 12 + Math.sin(a * 2) * 28 * idleBlend;
  const K = 121, C = 18;
  hp.vx += ((tx - hp.x) * K - hp.vx * C) * dt;
  hp.vy += ((ty - hp.y) * K - hp.vy * C) * dt;
  hp.x += hp.vx * dt; hp.y += hp.vy * dt;
  const speed = Math.hypot(hp.vx, hp.vy);
  speedF = cl(speed / 900, 0, 1);
  speedS += (speedF - speedS) * (1 - Math.exp(-6 * dt));

  /* follow-the-leader chain */
  xs[0] = hp.x; ys[0] = hp.y;
  for (let i = 1; i < N; i++) {
    let dx = xs[i - 1] - xs[i], dy = ys[i - 1] - ys[i];
    const d = Math.hypot(dx, dy) || 1, k = SPACING / d;
    xs[i] = xs[i - 1] - dx * k; ys[i] = ys[i - 1] - dy * k;
  }

  /* sinuous wave on top of the chain */
  wavePhase += dt * (3 + speedS * 6);
  const amp = (2.5 + 7 * idleBlend) * (1 - 0.5 * speedS);
  for (let i = 0; i < N; i++) {
    const p = Math.max(i - 1, 0), n = Math.min(i + 1, N - 1);
    let tx2 = xs[p] - xs[n], ty2 = ys[p] - ys[n];
    const l = Math.hypot(tx2, ty2) || 1; tx2 /= l; ty2 /= l;
    const env = 0.25 + 0.75 * (i / (N - 1)), ph = wavePhase - i * 0.38;
    const off = Math.sin(ph) * amp * env;
    wx[i] = xs[i] + (-ty2) * off;
    wy[i] = -(ys[i] + tx2 * off);          // world y is up
    wz[i] = Math.cos(ph) * radiusAt(i) * 0.7 * (0.3 + idleBlend * 0.7);
  }

  /* intro growth */
  const intro = cl(time / 2.2, 0, 1);
  const grow = t01 => easeOutBack(cl(intro * 1.6 - t01 * 0.6, 0, 1));

  /* apply to segments */
  for (let i = 1; i < N; i++) {
    const s = segs[i], p = Math.max(i - 1, 0), n = Math.min(i + 1, N - 1);
    s.g.position.set(wx[i], wy[i], wz[i]);
    tmp.set(wx[i] + (wx[p] - wx[n]), wy[i] + (wy[p] - wy[n]), wz[i]);
    s.g.lookAt(tmp);
    s.g.scale.setScalar(Math.max(0.0001, grow(i / (N - 1))));
    const e = 0.5 + 0.5 * Math.sin(i * 0.35 - time * 5);
    s.ringMat.emissiveIntensity = 0.5 + 1.6 * e * e * e + speedS * 0.6;
    if (s.glow) s.glow.material.opacity = 0.22 + 0.2 * e + speedS * 0.2;
  }

  /* head */
  tmp.set(wx[0] - wx[2], wy[0] - wy[2], 0).normalize();
  if (speed > 120) tmp.lerp(new THREE.Vector3(hp.vx, -hp.vy, 0).normalize(), 0.5).normalize();
  headDir.lerp(tmp, 1 - Math.exp(-12 * dt)).normalize();
  head.position.set(wx[0], wy[0], wz[0]);
  tmp.copy(head.position).add(headDir);
  head.lookAt(tmp);
  head.scale.setScalar(Math.max(0.0001, grow(0)));
  headLight.position.set(wx[0], wy[0], 60);
  const open = 0.08 + speedS * 0.35 + 0.06 * Math.sin(time * 2) + 0.2 * Math.max(0, Math.sin(time * 0.9 + 1) - 0.8) * 5 * 0.2;
  jawPivot.rotation.x = open;
  const flick = Math.max(0, Math.sin(time * 1.7) - 0.9) * 10;
  tongue.scale.z = 0.15 + Math.min(1, flick);
  headGlow.material.opacity = 0.4 + 0.15 * Math.sin(time * 3) + speedS * 0.2;

  tailGlow.position.set(wx[N - 1], wy[N - 1], wz[N - 1]);
  tailGlow.material.opacity = 0.5 + 0.3 * Math.sin(time * 4) + speedS * 0.2;

  /* particles */
  emitAcc += dt * (22 + speedS * 240);
  while (emitAcc > 1) {
    emitAcc -= 1;
    const i = 1 + Math.floor(Math.random() * (N - 1)), r = radiusAt(i);
    const back = -speed * 0.05;
    spawn(wx[i] + (Math.random() - 0.5) * r, wy[i] + (Math.random() - 0.5) * r, wz[i] + (Math.random() - 0.5) * r,
      headDir.x * back + (Math.random() - 0.5) * 40, headDir.y * back + (Math.random() - 0.3) * 40, (Math.random() - 0.5) * 20,
      0.6 + Math.random() * 0.9, 3 + Math.random() * 6 * (0.5 + speedS));
  }
  if (introPulse === 0 && time > 0.05) { introPulse = 1; burst(wx[0], wy[0], 90); }
  for (let i = 0; i < MAXP; i++) {
    if (pLife[i] <= 0) { pSize[i] = 0; continue; }
    pLife[i] -= dt / pMax[i];
    if (pLife[i] < 0) pLife[i] = 0;
    const j = i * 3, drag = Math.exp(-1.8 * dt);
    pVel[j] *= drag; pVel[j + 1] = pVel[j + 1] * drag + 18 * dt; pVel[j + 2] *= drag;
    pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.aLife.needsUpdate = true;
  pGeo.attributes.aSize.needsUpdate = true;

  renderer.render(scene, camera);
}

/* ---------- lifecycle / disposal ---------- */
function dispose() {
  cancelAnimationFrame(rafId);
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
  });
  [sphereGeo, torusGeo, coneGeo, boxGeo, pGeo].forEach(g => g.dispose());
  glowTex.dispose(); renderer.dispose();
}
window.addEventListener('pagehide', dispose);
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { last = performance.now(); });

init();
rafId = requestAnimationFrame(frame);
})();
