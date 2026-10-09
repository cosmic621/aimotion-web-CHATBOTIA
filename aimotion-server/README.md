# aimotion-server

Backend de AIMotion: **Node + Express + PostgreSQL**. Gestiona cuentas (profesionales y pacientes), tamizajes,
alertas de riesgo con escalamiento (email / SMS / contacto de emergencia / tiempo real), historial de chat y
planes de tratamiento creados por profesionales.

## Puesta en marcha

```bash
copy .env.example .env        # (macOS/Linux: cp) y completa DATABASE_URL y JWT_SECRET (obligatorios)
npm install
npm run migrate               # crea/actualiza las tablas (idempotente; córrelo tras cada actualización)
npm run create-professional -- --name="Tu Nombre" --email=tu@correo.com --password=UnaClaveSegura123 --role=ADMIN
npm start                     # o: npm run dev (recarga automática)
```

| Script | Función |
|---|---|
| `npm run migrate` | Aplica `src/db/schema.sql` |
| `npm run create-professional` | Crea cuenta de profesional (`--role=ADMIN` o `PSICOLOGO`); no hay registro público |
| `npm run test-sms -- --phone=3001234567` | Envía un SMS de prueba por la pasarela propia |

## Variables de entorno (`.env.example` documenta cada una)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión a PostgreSQL |
| `JWT_SECRET` | Sí | Secreto largo y aleatorio |
| `CORS_ORIGIN` | No | URL del frontend (def. `http://localhost:5173`) |
| `SMTP_*`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO` | No* | Email de alerta al profesional |
| `SMS_GATEWAY_URL/USER/PASS` | No* | Pasarela SMS propia (celular Android) para el **contacto de emergencia** |
| `TWILIO_*`, `ALERT_SMS_TO` | No | SMS al **profesional** por Twilio (opcional; déjalo vacío si no lo usas) |

\* Sin configurar, el sistema funciona y registra la alerta, pero no envía esa notificación (el panel indica por qué).

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Estado, conexión a BD, email/SMS configurados |
| POST | `/api/auth/login` | Público | Login de profesional → `{ token, professional }` |
| GET | `/api/auth/me` | Profesional | Valida el token |
| POST | `/api/patient-auth/register` | Público | Registro de paciente **con contacto de emergencia y consentimiento** |
| POST | `/api/patient-auth/login` | Público | Login de paciente |
| GET | `/api/patient-auth/me` | Paciente | Datos de la cuenta |
| PATCH | `/api/patient-auth/contact` | Paciente | Agregar/cambiar contacto de emergencia (requiere consentimiento) |
| POST | `/api/screenings` | Público* | Guarda un PHQ-9/GAD-7 |
| GET | `/api/screenings` | Profesional | Lista tamizajes |
| POST | `/api/alerts` | Público* | Registra alerta; si es alto/crítico notifica (email, SMS, y contacto si es crítico) |
| GET | `/api/alerts` | Profesional | Lista alertas |
| PATCH | `/api/alerts/:id/review` | Profesional | Marca como revisada (queda quién y cuándo) |
| POST | `/api/chat/messages` | Público* | Registra un mensaje del chat (asociado a la cuenta si hay sesión) |
| GET | `/api/chat/messages` | Público* | Historial (de la cuenta, o de la sesión anónima) |
| GET | `/api/chat/users` | Profesional | Usuarios con actividad de chat |
| GET | `/api/chat/users/:id/messages` | Profesional | Transcripción completa de un usuario |
| POST | `/api/treatment-plans` | Profesional | Crea un plan semanal (autor = profesional del token) |
| GET | `/api/treatment-plans/mine` | Paciente | Planes propios |
| GET | `/api/treatment-plans/user/:id` | Profesional | Planes de un paciente |
| PATCH | `/api/treatment-plans/:id/progress` | Paciente | Marca una semana como completada |

\* "Público" = funciona con o sin sesión; con sesión de paciente (header `Authorization: Bearer <token>`) se asocia a la cuenta.

**Eventos Socket.IO** (solo profesionales autenticados): `alert:new`, `alert:reviewed`.

## Esquema de datos (`src/db/schema.sql`)

`professionals`, `users` (incluye contacto de emergencia y consentimiento), `alerts` (con resultado de email/SMS/SMS al contacto),
`screenings`, `chat_messages`, `treatment_plans` (`professional_id` obligatorio), `audit_log`.

## SMS al contacto de emergencia (sin Twilio)

Al crear su cuenta, cada persona registra un **contacto de emergencia** (papá, mamá, acudiente, amistad...) y **autoriza
expresamente** que se le avise. Si el motor de riesgo detecta una situación **crítica** (ideación/planeación suicida,
autolesión, violencia), el backend envía un SMS breve a ese contacto.

Garantías de diseño:
- El SMS **no incluye nada de lo que la persona escribió** ni la categoría de riesgo; solo pide comunicarse y da la Línea 106 / 123.
- Solo se envía con cuenta + contacto + consentimiento; el usuario sale del **token verificado**, nunca del body, así nadie puede usar la API para mandar SMS a un número arbitrario.
- Máximo **un SMS cada 6 horas por cuenta**.
- Cada alerta guarda el resultado del envío (visible en el Panel Profesional).

### Pasarela SMS propia con un celular Android

Se usa la app gratuita y de código abierto **SMS Gateway for Android** (capcom6). El celular (con SIM y plan de SMS) hace de "módem".

1. Instala la app en un Android con SIM y plan de SMS; déjalo encendido, con batería y conectado.
2. **Modo local** (celular y servidor en la misma WiFi): activa **Local Server** en la app (muestra IP, puerto, usuario y contraseña):
   ```
   SMS_GATEWAY_URL=http://IP_DEL_CELULAR:8080/message
   SMS_GATEWAY_USER=usuario_que_muestra_la_app
   SMS_GATEWAY_PASS=contraseña_que_muestra_la_app
   ```
   **Modo nube** (sin IP fija): activa **Cloud Server** y usa `SMS_GATEWAY_URL=https://api.sms-gate.app/3rdparty/v1/message` con las credenciales que genera la app.
3. Prueba: `npm run test-sms -- --phone=3001234567`.
4. Reinicia el servidor.

> En un despliegue real el celular debe estar conectado 24/7 (o usar un proveedor SMS comercial). La entrega depende del plan de SMS de la SIM.

## Seguridad

Implementado: bcrypt (12 rondas), JWT con tipo y rol verificados, Zod en las entradas, auditoría de accesos del profesional,
sockets autenticados. **Antes de usar con datos reales**: HTTPS, rate limiting y `helmet`, JWT en cookie `httpOnly`,
cifrado de contenido sensible en reposo, política de retención y cumplimiento de la Ley 1581 de 2012 (y Ley 1098 de 2006 para menores).
