// Motor de reglas para deteccion de factores de riesgo criticos.
//
// IMPORTANTE (delimitacion clinica): este motor NO diagnostica ni clasifica
// un cuadro clinico. Su unica funcion es identificar senales textuales que
// ameritan interrumpir el flujo conversacional automatizado y escalar el
// caso a un profesional (protocolo Human-in-the-Loop). La severidad asignada
// es una heuristica de priorizacion, no un juicio clinico.
//
// Severidades:
//  - critico: se pausa el chat automatico, se muestran lineas de emergencia,
//    se avisa al profesional y, si la persona tiene cuenta con contacto de
//    emergencia y consentimiento, se envia un SMS breve a ese contacto.
//  - alto: la conversacion continua, pero se registra y se avisa al profesional.
//
// El texto se NORMALIZA antes de comparar (sin tildes, sin enie, sin signos),
// por eso los patrones se escriben sin tildes: "dano" cubre "daño"/"DAÑO".
//
// Las reglas son deliberadamente transparentes y auditables por el equipo
// clinico (para calibrarlas con el psicologo como experto tematico), a
// diferencia de un modelo de caja negra. Ante la duda se prefiere un falso
// positivo (revisar de mas) a un falso negativo (no ver una crisis).

import { normalize } from './textUtils.js';

const SELF = '(suicidarme|matarme|quitarme la vida|acabar con mi vida|terminar con mi vida|morirme|quitarme del medio)';

const RISK_RULES = [
  {
    category: 'planeacion_suicida',
    severity: 'critico',
    patterns: [
      /tengo (un |el )?(plan|metodo|forma|manera) (para|de) (matarme|suicidarme|quitarme la vida|acabar con mi vida)/,
      /(ya )?(decidi|elegi) (matarme|suicidarme|quitarme la vida|acabar con mi vida)/,
      /(voy a|ire a|esta noche voy a|hoy voy a) (matarme|suicidarme|quitarme la vida|acabar con mi vida|terminar con mi vida)/,
      /me voy a (matar|suicidar|quitar la vida)/,
      /ya (tengo|prepare|compre|escribi) (las pastillas|la cuerda|el arma|una carta|la nota|todo para)/,
      /(carta|nota) de despedida/,
      /(intente|intento) (suicidarme|matarme|quitarme la vida)/,
    ],
  },
  {
    category: 'ideacion_suicida',
    severity: 'critico',
    patterns: [
      new RegExp(`(quiero|queria|quisiera|pienso en|pensando en|penso en|pense en|he pensado en|tengo ganas de|me dan ganas de|ganas de) ${SELF}`),
      /me (quiero|quisiera|queria|gustaria|podria) (suicidar|matar|morir)/,
      /(quiero|queria|quisiera|prefiero|preferiria) (estar )?(morir|muert[oa])/,
      /no quiero (seguir )?(viviendo|vivir)(?! (en|con|aqui|alla|alli|lejos|solo|sola|donde|asi como|de esa|de esta))/,
      /ya no quiero (seguir )?(viviendo|vivir|existir|estar vivo|estar viva)/,
      /(quisiera|ojala) no (despertar|despertarme|existir|haber nacido)/,
      /mejor(\s+estaria)?\s+muert[oa]/,
      /(seria|estaria) mejor (si )?(no estuviera|no existiera|estuviera muert[oa]|me muriera|sin mi)/,
      /todos estarian mejor sin mi/,
      /no vale la pena (vivir|seguir viviendo|seguir con vida)/,
      /acabar con (mi vida|todo esto de una vez)/,
      /quitarme la vida/,
      /desaparecer para siempre/,
      /ya no (le )?veo (sentido|razon) (a )?(vivir|seguir viviendo|mi vida)/,
    ],
  },
  {
    category: 'autolesion',
    severity: 'critico',
    patterns: [
      /me (corto|corte|cortaba|cortare|cortaria)(?! (el|la|las|los) (pelo|cabello|unas|flequillo|barba|bigote|uñas))/,
      /(quiero|quisiera|voy a|tengo ganas de|ganas de) (cortarme|lastimarme|hacerme dano|quemarme|golpearme|autolesionarme)/,
      /me (hago|hice|hacia|estoy haciendo|he estado haciendo) dano/,
      /me (lastimo|lastimaba|lastime|golpeo contra|pego a proposito)/,
      /autolesion|auto lesion|autolesiono/,
      /me (quemo|quemaba|queme) (a proposito|la piel|el brazo|las piernas|con cigarr)/,
      /(cortes|heridas) (en|de) (mis |los |las )?(brazos|muñecas|munecas|piernas|muslos) (que|porque|para) me (hice|hago)/,
    ],
  },
  {
    category: 'violencia_hacia_terceros',
    severity: 'critico',
    patterns: [
      /(voy a|quiero|tengo ganas de|me dan ganas de) (matar|lastimar|golpear|apunalar|hacerle dano|hacerles dano|vengarme)( a| de)? /,
      /tengo (un arma|una pistola|un cuchillo|un machete) y (quiero|voy a)/,
      /(voy a|quiero) (matar|hacerle dano) a (mi|el|la|los|las|ese|esa)/,
    ],
  },
  {
    category: 'episodio_psicotico',
    severity: 'alto',
    patterns: [
      /(escucho|oigo|me hablan|oi) (unas |las |esas )?voces/,
      /voces que (nadie mas oye|no existen|me dicen|me ordenan|me mandan)/,
      /veo (cosas|personas|sombras|figuras|gente) que (no existen|no estan|nadie mas ve|los demas no ven)/,
      /(alguien|ellos|el gobierno|la tele|la television|el celular) (controla|controlan|manipula|manipulan|me habla|me hablan) (mi mente|mis pensamientos|a traves)/,
      /(me persiguen|me vigilan|me espian|me siguen|me graban) (todo el tiempo|siempre|todos los dias|a todas partes)/,
      /(leen|lee|roban|ponen) (mi mente|mis pensamientos|ideas en mi cabeza)/,
      /me (quieren|van a|intentan) (envenenar|matar|hacer dano|secuestrar)(?! de risa)/,
      /(mensajes|senales) (secretos|ocultos|especiales) (para mi|dirigidos a mi)/,
      /(creo|siento) que soy (dios|el elegido|la elegida|un profeta)/,
    ],
  },
  {
    category: 'crisis_panico_severa',
    severity: 'alto',
    patterns: [
      /(siento que|creo que|siento como si) me (muero|voy a morir)(?! (de|por) (risa|hambre|sueno|verguenza|calor|frio|ganas|aburrimiento|pena|envidia|miedo de que))/,
      /no puedo respirar.*(me muero|voy a morir|me ahogo)/,
      /ataque de panico (fuerte|severo|muy fuerte|que no para)/,
      /(creo|siento) que (me da|voy a tener|estoy teniendo) un (infarto|paro)/,
    ],
  },
  {
    category: 'desesperanza',
    severity: 'alto',
    patterns: [
      /(quiero|quisiera) desaparecer/,
      /ya no (aguanto|soporto|puedo) mas (con mi vida|con todo|asi|esto)/,
      /ya no quiero seguir(?! (con|en|estudiando|trabajando|hablando|leyendo|jugando))/,
      /no hay (salida|esperanza|solucion para mi)/,
      /no le veo (sentido|salida)/,
      /ya nada (importa|tiene sentido)/,
      /soy una carga (para|de) (todos|mi familia|mis papas|los demas)/,
      /nadie (me va a|me)(extranaria| extranaria| echaria de menos)/,
      /estoy harto de (vivir|todo|mi vida)/,
    ],
  },
  {
    // Mencion generica de suicidio (informativa o sobre otra persona): no es
    // primera persona, por eso es "alto" y no "critico" (no se avisa al
    // contacto de emergencia del usuario por algo que dice de un tercero).
    category: 'ideacion_suicida',
    severity: 'alto',
    patterns: [/suicid/, /quitarse la vida/, /se quiere (matar|morir)/, /se quito la vida/],
  },
];

const SEVERITY_RANK = { critico: 2, alto: 1, moderado: 0 };

/**
 * Analiza un texto libre y devuelve la senal de riesgo mas severa
 * encontrada, o null si no se detecto ninguna.
 * @param {string} text
 * @returns {{category: string, severity: 'critico'|'alto'}|null}
 */
export function analyzeTextRisk(text) {
  const normalized = normalize(text);
  if (!normalized) return null;

  let best = null;
  for (const rule of RISK_RULES) {
    if (rule.patterns.some((re) => re.test(normalized))) {
      if (!best || SEVERITY_RANK[rule.severity] > SEVERITY_RANK[best.severity]) {
        best = { category: rule.category, severity: rule.severity };
      }
    }
  }
  return best;
}

/**
 * Regla clinica estandar: el item 9 del PHQ-9 ("pensamientos de que
 * estaria mejor muerto/a o de hacerse dano") positivo (>0) exige
 * seguimiento sin importar el puntaje total de la escala.
 */
export function checkPHQ9Item9(answers) {
  const item9 = answers?.[8]; // indice 8 = pregunta 9
  if (typeof item9 === 'number' && item9 > 0) {
    return { category: 'ideacion_suicida', severity: 'critico' };
  }
  return null;
}

export const RISK_CATEGORY_LABELS = {
  ideacion_suicida: 'Ideación suicida',
  planeacion_suicida: 'Planeación suicida',
  autolesion: 'Autolesión',
  violencia_hacia_terceros: 'Riesgo de violencia hacia terceros',
  episodio_psicotico: 'Posible episodio psicótico',
  crisis_panico_severa: 'Crisis de pánico severa',
  desesperanza: 'Desesperanza / malestar intenso',
};
