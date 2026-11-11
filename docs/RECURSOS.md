# Recursos para profesionalizar el juego

> Investigación hecha el **10-11-2026**. Cada versión y fecha de npm se sacó de `registry.npmjs.org` (campos `dist-tags.latest` y `time`) y cada dato de GitHub de la API pública `api.github.com/repos/...` (`stargazers_count`, `pushed_at`, `license`, `archived`), todo consultado ese mismo día. Las licencias de sitios de assets se leyeron en su página oficial de licencia. Cuando algo **no se pudo comprobar** se dice en la fila.
>
> Leyenda: **[CLÁSICO]** = sin actividad en más de 2 años o archivado, pero útil como referencia de lectura. **[SOLO LEER]** = sin licencia detectada: se puede estudiar, pero no copiar código.
>
> Stack ya fijado (no se discute): three 0.187.0 (npm, 30-10-2026), Vite 8.3.7 (npm, 09-11-2026), JS con módulos ES, colisiones propias, arte procedural, audio WebAudio, localStorage.

> **Observación del repo (no se tocó nada):** `package.json` tiene `"type": "commonjs"` y no tiene scripts `dev`/`build`. Con Vite lo normal es `"type": "module"` y scripts `vite` / `vite build` / `vite preview`. Conviene que lo revise el proceso que está escribiendo el código.

---

## 1. Repositorios de referencia en GitHub

| Repo | URL | Licencia | Actividad (pushed_at) / estrellas | Para qué nos sirve |
|---|---|---|---|---|
| three.js: ejemplos oficiales | https://github.com/mrdoob/three.js — demos: https://threejs.org/examples/games_fps.html, https://threejs.org/examples/misc_controls_pointerlock.html | MIT | 10-11-2026 · 118k ★ | `games_fps` muestra colisión de cápsula contra un Octree (addons `Capsule` y `Octree`) con paso de física subdividido. Es la referencia oficial para el controlador en primera persona y `PointerLockControls`. |
| three.js: cielo y nubes | https://threejs.org/examples/webgl_shaders_sky.html · https://threejs.org/examples/webgl_volume_cloud.html | MIT | ídem | `Sky` (addon) sirve para el atardecer y la noche. `volume_cloud` es la base más simple para probar niebla por raymarching en un volumen local, por ejemplo un banco de niebla en la ciénaga. |
| IceCreamYou/THREE.Terrain | https://github.com/IceCreamYou/THREE.Terrain | MIT | 05-11-2026 · 920 ★ | Generación de terreno procedural (ruido, erosión, dispersión de objetos). Sirve para comparar con nuestra función de altura y su algoritmo de dispersión de vegetación. |
| simondevyoutube/ProceduralTerrain_Part10 | https://github.com/simondevyoutube/ProceduralTerrain_Part10 | MIT | 18-03-2023 · 64 ★ **[CLÁSICO]** | Terreno por chunks con LOD en quadtree, en JS puro con three. Es la mejor lectura para pasar de una malla fija a chunks que se cargan alrededor del jugador. La serie tiene una parte por repo. |
| simondevyoutube/Quick_3D_MMORPG | https://github.com/simondevyoutube/Quick_3D_MMORPG | MIT | 22-12-2022 · 490 ★ **[CLÁSICO]** | Arquitectura entidad-componente sencilla en JS, con FSM de animación, rejilla espacial y terreno. Sirve de modelo de organización sin meter un ECS de librería. |
| brunosimon/folio-2025 | https://github.com/brunosimon/folio-2025 | MIT | 04-11-2026 · 2.0k ★ | Mundo abierto pequeño con three + Vite, de un autor de referencia (Three.js Journey). Útil para ver la organización de carpetas, el pipeline de build y la vegetación y el viento estilizados. No se verificó si usa WebGPU/TSL, así que hay que revisarlo antes de copiar shaders. |
| al-ro: hierba procedural | https://al-ro.github.io/projects/grass/ | No verificada | No verificada | Explicación clásica de hierba instanciada con viento en el vertex shader, curvada con ruido. Útil para nuestros `InstancedMesh` por chunk. |
| takram-design-engineering/three-geospatial | https://github.com/takram-design-engineering/three-geospatial | MIT | 27-05-2026 · 1.8k ★ | Atmósfera física y nubes volumétricas para three. Probablemente es demasiado pesado para nosotros; sirve como referencia de calidad del cielo. No se verificó la compatibilidad exacta con 0.187. |
| Ameobea/three-volumetric-pass | https://github.com/Ameobea/three-volumetric-pass | Sin licencia detectada **[SOLO LEER]** | 23-12-2023 · 15 ★ | Pase de niebla volumétrica en espacio de pantalla compatible con pmndrs/postprocessing. Sirve como idea, no como dependencia. |
| einncodes/FlooDead-ThreeJS-Horror-Game- | https://github.com/einncodes/FlooDead-ThreeJS-Horror-Game- (antes `parkqdev/...`, ahora redirige) | Sin licencia detectada **[SOLO LEER]** | 08-09-2026 · 18 ★ | Terror en primera persona con three + Vite y una criatura que acecha. Es lo más parecido en género que existe en abierto. |
| UstymUkhman/YetAnotherZombieHorror | https://github.com/UstymUkhman/YetAnotherZombieHorror | MIT | 05-04-2025, **archivado** **[CLÁSICO]** | Supervivencia en primera y tercera persona con three. Sirve para leer cómo resuelve armas, sonido y enemigos. |
| kekkorider/threejs-starter | https://github.com/kekkorider/threejs-starter | Sin licencia detectada por la API (revisar el repo) | 06-11-2026 · 195 ★ | Plantilla vanilla JS + Vite con panel de depuración. Sirve para comparar la configuración de Vite y los scripts. |
| Mugen87/dive | https://github.com/Mugen87/dive | MIT | 29-04-2023 · 97 ★ **[CLÁSICO]** | Shooter con bots hecho con three + Yuka por un mantenedor de three. Muestra IA con objetivos, percepción y memoria, grafo de navegación y triggers: justo lo que necesita la criatura. |

---

## 2. Librerías por función

| Función | Librería | URL | Licencia | Última versión (npm) | Decisión y motivo |
|---|---|---|---|---|---|
| Colisiones / raycast | **three-mesh-bvh** | https://github.com/gkjohnson/three-mesh-bvh | MIT | 0.9.18 (03-11-2026) | **Adoptar.** Acelera los raycasts contra mallas y la consulta de cápsula contra geometría. Sirve para la línea de visión de la criatura, para recoger objetos mirando y para colisiones con rocas o casas sin motor de física. Complementa nuestras colisiones de círculos y cajas, no las sustituye. |
| Física | Rapier (`@dimforge/rapier3d-compat`) | https://github.com/dimforge/rapier (el repo `rapier.js` está **archivado** y fusionado en el monorepo, carpeta `typescript`) | Apache-2.0 | 0.21.0 (25-09-2026) | **No adoptar todavía.** Es WASM y añade peso y complejidad. Solo tiene sentido si hacen falta objetos físicos (puertas, cuerpos que caen o empujar cosas). |
| IA de agentes | Yuka | https://github.com/Mugen87/yuka | MIT | 0.7.8 (17-09-2022). Último commit real: 16-01-2023 | **Usar como referencia, no como dependencia.** Steering, FSM, percepción (visión y memoria) y razonamiento por objetivos muy bien diseñados, pero está parado. Copiar ideas como `Vision`, `MemorySystem` y `StateMachine`. |
| Árboles de comportamiento | mistreevous | https://github.com/nikkorn/mistreevous | MIT | 4.3.1 (24-07-2025), repo activo 11-10-2026 | **Más adelante.** Cuando la FSM de la criatura tenga más de unos 6 estados, un BT con DSL legible ordena mejor el patrullar, rastrear, investigar ruido, acechar y huir del fuego. |
| Navegación | recast-navigation-js | https://github.com/isaac-mason/recast-navigation-js | MIT | 0.44.0 (30-10-2026) | **Más adelante.** Navmesh real con crowd y obstáculos. Vale la pena cuando haya caseríos, ríos con puentes o zonas cerradas. En campo abierto basta con steering más una rejilla A* sobre la función de altura. |
| Navegación (ligera) | three-pathfinding | https://github.com/donmccurdy/three-pathfinding | MIT | 1.3.0 (17-05-2024); repo con actividad 06-10-2026 | Alternativa simple si el navmesh se exporta desde Blender. Hoy no lo prefiero porque recast genera el navmesh en tiempo de ejecución desde nuestras mallas procedurales. |
| Posprocesado | **pmndrs/postprocessing** | https://github.com/pmndrs/postprocessing | Zlib | 6.39.6 (01-11-2026); peer `three >=0.168 <0.188`; v7 en beta (7.0.0-beta.16) | **Adoptar.** `EffectComposer` combina grano (`NoiseEffect`), viñeta, aberración cromática, tono y bloom en un solo pase. **Ojo:** el peer excluye three 0.188, así que no hay que subir three sin comprobar antes la versión compatible. Solo funciona con WebGLRenderer. |
| Audio procedural | WebAudio nativo + `THREE.PositionalAudio` | https://threejs.org/docs/#api/en/audio/PositionalAudio | MIT | con three 0.187.0 | **Seguir así.** El panner HRTF de `PositionalAudio` sirve para pasos y gritos de la criatura en 3D. |
| Audio procedural (ayuda) | Tone.js | https://github.com/Tonejs/Tone.js | MIT | 15.1.22 (27-04-2025); `next` 15.5.66; repo 01-11-2026 | **Opcional.** Sintetizadores, envolventes, LFO y transporte. Útil si el código de síntesis propio se vuelve difícil de mantener, pero añade unos 100 kB o más. Aún no es necesario. |
| Audio por archivos | Howler.js | https://github.com/goldfire/howler.js | MIT | 2.2.4 (19-09-2023) | **No adoptar.** No tenemos archivos de audio y three ya trae audio posicional. |
| ECS | bitECS | https://github.com/NateTheGreatt/bitECS | MPL-2.0 | 0.4.0 (06-12-2025) | **No adoptar.** Es para miles de entidades y la API cambió mucho en 0.4. Con decenas de entidades basta un patrón componente sencillo. |
| ECS | miniplex | https://github.com/hmans/miniplex | MIT | 2.0.0 (16-07-2023); repo 05-04-2026 | **No adoptar todavía.** Es la opción ECS más amable si algún día hace falta. |
| Diálogos ramificados | **inkjs** + lenguaje ink + editor Inky | https://github.com/y-lohse/inkjs · https://github.com/inkle/ink · https://github.com/inkle/inky | MIT | inkjs 2.4.0 (17-02-2026); ink repo 05-05-2026 | **Próximas semanas, si los diálogos ramifican.** ink es estándar en la industria, permite variables y estado guardable (`story.state.toJson()`) y se escribe en texto plano en español. Si los diálogos siguen siendo lineales, los datos JS actuales bastan. |
| Diálogos (alternativa) | Yarn Spinner / yarn-bound | https://github.com/YarnSpinnerTool/YarnSpinner · https://github.com/mnbroatch/yarn-bound | MIT / ISC (npm; repo sin licencia detectada) | yarn-bound 0.5.5 (29-11-2024) | **No.** Yarn Spinner está centrado en Unity y Godot. El runtime JS es de un tercero con poca actividad y 35 ★. |
| Depuración | **lil-gui** | https://github.com/georgealways/lil-gui | MIT | 0.21.0 (12-10-2025) | **Adoptar.** Panel `?debug` para ajustar niebla, velocidad de la criatura, hora del día y saltar de parte en parte. |
| Rendimiento | **stats-gl** | https://github.com/RenaudRohlinger/stats-gl | MIT (npm) | 4.2.3 (10-07-2026) | **Adoptar.** FPS y tiempo de CPU y GPU reales (consultas de timer de GPU). Mejor que `stats.js`. |
| Inspección WebGL | **Spector.js** | https://github.com/BabylonJS/Spector.js · https://spector.babylonjs.com/ | MIT | 0.9.33 (14-09-2026) | **Adoptar como extensión del navegador**, no como dependencia. Captura un frame y muestra draw calls y estados para cazar instancias que no se agrupan. |
| Rendimiento (three) | three-perf | https://github.com/TheoTheDev/three-perf | MIT | 1.0.11 (09-06-2025) | Opcional. Con 62 ★ y poca actividad, stats-gl junto con `renderer.info` cubre lo mismo. |
| Pruebas unitarias | **Vitest** | https://vitest.dev/ | MIT | 5.1.0 (02-11-2026) | **Adoptar.** Usa la misma configuración de Vite. Sirve para probar la lógica pura: pasos de misión, migraciones de guardado, colisiones círculo-caja y la FSM de la criatura. |
| Pruebas E2E | **Playwright** | https://playwright.dev/ | Apache-2.0 | `@playwright/test` 1.65.0 (05-11-2026) | **Adoptar.** Prueba de humo: carga, menú, nueva partida, guardar y recargar. Hay que exponer un `window.__game` de prueba para consultar el estado en lugar de comparar píxeles. Es tu terreno profesional. |

---

## 3. Arquitectura de juegos

### Lecturas

| Recurso | URL | Licencia / acceso | Fecha / versión | Para qué nos sirve |
|---|---|---|---|---|
| *Game Programming Patterns* (R. Nystrom) | https://gameprogrammingpatterns.com/ · repo: https://github.com/munificent/game-programming-patterns | Lectura web gratuita (repo con licencia «NOASSERTION» en la API: el texto no es libre para copiar) | Repo 21-07-2024 **[CLÁSICO]** | Capítulos clave: Game Loop, State, Component, Event Queue, Observer, Spatial Partition, Data Locality. Son la base de la criatura, de las misiones y de la rejilla de colisiones. |
| «Fix Your Timestep!» (Glenn Fiedler) | https://gafferongames.com/post/fix_your_timestep/ | Lectura gratuita | Clásico (2004, se sigue citando) | Bucle con **paso fijo** (p. ej. 1/60 s) más acumulador e interpolación. Evita que el jugador atraviese paredes o que la criatura cambie de velocidad con FPS bajos. |
| Manual oficial de three.js | https://threejs.org/manual/ | MIT | Al día con r187 | Capítulos de rendimiento, *Optimize Lots of Objects*, *Rendering on Demand*, *Indexed Textures* y liberación de memoria (`dispose`). |
| Discover three.js | https://discoverthreejs.com/book/ | Gratis en línea | No se verificó la fecha de la última revisión (escrito para versiones antiguas de three) | Organización por módulos (`World`, `Loop`, `systems/`, `components/`) en vanilla JS. Su estructura es buena aunque algunas APIs estén desfasadas. |
| MDN: Desarrollo de juegos | https://developer.mozilla.org/en-US/docs/Games · https://developer.mozilla.org/en-US/docs/Games/Anatomy | CC-BY-SA 2.5 (texto) | Viva | *Anatomy of a video game* explica `requestAnimationFrame`, el tiempo y el bucle principal en el navegador. Hay guías de Pointer Lock y Gamepad. |
| AI and Games (Tommy Thompson) | https://www.aiandgames.com/ | Gratuito | Activo | Análisis de IA de juegos comerciales, entre ellos *Alien: Isolation*. Ver sección 6. |

### Principios que aplicar a este juego

1. **Bucle de paso fijo** para la simulación (jugador, criatura, perro, colisiones, timers de misión) y render variable con interpolación. Así las pruebas son deterministas.
2. **Máquinas de estado explícitas** para el juego (`Menu → Jugando → Diálogo → Diario → Pausa → Muerte → Créditos`), para la criatura (`Dormida → Patrulla → Rastreo → Acecho → Persecución → Huida (fuego) → Pérdida`) y para el perro (`Seguir → Olfatear → Alertar → Huir`).
3. **Diseño dirigido por datos**: cada capítulo es un archivo de datos con `parts[]`, `steps[]` (tipos `talk`, `collect`, `reach`, `survive`, `wait`), `npcs`, `items`, `journal`, `creature` (parámetros de IA) y `biome` (paleta, niebla, vegetación). El motor no conoce ningún mito concreto.
4. **Bus de eventos** (`events.emit('item:collected', {id})`): las misiones escuchan eventos y no consultan el mundo. Eso facilita las pruebas y el guardado.
5. **Estado guardable separado del estado de escena**: el guardado solo serializa `{version, chapter, part, stepIndex, flags, inventory, journal, player:{pos,hp}, time, settings}` y nunca objetos de three.

### Estructura de carpetas propuesta

```
claude_game/
├─ index.html
├─ vite.config.js
├─ docs/                       # GDD, RECURSOS.md, checklist de publicación
├─ public/                     # (vacío por ahora; aquí irían fuentes .woff2 y futuros assets)
├─ src/
│  ├─ main.js                  # arranque: crea Game y lo inicia
│  ├─ core/
│  │  ├─ Game.js               # orquesta sistemas y estados de juego
│  │  ├─ loop.js               # paso fijo + interpolación
│  │  ├─ events.js             # bus de eventos
│  │  ├─ fsm.js                # máquina de estados genérica
│  │  ├─ input.js              # teclado/ratón/gamepad, pointer lock, reasignación
│  │  └─ rng.js                # aleatorio con semilla (mundo reproducible y testeable)
│  ├─ world/
│  │  ├─ terrain.js            # función de altura + generación de chunks
│  │  ├─ chunks.js             # carga/descarga alrededor del jugador
│  │  ├─ vegetation.js         # InstancedMesh por chunk
│  │  ├─ sky.js  fog.js  lighting.js  daynight.js
│  │  └─ biomes/               # bosqueSeco.js, manglar.js, llanos.js, paramo.js, cienaga.js
│  ├─ physics/
│  │  ├─ colliders.js          # círculos y cajas
│  │  ├─ spatialGrid.js        # partición espacial para consultas
│  │  └─ raycast.js            # (futuro) envoltura de three-mesh-bvh
│  ├─ entities/
│  │  ├─ player.js  dog.js  npc.js  campfire.js  pickup.js
│  │  └─ creature/
│  │     ├─ creature.js        # cuerpo + animación procedural
│  │     ├─ senses.js          # vista, oído, olfato (memoria de última posición)
│  │     ├─ brain.js           # FSM (o BT más adelante)
│  │     └─ director.js        # «director» de tensión (ver sección 6)
│  ├─ gameplay/
│  │  ├─ quests.js             # intérprete de pasos declarativos
│  │  ├─ dialogue.js           # (datos JS hoy, inkjs mañana)
│  │  ├─ journal.js  inventory.js
│  │  └─ save/
│  │     ├─ save.js            # API guardar/cargar (localStorage hoy)
│  │     └─ migrations.js      # v1→v2→v3…
│  ├─ audio/
│  │  ├─ engine.js             # AudioContext, buses (música/ambiente/sfx/voz), mezcla
│  │  ├─ synth/                # viento, insectos, río, pasos, criatura, perro
│  │  └─ spatial.js            # PositionalAudio
│  ├─ render/
│  │  ├─ renderer.js  postfx.js  materials.js
│  ├─ ui/
│  │  ├─ hud.js  menu.js  dialogueBox.js  journalView.js  subtitles.js  settings.js
│  │  └─ styles.css
│  ├─ content/
│  │  ├─ chapters/
│  │  │  ├─ 01-patasola/       # index.js, parts.js, npcs.js, dialogues.js, journal.js, fuentes.md
│  │  │  └─ 02-mohan/ …
│  │  └─ strings/es.js         # textos de UI (preparado para i18n)
│  └─ debug/
│     ├─ gui.js  stats.js  cheats.js   # solo se cargan con ?debug
└─ tests/
   ├─ unit/                    # Vitest: quests, migrations, colliders, fsm
   └─ e2e/                     # Playwright: smoke, guardado
```

---

## 4. Bases de datos y persistencia

### Local

| Opción | URL | Licencia | Versión (npm) | Para qué nos sirve / decisión |
|---|---|---|---|---|
| localStorage (actual) | https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | Estándar web | — | **Mantener por ahora.** Una partida de este juego (estado más diario) cabe en unos pocos KB. Es síncrono, sólo guarda texto y tiene un límite de unos 5 MB por origen. Para varias ranuras y ajustes es suficiente. |
| Cuotas y persistencia | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria · https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist · https://web.dev/articles/storage-for-the-web | Docs | — | Llamar `navigator.storage.persist()` reduce el riesgo de que el navegador borre las partidas por presión de espacio. **Safari** puede borrar el almacenamiento de sitios que no se visitan en 7 días: hay que avisarlo y ofrecer exportar la partida. |
| **idb** (Jake Archibald) | https://github.com/jakearchibald/idb | ISC | 8.0.4 (06-10-2026) | **Siguiente paso si se crece.** Envoltura mínima de IndexedDB con promesas, de aproximadamente 1 kB. Sirve para capturas de la partida, muchas ranuras o guardado automático frecuente sin bloquear el hilo. |
| Dexie.js | https://github.com/dexie/Dexie.js | Apache-2.0 | 4.4.7 (19-10-2026) | Más completo: esquemas, versiones con `upgrade()` y consultas. Útil si algún día hay estadísticas o telemetría local con consultas. Para guardar partidas, idb es suficiente. |
| localForage | https://github.com/localForage/localForage | Apache-2.0 | 1.10.0 (18-08-2021); repo 30-07-2024 **[CLÁSICO]** | **No adoptar.** Está parado y su ventaja (compatibilidad con navegadores viejos) ya no aplica. |

### Nube, logros y telemetría (solo si algún día se quiere)

Capas gratuitas leídas hoy en sus páginas de precios:

| Servicio | URL | Licencia / tipo | SDK (npm) | Capa gratuita (10-11-2026) | Para qué nos sirve |
|---|---|---|---|---|---|
| Supabase | https://supabase.com/pricing | Apache-2.0 (plataforma, SaaS) | `@supabase/supabase-js` 2.119.0 (04-11-2026) | 2 proyectos activos, 500 MB de BD, 50.000 MAU, 5 GB de egress más 5 GB cacheados, 1 GB de archivos. **Los proyectos se pausan tras 1 semana sin actividad.** | Postgres con auth y RLS. Es la mejor opción para guardado en la nube con cuenta y tablas de logros. |
| Firebase (Spark) | https://firebase.google.com/pricing | SaaS propietario, SDK Apache-2.0 | `firebase` 13.2.0 (02-11-2026) | Firestore: 1 GiB, 50k lecturas, 20k escrituras y 20k borrados al día. Auth 50k MAU. Hosting 10 GB y 360 MB/día de transferencia. **Cloud Storage exige el plan Blaze.** | Alternativa con analítica gratuita. Te ata a Google. |
| PocketBase | https://pocketbase.io/ · docs: https://pocketbase.io/docs/ | MIT (según el repo de GitHub, que ahora está **archivado**: el proyecto se mudó a https://ganigeorgiev.com/pocketbase/pocketbase) | SDK `pocketbase` 0.28.2 (01-11-2026); servidor v0.41.1 según la web (sin fecha) | Gratis, autoalojado (un solo binario Go con SQLite). Pagas el servidor. Antes de 1.0 no garantiza compatibilidad. | Backend propio en un VPS pequeño. Bueno para aprender, pero exige mantener el servidor. |
| Turso (libSQL/SQLite) | https://turso.tech/pricing | SaaS; cliente MIT | `@libsql/client` 0.18.0 (02-09-2026) | 100 BD, 5 GB, 500 M de filas leídas y 10 M escritas al mes. | **No usar desde el navegador directamente**: necesita un token y ese token quedaría expuesto. Solo sirve detrás de una función serverless. |

**Recomendación:** no adoptar nube todavía. Si un día hacen falta logros o telemetría, la opción más simple es **Supabase** con auth anónima y una tabla `events` con RLS de solo inserción. Antes de recoger nada, la telemetría tiene que ser opcional y anunciada. Colombia tiene la Ley 1581 de 2012 de protección de datos (no se revisó el detalle en esta investigación).

### Versionar y migrar el formato de guardado

1. Cada guardado lleva `{ "format": 3, "game": "<versión del juego>", "savedAt": ISO, "data": {...} }`.
2. `migrations.js` exporta una lista ordenada `[{from:1,to:2,up(d){…}}, {from:2,to:3,up(d){…}}]`. Al cargar se aplican en cadena hasta la versión actual. Las migraciones nunca se borran.
3. Antes de migrar se guarda una copia `slot-1.bak`. Si la migración falla, se restaura y se avisa al jugador.
4. Validar con un esquema mínimo (función propia o JSON Schema) y descartar campos desconocidos.
5. Las referencias se guardan por **id estable** (`"item:machete"`, `"step:p1-03"`) y nunca por índice de array. Así reordenar el contenido del capítulo no rompe las partidas.
6. Hay que ofrecer **Exportar/Importar partida** como archivo `.json`: sirve de respaldo para Safari y para QA.
7. Pruebas Vitest con «fixtures» reales de cada versión anterior (`tests/fixtures/save-v1.json`, …).

---

## 5. Pipeline de assets y diseño gráfico

### Fuentes de assets (licencia leída en la página oficial el 10-11-2026)

| Fuente | URL | Licencia exacta | Para qué nos sirve |
|---|---|---|---|
| Poly Haven | https://polyhaven.com/ · https://polyhaven.com/license | **CC0** («Our assets are all licensed as CC0»). No pide atribución. | HDRI nocturnos y de atardecer para la iluminación ambiental, texturas PBR de tierra, corteza y roca, y modelos de plantas. |
| ambientCG | https://ambientcg.com/ · https://docs.ambientcg.com/license/ | **CC0 1.0 Universal**. No pide atribución. | Texturas PBR (barro, hojarasca, madera podrida) y algunos HDRI. |
| Kenney | https://kenney.nl/assets | **CC0** (página de soporte). No pide atribución. | Iconos y UI de prototipo, sonidos de interfaz y modelos low-poly. |
| Quaternius | https://quaternius.com/ · https://quaternius.com/license.html | **Quaternius Asset License (QAL) v1.0**: uso gratuito personal y comercial, sin atribución obligatoria, **prohibido revender o redistribuir los assets sueltos**. *Ya no es CC0 puro.* | Packs de naturaleza estilizada y personajes humanos animados (campesinos y PNJ provisionales). |
| Freesound | https://freesound.org/ · https://freesound.org/help/faq/ | **Por sonido**: CC0, CC BY o CC BY-NC (y Sampling+ en sonidos antiguos). **Evitar NC.** Con CC BY hay que acreditar título, autor, enlace y licencia. | Grabaciones de campo de selva, ranas, chicharras y río que sirvan de referencia para nuestra síntesis, o capas de ambiente. |
| Sonniss GDC Game Audio Bundle | https://sonniss.com/gameaudiogdc (el sitio responde 403 a peticiones automáticas, pero se leyó el resumen) | Licencia propia: libre de regalías y uso comercial en juegos, **sin atribución**, sin límite de proyectos. **Prohibido** revender los sonidos sueltos y **prohibido usarlos para entrenar IA/ML**. | Hay bundles de 2015 a 2024 y de 2026; en 2025 no hubo bundle. Muy buenos para pasos, ramas y respiraciones. |
| OpenGameArt | https://opengameart.org/ | **Por asset**: CC0, CC BY, CC BY-SA, GPL y OGA-BY, entre otras. El FAQ respondió 403, así que se revisa asset por asset. | Hay que filtrar por CC0 y evitar GPL/SA para no contaminar la licencia del juego. |
| game-icons.net | https://game-icons.net/ | **CC BY 3.0**: atribución obligatoria («Icons made by {autor}. Available on https://game-icons.net»). Unos 4.180 iconos. | Iconos de inventario y diario en SVG (vela, huella, machete, ojo). Se pueden colorear. |

### Herramientas

| Herramienta | URL | Licencia | Versión / fecha | Para qué nos sirve |
|---|---|---|---|---|
| Blender | https://www.blender.org/download/ · LTS: https://www.blender.org/download/lts/ | GPL (el software; lo que se crea con él es tuyo) | **5.3.0 (10-11-2026)** | Si algún día se modelan props, se exporta glTF. Para un equipo de una persona, conviene la LTS. |
| glTF-Transform | https://gltf-transform.dev/ · https://github.com/donmccurdy/glTF-Transform | MIT | CLI 4.5.1 (28-09-2026) | `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2`: un solo comando para dejar los modelos listos para web. |
| meshoptimizer | https://meshoptimizer.org/ · https://github.com/zeux/meshoptimizer | MIT | npm 1.3.0 (25-09-2026) | Compresión Meshopt (`MeshoptDecoder` en three). En web suele preferirse a Draco: decodifica más rápido y también comprime animaciones. |
| KTX-Software (KTX2/Basis) | https://github.khronos.org/KTX-Software/ | Apache-2.0 (la API reporta NOASSERTION; revisar el repo) | v4.4.2 (04-10-2025) | Texturas comprimidas en GPU (`KTX2Loader`): menos VRAM y menos tiempo de carga. |
| Draco | (incluido en three: `DRACOLoader`) | Apache-2.0 | — | Solo si un asset ya viene en Draco. Para lo nuevo, Meshopt. |
| Mixamo | https://www.mixamo.com/ | Gratis con cuenta de Adobe. **No se pudo leer el FAQ de licencia (403)**: verificar los términos antes de usarlo. | — | Animaciones humanoides para PNJ, si algún día se pasa de primitivas a modelos riggeados. Hoy no aplica. |
| Material Maker | https://www.materialmaker.org/ · https://github.com/RodZill4/material-maker | MIT | 1.8 (25-10-2026) | Texturas procedurales por nodos, exportables a PNG. Sirve para pasar del arte 100 % procedural en shader a texturas horneadas cuando haga falta rendimiento. |
| Penpot | https://penpot.app/ · https://github.com/penpot/penpot | MPL-2.0 | 2.19.0 (09-11-2026) | **Recomendado** para maquetar HUD, menús y diario. Es código abierto, gratuito y exporta CSS. |
| Figma | https://www.figma.com/pricing/ | Propietario, con plan gratuito | No se verificaron los límites del plan gratuito hoy | Alternativa más conocida. Penpot evita depender de una empresa. |

### Tipografías (Google Fonts, licencia leída en `google/fonts/*/METADATA.pb`)

Todas tienen subconjunto *latin*, que cubre ñ, tildes y ¿¡. Aun así conviene probar los caracteres en https://fonts.google.com/ antes de fijarlas. Hay que autoalojarlas en `.woff2` dentro de `public/fonts/`, sin CDN, para que el juego funcione sin conexión y no haga peticiones a terceros.

| Fuente | Licencia | Uso propuesto |
|---|---|---|
| **Atkinson Hyperlegible Next** | OFL (añadida 07-01-2025) | **Texto de HUD, diálogos y subtítulos.** Diseñada para baja visión. Es la principal recomendación de legibilidad. |
| Lexend | OFL | Alternativa legible para menús. |
| IM Fell English / IM Fell DW Pica | OFL | Títulos de capítulo y encabezados del diario: aire de libro antiguo de folclor. |
| Cormorant Garamond / EB Garamond / Crimson Pro | OFL | Cuerpo del **diario**, como si fueran notas de un investigador. |
| Courier Prime | OFL | Notas mecanografiadas, informes y recortes de periódico. |
| Special Elite | **Apache-2.0** (no OFL; también es libre) | Máquina de escribir gastada, para documentos encontrados. |
| Creepster / Nosifer / Butcherman | OFL | **Solo para el logotipo, y con moderación.** Son muy «Halloween» y poco legibles, así que no van en texto corrido. |

### Dirección de arte, HUD y accesibilidad

| Recurso | URL | Licencia / acceso | Para qué nos sirve |
|---|---|---|---|
| Game Accessibility Guidelines | https://gameaccessibilityguidelines.com/ | Gratuito | Lista por niveles (básico, intermedio, avanzado). Aplicar ya: **subtítulos con indicación de quién habla y de los sonidos importantes** («[crujido de ramas a tu izquierda]»), tamaño de texto ajustable, reasignar teclas, sensibilidad del ratón, opción de reducir el movimiento de cámara y el grano, y no depender solo del color. |
| Paleta y legibilidad | (criterio propio) | — | En terror nocturno, el HUD debe ser mínimo y diegético. El texto va claro sobre una caja semitransparente oscura con contraste ≥ 4.5:1 (criterio WCAG). Cada bioma tiene su paleta: bosque seco ocre y polvo, manglar verde salobre, páramo gris azulado, Llanos ámbar. |

---

## 6. Diseño de terror (referencias de técnicas, no para copiar)

| Recurso | URL | Acceso | Fecha | Qué extraer para nuestra criatura y ritmo |
|---|---|---|---|---|
| «The Perfect Organism: The AI of Alien: Isolation» (Tommy Thompson) | https://www.gamedeveloper.com/design/the-perfect-organism-the-ai-of-alien-isolation | Gratis | 31-10-2017 | **IA en dos capas**: un *director* que siempre sabe dónde está el jugador y empuja a la criatura hacia él, y una criatura que **debe encontrarlo con sus sentidos**. Usa un **medidor de amenaza** que, cuando sube mucho, retira a la criatura para dar respiro. Los comportamientos se **desbloquean según el progreso**, nunca según las muertes. La búsqueda es deliberadamente imperfecta (duda y vuelve atrás). Encaja directamente con la Patasola. |
| «The AI Systems of Left 4 Dead» (Michael Booth, Valve) | https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf · índice: https://www.valvesoftware.com/en/publications | PDF gratis | 2009 **[CLÁSICO]** | El **AI Director** modela la «intensidad emocional» del jugador y alterna fases de *build-up*, *peak*, *relax*. Es la base de nuestro `director.js`: entre fogatas hay calma y en los tramos de supervivencia, picos. |
| «Four ways to design for horror» (Thomas Grip, Frictional Games) | https://www.gamedeveloper.com/design/four-ways-to-design-for-horror-from-i-amnesia-i-dev-frictional-games | Gratis | 2014 | El terror parte de la emoción buscada y no de la diversión del bucle. Conviene **no mostrar** a la criatura de cerca demasiado pronto, y la muerte libera tensión, así que hay que evitar matar al jugador a menudo. |
| Blog de Frictional Games | https://frictionalgames.com/blog/ | Gratis | Activo (no se verificó la fecha del último post) | Ensayos de Thomas Grip sobre narrativa jugable, presencia y monstruos. |
| «The Sound of Horror: Resident Evil 7» (GDC 2017) | https://gdcvault.com/play/1024061/The-Sound-of-Horror-Resident | GDC Vault; aparece como *free content* según el buscador (no se confirmó sin iniciar sesión) | 2017 | Sonido realista inquietante y técnicas de *musique concrète*. Sirve de inspiración para la síntesis de ruidos de la criatura. |
| «Adapting Linear Audio Techniques to Improve Voyeurism and Emotional Engagement in Horror Games» (Barney Pratt, Supermassive) | https://gdcvault.com/play/1026010/Adapting-Linear-Audio-Techniques-to | GDC Vault; aparece como *free content* según el buscador | No se verificó el año | Mezcla y Foley de cine aplicados al juego: perspectiva sonora y silencio como herramienta. |

**Técnicas concretas que derivan de estas fuentes:**
- **Director de tensión** con un valor 0–1 que sube por cercanía, visión de la criatura y ruido del jugador, y baja junto a las fogatas o con el tiempo. Ese valor controla la frecuencia de apariciones, la mezcla de audio y el grano.
- **Sentidos con memoria**: la criatura guarda la *última posición conocida* e investiga ahí. Así el jugador puede engañarla, y el perro puede alertar antes.
- **Sonido como primer aviso**: anticipar 3–5 s con sonido espacial (silbido, golpe de pata en el caso de la Patasola) antes de cualquier aparición visual. El silencio repentino de los insectos es una señal muy barata y muy efectiva.
- **Reglas de juego justas y aprendibles** por mito, por ejemplo «el fuego la repele» o «si corres te oye». Cada regla se presenta antes en el diario.

---

## 7. Fuentes culturales colombianas fiables

> **Derechos:** los mitos de tradición oral no tienen autor y pueden usarse libremente como motivo e inspiración (patrimonio cultural inmaterial). **Cada texto concreto** (libro, artículo, entrada de enciclopedia o programa de radio) sí está protegido. En Colombia, la Ley 23 de 1982 protege la obra durante la vida del autor y 80 años más. Por tanto: escribir nuestros propios textos, citar con referencia y **no copiar párrafos**. Se recomienda crear un `fuentes.md` por capítulo.

| Fuente | URL | Estado de derechos | Verificación | Para qué nos sirve |
|---|---|---|---|---|
| Banco de la República: Enciclopedia | https://enciclopedia.banrepcultural.org/ | Protegido: solo citar | El sitio responde 200, pero la búsqueda interna tiene protección antibots, así que **no se pudieron confirmar las entradas de cada mito**. Buscar en el navegador. | Entradas de enciclopedia sobre folclor, regiones y personajes. Es la fuente institucional de referencia. |
| Banco de la República: Biblioteca Virtual / Babel | https://www.banrepcultural.org/biblioteca-virtual · https://babel.banrepcultural.org/ | Mixto: hay obras antiguas digitalizadas que **pueden ser de dominio público** (revisar autor y fecha de cada una). El resto, solo citar. | 200 | Libros y revistas digitalizados (Boletín Cultural y Bibliográfico, crónicas regionales), grabados e imágenes de época para la ambientación. |
| Instituto Caro y Cuervo: Biblioteca digital | https://bibliotecadigital.caroycuervo.gov.co/ · https://www.caroycuervo.gov.co/ | Protegido: solo citar | 200 | Léxico regional y tradición oral. El **Atlas Lingüístico-Etnográfico de Colombia (ALEC)**, con datos recogidos entre 1956 y 1978 en 262 localidades, documenta vocabulario y creencias por región, útil para que los diálogos de cada capítulo suenen auténticos. No se verificó el portal de consulta en línea del ALEC. |
| Ministerio de las Culturas | https://www.mincultura.gov.co/ | Protegido: solo citar | 200 | Patrimonio inmaterial y listas representativas. Sirve para tratar los mitos con respeto y contexto. |
| Radio Nacional de Colombia: «Leyendas del río Magdalena y el Tolima» | https://www.radionacional.co/cultura/historia-colombiana/leyendas-del-rio-magdalena-y-el-tolima-mitos-y-leyendas-de-colombia | Protegido: solo citar | 200 | **Muy pertinente para el Cap. I (Tolima) y el Mohán.** Habla de relatos ribereños y de la Madremonte. |
| Radio Nacional: mitos colombianos (Halloween) | https://radionacional.co/cultura/halloween-colombia-mitos-leyendas | Protegido: solo citar | 200 | Panorama que incluye la Patasola y el Mohán. Útil como resumen divulgativo. |
| Javier Ocampo López: *Mitos, leyendas y relatos colombianos* | Registro: https://openlibrary.org/works/OL33450800W | **Protegido** (Plaza & Janés, 2006, ISBN 9789581403714). Solo citar. | Wikipedia (consultada hoy) lo registra nacido en 1939 y no da fecha de muerte. | Clasificación de los mitos por región y tipología. Es la obra de consulta principal. También existen *Mitos colombianos* (El Áncora, 1988) y *Leyendas populares colombianas* (1996). Conviene buscarlos en la Biblioteca Luis Ángel Arango. |
| Instituto Humboldt: *El bosque seco tropical en Colombia* (Pizano y García, eds., 2014) | https://www.humboldt.org.co/ (no se halló el PDF oficial; ISBN 9789588343976) | Protegido: solo citar | Libro confirmado por registros académicos | **Bioma del Cap. I** (el sur del Tolima es bosque seco). Especies, estructura y estado: según el libro, queda alrededor del 8 % de la cobertura original. Sirve para decidir la vegetación (cactus columnares, ceibas, matorral espinoso) y la fauna sonora. |
| IDEAM: Mapa de ecosistemas continentales, costeros y marinos (1:100.000) | https://www.ideam.gov.co/ · SIAC: https://www.siac.gov.co/ | Datos públicos; **licencia exacta no verificada** | Versión 2.1 (2017) según el visualizador del IDEAM. Un tercero reporta una edición 2024 no confirmada en la fuente oficial. | Ubicar con rigor los biomas de cada capítulo: manglar del Pacífico (La Tunda), Llanos (El Silbón), páramo, ciénagas del Caribe (Hombre Caimán). Sirve para paletas, vegetación y clima. |

---

## 8. Documentación de producción

### Plantillas de GDD

| Plantilla | URL | Licencia | Para qué nos sirve |
|---|---|---|---|
| Omie's Assets GDD template (PDF + **Markdown**) | https://omies-assets.itch.io/gdd-template | Gratis (no se verificó la licencia) | El formato Markdown cabe directo en `docs/GDD.md` y se versiona con git. |
| Simple GDD Template (artsybarrels) | https://artsybarrels.itch.io/simple-gdd-template | CC BY 4.0 (según el buscador) | Plantilla breve en .docx y .pdf. |
| «A GDD template for the indie developer» | https://www.gamedeveloper.com/design/a-gdd-template-for-the-indie-developer | Lectura gratuita | Estructura pensada para equipos pequeños. |

**Sugerencia:** un `docs/GDD.md` con pilares (máximo 3: *folclor respetuoso*, *miedo por sonido*, *exploración tranquila entre picos de pánico*), bucle de juego, una ficha por mito (fuentes, reglas de la criatura, bioma, paleta, sonido) y una ficha por parte (objetivo, paso de datos, tensión esperada 0–1).

### Publicación

| Plataforma | URL | Coste | Datos verificados | Para qué nos sirve |
|---|---|---|---|---|
| itch.io (HTML5) | https://itch.io/docs/creators/html5 | Gratis (reparto de ingresos configurable) | ZIP con **≤ 1.000 archivos**, **≤ 500 MB** descomprimido, **≤ 200 MB** por archivo y rutas de **≤ 240 caracteres**. Ofrece botón de pantalla completa. | Publicación con comunidad de terror indie, página de juego y devlogs. `vite build` con `base: './'`, comprimir `dist/` y subir. |
| GitHub Pages | https://docs.github.com/en/pages · https://vite.dev/guide/static-deploy | Gratis (repo público) | Guía oficial de Vite para desplegar con GitHub Actions | Demo continua de cada versión; útil para QA y para compartir enlaces. `base: '/<repo>/'`. |

### Lista de comprobación antes de publicar

**Técnica**
- [ ] `vite build` sin advertencias. Prueba con `vite preview`, nunca solo en modo dev.
- [ ] Funciona en Chrome, Edge, Firefox y Safari (WebGL2). Si WebGL falla, mostrar un mensaje claro.
- [ ] Mantiene 60 FPS en un portátil con gráfica integrada en el preset «bajo». Revisar `renderer.info` (draw calls, triángulos, geometrías y texturas que no crecen con el tiempo, para descartar fugas sin `dispose`).
- [ ] El `AudioContext` se crea o reanuda tras el primer clic, por la política de autoplay.
- [ ] Pointer Lock: salir con Esc pausa el juego, y volver no hace saltar la cámara.
- [ ] Al perder el foco (`visibilitychange`) el juego se pausa, el audio se silencia y la criatura se congela.
- [ ] Guardado: guardar, recargar y continuar en el mismo paso. Probar migración desde todas las versiones anteriores. Probar con el almacenamiento lleno o bloqueado (modo privado) sin que el juego se rompa.
- [ ] Vitest y Playwright en verde. Prueba de humo de cada capítulo saltando partes con `?debug`.
- [ ] Sin `console.error`. Panel de depuración desactivado en producción.

**Juego y contenido**
- [ ] Las 14 partes se pueden completar, y ninguna misión queda bloqueada si se recoge un objeto antes de tiempo.
- [ ] La criatura nunca aparece dentro del radio de una fogata ni atascada en el terreno, y no hay muertes injustas sin aviso sonoro previo.
- [ ] El perro no bloquea el paso ni se pierde (se teletransporta si queda lejos y fuera de vista).
- [ ] Ortografía en español revisada (tildes, ¿¡). Los nombres de lugares y mitos se escriben como en las fuentes.

**Accesibilidad y legal**
- [ ] Subtítulos y descripciones de sonidos clave. Tamaño de texto, sensibilidad, reasignación de teclas y opción de reducir grano y movimiento de cámara.
- [ ] Aviso de contenido (terror, sustos, luces) al iniciar.
- [ ] Créditos con atribuciones obligatorias (game-icons.net CC BY 3.0, sonidos de Freesound CC BY y licencias de las fuentes OFL incluidas).
- [ ] `fuentes.md` de cada capítulo con bibliografía cultural.

---

## Hoja de ruta sugerida

### Fase 1: ahora (esta semana)
**Adoptar**
- Bucle de **paso fijo** y **FSM** genérica (Gaffer y Nystrom). Es la base de todo lo demás y no tiene dependencias.
- **Bus de eventos** y misiones dirigidas por datos con **ids estables**.
- **Formato de guardado versionado** con `migrations.js`, exportar e importar partida y `navigator.storage.persist()`, todavía sobre localStorage.
- Herramientas de desarrollo: **lil-gui**, **stats-gl** y la extensión **Spector.js**, solo con `?debug`.
- **Vitest** para lógica pura (misiones, migraciones, colisiones y FSM de la criatura).
- Tipografías **Atkinson Hyperlegible Next** (texto) e **IM Fell English** (títulos), autoalojadas.

**No adoptar todavía:** Rapier, ningún ECS, nube ni telemetría. Ahora no aportan nada y añaden complejidad.

### Fase 2: próximas semanas
**Adoptar**
- **pmndrs/postprocessing**: grano, viñeta y aberración ligados al *director de tensión*. Fijar three en 0.187.x mientras el peer de postprocessing sea `<0.188`.
- **three-mesh-bvh** para la línea de visión de la criatura y raycasts de interacción.
- **IA en dos capas** (director y criatura con sentidos y memoria), inspirada en *Alien: Isolation* y *Left 4 Dead*, con FSM propia.
- **Playwright**: prueba de humo y de guardado y carga con un `window.__game` de pruebas.
- Terreno por **chunks** con carga y descarga alrededor del jugador (referencia: SimonDev ProceduralTerrain).
- **Subtítulos de sonidos** y menú de accesibilidad.
- `docs/GDD.md` y un `fuentes.md` por capítulo. Publicar una **demo del Cap. I** en GitHub Pages o itch.io (en borrador).

**No adoptar todavía:** **inkjs**, salvo que los diálogos empiecen a ramificar; los datos JS actuales bastan. Tampoco **recast-navigation**: en campo abierto bastan steering y A* en rejilla. **Yuka** no entra como dependencia porque está parado desde 2023.

### Fase 3: más adelante (cuando haya 2–3 capítulos)
**Evaluar o adoptar**
- **recast-navigation-js** cuando haya caseríos, puentes o interiores.
- **mistreevous** (árboles de comportamiento) si la FSM de las criaturas crece demasiado.
- **inkjs** + Inky para diálogos con ramas y variables.
- **idb** (IndexedDB) si hay muchas ranuras, capturas o autoguardado frecuente.
- Pipeline glTF (**Blender 5.x**, **glTF-Transform**, Meshopt y KTX2) si se introducen modelos o texturas horneadas con **Material Maker**.
- **Supabase** solo si se quieren logros o guardado en la nube, con telemetría opcional y aviso de privacidad.

**No adoptar (salvo que cambie el alcance):** Howler (no hay archivos de audio), localForage (está parado), bitECS (sobredimensionado), Yarn Spinner JS (runtime de terceros con poca actividad) y Turso desde el cliente (expone el token).
