# AIMotion — Prototipo v3 (con base de datos real y autenticación)

Este directorio contiene el prototipo de opción de grado. La v2 resolvió los 4 puntos de alcance
clínico; esta v3 avanza en el **plan de profesionalización** (Fases 1 y 2 completas).

## Plan de profesionalización — progreso

| Fase | Estado | Qué incluye |
|---|---|---|
| **1. Base de datos + Autenticación** | ✅ Hecho | PostgreSQL + `pg`, login real de profesionales (JWT + bcrypt), roles (`PSICOLOGO`/`ADMIN`) |
| **2. Migrar alertas/tamizajes a la BD** | ✅ Hecho (incluido en la Fase 1) | Alertas y tamizajes ahora viven en Postgres, no en archivos JSON |
| **3. Tiempo real** | ✅ Hecho | WebSockets (Socket.IO) autenticados con JWT: el panel recibe alertas nuevas (`alert:new`) y revisiones (`alert:reviewed`) al instante, sin recargar |
| **4. Seguridad y cumplimiento** | ⏳ Parcial | Ya hay validación (Zod) y bitácora de auditoría (`audit_log`); falta rate limiting |
| **5. Testing + CI** | ⏳ Pendiente | Vitest, Supertest, GitHub Actions |
| **6. Pulido y despliegue** | ⏳ Pendiente | Gráficas, export PDF, Docker, deploy en vivo |

---

## Resumen de los 4 puntos de alcance clínico (de la v2, siguen vigentes)

## 1. Título / alcance general
Este entregable es explícitamente un **prototipo de desarrollo**, no un sistema en producción.

## 2. Alcance en psicología clínica (anamnesis, diagnóstico asistido y alarmas)

| Requisito | Dónde vive en el código |
|---|---|
| Recolección estructurada de sintomatología | `aimotion-web/src/components/Screening/ScaleForm.jsx` + `src/lib/scales.js` (PHQ-9, GAD-7) |
| Motor de reglas para detección de riesgo | `aimotion-web/src/lib/riskEngine.js` (cliente) — se re-valida y persiste en `aimotion-server/src/routes/alerts.js` |
| Protocolo de escalamiento | `ChatAssistant.jsx` (intercepta antes del bot) + `RiskBanner.jsx` (toma control de la UI) |
| Notificación inmediata (email/SMS) | `aimotion-server/src/services/emailService.js` y `smsService.js` |

## 3. Delimitación del chatbot (Human-in-the-Loop)

- El chatbot **no diagnostica, no prescribe y no hace psicoterapia autónoma** (`INTRO_MESSAGE` en `botResponses.js`).
- **Human-in-the-Loop real**: toda alerta queda `pendiente` hasta que un profesional autenticado la
  revisa (`PATCH /api/alerts/:id/review`), y queda registrado **quién** la revisó (`reviewed_by_id`),
  no solo que "alguien" lo hizo.

## 4. Apoyo profesional / investigación aplicada

- **Calibración de umbrales de riesgo**: reglas centralizadas y comentadas en `riskEngine.js` (`RISK_RULES`).
- **Co-diseño de respuestas**: todo el contenido conversacional vive en `botResponses.js`, separado de la UI.
- **Validación de pertinencia clínica**: el Panel Profesional expone tamizajes y alertas para juicio de expertos.

---

## Estructura del proyecto

```
aimotion-web/      Frontend (React + Vite + Tailwind)
aimotion-server/   Backend (Node + Express + PostgreSQL) — auth, persistencia y alertas
```

## Puesta en marcha

### 1. Base de datos

Necesitas una instancia de PostgreSQL. Más rápido: crea un proyecto gratuito en
**[Supabase](https://supabase.com)** o **[Neon](https://neon.tech)** y copia la connection string.
(También sirve un Postgres local.)

### 2. Backend

```bash
cd aimotion-server
cp .env.example .env
# Edita .env: DATABASE_URL (tu Postgres), JWT_SECRET (genera uno aleatorio),
# y credenciales SMTP/Twilio si quieres notificaciones reales
npm install
npm run migrate               # crea las tablas
npm run create-professional -- --name="Tu Nombre" --email=tu@correo.com --password=unaClaveSegura123 --role=ADMIN
npm start
```

El servidor corre en `http://localhost:4000`.

### 3. Frontend

```bash
cd aimotion-web
cp .env.example .env   # por defecto apunta a http://localhost:4000
npm install
npm run dev
```

### 4. Acceder al Panel Profesional

Ve a la sección "Panel Profesional" e inicia sesión con el email/contraseña que creaste en el paso 2
(`npm run create-professional`). No hay registro público — así debe ser en un sistema que gestiona
alertas de riesgo clínico.

## Importante sobre el envío real de email/SMS

El código (Nodemailer + Twilio) es funcional y fue probado end-to-end con un Postgres real en el
entorno de desarrollo (login, creación de alertas, bitácora de revisión — todo pasó). El envío real de
email/SMS solo necesita que completes tus credenciales SMTP/Twilio reales en `.env`; este entorno de
desarrollo no tiene salida de red hacia esos servidores, así que no pude confirmar la entrega final del
correo/SMS, solo que el código los invoca correctamente y maneja errores con gracia si faltan credenciales.

## Tiempo real (WebSockets)

El Panel Profesional se conecta por Socket.IO al iniciar sesión (usando el mismo JWT del login). Cuando
se crea una alerta de riesgo alto/crítico o alguien la marca como revisada, todos los profesionales
conectados lo ven al instante — sin recargar la página. Esto se probó end-to-end en este entorno:
login → conexión de socket → creación de alerta vía HTTP → recepción del evento en menos de 1 segundo.

Si el panel muestra "Sin conexión en vivo", revisa que `CORS_ORIGIN` en `aimotion-server/.env` coincida
con la URL donde corre tu frontend (por defecto `http://localhost:5173`).

## Limitaciones conocidas (para tu documento de monografía)

- El JWT del panel profesional se guarda en `localStorage` del navegador — aceptable para un prototipo,
  pero un despliegue real debería usar una cookie `httpOnly` + `SameSite=Strict`.
- No hay rotación de contraseñas ni política de complejidad todavía (Fase 4 del plan).
- El motor de riesgo es una heurística basada en reglas (transparente y auditable), no un modelo
  probabilístico entrenado — mencionado como posibilidad futura en el alcance original, no como requisito.
- La tabla `audit_log` ya existe pero solo se usa para listados/revisiones de alertas; ampliar su
  cobertura es parte de la Fase 4 pendiente.
