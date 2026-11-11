# Ecos del Monte

Terror de mundo abierto, en primera o tercera persona, sobre mitos y leyendas de Colombia. Cada capítulo investiga un mito en su región.
El **Capítulo I — La Patasola** (sur del Tolima) está completo, con 14 partes.

**Jugar en línea:** https://jlopezqu.github.io/ecos-del-monte/ (mejor en computador, con teclado, ratón y audífonos).

## Cómo jugar

```bash
npm install
npm run dev        # abre http://localhost:5173
```

Controles a pie: `WASD` mover · ratón mirar · `Shift` correr · `C` agacharse · `E` usar, hablar o subir a un vehículo · `F` linterna · `Tab` diario · `V` cámara en primera o tercera persona · `M` mapa · `1` a `6` usar un insumo del morral · `Esc` o `P` pausa (desde ahí se vuelve al menú de inicio).

Al volante (o sobre la mula): `W` acelerar · `S` frenar o reversa · `A`/`D` girar · `Espacio` freno de mano · `H` pito · `F` luces · `E` bajar.

Arriba a la derecha hay un minimapa que gira con la mirada: muestra el relieve, los caminos, las fogatas, a la gente y el objetivo actual. La criatura no aparece en él.

El botón **Gráficos** del menú alterna entre calidad alta (texturas con relieve, sombras, muebles y personas modelados en 3D) y baja (color plano, sin sombras, bosque menos denso, figuras hechas por código) para equipos lentos.

Reglas del monte: la criatura no se acerca a las **fogatas encendidas**, ni a las **velas benditas**, ni donde hay **perro**, y **no entra a las casas**. Si la alumbras mientras acecha, se esfuma. No le contestes.

Para publicar: `npm run build` deja el juego en `dist/` (rutas relativas; sirve para itch.io o GitHub Pages).

## El pueblo

- **Casas con interior.** Las diez construcciones del pueblo (tienda, inspección, capilla, casas y el rancho de Ña Custodia) tienen puerta que se abre sola al acercarse, piso, cielo raso y muebles. Se entra caminando. Adentro la criatura no entra.
- **Tienda.** Doña Elvia vende insumos por pesos: pilas, panela, botiquín, velas benditas, gasolina y huesos para Canelo. Lo comprado va al morral y se usa con las teclas `1` a `6`.
- **Hablar con todos.** Cada personaje abre un menú: pedir un encargo, comprar, conversar o preguntar por un lugar (queda marcado en el mapa con la ruta). Las personas gesticulan mientras hablan.
- **Gasolina.** Los vehículos de motor la gastan; se compra en la tienda y se echa estando junto al vehículo.

## Mundo libre

Desde el menú, **Mundo libre** deja el pueblo sin encargo de Bogotá:

- El reloj corre (una hora de juego dura minuto y medio) y el ambiente cambia de día a noche. De día hay vecinos caminando, gallinas y vacas; al anochecer se recogen.
- Hay cuatro vehículos manejables: la chiva, el campero, la moto y la mula. Fuera del camino andan más despacio y chocan con los árboles.
- Donde anda la Patasola no pasan motores ni bestias: el motor se ahoga y la mula tumba al jinete. Las persecuciones siguen siendo a pie.
- Los vecinos con una letra en el mapa dan encargos (reparto, ronda contrarreloj, velas en las cruces, gallinas, yerbas). Pagan en pesos; si se acaba el tiempo, el encargo falla y se puede volver a pedir.
- El mapa grande (`M`) muestra caminos, lugares, vehículos y encargos. Un clic marca un destino y el GPS dibuja la ruta por los caminos, también en el minimapa.

Los vehículos, las casas, la tienda y el mapa también están disponibles durante la historia.

## Cómo está hecho

| Archivo | Qué contiene |
|---|---|
| `src/main.js` | Bucle, jugador, criatura, perro, motor de misiones, tienda, morral, mapa, menú y HUD |
| `src/world.js` | Terreno, bosque por bloques, pueblo del Tolima, calle de Bogotá, fogatas, colisiones |
| `src/buildings.js` | Casas con interior: muros, puerta, piso, cielo raso y muebles según el tipo de casa |
| `src/entities.js` | Personajes hechos por código (calidad baja), la Patasola, Canelo, objetos |
| `src/people.js` | Personas reales: viste los modelos 3D con los colores de cada personaje y les pone sombrero, pañoleta, ruana o sotana |
| `src/models.js` | Carga de personas con esqueleto y animaciones (GLB) |
| `src/props.js` | Carga de muebles y objetos modelados (GLB) |
| `src/items.js` | Insumos de la tienda |
| `src/audio.js` | Todo el sonido, sintetizado con WebAudio |
| `src/chapters/patasola.js` | Las 14 partes como datos: pasos `talk`, `interact`, `reach`, `survive` |
| `src/chapters/index.js` | Lista de capítulos (II a VIII están planeados, no construidos) |
| `src/chapters/libre.js` | Mundo libre: encargos de los vecinos y rumores |
| `src/vehicles.js` | La chiva, el campero, la moto y la mula: modelos y física |
| `src/life.js` | Vecinos con rutina de día, gallinas y vacas |
| `tools/blender/` | Guiones para generar personas con Blender y MPFB (MakeHuman) y dejarlas listas para la web |
| `docs/RECURSOS.md` | Investigación: repositorios, librerías, arquitectura, persistencia, arte |
| `docs/MITOS.md` | Contexto de los mitos y sus regiones |
| `docs/TEXTURAS.md` | Investigación: texturas con relieve, luz, vegetación y rutas para personas realistas |
| `docs/MODELOS.md`, `docs/PROPS.md` | De dónde sale cada modelo, su licencia y cómo añadir más |
| `public/tex/` | Materiales PBR reales (color, normal y rugosidad) de ambientCG, CC0 |
| `public/props/` | 31 muebles y objetos de Poly Haven, CC0 |
| `public/models/` | Personas (MakeHuman, CC0) y animaciones (Mesh2Motion, CC0) |
| `public/fotos/` | Fotos de las tarjetas de cada parte |

El terreno, las casas, los vehículos, los animales y el sonido se generan por código. En calidad alta, los muebles son modelos escaneados de dominio público y las personas son cuerpos de MakeHuman con esqueleto y animaciones (caminar, hablar, sentarse, alumbrar); `people.js` cambia el color de su ropa y de su piel por los de cada personaje y modela el sombrero, la pañoleta, la ruana y la sotana a la medida de cada cuerpo. Las superficies usan materiales reales con mapa de color, de relieve (normal) y de rugosidad; la textura se proyecta en coordenadas de mundo para que no se estire, y la linterna y el sol proyectan sombras.

### Herramientas para modelar

Las personas se generan fuera del juego con **Blender** y la extensión **MPFB** (MakeHuman), y se optimizan con **glTF Transform** (`npm run` no las necesita: los modelos ya están en `public/`). El procedimiento completo, con las rutas de instalación, está en `docs/MODELOS.md`.

## Pruebas

- `http://localhost:5173/?selftest` recorre las 14 partes de forma automática y muestra el resultado en pantalla.
- `?part=5` salta a una parte. Con `&auto` se omiten tarjetas y diálogos.
- `?all` desbloquea todas las partes en el menú de capítulos.
- `?q=low` fuerza la calidad gráfica baja (igual que el botón Gráficos del menú).
- `?debug` expone `window.__game` para pruebas.
- `?free` entra directo al mundo libre (con `&auto` sin tarjeta; `&veh=jeep`, `&view=tp`, `&hour=21`, `&map`, `&shop` para probar cosas concretas).
- Páginas de revisión de modelos: `gente.html` (los personajes ya vestidos; `?fila=1` vecinos, `?zoom=1`, `?a=walk`), `modelos.html` y `cabezas.html` (los cuerpos sin vestir) y `props.html` (muebles y objetos).

## Añadir un capítulo

Crea `src/chapters/<mito>.js` con la misma forma que `patasola.js` (personajes, partes, pasos) y regístralo en `src/chapters/index.js`.
Una región nueva (manglar, llano, ciénaga) es una función `build…()` en `src/world.js` que devuelve la misma interfaz que `buildTolima()`.

## Publicación

Cada envío a la rama `main` compila el juego y lo publica en GitHub Pages (`.github/workflows/deploy.yml`).

## Créditos y derechos

- Código, textos y diseño del juego: todos los derechos reservados por sus autores (todavía sin licencia de reutilización).
- Fotos de las tarjetas de cada parte: Wikimedia Commons, bajo licencias CC BY-SA. Autores, licencias y enlaces en `CREDITOS.md`.
- Texturas de los materiales: ambientCG (https://ambientcg.com), dominio público (CC0 1.0).
- Muebles y objetos: Poly Haven (https://polyhaven.com), dominio público (CC0 1.0).
- Personas: assets de la comunidad MakeHuman (CC0 1.0). Esqueleto y animaciones: Mesh2Motion (CC0 1.0).
- Los mitos son tradición oral colombiana. Las fuentes consultadas están en `docs/MITOS.md`.

La lista completa, archivo por archivo, está en `CREDITOS.md`.
