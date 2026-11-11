# Objetos 3D (props): muebles y objetos

Modelos estáticos en `public/props/*.glb` que carga `src/props.js`. Hoja de prueba: `props.html`
(parámetros `?only=mesa,silla`, `?view=front|side|top|back`, `?cols=8`, `?zoom=1`, `?lw=1.6`).

## Fuente y licencia

Todos vienen de **Poly Haven** (https://polyhaven.com), licencia **CC0 1.0** (dominio público: se pueden
usar, modificar y redistribuir sin atribución obligatoria). La URL de origen de cada objeto está en el
campo `source` de `public/props/index.json`. Se descargó la variante glTF con texturas de 1k
(API `https://api.polyhaven.com/files/<id>`) el 11-11-2026.

## Presupuesto (portátil con gráfica integrada)

- 5 000 triángulos o menos por objeto (se simplifica con meshoptimizer si hace falta).
- Texturas de 512 px en WebP (1024 solo en muebles grandes), geometría comprimida con Meshopt.
- Idealmente menos de 500 KB por archivo y menos de 10 MB en total (hoy: 31 objetos, unos 4,5 MB).

## Uso en el juego

```js
import { loadProps, hasProp, makeProp, propSize } from './props.js';
await loadProps(['mesa', 'silla']);   // o loadProps() para todos; nunca lanza, devuelve cuántos cargó
const m = makeProp('mesa');           // THREE.Object3D o null si no está cargado
if (m) { m.position.set(x, 0, z); m.rotation.y = a; scene.add(m); }
propSize('mesa');                     // [ancho, alto, fondo] en metros
```

Cada objeto queda normalizado: origen en el centro de la base (apoya en y = 0), metros reales, frente
hacia +z, `castShadow` y `receiveShadow` activos. Los clones comparten geometría y materiales (no
llames `dispose()` en un clon si otros siguen en escena).

## Añadir un objeto nuevo

1. Busca en el catálogo: `https://api.polyhaven.com/assets?t=models` (mira `categories`, `tags`,
   `polycount`). Confirma en la página del objeto que la licencia es CC0.
2. Pide los enlaces con `https://api.polyhaven.com/files/<id>` y descarga `gltf → 1k → gltf` (el
   `.gltf`, su `.bin` y las texturas de `include`, respetando las rutas relativas) a una carpeta
   temporal, por ejemplo `.test/props/raw/<id>/`.
3. Optimiza (nombre en español, minúsculas, sin tildes):

   ```sh
   npx gltf-transform optimize .test/props/raw/<id>/<id>_1k.gltf public/props/<nombre>.glb \
     --texture-size 512 --texture-compress webp --compress meshopt \
     --simplify true --simplify-ratio 0.5 --simplify-error 0.001
   ```

   - Si el original ya tiene menos de 5 000 triángulos usa `--simplify false`.
   - Si no baja de 5 000, sube `--simplify-error` (0.003, 0.006…): el límite real lo pone el error,
     no la proporción. Cuenta los triángulos con `npx gltf-transform inspect public/props/<nombre>.glb`
     (columna `glPrimitives`).
   - Para muebles grandes puedes usar `--texture-size 1024`, vigilando el peso.
   - Si el archivo trae varias variantes (p. ej. plantas `_a`, `_b`, `_c`), deja solo una antes de
     optimizar (así se hizo con `helecho` y `anturio`).
4. Añade la entrada en `public/props/index.json` (`name`, `file`, `size`, `tris`, `kb`, `category`,
   `source`, `license`).
5. Si el frente no mira a +z o la postura no sirve, añade una corrección en `FIX` de `src/props.js`
   (`rotX`, `rotY`, `rotZ`, `scale`).
6. Revisa `props.html?only=<nombre>` con la figura de 1,70 m.

Los scripts usados para esta tanda (descarga y optimización por lotes) están en `.test/props/`
(`dl.py`, `build.mjs`, `list.json`); no forman parte del juego.

## No disponibles en CC0 (Poly Haven, 11-11-2026)

Costal o saco de fique, carreta o carretilla de madera, tramo de cerca de madera, pila de leña,
escritorio de época, crucifijo y mostrador de tienda: no hay modelos adecuados; se hacen por código.
