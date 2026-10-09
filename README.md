# AIMotion — Plataforma de tamizaje y apoyo en salud mental (prototipo de grado)

AIMotion es un **prototipo académico** de una plataforma web de primer contacto e información sobre
**depresión, ansiedad, estrés y esquizofrenia**, pensada también para **padres y familias**. Combina un
asistente conversacional de apoyo, cuestionarios de tamizaje estandarizados (PHQ-9 / GAD-7), un motor de
alertas de riesgo y un panel para el profesional, bajo un modelo **Human-in-the-Loop**.

> **Delimitación clínica.** El sistema **no diagnostica, no prescribe ni realiza psicoterapia autónoma.**
> Es una herramienta de apoyo y tamizaje: todo resultado, alerta y plan es revisado o creado por un
> profesional. No es un servicio de emergencias.

---

## 1. Contenido de este repositorio

```
aimotion-web/      Frontend  — React 19 + Vite 7 + Tailwind CSS v4 + Socket.IO client
aimotion-server/   Backend   — Node + Express + PostgreSQL + JWT + Socket.IO
```

## 2. Mapa del alcance de la tesis → implementación

| Requisito del alcance | Estado | Dónde |
|---|---|---|
| Prototipo (no sistema "implementado/validado") | ✅ | Copy de la interfaz y este README |
| Tamizaje estandarizado (PHQ-9, GAD-7) con puntuación y severidad | ✅ | `aimotion-web/src/lib/scales.js`, `components/Screening/` |
| Motor de reglas de detección de riesgo (suicidio, autolesión, violencia, psicosis, pánico severo, desesperanza) | ✅ | `aimotion-web/src/lib/riskEngine.js` |
| Protocolo de escalamiento (pausa el chat automático, líneas de emergencia, alerta al profesional) | ✅ | `components/Chat/RiskBanner.jsx`, `aimotion-server/src/routes/alerts.js` |
| Notificación inmediata al profesional (email, SMS opcional, panel en vivo) | ✅ | `services/emailService.js`, `smsService.js`, Socket.IO |
| Aviso al contacto de emergencia por SMS (con consentimiento, sin Twilio) | ✅ | `services/contactSmsService.js` |
| Chatbot delimitado (apoyo + psicoeducación, nunca diagnostica) | ✅ | `src/lib/botResponses.js`, `botKnowledge*.js` |
| Human-in-the-Loop real (alertas `pendiente` hasta revisión; planes creados solo por profesionales) | ✅ | `alerts.js`, `treatmentPlans.js` |
| Trazabilidad del uso del chatbot por usuario | ✅ | tabla `chat_messages`, pestaña "Usuarios y planes" |
| Plan de seguimiento semanal por trastorno (autoría profesional) | ✅ | `treatment_plans`, `components/TreatmentPlan/`, `components/Professional/UsersPanel.jsx` |
| Registro de **diario de síntomas** entre sesiones | ⏳ Pendiente | ver roadmap §10 |
| **Anamnesis estructurada** (criterios DSM-5-TR / CIE-11) y formulación de caso | ⏳ Parcial (solo tamizajes) | ver roadmap §10 |
| Validación con juicio de expertos / usabilidad | ⏳ Pendiente (el sistema ya expone lo necesario) | ver roadmap §10 |

## 3. Funcionalidades

- **Asistente de apoyo** (sin IA externa, sin costo): ~50 temas, entiende preguntas concretas
  (qué es, síntomas, causas, tratamiento, medicación, cuándo consultar, mitos, cómo ayudar a un hijo/a),
  tolera errores de tipeo, recuerda el hilo de la conversación y siempre responde. Contenido basado en las
  notas descriptivas de la OMS (CIE-11). Sobre medicación solo da información general.
- **Tamizaje** PHQ-9 y GAD-7 con puntuación, aviso de preguntas faltantes y envío al profesional. El ítem 9 del
  PHQ-9 positivo dispara el protocolo de riesgo aunque el servidor esté caído.
- **Cuentas de usuario (opcionales)**: guardan el historial del chat y permiten el seguimiento. Al registrarse se
  pide un **contacto de emergencia** con **consentimiento explícito**.
- **Aviso al contacto de emergencia**: ante riesgo **crítico**, SMS breve (sin contenido de la conversación),
  máximo uno cada 6 h por cuenta, usando un celular Android como pasarela (ver `aimotion-server/README.md`).
- **Panel profesional** (login real, JWT): alertas en **tiempo real** (WebSockets), tamizajes, historial de chat
  por usuario, y creación de **planes semanales** a partir de plantillas editables basadas en la OMS.
- **Mi Progreso**: la persona ve su plan semanal, marca avance y gestiona su contacto de emergencia.
- **Landing orientada a familias**: especialización en las 4 condiciones y guía para padres.

## 4. Arquitectura

```
Navegador (React) ──HTTP/JSON──► Express ──► PostgreSQL
        │                           │
        └──── WebSocket (JWT) ──────┤──► Email (SMTP) · SMS profesional (Twilio, opcional)
                                    └──► SMS contacto de emergencia (celular Android propio)
```

Tablas: `professionals`, `users`, `alerts`, `screenings`, `chat_messages`, `treatment_plans`, `audit_log`
(esquema en `aimotion-server/src/db/schema.sql`, idempotente).

Dos tipos de sesión JWT independientes: **profesional** (8 h) y **paciente** (30 días). Las cuentas profesionales
**no tienen registro público**: se crean por consola.

## 5. Puesta en marcha (Windows / macOS / Linux)

Requisitos: **Node.js 18+** (probado con 22) y **PostgreSQL 14+** (local o en la nube).

### 5.1 Base de datos
Crea una base vacía, p. ej. `aimotion` (`CREATE DATABASE aimotion;` en pgAdmin/psql).

### 5.2 Backend (terminal 1)
```bash
cd aimotion-server
copy .env.example .env        # (macOS/Linux: cp)
# Edita .env: DATABASE_URL y JWT_SECRET son obligatorios
npm install
npm run migrate               # crea/actualiza las tablas
npm run create-professional -- --name="Tu Nombre" --email=tu@correo.com --password=UnaClaveSegura123 --role=ADMIN
npm start                     # http://localhost:4000
```
Genera un `JWT_SECRET` fuerte con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 5.3 Frontend (terminal 2)
```bash
cd aimotion-web
copy .env.example .env        # apunta a http://localhost:4000
npm install
npm run dev                   # http://localhost:5173
```

### 5.4 Primer recorrido
1. Abre la app → **Asistente de Apoyo** y escribe algo (p. ej. "me siento muy triste").
2. **Tamizaje** → completa el PHQ-9.
3. Crea una cuenta desde el chat (**Guardar historial**), con un contacto de emergencia.
4. **Panel Profesional** → entra con la cuenta ADMIN: verás "En vivo", alertas, tamizajes y **Usuarios y planes**.

Siempre necesitas **dos terminales abiertas** (backend y frontend).

## 6. Pruebas

```bash
cd aimotion-web
npm test          # motor de riesgo (24 casos) + chatbot (rutas, FAQs, multi-turno, familias, 3.000 mensajes aleatorios)
```
`npm run test:risk` y `npm run test:bot` por separado. Backend: `npm run test-sms -- --phone=3001234567` prueba la pasarela SMS.

## 7. Seguridad y privacidad (estado actual)

Hecho: contraseñas con bcrypt (12 rondas); JWT firmado con rol/tipo verificados en cada ruta; validación de
entradas con Zod; el usuario del SMS sale del token (nunca del body); consentimiento explícito para el contacto;
mensaje SMS sin datos clínicos; bitácora de auditoría de accesos del profesional; sockets autenticados;
comparación de texto del motor de riesgo normalizada (tildes/ñ).

Pendiente (ver §10): rate limiting y cabeceras de seguridad (helmet), JWT en cookie `httpOnly`, cifrado de contenido
sensible en reposo, política de retención de datos, aviso de privacidad y autorización de tratamiento de datos
(Ley 1581 de 2012), consentimiento de representante legal para menores (Ley 1098 de 2006), HTTPS.

## 8. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `ERR_MODULE_NOT_FOUND` al iniciar el backend | Falta `npm install` en esa carpeta (el zip no incluye `node_modules`). |
| `DATABASE_URL`/`JWT_SECRET no esta configurada` | Falta el `.env` o está vacío ese campo. |
| `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL no está encendido. |
| Error PostCSS: "use `@tailwindcss/postcss`" | Tailwind v4 instalado con config v3. Este proyecto ya usa v4: `postcss.config.js` con `@tailwindcss/postcss` e `index.css` con `@import "tailwindcss"`. No fijes `tailwindcss@3`; borra `node_modules` y `package-lock.json` y reinstala. |
| Menú sin botones en pantalla angosta | Usa el ícono ☰ (menú móvil) o maximiza la ventana. |
| `destroy is not a function` en la consola | Casi siempre una **extensión del navegador**; prueba en ventana de incógnito. |
| Panel dice "Sin conexión en vivo" | `CORS_ORIGIN` del backend debe coincidir con la URL del frontend (`http://localhost:5173`). |
| Tamizaje muestra aviso amarillo "no pudimos enviar" | Backend caído o sin `npm run migrate`; el puntaje igual se muestra y se puede reintentar. |
| El SMS al contacto no sale | `SMS_GATEWAY_*` sin configurar o celular apagado/sin red; prueba con `npm run test-sms`. |
| Cuentas antiguas sin contacto | Agregarlo en **Mi Progreso → Contacto de emergencia**. |

## 9. Limitaciones conocidas

- El chatbot es **basado en reglas** (transparente y auditable, sin costo ni dependencia externa), no un modelo
  de lenguaje: cubre mucho, pero no "razona" libremente. Los umbrales del motor de riesgo deben **calibrarse con
  el psicólogo** (heurística, no juicio clínico).
- El JWT del navegador está en `localStorage` (aceptable en prototipo; ver §7).
- El contacto de emergencia se avisa solo por SMS y solo ante riesgo **crítico**; depende del plan de SMS y de
  que el celular-pasarela esté encendido y con red.
- Sin pruebas automáticas del backend ni CI todavía.

## 10. Roadmap recomendado (por prioridad)

**Prioridad 1 — cierra brechas del alcance y la defensa**
1. **Diario de síntomas** entre sesiones (check-in diario de ánimo/ansiedad/sueño con gráfico de evolución y vista del profesional).
2. **Anamnesis estructurada** (motivo de consulta, antecedentes, desencadenantes y mantenedores, factores de riesgo/protección) y **resumen de caso exportable a PDF** para el profesional.
3. **Validación con expertos**: instrumento de juicio de expertos (pertinencia, claridad, seguridad de respuestas y reglas), set de frases etiquetadas para medir **sensibilidad/especificidad** del motor de riesgo (registrando qué regla se activó), y cuestionario de usabilidad (SUS) dentro de la app.
4. **Cumplimiento y ética**: aviso de privacidad y autorización de tratamiento de datos (Ley 1581), consentimiento informado visible, **verificación de edad y consentimiento de representante** para menores.
5. **Endurecimiento de seguridad**: rate limiting (login, registro, alertas, chat), `helmet`, JWT en cookie `httpOnly`, bloqueo por intentos fallidos, política de retención y cifrado de contenido sensible.

**Prioridad 2 — se ve y funciona como producto**
6. **Respuestas rápidas (chips)** tras cada mensaje del bot, para guiar sin dejar callejones sin salida; botón "valorar esta respuesta" para mejorar el contenido.
7. **`ErrorBoundary`** de React (nunca pantalla en blanco) y notificaciones tipo *toast*.
8. **Escalamiento por falta de revisión**: si una alerta crítica no se revisa en X minutos, re-notificar y escalar a otro profesional; asignación de casos y notas clínicas.
9. **Más instrumentos validados en español**: PSS-10 (estrés), versión para adolescentes del PHQ, **C-SSRS/ASQ** (riesgo suicida) y un cribado de psicosis (p. ej. PQ-16) — verificando licencia y validación.
10. **Recordatorios** del plan semanal por email/SMS; panel de métricas de uso (anonimizadas) para la tesis.

**Prioridad 3 — calidad y despliegue**
11. Pruebas del backend (Supertest) y **CI** (GitHub Actions: lint + tests); logs estructurados y monitoreo.
12. **Docker Compose** (Postgres + backend + frontend) y despliegue con HTTPS (demo en vivo para la sustentación); copias de seguridad.
13. Accesibilidad (WCAG: contraste, teclado, lectores de pantalla) y PWA para uso móvil.
14. *(Opcional)* modelo de lenguaje con **guardrails**: el motor de riesgo siempre determinista y por encima, el modelo solo para reformular, con la misma delimitación clínica.
