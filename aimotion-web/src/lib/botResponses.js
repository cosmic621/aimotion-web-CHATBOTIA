// Asistente conversacional de apoyo asistido y tamizaje.
//
// DELIMITACION (Human-in-the-Loop): este modulo NO diagnostica, NO prescribe
// y NO realiza psicoterapia autonoma. Ofrece psicoeducacion general y
// recoleccion estructurada de informacion preliminar. Los factores de riesgo
// critico son interceptados ANTES de llegar aqui por src/lib/riskEngine.js,
// que desactiva este flujo y activa el protocolo de escalamiento hacia un
// profesional. Todo hallazgo relevante queda registrado para revision humana.
//
// ENFOQUE CLINICO: el contenido psicoeducativo se concentra en depresion,
// ansiedad, estres y esquizofrenia, en linea con los criterios de la CIE-11
// reflejados en las notas descriptivas de la OMS (who.int/es/news-room/
// fact-sheets/detail/mental-disorders, .../depression, .../schizophrenia).
//
// MEMORIA DE TEMA: a diferencia de un simple matcher de palabras clave sin
// estado, este modulo recibe un "context" ({ topic, turn }) que representa
// de que esta hablando la persona y en que profundidad de esa conversacion
// va. Si el siguiente mensaje no activa ningun tema nuevo (p.ej. una persona
// respondiendo "hace como un mes" a una pregunta de seguimiento), el bot NO
// cae en una respuesta generica desconectada: continua profundizando en el
// mismo tema. Esto es lo que le da sensacion de conversacion fluida sin
// depender de un modelo de lenguaje externo.

export const INTRO_MESSAGE =
  'Hola, qué bueno que estés aquí. 💜\n\n' +
  'Quiero ser transparente contigo desde el inicio: soy un asistente de apoyo y tamizaje, no un ' +
  'profesional de salud mental. No diagnostico ni reemplazo una consulta clínica. Lo que sí puedo ' +
  'hacer es escucharte, darte información útil y, si noto una señal de riesgo importante, avisar de ' +
  'inmediato a un profesional de la red de apoyo.\n\n' +
  'Lo que compartas aquí puede ser revisado por el equipo profesional a cargo, como parte de tu cuidado.\n\n' +
  '¿Cómo estás hoy, de verdad?';

function pick(options) {
  return options[Math.floor(Math.random() * options.length)];
}

// ---------------------------------------------------------------------
// Definicion de temas. Cada tema tiene palabras clave de activacion y un
// arreglo "levels" de funciones que generan la respuesta para ese nivel de
// profundidad (0 = primera vez que se toca el tema, 1 = segunda vez, etc).
// La ultima funcion del arreglo se reutiliza si la conversacion sigue mas
// alla de los niveles definidos.
// ---------------------------------------------------------------------

const TOPICS = {
  depresion: {
    keywords: ['triste', 'deprimid', 'depresión', 'depresion', 'vacío', 'vacía', 'sin ganas', 'no tengo energia', 'no tengo energía', 'no disfruto'],
    levels: [
      (name) => pick([
        `${name}gracias por contarme esto, no es fácil ponerlo en palabras.`,
        `${name}siento que estés pasando por esto.`,
        `${name}te escucho. Lo que describes pesa, y es válido sentirlo así.`,
      ]) + '\n\n' +
        'Una cosa que quiero que sepas: la tristeza pasajera y la depresión no son lo mismo. ' +
        'Cuando el ánimo bajo (o la pérdida de interés en cosas que antes disfrutabas) se mantiene ' +
        'casi todos los días durante dos semanas o más, y viene con otras cosas como dificultad para ' +
        'concentrarte, cambios en el sueño o el apetito, o sentirte sin energía, ya no es "solo un mal ' +
        'momento" — es algo que vale la pena mirar con un profesional, y tiene tratamiento eficaz.\n\n' +
        '¿Hace cuánto te sientes así? ¿Fue algo gradual o empezó de golpe, con algo puntual?',

      (name) => `${name}gracias por darme más contexto, eso ayuda mucho a entender tu situación.\n\n` +
        'Te pregunto un par de cosas más, sin prisa: ¿cómo ha estado tu sueño últimamente (duermes de más, ' +
        'de menos, o te cuesta conciliarlo)? ¿Y el apetito, ha cambiado?\n\n' +
        'No es un interrogatorio, es que esos detalles son justo los que un profesional necesitaría saber ' +
        'para entender bien lo que te pasa. Si quieres verlo de forma más estructurada, el PHQ-9 en ' +
        '"Tamizaje" recoge exactamente estos puntos en unos minutos, y el resultado queda disponible para ' +
        'quien te acompañe.',

      (name) => `${name}lo que describes suena a algo que no deberías cargar solo/a por más tiempo.\n\n` +
        'Con depresión, moverse un poco (aunque sea salir a caminar 10 minutos), mantener algo de rutina ' +
        'de sueño, y no aislarte del todo ayudan a sostenerte, pero no reemplazan el tratamiento: la terapia ' +
        'psicológica tiene buena evidencia, y en algunos casos la medicación también ayuda.\n\n' +
        '¿Ya hablaste de esto con alguien más (familia, amigos, algún profesional), o yo soy la primera ' +
        'persona a quien se lo cuentas? Y en la sección "Contacto" tienes el camino para dar ese siguiente paso cuando estés listo/a.',
    ],
  },

  ansiedad: {
    keywords: ['ansied', 'pánico', 'panico', 'no puedo respirar', 'taquicardia', 'nervios', 'preocup', 'miedo'],
    levels: [
      (name) => pick([
        `${name}vamos a respirar juntos un momento, ¿sí?`,
        `${name}entiendo, eso que describes se siente muy intenso en el cuerpo.`,
        `${name}gracias por decírmelo. La ansiedad puede ser abrumadora, vamos paso a paso.`,
      ]) + '\n\n' +
        '🫁 Si lo necesitas ahora mismo:\n1. Mano en el pecho\n2. Inhala contando hasta 4\n3. Sostén 4 segundos\n' +
        '4. Exhala en 6\n5. Repite unas cuantas veces.\n\n' +
        'La ansiedad no es "exagerar" — es una respuesta real del cuerpo, y cuando el miedo o la ' +
        'preocupación son excesivos y persistentes, afectando tu día a día, es tratable: hay terapia ' +
        'psicológica con buena evidencia, y en algunos casos también medicación.\n\n' +
        '¿Esto te pasa casi todos los días, o fue algo puntual que lo disparó?',

      (name) => `${name}sigamos entendiendo esto juntos.\n\n` +
        '¿Identificas algo específico que lo dispara (situaciones sociales, pensar en el futuro, tu salud, ' +
        'el trabajo/estudio), o aparece sin razón clara? Y cuando te da fuerte, ¿se parece a un ataque de ' +
        'pánico (corazón acelerado, sensación de ahogo, mareo) o es más una preocupación constante que no para?\n\n' +
        'La escala GAD-7 (en "Tamizaje") te puede ayudar a verlo de forma más objetiva si quieres.',

      (name) => `${name}algo que suele ayudar además de la respiración es la técnica de anclaje: nombra en ` +
        'voz alta 5 cosas que ves, 4 que tocas, 3 que escuchas, 2 que hueles, 1 que saboreas. Ayuda a ' +
        'sacar la mente del bucle de preocupación y traerte al presente.\n\n' +
        '¿Cuánto tiempo llevas lidiando con esto? Si ya es algo de varios meses y está afectando tu día a ' +
        'día, de verdad vale la pena hablarlo con un profesional, en "Contacto" tienes cómo dar ese paso.',
    ],
  },

  estres: {
    keywords: ['estres', 'estrés', 'agobiad', 'abrumad', 'no puedo más', 'no doy mas', 'demasiado', 'presión', 'presion', 'burnout', 'saturad'],
    levels: [
      (name) => pick([
        `${name}para un segundo. Respira.`,
        `${name}el solo hecho de que estés aquí ya dice que necesitas un respiro.`,
        `${name}eso suena a demasiado para cargar solo/a.`,
      ]) + '\n\n' +
        'El estrés no siempre es "malo" — en dosis puntuales nos ayuda a reaccionar. El problema es cuando ' +
        'se vuelve constante y el cuerpo no tiene tiempo de recuperarse: ahí empieza a afectar el sueño, el ' +
        'ánimo, la concentración y hasta la salud física.\n\n' +
        '¿Has comido, tomado agua y dormido bien hoy? 🛑 Si puedes ahora mismo: silencia notificaciones ' +
        '30 minutos, respira profundo 5 veces, y pregúntate "¿qué es lo MÁS urgente ahora?" — una sola cosa, no diez.\n\n' +
        '¿Qué te tiene así? ¿Trabajo, estudios, algo personal, todo junto?',

      (name) => `${name}entiendo mejor el panorama.\n\n` +
        '¿Hace cuánto se siente así de constante? Y una pregunta directa: ¿sientes que tienes algo de ' +
        'control sobre la situación, aunque sea parcial, o se siente completamente fuera de tus manos?\n\n' +
        'Eso cambia bastante qué hacer: si hay algo de control, sirve priorizar y delegar lo que se pueda; ' +
        'si se siente fuera de control del todo, el enfoque es más sobre cómo sostenerte mientras tanto.',

      (name) => `${name}cuando el estrés se vuelve crónico (meses, no días), ya no basta con "descansar un ` +
        'fin de semana" — el cuerpo necesita una recuperación más sostenida, y a veces eso implica hacer ' +
        'cambios reales (delegar, decir que no a algo, buscar apoyo).\n\n' +
        '¿Has notado que esto te esté afectando físicamente (dolores de cabeza, problemas para dormir, ' +
        'cambios de apetito)? Si es así, vale la pena que lo converses con un profesional, no solo para el ' +
        'ánimo sino también para tu salud en general.',
    ],
  },

  esquizofrenia: {
    keywords: ['esquizofrenia', 'esquizofrénic', 'esquizofrenica', 'esquizofrenico'],
    levels: [
      (name) => `${name}gracias por preguntar, y qué bueno que quieras entender más sobre esto.\n\n` +
        'La esquizofrenia es un trastorno mental serio, pero es importante que sepas: es tratable. Según la ' +
        'OMS, con el tratamiento adecuado (medicación, psicoeducación, apoyo familiar y rehabilitación ' +
        'psicosocial), al menos una de cada tres personas se recupera por completo, y muchas más llevan una ' +
        'vida funcional con el acompañamiento correcto. No es "locura" ni algo de lo que avergonzarse, el ' +
        'estigma alrededor de esto suele hacer más daño que la enfermedad misma.\n\n' +
        '¿Me cuentas un poco más de tu situación? ¿Es algo que tú estás viviendo, o es sobre alguien ' +
        'cercano a ti?',

      (name) => `${name}te cuento un poco más, porque entender esto ayuda mucho a acompañar bien.\n\n` +
        'La causa no es "una sola cosa" — es una combinación de factores genéticos y ambientales. Lo más ' +
        'importante para el pronóstico es la continuidad del tratamiento con psiquiatría, y que la familia ' +
        'también reciba información y apoyo, eso mejora muchísimo los resultados. El aislamiento y el ' +
        'abandono del tratamiento son los principales riesgos de recaída.\n\n' +
        'Si es alguien cercano a ti, ¿cómo está el apoyo familiar alrededor de esa persona ahora mismo?',

      (name) => `${name}algo que mucha gente no sabe: hay distintos niveles de apoyo según la etapa — desde ` +
        'intervención familiar y psicoeducación, hasta rehabilitación psicosocial para recuperar ' +
        'autonomía (vivienda, trabajo). No es un camino lineal, pero sí hay camino.\n\n' +
        'Si en algún momento tú o la persona que te importa nota síntomas activos (escuchar o ver cosas ' +
        'que otros no perciben, ideas que no encajan con la realidad), dímelo directo — eso lo priorizamos ' +
        'distinto, conectando con apoyo profesional de inmediato. Mientras tanto, en "Contacto" tienes ' +
        'líneas y recursos.',
    ],
  },

  soledad: {
    keywords: ['solo', 'sola', 'soledad', 'nadie', 'aislad', 'sin amigos', 'no tengo a nadie'],
    levels: [
      (name) => `${name ? name + '...' : 'Oye...'} estoy aquí. Sé que no es lo mismo que tener a alguien cerca, pero en este momento no estás del todo solo/a.\n\nLa soledad no significa que algo esté "mal" contigo. A veces significa que no te sientes visto/a, o que las conexiones que tienes se sienten superficiales.\n\n¿Es que literalmente no tienes personas cerca, o tienes gente pero te sientes desconectado/a igual?`,
      (name) => `${name}entiendo mejor tu situación.\n\n¿Esto es algo reciente (cambiaste de ciudad, terminaste una relación, perdiste contacto con gente) o ha sido así por mucho tiempo? Y una pregunta honesta: ¿te está costando trabajo dar el primer paso para acercarte a alguien, o sientes que ya lo intentaste y no funcionó?`,
    ],
  },

  pareja: {
    keywords: ['pareja', 'novio', 'novia', 'relacion', 'relación', 'terminamos', 'ruptura', 'infiel', 'me engañ', 'ya no me quiere', 'me dejo', 'me dejó'],
    levels: [
      (name) => `${name}el dolor de una ruptura o un rechazo es real, activa zonas del cerebro parecidas a las del dolor físico, así que lo que sientes tiene sentido.\n\n¿Qué pasó? ¿Terminaron, hay problemas pero siguen juntos, o fue algo más difícil?`,
      (name) => `${name}gracias por contarme más.\n\n¿Cómo estás llevando los días desde que pasó esto? Y algo importante: ¿tienes a alguien con quien hablarlo además de mí (amigos, familia)? No tienes que procesarlo completamente solo/a.`,
    ],
  },

  familia: {
    keywords: ['familia', 'padre', 'madre', 'mamá', 'papá', 'hermano', 'hermana'],
    levels: [
      (name) => `${name}los conflictos familiares duelen distinto, porque son con gente que no elegiste y con quien compartes historia.\n\n¿Qué está pasando? ¿Es algo nuevo o un conflicto de años?\n\nAlgo que quiero que tengas presente: no le debes tu salud mental a nadie, ni siquiera a tu familia. Está bien poner límites incluso con quienes quieres.`,
      (name) => `${name}entiendo mejor.\n\n¿Has intentado hablarlo directamente con ellos, o se siente imposible ahora mismo? A veces el primer paso no es resolverlo todo, sino simplemente poner en palabras lo que necesitas.`,
    ],
  },

  autoestima: {
    keywords: ['autoestima', 'no valgo', 'no sirvo', 'no soy suficiente', 'no gusto', 'nadie me quiere', 'insegur'],
    levels: [
      (name) => `${name}esa voz que te dice que no eres suficiente no es la verdad sobre quién eres, suele venir de comparaciones o de experiencias que internalizaste, no de hechos.\n\n¿Le hablarías así a un amigo? Probablemente no.\n\n¿Qué específicamente te hace sentir que no eres suficiente ahora mismo?`,
      (name) => `${name}gracias por abrirte más sobre esto.\n\n¿Recuerdas desde cuándo te sientes así? A veces esta forma de hablarnos viene de algo puntual (una crítica, una comparación constante) y otras veces es algo que se construyó poco a poco, con el tiempo. Entender el origen ayuda a empezar a cambiarlo.`,
    ],
  },

  trabajo_estudio: {
    keywords: ['trabajo', 'estudios', 'universidad', 'colegio', 'examen', 'carrera'],
    requiresSecondary: ['mal', 'problema', 'reprobar', 'fracas', 'despid', 'renunci'],
    levels: [
      (name) => `${name}respira. Sé que ahora se siente enorme, pero una nota, un despido o un tropiezo no define tu valor ni tu futuro.\n\n¿Qué pasó exactamente?`,
      (name) => `${name}te escucho.\n\n¿Esto es algo puntual, o llevas tiempo sintiendo que el trabajo/estudio te está pasando factura en general? Y, ¿hay algo concreto que podrías hacer en los próximos días, o por ahora es más necesario simplemente procesar lo que pasó?`,
    ],
  },

  proposito: {
    keywords: ['perdido', 'perdida', 'sin sentido', 'no se que hacer', 'no sé qué hacer', 'proposito', 'propósito', 'confundido'],
    levels: [
      (name) => `${name ? name + '... ' : ''}sentirse perdido muchas veces significa que estás cuestionando en vez de conformarte con respuestas fáciles. Eso no es debilidad.\n\n¿Es más sobre tu carrera, sobre quién eres, o sobre el sentido de las cosas en general?`,
      (name) => `${name}gracias por profundizar en esto conmigo.\n\n¿Hay algo que solías disfrutar o te daba sentido y que has dejado de hacer últimamente? A veces el camino de vuelta empieza por ahí, no por encontrar "la respuesta grande" de una vez.`,
    ],
  },

  enojo: {
    keywords: ['enojado', 'enojada', 'ira', 'rabia', 'furioso', 'furiosa', 'odio'],
    levels: [
      (name) => `${name}el enojo es válido, muchas veces es la emoción más honesta, porque te dice "algo aquí está mal".\n\nSi estás en medio de ese enojo ahora, respira profundo 10 veces y, si puedes, aléjate antes de decir algo de lo que te arrepientas.\n\n¿Qué o quién te tiene así?`,
      (name) => `${name}gracias por contarme.\n\n¿Esto es algo puntual que pasó, o es algo que se ha ido acumulando con esa persona o situación durante tiempo? Y, honestamente, ¿sientes que ese enojo tiene una salida sana ahora mismo, o se está quedando atrapado?`,
    ],
  },

  adiccion: {
    keywords: ['adiccion', 'adicción', 'alcohol', 'droga', 'no puedo parar', 'dependencia', 'vicio'],
    levels: [
      (name) => `${name ? name + '... ' : ''}reconocer esto ya es un paso enorme, a mucha gente le toma años llegar aquí.\n\n⚠️ Si tienes dependencia física al alcohol o benzodiacepinas, no dejes de consumir de golpe sin supervisión médica, puede ser peligroso.\n\n¿Qué estás consumiendo, con qué frecuencia y hace cuánto?`,
      (name) => `${name}gracias por la confianza de contarme esto.\n\n¿Ya intentaste parar o reducir antes? Y si es así, ¿qué pasó, qué hizo que fuera difícil sostenerlo? En "Contacto" tienes líneas especializadas en Colombia si quieres dar el siguiente paso.`,
    ],
  },

  insomnio: {
    keywords: ['no puedo dormir', 'insomnio', 'pesadilla', 'no duermo'],
    levels: [
      (name) => `${name}cuando no duermes, todo se siente peor.\n\n¿No logras dormirte, te despiertas a media noche, o duermes pero no descansas? ¿Hace cuánto pasa esto?`,
      (name) => `${name}entiendo mejor.\n\n¿Notas que tu mente se acelera pensando en cosas apenas te acuestas, o es más algo físico (incomodidad, ruido, horarios)? Eso ayuda a saber si es más ansiedad de fondo o un tema de hábitos de sueño.`,
    ],
  },
};

const TOPIC_ORDER = Object.keys(TOPICS);

function detectTopic(msg) {
  for (const key of TOPIC_ORDER) {
    const topic = TOPICS[key];
    const hit = topic.keywords.some((kw) => msg.includes(kw));
    if (hit) {
      if (topic.requiresSecondary) {
        const secondaryHit = topic.requiresSecondary.some((kw) => msg.includes(kw));
        if (!secondaryHit) continue;
      }
      return key;
    }
  }
  return null;
}

// Mensajes "meta" (saludo, despedida, agradecimiento, etc.) no deben romper
// el hilo de un tema en curso: se responden aparte y el tema/turno de la
// conversacion se mantiene igual para el siguiente mensaje.
function getMetaResponse(msg, userName) {
  const name = userName ? userName + ', ' : '';

  if (msg.match(/^(hola|buenos dias|buenas tardes|buenas noches|hey|hi|saludos)$/)) {
    return pick([
      `Hola ${userName || ''}, qué bueno verte por aquí. 💜 ¿Cómo está tu ánimo hoy?`,
      `Hola. ¿Cómo estás llegando hoy, ${userName || 'de verdad'}?`,
      `Hola ${userName || ''} 💜 Te escucho, ¿qué quieres contarme?`,
    ]);
  }
  if (msg.includes('como estas') || msg.includes('cómo estás') || msg.includes('que tal') || msg.includes('qué tal')) {
    return 'Qué lindo que preguntes. 💜 Pero este espacio es para ti, dime, ¿cómo estás TÚ de verdad?';
  }
  if (msg.includes('gracias') && !msg.includes('ayud')) {
    return `${name}no hay nada que agradecer. Gracias a ti por confiar y compartir esto, eso ya requiere valentía.`;
  }
  if (msg.includes('adios') || msg.includes('adiós') || msg.includes('chao') || msg.includes('hasta luego') || msg.includes('nos vemos') || msg.includes('me voy') || msg.includes('bye')) {
    return `${userName ? userName + '... ' : ''}antes de irte: no estás enfrentando esto solo/a, aunque a veces se sienta así.\n\nEste espacio y el equipo profesional detrás seguirán aquí. Cuídate mucho. 💜`;
  }
  if (msg.includes('que es aimotion') || msg.includes('qué es aimotion') || msg.includes('sobre aimotion')) {
    return 'AIMotion es una plataforma de apoyo y tamizaje: recojo información preliminar, aplico escalas estandarizadas (PHQ-9/GAD-7) y, si detecto una señal de riesgo relevante, aviso de inmediato a un profesional.\n\nNo reemplazo una consulta clínica ni diagnostico, todo lo importante lo revisa una persona.';
  }
  if (msg.includes('contacto') || msg.includes('ayuda profesional') || msg.includes('terapia') || msg.includes('psicologo') || msg.includes('psicólogo')) {
    return `Me alegra que estés pensando en ayuda profesional. 💜\n\nEn la sección "Contacto" tienes las líneas de crisis y los datos del equipo. ¿Qué te hace considerarlo ahora mismo?`;
  }
  return null;
}

/**
 * @param {string} userMessage
 * @param {string} userName
 * @param {{topic: string|null, turn: number}} context - tema y profundidad actuales de la conversacion
 * @returns {{text: string, detectedName: string|null, topic: string|null, turn: number}}
 */
export function getBotResponse(userMessage, userName, context = { topic: null, turn: 0 }) {
  const msg = userMessage.toLowerCase().trim();
  const name = userName ? userName + ', ' : '';

  // Deteccion de nombre (no cambia el tema en curso)
  if (!userName && (msg.includes('me llamo') || msg.includes('mi nombre es') || msg.includes('soy'))) {
    const nameMatch = msg.match(/(?:me llamo|mi nombre es|soy)\s+([a-záéíóúñ]+)/i);
    if (nameMatch) {
      const detected = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
      return {
        text: `Un gusto conocerte, ${detected}. 💜 Gracias por compartir tu nombre.\n\n¿Qué te trae por aquí hoy, ${detected}?`,
        detectedName: detected,
        topic: context.topic,
        turn: context.turn,
      };
    }
  }

  // Mensajes meta: no alteran el tema/turno en curso
  const meta = getMetaResponse(msg, userName);
  if (meta) {
    return { text: meta, detectedName: null, topic: context.topic, turn: context.turn };
  }

  const detected = detectTopic(msg);

  // Caso 1: el mensaje activa un tema (nuevo o el mismo que ya se venia hablando)
  if (detected) {
    const isSameTopic = detected === context.topic;
    const nextTurn = isSameTopic ? Math.min(context.turn + 1, TOPICS[detected].levels.length - 1) : 0;
    const text = TOPICS[detected].levels[nextTurn](name);
    return { text, detectedName: null, topic: detected, turn: nextTurn };
  }

  // Caso 2: el mensaje NO activa ningun tema nuevo, pero hay un tema en curso.
  // Esto es lo que antes caia al mensaje generico y rompia el hilo; ahora
  // profundiza en el mismo tema (p.ej. respondiendo "hace como un mes").
  if (context.topic && TOPICS[context.topic]) {
    const nextTurn = Math.min(context.turn + 1, TOPICS[context.topic].levels.length - 1);
    const text = TOPICS[context.topic].levels[nextTurn](name);
    return { text, detectedName: null, topic: context.topic, turn: nextTurn };
  }

  // Caso 3: sin tema en curso y sin tema nuevo detectado -> mensaje generico
  // que invita a contar mas (solo pasa al inicio de la conversacion o si el
  // mensaje es realmente ambiguo, como "no se", sin contexto previo).
  const text =
    `${name}quiero entenderte mejor para poder acompañarte bien.\n\n` +
    'Puedo ayudarte a poner en palabras lo que sientes, especialmente si tiene que ver con tristeza o ' +
    'ánimo bajo, ansiedad o preocupación excesiva, estrés, o si tienes preguntas sobre esquizofrenia o ' +
    'algún trastorno de salud mental.\n\n' +
    'Si prefieres algo más estructurado, en "Tamizaje" puedes completar el PHQ-9 o el GAD-7.\n\n' +
    '¿Qué está pasando contigo en este momento?';
  return { text, detectedName: null, topic: null, turn: 0 };
}