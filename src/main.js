// Ecos del Monte — bucle principal, jugador, criatura, misiones e interfaz.
import * as THREE from 'three';
import { buildTolima, buildBogota, place, glowTex, loadTextures, GFX, PROP } from './world.js';
import { loadProps, makeProp } from './props.js';
import { makePerson, makePatasola, makeDog, makeItem, applyTextures, animatePerson } from './entities.js';
import { loadModels } from './models.js';
import { makeVehicle, driveVehicle, syncVehicle } from './vehicles.js';
import { createLife } from './life.js';
import { LIBRE, MISSIONS, RUMORS } from './chapters/libre.js';
import { GOODS } from './items.js';
import { AudioSys } from './audio.js';
import { CHAPTERS } from './chapters/index.js';
import { clamp, lerp, wrapAngle } from './util.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const SELFTEST = Q.has('selftest');
const AUTO = Q.has('auto') || SELFTEST;

function showErr(m) { const el = $('err'); el.style.display = 'block'; el.textContent += m + '\n'; document.title = 'ERROR'; }
addEventListener('error', (e) => showErr(`${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}`));
addEventListener('unhandledrejection', (e) => showErr('Promesa: ' + (e.reason?.stack || e.reason)));

// ---------- Ambientes: el miedo sube parte a parte ----------
const A = (wind, crickets, rain, drone) => ({ wind, crickets, rain, drone });
const ENV = {
  BOGOTA: { sky: 0x0a0d14, fog: 0.03, hemi: 0.75, hemiCol: 0x6f7f9c, sun: 0, sunCol: 0x8899bb, stars: 0, fear: 0.15, view: 200, night: 1, flies: 0, amb: A(0.05, 0, 0.11, 0) },
  DUSK: { sky: 0xd08a5c, fog: 0.0055, hemi: 2.3, hemiCol: 0xffc9a0, sun: 2.2, sunCol: 0xffa060, stars: 0, fear: 0, view: 430, night: 0.25, flies: 0, amb: A(0.07, 0.22, 0, 0) },
  DUSK2: { sky: 0x7d5560, fog: 0.009, hemi: 1.5, hemiCol: 0xd8a8a8, sun: 1.0, sunCol: 0xff8050, stars: 0.1, fear: 0.1, view: 340, night: 0.6, flies: 0.4, amb: A(0.08, 0.3, 0, 0.02) },
  TWILIGHT: { sky: 0x1e2a44, fog: 0.014, hemi: 0.9, hemiCol: 0x7f95c8, sun: 0.25, sunCol: 0x8fa8ff, stars: 0.5, fear: 0.25, view: 260, night: 0.9, flies: 1, amb: A(0.09, 0.4, 0, 0.05) },
  NIGHT1: { sky: 0x070b13, fog: 0.021, hemi: 0.72, hemiCol: 0x5a6f99, sun: 0.3, sunCol: 0x8fa8dd, stars: 1, fear: 0.45, view: 200, night: 1, flies: 0.8, amb: A(0.1, 0.42, 0, 0.09) },
  NIGHT2: { sky: 0x05080d, fog: 0.027, hemi: 0.58, hemiCol: 0x4f6390, sun: 0.24, sunCol: 0x8fa8dd, stars: 1, fear: 0.6, view: 170, night: 1, flies: 0.4, amb: A(0.13, 0.3, 0, 0.14) },
  NIGHT3: { sky: 0x030507, fog: 0.033, hemi: 0.46, hemiCol: 0x44557c, sun: 0.18, sunCol: 0x8fa8dd, stars: 0.8, fear: 0.78, view: 150, night: 1, flies: 0, amb: A(0.17, 0.12, 0, 0.2) },
  BLOOD: { sky: 0x0e0304, fog: 0.034, hemi: 0.5, hemiCol: 0x9a4a40, sun: 0.32, sunCol: 0xff4030, stars: 0.6, fear: 1, view: 150, night: 1, flies: 0, amb: A(0.2, 0, 0, 0.3) },
  MENU: { sky: 0x18223a, fog: 0.011, hemi: 1.0, hemiCol: 0x7f95c8, sun: 0.35, sunCol: 0x8fa8ff, stars: 0.8, fear: 0.3, view: 300, night: 1, flies: 1, amb: A(0.09, 0.35, 0, 0.06) },
  DAY: { sky: 0x8fbfe6, fog: 0.0035, hemi: 2.6, hemiCol: 0xffffff, sun: 3.0, sunCol: 0xfff4e0, stars: 0, fear: 0, view: 460, night: 0, flies: 0, amb: A(0.06, 0.08, 0, 0) },
  DAWN: { sky: 0xe6b58c, fog: 0.007, hemi: 2.4, hemiCol: 0xffe0c0, sun: 2.0, sunCol: 0xffc890, stars: 0, fear: 0, view: 430, night: 0, flies: 0, amb: A(0.05, 0.04, 0, 0) },
};

// Hora que marca el reloj en cada ambiente de la historia, y ambiente que toca a cada hora en el mundo libre.
const HOURS = { BOGOTA: 22.75, DUSK: 17.6, DUSK2: 18.15, TWILIGHT: 18.6, NIGHT1: 20.5, NIGHT2: 23.2, NIGHT3: 2.4, BLOOD: 3.5, DAWN: 5.9, DAY: 9 };
const freeEnv = (h) => (h < 5 ? 'NIGHT3' : h < 5.6 ? 'TWILIGHT' : h < 6.6 ? 'DAWN' : h < 17.2 ? 'DAY' : h < 17.9 ? 'DUSK' : h < 18.5 ? 'DUSK2' : h < 19.5 ? 'TWILIGHT' : h < 22.5 ? 'NIGHT1' : 'NIGHT2');

// ---------- Render ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080d);
scene.fog = new THREE.FogExp2(0x05080d, 0.02);
const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1600);
camera.rotation.order = 'YXZ';
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1); sun.position.set(-60, 90, 40); scene.add(sun);
const spot = new THREE.SpotLight(0xfff0d0, 0, 62, 0.52, 0.6, 1.6);
// La linterna (o los faros) cuelga de este soporte, que sigue a la cámara, al personaje o al vehículo.
const rig = new THREE.Object3D(); rig.rotation.order = 'YXZ'; scene.add(rig);
spot.position.set(0.22, -0.18, 0); rig.add(spot);
spot.target.position.set(0, -0.05, -6); rig.add(spot.target);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

const stars = (() => {
  const n = 700, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, y = Math.random() * 0.9 + 0.08, r = Math.sqrt(1 - y * y);
    p[i * 3] = Math.cos(a) * r * 900; p[i * 3 + 1] = y * 900; p[i * 3 + 2] = Math.sin(a) * r * 900;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  m.frustumCulled = false; scene.add(m);
  return m;
})();
const moon = new THREE.Mesh(new THREE.SphereGeometry(28, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdfe6ff, fog: false, transparent: true, opacity: 0 }));
scene.add(moon);
const FLY = 130, flyOff = [], flyPos = new Float32Array(FLY * 3);
for (let i = 0; i < FLY; i++) flyOff.push([Math.random() * 44 - 22, Math.random() * 3.2 + 0.3, Math.random() * 44 - 22, Math.random() * 6.28]);
const flyGeo = new THREE.BufferGeometry(); flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: 0xd8ff70, size: 0.34, map: glowTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
flies.frustumCulled = false; scene.add(flies);

// ---------- Estado ----------
const audio = new AudioSys();
let save = {};
try { save = JSON.parse(localStorage.getItem('ecos-save') || '{}'); } catch { save = {}; }
const persist = () => { try { localStorage.setItem('ecos-save', JSON.stringify(save)); } catch { /* sin almacenamiento */ } };

// ---------- Calidad gráfica: texturas PBR y sombras (alta) o color plano sin sombras (baja) ----------
GFX.hi = !(Q.get('q') === 'low' || save.q === 'baja');
renderer.shadowMap.enabled = GFX.hi;
renderer.debug.onShaderError = (gl, program, vs, fs) => showErr('Shader: ' + (gl.getProgramInfoLog(program) || '') + ' ' + (gl.getShaderInfoLog(vs) || '') + ' ' + (gl.getShaderInfoLog(fs) || ''));
if (GFX.hi) {
  // La linterna proyecta sombras y lleva una "galleta": el patrón de anillos de un foco real.
  const ck = document.createElement('canvas'); ck.width = ck.height = 256;
  const cg = ck.getContext('2d'); cg.fillStyle = '#000'; cg.fillRect(0, 0, 256, 256);
  const gr = cg.createRadialGradient(128, 128, 0, 128, 128, 126);
  [[0, '#ffffff'], [0.16, '#fff6dc'], [0.3, '#b9ae93'], [0.6, '#91886f'], [0.7, '#cbc1a4'], [0.8, '#6f6857'], [1, '#000000']].forEach(([p, c]) => gr.addColorStop(p, c));
  cg.fillStyle = gr; cg.beginPath(); cg.arc(128, 128, 126, 0, 6.3); cg.fill();
  const cookie = new THREE.CanvasTexture(ck); cookie.colorSpace = THREE.SRGBColorSpace;
  spot.castShadow = true; spot.map = cookie;
  spot.shadow.mapSize.set(1024, 1024); spot.shadow.camera.near = 0.4; spot.shadow.camera.far = 62; spot.shadow.bias = -0.0012; spot.shadow.normalBias = 0.04;
  // El sol y la luna proyectan sombra en una zona que sigue al jugador.
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 320;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.08;
  scene.add(sun.target);
} else renderer.setPixelRatio(1);
if (save.pesos == null) save.pesos = 40;   // viáticos de El Vespertino
if (!save.bag) save.bag = {};

const G = {
  state: 'boot', time: 0, chapter: CHAPTERS[0], partIdx: 0, stepIdx: -1, part: null, step: null, ss: { left: 0, t: 0 },
  region: null, regions: {}, dyn: new THREE.Group(), inter: [], npcs: {}, targets: [], timers: [], inv: save.inv || [], notes: save.notes || [],
  shake: 0, threat: 0, subT: 0, cur: null, noLock: false, lockFails: 0, lockFailT: 0, unlockAcc: 0, manualPause: false, envName: 'NIGHT1', deadT: 0, frame: 0,
  hour: 19, mission: null, way: null, route: null, routeT: 0, vehicles: [], life: null, freeT: 0, candles: [], actors: [], talker: null, dt: 0.016,
};
scene.add(G.dyn);
const P = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, vx: 0, vz: 0, health: 100, stamina: 100, tired: false, battery: 100, hasLight: false, lightOn: false, crouch: 0, bob: 0, stepAcc: 0, lastHurt: -99, sprintT: -9, mode: 'foot', view: save.view === 'tp' ? 'tp' : 'fp', veh: null, mouseT: -9, boost: 0 };

// ---------- Ambiente ----------
const envCur = { sky: new THREE.Color(0x05080d), hemiCol: new THREE.Color(0x5a6f99), sunCol: new THREE.Color(0x8fa8dd), fog: 0.02, hemi: 0.4, sun: 0.2, stars: 1, fear: 0.4, view: 200, night: 1, flies: 0 };
let envT = ENV.NIGHT1;
const tmpC = new THREE.Color();
function setEnv(name, snap) { envT = ENV[name]; G.envName = name; audio.setAmb(envT.amb); if (snap) stepEnv(1); }
function stepEnv(k) {
  envCur.sky.lerp(tmpC.set(envT.sky), k); envCur.hemiCol.lerp(tmpC.set(envT.hemiCol), k); envCur.sunCol.lerp(tmpC.set(envT.sunCol), k);
  for (const f of ['fog', 'hemi', 'sun', 'stars', 'fear', 'view', 'night', 'flies']) envCur[f] = lerp(envCur[f], envT[f], k);
  scene.background.copy(envCur.sky); scene.fog.color.copy(envCur.sky); scene.fog.density = envCur.fog;
  hemi.color.copy(envCur.hemiCol); hemi.groundColor.copy(envCur.hemiCol).multiplyScalar(0.35); hemi.intensity = envCur.hemi;
  sun.color.copy(envCur.sunCol); sun.intensity = envCur.sun;
  if (GFX.hi) { const want = envT.sun >= 0.6; if (sun.castShadow !== want) sun.castShadow = want; }   // de noche basta la sombra de la linterna
  stars.material.opacity = envCur.stars * 0.9; moon.material.opacity = clamp(envCur.stars * 1.3, 0, 1); moon.material.color.copy(envCur.sunCol);
  if (G.region) G.region.setNight(envCur.night);
}
function updateSky() {
  stars.position.copy(camera.position);
  moon.position.set(camera.position.x - 520, camera.position.y + 620, camera.position.z - 700);
  const fo = envCur.flies * (G.region && G.region.name === 'tolima' ? 1 : 0);
  flies.visible = fo > 0.02;
  if (flies.visible) {
    for (let i = 0; i < FLY; i++) {
      const o = flyOff[i], bx = Math.floor((P.pos.x - o[0]) / 44 + 0.5) * 44 + o[0], bz = Math.floor((P.pos.z - o[2]) / 44 + 0.5) * 44 + o[2];
      flyPos[i * 3] = bx + Math.sin(G.time * 0.7 + o[3]) * 1.2;
      flyPos[i * 3 + 1] = P.pos.y + o[1] + Math.sin(G.time * 1.3 + o[3] * 2) * 0.4;
      flyPos[i * 3 + 2] = bz + Math.cos(G.time * 0.6 + o[3]) * 1.2;
    }
    flyGeo.attributes.position.needsUpdate = true;
    flies.material.opacity = fo * (0.55 + Math.sin(G.time * 2.3) * 0.35);
  }
}
function setRegion(name) {
  if (G.region && G.region.name === name) return;
  if (G.region) scene.remove(G.region.group);
  if (!G.regions[name]) G.regions[name] = name === 'bogota' ? buildBogota() : buildTolima(GFX.hi ? 1 : 0.6);
  G.region = G.regions[name]; scene.add(G.region.group);
}

// ---------- Interfaz ----------
function sub(text, secs = 4) { const el = $('sub'); el.textContent = text; el.style.opacity = 1; G.subT = secs; }
function flash() { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 0.75; requestAnimationFrame(() => { f.style.transition = 'opacity .7s'; f.style.opacity = 0; }); }
let redT = 0;
function flashRed(v) { redT = Math.max(redT, v); }
function fadeTo(v, ms) {
  const f = $('fade');
  if (AUTO || !ms) { f.style.transition = 'none'; f.style.opacity = v; return Promise.resolve(); }
  f.style.transition = `opacity ${ms}ms linear`; f.style.opacity = v;
  return new Promise((r) => setTimeout(r, ms + 30));
}
// Bloqueo del ratón. Un rechazo aislado (por ejemplo, justo después de Esc) no cuenta:
// solo tras varios fallos seguidos se pasa al modo de arrastrar para mirar.
function lockFail() {
  const n = performance.now();
  if (n - G.lockFailT < 250) return;
  G.lockFailT = n;
  if (++G.lockFails >= 3) G.noLock = true;
}
function lock() {
  if (AUTO) return;
  if (!canvas.requestPointerLock) { G.noLock = true; return; }
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(lockFail); } catch { lockFail(); }
}
const locked = () => document.pointerLockElement === canvas;
const isPaused = () => G.state === 'play' && !AUTO && (G.manualPause || G.unlockAcc > 0.35);
document.addEventListener('pointerlockchange', () => { if (locked()) { G.lockFails = 0; G.noLock = false; } });
document.addEventListener('pointerlockerror', lockFail);

// Voz: síntesis del navegador. Prefiere una voz de Colombia (es-CO); si no hay, otra de Latinoamérica.
const VOICE = {};
for (const id in CHAPTERS[0].npcs) VOICE[CHAPTERS[0].npcs[id].name] = CHAPTERS[0].npcs[id].voice;
let voices = [];
function loadVoices() { voices = (window.speechSynthesis ? speechSynthesis.getVoices() : []).filter((v) => /^es/i.test(v.lang)); }
if (window.speechSynthesis) { loadVoices(); speechSynthesis.addEventListener('voiceschanged', loadVoices); }
function pickVoice(female) {
  const rank = (v) => (/es[-_]CO/i.test(v.lang) ? 0 : /es[-_](419|MX|US|VE|PE|EC|AR|CL)/i.test(v.lang) ? 1 : 2);
  const sorted = [...voices].sort((a, b) => rank(a) - rank(b));
  const re = female ? /salome|sabina|dalia|helena|laura|elvira|paulina|monica|catalina|paola|female|mujer/i : /gonzalo|jorge|raul|pablo|alvaro|diego|andres|male|hombre/i;
  return sorted.find((v) => re.test(v.name) && rank(v) === rank(sorted[0])) || sorted.find((v) => re.test(v.name)) || sorted[0] || null;
}
function speak(who, text) {
  if (AUTO || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const vo = VOICE[who];
  if (!vo || !text) return;
  const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, " "));
  const v = pickVoice(vo.f);
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-CO';
  u.pitch = vo.pitch; u.rate = vo.rate; u.volume = 1;
  speechSynthesis.speak(u);
}
let PHOTOS = {};
const photosReady = fetch('fotos/creditos.json').then((r) => (r.ok ? r.json() : {})).then((j) => { PHOTOS = j || {}; }).catch(() => {});
const photoFor = (region, i) => { const a = PHOTOS[region] || []; return a.length ? a[i % a.length] : null; };

let dlg = null;
function openDialog(lines, onEnd, kind = '') {
  if (AUTO) { if (onEnd) onEnd(); return; }
  dlg = { lines, i: 0, onEnd, t: 0 };
  G.state = 'dialog'; $('dialog').className = kind; $('dialog').style.display = 'block'; $('prompt').style.opacity = 0; $('keys').style.visibility = 'hidden';
  showLine();
}
function showLine() { const [who, text] = dlg.lines[dlg.i]; $('dlg-who').textContent = who; $('dlg-text').textContent = text; dlg.t = performance.now(); audio.page(); speak(who, text); }
function advanceDialog() {
  if (!dlg || performance.now() - dlg.t < 250) return;
  if (++dlg.i < dlg.lines.length) return showLine();
  if (window.speechSynthesis) speechSynthesis.cancel();
  const cb = dlg.onEnd; dlg = null; $('dialog').style.display = 'none'; $('keys').style.visibility = 'visible'; G.state = 'play';
  if (cb) cb();
}
function showNote(title, text, onEnd) {
  if (!G.notes.some((n) => n[0] === title && n[1] === text)) G.notes.push([title, text]);
  openDialog([[title, text]], onEnd, 'note');
}
let cardCb = null, cardT = 0, cardLock = true;
function showCard(c, cb, doLock = true) {
  if (AUTO) { cb(); return; }
  G.state = 'card'; cardCb = cb; cardT = performance.now(); cardLock = doLock;
  $('card-kicker').textContent = c.kicker || ''; $('card-title').textContent = c.title;
  $('card-lines').innerHTML = (c.lines || []).map((l) => `<p>${l}</p>`).join('');
  $('card-hint').textContent = c.hint || 'Clic o Enter para continuar';
  const ph = c.photo;
  $('card').style.backgroundImage = ph ? 'linear-gradient(rgba(4,5,6,.55), rgba(4,5,6,.86)), url(' + ph.src + ')' : 'none';
  $('card-credit').textContent = ph ? 'Foto: ' + ph.title + ' — ' + ph.credit : '';
  $('card').style.display = 'flex';
}
function cardContinue() {
  if (!cardCb || performance.now() - cardT < 600) return;
  const cb = cardCb; cardCb = null; $('card').style.display = 'none';
  audio.init(); audio.setAmb(envT.amb);
  if (cardLock) lock();
  cb();
}
function give(name) { if (!G.inv.includes(name)) G.inv.push(name); }
function objectiveText() {
  const st = G.step; if (!st) return G.part && G.part.free && !G.mission ? 'Anda por donde quieras. Las letras del mapa (M) son vecinos con encargos' : '…';
  let t = st.text;
  if (st.type === 'interact') { const all = G.targets.filter((x) => !x.d.optional); if (all.length > 1) t += ` (${all.filter((x) => x.done).length}/${all.length})`; }
  return t;
}
function refreshObjective() {
  $('obj-part').textContent = G.part.free ? 'Mundo libre' + (G.mission ? ' · ' + G.mission.title : '') : `${G.chapter.kicker} · Parte ${G.partIdx + 1} de ${G.chapter.parts.length} · ${G.part.title}`;
  $('obj-text').textContent = objectiveText();
}
function openJournal() {
  const ch = G.chapter; G.state = 'journal';
  let h = `<h2>${ch.kicker} — ${ch.name}</h2><p class="dim">${G.part.free ? 'Mundo libre' : 'Parte ' + (G.partIdx + 1) + ' de ' + ch.parts.length} · ${G.part.title} · ${G.part.place}</p><h3>Objetivo</h3><p>${objectiveText()}</p>`;
  h += `<h3>Llevas contigo</h3><p>${G.inv.length ? G.inv.join(' · ') : 'Nada todavía.'}</p>`;
  if (G.part.free || G.partIdx >= ch.codex.from) h += `<h3>El mito · ${ch.codex.title}</h3><p>${ch.codex.text}</p>`;
  h += '<h3>Notas</h3>' + (G.notes.length ? G.notes.map((n) => `<p><b>${n[0]}.</b> ${n[1]}</p>`).join('') : '<p>Sin notas todavía.</p>');
  h += '<p class="dim" style="margin-top:30px">Tab para cerrar</p>';
  $('journal-body').innerHTML = h; $('journal').style.display = 'flex';
}
function closeJournal() { $('journal').style.display = 'none'; G.state = 'play'; }

// brújula
const cardEls = [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['O', -Math.PI / 2]].map(([t, b]) => { const s = document.createElement('span'); s.textContent = t; $('compass').appendChild(s); return [s, b]; });
const markEls = [0, 1, 2, 3].map(() => { const i = document.createElement('i'); $('compass').appendChild(i); return i; });
function markers() {
  const st = G.step; if (!st || st.markers === false) return [];
  if (st.type === 'talk') { const n = G.npcs[st.npc]; return n ? [n] : []; }
  if (st.type === 'reach') { const p = st._p || (st._p = place(st.at)); return [{ x: p[0], z: p[1] }]; }
  if (st.type === 'interact') return G.targets.filter((t) => t.active && !t.done).slice(0, 4).map((t) => ({ x: t.x, z: t.z, q: !!t.d.mystery }));
  return [];
}
function updateCompass() {
  const head = -P.yaw, H = 220, SP = 1.62;
  for (const [el, b] of cardEls) { const rel = wrapAngle(b - head); el.style.display = Math.abs(rel) < SP ? 'block' : 'none'; el.style.left = H + (rel / SP) * H + 'px'; }
  const ms = markers();
  markEls.forEach((el, i) => {
    const m = ms[i]; if (!m) { el.style.display = 'none'; return; }
    const dx = m.x - P.pos.x, dz = m.z - P.pos.z, rel = wrapAngle(Math.atan2(dx, -dz) - head), cl = clamp(rel, -SP, SP);
    el.style.display = 'block'; el.style.left = H + (cl / SP) * H + 'px';
    el.className = (m.q ? 'q ' : '') + (cl !== rel ? 'edge' : '');
    el.textContent = Math.round(Math.hypot(dx, dz)) + ' m';
  });
}
const grainCtx = $('grain').getContext('2d'), grainImg = grainCtx.createImageData(320, 180);
function updateGrain() {
  const d = grainImg.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  grainCtx.putImageData(grainImg, 0, 0);
}

// ---------- Minimapa (arriba a la derecha): gira con la mirada, el norte se marca en el borde ----------
const mctx = $('minimap').getContext('2d'), MM = 184, MR = 86;
function drawMinimap() {
  const rg = G.region, map = rg.map;
  if (!map) return;
  const k = MR / (rg.name === 'bogota' ? 38 : 115), c0 = MM / 2;   // píxeles por metro
  mctx.clearRect(0, 0, MM, MM);
  mctx.save();
  mctx.beginPath(); mctx.arc(c0, c0, MR, 0, 6.2832); mctx.clip();
  mctx.fillStyle = '#0c0f10'; mctx.fillRect(0, 0, MM, MM);
  mctx.translate(c0, c0); mctx.rotate(P.yaw); mctx.scale(k, k); mctx.translate(-P.pos.x, -P.pos.z);
  mctx.globalAlpha = 0.93; mctx.drawImage(map.canvas, map.x0, map.z0, map.w, map.h); mctx.globalAlpha = 1;
  if (G.route && G.route.length > 1) {   // la ruta del GPS
    mctx.strokeStyle = G.way ? '#e58bff' : '#ffd27a'; mctx.lineWidth = 3.2 / k; mctx.lineJoin = 'round'; mctx.globalAlpha = 0.8;
    mctx.beginPath(); G.route.forEach((p, i) => (i ? mctx.lineTo(p[0], p[1]) : mctx.moveTo(p[0], p[1]))); mctx.stroke(); mctx.globalAlpha = 1;
  }
  const dot = (x, z, r, color) => { mctx.fillStyle = color; mctx.beginPath(); mctx.arc(x, z, r / k, 0, 6.2832); mctx.fill(); };
  for (const f of rg.fires) dot(f.x, f.z, f.lit ? 3.6 : 2, f.lit ? '#ff9a3a' : '#7a6a56');
  for (const id in G.npcs) dot(G.npcs[id].x, G.npcs[id].z, 2.8, '#f2ead8');
  if (Dg.obj.root.visible) dot(Dg.pos.x, Dg.pos.z, 2.6, '#d08a44');
  for (const ve of G.vehicles) if (ve !== P.veh) dot(ve.pos.x, ve.pos.z, 3.2, '#6fc8ff');
  if (G.life) for (const p of G.life.peds) if (p.m.visible) dot(p.x, p.z, 1.8, '#cfc6b0');
  mctx.restore();
  const cs = Math.cos(P.yaw), sn = Math.sin(P.yaw);
  for (const m of mapMarks()) {   // objetivos, destino y encargos: dentro del mapa o pegados al borde si están lejos
    const dx = (m.x - P.pos.x) * k, dz = (m.z - P.pos.z) * k;
    let sx = dx * cs - dz * sn, sy = dx * sn + dz * cs;
    const d = Math.hypot(sx, sy), edge = d > MR - 8;
    if (edge) { sx *= (MR - 8) / d; sy *= (MR - 8) / d; }
    mctx.save(); mctx.translate(c0 + sx, c0 + sy); mctx.globalAlpha = edge ? 0.8 : 1;
    if (m.letter) { mctx.fillStyle = '#f2ead8'; mctx.beginPath(); mctx.arc(0, 0, 8, 0, 6.2832); mctx.fill(); mctx.fillStyle = '#1a1410'; mctx.font = 'bold 11px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText(m.letter, 0, 0.5); }
    else if (m.way) { mctx.fillStyle = '#e58bff'; mctx.beginPath(); mctx.arc(0, 0, 5.5, 0, 6.2832); mctx.fill(); mctx.strokeStyle = '#000'; mctx.lineWidth = 1.2; mctx.stroke(); }
    else if (m.q) { mctx.fillStyle = '#ffd27a'; mctx.font = 'bold 15px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.strokeStyle = '#000'; mctx.lineWidth = 3; mctx.strokeText('?', 0, 0); mctx.fillText('?', 0, 0); }
    else { mctx.rotate(Math.PI / 4); mctx.fillStyle = '#ffd27a'; mctx.fillRect(-4, -4, 8, 8); mctx.strokeStyle = '#000'; mctx.lineWidth = 1; mctx.strokeRect(-4, -4, 8, 8); }
    mctx.restore();
  }
  mctx.fillStyle = '#fff'; mctx.strokeStyle = '#000'; mctx.lineWidth = 1.2;   // el jugador
  mctx.beginPath(); mctx.moveTo(c0, c0 - 8); mctx.lineTo(c0 + 5.5, c0 + 6); mctx.lineTo(c0, c0 + 3); mctx.lineTo(c0 - 5.5, c0 + 6); mctx.closePath(); mctx.fill(); mctx.stroke();
  const nx = c0 + sn * (MR - 9), ny = c0 - cs * (MR - 9);   // el norte
  mctx.fillStyle = 'rgba(0,0,0,.65)'; mctx.beginPath(); mctx.arc(nx, ny, 8, 0, 6.2832); mctx.fill();
  mctx.fillStyle = '#f0745c'; mctx.font = 'bold 11px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText('N', nx, ny + 0.5);
  mctx.strokeStyle = 'rgba(232,224,208,.5)'; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.arc(c0, c0, MR, 0, 6.2832); mctx.stroke();
}

// ---------- Interacción ----------
function addInter(o) { G.inter.push(o); return o; }
function findInter() {
  let best = null, bd = 1e9;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const it of G.inter) {
    if (it.active && !it.active()) continue;
    const dx = it.pos.x - P.pos.x, dz = it.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > it.r || (d > 0.8 && (dx * fx + dz * fz) / d < 0.2)) continue;
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
function useInteract() { const it = findInter(); if (it) it.use(); }

// ---------- Temporizadores ----------
function after(secs, fn, repeat = false) { const t = { at: G.time + secs, fn, every: repeat ? secs : 0, dead: false, step: G.stepIdx }; G.timers.push(t); return t; }
function tickTimers() {
  for (const t of [...G.timers]) {
    if (t.dead || G.time < t.at) continue;
    if (t.every) t.at = G.time + t.every; else t.dead = true;
    t.fn(API);
  }
  G.timers = G.timers.filter((t) => !t.dead);
}

// ---------- La Patasola ----------
const C = { obj: makePatasola(), pos: new THREE.Vector3(), hidden: true, t: 4, cool: 0, seen: 0, hop: 0, charge: 0, repelT: 0, hold: 0, cueT: 6, cfg: { mode: 'none' }, lure: null };
scene.add(C.obj.root); C.obj.root.visible = false;
function pv(p, s = 1) {
  const dx = p.x - P.pos.x, dz = p.z - P.pos.z, d = Math.hypot(dx, dz);
  return [d > 0.01 ? (dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d : 0, s * clamp(1 - d / 95, 0.08, 1)];
}
function setThreat(cfg) { C.cfg = cfg || { mode: 'none' }; if (C.cfg.mode === 'none') { if (!C.lure && C.hold <= 0) hideCre(); } else if (C.hidden) C.t = C.cfg.delay ?? 4; }
function hideCre() { C.hidden = true; C.obj.root.visible = false; C.obj.light.intensity = 0; C.charge = 0; }
function showCre(form) { C.hidden = false; C.obj.setForm(form); C.obj.root.visible = true; }
function placeCre(dist, spread = 1.6, front = false) {
  const a = P.yaw + (front ? 0 : Math.PI) + (Math.random() - 0.5) * spread;
  const p = { x: P.pos.x - Math.sin(a) * dist, z: P.pos.z - Math.cos(a) * dist };
  G.region.bounds(p);
  C.pos.set(p.x, G.region.heightAt(p.x, p.z), p.z);
}
function syncCre(hopY) {
  const r = C.obj.root;
  r.position.set(C.pos.x, C.pos.y + hopY, C.pos.z);
  r.rotation.y = Math.atan2(P.pos.x - C.pos.x, P.pos.z - C.pos.z);
  C.obj.up.rotation.x = 0.22 + Math.sin(G.time * 2.1) * 0.05 + hopY * 0.3;
  C.obj.arms[0].rotation.x = -0.75 + Math.sin(G.time * 3) * 0.12; C.obj.arms[1].rotation.x = -0.75 + Math.cos(G.time * 2.6) * 0.12;
  C.obj.beck.rotation.x = -0.9 + Math.sin(G.time * 2.4) * 0.35;
}
function lureAt(at, o = {}) { const [x, z] = place(at); C.lure = { ...o }; C.hold = 0; C.pos.set(x, G.region.heightAt(x, z), z); showCre('lure'); }
function lureVanish(scare) {
  if (!C.lure) return;
  const l = C.lure; C.lure = null;
  if (l.sub) sub(l.sub, 5);
  if (scare) { showCre('monster'); C.obj.light.intensity = 7; C.hold = 1.4; audio.sting(); audio.scream(0, 1); G.shake = 0.7; flashRed(0.5); }
  else { audio.whisper(0, 1); hideCre(); C.t = 8; }
}
function ambush() {
  C.lure = null; C.hold = 0; placeCre(9, 0.6, true); showCre('monster');
  C.cool = 0.9; C.charge = 9; C.seen = 0;
  if (C.cfg.mode === 'none') C.cfg = { mode: 'hunt', speed: 5.5 };
  audio.sting(); audio.scream(0, 1); G.shake = 0.8;
}
function hurt(n, dx = 0, dz = 0) {
  if (AUTO) return;
  P.health -= n; P.lastHurt = G.time; G.shake = 1; audio.hit(); audio.scream(0, 1); flashRed(0.9);
  P.pos.x += dx * 2.4; P.pos.z += dz * 2.4;
  if (P.health <= 0) die();
}
function die() {
  if (G.state === 'dead') return;
  G.state = 'dead'; G.deadT = performance.now(); hideCre(); audio.threat = 0; audio.engine(false);
  $('dead').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
}
function retry() { if (performance.now() - G.deadT < 900) return; $('dead').style.display = 'none'; lock(); startPart(G.part && G.part.free ? LIBRE : G.partIdx, true); }

function updateCreature(dt) {
  if (C.hold > 0) { C.hold -= dt; syncCre(0); G.threat = 1; if (C.hold <= 0) { hideCre(); C.t = 7; } return; }
  if (C.lure) {
    syncCre(0);
    if (C.lure.vanishAt && Math.hypot(P.pos.x - C.pos.x, P.pos.z - C.pos.z) < C.lure.vanishAt) lureVanish(C.lure.scare);
    G.threat = lerp(G.threat, 0.25, dt); return;
  }
  const cfg = C.cfg;
  if (cfg.mode === 'none') { if (!C.hidden) hideCre(); G.threat = Math.max(0, G.threat - dt * 0.5); return; }
  C.cool -= dt; C.cueT -= dt;
  if (C.hidden) {
    C.t -= dt; G.threat = Math.max(0, G.threat - dt * 0.4);
    if (C.t <= 0) { placeCre(cfg.mode === 'hunt' ? 34 : 38); showCre('monster'); C.seen = 0; C.repelT = 0; if (cfg.mode === 'hunt') audio.scream(...pv(C.pos, 0.8)); }
    return;
  }
  let dx = P.pos.x - C.pos.x, dz = P.pos.z - C.pos.z;
  const d = Math.hypot(dx, dz) || 0.001; dx /= d; dz /= d;
  const hunting = cfg.mode === 'hunt' || C.charge > 0;
  const dogD = Dg.active && Dg.scared <= 0 ? Math.hypot(Dg.pos.x - C.pos.x, Dg.pos.z - C.pos.z) : 999;
  const repelDog = dogD < (cfg.dogR ?? 15) + (Dg.brave > 0 ? 7 : 0);
  const fire = G.region.nearLitFire(C.pos, 9.5) || nearCandle(C.pos, 6.5) || houseGuard();   // candela, vela bendita o casa: no pasa
  let mx, mz, speed;
  if (fire) {
    let fx = C.pos.x - fire.x, fz = C.pos.z - fire.z; const fd = Math.hypot(fx, fz) || 1; fx /= fd; fz /= fd;
    mx = fx * 0.8 - fz * 0.6; mz = fz * 0.8 + fx * 0.6; speed = 3.6;
  } else if (repelDog) {
    mx = -dx * 0.8 - dz * 0.5; mz = -dz * 0.8 + dx * 0.5; speed = 5; C.repelT += dt;
    if (cfg.frenzy && Dg.brave <= 0 && C.repelT > (cfg.frenzyT ?? 5)) { Dg.scared = 8; C.repelT = 0; sub('Canelo se encoge contra tus piernas, gimiendo.', 3.5); audio.yelp(0, 0.6); }
  } else {
    C.repelT = Math.max(0, C.repelT - dt * 0.5);
    if (cfg.mode === 'stalk') {
      if (C.charge > 0) { C.charge -= dt; mx = dx; mz = dz; speed = cfg.speed ?? 5.6; }
      else if (d > 40) { mx = dx; mz = dz; speed = 3.4; }
      else if (d < 22) { mx = -dx; mz = -dz; speed = 3.0; }
      else { mx = -dz; mz = dx; speed = 1.3; }
      const look = dx * Math.sin(P.yaw) + dz * Math.cos(P.yaw);
      if (look > 0.9 && P.lightOn && d < 36 && C.charge <= 0) {
        C.seen += dt;
        if (C.seen > 0.8) { audio.whisper(...pv(C.pos)); hideCre(); C.t = 6 + Math.random() * 8; return; }
      } else C.seen = Math.max(0, C.seen - dt);
      if (cfg.charge && C.charge <= 0 && C.cool <= 0 && Math.random() < dt * cfg.charge) { C.charge = 5; C.cool = 16; audio.scream(...pv(C.pos, 0.8)); }
    } else {
      if (C.charge > 0) C.charge -= dt;
      if (C.cool > 0) { mx = -dx; mz = -dz; speed = 4.5; }
      else { mx = dx; mz = dz; speed = (cfg.speed ?? 5.6) * (d > 30 ? 1.25 : 1); }
      if (d > 85) placeCre(36);
    }
  }
  const ml = Math.hypot(mx, mz) || 1;
  const bp = { x: C.pos.x + (mx / ml) * speed * dt, z: C.pos.z + (mz / ml) * speed * dt };
  G.region.bounds(bp);
  C.pos.set(bp.x, G.region.heightAt(bp.x, bp.z), bp.z);
  const prev = C.hop; C.hop += dt * (speed > 4 ? 2.6 : speed > 2 ? 1.8 : 1.1);
  if (Math.floor(C.hop) !== Math.floor(prev)) { const [pan, vol] = pv(C.pos); audio.thump(pan, vol * (speed > 4 ? 1 : 0.55)); }
  syncCre(Math.abs(Math.sin(C.hop * Math.PI)) * (0.16 + speed * 0.05));
  C.obj.light.intensity = hunting ? 5 : 1.5;
  if (d < 1.7 && C.cool <= 0 && !fire && !repelDog && hunting) { hurt(cfg.dmg ?? 40, dx, dz); C.cool = 6; C.charge = 0; }
  if (C.cueT <= 0) { C.cueT = 7 + Math.random() * 6; if (hunting) audio.wail(...pv(C.pos, 0.9), true); else audio.whisper(...pv(C.pos, 0.8)); }
  G.threat = lerp(G.threat, clamp(1 - d / 45, 0, 1) * (hunting ? 1 : 0.6), Math.min(1, dt * 3));
}

// ---------- Canelo ----------
const Dg = { obj: makeDog(), pos: new THREE.Vector3(), active: false, scared: 0, cueT: 0, flee: null, brave: 0 };
scene.add(Dg.obj.root); Dg.obj.root.visible = false;
// El periodista: se ve en tercera persona (tecla V) y al volante.
const JOURNO = { cloth: 0x6f7480, pants: 0x2a2a30, skin: 0xb98a64, hair: 0x1a1410, hat: 0x4a4238, city: true };
let Av = makePerson({ ...JOURNO, animated: true }); scene.add(Av); Av.visible = false;
function setDog(on) { Dg.active = on; Dg.obj.root.visible = on; Dg.flee = null; Dg.scared = 0; if (on) Dg.pos.set(P.pos.x + 1.2, P.pos.y, P.pos.z + 0.8); }
function dogFlee() { if (!Dg.obj.root.visible) return; const a = P.yaw + 0.6; Dg.flee = { x: P.pos.x - Math.sin(a) * 60, z: P.pos.z - Math.cos(a) * 60 }; Dg.active = false; audio.bark(0, 1); }
function updateDog(dt) {
  const r = Dg.obj.root; if (!r.visible) return;
  let tx, tz, sp;
  if (Dg.flee) { tx = Dg.flee.x; tz = Dg.flee.z; sp = 9.5; }
  else { const a = P.yaw; tx = P.pos.x + Math.cos(a) * 1.3 + Math.sin(a) * 0.5; tz = P.pos.z - Math.sin(a) * 1.3 + Math.cos(a) * 0.5; sp = 8.5; }
  const dx = tx - Dg.pos.x, dz = tz - Dg.pos.z, d = Math.hypot(dx, dz);
  let moving = false;
  if (d > 0.5) { const v = Math.min(sp, d * 3) * dt; Dg.pos.x += (dx / d) * v; Dg.pos.z += (dz / d) * v; r.rotation.y = Math.atan2(dx, dz); moving = true; }
  if (Dg.flee && (d < 3 || Math.hypot(Dg.pos.x - P.pos.x, Dg.pos.z - P.pos.z) > 45)) { r.visible = false; Dg.flee = null; return; }
  if (d > 40 && !Dg.flee) Dg.pos.set(tx, 0, tz);
  Dg.pos.y = G.region.heightAt(Dg.pos.x, Dg.pos.z);
  r.position.set(Dg.pos.x, Dg.pos.y + (moving ? Math.abs(Math.sin(G.time * 13)) * 0.05 : 0), Dg.pos.z);
  Dg.obj.tail.rotation.y = Dg.scared > 0 ? 0 : Math.sin(G.time * 9) * 0.5;
  if (Dg.scared > 0) Dg.scared -= dt;
  if (Dg.brave > 0) Dg.brave -= dt;
  Dg.cueT -= dt;
  if (Dg.active && !C.hidden && !C.lure && Dg.cueT <= 0) {
    const cd = Math.hypot(Dg.pos.x - C.pos.x, Dg.pos.z - C.pos.z);
    if (cd < 20 && Dg.scared <= 0) { audio.bark(...pv(Dg.pos)); Dg.cueT = 1.7; }
    else if (cd < 44) { audio.growl(...pv(Dg.pos)); sub('Canelo gruñe hacia el monte.', 2.5); Dg.cueT = 7; }
  }
}

// ---------- Jugador ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.code === 'Tab') e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code); onKey(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
document.addEventListener('mousemove', (e) => {
  if (G.state !== 'play' || !(locked() || (G.noLock && e.buttons))) return;
  P.yaw -= e.movementX * 0.0022; P.pitch = clamp(P.pitch - e.movementY * 0.0022, -1.35, 1.35); P.mouseT = G.time;
});
document.addEventListener('mousedown', (e) => {
  audio.init();
  if (e.target && e.target.closest && e.target.closest('button')) return;   // los botones se atienden solos
  if (G.state === 'dialog') advanceDialog();
  else if (G.state === 'card') cardContinue();
  else if (G.state === 'dead') retry();
  else if (G.state === 'play' && (isPaused() || !locked())) resume();
});
document.addEventListener('wheel', (e) => { if (G.state === 'journal') $('journal-body').scrollTop += e.deltaY; });
function onKey(c) {
  if (G.state === 'play') {
    if (isPaused()) { if (c === 'Escape' || c === 'KeyP' || c === 'Enter') resume(); return; }
    if (c === 'Escape' || c === 'KeyP') { G.manualPause = true; if (document.exitPointerLock) document.exitPointerLock(); return; }
    if (/^Digit[1-6]$/.test(c)) return useItem(GOODS[+c[5] - 1]);
    if (c === 'KeyM') return openMap();
    if (c === 'KeyV') { P.view = P.view === 'fp' ? 'tp' : 'fp'; save.view = P.view; persist(); return; }
    if (P.mode === 'drive') {
      if (c === 'KeyE') exitVehicle();
      else if (c === 'KeyH') audio.horn(P.veh.type);
      else if (c === 'KeyF') { if (!P.veh.def.animal || P.hasLight) P.lightOn = !P.lightOn; }
      else if (c === 'Tab' || c === 'KeyJ') openJournal();
      return;
    }
    if (c === 'KeyE') useInteract();
    else if (c === 'KeyF') { if (P.hasLight) { P.lightOn = !P.lightOn; audio.tone({ f: [1800, 900], dur: 0.04, vol: 0.05 }); } }
    else if (c === 'Tab' || c === 'KeyJ') openJournal();
  } else if (G.state === 'shop') { if (/^Digit[1-6]$/.test(c)) buy(+c[5] - 1); else if (c === 'Escape' || c === 'KeyE' || c === 'Tab') closeShop(); }
  else if (G.state === 'choice') { if (/^Digit[1-9]$/.test(c)) pickChoice(+c[5] - 1); else if (c === 'Escape') pickChoice(-1); }
  else if (G.state === 'map') { if (c === 'KeyM' || c === 'Escape' || c === 'Tab') closeMap(); }
  else if (G.state === 'dialog') { if (c === 'KeyE' || c === 'Space' || c === 'Enter') advanceDialog(); }
  else if (G.state === 'journal') { if (c === 'Tab' || c === 'KeyJ' || c === 'Escape') closeJournal(); }
  else if (G.state === 'card') { if (c === 'Enter' || c === 'Space' || c === 'KeyE') cardContinue(); }
  else if (G.state === 'dead') { if (c === 'Enter' || c === 'Space' || c === 'KeyE') retry(); }
}
function updatePlayer(dt) {
  if (P.mode === 'drive') return updateDrive(dt);
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const crouch = keys.has('KeyC') || keys.has('ControlLeft');
  const moving = f !== 0 || s !== 0;
  const sprint = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && f > 0 && !P.tired && !crouch;
  if (P.boost > 0) P.boost -= dt;
  if (sprint) { P.stamina -= (P.boost > 0 ? 6 : 13) * dt; P.sprintT = G.time; if (P.stamina <= 0) { P.stamina = 0; P.tired = true; } }
  else if (G.time - P.sprintT > 1) { P.stamina = Math.min(100, P.stamina + (moving ? 8 : 14) * dt); if (P.stamina > 35) P.tired = false; }
  const sp = crouch ? 1.9 : sprint ? 7.4 : P.tired ? 3.3 : 4.1;
  let wx = 0, wz = 0;
  if (moving) { const sn = Math.sin(P.yaw), cs = Math.cos(P.yaw); wx = -sn * f + cs * s; wz = -cs * f - sn * s; const l = Math.hypot(wx, wz); wx = (wx / l) * sp; wz = (wz / l) * sp; }
  const k = 1 - Math.exp(-dt * 12);
  P.vx += (wx - P.vx) * k; P.vz += (wz - P.vz) * k;
  P.pos.x += P.vx * dt; P.pos.z += P.vz * dt;
  for (const ve of G.vehicles) {   // los vehículos parados estorban el paso
    const dx = P.pos.x - ve.pos.x, dz = P.pos.z - ve.pos.z, m = ve.def.r * 0.85 + 0.35, d2 = dx * dx + dz * dz;
    if (d2 < m * m && d2 > 1e-6) { const d = Math.sqrt(d2), q = (m - d) / d; P.pos.x += dx * q; P.pos.z += dz * q; }
  }
  G.region.col.resolve(P.pos, 0.4); G.region.bounds(P.pos);
  P.pos.y = G.region.heightAt(P.pos.x, P.pos.z);
  const v = Math.hypot(P.vx, P.vz);
  P.crouch += ((crouch ? 1 : 0) - P.crouch) * (1 - Math.exp(-dt * 10));
  P.bob += v * dt * 1.9;
  P.stepAcc += v * dt;
  if (P.stepAcc > (sprint ? 2.6 : 2.0)) { P.stepAcc = 0; audio.step(G.region.ground === 'stone' || !!G.region.inside(P.pos)); }
  if (G.time - P.lastHurt > 7 && P.health < 100) P.health = Math.min(100, P.health + 4 * dt);
  if (P.lightOn) P.battery = Math.max(0, P.battery - dt * 0.26);
  let li = 0;
  if (P.lightOn) { li = P.battery > 0 ? (GFX.hi ? 330 : 150) : (GFX.hi ? 34 : 16); if ((P.battery < 14 || G.threat > 0.75) && Math.random() < 0.08) li *= 0.25; }
  spot.intensity = li;
}
function syncCamera() {
  const v = Math.hypot(P.vx, P.vz), sh = G.shake * 0.05, jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
  const eyeY = P.pos.y + 1.68 - P.crouch * 0.65, cp = Math.cos(P.pitch);
  if (P.mode === 'drive') {   // cámara detrás del vehículo; los faros salen de su frente
    const ve = P.veh, d = ve.def, ty = ve.pos.y + d.camH * 0.62;
    const cx = ve.pos.x + Math.sin(P.yaw) * cp * d.cam, cz = ve.pos.z + Math.cos(P.yaw) * cp * d.cam;
    camera.position.set(cx, Math.max(ty + d.camH * 0.38 - Math.sin(P.pitch) * d.cam, G.region.heightAt(cx, cz) + 0.5), cz);
    camera.rotation.set(P.pitch + jx, P.yaw + jy, 0, 'YXZ');
    rig.position.set(ve.pos.x - Math.sin(ve.yaw) * d.base * 0.5, ve.pos.y + (d.animal ? 1.75 : 1.0), ve.pos.z - Math.cos(ve.yaw) * d.base * 0.5);
    rig.rotation.set(ve.pitch - 0.07, ve.yaw, 0, 'YXZ');
    Av.visible = false;
    return;
  }
  if (P.view === 'tp') {   // tercera persona: cámara sobre el hombro derecho
    const dist = 3.3, ty = eyeY - 0.12;
    const cx = P.pos.x + Math.sin(P.yaw) * cp * dist + Math.cos(P.yaw) * 0.45, cz = P.pos.z + Math.cos(P.yaw) * cp * dist - Math.sin(P.yaw) * 0.45;
    camera.position.set(cx, Math.max(ty + 0.35 - Math.sin(P.pitch) * dist, G.region.heightAt(cx, cz) + 0.35), cz);
    camera.rotation.set(P.pitch + jx, P.yaw + jy, 0, 'YXZ');
    Av.visible = true; Av.position.copy(P.pos);
    const want = v > 0.4 ? Math.atan2(P.vx, P.vz) : P.yaw + Math.PI;   // el cuerpo gira hacia donde camina
    Av.rotation.y += wrapAngle(want - Av.rotation.y) * 0.25;
    animatePerson(Av, P.bob * 2.3, Math.min(1, v / 4.5), G.dt, P.lightOn ? 'lantern' : 'idle');
    rig.position.set(P.pos.x - Math.sin(P.yaw) * 0.4, eyeY - 0.35, P.pos.z - Math.cos(P.yaw) * 0.4);
    rig.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    return;
  }
  camera.position.set(P.pos.x, eyeY + Math.sin(P.bob * 2) * 0.035 * Math.min(1, v / 4), P.pos.z);
  camera.rotation.set(P.pitch + jx, P.yaw + jy, 0, 'YXZ');
  rig.position.copy(camera.position); rig.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  Av.visible = false;
}

// ---------- Vehículos ----------
const VSPOTS = [['chiva', 8, 46.5, Math.PI / 2], ['jeep', -11, -5, 0.3], ['moto', -15.2, 9.6, 1.2], ['mula', 86.5, -46, 2.4]];
function spawnVehicles() {
  G.vehicles = [];
  if (G.region.name !== 'tolima') return;
  for (const [type, x, z, yaw] of VSPOTS) {
    const ve = makeVehicle(type, JOURNO);
    ve.pos.set(x, G.region.heightAt(x, z), z); ve.yaw = yaw; syncVehicle(ve);
    G.dyn.add(ve.root); G.vehicles.push(ve);
    addInter({ pos: ve.pos, r: ve.def.r + 1.7, label: ve.def.verb + ' ' + ve.def.label, active: () => P.mode === 'foot', use: () => enterVehicle(ve) });
  }
}
function enterVehicle(ve) {
  if (P.mode === 'drive') return;
  P.mode = 'drive'; P.veh = ve; ve.occupied = true; ve.driver.visible = true;
  P.yaw = ve.yaw; P.pitch = -0.12; P.mouseT = -9; P.vx = P.vz = 0;
  sub(ve.def.animal ? 'W avanzar · A y D girar · S frenar · E desmontar' : 'W acelerar · S frenar o reversa · A y D girar · Espacio freno de mano · H pito · F luces · E bajar', 7);
  if (!ve.def.animal) audio.tone({ type: 'sawtooth', f: [60, 140, 90], dur: 0.6, vol: 0.08, filter: ['lowpass', 600, 1] });
}
function exitVehicle(force) {
  const ve = P.veh;
  if (!ve) return;
  if (!force && Math.abs(ve.speed) > 3) { sub('Frena antes de bajarte.', 2); return; }
  ve.occupied = false; ve.driver.visible = false; ve.speed = 0; audio.engine(false);
  const side = ve.def.r + 0.75;   // se baja por la izquierda
  P.pos.set(ve.pos.x - Math.cos(ve.yaw) * side, 0, ve.pos.z + Math.sin(ve.yaw) * side);
  G.region.col.resolve(P.pos, 0.4); G.region.bounds(P.pos); P.pos.y = G.region.heightAt(P.pos.x, P.pos.z);
  P.mode = 'foot'; P.veh = null; P.vx = P.vz = 0;
}
function updateDrive(dt) {
  const ve = P.veh, d = ve.def;
  const thr = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const st = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  // Donde anda ella no pasan motores ni bestias: hay que seguir a pie.
  const cd = C.hidden || C.lure ? 999 : Math.hypot(C.pos.x - ve.pos.x, C.pos.z - ve.pos.z);
  if (cd < 42 && (C.cfg.mode === 'hunt' || C.charge > 0)) {
    if (d.animal) { sub('La mula se encabrita y te tumba. Las bestias no entran donde anda ella.', 5); audio.yelp(0, 0.7); exitVehicle(true); return; }
    if (ve.dead <= 0) sub('El motor se ahoga. Algo no lo deja prender.', 4.5);
    ve.dead = 3;
  }
  if (ve.dead > 0) ve.dead -= dt;
  if (!d.animal && ve.fuel <= 0 && thr && !ve.dryMsg) { ve.dryMsg = true; sub('Se acabó la gasolina. En la tienda venden; se usa con la tecla 5.', 5); }
  if (ve.fuel > 0) ve.dryMsg = false;
  const crash = driveVehicle(ve, dt, { thr, steer: st, brake: keys.has('Space') }, G.region);
  if (crash > 3) {
    G.shake = Math.min(1, crash / 10); audio.hit();
    if (crash > 9 && !AUTO) { P.health -= (crash - 9) * 4; P.lastHurt = G.time; flashRed(0.4); if (P.health <= 0) { die(); return; } }
  }
  syncVehicle(ve);
  P.pos.copy(ve.pos);
  if (G.time - P.mouseT > 1.2 && Math.abs(ve.speed) > 1) P.yaw += wrapAngle(ve.yaw - P.yaw) * Math.min(1, dt * 2.2);   // la cámara vuelve sola detrás
  if (d.animal) { P.stepAcc += Math.abs(ve.speed) * dt; if (P.stepAcc > 1.5) { P.stepAcc = 0; audio.step(false); } }
  else audio.engine(ve.dead <= 0 && ve.fuel > 0, (Math.abs(ve.speed) / d.max) * 0.8 + (thr ? 0.2 : 0), ve.type);
  if (G.time - P.lastHurt > 7 && P.health < 100) P.health = Math.min(100, P.health + 4 * dt);
  P.stamina = Math.min(100, P.stamina + 14 * dt); if (P.stamina > 35) P.tired = false;
  let li = 0;
  if (P.lightOn) {
    if (d.animal) { P.battery = Math.max(0, P.battery - dt * 0.26); li = P.battery > 0 ? (GFX.hi ? 330 : 150) : (GFX.hi ? 34 : 16); }
    else li = GFX.hi ? 620 : 280;
  }
  spot.intensity = li;
}

// ---------- Pueblo vivo, reloj y mundo libre ----------
const fmtHour = (h) => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0');
function spawnLife(part) {
  G.life = part.region === 'tolima' && (part.free || ENV[part.env].night < 0.95)
    ? createLife(G.region, G.dyn, { addInter, onTalk: talkToNeighbor })
    : null;
}
function updateWorld(dt) {
  if (G.part.free) {
    G.hour = (G.hour + dt / 90) % 24;   // una hora de juego dura minuto y medio
    G.freeT -= dt;
    if (G.freeT <= 0) {
      G.freeT = 1;
      const name = freeEnv(G.hour);
      if (name !== G.envName) setEnv(name);
      if (!G.mission) {   // de noche y lejos del pueblo, ella ronda
        const want = (G.hour >= 19.5 || G.hour < 5.4) && Math.hypot(P.pos.x, P.pos.z) > 85 ? 'stalk' : 'none';
        if (C.cfg.mode !== want) setThreat(want === 'stalk' ? { mode: 'stalk', charge: 0.03, delay: 10 } : null);
      }
    }
  } else if (HOURS[G.envName] != null) G.hour = HOURS[G.envName];
  if (G.life) G.life.update(dt, G.hour, P.pos, G.time);
  if (G.candles.length) {   // velas benditas: arden casi un minuto
    for (const c of G.candles) { c.t -= dt; c.it.glow.material.opacity = 0.55 + Math.sin(G.time * 11 + c.x) * 0.2; if (c.t <= 0) G.dyn.remove(c.it.group); }
    G.candles = G.candles.filter((c) => c.t > 0);
  }
  G.routeT -= dt;
  if (G.routeT <= 0) { G.routeT = 0.6; updateRoute(); }
}
function giverMarks() {
  if (!G.part || !G.part.free || G.mission) return [];
  return MISSIONS.map((m) => { const n = G.npcs[m.giver]; return n ? { x: n.x, z: n.z, letter: m.letter } : null; }).filter(Boolean);
}
const mapMarks = () => [...markers(), ...(G.way ? [{ x: G.way.x, z: G.way.z, way: true }] : []), ...giverMarks()];
function startMission(m) {
  G.mission = m; G.part = { ...LIBRE, title: m.title, steps: m.steps };
  sub('Encargo: ' + m.title, 3.5);
  startStep(0);
}
function endMission(ok) {
  const m = G.mission;
  if (!m) return;
  for (const t of G.timers) if (t.step === G.stepIdx) t.dead = true;
  for (const tg of G.targets) { if (!tg.done && tg.mesh) G.dyn.remove(tg.mesh); tg.done = true; }
  G.targets = []; G.step = null; G.stepIdx = -1; G.mission = null; G.part = LIBRE; $('timer').style.display = 'none';
  setThreat(null);
  if (ok) { save.pesos = (save.pesos || 0) + m.reward; save.encargos = (save.encargos || 0) + 1; save.hour = G.hour; persist(); sub('Encargo cumplido: «' + m.title + '». Te pagan ' + m.reward + ' pesos.', 6); audio.bell(); }
  else { sub('Encargo fallido: «' + m.title + '». Puedes volver a pedirlo.', 6); audio.tone({ f: [300, 150], dur: 0.6, vol: 0.08 }); }
  refreshObjective();
}

// ---------- GPS y mapa grande (tecla M) ----------
function updateRoute() {
  if (G.way && Math.hypot(G.way.x - P.pos.x, G.way.z - P.pos.z) < 9) { G.way = null; sub('Llegaste a tu destino.', 2.5); }
  const ms = markers(), dest = G.way || ms[0];
  G.route = dest && G.region && G.region.route ? G.region.route(P.pos.x, P.pos.z, dest.x, dest.z) : null;
}
const bctx = $('mapc').getContext('2d'), BM = 860;
function mapXf() { const m = G.region.map, k = Math.min(BM / m.w, BM / m.h); return { k, ox: (BM - m.w * k) / 2 - m.x0 * k, oz: (BM - m.h * k) / 2 - m.z0 * k }; }
function openMap() {
  if (!G.region.map) return;
  G.state = 'map'; $('bigmap').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
  audio.engine(false); updateRoute(); drawBigMap();
}
function closeMap() { $('bigmap').style.display = 'none'; G.state = 'play'; lock(); }
function drawBigMap() {
  const rg = G.region, m = rg.map, { k, ox, oz } = mapXf(), X = (x) => x * k + ox, Z = (z) => z * k + oz;
  bctx.fillStyle = '#0a0c0d'; bctx.fillRect(0, 0, BM, BM);
  bctx.drawImage(m.canvas, X(m.x0), Z(m.z0), m.w * k, m.h * k);
  if (G.route && G.route.length > 1) {
    bctx.strokeStyle = G.way ? '#e58bff' : '#ffd27a'; bctx.lineWidth = 3.5; bctx.lineJoin = 'round'; bctx.globalAlpha = 0.85;
    bctx.beginPath(); G.route.forEach((p, i) => (i ? bctx.lineTo(X(p[0]), Z(p[1])) : bctx.moveTo(X(p[0]), Z(p[1])))); bctx.stroke(); bctx.globalAlpha = 1;
  }
  const circ = (x, z, r, c) => { bctx.fillStyle = c; bctx.beginPath(); bctx.arc(X(x), Z(z), r, 0, 6.2832); bctx.fill(); };
  for (const f of rg.fires) if (f.lit) circ(f.x, f.z, 4, '#ff9a3a');
  bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
  for (const ve of G.vehicles) { circ(ve.pos.x, ve.pos.z, 7, '#2f6f9a'); bctx.fillStyle = '#fff'; bctx.font = 'bold 10px system-ui'; bctx.fillText(ve.type[0].toUpperCase(), X(ve.pos.x), Z(ve.pos.z) + 0.5); }
  bctx.font = '13px Georgia, serif';
  for (const [name, x, z] of rg.labels || []) { bctx.strokeStyle = 'rgba(0,0,0,.85)'; bctx.lineWidth = 3; bctx.strokeText(name, X(x), Z(z) - 13); bctx.fillStyle = '#efe6d2'; bctx.fillText(name, X(x), Z(z) - 13); }
  for (const mk of mapMarks()) {
    const x = X(mk.x), z = Z(mk.z);
    if (mk.letter) { circ(mk.x, mk.z, 10, '#f2ead8'); bctx.fillStyle = '#1a1410'; bctx.font = 'bold 13px system-ui'; bctx.fillText(mk.letter, x, z + 0.5); }
    else if (mk.way) { circ(mk.x, mk.z, 7, '#e58bff'); bctx.strokeStyle = '#000'; bctx.lineWidth = 1.5; bctx.stroke(); }
    else {
      bctx.save(); bctx.translate(x, z); bctx.rotate(Math.PI / 4); bctx.fillStyle = '#ffd27a'; bctx.fillRect(-6, -6, 12, 12); bctx.strokeStyle = '#000'; bctx.lineWidth = 1.2; bctx.strokeRect(-6, -6, 12, 12); bctx.restore();
      if (mk.q) { bctx.fillStyle = '#000'; bctx.font = 'bold 12px system-ui'; bctx.fillText('?', x, z + 0.5); }
    }
  }
  bctx.save(); bctx.translate(X(P.pos.x), Z(P.pos.z)); bctx.rotate(-P.yaw);   // el jugador, con el norte arriba
  bctx.fillStyle = '#fff'; bctx.strokeStyle = '#000'; bctx.lineWidth = 1.5;
  bctx.beginPath(); bctx.moveTo(0, -11); bctx.lineTo(7.5, 8); bctx.lineTo(0, 4); bctx.lineTo(-7.5, 8); bctx.closePath(); bctx.fill(); bctx.stroke(); bctx.restore();
}
$('mapc').addEventListener('mousedown', (e) => {
  if (G.state !== 'map') return;
  if (e.button === 2) G.way = null;
  else {
    const r = e.target.getBoundingClientRect(), { k, ox, oz } = mapXf();
    const p = { x: (((e.clientX - r.left) * BM) / r.width - ox) / k, z: (((e.clientY - r.top) * BM) / r.height - oz) / k };
    G.region.bounds(p); G.way = p; audio.pickup();
  }
  updateRoute(); drawBigMap();
});
$('mapc').addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- Dinero, morral e insumos (teclas 1 a 6) ----------
const bagCount = (id) => save.bag[id] || 0;
function drawHotbar() {
  $('hotbar').innerHTML = GOODS.map((g, i) => '<span class="' + (bagCount(g.id) ? '' : 'z') + '"><b>' + (i + 1) + '</b>' + g.name + ' ×' + bagCount(g.id) + '</span>').join('');
}
function nearestMotor(r) {
  if (P.veh && !P.veh.def.animal) return P.veh;
  let best = null, bd = r;
  for (const ve of G.vehicles) { if (ve.def.animal) continue; const d = Math.hypot(ve.pos.x - P.pos.x, ve.pos.z - P.pos.z); if (d < bd) { bd = d; best = ve; } }
  return best;
}
function dropCandle() {
  const x = P.pos.x - Math.sin(P.yaw) * 0.9, z = P.pos.z - Math.cos(P.yaw) * 0.9, it = makeItem('vela');
  it.group.position.set(x, G.region.heightAt(x, z), z); it.group.scale.setScalar(1.6); it.glow.scale.setScalar(1.3);
  G.dyn.add(it.group); G.candles.push({ x, z, t: 55, it });
}
const nearCandle = (p, r) => G.candles.find((c) => Math.hypot(p.x - c.x, p.z - c.z) < r) || null;
// Ella no entra a las casas: si estás adentro, ronda por fuera.
function houseGuard() {
  const hs = G.region.inside(P.pos);
  return hs && Math.hypot(C.pos.x - hs.x, C.pos.z - hs.z) < Math.max(hs.w, hs.d) / 2 + 3.5 ? hs : null;
}
function useItem(g) {
  if (!g) return;
  if (!bagCount(g.id)) { sub('No te queda: ' + g.name.toLowerCase() + '. En la tienda venden.', 3); return; }
  if (g.id === 'pilas') { if (P.battery > 95) return sub('La linterna está cargada.', 2); P.battery = Math.min(100, P.battery + 50); }
  else if (g.id === 'panela') { P.stamina = 100; P.tired = false; P.boost = 25; }
  else if (g.id === 'botiquin') { if (P.health > 95) return sub('No estás herido.', 2); P.health = Math.min(100, P.health + 60); }
  else if (g.id === 'vela') dropCandle();
  else if (g.id === 'gasolina') { const ve = nearestMotor(6); if (!ve) return sub('Arrímate a un vehículo para echarle la gasolina.', 3); ve.fuel = 100; }
  else if (g.id === 'hueso') { if (!Dg.active) return sub('Canelo no está contigo.', 3); Dg.brave = 60; audio.bark(0, 1); }
  save.bag[g.id]--; persist(); audio.pickup(); sub(g.used, 3); drawHotbar();
}

// ---------- Tienda ----------
function renderShop() {
  $('shop-money').textContent = 'Tienes $ ' + save.pesos;
  $('shop-list').innerHTML = GOODS.map((g, i) => '<div class="good' + (save.pesos < g.price ? ' no' : '') + '"><b>' + (i + 1) + '</b><div><span>' + g.name + '</span><small>' + g.desc + '</small></div><em>llevas ' + bagCount(g.id) + '</em><button data-buy="' + i + '">$ ' + g.price + '</button></div>').join('');
}
function openShop() {
  G.state = 'shop'; renderShop(); $('shop').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
  audio.engine(false);
}
function closeShop() { $('shop').style.display = 'none'; G.state = 'play'; lock(); }
function buy(i) {
  const g = GOODS[i];
  if (!g) return;
  if (save.pesos < g.price) { audio.tone({ f: [220, 160], dur: 0.2, vol: 0.06 }); return; }
  save.pesos -= g.price; save.bag[g.id] = bagCount(g.id) + 1; persist(); audio.coin(); renderShop(); drawHotbar();
}
$('shop-list').addEventListener('click', (e) => { const b = e.target.closest('[data-buy]'); if (b) buy(+b.dataset.buy); });
$('shop-close').addEventListener('click', closeShop);

// ---------- Menú de trato: qué hacer con cada personaje ----------
let choice = null;
function openChoice(title, opts) {   // opts: [{ label, fn }]
  if (AUTO) { if (opts[0]) opts[0].fn(); return; }
  choice = opts; G.state = 'choice';
  $('choice-title').textContent = title;
  $('choice-list').innerHTML = opts.map((o, i) => '<button data-c="' + i + '"><b>' + (i + 1) + '</b>' + o.label + '</button>').join('') + '<button data-c="-1"><b>Esc</b>Nada, gracias</button>';
  $('choice').style.display = 'flex'; $('prompt').style.opacity = 0;
}
function pickChoice(i) {
  const c = choice;
  choice = null; $('choice').style.display = 'none'; G.state = 'play';
  if (c && c[i]) c[i].fn();
}
$('choice-list').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) pickChoice(+b.dataset.c); });
const RUMBOS = ['al norte', 'al nororiente', 'al oriente', 'al suroriente', 'al sur', 'al suroccidente', 'al occidente', 'al noroccidente'];
function askPlace(who) {   // pregunta por un lugar: lo marca en el mapa y dice hacia dónde queda
  const places = (G.region.labels || []).filter((l) => Math.hypot(l[1] - P.pos.x, l[2] - P.pos.z) > 25).slice(0, 8);
  openChoice('¿Por dónde queda…?', places.map(([name, x, z]) => ({
    label: name,
    fn: () => {
      const dx = x - P.pos.x, dz = z - P.pos.z, k = ((Math.round(Math.atan2(dx, -dz) / (Math.PI / 4)) % 8) + 8) % 8;
      const p = { x, z }; G.region.bounds(p); G.way = p; updateRoute();
      openDialog([[who, 'Eso queda ' + RUMBOS[k] + ', a unos ' + Math.round(Math.hypot(dx, dz) / 10) * 10 + ' metros. Coja el camino y no se salga. Ya se lo marqué en el mapa.']], null);
    },
  })));
}
function talkToNeighbor(p) {
  const who = p.female ? 'Una vecina' : 'Un vecino';
  gesture(p.m);
  openChoice(who, [
    { label: 'Conversar', fn: () => openDialog([[who, RUMORS[Math.floor(Math.random() * RUMORS.length)]]], null) },
    { label: 'Preguntar por un lugar', fn: () => askPlace(who) },
  ]);
}

// ---------- Partes y pasos ----------
function clearPart() {
  for (const t of G.timers) t.dead = true;
  G.timers.length = 0;
  while (G.dyn.children.length) G.dyn.remove(G.dyn.children[0]);
  G.inter.length = 0; G.npcs = {}; G.targets = []; G.step = null;
  C.lure = null; C.hold = 0; C.cfg = { mode: 'none' }; hideCre();
  if (G.region) G.region.resetFires();
  $('sub').style.opacity = 0; $('timer').style.display = 'none'; G.threat = 0;
  if (P.veh) P.veh.occupied = false;
  P.veh = null; P.mode = 'foot'; G.vehicles = []; G.life = null; G.mission = null; G.way = null; G.route = null; G.candles = []; G.actors = []; G.talker = null; audio.engine(false); Av.visible = false;
}
function spawnNPCs(part) {
  for (const id in part.npcs || {}) {
    const def = G.chapter.npcs[id], raw = part.npcs[id];
    const spec = typeof raw === 'string' || Array.isArray(raw) ? { at: raw } : raw;
    const [x, z] = place(spec.at), y = G.region.heightAt(x, z);
    const m = makePerson({ ...def.look, sit: spec.sit });
    m.position.set(x, y, z); m.rotation.y = spec.face ?? 0; G.dyn.add(m);
    if (m.userData.actor) G.actors.push(m.userData.actor);
    const npc = { id, def, mesh: m, x, z, sit: !!spec.sit };
    G.npcs[id] = npc;
    addInter({ pos: new THREE.Vector3(x, y, z), r: 3.3, label: `Hablar con ${def.name}`, use: () => talkTo(npc) });
  }
}
// Las personas reales gesticulan mientras se habla con ellas (las sentadas y las de ruana, no).
function gesture(mesh) {
  const a = mesh.userData.actor;
  if (a && !a.noTalk) { a.play('talk'); G.talker = a; }
}
function talkTo(npc) {
  const st = G.step, name = npc.def.name;
  gesture(npc.mesh);
  if (st && st.type === 'talk' && st.npc === npc.id) return openDialog(st.lines, completeStep);   // lo que toca en la historia o en el encargo
  const opts = [];
  if (G.part.free && !G.mission) { const m = MISSIONS.find((q) => q.giver === npc.id); if (m) opts.push({ label: 'Pedir un encargo: «' + m.title + '» (paga $ ' + m.reward + ')', fn: () => openDialog(m.offer, () => startMission(m)) }); }
  if (npc.id === 'elvia') opts.push({ label: 'Comprar en la tienda', fn: openShop });
  opts.push({ label: 'Conversar', fn: () => openDialog((G.part.idle && G.part.idle[npc.id]) || npc.def.idle || [[name, '…']], null) });
  if (G.region.name === 'tolima') opts.push({ label: 'Preguntar por un lugar', fn: () => askPlace(name) });
  openChoice(name, opts);
}
function spawnExtras(part) {
  addInter({ pos: Dg.pos, r: 1.9, label: 'Acariciar a Canelo', active: () => Dg.active && P.mode === 'foot', use: () => { audio.bark(...pv(Dg.pos)); sub('Canelo te lame la mano y bate la cola.', 2.5); } });
  for (const f of G.region.fires) {
    if (f.perm) continue;
    addInter({ pos: new THREE.Vector3(f.x, f.y, f.z), r: 2.4, label: 'Encender la fogata', active: () => !f.lit,
      use: () => { G.region.lightFire(f, (G.step && G.step.fireTime) || part.fireTime || 50); audio.match(); } });
  }
  if (part.loot) for (const at of G.chapter.loot) {
    const [x0, z0] = place(at), p = { x: x0, z: z0 };
    G.region.col.resolve(p, 0.8);
    const y = G.region.heightAt(p.x, p.z), it = makeItem('pila');
    it.group.position.set(p.x, y, p.z); G.dyn.add(it.group);
    let taken = false;
    addInter({ pos: new THREE.Vector3(p.x, y, p.z), r: 2.2, label: 'Recoger pilas', active: () => !taken,
      use: () => { taken = true; G.dyn.remove(it.group); P.battery = Math.min(100, P.battery + 45); audio.pickup(); sub('Pilas para la linterna.', 2); } });
  }
}
async function startPart(idx, restore = false) {
  if (G.state === 'loading') return;
  const story = typeof idx === 'number', ch = G.chapter, part = story ? ch.parts[idx] : idx;   // un número es una parte de la historia; un objeto, el mundo libre
  G.state = 'loading';
  await fadeTo(1, 500);
  clearPart();
  G.partIdx = story ? idx : -1; G.part = part; G.stepIdx = -1;
  if (restore) { G.inv = [...(save.inv || [])]; G.notes = (save.notes || []).map((n) => [...n]); }
  if (story) { save.part = idx; save.unlocked = Math.max(save.unlocked ?? 0, idx); }
  save.inv = [...G.inv]; save.notes = G.notes.map((n) => [...n]); persist();
  setRegion(part.region);
  const [sx, sz] = place(part.spawn.at);
  P.pos.set(sx, 0, sz); P.yaw = part.spawn.yaw ?? 0; P.pitch = 0; P.vx = P.vz = 0; P.health = 100; P.stamina = 100; P.tired = false; P.lastHurt = -99;
  P.hasLight = !story || idx > 0;
  P.battery = Math.max(P.battery, 65);
  P.lightOn = P.hasLight && ENV[part.env].night > 0.8;
  G.region.col.resolve(P.pos, 0.4); P.pos.y = G.region.heightAt(P.pos.x, P.pos.z);
  G.hour = part.free ? (save.hour ?? 8.5) : HOURS[part.env];
  setEnv(part.free ? freeEnv(G.hour) : part.env, true);
  spawnNPCs(part); spawnExtras(part); spawnVehicles(); spawnLife(part);
  setThreat(part.threat || null); setDog(!!part.dog);
  $('hud').style.display = 'block'; $('menu').style.display = 'none'; drawHotbar();
  syncCamera();
  G.region.update(0, G.time, P.pos, envCur.view);
  refreshObjective();
  showCard({ kicker: story ? `${ch.kicker} · Parte ${idx + 1} de ${ch.parts.length}` : part.kicker, title: part.title, lines: [part.place, ...part.intro], photo: photoFor(part.region, story ? idx : 0) }, () => { G.state = 'play'; if (part.free) { G.step = null; refreshObjective(); } else startStep(0); });
  await fadeTo(0, 0);
}
function startStep(i) {
  const part = G.part;
  if (i >= part.steps.length) return completePart();
  const st = part.steps[i];
  G.stepIdx = i; G.step = st; G.ss = { left: 0, t: st.seconds || 0, lim: st.limit || 0 }; G.targets = [];
  if (st.threat !== undefined) setThreat(st.threat);
  if (st.dog !== undefined) setDog(st.dog);
  if (st.type === 'interact') spawnTargets(st);
  $('timer').style.display = st.type === 'survive' || st.limit ? 'block' : 'none';
  if (st.onStart) st.onStart(API);
  refreshObjective();
  audio.tone({ f: [392, 587], dur: 0.3, vol: 0.045 });
}
function completeStep() {
  const st = G.step; if (!st) return;
  for (const t of G.timers) if (t.step === G.stepIdx) t.dead = true;
  G.step = null;
  for (const tg of G.targets) if (!tg.done && tg.mesh) G.dyn.remove(tg.mesh);
  for (const tg of G.targets) tg.done = true;
  G.targets = []; $('timer').style.display = 'none';
  if (st.onDone) st.onDone(API);
  refreshObjective();
  const next = G.stepIdx + 1;
  if (st.wait && !SELFTEST) after(st.wait, () => startStep(next)); else startStep(next);
}
function completePart() {
  if (G.mission) return endMission(true);
  const next = G.partIdx + 1;
  if (SELFTEST) { G.state = 'partdone'; return; }
  if (next >= G.chapter.parts.length) return ending();
  startPart(next);
}
function ending() {
  G.state = 'loading';
  save.done = true; save.part = null; save.unlocked = G.chapter.parts.length - 1; persist();
  fadeTo(1, 1600).then(() => {
    clearPart(); setDog(false); $('hud').style.display = 'none';
    if (document.exitPointerLock) document.exitPointerLock();
    showCard({ ...G.chapter.ending, photo: photoFor('tolima', 2), hint: 'Clic para volver al menú' }, () => { fadeTo(0, 0); setRegion('tolima'); setEnv('MENU', true); showMenu(); }, false);
  });
}
function spawnTargets(st) {
  G.targets = st.targets.map((d, i) => {
    const tg = { d, x: 0, z: 0, y: 0, done: false, active: !st.sequential || i === 0, mesh: null, glow: null, neared: false, fire: null };
    if (d.kind === 'fire') { tg.fire = G.region.fire(d.fire); tg.x = tg.fire.x; tg.z = tg.fire.z; return tg; }
    const [x0, z0] = place(d.at), p = { x: x0, z: z0 };
    if (G.region.name === 'tolima' && !d.exact) G.region.col.resolve(p, 0.8);
    tg.x = p.x; tg.z = p.z; tg.y = G.region.heightAt(p.x, p.z) + (d.lift || 0);
    const it = makeItem(d.kind || 'none');
    it.group.position.set(tg.x, tg.y, tg.z); it.group.rotation.y = (i * 1.7 + 0.4) % 6.28; it.group.visible = tg.active;
    if (d.scale) it.group.scale.setScalar(d.scale);
    G.dyn.add(it.group); tg.mesh = it.group; tg.glow = it.glow;
    addInter({ pos: new THREE.Vector3(tg.x, tg.y, tg.z), r: d.r || 2.5, label: `${d.verb || 'Recoger'} ${d.name}`, active: () => tg.active && !tg.done, use: () => useTarget(tg) });
    return tg;
  });
  G.ss.left = G.targets.filter((t) => !t.d.optional).length;
}
function useTarget(tg) {
  const d = tg.d, st = G.step;
  tg.done = true; audio.pickup();
  if (tg.mesh && !d.stay) G.dyn.remove(tg.mesh); else if (tg.glow) tg.glow.visible = false;
  if (d.give) give(d.give);
  const fin = () => { if (d.onUse) d.onUse(API); if (!d.optional && G.step === st) targetDone(); };
  if (d.note) showNote(d.note[0], d.note[1], fin); else fin();
}
function targetDone() {
  const st = G.step; if (!st) return;
  G.ss.left--;
  if (st.sequential) { const nx = G.targets.find((t) => !t.done && !t.active); if (nx) { nx.active = true; if (nx.mesh) nx.mesh.visible = true; } }
  if (G.ss.left <= 0) completeStep(); else refreshObjective();
}
function updateStep(dt) {
  const st = G.step; if (!st) return;
  if (st.limit) { G.ss.lim -= dt; $('timer').textContent = Math.max(0, Math.ceil(G.ss.lim)); if (G.ss.lim <= 0) return endMission(false); }
  if (st.type === 'reach') { const p = st._p || (st._p = place(st.at)); if (Math.hypot(P.pos.x - p[0], P.pos.z - p[1]) < (st.r || 6)) completeStep(); }
  else if (st.type === 'survive') { G.ss.t -= dt; $('timer').textContent = Math.max(0, Math.ceil(G.ss.t)); if (G.ss.t <= 0) completeStep(); }
  else if (st.type === 'interact') {
    for (const t of G.targets) {
      if (t.done) continue;
      if (t.fire) { if (t.fire.lit) { t.done = true; targetDone(); if (G.step !== st) return; } continue; }
      if (t.d.onNear && !t.neared && Math.hypot(P.pos.x - t.x, P.pos.z - t.z) < (t.d.nearR || 26)) { t.neared = true; t.d.onNear(API, t); }
      if (t.glow) t.glow.material.opacity = 0.4 + Math.sin(G.time * 3 + t.x) * 0.2;
    }
  }
}
function updateNPCs(dt) {
  for (const a of G.actors) a.update(dt);
  for (const id in G.npcs) {
    const n = G.npcs[id]; if (n.sit) continue;
    const dx = P.pos.x - n.x, dz = P.pos.z - n.z;
    if (dx * dx + dz * dz < 64) n.mesh.rotation.y += wrapAngle(Math.atan2(dx, dz) - n.mesh.rotation.y) * Math.min(1, dt * 4);
    n.mesh.position.y = G.region.heightAt(n.x, n.z) + Math.sin(G.time * 1.4 + n.x) * 0.012;
  }
}

const API = {
  get player() { return P; }, get region() { return G.region; }, audio, sub, give, flash, lureVanish, ambush, setThreat, setDog, dogFlee,
  after: (s, fn) => after(s, fn), every: (s, fn) => after(s, fn, true),
  cue(at, name, scale = 1, ...extra) { const [x, z] = place(at); const [pan, vol] = pv({ x, z }, scale); audio[name](pan, vol, ...extra); },
  lure: lureAt, shake: (v) => { G.shake = v; }, setEnv: (n) => setEnv(n),
  fires(ids, ts) { ids.forEach((id, i) => { const f = G.region.fire(id); if (f) { f.lit = true; f.t = ts[i]; } }); },
};

// ---------- Bucle ----------
function updateHUD(dt) {
  $('b-health').style.width = P.health + '%'; $('b-stam').style.width = P.stamina + '%'; $('b-batt').style.width = (P.hasLight ? P.battery : 0) + '%';
  const it = findInter(), pr = $('prompt');
  if (P.mode === 'drive') { pr.textContent = 'E — ' + (P.veh.def.animal ? 'Desmontar' : 'Bajar'); pr.style.opacity = Math.abs(P.veh.speed) < 3 ? 0.8 : 0; }
  else if (it) { pr.textContent = 'E — ' + it.label; pr.style.opacity = 1; } else pr.style.opacity = 0;
  $('clock').textContent = fmtHour(G.hour) + '   ·   $ ' + (save.pesos || 0);
  const spd = $('speedo');
  if (P.mode === 'drive') { spd.style.display = 'block'; spd.textContent = Math.round(Math.abs(P.veh.speed) * 3.6) + ' km/h' + (P.veh.def.animal ? '' : '  ·  gasolina ' + Math.round(P.veh.fuel) + ' %'); } else spd.style.display = 'none';
  $('vignette').style.opacity = clamp(0.4 + envCur.fear * 0.3 + G.threat * 0.3, 0, 1);
  redT = Math.max(0, redT - dt * 0.9);
  $('blood').style.opacity = clamp((1 - P.health / 100) * 0.7 + redT, 0, 1);
  updateCompass();
  if (G.frame % 2 === 0) drawMinimap();
  if (G.subT > 0) { G.subT -= dt; if (G.subT <= 0) $('sub').style.opacity = 0; }
}
function ambient(dt) {
  for (const b of G.region.houses) {   // chirrido de las puertas al abrirse o cerrarse
    const o = b.door.open > 0.5;
    if (o !== !!b.door.was) { b.door.was = o; if (Math.hypot(P.pos.x - b.door.x, P.pos.z - b.door.z) < 14) audio.creak(pv(b.door)[0]); }
  }
  const f = G.region.nearLitFire(P.pos, 14);
  if (f && Math.random() < dt * 9) audio.crackle(1, pv(f)[0]);
  if (G.envName === 'DAWN' && Math.random() < dt * 0.9) audio.bird(Math.random() * 2 - 1);
  if (G.region.name === 'bogota' && Math.random() < dt * 0.035) { audio.thunder(); flash(); }
}
function update(dt) {
  G.dt = dt;
  if (G.talker) { G.talker.play(G.talker.base); G.talker = null; }   // terminó la conversación
  updatePlayer(dt);
  tickTimers();
  updateStep(dt);
  if (G.state !== 'play') return;
  updateCreature(dt); updateDog(dt); updateNPCs(dt); updateWorld(dt);
  stepEnv(1 - Math.exp(-dt * 0.35));
  // Dentro de una casa con la puerta cerrada no se ve nada de afuera (las ventanas son de fachada): no se dibuja el bosque.
  const home = G.region.inside(P.pos), shut = home && home.door.open < 0.04 && G.region.inside(camera.position) === home;
  G.region.update(dt, G.time, P.pos, shut ? -75 : envCur.view);
  updateSky(); syncCamera(); updateHUD(dt); ambient(dt);
  audio.threat = G.threat; audio.tick(dt, G.time);
  G.shake = Math.max(0, G.shake - dt * 2.2);
}
function menuFrame(dt) {
  G.time += dt;
  const a = G.time * 0.03, x = Math.cos(a) * 46, z = Math.sin(a) * 46;
  camera.position.set(x, G.region.heightAt(x, z) + 9, z);
  camera.lookAt(0, G.region.heightAt(0, 0) + 3, -8);
  P.pos.copy(camera.position);
  stepEnv(1); G.region.update(dt, G.time, camera.position, envCur.view); updateSky();
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.state === 'play' && !AUTO && !G.noLock && !locked()) G.unlockAcc += dt; else G.unlockAcc = 0;
  const paused = isPaused();
  $('pause').style.display = paused ? 'flex' : 'none';
  if (G.state === 'play' && !paused) { G.time += dt; update(dt); }
  else if (G.state === 'menu') menuFrame(dt);
  else if (G.region && G.state !== 'boot') {
    G.region.update(dt, G.time, P.pos, envCur.view); updateSky();
    for (const a of G.actors) a.update(dt);   // la gente sigue viva durante los diálogos y los menús
    if (G.life && G.state !== 'play') for (const p of G.life.peds) { const a = p.m.userData.actor; if (a && p.m.visible) a.update(dt); }
  }
  if (G.state === 'map' && G.frame % 6 === 0) drawBigMap();
  if (paused && P.mode === 'drive') audio.engine(false);
  if (G.frame++ % 3 === 0) updateGrain();
  if (GFX.hi) {
    sun.position.set(camera.position.x - 60, camera.position.y + 90, camera.position.z + 40); sun.target.position.copy(camera.position);
    spot.shadow.autoUpdate = spot.intensity > 0;
  }
  renderer.render(scene, camera);
}

// ---------- Menú ----------
function showMenu() {
  G.state = 'menu';
  $('menu').style.display = 'flex'; $('hud').style.display = 'none'; $('menu-main').style.display = 'block'; $('menu-chapters').style.display = 'none';
  $('btn-continue').style.display = save.part != null ? 'inline-block' : 'none';
  spot.intensity = 0; Av.visible = false;
}
function begin(idx, fresh) {
  audio.init(); audio.setAmb(envT.amb);
  if (fresh) { G.inv = []; G.notes = []; P.hasLight = false; P.battery = 100; save.pesos = 40; save.bag = {}; }
  lock(); startPart(idx);
}
function buildChapterList() {
  const unlocked = Q.has('all') ? 99 : save.unlocked ?? 0;
  $('chapter-list').innerHTML = CHAPTERS.map((c, ci) => {
    let h = `<div class="chap ${c.locked ? 'locked' : ''}"><h3><small>Capítulo ${c.num}</small>${c.name}</h3><div class="meta">${c.region} · ${c.biome}</div><p>${c.hook}</p>`;
    if (c.locked) h += '<div class="meta">Próximamente</div>';
    else h += '<div class="parts">' + c.parts.map((p, i) => `<button data-part="${i}" ${i > unlocked ? 'disabled' : ''}>${i + 1}. ${p.title}</button>`).join('') + '</div>';
    return h + '</div>';
  }).join('');
  $('chapter-list').querySelectorAll('button[data-part]').forEach((b) => b.addEventListener('click', () => begin(+b.dataset.part, false)));
}
$('btn-continue').addEventListener('click', () => begin(save.part ?? 0, false));
$('btn-new').addEventListener('click', () => begin(0, true));
$('btn-chapters').addEventListener('click', () => { buildChapterList(); $('menu-main').style.display = 'none'; $('menu-chapters').style.display = 'block'; });
$('btn-back').addEventListener('click', showMenu);
$('btn-free').addEventListener('click', () => { audio.init(); audio.setAmb(envT.amb); lock(); startPart(LIBRE); });

// ---------- Pausa y vuelta al menú de inicio ----------
function resume() { G.manualPause = false; G.unlockAcc = 0; lock(); }
function toMenu() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  G.manualPause = false; dlg = null; cardCb = null;
  for (const id of ['pause', 'dead', 'dialog', 'journal', 'card', 'bigmap', 'shop', 'choice']) $(id).style.display = 'none';
  choice = null;
  if (G.part && G.part.free) { save.hour = G.hour; persist(); }
  $('keys').style.visibility = 'visible';
  clearPart(); setDog(false);
  if (document.exitPointerLock) document.exitPointerLock();
  setRegion('tolima'); setEnv('MENU', true);
  showMenu();
}
$('btn-resume').addEventListener('click', resume);
$('btn-tomenu').addEventListener('click', toMenu);
$('btn-retry').addEventListener('click', retry);
$('btn-dead-menu').addEventListener('click', toMenu);
$('btn-quality').textContent = 'Gráficos: ' + (GFX.hi ? 'altos' : 'bajos');
$('btn-quality').addEventListener('click', () => { save.q = GFX.hi ? 'baja' : 'alta'; persist(); location.reload(); });

// ---------- Pruebas automáticas ----------
function forceStep() {
  const st = G.step;
  if (!st) { G.time += 30; tickTimers(); return; }
  if (st.type === 'talk') talkTo(G.npcs[st.npc]);
  else if (st.type === 'interact') {
    for (const t of [...G.targets]) {
      if (t.done) continue;
      if (t.d.onNear && !t.neared) { t.neared = true; t.d.onNear(API, t); }
      if (t.fire) G.region.lightFire(t.fire); else { t.active = true; useTarget(t); }
      if (G.step !== st) break;
    }
  } else if (st.type === 'reach') { const [x, z] = place(st.at); P.pos.set(x, 0, z); }
  else if (st.type === 'survive') G.ss.t = 0;
}
async function selftest() {
  const log = [];
  try {
    for (let i = 0; i < G.chapter.parts.length; i++) {
      await startPart(i);
      let guard = 0, steps = 0, lastStep = -1;
      while (G.state === 'play' && guard++ < 60) {
        for (let f = 0; f < 20 && G.state === 'play'; f++) { G.time += 0.05; update(0.05); }
        if (G.state !== 'play') break;
        if (G.stepIdx !== lastStep) { lastStep = G.stepIdx; steps++; }
        forceStep();
      }
      log.push(`parte ${i + 1} «${G.chapter.parts[i].title}»: ${G.state === 'partdone' ? 'ok' : 'NO TERMINÓ (' + G.state + ', paso ' + G.stepIdx + ')'} · ${steps}/${G.chapter.parts[i].steps.length} pasos`);
      if (G.state !== 'partdone') document.title = 'ERROR';
      G.state = 'play';
    }
  } catch (e) { showErr('SELFTEST: ' + (e.stack || e)); }
  const ok = document.title !== 'ERROR';
  const el = $('err'); el.style.display = 'block'; el.style.background = ok ? '#043' : '#400';
  el.textContent += `SELFTEST ${ok ? 'OK' : 'FALLÓ'}\n` + log.join('\n');
  document.title = ok ? 'SELFTEST OK' : 'SELFTEST FALLÓ';
}
function applyDebug() {
  if (Q.has('at')) { const v = Q.get('at'); const [x, z] = v.includes(',') ? v.split(',').map(Number) : place(v); P.pos.set(x, 0, z); }
  if (Q.has('yaw')) P.yaw = (+Q.get('yaw') * Math.PI) / 180;
  if (Q.has('pitch')) P.pitch = (+Q.get('pitch') * Math.PI) / 180;
  if (Q.has('light')) { P.hasLight = true; P.lightOn = Q.get('light') === '1'; }
  if (Q.has('cre')) { C.lure = null; placeCre(+Q.get('cre'), 0, true); showCre('monster'); C.hold = 9999; C.obj.light.intensity = 5; }
  if (Q.has('lure')) { placeCre(+Q.get('lure'), 0, true); C.lure = {}; showCre('lure'); }
  if (Q.has('fire')) for (const f of G.region.fires) G.region.lightFire(f, 999);
  if (Q.has('hour')) { G.hour = +Q.get('hour'); if (G.part.free) setEnv(freeEnv(G.hour), true); }
  if (Q.has('view')) P.view = Q.get('view');
  if (Q.has('veh')) { const ve = G.vehicles.find((q) => q.type === Q.get('veh')); if (ve) enterVehicle(ve); }
  if (Q.has('map')) openMap();
  if (Q.has('shop')) openShop();
}

async function boot() {
  resize();
  await loadTextures(); applyTextures();
  // Muebles y objetos reales (Poly Haven, CC0) solo en calidad alta; en baja se usan los hechos por código.
  if (GFX.hi && (await loadProps(['mesa', 'silla', 'cama', 'cajon', 'barril', 'banca', 'alacena', 'armario', 'botellas', 'jarra', 'olla_barro', 'vasija', 'lampara_petroleo', 'candelero', 'canasto', 'balde', 'escoba', 'taburete', 'matera', 'helecho'])) > 0) PROP.make = makeProp;
  // Personas reales (MakeHuman/MPFB, CC0) con animaciones de Mesh2Motion (CC0). En calidad baja, figuras hechas por código.
  if (GFX.hi && (await loadModels({ people: ['campesino', 'campesino-viejo', 'campesina', 'campesina-vieja'], animals: false }))) {
    scene.remove(Av); Av = makePerson({ ...JOURNO, animated: true }); scene.add(Av); Av.visible = false;
  }
  setRegion('tolima'); setEnv('MENU', true);
  try { await Promise.race([renderer.compileAsync(scene, camera), new Promise((r) => setTimeout(r, 4000))]); } catch { /* precompilar los sombreadores es opcional */ }
  $('loading').style.display = 'none';
  requestAnimationFrame(frame);
  if (SELFTEST) return selftest();
  await photosReady;
  if (Q.has('free')) { await startPart(LIBRE); applyDebug(); return; }
  if (Q.has('part')) { await startPart(clamp(+Q.get('part') - 1, 0, G.chapter.parts.length - 1)); applyDebug(); return; }
  showMenu();
}
// Gancho de pruebas: solo con ?debug o en modo automático.
if (Q.has('debug') || AUTO) window.__game = { G, P, C, Dg, API, save, startPart, die, hurt, findInter, toMenu, resume, isPaused, GFX, renderer, get Av() { return Av; }, keys, enterVehicle, exitVehicle, openMap, closeMap, startMission, endMission, forceStep, updateRoute, update, LIBRE, MISSIONS, GOODS, openShop, closeShop, buy, useItem, openChoice, pickChoice, talkTo, dropCandle, bagCount };
boot().catch((e) => showErr('Arranque: ' + (e.stack || e)));
