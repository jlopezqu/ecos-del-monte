# Créditos de las fotografías

Las fotos que aparecen en las tarjetas de cada parte provienen de Wikimedia Commons y se usan bajo sus licencias Creative Commons, que exigen citar al autor y mantener la misma licencia en obras derivadas de la foto.

| Archivo | Título en Commons | Autor y licencia | Fuente |
|---|---|---|---|
| `public/fotos/bogota1.jpg` | 2019 Bogotá - Edificio en La Candelaria (cra 3 calle 12 A) | Felipe Restrpo Acosta · CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:2019_Bogot%C3%A1_-_Edificio_en_La_Candelaria_(cra_3_calle_12_A).jpg |
| `public/fotos/bogota2.jpg` | Bogotá, Cerros Monserrate y Guadalupe - panoramio | Alonso Cárdenas · CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Bogot%C3%A1,_Cerros_Monserrate_y_Guadalupe_-_panoramio.jpg |
| `public/fotos/tolima3.jpg` | Panorámica nocturna de parte de la ciudad de Ibagué | rz · CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Panor%C3%A1mica_nocturna_de_parte_de_la_ciudad_de_Ibagu%C3%A9.jpg |
| `public/fotos/tolima1.jpg` | Paisaje mañanero de la Cordillera Central y del Nevado del Tolima (41811613732) | Alejandro  Bayer Tamayo from Armenia, Colombia · CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Paisaje_ma%C3%B1anero_de_la_Cordillera_Central_y_del_Nevado_del_Tolima_(41811613732).jpg |

# Créditos de las texturas

Los materiales (color, normal y rugosidad) provienen de ambientCG y son de dominio público (CC0 1.0): no exigen atribución, pero se listan aquí por transparencia. Se redujeron a 512–1024 px y la oclusión ambiental se horneó en el color.

| Archivos | Material en ambientCG | Licencia | Fuente |
|---|---|---|---|
| `public/tex/ground_*.jpg` | Ground106 | CC0 1.0 | https://ambientcg.com/a/Ground106 |
| `public/tex/leaves_*.jpg` | ScatteredLeaves009 | CC0 1.0 | https://ambientcg.com/a/ScatteredLeaves009 |
| `public/tex/bark_*.jpg` | Bark014 | CC0 1.0 | https://ambientcg.com/a/Bark014 |
| `public/tex/foliage_*.jpg` | Grass001 | CC0 1.0 | https://ambientcg.com/a/Grass001 |
| `public/tex/plaster_*.jpg` | PaintedPlaster017 | CC0 1.0 | https://ambientcg.com/a/PaintedPlaster017 |
| `public/tex/rooftile_*.jpg` | RoofingTiles014A | CC0 1.0 | https://ambientcg.com/a/RoofingTiles014A |
| `public/tex/cobble_*.jpg` | PavingStones150 | CC0 1.0 | https://ambientcg.com/a/PavingStones150 |
| `public/tex/planks_*.jpg` | Planks037A | CC0 1.0 | https://ambientcg.com/a/Planks037A |
| `public/tex/rock_*.jpg` | Rock058 | CC0 1.0 | https://ambientcg.com/a/Rock058 |
| `public/tex/fabric_*.jpg` | Fabric086 | CC0 1.0 | https://ambientcg.com/a/Fabric086 |
| `public/tex/zinc_*.jpg` | CorrugatedSteel005 | CC0 1.0 | https://ambientcg.com/a/CorrugatedSteel005 |

# Créditos de los muebles y objetos

Los 31 modelos de `public/props/` (mesas, sillas, camas, alacenas, barriles, vasijas, lámparas, canastos y demás) provienen de Poly Haven y son de dominio público (CC0 1.0). Se redujeron a 5 000 triángulos o menos, con texturas WebP de 512 a 1024 px. La página de origen de cada uno está en el campo `source` de `public/props/index.json`; el detalle, en `docs/PROPS.md`.

| Archivos | Fuente | Licencia |
|---|---|---|
| `public/props/*.glb` | Poly Haven · https://polyhaven.com | CC0 1.0 |

# Créditos de las personas y sus animaciones

Todo lo que hay en `public/models/` es de dominio público (CC0 1.0): no exige atribución, pero se lista por transparencia.

| Archivos | Qué es | Fuente | Licencia |
|---|---|---|---|
| `public/models/personas/*.glb` | Cuatro personas (hombre, hombre mayor, mujer, mujer mayor): cuerpo, piel, ropa, pelo, cejas y ojos de los *system assets* de la comunidad MakeHuman, generadas con MPFB 2.0.18 para Blender | https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html | CC0 1.0 |
| `public/models/anim/*.glb` | Nueve animaciones humanas (quieto, caminar, hablar, sentarse, rezar, alumbrar) y el esqueleto al que van atadas las personas | Mesh2Motion · https://github.com/Mesh2Motion/mesh2motion-app | CC0 1.0 |
| `public/models/maniqui.glb`, `perro.glb`, `mula.glb`, `anim-perro/`, `anim-mula/` | Maniquí y animales de Mesh2Motion. El juego no los carga; quedan para la página de prueba `modelos.html` y como armadura de referencia de `tools/blender/` | Mesh2Motion | CC0 1.0 |

MPFB (el programa que genera las personas) es software GPL-3.0 y Blender es GPL: se usan como herramientas y no se redistribuyen con el juego. El sombrero, la pañoleta, la ruana y la sotana no vienen de ningún paquete: los modela `src/people.js`.

Origen, autor, licencia y enlace de cada archivo: `public/models/creditos.json`. Lo verificado y lo descartado: `docs/MODELOS.md`.
