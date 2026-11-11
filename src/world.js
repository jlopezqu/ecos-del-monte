// Mundo: terreno, bosque por bloques, pueblo del Tolima y calle de Bogotá.
// Geometría procedural con materiales PBR reales (ambientCG, CC0), relieve por mapas normales y sombras.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, fbm, clamp, lerp, smoothstep } from './util.js';
import { makeBuilding } from './buildings.js';

export const WATER = 1.0;
export const GFX = { hi: true };   // calidad alta: texturas PBR y sombras
export const PROP = { make: null };   // lo fija main.js cuando hay modelos reales de muebles (props.js)
export const TEX = {};             // { nombre: { color, normal, rough } }
const TEX_LIST = ['ground', 'leaves', 'bark', 'foliage', 'plaster', 'rooftile', 'cobble', 'planks', 'rock', 'fabric', 'zinc'];

export function loadTextures() {
  if (!GFX.hi) return Promise.resolve();
  const L = new THREE.TextureLoader();
  const one = (url, srgb) => new Promise((res) => L.load(url, (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    res(t);
  }, undefined, () => res(null)));
  return Promise.all(TEX_LIST.map(async (n) => {
    const [color, normal, rough] = await Promise.all([one(`tex/${n}_color.jpg`, true), one(`tex/${n}_normal.jpg`, false), one(`tex/${n}_rough.jpg`, false)]);
    if (color && normal && rough) TEX[n] = { color, normal, rough };
  }));
}

// Lugares con nombre del mapa del Tolima (x, z). El norte es -z.
export const PLACES = {
  pueblo: [0, 0], parada: [0, 48], salida: [13, -42],
  tienda: [-24.5, 6], inspeccion: [-25.4, -12], capilla: [0, -20], rosalba: [19.5, 10],   // tienda e inspección: adentro, tras el mostrador y el escritorio
  custodia: [91, -54],
  aserrio: [-10, -150], camp1: [-120, -255], voz: [-195, -325],
  camp2: [70, -330], ruina: [-60, -430], ceiba: [150, -205], cueva: [232, -300],
  cruz1: [-150, -400], cruz2: [20, -480], cruz3: [130, -410],
};

// Acepta 'nombre', ['nombre', dx, dz] o [x, z].
export function place(spec) {
  if (typeof spec === 'string') return PLACES[spec].slice();
  if (typeof spec[0] === 'string') { const p = PLACES[spec[0]]; return [p[0] + (spec[1] || 0), p[1] + (spec[2] || 0)]; }
  return spec.slice();
}

// ---------- Texturas y materiales ----------
// Ruido de valor periódico: textura de reserva que se repite sin costuras (calidad baja o si falta un archivo).
function tnoise(x, y, per, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (a, b) => { let n = (Math.imul(((a % per) + per) % per, 374761393) + Math.imul(((b % per) + per) % per, 668265263) + seed * 1013) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function noiseTex(base = 232, range = 40, repX = 1, repY = repX, seed = 5) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), im = g.createImageData(S, S), d = im.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = tnoise((x / S) * 6, (y / S) * 6, 6, seed) * 0.45 + tnoise((x / S) * 24, (y / S) * 24, 24, seed + 1) * 0.33 + tnoise((x / S) * 96, (y / S) * 96, 96, seed + 2) * 0.22;
    const v = clamp(base + (n - 0.5) * 2 * range, 0, 255), i = (y * S + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
let _detail;
const detail = () => _detail || (_detail = noiseTex(234, 36, 2, 2, 9));
// Material sencillo para piezas pequeñas (metal pintado, tela, hierro).
export const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, map: detail(), ...o });

const withRepeat = (t, rx, ry) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };

// Coordenadas de textura en espacio de mundo: la textura mantiene su escala real en cualquier caja,
// por mucho que se estire. Se elige el plano de proyección según hacia dónde mira la cara.
function worldUV(mat, scale) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWuv = { value: scale };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWuv;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
      {
        #ifdef USE_INSTANCING
          vec4 wp4 = modelMatrix * instanceMatrix * vec4( position, 1.0 );
          vec3 wn3 = mat3( modelMatrix ) * mat3( instanceMatrix ) * normal;
        #else
          vec4 wp4 = modelMatrix * vec4( position, 1.0 );
          vec3 wn3 = mat3( modelMatrix ) * normal;
        #endif
        vec3 an = abs( normalize( wn3 ) );
        vec2 wuv = ( an.y >= an.x && an.y >= an.z ) ? wp4.xz : ( an.x >= an.z ? wp4.zy : wp4.xy );
        wuv *= uWuv;
        #ifdef USE_MAP
          vMapUv = wuv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = wuv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = wuv;
        #endif
      }`);
  };
}

const matCache = new Map();
// Material con textura real. Por defecto usa UV de mundo con `s` repeticiones por metro;
// con `rep: [x, y]` usa las UV propias de la pieza (troncos, copas, rocas).
export function pbr(name, color = 0xffffff, o = {}) {
  const { s = 0.5, rep = null, ...rest } = o;
  const key = name + '|' + color + '|' + s + '|' + (rep ? rep.join('x') : 'w') + '|' + JSON.stringify(rest);
  let m = matCache.get(key);
  if (m) return m;
  const t = GFX.hi ? TEX[name] : null;
  if (!t) {
    const basic = {};
    for (const k of ['side', 'vertexColors', 'transparent', 'opacity']) if (k in rest) basic[k] = rest[k];
    m = new THREE.MeshLambertMaterial({ color, map: detail(), ...basic });
  } else if (rep) {
    m = new THREE.MeshStandardMaterial({ color, map: withRepeat(t.color, rep[0], rep[1]), normalMap: withRepeat(t.normal, rep[0], rep[1]), roughnessMap: withRepeat(t.rough, rep[0], rep[1]), ...rest });
  } else {
    m = new THREE.MeshStandardMaterial({ color, map: t.color, normalMap: t.normal, roughnessMap: t.rough, ...rest });
    worldUV(m, s);
  }
  matCache.set(key, m);
  return m;
}

// ---------- Geometrías ----------
const flatGeo = (g) => { const n = g.toNonIndexed(); n.computeVertexNormals(); return n; };
// Esfera irregular con normales suaves: copas de árbol, matorrales y piedras.
function lumpy(detailLevel, amp, seed) {
  let g = new THREE.IcosahedronGeometry(1, detailLevel);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = fbm(x * 1.6 + seed, y * 1.6 + z * 0.7, 3, seed) + fbm(z * 1.6 - seed, x * 0.9 + y * 1.3, 3, seed + 5) - 1;
    const k = 1 + n * amp;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  g.computeVertexNormals();
  return g;
}

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  trunk: (() => { const g = new THREE.CylinderGeometry(0.72, 1, 1, 10, 1, true); g.translate(0, 0.5, 0); return g; })(),
  blob: lumpy(1, 0.55, 3),
  rock: lumpy(1, 0.7, 11),
  roof: (() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); g.rotateY(Math.PI / 4); return flatGeo(g); })(),
  cone: new THREE.ConeGeometry(1, 1, 7),
  plane: new THREE.PlaneGeometry(1, 1),
  sphere: new THREE.SphereGeometry(1, 20, 14),
};

function frondGeo() {
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const g = new THREE.PlaneGeometry(0.75, 3.2, 1, 4);
    g.translate(0, 1.6, 0);
    g.rotateX(1.05 + (i % 2) * 0.25);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const d = Math.hypot(p.getY(k), p.getZ(k)); p.setY(k, p.getY(k) - d * d * 0.09); }
    g.rotateY((i / 8) * Math.PI * 2);
    parts.push(g);
  }
  const m = mergeGeometries(parts);
  m.computeVertexNormals();
  return m;
}

function box(mat, w, h, d, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(GEO.box, mat);
  m.scale.set(w, h, d); m.position.set(x, y, z);
  return m;
}
function cylM(mat, r, h, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(GEO.cyl, mat);
  m.scale.set(r, h, r); m.position.set(x, y, z);
  return m;
}

let _glow;
export function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}
export function glowSprite(color, scale, opacity = 0.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(scale);
  return s;
}

export function makeSign(text, w, h, o = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(32, Math.round((512 * h) / w));
  const g = c.getContext('2d');
  g.fillStyle = o.bg ?? '#e6dcc0'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = o.fg ?? '#2a1a12'; g.lineWidth = 5; g.strokeRect(5, 5, c.width - 10, c.height - 10);
  g.fillStyle = o.fg ?? '#2a1a12';
  let size = Math.floor(c.height * 0.56);
  g.font = `bold ${size}px Georgia, serif`;
  while (g.measureText(text).width > c.width - 36 && size > 10) { size -= 2; g.font = `bold ${size}px Georgia, serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.14 }));
  m.userData.noShadow = true;
  return m;
}

export function makeCross(h, mat) {
  const g = new THREE.Group();
  g.add(box(mat, 0.12, h, 0.12, 0, h / 2, 0), box(mat, h * 0.55, 0.12, 0.12, 0, h * 0.68, 0));
  return g;
}

// Marca qué proyecta y recibe sombra (no las llamas, los destellos, los letreros ni el agua).
function markShadows(group) {
  group.traverse((o) => {
    if (!o.isMesh || o.userData.noShadow || o.material.isMeshBasicMaterial) return;
    o.receiveShadow = true;
    o.castShadow = o.geometry !== GEO.plane;
  });
}

// Fusiona todas las mallas bajo `root` en una por material (las casas con sus muebles quedan en pocas llamadas de dibujo).
function flattenGroup(root) {
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
  for (const [mat, list] of by) { const mg = mergeGeometries(list); if (mg) root.add(new THREE.Mesh(mg, mat)); }
  return root;
}

// ---------- Colisiones: círculos en rejilla y cajas alineadas ----------
const CELL = 8;
class Colliders {
  constructor() { this.cells = new Map(); this.boxes = []; }
  addCircle(x, z, r) {
    const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
    let a = this.cells.get(k);
    if (!a) this.cells.set(k, (a = []));
    a.push(x, z, r);
  }
  addBox(x0, z0, x1, z1) { this.boxes.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); }
  resolve(p, r) {
    const cx = Math.floor(p.x / CELL), cz = Math.floor(p.z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = this.cells.get(cx + i + ',' + (cz + j));
      if (!a) continue;
      for (let n = 0; n < a.length; n += 3) {
        const dx = p.x - a[n], dz = p.z - a[n + 1], m = r + a[n + 2], d2 = dx * dx + dz * dz;
        if (d2 < m * m && d2 > 1e-8) { const d = Math.sqrt(d2), k = (m - d) / d; p.x += dx * k; p.z += dz * k; }
      }
    }
    for (const b of this.boxes) {
      const nx = clamp(p.x, b[0], b[2]), nz = clamp(p.z, b[1], b[3]);
      const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
      else {
        const l = p.x - b[0], rr = b[2] - p.x, t = p.z - b[1], bt = b[3] - p.z, m = Math.min(l, rr, t, bt);
        if (m === l) p.x = b[0] - r; else if (m === rr) p.x = b[2] + r; else if (m === t) p.z = b[1] - r; else p.z = b[3] + r;
      }
    }
  }
}

// ---------- Piezas reutilizables ----------

// Solo la llama y su resplandor; las piedras y los leños van instanciados con el bosque.
function makeCampfire() {
  const g = new THREE.Group();
  const flame = new THREE.Group();
  const f1 = new THREE.Mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: 0xff7a22 }));
  f1.scale.set(0.3, 0.95, 0.3); f1.position.y = 0.62;
  const f2 = new THREE.Mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: 0xffd76a }));
  f2.scale.set(0.16, 0.55, 0.16); f2.position.y = 0.48;
  flame.add(f1, f2);
  const glow = glowSprite(0xff8030, 4.5, 0.5); glow.position.y = 0.9;
  flame.visible = false; glow.visible = false;
  g.add(flame, glow);
  return { group: g, flame, glow };
}


// ====================================================================
//  TOLIMA: pueblo de San Jerónimo del Monte y bosque
// ====================================================================
export function buildTolima(quality = 1) {
  const group = new THREE.Group(); group.name = 'tolima';
  const col = new Colliders();
  const R = rng(20261110);
  const HI = GFX.hi;

  const riverX = (z) => 250 + 30 * Math.sin(z / 90);
  const rawH = (x, z) => 4 + fbm(x * 0.0055 + 10, z * 0.0055 + 10, 4, 7) * 24 + (fbm(x * 0.035, z * 0.035, 2, 3) - 0.5) * 2.2;
  const base = (x, z) => {
    let h = rawH(x, z);
    const d = Math.abs(x - riverX(z));
    if (d < 50) h = lerp(h, WATER + 0.6, 1 - smoothstep(14, 50, d));
    if (d < 14) h = lerp(h, WATER - 2.2, 1 - smoothstep(5, 14, d));
    return h;
  };
  // [lugar, radio plano, radio sin árboles]
  const FLATS = [['pueblo', 64, 62], ['custodia', 15, 12], ['aserrio', 24, 22], ['camp1', 12, 9], ['voz', 9, 6], ['camp2', 12, 9],
    ['ruina', 17, 15], ['cueva', 11, 10], ['ceiba', 12, 8], ['cruz1', 6, 4], ['cruz2', 6, 4], ['cruz3', 6, 4]]
    .map(([n, r, clear]) => ({ x: PLACES[n][0], z: PLACES[n][1], r, clear, h: base(PLACES[n][0], PLACES[n][1]) }));
  const heightAt = (x, z) => {
    let h = base(x, z);
    for (const f of FLATS) {
      const dx = x - f.x, dz = z - f.z, d2 = dx * dx + dz * dz, r2 = f.r * 1.7;
      if (d2 < r2 * r2) h = lerp(h, f.h, 1 - smoothstep(f.r, r2, Math.sqrt(d2)));
    }
    return h;
  };

  // Caminos de herradura entre lugares
  const PATHS = [['parada', 'pueblo', 'salida', 'aserrio', 'camp1', 'voz'], ['pueblo', 'custodia', 'ceiba'], ['aserrio', 'ceiba', 'cueva'],
    ['camp1', 'ruina'], ['ceiba', 'camp2', 'ruina']];
  const SEGS = [];
  PATHS.forEach((p) => { for (let i = 0; i < p.length - 1; i++) SEGS.push([...PLACES[p[i]], ...PLACES[p[i + 1]]]); });
  const segDist = (x, z) => {
    let m = 1e9;
    for (const [ax, az, bx, bz] of SEGS) {
      const vx = bx - ax, vz = bz - az;
      const t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
      const dx = x - ax - vx * t, dz = z - az - vz * t, d = dx * dx + dz * dz;
      if (d < m) m = d;
    }
    return Math.sqrt(m);
  };
  const pathDist = (x, z) => segDist(x + (fbm(x * 0.02, z * 0.02, 2, 21) - 0.5) * 12, z + (fbm(x * 0.02, z * 0.02, 2, 33) - 0.5) * 12);

  const mats = {
    wall: pbr('plaster', 0xe6dfcc), roof: pbr('rooftile', 0xffffff, { s: 0.45 }), door: pbr('planks', 0xc9a880, { s: 0.9 }),
    wood: pbr('planks', 0xf0dcc0, { s: 1.0 }), bark: pbr('bark', 0xb8a890, { rep: [2, 3] }),
    win: new THREE.MeshLambertMaterial({ color: 0x2a1c0e, emissive: 0xffb050, emissiveIntensity: 0.3 }), winDark: lam(0x14110e),
    stone: pbr('rock', 0xb0b0ac, { rep: [1, 1] }), iron: lam(0x1c1c1e), bulb: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
    zinc: pbr('zinc', 0xb8bcc0, { s: 0.6, metalness: 0.25 }), tarp: lam(0x1a1c20, { side: THREE.DoubleSide }), cloth: lam(0x6e5a44),
    char: pbr('plaster', 0x3a3532, { s: 0.6 }), charWood: pbr('planks', 0x2a221c, { s: 1.0 }), caveRock: pbr('rock', 0x9a9c9a, { rep: [3, 3] }),
    earth: pbr('ground', 0x8a7458, { rep: [1, 1] }),
    floor: pbr('planks', 0xffffff, { s: 0.8 }), ceil: pbr('planks', 0xd8c8b0, { s: 0.6 }), doorLeaf: pbr('planks', 0xc9a880, { s: 1.1 }), woodDark: pbr('planks', 0xb09070, { s: 1.0 }),
  };
  const ctx = { group, col, heightAt, mats, pbr, lam, makeSign, box, cylM, GEO, flatten: flattenGroup, prop: PROP.make };

  // ---------- Fogatas (refugios) ----------
  const FIRE_DEFS = [
    ['custodia', [90, -51], true], ['aserrio', ['aserrio', 7, 6]], ['camp1', ['camp1', 2.5, 1.5]], ['camp2', ['camp2', -2, 2.5]],
    ['ceiba', ['ceiba', 5.5, 4.5]], ['cueva', ['cueva', -3.5, 3.5]],
    ['ruina1', ['ruina', -8, -6]], ['ruina2', ['ruina', 8, -6]], ['ruina3', ['ruina', 8, 7]], ['ruina4', ['ruina', -8, 7]],
    ['r1', [-62, -205]], ['r2', [-150, -300]], ['r3', [-95, -345]], ['r4', [3, -365]], ['r5', [64, -296]], ['r6', [110, -252]],
    ['r7', [195, -255]], ['r8', [100, -378]], ['r9', [-20, -215]], ['r10', [48, -150]], ['r11', [-110, -420]], ['r12', [70, -445]],
  ];
  const fires = FIRE_DEFS.map(([id, at, perm]) => {
    const [x, z] = place(at), y = heightAt(x, z);
    const cf = makeCampfire();
    cf.group.position.set(x, y, z); group.add(cf.group);
    col.addCircle(x, z, 0.4);
    return { id, x, z, y, perm: !!perm, lit: !!perm, t: 0, d2: 0, flame: cf.flame, glow: cf.glow };
  });
  const fireLights = [0, 1, 2, 3].map(() => { const L = new THREE.PointLight(0xff8a3a, 0, 28, 1.7); group.add(L); return L; });

  const CLEARS = FLATS.map((f) => ({ x: f.x, z: f.z, r: f.clear })).concat(fires.map((f) => ({ x: f.x, z: f.z, r: 3.6 })));
  const clearOf = (x, z, extra = 0) => {
    for (const c of CLEARS) { const r = c.r + extra, dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < r * r) return false; }
    return true;
  };

  // ---------- Terreno ----------
  const SIZE = 800, SEG = 200, CZ = -200;
  {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2); geo.translate(0, 0, CZ);
    const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), blend = new Float32Array(pos.count), c = new THREE.Color();
    const C = (r, g, b) => new THREE.Color().setRGB(r, g, b);
    // En calidad alta el color sale de la textura y estos tonos solo la tiñen.
    const cA = HI ? C(0.52, 0.58, 0.42) : new THREE.Color(0x26331a), cB = HI ? C(0.76, 0.78, 0.58) : new THREE.Color(0x3d4623),
      cPath = HI ? C(0.86, 0.76, 0.6) : new THREE.Color(0x6a5236), cTown = HI ? C(0.9, 0.82, 0.68) : new THREE.Color(0x7d6e4c),
      cSand = HI ? C(1, 0.94, 0.8) : new THREE.Color(0x857a5c), cAsh = HI ? C(0.2, 0.19, 0.18) : new THREE.Color(0x2b2826);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, heightAt(x, z));
      const town = 1 - smoothstep(40, 66, Math.hypot(x, z)), path = 1 - smoothstep(1.5, 5, pathDist(x, z)),
        sand = 1 - smoothstep(10, 22, Math.abs(x - riverX(z))), ash = 1 - smoothstep(8, 18, Math.hypot(x - PLACES.ruina[0], z - PLACES.ruina[1]));
      c.copy(cA).lerp(cB, fbm(x * 0.05, z * 0.05, 2, 5));
      c.lerp(cTown, town); c.lerp(cPath, path); c.lerp(cSand, sand); c.lerp(cAsh, ash);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      blend[i] = (1 - town) * (1 - path) * (1 - sand) * (1 - ash * 0.7);   // 1 = hojarasca del monte, 0 = tierra pisada
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aBlend', new THREE.BufferAttribute(blend, 1));
    geo.computeVertexNormals();
    let tmat;
    if (HI && TEX.ground && TEX.leaves) {
      tmat = new THREE.MeshStandardMaterial({ vertexColors: true, map: withRepeat(TEX.ground.color, 180, 180), normalMap: withRepeat(TEX.ground.normal, 180, 180), roughnessMap: withRepeat(TEX.ground.rough, 180, 180) });
      // Dos capas mezcladas por vértice: tierra en caminos y pueblo, hojarasca en el monte.
      tmat.onBeforeCompile = (sh) => {
        sh.uniforms.uMap2 = { value: TEX.leaves.color };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aBlend;\nvarying float vBlend;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBlend = aBlend;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uMap2;\nvarying float vBlend;')
          .replace('#include <map_fragment>', `#ifdef USE_MAP
            vec4 sampledDiffuseColor = texture2D( map, vMapUv );
            vec4 leafLayer = texture2D( uMap2, vMapUv * 0.61 );
            sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, leafLayer.rgb, vBlend );
            diffuseColor *= sampledDiffuseColor;
          #endif`);
      };
    } else tmat = new THREE.MeshLambertMaterial({ vertexColors: true, map: noiseTex(222, 62, 150, 150, 3) });
    group.add(new THREE.Mesh(geo, tmat));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(130, SIZE), HI
      ? new THREE.MeshStandardMaterial({ color: 0x10262a, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9 })
      : new THREE.MeshLambertMaterial({ color: 0x0c1c1e, transparent: true, opacity: 0.88 }));
    water.rotation.x = -Math.PI / 2; water.position.set(255, WATER, CZ); water.userData.noShadow = true; group.add(water);
  }

  // ---------- Vegetación por bloques ----------
  const CH = 100, chunkMap = new Map();
  const chunkOf = (x, z) => {
    const i = Math.floor((x + 400) / CH), j = Math.floor((z + 600) / CH), k = i + '_' + j;
    let c = chunkMap.get(k);
    if (!c) { c = { x: -400 + (i + 0.5) * CH, z: -600 + (j + 0.5) * CH, trunks: [], blobs: [], fronds: [], rocks: [] }; chunkMap.set(k, c); }
    return c;
  };
  const Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), E = new THREE.Euler();
  const inst = (list, x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) => {
    E.set(rx, ry, rz); Q.setFromEuler(E);
    list.push({ m: new THREE.Matrix4().compose(V.set(x, y, z), Q, S.set(sx, sy, sz)), c: color });
  };
  // Tinte por instancia: claro si hay textura (la tiñe), oscuro si el color es plano.
  const tint = (h, s, lHi, lLo) => new THREE.Color().setHSL(h, s, HI ? lHi : lLo);
  const cGuadua = tint(0.22, 0.6, 0.5, 0.2), cGuaduaLeaf = tint(0.2, 0.5, 0.62, 0.2), cPalmTrunk = tint(0.08, 0.15, 0.6, 0.2), cYarumo = tint(0.1, 0.05, 0.9, 0.38);

  const broadleaf = (x, z, y, h, r, cr, k2, k3) => {
    const c = chunkOf(x, z);
    inst(c.trunks, x, y - 0.3, z, r, h + 0.3, r, tint(0.07, 0.25, 0.5 + k3 * 0.25, 0.1 + k3 * 0.05), 0, k2 * 6.28, 0);
    const col1 = tint(0.28 + k2 * 0.07, 0.6, 0.56 + k3 * 0.22, 0.1 + k3 * 0.08);
    inst(c.blobs, x, y + h, z, cr, cr * 0.72, cr, col1, k3, k3 * 6.28, k2);
    inst(c.blobs, x + (k2 - 0.5) * cr, y + h - 1.2 - k3, z + (k3 - 0.5) * cr, cr * 0.7, cr * 0.5, cr * 0.7, col1, k2, k2 * 6.28, k3);
    col.addCircle(x, z, r + 0.2);
  };

  for (let gx = -396; gx < 396; gx += 8) for (let gz = -596; gz < 196; gz += 8) {
    const x = gx + R() * 7, z = gz + R() * 7, t = R(), k = R(), k2 = R(), k3 = R();
    if (!clearOf(x, z) || pathDist(x, z) < 3.4 || Math.abs(x - riverX(z)) < 17) continue;
    if (k > (0.5 + 0.5 * fbm(x * 0.012, z * 0.012, 2, 11)) * quality) continue;
    const y = heightAt(x, z), c = chunkOf(x, z);
    if (t < 0.6) {
      broadleaf(x, z, y, 6 + k2 * 6, 0.22 + k3 * 0.25, 2.4 + k3 * 2.1, k2, k3);
    } else if (t < 0.76) { // guadual
      const n = 5 + Math.floor(k2 * 4);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + k3 * 3, rr = 0.25 + (((i * 37) % 10) / 10) * 0.6, h = 9 + (((i * 53) % 10) / 10) * 6, tilt = 0.06 + (((i * 17) % 10) / 10) * 0.14;
        inst(c.trunks, x + Math.cos(a) * rr, y - 0.2, z + Math.sin(a) * rr, 0.075, h, 0.075, cGuadua, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
        if (i % 2) continue;
        const off = rr + h * tilt * 0.95;
        inst(c.blobs, x + Math.cos(a) * off, y + h * 0.95, z + Math.sin(a) * off, 1.5, 2.1, 1.5, cGuaduaLeaf, 0, a, 0);
      }
      col.addCircle(x, z, 1.0);
    } else if (t < 0.88) { // palma
      const h = 7 + k2 * 4, s = 1.3 + k3 * 0.7;
      inst(c.trunks, x, y - 0.2, z, 0.17, h + 0.2, 0.17, cPalmTrunk, (k2 - 0.5) * 0.12, 0, (k3 - 0.5) * 0.12);
      inst(c.fronds, x, y + h - 0.2, z, s, s, s, tint(0.26, 0.45, 0.6 + k3 * 0.15, 0.17 + k3 * 0.06), 0, k2 * 6.28, 0);
      col.addCircle(x, z, 0.38);
    } else if (t < 0.97) { // yarumo
      const h = 8 + k2 * 4;
      inst(c.trunks, x, y - 0.2, z, 0.14, h + 0.2, 0.14, cYarumo, 0, 0, 0);
      const cy = tint(0.22, 0.12, 0.85, 0.3 + k3 * 0.08);
      for (let i = 0; i < 3; i++) inst(c.blobs, x + Math.cos(i * 2.1 + k2 * 6) * 1.5, y + h - i * 0.7, z + Math.sin(i * 2.1 + k2 * 6) * 1.5, 1.5, 0.55, 1.5, cy, 0, i, 0);
      col.addCircle(x, z, 0.35);
    } else { // árbol viejo
      broadleaf(x, z, y, 14 + k2 * 4, 0.7 + k3 * 0.3, 6 + k3 * 1.5, k2, k3);
    }
  }
  // sotobosque
  for (let i = 0; i < Math.round(3000 * quality); i++) {
    const x = -390 + R() * 780, z = -590 + R() * 780, s = 0.6 + R() * 1.0, k = R();
    if (!clearOf(x, z, -2) || pathDist(x, z) < 1.8 || Math.abs(x - riverX(z)) < 13) continue;
    inst(chunkOf(x, z).blobs, x, heightAt(x, z) + s * 0.35, z, s * 1.2, s * 0.7, s * 1.2, tint(0.26 + k * 0.09, 0.55, 0.42 + k * 0.25, 0.07 + k * 0.06), 0, k * 6.28, 0);
  }
  // piedras
  for (let i = 0; i < 320; i++) {
    const x = -390 + R() * 780, z = -590 + R() * 780, s = 0.35 + R() * 1.3, k = R();
    if (!clearOf(x, z) || pathDist(x, z) < 2.5) continue;
    inst(chunkOf(x, z).rocks, x, heightAt(x, z) + s * 0.25, z, s, s * 0.7, s * 1.15, tint(0.1, 0.04, 0.6 + k * 0.3, 0.16 + k * 0.1), k, k * 6.28, 0);
    if (s > 0.9) col.addCircle(x, z, s * 0.8);
  }
  // piedras y leños de las fogatas
  for (const f of fires) {
    const c = chunkOf(f.x, f.z);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283; inst(c.rocks, f.x + Math.cos(a) * 0.62, f.y + 0.1, f.z + Math.sin(a) * 0.62, 0.2, 0.15, 0.2, tint(0.08, 0.04, 0.75, 0.3), 0, a * 2, 0); }
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; inst(c.trunks, f.x + Math.cos(a) * 0.5, f.y + 0.14, f.z - Math.sin(a) * 0.5, 0.075, 1.0, 0.075, tint(0.07, 0.25, 0.5, 0.1), 0, a, Math.PI / 2); }
  }
  // samán de la plaza y plataneras del pueblo
  broadleaf(-8, -7, heightAt(-8, -7), 7, 0.6, 5.2, 0.4, 0.6);
  for (const [x, z] of [[33, 2], [34, 18], [-33, -3], [-32, 14], [-20, 36], [22, 42], [36, -18], [-34, -22], [100, -66], [104, -52]]) {
    const y = heightAt(x, z), c = chunkOf(x, z);
    inst(c.trunks, x, y, z, 0.13, 1.8, 0.13, tint(0.22, 0.35, 0.7, 0.22), 0, 0, 0);
    inst(c.fronds, x, y + 1.6, z, 1.1, 1.0, 1.1, tint(0.27, 0.5, 0.78, 0.24), 0, x, 0);
    col.addCircle(x, z, 0.3);
  }

  const FROND = frondGeo();
  const trunkMat = pbr('bark', 0xffffff, { rep: [2, 4] }), blobMat = pbr('foliage', 0xffffff, { rep: [3, 2] }),
    frondMat = pbr('foliage', 0xffffff, { rep: [1, 2], side: THREE.DoubleSide }), rockMat = pbr('rock', 0xffffff, { rep: [2, 2] });
  const chunks = [];
  for (const c of chunkMap.values()) {
    const g = new THREE.Group();
    for (const [list, geo, mat] of [[c.trunks, GEO.trunk, trunkMat], [c.blobs, GEO.blob, blobMat], [c.fronds, FROND, frondMat], [c.rocks, GEO.rock, rockMat]]) {
      if (!list.length) continue;
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((it, i) => { m.setMatrixAt(i, it.m); m.setColorAt(i, it.c); });
      m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
      g.add(m);
    }
    group.add(g);
    chunks.push({ x: c.x, z: c.z, group: g });
  }

  // ---------- Pueblo ----------
  const houses = [];
  const H = (x, z, w, d, o) => { const b = makeBuilding(ctx, x, z, w, d, o); houses.push(b); return b; };
  H(-24, 6, 9, 8, { door: 'e', zocalo: 0x2f6b46, lit: true, sign: 'TIENDA LA ESPERANZA', type: 'tienda' });
  H(-24, -12, 8, 7, { door: 'e', zocalo: 0x2d5d8a, lit: true, sign: 'INSPECCIÓN DE POLICÍA', type: 'inspeccion' });
  H(25, 10, 8, 8, { door: 'w', zocalo: 0x8a2f2a, lit: true });
  H(25, -10, 8, 7, { door: 'w', zocalo: 0xb8902a });
  H(-24, 25, 8, 8, { door: 'e', zocalo: 0x8a2f2a });
  H(25, 29, 9, 7, { door: 'w', zocalo: 0x2d5d8a, lit: true });
  H(-13, 39, 7, 6, { door: 'e', zocalo: 0xb8902a });
  H(14, 39, 7, 6, { door: 'w', zocalo: 0x2f6b46, lit: true });
  H(98, -59, 6, 5, { door: 'w', zocalo: 0x6a5238, wall: 0xb8a684, lit: true, h: 2.6, roofH: 1.9, type: 'rancho' });
  {
    const ch = H(0, -30, 9, 13, { h: 5.2, roofH: 2.4, door: 's', zocalo: 0x8a8576, lit: true, type: 'capilla' });
    const tw = new THREE.Group(); tw.position.set(0, ch.y0, -30);   // campanario sobre la fachada
    tw.add(box(mats.wall, 3, 4.2, 3, 0, 7.3, 5.0));
    const tr = new THREE.Mesh(GEO.roof, mats.roof); tr.scale.set(3.9, 2, 3.9); tr.position.set(0, 10.4, 5.0); tw.add(tr);
    const cr = makeCross(1.8, lam(0xcfc8b4)); cr.position.set(0, 11.3, 5.0); tw.add(cr);
    tw.add(box(lam(0x15110e), 1.1, 1.3, 0.1, 0, 7.6, 6.52));
    group.add(tw);
  }
  const lampPost = (x, z) => {
    const y = heightAt(x, z);
    group.add(cylM(mats.iron, 0.06, 4, x, y + 2, z));
    const b = new THREE.Mesh(GEO.sphere, mats.bulb); b.scale.setScalar(0.17); b.position.set(x, y + 4.1, z); group.add(b);
    const s = glowSprite(0xffc27a, 2.4, 0.3); s.position.copy(b.position); group.add(s);
    const L = new THREE.PointLight(0xffc27a, 0, 36, 1.6); L.position.set(x, y + 3.9, z); group.add(L);
    col.addCircle(x, z, 0.15);
    return { L, s };
  };
  const plaza = lampPost(0, 7);
  const tiendaLight = new THREE.PointLight(0xffb060, 0, 22, 1.7);
  tiendaLight.position.set(-18.6, heightAt(-18, 6) + 2.5, 6); group.add(tiendaLight);
  for (const [x, z, r] of [[5, 0, 0], [-5, 3, 0], [0, -9, Math.PI / 2]]) {
    const b = box(mats.wood, 0.5, 0.45, 2.0, x, heightAt(x, z) + 0.23, z); b.rotation.y = r; group.add(b);
    col.addCircle(x, z, 0.7);
  }

  // ---------- Aserrío ----------
  {
    const [ax, az] = PLACES.aserrio, y = heightAt(ax, az);
    const g = new THREE.Group(); g.position.set(ax, y, az);
    for (const [px, pz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) g.add(cylM(mats.wood, 0.12, 3.2, px, 1.6, pz));
    const roof = box(mats.zinc, 9.4, 0.08, 7.4, 0, 3.3, 0); roof.rotation.z = 0.1; g.add(roof);
    g.add(box(mats.wood, 4.2, 0.18, 0.9, 0, 0.9, 0));
    for (const px of [-1.8, 1.8]) g.add(box(mats.wood, 0.14, 0.9, 0.8, px, 0.45, 0));
    const log = cylM(mats.bark, 0.36, 4.6, 0, 1.35, 0); log.rotation.z = Math.PI / 2; g.add(log);
    for (let i = 0; i < 7; i++) {
      const l = cylM(mats.bark, 0.34, 5, -7.6 + (i % 4) * 0.72 + (i > 3 ? 0.36 : 0), 0.34 + (i > 3 ? 0.6 : 0), 6);
      l.rotation.x = Math.PI / 2; g.add(l);
    }
    group.add(g);
    col.addBox(ax - 2.2, az - 0.6, ax + 2.2, az + 0.6);
    col.addBox(ax - 8.2, az + 3.4, ax - 4.6, az + 8.6);
    for (let i = 0; i < 16; i++) {
      const a = R() * 6.283, d = 9 + R() * 12, x = ax + Math.cos(a) * d, z = az + Math.sin(a) * d, r = 0.28 + R() * 0.25;
      group.add(cylM(mats.bark, r, 0.5, x, heightAt(x, z) + 0.2, z));
      col.addCircle(x, z, r);
    }
  }

  // ---------- Campamentos ----------
  const camp = (name, rot) => {
    const [x, z] = PLACES[name];
    const g = new THREE.Group(); g.position.set(x, heightAt(x, z), z); g.rotation.y = rot;
    g.add(cylM(mats.wood, 0.06, 2.0, -1.5, 1.0, 0), cylM(mats.wood, 0.06, 2.0, 1.5, 1.0, 0));
    const tarp = box(mats.tarp, 3.4, 0.05, 2.8, 0, 1.3, -1.1); tarp.rotation.x = -0.55; g.add(tarp);
    g.add(box(mats.cloth, 1.9, 0.12, 0.7, 0, 0.08, -1.2));
    g.add(box(mats.wood, 0.5, 0.4, 0.4, 1.9, 0.2, 0.6));
    group.add(g);
  };
  camp('camp1', 0.6); camp('camp2', -1.1);

  // ---------- Rancho quemado ----------
  {
    const [rx, rz] = PLACES.ruina;
    const g = new THREE.Group(); g.position.set(rx, heightAt(rx, rz), rz);
    g.add(box(mats.char, 7, 2.3, 0.45, 0, 1.15, -3.5), box(mats.char, 0.45, 1.5, 5, -3.5, 0.75, -1),
      box(mats.char, 0.45, 2.7, 2.2, 3.5, 1.35, -2.4), box(mats.char, 2.4, 0.9, 0.45, 2.3, 0.45, 2));
    const b1 = cylM(mats.charWood, 0.11, 4.6, -0.6, 0.95, -1.4); b1.rotation.set(0.3, 0.5, 1.15); g.add(b1);
    const b2 = cylM(mats.charWood, 0.1, 3.4, 1.4, 0.4, -0.2); b2.rotation.set(0, 1.2, 1.45); g.add(b2);
    const cross = makeCross(1.7, mats.wood); cross.position.set(0, 0, 3.2); cross.rotation.z = 0.08; g.add(cross);
    group.add(g);
    col.addBox(rx - 3.5, rz - 3.75, rx + 3.5, rz - 3.25); col.addBox(rx - 3.75, rz - 3.5, rx - 3.25, rz + 1.5);
    col.addBox(rx + 3.25, rz - 3.5, rx + 3.75, rz - 1.3); col.addBox(rx + 1.1, rz + 1.75, rx + 3.5, rz + 2.25);
  }

  // ---------- Cueva junto a la quebrada ----------
  {
    const [cx, cz] = PLACES.cueva, y = heightAt(cx, cz);
    for (const [dx, dz, s, hh] of [[3.9, -3.2, 4.0, 3.6], [-0.6, -6.0, 3.8, 4.2], [-4.8, -3.6, 3.3, 3.2], [6.0, 1.2, 3, 2.8]]) {
      const m = new THREE.Mesh(GEO.rock, mats.caveRock);
      m.scale.set(s, hh, s); m.position.set(cx + dx, y + hh * 0.45, cz + dz); m.rotation.y = dx; group.add(m);
      col.addCircle(cx + dx, cz + dz, s * 0.82);
    }
    const slab = new THREE.Mesh(GEO.rock, mats.caveRock); slab.scale.set(5.4, 0.9, 4.2); slab.position.set(cx + 0.3, y + 3.9, cz - 2.6); slab.rotation.set(0.1, 0.3, -0.06); group.add(slab);
  }

  // ---------- Ceiba grande ----------
  {
    const [x, z] = PLACES.ceiba, y = heightAt(x, z);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.9, 21, 16), pbr('bark', 0xc9c2b4, { rep: [4, 8] })); tr.position.set(x, y + 10.3, z); group.add(tr);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283 + 0.3;
      const b = box(pbr('bark', 0xc9c2b4, { s: 0.5 }), 0.28, 4.2, 3.0, x + Math.sin(a) * 2.1, y + 1.6, z + Math.cos(a) * 2.1);
      b.rotation.set(0.35, a, 0, 'YXZ'); group.add(b);
    }
    const leaf = pbr('foliage', HI ? 0xa6d08a : 0x1f3a1c, { rep: [6, 4] });
    for (const [dx, dy, dz, s] of [[0, 23, 0, 9.5], [6, 21, 3, 7], [-5, 22, -4, 7.5], [2, 20, -7, 6]]) {
      const m = new THREE.Mesh(GEO.blob, leaf); m.scale.set(s, s * 0.55, s); m.position.set(x + dx, y + dy, z + dz); m.rotation.y = dx; group.add(m);
    }
    col.addCircle(x, z, 2.5);
  }

  // ---------- Tres cruces ----------
  for (const n of ['cruz1', 'cruz2', 'cruz3']) {
    const [x, z] = PLACES[n], y = heightAt(x, z);
    const c = makeCross(1.5, mats.wood); c.position.set(x, y, z); c.rotation.set(0, n.charCodeAt(4) * 1.3, 0.1); group.add(c);
    const m = new THREE.Mesh(GEO.rock, mats.earth); m.scale.set(0.9, 0.22, 0.6); m.position.set(x, y + 0.05, z + 1); group.add(m);
  }

  // ---------- Red de caminos (GPS): los lugares son nodos y cada tramo de camino una arista ----------
  const NODES = {}, EDGES = [];
  PATHS.forEach((p) => { p.forEach((n) => (NODES[n] = PLACES[n])); for (let i = 0; i < p.length - 1; i++) EDGES.push([p[i], p[i + 1]]); });
  const warp = (x, z) => [(fbm(x * 0.02, z * 0.02, 2, 21) - 0.5) * 12, (fbm(x * 0.02, z * 0.02, 2, 33) - 0.5) * 12];
  const nearestOnNet = (x, z) => {
    let best = null;
    EDGES.forEach((e, i) => {
      const [ax, az] = NODES[e[0]], [bx, bz] = NODES[e[1]], vx = bx - ax, vz = bz - az;
      const t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1), px = ax + vx * t, pz = az + vz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) best = { d, i, x: px, z: pz };
    });
    return best;
  };
  // Ruta de (ax, az) a (bx, bz) siguiendo los caminos. Devuelve una lista de puntos [x, z].
  const routeTo = (ax, az, bx, bz) => {
    const direct = Math.hypot(bx - ax, bz - az), s = nearestOnNet(ax, az), e = nearestOnNet(bx, bz);
    if (direct < 45 || s.d + e.d > direct * 0.9) return [[ax, az], [bx, bz]];
    const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), pos = { ...NODES, S: [s.x, s.z], E: [e.x, e.z] }, adj = {}, dist = {}, prev = {};
    const link = (a, b) => { const w = len(pos[a], pos[b]); (adj[a] = adj[a] || []).push([b, w]); (adj[b] = adj[b] || []).push([a, w]); };
    EDGES.forEach(([a, b]) => link(a, b));
    link('S', EDGES[s.i][0]); link('S', EDGES[s.i][1]); link('E', EDGES[e.i][0]); link('E', EDGES[e.i][1]);
    if (s.i === e.i) link('S', 'E');
    const todo = new Set(Object.keys(pos));
    for (const k of todo) dist[k] = Infinity;
    dist.S = 0;
    while (todo.size) {
      let u = null;
      for (const k of todo) if (u === null || dist[k] < dist[u]) u = k;
      todo.delete(u);
      if (u === 'E' || dist[u] === Infinity) break;
      for (const [v, w] of adj[u] || []) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
    }
    const chain = [];
    for (let k = 'E'; k; k = prev[k]) chain.unshift(pos[k]);
    if (chain.length < 2) return [[ax, az], [bx, bz]];
    const pts = [[ax, az]];   // se muestrea cada tramo y se deshace la ondulación del camino
    for (let i = 0; i < chain.length - 1; i++) {
      const [x0, z0] = chain[i], [x1, z1] = chain[i + 1], n = Math.max(1, Math.ceil(len(chain[i], chain[i + 1]) / 7));
      for (let k = i ? 1 : 0; k <= n; k++) { const x = x0 + ((x1 - x0) * k) / n, z = z0 + ((z1 - z0) * k) / n, w = warp(x, z); pts.push([x - w[0], z - w[1]]); }
    }
    pts.push([bx, bz]);
    return pts;
  };
  const labels = [['Pueblo', 0, 0], ['Aserrío', ...PLACES.aserrio], ['Ceiba grande', ...PLACES.ceiba], ['Quebrada La Honda', 258, -150], ['Cueva', ...PLACES.cueva],
    ['Rancho quemado', ...PLACES.ruina], ['Corte 1', ...PLACES.camp1], ['Corte 2', ...PLACES.camp2], ['Ña Custodia', ...PLACES.custodia]];

  markShadows(group);

  // ---------- Mapa (para el minimapa) ----------
  const map = (() => {
    const N = 280, K = N / SIZE, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -400 + (i + 0.5) / K, z = -600 + (j + 0.5) / K;
      const h = heightAt(x, z), sh = clamp(1 - (heightAt(x + 4, z + 4) - h) * 0.2, 0.62, 1.35);   // sombreado de relieve
      let r = 44, gg = 64, b = 40;
      if (!clearOf(x, z)) { r = 86; gg = 94; b = 60; }
      if (Math.hypot(x, z) < 62) { r = 122; gg = 106; b = 78; }
      if (pathDist(x, z) < 3.4) { r = 156; gg = 132; b = 92; }
      const rd = Math.abs(x - riverX(z));
      if (rd < 20) { r = 140; gg = 128; b = 96; }
      if (rd < 10) { r = 40; gg = 86; b = 104; }
      const k = (j * N + i) * 4; d[k] = r * sh; d[k + 1] = gg * sh; d[k + 2] = b * sh; d[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    g.fillStyle = '#7a3b26';
    for (const bx of col.boxes) {
      const w = (bx[2] - bx[0]) * K, hh = (bx[3] - bx[1]) * K;
      if (w * hh > 1.2) g.fillRect((bx[0] + 400) * K, (bx[1] + 600) * K, Math.max(1.6, w), Math.max(1.6, hh));
    }
    return { canvas: c, x0: -400, z0: -600, w: SIZE, h: SIZE };
  })();

  const inLight = new THREE.PointLight(0xffd9a8, 0, 18, 1.4); group.add(inLight);   // luz del interior más cercano
  let night = 0;
  return {
    name: 'tolima', group, heightAt, col, ground: 'earth', fires, riverX, map, pathDist, route: routeTo, labels, houses,
    inside: (p) => houses.find((b) => p.x > b.ix0 && p.x < b.ix1 && p.z > b.iz0 && p.z < b.iz1) || null,
    bounds(p) { p.x = clamp(p.x, -388, riverX(p.z) - 11); p.z = clamp(p.z, -588, 62); },
    fire: (id) => fires.find((f) => f.id === id),
    lightFire(id, dur = 50) { const f = typeof id === 'string' ? fires.find((q) => q.id === id) : id; if (f) { f.lit = true; f.t = dur; } return f; },
    resetFires() { for (const f of fires) if (!f.perm) { f.lit = false; f.t = 0; } },
    nearLitFire(p, r) { for (const f of fires) { if (!f.lit) continue; const dx = p.x - f.x, dz = p.z - f.z; if (dx * dx + dz * dz < r * r) return f; } return null; },
    setNight(n) {
      night = n;
      mats.win.emissiveIntensity = lerp(0.2, 1.4, n);
      plaza.L.intensity = 70 * n; plaza.s.material.opacity = 0.12 + 0.45 * n;
      tiendaLight.intensity = 30 * n;
    },
    update(dt, t, pp, viewDist) {
      const vd = (viewDist + 75) ** 2;
      for (const ch of chunks) { const dx = pp.x - ch.x, dz = pp.z - ch.z; ch.group.visible = dx * dx + dz * dz < vd; }
      let near = null, nd = 1e9;   // las puertas se abren al acercarse; la luz se enciende en la casa más cercana
      for (const b of houses) {
        b.door.open += ((Math.hypot(pp.x - b.door.x, pp.z - b.door.z) < 2.6 ? 1 : 0) - b.door.open) * Math.min(1, dt * 5);
        b.door.pivot.rotation.y = b.door.open * 1.7;
        const dc = Math.hypot(pp.x - b.x, pp.z - b.z);
        b.props.visible = dc < Math.max(b.w, b.d) / 2 + 12;   // el interior solo se dibuja de cerca
        b.deco.visible = dc < 70;
        if (dc < nd) { nd = dc; near = b; }
      }
      if (near && nd < 16) { inLight.position.set(near.x, near.y0 + near.h - 0.5, near.z); inLight.intensity = 34 + 22 * night; } else inLight.intensity = 0;
      const lit = [];
      for (const f of fires) {
        if (f.lit && !f.perm) { f.t -= dt; if (f.t <= 0) f.lit = false; }
        f.flame.visible = f.lit; f.glow.visible = f.lit;
        if (!f.lit) continue;
        const dying = !f.perm && f.t < 8;
        const s = 0.85 + Math.sin(t * 13 + f.x) * 0.12 + Math.sin(t * 7.3 + f.z) * 0.1;
        f.flame.scale.set(s, s * (dying ? 0.5 : 1.1), s);
        f.glow.material.opacity = dying ? 0.2 : 0.5;
        const dx = pp.x - f.x, dz = pp.z - f.z; f.d2 = dx * dx + dz * dz;
        lit.push(f);
      }
      lit.sort((a, b) => a.d2 - b.d2);
      fireLights.forEach((L, i) => {
        const f = lit[i];
        if (f && f.d2 < 130 * 130) {
          L.position.set(f.x, f.y + 1.0, f.z);
          L.intensity = (44 + Math.sin(t * 17 + i * 2) * 7 + Math.sin(t * 9.1 + i) * 5) * (!f.perm && f.t < 8 ? 0.4 : 1);
        } else L.intensity = 0;
      });
    },
  };
}

// ====================================================================
//  BOGOTÁ: una calle de La Candelaria, de noche y con aguacero
// ====================================================================
export function buildBogota() {
  const group = new THREE.Group(); group.name = 'bogota';
  const col = new Colliders();
  const R = rng(1948);
  const wallM = pbr('plaster', 0xcfc4ac), wood = pbr('planks', 0x9a8468, { s: 0.7 }), woodDark = pbr('planks', 0x5a4636, { s: 0.9 }), tile = pbr('rooftile', 0xffffff, { s: 0.5 });
  const win = new THREE.MeshLambertMaterial({ color: 0x2a1c0e, emissive: 0xffb858, emissiveIntensity: 1.1 }), winDark = lam(0x0e0f12);

  group.add(box(pbr('cobble', 0x9a9a9a, { s: 0.4 }), 60, 0.2, 180, 0, -0.1, -52));
  for (const s of [-1, 1]) group.add(box(pbr('cobble', 0xc0c0c0, { s: 0.9 }), 1.5, 0.12, 122, s * 5.75, 0.06, -59));

  // Casas coloniales a ambos lados
  const palette = [0xd6ccb4, 0xb8935c, 0x8a9aa8, 0xa86c56, 0xc4b690, 0x98a686, 0xe0d4bc];
  for (const side of [-1, 1]) {
    let z = 2;
    while (z > -119) {
      const len = 8 + R() * 6, h = 6.5 + R() * 3.5, zc = z - len / 2, x = side * 11.5;
      group.add(box(pbr('plaster', palette[Math.floor(R() * palette.length)], { s: 0.4 }), 10, h, len - 0.12, x, h / 2, zc));
      group.add(box(pbr('plaster', 0x4a4540, { s: 0.4 }), 10.06, 1.0, len - 0.08, x, 0.5, zc));
      group.add(box(tile, 11.4, 0.35, len + 0.3, x, h + 0.17, zc));
      group.add(box(woodDark, 0.9, 0.12, len * 0.55, side * 6.05, 3.3, zc));
      group.add(box(woodDark, 0.06, 0.8, len * 0.55, side * 5.62, 3.75, zc));
      const ry = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const door = new THREE.Mesh(GEO.plane, woodDark); door.scale.set(1.3, 2.4, 1);
      door.position.set(side * 6.46, 1.2, zc + (R() - 0.5) * len * 0.4); door.rotation.y = ry; group.add(door);
      for (const o of [-0.25, 0.25]) {
        const wm = new THREE.Mesh(GEO.plane, R() < 0.3 ? win : winDark); wm.scale.set(1.0, 1.5, 1);
        wm.position.set(side * 6.46, 4.7, zc + o * len); wm.rotation.y = ry; group.add(wm);
      }
      z -= len;
    }
  }
  col.addBox(-30, -124, -6.3, 2); col.addBox(6.3, -124, 30, 2);
  group.add(box(pbr('plaster', 0xa86c56, { s: 0.4 }), 14, 9, 6, 0, 4.5, -122)); col.addBox(-7, -126, 7, -118.6);

  // Redacción de El Vespertino (la calle termina en su zaguán)
  const facade = pbr('plaster', 0xa86c56, { s: 0.4 });
  group.add(box(wood, 10, 0.1, 11, 0, 0.05, 7.5));
  group.add(box(wallM, 10.4, 4, 0.3, 0, 2, 13.15));
  for (const s of [-1, 1]) {
    group.add(box(wallM, 0.3, 4, 11, s * 5.15, 2, 7.5));
    group.add(box(wallM, 1.6, 2.8, 0.3, s * 4.4, 1.4, 2.0));
    group.add(box(facade, 12, 8.4, 11.3, s * 11.3, 4.2, 7.5));
  }
  group.add(box(pbr('planks', 0x4a3c30, { s: 0.6 }), 10.4, 0.2, 11.3, 0, 4.1, 7.5));
  group.add(box(wallM, 10.4, 1.3, 0.3, 0, 3.45, 2.0));
  group.add(box(facade, 10.6, 4.2, 11.3, 0, 6.3, 7.5));
  const sign = makeSign('EL VESPERTINO', 5.2, 0.8); sign.position.set(0, 3.5, 1.83); sign.rotation.y = Math.PI; group.add(sign);
  group.add(box(pbr('planks', 0x7a5a40, { s: 1.3 }), 2.8, 0.82, 1.1, 0, 0.41, 9.6));
  group.add(box(woodDark, 3, 2.2, 0.5, -3, 1.1, 12.7), box(lam(0x4c5258), 2.2, 1.4, 0.5, 3.2, 0.7, 12.7));
  group.add(box(lam(0x151515), 0.42, 0.14, 0.36, 1.0, 0.9, 9.85));
  group.add(cylM(lam(0x2a2a2a), 0.03, 0.42, -1.15, 1.03, 9.9));
  const shade = new THREE.Mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); shade.scale.set(0.16, 0.18, 0.16); shade.position.set(-1.15, 1.3, 9.9); group.add(shade);
  const deskLight = new THREE.PointLight(0xffc98a, 30, 18, 1.6); deskLight.position.set(-0.9, 1.7, 9.3); group.add(deskLight);
  col.addBox(-1.4, 9.05, 1.4, 10.15);
  col.addBox(-6.6, 2, -5.0, 13.5); col.addBox(5.0, 2, 6.6, 13.5); col.addBox(-6.6, 12.5, 6.6, 15);
  col.addBox(-5.2, 1.85, -3.6, 2.15); col.addBox(3.6, 1.85, 5.2, 2.15);

  // Faroles
  const bulbM = new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), iron = lam(0x151517);
  const lamps = [];
  [-10, -34, -58, -82, -106].forEach((z, i) => {
    const s = i % 2 ? 1 : -1, x = s * 5.2;
    group.add(cylM(iron, 0.06, 4.2, x, 2.1, z));
    group.add(box(iron, 0.7, 0.06, 0.06, x - s * 0.35, 4.15, z));
    const b = new THREE.Mesh(GEO.sphere, bulbM); b.scale.setScalar(0.16); b.position.set(x - s * 0.7, 4.0, z); group.add(b);
    const gl = glowSprite(0xffc27a, 3.2, 0.5); gl.position.copy(b.position); group.add(gl);
    col.addCircle(x, z, 0.12);
    if (i % 2 === 0) { const L = new THREE.PointLight(0xffc27a, 60, 36, 1.6); L.position.copy(b.position); group.add(L); lamps.push({ L, gl }); }
  });

  // La flota
  {
    const g = new THREE.Group(); g.position.set(2.7, 0, -108);
    g.add(box(lam(0xc9c2a8), 2.5, 1.3, 8, 0, 1.15, 0), box(lam(0x235a3c), 2.52, 0.35, 8.02, 0, 1.2, 0));
    g.add(box(new THREE.MeshLambertMaterial({ color: 0x2a2a20, emissive: 0xffc070, emissiveIntensity: 0.55 }), 2.46, 0.8, 7.6, 0, 2.2, 0));
    g.add(box(lam(0xc9c2a8), 2.5, 0.25, 8, 0, 2.72, 0));
    const tire = lam(0x101010);
    for (const [x, z] of [[-1.2, 2.6], [1.2, 2.6], [-1.2, -2.6], [1.2, -2.6]]) { const w = cylM(tire, 0.5, 0.3, x, 0.5, z); w.rotation.z = Math.PI / 2; g.add(w); }
    for (const x of [-0.8, 0.8]) { const h = glowSprite(0xfff0c0, 1.6, 0.9); h.position.set(x, 0.95, 4.05); g.add(h); }
    const sg = makeSign('FLOTA DEL SUR · ESPINAL · CHAPARRAL · SAN JERÓNIMO', 2.3, 0.3); sg.position.set(0, 2.72, 4.02); g.add(sg);
    group.add(g);
    col.addBox(1.4, -112.1, 4.0, -103.9);
  }

  // Monserrate al fondo
  {
    const m = new THREE.Mesh(new THREE.ConeGeometry(330, 250, 9), new THREE.MeshBasicMaterial({ color: 0x05070b, fog: false }));
    m.position.set(50, 60, -640); group.add(m);
    const ch = box(new THREE.MeshBasicMaterial({ color: 0xcdd3dd, fog: false }), 12, 9, 18, 50, 190, -640); group.add(ch);
  }

  // Lluvia
  const N = 900, rp = new Float32Array(N * 6), drops = [];
  for (let i = 0; i < N; i++) drops.push([R() * 28 - 14, R() * 16, R() * 28 - 14]);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x9aa8bc, transparent: true, opacity: 0.3 }));
  rain.frustumCulled = false; group.add(rain);

  markShadows(group);

  // Mapa de la calle (para el minimapa): 2 px por metro
  const map = (() => {
    const X0 = -32, Z0 = -130, W = 64, Hh = 150, K = 2, c = document.createElement('canvas'); c.width = W * K; c.height = Hh * K;
    const g = c.getContext('2d');
    g.fillStyle = '#23201c'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#5c5d60'; g.fillRect((-6.3 - X0) * K, (-118 - Z0) * K, 12.6 * K, 120 * K);
    g.fillStyle = '#8a7458'; g.fillRect((-5 - X0) * K, (2 - Z0) * K, 10 * K, 11 * K);
    g.fillStyle = '#6a3524';
    for (const bx of col.boxes) g.fillRect((bx[0] - X0) * K, (bx[1] - Z0) * K, Math.max(2, (bx[2] - bx[0]) * K), Math.max(2, (bx[3] - bx[1]) * K));
    g.fillStyle = '#2f7a52'; g.fillRect((1.4 - X0) * K, (-112 - Z0) * K, 2.6 * K, 8 * K);
    return { canvas: c, x0: X0, z0: Z0, w: W, h: Hh };
  })();

  return {
    name: 'bogota', group, col, ground: 'stone', fires: [], map, houses: [], inside: () => null, pathDist: () => 0, route: (ax, az, bx, bz) => [[ax, az], [bx, bz]], labels: [['El Vespertino', 0, 8], ['La flota', 2.7, -108]],
    heightAt: () => 0,
    bounds(p) { p.x = clamp(p.x, -6, 6); p.z = clamp(p.z, -117, 12.4); },
    fire: () => null, lightFire: () => null, resetFires() {}, nearLitFire: () => null, setNight() {},
    update(dt, t, pp) {
      for (let i = 0; i < N; i++) {
        const d = drops[i];
        d[1] -= 17 * dt;
        if (d[1] < 0) { d[1] += 16; d[0] = Math.random() * 28 - 14; d[2] = Math.random() * 28 - 14; }
        const x = pp.x + d[0], z = pp.z + d[2], y = z > 2.1 ? -60 : d[1], k = i * 6;
        rp[k] = x; rp[k + 1] = y; rp[k + 2] = z; rp[k + 3] = x + 0.04; rp[k + 4] = y - 0.55; rp[k + 5] = z;
      }
      rg.attributes.position.needsUpdate = true;
      // un farol que falla
      const fl = Math.sin(t * 23) > 0.2 || Math.sin(t * 3.1) > -0.6 ? 1 : 0.15;
      lamps[1].L.intensity = 60 * fl; lamps[1].gl.material.opacity = 0.5 * fl;
    },
  };
}
