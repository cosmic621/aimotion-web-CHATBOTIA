# aimotion-server

Backend de AIMotion. Persiste cuentas profesionales, tamizajes clínicos (PHQ-9/GAD-7) y alertas de
riesgo en **PostgreSQL**, y ejecuta el protocolo de escalamiento (email/SMS) hacia el profesional
configurado. La autenticación del panel profesional usa **JWT** con contraseñas hasheadas (bcrypt).

## 1. Base de datos

Necesitas una instancia de PostgreSQL. Para el prototipo, lo más simple es una capa gratuita en:
- **Supabase** (supabase.com) → crea un proyecto → copia la "Connection string" (modo *URI*)
- **Neon** (neon.tech) → crea un proyecto → copia la connection string

También funciona con Postgres instalado localmente.

## 2. Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env`:
- `DATABASE_URL`: tu connection string de Postgres
- `JWT_SECRET`: un valor largo y aleatorio (puedes generarlo con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- Credenciales SMTP/Twilio si quieres notificaciones reales (ver comentarios en el archivo)

## 3. Crear las tablas

```bash
npm run migrate
```

Esto crea (o verifica) las tablas `professionals`, `alerts`, `screenings` y `audit_log`. Es seguro
correrlo varias veces.

## 4. Crear la primera cuenta profesional

No hay registro público — las cuentas se crean desde el servidor (evita que cualquiera se registre
como "profesional" en un sistema que gestiona alertas de riesgo clínico):

```bash
npm run create-professional -- --name="Tu Nombre" --email=tu@correo.com --password=unaClaveSegura123 --role=ADMIN
```

## 5. Iniciar el servidor

```bash
npm start
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | No | Estado del servicio, conexión a BD, si email/SMS están configurados |
| POST | `/api/auth/login` | No | `{ email, password }` → `{ token, professional }` |
| GET | `/api/auth/me` | Bearer JWT | Verifica si el token sigue siendo válido |
| POST | `/api/screenings` | No | Registra un resultado de PHQ-9 o GAD-7 |
| GET | `/api/screenings` | Bearer JWT | Lista todos los tamizajes (panel profesional) |
| POST | `/api/alerts` | No | Registra una alerta de riesgo; si es `alto` o `critico`, dispara email/SMS |
| GET | `/api/alerts` | Bearer JWT | Lista todas las alertas |
| PATCH | `/api/alerts/:id/review` | Bearer JWT | Marca una alerta como revisada (queda registrado quién y cuándo) |

Las rutas protegidas esperan el header `Authorization: Bearer <token>` obtenido en `/api/auth/login`.

## Nota de seguridad

Este backend ya tiene autenticación real, pero sigue siendo un prototipo académico. Antes de usar con
datos reales de personas:
- Sirve la API únicamente sobre HTTPS.
- Considera mover el JWT del `localStorage` del frontend a una cookie `httpOnly` + `SameSite=Strict`.
- Agrega rotación/expiración de contraseñas y una política de complejidad.
- Revisa la normativa de datos sensibles de salud aplicable en tu jurisdicción (en Colombia, Ley 1581
  de 2012 — Habeas Data).
