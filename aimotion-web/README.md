# aimotion-web

Frontend de AIMotion: **React 19 + Vite 7 + Tailwind CSS v4**, con `socket.io-client` y `lucide-react`.
Necesita el backend `aimotion-server` corriendo (ver `../README.md` para la puesta en marcha completa).

## Instalación

```bash
copy .env.example .env     # (macOS/Linux: cp) — VITE_API_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Pruebas del motor de riesgo y del chatbot (Node, sin dependencias extra) |
| `npm run test:risk` / `npm run test:bot` | Cada suite por separado |

## Estructura

```
src/
  lib/
    riskEngine.js       Reglas de riesgo (crítico/alto), con normalización de tildes/ñ
    textUtils.js        normalize() y distancia de edición (tolerancia a errores de tipeo)
    botResponses.js     Motor del chatbot: tema, intención, audiencia (yo/hijo/otro), memoria
    botKnowledge.js     Conocimiento de las 4 condiciones (basado en la OMS)
    botKnowledge2.js    Temas secundarios, respuestas universales y preguntas de seguimiento
    scales.js           PHQ-9 y GAD-7: preguntas, puntuación y severidad
    treatmentTemplates.js  Plantillas semanales editables (las usa el profesional)
    api.js              Cliente HTTP (sesión de profesional y de paciente)
    authSession.js / patientSession.js / session.js   Sesiones en el navegador
    socket.js           Conexión WebSocket autenticada
  components/
    Layout/ Home/ About/ Contact/     Estructura y secciones informativas
    Screening/          Formularios PHQ-9 / GAD-7
    Chat/               ChatAssistant + RiskBanner (escalamiento)
    Auth/               Registro/login de paciente y contacto de emergencia
    TreatmentPlan/      "Mi Progreso" (plan semanal del paciente)
    Professional/       Login, panel de alertas/tamizajes, usuarios y planes
scripts/                Pruebas automáticas (test-risk.mjs, test-bot.mjs)
```

## Notas

- **Tailwind v4**: se usa `@tailwindcss/postcss` (`postcss.config.js`) e `@import "tailwindcss"` en `src/index.css`; no hay `tailwind.config.js`.
- El chatbot **no usa IA externa**: toda la lógica y el contenido están en `src/lib/` y se pueden revisar/editar por un profesional sin tocar la interfaz.
- Cada vez que se agregue contenido nuevo al chatbot, ejecuta `npm test`.
