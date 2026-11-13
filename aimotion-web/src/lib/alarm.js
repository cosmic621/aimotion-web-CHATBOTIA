// Alarma sonora del Panel Profesional (sirena generada con Web Audio: no necesita archivos de audio).
// Los navegadores solo dejan sonar audio despues de que la persona toco la pagina al menos una vez;
// por eso unlockAudio() se llama desde un clic (el Dashboard lo hace en el primer toque).

const KEY = 'aimotion_alarm_sound';
const MAX_ALARM_MS = 60_000; // se apaga sola al minuto para no quedar sonando indefinidamente

let ctx = null;
let osc = null;
let gain = null;
let sweep = null;
let autoStop = null;
let playing = false;

export const isAlarmEnabled = () => {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
};

export function setAlarmEnabled(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* sin storage */ }
  if (!on) stopAlarm();
}

function audioContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Llamar desde un gesto de la persona (clic/toque) para permitir el sonido despues. */
export function unlockAudio() {
  audioContext();
}

/** true si el audio esta bloqueado por el navegador (aun no hubo un clic en la pagina). */
export const isAudioBlocked = () => !ctx || ctx.state !== 'running';

export const isAlarmPlaying = () => playing;

/** Sirena: alterna dos tonos (600 y 900 Hz) cada medio segundo. Devuelve false si no se pudo iniciar. */
export function startAlarm({ maxMs = MAX_ALARM_MS } = {}) {
  if (playing) return true;
  const c = audioContext();
  if (!c) return false;
  osc = c.createOscillator();
  gain = c.createGain();
  osc.type = 'square';
  gain.gain.value = 0.18; // volumen moderado; el de la computadora manda
  osc.connect(gain);
  gain.connect(c.destination);
  let high = false;
  const tick = () => {
    osc.frequency.setValueAtTime(high ? 900 : 600, c.currentTime);
    high = !high;
  };
  tick();
  osc.start();
  sweep = setInterval(tick, 500);
  autoStop = setTimeout(stopAlarm, maxMs);
  playing = true;
  return true;
}

export function stopAlarm() {
  clearInterval(sweep);
  clearTimeout(autoStop);
  try { osc?.stop(); } catch { /* ya detenido */ }
  try { osc?.disconnect(); gain?.disconnect(); } catch { /* ya desconectado */ }
  osc = null;
  gain = null;
  sweep = null;
  autoStop = null;
  playing = false;
}

/** Prueba breve para que quien administra confirme que el sonido funciona. */
export function testAlarm(ms = 1800) {
  if (!startAlarm({ maxMs: ms })) return false;
  return true;
}
