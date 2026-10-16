// Puntuacion de escalas en el SERVIDOR (item 8). El cliente envia solo las
// respuestas; el total y la severidad se recalculan aqui, asi nadie puede
// "manipular su puntaje" ni inyectar una severidad arbitraria.
export const SCALE_LENGTH = { 'PHQ-9': 9, 'GAD-7': 7 };

export function scoreScale(type, answers) {
  const total = answers.reduce((a, b) => a + b, 0);
  let severity = 'mínima';
  if (type === 'PHQ-9') {
    if (total >= 20) severity = 'severa';
    else if (total >= 15) severity = 'moderadamente severa';
    else if (total >= 10) severity = 'moderada';
    else if (total >= 5) severity = 'leve';
  } else {
    if (total >= 15) severity = 'severa';
    else if (total >= 10) severity = 'moderada';
    else if (total >= 5) severity = 'leve';
  }
  return { total, severity };
}

/** Valida cantidad y rango de respuestas (0-3). */
export function validateAnswers(type, answers) {
  if (!(type in SCALE_LENGTH)) return 'Escala desconocida';
  if (answers.length !== SCALE_LENGTH[type]) return `${type} requiere exactamente ${SCALE_LENGTH[type]} respuestas`;
  if (answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) return 'Las respuestas deben ser enteros entre 0 y 3';
  return null;
}
