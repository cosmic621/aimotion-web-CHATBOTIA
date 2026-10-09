// Asistente conversacional de apoyo asistido y tamizaje.
//
// DELIMITACION (Human-in-the-Loop): este modulo NO diagnostica, NO prescribe
// y NO realiza psicoterapia autonoma. Ofrece psicoeducacion general y
// recoleccion estructurada de informacion preliminar. Los factores de riesgo
// critico son interceptados ANTES de llegar aqui por src/lib/riskEngine.js,
// que desactiva este flujo y activa el protocolo de escalamiento. Todo
// hallazgo relevante queda registrado para revision humana.
//
// COMO "ENTIENDE" SIN UN MODELO EXTERNO (sin costo ni dependencia de red):
//  1. Normaliza el texto (sin tildes/puntuacion) y tolera errores de tipeo.
//  2. Puntua ~50 temas por palabras y frases clave, y elige el mas probable.
//  3. Detecta la INTENCION de la pregunta (que es, sintomas, causas,
//     tratamiento, medicacion, como ayudar, cuando consultar, mitos...) y
//     responde con la ficha informativa del tema.
//  4. Detecta si habla de si mismo, de un hijo/a o de otra persona, y adapta
//     la respuesta (orientacion para familias).
//  5. Recuerda el tema y la profundidad de la conversacion (context), de modo
//     que respuestas cortas ("si", "hace un mes") continuan el hilo.
//  6. Siempre tiene respuesta: si nada coincide, refleja lo que la persona
//     dijo, ofrece un menu de orientacion y sigue la conversacion; nunca
//     responde "no entiendo".

import { normalize, editDistance } from './textUtils.js';
import { TOPICS, p, LINES } from './botKnowledge.js';
import { EXTRA_TOPICS, UNIVERSAL, FOLLOW_UPS, DEEPENING_POOL, NEXT_STEPS } from './botKnowledge2.js';

export const INTRO_MESSAGE =
  'Hola, qué bueno que estés aquí. 💜\n\n' +
  'Quiero ser transparente contigo desde el inicio: soy un asistente de apoyo y tamizaje, no un ' +
  'profesional de salud mental. No diagnostico ni reemplazo una consulta clínica. Lo que sí puedo ' +
  'hacer es escucharte, darte información útil sobre depresión, ansiedad, estrés y esquizofrenia ' +
  '(también si preguntas por un hijo/a o un ser querido) y, si noto una señal de riesgo importante, ' +
  'avisar de inmediato a un profesional de la red de apoyo.\n\n' +
  'Lo que compartas aquí puede ser revisado por el equipo profesional a cargo, como parte de tu cuidado.\n\n' +
  '¿Cómo estás hoy, de verdad? Puedes escribirme con tus palabras, o preguntarme lo que quieras saber.';

const ALL_TOPICS = { ...TOPICS, ...EXTRA_TOPICS };
const CONDITIONS = [
  'depresion', 'ansiedad', 'estres', 'esquizofrenia', 'panico', 'bipolar', 'toc', 'trauma',
  'alimentacion', 'bullying', 'fobia_social', 'concentracion', 'autismo',
];

const SYMPTOM_TOPICS = ['sueno', 'psicosomatico', 'concentracion', 'soledad', 'autoestima', 'culpa', 'proposito', 'enojo'];

const pick = (options) => options[Math.floor(Math.random() * options.length)];
const resolve = (v, n) => (typeof v === 'function' ? v(n) : v);

// ---------------------------------------------------------------------
// Deteccion de tema (por puntaje) con tolerancia a errores de tipeo
// ---------------------------------------------------------------------

function scoreTopics(norm, tokens) {
  const result = [];
  for (const [key, topic] of Object.entries(ALL_TOPICS)) {
    let score = 0;
    const usedTokens = new Set(); // un mismo token solo puntua una vez por tema
    for (const raw of topic.kw) {
      const kw = normalize(raw.startsWith('=') ? raw.slice(1) : raw);
      if (!kw) continue;
      if (raw.startsWith('=')) {
        const i = tokens.indexOf(kw);
        if (i !== -1 && !usedTokens.has(i)) {
          usedTokens.add(i);
          score += 1;
        }
      } else if (kw.includes(' ')) {
        if (norm.includes(kw)) score += 2;
      } else {
        const i = tokens.findIndex(
          (tok, idx) =>
            !usedTokens.has(idx) &&
            (tok.startsWith(kw) ||
              (kw.length >= 6 && tok.length >= 5 && Math.abs(tok.length - kw.length) <= 1 && editDistance(tok, kw, 1) <= 1))
        );
        if (i !== -1) {
          usedTokens.add(i);
          score += 1;
        }
      }
    }
    if (score > 0) result.push([key, score + (topic.priority || 0) * 0.01]);
  }
  return result.sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------
// Deteccion de intencion (que pregunta esta haciendo)
// ---------------------------------------------------------------------

const INTENTS = [
  ['ayudar', /\b(como (ayudo|ayudar|puedo ayudar|apoyo|apoyar|acompano|acompanar|lo ayudo|la ayudo|le ayudo|lo apoyo|la apoyo|actuar|reaccionar|hablarle|hablar con|tratar a|manejar a)|que (le digo|puedo hacer por|hago con (mi|el|la|mis))|ayudar a (mi|un|una|alguien|el|la))\b/],
  ['medicacion', /\b(medicacion|medicamentos?|medicina|pastillas?|pildoras?|antidepresiv\w*|ansiolitic\w*|antipsicotic\w*|farmacos?|receta|recetar|clonazepam|sertralina|fluoxetina|alprazolam|risperidona|olanzapina|quetiapina|litio|diazepam|lorazepam|escitalopram|zolpidem|melatonina|valeriana)\b/],
  ['cuando', /\b(cuando (ir|buscar|consultar|acudir|debo|hay que|es el momento|es necesario|llevar)|es (urgente|grave|peligros[oa])|debo preocuparme|ya es (grave|momento)|a partir de cuando|cuando es grave)\b/],
  ['hereditario', /\b(hereditari\w*|herencia|genetic\w*|se hereda|heredar|viene de familia|corre en la familia)\b/],
  ['mitos', /\b(mito|mitos|es cierto que|es verdad que|dicen que|se dice que|estigma|locura|es de locos|verdad o mentira)\b/],
  ['diferencia', /\b(diferencia|diferente|se parece|es lo mismo|vs|distinguir|confundir|confundo)\b/],
  ['duracion', /\b(cuanto (dura|tarda|tiempo|demora)|por cuanto tiempo|para siempre|es pasajero|se pasa solo|se quita|dura toda la vida|desaparece)\b/],
  ['causas', /\b(causas?|por ?que (da|me da|le da|se da|aparece|ocurre|pasa|sucede|se produce|tengo|tiene|me siento|le pasa|me pasa)|origen|de donde (viene|sale)|a que se debe|que (lo|la) (causa|provoca|produce)|a que se deben)\b/],
  ['sintomas', /\b(sintomas?|senales?|signos?|como (saber|se si|se que|noto|reconozco|identifico|detecto|me doy cuenta)|como se (manifiesta|siente|ve|nota)|como es (tener|vivir con)|tengo los sintomas)\b/],
  ['que_es', /\b(que (es|son|significa|quiere decir)|en que consiste|a que se refiere|definicion|explicame|me puedes explicar|que se siente)\b/],
  ['tratamiento', /\b(tratamientos?|tratar|tratarse|se cura|curar|curable|tiene cura|cura|sanar|como se (maneja|trata|supera|controla|sale|combate)|como (superar|manejar|controlar|salir|combatir|lidiar|afrontar|calmar|calmarme|mejorar|aliviar|quitar|quitarme)|que hago|que puedo hacer|que debo hacer|consejos?|recomendaciones?|tecnicas?|ejercicios?|estrategias?|como me ayudo|que me recomiendas|terapia sirve|sirve la terapia)\b/],
];

function detectIntent(norm) {
  for (const [key, re] of INTENTS) if (re.test(norm)) return key;
  return null;
}

// ---------------------------------------------------------------------
// A quien se refiere la persona: a si misma, a un hijo/a, o a otra persona
// ---------------------------------------------------------------------

const PARENT_RE = /\b(mi|mis) (hij[oa]s?|nin[oa]s?|adolescentes?|muchach[oa]s?|chic[oa]s?|sobrin[oa]s?|hermanit[oa]s?|nietos?|alumn[oa]s?|estudiantes?)\b|\bsoy (mama|papa|padre|madre|acudiente|abuel[oa])\b/;
const OTHER_RE = /\b(mi|mis) (esposo|esposa|pareja|amig[oa]s?|companer[oa]s?|primo|prima|abuel[oa]s?|tio|tia|papa|mama|padre|madre|hermano|hermana|familiar|novio|novia|vecin[oa]|jefe|colega|paciente|suegr[oa])\b|\b(una|otra) persona\b|\balguien (cercano|que quiero|de mi familia)\b|\bun amigo\b|\buna amiga\b/;
const FIRST_RE = /\b(me siento|me siente|me encuentro|siento|estoy|tengo|yo)\b/;

function detectAudience(norm) {
  if (FIRST_RE.test(norm)) return 'self';
  if (PARENT_RE.test(norm)) return 'parent';
  if (OTHER_RE.test(norm)) return 'other';
  return 'self';
}

// ---------------------------------------------------------------------
// Conversacion general (saludos, identidad, privacidad, etc.)
// ---------------------------------------------------------------------

const EMERGENCY_RE = /\b(ayuda urgente|es una emergencia|emergencia|auxilio|socorro|urgente|necesito ayuda ya|ayuda ya|ahora mismo necesito ayuda|me urge)\b/;

const SMALLTALK = [
  {
    test: (norm) => /\b(eres (muy |un |una |re )?(estupid\w*|idiot\w*|inutil|tont\w*|basura|malo|mala|pesad\w*|inservible)|bot (estupido|inutil|tonto|malo)|no sirves|que bot tan)\b/.test(norm),
    reply: (n) => `${n}entiendo que estés molesto/a, y está bien. Si te frustró algo de lo que dije, perdona: soy un asistente y a veces no acierto. Cuéntame qué necesitas y lo intento de nuevo, o si prefieres hablar con una persona, en "Contacto" tienes el camino y las líneas ${LINES}.`,
  },
  {
    test: (norm, t) => t.length <= 4 && /^(hola|holi|holaa+|ola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|hi|saludos|que mas|quiubo|buenas buenas)\b/.test(norm),
    reply: (n, name) => pick([
      `Hola ${name || ''}, qué bueno verte por aquí. 💜 ¿Cómo está tu ánimo hoy?`,
      `Hola. ¿Cómo estás llegando hoy${name ? ', ' + name : ''}? Puedes contarme o preguntarme lo que quieras.`,
      `Hola ${name || ''} 💜 Te escucho: ¿qué te gustaría contarme o saber?`,
    ]),
  },
  {
    test: (norm, t) => t.length <= 6 && /\b(gracias|agradezco|thank|thanks)\b/.test(norm),
    reply: (n) => pick([
      `${n}no hay nada que agradecer. Gracias a ti por confiar y compartir esto, eso ya requiere valentía. ¿Hay algo más en lo que pueda acompañarte?`,
      `${n}con gusto. Estoy aquí para lo que necesites; si quieres seguir hablando o preguntarme algo más, adelante. 💜`,
    ]),
  },
  {
    test: (norm, t) => t.length <= 8 && /\b(adios|chao|chau|hasta luego|nos vemos|me voy|bye|hasta pronto|hasta manana)\b/.test(norm),
    reply: (n) => `${n}antes de irte: no estás enfrentando esto solo/a, aunque a veces se sienta así. Este espacio y el equipo profesional detrás seguirán aquí. Si más tarde te sientes mal, vuelve o llama a ${LINES}. Cuídate mucho. 💜`,
  },
  {
    test: (norm) => /\b(como estas|como te va|como andas|que tal estas|como te sientes tu)\b/.test(norm),
    reply: () => 'Qué lindo que preguntes. 💜 Estoy bien para escucharte. Pero este espacio es para ti: dime, ¿cómo estás TÚ de verdad?',
  },
  {
    test: (norm) => /\b(quien eres|que eres|eres (un |una )?(robot|humano|humana|persona|ia|bot|maquina|real|psicologo|psicologa|medico|doctor)|con quien hablo|como te llamas|tu nombre|eres inteligencia artificial)\b/.test(norm),
    reply: (n) => p(
      `${n}soy el asistente de AIMotion: un programa de apoyo y tamizaje, no una persona ni un profesional de salud mental. Funciono con conocimiento basado en las guías de la OMS y reglas diseñadas junto a profesionales, y no diagnostico ni receto.`,
      'Lo que sí hago: escucharte, darte información sobre depresión, ansiedad, estrés y esquizofrenia (también si preguntas por un hijo/a o un ser querido), y avisar a un profesional humano si detecto una señal de riesgo importante. ¿Cómo te puedo acompañar hoy?'
    ),
  },
  {
    test: (norm) => /\b(que puedes hacer|en que me puedes ayudar|para que sirves|que haces|que sabes|que temas|de que sabes|de que puedes hablar|que ofreces)\b/.test(norm),
    reply: (n) => p(
      `${n}puedo ayudarte de varias maneras:`,
      '• Escucharte y acompañarte cuando algo te pesa.\n• Explicarte qué son la depresión, la ansiedad, el estrés y la esquizofrenia: síntomas, causas, tratamiento, cuándo consultar y mitos.\n• Orientarte si preguntas por un hijo/a o un ser querido: señales de alerta y cómo acompañar.\n• Compartirte técnicas sencillas (respiración, anclaje, rutinas).\n• Guiarte para buscar ayuda profesional, y aplicar cuestionarios de tamizaje (PHQ-9 y GAD-7).',
      '¿Por dónde quieres empezar?'
    ),
  },
  {
    test: (norm) => /\b(es confidencial|confidencialidad|quien (ve|lee|puede ver|puede leer) (lo que|mis)|guardan (mis|lo que)|mis datos|privacidad|es privado|es seguro hablar aqui)\b/.test(norm),
    reply: (n) => p(
      `${n}te lo digo con total transparencia: lo que escribes aquí puede ser revisado por el equipo profesional a cargo, como parte de tu cuidado, y se guarda de forma asociada a tu cuenta si la creaste (o a una sesión anónima si no).`,
      'Si detecto una señal de riesgo crítico se avisa a un profesional y, solo si tienes cuenta y diste tu consentimiento, a tu contacto de emergencia con un SMS breve que NO incluye lo que escribiste. Nadie más tiene acceso.'
    ),
  },
  {
    test: (norm) => /\b(me vas a juzgar|me juzgas|me van a juzgar|me vas a regan|vas a decir a alguien|le vas a contar a)\b/.test(norm),
    reply: (n) => `${n}aquí no hay juicio. Puedes contar lo que sientes con tus palabras, sin filtros. Lo único que puede cambiar si cuentas algo es que, si noto una señal de riesgo importante, aviso a un profesional para que te cuide, porque tu seguridad importa. ¿Qué te gustaría contarme?`,
  },
  {
    test: (norm) => /\b(no confio|no creo que me puedas ayudar|no me vas a poder ayudar|esto no sirve|de que sirve hablar|no sirve de nada|hablar no ayuda|nadie me puede ayudar|no hay nada que hacer)\b/.test(norm),
    reply: (n) => p(
      `${n}entiendo que dudes: cuando uno lleva tiempo mal, es lógico que cueste creer que algo ayude. No voy a prometerte magia: soy un asistente, no un profesional ni una solución completa.`,
      'Lo que sí puedo ofrecerte es escucharte sin juicio, darte información clara y ayudarte a dar el siguiente paso hacia alguien que sí pueda acompañarte. A veces hablar y poner en palabras ya baja un poco el peso. Si quieres, cuéntame qué es lo que más te pesa hoy.'
    ),
  },
  {
    test: (norm) => /\b(no quiero hablar|no tengo ganas de hablar|dejame en paz|no me preguntes|no quiero contar|prefiero no hablar|callate)\b/.test(norm),
    reply: (n) => `${n}está bien, no tienes que hablar si no quieres, y no te voy a presionar. Aquí estaré cuando lo necesites. Si prefieres otra forma, puedes hacer un cuestionario de tamizaje (PHQ-9 / GAD-7) sin tener que explicar nada, o llamar a ${LINES}. 💜`,
  },
  {
    test: (norm) => /\b(eres (muy )?(buen|lind|amable|genial|util|increible)\w*|me caes bien|me ayudas mucho|me ayudaste|me haces sentir mejor|me sirvio)\b/.test(norm),
    reply: (n) => `${n}me alegra mucho que te sientas acompañado/a. 💜 El mérito es tuyo por animarte a hablar. ¿Hay algo más que quieras contarme o preguntarme?`,
  },
  {
    test: (norm) => /\b(chiste|cuentame algo gracioso|hazme reir|algo divertido|cuentame un cuento)\b/.test(norm),
    reply: (n) => `${n}me encantaría sacarte una sonrisa, aunque no soy muy bueno/a con los chistes. 😅 Un dato que sí funciona: reírse relaja el cuerpo y baja la tensión. Si quieres algo ligero, cuéntame algo que te haya gustado hoy, por pequeño que sea. ¿Cómo va tu día en realidad?`,
  },
  {
    test: (norm) => /\b(hablar con (un|una) (humano|humana|persona|psicologo|psicologa|profesional|medico|doctor|doctora|terapeuta)|quiero (un|una) (humano|persona real|psicologo|psicologa)|pasame con|me atiende una persona|hay alguien real)\b/.test(norm),
    reply: (n) => p(
      `${n}claro, y es una buena decisión. Para hablar con una persona:`,
      `• Orientación inmediata, 24/7: ${LINES}.\n• Crea una cuenta gratuita en AIMotion: así el equipo profesional puede revisar tu caso y darte seguimiento.\n• Por tu EPS: cita de medicina general y solicitud de remisión a psicología o psiquiatría.\n• En la sección "Contacto" tienes los datos del equipo.`,
      'Mientras tanto, aquí sigo contigo si quieres contarme qué está pasando.'
    ),
  },
  {
    test: (norm) => /\b(estoy aburrid[oa]|me aburro|que hago de aburrid[oa])\b/.test(norm),
    reply: (n) => `${n}el aburrimiento a veces es cansancio, falta de estímulo o hasta ánimo bajo disfrazado. ¿Es algo de hoy o llevas días sin ganas de nada? Si es lo segundo, cuéntame más: puede ser importante.`,
  },
  {
    test: (norm) => /\b(clima|futbol|partido|receta de|politica|presidente|bitcoin|criptomoneda|tarea de|resuelve|calcula|capital de|quien gano|pelicula|cancion|musica|horoscopo|loteria)\b/.test(norm),
    reply: (n) => `${n}eso se sale de lo que mejor sé hacer: mi especialidad es acompañarte en temas de bienestar emocional (depresión, ansiedad, estrés, esquizofrenia) y orientarte hacia ayuda profesional. Para ese tema te recomiendo otra herramienta. Pero si algo de eso te está generando estrés o preocupación, cuéntamelo: ahí sí puedo ayudarte. 💜`,
  },
];

const ACK_SET = new Set([
  'si', 'sii', 'siii', 'no', 'nop', 'nope', 'claro', 'aja', 'ok', 'okay', 'okey', 'vale', 'listo', 'mmm', 'mm', 'hmm', 'ya',
  'tal vez', 'quizas', 'puede ser', 'no se', 'nose', 'un poco', 'mucho', 'bastante', 'mas o menos', 'regular', 'normal',
  'igual', 'si claro', 'pues si', 'eso', 'exacto', 'correcto', 'cierto', 'creo que si', 'creo que no', 'a veces', 'siempre',
  'nunca', 'casi siempre', 'todos los dias', 'a diario', 'ahora si', 'pues no', 'supongo', 'tal vez si', 'la verdad si', 'la verdad no',
]);

const ACK_PREFIX = ['Gracias por responderme.', 'Te entiendo.', 'Entiendo.', 'Te leo.', 'Gracias por contarme.'];

// Preguntas de seguimiento cuando la persona habla de alguien mas (hijo/a, familiar...)
const OTHERS_POOL = [
  () => 'Para orientarte mejor: ¿qué edad tiene y desde cuándo notas estos cambios? ¿Han afectado su sueño, su estudio o trabajo, o su relación con los demás?',
  () => '¿Ya ha sido valorado/a por un médico o un profesional de salud mental? Si no, un buen primer paso es una cita de medicina general o pediatría (por EPS) para que lo remitan a psicología o psiquiatría.',
  () => '¿Cómo reacciona cuando le hablas del tema? A veces conviene empezar con "te noto distinto/a y me importa cómo estás", sin interrogar ni presionar, y escuchar más de lo que se habla.',
  () => '¿Cuenta con una red de apoyo (familia, colegio, amigos) que pueda acompañar? Coordinar entre varios adultos de confianza ayuda mucho.',
  () => 'Y tú, ¿cómo estás llevando esto? Acompañar a alguien también desgasta, y mereces apoyo.',
];

const MENU = p(
  'Para orientarme mejor, ¿cuál de estas se parece más a lo que vives?',
  '• Ánimo bajo, tristeza o pérdida de interés (depresión)\n• Preocupación, miedo o nervios constantes (ansiedad)\n• Agotamiento por exceso de carga o presión (estrés)\n• Pensamientos o percepciones extrañas, en ti o en alguien cercano (esquizofrenia/psicosis)\n• Algo con mi hijo/a o un ser querido\n• Otra cosa, que me quieras contar libremente',
  'Puedes elegir una, mezclar varias o simplemente escribirme con tus palabras.'
);

const NEGATIVE_STEMS = ['mal', 'feo', 'horrible', 'fatal', 'pesim', 'terrible', 'angusti', 'dolor', 'sufr', 'llor', 'harto', 'harta', 'cansad', 'agotad', 'dificil', 'complicad', 'pesad', 'jodid', 'fregad', 'raro', 'rara', 'confus', 'extran', 'incomod', 'tenso', 'decaid', 'solo', 'sola', 'preocupad', 'mie'];
const POSITIVE_STEMS = ['bien', 'mejor', 'tranquil', 'content', 'feliz', 'alegr', 'agradecid', 'genial', 'excelente', 'animad', 'motivad'];

function fallbackReply(msg, norm, tokens, n) {
  const negated = /\bno (me siento|estoy|me encuentro|ando|me va)( muy| tan| nada)? (bien|tranquil[oa]|content[oa]|feliz)\b/.test(norm) || /\bno (estoy|me siento) bien\b/.test(norm);
  const neg = negated || /\b(no se que (me pasa|tengo|siento)|algo me pasa|me pasa algo|vida es (dura|dificil|injusta|un desastre)|todo me sale mal|nada me sale bien|mala racha)\b/.test(norm) || tokens.some((t) => NEGATIVE_STEMS.some((s) => t.startsWith(s)));
  const pos = !neg && tokens.some((t) => POSITIVE_STEMS.some((s) => t.startsWith(s)));
  const isQuestion = msg.includes('?') || /^(que|como|por que|cual|cuando|donde|quien|puedo|puedes|sirve|es |hay |se puede)\b/.test(norm);
  const snippet = msg.split(/\s+/).slice(0, 10).join(' ');
  const longMsg = tokens.length >= 12;

  if (isQuestion) {
    return p(
      `${n}buena pregunta, y quiero responderte lo mejor posible. Mi especialidad es la depresión, la ansiedad, el estrés y la esquizofrenia (y orientar a familias). Si tu pregunta va por ahí, escríbemela con otras palabras (por ejemplo "¿qué es...?", "¿cómo ayudo a...?", "¿cuáles son los síntomas de...?") y te respondo con detalle.`,
      'Si es sobre otro tema, cuéntame un poco más y te oriento sobre qué hacer y con qué profesional hablarlo. ' + pick(FOLLOW_UPS)
    );
  }
  if (neg) {
    return p(
      pick([
        `${n}lamento que no te sientas bien. Gracias por decírmelo: no tienes que tener todo claro para hablar conmigo.`,
        `${n}te leo, y siento que estés pasando por esto. Podemos ir a tu ritmo.`,
        `${n}gracias por contármelo. Lo que sientes importa, aunque aún no sepas ponerle nombre.`,
      ]),
      longMsg ? `Me dices: "${snippet}…". Eso parece pesar. ¿Qué es lo que más te cuesta de todo esto ahora?` : '¿Desde cuándo te sientes así, y qué crees que lo empezó o lo mantiene?',
      MENU
    );
  }
  if (pos) {
    return p(
      `${n}me alegra leer eso. 💜 Aprovecha para notar qué te ayudó a estar mejor: sirve para los días más difíciles.`,
      '¿Qué te gustaría hacer hoy: conversar sobre algo que tengas en mente, informarte sobre algún tema (depresión, ansiedad, estrés, esquizofrenia) o aprender alguna técnica de bienestar?'
    );
  }
  if (longMsg) {
    return p(
      `${n}gracias por contármelo con tanto detalle. Me quedo con esto que me dices: "${snippet}…".`,
      'Quiero entender qué es lo que más pesa para ti. ¿Cómo te hace sentir todo esto (triste, con miedo, agotado/a, confundido/a, enojado/a)?',
      MENU
    );
  }
  return p(
    `${n}quiero entenderte bien para acompañarte mejor, y estoy aquí, sin prisa.`,
    '¿Qué está pasando contigo en este momento? Puedes contarme con tus palabras, o preguntarme algo concreto (por ejemplo "¿qué es la ansiedad?", "¿cómo sé si es depresión?" o "¿cómo ayudo a mi hijo?").',
    MENU
  );
}

// ---------------------------------------------------------------------
// Respuestas por tema
// ---------------------------------------------------------------------

function helpText(topic, audience) {
  if (audience === 'parent') return topic.helpParent || topic.helpOthers || null;
  return topic.helpOthers || null;
}

/** Respuesta a una pregunta concreta (FAQ) sobre un tema. Devuelve null si no hay. */
function faqReply(topicKey, intent, audience, n, norm) {
  const topic = ALL_TOPICS[topicKey];
  if (!topic) return null;

  let key = intent;
  if (audience !== 'self' && key === 'tratamiento') key = 'ayudar';

  let body = null;
  if (key === 'ayudar') body = helpText(topic, audience);
  else body = topic.faq?.[key] ?? null;

  if (!body && key === 'medicacion') body = UNIVERSAL.medicacion;
  if (!body && key === 'cuando') body = UNIVERSAL.cuando;
  if (!body) return null;

  let text = resolve(body, n);
  const opener = audience === 'self' && FIRST_RE.test(norm) ? pick(['Gracias por contármelo, y qué bueno que preguntes.', 'Te leo, y quiero ayudarte con esto.', 'Entiendo, y es muy válido que quieras saberlo.']) + '\n\n' : '';
  const closing = text.trim().endsWith('?') ? '' : '\n\n' + pick(FOLLOW_UPS);
  return opener + text + closing;
}

/** Siguiente paso de una conversacion ya iniciada en un tema. */
function continueTopic(ctx, n, shortAck) {
  const topic = ALL_TOPICS[ctx.topic];
  const turn = ctx.turn + 1;
  const prefix = shortAck ? pick(ACK_PREFIX) + '\n\n' : '';

  if (ctx.audience !== 'self') {
    const q = OTHERS_POOL[(turn - 1) % OTHERS_POOL.length]();
    const extra = turn % 3 === 0 ? '\n\n' + NEXT_STEPS[Math.floor(turn / 3) % NEXT_STEPS.length] : '';
    return { text: prefix + q + extra, turn };
  }

  if (turn < topic.levels.length) {
    return { text: resolve(topic.levels[turn], n), turn };
  }
  // Niveles agotados: preguntas reflexivas rotativas + siguiente paso de vez en cuando
  const idx = turn - topic.levels.length;
  const q = DEEPENING_POOL[idx % DEEPENING_POOL.length](topic.label);
  const extra = idx % 2 === 1 ? '\n\n' + NEXT_STEPS[Math.floor(idx / 2) % NEXT_STEPS.length] : '';
  return { text: (shortAck ? prefix : pick(['Te escucho.', 'Gracias por seguir contándome.', 'Sigo aquí contigo.']) + '\n\n') + q + extra, turn };
}

function detectName(msg) {
  let m = msg.match(/\b(?:me llamo|mi nombre es|puedes llamarme|llamame|dime)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]{2,20})/i);
  if (!m) m = msg.match(/\b[Ss]oy ([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,19})\b/);
  if (!m) return null;
  const word = m[1];
  const stop = new Set(['muy', 'una', 'un', 'el', 'la', 'mama', 'papa', 'padre', 'madre', 'estudiante', 'nuevo', 'nueva', 'tan', 'solo', 'sola', 'asi', 'asi,', 'yo', 'que', 'como', 'poco', 'mucho']);
  if (stop.has(normalize(word))) return null;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * @param {string} userMessage
 * @param {string} userName
 * @param {{topic: string|null, turn: number, audience?: 'self'|'parent'|'other'}} context
 * @returns {{text: string, detectedName: string|null, topic: string|null, turn: number, audience: string}}
 */
export function getBotResponse(userMessage, userName, context = {}) {
  const ctx = { topic: context.topic || null, turn: context.turn || 0, audience: context.audience || 'self' };
  const msg = String(userMessage || '').trim();
  const norm = normalize(msg);
  const tokens = norm ? norm.split(' ') : [];
  const n = userName ? `${userName}, ` : '';

  const out = (text, over = {}) => ({
    text,
    detectedName: null,
    topic: ctx.topic,
    turn: ctx.turn,
    audience: ctx.audience,
    ...over,
  });

  if (!norm) return out('Te leo. Escribe lo que quieras con tus palabras, o pregúntame lo que necesites saber. 💜');

  // 1. Nombre
  const name = !userName ? detectName(msg) : null;
  if (name) {
    return out(`Un gusto conocerte, ${name}. 💜 Gracias por compartir tu nombre.\n\n¿Qué te trae por aquí hoy, ${name}?`, { detectedName: name });
  }

  // 2. Emergencia expresa
  if (EMERGENCY_RE.test(norm)) return out(UNIVERSAL.emergencia);

  // 3. Conversacion general
  for (const s of SMALLTALK) {
    if (s.test(norm, tokens)) return out(s.reply(n, userName));
  }

  // 4. Tema + intencion + audiencia
  const scores = scoreTopics(norm, tokens);
  const intent = detectIntent(norm);
  const referenceToOther = PARENT_RE.test(norm) || OTHER_RE.test(norm);
  let topicKey = null;

  if (scores.length) {
    if (scores.some(([k]) => k === 'riesgo_cercano')) {
      topicKey = 'riesgo_cercano'; // prioridad de seguridad
    } else {
      topicKey = scores[0][0];
      const cond = scores.find(([k]) => CONDITIONS.includes(k));
      if (cond && referenceToOther && !FIRST_RE.test(norm)) topicKey = cond[0];
      else if (topicKey === 'padres' && cond) topicKey = cond[0];
    }
  }

  // Un sintoma mencionado dentro de una conversacion sobre una condicion suele
  // ser la respuesta a una pregunta del asistente: se continua el hilo.
  if (
    topicKey && ctx.topic && topicKey !== ctx.topic && !intent &&
    CONDITIONS.includes(ctx.topic) && SYMPTOM_TOPICS.includes(topicKey) && tokens.length <= 14
  ) {
    topicKey = null;
  }

  // 4a. Se detecto un tema en este mensaje
  if (topicKey) {
    const isCondition = CONDITIONS.includes(topicKey);
    const audience = isCondition ? detectAudience(norm) : 'self';
    const sameThread = topicKey === ctx.topic && audience === ctx.audience;

    if (intent) {
      const faq = faqReply(topicKey, intent, audience, n, norm);
      if (faq) return out(faq, { topic: topicKey, turn: sameThread ? ctx.turn : 0, audience });
    }

    const topic = ALL_TOPICS[topicKey];
    if (audience !== 'self') {
      const help = helpText(topic, audience);
      if (help && !sameThread) return out(resolve(help, n), { topic: topicKey, turn: 0, audience });
      return out(continueTopic({ ...ctx, topic: topicKey, audience, turn: ctx.turn }, n, false).text, {
        topic: topicKey,
        turn: ctx.turn + 1,
        audience,
      });
    }

    const turn = sameThread ? Math.min(ctx.turn + 1, 999) : 0;
    let result;
    if (!sameThread || turn < topic.levels.length) {
      result = { text: resolve(topic.levels[Math.min(turn, topic.levels.length - 1)], n), turn };
    } else {
      result = continueTopic({ topic: topicKey, turn: ctx.turn, audience: 'self' }, n, false);
    }
    let text = result.text;
    // Mencion de un segundo tema, para que la persona sienta que se le escucho todo
    const second = scores.find(([k, s]) => k !== topicKey && k !== 'padres' && s >= 1.5);
    if (second && result.turn === 0) {
      text += `\n\n(Mencionaste también algo sobre ${ALL_TOPICS[second[0]].label}; si quieres, lo vemos después.)`;
    }
    return out(text, { topic: topicKey, turn: result.turn, audience });
  }

  // 4b. Pregunta concreta sin tema nuevo: se responde sobre el tema en curso (o universal)
  if (intent) {
    if (ctx.topic) {
      const faq = faqReply(ctx.topic, intent, ctx.audience, n, norm);
      if (faq) return out(faq);
    }
    if (intent === 'medicacion') return out(UNIVERSAL.medicacion + '\n\n' + pick(FOLLOW_UPS));
    if (intent === 'cuando') return out(UNIVERSAL.cuando + '\n\n' + pick(FOLLOW_UPS));
  }

  // 4c. Pedido generico de consejo / herramientas
  if (/\b(consejos?|que hago|que puedo hacer|como me calmo|como calmarme|ayudame|necesito ayuda|dame (un|algun)|recomiendas|tips|que me sugieres|como me siento mejor|como mejorar)\b/.test(norm) && !ctx.topic) {
    return out(UNIVERSAL.caja_herramientas);
  }

  // 5. Continuacion del hilo (respuestas cortas o mensajes sin tema nuevo)
  if (ctx.topic && ALL_TOPICS[ctx.topic]) {
    const shortAck = tokens.length <= 3 || ACK_SET.has(norm);
    const r = continueTopic(ctx, n, shortAck);
    return out(r.text, { turn: r.turn });
  }

  // 6. Respuesta corta sin contexto previo
  if (ACK_SET.has(norm) || tokens.length <= 2) {
    return out(`${n}gracias por responderme. Cuéntame un poco más, con tus palabras, para entenderte mejor. ¿Qué es lo que más te está pesando?\n\n${MENU}`);
  }

  // 7. Ultimo recurso: nunca hay "no entiendo"
  return out(fallbackReply(msg, norm, tokens, n));
}
