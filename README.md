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
aimotion-server/   Backend   — Node + Express + PostgreSQL + Socket.IO (sesiones por cookie HttpOnly)
deploy/            Ejemplo de nginx para producción (HTTPS, cabeceras, CSP)
.github/           CI: pruebas, secretos, dependencias (Dependabot) y CodeQL
.githooks/         Hook pre-commit que bloquea secretos
SECURITY.md        Los 20 puntos de seguridad: estado, dónde están y cómo verificarlos
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
| Seguridad de la información (cifrado, RLS, sesiones HttpOnly, CSRF, validación…) | ✅ (verificar en tu entorno lo indicado) | [SECURITY.md](SECURITY.md) |
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
Navegador (React) ──HTTPS + cookies HttpOnly──► Express ──► PostgreSQL (rol de mínimo privilegio + RLS)
        │                                          │
        └──── WebSocket (cookie + origen) ─────────┤──► Email (SMTP) · SMS profesional (Twilio, opcional)
                                                   └──► SMS contacto de emergencia (celular Android propio)
```

Tablas: `professionals`, `users`, `alerts`, `screenings`, `chat_messages`, `treatment_plans`, `audit_log`
(esquema en `aimotion-server/src/db/schema.sql`, idempotente). Los datos sensibles se guardan **cifrados** (AES-256-GCM).

Dos tipos de sesión independientes: **profesional** (8 h) y **paciente** (7 días), en cookies **HttpOnly**. Las cuentas
profesionales **no tienen registro público**: se crean por consola. Detalle de la seguridad en **[SECURITY.md](SECURITY.md)**.

## 5. Puesta en marcha (Windows / macOS / Linux)

Requisitos: **Node.js 20+** (probado con 22) y **PostgreSQL 14+** (local o en la nube). Necesitas **dos terminales** (backend y frontend).

### 5.1 Backend (terminal 1)
```bash
cd aimotion-server
copy .env.example .env             # (macOS/Linux: cp)
npm run generate-keys              # genera JWT_SECRET y DATA_ENCRYPTION_KEY → pégalos en .env
npm install
# En .env: ADMIN_DATABASE_URL (tu usuario dueño de la BD, p. ej. postgres) y DATABASE_URL
npm run migrate                    # crea/actualiza las tablas
npm run setup-roles                # rol de mínimo privilegio; copia la DATABASE_URL que imprime a .env
npm run migrate:rls                # activa RLS (opcional pero recomendado)  ·  npm run test-rls para verificarlo
npm run create-professional -- --name="Tu Nombre" --email=tu@correo.com --role=ADMIN   # pide la contraseña oculta
npm start                          # http://localhost:4000
```
> **Inicio rápido (solo desarrollo):** pon la misma URL de `postgres` en `DATABASE_URL` y `ADMIN_DATABASE_URL` y omite `setup-roles` y
> `migrate:rls`. El servidor **se niega a arrancar** si `JWT_SECRET`/`DATA_ENCRYPTION_KEY` faltan o son débiles.

### 5.2 Frontend (terminal 2)
```bash
cd aimotion-web
copy .env.example .env             # VITE_API_URL=http://localhost:4000
npm install
npm run dev                        # http://localhost:5173
```

### 5.3 Primer recorrido
1. **Asistente de Apoyo** → escribe "me siento muy triste".
2. **Tamizaje** → PHQ-9.
3. Crea una cuenta (**Guardar historial**) con un contacto de emergencia.
4. **Panel Profesional** → inicia sesión con la cuenta ADMIN: verás "En vivo", alertas, tamizajes y **Usuarios y planes**.

**Actualizando una instalación anterior:** `npm run migrate`, `npm run encrypt-existing` (cifra lo que ya había en texto plano) y vuelve a iniciar
sesión (las sesiones antiguas dejan de valer). Ver [SECURITY.md](SECURITY.md) §4.

## 6. Pruebas

```bash
cd aimotion-server && npm test     # 212 unitarias + 20 de integración (estas últimas necesitan `npm install`)
cd aimotion-web    && npm test     # riesgo (24) + chatbot + seguridad estática del frontend (13)
cd aimotion-server && npm run scan-secrets   # busca secretos en el repositorio
cd aimotion-server && npm run test-rls       # verifica RLS y privilegios en TU Postgres
```
Tabla completa de qué prueba cada archivo en [SECURITY.md](SECURITY.md) §2. `npm run test-sms -- --phone=3001234567` prueba la pasarela SMS.

## 7. Seguridad

Los 20 puntos de endurecimiento (secretos, git, mínimo privilegio, RLS, cifrado, autenticación en el servidor, cookies, CSRF,
contraseñas, límites de intentos, anti-bots, validación, XSS, subidas, límites de respuesta, cabeceras, HTTPS, dependencias…) están
descritos —con su estado real, dónde viven en el código y cómo verificarlos— en **[SECURITY.md](SECURITY.md)**, incluyendo lo que
**todavía no cubre**.

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
| El servidor imprime "Configuración insegura o incompleta" y sale | Es intencional: corrige lo listado (secretos débiles/ausentes, CORS, etc.). `npm run generate-keys` crea valores válidos. |
| `403 Token CSRF inválido` | La sesión cambió; recarga la página. Si persiste, `CORS_ORIGIN` no coincide con la URL del frontend. |
| Inicias sesión pero "se pierde" al recargar | Las cookies no se guardan: frontend y API deben ser del mismo sitio (`localhost` con distintos puertos sirve) y `CORS_ORIGIN` debe coincidir exactamente. |
| `429 Demasiados intentos` | Protección de fuerza bruta/bots; espera el tiempo indicado (`Retry-After`). |
| `No se pudo descifrar el dato` | `DATA_ENCRYPTION_KEY` distinta a la usada al guardar. Restaura la clave (o ponla en `DATA_ENCRYPTION_KEY_OLD` si rotaste). |
| `permission denied for table …` | El rol `aimotion_app` solo tiene los permisos de `src/db/roles.sql`; migraciones y scripts deben usar `ADMIN_DATABASE_URL`. |
| Tras `migrate:rls` las listas salen vacías | Reinicia el servidor y confirma que `DATABASE_URL` use el rol `aimotion_app` (no un superusuario); `npm run test-rls` lo diagnostica. |

## 9. Limitaciones conocidas

- El chatbot es **basado en reglas** (transparente y auditable, sin costo ni dependencia externa), no un modelo de lenguaje. Los umbrales del motor
  de riesgo deben **calibrarse con el psicólogo** (heurística, no juicio clínico).
- **El motor de riesgo y el chatbot corren en el navegador**: pueden ser alterados por un usuario técnico. Moverlos al servidor es la mejora estructural pendiente.
- El contacto de emergencia se avisa solo por SMS y solo ante riesgo **crítico**; depende del plan de SMS y de que el celular-pasarela esté encendido y con red.
- Sin MFA para profesionales, sin revocación de sesiones y sin asignación de casos. Más en [SECURITY.md](SECURITY.md) §5.
- Las pruebas de integración, `test-rls` y `npm audit` deben ejecutarse en tu entorno (necesitan paquetes, base de datos y red).

## 10. Roadmap recomendado (por prioridad)

**Hecho en la versión actual:** endurecimiento de seguridad de los 20 puntos (ver [SECURITY.md](SECURITY.md)).

**Prioridad 1 — cierra brechas del alcance y la defensa**
1. **Diario de síntomas** entre sesiones (check-in diario con gráfico de evolución y vista del profesional) — *siguiente paso*.
2. **Anamnesis estructurada** (motivo de consulta, antecedentes, desencadenantes y mantenedores, factores de riesgo/protección) y resumen de caso exportable a PDF.
3. **Validación con expertos**: instrumento de juicio de expertos, set de frases etiquetadas para medir sensibilidad/especificidad del motor de riesgo, y cuestionario de usabilidad (SUS).
4. **Cumplimiento y ética**: aviso de privacidad, autorización de tratamiento de datos (Ley 1581), consentimiento informado y consentimiento del representante legal para menores.
5. **Seguridad restante**: MFA para profesionales, revocación de sesiones, riesgo detectado también en el servidor, asignación de casos, Redis para los limitadores.

**Prioridad 2 — se ve y funciona como producto**
6. Respuestas rápidas (chips) en el chat y valoración de cada respuesta del bot. 7. `ErrorBoundary` y notificaciones *toast*.
8. Escalamiento de alertas sin revisar. 9. Más instrumentos validados (PSS-10, versión adolescente del PHQ, C-SSRS/ASQ, PQ-16) verificando licencia.
10. Recordatorios del plan semanal y métricas de uso anonimizadas.

**Prioridad 3 — calidad y despliegue**
11. Pruebas de integración con base de datos real en CI. 12. Docker Compose y despliegue con HTTPS (usa `deploy/nginx.conf`); copias de seguridad cifradas.
13. Accesibilidad (WCAG) y PWA. 14. *(Opcional)* modelo de lenguaje con *guardrails*, con el motor de riesgo siempre determinista por encima.
