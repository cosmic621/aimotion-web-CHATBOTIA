// Detector de secretos para archivos versionados (item 2). Se usa en
// scripts/scan-secrets.js, en el hook pre-commit y en el CI.
// Nunca imprime el secreto completo: solo una vista parcial enmascarada.

const PLACEHOLDER_RE = /cambia|example|ejemplo|tu_|tu-|xxxx|\*\*\*|<[^>]*>|changeme|placeholder|process\.env|import\.meta|your[_-]|\$\{|\{\{|dummy|sample|secreto-largo|valor-por|genera/i;
const WEAK_LOCAL_PASSWORDS = new Set(['postgres', 'password', 'usuario', 'clave', 'admin', 'root', 'secret']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'db', 'postgres', 'host.docker.internal']);

const isPlaceholder = (value) => PLACEHOLDER_RE.test(value);

export const RULES = [
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { id: 'api-key-sk', re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { id: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { id: 'twilio-account-sid', re: /\bAC[0-9a-f]{32}\b/ },
  { id: 'jwt-token', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  {
    id: 'db-url-with-credentials',
    re: /\bpostgres(?:ql)?:\/\/([^:\s/@]+):([^@\s/]+)@([^\s/:]+)/,
    check: (m) => !isPlaceholder(m[2]) && !(LOCAL_HOSTS.has(m[3]) && WEAK_LOCAL_PASSWORDS.has(m[2].toLowerCase())),
    secretGroup: 2,
  },
  {
    id: 'secret-assignment',
    re: /(?:password|passwd|secret|api[_-]?key|auth[_-]?token|access[_-]?token|private[_-]?key)["']?\s*[:=]\s*["']([^"'\s]{12,})["']/i,
    check: (m) => !isPlaceholder(m[1]),
    secretGroup: 1,
  },
  {
    id: 'env-secret-value',
    re: /^\s*(?:export\s+)?[A-Z][A-Z0-9_]*(?:SECRET|KEY|TOKEN|PASS|PASSWORD)\s*=\s*["']?([A-Za-z0-9+/=_.-]{16,})["']?\s*$/,
    check: (m) => !isPlaceholder(m[1]),
    secretGroup: 1,
  },
];

const ENV_FILE_RE = /(^|\/)\.env(\.[^/]+)?$/;
const ENV_SAFE_RE = /\.(example|sample|template)$/;
const SKIP_FILE_RE = /(^|\/)(node_modules|dist|\.git)\/|package-lock\.json$|\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|woff2?|ttf|lock)$/i;

function mask(value) {
  if (!value) return '***';
  return `${value.slice(0, 4)}…(${value.length} caracteres)`;
}

/** Busca secretos en un texto. @returns {{file,line,rule,preview}[]} */
export function scanText(text, file = '(texto)') {
  const findings = [];
  const lines = String(text).split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes('secrets:ignore')) return;
    for (const rule of RULES) {
      const m = rule.re.exec(line);
      if (!m) continue;
      if (rule.check && !rule.check(m)) continue;
      findings.push({ file, line: i + 1, rule: rule.id, preview: mask(m[rule.secretGroup ?? 0]) });
      break; // un hallazgo por linea es suficiente
    }
  });
  return findings;
}

/** Marca archivos .env reales versionados (los .env.example son seguros). */
export function scanFileName(file) {
  if (ENV_FILE_RE.test(file) && !ENV_SAFE_RE.test(file)) {
    return [{ file, line: 0, rule: 'archivo-env-versionado', preview: 'este archivo no debe estar en git' }];
  }
  return [];
}

export function shouldSkip(file) {
  return SKIP_FILE_RE.test(file.replaceAll('\\', '/'));
}

/** @param {string[]} files  @param {(f:string)=>string|null} readFile */
export function scanFiles(files, readFile) {
  const out = [];
  for (const f of files) {
    out.push(...scanFileName(f.replaceAll('\\', '/')));
    if (shouldSkip(f)) continue;
    const text = readFile(f);
    if (text == null || text.length > 1_000_000) continue;
    out.push(...scanText(text, f));
  }
  return out;
}
