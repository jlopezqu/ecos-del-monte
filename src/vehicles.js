// Vehículos manejables: la chiva, el campero, la moto y la mula. Física sencilla sobre el terreno.
// Todos los modelos miran hacia -z, igual que el jugador con yaw = 0.
import * as THREE from 'three';
import { pbr, lam } from './world.js';
import { makePerson, flatten } from './entities.js';
import { clamp } from './util.js';

// use = gasolina por metro (tanque de 100). max y acc en m/s; turn = agilidad de giro; r = radio de choque; off = cuánto lo frena salirse del camino (0 a 1).
export const VEH = {
  chiva: { label: 'la chiva', verb: 'Subir a', max: 11.5, acc: 3.6, turn: 0.5, r: 1.6, off: 0.6, cam: 9.5, camH: 3.8, seat: [-0.55, 1.74, -1.6], wheelR: 0.5, base: 4.8, use: 0.11 },
  jeep: { label: 'el campero', verb: 'Subir a', max: 16, acc: 6.5, turn: 0.8, r: 1.15, off: 0.3, cam: 6.4, camH: 2.6, seat: [-0.36, 1.0, 0.02], wheelR: 0.38, base: 2.1, use: 0.08 },
  moto: { label: 'la moto', verb: 'Subir a', max: 19, acc: 9, turn: 1.05, r: 0.55, off: 0.7, cam: 5, camH: 2.0, seat: [0, 0.92, 0.28], wheelR: 0.33, base: 1.44, lean: true, use: 0.05 },
  mula: { label: 'la mula', verb: 'Montar', max: 8.6, acc: 5, turn: 1.4, r: 0.6, off: 0.08, cam: 4.8, camH: 2.3, seat: [0, 1.5, 0.05], wheelR: 0, base: 1.2, animal: true },
};

const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 16), SPH = new THREE.SphereGeometry(1, 16, 12);
const mats = new Map();
const L = (color, o) => { const k = color + JSON.stringify(o || 0); let m = mats.get(k); if (!m) { m = lam(color, o); mats.set(k, m); } return m; };
const B = (mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(x, y, z); return m; };
const S = (mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(SPH, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m; };
const cap = (mat, r, len, x, y, z) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 5, 12), mat); m.position.set(x, y, z); return m; };
const glowM = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });

function wheel(r, w) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(CYL, L(0x121212)); t.scale.set(r, w, r); t.rotation.z = Math.PI / 2; g.add(t);
  const h = new THREE.Mesh(CYL, L(0x8a8d92)); h.scale.set(r * 0.45, w * 1.05, r * 0.45); h.rotation.z = Math.PI / 2; g.add(h);
  return g;
}

function buildChiva(body, parts) {
  const red = L(0xb3261e), yel = L(0xe2b23a), blue = L(0x1d4f9a), dark = L(0x18181a), wood = pbr('planks', 0x8a6a4a, { s: 1.2 });
  body.add(B(dark, 2.1, 0.22, 6.9, 0, 0.66, -0.3));
  body.add(B(red, 2.3, 0.74, 5.4, 0, 1.12, 0.55));
  body.add(B(yel, 2.32, 0.16, 5.42, 0, 1.56, 0.55));
  for (let i = 0; i < 6; i++) body.add(B(yel, 2.3, 1.08, 0.09, 0, 2.18, -2.1 + i * 1.06));
  for (let i = 0; i < 5; i++) body.add(B(wood, 2.1, 0.08, 0.5, 0, 1.68, -1.6 + i * 1.06));
  body.add(B(blue, 2.34, 0.2, 5.6, 0, 2.8, 0.55));
  body.add(B(L(0xa8926a), 1.7, 0.42, 2.4, 0, 3.1, 1.0), B(L(0x6a5a3a), 1.2, 0.34, 1.3, 0.2, 3.06, -1.0));
  body.add(B(red, 2.0, 0.72, 1.5, 0, 1.08, -2.95));
  body.add(B(dark, 1.4, 0.5, 0.06, 0, 1.08, -3.72));
  body.add(B(yel, 2.2, 0.1, 0.1, 0, 2.7, -2.15));
  for (const s of [-1, 1]) { body.add(B(yel, 0.09, 1.1, 0.09, s * 1.08, 2.15, -2.15)); body.add(S(glowM, 0.12, 0.12, 0.05, s * 0.72, 1.12, -3.73)); }
  parts.wheelsAt = [[-1.1, -2.9, true], [1.1, -2.9, true], [-1.1, 1.9, false], [1.1, 1.9, false]];
}

function buildJeep(body, parts) {
  const ol = L(0x4f5d3c), dark = L(0x151515), seat = L(0x3a2c20), glass = L(0x9fb4c0, { transparent: true, opacity: 0.22 });
  body.add(B(dark, 1.3, 0.16, 3.1, 0, 0.5, 0));
  body.add(B(ol, 1.52, 0.34, 2.05, 0, 0.72, 0.52));
  for (const s of [-1, 1]) body.add(B(ol, 0.06, 0.3, 2.05, s * 0.73, 1.02, 0.52));
  body.add(B(ol, 1.52, 0.3, 0.06, 0, 1.02, 1.52));
  body.add(B(ol, 1.5, 0.3, 0.1, 0, 1.02, -0.5));
  body.add(B(ol, 1.3, 0.42, 1.2, 0, 0.88, -1.08));
  for (const s of [-1, 1]) {
    body.add(B(ol, 0.26, 0.1, 0.95, s * 0.74, 0.78, -1.08));
    body.add(S(glowM, 0.09, 0.09, 0.04, s * 0.46, 0.94, -1.7));
    body.add(B(dark, 0.05, 0.56, 0.05, s * 0.7, 1.42, -0.5));
    body.add(B(seat, 0.5, 0.1, 0.5, s * 0.36, 0.94, 0.02));
    body.add(B(seat, 0.5, 0.5, 0.1, s * 0.36, 1.2, 0.3));
  }
  body.add(B(dark, 1.05, 0.34, 0.05, 0, 0.88, -1.69));
  body.add(B(dark, 1.45, 0.05, 0.05, 0, 1.7, -0.5));
  body.add(B(glass, 1.36, 0.5, 0.02, 0, 1.42, -0.5));
  body.add(B(seat, 1.3, 0.1, 0.5, 0, 0.94, 0.95));
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 6, 16), dark); sw.position.set(-0.36, 1.24, -0.32); sw.rotation.x = -0.9; body.add(sw);
  const sp = wheel(0.38, 0.22); sp.rotation.y = Math.PI / 2; sp.position.set(0, 0.98, 1.66); body.add(sp);
  parts.wheelsAt = [[-0.74, -1.05, true], [0.74, -1.05, true], [-0.74, 1.05, false], [0.74, 1.05, false]];
}

function buildMoto(body, parts) {
  const dark = L(0x151515), red = L(0x8a1c14), steel = L(0x8a8d92);
  body.add(B(dark, 0.12, 0.26, 0.95, 0, 0.62, 0.05));
  body.add(S(red, 0.15, 0.13, 0.3, 0, 0.86, -0.14));
  body.add(B(dark, 0.24, 0.09, 0.62, 0, 0.87, 0.4));
  body.add(B(steel, 0.3, 0.26, 0.34, 0, 0.5, 0.02));
  const ex = new THREE.Mesh(CYL, steel); ex.scale.set(0.035, 0.7, 0.035); ex.rotation.x = Math.PI / 2; ex.position.set(0.16, 0.4, 0.45); body.add(ex);
  body.add(B(red, 0.2, 0.05, 0.4, 0, 0.7, 0.72));
  parts.wheelsAt = [[0, -0.72, true], [0, 0.72, false]];
  parts.wheelW = 0.1;
}

function buildMula(body, parts) {
  const fur = L(0x6b5a4a), pale = L(0xb8a890), dark = L(0x1a1410), leather = L(0x4a3020), sack = L(0x8a7a5a);
  const b = cap(fur, 0.3, 0.9, 0, 1.08, 0.08); b.rotation.x = Math.PI / 2; body.add(b);
  const neck = cap(fur, 0.13, 0.5, 0, 1.42, -0.62); neck.rotation.x = -0.75; body.add(neck);
  body.add(S(fur, 0.105, 0.125, 0.25, 0, 1.72, -0.98), S(pale, 0.085, 0.09, 0.12, 0, 1.66, -1.2));
  for (const s of [-1, 1]) body.add(S(fur, 0.03, 0.12, 0.02, s * 0.07, 1.9, -0.9), B(sack, 0.14, 0.3, 0.36, s * 0.36, 1.1, 0.1));
  const mane = B(dark, 0.04, 0.42, 0.1, 0, 1.52, -0.52); mane.rotation.x = -0.75; body.add(mane);
  const tail = cap(dark, 0.03, 0.5, 0, 0.95, 0.66); tail.rotation.x = 0.25; body.add(tail);
  body.add(B(leather, 0.52, 0.1, 0.56, 0, 1.4, 0.05));
  for (const [x, z] of [[-0.16, -0.38], [0.16, -0.38], [-0.16, 0.48], [0.16, 0.48]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.92, z);
    leg.add(cap(fur, 0.055, 0.72, 0, -0.42, 0), B(dark, 0.1, 0.08, 0.12, 0, -0.86, 0));
    parts.legs.push(leg);
  }
}

export function makeVehicle(type, look) {
  const def = VEH[type], root = new THREE.Group(), body = new THREE.Group();
  const parts = { wheelsAt: [], wheelW: 0.24, legs: [] }, wheels = [], steerers = [];
  root.add(body);
  ({ chiva: buildChiva, jeep: buildJeep, moto: buildMoto, mula: buildMula })[type](body, parts);
  flatten(body);   // una sola malla por material
  for (const [x, z, steer] of parts.wheelsAt) {
    const w = wheel(def.wheelR, parts.wheelW);
    if (steer) { const sg = new THREE.Group(); sg.position.set(x, def.wheelR, z); sg.add(w); root.add(sg); steerers.push(sg); }
    else { w.position.set(x, def.wheelR, z); root.add(w); }
    wheels.push(w);
  }
  if (type === 'moto') {   // horquilla, manubrio y farola giran con la rueda delantera
    const st = steerers[0], dark = L(0x151515), steel = L(0x8a8d92);
    const fork = new THREE.Mesh(CYL, steel); fork.scale.set(0.028, 0.82, 0.028); fork.position.set(0, 0.38, 0.12); fork.rotation.x = 0.32; st.add(fork);
    const bar = new THREE.Mesh(CYL, dark); bar.scale.set(0.018, 0.62, 0.018); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.78, 0.24); st.add(bar);
    st.add(S(glowM, 0.08, 0.08, 0.05, 0, 0.66, 0.08));
  }
  for (const leg of parts.legs) root.add(leg);
  const driver = makePerson({ ...look, sit: true });
  driver.rotation.y = Math.PI; driver.position.set(def.seat[0], def.seat[1] - 0.48, def.seat[2]); driver.visible = false;
  root.add(driver);
  root.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) o.castShadow = true; });
  return { type, def, root, wheels, steerers, legs: parts.legs, driver, pos: new THREE.Vector3(), yaw: 0, speed: 0, steer: 0, pitch: 0, roll: 0, spin: 0, dead: 0, occupied: false, fuel: def.animal ? 100 : 35 + Math.random() * 40 };
}

// input: { thr: -1..1, steer: -1..1 (derecha positivo), brake }. Devuelve la fuerza del golpe si chocó (0 si no).
export function driveVehicle(v, dt, input, region) {
  const d = v.def;
  const road = region.pathDist ? clamp(1 - (region.pathDist(v.pos.x, v.pos.z) - 3.5) / 5, 0, 1) : 1;
  const firm = region.name === 'tolima' ? Math.max(road, Math.hypot(v.pos.x, v.pos.z) < 60 ? 1 : 0) : 1;   // camino o pueblo
  const top = d.max * (1 - (1 - firm) * d.off);
  const thr = v.dead > 0 || (!d.animal && v.fuel <= 0) ? 0 : input.thr;   // sin gasolina no acelera
  if (thr > 0) v.speed += d.acc * thr * dt * Math.max(0, 1 - v.speed / top);
  else if (thr < 0) v.speed += (v.speed > 0.4 ? -d.acc * 2.2 : -d.acc * 0.6) * dt;
  v.speed -= v.speed * (0.22 + (1 - firm) * 0.5) * dt;
  if (input.brake) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 16 * dt);
  if (v.speed > top) v.speed -= (v.speed - top) * Math.min(1, dt * 2);
  v.speed = clamp(v.speed, -d.max * 0.3, d.max);
  if (Math.abs(v.speed) < 0.03 && !thr) v.speed = 0;
  v.steer += (input.steer - v.steer) * Math.min(1, dt * 6);
  const grip = clamp(Math.abs(v.speed) / 3, 0, 1) * (1.15 - (0.55 * Math.abs(v.speed)) / d.max);
  v.yaw -= v.steer * d.turn * grip * Math.sign(v.speed || 1) * dt * 1.6;
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
  // Avanza en subpasos cortos para no atravesar paredes delgadas a alta velocidad.
  const p = { x: v.pos.x, z: v.pos.z }, n = Math.max(1, Math.ceil((Math.abs(v.speed) * dt) / 0.25));
  let crash = 0;
  for (let i = 0; i < n && !crash; i++) {
    const bx = (p.x += (fx * v.speed * dt) / n), bz = (p.z += (fz * v.speed * dt) / n);
    region.col.resolve(p, d.r); region.bounds(p);
    if (Math.hypot(p.x - bx, p.z - bz) > 0.02 && Math.abs(v.speed) > 1.5) { crash = Math.abs(v.speed); v.speed *= 0.3; }
  }
  if (!d.animal) v.fuel = Math.max(0, v.fuel - Math.abs(v.speed) * dt * d.use);
  v.pos.set(p.x, region.heightAt(p.x, p.z), p.z);
  // cabeceo y balanceo según la pendiente
  const hb = d.base / 2, rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw);
  const pitch = Math.atan2(region.heightAt(p.x + fx * hb, p.z + fz * hb) - region.heightAt(p.x - fx * hb, p.z - fz * hb), d.base);
  const roll = Math.atan2(region.heightAt(p.x + rx * 0.7, p.z + rz * 0.7) - region.heightAt(p.x - rx * 0.7, p.z - rz * 0.7), 1.4);
  v.pitch += (pitch - v.pitch) * Math.min(1, dt * 8);
  v.roll += (roll - v.roll) * Math.min(1, dt * 8);
  v.spin += v.speed * dt;
  return crash;
}

// Lleva el estado del vehículo a su malla: posición, inclinación, ruedas, dirección y patas.
export function syncVehicle(v) {
  const d = v.def, lean = d.lean ? -v.steer * clamp(v.speed / d.max, -1, 1) * 0.5 : 0;
  v.root.position.copy(v.pos);
  v.root.rotation.set(v.pitch, v.yaw, v.roll + lean, 'YXZ');
  if (d.wheelR) for (const w of v.wheels) w.rotation.x = -v.spin / d.wheelR;
  for (const s of v.steerers) s.rotation.y = -v.steer * 0.45;
  if (v.legs.length) {
    const sw = Math.sin(v.spin * 2.4) * clamp(Math.abs(v.speed) / 3, 0, 1) * 0.6;
    v.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? 1 : -1) * sw; });
  }
}
