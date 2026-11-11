// Personajes, la Patasola, el perro y los objetos del mundo. Todo con primitivas.
import * as THREE from 'three';
import { glowSprite } from './world.js';

const matCache = new Map();
function lam(color, emissive = 0) {
  const k = color + '_' + emissive;
  let m = matCache.get(k);
  if (!m) { m = new THREE.MeshLambertMaterial({ color, emissive }); matCache.set(k, m); }
  return m;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const SPH = new THREE.SphereGeometry(1, 10, 8);
const CONE = new THREE.ConeGeometry(1, 1, 8);
const DISC = new THREE.CircleGeometry(1, 12);
const TORUS = new THREE.TorusGeometry(1, 0.18, 6, 14);

function M(geo, mat, sx, sy, sz, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  return m;
}
const DARK = 0x0b0907;

// ---------- Gente del pueblo ----------
export function makePerson(o = {}) {
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  const skin = lam(o.skin ?? 0xa87a56), cloth = lam(o.cloth ?? 0x6a5a48), pants = lam(o.pants ?? 0x2b2b33), hair = lam(o.hair ?? 0x18120c);
  if (o.skirt) body.add(M(CONE, lam(o.skirt), 0.36, 1.0, 0.36, 0, 0.5, 0));
  else for (const s of [-1, 1]) {
    const leg = M(CYL, pants, 0.085, 0.86, 0.085, s * 0.1, 0.43, 0);
    if (o.sit) { leg.rotation.x = Math.PI / 2; leg.position.set(s * 0.1, 0.5, 0.42); }
    body.add(leg);
  }
  body.add(M(CYL, cloth, 0.2, 0.62, 0.15, 0, 1.19, 0));
  for (const s of [-1, 1]) {
    const a = M(CYL, cloth, 0.055, 0.58, 0.055, s * 0.27, 1.17, 0); a.rotation.z = s * 0.1; body.add(a);
    body.add(M(SPH, skin, 0.05, 0.05, 0.05, s * 0.3, 0.86, 0));
  }
  if (o.ruana) body.add(M(CONE, lam(o.ruana), 0.47, 0.66, 0.36, 0, 1.2, 0));
  body.add(M(SPH, skin, 0.13, 0.15, 0.135, 0, 1.67, 0));
  for (const s of [-1, 1]) body.add(M(SPH, lam(DARK), 0.016, 0.016, 0.016, s * 0.05, 1.69, 0.125));
  if (o.longHair) { body.add(M(CONE, hair, 0.19, 0.75, 0.14, 0, 1.47, -0.07)); body.add(M(SPH, hair, 0.14, 0.12, 0.14, 0, 1.73, -0.02)); }
  else if (!o.bald) body.add(M(SPH, hair, 0.135, 0.1, 0.14, 0, 1.75, -0.015));
  if (o.hat) {
    body.add(M(CYL, lam(o.hat), 0.3, 0.025, 0.3, 0, 1.8, 0), M(CYL, lam(o.hat), 0.125, 0.13, 0.125, 0, 1.87, 0), M(CYL, lam(DARK), 0.13, 0.035, 0.13, 0, 1.83, 0));
  }
  if (o.sit) body.position.y = -0.42;
  return g;
}

// ---------- La Patasola: forma de señuelo (mujer de blanco) y forma real ----------
export function makePatasola() {
  const root = new THREE.Group(), mon = new THREE.Group(), lure = new THREE.Group();
  root.add(mon, lure);
  const flesh = lam(0x39423a), pale = lam(0x6c7262), dark = lam(DARK), rag = lam(0x2b1310), bone = lam(0xcfc7b0);

  mon.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.22, 7), dark).translateY(0.11));
  mon.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 1.15, 7), flesh).translateY(0.78));
  const up = new THREE.Group(); up.position.y = 1.3; up.rotation.x = 0.22; mon.add(up);
  up.add(M(CONE, rag, 0.5, 1.0, 0.5, 0, 0.15, 0));
  up.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.85, 7), flesh).translateY(0.55));
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.26, 0.9, 0.02); arm.rotation.set(-0.75, 0, s * 0.28);
    arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 1.25, 6), flesh).translateY(-0.62));
    for (const cx of [-0.04, 0, 0.04]) { const c = M(CONE, bone, 0.018, 0.22, 0.018, cx, -1.34, 0); c.rotation.x = Math.PI; arm.add(c); }
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
  for (const s of [-1, 1]) up.add(M(BOX, dark, 0.07, 0.95, 0.05, s * 0.17, 0.78, 0.12));
  const light = new THREE.PointLight(0xff3a18, 0, 8, 1.8); light.position.set(0, 2.1, 0.5); mon.add(light);

  const white = lam(0xd9d4c6, 0x4a4840), lskin = lam(0xcdb9a0, 0x2a2622);
  lure.add(M(CONE, white, 0.42, 1.25, 0.42, 0, 0.63, 0));
  lure.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.5, 8), white).translateY(1.4));
  lure.add(M(CYL, lskin, 0.038, 0.6, 0.038, -0.2, 1.3, 0));
  const beck = new THREE.Group(); beck.position.set(0.18, 1.58, 0); beck.rotation.set(-0.9, 0, -0.5);
  beck.add(M(CYL, lskin, 0.038, 0.6, 0.038, 0, 0.3, 0)); lure.add(beck);
  lure.add(M(SPH, lskin, 0.115, 0.135, 0.12, 0, 1.8, 0));
  lure.add(M(CONE, dark, 0.26, 1.2, 0.2, 0, 1.36, -0.09));

  return {
    root, mon, lure, up, arms, beck, eyes, light,
    setForm(f) { mon.visible = f === 'monster'; lure.visible = f === 'lure'; },
  };
}

// ---------- Canelo ----------
export function makeDog() {
  const root = new THREE.Group();
  const fur = lam(0xa56a34), dk = lam(0x3a2412);
  root.add(M(BOX, fur, 0.26, 0.26, 0.62, 0, 0.42, 0));
  root.add(M(BOX, fur, 0.2, 0.2, 0.24, 0, 0.58, 0.4));
  root.add(M(BOX, dk, 0.1, 0.09, 0.14, 0, 0.54, 0.56));
  for (const s of [-1, 1]) {
    root.add(M(BOX, dk, 0.05, 0.1, 0.05, s * 0.08, 0.72, 0.36));
    root.add(M(BOX, fur, 0.07, 0.34, 0.07, s * 0.09, 0.17, 0.22), M(BOX, fur, 0.07, 0.34, 0.07, s * 0.09, 0.17, -0.22));
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.52, -0.3);
  const t = M(BOX, fur, 0.05, 0.05, 0.3, 0, 0.08, -0.13); t.rotation.x = 0.6; tail.add(t);
  root.add(tail);
  return { root, tail };
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
    case 'voz': glowC = 0xb8c8ff; glowS = 1.3; glowY = 1.4; break;
    default: glowS = 0.9; glowY = 0.5; break; // 'none': solo el destello
  }
  const glow = glowSprite(glowC, glowS, 0.5);
  glow.position.y = glowY;
  g.add(glow);
  return { group: g, glow };
}
