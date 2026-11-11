// Casas en las que se puede entrar: paredes huecas con vano de puerta, piso, cielo raso, puerta que se abre sola
// y muebles según el tipo (tienda, inspección, capilla, casa, rancho). No importa nada de world.js: todo llega por `ctx`.
import * as THREE from 'three';

const T = 0.24, GAP = 1.3, FY = 0.08;   // grosor de pared, ancho del vano y altura del piso sobre el terreno
const LAMS = new Map();

// Devuelve el registro de la casa: { x, z, w, d, h, y0, type, ix0, ix1, iz0, iz1, door: { x, z, pivot, open }, shell }.
export function makeBuilding(ctx, x, z, w, d, o = {}) {
  const { group, col, heightAt, mats, pbr, lam, makeSign, box, cylM, GEO, flatten } = ctx;
  const L = (c) => LAMS.get(c) || (LAMS.set(c, lam(c)), LAMS.get(c));   // un material por color: al fusionar quedan pocas mallas
  const h = o.h ?? 3.1, roofH = o.roofH ?? 1.7, side = o.door ?? 's', type = o.type ?? 'casa';
  const y0 = heightAt(x, z);
  const shell = new THREE.Group(); shell.position.set(x, y0, z);       // piezas fijas (se fusionan por material)
  const props = new THREE.Group(); props.position.set(x, y0, z);       // muebles reales del interior: solo se dibujan de cerca
  const deco = new THREE.Group(); deco.position.set(x, y0, z);         // modelos reales del exterior (materas)
  const wallM = o.wall ? pbr('plaster', o.wall) : mats.wall, zocM = pbr('plaster', o.zocalo ?? 0x2d5d8a);
  const solid = (cx, cz, sx, sz) => col.addBox(x + cx - sx / 2, z + cz - sz / 2, x + cx + sx / 2, z + cz + sz / 2);

  // ----- paredes: cada tramo en dos franjas (zócalo de color y pañete) -----
  const wall = (cx, cz, sx, sz, y1, y2) => {
    if (y1 < 0.9) shell.add(box(zocM, sx + 0.02, Math.min(0.9, y2) - y1, sz + 0.02, cx, (y1 + Math.min(0.9, y2)) / 2, cz));
    if (y2 > 0.9) shell.add(box(wallM, sx, y2 - Math.max(0.9, y1), sz, cx, (Math.max(0.9, y1) + y2) / 2, cz));
    if (y1 === 0) solid(cx, cz, sx, sz);
  };
  const lines = { n: [0, -d / 2 + T / 2, w, true], s: [0, d / 2 - T / 2, w, true], e: [w / 2 - T / 2, 0, d - 2 * T, false], w: [-w / 2 + T / 2, 0, d - 2 * T, false] };
  for (const k in lines) {
    const [cx, cz, len, alongX] = lines[k];
    const seg = (a, b, y1, y2) => { const mid = (a + b) / 2, L = b - a; if (alongX) wall(cx + mid, cz, L, T, y1, y2); else wall(cx, cz + mid, T, L, y1, y2); };
    if (k === side) { seg(-len / 2, -GAP / 2, 0, h); seg(GAP / 2, len / 2, 0, h); seg(-GAP / 2, GAP / 2, 2.15, h); }
    else seg(-len / 2, len / 2, 0, h);
  }
  shell.add(box(mats.floor, w - T, FY, d - T, 0, FY / 2, 0));
  shell.add(box(mats.ceil, w - T, 0.06, d - T, 0, h - 0.03, 0));
  const roof = new THREE.Mesh(GEO.roof, mats.roof);
  roof.scale.set(w + 1.6, roofH, d + 1.6); roof.position.y = h + roofH / 2; shell.add(roof);
  shell.add(box(mats.wood, w + 1.3, 0.1, d + 1.3, 0, h + 0.02, 0));

  // ----- fachada: ventanas, marco y letrero por fuera; puerta con bisagra -----
  const span = side === 's' || side === 'n' ? w : d;
  const rotY = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[side];
  const face = new THREE.Group(); face.rotation.y = rotY;                 // +z local = hacia afuera
  face.position.set(side === 'e' ? w / 2 : side === 'w' ? -w / 2 : 0, 0, side === 's' ? d / 2 : side === 'n' ? -d / 2 : 0);
  for (const s of [-1, 1]) {
    const fr = new THREE.Mesh(GEO.plane, mats.door); fr.scale.set(1.06, 1.11, 1); fr.position.set(s * span * 0.3, 1.75, 0.03); face.add(fr);
    const wm = new THREE.Mesh(GEO.plane, o.lit ? mats.win : mats.winDark); wm.scale.set(0.9, 0.95, 1); wm.position.set(s * span * 0.3, 1.75, 0.04); face.add(wm);
    const wi = new THREE.Mesh(GEO.plane, mats.winDark); wi.scale.set(0.9, 0.95, 1); wi.position.set(s * span * 0.3, 1.75, -T - 0.02); wi.rotation.y = Math.PI; face.add(wi);
  }
  for (const s of [-1, 1]) face.add(box(mats.door, 0.09, 2.2, T + 0.06, s * (GAP / 2 + 0.03), 1.1, -T / 2));   // jambas
  face.add(box(mats.door, GAP + 0.24, 0.1, T + 0.06, 0, 2.2, -T / 2));                                          // dintel
  if (o.sign) { const sg = makeSign(o.sign, Math.min(span - 1, 4.4), 0.5); sg.position.set(0, 2.66, 0.05); face.add(sg); }
  shell.add(face);
  const hinge = new THREE.Group(); hinge.rotation.y = rotY; hinge.position.copy(face.position); hinge.position.y = y0;
  hinge.position.x += x; hinge.position.z += z;
  const pivot = new THREE.Group(); pivot.position.set(-GAP / 2 + 0.03, 0, -T / 2);
  pivot.add(box(mats.doorLeaf, GAP - 0.08, 2.1, 0.05, (GAP - 0.08) / 2, 1.08, 0));
  hinge.add(pivot); group.add(hinge);
  const door = { x: x + face.position.x, z: z + face.position.z, pivot, open: 0 };

  // ----- muebles -----
  const inner = new THREE.Group(); shell.add(inner);
  const wood = mats.wood, dark = mats.woodDark;
  const B = (m, sx, sy, sz, cx, cy, cz, ry = 0) => { const q = box(m, sx, sy, sz, cx, cy, cz); q.rotation.y = ry; inner.add(q); return q; };
  // Coloca un modelo real si está cargado; si no, devuelve false y se usa la versión hecha por código.
  const P = (name, cx, cz, ry = 0, sc = 1, cy = FY, grp = props) => {
    const m = ctx.prop ? ctx.prop(name) : null;
    if (!m) return false;
    m.position.set(cx, cy, cz); m.rotation.y = ry; m.scale.multiplyScalar(sc); grp.add(m);
    return true;
  };
  const table = (cx, cz, sx = 1.3, sz = 0.8, ry = 0) => {
    if (!P('mesa', cx, cz, ry)) {
      B(wood, sx, 0.06, sz, cx, FY + 0.76, cz, ry);
      for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const lx = ax * (sx / 2 - 0.08), lz = az * (sz / 2 - 0.08), c = Math.cos(ry), s = Math.sin(ry); B(wood, 0.07, 0.74, 0.07, cx + lx * c + lz * s, FY + 0.37, cz - lx * s + lz * c); }
    }
    solid(cx, cz, Math.max(sx, sz) * 0.8, Math.max(sx, sz) * 0.8);
  };
  const chair = (cx, cz, ry = 0) => {
    if (P('silla', cx, cz, ry)) return;
    B(wood, 0.42, 0.05, 0.42, cx, FY + 0.45, cz, ry);
    B(wood, 0.42, 0.5, 0.05, cx - Math.sin(ry) * 0.19, FY + 0.72, cz - Math.cos(ry) * 0.19, ry);
    for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(wood, 0.05, 0.45, 0.05, cx + ax * 0.17, FY + 0.22, cz + az * 0.17);
  };
  const bed = (cx, cz, alongX = false) => {
    const sx = alongX ? 1.95 : 0.95, sz = alongX ? 0.95 : 1.95;
    if (!P('cama', cx, cz, alongX ? 0 : Math.PI / 2)) {
      B(dark, sx, 0.3, sz, cx, FY + 0.25, cz);
      B(L(0xd8d0bc), sx - 0.08, 0.14, sz - 0.08, cx, FY + 0.46, cz);
      B(L(0x7a3b34), sx - 0.06, 0.05, sz * 0.62, cx + (alongX ? sx * 0.16 : 0), FY + 0.55, cz + (alongX ? 0 : sz * 0.16));
      B(L(0xe8e2d0), alongX ? 0.3 : 0.6, 0.1, alongX ? 0.6 : 0.3, cx - (alongX ? sx * 0.38 : 0), FY + 0.58, cz - (alongX ? 0 : sz * 0.38));
      B(dark, alongX ? 0.06 : sx, 0.7, alongX ? sz : 0.06, cx - (alongX ? sx / 2 : 0), FY + 0.45, cz - (alongX ? 0 : sz / 2));
    }
    solid(cx, cz, sx, sz);
  };
  const crate = (cx, cz, s = 0.55) => { if (!P('cajon', cx, cz)) B(wood, s, s, s, cx, FY + s / 2, cz, cx); solid(cx, cz, s, s); };
  const barrel = (cx, cz) => { if (!P('barril', cx, cz)) { const b = cylM(dark, 0.3, 0.85, cx, FY + 0.43, cz); inner.add(b); } col.addCircle(x + cx, z + cz, 0.32); };
  const sack = (cx, cz, ry = 0) => { if (!P('costal', cx, cz, ry)) { const s = new THREE.Mesh(GEO.sphere, L(0xa8926a)); s.scale.set(0.3, 0.24, 0.44); s.position.set(cx, FY + 0.22, cz); s.rotation.y = ry; inner.add(s); } };
  // estante contra una pared: orient = hacia dónde mira el frente ('e', 'w', 'n', 's')
  const shelf = (cx, cz, len, orient, goods = true) => {
    const ax = orient === 'e' || orient === 'w', sx = ax ? 0.36 : len, sz = ax ? len : 0.36;
    {
      B(dark, ax ? 0.04 : len, 1.9, ax ? len : 0.04, cx + (ax ? (orient === 'e' ? -0.16 : 0.16) : 0), FY + 0.95, cz + (ax ? 0 : orient === 's' ? -0.16 : 0.16));   // fondo, contra la pared
      for (let i = 0; i < 4; i++) B(wood, sx, 0.04, sz, cx, FY + 0.35 + i * 0.48, cz);
      for (const e of [-1, 1]) B(dark, ax ? sx : 0.05, 1.9, ax ? 0.05 : sz, cx + (ax ? 0 : e * len / 2), FY + 0.95, cz + (ax ? e * len / 2 : 0));
    }
    if (goods) {   // mercancía: frascos, latas, panela, velas
      const cols = [0x9a3a2a, 0xc9a23a, 0x3f6a4a, 0xd8d0bc, 0x4a5a8a, 0x8a5a3a];
      for (let i = 0; i < 4; i++) for (let j = 0; j < Math.floor(len / 0.26); j++) {
        const k = (i * 7 + j * 3) % 6, t = -len / 2 + 0.16 + j * 0.26, hh = 0.14 + ((i + j) % 3) * 0.05;
        if ((i + j * 2) % 5 === 4) continue;
        const g = k % 2 ? cylM(L(cols[k]), 0.055, hh, 0, 0, 0) : box(L(cols[k]), 0.14, hh, 0.12);
        g.position.set(cx + (ax ? 0 : t), FY + 0.37 + i * 0.48 + hh / 2, cz + (ax ? t : 0)); inner.add(g);
      }
    }
    solid(cx, cz, sx, sz);
  };
  const lampAt = (cy = h - 0.45) => {
    inner.add(cylM(mats.iron, 0.012, 0.4, 0, cy + 0.22, 0));
    const b = new THREE.Mesh(GEO.sphere, mats.bulb); b.scale.setScalar(0.09); b.position.set(0, cy, 0); inner.add(b);
  };
  const cross = (cx, cy, cz, ry, s = 0.5) => { const m = L(0x2a1c12); B(m, 0.05, s, 0.03, cx, cy, cz, ry); B(m, s * 0.6, 0.05, 0.03, cx, cy + s * 0.18, cz, ry); };
  const hw = w / 2 - T, hd = d / 2 - T;   // medias medidas interiores
  let spot = null;                          // sitio de quien atiende, en coordenadas de mundo

  if (type === 'tienda') {
    B(wood, 0.6, 1.0, 5.4, 0.8, FY + 0.5, -0.5); B(dark, 0.7, 0.05, 5.5, 0.8, FY + 1.02, -0.5); solid(0.8, -0.5, 0.6, 5.4);   // mostrador
    shelf(-hw + 0.2, 0, 2 * hd - 0.3, 'e'); shelf(-1.4, -hd + 0.2, 3.6, 's');
    sack(hw - 0.5, hd - 0.5, 0.4); sack(hw - 1.1, hd - 0.45, 1.2); sack(hw - 0.55, hd - 1.1, 2.0); barrel(hw - 0.45, -hd + 0.45); barrel(hw - 1.15, -hd + 0.45); crate(hw - 0.5, -hd + 1.3);
    for (const [cz, c] of [[-2.2, 0xc9a23a], [-1.5, 0xa82018], [0.6, 0xe8e2d0], [1.3, 0x8a5a3a]]) B(L(c), 0.22, 0.12, 0.3, 0.8, FY + 1.1, cz);   // género sobre el mostrador
    const sc = cylM(mats.iron, 0.14, 0.03, 0.8, FY + 1.2, -0.5); inner.add(sc); inner.add(cylM(mats.iron, 0.012, 0.3, 0.8, FY + 1.06, -0.5));           // balanza
    P('lampara_petroleo', 0.8, 1.75, 0, 1, FY + 1.05); P('botellas', 0.82, -2.85, Math.PI / 2, 1, FY + 1.05); P('canasto', 0.8, 0.05, 0.4, 1, FY + 1.05);
    P('balde', hw - 0.45, 1.9); P('escoba', hw - 0.2, 2.7, -Math.PI / 2); P('jarra', -1.4, -hd + 0.25, 0, 1, FY + 1.33);
    lampAt(); spot = [x - 0.5, z];
  } else if (type === 'inspeccion') {
    if (!P('escritorio', -0.4, 0, Math.PI / 2)) { B(dark, 0.8, 0.06, 1.5, -0.4, FY + 0.76, 0); B(dark, 0.7, 0.72, 0.5, -0.4, FY + 0.37, -0.45); B(dark, 0.7, 0.72, 0.06, -0.4, FY + 0.37, 0.7); }
    solid(-0.4, 0, 0.8, 1.5);
    chair(1.0, 0.3, -Math.PI / 2); B(L(0xd8d0bc), 0.3, 0.02, 0.22, -0.35, FY + 0.81, 0.2, 0.3); B(L(0x151515), 0.34, 0.12, 0.3, -0.4, FY + 0.85, -0.4);
    if (!P('armario', -hw + 0.42, -1.7, Math.PI / 2)) shelf(-hw + 0.2, -1.6, 1.6, 'e', false); else solid(-hw + 0.42, -1.7, 0.75, 1.0);
    P('lampara_petroleo', -0.4, -0.45, 0, 1, FY + 0.8); P('taburete', 2.6, -hd + 0.5);
    B(wood, 2.2, 0.06, 0.4, 1.4, FY + 0.45, hd - 0.25); for (const e of [-0.9, 0.9]) B(wood, 0.06, 0.45, 0.36, 1.4 + e, FY + 0.22, hd - 0.25); solid(1.4, hd - 0.25, 2.2, 0.4);   // banca de espera
    inner.add(cylM(wood, 0.025, 2.2, hw - 0.3, FY + 1.1, -hd + 0.3));                                                                                       // bandera
    for (const [c, yy] of [[0xe2b23a, 2.0], [0x1d4f9a, 1.7], [0xb3261e, 1.55]]) B(L(c), 0.02, yy === 2.0 ? 0.3 : 0.15, 0.6, hw - 0.3, FY + yy, -hd + 0.62);
    lampAt(); spot = [x - 1.4, z];
  } else if (type === 'capilla') {
    for (let r = 0; r < 5; r++) for (const s of [-1, 1]) {
      const cz = 4.0 - r * 1.5, cx = s * 2.35;
      if (!(P('banca', cx - 0.6, cz, Math.PI) && P('banca', cx + 0.6, cz, Math.PI))) { B(wood, 2.9, 0.06, 0.4, cx, FY + 0.45, cz); B(wood, 2.9, 0.5, 0.05, cx, FY + 0.72, cz + 0.2); for (const e of [-1.35, 1.35]) B(wood, 0.06, 0.45, 0.38, cx + e, FY + 0.22, cz); }
      solid(cx, cz, 2.9, 0.45);
    }
    B(dark, 2.4, 0.9, 0.9, 0, FY + 0.45, -hd + 1.0); B(L(0xe8e2d0), 2.5, 0.03, 1.0, 0, FY + 0.92, -hd + 1.0); solid(0, -hd + 1.0, 2.4, 0.9);   // altar
    cross(0, FY + 3.0, -hd + 0.03, 0, 1.5);
    for (const s of [-1, 1]) P('candelero', s * 0.45, -hd + 1.0, 0, 1.6, FY + 0.94);
    for (const s of [-1, 1]) { inner.add(cylM(L(0xe8e2d0), 0.03, 0.3, s * 0.8, FY + 1.08, -hd + 1.0)); const fl = new THREE.Mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: 0xffd76a })); fl.scale.set(0.025, 0.07, 0.025); fl.position.set(s * 0.8, FY + 1.27, -hd + 1.0); inner.add(fl); }
    spot = [x, z - hd + 2.2];
  } else if (type === 'rancho') {
    bed(hw - 0.55, -hd + 1.05); table(-hw + 0.9, hd - 0.75, 1.1, 0.7); shelf(-0.2, -hd + 0.2, 1.6, 's');
    for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(GEO.cone, L(0x3f6a3a)); c.scale.set(0.06, 0.34, 0.06); c.position.set(-hw + 0.5 + i * 0.3, h - 0.35, hd - 0.2); c.rotation.x = Math.PI; inner.add(c); }   // manojos de yerbas colgados
    if (!P('vasija', -hw + 0.7, hd - 0.75, 0, 1, FY + 0.8)) inner.add(cylM(L(0x6a3a22), 0.16, 0.22, -hw + 0.8, FY + 0.9, hd - 0.75));
    P('jarra', -hw + 1.15, hd - 0.7, 1, 1, FY + 0.8); P('canasto', hw - 0.5, hd - 0.5, 0.6); P('olla_barro', -hw + 0.5, -hd + 0.5, 0, 0.8); lampAt(h - 0.4);
  } else {   // casa campesina: cama, mesa con sillas, baúl, fogón y un crucifijo
    const v = Math.abs(Math.round(x + z)) % 2;   // dos distribuciones
    bed(v ? -hw + 0.6 : hw - 0.6, -hd + 1.1);
    table(v ? hw - 1.3 : -hw + 1.3, hd - 1.2); chair(v ? hw - 1.3 : -hw + 1.3, hd - 2.0, Math.PI); chair((v ? hw - 1.3 : -hw + 1.3) + (v ? -0.95 : 0.95), hd - 1.2, v ? Math.PI / 2 : -Math.PI / 2);
    crate(v ? -hw + 0.5 : hw - 0.5, hd - 0.5, 0.6);   // baúl en la esquina, lejos del vano de la puerta
    const fx = v ? hw - 0.6 : -hw + 0.6, fz = -hd + 0.55;                                                   // fogón de adobe
    B(pbr('plaster', 0xa88a6a), 1.0, 0.75, 0.7, fx, FY + 0.37, fz); solid(fx, fz, 1.0, 0.7);
    inner.add(cylM(L(0x18181a), 0.16, 0.2, fx - 0.2, FY + 0.85, fz));
    B(new THREE.MeshBasicMaterial({ color: 0xff6a22 }), 0.3, 0.02, 0.2, fx + 0.22, FY + 0.76, fz);
    cross(0, FY + 2.1, -hd + 0.03, 0, 0.5); lampAt();
    if (P('alacena', 0, -hd + 0.36, 0)) solid(0, -hd + 0.36, 1.2, 0.62);
    P('candelero', v ? hw - 1.3 : -hw + 1.3, hd - 1.2, 0, 1.3, FY + 0.8); P('olla_barro', fx - 0.15, fz, 0, 0.55, FY + 0.75); P('escoba', v ? -hw + 0.2 : hw - 0.2, hd - 1.4, v ? Math.PI / 2 : -Math.PI / 2);
  }
  {
    const nx = side === 'e' ? 1 : side === 'w' ? -1 : 0, nz = side === 's' ? 1 : side === 'n' ? -1 : 0, half = nx ? w / 2 : d / 2;
    const px = nx * (half + 0.45) + nz * 1.25, pz = nz * (half + 0.45) + nx * 1.25;
    if (P('matera', px, pz, 0, 1.7, 0, deco)) { P('helecho', px, pz, px, 0.75, 0.33, deco); col.addCircle(x + px, z + pz, 0.28); }
  }
  flatten(shell);
  group.add(shell); group.add(props); group.add(deco);
  return { x, z, w, d, h, y0, type, ix0: x - hw, ix1: x + hw, iz0: z - hd, iz1: z + hd, door, shell, spot, props, deco };
}
