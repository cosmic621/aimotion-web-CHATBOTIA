// Motor de reglas para deteccion de factores de riesgo criticos.
//
// IMPORTANTE (delimitacion clinica): este motor NO diagnostica ni clasifica
// un cuadro clinico. Su unica funcion es identificar senales textuales que
// ameritan interrumpir el flujo conversacional automatizado y escalar el
// caso a un profesional (protocolo Human-in-the-Loop). La severidad asignada
// es una heuristica de priorizacion, no un juicio clinico.
//
// Categorias:
//  - ideacion_suicida / planeacion_suicida (critico)
//  - autolesion (critico)
//  - violencia_hacia_terceros (critico)
//  - episodio_psicotico (alto)
//  - crisis_panico_severa (alto)
//
// Cada regla combina patrones de texto simples. Es deliberadamente
// transparente y auditable por el equipo clinico (co-diseñado con el
// psicologo como Subject Matter Expert), a diferencia de un modelo de caja
// negra, para que los umbrales puedan calibrarse con criterio profesional.

const RISK_RULES = [
  {
    category: 'planeacion_suicida',
    severity: 'critico',
    patterns: [
      /tengo (un )?plan (para|de) (matarme|suicidarme|quitarme la vida)/i,
      /(ya|hoy) (decidi|voy a) (matarme|suicidarme|quitarme la vida|acabar con mi vida)/i,
      /voy a (matarme|suicidarme|acabar con mi vida)/i,
      /me voy a (matar|suicidar)/i,
    ],
  },
  {
    category: 'ideacion_suicida',
    severity: 'critico',
    patterns: [
      /\bsuicid/i,
      /no quiero vivir/i,
      /quiero morir/i,
      /mejor(\s+estaria)?\s+muert[oa]/i,
      /no vale la pena (vivir|seguir)/i,
      /acabar con (mi vida|todo)/i,
      /quitarme la vida/i,
      /desaparecer para siempre/i,
    ],
  },
  {
    category: 'autolesion',
    severity: 'critico',
    patterns: [
      /me (corto|cortaba|cortare|lastimo|lastimaba|hago dano|hice dano)/i,
      /cortarme/i,
      /lastimarme (a mi mism[oa])?/i,
      /autolesion/i,
      /quemarme (a mi mism[oa])?/i,
    ],
  },
  {
    category: 'violencia_hacia_terceros',
    severity: 'critico',
    patterns: [
      /voy a (matar|lastimar|hacerle dano) a/i,
      /quiero (matar|lastimar|hacerle dano) a/i,
      /tengo (un arma|una pistola|un cuchillo) y (quiero|voy a)/i,
    ],
  },
  {
    category: 'episodio_psicotico',
    severity: 'alto',
    patterns: [
      /escucho voces que (nadie mas oye|no existen)/i,
      /veo cosas que no existen/i,
      /(alguien|ellos) (controla|controlan) mi mente/i,
      /creo que me (persiguen|vigilan) (todo el tiempo|siempre)/i,
    ],
  },
  {
    category: 'crisis_panico_severa',
    severity: 'alto',
    patterns: [
      /(siento que|creo que) me (muero|voy a morir)/i,
      /no puedo respirar.*(me muero|voy a morir)/i,
      /ataque de panico (fuerte|severo|muy fuerte)/i,
    ],
  },
];

/**
 * Analiza un texto libre y devuelve la senal de riesgo mas severa
 * encontrada, o null si no se detecto ninguna.
 * @param {string} text
 * @returns {{category: string, severity: 'critico'|'alto', matchedRule: true}|null}
 */
export function analyzeTextRisk(text) {
  const normalized = (text || '').toLowerCase();
  const severityRank = { critico: 2, alto: 1, moderado: 0 };

  let best = null;
  for (const rule of RISK_RULES) {
    const hit = rule.patterns.some((re) => re.test(normalized));
    if (hit) {
      if (!best || severityRank[rule.severity] > severityRank[best.severity]) {
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
};
