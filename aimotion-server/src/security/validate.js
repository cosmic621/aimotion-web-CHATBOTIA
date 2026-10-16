// Validacion estricta de entradas, sin dependencias.
//
// Reglas de diseno (items 8 y 14 del endurecimiento):
//  - Los objetos son ESTRICTOS por defecto: cualquier campo no declarado se
//    rechaza (evita "mass assignment": que alguien envie role, userId,
//    professionalId, status, createdAt, etc.).
//  - Se rechazan las claves __proto__ / constructor / prototype
//    (prototype pollution).
//  - Los strings se limpian de caracteres de control y se acotan en longitud.
//  - No se hace coercion de tipos: "5" no es un entero.

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
// Control C0 (excepto \t \n \r), DEL, y caracteres invisibles/bidireccionales.
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

const ok = (value) => ({ ok: true, value, errors: [] });
const fail = (path, message) => ({ ok: false, value: undefined, errors: [{ path, message }] });

class Schema {
  constructor(opts = {}) {
    this.opts = opts;
    this._optional = false;
    this._nullable = false;
    this._hasDefault = false;
    this._default = undefined;
  }
  _clone(patch) {
    const c = Object.create(Object.getPrototypeOf(this));
    Object.assign(c, this, patch);
    return c;
  }
  optional() { return this._clone({ _optional: true }); }
  nullable() { return this._clone({ _nullable: true }); }
  withDefault(value) { return this._clone({ _hasDefault: true, _default: value }); }
  label(path) { return this.opts.label || path || 'El valor'; }

  run(value, path = '') {
    if (value === undefined) {
      if (this._hasDefault) return ok(this._default);
      if (this._optional) return ok(undefined);
      return fail(path, `${this.label(path)} es obligatorio`);
    }
    if (value === null) {
      if (this._nullable) return ok(null);
      return fail(path, `${this.label(path)} no puede ser nulo`);
    }
    return this._parse(value, path);
  }
}

class StringSchema extends Schema {
  _parse(value, path) {
    const { min = 0, max = 10000, trim = true, pattern, lower = false } = this.opts;
    if (typeof value !== 'string') return fail(path, `${this.label(path)} debe ser texto`);
    let s = value.replace(CONTROL_RE, '').normalize('NFC');
    if (trim) s = s.trim();
    if (lower) s = s.toLowerCase();
    if (s.length < min) {
      return fail(path, min === 1 ? `${this.label(path)} es obligatorio` : `${this.label(path)} debe tener al menos ${min} caracteres`);
    }
    if (s.length > max) return fail(path, `${this.label(path)} no puede superar ${max} caracteres`);
    if (pattern && !pattern.test(s)) return fail(path, this.opts.patternMessage || `${this.label(path)} tiene un formato inválido`);
    return ok(s);
  }
}

class EmailSchema extends StringSchema {
  _parse(value, path) {
    const r = super._parse(value, path);
    if (!r.ok) return r;
    const s = r.value.toLowerCase();
    if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return fail(path, `${this.label(path)} no es un correo válido`);
    return ok(s);
  }
}

class NumberSchema extends Schema {
  _parse(value, path) {
    const { min = -Infinity, max = Infinity, int = false } = this.opts;
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(path, `${this.label(path)} debe ser un número`);
    if (int && !Number.isInteger(value)) return fail(path, `${this.label(path)} debe ser un entero`);
    if (value < min || value > max) return fail(path, `${this.label(path)} debe estar entre ${min} y ${max}`);
    return ok(value);
  }
}

class BooleanSchema extends Schema {
  _parse(value, path) {
    return typeof value === 'boolean' ? ok(value) : fail(path, `${this.label(path)} debe ser verdadero o falso`);
  }
}

class LiteralSchema extends Schema {
  _parse(value, path) {
    return value === this.opts.value ? ok(value) : fail(path, this.opts.message || `${this.label(path)} tiene un valor no permitido`);
  }
}

class EnumSchema extends Schema {
  _parse(value, path) {
    return this.opts.values.includes(value) ? ok(value) : fail(path, `${this.label(path)} debe ser uno de: ${this.opts.values.join(', ')}`);
  }
}

class ArraySchema extends Schema {
  _parse(value, path) {
    const { item, min = 0, max = 1000 } = this.opts;
    if (!Array.isArray(value)) return fail(path, `${this.label(path)} debe ser una lista`);
    if (value.length < min) return fail(path, `${this.label(path)} debe tener al menos ${min} elementos`);
    if (value.length > max) return fail(path, `${this.label(path)} no puede tener más de ${max} elementos`);
    const out = [];
    const errors = [];
    value.forEach((el, i) => {
      const r = item.run(el, `${path}[${i}]`);
      if (r.ok) out.push(r.value);
      else errors.push(...r.errors);
    });
    return errors.length ? { ok: false, value: undefined, errors } : ok(out);
  }
}

class ObjectSchema extends Schema {
  _parse(value, path) {
    const { shape, strict = true } = this.opts;
    if (typeof value !== 'object' || Array.isArray(value)) return fail(path, `${this.label(path)} debe ser un objeto`);
    const keys = Object.keys(value);
    for (const k of keys) {
      if (FORBIDDEN_KEYS.has(k)) return fail(path, 'La petición contiene un campo prohibido');
    }
    const errors = [];
    if (strict) {
      for (const k of keys) {
        if (!(k in shape)) errors.push({ path: path ? `${path}.${k}` : k, message: `El campo "${k}" no está permitido` });
      }
    }
    const out = {};
    for (const [k, schema] of Object.entries(shape)) {
      const r = schema.run(value[k], path ? `${path}.${k}` : k);
      if (r.ok) {
        if (r.value !== undefined) out[k] = r.value;
      } else errors.push(...r.errors);
    }
    return errors.length ? { ok: false, value: undefined, errors } : ok(out);
  }
}

export const v = {
  string: (opts) => new StringSchema(opts),
  email: (opts) => new EmailSchema({ max: 254, min: 1, ...opts }),
  number: (opts) => new NumberSchema(opts),
  int: (opts) => new NumberSchema({ ...opts, int: true }),
  boolean: (opts) => new BooleanSchema(opts),
  literal: (value, opts) => new LiteralSchema({ ...opts, value }),
  enum: (values, opts) => new EnumSchema({ ...opts, values }),
  array: (item, opts) => new ArraySchema({ ...opts, item }),
  object: (shape, opts) => new ObjectSchema({ ...opts, shape }),
};

/** Valida un valor contra un esquema: { ok, value, errors }. */
export function parse(schema, value) {
  return schema.run(value, '');
}

/** Identificadores (nanoid/uuid): solo caracteres seguros y longitud acotada. */
export const idSchema = (label) => v.string({ min: 1, max: 64, pattern: /^[A-Za-z0-9_-]+$/, label, patternMessage: `${label || 'El identificador'} no es válido` });

/**
 * Middleware de Express. Valida body/query/params y deja el resultado limpio
 * en req.valid.{body,query,params}. Si falla responde 400 con un mensaje claro.
 */
export function validate({ body, query, params } = {}) {
  return (req, res, next) => {
    req.valid = {};
    const parts = { body, query, params };
    for (const [name, schema] of Object.entries(parts)) {
      if (!schema) continue;
      const source = req[name] === undefined || req[name] === null ? {} : req[name];
      const r = schema.run(source, '');
      if (!r.ok) {
        return res.status(400).json({ error: r.errors[0].message, details: r.errors.slice(0, 5) });
      }
      req.valid[name] = r.value;
    }
    next();
  };
}
