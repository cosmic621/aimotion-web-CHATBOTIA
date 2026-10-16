// Pruebas de seguridad estaticas del frontend (items 1, 9 y 15): busca patrones peligrosos en el codigo.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../src');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(e.name)) files.push(p);
  }
})(root);
const read = (f) => fs.readFileSync(f, 'utf-8');
const rel = (f) => path.relative(root, f);

let fails = 0;
const check = (name, offenders) => {
  const ok = offenders.length === 0;
  if (!ok) fails++;
  console.log(`${ok ? '✔' : '✖'} ${name}${ok ? '' : '\n    ' + offenders.join('\n    ')}`);
};
const grep = (re) => files.flatMap((f) => read(f).split('\n').map((l, i) => (re.test(l) ? `${rel(f)}:${i + 1}: ${l.trim().slice(0, 90)}` : null)).filter(Boolean));

// 15. XSS: nada que inserte HTML o ejecute texto como codigo
check('sin dangerouslySetInnerHTML / innerHTML / outerHTML / insertAdjacentHTML', grep(/dangerouslySetInnerHTML|\.innerHTML|\.outerHTML|insertAdjacentHTML/));
check('sin eval / new Function / document.write', grep(/\beval\s*\(|new Function\s*\(|document\.write\s*\(/));
check('sin setTimeout/setInterval con texto', grep(/set(Timeout|Interval)\s*\(\s*['"`]/));
check('sin javascript: en enlaces', grep(/href\s*=\s*['"`]javascript:/i));
check('enlaces target="_blank" siempre con rel="noopener noreferrer"', files.flatMap((f) => (read(f).match(/<a\b[^>]*target=["']_blank["'][^>]*>/g) || []).filter((t) => !/noopener/.test(t)).map((t) => `${rel(f)}: ${t.slice(0, 80)}`)));

// 9. Sesion: el frontend no guarda ni envia tokens
check('sin cabecera Authorization / Bearer en el frontend', grep(/Authorization|Bearer /));
check('ningun token guardado en localStorage/sessionStorage', grep(/(localStorage|sessionStorage)\.setItem\([^)]*token/i));
const api = read(path.join(root, 'lib/api.js'));
check("api.js usa credentials: 'include' (cookies HttpOnly)", /credentials:\s*'include'/.test(api) ? [] : ['falta credentials: include']);
check('api.js envía el token CSRF en cabecera', /X-CSRF-Token/.test(api) ? [] : ['falta X-CSRF-Token']);
check('el socket usa cookies (withCredentials)', /withCredentials:\s*true/.test(read(path.join(root, 'lib/socket.js'))) ? [] : ['falta withCredentials']);

// 1. Secretos: ninguna variable VITE_ puede ser un secreto (VITE_* se incrusta en el JS publico)
check('ninguna variable VITE_ parece un secreto', grep(/VITE_[A-Z_]*(SECRET|PASSWORD|PRIVATE|TOKEN|API_KEY)\b/));
check('sin URLs http:// quemadas (salvo localhost de desarrollo)', grep(/['"`]http:\/\/(?!localhost|127\.0\.0\.1)/));
check('sin claves/secretos literales', grep(/(password|secret|api[_-]?key)\s*[:=]\s*['"][A-Za-z0-9/+_-]{16,}['"]/i));

console.log(fails === 0 ? '\nTODAS LAS PRUEBAS DE SEGURIDAD DEL FRONTEND OK' : `\n${fails} FALLAS`);
process.exit(fails === 0 ? 0 : 1);
