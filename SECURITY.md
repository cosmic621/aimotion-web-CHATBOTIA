# Seguridad de AIMotion

Este documento describe **qué defensas tiene el sistema, dónde están en el código, cómo se verifican** y —con la
misma importancia— **qué NO cubre todavía**. AIMotion maneja información de salud mental: es un prototipo académico
y debe revisarse (y, idealmente, someterse a una prueba de penetración) antes de usarse con datos reales de personas.

## 1. Los 20 puntos de endurecimiento

Leyenda: ✅ implementado y probado · 🔶 implementado, pero **hay que verificarlo en tu entorno** (necesita base de datos/red/hosting) · ℹ️ aclaración de alcance.

| # | Punto | Estado | Qué se hizo y dónde |
|---|---|---|---|
| 1 | Ocultar claves API | ✅ | Todo secreto vive en `aimotion-server/.env` (ignorado por git) y se lee solo en `src/config.js`. El servidor **se niega a arrancar** con secretos débiles o de ejemplo (`src/security/configCheck.js`). Ningún secreto se imprime ni va en respuestas de error (`redactConfig`). El frontend no contiene secretos: una prueba estática lo verifica (`npm run test:security`). |
| 2 | Eliminar secretos de git | ✅ + 🔶 | `.gitignore` (raíz y backend), escáner propio `npm run scan-secrets`, **hook pre-commit** (`.githooks/`), y CI con Gitleaks sobre **todo el historial** (`.github/workflows/security.yml`). Para limpiar un historial ya contaminado ver §3. |
| 3 | "Clave pública de DB" | ℹ️ ✅ | El navegador **nunca** habla con la base de datos (solo con la API), así que no hay clave pública de BD que exponer: es más seguro que el modelo "anon key". El equivalente correcto es **mínimo privilegio**: la API usa el rol `aimotion_app` (sin superusuario, sin DDL, sin DELETE, `UPDATE` solo en columnas concretas) — `src/db/roles.sql`, `npm run setup-roles`. Migraciones y scripts usan otra conexión (`ADMIN_DATABASE_URL`). En producción el servidor rechaza usar el superusuario `postgres`. |
| 4 | Activar RLS | 🔶 | Políticas por rol en `src/db/rls.sql` (`npm run migrate:rls`); cada consulta fija `app.role / app.user_id / app.session_id` (`src/db/db.js`). **Verifícalo con `npm run test-rls`** (28 comprobaciones contra tu Postgres real). No pude ejecutarlo en mi entorno. |
| 5 | Cifrar datos sensibles | ✅ | AES-256-GCM a nivel de aplicación (`src/security/crypto.js`): mensajes del chat, extracto y nota de alertas, contacto de emergencia, respuestas de tamizajes y semanas de planes. Cada dato queda ligado a su columna **y fila** (AAD): un cifrado copiado a otra fila no se puede leer. Rotación de claves y `npm run encrypt-existing` para datos antiguos. |
| 6 | Forzar autenticación del servidor | ✅ | Tabla central **deny-by-default** (`src/security/accessPolicy.js`): una ruta que no está en la tabla responde 403. JWT con algoritmo fijado (HS256), emisor y **audiencia** verificados (un token de paciente no sirve de profesional). WebSockets autenticados por cookie y origen. Nada depende de lo que verifique el frontend. |
| 7 | Restringir acceso a registros | ✅ + 🔶 | Cada consulta recibe un contexto de rol (`src/db/context.js`); la sesión anónima solo lee mensajes **sin cuenta**; los planes ajenos responden 404; leer el chat de una persona queda en la bitácora de auditoría; RLS (punto 4) lo refuerza en la base. |
| 8 | Bloquear manipulación de campos | ✅ | Esquemas **estrictos**: cualquier campo no declarado se rechaza (`role`, `professionalId`, `status`…). Identidades siempre desde el token, nunca del body. El **servidor recalcula** el puntaje del tamizaje. `UPDATE` por columna en la BD. |
| 9 | Proteger cookies de sesión | ✅ | Sesión en cookie **HttpOnly + SameSite=Strict + Secure** (prefijo `__Host-` en producción). El token **no** viaja en el cuerpo ni se guarda en `localStorage`. CSRF con token HMAC ligado a la sesión + verificación de `Origin` (`src/security/cookies.js`). |
| 10 | Hashear contraseñas | ✅ | bcrypt con costo ≥ 12, comparación en tiempo constante aunque el correo no exista, límite de 72 bytes (`src/auth/hash.js`) y política de contraseñas con lista de comunes (10 caracteres usuarios, 12 profesionales). |
| 11 | Limitar intentos de inicio | ✅ | Bloqueo por cuenta (5 fallos) y por IP (20), con bloqueo que **se duplica** hasta 24 h (`createLoginGuard`), más limitador por IP en login. |
| 12 | Protección contra bots | ✅ + ℹ️ | Campo trampa (honeypot), tiempo mínimo de llenado, límites por IP y, **opcional**, verificación de Cloudflare Turnstile en el servidor (`TURNSTILE_SECRET`). El *widget* de Turnstile aún no está integrado en el frontend. |
| 13 | Monitorizar consultas de BD | ✅ | `src/security/dbMonitor.js`: tiempos, errores y consultas lentas (solo la plantilla SQL, nunca los parámetros). `GET /api/admin/metrics` (solo ADMIN). `statement_timeout` de 10 s. |
| 14 | Validar todas las entradas | ✅ | Validador propio (`src/security/validate.js`): **toda** ruta valida body, query y params; sin coerción de tipos; ids con patrón; cuerpo máx. 32 KB; rechaza `__proto__`. Consultas siempre parametrizadas. |
| 15 | Escapar contenido del usuario | ✅ | React escapa al renderizar y una prueba estática prohíbe `innerHTML`/`eval`. En el servidor: se eliminan caracteres de control/bidireccionales, el nombre en el SMS se sanea (solo letras), los correos son texto plano y los logs no admiten inyección de líneas (`src/security/sanitize.js`). |
| 16 | Restringir subida de archivos | ℹ️ ✅ | AIMotion **no tiene subida de archivos**: se rechazan explícitamente `multipart/*` y binarios (415) y todo lo que no sea JSON (`src/security/uploads.js`). Si algún día se agregan, ver pautas en ese archivo. |
| 17 | Limitar respuestas de la API | ✅ | Paginación obligatoria (50 por defecto, máx. 100; `X-Limit`/`X-Has-More`), límite global 300 req/min por IP, respuestas públicas mínimas (alertas, tamizajes y chat devuelven solo ids/estado), `/api/health` sin datos de infraestructura. |
| 18 | Cabeceras de seguridad | ✅ + 🔶 | API: CSP `default-src 'none'`, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store` (datos de salud), HSTS. Frontend: `deploy/nginx.conf` con CSP y demás cabeceras (el servidor de desarrollo de Vite no las envía). Compruébalo en securityheaders.com. |
| 19 | Forzar HTTPS | ✅ + 🔶 | Redirección 308 a HTTPS, HSTS, cookies `Secure`, y en producción el servidor rechaza `CORS_ORIGIN` sin `https://` o `FORCE_HTTPS=false`. TLS 1.2+ y redirección 80→443 en `deploy/nginx.conf`. `DB_SSL=true` para TLS hacia la base. |
| 20 | Escanear dependencias | 🔶 | `npm run audit` (ambos proyectos), CI semanal y en cada push, **Dependabot** y **CodeQL** (`.github/`). Se eliminó una dependencia innecesaria (`zod`). **No pude ejecutar `npm audit` (sin red en mi entorno): córrelo antes de entregar.** |

## 2. Cómo verificar

```bash
# Backend: pruebas unitarias (212) + integración de seguridad (20, necesitan `npm install`)
cd aimotion-server && npm test

# Frontend: riesgo (24), chatbot, y seguridad estática (13)
cd aimotion-web && npm test

# Secretos en el repositorio
cd aimotion-server && npm run scan-secrets

# RLS y mínimo privilegio contra tu Postgres real (28 comprobaciones)
npm run test-rls

# Dependencias
npm run audit        # en aimotion-server y en aimotion-web
```

| Qué prueba | Archivo(s) |
|---|---|
| Validación estricta, mass assignment, prototype pollution | `tests/validate.test.js` (17) |
| Cifrado, manipulación, rotación, AAD por fila | `tests/crypto.test.js` (15), `tests/repos.test.js` (17) |
| Límites de intentos y fuerza bruta | `tests/rateLimit.test.js` (13) |
| Cookies, CSRF | `tests/cookies.test.js` (20) |
| Cabeceras y HTTPS | `tests/headers.test.js` (9) |
| Política de acceso deny-by-default y sesiones | `tests/accessPolicy.test.js` (19) |
| Contraseñas, JWT, puntaje, SMS | `tests/passwordPolicy.test.js` (8), `tests/auth.test.js` (24) |
| Anti-bots, subidas, paginación | `tests/botGuard.test.js` (12), `tests/uploads.test.js` (9) |
| Sanitización, escáner de secretos, configuración | `tests/sanitize.test.js` (13), `tests/secretsScan.test.js` (11), `tests/configCheck.test.js` (7), `tests/config.test.js` (11) |
| Monitoreo de BD | `tests/dbMonitor.test.js` (7) |
| **Ataques por HTTP a la API real** | `tests/integration/api.test.js` (20) |
| Frontend: XSS, sesión, secretos | `aimotion-web/scripts/test-security.mjs` (13) |

> Estado en el entorno donde se desarrolló: las **212 pruebas unitarias del backend, las 24 de riesgo, las del chatbot
> y las 13 estáticas del frontend se ejecutaron y pasan**. Las 20 de integración, `test-rls`, `npm audit` y el envío
> real de SMS **necesitan paquetes, base de datos o red** que ese entorno no tenía: están escritas pero **no se ejecutaron ahí**.

## 3. Si un secreto llegó a git (procedimiento)

1. **Rota el secreto ya** (contraseña de BD, `JWT_SECRET`, claves SMTP/Twilio/pasarela SMS): se considera comprometido aunque borres el archivo.
2. Deja de versionar el archivo: `git rm --cached aimotion-server/.env` y confirma que `.gitignore` lo cubre.
3. Reescribe el historial (haz una copia antes):
   ```bash
   pip install git-filter-repo
   git filter-repo --path aimotion-server/.env --invert-paths      # o --replace-text con una lista de secretos
   git push --force --all
   ```
   Alternativa: BFG Repo-Cleaner. Avisa a quien haya clonado o hecho *fork*: deben volver a clonar.
4. En GitHub activa **Secret scanning** y **Push protection** (Settings → Code security).
5. Activa el hook: `git config core.hooksPath .githooks` (y `chmod +x .githooks/pre-commit` en macOS/Linux).

> Nota: `aimotion-web/src/components/Contact/Contact.jsx` publica correos y celulares personales de los autores.
> No son un secreto técnico, pero sí datos personales públicos en un repositorio abierto: decide si deben estar ahí.

## 4. Puesta en marcha segura

```bash
cd aimotion-server
copy .env.example .env             # (macOS/Linux: cp)
npm run generate-keys              # pega JWT_SECRET y DATA_ENCRYPTION_KEY en .env; guarda la clave de cifrado en un gestor de contraseñas
npm install
npm run migrate                    # tablas (usa ADMIN_DATABASE_URL)
npm run setup-roles                # crea el rol de mínimo privilegio y muestra su DATABASE_URL → pégala en .env
npm run migrate:rls                # activa RLS
npm run test-rls                   # verifica RLS y privilegios
npm run create-professional -- --name="Tu Nombre" --email=tu@correo.com --role=ADMIN   # la contraseña se pide oculta
npm start
```

**Inicio rápido solo para desarrollo:** pon la misma URL del usuario `postgres` en `DATABASE_URL` y `ADMIN_DATABASE_URL` y omite
`setup-roles`/`migrate:rls`. Funciona, pero entonces RLS y el mínimo privilegio **no** se aplican (el servidor lo advierte).

**Si ya tenías datos:** `npm run encrypt-existing -- --dry-run` (cuenta) y luego sin `--dry-run` (cifra lo antiguo).
Las sesiones anteriores dejan de valer: hay que volver a iniciar sesión.

## 5. Lo que este documento NO garantiza (limitaciones honestas)

- **No es una auditoría ni una prueba de penetración.** Un tercero independiente debería revisarlo antes de producción.
- **El motor de riesgo y el chatbot corren en el navegador.** Un usuario técnico podría alterarlos o enviar mensajes `bot` falsos al registro del chat. Mover la detección de riesgo al servidor es la mejora estructural más importante pendiente.
- **Los tokens no se pueden revocar antes de expirar** (el cierre de sesión borra la cookie, pero un token robado seguiría siendo válido hasta su vencimiento: 8 h profesionales, 7 días pacientes). Falta una lista de sesiones/revocación.
- **Los profesionales ven a todos los pacientes** (no hay asignación de casos todavía) y **no hay MFA** para profesionales: es la mejora de autenticación más recomendable.
- **Los limitadores están en memoria** (una sola instancia). Con varias instancias, usar Redis. El bloqueo por cuenta puede usarse para molestar a una víctima (bloquearle el acceso 15 min); es el costo de frenar la fuerza bruta. Los límites son por IP: redes compartidas (campus) comparten cupo.
- **Correo y nombre** del usuario se guardan en claro (se necesitan para iniciar sesión y mostrar). Los puntajes y severidades de tamizajes también. Recomendado: cifrado de disco/TDE en el servidor de BD y backups cifrados.
- **La clave de cifrado vive en una variable de entorno.** Un gestor de secretos / KMS sería mejor; si se pierde, los datos cifrados no se recuperan.
- **Cumplimiento legal** (Ley 1581 de 2012, Ley 1098 de 2006 para menores, aviso de privacidad, autorizaciones, política de retención) **no está resuelto por código**: requiere documentos y decisiones tuyas y de tu institución.
- **WAF, copias de seguridad, monitoreo de infraestructura y respuesta a incidentes** no forman parte del prototipo.
