#!/usr/bin/env bash
# Optimiza los GLB que exporta generar_persona.py y los copia a public/models/personas/.
# Uso (desde la raíz del proyecto): bash tools/blender/optimizar.sh <dir_con_glb_sin_optimizar> [tamaño_textura=512]
# Texturas a WebP de <= tamaño px (piel y ropa), geometría comprimida con Meshopt. No simplifica: la
# reducción de triángulos ya la hace Blender (Decimate) para no romper costuras de UV ni pesos.
set -e
src="$1"; size="${2:-512}"; dst="public/models/personas"; mkdir -p "$dst"
for f in "$src"/*.glb; do
  n=$(basename "$f")
  npx gltf-transform optimize "$f" "$dst/$n" --compress meshopt --texture-compress webp --texture-size "$size" \
    --simplify false --flatten false --join false --instance false --palette false
  echo "$n: $(stat -c %s "$dst/$n") bytes"
done
