// Mundo libre: el pueblo sin encargo de Bogotá. El reloj corre, hay vehículos, vecinos y encargos
// que se toman hablando con quien tiene una letra en el mapa. Los pasos usan el mismo motor que la historia;
// `limit` es un tiempo máximo en segundos: si se agota, el encargo falla y se puede volver a pedir.

const ELVIA = 'Doña Elvia', INSP = 'Inspector Bríñez', ROSALBA = 'Rosalba', PADRE = 'Padre Anselmo', CUSTODIA = 'Ña Custodia';

export const LIBRE = {
  free: true, kicker: 'Mundo libre', title: 'San Jerónimo del Monte', place: 'Sur del Tolima · a tu aire',
  region: 'tolima', env: 'DAY', spawn: { at: [2, 41], yaw: 0 }, dog: true, loot: true,
  intro: ['No hay encargo de Bogotá. Camina, o maneja la chiva, el campero, la moto o la mula.', 'Las letras del mapa (tecla M) son vecinos con encargos.', 'De noche, el monte sigue siendo el monte.'],
  npcs: { elvia: { at: 'tienda', face: 1.57 }, inspector: { at: 'inspeccion', face: 1.57 }, rosalba: { at: 'rosalba', face: -1.57 }, padre: { at: 'capilla', face: 0 }, custodia: { at: 'custodia', face: -1.57 } },
  steps: [],
};

export const MISSIONS = [
  {
    id: 'mercado', giver: 'rosalba', letter: 'R', title: 'El mercado', reward: 30,
    offer: [
      [ROSALBA, 'Llegó el mercado y no tengo quién lo reparta.'],
      [ROSALBA, 'Son tres bultos: uno para Ña Custodia, otro para el aserrío y otro para la capilla. Están frente a la tienda. En carro le rinde más.'],
    ],
    steps: [
      { type: 'interact', text: 'Recoge los bultos frente a la tienda', targets: [{ name: 'los bultos', kind: 'bulto', at: [-16.2, 10.2], give: 'Bultos del mercado' }] },
      { type: 'reach', at: 'custodia', r: 9, limit: 120, text: 'Lleva un bulto donde Ña Custodia, al oriente' },
      { type: 'reach', at: 'aserrio', r: 12, limit: 110, text: 'Lleva otro al aserrío, al norte' },
      { type: 'reach', at: ['capilla', 0, 3], r: 7, limit: 110, text: 'Deja el último en la capilla' },
      { type: 'talk', npc: 'rosalba', text: 'Avísale a Rosalba', lines: [[ROSALBA, 'Dios le pague. Tome, para la gasolina.']] },
    ],
  },
  {
    id: 'ronda', giver: 'inspector', letter: 'I', title: 'La ronda', reward: 40,
    offer: [
      [INSP, 'Tengo que hacer la ronda y la rodilla no me da.'],
      [INSP, 'Hágala usted: la salida, el aserrío, la ceiba grande, el rancho de Ña Custodia y la parada. Sin demorarse, que no es paseo.'],
    ],
    steps: [
      { type: 'reach', at: 'salida', r: 10, limit: 45, text: 'Ronda: la salida del pueblo, detrás de la capilla' },
      { type: 'reach', at: 'aserrio', r: 12, limit: 50, text: 'Ronda: el aserrío' },
      { type: 'reach', at: 'ceiba', r: 13, limit: 65, text: 'Ronda: la ceiba grande' },
      { type: 'reach', at: 'custodia', r: 10, limit: 65, text: 'Ronda: el rancho de Ña Custodia' },
      { type: 'reach', at: 'parada', r: 9, limit: 55, text: 'Ronda: la parada de la chiva' },
      { type: 'talk', npc: 'inspector', text: 'Dale el parte al inspector', lines: [[INSP, 'Sin novedad, entonces. Así me gusta: que no pase nada y que quede escrito.']] },
    ],
  },
  {
    id: 'velas', giver: 'padre', letter: 'P', title: 'Velas para las ánimas', reward: 90,
    offer: [
      [PADRE, 'Hay tres cruces viejas monte adentro. Nadie les prende una vela desde hace años.'],
      [PADRE, 'Yo ya no estoy para esas trochas. Llévese las velas y al perro. Y si lo llaman por el nombre, usted siga derecho.'],
    ],
    steps: [
      {
        type: 'interact', text: 'Enciende una vela en cada una de las tres cruces del monte', threat: { mode: 'stalk', charge: 0.04, delay: 25 },
        targets: [
          { name: 'una vela en la cruz', verb: 'Encender', kind: 'vela', at: ['cruz3', 0.6, 1.2] },
          { name: 'una vela en la cruz', verb: 'Encender', kind: 'vela', at: ['cruz2', 0.6, 1.2] },
          { name: 'una vela en la cruz', verb: 'Encender', kind: 'vela', at: ['cruz1', 0.6, 1.2] },
        ],
      },
      { type: 'talk', npc: 'padre', threat: null, text: 'Vuelve donde el padre Anselmo', lines: [[PADRE, 'Tres velas. Tres almas menos penando. Vaya con Dios.']] },
    ],
  },
  {
    id: 'gallinas', giver: 'elvia', letter: 'E', title: 'Gallinas sueltas', reward: 20,
    offer: [
      [ELVIA, 'Se me volaron cinco gallinas con el alboroto de la chiva.'],
      [ELVIA, 'Andan por las orillas del pueblo. Antes de que se las coma el zorro, hágame el favor.'],
    ],
    steps: [
      {
        type: 'interact', limit: 170, text: 'Atrapa las gallinas en las orillas del pueblo',
        targets: [[-36, 14], [34, -24], [-30, -30], [40, 20], [6, 54]].map((at) => ({ name: 'la gallina', verb: 'Atrapar', kind: 'gallina', at })),
      },
      { type: 'talk', npc: 'elvia', text: 'Llévaselas a Doña Elvia', lines: [[ELVIA, 'Completicas. Tome estos pesos, y una gaseosa por la carrera.']] },
    ],
  },
  {
    id: 'yerbas', giver: 'custodia', letter: 'C', title: 'Yerbas del monte', reward: 35,
    offer: [
      [CUSTODIA, 'Se me acabó la ruda, la albahaca morada, el paico y la verbena.'],
      [CUSTODIA, 'Crecen del pueblo hacia arriba, a la orilla del camino. Arránquelas con la mano izquierda y no mire para atrás.'],
    ],
    steps: [
      {
        type: 'interact', text: 'Recoge las cuatro yerbas camino del aserrío',
        targets: [['ruda', [-22, -96]], ['albahaca morada', [30, -118]], ['paico', ['aserrio', -15, 6]], ['verbena', [44, -146]]].map(([n, at]) => ({ name: 'la ' + n, verb: 'Arrancar', kind: 'yerba', at })),
      },
      { type: 'talk', npc: 'custodia', text: 'Llévale las yerbas a Ña Custodia', lines: [[CUSTODIA, 'Buena mano tiene. Con esto rezo media vereda.']] },
    ],
  },
];

// Lo que cuentan los vecinos: rumores de otros mitos (los capítulos que vienen).
export const RUMORS = [
  'Dicen que por el Magdalena, más abajo de Honda, un hombre peludo fuma tabaco en las piedras y se lleva a las lavanderas.',
  'Mi compadre arriero vio tres candelas persiguiéndolo por el camino real. Se puso a rezar y se le vinieron encima.',
  'En Antioquia corrieron un lindero y el monte se les cerró. Dicen que es la Madremonte, que no perdona.',
  'Al que vuelve tarde de la fonda dizque lo sigue un jinete de negro, con sombrero grande.',
  'Los llaneros cuentan de un silbido: si lo oye cerquita, tranquilo, que está lejos. Si lo oye lejos, corra.',
  'Aquí nadie tumba monte de noche. Ni pagando doble.',
  'El perro de Fidel bajó solo. Desde ese día no ha vuelto a ladrar.',
  'La chiva sale martes y sábados. Si el chofer amanece enguayabado, no sale.',
  'Ña Custodia reza el mal de ojo, la culebrilla y lo otro. De lo otro no se habla.',
  'El padre deja la capilla abierta toda la noche. Algo sabrá.',
  'Si va a subir, lleve perro. Y candela. Y no conteste si lo llaman.',
  'En Plato cuentan de un hombre que se volvió caimán por andar mirando a las bañistas.',
];
