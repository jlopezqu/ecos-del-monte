// Índice de capítulos. Cada capítulo es un mito y una región de Colombia.
// Solo el I está construido; los demás fijan el plan de la saga.
import { PATASOLA } from './patasola.js';

export const CHAPTERS = [
  PATASOLA,
  { locked: true, num: 'II', name: 'El Mohán', region: 'Alto Magdalena · Tolima y Huila', biome: 'Río grande, playones y cuevas de piedra',
    hook: 'Las lavanderas no vuelven del río. En las piedras, de noche, alguien fuma tabaco.' },
  { locked: true, num: 'III', name: 'La Madremonte', region: 'Antioquia y Viejo Caldas', biome: 'Bosque de niebla y cafetales',
    hook: 'Corrieron un lindero monte adentro. Desde entonces los caminos ya no llevan a donde llevaban.' },
  { locked: true, num: 'IV', name: 'La Tunda', region: 'Pacífico · Nariño, Cauca y Chocó', biome: 'Manglar, esteros y selva lluviosa',
    hook: 'Un niño se fue detrás de su mamá hacia el manglar. Su mamá estaba en la casa.' },
  { locked: true, num: 'V', name: 'El Silbón', region: 'Llanos · Casanare y Arauca', biome: 'Sabana inundable y matas de monte',
    hook: 'Si el silbido suena cerca, está lejos. Si suena lejos, ya no hay nada que hacer.' },
  { locked: true, num: 'VI', name: 'El Hombre Caimán', region: 'Caribe · Plato, Magdalena', biome: 'Ciénagas y caños del bajo Magdalena',
    hook: 'En la ciénaga algo mira a las bañistas. Tiene cuerpo de caimán y ojos de hombre.' },
  { locked: true, num: 'VII', name: 'La Candileja', region: 'Tolima y Llanos', biome: 'Caminos reales y sabanas',
    hook: 'Tres luces persiguen a los arrieros que viajan de noche. Entre más rezan, más se acercan.' },
  { locked: true, num: 'VIII', name: 'El Sombrerón', region: 'Antioquia, Tolima y Huila', biome: 'Caminos de arriería en la cordillera',
    hook: 'Un jinete de negro con dos perros encadenados sigue a los que vuelven tarde de la fonda.' },
];
