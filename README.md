# Ecos del Monte

Terror en primera persona de mundo abierto sobre mitos y leyendas de Colombia. Cada capítulo investiga un mito en su región.
El **Capítulo I — La Patasola** (sur del Tolima) está completo, con 14 partes.

**Jugar en línea:** https://jlopezqu.github.io/ecos-del-monte/ (mejor en computador, con teclado, ratón y audífonos).

## Cómo jugar

```bash
npm install
npm run dev        # abre http://localhost:5173
```

Controles: `WASD` mover · ratón mirar · `Shift` correr · `C` agacharse · `E` usar · `F` linterna · `Tab` diario.

Reglas del monte: la criatura no se acerca a las **fogatas encendidas** ni donde hay **perro**. Si la alumbras mientras acecha, se esfuma. No le contestes.

Para publicar: `npm run build` deja el juego en `dist/` (rutas relativas; sirve para itch.io o GitHub Pages).

## Cómo está hecho

| Archivo | Qué contiene |
|---|---|
| `src/main.js` | Bucle, jugador, criatura, perro, motor de misiones, menú y HUD |
| `src/world.js` | Terreno, bosque por bloques, pueblo del Tolima, calle de Bogotá, fogatas, colisiones |
| `src/entities.js` | Personajes, la Patasola (señuelo y forma real), Canelo, objetos |
| `src/audio.js` | Todo el sonido, sintetizado con WebAudio |
| `src/chapters/patasola.js` | Las 14 partes como datos: pasos `talk`, `interact`, `reach`, `survive` |
| `src/chapters/index.js` | Lista de capítulos (II a VIII están planeados, no construidos) |
| `docs/RECURSOS.md` | Investigación: repositorios, librerías, arquitectura, persistencia, arte |
| `docs/MITOS.md` | Contexto de los mitos y sus regiones |

No hay modelos, texturas ni audios externos: todo es procedural.

## Pruebas

- `http://localhost:5173/?selftest` recorre las 14 partes de forma automática y muestra el resultado en pantalla.
- `?part=5` salta a una parte. Con `&auto` se omiten tarjetas y diálogos.
- `?all` desbloquea todas las partes en el menú de capítulos.
- `?q=low` reduce la densidad del bosque en equipos lentos.
- `?debug` expone `window.__game` para pruebas.

## Añadir un capítulo

Crea `src/chapters/<mito>.js` con la misma forma que `patasola.js` (personajes, partes, pasos) y regístralo en `src/chapters/index.js`.
Una región nueva (manglar, llano, ciénaga) es una función `build…()` en `src/world.js` que devuelve la misma interfaz que `buildTolima()`.

## Publicación

Cada envío a la rama `main` compila el juego y lo publica en GitHub Pages (`.github/workflows/deploy.yml`).

## Créditos y derechos

- Código, textos y diseño del juego: todos los derechos reservados por sus autores (todavía sin licencia de reutilización).
- Fotos de las tarjetas de cada parte: Wikimedia Commons, bajo licencias CC BY-SA. Autores, licencias y enlaces en `CREDITOS.md`.
- Los mitos son tradición oral colombiana. Las fuentes consultadas están en `docs/MITOS.md`.
