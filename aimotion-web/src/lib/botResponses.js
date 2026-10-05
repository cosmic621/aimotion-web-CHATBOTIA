// Asistente conversacional de apoyo asistido y tamizaje.
//
// DELIMITACION (Human-in-the-Loop): este modulo NO diagnostica, NO prescribe
// y NO realiza psicoterapia autonoma. Ofrece psicoeducacion general y
// recoleccion estructurada de informacion preliminar. Los factores de riesgo
// critico son interceptados ANTES de llegar aqui por src/lib/riskEngine.js,
// que desactiva este flujo y activa el protocolo de escalamiento hacia un
// profesional. Todo hallazgo relevante queda registrado para revision humana.

export const INTRO_MESSAGE =
  'Hola... me alegra que estés aquí. 💜\n\n' +
  'Antes de empezar, quiero ser transparente contigo: soy un asistente conversacional de apoyo y tamizaje, ' +
  'no un profesional de salud mental. No diagnostico ni reemplazo una consulta clínica. Mi función es ' +
  'escucharte, ofrecerte información útil y, si detecto una señal de riesgo importante, avisar de inmediato ' +
  'a un profesional de la red de apoyo para que pueda acompañarte.\n\n' +
  'Todo lo que compartas aquí puede ser revisado por el equipo profesional a cargo, como parte del cuidado que recibes.\n\n' +
  '¿Cómo te sientes en este momento?';

export function getBotResponse(userMessage, userName) {
  const msg = userMessage.toLowerCase().trim();

  if (!userName && (msg.includes('me llamo') || msg.includes('mi nombre es') || msg.includes('soy'))) {
    const nameMatch = msg.match(/(?:me llamo|mi nombre es|soy)\s+([a-záéíóúñ]+)/i);
    if (nameMatch) {
      const name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
      return {
        text: `Es un placer conocerte, ${name}. 💜\n\nGracias por confiar en mí y compartir tu nombre.\n\nAhora cuéntame, ${name}, ¿qué te trae por aquí hoy?`,
        detectedName: name,
      };
    }
  }

  const reply = (text) => ({ text, detectedName: null });

  if (
    msg.includes('triste') || msg.includes('deprimido') || msg.includes('deprimida') ||
    msg.includes('depresión') || msg.includes('vacío') || msg.includes('vacía') ||
    msg.includes('sin ganas') || msg.includes('no tengo energia') || msg.includes('no tengo energía')
  ) {
    return reply(`${userName ? userName + ', ' : ''}puedo notar el peso en tus palabras, y lamento que estés cargando con esto.\n\nNo estás exagerando ni eres débil: lo que describes puede tener explicaciones clínicas reales, y por eso vale la pena que quede registrado para que el profesional a cargo lo revise contigo.\n\n💭 Mientras tanto, algunas ideas que pueden ayudar hoy:\n\n🌅 Si puedes, aunque sea difícil:\n• Abre las cortinas, deja entrar luz natural\n• Toma un vaso de agua\n• Respira: 4 segundos inhalando, 6 exhalando\n\n¿Cuánto tiempo llevas sintiéndote así? ¿Apareció de repente o ha sido gradual?\n\nSi te parece útil, más adelante puedes completar el cuestionario PHQ-9 en la sección "Tamizaje" — es una herramienta estandarizada que usan los profesionales para entender mejor el estado de ánimo, y el resultado queda disponible para quien te acompañe clínicamente.`);
  }

  if (
    msg.includes('ansied') || msg.includes('pánico') || msg.includes('panico') ||
    msg.includes('no puedo respirar') || msg.includes('taquicardia') ||
    msg.includes('nervios') || msg.includes('preocup') || msg.includes('miedo')
  ) {
    return reply(`${userName ? userName + ', ' : ''}está bien, respiremos juntos un momento.\n\n🫁 AHORA MISMO:\n1. Pon tu mano en tu pecho\n2. Inhala contando: 1... 2... 3... 4\n3. Sostén: 1... 2... 3... 4\n4. Exhala despacio: 1... 2... 3... 4... 5... 6\n5. Repite.\n\n🌊 Técnica de anclaje: nombra en voz alta 5 cosas que ves, 4 que tocas, 3 que escuchas, 2 que hueles, 1 que saboreas.\n\n¿Sabes qué lo desencadenó, o apareció sin razón aparente? Cuéntame más para que quede registrado y el profesional pueda orientarte mejor.\n\nSi la ansiedad es frecuente, la escala GAD-7 (en "Tamizaje") ayuda a dimensionarla de forma estandarizada.`);
  }

  if (
    msg.includes('estres') || msg.includes('estrés') || msg.includes('agobiad') ||
    msg.includes('abrumad') || msg.includes('no puedo más') || msg.includes('no doy mas') ||
    msg.includes('demasiado') || msg.includes('presión') || msg.includes('presion') || msg.includes('burnout')
  ) {
    return reply(`${userName ? userName + ', ' : ''}oye, para un momento.\n\nEl hecho de que estés aquí ya es una señal de que necesitas un respiro, y está bien necesitarlo.\n\n¿Has comido, tomado agua y dormido bien hoy? Si la respuesta es "no" a alguna, ese es un buen punto de partida.\n\n🛑 Ahora mismo:\n1. Silencia notificaciones por 30 minutos\n2. Respira profundo 5 veces\n3. Pregúntate: "¿qué es lo MÁS urgente ahora?" — una sola cosa, no diez\n\n¿Qué te tiene así? ¿Trabajo, estudios, familia, todo junto? Cuéntame más para entender mejor tu situación.`);
  }

  if (
    msg.includes('solo') || msg.includes('sola') || msg.includes('soledad') ||
    msg.includes('nadie') || msg.includes('aislad') || msg.includes('sin amigos') ||
    msg.includes('no tengo a nadie')
  ) {
    return reply(`${userName ? userName + '...' : 'Oye...'} estoy aquí. Sé que no es lo mismo que tener a alguien físicamente contigo, pero en este momento no estás completamente solo/a.\n\nLa soledad no significa que algo esté mal contigo. A veces significa que no te sientes visto/a, o que las conexiones que tienes se sienten superficiales.\n\n¿Es que literalmente no tienes personas cerca, o es que tienes gente pero te sientes desconectado/a? La solución es distinta para cada caso, así que cuéntame más sobre tu situación.`);
  }

  if (
    msg.includes('pareja') || msg.includes('novio') || msg.includes('novia') ||
    msg.includes('relacion') || msg.includes('relación') || msg.includes('terminamos') ||
    msg.includes('ruptura') || msg.includes('infiel') || msg.includes('me engañ') ||
    msg.includes('ya no me quiere') || msg.includes('me dejo') || msg.includes('me dejó')
  ) {
    return reply(`${userName ? userName + ', ' : ''}el dolor del rechazo o la pérdida de una relación es real: activa zonas cerebrales similares a las del dolor físico, así que lo que sientes es válido.\n\n¿Qué pasó exactamente? ¿Terminaron, hay problemas pero siguen juntos, o fue algo más difícil como una infidelidad?\n\nCuéntame con calma; entre más contexto tenga, mejor puedo orientarte, y esa información quedará disponible para el profesional si decides continuar con seguimiento.`);
  }

  if (
    msg.includes('familia') || msg.includes('padre') || msg.includes('madre') ||
    msg.includes('mamá') || msg.includes('papá') || msg.includes('hermano') || msg.includes('hermana') ||
    (msg.includes('casa') && (msg.includes('problema') || msg.includes('pelea') || msg.includes('conflicto')))
  ) {
    return reply(`${userName ? userName + ', ' : ''}los conflictos familiares duelen distinto porque involucran a personas que no elegiste y con quienes compartes historia.\n\n¿Qué está pasando? ¿Es con tus padres, hermanos, o toda la familia? ¿Es algo nuevo o un conflicto de años?\n\nAlgo importante: no le debes tu salud mental a nadie, incluida tu familia. Está bien poner límites incluso con quienes quieres.\n\nCuéntame más para entender mejor tu situación.`);
  }

  if (
    msg.includes('autoestima') || msg.includes('no valgo') || msg.includes('no sirvo') ||
    msg.includes('no soy suficiente') || msg.includes('no gusto') ||
    msg.includes('nadie me quiere') || msg.includes('insegur')
  ) {
    return reply(`${userName ? userName + '... ' : ''}esa voz que te dice que no eres suficiente no es la verdad sobre quién eres — suele venir de comparaciones, estándares imposibles o experiencias dolorosas que internalizaste.\n\n¿Le hablarías así a un amigo? Probablemente no.\n\n¿Qué específicamente te hace sentir que no eres suficiente? Cuéntame más para poder acompañarte mejor en esto.`);
  }

  if (
    (msg.includes('trabajo') || msg.includes('estudios') || msg.includes('universidad') ||
      msg.includes('colegio') || msg.includes('examen') || msg.includes('carrera')) &&
    (msg.includes('mal') || msg.includes('problema') || msg.includes('reprobar') ||
      msg.includes('fracas') || msg.includes('despid') || msg.includes('renunci'))
  ) {
    return reply(`${userName ? userName + ', ' : ''}respira. Sé que se siente enorme ahora mismo, pero una nota, un despido o un tropiezo no define tu valor ni tu futuro.\n\n¿Qué pasó exactamente? ¿Fue algo académico o laboral?\n\nCuéntame más para poder pensar juntos en los siguientes pasos.`);
  }

  if (
    msg.includes('perdido') || msg.includes('perdida') || msg.includes('sin sentido') ||
    msg.includes('no se que hacer') || msg.includes('no sé qué hacer') ||
    msg.includes('proposito') || msg.includes('propósito') || msg.includes('confundido')
  ) {
    return reply(`${userName ? userName + '... ' : ''}sentirse perdido muchas veces significa que estás cuestionando en vez de conformarte con respuestas fáciles. Eso no es debilidad.\n\n¿Es más sobre tu carrera/trabajo, sobre quién eres, o sobre el sentido de las cosas en general? Cuéntame para poder explorar esto contigo con más contexto.`);
  }

  if (
    msg.includes('enojado') || msg.includes('enojada') || msg.includes('ira') ||
    msg.includes('rabia') || msg.includes('furioso') || msg.includes('furiosa') || msg.includes('odio')
  ) {
    return reply(`${userName ? userName + ', ' : ''}el enojo es una emoción válida — muchas veces es la más honesta, porque te dice "algo aquí está mal".\n\nSi estás en medio de un momento de enojo ahora: respira profundo 10 veces, y si puedes, aléjate del lugar antes de decir o hacer algo de lo que te arrepientas.\n\n¿Qué o quién te tiene así? Cuéntame, a veces solo expresarlo ya ayuda.`);
  }

  if (
    msg.includes('adiccion') || msg.includes('adicción') || msg.includes('alcohol') ||
    msg.includes('droga') || msg.includes('no puedo parar') || msg.includes('dependencia') || msg.includes('vicio')
  ) {
    return reply(`${userName ? userName + '... ' : ''}el hecho de que estés reconociendo esto es un paso enorme; la mayoría de personas tarda años en llegar aquí.\n\n⚠️ Importante: si tienes dependencia física al alcohol o a benzodiacepinas, NO dejes de consumir abruptamente sin supervisión médica — puede ser peligroso.\n\n¿Qué estás consumiendo, con qué frecuencia y hace cuánto? No te juzgo, solo necesito entender para que el profesional que revise tu caso tenga contexto útil.\n\nEsta información quedará registrada para seguimiento profesional, y en la sección "Contacto" encontrarás líneas de apoyo especializadas en Colombia.`);
  }

  if (
    msg.includes('no puedo dormir') || msg.includes('insomnio') || msg.includes('pesadilla') || msg.includes('no duermo')
  ) {
    return reply(`${userName ? userName + ', ' : ''}cuando no duermes, todo se siente peor — es fundamental abordarlo.\n\n¿Es que no logras dormirte, te despiertas a media noche, duermes pero no descansas, o son pesadillas? ¿Hace cuánto pasa esto?\n\nCuéntame más para orientarte mejor, y si lleva más de un mes, vale la pena que lo comentes con el profesional a cargo.`);
  }

  if (
    msg.includes('mejor') || msg.includes('feliz') || msg.includes('contento') || msg.includes('contenta') ||
    (msg.includes('gracias') && msg.includes('ayud'))
  ) {
    return reply(`${userName ? userName + ', ' : ''}eso me hace muy feliz de escuchar. 😊💜\n\nTú diste los pasos, tú pusiste el esfuerzo. Yo solo estuve aquí escuchando.\n\n¿Hay algo más en lo que pueda apoyarte ahora que estás en un mejor lugar?`);
  }

  if (msg.match(/^(hola|buenos dias|buenas tardes|buenas noches|hey|hi|saludos)$/)) {
    return reply(`Hola ${userName || ''}... 💜\n\nMe alegra que estés aquí. ¿Cómo está tu corazón hoy? ¿Qué te trae por aquí?`);
  }

  if (msg.includes('como estas') || msg.includes('cómo estás') || msg.includes('que tal') || msg.includes('qué tal')) {
    return reply(`Qué lindo que preguntes. 💜 Pero este espacio es para ti — dime, ¿cómo estás TÚ realmente?`);
  }

  if (
    msg.includes('mas o menos') || msg.includes('más o menos') || msg.includes('regular') ||
    msg.includes('no se como') || msg.includes('no sé cómo')
  ) {
    return reply(`${userName ? userName + ', ' : ''}está bien no saber cómo te sientes exactamente. A veces es una mezcla difícil de nombrar.\n\n¿Qué ha estado pasando últimamente? ¿Algo específico, o es más una sensación general?`);
  }

  if (
    (msg.includes('mal') || msg.includes('horrible') || msg.includes('fatal') || msg.includes('pesimo') || msg.includes('pésimo')) &&
    !msg.includes('trabajo') && !msg.includes('relacion')
  ) {
    return reply(`${userName ? userName + '... ' : ''}lamento que no estés bien. Está bien no estar bien, no tienes que fingir fortaleza aquí.\n\n¿Quieres contarme qué está pasando? Puedes simplemente desahogarte, yo te escucho.`);
  }

  if (msg.includes('gracias') || msg.includes('thank')) {
    return reply(`${userName ? userName + ', ' : ''}no tienes que agradecer. Gracias a ti por confiar y compartir lo que sientes — eso requiere valentía.\n\n¿Hay algo más con lo que pueda apoyarte hoy?`);
  }

  if (
    msg.includes('adios') || msg.includes('adiós') || msg.includes('chao') || msg.includes('hasta luego') ||
    msg.includes('nos vemos') || msg.includes('me voy') || msg.includes('bye')
  ) {
    return reply(`${userName ? userName + '... ' : ''}antes de irte: no estás enfrentando esto solo/a, incluso cuando se sienta así.\n\nEste espacio y el equipo profesional detrás de él seguirán aquí. Cuídate mucho.\n\n💜 Hasta pronto, ${userName || 'amigo/a'}.`);
  }

  if (
    msg.includes('que es aimotion') || msg.includes('qué es aimotion') || msg.includes('sobre aimotion') || msg.includes('proyecto')
  ) {
    return reply(`AIMotion es una plataforma de apoyo y tamizaje en salud mental: recojo información preliminar, aplico escalas estandarizadas (PHQ-9 / GAD-7) y, si detecto una señal de riesgo relevante, notifico de inmediato a un profesional.\n\nNo reemplazo una consulta clínica ni diagnostico — todo lo importante lo revisa una persona profesional.\n\n¿Cómo te sientes tú en este momento?`);
  }

  if (
    msg.includes('contacto') || msg.includes('ayuda profesional') || msg.includes('terapia') || msg.includes('psicologo') || msg.includes('psicólogo')
  ) {
    return reply(`Me alegra que consideres ayuda profesional. 💜\n\nEncuentras las líneas de crisis y los datos de contacto del equipo en la sección "Contacto".\n\n¿Qué te hace considerar ayuda profesional ahora mismo? Cuéntame, para que quede registrado y puedan darte seguimiento.`);
  }

  return reply(`${userName ? userName + ', ' : ''}quiero entenderte mejor para poder apoyarte.\n\nPuedo ayudarte a poner en palabras lo que sientes sobre:\n\n💔 Tristeza, ansiedad, enojo, soledad o confusión\n👥 Relaciones de pareja, familia o amistades\n🎯 Autoestima, estrés, sentido de vida, hábitos o sueño\n\nSi prefieres algo más estructurado, en la sección "Tamizaje" puedes completar el PHQ-9 o el GAD-7 — cuestionarios breves que el profesional usará para entender mejor tu situación.\n\n¿Qué está pasando contigo en este momento?`);
}
