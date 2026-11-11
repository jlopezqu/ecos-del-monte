// Capítulo I — La Patasola (sur del Tolima). 14 partes.
// Cada parte es una lista de pasos declarativos: talk · interact · reach · survive.
// Los ganchos (onStart, onDone, onUse, onNear) reciben la API del juego `g`.

const AURELIO = 'Don Aurelio', ELVIA = 'Doña Elvia', INSP = 'Inspector Bríñez', ROSALBA = 'Rosalba', PADRE = 'Padre Anselmo',
  CUSTODIA = 'Ña Custodia', ELIECER = 'Eliécer', TU = 'Tú';

const HUNT = (speed, extra = {}) => ({ mode: 'hunt', speed, ...extra });
const STALK = (extra = {}) => ({ mode: 'stalk', ...extra });

export const PATASOLA = {
  id: 'patasola',
  num: 'I',
  kicker: 'Capítulo I',
  name: 'La Patasola',
  region: 'Sur del Tolima',
  biome: 'Bosque de tierra caliente, guaduales y quebradas',
  hook: 'Tres aserradores desaparecen monte adentro. En el pueblo nadie dice en voz alta lo que cree.',

  codex: {
    from: 5,
    title: 'La Patasola',
    text: 'Leyenda de tierra caliente, contada sobre todo en el Tolima Grande. Dicen que fue una mujer hermosa, casada con un labriego, que se dejó rondar por el patrón. El marido los sorprendió: a él le quitó la cabeza de un machetazo y a ella, de un solo tajo, la pierna. Murió desangrada en el monte, y el monte no la dejó ir. Anda en una sola pata rematada en pezuña y deja el rastro al revés, para que quien la busca crea que se aleja. De lejos es bella y llama con la voz de quien uno más quiere; de cerca muestra lo que es. Persigue a aserradores, mineros y cazadores que se internan de noche. Se dice que no se arrima donde hay perros ni candela.',
  },

  npcs: {
    aurelio: { name: AURELIO, voice: { pitch: 0.7, rate: 0.96 }, look: { cloth: 0x2f3138, pants: 0x1f2024, skin: 0xb98a64, hair: 0x8a8a86 }, idle: [[AURELIO, 'La flota no espera. Y yo tampoco.']] },
    elvia: { name: ELVIA, voice: { f: true, pitch: 1.05, rate: 1.0 }, look: { cloth: 0x7a4a5a, skirt: 0x3a3340, skin: 0xa87a56, longHair: true, hair: 0x2a2420 }, idle: [[ELVIA, 'Aquí se fía hasta el sábado. Lo demás, pregúntele al monte.']] },
    inspector: { name: INSP, voice: { pitch: 0.85, rate: 0.9 }, look: { cloth: 0x5a6048, pants: 0x3a3e30, skin: 0x9a6e4c, hat: 0x5a6048 }, idle: [[INSP, 'Ya le dije lo que hay. Lo que no hay, no me lo pregunte.']] },
    rosalba: { name: ROSALBA, voice: { f: true, pitch: 1.15, rate: 0.9 }, look: { cloth: 0x4a5a6a, skirt: 0x2a2630, skin: 0xa87a56, longHair: true, scarf: 0x6a7486 }, idle: [[ROSALBA, 'Si lo ve… dígale que la comida está servida.']] },
    padre: { name: PADRE, voice: { pitch: 0.6, rate: 0.82 }, look: { cloth: 0x121214, skirt: 0x121214, skin: 0xb98a64, hair: 0x9a9a96 }, idle: [[PADRE, 'Rece antes de subir. Y después de bajar, si baja.']] },
    custodia: { name: CUSTODIA, voice: { f: true, pitch: 0.75, rate: 0.78 }, look: { cloth: 0x5a3a2a, skirt: 0x3a2a22, ruana: 0x6a2a22, skin: 0x8a5e40, longHair: true, hair: 0xb8b4ac, scarf: 0x9a8a78 }, idle: [[CUSTODIA, 'La candela no se deja morir, mijo. Eso es todo lo que hay que saber.']] },
    eliecer: { name: ELIECER, voice: { pitch: 1.2, rate: 1.05 }, look: { cloth: 0x6a5a3a, pants: 0x2f2a22, skin: 0xa87a56 }, idle: [[ELIECER, 'No me deje solo mucho rato. Ella sabe que estoy aquí.']] },
  },

  // Pilas para la linterna, repartidas por el monte desde la parte 5.
  loot: [['camp1', -2, -1.5], ['aserrio', 2, 2.4], ['camp2', 2.6, -1], ['ceiba', -4, 5], ['ruina', -5, 4], ['cueva', 3, 5], [-61, -203], [63, -294], [111, -250], [2, -363]],

  ending: {
    kicker: 'Capítulo I · completo',
    title: 'La Patasola',
    lines: [
      'El Vespertino publicó la historia en la página nueve, entre un aviso de jabón y los resultados de la lotería.',
      'Don Aurelio le quitó la palabra «pezuña». Dejó la palabra «desaparecidos».',
      'En San Jerónimo del Monte volvieron a tumbar monte. De día. Con perro.',
      'Capítulo II — El Mohán: próximamente.',
    ],
  },

  parts: [
    // ------------------------------------------------------------ 1
    {
      title: 'El encargo', place: 'Bogotá · La Candelaria', region: 'bogota', env: 'BOGOTA',
      spawn: { at: [0, 4.2], yaw: Math.PI },
      intro: ['La lluvia no ha parado en tres días.', 'En la redacción de El Vespertino queda una sola luz encendida.'],
      npcs: { aurelio: { at: [0, 10.9], face: Math.PI } },
      steps: [
        {
          type: 'talk', npc: 'aurelio', text: 'Habla con Don Aurelio, el jefe de redacción',
          lines: [
            [AURELIO, 'Cierre esa puerta, que con este aguacero se me moja el archivo.'],
            [AURELIO, 'Tres aserradores desaparecidos en el sur del Tolima. Vereda El Silencio, municipio de San Jerónimo del Monte. Ni cuerpos ni rastro.'],
            [AURELIO, 'El inspector dice que se los llevó la quebrada. La gente del pueblo dice otra cosa, y no la dice en voz alta.'],
            [TU, '¿Qué dicen?'],
            [AURELIO, 'Que en el monte hay una mujer que llama. Y que el que le contesta no vuelve.'],
            [AURELIO, 'Cuentos de viejas. Pero tres hombres no se esfuman. Vaya, pregunte, tome fotos y tráigame algo que se pueda imprimir.'],
            [AURELIO, 'El expediente, la linterna y la cámara están sobre el escritorio. La flota sale de la esquina a las once.'],
          ],
        },
        {
          type: 'interact', text: 'Recoge tus cosas del escritorio',
          targets: [
            { name: 'el expediente', kind: 'papel', at: [-0.65, 9.35], lift: 0.84, exact: true, scale: 1.7, give: 'Expediente',
              note: ['Expediente 114 — Inspección de San Jerónimo del Monte', 'DESAPARECIDOS: Fidel Cupitra (41), Arcesio Yate (38), Eliécer Tique (19). Aserradores. Vistos por última vez subiendo al corte de la vereda El Silencio. — DILIGENCIAS: ninguna. — OBSERVACIÓN del inspector: «Crecida de la quebrada La Honda». — Al margen, a lápiz, otra letra: «No había llovido».'] },
            { name: 'la linterna', kind: 'linterna', at: [0.05, 9.35], lift: 0.84, exact: true, scale: 1.9, give: 'Linterna',
              onUse: (g) => { g.player.hasLight = true; g.sub('Pulsa F para encender o apagar la linterna.', 5); } },
            { name: 'la cámara', kind: 'camara', at: [0.7, 9.35], lift: 0.84, exact: true, scale: 1.9, give: 'Cámara' },
          ],
        },
        {
          type: 'reach', at: [0.2, -103.5], r: 3.4, text: 'Camina hasta la flota, al final de la calle',
          onStart: (g) => {
            g.audio.thunder(); g.flash();
            g.lure([-4.4, -66], { vanishAt: 21, sub: 'Había una mujer de blanco bajo el farol. Ya no está.' });
            g.after(11, (g) => { g.audio.thunder(); g.flash(); });
          },
        },
      ],
    },

    // ------------------------------------------------------------ 2
    {
      title: 'Tierra caliente', place: 'San Jerónimo del Monte · sur del Tolima', region: 'tolima', env: 'DUSK',
      spawn: { at: [0, 43], yaw: 0 },
      intro: ['Catorce horas de flota y dos de chiva.', 'Una plaza, una capilla y el monte encima, esperando.'],
      npcs: { elvia: { at: 'tienda', face: 1.57 }, inspector: { at: 'inspeccion', face: 1.57 }, rosalba: { at: 'rosalba', face: -1.57 }, padre: { at: 'capilla', face: 0 }, custodia: { at: 'custodia', face: -1.57 } },
      idle: { custodia: [[CUSTODIA, 'Todavía no es hora de que hablemos, mijo. Vuelva cuando la haya visto.']] },
      steps: [
        {
          type: 'talk', npc: 'elvia', text: 'Pregunta en la tienda por los desaparecidos',
          lines: [
            [ELVIA, '¿De Bogotá? Se le nota en los zapatos.'],
            [ELVIA, 'Los tres eran del aserrío de arriba: Fidel Cupitra, Arcesio Yate y el muchacho Eliécer. Subieron un lunes.'],
            [ELVIA, 'El perro de Fidel bajó solo el miércoles. Temblando. No ha vuelto a ladrar.'],
            [ELVIA, 'Si quiere papeles, hable con el inspector. Si quiere la verdad, hable con Rosalba, la mujer de Fidel. Y no ande el monte de noche.'],
          ],
        },
        {
          type: 'talk', npc: 'inspector', text: 'Habla con el inspector de policía',
          lines: [
            [INSP, 'Aquí no hay misterio, periodista. Tumban monte en invierno, la quebrada La Honda crece y se los lleva. Pasa todos los años.'],
            [TU, 'En el expediente alguien anotó que no había llovido.'],
            [INSP, '…Lo que no pasa todos los años es que dejen las hachas clavadas y la comida servida.'],
            [INSP, 'Suba al aserrío si quiere. De día.'],
          ],
        },
        {
          type: 'talk', npc: 'rosalba', text: 'Busca a Rosalba, la esposa de Fidel Cupitra',
          lines: [
            [ROSALBA, 'Fidel no se ahogó. Fidel nadaba como una nutria.'],
            [ROSALBA, 'La noche antes de subir me dijo que una mujer lo había llamado desde el guadual. Por el nombre. Con mi voz.'],
            [ROSALBA, 'Yo estaba aquí, en la cocina, y no había abierto la boca.'],
            [ROSALBA, 'Si sube, llévese esto. Era de él.'],
            ['', 'Rosalba te entrega un escapulario gastado.'],
          ],
          onDone: (g) => g.give('Escapulario de Fidel'),
        },
        {
          type: 'talk', npc: 'padre', text: 'Habla con el padre Anselmo, frente a la capilla',
          lines: [
            [PADRE, 'Yo bendigo a los que suben y entierro a los que bajan. Últimamente no baja nadie a quien enterrar.'],
            [PADRE, 'No me pregunte qué creo. Pregúnteme qué hago: desde hace un mes dejo la capilla abierta toda la noche.'],
            [PADRE, 'El camino al aserrío sale por detrás. Antes de que oscurezca, por favor.'],
          ],
        },
      ],
    },

    // ------------------------------------------------------------ 3
    {
      title: 'El aserrío', place: 'Camino de la vereda El Silencio', region: 'tolima', env: 'DUSK2',
      spawn: { at: 'salida', yaw: 0.2 },
      intro: ['El camino al aserrío sale por detrás de la capilla.', 'Queda poca luz.'],
      npcs: { elvia: 'tienda', inspector: 'inspeccion', rosalba: 'rosalba', padre: 'capilla', custodia: 'custodia' },
      steps: [
        { type: 'reach', at: 'aserrio', r: 15, text: 'Sigue el camino hacia el norte hasta el aserrío' },
        {
          type: 'interact', text: 'Examina el aserrío abandonado',
          targets: [
            { name: 'el hacha', verb: 'Examinar', kind: 'hacha', at: ['aserrio', 10, -6], stay: true,
              note: ['El hacha', 'Está clavada en el tocón hasta el ojo. Nadie la soltó: la dejaron a medio golpe.'] },
            { name: 'la mesa', verb: 'Examinar', kind: 'olla', at: ['aserrio', -2.4, 2.4], stay: true,
              note: ['La comida', 'Tres platos servidos. El arroz tiene una pelusa gris. Nadie volvió a comer.'] },
            { name: 'la huella', verb: 'Examinar', kind: 'huella', at: ['aserrio', -11, -10], stay: true,
              note: ['Una huella', 'Honda, en el barro. Parece de pezuña. Buscas la otra alrededor. No hay otra.'] },
          ],
          onDone: (g) => g.sub('El rastro sigue hacia el noroccidente, monte adentro.', 5),
        },
      ],
    },

    // ------------------------------------------------------------ 4
    {
      title: 'Huellas de una sola pata', place: 'Monte de El Silencio', region: 'tolima', env: 'TWILIGHT',
      spawn: { at: ['aserrio', -8, -9], yaw: 0.8 },
      intro: ['Una sola huella. Luego otra, más allá.', 'Siempre del mismo pie.'],
      steps: [
        {
          type: 'interact', sequential: true, text: 'Sigue el rastro',
          targets: [
            { name: 'la huella', verb: 'Examinar', kind: 'huella', at: [-26.5, -165.8] },
            { name: 'la huella', verb: 'Examinar', kind: 'huella', at: [-45.2, -183.6] },
            { name: 'la huella', verb: 'Examinar', kind: 'huella', at: [-65, -208],
              note: ['El rastro', 'Las huellas apuntan hacia el aserrío. Pero el rastro se aleja de él. Lo que pasó por aquí camina con el pie al revés.'] },
            { name: 'la huella', verb: 'Examinar', kind: 'huella', at: [-84.8, -221.4] },
            { name: 'la huella', verb: 'Examinar', kind: 'huella', at: [-103.5, -239.3],
              note: ['El rastro', 'Entre huella y huella hay casi tres metros. No camina. Salta.'] },
          ],
        },
        { type: 'reach', at: 'camp1', r: 9, text: 'Hay un cambuche más adelante. Acércate' },
        {
          type: 'interact', text: 'Registra el campamento y enciende la fogata',
          targets: [
            { name: 'el cuaderno', verb: 'Leer', kind: 'diario', at: ['camp1', -1.2, -1.6], give: 'Cuaderno de Arcesio',
              note: ['Cuaderno de Arcesio Yate', 'LUNES. Fidel dice que oyó a una mujer pidiendo auxilio por la cañada. Fuimos. Nadie. — MARTES. Otra vez la voz. Ahora llamaba a Eliécer con la voz de la mamá, que murió en marzo. El perro no para de aullar. — MIÉRCOLES. Fidel se fue detrás de ella antes de aclarar. Soltó al perro para que no lo siguiera. Yo ya la vi. Es linda de lejos. De cerca no tiene'] },
            { name: 'la fogata', kind: 'fire', fire: 'camp1' },
          ],
          onStart: (g) => g.sub('Las fogatas se encienden con E. Mientras arden, nada se acerca.', 6),
        },
      ],
    },

    // ------------------------------------------------------------ 5
    {
      title: 'La voz', place: 'Monte de El Silencio · noche', region: 'tolima', env: 'NIGHT1', loot: true,
      spawn: { at: ['camp1', 0, 3.5], yaw: 1.0 },
      intro: ['En tierra caliente la noche no llega: cae.', 'Y alguien, monte adentro, está pidiendo auxilio.'],
      steps: [
        {
          type: 'reach', at: 'voz', r: 17, text: 'Alguien pide auxilio al noroccidente. Ve hacia la voz',
          onStart: (g) => {
            const frases = ['«¡Auxilio! ¡Por aquí, por favor!»', '«No me deje sola… estoy herida…»', '«Por aquí… ya casi llega…»'];
            let k = 0;
            const call = (g) => { g.cue('voz', 'wail', 1.5); g.sub(frases[k++ % frases.length], 3.5); };
            g.lure('voz', {});
            g.after(1.5, call); g.every(8, call);
          },
          onDone: (g) => { g.lureVanish(true); g.sub('No era una mujer.', 4); },
          wait: 3,
        },
        {
          type: 'interact', text: 'Hay algo en el suelo donde ella estaba',
          targets: [
            { name: 'el sombrero', kind: 'sombrero', at: ['voz', 1.2, 0.8], give: 'Sombrero de Fidel',
              note: ['Un sombrero de pindo', 'Adentro, con tinta: F. Cupitra. Está tibio.'] },
          ],
        },
        {
          type: 'reach', at: 'salida', r: 13, text: 'Vuelve al pueblo', threat: STALK({ delay: 5 }),
          onStart: (g) => g.sub('Algo camina detrás de ti. De a un solo paso.', 5),
        },
      ],
    },

    // ------------------------------------------------------------ 6
    {
      title: 'Lo que cuentan los viejos', place: 'San Jerónimo del Monte · noche', region: 'tolima', env: 'NIGHT1', loot: true,
      spawn: { at: 'salida', yaw: Math.PI },
      intro: ['Volviste con un sombrero ajeno en la mano', 'y sin ganas de explicar lo que viste.'],
      npcs: { elvia: 'tienda', rosalba: 'rosalba', padre: 'capilla', custodia: { at: 'custodia', face: -1.57 } },
      steps: [
        {
          type: 'talk', npc: 'rosalba', text: 'Llévale el sombrero a Rosalba',
          lines: [
            [ROSALBA, '…Es el de él.'],
            [ROSALBA, 'No me diga dónde lo encontró. Dígame si estaba solo.'],
            [TU, 'Había una mujer. De lejos.'],
            [ROSALBA, 'Vaya donde Ña Custodia. Vive saliendo por el oriente, donde se ve la candela. Ella sabe de eso.'],
          ],
        },
        {
          type: 'talk', npc: 'custodia', text: 'Busca a Ña Custodia, al oriente del pueblo',
          lines: [
            [CUSTODIA, 'Siéntese. Usted ya la vio, se le nota en los ojos.'],
            [CUSTODIA, 'Dicen que fue una mujer hermosa, casada con un labriego bueno. El patrón de la hacienda la rondaba, y ella se dejó rondar.'],
            [CUSTODIA, 'El marido los encontró. Al patrón le quitó la cabeza de un machetazo. A ella, de un solo tajo, la pierna.'],
            [CUSTODIA, 'Murió desangrada en el monte. Pero el monte no la dejó ir.'],
            [CUSTODIA, 'Ahora anda en una sola pata, con pezuña, dejando el rastro al revés: el que la busca cree que se aleja, y se le está arrimando.'],
            [CUSTODIA, 'De lejos es linda y llama con la voz de quien uno más quiere. De cerca… de cerca usted ya sabe.'],
            [CUSTODIA, 'No se arrima donde hay perro ni donde hay candela. Lleve perro. Prenda fogatas. Y no le conteste nunca.'],
            [CUSTODIA, 'Tráigame tabaco de la tienda y agua bendita de la capilla, y le rezo ese escapulario que carga.'],
          ],
        },
        {
          type: 'interact', text: 'Consigue tabaco en la tienda y agua bendita en la capilla',
          targets: [
            { name: 'el tabaco', kind: 'tabaco', at: [-23.2, 6.9], lift: 1.13, exact: true, scale: 1.6, give: 'Tabaco' },   // sobre el mostrador
            { name: 'el agua bendita', kind: 'frasco', at: [1.7, -21.6], give: 'Agua bendita' },
          ],
        },
        {
          type: 'talk', npc: 'rosalba', text: 'Pídele a Rosalba el perro de Fidel',
          lines: [
            [ROSALBA, '¿A Canelo? Bajó solo esa vez y desde entonces no ladra.'],
            [ROSALBA, 'Pero con usted movió la cola. Lléveselo. Y tráigamelo.'],
            ['', 'Canelo se te pega a la pierna.'],
          ],
          onDone: (g) => { g.setDog(true); g.audio.bark(0.4, 0.8); g.give('Canelo'); },
        },
        {
          type: 'talk', npc: 'custodia', text: 'Vuelve donde Ña Custodia con el tabaco y el agua',
          lines: [
            [CUSTODIA, 'Bueno. Quédese quieto.'],
            ['', 'Ña Custodia sopla humo de tabaco sobre el escapulario y reza entre dientes.'],
            [CUSTODIA, 'Ella murió en un rancho que hoy es pura ceniza, monte adentro, pasando el segundo corte.'],
            [CUSTODIA, 'Lo que le quitaron está enterrado por ahí. Mientras le falte, no descansa. Y mientras no descanse, sigue llamando.'],
          ],
          onDone: (g) => g.give('Escapulario rezado'),
        },
      ],
    },

    // ------------------------------------------------------------ 7
    {
      title: 'Canelo', place: 'Monte de El Silencio · noche cerrada', region: 'tolima', env: 'NIGHT2', loot: true,
      spawn: { at: ['custodia', -4, 3], yaw: 0.2 }, dog: true, threat: STALK({ delay: 25 }),
      intro: ['Canelo va adelante, con la cola entre las patas.', 'Mientras él esté cerca, ella no se arrima.'],
      npcs: { custodia: { at: 'custodia', face: -1.57 } },
      steps: [
        { type: 'reach', at: 'camp2', r: 10, text: 'Busca el segundo campamento, al norte, pasando la ceiba grande' },
        {
          type: 'interact', text: 'Busca rastros alrededor del campamento',
          targets: [
            { name: 'la camisa', kind: 'tela', at: ['camp2', 5, -6], note: ['Una camisa', 'Rasgada de arriba abajo, en cuatro tiras parejas. No fue un animal: los animales no cuentan.'] },
            { name: 'la peinilla', kind: 'machete', at: ['camp2', -7, -3], note: ['Una peinilla partida', 'La hoja se quebró contra algo más duro que el palo.'] },
            { name: 'el casquillo', kind: 'casquillo', at: ['camp2', 8, 5], note: ['Un casquillo de escopeta', 'Alguien alcanzó a disparar. Una sola vez.'] },
            { name: 'el mechón', kind: 'pelo', at: ['camp2', -4, 8], note: ['Un mechón de pelo', 'Negro, largo, enredado en la zarza a la altura de tu cabeza. Huele a tierra recién abierta.'] },
          ],
        },
        { type: 'interact', text: 'Enciende la fogata del campamento', targets: [{ name: 'la fogata', kind: 'fire', fire: 'camp2' }] },
        {
          type: 'survive', seconds: 15, text: 'Quédate junto a la candela',
          onStart: (g) => {
            g.after(3, (g) => { g.cue(['camp2', -30, -26], 'wail', 1.6, true); g.sub('«Canelo… venga, Canelo…»', 4); });
            g.after(7, (g) => { g.sub('Es la voz de Fidel Cupitra. Canelo no se mueve. Tiembla.', 5); g.audio.growl(0.3, 1); });
            g.after(11.5, (g) => { g.cue(['camp2', 26, -30], 'wail', 1.6, true); g.sub('«Canelo… ¿ya no me conoce?»', 3.5); });
          },
        },
      ],
    },

    // ------------------------------------------------------------ 8
    {
      title: 'El rancho quemado', place: 'Monte adentro', region: 'tolima', env: 'NIGHT2', loot: true,
      spawn: { at: ['camp2', 0, 4.5], yaw: 0.9 }, dog: true, threat: STALK({ delay: 12, charge: 0.02 }),
      intro: ['Ña Custodia dijo que murió en un rancho que hoy es pura ceniza.', 'Queda al noroccidente del segundo campamento.'],
      steps: [
        { type: 'reach', at: 'ruina', r: 13, text: 'Busca el rancho quemado, al noroccidente' },
        {
          type: 'interact', text: 'Busca entre las cenizas',
          targets: [
            { name: 'el retrato', kind: 'retrato', at: ['ruina', -1.6, -2.2], give: 'Retrato chamuscado',
              note: ['Un retrato chamuscado', 'Una pareja el día del matrimonio. A él se le ve la cara. A ella alguien se la raspó con la uña.'] },
            { name: 'la carta', kind: 'carta', at: ['ruina', 1.7, -1.1], give: 'Carta del patrón',
              note: ['Una carta', '«…esta noche su marido baja con la recua y no vuelve hasta el domingo. La espero donde siempre. Queme esto.» — No la quemó.'] },
            { name: 'el machete', kind: 'machete', at: ['ruina', 2.2, 0.7], give: 'Machete oxidado',
              note: ['Un machete oxidado', 'Tiene una muesca honda a media hoja, como de haber dado contra hueso.'] },
          ],
        },
        {
          type: 'interact', text: 'Hay una cruz frente al rancho',
          targets: [{ name: 'la cruz', verb: 'Examinar', kind: 'none', at: ['ruina', 0, 4.1], exact: true,
            note: ['La cruz', 'Dos palos amarrados con bejuco. No tiene nombre. Debajo no hay nadie: la tierra nunca se removió.'] }],
          onDone: (g) => {
            g.audio.sting(0.7); g.dogFlee();
            g.sub('Canelo se suelta ladrando hacia lo oscuro.', 3.5);
            g.after(3.2, (g) => { g.cue(['ruina', -45, -30], 'yelp', 2.2); g.sub('Un chillido. Después, nada.', 4); });
          },
          wait: 7,
        },
      ],
    },

    // ------------------------------------------------------------ 9
    {
      title: 'Sin perro', place: 'Monte adentro · madrugada', region: 'tolima', env: 'NIGHT3', loot: true,
      spawn: { at: ['ruina', 0, 6.5], yaw: -2.2 }, threat: HUNT(5.2, { delay: 7 }),
      intro: ['Canelo se fue detrás de algo que no alcanzaste a ver.', 'Te quedaste sin perro. Y ella lo sabe.'],
      steps: [
        { type: 'reach', at: 'ceiba', r: 10, text: 'Corre hacia la ceiba grande, al suroriente. Las fogatas la detienen',
          onStart: (g) => g.sub('Shift para correr. Enciende las fogatas del camino para recuperar el aliento.', 7) },
        { type: 'reach', at: 'cueva', r: 7, text: 'Se oye agua. Baja hacia la quebrada, al oriente' },
      ],
    },

    // ------------------------------------------------------------ 10
    {
      title: 'El que quedó', place: 'Quebrada La Honda', region: 'tolima', env: 'NIGHT3', loot: true,
      spawn: { at: ['cueva', -2.5, 5.5], yaw: 0 },
      intro: ['Bajo la piedra, junto a la quebrada, alguien respira.'],
      npcs: { eliecer: { at: ['cueva', -0.3, -0.6], face: 0, sit: true } },
      steps: [
        {
          type: 'talk', npc: 'eliecer', text: 'Hay alguien bajo la piedra',
          lines: [
            [ELIECER, '¡No alumbre para afuera! …¿Usted es de verdad?'],
            [ELIECER, 'Soy Eliécer Tique. Fidel se fue detrás de ella. Arcesio fue a buscarlo. Yo me quedé oyendo.'],
            [ELIECER, 'A mí me llamó con la voz de mi mamá. Casi salgo. Me mordí la mano para no contestar.'],
            [ELIECER, 'Tengo la pierna abierta de una caída. En el segundo corte quedó el botiquín. Si no me lo trae, no llego al pueblo.'],
          ],
        },
        {
          type: 'interact', text: 'Trae el botiquín del segundo campamento, al occidente', threat: HUNT(5.5, { delay: 14 }),
          targets: [{ name: 'el botiquín', kind: 'botiquin', at: ['camp2', 1.6, -1.9], give: 'Botiquín' }],
        },
        {
          type: 'talk', npc: 'eliecer', text: 'Vuelve a la cueva con el botiquín',
          lines: [
            [ELIECER, 'Dios se lo pague.'],
            [ELIECER, 'Mientras usted no estaba oí ladrar a Canelo. Lejos. Ronco, como cansado.'],
            [ELIECER, 'También oí otras voces. Una dijo mi nombre con la voz suya.'],
          ],
        },
      ],
    },

    // ------------------------------------------------------------ 11
    {
      title: 'La que llama con tu voz', place: 'Monte de la quebrada', region: 'tolima', env: 'NIGHT3', loot: true,
      spawn: { at: ['cueva', -2.5, 5.5], yaw: 1.5 }, threat: HUNT(5.3, { delay: 30 }),
      intro: ['Eliécer jura que oyó ladrar a Canelo.', 'También oyó otras voces.', 'Ella sabe hablar. No sabe ladrar.'],
      npcs: { eliecer: { at: ['cueva', -0.3, -0.6], face: 0, sit: true } },
      steps: [
        {
          type: 'interact', text: 'Tres voces llaman desde el monte. Solo una es Canelo',
          targets: [
            { name: 'la voz', verb: 'Buscar', kind: 'voz', at: [165, -232], optional: true, mystery: true, nearR: 36,
              onNear: (g, t) => { const say = (g) => { if (t.done) return; g.cue([t.x, t.z], 'wail', 1.7, true); g.sub('«Periodista… por acá. Ya encontré a los muchachos.»', 4); }; say(g); g.every(9, say); },
              onUse: (g) => { g.sub('No había nadie. Nunca hubo nadie.', 4); g.ambush(); } },
            { name: 'la voz', verb: 'Buscar', kind: 'voz', at: [185, -372], optional: true, mystery: true, nearR: 36,
              onNear: (g, t) => { const say = (g) => { if (t.done) return; g.cue([t.x, t.z], 'wail', 1.7); g.sub('«Soy Rosalba… vine a buscarlo… no me deje aquí.»', 4); }; say(g); g.every(9, say); },
              onUse: (g) => { g.sub('Rosalba nunca subió al monte.', 4); g.ambush(); } },
            { name: 'a Canelo', verb: 'Soltar', kind: 'perro', at: [118, -318], mystery: true, nearR: 40,
              onNear: (g, t) => { const say = (g) => { if (t.done) return; g.cue([t.x, t.z], 'bark', 1.8); g.sub('(Un ladrido ronco, cansado.)', 2.5); }; say(g); g.every(4.5, say); },
              onUse: (g) => { g.setDog(true); g.audio.bark(0, 1); g.sub('Canelo estaba enredado en un bejuco. Te lame la mano.', 5); } },
          ],
        },
        { type: 'reach', at: 'cueva', r: 7, text: 'Vuelve a la cueva con Canelo' },
      ],
    },

    // ------------------------------------------------------------ 12
    {
      title: 'Tres cruces', place: 'Monte de El Silencio · luna roja', region: 'tolima', env: 'BLOOD', loot: true,
      spawn: { at: ['cueva', -2.5, 5.5], yaw: 1.5 }, dog: true,
      intro: ['La luna salió roja.', 'Hay tres cruces viejas en el monte.', 'Debajo de una está lo que a ella le quitaron.'],
      npcs: { eliecer: { at: ['cueva', -0.3, -0.6], face: 0, sit: true } },
      steps: [
        {
          type: 'talk', npc: 'eliecer', text: 'Pregúntale a Eliécer por las cruces',
          lines: [
            [ELIECER, 'Las vi cuando abrimos trocha: tres cruces de palo, al occidente, cada una por su lado.'],
            [ELIECER, 'Arcesio decía que el marido, arrepentido, enterró la pierna aparte, en tierra sin bendecir, y le puso una cruz. Las otras dos las pusieron después, por los que no volvieron.'],
            [ELIECER, 'Llévese mi barretón. Y lleve al perro: ya no la espanta como antes, pero la demora.'],
          ],
          onDone: (g) => g.give('Barretón'),
        },
        {
          type: 'interact', text: 'Cava junto a las tres cruces, al occidente', threat: HUNT(5.8, { delay: 12, frenzy: true, dogR: 12 }),
          targets: [
            { name: 'junto a la cruz', verb: 'Cavar', kind: 'none', at: ['cruz3', 0, 1.2], give: 'Argolla de Fidel',
              note: ['Bajo la primera cruz', 'Una argolla de matrimonio. Por dentro: «R. y F.». Fidel Cupitra no se ahogó.'] },
            { name: 'junto a la cruz', verb: 'Cavar', kind: 'none', at: ['cruz2', 0, 1.2], give: 'Camándula de Arcesio',
              note: ['Bajo la segunda cruz', 'Una camándula de pepas negras y un lápiz mordido. Arcesio Yate no terminó la frase.'] },
            { name: 'junto a la cruz', verb: 'Cavar', kind: 'none', at: ['cruz1', 0, 1.2], give: 'Los huesos',
              note: ['Bajo la tercera cruz', 'Huesos largos, viejos, envueltos en un trapo que fue blanco. Una pierna. Solo una pierna.'] },
          ],
        },
      ],
    },

    // ------------------------------------------------------------ 13
    {
      title: 'Cara a cara', place: 'El rancho quemado', region: 'tolima', env: 'BLOOD',
      spawn: { at: ['ruina', -26, 14], yaw: -1.1 }, dog: true, threat: HUNT(6.0, { delay: 10, frenzy: true, dogR: 12 }),
      intro: ['Todo vuelve al rancho quemado.', 'Lo que se le quitó tiene que volver a la tierra donde cayó.'],
      steps: [
        {
          type: 'interact', text: 'Enciende las cuatro fogatas alrededor del rancho', fireTime: 600,
          targets: ['ruina1', 'ruina2', 'ruina3', 'ruina4'].map((f) => ({ name: 'la fogata', kind: 'fire', fire: f })),
        },
        {
          type: 'interact', text: 'Entierra los huesos junto a la cruz',
          targets: [{ name: 'los huesos junto a la cruz', verb: 'Enterrar', kind: 'hueso', at: ['ruina', 0, 4.1], exact: true, stay: true,
            note: ['La tierra', 'Cavas con las manos. La tierra está tibia, como recién removida. Pones los huesos donde debieron estar siempre.'] }],
          onDone: (g) => { g.audio.scream(0, 1.2); g.audio.sting(1); g.shake(1); g.sub('El monte entero grita.', 4); },
        },
        {
          type: 'survive', seconds: 55, fireTime: 20, text: 'No dejes morir las fogatas. Aguanta hasta que cante el gallo',
          threat: HUNT(6.4, { delay: 2, dogR: 0 }),
          onStart: (g) => {
            g.fires(['ruina1', 'ruina2', 'ruina3', 'ruina4'], [11, 18, 26, 33]);
            g.sub('Canelo se mete entre tus piernas. Ya no la detiene.', 5);
            g.after(9, (g) => { g.audio.wail(-0.6, 1, true); g.sub('«Periodista… ábrame… tengo frío.»', 4); });
            g.after(22, (g) => { g.audio.wail(0.7, 1); g.sub('«Devuélvamela. Es mía.»', 4); });
            g.after(36, (g) => { g.audio.wail(0, 1.2, true); g.sub('«Conteste. Con una palabra basta.»', 4); });
            g.after(47, (g) => g.sub('No contestes.', 4));
          },
          onDone: (g) => {
            g.setThreat(null); g.lure(['ruina', 0, 5.2], {}); g.audio.rooster(); g.setEnv('DAWN');
            g.sub('Canta un gallo, lejos. Frente a la cruz hay una mujer de blanco. Tiene las dos piernas.', 7);
            g.after(5, (g) => g.lureVanish(false));
          },
          wait: 8,
        },
      ],
    },

    // ------------------------------------------------------------ 14
    {
      title: 'Amanecer', place: 'San Jerónimo del Monte', region: 'tolima', env: 'DAWN',
      spawn: { at: ['aserrio', -8, -14], yaw: Math.PI - 0.2 }, dog: true,
      intro: ['Cantó el gallo.', 'Bajaste a Eliécer en hombros hasta el aserrío. De ahí lo llevaron en mula.', 'El monte huele a tierra mojada y a nada más.'],
      npcs: { elvia: 'tienda', inspector: 'inspeccion', rosalba: 'rosalba', padre: 'capilla', custodia: { at: 'custodia', face: -1.57 } },
      idle: {
        inspector: [[INSP, 'En el informe voy a poner «crecida de la quebrada». Usted ponga lo que quiera en el suyo.']],
        padre: [[PADRE, 'Esta noche cierro la capilla. Por primera vez en un mes.']],
        custodia: [[CUSTODIA, 'Descansó ella. Ahora descanse usted. …Aunque el monte es grande, mijo, y ella no era la única.']],
      },
      steps: [
        { type: 'reach', at: 'salida', r: 13, text: 'Baja al pueblo' },
        {
          type: 'talk', npc: 'rosalba', text: 'Llévale a Rosalba lo que encontraste',
          lines: [
            ['', 'Le pones la argolla en la mano. Canelo se echa a sus pies.'],
            [ROSALBA, '…«R. y F.». Yo misma la mandé grabar.'],
            [ROSALBA, 'Gracias por no decirme que se ahogó.'],
          ],
        },
        {
          type: 'talk', npc: 'elvia', text: 'Doña Elvia te hace señas desde la tienda',
          lines: [
            [ELVIA, 'Le llegó telegrama de Bogotá. Lo trajo el chivero.'],
            ['Telegrama', 'LAVANDERAS DESAPARECIDAS RIO MAGDALENA ALTURA DE HONDA STOP DICEN QUE UN HOMBRE PELUDO FUMA TABACO EN LAS PIEDRAS STOP NO VUELVA A BOGOTA STOP AURELIO'],
            [ELVIA, '¿Malas noticias?'],
            [TU, 'Trabajo.'],
          ],
        },
      ],
    },
  ],
};
