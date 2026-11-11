# Texturas, luz y personajes: guía para que el juego se vea más real

> Investigación hecha el **10-11-2026** para three **0.187.0** con `WebGLRenderer`. Las versiones de npm salen de `registry.npmjs.org` (`dist-tags.latest`, `time`, `peerDependencies`). Los datos de GitHub salen de la API pública (`pushed_at`, estrellas, licencia). Todo se consultó ese mismo día. Lo que dice «en three r187» se comprobó leyendo el código fuente de la etiqueta `r187` en `raw.githubusercontent.com/mrdoob/three.js/r187/...`.
>
> **Costes de GPU:** son **estimaciones** (no se midieron en este equipo). Hay que confirmarlos con `stats-gl` y Spector.js (ver `docs/RECURSOS.md` §2) en el portátil de referencia. Las escalas son: **bajo** (< 0,5 ms por fotograma en gráfica integrada), **medio** (0,5–2 ms) y **alto** (> 2 ms o escala mal con la resolución).
>
> Este documento **complementa** `docs/RECURSOS.md` §5 (fuentes de assets, glTF-Transform, KTX-Software, Blender) y no repite lo que ya está ahí.

---

## 0. Revisión de lo que ya se está integrando

Se revisó `public/tex/`: 11 materiales × 3 mapas (color, normal y rugosidad), en JPG. `ground` y `leaves` son de 1024 px y el resto de 512 px. Ocupan **3,6 MB de descarga** y unos **68 MiB de VRAM** (RGBA8 con mipmaps). Son números razonables. El enfoque es correcto y estos son los ajustes que propongo:

| # | Punto | Por qué | Verificado |
|---|---|---|---|
| 1 | **Confirmar que los normales son `NormalGL`, no `NormalDX`.** | Los zips de ambientCG traen los dos archivos (`*_NormalGL.jpg` y `*_NormalDX.jpg`; se comprobó en `LeafSet030` y `Bamboo001A`). three usa la convención OpenGL (Y+). Si se copió el DX, el relieve se ilumina al revés en el eje vertical. Al renombrarlos a `*_normal.jpg` ya no se puede saber cuál es. | Nombres de archivo: sí. Cuál se copió aquí: **no** |
| 2 | **`colorSpace`**: solo el mapa de color va en `SRGBColorSpace`. Normal, rugosidad y AO se dejan en `NoColorSpace` (es el valor por defecto). | Si un mapa de datos se marca como sRGB, la rugosidad y el relieve quedan mal. | Convención de three |
| 3 | **UV de mundo con `onBeforeCompile`**: hay que sobrescribir **todas** las *varyings* (`vMapUv`, `vNormalMapUv`, `vRoughnessMapUv` y `vAoMapUv` si se usa), **no** llamar a `geometry.computeTangents()` y definir `customProgramCacheKey`. | En r187 el TBN del mapa normal se calcula con derivadas de `vNormalMapUv` (`getTangentFrame` en `normal_fragment_begin`). Si se cambia la UV del normal, el TBN la sigue sola. Si existe el atributo `tangent`, three usa ese y no coincide con las UV nuevas. | Sí (código r187) |
| 4 | En cajas: proyectar según el **eje dominante de la normal** (*box mapping*). En objetos que se mueven (puertas, el perro), usar coordenadas **de objeto × escala** y no de mundo. | Con coordenadas de mundo, la textura «nada» sobre un objeto que se desplaza. | Criterio técnico |
| 5 | **El `aoMap` casi no se verá de noche.** | En r187 el AO solo multiplica la luz **indirecta** (`aomap_fragment`: `indirectDiffuse`, `indirectSpecular`). Con linterna y fogata casi toda la luz es directa. Hay dos salidas: hornear un AO suave en el color (multiplicar ~0,6–0,8) o parchear el AO para que afecte también a la difusa directa. | Sí (código r187) |
| 6 | **`PCFSoftShadowMap` está obsoleto desde r186**: usar `PCFShadowMap`. | En r187, `WebGLShadowMap` avisa: «PCFSoftShadowMap has been removed. Using PCFShadowMap instead.» | Sí (código r187) |
| 7 | **Empacar AO + rugosidad (+ metalness) en una sola textura «ORM».** | three lee AO del canal **R**, rugosidad del **G** y metalness del **B**. Se ahorra una textura y una lectura por material. | Sí (código r187) |
| 8 | **Anisotropía** de 4 a 8 en suelo, empedrado y camino (`texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())`). | Es lo que más mejora el suelo visto en ángulo rasante en primera persona y cuesta poco. | API de three |
| 9 | **La linterna con «cookie»**: `SpotLight.map` existe en r187. Una textura con el patrón del reflector (anillo, mancha, suciedad) da mucho realismo por muy poco coste. | Ejemplo oficial: https://threejs.org/examples/webgl_lights_spotlight.html (usa `castShadow`). | Sí (`this.map` en `SpotLight.js`) |

---

## 1. Texturas con relieve

### 1.1 Qué aporta cada mapa

| Mapa | Qué hace | ¿Vale la pena aquí? | Coste |
|---|---|---|---|
| **Color** (`map`) | Albedo sin luz ni sombras. | Siempre. | Bajo |
| **Normal** (`normalMap`) | Cambia la normal por píxel: grietas, juntas y vetas reaccionan a la linterna. **Es el que más «volumen» da por coste.** | **Siempre**, sobre todo en pañete, teja, empedrado y corteza. Con la linterna en movimiento se nota muchísimo. | Bajo |
| **Rugosidad** (`roughnessMap`) | Brillo variable: piedra mojada brillante y tierra mate. | Sí. Con linterna, los reflejos especulares venden la humedad. | Bajo |
| **Oclusión ambiental** (`aoMap`) | Oscurece rendijas, pero solo la luz indirecta (ver §0.5). | Poco de noche. Hornearlo en el color es más útil. | Bajo |
| **Desplazamiento** (`displacementMap`) | Mueve vértices de verdad. Necesita malla muy subdividida. | **Solo en terreno o en un muro protagonista**, nunca en cajas de 12 triángulos. Para relieve fino basta el normal. | Medio–alto (por los vértices) |
| **Bump** (`bumpMap`) | Relieve a partir de una altura en gris. | Solo si no hay normal; es útil con texturas procedurales. | Bajo |

Ejemplos oficiales en r187: https://threejs.org/examples/webgl_materials_normalmap.html · https://threejs.org/examples/webgl_materials_displacementmap.html · https://threejs.org/examples/webgl_materials_bumpmap.html

### 1.2 Parallax / parallax occlusion mapping (POM)

- **No hay implementación oficial ni mantenida para `WebGLRenderer`.** En r187 el único ejemplo es `webgpu_parallax_uv.html` (TSL, solo WebGPU). El hilo del foro https://discourse.threejs.org/t/parallax-mapping-with-meshstandardmaterial-pbr/6105 confirma que `MeshStandardMaterial` no lo trae.
- `promontis/threejs-pom` (https://github.com/promontis/threejs-pom): MIT, 19 ★, actividad 12-06-2026. Es **solo WebGPU/TSL**, así que no sirve con nuestro renderer.
- **Decisión: no hacerlo.** Un POM propio por `onBeforeCompile` cuesta de 8 a 32 lecturas de textura por píxel (coste **alto** en gráfica integrada a pantalla completa), se rompe en los bordes y en las sombras, y el asistente tendría que mantener el *raymarching* a mano. Un normal bueno, una linterna rasante y un poco de desplazamiento en el terreno dan el 80 % del efecto.

### 1.3 Mapeo triplanar

- **No hay triplanar oficial para WebGL.** El `triplanarTexture` de three es un nodo TSL (WebGPU).
- Hay que implementarlo con `onBeforeCompile`: 3 lecturas por mapa, mezcladas por `abs(normalMundo)^k`. Ejemplo de referencia (MIT): `applyTriplanarMapping` en `three-cad-viewer`, https://cdn.jsdelivr.net/npm/three-cad-viewer@4.3.9/dist/rendering/triplanar.d.ts. Solo se vio la declaración de tipos; antes de copiar hay que revisar el código fuente.
- **Dónde usarlo:** taludes del terreno, rocas y orillas del río, donde la proyección plana estira la textura. En cajas basta el *box mapping* de §0.4.
- **Coste:** medio (×3 lecturas en color, normal y ORM, es decir, 9 lecturas). Hay que limitarlo a esos materiales.

### 1.4 Mapas de detalle

- three **no tiene `detailMap`**. Se añade por `onBeforeCompile`: una segunda lectura de color o normal con UV × 8–16, mezclada solo cerca de la cámara (`smoothstep` por distancia).
- **Uso:** suelo y pañete vistos a 30 cm, para que no se vea borroso al acercarse. Coste **bajo** (1–2 lecturas más).

### 1.5 Ocultar la repetición

| Técnica | Recurso | Licencia / estado | Coste | Recomendación |
|---|---|---|---|---|
| **Variación macro** (multiplicar el color por un ruido de baja frecuencia en coordenadas de mundo, 20–50 m) | Código propio | — | Bajo (1 lectura o ruido analítico) | **Hacer ya.** Es la técnica que más rinde. |
| **Variación por instancia** (tono, rotación de UV y escala por `InstancedMesh`/`instanceColor`) | API de three | — | Bajo | **Hacer ya** en troncos, rocas y tejas. |
| **Hex-tiling / stochastic tiling** | Ameobea/three-hex-tiling, https://github.com/Ameobea/three-hex-tiling | MIT, 97 ★. npm `three-hex-tiling` 0.1.5 (18-02-2025), peer `three >=0.151`. El README dice que se probó **hasta 0.173**. | Medio (3 lecturas por mapa) | **No como dependencia.** Está parado y parchea *chunks* internos que cambian entre versiones. Conviene **portar su GLSL** a nuestro `onBeforeCompile` solo para el suelo grande. |
| Texture bombing | Godot Shaders, «Stochastic Filter for Hiding Texture Tiling» (CC0): https://godotshaders.com/shader/stochastic-filter-for-hiding-texture-tiling/ | CC0 | Medio | Es una alternativa al hex-tiling; se puede portar a GLSL. |

### 1.6 Mezcla de terrenos por capas (splat map)

- **Cómo:** una textura de control RGBA (por ejemplo R = hojarasca, G = camino, B = orilla/barro y A = tierra roja) pintada **por código** con la misma función de altura y pendiente que ya genera el terreno. Las capas van en un **`DataArrayTexture`** (`sampler2DArray`, WebGL2) para no gastar unidades de textura. Ejemplos oficiales: https://threejs.org/examples/webgl_texture2darray.html y https://threejs.org/examples/webgl_texture2darray_compressed.html (este con KTX2).
- **Mezcla por altura** (*height blend*): usar el `Displacement` de ambientCG de cada capa para que el barro entre por las grietas y no se funda en degradado. Es lo que hace que la orilla parezca real.
- **Coste:** medio. Son 4 capas × 2 mapas (color + ORM, el normal compartido o por capa) = 8–12 lecturas. A 512–1024 px es asumible. Si va lento: normal solo de las 2 capas dominantes.
- **Helper:** `three-custom-shader-material` (https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) escribe sobre `MeshStandardMaterial` sin pelear con los *chunks*. MIT, 1 364 ★. npm 6.4.0 (12-10-2025), peer `three >=0.159`; React y R3F son **opcionales** (`peerDependenciesMeta`), así que sirve en JS puro. **Opcional**: el `onBeforeCompile` propio ya basta.

### 1.7 `MeshPhysicalMaterial`

- **Sheen** (tela: ruana, camisa, mantel de la tienda): `sheen`, `sheenColor` y `sheenRoughness` existen en r187. Ejemplo: https://threejs.org/examples/webgl_loader_gltf_sheen.html. Úsalo **solo en la ropa de los personajes cercanos**; la diferencia con linterna rasante es visible.
- **Clearcoat** (barro húmedo, charcos, piedra mojada, teja tras la lluvia): https://threejs.org/examples/webgl_materials_physical_clearcoat.html. Es una alternativa más barata al *clearcoat* en el suelo: bajar la rugosidad por máscara (charcos) en el *splat map*.
- **Coste:** el shader físico es más pesado que el estándar (medio por material). Hay que evitarlo en el terreno y el follaje, que cubren toda la pantalla.

---

## 2. Rendimiento y formato

### 2.1 Presupuesto de memoria (cálculo, no medición)

| Tamaño | RGBA8 sin comprimir (JPG/PNG en GPU) + mipmaps | ETC1S → BC1/ETC1 (0,5 B/px) | UASTC → BC7/ASTC (1 B/px) |
|---|---|---|---|
| 512² | 1,3 MiB | 0,17 MiB | 0,33 MiB |
| 1024² | 5,3 MiB | 0,67 MiB | 1,3 MiB |
| 2048² | 21,3 MiB | 2,7 MiB | 5,3 MiB |

- **Recuerda que JPG y WebP solo ahorran descarga; en la GPU ocupan lo mismo que un PNG.** Solo KTX2/Basis reduce la VRAM.
- **Presupuesto que propongo (criterio propio):** ≤ **150 MiB** de texturas en total para gráfica integrada, que comparte RAM con el sistema y el navegador. Hoy vamos por ~68 MiB. **KTX2 se vuelve necesario** cuando entren personajes, vegetación con alfa y un HDRI, o al pasar el suelo a 2048.
- **Tamaños:** 1024 para suelo, camino y muros del pueblo (lo que se ve a 1 m); 512 para el resto; 256–512 para hojas lejanas. 2048 solo para el suelo, si se usan mapas de detalle.

### 2.2 KTX2 / Basis sin Blender en Windows

| Herramienta | URL | Licencia | Versión / fecha | Notas verificadas |
|---|---|---|---|---|
| **KTX-Software** (`ktx create`) | https://github.com/KhronosGroup/KTX-Software/releases | Apache-2.0 | **v4.4.2 (04-10-2025)**, con instalador `KTX-Software-4.4.2-Windows-x64.exe`. v5.0.0-rc2 es prerrelease. | `ktx create` acepta **PNG, EXR y RAW, no JPG**: hay que convertir antes los JPG de ambientCG a PNG. Opciones: `--encode basis-lz` (ETC1S), `--encode uastc` (o `uastc-ldr-4x4` en la documentación nueva), `--generate-mipmap`, `--zstd` y `--assign-tf linear` para normal/ORM. Los nombres de opciones pueden diferir entre 4.4 y 5.0, así que hay que comprobarlos con `ktx create --help`. |
| **glTF-Transform CLI** | https://gltf-transform.dev/cli | MIT | `@gltf-transform/cli` **4.5.1 (28-09-2026)** | Comandos `etc1s`, `uastc`, `optimize`, `simplify`, `resize`, `webp`… Para KTX2 **llama al ejecutable `ktx`** y exige **KTX-Software ≥ 4.4.0** (constante `KTX_SOFTWARE_VERSION_MIN` en su código). **Solo procesa glTF/GLB**, no imágenes sueltas. El propio CLI aconseja «UASTC para normales y ETC1S para el resto». |
| **basisu** (Binomial) | https://github.com/BinomialLLC/basis_universal | Apache-2.0 | v2.50 (03-08-2026) | Acepta JPG, pero la *release* **no trae binarios para Windows** (hay que compilarlo o usar la versión WASM con wasmtime). |
| **KTX2 Studio** (en el navegador) | https://binomial.biz/ktx2_studio/ | (no verificada) | v2.50 | Responde 200. No necesita instalar nada. **No se verificó** que sus `.ktx2` en ETC1S/UASTC se lean con el transcoder de three (ver abajo). |
| **ktx2-encoder** (npm, WASM) | https://www.npmjs.com/package/ktx2-encoder | MIT | 0.6.0 (19-07-2026) | Codifica en Node o navegador sin binarios nativos. Puede servir para un script `npm run tex`. **No se probó.** |

**Aviso de compatibilidad verificado:** el transcoder que trae three r187 (`examples/jsm/libs/basis/`) es **Basis Universal v1.50** (commit del 16-09-2024). Los formatos nuevos de Basis 2.x (**XUASTC**, ASTC de bloques grandes) **no** se deben usar. Hay que quedarse en **ETC1S y UASTC LDR 4×4**.

**Carga:** `KTX2Loader` (`three/addons/loaders/KTX2Loader.js`), `setTranscoderPath()` apuntando a una copia de `node_modules/three/examples/jsm/libs/basis/` en `public/`, y `detectSupport(renderer)`. Ejemplo oficial: https://threejs.org/examples/webgl_loader_texture_ktx2.html.

**Flujo sin Blender (cuando haga falta):** JPG → PNG (con cualquier editor o con `sharp` en Node) → `ktx create --encode basis-lz --generate-mipmap` para color, o `--encode uastc --zstd 18 --assign-tf linear` para normal/ORM. Esto exige instalar KTX-Software. La alternativa sin instalar es KTX2 Studio, con la salvedad anterior.

### 2.3 Mipmaps y anisotropía

- Los JPG/PNG generan mipmaps solos (`generateMipmaps = true` por defecto en r187). Los KTX2 **tienen que traerlos dentro** (`--generate-mipmap`), porque si no, el suelo parpadea a distancia.
- Anisotropía: ver §0.8. En el follaje con alfa no aporta; ahí se deja en 1.

---

## 3. Luz que da volumen

| Técnica | Recurso | Estado con three 0.187 | Coste en gráfica integrada | ¿Encaja de noche con linterna y fogata? |
|---|---|---|---|---|
| **Iluminación por entorno (HDRI + PMREM)** | `HDRLoader` (r187; **`RGBELoader` está obsoleto desde r180** y solo envuelve a `HDRLoader`) + `PMREMGenerator`. Ejemplos: https://threejs.org/examples/webgl_materials_envmaps_hdr.html, https://threejs.org/examples/webgl_pmrem_equirectangular.html. HDRI CC0 de Poly Haven: `moonless_golf`, `narrow_moonlit_road`, `qwantani_night_puresky`, `kloppenheim_02_puresky` (**1k ≈ 1,4–1,7 MB**, 2k ≈ 5,5–7 MB; consultado en `api.polyhaven.com`). | Sí | Bajo (se calcula una vez) | **Sí, pero muy tenue**: `scene.environmentIntensity` (existe en r187) en 0,03–0,15. Da el reflejo lunar en charcos y tejas y el relleno azulado. Basta con 1k. **No** se usa como fondo visible: el cielo sigue procedural. |
| **Sombras de la linterna** | `SpotLight` + `PCFShadowMap`, `shadow.mapSize` 1024, `shadow.normalBias` 0,02–0,05. | Sí | Medio (una pasada extra de profundidad de lo que hay dentro del cono) | **Imprescindible**: es la sombra que más vende el terror. |
| **Sombras de la fogata** | `PointLight.castShadow` | Sí | **Alto**: renderiza 6 caras (cubemap) | Como mucho **una** fogata con sombra, la más cercana. Para el resto, luz sin sombra, parpadeo de intensidad y un decal oscuro en el suelo. |
| **CSM (sombras en cascada)** | `three/addons/csm/CSM.js` (en r187, ejemplo https://threejs.org/examples/webgl_shadowmap_csm.html). `three-csm` en npm 4.2.1 está parado desde 11-12-2023 y es redundante. | Sí (addon oficial, WebGL) | Alto (N pasadas de sombra) | **No de noche.** CSM sirve para el sol de día en mundo abierto. De noche basta una `DirectionalLight` lunar con una sola sombra de 1024–2048 que siga al jugador (o ninguna). Reconsiderarlo solo si hay capítulos de día. |
| **SSAO: N8AO** | https://github.com/N8python/n8ao. Repo **CC0-1.0** (npm declara ISC), 504 ★. npm **2.0.1 (10-08-2026)**, peer `three >=0.137` y `postprocessing >=6.30.0`. | Compatible por peer con 0.187 y con postprocessing 6.39.6. Necesita **WebGL2**. `N8AOPass` (EffectComposer de three) o `N8AOPostPass` (pmndrs). | Medio. El README recomienda el preset **«Performance»** (8 muestras) y `halfRes` para gráfica integrada y portátiles. El MSAA del hardware no funciona con AO; usar SMAA. | **Opcional.** De noche la luz directa domina y el AO aporta menos. Útil en el pueblo al anochecer y en interiores. Activarlo en la calidad «Alta» del menú, no por defecto. |
| **SSAO: GTAO de three** | `three/addons/postprocessing/GTAOPass.js`, ejemplo https://threejs.org/examples/webgl_postprocessing_gtao.html | Sí (r187) | Medio–alto | Solo si **no** se adopta pmndrs/postprocessing. Si se adopta (como propone RECURSOS.md), N8AO encaja mejor. |
| **Niebla barata** | `FogExp2` + **niebla de altura** parcheando `fog_fragment` con `onBeforeCompile` (densidad que cae con la altura del mundo, más espesa en el río y las hondonadas). Planos o *sprites* de niebla con *soft particles* (desvanecer por profundidad) a ras de suelo. **Cono de la linterna falso**: malla cónica aditiva con degradado y desvanecido por profundidad. | Sí | Bajo | **Sí, es lo más rentable.** El haz visible de la linterna en la niebla es la imagen del género. |
| Niebla volumétrica de verdad | `three-good-godrays` (https://github.com/Ameobea/three-good-godrays): npm 0.12.2 (05-11-2026), peer `three >=0.125 <0.188` y `postprocessing ^6.33.4`; la API reporta licencia NOASSERTION (el archivo LICENSE trae un copyright de 2022, sin revisar el resto). El README dice que funciona con `PointLight` y `DirectionalLight`. | Compatible por peer | Alto (*raymarching* contra el mapa de sombras) | **No por ahora**: no admite `SpotLight` (la linterna) según su README y es caro. Como mucho, rayos de luna entre árboles en una escena puntual. |
| **Corrección de color** | Tone mapping **AgX** o **Neutral** (constantes en r187). LUT 3D: `LUTPass` + `LUTCubeLoader` (r187, https://threejs.org/examples/webgl_postprocessing_3dlut.html) o `LUT3DEffect` de pmndrs. | Sí | Bajo | **Sí.** Una LUT por bioma (bosque verde-ámbar, pueblo cálido de fogón, Bogotá azul sodio). `AgX` aguanta bien las luces intensas de la fogata sin quemar. |

**Orden de impacto visual de noche (criterio propio):** sombra de la linterna con cookie → niebla de altura con cono falso → normales y rugosidad buenas (los reflejos de la linterna en piedra mojada) → LUT y grano → entorno HDRI tenue → AO.

---

## 4. Vegetación creíble

### 4.1 Técnica

- **Tarjetas de hojas con alfa:** planos cruzados o abanicos con un atlas de hojas.
  - Para el alfa: `alphaTest` 0,4–0,5 es lo más barato y funciona con sombras. `alphaHash` (r187, https://threejs.org/examples/webgl_materials_alphahash.html) da bordes suaves sin ordenar, pero con ruido (lo tapa el grano). `alphaToCoverage` necesita MSAA, que se pierde al usar un *composer* sin *render target* multimuestreado.
  - **El `alphaMap` de three lee el canal G**: el `*_Opacity.jpg` de ambientCG sirve directamente como `alphaMap`, sin fusionar a PNG con alfa.
  - Translucidez barata: ambientCG trae `*_Scattering.jpg` en los atlas; se puede sumar un poco de luz trasera con él en `onBeforeCompile`.
- **Instancing:** `InstancedMesh` por especie y por *chunk* (https://threejs.org/examples/webgl_instancing_performance.html). Para muchas especies con LOD, `BatchedMesh` (https://threejs.org/examples/webgl_mesh_batch.html, https://threejs.org/examples/webgl_batch_lod_bvh.html).
- **Viento por shader:** en `begin_vertex`, desplazar según la altura local (`position.y`) × `sin(tiempo + fase)`, con la fase derivada de la posición de la instancia. Las hojas reciben más amplitud que el tronco. Referencia: al-ro (ya en RECURSOS.md). Coste **bajo**.
- **Guadua, palma y plátano se generan mejor por código** que con modelos externos. Guadua: cilindros segmentados con anillos en los nudos, ligeramente curvados, en macollas, con **Bamboo001A/B/C** o **Bamboo002A/B/C** de ambientCG. Palma: tronco curvado y abanico de tarjetas de fronda. Plátano: pseudotallo y 6–8 tarjetas grandes con desgarros en el alfa. Es justo el tipo de geometría que el asistente puede escribir bien.

### 4.2 Fuentes (licencia y formato verificados el 10-11-2026)

| Recurso | URL | Licencia | Formato / peso | Para qué |
|---|---|---|---|---|
| **ambientCG LeafSet001…030** (tipo *Atlas*) | https://ambientcg.com/list?q=leafset (p. ej. `LeafSet030`, publicado el 09-12-2025) | CC0 1.0 | Zip JPG 1K/2K/4K con Color, NormalGL, Roughness, **Opacity**, Displacement y Scattering. LeafSet030 1K-JPG ≈ 4,0 MB el zip. | Tarjetas de hojas de árboles de follaje, ceiba y arbustos. **No hay atlas de palma, plátano ni helecho** (la búsqueda «palm» y «fern» en la API dio 0 resultados). |
| ambientCG Bamboo001A–C, Bamboo002A–C | https://ambientcg.com/list?q=bamboo | CC0 1.0 | JPG PBR (incluye AO y Opacity) | Corteza de guadua. |
| ambientCG ScatteredLeaves001–008, Ground*, Bark* | https://ambientcg.com/list | CC0 1.0 | JPG PBR | Capas del *splat* (hojarasca, barro) y troncos. |
| **Poly Haven `fern_02`** | https://polyhaven.com/a/fern_02 | CC0 | glTF; **6 232 polígonos**; 1k ≈ **1,1 MB** con texturas | Helecho listo para instanciar. |
| Poly Haven `calathea_orbifolia_01`, `pachira_aquatica_01`, `anthurium_botany_01`, `shrub_01` | https://polyhaven.com/models/nature | CC0 | glTF; calathea 16 688 polígonos y 1,9 MB a 1k; pachira 76 914 polígonos y 5,1 MB a 1k | Sotobosque tropical cercano (pocas instancias). |
| Poly Haven `island_tree_01/02`, `jacaranda_tree` | ídem | CC0 | **3,7 M / 1,8 M / 312 k polígonos**, 46–215 MB a 1k | **No usar en tiempo real.** Sirven como referencia o para hornear impostores con Blender más adelante. No se verificó si `island_tree` es una palma. |
| OpenGameArt «Exotic Palms Lowpoly style» | https://opengameart.org/content/exotic-palms-lowpoly-style | CC0 (según el resultado de búsqueda; la página no se abrió) | .blend + FBX (sin glTF) | Palmas datileras low-poly. Estilo y especie poco colombianos. **Mejor por código.** |
| OpenGameArt «Palm tree v2 low poly edition» | https://opengameart.org/content/palm-tree-v2-low-poly-edition | CC0 (según el resultado de búsqueda) | 451 polígonos, textura de 512 | Alternativa de prototipo. |
| Kenney Nature Kit | https://kenney.nl/assets/nature-kit | CC0 (leído en la página) | 330 archivos; formatos no listados en la página | Estilizado; no encaja con el objetivo realista. No menciona palmas. |
| Sketchfab con filtro CC0 | https://sketchfab.com/search?features=downloadable&licenses=7c23a1ba438d4306920229c12afcb5f9&type=models | Por modelo | Variable | La búsqueda por API (`license=cc0`, «palm tree», «bamboo», «fern», «banana plant») devolvió sobre todo **escaneos de museo de alta poligonización**, no vegetación de juego. Hay más con CC-BY, que exige acreditar en `CREDITOS.md`. |

**Quaternius** (packs de naturaleza) ya **no es CC0** y prohíbe redistribuir los modelos sueltos (RECURSOS.md §5): no debe ir en un repositorio público.

---

## 5. Personas realistas

### 5.1 Lo que no es alcanzable

Sin un artista 3D **no** se llega a humanos fotorrealistas de cerca (piel con dispersión subsuperficial, pelo por mechones, cara con expresiones y lip-sync). Lo alcanzable con este equipo es **realismo nocturno de baja fidelidad**: cuerpos con proporción humana real, esqueleto y animaciones decentes, ropa con textura de tela, vistos en penumbra con linterna, grano y niebla. El terror de bajo presupuesto (estética PS1/PS2 del *horror* independiente) se apoya justamente en eso, y en este juego la oscuridad juega a favor. Las caras deben verse poco y a distancia; el diálogo se comunica con subtítulos, gesto corporal y movimiento de cabeza.

### 5.2 Comparación de rutas

| Ruta | URL | Licencia exacta (verificada) | ¿Se puede redistribuir en repo público? | Formato / peso | Qué hay que instalar | Comentario |
|---|---|---|---|---|---|---|
| **MakeHuman 1.3.0** (aplicación independiente) | https://static.makehumancommunity.org/makehuman/releases/releases_130.html · repo https://github.com/makehumancommunity/makehuman (última actividad 19-08-2024; release v1.3.0 en GitHub del 15-05-2024; las notas oficiales dicen 28-04-2023) | Assets **CC0** desde el cambio de 2020 («exports now consist only of material that was already CC0», FAQ en https://static.makehumancommunity.org/oldsite/faq/what_changed_regarding_the_license_in_2020.html, leído vía buscador) | **Sí** con los assets del núcleo. Los **assets de la comunidad** (ropa y pelo descargables) pueden ser CC-BY: revisar cada uno. | Exporta **FBX, DAE (Collada), OBJ, STL y Ogre**. **No exporta glTF** (según la documentación de exportación). Peso de un GLB resultante: **no verificado** (estimo 2–6 MB con texturas de 1k). | **MakeHuman 1.3.0 para Windows** (zip). **No necesita Blender.** | Proyecto parado desde 2024, pero funcional. Sus ropas por defecto son genéricas (camisa, jean, botas). |
| **MPFB 2** (complemento de Blender) | https://github.com/makehumancommunity/mpfb2 | Código GPLv3. **Assets CC0 1.0.** Sobre la salida, `LICENSE.md` §D dice: «the MakeHuman team makes no claim whatsoever over output such as: Exports to files (FBX, OBJ, DAE, MHX2...)». | **Sí** (con la misma salvedad de los assets de la comunidad) | Desde Blender: glTF/GLB nativo | **Blender ≥ 4.2** (el README lo exige). **No se puede usar sin Blender.** | Muy activo: **v2.0.18 (11-10-2026)**, 695 ★. Es la ruta de mejor calidad si se instala Blender. |
| **Mesh2Motion** (riggeo y animación en el navegador) | App: https://app.mesh2motion.org/ · código: https://github.com/Mesh2Motion/mesh2motion-app · assets: https://github.com/Mesh2Motion/mesh2motion-assets | README: «The code and platform are all licensed under the very permissive **MIT** license. The art assets (3d models, rigs, animations) are all licensed under **CC0**». El repo de assets declara **CC0-1.0** en la API. | **Sí** (animaciones CC0). **Ojo:** en `static/assets/human/variations/` hay un `sintel.glb`, y el personaje Sintel original de la Blender Foundation es CC-BY. En `test-files` hay un `mixamo-sample-rig.glb`. **No reutilizar esas variaciones sin revisar su origen.** | Importa **GLB, GLTF, DAE y FBX** (según su web). Exporta GLB/glTF. | **Nada** (web) | Muy activo: 3 658 ★, actividad 07-11-2026. Sirve como **alternativa abierta a Mixamo**. Tiene esqueleto humano con animaciones útiles para nosotros (nombres de archivo verificados en el repo): `walk`, `walk-cautious`, `walk-relaxed`, `walk-injured`, `idle-a`, `idle-subtle`, `idle-talking`, `idle-listening`, `idle-lantern`, `idle-torch`, `sitting-talking`, `pray`, `kneel`, `farm-harvest`, `chop-wood`, `shovel-dig`, `tired-hunched`, `sit-ground-crying` y `head-nod`. También tiene esqueleto de **zorro** (`idle`, `run`, `sit`, `sleep`, `bark`, `howl`…), aprovechable para el **perro**. No se verificó si calcula los pesos de piel automáticamente ni si hay huesos faciales. |
| Mixamo (Adobe) | https://www.mixamo.com/ | **La FAQ oficial (helpx.adobe.com) devuelve 403.** La copia en el foro de Adobe (publicación de 2022 de un usuario de la comunidad, no de un empleado identificado) dice: «the only thing you can't do is distribute the raw character and animation files». | **No.** Un repo público en GitHub y una carpeta `public/` en GitHub Pages **son distribución de los archivos sueltos**. | FBX/DAE | Cuenta de Adobe | **Descartado** para este repo. **Aviso:** `Soldier.glb` y `Xbot.glb` de los ejemplos de three **vienen de Mixamo** (lo dicen sus HTML en r187): no copiarlos al proyecto. |
| Ready Player Me | https://readyplayer.me/ | — | — | — | — | **Cerró sus servicios públicos el 31-01-2026** tras la compra por Netflix (anunciada en diciembre de 2025), según https://avatarsdk.com/blog/2026/08/31/avatar-platforms-2026-whos-alive-whos-gone/ y https://genies.com/blog/ready-player-me-shutdown (fuentes de competidores). Hoy `readyplayer.me` no respondió (sin conexión HTTP). **Descartado.** |
| VRoid Studio + `@pixiv/three-vrm` | https://vroid.com/en/studio · https://github.com/pixiv/three-vrm | three-vrm: **MIT**, npm **3.5.5 (09-07-2026)**, peer `three >=0.137` (compatible con 0.187), repo activo 22-10-2026. VRoid: según las pautas (https://vroid.com/en/studio/guidelines, **403 al leerla directamente**, resumen vía buscador), los modelos exportados se pueden usar y vender comercialmente, y los presets de pixiv **no son CC0**, aunque los licencia ampliamente. Cada VRM lleva en sus metadatos permisos propios (redistribución, uso comercial). | Probablemente sí con modelos propios hechos desde cero, pero **no verificado** en el texto oficial. | VRM (glTF), 5–20 MB típicos (no verificado) | VRoid Studio (Windows) | **Estilo anime: choca con el objetivo realista.** No se recomienda. |
| Character Creator (Reallusion) | https://www.reallusion.com/character-creator/ · EULA de contenido https://cdn-www.reallusion.com/Content/EULA/EULA.htm (actualizado el 10-05-2024) | El EULA de contenido prohíbe «make available, publish, transmit, distribute, or sublicense the Content to any third party». Para juegos exige una licencia de exportación, y el personal del foro dice que el 3D **no debe estar disponible para descarga pública**. | **No** en un repo público. | FBX y otros | Software de pago | **Descartado** por licencia y coste. |
| **Khronos glTF Sample Assets** | https://github.com/KhronosGroup/glTF-Sample-Assets | CesiumMan, RiggedFigure y RiggedSimple: **CC-BY-4.0 (Cesium)**; CesiumMan lleva además una marca registrada de Cesium («non-Khronos mark»). Fox: mezcla CC0 + CC-BY-4.0. BrainStem: **EULA de Poser, no usar**. (Leído en los `metadata.json`, repo activo 05-11-2026.) | Sí con atribución en `CREDITOS.md` (CesiumMan además con la marca). | GLB; CesiumMan.glb = **438 KB** | Nada | Sirven **solo para probar** el pipeline de *skinning* y `AnimationMixer`. Una sola animación de caminar y aspecto de maniquí: no son personajes del juego. |
| Kenney (Animated Characters) | https://kenney.nl/assets/animated-characters-1 | **CC0** (leído en la página) | Sí | 8 archivos; formatos no listados en la página | Nada | Estilo de bloques low-poly: no realista. Solo como relleno lejano. |
| Sketchfab CC0 / CC-BY | https://sketchfab.com/ (filtro por licencia y «downloadable») | Por modelo; CC-BY exige atribución | Sí si es CC0/CC-BY y se acredita. **Evitar** NC, ND y «Standard/Editorial». | GLB/glTF directo | Cuenta gratuita para descargar | La búsqueda por API no dio humanos útiles con CC0 («peasant», «farmer», «poncho»). Con CC-BY hay más, pero hay que curarlos uno por uno y casi nunca vienen riggeados con ropa campesina. |
| OpenGameArt | https://opengameart.org/ | Por asset (CC0, CC-BY, CC-BY-SA, GPL, OGA-BY) | Solo CC0/CC-BY. Evitar GPL/SA. | Variable | Nada | Humanos riggeados realistas: escasos. |
| **Meshy** (IA) | https://www.meshy.ai/ · condiciones: https://help.meshy.ai/en/articles/9992001-can-i-use-my-generated-assets-for-commercial-projects (leída el 10-11-2026) | Plan gratuito: **«we grant you a CC BY 4.0 license»**, con crédito a Meshy. Plan de pago: el usuario es dueño de los assets. | Sí en el gratuito con atribución CC-BY. | GLB/FBX. El tope de polígonos y de descargas del plan gratuito varía según fuentes y **no se verificó**. | Navegador y cuenta | Útil para **props** (tinaja, fogón, santo de yeso, machete). Para humanos: topología mala para animar, manos fundidas, y hay que riggear después (Mesh2Motion). |
| Tripo (IA) | https://www.tripo3d.ai/ | **Contradictorio y no verificado**: su página de ayuda (403 al leerla; citada por el buscador) dice que en el plan gratuito Tripo **conserva los derechos** de las salidas y **no concede uso comercial** (sección 5.2.1 de sus términos), mientras su blog habla de CC BY 4.0. | **Tratar como NO** en plan gratuito. | GLB/FBX | Cuenta | No usar sin plan de pago y sin leer los términos vigentes. |
| TRELLIS.2 (Microsoft, local) | https://github.com/microsoft/TRELLIS.2 | **MIT** (código y modelo, según su README); 12 818 ★; actividad 10-07-2026 | Sí (salida propia) | GLB | **GPU NVIDIA de ≥ 24 GB**, Python, CUDA | Inviable en un portátil con gráfica integrada. |
| Hunyuan3D 2.1 (Tencent, local) | https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1 | Licencia comunitaria de Tencent. **Excluye UE, Reino Unido y Corea del Sur.** Colombia está dentro del territorio. Las salidas no se consideran derivados. | Sí, con condiciones (política de uso aceptable) | GLB | GPU NVIDIA potente | Inviable localmente. Último *push* 17-10-2025. |

### 5.3 Recomendación

**Nivel 1: sin instalar nada (o casi nada).**
1. Crear cada personaje en **MakeHuman 1.3.0** (zip para Windows, sin Blender; es la única «instalación» y no toca el proyecto). Ajustar complexión, edad y tono de piel, elegir un *proxy* de baja poligonización y ropa del núcleo (CC0). Exportar en **FBX o DAE sin esqueleto**.
2. Abrir el FBX en **Mesh2Motion** (navegador), ajustar el esqueleto humano, elegir `idle-subtle`, `walk-relaxed`, `idle-talking`, `head-nod`, `pray` (el cura), `idle-lantern` y `farm-harvest`, y exportar en **GLB**.
3. Optimizar con `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt` (Node ya está instalado por Vite). Las texturas van en WebP/JPG hasta que se adopte KTX2.
4. **Ropa colombiana por código y textura:** el sombrero aguadeño, la ruana y el machete se modelan **proceduralmente en three** y se *atan* a los huesos (`head`, `spine2`, `hand_R`) con `bone.add(mesh)`. La ruana es una malla rectangular con abertura, ligada al pecho y con algo de balanceo por shader. La camisa y la falda se recolorean en el mapa de color (cuadros o tela de ambientCG `Fabric*`). La tendera y la curandera usan un pañolón como tarjeta con alfa.
5. **El perro:** cuerpo de cuadrúpedo (Poly Haven/Sketchfab CC0 o procedural) riggeado en Mesh2Motion con el **esqueleto de zorro** y sus animaciones (`idle`, `run`, `sit`, `bark`, `sleep`).
6. **La Patasola:** no hay animación de «saltar en una pierna». Se hace con la malla femenina de MakeHuman sin una pierna (o con la pierna oculta bajo la falda), `idle` y `crouch` de Mesh2Motion, y el salto **por código** (curva vertical del cuerpo y estiramiento). Es perfectamente creíble en la oscuridad.
7. Varios PNJ con la misma base: `SkeletonUtils.clone()` (r187) y un `AnimationMixer` por personaje cercano. Los lejanos se congelan o se animan a 15 Hz.

*Riesgo:* la combinación MakeHuman FBX → Mesh2Motion **no se ha probado**. Hay que probarla con un personaje antes de comprometerse. Si Mesh2Motion no calcula bien los pesos de piel con la ropa de MakeHuman, se pasa al nivel 2.

**Nivel 2: si se acepta instalar Blender** (5.x o la LTS; ver RECURSOS.md §5).
1. **MPFB 2.0.18** dentro de Blender (≥ 4.2): humanos con esqueleto `game_engine` y exportación glTF nativa, todo CC0.
2. Ropa campesina real: modelar el sombrero, la ruana y las alpargatas en Blender (geometría sencilla que un principiante puede hacer siguiendo un tutorial) y ajustarlas al cuerpo con el sistema de ropa de MPFB.
3. Animaciones: retargeting de las CC0 de Mesh2Motion, o grabar poses propias. Blender permite además un **hueso de mandíbula** para «hablar» (abrir y cerrar con la amplitud del audio o del texto) y *shape keys* de parpadeo.
4. Hornear AO y texturas de ropa sucia (polvo, barro en los bajos) por personaje.

**Mi decisión:** empezar por el **nivel 1** con un solo campesino como prueba de concepto. Si el resultado convence en penumbra, se replican los demás. Instalar Blender solo cuando se necesite ropa que no se pueda resolver con props atados a huesos.

---

## 6. Materiales propios de Colombia con el celular

### 6.1 Superficies planas (bahareque, pañete, teja vista de frente, tierra roja, empedrado): foto a PBR

Para esto **no hace falta fotogrametría**: basta una foto bien hecha.

1. **Captura:** día **nublado** o en sombra uniforme (sin sol directo ni flash), cámara **perpendicular** a la superficie y a 1–2 m, formato RAW o la máxima calidad JPG, sin HDR del teléfono. Hacer 3–4 tomas que se solapen. Poner en el encuadre una referencia de escala (una moneda o un metro) para saber cuántos metros cubre la textura.
2. **Recorte y corrección:** cuadrar la perspectiva, recortar a 2048² y quitar las sombras grandes con «paso alto» o desenfoque y división (GIMP o Krita, gratuitos).
3. **Hacer *tileable*:** desplazar a la mitad y clonar las costuras, o el modo «Make seamless» de Materialize.
4. **Mapas desde la foto:**
   - **NormalMap-Online**: https://cpetry.github.io/NormalMap-Online/ (repo https://github.com/cpetry/NormalMap-Online, **MIT**, actividad 30-10-2026). Genera **normal, desplazamiento, AO y especular** en el navegador, sin subir nada a un servidor («The scripts are running on your machine only»). En Normal, elegir la convención OpenGL o comprobar que el verde no salga invertido.
   - **Materialize** (Bounding Box Software, Windows): https://github.com/BoundingBoxSoftware/Materialize. **GPL-3.0** (la herramienta; las texturas son tuyas). Última actividad 24-06-2024, así que está parado pero funciona como ejecutable. Saca altura, normal, AO, rugosidad y *seamless* desde una foto.
   - **DeepBump** (normal por IA): https://github.com/HugoTini/DeepBump. GPL-3.0, v8 (17-03-2025). Es un complemento de **Blender** o CLI de Python, así que solo aplica en el nivel 2.
   - **Material Maker** 1.8 (25-10-2026, MIT, RECURSOS.md §5): sirve para combinar la foto con ruido procedural y exportar mapas. **No se verificó** si trae un nodo de normal desde imagen.
5. **Rugosidad:** desaturar el color, invertirlo y ajustar niveles (la teja es mate, de 0,7 a 0,9; la piedra de río mojada, de 0,2 a 0,4). Empacar como ORM (R = AO, G = rugosidad).

### 6.2 Objetos (piedra de río, teja suelta, tinaja, tronco de guadua): fotogrametría

| Herramienta | URL | Licencia / coste | Fecha | Notas |
|---|---|---|---|---|
| **RealityScan Mobile** (Epic) + RealityScan 2.x de escritorio | https://www.realityscan.com/ · licencia https://www.realityscan.com/license | Gratis para personas y empresas con **< 1 M USD** de ingresos anuales (según la página oficial, vía buscador). Por encima, 1 250 USD por puesto y año. | Escritorio 2.1 (nov. 2025) según fuentes secundarias | **No se verificó** el texto del EULA sobre la propiedad de los modelos generados ni si la app móvil exporta glTF. El escritorio pide una GPU NVIDIA (no verificado para 2.x). |
| **Meshroom** (AliceVision) | https://github.com/alicevision/Meshroom | **MPL-2.0** | v2025.1.0 (19-08-2025); repo activo 10-11-2026 | Libre y local en Windows. **No se verificó** si sigue exigiendo GPU NVIDIA/CUDA para la reconstrucción densa; históricamente sí, y en una gráfica integrada probablemente no sirva. |
| COLMAP | https://github.com/colmap/colmap | BSD (la API dice NOASSERTION) | Activo 10-11-2026 | Es el motor de referencia. Más técnico que Meshroom. |
| KIRI Engine, Polycam | — | Planes gratuitos con límites | **No verificados** | Comprobar los términos de exportación y licencia antes de usarlos. |

**Después de la fotogrametría:** los escaneos salen con cientos de miles o millones de triángulos. Sin Blender se reducen con `gltf-transform simplify` (meshoptimizer) y `resize`. Aun así, **la retopología y el horneado de normales de alta a baja resolución requieren Blender**: sin él, los escaneos sirven para rocas (que toleran topología fea), no para objetos limpios.

**Privacidad y derechos:** fotografiar fachadas privadas o imágenes religiosas puede requerir permiso. Las superficies genéricas (tierra, piedra, guadua, teja) no tienen ese problema.

---

## 7. Hoja de ruta visual

### Fase 1: ahora (esta semana)
- Aplicar los puntos de §0: normales GL, `colorSpace`, todas las *varyings* en el `onBeforeCompile`, `PCFShadowMap`, ORM, anisotropía en el suelo y **AO horneado en el color**.
- **Cookie en la linterna** (`SpotLight.map`) y sombra de la linterna a 1024.
- **Niebla de altura** y **cono de luz falso** de la linterna.
- **Variación macro** y **variación por instancia** contra la repetición.
- Tone mapping **AgX** y una LUT por escenario.
- Guadua, palma y plátano **procedurales** con Bamboo00x y LeafSet de ambientCG, con viento por shader.

### Fase 2: próximas semanas
- *Splat map* del terreno (tierra roja, hojarasca, camino y orilla con mezcla por altura) en `DataArrayTexture`.
- Prueba de concepto del **nivel 1 de personajes** (MakeHuman → Mesh2Motion → glTF-Transform) con **un** campesino. Si funciona, el resto y el perro.
- `sheen` en la ropa de los personajes cercanos y rugosidad baja (charcos) en el *splat*.
- HDRI nocturno de Poly Haven a 1k con `environmentIntensity` bajo.
- **N8AO** en preset «Performance» + `halfRes`, solo en calidad «Alta», cuando se adopte pmndrs/postprocessing.
- Fotografiar 3–4 materiales propios (bahareque, teja, tierra roja del Tolima) con el flujo de §6.1.

### Fase 3: más adelante
- **KTX2** (ETC1S para color, UASTC para normal/ORM) cuando la VRAM de texturas pase de ~120–150 MiB o al meter personajes y follaje denso.
- Triplanar en taludes y rocas, y detalle cercano en el suelo.
- Blender + MPFB 2 si los personajes del nivel 1 se quedan cortos, y retopología de escaneos.
- CSM solo si aparecen capítulos de día.

### Qué NO conviene hacer todavía
- **POM / parallax**: no hay implementación WebGL mantenida, es caro en gráfica integrada y se rompe en bordes y sombras.
- **Pasarse a WebGPU/TSL** para tener el triplanar o el POM oficiales: obligaría a reescribir los materiales y dejaría fuera pmndrs/postprocessing 6.x, que solo es WebGL.
- **Niebla volumétrica por raymarching** (`three-good-godrays`): cara y no admite la linterna (`SpotLight`).
- **Subir three a 0.188** mientras pmndrs/postprocessing y three-good-godrays declaren `<0.188`.
- **Desplazamiento** en cajas, **sombras de todas las fogatas** y **texturas de 2048** por defecto.
- Usar **Mixamo**, **Character Creator**, modelos de **Quaternius** o los `Soldier.glb`/`Xbot.glb` de los ejemplos de three en un repo público.
- Humanos de **IA generativa** como personajes principales: la topología no sirve para animar y la licencia de los planes gratuitos es ambigua (Tripo) o exige atribución (Meshy).
- **Escenarios fotogramétricos grandes** sin Blender: sin retopología no son viables en tiempo real.

---

## Pendiente de verificar
- Licencia y política de redistribución actuales de **Mixamo** (la FAQ oficial devuelve 403; solo hay una copia de 2022 en el foro).
- Pautas de **VRoid** (403) y términos de **Tripo** (403): resumidos desde el buscador, no leídos en la fuente.
- Que el flujo **MakeHuman FBX → Mesh2Motion** riggee bien (pesos de piel, ropa) y el peso real del GLB resultante.
- Origen y licencia de cada variación humana de Mesh2Motion (`sintel.glb`, `psx-*`) frente a la declaración general CC0.
- Si los `.ktx2` de KTX2 Studio o `basisu` 2.50 en ETC1S/UASTC se transcodifican bien con el transcoder v1.50 de three r187.
- Si `public/tex/*_normal.jpg` se copió del `NormalGL` y no del `NormalDX`.
- Requisitos de GPU de Meshroom 2025.1 y RealityScan 2.x, y el EULA de RealityScan sobre la propiedad de las salidas.
- Licencia y formatos exactos de las palmas CC0 de OpenGameArt (las páginas no se abrieron).
- Todos los costes en milisegundos: son estimaciones y hay que medirlos con stats-gl en el portátil de referencia.
