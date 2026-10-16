# aimotion-server

Backend de AIMotion: **Node + Express + PostgreSQL + Socket.IO**. Gestiona cuentas (profesionales y pacientes), tamizajes, alertas de
riesgo con escalamiento (email / SMS / contacto de emergencia / tiempo real), historial de chat y planes de tratamiento.
La seguridad (cookies HttpOnly, CSRF, RLS, cifrado de datos sensibles, validación estricta…) está descrita en **[../SECURITY.md](../SECURITY.md)**.

## Puesta en marcha

```bash
copy .env.example .env      # (macOS/Linux: cp)
npm run generate-keys       # JWT_SECRET y DATA_ENCRYPTION_KEY -> pégalos en .env
npm install
npm run migrate             # tablas (usa ADMIN_DATABASE_URL)
npm run setup-roles         # rol de mínimo privilegio -> copia la DATABASE_URL que imprime
npm run migrate:rls         # activa RLS        (verifica con: npm run test-rls)
npm run create-professional -- --name="Tu Nombre" --email=tu@correo.com --role=ADMIN
npm start
```

El servidor **no arranca** si falta o es débil `JWT_SECRET` / `DATA_ENCRYPTION_KEY`, si `CORS_ORIGIN` es `*`, o (en producción) si no usa HTTPS
o conecta como superusuario. Para desarrollo rápido puedes usar la misma URL de `postgres` en `DATABASE_URL` y `ADMIN_DATABASE_URL`.

## Scripts

| Comando | Función |
|---|---|
| `npm start` / `npm run dev` | Inicia el servidor (`dev` recarga al guardar) |
| `npm run generate-keys` | Genera `JWT_SECRET` y `DATA_ENCRYPTION_KEY` aleatorios |
| `npm run migrate` / `migrate:rls` | Aplica `schema.sql` / `rls.sql` (conexión de administración, en una transacción) |
| `npm run setup-roles` | Crea el rol `aimotion_app` (sin DDL, sin DELETE, sin superusuario) y sus permisos (`--reset` renueva su contraseña) |
| `npm run create-professional` | Crea un profesional (`--role=ADMIN\|PSICOLOGO`); la contraseña se pide oculta; mínimo 12 caracteres |
| `npm run encrypt-existing` | Cifra datos antiguos en texto plano (`-- --dry-run` solo cuenta) |
| `npm run test-rls` | Verifica en tu BD real que RLS y los privilegios funcionan (28 comprobaciones) |
| `npm run test-sms -- --phone=3001234567` | Prueba la pasarela SMS |
| `npm run scan-secrets` | Busca secretos en los archivos versionados |
| `npm test` | 212 pruebas unitarias + 20 de integración de seguridad (estas necesitan `npm install`) |
| `npm run audit` | `npm audit` (severidad alta o crítica) |

## Variables de entorno (`.env.example` documenta cada una)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión de la **aplicación** (rol `aimotion_app`) |
| `ADMIN_DATABASE_URL` | Para migraciones/scripts | Conexión del dueño de la BD |
| `JWT_SECRET`, `DATA_ENCRYPTION_KEY` | Sí | Aleatorios, ≥ 32 caracteres / 64 hex, distintos entre sí |
| `CORS_ORIGIN` | No | URL(s) del frontend (def. `http://localhost:5173`); nunca `*` |
| `NODE_ENV=production` | — | Activa HTTPS forzado, cookies `Secure` y prefijo `__Host-` |
| `TRUST_PROXY`, `PUBLIC_API_HOST` | Tras un proxy | Para detectar HTTPS e IP reales |
| `DB_SSL`, `COOKIE_SAMESITE`, `BCRYPT_COST`, `TURNSTILE_SECRET`, `SLOW_QUERY_MS` | No | Ver `.env.example` |
| `SMTP_*`, `ALERT_EMAIL_*` · `TWILIO_*`, `ALERT_SMS_TO` · `SMS_GATEWAY_*` | No | Notificaciones al profesional / al contacto de emergencia |

## Endpoints

Todas las rutas están en la tabla central `src/security/accessPolicy.js`: **una ruta que no aparece allí responde 403**.
Las peticiones que modifican datos con sesión necesitan la cabecera `X-CSRF-Token` (se obtiene al iniciar sesión o en `GET /api/auth/csrf`).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Estado y conexión a BD (sin datos de infraestructura) |
| GET | `/api/auth/csrf` | Público | Token CSRF de la sesión actual |
| POST | `/api/auth/login` · `/logout` | Público | Sesión de profesional (cookie HttpOnly) |
| GET | `/api/auth/me` | Profesional | Perfil |
| POST | `/api/patient-auth/register` | Público | Registro de paciente con contacto de emergencia y consentimiento |
| POST | `/api/patient-auth/login` · `/logout` | Público | Sesión de paciente |
| GET | `/api/patient-auth/me` | Paciente | Datos de la cuenta |
| PATCH | `/api/patient-auth/contact` | Paciente | Cambiar contacto de emergencia (requiere consentimiento) |
| POST | `/api/screenings` | Opcional | Guarda PHQ-9/GAD-7 (el **servidor recalcula** el puntaje) |
| GET | `/api/screenings` | Profesional | Lista (paginada) |
| POST | `/api/alerts` | Opcional | Registra una alerta; notifica si es alta/crítica |
| GET | `/api/alerts` | Profesional | Lista (paginada) |
| PATCH | `/api/alerts/:id/review` | Profesional | Marca como revisada (queda quién y cuándo) |
| POST / GET | `/api/chat/messages` | Opcional | Guarda / lee el historial (cuenta o sesión anónima) |
| GET | `/api/chat/users` · `/users/:id/messages` | Profesional | Usuarios con actividad / su conversación (queda en auditoría) |
| POST | `/api/treatment-plans` | Profesional | Crea un plan (el autor sale del token) |
| GET | `/api/treatment-plans/mine` | Paciente | Planes propios |
| GET | `/api/treatment-plans/user/:id` | Profesional | Planes de un paciente |
| PATCH | `/api/treatment-plans/:id/progress` | Paciente | Marca una semana |
| GET | `/api/admin/metrics` | ADMIN | Consultas de BD, limitadores, estado de RLS |

"Opcional" = funciona sin sesión; con sesión de paciente se asocia a la cuenta. Las listas aceptan `?limit=` (máx. 100) y `?offset=`.
**Eventos Socket.IO** (solo profesionales; cookie + origen verificados): `alert:new`, `alert:reviewed`.

## Esquema de datos (`src/db/schema.sql`)

`professionals`, `users` (contacto de emergencia cifrado + consentimiento), `alerts` (resultado de email/SMS/SMS al contacto), `screenings`,
`chat_messages`, `treatment_plans` (`professional_id` obligatorio), `audit_log`. Contenido sensible cifrado (ver SECURITY.md punto 5).

## SMS al contacto de emergencia (sin Twilio)

Al crear su cuenta, cada persona registra un **contacto de emergencia** y **autoriza expresamente** el aviso. Ante riesgo **crítico**, el servidor
envía un SMS breve a ese contacto. Garantías de diseño:

- El SMS **no incluye nada de lo que la persona escribió** ni la categoría de riesgo; el nombre se sanea (solo letras) para que nadie pueda colar enlaces o texto.
- Solo con cuenta + contacto + consentimiento; el usuario sale del **token verificado**, nunca del body.
- Máximo **un SMS cada 6 horas por cuenta**. Cada alerta guarda el resultado del envío (visible en el Panel Profesional).

### Pasarela con un celular Android
App gratuita y de código abierto **SMS Gateway for Android** (capcom6); el celular (con SIM y plan de SMS) hace de "módem".
1. Instálala, déjala encendida y conectada. 2. **Modo local** (misma WiFi): activa *Local Server* y usa
   `SMS_GATEWAY_URL=http://IP_DEL_CELULAR:8080/message` con el usuario/contraseña que muestra la app. **Modo nube:** `https://api.sms-gate.app/3rdparty/v1/message`.
3. Prueba: `npm run test-sms -- --phone=3001234567`. 4. Reinicia el servidor.

> En un despliegue real el celular debe estar conectado 24/7 (o usar un proveedor SMS comercial).
