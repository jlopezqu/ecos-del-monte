// Vida del pueblo: vecinos que caminan de día y se recogen al anochecer, gallinas y vacas.
import * as THREE from 'three';
import { makePerson, animatePerson, makeChicken, makeCow } from './entities.js';
import { wrapAngle } from './util.js';

export const LOOKS = [
  { cloth: 0xcfc6b0, pants: 0x4a4038, hat: 0xcdbb8a, skin: 0x9a6e4c },
  { cloth: 0x7a5a48, skirt: 0x3a4a5a, skin: 0xa87a56, longHair: true },
  { cloth: 0x4f6a7a, pants: 0x2f2a26, skin: 0x8a5e40, hat: 0xcdbb8a, ruana: 0x6a4a3a, old: true },
  { cloth: 0xb8a070, skirt: 0x5a3a34, skin: 0xb98a64, longHair: true, hair: 0x3a2a20 },
  { cloth: 0x8a8f78, pants: 0x3a3a30, skin: 0xa87a56, hair: 0x2a2018 },
  { cloth: 0x9a4a3a, skirt: 0x2f2f3a, skin: 0x9a6e4c, longHair: true, old: true, scarf: 0xa84a3a },
  { cloth: 0xd8d0b8, pants: 0x5a5040, skin: 0xb98a64, hat: 0x8a7a5a },
];
// Sitios del pueblo por donde anda la gente: plaza, puertas, esquinas.
const SPOTS = [[1, 5], [-17, 6.5], [-17.5, -11.5], [2, -20.5], [19.5, 9.5], [20, -9.5], [-1, 27], [3, 41], [12, -15], [-12, -17], [-13, 19], [13, 21], [-18, 25], [19.5, 29]];
const HENS = [[-16, 12], [-14, 14], [18, 16], [21, 3], [-18, -4], [8, 30], [-10, 30], [16, -16]];
const COWS = [[44, 30], [50, 36], [42, 40]];

// o.addInter registra el "hablar con"; o.onTalk(p) se llama al hablarle a un vecino.
export function createLife(region, parent, o = {}) {
  const R = Math.random, peds = [], hens = [], cows = [];
  const pick = (p) => { const s = SPOTS[Math.floor(R() * SPOTS.length)]; p.tx = s[0] + (R() - 0.5) * 3; p.tz = s[1] + (R() - 0.5) * 3; };
  LOOKS.forEach((look, i) => {
    const m = makePerson({ ...look, simple: true, animated: true });
    const home = SPOTS[(i * 5 + 2) % SPOTS.length];
    const p = { m, home, x: home[0] + R() - 0.5, z: home[1] + R() - 0.5, tx: 0, tz: 0, wait: R() * 5, phase: R() * 6, sp: 1.0 + R() * 0.5, stuck: 0, amt: 0, female: look.skirt != null, pos: new THREE.Vector3() };
    pick(p); m.rotation.y = R() * 6.28; parent.add(m); peds.push(p);
    m.userData.walkRate = p.sp / 1.2;   // personas reales: el paso de la animación acompaña la velocidad
    if (o.addInter) o.addInter({ pos: p.pos, r: 2.3, label: 'Hablar con ' + (p.female ? 'la vecina' : 'el vecino'), active: () => m.visible, use: () => o.onTalk && o.onTalk(p) });
  });
  for (const [x, z] of HENS) { const c = makeChicken(); parent.add(c.root); hens.push({ m: c.root, hx: x, hz: z, x, z, tx: x, tz: z, wait: R() * 3, ph: R() * 6 }); }
  for (const [x, z] of COWS) { const c = makeCow(); c.root.rotation.y = R() * 6.28; parent.add(c.root); cows.push({ m: c.root, hx: x, hz: z, x, z, tx: x, tz: z, wait: 3 + R() * 8 }); }

  const roam = (a, dt, speed, radius, pause) => {   // deambular alrededor de su sitio
    if (a.wait > 0) { a.wait -= dt; return false; }
    const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { a.wait = pause * (0.4 + R()); const an = R() * 6.283, rr = R() * radius; a.tx = a.hx + Math.cos(an) * rr; a.tz = a.hz + Math.sin(an) * rr; return false; }
    a.x += (dx / d) * speed * dt; a.z += (dz / d) * speed * dt;
    a.m.rotation.y += wrapAngle(Math.atan2(dx, dz) - a.m.rotation.y) * Math.min(1, dt * 5);
    return true;
  };

  return {
    peds,
    update(dt, hour, player, time) {
      const out = hour >= 5.8 && hour < 18.9;   // de noche nadie sale
      for (const p of peds) {
        const m = p.m;
        if (!out && !m.visible) continue;
        if (out && !m.visible) { m.visible = true; p.x = p.home[0]; p.z = p.home[1]; pick(p); }
        if (!out) { p.tx = p.home[0]; p.tz = p.home[1]; p.wait = 0; }
        const dxp = player.x - p.x, dzp = player.z - p.z, near = out && dxp * dxp + dzp * dzp < 5.3;
        let moving = false;
        if (near) m.rotation.y += wrapAngle(Math.atan2(dxp, dzp) - m.rotation.y) * Math.min(1, dt * 5);   // se detiene y te mira
        else if (p.wait > 0) p.wait -= dt;
        else {
          const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
          if (d < 0.7) {
            if (!out) { m.visible = false; continue; }
            p.wait = 2 + R() * 7; pick(p);
          } else {
            const q = { x: p.x + (dx / d) * p.sp * dt, z: p.z + (dz / d) * p.sp * dt };
            region.col.resolve(q, 0.35);
            p.stuck = Math.hypot(q.x - p.x, q.z - p.z) < p.sp * dt * 0.35 ? p.stuck + dt : 0;
            if (p.stuck > 1.2) { p.stuck = 0; if (out) pick(p); else { m.visible = false; continue; } }
            m.rotation.y += wrapAngle(Math.atan2(q.x - p.x, q.z - p.z) - m.rotation.y) * Math.min(1, dt * 6);
            p.x = q.x; p.z = q.z; moving = true; p.phase += dt * p.sp * 5.4;
          }
        }
        p.amt += ((moving ? 0.8 : 0) - p.amt) * Math.min(1, dt * 6);
        animatePerson(m, p.phase, p.amt, dt);
        p.pos.set(p.x, region.heightAt(p.x, p.z), p.z);
        m.position.copy(p.pos);
      }
      const day = hour >= 5.6 && hour < 18.9;
      for (const h of hens) {
        h.m.visible = day;
        if (!day) continue;
        const moving = roam(h, dt, 0.7, 3.5, 3);
        h.m.position.set(h.x, region.heightAt(h.x, h.z), h.z);
        h.m.rotation.x = moving ? 0 : Math.max(0, Math.sin(time * 7 + h.ph)) * 0.5;   // picotea
      }
      for (const c of cows) {
        if (day) roam(c, dt, 0.3, 6, 12);
        c.m.position.set(c.x, region.heightAt(c.x, c.z), c.z);
      }
    },
  };
}
