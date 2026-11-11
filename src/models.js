// Modelos 3D animados (personas y animales) cargados desde public/models/.
// Ver docs/MODELOS.md (origen, licencias y cómo añadir más).
//
// API:
//   await loadModels()          -> true si hay al menos un modelo de persona; nunca lanza.
//   hasModels()                 -> boolean
//   makeModelPerson(look)       -> { root, update(dt), play(nombre, fade), bones, kind, actions } | null
//   makeModelAnimal(tipo)       -> igual, tipo 'perro' | 'mula'                                 | null
//   makeModelVehicle(tipo)      -> null (no hay vehículos con licencia verificada)
//   PERSON_ANIMS / ANIMAL_ANIMS -> nombres aceptados por play()
//
// Personas: campesino, campesino-viejo, campesina, campesina-vieja (MPFB/MakeHuman, CC0) y maniqui.
// look: { model?, female|skirt|longHair|sex:'f', old|age, skin, cloth|shirt|skirt|pants, shoes, hair, sit }
// Todas las personas comparten el esqueleto de Mesh2Motion (66 huesos). Huesos útiles para
// pegar ropa por código: 'head', 'neck_01', 'spine_01'..'spine_03', 'pelvis', 'hand_l', 'hand_r'.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const BASE = (import.meta.env?.BASE_URL ?? '/') + 'models/';

// Plantillas de persona. Las de `personas/` salen de MPFB/MakeHuman (CC0) con tools/blender/.
// `skin`: tono por defecto que multiplica la textura de piel (las de MakeHuman son claras).
// `gray`: factores que multiplican la textura del pelo para encanecerlo (pueden pasar de 1: el pelo del viejo es casi negro).
const PERSON_DEFS = {
  campesino: { file: 'personas/campesino.glb', sex: 'm', old: false, height: 1.68, skin: 0xe6bfa0 },
  'campesino-viejo': { file: 'personas/campesino-viejo.glb', sex: 'm', old: true, height: 1.64, skin: 0xe2ba9c, gray: [14, 14, 13.5] },
  campesina: { file: 'personas/campesina.glb', sex: 'f', old: false, height: 1.58, skin: 0xe8c2a4 },
  'campesina-vieja': { file: 'personas/campesina-vieja.glb', sex: 'f', old: true, height: 1.54, skin: 0xe4bc9e, gray: [1.15, 1.2, 1.4] },
  maniqui: { file: 'maniqui.glb', sex: 'f', old: false, height: 1.66, skin: null },
};
// nombres antiguos -> nuevos (Jay y Sintel se retiraron)
const PERSON_ALIASES = { hombre: 'campesino', mujer: 'campesina', viejo: 'campesino-viejo', vieja: 'campesina-vieja' };

// nombre lógico -> archivo de animación (esqueleto humano Mesh2Motion)
const PERSON_ANIM_FILES = {
  idle: 'idle-a',
  idle2: 'idle-subtle',
  walk: 'walk',
  walkFemale: 'walk-female',
  talk: 'idle-talking',
  pray: 'pray',
  sit: 'sitting-idle',
  cautious: 'walk-cautious',
  lantern: 'idle-lantern',
};
export const PERSON_ANIMS = ['idle', 'idle2', 'walk', 'talk', 'pray', 'sit', 'cautious', 'lantern'];

const ANIMAL_DEFS = {
  perro: { file: 'perro.glb', anims: 'anim-perro', length: 0.9, measure: 'z' },
  mula: { file: 'mula.glb', anims: 'anim-mula', length: 2.1, measure: 'z' },
};
export const ANIMAL_ANIMS = ['idle', 'walk'];

const templates = {}; // nombre -> { scene, scale, yOffset, clips }
const animalTemplates = {};
let personClips = null; // nombre lógico -> AnimationClip
let ok = false;

function makeLoader() {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

async function loadClips(loader, dir, map) {
  const out = {};
  await Promise.all(Object.entries(map).map(async ([name, file]) => {
    try {
      const g = await loader.loadAsync(BASE + dir + '/' + file + '.glb');
      if (g.animations[0]) {
        const clip = g.animations[0];
        clip.name = name;
        out[name] = clip;
      }
    } catch (e) {
      console.warn('[models] animación no cargada', dir, file, e?.message || e);
    }
  }));
  return out;
}

// Mide la figura en la pose del primer fotograma de `clip` y devuelve escala y desplazamiento.
function measure(scene, clip, target, axis) {
  const probe = SkeletonUtils.clone(scene);
  if (clip) {
    const m = new THREE.AnimationMixer(probe);
    m.clipAction(clip).play();
    m.update(0);
  }
  probe.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(probe, true);
  const size = box.getSize(new THREE.Vector3());
  const ref = axis === 'z' ? Math.max(size.x, size.z) : size.y;
  const scale = ref > 0 ? target / ref : 1;
  return { scale, yOffset: -box.min.y * scale };
}

function prepScene(scene) {
  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // las cajas de las mallas con esqueleto no siguen la animación
      // pelo y cejas de MakeHuman: recorte alfa en vez de mezcla (sin problemas de orden)
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (/^(hair|eyebrows)/.test(m.name)) {
          m.transparent = false;
          m.depthWrite = true;   // el cargador lo apaga en materiales con mezcla alfa; sin esto la piel tapa el pelo
          m.alphaTest = 0.45;
          m.side = THREE.DoubleSide;
        } else if (m.transparent && /^(skin|cloth|shoes|eyes)/.test(m.name)) {
          m.transparent = false;
        }
      }
    }
  });
}

// Las animaciones de Mesh2Motion traen traslación y escala en TODOS los huesos con las medidas del
// maniquí. Para que valgan con otras proporciones se dejan solo las rotaciones y la traslación de
// `pelvis`, escalada a la altura de cadera de cada modelo.
function adaptClips(clips, scene) {
  const pelvis = scene.getObjectByName('pelvis');
  const ref = clips.idle?.tracks.find((t) => t.name === 'pelvis.position');
  const refLen = ref ? Math.hypot(ref.values[0], ref.values[1], ref.values[2]) : 0;
  const k = pelvis && refLen > 0 ? pelvis.position.length() / refLen : 1;
  const out = {};
  for (const [name, clip] of Object.entries(clips)) {
    const tracks = [];
    for (const t of clip.tracks) {
      if (t.name.endsWith('.quaternion')) tracks.push(t);
      else if (t.name === 'pelvis.position') {
        const c = t.clone();
        for (let i = 0; i < c.values.length; i++) c.values[i] *= k;
        tracks.push(c);
      }
    }
    out[name] = new THREE.AnimationClip(name, clip.duration, tracks);
  }
  return out;
}

// opts.people: lista de personas a cargar (por defecto todas); opts.animals === false no carga animales.
export async function loadModels(opts = {}) {
  try {
    const loader = makeLoader();
    personClips = await loadClips(loader, 'anim', PERSON_ANIM_FILES);
    await Promise.all(Object.entries(PERSON_DEFS).filter(([name]) => !opts.people || opts.people.includes(name)).map(async ([name, def]) => {
      try {
        const g = await loader.loadAsync(BASE + def.file);
        prepScene(g.scene);
        const clips = adaptClips(personClips, g.scene);
        const { scale, yOffset } = measure(g.scene, clips.idle, def.height, 'y');
        templates[name] = { scene: g.scene, scale, yOffset, def, clips };
      } catch (e) {
        console.warn('[models] persona no cargada', def.file, e?.message || e);
      }
    }));
    await Promise.all((opts.animals === false ? [] : Object.entries(ANIMAL_DEFS)).map(async ([name, def]) => {
      try {
        const g = await loader.loadAsync(BASE + def.file);
        prepScene(g.scene);
        const clips = await loadClips(loader, def.anims, { idle: 'idle', walk: 'walk' });
        const { scale, yOffset } = measure(g.scene, clips.idle, def.length, def.measure);
        animalTemplates[name] = { scene: g.scene, scale, yOffset, clips, def };
      } catch (e) {
        console.warn('[models] animal no cargado', def.file, e?.message || e);
      }
    }));
    ok = Object.keys(templates).length > 0 && !!personClips.idle && !!personClips.walk;
    return ok;
  } catch (e) {
    console.warn('[models] loadModels falló', e);
    ok = false;
    return false;
  }
}

export function hasModels() {
  return ok;
}

// --- utilidades de instancia ---------------------------------------------------------

function buildInstance(tpl, clips, walkClipName) {
  const model = SkeletonUtils.clone(tpl.scene);
  model.scale.setScalar(tpl.scale);
  model.position.y = tpl.yOffset;
  const root = new THREE.Group();
  root.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const [name, clip] of Object.entries(clips)) actions[name] = mixer.clipAction(clip);
  if (walkClipName && clips[walkClipName]) actions.walk = mixer.clipAction(clips[walkClipName]);

  let current = null;
  function play(name, fade = 0.3) {
    const next = actions[name] || actions.idle;
    if (!next || next === current) return;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    if (current) {
      next.crossFadeFrom(current, fade, false);
    }
    next.play();
    current = next;
  }
  function update(dt) {
    mixer.update(dt);
  }
  const bones = {};
  for (const n of ['head', 'neck_01', 'spine_01', 'spine_02', 'spine_03', 'pelvis', 'hand_l', 'hand_r', 'root', 'hips']) {
    const b = model.getObjectByName(n);
    if (b) bones[n] = b;
  }
  return { root, model, mixer, actions, play, update, bones };
}

function tintMaterials(model, rules) {
  // rules: [[regex sobre nombre de material, color|null, visible]]
  model.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      for (const [re, color, visible] of rules) {
        if (re.test(m.name || '')) {
          if (visible === false) { o.visible = false; return m; }
          if (color == null) return m;
          const c = m.clone();
          c.color = color instanceof THREE.Color ? color.clone() : new THREE.Color(color);
          return c;
        }
      }
      return m;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}

function pickPersonTemplate(look) {
  const forced = PERSON_ALIASES[look.model] || look.model;
  if (forced && templates[forced]) return forced;
  const female = !!(look.skirt || look.longHair || look.female || look.sex === 'f');
  const old = !!(look.old || look.age === 'old' || (typeof look.age === 'number' && look.age >= 55));
  const score = (n) => (PERSON_DEFS[n].sex === (female ? 'f' : 'm') ? 2 : 0) + (PERSON_DEFS[n].old === old ? 1 : 0);
  const best = Object.keys(templates).filter((n) => n !== 'maniqui').sort((a, b) => score(b) - score(a))[0];
  return best || (templates.maniqui ? 'maniqui' : Object.keys(templates)[0]);
}

export function makeModelPerson(look = {}) {
  if (!ok) return null;
  const name = pickPersonTemplate(look);
  const tpl = templates[name];
  const inst = buildInstance(tpl, tpl.clips, tpl.def.sex === 'f' && tpl.clips.walkFemale ? 'walkFemale' : 'walk');

  // Teñido: el color del material multiplica a su textura, así que se notan más los tonos claros.
  if (name === 'maniqui') {
    tintMaterials(inst.model, [[/M_Main/i, look.skirt ?? look.cloth ?? look.skin ?? null]]);
  } else {
    // Ropa de MakeHuman: camisa y pantalón (o blusa y falda) comparten una textura ('cloth').
    const hair = look.hair ?? (tpl.def.gray ? new THREE.Color(...tpl.def.gray) : null);
    tintMaterials(inst.model, [
      [/^skin/, look.skin ?? tpl.def.skin],
      [/^cloth/, look.cloth ?? look.shirt ?? look.skirt ?? look.pants ?? null],
      [/^shoes/, look.shoes ?? null],
      [/^(hair|eyebrows)/, hair],
    ]);
  }

  inst.play(look.sit ? 'sit' : 'idle', 0);
  inst.model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: inst.root, update: inst.update, play: inst.play, bones: inst.bones, kind: name, actions: inst.actions, mixer: inst.mixer };
}

export function makeModelAnimal(tipo) {
  const tpl = animalTemplates[tipo];
  if (!tpl) return null;
  const inst = buildInstance(tpl, tpl.clips);
  inst.play('idle', 0);
  return { root: inst.root, update: inst.update, play: inst.play, bones: inst.bones, kind: tipo, actions: inst.actions, mixer: inst.mixer };
}

export function makeModelVehicle(_tipo) {
  return null; // sin vehículos con licencia verificada (ver docs/MODELOS.md)
}
