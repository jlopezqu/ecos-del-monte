// Personajes, la Patasola, el perro y los objetos del mundo.
// Las personas se arman con cápsulas y esferas suaves (no cilindros), con rostro, manos, pelo y ropa
// de tela con trama en relieve. Siguen siendo figuras hechas por código, no modelos escaneados.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowSprite, GFX, TEX } from './world.js';
import { realPerson } from './people.js';

const matCache = new Map();
// Material sencillo para objetos pequeños.
function lam(color, emissive = 0) {
  const k = color + '_' + emissive;
  let m = matCache.get(k);
  if (!m) { m = new THREE.MeshLambertMaterial({ color, emissive }); matCache.set(k, m); }
  return m;
}
let fabricN = null;
// Tela: en calidad alta lleva el mapa normal de una tela real (ambientCG Fabric086).
function cloth(color, rough = 0.92, emissive = 0) {
  const k = 'c' + color + '_' + rough + '_' + emissive;
  let m = matCache.get(k);
  if (m) return m;
  if (GFX.hi) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, emissive, normalMap: fabricN, normalScale: new THREE.Vector2(0.75, 0.75) });
    m.userData.fabric = true;
  } else m = new THREE.MeshLambertMaterial({ color, emissive });
  matCache.set(k, m);
  return m;
}
function skinM(color, emissive = 0) {
  const k = 's' + color + '_' + emissive;
  let m = matCache.get(k);
  if (!m) { m = GFX.hi ? new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, emissive }) : new THREE.MeshLambertMaterial({ color, emissive }); matCache.set(k, m); }
  return m;
}
// Se llama cuando terminan de cargar las texturas: pone la trama de tela en los materiales ya creados.
export function applyTextures() {
  if (!GFX.hi || !TEX.fabric) return;
  fabricN = TEX.fabric.normal.clone(); fabricN.repeat.set(5, 5); fabricN.needsUpdate = true;
  for (const m of matCache.values()) if (m.userData.fabric) { m.normalMap = fabricN; m.needsUpdate = true; }
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 16);
const SPH = new THREE.SphereGeometry(1, 20, 14);
const CONE = new THREE.ConeGeometry(1, 1, 14);
const DISC = new THREE.CircleGeometry(1, 12);
const TORUS = new THREE.TorusGeometry(1, 0.18, 6, 14);
const RUANA = (() => { const g = new THREE.CylinderGeometry(0.17, 0.44, 0.58, 4, 1, true); g.rotateY(Math.PI / 4); const n = g.toNonIndexed(); n.computeVertexNormals(); return n; })();
const capCache = new Map();
function capG(r, len) {
  const k = r + '_' + len;
  let g = capCache.get(k);
  if (!g) { g = new THREE.CapsuleGeometry(r, len, 5, 12); capCache.set(k, g); }
  return g;
}

function M(geo, mat, sx, sy, sz, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  return m;
}
function Pm(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
function castShadows(root) {
  root.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) o.castShadow = true; });
  return root;
}
const DARK = 0x0b0907;

// Fusiona todas las mallas bajo `root` en una por material: muchas menos llamadas de dibujo.
// Solo para piezas que no se animan por separado.
export function flatten(root, shadows = true) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), mx = new THREE.Matrix4(), by = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(mx.multiplyMatrices(inv, o.matrixWorld));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!by.has(o.material)) by.set(o.material, []);
    by.get(o.material).push(g);
  });
  root.clear();
  for (const [mat, list] of by) {
    const mg = mergeGeometries(list);
    if (!mg) continue;
    const m = new THREE.Mesh(mg, mat);
    m.castShadow = shadows && !mat.isMeshBasicMaterial;
    root.add(m);
  }
  return root;
}

// Balanceo de piernas y brazos al caminar (solo personas creadas con animated: true).
// phase en radianes; amt de 0 (quieto) a 1 (paso largo). Las personas reales usan sus animaciones de esqueleto:
// dt es el tiempo del cuadro y rest la pose cuando están quietas.
export function animatePerson(g, phase, amt, dt = 0.016, rest = 'idle') {
  const u = g.userData;
  if (u.actor) {
    const walking = amt > 0.2;
    u.actor.play(walking ? 'walk' : rest, 0.25);
    u.actor.update(dt * (walking ? u.walkRate ?? 0.6 + amt * amt * 1.2 : 1));
    return;
  }
  if (!u.legs) return;
  const s = Math.sin(phase);
  u.legs.forEach((l, i) => { const k = i ? -s : s; l.hip.rotation.x = k * 0.55 * amt; l.knee.rotation.x = Math.max(0, -k) * 0.9 * amt; });
  u.arms.forEach((a, i) => { a.rotation.x = (i ? s : -s) * 0.45 * amt; });
  u.body.position.y = Math.abs(Math.cos(phase)) * 0.025 * amt;
}

// ---------- Gente del pueblo ----------
// Opciones: animated (piernas y brazos móviles: el periodista y los vecinos que caminan),
// simple (menos detalle de rostro y sin sombra, para figurantes), sit (sentado).
export function makePerson(o = {}) {
  const real = realPerson(o);   // en calidad alta, una persona real (modelo con esqueleto); si no hay modelos, la figura hecha por código
  if (real) return real;
  const g = new THREE.Group(), body = new THREE.Group(), core = new THREE.Group();
  g.add(body); body.add(core);
  const skin = skinM(o.skin ?? 0xa87a56), shirt = cloth(o.cloth ?? 0x6a5a48), pants = cloth(o.pants ?? 0x2b2b33), hair = cloth(o.hair ?? 0x18120c, 0.7);
  const robe = o.skirt != null, long = robe && o.skirt === (o.cloth ?? -1);   // falda, o sotana si es del color de la camisa
  const robeM = robe ? cloth(o.skirt) : null, shoe = lam(0x241a12);

  // piernas: cadera a 0,95 m, rodilla articulada
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.09, 0.95, 0);
    hip.add(Pm(capG(0.068, 0.34), robe ? skin : pants, 0, -0.22, 0));
    const knee = new THREE.Group(); knee.position.set(0, -0.45, 0);
    knee.add(Pm(capG(0.052, 0.34), robe ? skin : pants, 0, -0.2, 0));
    knee.add(M(BOX, shoe, 0.095, 0.07, 0.24, 0, -0.455, 0.045));
    hip.add(knee);
    if (o.sit) { hip.rotation.x = -1.35; knee.rotation.x = 1.1; }
    body.add(hip); legs.push({ hip, knee });
  }

  // tronco
  if (robe) core.add(Pm(new THREE.CylinderGeometry(0.15, long ? 0.26 : 0.31, long ? 0.92 : 0.62, 20, 1, true), robeM, 0, long ? 0.52 : 0.66, 0));
  core.add(M(SPH, robe ? robeM : pants, 0.165, 0.11, 0.12, 0, 0.95, 0));
  const torso = Pm(capG(0.13, 0.26), shirt, 0, 1.2, 0); torso.scale.set(1.18, 1, 0.8); core.add(torso);
  core.add(M(SPH, shirt, 0.172, 0.085, 0.118, 0, 1.385, 0));
  core.add(M(CYL, skin, 0.045, 0.1, 0.045, 0, 1.49, 0));
  if (long) core.add(M(CYL, lam(0xe8e4d8), 0.05, 0.025, 0.05, 0, 1.475, 0));   // alzacuello
  if (o.ruana) { const r = Pm(RUANA, cloth(o.ruana), 0, 1.2, 0); r.scale.set(1, 1, 0.62); core.add(r); }

  // brazos con codo
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.19, 1.4, 0); sh.rotation.z = s * 0.07;
    sh.add(Pm(capG(0.05, 0.22), shirt, 0, -0.15, 0));
    const el = new THREE.Group(); el.position.set(0, -0.3, 0); el.rotation.x = -0.28;
    el.add(Pm(capG(0.042, 0.2), o.ruana || long ? shirt : skin, 0, -0.13, 0));
    el.add(M(SPH, skin, 0.036, 0.052, 0.026, 0, -0.3, 0.005));
    sh.add(el); body.add(sh); arms.push(sh);
  }

  // cabeza y rostro
  const head = new THREE.Group(); head.position.set(0, 1.63, 0); body.add(head);
  head.add(M(SPH, skin, 0.1, 0.122, 0.108));
  head.add(M(SPH, skin, 0.082, 0.07, 0.085, 0, -0.065, 0.018));
  const eyeD = lam(0x140e0a);
  for (const s of [-1, 1]) head.add(M(SPH, eyeD, 0.008, 0.008, 0.006, s * 0.037, 0.018, 0.102));
  if (!o.simple) {
    const eyeW = lam(0xe8e2d4);
    head.add(M(SPH, skin, 0.02, 0.028, 0.026, 0, -0.012, 0.105));
    for (const s of [-1, 1]) {
      head.add(M(SPH, eyeW, 0.016, 0.011, 0.01, s * 0.037, 0.018, 0.094));
      head.add(M(BOX, hair, 0.036, 0.007, 0.01, s * 0.037, 0.04, 0.098));
      head.add(M(SPH, skin, 0.012, 0.024, 0.014, s * 0.1, -0.005, 0));
    }
    head.add(M(BOX, lam(0x7a4034), 0.032, 0.005, 0.008, 0, -0.06, 0.099));
  }
  if (!o.bald) {
    head.add(M(SPH, hair, 0.112, 0.11, 0.115, 0, 0.045, -0.022));
    if (o.longHair) {
      head.add(Pm(capG(0.075, 0.26), hair, 0, -0.17, -0.075));
      for (const s of [-1, 1]) head.add(Pm(capG(0.028, 0.14), hair, s * 0.1, -0.07, -0.03));
    }
  }
  if (o.hat) {
    const hm = cloth(o.hat, 0.85);
    head.add(Pm(new THREE.CylinderGeometry(0.27, 0.29, 0.014, 26), hm, 0, 0.105, 0));
    head.add(Pm(new THREE.CylinderGeometry(0.098, 0.112, 0.115, 22), hm, 0, 0.165, 0));
    head.add(Pm(new THREE.CylinderGeometry(0.114, 0.114, 0.03, 22), lam(DARK), 0, 0.125, 0));
  }
  if (o.sit) body.position.y = -0.47;

  if (o.animated) {   // tronco y cabeza fusionados; piernas y brazos sueltos para poder moverlos
    flatten(core, !o.simple); flatten(head, !o.simple);
    if (!o.simple) castShadows(g);
    g.userData.head = head; g.userData.arms = arms; g.userData.legs = legs; g.userData.body = body;
  } else flatten(g, !o.simple);   // figura quieta: una malla por material
  return g;
}

// ---------- La Patasola: forma de señuelo (mujer de blanco) y forma real ----------
export function makePatasola() {
  const root = new THREE.Group(), mon = new THREE.Group(), lure = new THREE.Group();
  root.add(mon, lure);
  const flesh = skinM(0x39423a), pale = skinM(0x6c7262), dark = cloth(DARK, 0.8), rag = cloth(0x3a1a14), bone = lam(0xcfc7b0);

  mon.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.22, 12), lam(DARK)).translateY(0.11));
  mon.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 1.15, 12), flesh).translateY(0.78));
  mon.add(M(SPH, flesh, 0.13, 0.11, 0.13, 0, 0.74, 0.02));   // rodilla nudosa
  const up = new THREE.Group(); up.position.y = 1.3; up.rotation.x = 0.22; mon.add(up);
  up.add(M(CONE, rag, 0.5, 1.0, 0.5, 0, 0.15, 0));
  up.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.85, 12), flesh).translateY(0.55));
  for (let i = 0; i < 4; i++) { const r = M(TORUS, flesh, 0.2 - i * 0.008, 0.2 - i * 0.008, 0.16, 0, 0.42 + i * 0.12, 0.02); r.rotation.x = Math.PI / 2; up.add(r); }   // costillas
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.26, 0.9, 0.02); arm.rotation.set(-0.75, 0, s * 0.28);
    arm.add(Pm(capG(0.045, 0.56), flesh, 0, -0.3, 0));
    arm.add(Pm(capG(0.036, 0.56), flesh, 0, -0.92, 0));
    arm.add(M(SPH, flesh, 0.055, 0.055, 0.055, 0, -0.62, 0));
    for (const cx of [-0.045, -0.015, 0.015, 0.045]) { const c = M(CONE, bone, 0.016, 0.24, 0.016, cx, -1.36, 0); c.rotation.x = Math.PI; arm.add(c); }
    up.add(arm); arms.push(arm);
  }
  up.add(M(SPH, pale, 0.19, 0.24, 0.2, 0, 1.12, 0.1));
  up.add(M(BOX, new THREE.MeshBasicMaterial({ color: 0x000000 }), 0.15, 0.13, 0.05, 0, 1.02, 0.275));
  for (const s of [-1, 1]) {
    const f1 = M(CONE, bone, 0.014, 0.07, 0.014, s * 0.035, 1.065, 0.295); f1.rotation.x = Math.PI; up.add(f1);
    up.add(M(CONE, bone, 0.014, 0.07, 0.014, s * 0.05, 0.98, 0.295));
  }
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffc233 });
  const eyes = [-1, 1].map((s) => { const e = M(SPH, eyeM, 0.04, 0.04, 0.04, s * 0.075, 1.17, 0.265); up.add(e); const gl = glowSprite(0xffa020, 0.2, 0.8); gl.position.set(s * 0.075, 1.17, 0.3); up.add(gl); return e; });
  up.add(M(CONE, dark, 0.44, 1.7, 0.4, 0, 0.55, -0.17));
  for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1, k = Math.floor(i / 2); up.add(Pm(capG(0.022, 0.7 + k * 0.12), dark, s * (0.13 + k * 0.035), 0.82 - k * 0.05, 0.13 - k * 0.05)); }   // mechones
  const light = new THREE.PointLight(0xff3a18, 0, 8, 1.8); light.position.set(0, 2.1, 0.5); mon.add(light);

  const white = cloth(0xd9d4c6, 0.9, 0x4a4840), lskin = skinM(0xcdb9a0, 0x2a2622);
  lure.add(Pm(new THREE.CylinderGeometry(0.14, 0.42, 1.25, 20, 1, true), white, 0, 0.63, 0));
  const lt = Pm(capG(0.12, 0.26), white, 0, 1.38, 0); lt.scale.set(1.1, 1, 0.8); lure.add(lt);
  lure.add(Pm(capG(0.036, 0.52), lskin, -0.2, 1.24, 0));
  const beck = new THREE.Group(); beck.position.set(0.18, 1.58, 0); beck.rotation.set(-0.9, 0, -0.5);
  beck.add(Pm(capG(0.036, 0.52), lskin, 0, 0.3, 0)); lure.add(beck);
  lure.add(M(SPH, lskin, 0.1, 0.125, 0.108, 0, 1.8, 0));
  lure.add(M(SPH, dark, 0.108, 0.1, 0.112, 0, 1.85, -0.03));
  lure.add(Pm(capG(0.085, 0.75), dark, 0, 1.38, -0.085));

  castShadows(root);
  return {
    root, mon, lure, up, arms, beck, eyes, light,
    setForm(f) { mon.visible = f === 'monster'; lure.visible = f === 'lure'; },
  };
}

// ---------- Canelo ----------
export function makeDog() {
  const root = new THREE.Group();
  const fur = cloth(0xa56a34, 0.95), dk = cloth(0x3a2412, 0.9), black = lam(DARK);
  const b = Pm(capG(0.13, 0.36), fur, 0, 0.42, 0); b.rotation.x = Math.PI / 2; root.add(b);
  root.add(M(SPH, fur, 0.105, 0.1, 0.115, 0, 0.6, 0.36));
  const sn = Pm(capG(0.045, 0.08), dk, 0, 0.565, 0.47); sn.rotation.x = Math.PI / 2; root.add(sn);
  root.add(M(SPH, black, 0.02, 0.016, 0.016, 0, 0.575, 0.555));
  for (const s of [-1, 1]) {
    const ear = M(SPH, dk, 0.03, 0.06, 0.02, s * 0.075, 0.66, 0.33); ear.rotation.z = s * 0.5; root.add(ear);
    root.add(M(SPH, black, 0.012, 0.012, 0.008, s * 0.045, 0.625, 0.455));
    root.add(Pm(capG(0.035, 0.26), fur, s * 0.085, 0.165, 0.2), Pm(capG(0.035, 0.26), fur, s * 0.085, 0.165, -0.2));
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.5, -0.3);
  const t = Pm(capG(0.022, 0.24), fur, 0, 0.1, -0.1); t.rotation.x = -0.9; tail.add(t);
  root.add(tail);
  castShadows(root);
  return { root, tail };
}

// ---------- Animales de corral ----------
export function makeChicken() {
  const root = new THREE.Group();
  const f = cloth(0xb8823e, 0.95), red = lam(0xa82018), yel = lam(0xd9a030);
  root.add(M(SPH, f, 0.1, 0.09, 0.14, 0, 0.2, 0), M(SPH, f, 0.05, 0.055, 0.05, 0, 0.32, 0.1));
  const beak = M(CONE, yel, 0.015, 0.04, 0.015, 0, 0.315, 0.16); beak.rotation.x = Math.PI / 2; root.add(beak);
  root.add(M(BOX, red, 0.012, 0.035, 0.05, 0, 0.375, 0.1), M(CONE, f, 0.06, 0.12, 0.03, 0, 0.27, -0.14));
  for (const s of [-1, 1]) root.add(M(CYL, yel, 0.008, 0.12, 0.008, s * 0.04, 0.06, 0));
  flatten(root, false);
  return { root };
}
export function makeCow() {
  const root = new THREE.Group();
  const hide = cloth(0x6a4630, 0.95), pale = cloth(0xd8cdb8, 0.95);
  const b = Pm(capG(0.34, 0.95), hide, 0, 0.95, 0); b.rotation.x = Math.PI / 2; root.add(b);
  root.add(M(SPH, pale, 0.2, 0.22, 0.3, 0.2, 1.0, 0.2));
  const neck = Pm(capG(0.16, 0.3), hide, 0, 1.12, 0.78); neck.rotation.x = 1.0; root.add(neck);
  root.add(M(SPH, hide, 0.15, 0.17, 0.26, 0, 1.12, 1.08), M(SPH, pale, 0.11, 0.1, 0.1, 0, 1.06, 1.3));
  for (const s of [-1, 1]) {
    const h = M(CONE, pale, 0.03, 0.2, 0.03, s * 0.13, 1.3, 0.98); h.rotation.z = -s * 0.7; root.add(h);
    root.add(M(SPH, hide, 0.05, 0.03, 0.08, s * 0.2, 1.18, 0.98));
    root.add(Pm(capG(0.075, 0.55), hide, s * 0.2, 0.36, 0.5), Pm(capG(0.075, 0.55), hide, s * 0.2, 0.36, -0.5));
  }
  root.add(Pm(capG(0.025, 0.6), hide, 0, 0.8, -0.86));
  flatten(root);
  return { root };
}

// ---------- Objetos ----------
export function makeItem(kind) {
  const g = new THREE.Group();
  let glowC = 0xffe9b0, glowS = 0.75, glowY = 0.18;
  const paper = (c, w = 0.24, d = 0.32) => g.add(M(BOX, lam(c, 0x221f1a), w, 0.02, d, 0, 0.02, 0));
  switch (kind) {
    case 'papel': paper(0xe2d9bf); break;
    case 'carta': paper(0xd6c79c, 0.2, 0.28); break;
    case 'telegrama': paper(0xd9cf9a, 0.26, 0.16); break;
    case 'diario': g.add(M(BOX, lam(0x4a2f1c, 0x140c06), 0.2, 0.05, 0.28, 0, 0.03, 0)); break;
    case 'retrato': g.add(M(BOX, lam(0x1c1410), 0.26, 0.03, 0.32, 0, 0.02, 0), M(BOX, lam(0x9a8f7a, 0x26221c), 0.19, 0.035, 0.25, 0, 0.022, 0)); break;
    case 'linterna': {
      const b = M(CYL, lam(0x8a8d92, 0x1a1a1c), 0.035, 0.22, 0.035, 0, 0.04, 0); b.rotation.z = Math.PI / 2; g.add(b);
      const h = M(CYL, lam(0xc9b25a, 0x2a2410), 0.05, 0.06, 0.05, 0.13, 0.04, 0); h.rotation.z = Math.PI / 2; g.add(h);
      break;
    }
    case 'camara': {
      g.add(M(BOX, lam(0x1a1a1c, 0x101012), 0.17, 0.1, 0.07, 0, 0.05, 0));
      const l = M(CYL, lam(0x55585c, 0x16161a), 0.035, 0.06, 0.035, 0, 0.05, 0.06); l.rotation.x = Math.PI / 2; g.add(l);
      break;
    }
    case 'hacha': {
      g.add(M(CYL, lam(0x3b2a1c), 0.38, 0.55, 0.38, 0, 0.27, 0));
      const hd = M(CYL, lam(0x6a5236), 0.025, 0.8, 0.025, 0.12, 0.86, 0); hd.rotation.z = -0.5; g.add(hd);
      g.add(M(BOX, lam(0x7d8086, 0x18181a), 0.05, 0.16, 0.2, -0.06, 0.58, 0));
      glowY = 0.9; break;
    }
    case 'olla': {
      g.add(M(BOX, lam(0x4a3523), 1.2, 0.05, 0.5, 0, 0.42, 0));
      for (const x of [-0.42, 0, 0.42]) g.add(M(CYL, lam(0xcfc8b4, 0x1c1a16), 0.12, 0.02, 0.12, x, 0.46, 0.05));
      g.add(M(CYL, lam(0x18181a), 0.14, 0.18, 0.14, 0.3, 0.54, -0.14));
      for (const x of [-0.55, 0.55]) g.add(M(BOX, lam(0x4a3523), 0.06, 0.42, 0.4, x, 0.21, 0));
      glowY = 0.75; break;
    }
    case 'huella': {
      const m = new THREE.MeshBasicMaterial({ color: 0x0a0705 });
      for (const s of [-1, 1]) { const d = M(DISC, m, 0.075, 0.15, 1, s * 0.07, 0.04, 0); d.rotation.x = -Math.PI / 2; d.rotation.z = s * 0.14; g.add(d); }
      glowC = 0xbfe0a0; glowS = 0.6; break;
    }
    case 'sombrero':
      g.add(M(CYL, lam(0xcdbb8a, 0x221e12), 0.3, 0.02, 0.3, 0, 0.02, 0), M(CYL, lam(0xcdbb8a, 0x221e12), 0.13, 0.13, 0.13, 0, 0.09, 0), M(CYL, lam(DARK), 0.135, 0.035, 0.135, 0, 0.05, 0));
      break;
    case 'tabaco':
      for (const z of [-0.03, 0, 0.03]) { const c = M(CYL, lam(0x5a3a22, 0x140c06), 0.014, 0.16, 0.014, 0, 0.03, z); c.rotation.z = Math.PI / 2; g.add(c); }
      break;
    case 'frasco':
      g.add(M(CYL, lam(0x9fc4cc, 0x202c30), 0.045, 0.14, 0.045, 0, 0.07, 0), M(CYL, lam(0x6a5236), 0.025, 0.04, 0.025, 0, 0.16, 0));
      break;
    case 'tela': g.add(M(BOX, lam(0x7a3b34, 0x180a08), 0.42, 0.02, 0.3, 0, 0.03, 0), M(BOX, lam(0x7a3b34, 0x180a08), 0.18, 0.02, 0.36, 0.2, 0.035, 0.1)); break;
    case 'machete': {
      const b = M(BOX, lam(0x6a4a3a, 0x1a100c), 0.5, 0.012, 0.06, 0, 0.03, 0); g.add(b);
      g.add(M(BOX, lam(0x2a1c12), 0.14, 0.03, 0.045, -0.32, 0.03, 0));
      break;
    }
    case 'casquillo': { const c = M(CYL, lam(0xb8902a, 0x2a2008), 0.012, 0.06, 0.012, 0, 0.02, 0); c.rotation.z = Math.PI / 2; g.add(c); glowS = 0.5; break; }
    case 'pelo': for (let i = 0; i < 4; i++) { const c = M(BOX, lam(DARK, 0x0a0806), 0.012, 0.012, 0.3, i * 0.02 - 0.03, 0.03, 0); c.rotation.y = i * 0.3; g.add(c); } break;
    case 'botiquin':
      g.add(M(BOX, lam(0xd9d4c6, 0x26241f), 0.3, 0.18, 0.2, 0, 0.09, 0), M(BOX, lam(0xa82018, 0x2a0806), 0.14, 0.04, 0.012, 0, 0.1, 0.103), M(BOX, lam(0xa82018, 0x2a0806), 0.04, 0.12, 0.012, 0, 0.1, 0.103));
      break;
    case 'hueso':
      for (const [x, r] of [[-0.05, 0.3], [0.06, -0.4]]) { const c = M(CYL, lam(0xcfc7b0, 0x26241e), 0.022, 0.42, 0.022, x, 0.03, 0); c.rotation.set(0, r, Math.PI / 2); g.add(c); }
      break;
    case 'argolla': { const t = M(TORUS, lam(0xc9a23a, 0x30260a), 0.03, 0.03, 0.03, 0, 0.03, 0); t.rotation.x = Math.PI / 2; g.add(t); glowS = 0.55; break; }
    case 'rosario': { const t = M(TORUS, lam(0x2a1c12, 0x0c0806), 0.09, 0.09, 0.05, 0, 0.02, 0); t.rotation.x = Math.PI / 2; g.add(t); g.add(M(BOX, lam(0x2a1c12), 0.02, 0.012, 0.07, 0, 0.02, 0.13)); break; }
    case 'pila': { const c = M(CYL, lam(0xa82018, 0x2a0806), 0.025, 0.1, 0.025, 0, 0.03, 0); c.rotation.z = Math.PI / 2; g.add(c); glowC = 0xfff0a0; glowS = 0.55; break; }
    case 'escapulario': g.add(M(BOX, lam(0x5a3a22, 0x140c06), 0.07, 0.01, 0.09, 0, 0.02, 0)); break;
    case 'perro': { const d = makeDog(); d.root.rotation.z = Math.PI / 2 - 0.25; d.root.position.y = 0.16; g.add(d.root); glowY = 0.5; glowS = 1.1; break; }
    case 'bulto': g.add(M(SPH, lam(0xa8926a, 0x1a160e), 0.3, 0.22, 0.42, 0, 0.2, 0), M(SPH, lam(0xa8926a, 0x1a160e), 0.28, 0.2, 0.4, 0.1, 0.5, 0.05)); glowY = 0.8; glowS = 1.1; break;
    case 'gallina': { const c = makeChicken(); g.add(c.root); glowY = 0.45; glowS = 0.9; break; }
    case 'yerba': for (let i = 0; i < 5; i++) g.add(M(CONE, lam(0x3f7a3a, 0x0c1a0a), 0.05, 0.3 + i * 0.03, 0.05, Math.cos(i * 1.3) * 0.09, 0.16, Math.sin(i * 1.3) * 0.09)); glowC = 0xb8ffb0; break;
    case 'vela': g.add(M(CYL, lam(0xe8e2d0, 0x3a362c), 0.02, 0.16, 0.02, 0, 0.08, 0)); glowC = 0xffd27a; glowS = 0.6; break;
    case 'voz': glowC = 0xb8c8ff; glowS = 1.3; glowY = 1.4; break;
    default: glowS = 0.9; glowY = 0.5; break; // 'none': solo el destello
  }
  const glow = glowSprite(glowC, glowS, 0.5);
  glow.position.y = glowY;
  g.add(glow);
  return { group: g, glow };
}
