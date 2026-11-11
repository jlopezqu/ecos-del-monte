// Personas reales: los modelos de MakeHuman/MPFB (models.js) vestidos por código para este juego.
//  - La ropa se tiñe en dos tonos (prenda de arriba y prenda de abajo) con los colores de cada personaje.
//  - La piel toma el tono del personaje.
//  - Sombrero, pañoleta, ruana y sotana se modelan aquí a la medida de cada cuerpo y se pegan a sus huesos.
// Solo hay personas reales en calidad alta; si los modelos no cargaron, realPerson() devuelve null
// y entities.js arma la figura por código, como antes.
import * as THREE from 'three';
import { makeModelPerson, hasModels } from './models.js';
import { TEX } from './world.js';

const V = new THREE.Vector3(), C = new THREE.Color();
const lum = (c) => { C.set(c); return 0.2126 * C.r + 0.7152 * C.g + 0.0722 * C.b; };   // luminancia (lineal)
const lin = (v) => Math.pow(v / 255, 2.2);
const matName = (o) => (Array.isArray(o.material) ? o.material[0] : o.material).name || '';
const STEP = 0.04;   // alto de cada franja al medir la silueta

// ---------- Lectura de texturas (para conocer su color y brillo medios) ----------
const pixCache = new WeakMap(), avgCache = new WeakMap();
function pixels(tex) {
  const im = tex && tex.image;
  if (!im || !im.width) return null;
  if (!pixCache.has(im)) {
    let d = null;
    try {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0); d = x.getImageData(0, 0, im.width, im.height);
    } catch { d = null; }
    pixCache.set(im, d);
  }
  return pixCache.get(im);
}
function average(tex) {   // color medio (lineal) de una textura
  const d = pixels(tex);
  if (!d) return null;
  if (!avgCache.has(d)) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.data.length; i += 28) { r += lin(d.data[i]); g += lin(d.data[i + 1]); b += lin(d.data[i + 2]); n++; }
    avgCache.set(d, [r / n, g / n, b / n]);
  }
  return avgCache.get(d);
}

// ---------- Ropa de dos tonos ----------
// La textura de MakeHuman trae camisa y pantalón (o blusa y falda) juntos. Cada isla de la malla se marca como
// prenda de arriba o de abajo según los huesos que la mueven, y el sombreador cambia el color de la textura por
// el del personaje conservando los pliegues (su brillo relativo).
const LOWER = /^(pelvis|thigh|calf|foot|ball)/, UPPER = /^(spine_0[23]|clavicle|upperarm|lowerarm|hand|neck|head)/;
function outfitInfo(mesh) {
  const g = mesh.geometry;
  if (g.userData.outfit !== undefined) return g.userData.outfit;
  let info = null;
  const idx = g.index, si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), uv = g.getAttribute('uv'), map = mesh.material.map, d = pixels(map);
  if (idx && si && sw && uv && d) {
    const n = uv.count, par = new Int32Array(n);
    for (let i = 0; i < n; i++) par[i] = i;
    const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    for (let t = 0; t < idx.count; t += 3) { const a = find(idx.getX(t)); par[find(idx.getX(t + 1))] = a; par[find(idx.getX(t + 2))] = a; }
    const cls = mesh.skeleton.bones.map((b) => (LOWER.test(b.name) ? -1 : UPPER.test(b.name) ? 1 : 0));
    const vote = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let v = 0;
      for (let c = 0; c < 4; c++) v += (cls[si.getComponent(i, c)] || 0) * sw.getComponent(i, c);
      vote[find(i)] += v;
    }
    const part = new Float32Array(n), sum = [0, 0], cnt = [0, 0], p = new THREE.Vector2();
    map.updateMatrix();
    for (let i = 0; i < n; i++) {
      const up = vote[find(i)] >= 0 ? 1 : 0;
      part[i] = up;
      p.set(uv.getX(i), uv.getY(i)).applyMatrix3(map.matrix);
      const px = Math.min(d.width - 1, Math.floor((p.x - Math.floor(p.x)) * d.width)), py = Math.min(d.height - 1, Math.floor((p.y - Math.floor(p.y)) * d.height));
      const k = (py * d.width + px) * 4;
      sum[up] += 0.2126 * lin(d.data[k]) + 0.7152 * lin(d.data[k + 1]) + 0.0722 * lin(d.data[k + 2]); cnt[up]++;
    }
    g.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
    info = { top: cnt[1] ? Math.max(0.01, sum[1] / cnt[1]) : 0.1, bot: cnt[0] ? Math.max(0.01, sum[0] / cnt[0]) : 0.1 };
  }
  g.userData.outfit = info;
  return info;
}
function twoTone(mesh, top, bottom) {
  const info = outfitInfo(mesh);
  if (!info) return;
  const m = mesh.material.clone();
  m.color.set(0xffffff);
  const u = { uTop: { value: new THREE.Color(top) }, uBot: { value: new THREE.Color(bottom) }, uMean: { value: new THREE.Vector2(info.top, info.bot) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPart;\nvarying float vPart;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvPart = aPart;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTop;\nuniform vec3 uBot;\nuniform vec2 uMean;\nvarying float vPart;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n\t{ float up = step(0.5, vPart); float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) / mix(uMean.y, uMean.x, up); diffuseColor.rgb = mix(uBot, uTop, up) * clamp(pow(max(l, 0.0001), 0.5), 0.42, 1.45); }');
  };
  m.customProgramCacheKey = () => 'ropa-dos-tonos';
  mesh.material = m;
}
// La piel de MakeHuman es clara: se multiplica para que, en promedio, quede del tono del personaje.
function toneSkin(root, tone) {
  root.traverse((o) => {
    if (!o.isMesh || !/^skin/.test(matName(o))) return;
    const a = average(o.material.map);
    if (!a) return;
    C.set(tone);
    const m = o.material.clone();
    m.color.setRGB(Math.min(1.6, C.r / a[0]), Math.min(1.6, C.g / a[1]), Math.min(1.6, C.b / a[2]));
    o.material = m;
  });
}

// ---------- Medidas del cuerpo ----------
const ARM = /^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)/;
// Recorre los vértices, ya deformados por el esqueleto, de las mallas cuyo material cumple `re`.
function eachVertex(root, re, fn) {
  root.traverse((o) => {
    if (!o.isSkinnedMesh || !re.test(matName(o))) return;
    const g = o.geometry, pos = g.getAttribute('position'), si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), names = o.skeleton.bones.map((b) => b.name);
    for (let i = 0; i < pos.count; i++) {
      let head = 0, arm = 0;
      for (let c = 0; c < 4; c++) {
        const w = sw.getComponent(i, c);
        if (!w) continue;
        const n = names[si.getComponent(i, c)] || '';
        if (n === 'head') head += w; else if (ARM.test(n)) arm += w;
      }
      o.getVertexPosition(i, V).applyMatrix4(o.matrixWorld);
      fn(V, head, arm);
    }
  });
}
const headCache = {}, bodyCache = {};
// Caja de la cabeza respecto a su hueso. Se mide en la pose de reposo (cabeza derecha, mirando al frente).
function headBox(inst) {
  if (headCache[inst.kind] === undefined) {
    inst.root.updateMatrixWorld(true);
    const hp = inst.bones.head.getWorldPosition(new THREE.Vector3()), b = new THREE.Box3();
    eachVertex(inst.root, /^skin/, (v, head) => { if (head > 0.6) b.expandByPoint(v); });
    headCache[inst.kind] = b.isEmpty() ? null : { min: b.min.clone().sub(hp), max: b.max.clone().sub(hp) };
  }
  return headCache[inst.kind];
}
// Silueta por franjas de altura en la pose de pie: `all` con los brazos, `core` sin ellos. Sin la cabeza.
function bodySlices(inst) {
  if (!bodyCache[inst.kind]) {
    inst.root.updateMatrixWorld(true);
    const all = new Map(), core = new Map();
    const put = (m, v) => {
      const k = Math.floor(v.y / STEP);
      let s = m.get(k);
      if (!s) m.set(k, (s = { x: 0, z0: 9, z1: -9 }));
      s.x = Math.max(s.x, Math.abs(v.x)); s.z0 = Math.min(s.z0, v.z); s.z1 = Math.max(s.z1, v.z);
    };
    eachVertex(inst.root, /^(skin|cloth|shoes)/, (v, head, arm) => { if (head > 0.5) return; put(all, v); if (arm < 0.5) put(core, v); });
    bodyCache[inst.kind] = { all, core };
  }
  return bodyCache[inst.kind];
}

// ---------- Piezas hechas por código ----------
const mats = new Map();
let weaveTex = null;
function weave() {
  if (!weaveTex && TEX.fabric) { weaveTex = TEX.fabric.normal.clone(); weaveTex.repeat.set(6, 6); weaveTex.needsUpdate = true; }
  return weaveTex;
}
// Material de tela o fieltro. vc: colores por vértice (cintas y franjas); two: a dos caras; weave: trama en relieve.
function fabric(color, o = {}) {
  const k = [color, o.vc ? 1 : 0, o.two ? 1 : 0, o.weave === false ? 0 : 1, o.rough ?? 0.9].join('|');
  let m = mats.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.9, metalness: 0, vertexColors: !!o.vc, side: o.two ? THREE.DoubleSide : THREE.FrontSide });
    if (o.weave !== false && weave()) { m.normalMap = weave(); m.normalScale = new THREE.Vector2(0.8, 0.8); }
    mats.set(k, m);
  }
  return m;
}
// Pieza torneada a partir de un perfil [radio, altura, tono]. El tono (0 a 1) oscurece el color por vértice.
function lathe(profile, seg = 26) {
  const g = new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg);
  const n = profile.length, col = new Float32Array(g.getAttribute('position').count * 3);
  for (let i = 0; i <= seg; i++) for (let j = 0; j < n; j++) { const k = (i * n + j) * 3; col[k] = col[k + 1] = col[k + 2] = profile[j][2] ?? 1; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const SPH = new THREE.SphereGeometry(1, 20, 14);
const RING = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
// Casquete de la pañoleta: una esfera abierta por debajo, inclinada para que baje hasta la nuca y deje libre la frente.
const SCARF = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, 1.809).rotateX(-0.558);
// Sombreros: perfil [radio, altura sobre la línea donde asienta, tono]. La cinta va pintada por vértice.
const HATS = {
  campo: [[0.001, 0.108], [0.05, 0.11], [0.08, 0.103], [0.096, 0.085], [0.1, 0.034], [0.1005, 0.033, 0.16], [0.1015, 0.004, 0.16], [0.102, 0.003], [0.135, -0.004], [0.18, -0.012], [0.212, -0.01], [0.226, 0]],
  ciudad: [[0.001, 0.098], [0.04, 0.104], [0.075, 0.106], [0.092, 0.094], [0.098, 0.036], [0.0985, 0.035, 0.1], [0.1, 0.004, 0.1], [0.1005, 0.003], [0.125, -0.006], [0.155, -0.012], [0.172, -0.008], [0.178, -0.002]],
};
const geoCache = {};
const hatGeo = (kind) => geoCache['hat|' + kind] || (geoCache['hat|' + kind] = lathe(HATS[kind], 28));
// Prenda que cuelga (ruana, falda de sotana): superficie que envuelve la silueta entre dos alturas. En cada franja
// se ajusta al ancho y al fondo del cuerpo (por delante y por detrás), y nunca se encoge hacia abajo: cae a plomo.
// o.folds: pliegues verticales que crecen hacia el ruedo · o.points: cuánto bajan las puntas de adelante y atrás ·
// o.band: franja más oscura cerca del ruedo · o.square: sección más cuadrada (cubre los codos).
function drapeGeo(key, slices, yTop, yBot, margin, o = {}) {
  if (geoCache[key] !== undefined) return geoCache[key];
  const rows = [], SEG = 36, sq = o.square ? 0.62 : 1;
  for (let k = Math.floor(yTop / STEP); (k + 1) * STEP > yBot; k--) {
    const s = slices.get(k), y = Math.min(yTop, Math.max(yBot, (k + 0.5) * STEP));
    if (s && (!rows.length || rows[rows.length - 1].y - y > 0.004)) rows.push({ y, s });
  }
  let geo = null;
  if (rows.length >= 3) {
    let zc = 0, r = 0, f = 0, b = 0;
    for (const q of rows) zc += (q.s.z0 + q.s.z1) / 2;
    zc /= rows.length;
    const smooth = (list, keys) => { for (let pass = 0; pass < 2; pass++) for (const k of keys) for (let i = 1; i < list.length - 1; i++) list[i][k] = Math.max(list[i][k], (list[i - 1][k] + 2 * list[i][k] + list[i + 1][k]) / 4); };   // suaviza sin encoger
    const prof = rows.map((q) => { r = Math.max(r, q.s.x + margin); return { r, y: q.y }; });
    smooth(prof, ['r']);
    // El fondo (por delante y por detrás) se mide hasta donde llegan las puntas, que cuelgan más abajo que los costados.
    const dep = [], yLow = yBot - (o.points || 0);
    for (let k = Math.floor(yTop / STEP); (k + 1) * STEP > yLow; k--) {
      const s = slices.get(k);
      if (!s) continue;
      f = Math.max(f, s.z1 - zc + margin); b = Math.max(b, zc - s.z0 + margin);
      dep.push({ y: Math.min(yTop, (k + 0.5) * STEP), f, b });
    }
    smooth(dep, ['f', 'b']);
    const depthAt = (y, front) => {
      let i = 0;
      while (i < dep.length - 2 && dep[i + 1].y >= y) i++;
      const d0 = dep[i], d1 = dep[i + 1], u = Math.min(1, Math.max(0, (d0.y - y) / Math.max(1e-6, d0.y - d1.y)));
      return front ? d0.f + (d1.f - d0.f) * u : d0.b + (d1.b - d0.b) * u;
    };
    geo = lathe(prof.map((p) => [p.r, p.y, o.band && p.y < yBot + 0.1 && p.y > yBot + 0.015 ? 0.5 : 1]), SEG);
    const pos = geo.getAttribute('position'), n = prof.length;
    for (let i = 0; i <= SEG; i++) for (let j = 0; j < n; j++) {
      const p = prof[j], a = (i / SEG) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), t = (yTop - p.y) / (yTop - yBot);
      const fold = 1 + (o.folds || 0) * t * (0.5 + 0.5 * Math.sin(a * 9)), y = p.y - (o.points || 0) * t * t * c * c;
      const sx = Math.sign(s) * Math.pow(Math.abs(s), sq), sz = Math.sign(c) * Math.pow(Math.abs(c), sq);   // sq < 1: sección más cuadrada que una elipse
      pos.setXYZ(i * n + j, p.r * sx * fold, y, zc + depthAt(y, c >= 0) * sz * fold);
    }
    geo.computeVertexNormals();
    const nor = geo.getAttribute('normal');   // la costura (primer y último meridiano) comparte normales
    for (let j = 0; j < n; j++) {
      V.set(nor.getX(j) + nor.getX(SEG * n + j), nor.getY(j) + nor.getY(SEG * n + j), nor.getZ(j) + nor.getZ(SEG * n + j)).normalize();
      nor.setXYZ(j, V.x, V.y, V.z); nor.setXYZ(SEG * n + j, V.x, V.y, V.z);
    }
  }
  geoCache[key] = geo;
  return geo;
}
// Punta de la pañoleta que cae sobre la nuca: un triángulo de tela algo abombado.
const TAIL = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.078, 0, 0.012, 0.078, 0, 0.012, 0, -0.07, -0.02, 0, -0.215, -0.045]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0.5, 0.65, 0.5, 0]), 2));
  g.setIndex([0, 2, 1, 0, 3, 2, 2, 3, 1]);
  g.computeVertexNormals();
  return g;
})();
function headDims(hb) {
  const front = hb.max.z - 0.022;   // la frente queda unos 2 cm detrás de la punta de la nariz
  return { hw: (hb.max.x - hb.min.x) / 2, cx: (hb.max.x + hb.min.x) / 2, cz: (front + hb.min.z) / 2, hd: (front - hb.min.z) / 2, top: hb.max.y };
}
function addHat(g, inst, hb, o, hairColor) {
  const head = inst.bones.head, hp = head.getWorldPosition(new THREE.Vector3()), d = headDims(hb), grp = new THREE.Group();
  const hat = new THREE.Mesh(hatGeo(o.city ? 'ciudad' : 'campo'), fabric(o.hat, { vc: true, two: true, weave: !o.city, rough: o.city ? 0.95 : 0.85 }));
  hat.scale.set((d.hw + 0.004) / 0.1, 1, (d.hd + 0.009) / 0.1); hat.rotation.x = 0.07; hat.position.set(0, 0.026, 0.004);
  const hair = new THREE.Mesh(SPH, fabric(hairColor, { weave: false, rough: 0.75 }));   // el pelo que asoma bajo el sombrero
  hair.scale.set(d.hw, 0.092, d.hd + 0.004); hair.position.set(0, 0, -0.012);
  grp.add(hat, hair);
  grp.position.set(hp.x + d.cx, hp.y + d.top - 0.088, hp.z + d.cz);
  g.add(grp); head.attach(grp);
}
function addScarf(g, inst, hb, o) {
  const head = inst.bones.head, hp = head.getWorldPosition(new THREE.Vector3()), d = headDims(hb), grp = new THREE.Group(), m = fabric(o.scarf, { two: true }), rz = d.hd + 0.018;
  const cap = new THREE.Mesh(SCARF, m);
  cap.scale.set(d.hw + 0.013, 0.109, rz);
  const knot = new THREE.Mesh(SPH, m);   // el nudo, en la nuca
  knot.scale.set(0.034, 0.026, 0.022); knot.position.set(0, -0.082, -rz * 0.74);
  const tail = new THREE.Mesh(TAIL, m);  // y la punta que cae por detrás
  tail.position.set(0, -0.078, -rz * 0.76);
  grp.add(cap, knot, tail);
  grp.position.set(hp.x + d.cx, hp.y + d.top - 0.095, hp.z + d.cz - 0.004);
  g.add(grp); head.attach(grp);
}
const boneY = (inst, name) => inst.bones[name].getWorldPosition(V).y;
// Ruana corta: cubre hombros y brazos hasta el codo, con las puntas de adelante y atrás más largas. Los antebrazos quedan libres.
function addRuana(g, inst, o) {
  const neck = boneY(inst, 'neck_01');
  const geo = drapeGeo(inst.kind + '|ruana', bodySlices(inst).all, neck + 0.035, neck - 0.33, 0.022, { folds: 0.07, points: 0.17, band: true, square: true });
  if (!geo) return;
  const m = new THREE.Mesh(geo, fabric(o.ruana, { vc: true, two: true }));
  g.add(m); (inst.bones.spine_03 || inst.bones.pelvis).attach(m);
}
function addCassock(g, inst, o) {   // sotana: falda hasta los tobillos sobre la ropa negra, y alzacuello
  const s = bodySlices(inst), neck = boneY(inst, 'neck_01');
  const skirt = drapeGeo(inst.kind + '|sotana', s.core, boneY(inst, 'pelvis') + 0.14, 0.07, 0.016, { folds: 0.05 });
  if (skirt) { const m = new THREE.Mesh(skirt, fabric(o.cloth, { vc: true, two: true })); g.add(m); inst.bones.pelvis.attach(m); }
  const row = s.all.get(Math.floor((neck + 0.05) / STEP));
  if (row) {
    const c = new THREE.Mesh(RING, fabric(0xe8e4d8, { two: true, weave: false }));
    c.scale.set(row.x + 0.007, 0.026, (row.z1 - row.z0) / 2 + 0.007); c.position.set(0, neck + 0.052, (row.z0 + row.z1) / 2);
    g.add(c); inst.bones.neck_01.attach(c);
  }
}

// ---------- Persona completa ----------
// Recibe las mismas opciones que makePerson() de entities.js (skin, cloth, pants, skirt, hair, longHair, hat, ruana,
// sit, simple) más: old (persona mayor), scarf (color de la pañoleta), city (sombrero de fieltro de ciudad).
// Devuelve un grupo con userData.actor = { play(nombre, fundido), update(dt), base, noTalk } o null si no hay modelos.
export function realPerson(o = {}) {
  if (!hasModels()) return null;
  const robe = o.skirt != null, cassock = robe && o.skirt === o.cloth;
  const old = o.old ?? (o.hair != null && lum(o.hair) > 0.18);
  const inst = makeModelPerson({ female: (robe && !cassock) || !!o.longHair, old, sit: o.sit });
  if (!inst || !inst.bones.head) return null;
  const g = new THREE.Group();
  g.add(inst.root);
  inst.root.traverse((m) => { if (m.isSkinnedMesh && !Array.isArray(m.material) && /^cloth/.test(m.material.name)) twoTone(m, o.cloth ?? 0x6a5a48, o.skirt ?? o.pants ?? 0x2b2b33); });
  toneSkin(inst.root, o.skin ?? 0xa87a56);
  inst.root.traverse((m) => {   // el calzado de MakeHuman es de un cuero muy anaranjado: se oscurece
    if (!m.isMesh || Array.isArray(m.material) || !/^shoes/.test(m.material.name)) return;
    m.material = m.material.clone(); m.material.color.set(0x7a6a60);
  });

  // Cabeza, en la pose de reposo: sombrero (con el pelo que asoma) o pañoleta. En ambos casos se oculta el pelo del modelo.
  const hb = headBox(inst);
  if (hb && (o.hat != null || o.scarf != null)) {
    inst.root.traverse((m) => { if (m.isMesh && /^hair/.test(matName(m))) m.visible = false; });
    if (o.hat != null) addHat(g, inst, hb, o, o.hair ?? (old ? 0x8c8c88 : 0x1a1410));
    else addScarf(g, inst, hb, o);
  }
  // Cuerpo, en la pose de pie: ruana, o sotana si es el cura.
  inst.update(0);
  if (!o.sit && inst.bones.neck_01 && inst.bones.pelvis) {
    if (cassock) addCassock(g, inst, o);
    else if (o.ruana != null) addRuana(g, inst, o);
  }
  g.updateMatrixWorld(true);
  g.traverse((m) => {
    if (!m.isMesh) return;
    m.castShadow = !o.simple;
    if (m.isSkinnedMesh) {   // esfera fija y amplia alrededor del cuerpo: la que calcula three no sigue la animación
      m.boundingSphere = new THREE.Sphere(m.worldToLocal(new THREE.Vector3(0, 0.9, 0)), 1.3 / m.matrixWorld.getMaxScaleOnAxis());
      m.frustumCulled = true;
    }
  });
  g.userData.actor = { play: inst.play, update: inst.update, base: o.sit ? 'sit' : 'idle', noTalk: !!o.sit || o.ruana != null, kind: inst.kind, bones: inst.bones };
  return g;
}
