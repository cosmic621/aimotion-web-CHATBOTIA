// Escalas de tamizaje estandarizadas.
//
// DELIMITACION CLINICA: estos instrumentos son de autoaplicacion y
// tamizaje (screening), no son herramientas diagnosticas. Un puntaje
// elevado indica la conveniencia de una evaluacion clinica completa por
// un profesional; nunca constituye, por si mismo, un diagnostico.
// Referencia de criterios: Kroenke & Spitzer (PHQ-9), Spitzer et al. (GAD-7).

export const RESPONSE_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'Varios días' },
  { value: 2, label: 'Más de la mitad de los días' },
  { value: 3, label: 'Casi todos los días' },
];

export const PHQ9_QUESTIONS = [
  'Poco interés o placer en hacer cosas',
  'Se ha sentido decaído(a), deprimido(a) o sin esperanza',
  'Dificultad para dormir o dormir demasiado',
  'Sensación de cansancio o poca energía',
  'Poco apetito o comer en exceso',
  'Sentirse mal consigo mismo(a), o sentir que es un fracaso, o que se ha fallado a sí mismo(a) o a su familia',
  'Dificultad para concentrarse en cosas, como leer el periódico o ver televisión',
  'Moverse o hablar tan lento que otras personas lo han notado, o lo contrario: estar tan inquieto(a) que se mueve mucho más de lo habitual',
  'Pensamientos de que estaría mejor muerto(a) o de hacerse daño de alguna forma',
];

export const GAD7_QUESTIONS = [
  'Sentirse nervioso(a), ansioso(a) o con los nervios de punta',
  'No poder dejar de preocuparse o controlar la preocupación',
  'Preocuparse demasiado por diferentes cosas',
  'Dificultad para relajarse',
  'Estar tan inquieto(a) que es difícil quedarse quieto(a)',
  'Molestarse o irritarse fácilmente',
  'Sentir miedo, como si algo terrible fuera a pasar',
];

export function scorePHQ9(answers) {
  const total = answers.reduce((sum, v) => sum + (Number(v) || 0), 0);
  let severity = 'mínima';
  if (total >= 20) severity = 'severa';
  else if (total >= 15) severity = 'moderadamente severa';
  else if (total >= 10) severity = 'moderada';
  else if (total >= 5) severity = 'leve';
  return { total, severity };
}

export function scoreGAD7(answers) {
  const total = answers.reduce((sum, v) => sum + (Number(v) || 0), 0);
  let severity = 'mínima';
  if (total >= 15) severity = 'severa';
  else if (total >= 10) severity = 'moderada';
  else if (total >= 5) severity = 'leve';
  return { total, severity };
}
