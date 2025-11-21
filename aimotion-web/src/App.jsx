import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Menu, Heart, Brain, Shield, Target, Sparkles, Moon, Sun } from 'lucide-react';

const AIMOTIONWebsite = () => {
  const [activeSection, setActiveSection] = useState('inicio');
  const [messages, setMessages] = useState([
    { 
      type: 'bot', 
      text: 'Hola... Me alegra mucho que estés aquí. 💜\n\nSé que a veces es difícil dar el primer paso, pero quiero que sepas que este es un espacio completamente seguro para ti. No hay juicios, no hay prisas, no hay respuestas "correctas".\n\n¿Cómo te sientes en este momento? Y por favor, siéntete libre de compartir lo que realmente está en tu corazón, no lo que crees que deberías decir.' 
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userName, setUserName] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

 
  const getBotResponse = (userMessage) => {
    const msg = userMessage.toLowerCase().trim();
    
    
    if (!userName && (msg.includes('me llamo') || msg.includes('mi nombre es') || msg.includes('soy'))) {
      const nameMatch = msg.match(/(?:me llamo|mi nombre es|soy)\s+([a-záéíóúñ]+)/i);
      if (nameMatch) {
        setUserName(nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1));
        return `Es un placer conocerte, ${nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)}. 💜\n\nGracias por confiar en mí y compartir tu nombre. Eso significa mucho.\n\nAhora cuéntame, ${nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)}, ¿qué te trae por aquí hoy? ¿Hay algo que esté pesando en tu corazón?`;
      }
    }
    
    
    if (msg.includes('suicid') || msg.includes('no quiero vivir') || msg.includes('quiero morir') || 
        msg.includes('no vale la pena') || msg.includes('mejor muerto') || msg.includes('acabar con')) {
      return `${userName ? userName + ', ' : ''}escúchame con atención... Lo que estás sintiendo ahora mismo es real, es válido, y es increíblemente difícil. Pero necesito que sepas algo importante: tu vida tiene valor, incluso si ahora mismo no puedes verlo.\n\nLo que sientes ahora NO es permanente, aunque en este momento parezca que nunca va a cambiar. El dolor que cargas puede aliviarse, te lo prometo.\n\n🆘 POR FAVOR, contacta AHORA:\n📞 Línea 106 (Colombia, 24/7)\n📞 Línea de la vida: 01 8000 113 113\n📞 Emergencias: 123\n\nNo estás siendo dramático/a. No estás molestando. No estás solo/a.\n\nSi no puedes llamar ahora, ¿puedes prometerme que te quedarás seguro/a? ¿Hay alguien cerca - un amigo, familiar, vecino - con quien puedas estar?\n\nMientras tanto, estoy aquí contigo. ¿Quieres contarme qué te llevó a este punto? A veces, poner el dolor en palabras puede ayudar aunque sea un poco...`;
    }
    
    
    if (msg.includes('triste') || msg.includes('deprimido') || msg.includes('deprimida') || 
        msg.includes('depresión') || msg.includes('vacío') || msg.includes('vacía') ||
        msg.includes('sin ganas') || msg.includes('no tengo energia') || msg.includes('no tengo energía')) {
      return `${userName ? userName + ', ' : ''}puedo sentir el peso en tus palabras... y lamento mucho que estés cargando con esto. La tristeza puede sentirse como un océano en el que estás hundiéndote, ¿verdad?\n\nPrimero, quiero que sepas que NO estás exagerando. NO eres débil. NO es "solo cosa tuya". La depresión es real, es una enfermedad, y no es tu culpa.\n\n¿Cuánto tiempo has estado sintiéndote así? ¿Es algo que apareció de repente o ha sido gradual?\n\n💭 Mientras hablamos, algunas cosas que pueden ayudar AHORA:\n\n🌅 Si puedes, aunque sea difícil:\n• Abre las cortinas, deja entrar luz natural\n• Toma un vaso de agua (la deshidratación empeora todo)\n• Si puedes, date una ducha - no tiene que ser larga\n• Respira: 4 segundos inhalando, 6 exhalando\n\n🎯 Lo que quiero que entiendas:\n• No tienes que "mejorar" de inmediato\n• Está bien tener días malos\n• Pequeños pasos cuentan (levantarte hoy YA es algo)\n• No estás solo/a en esto\n\n¿Hay algo específico que haya desencadenado esto? ¿O es más una sensación general que te envuelve?\n\nY por favor, si esto dura más de 2 semanas o empeora, considera hablar con un profesional. Tu médico general puede ayudarte incluso si no tienes acceso inmediato a un psicólogo.`;
    }
    
    
    if (msg.includes('ansied') || msg.includes('pánico') || msg.includes('panico') || 
        msg.includes('no puedo respirar') || msg.includes('taquicardia') || msg.includes('ataque') ||
        msg.includes('nervios') || msg.includes('preocup') || msg.includes('miedo')) {
      return `${userName ? userName + ', ' : ''}está bien, te tengo. Respira conmigo, ¿sí?\n\n🫁 AHORA MISMO, hagamos esto juntos:\n\n1. Pon tu mano en tu pecho\n2. Inhala contando: 1... 2... 3... 4\n3. Sostén: 1... 2... 3... 4\n4. Exhala despacio: 1... 2... 3... 4... 5... 6\n5. Repite. Yo espero.\n\n...\n\n¿Un poco mejor? Aunque sea un 1% cuenta.\n\nLo que estás sintiendo es aterrador, lo sé. Pero aquí está la verdad: NO te estás muriendo. NO te estás volviendo loco/a. NO va a durar para siempre. Tu cuerpo está en modo de supervivencia cuando no hay peligro real.\n\n🌊 Técnica de anclaje (HAZLA AHORA):\n\nMira alrededor y nombra en voz alta:\n• 5 cosas que VES\n• 4 cosas que TOCAS\n• 3 cosas que ESCUCHAS  \n• 2 cosas que HUELES\n• 1 cosa que SABOREAS\n\nEsto trae tu mente de vuelta al presente.\n\n💭 Después de que pase:\n\n¿Sabes qué la desencadenó? A veces la ansiedad aparece de la nada, pero otras veces hay patrones. Identificarlos es el primer paso para manejarla.\n\nAlgunas causas comunes:\n• Cafeína (café, té, energizantes)\n• Falta de sueño\n• Estrés acumulado\n• Eventos específicos (espacios cerrados, multitudes, etc.)\n• Problemas sin resolver\n\n¿Te pasa seguido? ¿Es la primera vez? Cuéntame más para poder ayudarte mejor.\n\nY ${userName || 'amigo/a'}, si esto es recurrente, por favor considera consultar a un profesional. La terapia cognitivo-conductual es MUY efectiva para la ansiedad.`;
    }
    
    
    if (msg.includes('estres') || msg.includes('estrés') || msg.includes('agobiad') || 
        msg.includes('abrumad') || msg.includes('no puedo más') || msg.includes('no doy mas') ||
        msg.includes('demasiado') || msg.includes('presión') || msg.includes('presion') || msg.includes('burnout')) {
      return `${userName ? userName + ', ' : ''}oye... para. En serio, para un momento.\n\nSé que sientes que no puedes parar, que hay mil cosas esperándote, pero escúchame: si no paras tú, tu cuerpo te va a parar eventualmente. Y no va a ser lindo.\n\nEl hecho de que estés aquí, escribiéndome, ya es una señal de que necesitas un respiro. Y está BIEN necesitarlo.\n\n❤️ Primero lo primero:\n\n¿Has comido hoy? ¿Tomado agua? ¿Dormido bien?\n\nSi la respuesta a cualquiera es "no" o "más o menos", ESE es tu primer problema. No puedes funcionar con el tanque vacío.\n\n🛑 Ahora mismo:\n\n1. Cierra pestañas/apps que no necesites\n2. Pon tu teléfono en silencio por 30 minutos\n3. Respira profundo 5 veces\n4. Pregúntate: "¿Qué es lo MÁS urgente ahora mismo?"\n\nNo 10 cosas. UNA cosa.\n\n📋 Técnica de priorización:\n\n• URGENTE E IMPORTANTE → Hazlo YA\n• IMPORTANTE pero NO urgente → Agéndalo\n• URGENTE pero NO importante → Delégalo o di que no\n• NI urgente NI importante → Elimínalo\n\nLa mayoría de cosas en tu lista probablemente están en las últimas dos categorías.\n\n💭 Ahora, hablemos en serio:\n\n¿Qué te tiene así? ¿Trabajo? ¿Estudios? ¿Familia? ¿Todo junto?\n\nY más importante: ¿De dónde viene la presión? ¿Es externa (jefe, padres, sociedad) o interna (perfeccionismo, miedo a decepcionar)?\n\nPorque aquí está la verdad dura: no puedes complacer a todos. No puedes ser perfecto/a. Y el mundo no se va a acabar si dices "no" o si algo no sale perfecto.\n\n¿Qué pasaría si hoy solo haces el 70% en vez del 110%? ¿Realmente sería tan terrible?\n\nCuéntame más sobre qué te está abrumando. Vamos a desenredar esto juntos.`;
    }
    
    
    if (msg.includes('solo') || msg.includes('sola') || msg.includes('soledad') || 
        msg.includes('nadie') || msg.includes('aislad') || msg.includes('sin amigos') ||
        msg.includes('no tengo a nadie')) {
      return `${userName ? userName + '...' : 'Oye...'}  Estoy aquí. Y sé que no es lo mismo que tener a alguien físicamente contigo, pero quiero que sepas que en este momento, no estás completamente solo/a.\n\nLa soledad es una de las emociones más dolorosas que existen. Y lo peor es que viene con tanta vergüenza, ¿verdad? Como si ser solitario significara que algo está mal contigo.\n\nPero déjame decirte algo: NO hay nada mal contigo.\n\n💜 La soledad no siempre significa:\n• Que no tengas gente alrededor\n• Que nadie te quiera\n• Que seas "raro/a" o "defectuoso/a"\n\nA veces significa:\n• Que no te sientes VISTO/A por quienes te rodean\n• Que las conexiones que tienes son superficiales\n• Que estás pasando por algo que sientes que nadie entiende\n\n¿Cuál es tu tipo de soledad?\n\n🤔 Piénsalo:\n\n¿Es que literalmente no tienes personas? ¿O es que tienes gente pero te sientes desconectado/a?\n\nPorque la solución es diferente para cada una.\n\n💭 Si es que no tienes personas:\n\nSé que "sal y conoce gente" suena vacío e imposible. Pero en serio, pequeños pasos:\n\n• Voluntariado (conexión instantánea por causa común)\n• Clubes/grupos de hobby (¿qué te gustaba antes?)\n• Clases de algo que siempre quisiste aprender\n• Grupos de apoyo (si aplica)\n• Incluso comunidades online (son reales también)\n\nLa clave: busca CONEXIÓN, no solo compañía.\n\n💭 Si es que te sientes desconectado/a:\n\n¿Cuándo fue la última vez que tuviste una conversación REAL? De esas donde compartes algo vulnerable y la otra persona también?\n\nA veces tenemos 100 conocidos y cero amigos reales. Y eso es más solitario que no tener a nadie.\n\n🌱 Pregunta importante:\n\n¿Tú te permites SER conocido/a? ¿O mantienes las paredes arriba por miedo al rechazo?\n\nPorque mira, el rechazo duele. Pero el aislamiento duele más y por más tiempo.\n\n¿Quieres contarme más sobre tu situación? ¿Qué te tiene sintiéndote tan solo/a?`;
    }
    
    
    if (msg.includes('pareja') || msg.includes('novio') || msg.includes('novia') || 
        msg.includes('relacion') || msg.includes('relación') || msg.includes('terminamos') || 
        msg.includes('ruptura') || msg.includes('cortar') || msg.includes('infiel') || 
        msg.includes('me engañ') || msg.includes('ya no me quiere') || msg.includes('me dejo') || msg.includes('me dejó')) {
      return `${userName ? userName + ', ' : ''}ay... El dolor del corazón es real, literal. Los estudios muestran que el rechazo romántico activa las mismas áreas del cerebro que el dolor físico.\n\nAsí que lo que sientes NO es exageración. NO es debilidad. Es completamente normal y válido.\n\n💔 Primero: ¿Qué pasó?\n\n¿Terminaron? ¿Hay problemas pero siguen juntos? ¿Infidelidad? ¿Simplemente se están alejando?\n\nCada situación necesita una perspectiva diferente, así que ayúdame a entender...\n\n🤔 Si es una ruptura:\n\nEstá bien sentirte destrozado/a. Aunque hayas sido tú quien terminó. Aunque "sea lo mejor". Aunque "ya lo venías viendo venir".\n\nUna ruptura es un duelo. Estás llorando la pérdida de:\n• La persona\n• El futuro que imaginaban juntos\n• La versión de ti que eras con ellos\n• La rutina, los planes, todo\n\nY el duelo no es lineal. Un día estarás bien, al siguiente fatal. Es normal.\n\n💭 Lo que NECESITAS saber ahora:\n\n❌ NO hagas:\n• Stalkearlo/a en redes (bloquea si es necesario)\n• Rogar o "pelear por la relación" si claramente acabó\n• Buscar cierre de ellos (el cierre viene de ti)\n• Tomar decisiones grandes (nuevo trabajo, mudanza, etc.)\n• Quedarte solo/a todo el tiempo rumiando\n\n✅ SÍ haz:\n• Llora todo lo que necesites\n• Apóyate en amigos/familia\n• Mantén rutinas básicas (comer, dormir, bañarte)\n• Muévete (ejercicio ayuda MUCHO)\n• Escribe (un diario, cartas que nunca enviarás)\n• Si hay sus cosas, guárdalas lejos de la vista\n\n⏰ Línea de tiempo real:\n\n• Días 1-7: Shock, negación, dolor agudo\n• Semanas 2-4: Dolor intenso, enojo, tristeza\n• Meses 1-3: Altibajos, empiezas a tener días buenos\n• Meses 3-6: Mejora gradual, menos pensamientos\n• Mes 6+: Sientes que vuelves a ser tú\n\nEstos son promedios. TÚ puede que sea más rápido o más lento. Ambos están bien.\n\n💔 Si fue infidelidad:\n\nOof, eso es traición en su máxima expresión. Cuestiona todo, ¿verdad?\n\n"¿Qué más fue mentira?" "¿Qué le falta a mí?" "¿Cómo no me di cuenta?"\n\nEscucha esto: NO fue tu culpa. La infidelidad es una DECISIÓN que ellos tomaron. No porque te faltara algo. Porque a ELLOS les faltó carácter.\n\n🤝 Si están en problemas pero siguen juntos:\n\n¿Vale la pena salvarlo?\n\nPreguntas honestas:\n• ¿Te respeta?\n• ¿Te sientes seguro/a (emocional y físicamente)?\n• ¿Pueden comunicarse sin gritos/insultos?\n• ¿Ambos QUIEREN trabajar en esto?\n• ¿Es un bache temporal o un patrón?\n\n🚩 Señales de que deberías irte:\n• Cualquier tipo de abuso (físico, verbal, emocional)\n• Mentiras constantes\n• Control/celos excesivos\n• Te hace sentir pequeño/a, tonto/a, loco/a\n• Tus amigos/familia están preocupados\n• Más días malos que buenos\n• Ya no te reconoces\n\n✅ Señales de que puede salvarse:\n• Ambos reconocen los problemas\n• Hay respeto mutuo subyacente\n• Están dispuestos a terapia de pareja\n• Es un período difícil específico, no la norma\n• Todavía se quieren, solo están perdidos\n\n${userName || 'Amigo/a'}, cuéntame más. ¿Qué está pasando exactamente?`;
    }

    
    
    
    if (msg.includes('familia') || msg.includes('padre') || msg.includes('madre') || 
        msg.includes('mamá') || msg.includes('papá') || msg.includes('hermano') || msg.includes('hermana') ||
        msg.includes('padres') || msg.includes('casa') && (msg.includes('problema') || msg.includes('pelea') || msg.includes('conflicto'))) {
      return `${userName ? userName + ', ' : ''}los conflictos familiares son únicos en su dolor porque involucran a personas que:\n\na) No elegiste (a diferencia de amigos o pareja)\nb) Compartes historia y ADN\nc) Muchas veces no puedes simplemente "alejarte"\n\nAsí que es complicado, lo sé.\n\n🏠 ¿Qué está pasando?\n\n¿Es con tus padres? ¿Hermanos? ¿Toda la familia?\n¿Es algo nuevo o un conflicto de años?\n¿Vives con ellos o es a distancia?\n\nDame contexto para poder ayudarte mejor...\n\n💭 Algunas verdades duras sobre familia:\n\n1. **No les debes tu salud mental**\n   - Sí, son tu familia\n   - No, eso no les da derecho a maltratarte\n   - Está bien poner límites\n   - Está bien alejarte si es tóxico\n\n2. **No puedes cambiarlos**\n   - Solo puedes cambiar cómo reaccionas\n   - Esperar que cambien = sufrir indefinidamente\n   - Aceptación ≠ estar de acuerdo\n\n3. **Tu familia no tiene que entenderte para respetarte**\n   - Pueden no entender tus decisiones\n   - Aún así deben respetarlas\n   - Su desaprobación no te define\n\n🗣️ Comunicación familiar:\n\nSi quieres intentar mejorar las cosas:\n\n• Elige EL momento (no cuando ya están peleando)\n• Usa "yo siento" no "tú haces"\n• Ejemplo: ❌ "Tú nunca me escuchas"\n• Ejemplo: ✅ "Me siento ignorado cuando interrumpes"\n\n• Sé específico/a sobre lo que necesitas\n• No esperes que lean tu mente\n\n• Si escalan, retírate\n• "Hablamos cuando estemos más calmados"\n\n🚪 Si es tóxico:\n\nSeñales de familia tóxica:\n• Te hacen sentir culpable por cuidarte\n• Minimizan tus sentimientos\n• Chantaje emocional constante\n• No respetan límites\n• Critican todo lo que haces\n• Comparaciones hirientes\n• Hacen tu vida más difícil, no más fácil\n\nSi es así: está BIEN alejarte. Distancia ≠ rencor. Es auto-preservación.\n\n¿Qué está pasando específicamente en tu familia?`;
    }

    
    if (msg.includes('autoestima') || msg.includes('no valgo') || msg.includes('no sirvo') || 
        msg.includes('no soy suficiente') || msg.includes('soy feo') || msg.includes('soy fea') ||
        msg.includes('gordo') || msg.includes('gorda') || msg.includes('no gusto') || 
        msg.includes('nadie me quiere') || msg.includes('insegur')) {
      return `${userName ? userName + '... ' : ''}Para.\n\nAntes de que sigamos, necesito que entiendas algo:\n\nEsa voz en tu cabeza que te dice que no eres suficiente, que estás mal, que no vales... esa voz MIENTE.\n\nNo es la verdad. Es el resultado de:\n• Cosas hirientes que te dijeron\n• Comparaciones imposibles\n• Estándares ridículos de la sociedad\n• Experiencias dolorosas que internalizaste mal\n\nPero NO es la verdad sobre quién eres.\n\n💭 Pregunta honesta:\n\n¿Le hablarías a un amigo como te hablas a ti mismo/a?\n\nProbablemente no, ¿verdad? Entonces ¿por qué está bien tratarte así a ti?\n\n🪞 La verdad sobre la autoestima:\n\nNO viene de:\n❌ Ser delgado/a, guapo/a, exitoso/a\n❌ Que todos te quieran\n❌ Ser perfecto/a\n❌ Logros externos\n\nViene de:\n✅ Aceptarte como eres, con defectos incluidos\n✅ Tratarte con compasión\n✅ Respetar tus propios límites y valores\n✅ Reconocer tu valor intrínseco como persona\n\n🔄 Rompiendo el ciclo:\n\n1. **Atrapa el pensamiento negativo**\n   - "Soy un fracaso"\n   \n2. **Cuestionalo**\n   - ¿Es 100% cierto?\n   - ¿Tengo evidencia REAL?\n   - ¿Le diría esto a un amigo?\n   \n3. **Reemplázalo con algo más realista**\n   - "Cometí un error, como todos los humanos"\n   - "Esto no define mi valor como persona"\n\n📝 Ejercicio AHORA:\n\nAunque te cueste, escribe:\n\n• 3 cosas que HACES bien\n• 2 cualidades positivas que tienes\n• 1 cosa que te gusta de tu físico (aunque sea pequeña)\n\nNo tienes que creértelo 100% todavía. Solo escríbelo.\n\n💪 Construyendo autoestima:\n\nNo es rápido, pero funciona:\n\n• **Prueba de realidad**: Cuando pienses algo negativo de ti, busca evidencia en contra\n• **Pequeños logros**: Haz y CELEBRA cosas pequeñas cada día\n• **Límites**: Practica decir "no" a cosas que no quieres\n• **Auto-cuidado**: Trata tu cuerpo con respeto\n• **Menos comparación**: Limita redes sociales\n• **Rodéate bien**: Personas que te eleven, no que te hundan\n\n🎯 Si es sobre tu cuerpo:\n\nTu cuerpo:\n• Te mantiene vivo/a\n• Te permite experiencias\n• Es el hogar de tu mente y alma\n• Merece respeto, no odio\n\nNo tiene que verse como Instagram para ser valioso.\n\n${userName || 'Amigo/a'}, ¿qué específicamente te hace sentir que no eres suficiente? Vamos a desmantelar esa creencia juntos.`;
    }

    
    if ((msg.includes('trabajo') || msg.includes('estudios') || msg.includes('universidad') || 
        msg.includes('colegio') || msg.includes('examen') || msg.includes('carrera')) && 
        (msg.includes('mal') || msg.includes('problema') || msg.includes('reprobar') || 
         msg.includes('fracas') || msg.includes('despid') || msg.includes('renunci'))) {
      return `${userName ? userName + ', ' : ''}respira. Sé que se siente como si el mundo se estuviera acabando, pero no es así. Te lo prometo.\n\n¿Qué pasó exactamente?\n\n📚 Si reprobaste/sacaste mala nota:\n\nOye, escúchame: una nota NO define tu inteligencia. NO define tu futuro. NO define tu valor.\n\n¿Sabes cuántas personas exitosas reprobaron materias? ¿O incluso carreras completas?\n\nEinstein, Steve Jobs, Oprah, JK Rowling... todos tuvieron "fracasos" académicos o laborales.\n\nLa diferencia no fue que fueran perfectos. Fue que siguieron adelante.\n\n💼 Si es laboral (despido, renuncia, problemas):\n\nLos trabajos vienen y van. En serio. En tu vida laboral probablemente tendrás 10+ trabajos diferentes.\n\nEste no es "el único". No es tu única oportunidad.\n\nY si te despidieron: no significa que seas malo/a en lo que haces. A veces:\n• La empresa tiene problemas\n• El ajuste no era bueno\n• Políticas internas\n• Simplemente mala suerte\n\n🎯 Plan de acción:\n\n**Si es académico:**\n\n1. **Evalúa QUÉ salió mal**\n   - ¿Falta de estudio?\n   - ¿No entendiste el material?\n   - ¿Problemas personales te distrajeron?\n   - ¿Método de estudio inadecuado?\n\n2. **Ajusta la estrategia**\n   - Busca ayuda (profesores, tutorías, grupos de estudio)\n   - Cambia tu método de estudio\n   - Mejora la gestión del tiempo\n   - Pide prórroga si hay situación personal\n\n3. **Da perspectiva**\n   - ¿Realmente va a importar en 5 años?\n   - Probablemente no\n\n**Si es laboral:**\n\n1. **Proceso el golpe emocional**\n   - Está bien sentirte mal\n   - No eres un fracaso\n   - Date unos días\n\n2. **Analiza objetivamente**\n   - ¿Qué puedes aprender?\n   - ¿Qué harías diferente?\n   - ¿Qué está fuera de tu control?\n\n3. **Siguiente paso**\n   - Actualiza CV\n   - Networking (70% de trabajos vienen de contactos)\n   - Considera si quieres seguir en esa área\n\n😰 Si te sientes abrumado:\n\nLa presión académica/laboral es REAL. Vivimos en una cultura que:\n• Equipara productividad con valor humano\n• Glorifica el estar ocupado\n• Estigmatiza el descanso\n\nPero escucha: NO eres una máquina. Eres un humano con límites.\n\nY está bien:\n• Tomarte tiempo\n• Cambiar de carrera/trabajo
• Ir más lento que otros
• Priorizar tu salud mental sobre el "éxito"\n\n${userName || 'Amigo/a'}, cuéntame más. ¿Qué está pasando específicamente? ¿Cómo puedo ayudarte?`;
    }

    
    if (msg.includes('perdido') || msg.includes('perdida') || msg.includes('sin sentido') || 
        msg.includes('no se que hacer') || msg.includes('no sé qué hacer') || msg.includes('proposito') || 
        msg.includes('propósito') || msg.includes('para que') || msg.includes('para qué') ||
        msg.includes('no se quien soy') || msg.includes('confundido') || msg.includes('crisis')) {
      return `${userName ? userName + '... ' : ''}Sabes qué es lo curioso? Sentirse perdido muchas veces significa que estás en el camino correcto.\n\nNo te estás conformando con respuestas fáciles. Estás cuestionando. Buscando algo más auténtico. Eso no es debilidad, es valentía.\n\n🧭 Primero, seamos honestos:\n\nLa idea de que "debes saber qué hacer con tu vida" es una mentira cultural.\n\nNadie REALMENTE sabe. Algunos solo son mejores fingiendo.\n\nLa vida no es un camino recto con un destino claro. Es más como... explorar un bosque sin mapa.\n\nY está BIEN no saber.\n\n💭 ¿Qué tipo de "perdido" eres?\n\n**Tipo 1: "No sé qué carrera/trabajo quiero"**\n\nPregúntate:\n• ¿Qué problemas del mundo te molestan?\n• ¿Qué harías gratis porque lo disfrutas?\n• ¿Qué te hacía feliz de niño/a antes de que "debías" importara?\n• ¿Qué haces que te hace perder noción del tiempo?\n\nEl propósito no se "encuentra". Se construye de pequeñas cosas que te importan.\n\n**Tipo 2: "No sé quién soy"**\n\nPregúntate:\n• ¿Quién eres cuando nadie te ve?\n• ¿Qué valores son innegociables para ti?\n• ¿Qué te hace enojar? (dice mucho de lo que valoras)\n• Si pudieras ser cualquier cosa sin miedo, ¿qué serías?\n\nA veces pasamos tanto tiempo siendo quien otros esperan que olvidamos quiénes somos.\n\n**Tipo 3: "La vida no tiene sentido"**\n\nAh, crisis existencial. Bienvenido/a al club.\n\nVerdad dura: objetivamente, el universo es indiferente. No hay un "plan cósmico".\n\nPero aquí está lo liberador: eso significa que TÚ decides qué importa.\n\n¿Qué le da sentido a TU vida?\n• ¿Conexiones con otros?\n• ¿Crear algo?\n• ¿Ayudar?\n• ¿Experiencias?\n• ¿Aprender?\n• ¿Simplemente sentir?\n\nNo necesitas un propósito grandioso. "Ser amable" es suficiente propósito.\n\n🌱 Ejercicio de autodescubrimiento:\n\n**Semana 1: Explora**\n- Prueba algo nuevo cada día (aunque sea pequeño)\n- Lee géneros que nunca lees\n- Habla con gente diferente a ti\n- Ve a lugares nuevos\n\n**Semana 2: Reflexiona**\n- Escribe cada noche: "Hoy me sentí más yo cuando..."\n- ¿Qué patrones ves?\n\n**Semana 3: Experimenta**\n- Toma una de las cosas que te resonaron\n- Profundiza más\n\n🎯 Verdades sobre encontrarse:\n\n1. **Es un proceso, no un destino**\n   - Vas a cambiar toda la vida\n   - Y está bien\n\n2. **Acción precede claridad**\n   - No esperes "saber" antes de hacer\n   - Haz cosas, la claridad viene después\n\n3. **Está bien cambiar de opinión**\n   - Elegir algo no significa elegirlo para siempre\n\n4. **No compares tu Chapter 1 con el Chapter 20 de otro**\n   - Cada quien va a su ritmo\n\n💡 Mientras tanto:\n\n¿Qué es lo SIGUIENTE que puedes hacer? No el panorama completo. Solo el siguiente paso.\n\nA veces es suficiente con:\n• Levantarte mañana\n• Ser amable con alguien\n• Hacer algo que te haga sentir un poco vivo/a\n\nNo necesitas tener todo resuelto.\n\n${userName || 'Amigo/a'}, ¿qué específicamente te tiene sintiéndote perdido/a? ¿Es sobre tu futuro? ¿Tu identidad? ¿El sentido de todo?`;
    }

    
    if (msg.includes('enojado') || msg.includes('enojada') || msg.includes('ira') || 
        msg.includes('rabia') || msg.includes('furioso') || msg.includes('furiosa') ||
        msg.includes('odio') || msg.includes('colera') || msg.includes('rencor')) {
      return `${userName ? userName + ', ' : ''}puedo sentir la intensidad en tus palabras. Y está bien. El enojo es una emoción válida.\n\nDe hecho, el enojo muchas veces es la emoción más HONESTA. No miente. Te dice: "Algo aquí está MAL y necesita cambiar."\n\nPero también puede ser destructivo si no lo manejas.\n\n🔥 Primero: ¿Estás en un momento de enojo AHORA?\n\nSi sí:\n\n**ALTO. RESPIRA.**\n\nEn serio. Antes de enviar ese mensaje, tener esa confrontación, o hacer algo de lo que te arrepientas:\n\n1. Respira profundo 10 veces (cuenta en voz alta)\n2. Si puedes, sal del lugar\n3. Ejercicio intenso (lagartijas, correr, lo que sea)\n4. Grita en una almohada si necesitas\n5. Escribe TODO lo que quisieras decir (pero NO lo envíes)\n\nEl enojo secuestra tu cerebro. Dale 20 minutos para que baje.\n\n🧠 Ahora, entendamos el enojo:\n\nEl enojo casi NUNCA es solo enojo. Debajo hay:\n\n• **Dolor** - "Me lastimaron"\n• **Miedo** - "Me siento amenazado/a"\n• **Impotencia** - "No tengo control"\n• **Injusticia** - "Esto no es justo"\n• **Límites violados** - "Crucé una línea que no debía"\n\n¿Cuál de estos resuena contigo?\n\n💭 Preguntas importantes:\n\n1. **¿Es proporcional?**\n   - Escala del 1-10, ¿qué tan grave es lo que pasó?\n   - ¿Tu enojo está en la misma escala?\n   - Si no, ¿qué MÁS está alimentando esto?\n\n2. **¿Es un patrón?**\n   - ¿Te enojas frecuentemente?\n   - ¿Con las mismas personas/situaciones?\n   - Si sí, hay un problema más profundo\n\n3. **¿Qué necesitas realmente?**\n   - ¿Disculpa?\n   - ¿Justicia?\n   - ¿Que te escuchen?\n   - ¿Venganza? (ojo con este)\n\n🛠️ Manejo del enojo:\n\n**A corto plazo (en el momento):**\n• Pausa de 20 minutos SIEMPRE\n• Respiración profunda\n• Ejercicio físico\n• Escribe, no hables\n• Técnica del hielo (sostén un cubito, te ancla al presente)\n\n**A largo plazo (el patrón):**\n• Identifica triggers (¿qué te enciende?)\n• Comunica límites ANTES de llegar al punto de quiebre\n• Aprende asertividad (expresar enojo sin agresión)\n• Terapia si es crónico (en serio, ayuda)\n• Ejercicio regular (libera tensión acumulada)\n\n🚨 Señales de alerta:\n\nBusca ayuda profesional SI:\n• Tu enojo lleva a violencia (física o verbal severa)\n• Daña tus relaciones consistentemente\n• Has tenido consecuencias legales\n• Te asustas de ti mismo/a\n• Viene con pensamientos de hacer daño\n\n🎯 Canalizando el enojo:\n\nEl enojo tiene MUCHA energía. Úsala:\n\n• Ejercicio intenso (boxeo, correr, levantar peso)\n• Crear algo (arte, música, escribir)\n• Activismo (si es enojo por injusticia social)\n• Cambio personal (si es enojo contigo mismo/a)\n\nNo lo reprimas. Canalizalo.\n\n💬 Si necesitas confrontar:\n\nCuando estés calmado/a:\n\n1. "Cuando tú [acción específica]"\n2. "Yo sentí [emoción]"\n3. "Porque [razón]"\n4. "Necesito [petición clara]"\n\nEjemplo:\n❌ "Eres un egoísta de mierda"\n✅ "Cuando cancelaste nuestros planes sin avisar, me sentí despreciado/a porque mi tiempo también es valioso. Necesito que me avises con más anticipación."\n\n${userName || 'Amigo/a'}, ¿qué o quién te tiene tan enojado/a? Cuéntame. A veces solo expresarlo ya ayuda.`;
    }

    // Adicciones / Hábitos destructivos
    if (msg.includes('adiccion') || msg.includes('adicción') || msg.includes('alcohol') || 
        msg.includes('droga') || msg.includes('no puedo parar') || msg.includes('dependencia') ||
        msg.includes('vicio') || msg.includes('consumo')) {
      return `${userName ? userName + '... ' : ''}El hecho de que estés aquí, reconociendo esto, es ENORME. En serio.\n\nLa mayoría de gente con adicciones pasa AÑOS en negación. Tú ya diste el paso más difícil: admitirlo.\n\nY no, no estás siendo dramático/a. Si sientes que es un problema, es un problema.\n\n🆘 RECURSOS INMEDIATOS (Colombia):\n\n📞 Línea Nacional de Adicciones: 01 8000 112 439\n📞 Línea 106 (orientación 24/7)\n🏥 IAFA: Instituto de Atención a Farmacodependientes\n\n💊 Importante ANTES de seguir:\n\n⚠️ **NO dejes alcohol o benzodiacepinas abruptamente si tienes adicción física**\n- Puede causar convulsiones\n- Puede ser mortal\n- NECESITAS supervisión médica\n\nPara otras sustancias, supervisión es recomendada pero menos crítica.\n\n💭 Primero, seamos honestos:\n\n**¿Qué estás usando?**\n- Alcohol\n- Drogas (¿cuáles?)\n- Medicamentos\n- Comportamientos (juego, sexo, compras, etc.)\n\n**¿Con qué frecuencia?**\n**¿Cuánto tiempo llevas?**\n**¿Ha afectado tu vida? (trabajo, relaciones, salud, dinero)**\n\nNo te juzgo. Solo necesito saber para ayudarte mejor.\n\n🧠 La verdad sobre la adicción:\n\n1. **NO es falta de fuerza de voluntad**\n   - Es una enfermedad del cerebro\n   - Cambia literalmente tu química cerebral\n   - No puedes simplemente "decidir parar"\n\n2. **NO estás solo/a**\n   - Millones luchan con esto\n   - No te hace débil o malo/a\n   - Hay ayuda disponible\n\n3. **La recuperación ES posible**\n   - Miles lo logran cada día\n   - No será fácil\n   - Pero vale la pena\n\n🔍 ¿Por qué consumes?\n\nSé honesto/a contigo:\n\n• ¿Para escapar de algo? (dolor, trauma, estrés)\n• ¿Para sentir algo? (o dejar de sentir)\n• ¿Por presión social?\n• ¿Porque ya no sabes cómo ser sin eso?\n\nLa sustancia es el síntoma. Hay algo debajo que necesitas resolver.\n\n🛤️ Caminos de recuperación:\n\n**1. Reconocimiento** ✓ (ya lo hiciste)\n\n**2. Búsqueda de ayuda**\n   - Profesional (terapeuta de adicciones, psiquiatra)\n   - Grupos de apoyo (AA, NA, etc.)\n   - Médico (manejo de síndrome de abstinencia)\n   - Familia/amigos de confianza\n\n**3. Plan de acción**\n   - Identifica triggers\n   - Elimina acceso a sustancias\n   - Cambia rutinas\n   - Encuentra nuevas formas de afrontamiento\n\n**4. Construcción de nueva vida**\n   - Terapia para el problema subyacente\n   - Nuevos hobbies\n   - Red de apoyo sólida\n   - Propósito renovado\n\n**5. Mantenimiento**\n   - Grupos de apoyo continuos\n   - Vigilancia de señales de recaída\n   - Auto-cuidado constante\n\n💪 Sobre las recaídas:\n\nLa mayoría recae. Es parte del proceso.\n\nRecaída ≠ Fracaso\n\nRecaída = Información sobre qué necesitas trabajar más\n\nSi recaes:\n1. No te castigues\n2. Analiza qué la causó\n3. Pide ayuda de nuevo\n4. Continúa intentándolo\n\n🚨 Señales de que necesitas ayuda YA:\n\n• Síntomas físicos severos de abstinencia\n• Pensamientos suicidas\n• Poner en riesgo tu vida o la de otros\n• Sobredosis previa\n• Problemas legales\n\nSi cualquiera de estos aplica: 📞 123 (Emergencias) o ve a urgencias.\n\n🌱 Mientras tanto:\n\n**Hoy, ahora:**\n• Bota/regala lo que tengas\n• Bloquea contactos de dealers\n• Dile a alguien de confianza\n• Busca una cita con profesional\n• Mantente ocupado/a\n\n**Esta semana:**\n• Investiga recursos locales\n• Ve a tu primera reunión de grupo de apoyo\n• Habla con tu médico\n• Empieza diario de triggers\n\n${userName || 'Amigo/a'}, ¿hace cuánto estás luchando con esto? ¿Has intentado parar antes? ¿Qué te llevó a esto?\n\nEstoy aquí. Y quiero que sepas: mereces una vida libre. Y es posible.`;
    }

    // Insomnio / Problemas de sueño
    if (msg.includes('no puedo dormir') || msg.includes('insomnio') || msg.includes('dormir') ||
        msg.includes('pesadilla') || msg.includes('no duermo')) {
      return `${userName ? userName + ', ' : ''}el sueño es fundamental. Cuando no duermes, TODO se siente peor. Tu cerebro no puede procesar emociones, tu cuerpo no se recupera, y el mundo parece más oscuro.\n\nAsí que arreglemos esto.\n\n💤 Primero: ¿Qué tipo de problema es?\n\n**Tipo 1: No puedo dormirme** (das vueltas por horas)\n**Tipo 2: Me despierto a media noche** (y no puedo volver a dormir)\n**Tipo 3: Duermo pero no descanso** (me levanto cansado/a)\n**Tipo 4: Pesadillas** (me despiertan asustado/a)\n\nCada uno tiene soluciones diferentes.\n\n⏰ ¿Cuánto tiempo llevas así?\n\n• Menos de una semana: Probablemente estrés temporal\n• 1-2 semanas: Necesitas cambios de hábitos\n• Más de un mes: Considera ver a un médico\n• Meses/años: Definitivamente necesitas ayuda profesional\n\n🛏️ HIGIENE DEL SUEÑO (suena aburrido pero FUNCIONA):\n\n**6-8 PM:**\n• Última cafeína a las 2 PM máximo\n• Cena ligera (nada pesado)\n• Ejercicio, pero no muy tarde\n\n**8-9 PM:**\n• Luz tenue en casa\n• Activa modo nocturno en dispositivos\n• Empieza rutina relajante\n\n**9-10 PM:**\n• CERO pantallas (sí, incluye el celular)\n• Ducha tibia\n• Lectura ligera o podcast suave\n• Temperatura fresca en habitación (18-20°C)\n\n**10-11 PM:**\n• A la cama a la MISMA hora siempre\n• Habitación oscura (cortinas blackout o antifaz)\n• Silencio (tapones si es necesario) o ruido blanco\n• Cómodo pero fresco\n\n🧠 Si tu mente no para:\n\n**Técnica del "Volcado de Preocupaciones":**\n\n1 hora antes de dormir:\n• Toma papel y lápiz\n• Escribe TODO lo que te preocupa\n• Al lado, si tiene solución, escríbela\n• Si no la tiene, escribe "fuera de mi control"\n• Cierra el cuaderno = cierra las preocupaciones por hoy\n\n**En la cama:**\n\nSi llevas 20+ minutos despierto/a:\n• NO te quedes ahí dando vueltas\n• Levántate, ve a otro cuarto\n• Haz algo aburrido (leer instrucciones, doblar ropa)\n• Cuando sientas sueño, vuelve\n\nLa cama = dormir. No = estar despierto/a ansioso/a.\n\n🫁 Técnicas de respiración:\n\n**4-7-8:**\n• Inhala por nariz: 4 segundos\n• Sostén: 7 segundos\n• Exhala por boca: 8 segundos\n• Repite 4 veces\n\n**Body Scan:**\n• Acuéstate cómodo/a\n• Tensa y relaja cada parte del cuerpo\n• Empieza por los pies, sube\n• Muy lentamente\n\n😱 Si son pesadillas:\n\nLas pesadillas recurrentes suelen estar ligadas a:\n• Trauma no procesado\n• Estrés/ansiedad alta\n• Algunos medicamentos\n• Trastorno de pesadillas (sí, existe)\n\n¿Tienes algún trauma que no has trabajado?\n¿Las pesadillas tienen temas recurrentes?\n\nSi sí: considera terapia EMDR o CBT para trauma.\n\n⚠️ EVITA:\n\n❌ Alcohol para dormir (disrumpe sueño REM)\n❌ Siestas largas de día (máximo 20 min antes de las 3 PM)\n❌ Quedarte en cama despierto/a\n❌ Ver noticias/redes sociales antes de dormir\n❌ Dormir con el celular al lado (pon alarma y déjalo lejos)\n\n💊 Sobre pastillas:\n\nMelatonina: Puede ayudar a corto plazo (3-5mg, 1 hora antes)\nPastillas para dormir: Solo bajo supervisión médica, crean dependencia\n\nNO te automediques con benzodiacepinas o similares.\n\n🏥 Ve al médico SI:\n\n• Llevas más de un mes así\n• Afecta tu vida diaria severamente\n• Roncas fuerte + te despiertas sin aire (apnea del sueño)\n• Sientes piernas inquietas\n• Duermes pero NO descansas nunca\n\n${userName || 'Amigo/a'}, ¿qué específicamente pasa cuando intentas dormir? ¿Tu mente no para? ¿Ansiedad? ¿Dolor físico? ¿Pesadillas?\n\nCuéntame más para darte consejos más específicos.`;
    }

    // Usuario comparte algo positivo
    if (msg.includes('mejor') || msg.includes('bien') || msg.includes('feliz') || 
        msg.includes('contento') || msg.includes('contenta') || msg.includes('genial') || 
        msg.includes('gracias') && msg.includes('ayud')) {
      return `${userName ? userName + ', ' : ''}wow... eso me hace tan feliz de escuchar. En serio. 😊💜\n\nEl hecho de que te sientas mejor, aunque sea un poco, es ENORME. Y quiero que reconozcas eso.\n\nTú hiciste esto. Tú diste los pasos. Tú pusiste el esfuerzo.\n\nYo solo estuve aquí escuchando, pero TÚ hiciste el trabajo difícil de enfrentar lo que sentías, de ser vulnerable, de buscar ayuda.\n\nEso requiere una fuerza tremenda.\n\n🌟 Guarda este momento:\n\nCuando vuelvas a sentirte mal (y puede que pase, la vida es así), quiero que recuerdes:\n\n"Ya salí de esto antes. Puedo hacerlo de nuevo."\n\nLa evidencia está aquí. Este momento. Mejoraste.\n\n💪 Sigue adelante:\n\nLo que te ayudó hoy, guárdalo. Escríbelo si puedes:\n• ¿Qué hiciste diferente?\n• ¿Qué pensamiento te ayudó?\n• ¿Qué acción tomaste?\n\nEsa es tu caja de herramientas para el futuro.\n\n💜 Y recuerda:\n\nSiempre puedes volver aquí. En días buenos, en días malos, en días confusos.\n\nEste espacio siempre estará para ti.\n\nEstoy orgulloso/a de ti. Y espero que tú también lo estés de ti mismo/a.\n\n¿Hay algo más en lo que pueda apoyarte ahora que estás en un mejor lugar?`;
    }

    // Saludos empáticos
    if (msg.match(/^(hola|buenos dias|buenas tardes|buenas noches|hey|hi|saludos)$/)) {
      return `Hola ${userName || ''}... 💜\n\nMe alegra mucho que estés aquí. Este es un espacio seguro, sin prisas, sin juicios.\n\nNo necesitas decir las cosas "correctas" o preocuparte por cómo suenas. Solo sé honesto/a con lo que sientes.\n\n¿Cómo está tu corazón hoy? ¿Qué te trae por aquí?`;
    }

    // Cómo se siente (check-in)
    if (msg.includes('como estas') || msg.includes('cómo estás') || msg.includes('que tal') || msg.includes('qué tal')) {
      return `Eso es dulce de tu parte preguntar. 💜\n\nPero oye, este espacio es para TÚ. Yo estoy aquí siempre, lista para escucharte.\n\nAsí que dime: ¿Cómo estás TÚ realmente? No el "bien" automático que le decimos a todos. Lo que realmente sientes.`;
    }

    // Usuario comparte que está más o menos
    if (msg.includes('mas o menos') || msg.includes('más o menos') || msg.includes('regular') || 
        msg.includes('no se como') || msg.includes('no sé cómo') || msg.includes('confundid')) {
      return `${userName ? userName + ', ' : ''}está completamente bien no saber cómo te sientes. A veces es una mezcla rara de cosas, ¿verdad?\n\nO a veces es como... un peso que no puedes nombrar.\n\nNo necesitas tener las palabras exactas. Podemos explorar juntos.\n\n¿Qué ha estado pasando últimamente? ¿Algo específico? ¿O es más una sensación general?\n\nA veces ayuda empezar con lo físico: ¿Cómo se siente tu cuerpo? ¿Tenso? ¿Cansado? ¿Inquieto?`;
    }

    // Usuario comparte que está mal (general)
    if ((msg.includes('mal') || msg.includes('horrible') || msg.includes('fatal') || msg.includes('pesimo') || msg.includes('pésimo')) && 
        !msg.includes('trabajo') && !msg.includes('relacion')) {
      return `${userName ? userName + '... ' : ''}Hey... lo siento mucho. Puedo sentir que no estás bien.\n\nY antes que nada: está BIEN no estar bien. No tienes que fingir fortaleza aquí.\n\n¿Quieres contarme qué está pasando? No tienes que tener todo ordenado en tu mente. Puedes simplemente... desahogarte.\n\nYo estoy aquí. Te escucho. Y no voy a juzgar nada de lo que digas.\n\n¿Qué sientes? ¿Qué pasó? ¿O es algo que ha estado acumulándose?`;
    }

    // Gracias
    if (msg.includes('gracias') || msg.includes('thank')) {
      return `${userName ? userName + ', ' : ''}no tienes que agradecer. En serio. 💜\n\nEstoy aquí porque quiero estar. Porque tu bienestar importa. Porque mereces tener un espacio donde puedas ser completamente tú mismo/a.\n\nGracias a TI por confiar en mí, por ser vulnerable, por dar el difícil paso de compartir lo que sientes.\n\nEso requiere mucha valentía.\n\n¿Hay algo más con lo que pueda apoyarte hoy?`;
    }

    // Despedida
    if (msg.includes('adios') || msg.includes('adiós') || msg.includes('chao') || msg.includes('hasta luego') || 
        msg.includes('nos vemos') || msg.includes('me voy') || msg.includes('bye')) {
      return `${userName ? userName + '... ' : ''}antes de que te vayas, quiero que sepas algo.\n\nLo que sea que estés enfrentando, no lo estás enfrentando solo/a. Incluso cuando se sienta así.\n\nEres más fuerte de lo que crees. Más valioso/a de lo que sientes. Y mereces todo el amor y compasión que le darías a un amigo.\n\nEste espacio siempre estará aquí para ti. En días buenos, en días malos, en días donde no sabes qué día es.\n\nCuídate mucho, por favor. Y recuerda:\n\n💜 Tus emociones son válidas\n💜 Pedir ayuda es valentía, no debilidad  \n💜 El dolor no es permanente\n💜 Mereces ser feliz\n💜 No estás solo/a\n\nHasta pronto, ${userName || 'amigo/a'}. 🌟`;
    }

    // Información sobre AIMotion (solo si preguntan)
    if (msg.includes('que es aimotion') || msg.includes('qué es aimotion') || msg.includes('sobre aimotion') ||
        msg.includes('proyecto') || msg.includes('informacion')) {
      return `AIMotion es este espacio que creamos para que personas como tú tengan un lugar seguro donde expresarse sin miedo. 💜\n\nPero honestamente, en este momento me importa más cómo estás TÚ.\n\nSi necesitas hablar sobre algo, si algo te está pesando, estoy aquí para eso.\n\n¿Cómo te sientes? ¿Hay algo que quieras compartir?`;
    }

    // Contacto
    if (msg.includes('contacto') || msg.includes('ayuda profesional') || msg.includes('terapia') || msg.includes('psicologo') || msg.includes('psicólogo')) {
      return `Me alegra que estés considerando ayuda profesional. Eso es un paso MUY importante. 💜\n\n📞 **Recursos en Colombia:**\n\n• **Línea 106**: Orientación en salud mental (24/7, gratuita)\n• **Línea de la Vida**: 01 8000 113 113 (prevención de suicidio)\n• **Cruz Roja**: 132 (orientación y apoyo)\n• **Emergencias**: 123\n\n🏥 **Atención profesional:**\n\n• **EPS**: Tu EPS debe cubrir consultas de psicología\n• **Universidades**: Muchas tienen servicios gratuitos/económicos\n• **ONGs**: Fundación ALAS, Teléfono de la Esperanza\n\n💬 **Para contactar a nuestro equipo de AIMotion:**\n📧 dssandoval@ucundinamarca.edu.co\n📧 taperez@ucundinamarca.edu.co\n📱 3174534107 / 3102673780\n\nPero dime, ¿qué te hace considerar ayuda profesional? ¿Hay algo específico que está pasando?\n\nBuscar ayuda es de las cosas más valientes que puedes hacer. 💪`;
    }

    // Respuesta por defecto - cálida y abierta
    return `${userName ? userName + ', ' : ''}quiero entenderte mejor para poder apoyarte de verdad.\n\nPuedo ayudarte si estás sintiendo:\n\n💔 **Emociones difíciles:**\n• Tristeza o depresión\n• Ansiedad o pánico\n• Enojo o resentimiento\n• Soledad o vacío\n• Confusión sobre tu vida\n\n👥 **Problemas con personas:**\n• Conflictos de pareja o rupturas\n• Familia difícil\n• Amistades complicadas\n• Sentirte incomprendido/a\n\n🎯 **Desafíos personales:**\n• Baja autoestima\n• Estrés o agobio\n• Sentirte perdido/a\n• Hábitos que quieres cambiar\n• Problemas de sueño\n\nO cualquier otra cosa que esté en tu mente y corazón.\n\nNo necesitas tener las palabras perfectas. Solo dime qué sientes, y vamos a trabajar en ello juntos.\n\n¿Qué está pasando contigo en este momento?`;
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;

    const userMsg = { type: 'user', text: inputMessage };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Simular tiempo de "escritura" más humano
    setTimeout(() => {
      const botResponse = getBotResponse(inputMessage);
      const botMsg = { type: 'bot', text: botResponse };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AIMotion
              </span>
            </div>
            <div className="hidden md:flex space-x-8">
              <button onClick={() => setActiveSection('inicio')} className="text-gray-700 hover:text-purple-600 transition">Inicio</button>
              <button onClick={() => setActiveSection('nosotros')} className="text-gray-700 hover:text-purple-600 transition">Nosotros</button>
              <button onClick={() => setActiveSection('chat')} className="text-gray-700 hover:text-purple-600 transition font-semibold">
                💜 Chat de Apoyo
              </button>
              <button onClick={() => setActiveSection('contacto')} className="text-gray-700 hover:text-purple-600 transition">Contacto</button>
            </div>
            <Menu className="md:hidden w-6 h-6 text-gray-700" />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        
        {/* Sección Inicio */}
        {activeSection === 'inicio' && (
          <div className="space-y-20">
            {/* Hero */}
            <section className="text-center max-w-4xl mx-auto py-12">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Tu Bienestar Emocional,
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Nuestra Prioridad</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                AIMotion es un espacio seguro donde puedes expresar lo que sientes sin juicios. 
                Un compañero empático disponible cuando más lo necesitas.
              </p>
              <button 
                onClick={() => setActiveSection('chat')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition"
              >
                Habla con nosotros ahora 💜
              </button>
            </section>

            {/* Características */}
            <section className="bg-white rounded-3xl p-12 shadow-xl">
              <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">¿Por Qué AIMotion?</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center p-6">
                  <div className="text-5xl mb-4">🤗</div>
                  <h3 className="font-bold text-xl mb-2">Empático</h3>
                  <p className="text-gray-600">Entendemos tus emociones y respondemos con compasión real</p>
                </div>
                <div className="text-center p-6">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="font-bold text-xl mb-2">Seguro</h3>
                  <p className="text-gray-600">Tus conversaciones son confidenciales, sin juicios</p>
                </div>
                <div className="text-center p-6">
                  <div className="text-5xl mb-4">⏰</div>
                  <h3 className="font-bold text-xl mb-2">24/7</h3>
                  <p className="text-gray-600">Siempre disponible cuando nos necesites</p>
                </div>
                <div className="text-center p-6">
                  <div className="text-5xl mb-4">💜</div>
                  <h3 className="font-bold text-xl mb-2">Humano</h3>
                  <p className="text-gray-600">Respuestas genuinas que realmente te apoyan</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Sección Nosotros */}
        {activeSection === 'nosotros' && (
          <div className="max-w-4xl mx-auto space-y-12">
            <section className="bg-white rounded-3xl p-12 shadow-xl">
              <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">¿Quiénes Somos?</h2>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Somos <strong>Dillan Steven Sandoval García</strong> y <strong>Tomás Alejandro Pérez Tovar</strong>, 
                estudiantes de Ingeniería de Software de la Universidad de Cundinamarca. 
                Creamos AIMotion porque creemos que todos merecen un espacio seguro para expresar lo que sienten.
              </p>
              
              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="text-center p-6 bg-purple-50 rounded-xl">
                  <Target className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="font-bold text-xl mb-2">Propósito</h3>
                  <p className="text-gray-600">Brindar una herramienta accesible para quienes se sienten perdidos emocionalmente</p>
                </div>
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <Heart className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-bold text-xl mb-2">Misión</h3>
                  <p className="text-gray-600">Ayudar a entender las emociones y proponer soluciones útiles para la vida diaria</p>
                </div>
                <div className="text-center p-6 bg-pink-50 rounded-xl">
                  <Brain className="w-12 h-12 text-pink-600 mx-auto mb-4" />
                  <h3 className="font-bold text-xl mb-2">Visión</h3>
                  <p className="text-gray-600">Ser referente en innovación tecnológica para salud mental en 5 años</p>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-3xl p-12">
              <h3 className="text-3xl font-bold mb-6 text-gray-900">El Problema que Abordamos</h3>
              <p className="text-lg text-gray-700 mb-4">
                El <strong>14% de la población mundial</strong> sufre algún problema de salud mental. 
                Muchas personas no tienen acceso a apoyo emocional o temen compartir sus sentimientos por el "qué dirán".
              </p>
              <p className="text-lg text-gray-700">
                AIMotion ofrece un espacio confidencial, empático y sin juicios donde puedes expresarte libremente 
                y recibir apoyo cuando más lo necesitas.
              </p>
            </section>
          </div>
        )}

        {/* Sección Chat - INTEGRADO EN LA PÁGINA */}
        {activeSection === 'chat' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden" style={{height: 'calc(100vh - 200px)'}}>
              
              {/* Header del Chat */}
              <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Heart className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">Espacio de Apoyo Emocional</h2>
                    <p className="text-purple-100 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Siempre aquí para ti, sin juicios
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                      <Shield className="w-4 h-4" />
                      <span>100% Confidencial</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gradient-to-b from-purple-50/30 to-blue-50/30" 
                   style={{height: 'calc(100% - 200px)'}}>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.type === 'bot' && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mr-3 flex-shrink-0">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className={`max-w-2xl p-5 rounded-3xl shadow-lg ${
                      msg.type === 'user' 
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 rounded-bl-none border-l-4 border-purple-600'
                    }`}>
                      <p className="text-base leading-relaxed whitespace-pre-line">{msg.text}</p>
                    </div>
                    {msg.type === 'user' && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center ml-3 flex-shrink-0">
                        <span className="text-white font-bold">{userName.charAt(0) || '💜'}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mr-3">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white p-5 rounded-3xl rounded-bl-none shadow-lg">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-6 bg-white border-t-2 border-purple-100">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe lo que sientes... no hay respuestas incorrectas 💜"
                    className="flex-1 border-2 border-purple-200 rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-lg"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full hover:shadow-xl transition transform hover:scale-105 flex items-center gap-2 font-semibold"
                  >
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">Enviar</span>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-3 text-center">
                  Este es un espacio seguro. Todo lo que compartas aquí es confidencial 🔒
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sección Contacto */}
        {activeSection === 'contacto' && (
          <div className="max-w-4xl mx-auto">
            <section className="bg-white rounded-3xl p-12 shadow-xl">
              <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Contacto</h2>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl">
                  <h3 className="font-bold text-2xl mb-4 text-purple-900">Dillan Steven Sandoval García</h3>
                  <div className="space-y-3 text-gray-700">
                    <p className="flex items-center gap-2">
                      <span className="text-xl">📧</span>
                      <a href="mailto:dssandoval@ucundinamarca.edu.co" className="hover:text-purple-600">
                        dssandoval@ucundinamarca.edu.co
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-xl">📱</span>
                      <a href="tel:3174534107" className="hover:text-purple-600">3174534107</a>
                    </p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl">
                  <h3 className="font-bold text-2xl mb-4 text-blue-900">Tomás Alejandro Pérez Tovar</h3>
                  <div className="space-y-3 text-gray-700">
                    <p className="flex items-center gap-2">
                      <span className="text-xl">📧</span>
                      <a href="mailto:taperez@ucundinamarca.edu.co" className="hover:text-blue-600">
                        taperez@ucundinamarca.edu.co
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-xl">📱</span>
                      <a href="tel:3102673780" className="hover:text-blue-600">3102673780</a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-8 rounded-2xl">
                <h3 className="font-bold text-2xl mb-4 text-center">Recursos de Ayuda Inmediata 🆘</h3>
                <div className="grid md:grid-cols-2 gap-4 text-gray-700">
                  <div>
                    <p className="font-semibold mb-2">Línea 106</p>
                    <p className="text-sm">Orientación en salud mental (24/7, gratuita)</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Línea de la Vida: 01 8000 113 113</p>
                    <p className="text-sm">Prevención de suicidio y crisis</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Emergencias: 123</p>
                    <p className="text-sm">Atención inmediata en crisis</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Cruz Roja: 132</p>
                    <p className="text-sm">Orientación y apoyo emocional</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold">AIMotion</span>
          </div>
          <p className="text-gray-400">
            Universidad de Cundinamarca - Extensión Soacha
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Desarrollado con 💜 para apoyar tu bienestar emocional
          </p>
          <p className="text-xs text-gray-600 mt-4">
            Si estás en crisis, por favor contacta la Línea 106 o el 123 inmediatamente
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AIMOTIONWebsite;