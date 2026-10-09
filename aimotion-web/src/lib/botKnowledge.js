// Base de conocimiento del asistente.
//
// Contenido psicoeducativo en linea con la CIE-11 y las notas descriptivas de
// la OMS (who.int/es/news-room/fact-sheets/detail/mental-disorders,
// .../depression, .../schizophrenia). Es informacion GENERAL: no diagnostica,
// no prescribe ni ajusta medicacion, y siempre remite al profesional.
//
// Estructura de cada tema:
//   label, priority, kw (palabras clave; "=palabra" = palabra exacta; con
//   espacios = frase), levels (conversacion que va profundizando), faq
//   (respuestas a preguntas concretas: que_es, sintomas, causas, ...),
//   helpOthers / helpParent (cuando la persona pregunta por alguien mas).
// Todos los textos pueden ser string o funcion (n) => string, donde n es el
// nombre de la persona seguido de coma ("Ana, ") o vacio.

export const p = (...parts) => parts.join('\n\n');
export const LINES = 'la Línea 106 (orientación en salud mental, 24/7) o al 123 (emergencias)';

export const TOPICS = {
  // ====================================================================
  // 1. DEPRESION
  // ====================================================================
  depresion: {
    label: 'depresión',
    priority: 10,
    kw: [
      'deprim', 'depres', 'triste', 'tristeza', 'vacio', 'vacia', 'sin ganas', 'sin animo', 'desanimad', 'desanimo',
      'no tengo energia', 'no disfruto', 'ya nada me gusta', 'nada me motiva', 'sin motivacion', 'apatia', 'apatic',
      'melancol', 'llorar', 'lloro', 'ganas de llorar', 'sin esperanza', 'desesperanz', 'no le encuentro sentido',
      'animo bajo', 'bajon', 'decaid', 'no tengo ganas de nada', 'no quiero hacer nada', 'anhedonia',
      'inutil', 'sin valor', 'me siento un fracaso', 'culpa', 'me siento pesad',
    ],
    levels: [
      (n) => p(
        `${n}gracias por contármelo, no es fácil ponerlo en palabras. Lo que sientes importa y tiene sentido tomarlo en serio.`,
        'Algo que ayuda a entender: la tristeza pasajera y la depresión no son lo mismo. Cuando el ánimo bajo (o la pérdida de interés en cosas que antes disfrutabas) se mantiene casi todos los días durante dos semanas o más, y se suma a cambios en el sueño o el apetito, cansancio, dificultad para concentrarte o sentimientos de culpa o inutilidad, ya no es "solo un mal momento": es algo que vale la pena mirar con un profesional, y tiene tratamiento eficaz.',
        '¿Hace cuánto te sientes así? ¿Fue algo gradual o empezó con algo puntual?'
      ),
      (n) => p(
        `${n}gracias por darme más contexto, eso ayuda a entender mejor.`,
        'Te pregunto un par de cosas, sin prisa: ¿cómo ha estado tu sueño últimamente (duermes de más, de menos, te despiertas muy temprano)? ¿Y el apetito o las ganas de hacer cosas que antes disfrutabas?',
        'No es un interrogatorio: son justo los puntos que un profesional querría saber. Si prefieres verlo de forma ordenada, el PHQ-9 en la sección "Tamizaje" los recoge en unos minutos y el resultado queda disponible para quien te acompañe.'
      ),
      (n) => p(
        `${n}lo que describes suena a algo que no deberías cargar solo/a por más tiempo.`,
        'Mientras buscas ayuda profesional, algunas cosas pequeñas sostienen: salir a caminar aunque sean 10 minutos, mantener un horario de sueño, comer algo a tus horas y no aislarte del todo. No reemplazan el tratamiento (la psicoterapia tiene buena evidencia y, en algunos casos, la medicación ayuda), pero hacen que el camino sea más llevadero.',
        '¿Ya hablaste de esto con alguien (familia, amigos, un profesional) o yo soy la primera persona a quien se lo cuentas?'
      ),
    ],
    faq: {
      que_es: p(
        'La depresión es un trastorno del estado de ánimo, mucho más que tristeza. Para hablar de un episodio depresivo, durante al menos dos semanas y casi todos los días hay ánimo bajo o pérdida de interés/placer, junto con otros síntomas: cambios en el sueño o el apetito, cansancio, dificultad para concentrarse, sentimientos de culpa o inutilidad, o pensamientos de muerte.',
        'No es debilidad ni "falta de ganas": es una condición de salud frecuente, y tiene tratamiento eficaz.'
      ),
      sintomas: p(
        'Las señales más habituales de la depresión son:',
        '• Ánimo bajo o vacío casi todo el día\n• Pérdida de interés o placer en lo que antes disfrutabas\n• Cansancio o falta de energía\n• Cambios en el sueño (de más o de menos) y en el apetito\n• Dificultad para concentrarte o decidir\n• Sentimientos de culpa, inutilidad o desesperanza\n• Irritabilidad (sobre todo en niños y adolescentes)\n• Pensamientos de muerte o de hacerse daño',
        'Que tengas alguno no significa que tengas depresión: importa cuántos son, cuánto duran (dos semanas o más) y cuánto afectan tu vida. Eso solo lo puede valorar un profesional; el PHQ-9 en "Tamizaje" es un primer paso orientativo.'
      ),
      causas: p(
        'La depresión no tiene una sola causa: se combinan factores biológicos (genética, funcionamiento cerebral), psicológicos (forma de interpretar lo que pasa, experiencias de pérdida, maltrato o abuso) y sociales (estrés sostenido, soledad, problemas económicos, violencia). Por eso no es culpa de quien la vive.',
        'Además puede aparecer tras eventos difíciles (duelos, rupturas, desempleo), pero también sin un motivo claro.'
      ),
      tratamiento: p(
        'La depresión es tratable. Según la gravedad:',
        '• Leve: suelen bastar intervenciones psicológicas (activación conductual, terapia cognitivo-conductual, terapia interpersonal) y apoyo.\n• Moderada o grave: se combina psicoterapia con medicación valorada por un médico o psiquiatra.',
        'Ayudan además el ejercicio regular, rutinas de sueño, no aislarse y mantener actividades pequeñas que den sentido. La decisión del tratamiento la toma el profesional contigo; yo puedo orientarte, no reemplazarlo.'
      ),
      medicacion: p(
        'Los antidepresivos pueden ser útiles en depresión moderada o grave, pero los receta y ajusta solo un médico o psiquiatra: no puedo recomendar ni ajustar medicamentos.',
        'Lo que sí es útil saber: suelen tardar varias semanas en hacer efecto, pueden tener efectos secundarios que conviene comentar con el médico, y no se deben suspender de golpe por cuenta propia. En niños y adolescentes se suele priorizar la psicoterapia, y la decisión de medicar es siempre del especialista.'
      ),
      cuando: p(
        'Conviene buscar ayuda profesional si el ánimo bajo o la pérdida de interés llevan dos semanas o más y afectan tu estudio, trabajo, sueño o relaciones.',
        `Y busca ayuda de inmediato si aparecen pensamientos de hacerte daño o de que sería mejor no estar: llama a ${LINES}, o ve a urgencias. No tienes que esperar a "estar peor".`
      ),
      mitos: p(
        'Algunos mitos frecuentes sobre la depresión:',
        '• "Es debilidad o falta de voluntad": falso, es una condición de salud.\n• "Es lo mismo que estar triste": no, dura más y afecta el funcionamiento.\n• "Hablar de ella empeora las cosas": al contrario, hablar ayuda.\n• "Solo les pasa a los adultos": también ocurre en niños y adolescentes.\n• "Si tienes una vida buena, no puedes tenerla": puede aparecer sin motivo aparente.'
      ),
      hereditario: 'La genética influye: hay más riesgo si hay antecedentes familiares, pero no es un destino. Pesan mucho también las experiencias, el estrés y el apoyo social. Tener un familiar con depresión no significa que la vayas a tener, y tampoco que no puedas prevenirla o tratarla.',
      duracion: 'Varía de persona a persona. Con tratamiento, muchos episodios mejoran en semanas o meses. Algunas personas tienen recaídas, por eso el seguimiento importa. Lo importante: es una condición que mejora cuando se trata; no se queda igual para siempre.',
      diferencia: p(
        'La tristeza es una emoción normal ante una pérdida o una dificultad: va y viene, y deja disfrutar otras cosas. La depresión es persistente (dos semanas o más), cubre casi todo el día, quita el interés por casi todo y afecta el funcionamiento (dormir, comer, rendir, relacionarte).',
        'Si dudas de cuál es tu caso, el PHQ-9 en "Tamizaje" es un primer paso, y un profesional puede aclararlo.'
      ),
    },
    helpOthers: p(
      'Que quieras ayudar ya es muchísimo. Algunas ideas para acompañar a alguien con depresión:',
      '• Escucha sin juzgar ni minimizar: evita "échale ganas", "otros están peor" o "es que no quieres".\n• Pregunta cómo está y quédate a escuchar, aunque la respuesta sea corta.\n• Ofrece ayuda concreta: acompañarle a pedir cita, recordarle la medicación si la tiene, salir a caminar juntos.\n• Mantén el contacto sin presionar; el aislamiento empeora todo.\n• Cuídate también tú: acompañar cansa.',
      `Si habla de hacerse daño o de morir, pregúntale directamente (preguntar no le pone la idea en la cabeza), no lo dejes solo/a y busca ayuda: ${LINES}.`
    ),
    helpParent: p(
      'En niños y adolescentes la depresión no siempre se ve como tristeza: a menudo aparece como irritabilidad, aislamiento, bajón en el colegio, cambios de sueño o apetito, quejas físicas (dolor de cabeza o de estómago), pérdida de interés en lo que antes disfrutaba, o frases como "no sirvo para nada".',
      'Cómo acercarte:\n• Habla en un momento tranquilo, sin interrogatorio: "Te noto distinto/a, aquí estoy".\n• Escucha antes de aconsejar; no castigues ni minimices ("eso son cosas de la edad").\n• Mantén rutinas de sueño, comida y actividad.\n• Pide valoración con el pediatra o un psicólogo infantil/adolescente, e infórmate con el colegio.\n• En esta edad suele priorizarse la psicoterapia; si se plantea medicación, la decide el especialista.',
      `Si habla de morir o de hacerse daño, no lo dejes solo/a y busca ayuda ya: ${LINES}.`
    ),
  },

  // ====================================================================
  // 2. ANSIEDAD
  // ====================================================================
  ansiedad: {
    label: 'ansiedad',
    priority: 10,
    kw: [
      'ansied', 'ansios', 'nervios', 'nervios', 'nervioso', 'nerviosa', 'angustia', 'angustiad', 'preocupo', 'preocupacion',
      'preocupad', 'me preocupa', 'sobrepenso', 'pienso demasiado', 'no paro de pensar', 'no puedo dejar de pensar',
      'taquicardia', 'palpitaciones', 'corazon acelerado', 'me falta el aire', 'opresion en el pecho', 'nudo en el estomago',
      'temblor', 'sudoracion', 'tension', 'tenso', 'inquiet', 'intranquil', 'miedo', 'temor', 'asustad', 'me asusta',
      'catastrof', 'que va a pasar', 'me va a dar algo', 'me va a dar un ataque', 'siento que me va a dar', 'me da algo', 'se me acelera el corazon', 'no puedo calmarme', 'tag', 'angustiante', 'sensacion de peligro', 'alerta todo el tiempo',
    ],
    levels: [
      (n) => p(
        `${n}vamos a ir con calma, ¿sí? Lo que describes se siente muy intenso en el cuerpo y en la mente, y es válido.`,
        'Si lo necesitas ahora mismo, prueba esto: 1) mano en el pecho, 2) inhala contando hasta 4, 3) sostén 4 segundos, 4) exhala lento contando hasta 6, 5) repite unas cuantas veces.',
        'La ansiedad no es "exagerar": es una respuesta real del cuerpo. Cuando el miedo o la preocupación son excesivos, duran meses y afectan tu vida diaria, hay tratamiento eficaz. ¿Esto te pasa casi todos los días o fue algo puntual que lo disparó?'
      ),
      (n) => p(
        `${n}sigamos entendiéndolo juntos.`,
        '¿Identificas algo que lo dispare (situaciones sociales, pensar en el futuro, la salud, el estudio o el trabajo) o aparece sin razón clara? Y cuando se pone fuerte, ¿se parece a un ataque de pánico (corazón acelerado, ahogo, mareo) o es más una preocupación constante que no para?',
        'La escala GAD-7 en "Tamizaje" te ayuda a verlo de forma más objetiva si quieres.'
      ),
      (n) => p(
        `${n}además de la respiración, ayuda el anclaje: nombra en voz alta 5 cosas que ves, 4 que puedes tocar, 3 que escuchas, 2 que hueles y 1 que saboreas. Saca a la mente del bucle y la trae al presente.`,
        '¿Cuánto tiempo llevas lidiando con esto? Si ya son varios meses y te afecta el día a día, vale la pena hablarlo con un profesional: la terapia (sobre todo la cognitivo-conductual) funciona muy bien para la ansiedad.'
      ),
    ],
    faq: {
      que_es: p(
        'La ansiedad es una respuesta natural del cuerpo ante una amenaza o un reto: nos pone en alerta. Se vuelve un trastorno cuando el miedo o la preocupación son excesivos, persistentes, desproporcionados a la situación, y llevan a evitar cosas o a sufrir de forma que afecta la vida diaria.',
        'Existen varios tipos: ansiedad generalizada (preocupación constante por muchas cosas), trastorno de pánico (ataques repentinos e intensos), ansiedad social, fobias específicas y ansiedad por separación, entre otros. Es de las condiciones más comunes y muy tratable.'
      ),
      sintomas: p(
        'Los síntomas de la ansiedad suelen verse en tres niveles:',
        '• Cuerpo: palpitaciones, sudor, temblor, opresión en el pecho, sensación de ahogo, mareo, tensión muscular, molestias de estómago.\n• Mente: preocupación difícil de controlar, anticipar lo peor, dificultad para concentrarte, sensación de estar "al borde".\n• Conducta: evitar lugares o situaciones, buscar seguridad constantemente, dormir mal, irritabilidad.',
        'Tener alguno de vez en cuando es normal. Lo que marca la diferencia es la intensidad, la duración y cuánto limita tu vida. El GAD-7 en "Tamizaje" es un primer paso orientativo.'
      ),
      causas: p(
        'La ansiedad surge de una mezcla de factores: predisposición biológica (genética, sensibilidad del sistema de alarma del cuerpo), experiencias de vida (estrés prolongado, trauma, crianza muy sobreprotectora o muy exigente), y el contexto actual (sobrecarga, incertidumbre, consumo de cafeína o sustancias, problemas de salud).',
        'No es culpa de quien la tiene ni señal de debilidad.'
      ),
      tratamiento: p(
        'La ansiedad responde muy bien al tratamiento:',
        '• Psicoterapia, sobre todo cognitivo-conductual, incluyendo exposición gradual a lo que se teme.\n• Técnicas de regulación: respiración lenta, relajación muscular, anclaje, mindfulness.\n• Hábitos: ejercicio regular, sueño, menos cafeína y alcohol.\n• En algunos casos, medicación valorada por un médico o psiquiatra.',
        'Evitar siempre lo que da miedo alivia hoy pero la mantiene mañana; por eso la exposición gradual y guiada funciona. Lo ideal es hacerlo acompañado por un profesional.'
      ),
      medicacion: p(
        'En ansiedad se usan algunos medicamentos (por ejemplo antidepresivos de ciertos tipos) y, con más cautela, ansiolíticos de tipo benzodiacepina, que pueden generar dependencia si se usan mucho tiempo. Solo un médico o psiquiatra debe recetarlos, ajustarlos o retirarlos: no puedo recomendar ni cambiar medicación.',
        'Importante: no suspendas ni mezcles medicamentos o alcohol por tu cuenta, y cuéntale al médico cualquier efecto que notes.'
      ),
      cuando: p(
        'Busca ayuda profesional si la ansiedad dura meses, te hace evitar cosas importantes, te cuesta dormir o trabajar/estudiar, o tienes ataques de pánico repetidos.',
        `Si en algún momento sientes que no puedes respirar y el dolor de pecho es intenso o distinto a lo habitual, llama al 123 o ve a urgencias para descartar otras causas. Para apoyo emocional inmediato: ${LINES}.`
      ),
      mitos: p(
        'Mitos frecuentes sobre la ansiedad:',
        '• "Es exagerar o ser dramático": no, es una respuesta real del cuerpo.\n• "Un ataque de pánico te puede matar o volver loco": es muy desagradable, pero no es peligroso en sí y pasa en minutos.\n• "Evitar lo que te asusta lo soluciona": alivia hoy pero la refuerza.\n• "Solo se cura con pastillas": la psicoterapia es de primera línea.'
      ),
      hereditario: 'Hay un componente hereditario (la ansiedad es más frecuente en familias con antecedentes), pero también influyen mucho lo aprendido y las experiencias. Ninguno de los dos factores es una sentencia: se puede aprender a manejarla.',
      duracion: 'Depende de cada caso. Con terapia adecuada, muchas personas mejoran notablemente en semanas o meses y aprenden herramientas que les sirven de por vida. Sin tratamiento tiende a mantenerse o aumentar porque la evitación la alimenta.',
      diferencia: p(
        'Estrés y ansiedad se parecen pero no son iguales: el estrés responde a una exigencia o problema concreto y tiende a bajar cuando eso se resuelve; la ansiedad puede mantenerse incluso sin una amenaza real presente, con anticipación y miedo excesivos.',
        'Y la ansiedad "normal" (nervios antes de un examen) es temporal y proporcionada; el trastorno es persistente y limita tu vida.'
      ),
    },
    helpOthers: p(
      'Para acompañar a alguien con ansiedad:',
      '• Valida sin alimentar el miedo: "veo que lo estás pasando mal, estoy contigo".\n• No le digas "cálmate" ni "no es para tanto": no ayuda.\n• En una crisis: respira lento a su lado, propón anclaje (5 cosas que ve, 4 que toca...), baja estímulos.\n• Anímale a enfrentar poco a poco lo que evita, sin forzarlo ni evitarlo todo por él/ella.\n• Ayúdale a buscar un profesional si es frecuente o limita su vida.'
    ),
    helpParent: p(
      'En niños y adolescentes la ansiedad suele verse como: dolores de estómago o de cabeza sin causa médica, rabietas o irritabilidad, apego excesivo, rechazo a ir al colegio, perfeccionismo, pesadillas, o evitar situaciones sociales.',
      'Cómo ayudar:\n• Valida lo que siente ("entiendo que te da miedo") sin decir que no pasa nada.\n• Evita sobreprotegerlo: si siempre se evita lo temido, el miedo crece. Acompaña a enfrentarlo de a poco.\n• Mantén rutinas predecibles y sueño suficiente.\n• Enséñale respiración lenta y anclaje como un juego.\n• Si dura semanas o afecta el colegio, consulta con pediatra o psicólogo infantil.'
    ),
  },

  // ====================================================================
  // 3. ESTRES
  // ====================================================================
  estres: {
    label: 'estrés',
    priority: 10,
    kw: [
      'estres', 'estresad', 'agobi', 'abrumad', 'abruma', 'no puedo mas', 'no doy mas', 'demasiado', 'presion',
      'burnout', 'quemad', 'saturad', 'sobrecarg', 'no me da el tiempo', 'mucha carga', 'mucho trabajo', 'muchas tareas',
      'agotamiento', 'agotad', 'exhaust', 'estoy al limite', 'al limite', 'no descanso', 'sin descanso', 'tensionad',
      'me supera', 'me desbordan', 'desbordad', 'responsabilidades', 'fecha limite', 'entregas',
    ],
    levels: [
      (n) => p(
        `${n}para un segundo y respira. Suena a demasiado para cargarlo solo/a, y es lógico sentirte así.`,
        'El estrés no siempre es "malo": en dosis puntuales nos ayuda a reaccionar. El problema aparece cuando se vuelve constante y el cuerpo no tiene tiempo de recuperarse: ahí empieza a afectar el sueño, el ánimo, la concentración e incluso la salud física.',
        '¿Has comido, tomado agua y dormido algo hoy? Y si puedes ahora mismo: silencia notificaciones 30 minutos, respira profundo 5 veces y pregúntate "¿qué es lo MÁS urgente?" (una sola cosa, no diez). ¿Qué te tiene así: trabajo, estudios, algo personal, todo junto?'
      ),
      (n) => p(
        `${n}entiendo mejor el panorama.`,
        '¿Hace cuánto se siente así de constante? Y una pregunta clave: ¿sientes que tienes algo de control sobre la situación, aunque sea parcial, o se siente totalmente fuera de tus manos?',
        'Eso cambia qué hacer: si hay algo de control, sirve priorizar, delegar y poner límites; si no lo hay, el foco es cómo sostenerte mientras tanto (descanso, apoyo, límites con lo que sí puedes decidir).'
      ),
      (n) => p(
        `${n}cuando el estrés es crónico (meses, no días), "descansar un fin de semana" ya no basta: el cuerpo necesita una recuperación más sostenida, y a veces implica cambios reales (delegar, decir que no, pedir apoyo).`,
        '¿Has notado efectos en el cuerpo (dolores de cabeza, tensión en cuello y espalda, problemas de estómago, sueño alterado)? Si es así, vale la pena comentarlo con un profesional, no solo por el ánimo sino por tu salud en general.'
      ),
    ],
    faq: {
      que_es: p(
        'El estrés es la respuesta del cuerpo y la mente ante una exigencia o amenaza: se activa el sistema de alerta (corazón más rápido, tensión muscular, atención enfocada). En dosis cortas es útil. Si se mantiene en el tiempo sin recuperación, se vuelve crónico y desgasta.',
        'El estrés por sí solo no es un trastorno mental, pero el estrés prolongado aumenta el riesgo de ansiedad, depresión, insomnio y problemas físicos. El "burnout" (agotamiento por estrés laboral crónico) la OMS lo reconoce como un fenómeno ocupacional.'
      ),
      sintomas: p(
        'El estrés puede notarse en varios planos:',
        '• Cuerpo: dolores de cabeza, tensión en cuello/espalda, problemas digestivos, fatiga, sueño alterado.\n• Emociones: irritabilidad, ansiedad, sensación de desborde, ganas de llorar.\n• Pensamiento: dificultad para concentrarte, olvidos, pensamientos acelerados.\n• Conducta: comer o fumar/beber más, aislarte, procrastinar, saltarte descansos.',
        'Si estas señales llevan semanas, es momento de parar y pedir apoyo.'
      ),
      causas: p(
        'Las causas son los "estresores": carga de trabajo o estudio, presión económica, conflictos familiares o de pareja, cambios grandes (mudanza, nuevo trabajo), enfermedad, duelos, falta de control o de apoyo. Lo que más pesa no es solo el estresor sino cuánto control sientes, cuánto apoyo tienes y cuánto descanso tiene tu cuerpo.'
      ),
      tratamiento: p(
        'Para manejar el estrés ayuda:',
        '• Priorizar: una lista corta de lo realmente urgente; delegar o soltar lo demás.\n• Pausas reales durante el día y límites de horario (desconexión).\n• Respiración lenta, relajación muscular, caminar al aire libre.\n• Sueño regular, comida a horas, algo de ejercicio.\n• Hablarlo con alguien de confianza y pedir ayuda concreta.\n• Reducir cafeína y evitar usar alcohol para "desconectar".',
        'Si el estrés se vuelve crónico o se acompaña de tristeza o ansiedad intensas, consulta con un profesional: la psicoterapia enseña estrategias a la medida.'
      ),
      medicacion: 'No existe una medicación "para el estrés" en sí. Si el estrés viene acompañado de ansiedad, depresión o insomnio importantes, un médico puede valorar el tratamiento adecuado. Te pido evitar automedicarte (pastillas para dormir o calmar sin prescripción, o alcohol), porque puede empeorar las cosas. Eso solo lo puede definir un profesional.',
      cuando: p(
        'Busca ayuda profesional si el estrés lleva semanas o meses, afecta tu sueño, tu salud o tus relaciones, sientes agotamiento extremo, o empiezas a usar alcohol u otras sustancias para soportarlo.',
        `Si te sientes sin salida o piensas en hacerte daño, contacta ya ${LINES}.`
      ),
      mitos: p(
        'Mitos del estrés:\n• "Todo estrés es malo": en dosis cortas es adaptativo.\n• "Los fuertes aguantan todo": pedir descanso y apoyo es parte de ser fuerte.\n• "Se pasa solo": el crónico no se pasa solo, se maneja.\n• "Si descanso me atraso": sin descanso se rinde menos y se enferma más.'
      ),
      duracion: 'El estrés agudo baja cuando termina la situación. El crónico no se va solo: mejora cuando se cambian las condiciones (carga, límites, apoyo) y se recupera el descanso. Con estrategias adecuadas, muchas personas notan alivio en semanas.',
      diferencia: 'El estrés responde a una exigencia concreta y suele bajar cuando se resuelve; la ansiedad puede mantenerse sin una causa clara y con miedo excesivo. Y la depresión implica ánimo bajo y pérdida de interés sostenidos. Pueden coexistir: el estrés crónico es una puerta de entrada frecuente a las otras dos.',
    },
    helpOthers: p(
      'Para acompañar a alguien estresado:',
      '• Escucha sin resolver de inmediato: a veces solo necesita desahogarse.\n• Ofrece ayuda concreta (tomar una tarea, hacerle una comida, cuidar un rato a los niños).\n• Anímale a hacer pausas y dormir; no le des más carga.\n• Evita frases como "relájate" o "no es para tanto".\n• Si el agotamiento es extremo o hay señales de depresión o ansiedad fuertes, sugiere ayuda profesional.'
    ),
    helpParent: p(
      'En niños y adolescentes el estrés suele venir del colegio (exámenes, tareas, bullying), de las muchas actividades, de conflictos en casa o de redes sociales. Señales: irritabilidad, cambios de sueño, dolores de cabeza o estómago, llanto fácil, bajón en notas, aislamiento.',
      'Qué ayuda: tiempo libre sin pantallas, rutinas de sueño, escuchar sin sermonear, ajustar expectativas y carga de actividades, validar lo que siente y, si persiste, consultar con un psicólogo. Pregunta también por bullying o ciberacoso: es una causa frecuente y a veces no se cuenta.'
    ),
  },

  // ====================================================================
  // 4. ESQUIZOFRENIA (informativo; lo activo lo intercepta riskEngine.js)
  // ====================================================================
  esquizofrenia: {
    label: 'esquizofrenia',
    priority: 12,
    kw: [
      'esquizo', 'psicosis', 'psicotic', 'delirio', 'delirant', 'alucinacion', 'alucina', 'voces', 'paranoi', 'paranoic',
      'trastorno psicotico', 'brote', 'brote psicotico', 'antipsicotic', 'doble personalidad', 'personalidad multiple',
      'se volvio loco', 'se volvio loca', 'habla solo', 'habla sola', 've cosas', 'oye voces', 'cree que lo persiguen',
      'desorganizad', 'pensamiento desorganizado', 'ideas raras', 'creencias raras',
    ],
    levels: [
      (n) => p(
        `${n}gracias por preguntar, y qué bueno que quieras entender más sobre esto.`,
        'La esquizofrenia es un trastorno mental serio pero tratable. Según la OMS, con tratamiento adecuado (medicación, psicoeducación, apoyo familiar y rehabilitación psicosocial) al menos una de cada tres personas se recupera por completo, y muchas más llevan una vida funcional con acompañamiento. No es "locura" ni algo de lo que avergonzarse: el estigma suele hacer más daño que la propia condición.',
        '¿Me cuentas más de tu situación? ¿Es algo que vives tú, o es sobre alguien cercano?'
      ),
      (n) => p(
        `${n}te cuento un poco más, porque entender esto ayuda a acompañar bien.`,
        'No tiene una sola causa: se combinan factores genéticos y ambientales. Lo más importante para el pronóstico es la continuidad del tratamiento con psiquiatría y que la familia también reciba información y apoyo. El aislamiento y abandonar el tratamiento son los principales riesgos de recaída.',
        'Si es alguien cercano, ¿cómo está el apoyo familiar a su alrededor ahora mismo?'
      ),
      (n) => p(
        `${n}hay distintos niveles de apoyo según la etapa: desde psicoeducación familiar y terapia, hasta rehabilitación psicosocial para recuperar autonomía (rutinas, estudio, trabajo, vivienda). No es un camino lineal, pero sí hay camino.`,
        `Si tú o la persona que te importa notan síntomas activos (escuchar o ver cosas que otros no perciben, ideas que no encajan con la realidad), dímelo directo: eso lo priorizo y te conecto con apoyo profesional. En la sección "Contacto" tienes líneas y recursos, y en crisis, ${LINES}.`
      ),
    ],
    faq: {
      que_es: p(
        'La esquizofrenia es un trastorno mental crónico que altera el pensamiento, la percepción, las emociones, el lenguaje y la conducta. La OMS estima que afecta aproximadamente a 1 de cada 300 personas, y suele comenzar entre el final de la adolescencia y los primeros años de adultez.',
        'Puede incluir:\n• Síntomas positivos: ideas delirantes (creencias firmes que no se ajustan a la realidad), alucinaciones (por ejemplo, oír voces), pensamiento y habla desorganizados.\n• Síntomas negativos: apatía, poca expresión emocional, aislamiento, pérdida de motivación.\n• Síntomas cognitivos: dificultades de atención y memoria.',
        'Es tratable, y con acompañamiento muchas personas llevan una vida plena.'
      ),
      sintomas: p(
        'Algunas señales que pueden aparecer (no son un diagnóstico, solo un profesional puede valorarlos):',
        '• Oír o ver cosas que otros no perciben\n• Desconfianza intensa, sentir que lo persiguen o vigilan\n• Ideas extrañas o creencias firmes que no se sostienen en la realidad\n• Habla o pensamiento confusos, difíciles de seguir\n• Aislamiento marcado, apatía, descuido de higiene o de actividades básicas\n• Bajón fuerte en el estudio o trabajo, alteraciones graves del sueño',
        'Muchas veces hay una etapa previa sutil (retraimiento, caída del rendimiento, desconfianza). Consultar pronto mejora mucho el pronóstico. Ojo: el consumo de ciertas sustancias, o algunas condiciones médicas, pueden imitar estos síntomas; por eso se necesita valoración profesional.'
      ),
      causas: p(
        'No hay una causa única. Se combinan factores genéticos y ambientales: predisposición hereditaria, complicaciones en el embarazo o el parto, estrés o trauma intenso, y el consumo frecuente de cannabis u otras sustancias, sobre todo en la adolescencia, que se asocia a mayor riesgo.',
        'Importante: no es culpa de los padres ni de la persona, y no se produce por "falta de carácter" ni por mala crianza.'
      ),
      tratamiento: p(
        'La esquizofrenia es tratable. El tratamiento combina:',
        '• Medicación antipsicótica (la receta y ajusta el psiquiatra), que reduce síntomas como alucinaciones e ideas delirantes.\n• Intervenciones psicosociales: psicoeducación para la persona y su familia, psicoterapia, entrenamiento en habilidades, apoyo para estudio/empleo y vivienda.\n• Un plan de crisis y red de apoyo.',
        'Según la OMS, al menos una de cada tres personas se recupera por completo. Lo más importante: mantener el tratamiento y el seguimiento.'
      ),
      medicacion: p(
        'Los antipsicóticos ayudan a controlar síntomas como alucinaciones y delirios y a prevenir recaídas. Solo el psiquiatra los receta y ajusta: no puedo recomendar, cambiar ni suspender medicación.',
        'Dos claves para la familia y la persona: 1) pueden tener efectos secundarios, que conviene comentar con el psiquiatra para ajustar (no abandonar el tratamiento), y 2) no se deben suspender de golpe, porque es una causa frecuente de recaída.'
      ),
      cuando: p(
        'Conviene consultar con psiquiatría o psicología lo antes posible si aparecen cambios marcados en pensamiento, percepción o conducta (oír voces, desconfianza intensa, ideas extrañas, aislamiento brusco, descuido de sí mismo/a).',
        `Es urgente (123 o urgencias) si hay riesgo de hacerse daño o dañar a otros, o si la persona está muy desorganizada, sin dormir ni comer. Para orientación inmediata: ${LINES}.`
      ),
      mitos: p(
        'Mitos frecuentes sobre la esquizofrenia:',
        '• "Es doble personalidad": falso, eso es otra cosa. La esquizofrenia no divide la personalidad.\n• "Las personas con esquizofrenia son violentas": la gran mayoría no lo es; es más probable que sean víctimas de violencia.\n• "No tiene cura, no hay esperanza": es tratable y muchas personas se recuperan o llevan una vida funcional.\n• "Es culpa de los padres": no.\n• "Hay que esconderlo": el aislamiento y el estigma empeoran el pronóstico.'
      ),
      hereditario: 'Hay un componente hereditario: el riesgo es mayor si hay familiares con esquizofrenia, pero la gran mayoría de las personas con un familiar afectado no la desarrolla. Los factores ambientales también pesan, así que la genética es una predisposición, no una sentencia.',
      duracion: 'Suele ser una condición crónica, con períodos de mejoría y otros de mayor dificultad. Con tratamiento continuo, apoyo familiar y rehabilitación, muchas personas logran largos períodos estables y una buena calidad de vida; y según la OMS, al menos una de cada tres se recupera por completo.',
      diferencia: p(
        'Psicosis y esquizofrenia no son sinónimos: la psicosis es un conjunto de síntomas (alucinaciones, ideas delirantes) que puede aparecer en distintas condiciones o por sustancias; la esquizofrenia es un trastorno en el que esos y otros síntomas se mantienen en el tiempo.',
        'Y no es "doble personalidad" (eso es un mito). Tampoco es lo mismo que la depresión o la ansiedad, aunque a veces coexistan. El diagnóstico lo hace un psiquiatra.'
      ),
    },
    helpOthers: p(
      'Acompañar a alguien con esquizofrenia es un gran apoyo para su recuperación. Algunas pautas:',
      '• Mantén la calma y un tono tranquilo; evita discutir o confrontar sus creencias, pero tampoco le des la razón: puedes decir "entiendo que lo vives así, yo no lo percibo igual, y estoy contigo".\n• No lo culpes ni le grites; el estigma y la tensión en casa favorecen las recaídas.\n• Apoya la continuidad del tratamiento y de los controles; la medicación no se suspende sin el médico.\n• Mantén rutinas, sueño y actividades sencillas, y evita alcohol y otras sustancias.\n• Ten un plan de crisis: quién llama a quién, números a mano, y su psiquiatra de referencia.\n• Cuídate: pide apoyo y psicoeducación familiar, también es para ti.',
      `Si hay riesgo de que se haga daño o dañe a otros, o está muy desorganizado/a, llama al 123 o ve a urgencias. Para orientación: ${LINES}.`
    ),
    helpParent: p(
      'Si te preocupa un hijo/a adolescente o joven, estas señales merecen una valoración pronta (no son diagnóstico): retraimiento marcado y sostenido, caída fuerte del rendimiento escolar, desconfianza o miedo inusual, ideas o frases extrañas, alteraciones graves del sueño, descuido de la higiene, o decir que oye o ve cosas que otros no.',
      'Qué hacer:\n• Consulta pronto con pediatra, psiquiatra o psicólogo; la atención temprana mejora mucho el pronóstico.\n• Habla con calma, sin burlarte ni discutir lo que dice; muestra que estás de su lado.\n• Pregunta con tacto por consumo de sustancias (el cannabis y otras drogas pueden desencadenar o imitar síntomas).\n• No lo aísles ni lo escondas: el apoyo familiar es protector.',
      `Si hay riesgo de hacerse daño o dañar a otros, o está muy desorganizado/a, llama al 123 o ve a urgencias. Orientación: ${LINES}.`
    ),
  },
};
