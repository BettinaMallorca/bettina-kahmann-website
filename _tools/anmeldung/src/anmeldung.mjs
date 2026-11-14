// Wochen-Anmeldung für die offenen Präsenzstunden.
// Quelle: _tools/anmeldung/src/anmeldung.mjs, gebündelt nach netlify/functions/anmeldung.mjs
import { getStore } from '@netlify/blobs';

const PLAETZE = 15;
const FRIST_STUNDEN = 12;
const AUFBEWAHRUNG_TAGE = 28;
const STUNDEN = [
  { id: 'di18', tag: 2, start: '18:00', ende: '19:15', titel: 'Hatha meets Yin' },
  { id: 'di1930', tag: 2, start: '19:30', ende: '20:30', titel: 'Yin Yoga' },
  { id: 'do1815', tag: 4, start: '18:15', ende: '19:30', titel: 'Yoga für Männer & Frauen' },
];
const ARTEN = ['10er-Karte', '5er-Karte', 'epassi/Hansefit', 'Einzelstunde', 'Schnupperstunde'];
const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const store = () => getStore({ name: 'wochen-anmeldung', consistency: 'strong' });
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// Datum und Uhrzeit in Berlin
function jetztBerlin() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return { datum: `${p.year}-${p.month}-${p.day}`, zeit: `${p.hour}:${p.minute}` };
}
function plusTage(datum, n) {
  const d = new Date(datum + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const wochentag = (datum) => new Date(datum + 'T12:00:00Z').getUTCDay();

// Nächster Termin jeder Stunde; Anmeldung bis Stundenbeginn
function naechsteTermine() {
  const { datum, zeit } = jetztBerlin();
  const out = [];
  for (const s of STUNDEN) {
    for (let i = 0; i < 8; i++) {
      const d = plusTage(datum, i);
      if (wochentag(d) !== s.tag) continue;
      if (i === 0 && zeit >= s.start) continue;
      out.push({ ...s, datum: d, key: `s/${d}_${s.id}` });
      break;
    }
  }
  return out.sort((a, b) => (a.datum + a.start).localeCompare(b.datum + b.start));
}
function vergangeneTermine(tage) {
  const { datum } = jetztBerlin();
  const out = [];
  for (let i = 1; i <= tage; i++) {
    const d = plusTage(datum, -i);
    for (const s of STUNDEN) if (wochentag(d) === s.tag) out.push({ ...s, datum: d, key: `s/${d}_${s.id}` });
  }
  return out;
}
function minutenBis(datum, start) {
  const j = jetztBerlin();
  const ziel = Date.parse(`${datum}T${start}:00Z`), jetzt = Date.parse(`${j.datum}T${j.zeit}:00Z`);
  return (ziel - jetzt) / 60000;
}
const imFristfenster = (t) => minutenBis(t.datum, t.start) < FRIST_STUNDEN * 60;
const terminAusKey = (key) => {
  const m = /^s\/(\d{4}-\d{2}-\d{2})_([a-z0-9]+)$/.exec(key);
  const s = m && STUNDEN.find((x) => x.id === m[2]);
  return s ? { ...s, datum: m[1], key } : null;
};
const datumText = (d) => {
  const [y, m, t] = d.split('-');
  return `${WT[wochentag(d)]}, ${t}.${m}.`;
};

async function lade(st, key) {
  const r = await st.getWithMetadata(key, { type: 'json' });
  const doc = r ? r.data : { eintraege: [], ausfall: false };
  doc.spaet = doc.spaet || [];
  return { doc, etag: r ? r.etag : null };
}
// Schreiben mit Konfliktprüfung, damit gleichzeitige Anmeldungen sich nicht überschreiben
async function aendern(st, key, fn) {
  for (let v = 0; v < 6; v++) {
    const { doc, etag } = await lade(st, key);
    const ergebnis = fn(doc);
    if (ergebnis && ergebnis.fehler) return ergebnis;
    const opt = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
    const w = await st.setJSON(key, doc, opt);
    if (w.modified) return ergebnis;
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
  }
  return { fehler: 'Gerade ist viel los. Bitte versuch es gleich noch einmal.' };
}

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const zufall = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

function oeffentlich(t, doc, eigeneIds) {
  const n = doc.eintraege.length;
  const res = {
    key: t.key, id: t.id, titel: t.titel, datum: t.datum, datumText: datumText(t.datum),
    zeit: `${t.start}–${t.ende}`, plaetze: PLAETZE,
    angemeldet: Math.min(n, PLAETZE), warteliste: Math.max(0, n - PLAETZE), ausfall: !!doc.ausfall,
    kostenpflichtig: imFristfenster(t), fristStunden: FRIST_STUNDEN,
  };
  if (eigeneIds.length) {
    res.eigene = {};
    doc.eintraege.forEach((e, i) => {
      if (eigeneIds.includes(e.id)) res.eigene[e.id] = i < PLAETZE ? { status: 'platz', kostenfrei: !!e.spaetNachgerueckt } : { status: 'warteliste', position: i - PLAETZE + 1 };
    });
  }
  return res;
}

async function aufraeumen(st) {
  const grenze = plusTage(jetztBerlin().datum, -AUFBEWAHRUNG_TAGE);
  const { blobs } = await st.list({ prefix: 's/' });
  for (const b of blobs) if (b.key.slice(2, 12) < grenze) await st.delete(b.key);
}

function istAdmin(req) {
  const soll = process.env.ANMELDUNG_KEY || (typeof Netlify !== 'undefined' ? Netlify.env.get('ANMELDUNG_KEY') : '');
  const ist = req.headers.get('x-anmeldung-key') || '';
  return !!soll && soll.length >= 12 && ist === soll;
}

export default async (req) => {
  const st = store();
  const url = new URL(req.url);

  if (req.method === 'GET') {
    if (url.searchParams.get('admin') === '1') {
      if (!istAdmin(req)) return json({ fehler: 'Schlüssel stimmt nicht.' }, 401);
      const termine = [...naechsteTermine(), ...vergangeneTermine(14)];
      const liste = [];
      for (const t of termine) {
        const { doc } = await lade(st, t.key);
        liste.push({
          key: t.key, titel: t.titel, datum: t.datum, datumText: datumText(t.datum), zeit: `${t.start}–${t.ende}`,
          kommend: t.datum >= jetztBerlin().datum && naechsteTermine().some((x) => x.key === t.key),
          ausfall: !!doc.ausfall, plaetze: PLAETZE,
          eintraege: doc.eintraege.map((e, i) => ({ id: e.id, name: e.name, art: e.art, ts: e.ts, warteliste: i >= PLAETZE })),
          spaet: doc.spaet.map((e) => ({ id: e.id, name: e.name, art: e.art, abgesagt: e.abgesagt, erlassen: !!e.erlassen })),
        });
      }
      return json({ termine: liste });
    }
    const ids = (url.searchParams.get('ids') || '').split(',').filter((x) => /^[a-f0-9]{16}$/.test(x)).slice(0, 20);
    const out = [];
    for (const t of naechsteTermine()) out.push(oeffentlich(t, (await lade(st, t.key)).doc, ids));
    return json({ termine: out });
  }

  if (req.method !== 'POST') return json({ fehler: 'Methode nicht erlaubt.' }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ fehler: 'Ungültige Anfrage.' }, 400); }

  if (body.action === 'anmelden') {
    if (body.website) return json({ ok: true, id: '0'.repeat(16), token: 'x', status: 'platz' }); // Honeypot
    const t = naechsteTermine().find((x) => x.key === body.key);
    if (!t) return json({ fehler: 'Für diese Stunde ist die Anmeldung geschlossen.' }, 400);
    const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (name.length < 2) return json({ fehler: 'Bitte trag deinen Namen ein.' }, 400);
    const art = ARTEN.includes(body.art) ? body.art : '';
    if (!art) return json({ fehler: 'Bitte wähl aus, wie du teilnimmst.' }, 400);
    const id = zufall(8), token = zufall(16), tokenHash = await sha(token);
    const r = await aendern(st, t.key, (doc) => {
      if (doc.ausfall) return { fehler: 'Diese Stunde fällt aus.' };
      if (doc.eintraege.length >= PLAETZE + 30) return { fehler: 'Die Warteliste ist voll.' };
      doc.eintraege.push({ id, name, art, ts: new Date().toISOString(), tokenHash });
      const i = doc.eintraege.length - 1;
      return i < PLAETZE ? { status: 'platz' } : { status: 'warteliste', position: i - PLAETZE + 1 };
    });
    if (r.fehler) return json(r, 409);
    if (Math.random() < 0.1) aufraeumen(st).catch(() => {});
    return json({ ok: true, id, token, key: t.key, ...r });
  }

  if (body.action === 'abmelden') {
    const tokenHash = await sha(String(body.token || ''));
    const r = await aendern(st, String(body.key || ''), (doc) => {
      const i = doc.eintraege.findIndex((e) => e.id === body.id && e.tokenHash === tokenHash);
      if (i < 0) return { fehler: 'Anmeldung nicht gefunden.' };
      const t = terminAusKey(String(body.key || ''));
      const [e] = doc.eintraege.splice(i, 1);
      // Späte Absage: nur wer einen Platz hatte, nicht bei ausgefallener Stunde
      const fenster = !!t && imFristfenster(t);
      // Wer erst im Fristfenster von der Warteliste nachrückt, sagt kostenfrei ab
      const spaet = fenster && i < PLAETZE && !doc.ausfall && !e.spaetNachgerueckt;
      if (spaet) doc.spaet.push({ id: e.id, name: e.name, art: e.art, abgesagt: new Date().toISOString() });
      if (fenster && i < PLAETZE && doc.eintraege.length >= PLAETZE) doc.eintraege[PLAETZE - 1].spaetNachgerueckt = true;
      return { ok: true, spaet };
    });
    return json(r, r.fehler ? 404 : 200);
  }

  // Ab hier nur mit Schlüssel
  if (!istAdmin(req)) return json({ fehler: 'Schlüssel stimmt nicht.' }, 401);
  const key = String(body.key || '');
  if (!/^s\/\d{4}-\d{2}-\d{2}_[a-z0-9]+$/.test(key)) return json({ fehler: 'Unbekannte Stunde.' }, 400);
  if (body.action === 'ausfall') {
    const r = await aendern(st, key, (doc) => { doc.ausfall = !!body.wert; return { ok: true }; });
    return json(r, r.fehler ? 409 : 200);
  }
  if (body.action === 'erlassen') {
    const r = await aendern(st, key, (doc) => {
      const e = doc.spaet.find((x) => x.id === body.id);
      if (!e) return { fehler: 'Eintrag nicht gefunden.' };
      e.erlassen = !!body.wert;
      return { ok: true };
    });
    return json(r, r.fehler ? 404 : 200);
  }
  if (body.action === 'entfernen') {
    const r = await aendern(st, key, (doc) => {
      const i = doc.eintraege.findIndex((e) => e.id === body.id);
      if (i < 0) return { fehler: 'Eintrag nicht gefunden.' };
      doc.eintraege.splice(i, 1);
      return { ok: true };
    });
    return json(r, r.fehler ? 404 : 200);
  }
  return json({ fehler: 'Unbekannte Aktion.' }, 400);
};

export const config = { path: '/api/anmeldung' };
