// Temas secundarios, respuestas universales y conversacion general del asistente.
// Mismo formato que botKnowledge.js. Informacion general, nunca diagnostica ni
// receta; siempre remite al profesional.

import { p, LINES } from './botKnowledge.js';

const T = (label, kw, levels, extra = {}) => ({ label, priority: 5, kw, levels, faq: {}, ...extra });

export const EXTRA_TOPICS = {
  // ------------------------------------------------------------ ansiedad/relacionados
  panico: T('ataques de pánico',
    ['ataque de panico', 'ataques de panico', 'crisis de panico', 'panico', 'me da un ataque', 'me ahogo', 'me falta el aire'],
    [
      (n) => p(
        `${n}estás a salvo: un ataque de pánico es muy desagradable pero no es peligroso en sí y suele pasar en unos minutos (el pico se alcanza rápido y baja).`,
        'Ahora mismo: 1) suelta los hombros y apoya los pies en el piso, 2) exhala MÁS largo de lo que inhalas (inhala 4, exhala 6-8), 3) nombra 5 cosas que ves y 3 que escuchas, 4) recuerda: "esto es adrenalina, va a pasar".',
        '¿Ya se te está pasando o sigue fuerte? Cuéntame cómo vas.'
      ),
      (n) => p(
        `${n}me alegra que lo estés pasando. Los ataques de pánico se tratan muy bien, sobre todo con terapia cognitivo-conductual (aprender a no temerle a las sensaciones).`,
        'Dos cosas útiles: no pelees contra el ataque (dejar que pase suele acortarlo) y evita evitar: si dejas de ir a lugares por miedo a que te dé otro, el miedo crece. ¿Es la primera vez o te ha pasado varias veces? Si se repite, vale la pena consultarlo. Y si el dolor de pecho es nuevo, muy intenso o distinto, ve a urgencias para descartar otras causas.'
      ),
    ]),
  fobia_social: T('ansiedad social',
    ['ansiedad social', 'fobia social', 'timidez', 'timido', 'timida', 'hablar en publico', 'exposicion oral', 'exponer', 'me da pena', 'que pensaran', 'que dirán', 'miedo a la gente', 'no puedo hablar con gente', 'me da vergüenza hablar'],
    [
      (n) => p(
        `${n}lo que describes es muy común y tiene salida. Sentir nervios al hablar o ser evaluado/a es normal; se vuelve ansiedad social cuando el miedo a ser juzgado o a hacer el ridículo es intenso y te hace evitar situaciones importantes.`,
        '¿Qué situaciones te cuestan más (hablar en clase, conocer gente, comer frente a otros, llamadas)? Y ¿qué temes que pase exactamente?'
      ),
      (n) => p(
        `${n}gracias por contarlo. Lo que más ayuda es la exposición gradual: empezar por situaciones pequeñas (saludar, preguntar algo corto) e ir subiendo, sin esperar a "dejar de sentir nervios" antes de intentarlo. Preparar y ensayar, respirar lento y recordar que los demás se fijan en nosotros mucho menos de lo que creemos también ayudan.`,
        'Si te limita en el estudio, el trabajo o tus relaciones, la terapia cognitivo-conductual funciona muy bien para esto.'
      ),
    ]),
  toc: T('obsesiones y compulsiones',
    ['=toc', 'obsesion', 'obsesiv', 'compulsion', 'compulsiv', 'pensamientos intrusivos', 'intrusiv', 'lavarme las manos', 'revisar una y otra vez', 'tengo que repetir', 'rituales'],
    [
      (n) => p(
        `${n}gracias por contármelo, y aunque cueste, no estás solo/a: es más común de lo que parece.`,
        'Las obsesiones son pensamientos, imágenes o impulsos no deseados que generan mucha angustia; las compulsiones son conductas o rituales (lavar, revisar, ordenar, repetir) que se hacen para aliviar esa angustia, aunque solo la calman un rato. Tener un pensamiento intrusivo extraño no dice nada malo de ti.',
        'Solo un profesional puede valorarlo. ¿Qué es lo que más te pesa: los pensamientos, los rituales o el tiempo que te quitan?'
      ),
      (n) => p(
        `${n}el tratamiento de elección es la terapia cognitivo-conductual con exposición y prevención de respuesta (enfrentar el pensamiento sin hacer el ritual), y en algunos casos se agrega medicación valorada por psiquiatría. Funciona, aunque pide acompañamiento.`,
        '¿Cuánto tiempo al día te ocupa? Si es más de una hora o interfiere con tu vida, consúltalo con un psicólogo o psiquiatra.'
      ),
    ]),
  trauma: T('experiencias traumáticas',
    ['trauma', 'traumatic', 'estres postraumatico', 'tept', 'flashback', 'recuerdos que no se van', 'accidente', 'asalto', 'atraco', 'secuestro', 'desplazad', 'guerra', 'me da miedo recordar', 'pesadillas de lo que paso', 'reviv'],
    [
      (n) => p(
        `${n}lamento que hayas pasado por algo así. Tras un evento muy fuerte es normal tener recuerdos intrusivos, pesadillas, sobresaltos, ganas de evitar lo que lo recuerda, o sentirte "apagado/a"; muchas personas mejoran con el tiempo y el apoyo.`,
        'Si pasan más de unas semanas y siguen afectándote, hay tratamientos eficaces para el trauma (terapias centradas en el trauma). No tienes que contarme los detalles si no quieres. ¿Quieres contarme cómo te está afectando hoy (sueño, recuerdos, miedo, ánimo)?'
      ),
      (n) => p(
        `${n}gracias por confiar. Mientras tanto, cosas que ayudan a sentirte más seguro/a: rutinas predecibles, dormir lo mejor posible, moverte, no aislarte, y técnicas de anclaje cuando vengan los recuerdos (nombrar lo que ves y tocas, respirar lento). Evita usar alcohol para borrar los recuerdos: empeora a la larga.`,
        'Lo ideal es buscar acompañamiento de un psicólogo con experiencia en trauma. ¿Cuentas con alguien de confianza cerca?'
      ),
    ]),
  abuso_violencia: T('violencia o abuso',
    ['abuso', 'abusaron', 'abusado', 'abusada', 'violacion', 'violaron', 'acoso sexual', 'maltrato', 'me pega', 'me golpea', 'me maltrata', 'violencia intrafamiliar', 'violencia domestica', 'me amenaza', 'me controla', 'me tiene miedo', 'le tengo miedo', 'me toco', 'tocamientos'],
    [
      (n) => p(
        `${n}gracias por atreverte a decirlo, y quiero que sepas algo primero: lo que te pasa no es tu culpa.`,
        `Tu seguridad es lo primero. Si estás en peligro ahora mismo, llama al 123. Si eres mujer víctima de violencia, la Línea 155 ofrece orientación; si es un niño, niña o adolescente, el ICBF atiende en la Línea 141 (verifica que sigan vigentes). También puedes llamar a ${LINES}.`,
        '¿Estás en un lugar seguro ahora? Si quieres, cuéntame un poco más, a tu ritmo.'
      ),
      (n) => p(
        `${n}no tienes que enfrentarlo solo/a. Buscar a una persona adulta de confianza, a un profesional de salud o a las líneas de atención es un paso valiente, no una exageración.`,
        'Si ha ocurrido un abuso, es importante recibir atención médica y psicológica, y puedes denunciar cuando te sientas listo/a (hay entidades que te acompañan, como Comisarías de Familia, Fiscalía, Defensoría y el ICBF para menores). ¿Hay alguien de confianza a quien puedas contarle hoy?'
      ),
    ]),
  duelo: T('duelo',
    ['murio', 'fallecio', 'duelo', 'se murio', 'perdi a mi', 'perdida de mi', 'extrano a mi', 'luto', 'funeral', 'velorio', 'ya no esta conmigo', 'falleci', 'muerte de mi'],
    [
      (n) => p(
        `${n}lo siento muchísimo. Perder a alguien querido duele de una forma que a veces no se puede explicar, y no hay una manera "correcta" de vivirlo.`,
        'En el duelo es normal sentir tristeza, rabia, culpa, vacío, cansancio, dificultad para dormir o concentrarte, o incluso alivio y confusión; todo eso puede ir y venir en olas. Lo que sientes tiene sentido.',
        '¿Quieres contarme quién era esa persona y cuánto hace que ocurrió?'
      ),
      (n) => p(
        `${n}gracias por compartirlo. Algunas cosas que suelen ayudar: hablar de la persona y recordarla, mantener pequeñas rutinas, dejarte llorar sin juzgarte, y apoyarte en gente cercana. No hay un tiempo fijo para "superarlo".`,
        'Si pasados varios meses el dolor sigue paralizándote, no puedes funcionar, o aparecen pensamientos de querer reunirte con esa persona, busca apoyo profesional: el duelo también se acompaña con terapia.'
      ),
    ]),
  bullying: T('acoso escolar',
    ['bullying', 'acoso escolar', 'matoneo', 'matonean', 'me molestan en el colegio', 'se burlan de mi', 'burlas', 'me insultan', 'ciberacoso', 'ciberbullying', 'me excluyen', 'me hacen la vida imposible', 'me hacen sentir mal en el colegio', 'me pegan en el colegio', 'se rien de mi'],
    [
      (n) => p(
        `${n}lamento que estés pasando por eso, y quiero que sepas que no es tu culpa y no te lo mereces. Lo que viviste es acoso, y es serio.`,
        'Es importante no quedártelo solo/a: cuéntaselo a un adulto de confianza (familia, docente, orientador/a) y guarda evidencias si es por redes (capturas). En Colombia los colegios tienen ruta de atención de convivencia escolar.',
        '¿Se lo has contado a alguien? ¿Te está pasando en persona, en redes o ambos?'
      ),
      (n) => p(
        `${n}gracias por contarme. El acoso sostenido puede afectar el ánimo, el sueño y el rendimiento, y es válido sentirte triste, enojado/a o con miedo de ir al colegio.`,
        'Si eres padre o madre: escucha sin minimizar, documenta, habla con el colegio por escrito y pide seguimiento. Y cuida el ánimo de tu hijo/a: si ves señales de depresión o de querer hacerse daño, busca ayuda profesional ya.'
      ),
    ]),
  alimentacion: T('alimentación y cuerpo',
    ['anorexia', 'bulimia', 'atracon', 'no quiero comer', 'dejar de comer', 'me da asco comer', 'me siento gord', 'vomitar despues de comer', 'purgar', 'contar calorias', 'miedo a engordar', 'dieta extrema', 'trastorno alimentario', 'trastornos alimentarios', 'como compulsivamente', 'odio mi cuerpo', 'me veo gord', 'castigarme comiendo'],
    [
      (n) => p(
        `${n}gracias por confiármelo, no es fácil hablar de esto. La relación con la comida y el cuerpo puede doler mucho, y se puede tratar.`,
        'Voy a ser claro/a: no puedo darte dietas, números ni planes de alimentación, porque eso lo debe orientar un equipo de salud (médico, psicología y nutrición) que te conozca. Lo que sí puedo es escucharte.',
        '¿Qué es lo que más te preocupa o te pesa de esto últimamente?'
      ),
      (n) => p(
        `${n}lo que sientes es válido, y mereces ayuda sin juicio. Los trastornos de la conducta alimentaria no son una cuestión de voluntad ni de vanidad; son condiciones de salud y cuanto antes se atienden, mejor se recupera la persona.`,
        'Un buen primer paso es contárselo a alguien de confianza y pedir cita con tu médico o con psicología. Si hay mareos, desmayos, vómitos frecuentes o pensamientos de hacerte daño, busca atención médica pronto o llama a ' + LINES + '.'
      ),
    ]),
  sueno: T('sueño',
    ['insomnio', 'no puedo dormir', 'no duermo', 'duermo mal', 'duermo poco', 'me despierto', 'pesadilla', 'duermo mucho', 'no descanso al dormir', 'trasnocho', 'desvelo', 'desvelad'],
    [
      (n) => p(
        `${n}cuando no se duerme bien, todo se siente peor, y tu cansancio tiene sentido.`,
        '¿Qué te pasa exactamente: ¿cuesta quedarte dormido/a, te despiertas a media noche, te despiertas muy temprano o duermes pero no descansas? ¿Desde hace cuánto?'
      ),
      (n) => p(
        `${n}algunas pautas que suelen ayudar: horarios fijos para acostarte y levantarte, cuarto oscuro y fresco, evitar pantallas y cafeína en la tarde-noche, no usar la cama para trabajar o preocuparte, y si no te duermes en ~20 minutos, levantarte a hacer algo tranquilo hasta sentir sueño.`,
        'Si lo anterior no mejora en unas semanas, o el sueño se relaciona con ansiedad, ánimo bajo o pesadillas intensas, consúltalo con un profesional. Y evita automedicarte con pastillas para dormir.'
      ),
    ]),

  // ------------------------------------------------------------ vida diaria / relaciones
  soledad: T('soledad',
    ['soledad', '=sola', 'muy solo', 'tan solo', 'me siento solo', 'me siento sola', 'estoy solo', 'estoy sola', 'nadie me entiende', 'nadie me quiere', 'sin amigos', 'no tengo amigos', 'no tengo a nadie', 'aislad', 'me aislo', 'nadie me escucha', 'me siento invisible'],
    [
      (n) => p(
        `${n}estoy aquí. Sé que no es lo mismo que tener a alguien cerca, pero ahora no estás solo/a del todo.`,
        'La soledad no significa que algo esté mal contigo: a veces es no sentirte visto/a, o tener conexiones que se sienten superficiales. ¿Es que literalmente no tienes personas cerca, o tienes gente pero te sientes desconectado/a igual?'
      ),
      (n) => p(
        `${n}entiendo mejor. ¿Esto es reciente (te mudaste, terminó una relación, cambió tu grupo) o llevas mucho tiempo así? Y con honestidad: ¿te cuesta dar el primer paso para acercarte a alguien, o sientes que ya lo intentaste y no funcionó?`,
        'Pequeños pasos que ayudan: un mensaje corto a alguien con quien hace tiempo no hablas, unirte a una actividad con horario fijo (deporte, grupo de estudio, voluntariado), y recordar que la soledad prolongada puede pesar en el ánimo: si es así, hablarlo con un profesional también ayuda.'
      ),
    ]),
  pareja: T('pareja',
    ['pareja', 'novio', 'novia', 'mi ex', 'relacion', 'terminamos', 'ruptura', 'infiel', 'infidelidad', 'me engano', 'me engañ', 'ya no me quiere', 'me dejo', 'me dejaron', 'corazon roto', 'celos', 'peleamos', 'esposo', 'esposa', 'divorcio', 'separacion'],
    [
      (n) => p(
        `${n}el dolor de una ruptura o de un conflicto de pareja es real: se vive casi como un dolor físico, así que lo que sientes tiene sentido.`,
        '¿Qué pasó? ¿Terminaron, hay problemas pero siguen juntos, o fue algo más difícil como una infidelidad? Cuéntame con calma.'
      ),
      (n) => p(
        `${n}gracias por contarme más. ¿Cómo estás llevando los días (sueño, comida, concentración)? Y, ¿tienes con quién hablarlo además de mí? No tienes que procesarlo solo/a.`,
        'Si en la relación hay gritos, humillaciones, control o miedo, eso no es amor sano: hay ayuda. Y si hay golpes o amenazas, tu seguridad es lo primero (123; Línea 155 para mujeres).'
      ),
    ]),
  familia: T('familia',
    ['familia', 'mi mama', 'mi papa', 'mis papas', 'mis padres', 'mi madre', 'mi padre', 'mi hermano', 'mi hermana', 'en mi casa', 'peleas en casa', 'discuto con', 'no me entienden', 'me regañan', 'me castigan', 'conflicto familiar', 'ambiente en casa'],
    [
      (n) => p(
        `${n}los conflictos familiares duelen distinto, porque son con gente que no elegiste y con quien compartes historia.`,
        '¿Qué está pasando? ¿Es algo nuevo o un conflicto de años? Algo para tener presente: no le debes tu salud mental a nadie, ni siquiera a tu familia; está bien poner límites incluso con quienes quieres.'
      ),
      (n) => p(
        `${n}entiendo mejor. ¿Has podido hablarlo directamente con ellos o se siente imposible ahora? A veces el primer paso no es resolverlo todo, sino poner en palabras lo que necesitas ("cuando pasa X, me siento Y, y necesito Z").`,
        'Si en casa hay gritos constantes, golpes o miedo, busca a un adulto o institución de confianza: puedes llamar al 123 o, si eres menor, a la Línea 141 del ICBF.'
      ),
    ]),
  autoestima: T('autoestima',
    ['autoestima', 'no valgo', 'no sirvo', 'no soy suficiente', 'no soy bueno', 'no soy buena', 'me odio', 'me siento feo', 'me siento fea', 'inseguridad', 'inseguro', 'insegura', 'me comparo', 'no soy capaz', 'soy un fracaso', 'soy un desastre', 'no merezco'],
    [
      (n) => p(
        `${n}esa voz que dice que no eres suficiente no es la verdad sobre quién eres: suele venir de comparaciones, críticas o experiencias que internalizaste, no de hechos.`,
        '¿Le hablarías así a un amigo/a? Probablemente no. ¿Qué es lo que específicamente te hace sentir que no eres suficiente ahora?'
      ),
      (n) => p(
        `${n}gracias por abrirte. ¿Recuerdas desde cuándo te hablas así? A veces viene de algo puntual (una crítica, una comparación constante) y otras se construyó con el tiempo. Entender el origen ayuda a empezar a cambiarlo.`,
        'Un ejercicio pequeño: cada noche escribe una cosa que hiciste (aunque sea mínima) y una cualidad tuya. La autoestima se entrena. Si esta autocrítica es muy intensa y constante, la terapia ayuda mucho.'
      ),
    ]),
  culpa: T('culpa y vergüenza',
    ['culpa', 'culpable', 'me siento culpable', 'verguenza', 'me averguenzo', 'arrepent', 'lo que hice', 'la cague', 'meti la pata', 'error', 'me equivoque', 'no me perdono', 'remordimiento'],
    [
      (n) => p(
        `${n}gracias por contármelo. La culpa puede pesar muchísimo. Vale distinguir: la culpa sana nos avisa que algo se puede reparar; la que se queda dando vueltas y castigándonos ya no ayuda.`,
        '¿Qué pasó, si quieres contarlo? ¿Hay algo que puedas reparar o que ya no esté en tus manos?'
      ),
      (n) => p(
        `${n}ser humano incluye equivocarse. Puedes reconocer el error, ofrecer una disculpa si corresponde, aprender y soltar el autocastigo. Pregúntate: ¿qué le dirías a un amigo/a que hizo lo mismo?`,
        'Si la culpa o la vergüenza te acompañan todo el día o te hacen pensar que no mereces estar bien, conviene hablarlo con un profesional.'
      ),
    ]),
  trabajo_estudio: T('trabajo o estudio',
    ['trabajo', 'estudios', 'estudio', 'universidad', 'colegio', 'examen', 'parcial', 'notas', 'carrera', 'jefe', 'despid', 'renunci', 'reprobe', 'perdi la materia', 'bajas notas', 'tesis', 'proyecto de grado', 'pierdo el ano', 'desempleo', 'sin empleo'],
    [
      (n) => p(
        `${n}respira. El estudio y el trabajo pueden pesar muchísimo y a veces se sienten enormes, pero una nota, un examen o un tropiezo no define tu valor ni tu futuro.`,
        '¿Qué está pasando exactamente: algo que ya ocurrió (una nota, un despido, un conflicto) o algo que se viene (un examen, una entrega)? ¿Es algo puntual o llevas tiempo sintiendo que te pasa factura?'
      ),
      (n) => p(
        `${n}gracias por contarme. Para ordenar: separa lo que depende de ti, lo que depende de otros y lo que ya pasó. Con lo primero, elige UN paso pequeño para hoy.`,
        'Si la presión te está quitando el sueño o el ánimo, cuéntalo en tu institución (bienestar universitario, orientación) o con un profesional: pedir apoyo no es fallar.'
      ),
    ]),
  proposito: T('sentido y propósito',
    ['perdido', 'perdida', 'sin sentido', 'no se que hacer con mi vida', 'no se que hacer', 'proposito', 'confundido', 'confundida', 'vacio existencial', 'para que vivir', 'no se quien soy', 'sin rumbo', 'sin direccion', 'no se para que'],
    [
      (n) => p(
        `${n}sentirte perdido/a muchas veces significa que estás cuestionando en vez de conformarte con respuestas fáciles. Eso no es debilidad.`,
        '¿Es más sobre tu carrera o tu camino, sobre quién eres, o sobre el sentido de las cosas en general?'
      ),
      (n) => p(
        `${n}gracias por profundizar. ¿Hay algo que solías disfrutar o que te daba sentido y has dejado de hacer? A veces el camino de vuelta empieza por ahí, no por encontrar "la gran respuesta" de una vez.`,
        'Si esta sensación de vacío viene con ánimo muy bajo, pérdida de interés en todo o pensamientos de que no vale la pena seguir, es importante hablarlo con un profesional: puede ser depresión.'
      ),
    ]),
  enojo: T('enojo',
    ['enojad', 'enojo', 'rabia', 'furios', 'ira', 'odio', 'me da rabia', 'me desespera', 'irritab', 'irritad', 'explot', 'exploto', 'grito', 'perdi el control', 'peleo', 'me molesto mucho', 'impotencia'],
    [
      (n) => p(
        `${n}el enojo es válido: muchas veces es la emoción más honesta, porque te dice "algo aquí está mal".`,
        'Si estás en medio de él, respira profundo 10 veces y, si puedes, aléjate un momento antes de decir o hacer algo de lo que te arrepientas. ¿Qué o quién te tiene así?'
      ),
      (n) => p(
        `${n}gracias por contarme. ¿Es algo puntual o se ha ido acumulando con esa persona o situación? Y con honestidad: ¿sientes que ese enojo tiene una salida sana ahora, o se está quedando atrapado y te hace explotar?`,
        'Ayuda ponerle nombre a lo que hay debajo (herida, miedo, injusticia), mover el cuerpo, y expresarlo con frases en primera persona. Si sientes que pierdes el control o te puedes hacer daño o dañar a otros, busca apoyo profesional.'
      ),
    ]),
  adiccion: T('consumo y adicciones',
    ['adiccion', 'adicto', 'adicta', 'alcohol', 'tomar mucho', 'emborrach', 'droga', 'marihuana', 'cannabis', 'cocaina', 'perico', 'bazuco', 'no puedo parar', 'dependencia', 'vicio', 'fumar', 'vapeo', 'apuestas', 'ludopatia', 'recaida', 'recai'],
    [
      (n) => p(
        `${n}reconocer esto ya es un paso enorme: a mucha gente le toma años llegar aquí, y no te voy a juzgar.`,
        'Un dato importante de seguridad: si hay dependencia física al alcohol o a ciertas pastillas (como las benzodiacepinas), NO dejes de consumir de golpe sin supervisión médica, puede ser peligroso.',
        '¿Qué estás consumiendo, con qué frecuencia y desde cuándo?'
      ),
      (n) => p(
        `${n}gracias por la confianza. ¿Has intentado reducir o parar antes? ¿Qué pasó, qué hizo difícil sostenerlo?`,
        'Las adicciones se tratan con acompañamiento profesional (médico, psicología, grupos de apoyo), y las recaídas son parte frecuente del proceso, no un fracaso. Si hay riesgo, llama al 123 o a ' + LINES + '.'
      ),
    ]),
  concentracion: T('atención y concentración',
    ['no me concentro', 'no puedo concentrarme', 'me cuesta concentrarme', 'me distraigo', 'distraid', 'tdah', 'hiperactiv', 'deficit de atencion', 'se me olvida todo', 'olvidos', 'memoria', 'impulsiv', 'no termino lo que empiezo'],
    [
      (n) => p(
        `${n}dificultades para concentrarte pueden venir de muchas cosas: estrés, ansiedad, depresión, falta de sueño, exceso de pantallas, o condiciones como el TDAH. No se puede saber cuál es solo con una conversación.`,
        '¿Desde cuándo te pasa, y es en todo (estudio, casa, trabajo) o solo en algunas situaciones? ¿Cómo está tu sueño y tu ánimo?'
      ),
      (n) => p(
        `${n}para empezar ayuda: bloques cortos de trabajo con pausas (25 min + 5), un solo pendiente a la vez, celular lejos, dormir lo suficiente. Si desde la infancia hay distracción marcada, impulsividad o inquietud que afecta varios ámbitos, conviene una valoración con un profesional (el TDAH tiene diagnóstico y manejo especializados).`
      ),
    ]),
  psicosomatico: T('síntomas físicos y emocionales',
    ['dolor de cabeza', 'dolor de estomago', 'me duele todo', 'dolor de espalda', 'colon', 'gastritis', 'cansancio', 'fatiga', 'sin energia', 'mareos', 'dolor de pecho', 'mi cuerpo', 'me duele el estomago de los nervios'],
    [
      (n) => p(
        `${n}el cuerpo y la mente están muy conectados: el estrés, la ansiedad y la tristeza pueden manifestarse como dolores de cabeza, estómago, espalda, cansancio o mareos, y esos síntomas son reales.`,
        'Pero ojo: antes de atribuirlos a lo emocional, es importante que un médico los revise y descarte causas físicas, sobre todo si son nuevos, intensos o persistentes. ¿Desde cuándo los tienes y has consultado?'
      ),
      (n) => p(
        `${n}si ya se descartó una causa médica, vale la pena mirar el componente emocional: sueño, estrés, ansiedad, ánimo. Respiración lenta, movimiento suave y pausas ayudan al cuerpo a bajar la alarma.`,
        'Un profesional de salud mental puede ayudarte a entender y manejar cómo lo emocional se expresa en tu cuerpo.'
      ),
    ]),
  identidad: T('identidad y orientación',
    ['soy gay', 'soy lesbiana', 'bisexual', 'soy trans', 'identidad de genero', 'orientacion sexual', 'closet', 'salir del closet', 'no me acepto', 'me gustan los', 'me gusta una chica', 'me gusta un chico', 'lgbt', 'transgenero', 'no se si soy'],
    [
      (n) => p(
        `${n}gracias por la confianza de contármelo. Quién eres y a quién quieres no es una enfermedad ni algo que haya que "arreglar": la OMS lo dejó claro hace décadas. Lo que sí puede doler es el rechazo, el miedo a no ser aceptado/a o el esconderse.`,
        '¿Cómo te sientes con todo esto? ¿Hay alguien con quien hayas podido hablarlo?'
      ),
      (n) => p(
        `${n}tienes derecho a ir a tu ritmo y a decidir cuándo y a quién contarlo. Buscar un espacio seguro (un amigo de confianza, un grupo de apoyo, un profesional respetuoso de la diversidad) ayuda mucho. Si sientes mucha soledad, ánimo bajo o miedo por cómo reaccionarían, también puedo escucharte con calma.`
      ),
    ]),
  dinero: T('dinero y trabajo',
    ['dinero', 'deudas', 'deuda', 'no me alcanza', 'economic', 'desemple', 'sin trabajo', 'me quede sin trabajo', 'plata', 'no tengo plata', 'cuentas', 'embargo', 'quiebra', 'no puedo pagar'],
    [
      (n) => p(
        `${n}la presión económica agota, y es lógico que te esté pesando: afecta el sueño, el ánimo y las relaciones.`,
        '¿Qué es lo que más te preocupa ahora: una deuda concreta, quedarte sin ingresos, o no ver salida? Separar lo urgente (techo, comida, servicios) de lo que se puede negociar o esperar ayuda a bajar la angustia.'
      ),
      (n) => p(
        `${n}algunas ideas: escribir todo lo que debes y a quién, priorizar lo esencial, hablar con acreedores para renegociar (muchos prefieren acordar a no cobrar), y buscar ayudas locales o de tu EPS/alcaldía. No tienes que cargarlo en silencio.`,
        'Si la presión te lleva a sentirte sin salida o a pensar en hacerte daño, busca apoyo ya: ' + LINES + '.'
      ),
    ]),
  salud: T('salud y enfermedad',
    ['me diagnosticaron', 'diagnostico', 'enfermedad', 'cancer', 'operacion', 'cirugia', 'dolor cronico', 'estoy enfermo', 'estoy enferma', 'hospital', 'tratamiento medico', 'quimioterapia', 'enfermedad grave', 'mi salud'],
    [
      (n) => p(
        `${n}recibir un diagnóstico o vivir una enfermedad es un golpe, y es normal sentir miedo, rabia, tristeza o incertidumbre. No tienes que "ser fuerte" todo el tiempo.`,
        '¿Cómo te estás sintiendo con todo esto, y qué es lo que más te pesa?'
      ),
      (n) => p(
        `${n}ayuda tener preguntas anotadas para el equipo médico, apoyarte en alguien de confianza para las citas, y cuidar sueño, ánimo y descanso. La enfermedad física y el ánimo se afectan mutuamente: si notas tristeza o ansiedad intensas, coméntalo con tu médico, hay apoyo psicológico también.`
      ),
    ]),
  cambios: T('cambios grandes',
    ['mudanza', 'me mude', 'cambio de colegio', 'cambio de ciudad', 'nuevo trabajo', 'extrano mi casa', 'extrano mi pais', 'me fui de casa', 'independizarme', 'primer semestre', 'entrar a la universidad', 'nueva etapa', 'cambio de vida', 'migrar', 'migracion'],
    [
      (n) => p(
        `${n}los cambios grandes (mudanza, nuevo colegio o trabajo, otra ciudad o país) remueven aunque sean "buenos": se pierde lo conocido y toca reconstruir rutinas y vínculos. Que cueste es normal.`,
        '¿Qué es lo que más extrañas o lo que más te cuesta de este cambio?'
      ),
      (n) => p(
        `${n}ayuda mantener algunas rutinas de antes, conservar contacto con la gente querida, y dar pequeños pasos para armar tu nueva red (una actividad fija, saludar a alguien). Dale tiempo: adaptarse suele tomar semanas o meses. Si el ánimo bajo o la ansiedad no mejoran, consulta con un profesional.`
      ),
    ]),
  futuro: T('futuro e incertidumbre',
    ['futuro', 'incertidumbre', 'que sera de mi', 'miedo al futuro', 'no se que estudiar', 'vocacion', 'no se que voy a hacer', 'me da miedo el futuro', 'no se que quiero', 'decidir', 'tomar una decision', 'indecis', 'no se que elegir'],
    [
      (n) => p(
        `${n}la incertidumbre cansa: la mente quiere certezas que nadie tiene. Es normal sentir miedo ante decisiones importantes.`,
        '¿Qué decisión o qué parte del futuro te tiene dando vueltas?'
      ),
      (n) => p(
        `${n}algo que ayuda: separar lo que puedes decidir hoy de lo que no está en tus manos, y dar el siguiente paso pequeño en vez de resolver toda la vida de una vez. Hablarlo con alguien de confianza o con un orientador vocacional puede aclarar mucho. Y si la angustia por el futuro te bloquea o no te deja dormir, también vale la pena consultarlo con un profesional.`
      ),
    ]),
  redes: T('redes y pantallas',
    ['redes sociales', 'instagram', 'tiktok', 'facebook', 'whatsapp', 'pantallas', 'adiccion al celular', 'videojuegos', 'juegos en linea', 'me comparo en redes', 'likes', 'celular todo el dia', 'no puedo soltar el celular', 'internet', 'youtube'],
    [
      (n) => p(
        `${n}las redes y las pantallas pueden entretenerte y conectarte, pero también aumentar la comparación, el aislamiento, el mal sueño y la ansiedad, sobre todo cuando se usan mucho o de noche.`,
        '¿Cómo sientes que te están afectando? ¿Notas que te comparas, que no puedes parar, o que te quitan horas de sueño o estudio?'
      ),
      (n) => p(
        `${n}algunas ideas: desactivar notificaciones, dejar el celular fuera de la cama, poner límites de tiempo por app, seguir cuentas que te hagan bien y recordar que las redes muestran lo mejor y filtrado de la gente. Si sientes que no puedes controlarlo o te está afectando mucho el ánimo, vale la pena hablarlo con un profesional. Y si hay burlas o acoso en redes, es ciberacoso: guarda capturas y cuéntalo a un adulto de confianza.`
      ),
    ]),

  // ------------------------------------------------------------ otras condiciones (info breve + derivacion)
  bipolar: T('trastorno bipolar',
    ['bipolar', 'mania', 'maniaco', 'euforia', 'altibajos', 'cambios de humor', 'subidas y bajadas', 'ciclotimia', 'hipoman'],
    [
      (n) => p(
        `${n}el trastorno bipolar implica períodos de ánimo muy elevado o irritable con mucha energía y menos necesidad de dormir (manía o hipomanía), alternados con períodos de depresión. No es lo mismo que tener "cambios de humor" normales o reaccionar a lo que pasa.`,
        'Solo un psiquiatra puede valorarlo. Es tratable con medicación y psicoterapia, y el seguimiento es clave. ¿Qué has notado tú o la persona de la que hablas: cuánto duran los cambios y cómo afectan el sueño, el dinero o las relaciones?'
      ),
      (n) => p(
        `${n}si hay períodos de mucha energía con poco sueño, decisiones impulsivas o ideas de grandeza, y luego bajones fuertes, conviene consultar con psiquiatría pronto. Y si hay riesgo de hacerse daño, llama al 123 o a ${LINES}.`
      ),
    ]),
  autismo: T('autismo',
    ['autismo', 'autista', 'asperger', 'espectro autista'],
    [
      (n) => p(
        `${n}el autismo no es un trastorno de salud mental sino una condición del neurodesarrollo: implica formas distintas de comunicación, interacción social y de procesar estímulos. Puede coexistir con ansiedad o depresión, que sí se pueden tratar.`,
        'La valoración la hace un equipo especializado (neuropediatría, psiquiatría, psicología). Si preguntas por un niño o niña, consulta con su pediatra para una evaluación del desarrollo. ¿Quieres contarme qué has notado?'
      ),
    ]),
  riesgo_cercano: T('alguien cercano en riesgo',
    ['suicid', 'se quiere matar', 'se quiere morir', 'quiere suicidarse', 'habla de morir', 'amenaza con matarse', 'se corta', 'se lastima', 'se hace dano', 'se autolesiona', 'autolesion', 'intento quitarse la vida', 'intento suicidarse', 'dijo que se iba a matar', 'quiere desaparecer'],
    [
      (n) => p(
        `${n}gracias por avisar y por preocuparte: tomarlo en serio puede salvar una vida.`,
        'Lo más importante ahora:\n• No lo dejes solo/a si hay riesgo inmediato; quédate con la persona o pide que alguien lo haga.\n• Pregunta directamente si piensa en hacerse daño o en suicidarse: preguntar NO le pone la idea en la cabeza; abre la puerta a hablar.\n• Escucha sin juzgar ni minimizar, y aleja objetos peligrosos (medicamentos, armas, cuerdas) si puedes.\n• No guardes el secreto: busca a un adulto o profesional.',
        `Llama ya a ${LINES}, o lleva a la persona a urgencias si hay riesgo inminente. Si me cuentas más (edad, qué dijo o hizo), te oriento mejor.`
      ),
      (n) => p(
        `${n}sigo contigo. Después de la urgencia, lo importante es que reciba valoración profesional (psicología o psiquiatría) y que su entorno la acompañe: rutina, no aislarla, retirar medios peligrosos y seguimiento. Si tienes cuenta, también el equipo profesional de AIMotion puede revisar el caso.`,
        '¿Cómo estás tú? Acompañar a alguien en riesgo es muy pesado y también mereces apoyo.'
      ),
    ], { priority: 20 }),

  // ------------------------------------------------------------ orientacion a familias y servicio
  padres: T('familias',
    ['mi hijo', 'mi hija', 'mis hijos', 'mi nino', 'mi nina', 'mi adolescente', 'mi chico', 'mi chica', 'mi sobrino', 'mi sobrina', 'mi hermanito', 'mi hermanita', 'soy mama', 'soy papa', 'soy padre', 'soy madre', 'mi muchacho', 'mi muchacha', 'como padre', 'como madre', 'padres de familia', 'adolescentes'],
    [
      (n) => p(
        `${n}qué bueno que estés atento/a a tu hijo/a: acompañar a tiempo marca una gran diferencia.`,
        'Para orientarte mejor, cuéntame qué has notado. Por ejemplo:\n• Tristeza, irritabilidad, desgano, aislamiento o bajón en el colegio (posible depresión)\n• Miedos, preocupación excesiva, dolores de estómago o cabeza, rechazo a ir al colegio (posible ansiedad)\n• Agotamiento, mal sueño, presión por tareas o actividades (estrés)\n• Desconfianza inusual, ideas o conversaciones extrañas, oír o ver cosas (consulta pronta, posible psicosis)',
        'No es para diagnosticar sino para orientarte. ¿Qué edad tiene y qué cambios notas, y desde cuándo?'
      ),
      (n) => p(
        `${n}gracias por el contexto. Mientras buscas valoración profesional (pediatra o psicólogo infantil/adolescente), puedes: conversar en un momento tranquilo sin interrogar, escuchar sin minimizar ("eso son cosas de la edad"), mantener rutinas de sueño y comida, limitar pantallas de noche, y coordinar con el colegio.`,
        `Señales de alerta que requieren ayuda inmediata: hablar de morir o hacerse daño, lesiones autoinfligidas, ideas de que lo persiguen u oír voces, o dejar de comer o dormir de forma marcada. En ese caso: ${LINES}.`
      ),
    ], { priority: 8 }),
  terapia: T('ayuda profesional',
    ['terapia', 'psicologo', 'psicologa', 'psiquiatra', 'consulta psicologica', 'cita con', 'primera sesion', 'como consigo ayuda', 'eps', 'cuanto cuesta', 'donde puedo ir', 'quiero ir a terapia', 'necesito un profesional', 'buscar ayuda', 'ayuda profesional', 'hablar con un profesional'],
    [
      (n) => p(
        `${n}me alegra que estés pensando en ayuda profesional, es un paso valioso.`,
        'Algunas rutas en Colombia:\n• Por tu EPS: pide cita de medicina general y solicita remisión a psicología o psiquiatría.\n• Universidades con consultorios de psicología a bajo costo y bienestar universitario/institucional si estudias.\n• Orientación inmediata y gratuita: ' + LINES + '.\n• En la sección "Contacto" de AIMotion tienes el equipo y recursos.',
        '¿Qué te hace considerarlo ahora, y qué es lo que más temes o dudas de ir?'
      ),
      (n) => p(
        `${n}en una primera sesión normalmente solo conversan: el profesional te pregunta qué te trae, cómo te has sentido y qué esperas, sin juzgarte. No tienes que "tener todo claro". Puedes llevar anotado lo que quieras contarle (síntomas, desde cuándo, qué ayuda o empeora).`,
        'Y si el primer profesional no te hace sentir cómodo/a, está bien probar con otro: la confianza es parte del tratamiento.'
      ),
    ], { priority: 7 }),
  app: T('AIMotion',
    ['aimotion', 'tamizaje', 'phq', 'gad', 'crear cuenta', 'mi cuenta', 'registrarme', 'contacto de emergencia', 'sms', 'plan semanal', 'mi progreso', 'panel profesional', 'es gratis', 'cuesta', 'privacidad', 'confidencial', 'mis datos', 'quien ve', 'quien lee', 'como funciona'],
    [
      (n) => p(
        `${n}con gusto te explico cómo funciona AIMotion:`,
        '• **Chat de apoyo**: conversas conmigo; te escucho y te doy información sobre depresión, ansiedad, estrés y esquizofrenia. No diagnostico ni receto.\n• **Tamizaje**: cuestionarios PHQ-9 (ánimo) y GAD-7 (ansiedad); el resultado es orientativo y queda para revisión profesional.\n• **Cuenta (opcional)**: guarda tu historial y permite el seguimiento; al crearla registras un contacto de emergencia, que solo recibe un SMS breve si se detecta un riesgo crítico (sin detalles de lo que escribiste).\n• **Mi Progreso**: aquí ves el plan semanal que te asigne tu profesional.\n• **Alertas**: si detecto una señal de riesgo importante, se avisa a un profesional.',
        'El equipo profesional puede revisar lo que compartes dentro de tu cuidado. ¿Quieres saber algo en particular?'
      ),
    ], { priority: 6 }),
};

// ----------------------------------------------------------------------
// Respuestas universales (cuando la pregunta no depende de un tema)
// ----------------------------------------------------------------------

export const UNIVERSAL = {
  medicacion: p(
    'Sobre medicamentos, tengo que ser claro/a: no puedo recomendar, cambiar ni suspender ninguno, eso solo lo hace un médico o psiquiatra que te conozca y te evalúe.',
    'Lo que sí puedo decirte en general: los medicamentos para salud mental (antidepresivos, ansiolíticos, antipsicóticos...) necesitan prescripción y seguimiento, suelen tardar días o semanas en hacer efecto, pueden tener efectos secundarios que conviene comentar con el médico, y no se deben suspender de golpe por cuenta propia. No los mezcles con alcohol sin preguntar.',
    'Si tienes dudas sobre un medicamento que ya tomas, consulta con tu médico o pregunta a tu farmacia/EPS.'
  ),
  cuando: p(
    'Conviene buscar ayuda profesional cuando lo que sientes dura semanas, te cuesta funcionar (dormir, estudiar, trabajar, relacionarte), o te preocupa lo suficiente como para estar aquí preguntándolo.',
    `Y busca ayuda inmediata si aparecen pensamientos de hacerte daño, de que sería mejor no estar, o de hacer daño a otros: ${LINES}.`
  ),
  emergencia: p(
    'Si estás en peligro o alguien lo está, actúa ya:',
    `• Emergencias: 123\n• Orientación en salud mental, 24/7: Línea 106\n• Si hay una persona en riesgo, no la dejes sola y pide ayuda a un adulto cercano.`,
    'Estoy aquí contigo. ¿Puedes contarme qué está pasando ahora mismo?'
  ),
  // Herramientas generales cuando piden "un consejo" sin contexto
  caja_herramientas: p(
    'Algunas herramientas que suelen ayudar casi siempre (no reemplazan ayuda profesional):',
    '• Respiración lenta: inhala 4, exhala 6, varias veces.\n• Anclaje: 5 cosas que ves, 4 que tocas, 3 que oyes, 2 que hueles, 1 que saboreas.\n• Mover el cuerpo: una caminata corta cambia el estado de ánimo.\n• Escribir lo que sientes, sin filtro, 5 minutos.\n• Un paso pequeño: elige UNA cosa fácil para hoy.\n• Hablar con alguien de confianza: no tienes que cargarlo solo/a.',
    'Para darte algo más a tu medida, cuéntame qué está pasando.'
  ),
};

// Preguntas de seguimiento para cerrar respuestas de informacion y mantener el hilo.
export const FOLLOW_UPS = [
  '¿Quieres que profundice en algún punto, o prefieres contarme cómo lo vives tú?',
  '¿Esto se parece a lo que estás viviendo, o preguntas por otra persona?',
  '¿Qué te gustaría saber a continuación?',
  'Si quieres, cuéntame qué te llevó a preguntarlo.',
  '¿Hay algo de esto que te haya hecho sentido, o algo que no te cuadre?',
];

// Preguntas reflexivas para cuando una conversacion ya agoto sus niveles:
// se rotan para no repetir y siguen invitando a profundizar.
export const DEEPENING_POOL = [
  (label) => `¿Qué ha sido lo más difícil de lo que vives con ${label} esta semana?`,
  () => 'Si pudieras cambiar UNA sola cosa de esta situación, ¿cuál sería?',
  () => '¿Qué te ha ayudado, aunque sea un poquito, en los momentos más pesados?',
  () => '¿Quién más sabe que estás pasando por esto? A veces contarlo a una persona de confianza alivia mucho.',
  () => '¿En qué momento del día se siente más pesado, y en cuál un poco más llevadero?',
  () => 'Si un amigo/a te contara lo mismo que tú me cuentas, ¿qué le dirías?',
  () => '¿Qué necesitarías hoy: desahogarte, ideas prácticas, o simplemente que te escuchen?',
  () => '¿Te gustaría que armemos juntos un paso pequeño y concreto para hoy o mañana?',
];

export const NEXT_STEPS = [
  'Recuerda que en "Tamizaje" puedes completar el PHQ-9 o el GAD-7, y que si quieres seguimiento puedes crear una cuenta para que un profesional te acompañe.',
  'Si esto lleva semanas o te está afectando el día a día, hablarlo con un profesional puede darte herramientas a tu medida: en "Contacto" tienes el camino.',
  `Y si en algún momento sientes que no puedes más, no esperes: ${LINES}.`,
];
