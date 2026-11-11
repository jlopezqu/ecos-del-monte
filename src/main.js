// Ecos del Monte — bucle principal, jugador, criatura, misiones e interfaz.
import * as THREE from 'three';
import { buildTolima, buildBogota, place, glowTex } from './world.js';
import { makePerson, makePatasola, makeDog, makeItem } from './entities.js';
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
  DAWN: { sky: 0xe6b58c, fog: 0.007, hemi: 2.4, hemiCol: 0xffe0c0, sun: 2.0, sunCol: 0xffc890, stars: 0, fear: 0, view: 430, night: 0, flies: 0, amb: A(0.05, 0.04, 0, 0) },
};

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
spot.position.set(0.22, -0.18, 0); camera.add(spot);
spot.target.position.set(0, -0.05, -6); camera.add(spot.target);

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

const G = {
  state: 'boot', time: 0, chapter: CHAPTERS[0], partIdx: 0, stepIdx: -1, part: null, step: null, ss: { left: 0, t: 0 },
  region: null, regions: {}, dyn: new THREE.Group(), inter: [], npcs: {}, targets: [], timers: [], inv: save.inv || [], notes: save.notes || [],
  shake: 0, threat: 0, subT: 0, cur: null, noLock: false, lockFails: 0, lockFailT: 0, unlockAcc: 0, envName: 'NIGHT1', deadT: 0, frame: 0,
};
scene.add(G.dyn);
const P = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, vx: 0, vz: 0, health: 100, stamina: 100, tired: false, battery: 100, hasLight: false, lightOn: false, crouch: 0, bob: 0, stepAcc: 0, lastHurt: -99, sprintT: -9 };

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
  if (!G.regions[name]) G.regions[name] = name === 'bogota' ? buildBogota() : buildTolima(Q.get('q') === 'low' ? 0.6 : 1);
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
  const st = G.step; if (!st) return '…';
  let t = st.text;
  if (st.type === 'interact') { const all = G.targets.filter((x) => !x.d.optional); if (all.length > 1) t += ` (${all.filter((x) => x.done).length}/${all.length})`; }
  return t;
}
function refreshObjective() {
  $('obj-part').textContent = `${G.chapter.kicker} · Parte ${G.partIdx + 1} de ${G.chapter.parts.length} · ${G.part.title}`;
  $('obj-text').textContent = objectiveText();
}
function openJournal() {
  const ch = G.chapter; G.state = 'journal';
  let h = `<h2>${ch.kicker} — ${ch.name}</h2><p class="dim">Parte ${G.partIdx + 1} de ${ch.parts.length} · ${G.part.title} · ${G.part.place}</p><h3>Objetivo</h3><p>${objectiveText()}</p>`;
  h += `<h3>Llevas contigo</h3><p>${G.inv.length ? G.inv.join(' · ') : 'Nada todavía.'}</p>`;
  if (G.partIdx >= ch.codex.from) h += `<h3>El mito · ${ch.codex.title}</h3><p>${ch.codex.text}</p>`;
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
  G.state = 'dead'; G.deadT = performance.now(); hideCre(); audio.threat = 0;
  $('dead').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
}
function retry() { if (performance.now() - G.deadT < 900) return; $('dead').style.display = 'none'; lock(); startPart(G.partIdx, true); }

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
  const repelDog = dogD < (cfg.dogR ?? 15);
  const fire = G.region.nearLitFire(C.pos, 9.5);
  let mx, mz, speed;
  if (fire) {
    let fx = C.pos.x - fire.x, fz = C.pos.z - fire.z; const fd = Math.hypot(fx, fz) || 1; fx /= fd; fz /= fd;
    mx = fx * 0.8 - fz * 0.6; mz = fz * 0.8 + fx * 0.6; speed = 3.6;
  } else if (repelDog) {
    mx = -dx * 0.8 - dz * 0.5; mz = -dz * 0.8 + dx * 0.5; speed = 5; C.repelT += dt;
    if (cfg.frenzy && C.repelT > (cfg.frenzyT ?? 5)) { Dg.scared = 8; C.repelT = 0; sub('Canelo se encoge contra tus piernas, gimiendo.', 3.5); audio.yelp(0, 0.6); }
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
const Dg = { obj: makeDog(), pos: new THREE.Vector3(), active: false, scared: 0, cueT: 0, flee: null };
scene.add(Dg.obj.root); Dg.obj.root.visible = false;
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
  P.yaw -= e.movementX * 0.0022; P.pitch = clamp(P.pitch - e.movementY * 0.0022, -1.35, 1.35);
});
document.addEventListener('mousedown', () => {
  audio.init();
  if (G.state === 'dialog') advanceDialog();
  else if (G.state === 'card') cardContinue();
  else if (G.state === 'dead') retry();
  else if (G.state === 'play' && !locked()) lock();
});
document.addEventListener('wheel', (e) => { if (G.state === 'journal') $('journal-body').scrollTop += e.deltaY; });
function onKey(c) {
  if (G.state === 'play') {
    if (c === 'KeyE') useInteract();
    else if (c === 'KeyF') { if (P.hasLight) { P.lightOn = !P.lightOn; audio.tone({ f: [1800, 900], dur: 0.04, vol: 0.05 }); } }
    else if (c === 'Tab' || c === 'KeyJ') openJournal();
  } else if (G.state === 'dialog') { if (c === 'KeyE' || c === 'Space' || c === 'Enter') advanceDialog(); }
  else if (G.state === 'journal') { if (c === 'Tab' || c === 'KeyJ' || c === 'Escape') closeJournal(); }
  else if (G.state === 'card') { if (c === 'Enter' || c === 'Space' || c === 'KeyE') cardContinue(); }
  else if (G.state === 'dead') { if (c === 'Enter' || c === 'Space' || c === 'KeyE') retry(); }
}
function updatePlayer(dt) {
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const crouch = keys.has('KeyC') || keys.has('ControlLeft');
  const moving = f !== 0 || s !== 0;
  const sprint = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && f > 0 && !P.tired && !crouch;
  if (sprint) { P.stamina -= 13 * dt; P.sprintT = G.time; if (P.stamina <= 0) { P.stamina = 0; P.tired = true; } }
  else if (G.time - P.sprintT > 1) { P.stamina = Math.min(100, P.stamina + (moving ? 8 : 14) * dt); if (P.stamina > 35) P.tired = false; }
  const sp = crouch ? 1.9 : sprint ? 7.4 : P.tired ? 3.3 : 4.1;
  let wx = 0, wz = 0;
  if (moving) { const sn = Math.sin(P.yaw), cs = Math.cos(P.yaw); wx = -sn * f + cs * s; wz = -cs * f - sn * s; const l = Math.hypot(wx, wz); wx = (wx / l) * sp; wz = (wz / l) * sp; }
  const k = 1 - Math.exp(-dt * 12);
  P.vx += (wx - P.vx) * k; P.vz += (wz - P.vz) * k;
  P.pos.x += P.vx * dt; P.pos.z += P.vz * dt;
  G.region.col.resolve(P.pos, 0.4); G.region.bounds(P.pos);
  P.pos.y = G.region.heightAt(P.pos.x, P.pos.z);
  const v = Math.hypot(P.vx, P.vz);
  P.crouch += ((crouch ? 1 : 0) - P.crouch) * (1 - Math.exp(-dt * 10));
  P.bob += v * dt * 1.9;
  P.stepAcc += v * dt;
  if (P.stepAcc > (sprint ? 2.6 : 2.0)) { P.stepAcc = 0; audio.step(G.region.ground === 'stone'); }
  if (G.time - P.lastHurt > 7 && P.health < 100) P.health = Math.min(100, P.health + 4 * dt);
  if (P.lightOn) P.battery = Math.max(0, P.battery - dt * 0.26);
  let li = 0;
  if (P.lightOn) { li = P.battery > 0 ? 150 : 16; if ((P.battery < 14 || G.threat > 0.75) && Math.random() < 0.08) li *= 0.25; }
  spot.intensity = li;
}
function syncCamera() {
  const v = Math.hypot(P.vx, P.vz), sh = G.shake * 0.05;
  camera.position.set(P.pos.x, P.pos.y + 1.68 - P.crouch * 0.65 + Math.sin(P.bob * 2) * 0.035 * Math.min(1, v / 4), P.pos.z);
  camera.rotation.set(P.pitch + (Math.random() - 0.5) * sh, P.yaw + (Math.random() - 0.5) * sh, 0, 'YXZ');
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
}
function spawnNPCs(part) {
  for (const id in part.npcs || {}) {
    const def = G.chapter.npcs[id], raw = part.npcs[id];
    const spec = typeof raw === 'string' || Array.isArray(raw) ? { at: raw } : raw;
    const [x, z] = place(spec.at), y = G.region.heightAt(x, z);
    const m = makePerson({ ...def.look, sit: spec.sit });
    m.position.set(x, y, z); m.rotation.y = spec.face ?? 0; G.dyn.add(m);
    const npc = { id, def, mesh: m, x, z, sit: !!spec.sit };
    G.npcs[id] = npc;
    addInter({ pos: new THREE.Vector3(x, y, z), r: 3.3, label: `Hablar con ${def.name}`, use: () => talkTo(npc) });
  }
}
function talkTo(npc) {
  const st = G.step;
  if (st && st.type === 'talk' && st.npc === npc.id) return openDialog(st.lines, completeStep);
  openDialog((G.part.idle && G.part.idle[npc.id]) || npc.def.idle || [[npc.def.name, '…']], null);
}
function spawnExtras(part) {
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
  const ch = G.chapter, part = ch.parts[idx];
  G.state = 'loading';
  await fadeTo(1, 500);
  clearPart();
  G.partIdx = idx; G.part = part; G.stepIdx = -1;
  if (restore) { G.inv = [...(save.inv || [])]; G.notes = (save.notes || []).map((n) => [...n]); }
  save.part = idx; save.unlocked = Math.max(save.unlocked ?? 0, idx); save.inv = [...G.inv]; save.notes = G.notes.map((n) => [...n]); persist();
  setRegion(part.region);
  const [sx, sz] = place(part.spawn.at);
  P.pos.set(sx, 0, sz); P.yaw = part.spawn.yaw ?? 0; P.pitch = 0; P.vx = P.vz = 0; P.health = 100; P.stamina = 100; P.tired = false; P.lastHurt = -99;
  P.hasLight = idx > 0;
  P.battery = Math.max(P.battery, 65);
  P.lightOn = P.hasLight && ENV[part.env].night > 0.8;
  G.region.col.resolve(P.pos, 0.4); P.pos.y = G.region.heightAt(P.pos.x, P.pos.z);
  setEnv(part.env, true);
  spawnNPCs(part); spawnExtras(part);
  setThreat(part.threat || null); setDog(!!part.dog);
  $('hud').style.display = 'block'; $('menu').style.display = 'none';
  syncCamera();
  G.region.update(0, G.time, P.pos, envCur.view);
  refreshObjective();
  showCard({ kicker: `${ch.kicker} · Parte ${idx + 1} de ${ch.parts.length}`, title: part.title, lines: [part.place, ...part.intro], photo: photoFor(part.region, idx) }, () => { G.state = 'play'; startStep(0); });
  await fadeTo(0, 0);
}
function startStep(i) {
  const part = G.part;
  if (i >= part.steps.length) return completePart();
  const st = part.steps[i];
  G.stepIdx = i; G.step = st; G.ss = { left: 0, t: st.seconds || 0 }; G.targets = [];
  if (st.threat !== undefined) setThreat(st.threat);
  if (st.dog !== undefined) setDog(st.dog);
  if (st.type === 'interact') spawnTargets(st);
  $('timer').style.display = st.type === 'survive' ? 'block' : 'none';
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
  if (it) { pr.textContent = 'E — ' + it.label; pr.style.opacity = 1; } else pr.style.opacity = 0;
  $('vignette').style.opacity = clamp(0.4 + envCur.fear * 0.3 + G.threat * 0.3, 0, 1);
  redT = Math.max(0, redT - dt * 0.9);
  $('blood').style.opacity = clamp((1 - P.health / 100) * 0.7 + redT, 0, 1);
  updateCompass();
  if (G.subT > 0) { G.subT -= dt; if (G.subT <= 0) $('sub').style.opacity = 0; }
}
function ambient(dt) {
  const f = G.region.nearLitFire(P.pos, 14);
  if (f && Math.random() < dt * 9) audio.crackle(1, pv(f)[0]);
  if (G.envName === 'DAWN' && Math.random() < dt * 0.9) audio.bird(Math.random() * 2 - 1);
  if (G.region.name === 'bogota' && Math.random() < dt * 0.035) { audio.thunder(); flash(); }
}
function update(dt) {
  updatePlayer(dt);
  tickTimers();
  updateStep(dt);
  if (G.state !== 'play') return;
  updateCreature(dt); updateDog(dt); updateNPCs(dt);
  stepEnv(1 - Math.exp(-dt * 0.35));
  G.region.update(dt, G.time, P.pos, envCur.view);
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
  const paused = G.unlockAcc > 0.35;
  $('pause').style.display = paused ? 'flex' : 'none';
  if (G.state === 'play' && !paused) { G.time += dt; update(dt); }
  else if (G.state === 'menu') menuFrame(dt);
  else if (G.region && G.state !== 'boot') { G.region.update(dt, G.time, P.pos, envCur.view); updateSky(); }
  if (G.frame++ % 3 === 0) updateGrain();
  renderer.render(scene, camera);
}

// ---------- Menú ----------
function showMenu() {
  G.state = 'menu';
  $('menu').style.display = 'flex'; $('hud').style.display = 'none'; $('menu-main').style.display = 'block'; $('menu-chapters').style.display = 'none';
  $('btn-continue').style.display = save.part != null ? 'inline-block' : 'none';
  spot.intensity = 0;
}
function begin(idx, fresh) {
  audio.init(); audio.setAmb(envT.amb);
  if (fresh) { G.inv = []; G.notes = []; P.hasLight = false; P.battery = 100; }
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
}

async function boot() {
  resize();
  setRegion('tolima'); setEnv('MENU', true);
  $('loading').style.display = 'none';
  requestAnimationFrame(frame);
  if (SELFTEST) return selftest();
  await photosReady;
  if (Q.has('part')) { await startPart(clamp(+Q.get('part') - 1, 0, G.chapter.parts.length - 1)); applyDebug(); return; }
  showMenu();
}
// Gancho de pruebas: solo con ?debug o en modo automático.
if (Q.has('debug') || AUTO) window.__game = { G, P, C, Dg, API, save, startPart, die, hurt, findInter };
boot().catch((e) => showErr('Arranque: ' + (e.stack || e)));
