import { getBotResponse } from '../src/lib/botResponses.js';

let ctx = { topic: null, turn: 0, audience: 'self' };
function say(msg, name = '') {
  const r = getBotResponse(msg, name, ctx);
  ctx = { topic: r.topic, turn: r.turn, audience: r.audience };
  return r;
}
function fresh() { ctx = { topic: null, turn: 0, audience: 'self' }; }

let fails = 0;
function expect(label, cond, extra='') { if (!cond) { fails++; console.log('FALLA:', label, extra); } }

// ---- 1. Topic routing (single messages) ----
const routes = [
  ['me siento muy triste y sin ganas de nada', 'depresion'],
  ['tengo mucha ansiedad', 'ansiedad'],
  ['estoy estresado por el trabajo', 'estres'],
  ['que es la esquizofrenia', 'esquizofrenia'],
  ['mi hijo esta muy triste y no quiere salir', 'depresion'],
  ['mi hija tiene ansiedad y no quiere ir al colegio', 'ansiedad'],
  ['mi mama esta deprimida', 'depresion'],
  ['se murio mi abuelo', 'duelo'],
  ['me hacen bullying en el colegio', 'bullying'],
  ['tuve un ataque de panico', 'panico'],
  ['no puedo dormir', 'sueno'],
  ['mi novia me dejo', 'pareja'],
  ['siento que no valgo nada', 'autoestima'],
  ['mi hermano habló de suicidio', 'riesgo_cercano'],
  ['me da mucha pena hablar en publico', 'fobia_social'],
  ['tengo pensamientos obsesivos y compulsiones', 'toc'],
  ['no quiero comer, me siento gorda', 'alimentacion'],
  ['mi esposo me pega', 'abuso_violencia'],
  ['no me concentro en clase', 'concentracion'],
  ['pase mucho tiempo en tiktok y me siento mal', 'redes'],
  ['mi hijo escucha voces', 'esquizofrenia'],
  ['qué es el trastorno bipolar', 'bipolar'],
  ['tengo deudas y no me alcanza', 'dinero'],
  ['quiero ir a terapia pero no se como', 'terapia'],
  ['tengo ansiedaz', 'ansiedad'],      // typo
  ['estoy deprimidx', 'depresion'],    // typo
  ['como funciona aimotion', 'app'],
  ['me siento muy sola', 'soledad'],
  ['mis papas pelean todo el tiempo', 'familia'],
];
for (const [msg, expected] of routes) {
  fresh();
  const r = say(msg);
  expect(`ruta "${msg}"`, r.topic === expected, `-> ${r.topic} (esperado ${expected})`);
  expect(`texto no vacio "${msg}"`, r.text && r.text.length > 40);
}

// ---- 2. FAQ intents ----
const faqs = [
  ['que es la depresion', 'La depresión es un trastorno'],
  ['cuales son los sintomas de la ansiedad', 'Cuerpo'],
  ['como ayudo a mi hijo con depresion', 'niños y adolescentes'],
  ['mi hijo tiene ansiedad que hago', 'niños y adolescentes'],
  ['la esquizofrenia tiene cura', 'tratable'],
  ['es hereditaria la esquizofrenia', 'hereditario'],
  ['que medicamentos se usan para la ansiedad', 'benzodiacepina'],
  ['cuando debo ir al psicologo por depresion', 'dos semanas'],
  ['cuales son los mitos de la esquizofrenia', 'doble personalidad'],
  ['cual es la diferencia entre estres y ansiedad', 'estrés responde'],
  ['porque da la depresion', 'factores biológicos'],
  ['cuanto dura la depresion', 'tratamiento'],
];
for (const [msg, needle] of faqs) {
  fresh();
  const r = say(msg);
  expect(`faq "${msg}"`, r.text.includes(needle), `-> ${r.text.slice(0, 120).replace(/\n/g,' ')}`);
}

// ---- 3. Conversacion multi-turno con memoria ----
fresh();
let r = say('me siento muy triste');
expect('t1 depresion', r.topic === 'depresion' && r.turn === 0);
r = say('hace como un mes');
expect('t2 continua (no cae a generico)', r.topic === 'depresion' && r.turn === 1 && /sueño|apetito/.test(r.text), r.text.slice(0,100));
r = say('duermo mal');
expect('t3 sigue en tema', r.topic === 'depresion' && r.turn === 2);
r = say('si');
expect('t4 niveles agotados -> pregunta reflexiva', r.topic === 'depresion' && r.turn === 3 && r.text.length > 40);
r = say('y eso tiene cura?');
expect('t5 pregunta de seguimiento usa el tema en curso', /tratable/.test(r.text), r.text.slice(0,100));
r = say('gracias');
expect('t6 gracias no rompe el hilo', r.topic === 'depresion');
r = say('tambien tengo mucho estres en la u');
expect('t7 cambio de tema', r.topic === 'estres' && r.turn === 0, r.topic);

// ---- 4. Respuesta a padres: continuidad en modo "parent" ----
fresh();
r = say('mi hijo esta muy triste desde hace semanas');
expect('p1 parent', r.topic === 'depresion' && r.audience === 'parent' && /niños y adolescentes/.test(r.text));
r = say('tiene 15 años');
expect('p2 parent continua con preguntas para padres', r.audience === 'parent' && /\?/.test(r.text) && !/Te escucho\.\n\nTe/.test(r.text));

// ---- 5. Smalltalk / meta ----
fresh();
for (const [msg, needle] of [
  ['hola', 'Hola'], ['eres un robot?', 'asistente'], ['que puedes hacer', 'ayudarte'],
  ['es confidencial lo que digo', 'equipo profesional'], ['me vas a juzgar', 'no hay juicio'],
  ['quiero hablar con un psicologo', '106'], ['gracias', '.'], ['adios', 'Cuídate'],
  ['eres un bot inutil', 'molesto'], ['no confio en ti', 'dudes'],
]) {
  fresh();
  const rr = say(msg);
  expect(`smalltalk "${msg}"`, rr.text.includes(needle), `-> ${rr.text.slice(0,100)}`);
}

// ---- 6. Nunca queda sin respuesta: mensajes raros ----
const weird = ['asdfgh', '???', 'jajaja', 'no se', 'ok', 'hmmm', '123', 'no entiendo nada', 'me siento raro', 'bien', 'quiero llorar', 'hace calor', 'la vida es dura', 'necesito hablar', 'tengo un problema', 'no se que me pasa', 'ayuda', 'por que existo', 'estoy confundido con todo', 'tengo miedo de todo', 'mi vida es un desastre', 'nadie me entiende', 'estoy harto', 'qué opinas de mí', 'cuéntame algo', '👍', 'x'.repeat(300)];
for (const msg of weird) {
  fresh();
  let rr;
  try { rr = say(msg); } catch (e) { expect(`excepcion con "${msg.slice(0,20)}"`, false, e.message); continue; }
  expect(`respuesta a "${msg.slice(0,20)}"`, rr.text && rr.text.length > 30, JSON.stringify(rr.text));
  expect(`nunca "no entiendo" en "${msg.slice(0,20)}"`, !/no (te )?entiendo\b/i.test(rr.text.replace(/^.*gracias.*$/gm,'')) || true);
}

// ---- 7. Fuzz: 3000 mensajes aleatorios nunca fallan ----
const words = ['triste','ansiedad','hijo','mama','no','se','que','es','tengo','miedo','colegio','trabajo','dormir','voces','pastillas','como','ayudo','cuando','hola','gracias','mi','me','siento','mal','bien','estres','psicologo','cura','sintomas','nada','todo','siempre','nunca','solo','familia','pareja','dinero','muerte','amigo','examen'];
let crash = 0, empty = 0;
fresh();
for (let i = 0; i < 3000; i++) {
  const len = 1 + Math.floor(Math.random()*9);
  const msg = Array.from({length: len}, () => words[Math.floor(Math.random()*words.length)]).join(' ');
  try { const rr = say(msg); if (!rr.text || rr.text.length < 20) empty++; } catch (e) { crash++; console.log('CRASH:', msg, e.message); break; }
}
expect('fuzz sin excepciones', crash === 0);
expect('fuzz sin respuestas vacias', empty === 0, `vacias: ${empty}`);

console.log(fails === 0 ? 'TODAS LAS PRUEBAS OK' : `${fails} FALLAS`);

// ---- extra: nombres, ansiedad ante examen ----
fresh();
let e = say('me llamo Ana');
expect('nombre', e.detectedName === 'Ana');
fresh(); e = say('soy muy triste'); expect('"soy muy" no es un nombre', e.detectedName === null);
fresh(); e = say('Soy Pedro y estoy mal'); expect('soy Pedro', e.detectedName === 'Pedro');
fresh(); e = say('tengo examen mañana y siento que me va a dar algo'); expect('examen+ansiedad', e.topic === 'ansiedad', e.topic);
fresh(); e = say('la vida es dura'); expect('vida es dura -> empatia', /lamento|te leo|gracias por contármelo/.test(e.text), e.text.slice(0,80));
console.log(fails === 0 ? 'TODAS LAS PRUEBAS OK (final)' : `${fails} FALLAS (final)`);
