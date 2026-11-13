import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContactEmailService } from '../src/services/contactEmailService.js';

const brevo = { apiKey: 'xkeysib-secreta', senderEmail: 'remitente@correo.com', senderName: 'AIMotion' };
const user = { name: 'Ana Pérez', emergencyContact: { name: 'Rosa', phone: '+573001234567', relation: 'mamá', email: 'rosa@correo.com' } };
const okFetch = () => {
  const f = async (url, opts) => { f.calls.push({ url, opts }); return { ok: true, status: 201, json: async () => ({ messageId: 'x' }) }; };
  f.calls = [];
  return f;
};

describe('correo al contacto de emergencia (Brevo, por HTTPS)', () => {
  it('envía por la API de Brevo con la clave en la cabecera y el correo del contacto como destino', async () => {
    const f = okFetch();
    const r = await createContactEmailService({ brevo, fetchImpl: f }).send(user, { location: { lat: 4.711, lng: -74.0721 } });
    assert.deepEqual(r, { sent: true });
    assert.equal(f.calls[0].url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(f.calls[0].opts.headers['api-key'], 'xkeysib-secreta');
    const body = JSON.parse(f.calls[0].opts.body);
    assert.deepEqual(body.to, [{ email: 'rosa@correo.com' }]);
    assert.deepEqual(body.sender, { name: 'AIMotion', email: 'remitente@correo.com' });
    assert.match(body.textContent, /maps\.google\.com\/\?q=4\.71100,-74\.07210/);
    assert.match(body.textContent, /Línea 106/);
    assert.ok(body.htmlContent.startsWith('<!DOCTYPE html>'));
    assert.ok(body.textContent && body.htmlContent, 'va en HTML y con versión de texto');
  });
  it('el HTML lleva el mapa (imagen), el botón a Google Maps y los botones de llamada', () => {
    const { html } = createContactEmailService({ brevo }).buildMessage(user, { lat: 4.711, lng: -74.0721, accuracy: 20 });
    assert.match(html, /<img src="https:\/\/staticmap\.openstreetmap\.de\/staticmap\.php\?center=4\.71100,-74\.07210&zoom=16&size=560x280&maptype=mapnik&markers=4\.71100,-74\.07210,red-pushpin"/);
    assert.match(html, /href="https:\/\/maps\.google\.com\/\?q=4\.71100,-74\.07210"/);
    assert.match(html, /href="tel:106"/);
    assert.match(html, /href="tel:123"/);
    assert.match(html, /Precisión aproximada: ±20 m/);
    assert.ok(!/baja/.test(html), 'con buena precisión no se avisa de precisión baja');
  });
  it('precisión baja: se avisa y el mapa se aleja; sin precisión no se inventa', () => {
    const svc = createContactEmailService({ brevo });
    const low = svc.buildMessage(user, { lat: 4.711, lng: -74.0721, accuracy: 4200 });
    assert.match(low.html, /precisión de esta ubicación es baja/);
    assert.match(low.html, /zoom=12/);
    assert.match(low.text, /La precisión es baja/);
    const none = svc.buildMessage(user, { lat: 4.711, lng: -74.0721 });
    assert.ok(!/Precisión aproximada/.test(none.html + none.text));
    assert.match(none.html, /zoom=16/);
  });
  it('sin ubicación el HTML no lleva mapa ni enlace a mapas y lo dice', () => {
    const { html } = createContactEmailService({ brevo }).buildMessage(user, null);
    assert.ok(!/staticmap|maps\.google|<img/.test(html));
    assert.match(html, /No se pudo obtener la ubicación/);
  });
  it('nada del usuario llega al HTML sin escapar (nombre y coordenadas con texto)', () => {
    const evil = { ...user, name: 'Ana"><script>alert(1)</script>' };
    const { html, subject } = createContactEmailService({ brevo }).buildMessage(evil, { lat: '4.7"><img src=x onerror=alert(1)>', lng: -74 });
    assert.ok(!/<script|onerror|alert\(1\)/.test(html + subject));
    assert.ok(!/staticmap/.test(html), 'coordenadas inválidas: no hay mapa');
  });
  it('sin ubicación el correo no lleva enlace', () => {
    const { text } = createContactEmailService({ brevo }).buildMessage(user, null);
    assert.ok(!/http|maps/.test(text.replace(/AIMotion/g, '')));
  });
  it('NO incluye nada de la conversación ni la categoría, y sanea el nombre', () => {
    const evil = { ...user, name: 'Ana\r\nBcc: x@y.com <b>http://evil.example</b>' };
    const { subject, text } = createContactEmailService({ brevo }).buildMessage(evil, null);
    assert.ok(!/evil|http|<|>|Bcc|\r|\n.*Bcc/.test(subject));
    assert.ok(!/evil|<b>|Bcc/.test(text));
    assert.ok(!/ideaci|suicid|riesgo cr/i.test(text + subject));
  });
  it('si el contacto no tiene correo, o no está configurado, no llama a Brevo', async () => {
    const f = okFetch();
    const sin = { ...user, emergencyContact: { ...user.emergencyContact, email: null } };
    assert.equal((await createContactEmailService({ brevo, fetchImpl: f }).send(sin)).reason, 'El contacto no tiene correo registrado');
    assert.equal((await createContactEmailService({ brevo: {}, fetchImpl: f }).send(user)).reason, 'Correo al contacto no configurado');
    assert.equal(createContactEmailService({ brevo: {} }).configured(), false);
    assert.equal(createContactEmailService({ brevo }).configured(), true);
    assert.equal(f.calls.length, 0);
  });
  it('un correo con caracteres de inyección se rechaza', async () => {
    const f = okFetch();
    for (const email of ['a@b.com,otro@c.com', 'a@b.com\nBcc: x@y.com', 'a b@c.com', 'sin-arroba', '<x>@y.com']) {
      const r = await createContactEmailService({ brevo, fetchImpl: f }).send({ ...user, emergencyContact: { ...user.emergencyContact, email } });
      assert.equal(r.sent, false, email);
    }
    assert.equal(f.calls.length, 0);
  });
  it('un error de Brevo se explica solo con su código (su texto puede traer el correo del contacto)', async () => {
    const f = async () => ({ ok: false, status: 400, json: async () => ({ code: 'invalid_parameter', message: 'email rosa@correo.com is invalid' }) });
    const r = await createContactEmailService({ brevo, fetchImpl: f }).send(user);
    assert.equal(r.reason, 'Brevo respondió 400 (invalid_parameter)');
    assert.ok(!r.reason.includes('rosa@correo.com') && !r.reason.includes('xkeysib'));
  });
  it('un código raro de Brevo no se copia; un cuerpo no JSON no rompe; un fallo de red se reporta', async () => {
    const raro = async () => ({ ok: false, status: 401, json: async () => ({ code: 'Hola <script> rosa@x.com' }) });
    assert.equal((await createContactEmailService({ brevo, fetchImpl: raro }).send(user)).reason, 'Brevo respondió 401');
    const noJson = async () => ({ ok: false, status: 502, json: async () => { throw new Error('x'); } });
    assert.equal((await createContactEmailService({ brevo, fetchImpl: noJson }).send(user)).reason, 'Brevo respondió 502');
    const caido = async () => { throw new Error('fetch failed'); };
    assert.equal((await createContactEmailService({ brevo, fetchImpl: caido }).send(user)).reason, 'fetch failed');
  });
});
