// Muebles y objetos 3D estáticos (CC0, Poly Haven) cargados desde public/props/.
// Ver docs/PROPS.md. Uso:
//   await loadProps(['mesa', 'silla']);      // o loadProps() para todos los de index.json
//   const m = makeProp('mesa');               // THREE.Object3D o null
//   m.position.set(x, 0, z); scene.add(m);
// Cada objeto queda normalizado: origen en el centro de la base (apoya en y = 0), metros reales,
// frente hacia +z, mallas con castShadow/receiveShadow. Los clones comparten geometría y materiales.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const BASE = (import.meta.env?.BASE_URL ?? '/') + 'props/';

// Correcciones por objeto (radianes): frente hacia +z y postura de reposo.
const FIX = {
  machete: { rotZ: Math.PI / 2 }, // acostado (hoja a lo largo de x), listo para poner sobre una mesa
};

const templates = new Map(); // nombre -> Object3D normalizado
const sizes = new Map(); // nombre -> [ancho, alto, fondo]
let indexCache = null;
let loader = null;

function getLoader() {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

async function getIndex() {
  if (indexCache) return indexCache;
  try {
    const r = await fetch(BASE + 'index.json');
    indexCache = r.ok ? await r.json() : [];
  } catch {
    indexCache = [];
  }
  for (const e of indexCache) if (!sizes.has(e.name)) sizes.set(e.name, e.size);
  return indexCache;
}

function normalize(name, scene) {
  const fix = FIX[name] || {};
  const inner = new THREE.Group();
  inner.add(scene);
  inner.rotation.set(fix.rotX || 0, fix.rotY || 0, fix.rotZ || 0, 'YXZ');
  if (fix.scale) inner.scale.setScalar(fix.scale);
  const root = new THREE.Group();
  root.name = 'prop:' + name;
  root.add(inner);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -box.min.y, -c.z);
  const s = box.getSize(new THREE.Vector3());
  sizes.set(name, [+s.x.toFixed(3), +s.y.toFixed(3), +s.z.toFixed(3)]);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  root.userData.prop = name;
  return root;
}

/** Carga los GLB indicados (o todos los de index.json). Nunca lanza; devuelve cuántos quedaron cargados. */
export async function loadProps(names) {
  let ok = 0;
  try {
    const index = await getIndex();
    const list = Array.isArray(names) && names.length ? names : index.map((e) => e.name);
    const byName = new Map(index.map((e) => [e.name, e]));
    await Promise.all(
      list.map(async (name) => {
        if (templates.has(name)) { ok++; return; }
        const file = byName.get(name)?.file ?? name + '.glb';
        try {
          const gltf = await getLoader().loadAsync(BASE + file);
          templates.set(name, normalize(name, gltf.scene));
          ok++;
        } catch (e) {
          console.warn('[props] no se pudo cargar', name, e?.message ?? e);
        }
      }),
    );
  } catch (e) {
    console.warn('[props] error', e?.message ?? e);
  }
  return ok;
}

/** ¿Está cargado el objeto? */
export function hasProp(name) {
  return templates.has(name);
}

/** Clon del objeto (comparte geometría y materiales) o null si no está cargado. */
export function makeProp(name) {
  const t = templates.get(name);
  return t ? t.clone(true) : null;
}

/** [ancho, alto, fondo] en metros (medido al cargar; antes, el de index.json si ya se leyó). */
export function propSize(name) {
  return sizes.get(name)?.slice() ?? null;
}
