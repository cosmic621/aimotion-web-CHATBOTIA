// Busca secretos en los archivos versionados. Uso: npm run scan-secrets
// Sale con codigo 1 si encuentra algo (lo usan el hook pre-commit y el CI).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { scanFiles } from '../src/security/secretsScan.js';

const root = path.resolve(process.argv[2] || '..'); // por defecto, la raiz del repositorio
function listFiles() {
  try {
    const out = execSync('git ls-files', { cwd: root, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter(Boolean);
  } catch {
    const files = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', 'dist'].includes(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else files.push(path.relative(root, p));
      }
    })(root);
    return files;
  }
}

const findings = scanFiles(listFiles(), (f) => {
  try {
    return fs.readFileSync(path.join(root, f), 'utf-8');
  } catch {
    return null;
  }
});
if (!findings.length) {
  console.log('✔ Sin secretos detectados en los archivos versionados.');
  process.exit(0);
}
console.error(`✖ ${findings.length} posible(s) secreto(s):\n`);
for (const f of findings) console.error(`  ${f.file}:${f.line}  [${f.rule}]  ${f.preview}`);
console.error('\nQué hacer: 1) saca el secreto del código y úsalo desde .env; 2) ROTA ese secreto (se considera comprometido);');
console.error('3) si ya estaba en el historial de git, límpialo (ver SECURITY.md). Falso positivo: agrega "secrets:ignore" en esa línea.');
process.exit(1);
