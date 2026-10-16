// Contexto de la base de datos (item 4, RLS). Cada consulta se ejecuta con un
// "rol de aplicacion" que las politicas RLS de Postgres usan para decidir que
// filas puede ver o modificar:
//   system        codigo interno de confianza (login, notificaciones, scripts)
//   anon          visitante sin cuenta (solo su propia sesion de chat)
//   patient       persona con cuenta (solo sus propias filas)
//   professional  profesional autenticado
export const systemCtx = () => ({ role: 'system' });
export const anonCtx = (sessionId) => ({ role: 'anon', sessionId: sessionId || '' });
export const patientCtx = (user) => ({ role: 'patient', userId: user.id });
export const professionalCtx = (professional) => ({ role: 'professional', userId: professional.id });
