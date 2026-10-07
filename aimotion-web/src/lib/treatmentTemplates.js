// Plantillas de referencia para que el PROFESIONAL arme un plan semanal.
//
// IMPORTANTE: estas plantillas son genericas y psicoeducativas, basadas en
// el enfoque de la OMS (fases tipicas de intervencion: psicoeducacion,
// tecnicas de regulacion, prevencion de recaida, seguimiento). NO son un
// plan clinico personalizado ni una prescripcion. El profesional debe
// revisarlas, adaptarlas o reescribirlas por completo segun el caso antes
// de asignarlas — el sistema no permite asignar un plan sin que un
// profesional autenticado lo cree (ver treatmentPlans.js en el backend).

export const TREATMENT_TEMPLATES = {
  depresion: {
    title: 'Plan de acompañamiento — Depresión (plantilla general)',
    weeks: [
      { week_number: 1, title: 'Entender qué está pasando', description: 'Psicoeducación sobre depresión: qué es, qué no es, y por qué no es "falta de voluntad". Establecer una rutina básica de sueño y alimentación.' },
      { week_number: 2, title: 'Activación conductual', description: 'Reintroducir, poco a poco, actividades que antes daban algo de disfrute o sentido, aunque al inicio no se sientan placenteras.' },
      { week_number: 3, title: 'Pensamientos y autocrítica', description: 'Identificar patrones de autocrítica excesiva y practicar nombrarlos sin necesariamente creerlos.' },
      { week_number: 4, title: 'Revisión y siguientes pasos', description: 'Revisar avances con el profesional, ajustar el plan, y decidir continuidad del tratamiento (terapia, y si aplica, valoración médica).' },
    ],
  },
  ansiedad: {
    title: 'Plan de acompañamiento — Ansiedad (plantilla general)',
    weeks: [
      { week_number: 1, title: 'Entender la ansiedad', description: 'Psicoeducación: qué es la respuesta de ansiedad, por qué el cuerpo reacciona así, diferencia entre ansiedad adaptativa y excesiva.' },
      { week_number: 2, title: 'Regulación del cuerpo', description: 'Práctica diaria de respiración diafragmática y técnicas de anclaje (grounding) ante picos de ansiedad.' },
      { week_number: 3, title: 'Identificar disparadores', description: 'Llevar registro de qué situaciones disparan la ansiedad y con qué intensidad, para trabajarlo con el profesional.' },
      { week_number: 4, title: 'Exposición gradual y revisión', description: 'Si aplica, iniciar exposición gradual guiada a situaciones evitadas. Revisar progreso con el profesional.' },
    ],
  },
  estres: {
    title: 'Plan de acompañamiento — Estrés (plantilla general)',
    weeks: [
      { week_number: 1, title: 'Mapear las fuentes de estrés', description: 'Identificar qué situaciones generan más carga, y diferenciar lo que se puede controlar de lo que no.' },
      { week_number: 2, title: 'Pausas y límites', description: 'Incorporar pausas activas durante el día y practicar decir que no a sobrecarga evitable.' },
      { week_number: 3, title: 'Recuperación del cuerpo', description: 'Priorizar sueño y actividad física breve; notar señales físicas de estrés acumulado.' },
      { week_number: 4, title: 'Revisión y sostenibilidad', description: 'Revisar qué cambios se mantuvieron y cuáles no, y ajustar para que sean sostenibles a largo plazo.' },
    ],
  },
  esquizofrenia: {
    title: 'Plan de acompañamiento — Esquizofrenia (plantilla general)',
    weeks: [
      { week_number: 1, title: 'Psicoeducación y adherencia', description: 'Información sobre la condición para la persona y su familia; reforzar la importancia de la continuidad del tratamiento psiquiátrico.' },
      { week_number: 2, title: 'Red de apoyo', description: 'Fortalecer la red de apoyo familiar/social; identificar a quién acudir ante señales de alerta tempranas.' },
      { week_number: 3, title: 'Rutina y funcionamiento diario', description: 'Trabajar rutinas simples que sostengan el funcionamiento diario (sueño, actividades básicas, contacto social).' },
      { week_number: 4, title: 'Seguimiento con el equipo clínico', description: 'Revisión conjunta con psiquiatría/psicología; ajuste del plan según evolución. Este plan NUNCA reemplaza el seguimiento psiquiátrico.' },
    ],
  },
};
