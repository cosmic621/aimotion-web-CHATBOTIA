# aimotion-web

Frontend de AIMotion (React + Vite + Tailwind CSS). Requiere que `aimotion-server` esté corriendo para
que el tamizaje y las alertas de riesgo se guarden y notifiquen de verdad — ver `../README.md`.

## Instalación

```bash
npm install
cp .env.example .env   # por defecto apunta a http://localhost:4000
npm run dev
```

## Estructura

```
src/
  lib/
    riskEngine.js     Motor de reglas de detección de riesgo (crítico/alto)
    scales.js         Definición y puntuación de PHQ-9 / GAD-7
    botResponses.js   Contenido conversacional del asistente (delimitado, no diagnostica)
    api.js            Cliente HTTP hacia aimotion-server
    session.js        Identificador de sesión anónimo (sessionStorage)
  components/
    Layout/             Header y Footer
    Home/, About/, Contact/    Secciones informativas
    Screening/          Formularios PHQ-9 / GAD-7 (ScaleForm, ScreeningHub)
    Chat/               Asistente conversacional + banner de escalamiento de riesgo
    Professional/       Panel profesional (Human-in-the-Loop)
```

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción a `dist/`
- `npm run lint` — ESLint
