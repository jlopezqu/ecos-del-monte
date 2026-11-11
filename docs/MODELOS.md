# Modelos 3D animados (personas y animales)

> Actualizado el **11-11-2026**. Módulo: `src/models.js`. Archivos: `public/models/`. Créditos: `public/models/creditos.json`. Página de prueba: `modelos.html`. Scripts: `tools/blender/`.

## Qué hay y de dónde sale

| Archivo | Qué es | Licencia (leída en la fuente) | Peso |
|---|---|---|---|
| `personas/campesino.glb` | Hombre adulto, camisa y pantalón (male_casualsuit01), zapatos de cuero | CC0 (MakeHuman system assets) | ~270 KB |
| `personas/campesino-viejo.glb` | Hombre mayor, camisa de rayas y pantalón (male_casualsuit03) | CC0 | ~390 KB |
| `personas/campesina.glb` | Mujer adulta, blusa y falda (female_elegantsuit01), trenza | CC0 | ~270 KB |
| `personas/campesina-vieja.glb` | Mujer mayor, blusa y falda, pelo corto | CC0 | ~300 KB |
| `maniqui.glb` | Maniquí femenino de Mesh2Motion | CC0 | 1,3 MB |
| `anim/*.glb` | 9 animaciones humanas de Mesh2Motion | CC0 | 60–72 KB cada una |
| `perro.glb` + `anim-perro/`, `mula.glb` + `anim-mula/` | Animales de Mesh2Motion | CC0 | — |

Cada persona tiene ~11 500 triángulos, 6 materiales (`skin`, `cloth`, `shoes`, `hair`, `eyebrows`, `eyes`) con texturas WebP de 512 px y geometría Meshopt.

- **Personas**: cuerpo, piel, ropa, pelo, cejas y ojos salen del paquete **`makehuman_system_assets_cc0.zip`** (CC0, https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html). Se generan con **MPFB 2.0.18** (extensión de Blender, código GPL-3.0; se usa como herramienta, no se redistribuye).
- **Esqueleto y animaciones**: Mesh2Motion (https://github.com/Mesh2Motion/mesh2motion-app), CC0.
- **Retirados** (movidos a `assets-src/modelos-descartados/`, que no se publica): `hombre-jay.glb` (Jay, CC-BY 4.0) y `mujer-sintel.glb` (Sintel, CC-BY 3.0). Ya no hace falta su atribución en `CREDITOS.md` si no se usan en otro sitio.

### Lo que se descartó y por qué
- Variantes `psx-*` de Mesh2Motion: su autor prohíbe redistribuirlas. `human/model.glb` y `base` (Quaternius): licencia que prohíbe redistribuir. `sophia.glb`: CC-BY-SA. Mixamo: no.
- Paquetes de MakeHuman marcados **CC-BY** (`shirts02/03`, `pants02/03`, `dress02/03`, `skirts02`…): no se usaron, para no añadir atribuciones. Los CC0 (`shirts01`, `pants01`, `skirts01`, `dress01`, `hair01`, `skins01/02`, `shoes01`) existen pero no se bajaron (ver «Pendiente»).

## En el juego: `src/people.js`

Desde el 11-11-2026 el juego usa estas personas en calidad alta: personajes de la historia, vecinos, el periodista en tercera persona y el conductor de los vehículos. `makePerson()` de `src/entities.js` llama a `realPerson(o)` de `src/people.js` y, si no hay modelos (calidad baja o fallo de carga), arma la figura por código como antes. `main.js` carga solo las cuatro personas (`loadModels({ people: [...], animals: false })`).

Qué hace `people.js` con cada persona:

- **Ropa de dos tonos.** Marca cada isla de la malla de ropa como prenda de arriba o de abajo según los huesos que la mueven (atributo `aPart`) y cambia en el sombreador el color de la textura por `cloth` (arriba) y `pants` o `skirt` (abajo), conservando los pliegues. No hizo falta partir la malla en Blender.
- **Piel.** Multiplica la textura para que su color medio sea el `skin` del personaje.
- **Sombrero** (`hat`; con `city: true`, de fieltro) y **pañoleta** (`scarf`): se modelan a la medida de la cabeza, que se mide en la pose de reposo, y se pegan al hueso `head`. Ocultan el pelo del modelo; bajo el sombrero asoma un casquete de pelo.
- **Ruana** (`ruana`) y **sotana** (cuando `skirt` y `cloth` son el mismo color): superficies que envuelven la silueta medida franja a franja en la pose de pie, pegadas a `spine_03` y `pelvis`.
- **Animación.** `userData.actor = { play, update, base, noTalk }`. Los personajes gesticulan (`talk`) mientras se habla con ellos, salvo los sentados y los de ruana; los vecinos caminan con `walk`; el periodista usa `lantern` cuando lleva la linterna encendida.
- **Rendimiento.** Cada persona son 6 llamadas de dibujo y unos 11 500 triángulos. Se le pone una esfera envolvente fija para que el descarte por cámara funcione con la animación.

Página de revisión: `gente.html` (`?fila=0` historia, `?fila=1` vecinos, `?zoom=1`, `?ry=150`, `?a=walk|talk|sit`). `cabezas.html` muestra los cuerpos sin vestir y mide huesos y cabeza (`?medir=1`, `?huesos=1`).

## API (`src/models.js`)

```js
import { loadModels, hasModels, makeModelPerson, makeModelAnimal, PERSON_ANIMS } from './models.js';
const ok = await loadModels();                    // true si hay persona + idle + walk; nunca lanza. loadModels({ people: ['campesino'], animals: false }) carga solo lo pedido
const p = makeModelPerson({ female: true, old: true, cloth: 0xd8c8b0 }); // null si !hasModels()
scene.add(p.root);                                // pies en y=0, mira a +z
p.play('walk');                                   // 'idle'|'idle2'|'walk'|'talk'|'pray'|'sit'|'cautious'|'lantern'
p.update(dt);
p.bones.head / p.bones.hand_r / ...               // para sombrero, ruana, linterna
// también: p.kind (nombre de la plantilla), p.actions, p.mixer
```

- **Elección**: `look.model` fuerza la plantilla (`'campesino'|'campesino-viejo'|'campesina'|'campesina-vieja'|'maniqui'`; se aceptan los alias antiguos `'hombre'`, `'mujer'`, `'viejo'`, `'vieja'`). Si no, mujer si trae `skirt`, `longHair`, `female` o `sex:'f'`; mayor si trae `old:true`, `age:'old'` o `age>=55`.
- **Teñido** (el color multiplica la textura; un `THREE.Color` con valores >1 aclara):
  - `skin` → piel (por defecto un tono mestizo por plantilla, porque las texturas de MakeHuman son claras).
  - `cloth` (o `shirt`, `skirt`, `pants`) → toda la ropa: **camisa y pantalón (o blusa y falda) comparten una sola textura**, así que no se tiñen por separado.
  - `shoes`, `hair` (también tiñe cejas). Las plantillas mayores aclaran el pelo por defecto (canas).
- `sit:true` arranca sentado. Sombrero y ruana no van en el modelo: se pegan por código a los huesos.
- **Animaciones**: al cargar, `adaptClips()` quita de las animaciones de Mesh2Motion las pistas de traslación y escala de todos los huesos (traen las medidas del maniquí) y deja solo las rotaciones y `pelvis.position`, escalada a la altura de cadera de cada modelo. Por eso las mismas 9 animaciones sirven para cualquier proporción.
- **Huesos** (iguales en todas las personas): `root`, `pelvis`, `spine_01..03`, `neck_01`, `head`, `head_leaf`, `clavicle_l/r`, `upperarm_l/r`, `lowerarm_l/r`, `hand_l/r` (y dedos), `thigh_l/r`, `calf_l/r`, `foot_l/r`, `ball_l/r`. La geometría pegada a un hueso hereda `model.scale`; usa `bone.attach(obj)` tras colocarlo en el mundo.
- Materiales: `hair` y `eyebrows` usan recorte alfa (`alphaTest`) y **escriben profundidad** (`depthWrite = true`); el resto es opaco. El cargador de glTF apaga `depthWrite` en los materiales con mezcla alfa: sin volver a encenderlo, la piel se pintaba encima del pelo y la cabeza se veía calva.

## Herramientas instaladas (fuera del proyecto)

| Qué | Dónde | Notas |
|---|---|---|
| Blender **5.3.0** portátil (zip oficial, SHA-256 verificado) | `%LOCALAPPDATA%\Programs\Blender\blender-5.3.0-windows-x64\blender.exe` | `winget` no tiene instalador por usuario (pide admin), por eso el zip. |
| MPFB **2.0.18** | `%APPDATA%\Blender Foundation\Blender\5.3\extensions\user_default\mpfb` | Compatibilidad oficial: «Blender 4.2 LTS and newer» (extensions.blender.org). |
| Assets de MakeHuman (parte del paquete system assets, CC0) | `%APPDATA%\Blender Foundation\Blender\5.3\extensions\.user\user_default\mpfb\data` | Solo lo necesario (ropa, pelo, cejas, ojos, proxies, pieles middleage/old). |

## Flujo para generar una persona nueva, paso a paso

1. **Instalar Blender** (una vez): baja `blender-<ver>-windows-x64.zip` de https://download.blender.org/release/ y descomprímelo en `%LOCALAPPDATA%\Programs\Blender`.
2. **Instalar MPFB** (una vez): baja el zip de https://extensions.blender.org/add-ons/mpfb/ y
   `blender --command extension install-file -r user_default -e add-on-mpfb-v2.0.18.zip`.
3. **Assets CC0** (una vez): el espejo `files2.makehumancommunity.org` va a ~65 KB/s por conexión y el zip pesa 280 MB, así que se extraen solo los archivos necesarios con peticiones Range:
   ```sh
   D="$APPDATA/Blender Foundation/Blender/5.3/extensions/.user/user_default/mpfb/data"
   URL=https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
   python -I tools/blender/zip_remoto.py list "$URL" 'clothes/'          # ver qué hay
   python -I tools/blender/zip_remoto.py get "$URL" "$D" '^packs/' '^clothes/.*\.(mhclo|obj|mhmat|thumb)$' \
     '^clothes/(male_casualsuit0[1-6]|female_elegantsuit01|shoes0[1-6])/.*diffuse' '^(eyebrows|eyelashes/eyelashes01|eyes/low-poly|eyes/materials)/' \
     '^hair/(short0[1-4]|bob0[12]|braid01|ponytail01|long01)/' '^proxymeshes/(male_generic|female_generic)/' '^skins/(middleage|old)_(african|caucasian)_(male|female)/'
   ```
   Otros paquetes (comprueba que el nombre del zip acabe en `_cc0` y la página diga CC0): https://static.makehumancommunity.org/assets/assetpacks/index.html. El primer servidor (`files.`) devuelve 403 a clientes sin navegador; usa `files2.`.
4. **Definir la persona**: añade una entrada a `PERSONAS` en `tools/blender/generar_persona.py` con `macros` (gender 0=mujer 1=hombre, age 0.5≈25 años, 1≈90; muscle, weight, height, race), `skin`, `proxy`, `clothes` (lista de `(ruta .mhclo, material)`), `hair`, `eyebrows`, `sex`, `height` y `skirt=True` si lleva falda.
5. **Generar** (sin interfaz, ~40 s por persona):
   ```sh
   "$LOCALAPPDATA/Programs/Blender/blender-5.3.0-windows-x64/blender.exe" --background \
     --python tools/blender/generar_persona.py -- .test/modelos/out <nombre> [<nombre>...]
   ```
   Qué hace: importa la armadura de `public/models/maniqui.glb` (con `bone_heuristic='BLENDER'`, que conserva los ejes de los nodos), crea el humano con MPFB y su rig `game_engine` (mismos nombres de hueso que Mesh2Motion, con los pesos de MakeHuman), le pone proxy, piel, ojos, cejas, pelo y ropa; gira cada hueso del rig de MPFB para que apunte como en el reposo en T de Mesh2Motion y hornea las mallas en esa pose; mueve las articulaciones de la armadura de Mesh2Motion a las del humano **sin girar ningún hueso** (las rotaciones de reposo quedan idénticas, se comprobó: diferencia máxima 7·10⁻⁸); ata las mallas con los pesos de MPFB; si lleva falda, borra la piel de los muslos tapada por la falda (si no, la atraviesa al caminar); reduce a ~11 500 triángulos con Decimate (sin tocar ojos, cejas ni pelo) y exporta GLB (+ `.blend` para revisar).
6. **Optimizar y publicar**: `bash tools/blender/optimizar.sh .test/modelos/out 512` → `public/models/personas/<nombre>.glb` (WebP ≤512 px, Meshopt).
7. **Registrar**: añade `{ file: 'personas/<nombre>.glb', sex, old, height, skin }` a `PERSON_DEFS` en `src/models.js` y anota los assets en `creditos.json`.
8. **Comprobar**: `node .test/run.mjs "http://127.0.0.1:5173/modelos.html?only=<nombre>&a=walk&side=1" 12000 shot.png` (también `?a=sit`, `?a=talk`, sin `only` para ver todas).

## Pendiente / limitaciones conocidas

- **Ropa de época**: el paquete del sistema solo trae ropa moderna. Se eligió lo más sobrio (camisa de manga larga y vaquero, blusa de rayas y falda). No hay alpargatas: llevan zapatos de cuero o planos. Los paquetes CC0 `shirts01`, `pants01`, `skirts01`, `dress01` y `shoes01` podrían tener piezas mejores; no se bajaron por tiempo.
- **Camisa y pantalón comparten textura**: `makeModelPerson({ cloth })` tiñe todo el conjunto. En el juego, `src/people.js` sí los tiñe por separado (ver arriba).
- **Pelo**: corregido el 11-11-2026 (faltaba escribir profundidad). Son tarjetas con recorte alfa: de muy cerca se nota el borde dentado.
- **Ruana y sotana no tienen simulación de tela**: son rígidas y van pegadas a un hueso. Por eso quien lleva ruana no gesticula al hablar, y al caminar los antebrazos pueden asomar por el ruedo.
- **No hay animación de correr**: al correr se acelera la de caminar.
- **Falda al sentarse**: con `sit` la falda cae entre las piernas (no hay simulación de tela).
- **Dedos**: el reposo de MPFB y el de Mesh2Motion difieren en la mano; en primer plano las manos pueden verse algo cerradas.
- **Vehículos**, gallina y vaca: siguen sin modelo.
