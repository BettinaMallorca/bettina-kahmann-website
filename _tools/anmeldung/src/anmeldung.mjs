// Wochen-Anmeldung für die offenen Präsenzstunden.
// Quelle: _tools/anmeldung/src/anmeldung.mjs, gebündelt nach netlify/functions/anmeldung.mjs
import { getStore, getDeployStore } from '@netlify/blobs';

const PLAETZE = 15;
const FRIST_STUNDEN = 12;
const MINDEST = 5;
const AUFBEWAHRUNG_TAGE = 28;
const STUNDEN = [
  { id: 'di18', tag: 2, start: '18:00', ende: '19:15', titel: 'Hatha meets Yin' },
  { id: 'di1930', tag: 2, start: '19:30', ende: '20:30', titel: 'Yin Yoga' },
  { id: 'do1815', tag: 4, start: '18:15', ende: '19:30', titel: 'Yoga für Männer & Frauen' },
];
// Kurse, die nur angezeigt werden (keine Anmeldung). Termine kommen aus dem Plan.
const INFO_KURSE = [
  { id: 'aroha', titel: 'AROHA', start: '18:00', zusatz: 'in Präsenz' },
  { id: 'faszien', titel: 'FaszienFit', start: '09:00', zusatz: 'live online, 30 bis 40 Minuten', link: '/yoga-studio-online' },
  { id: 'yinonline', titel: 'Yin Yoga Präventionskurs', start: '19:30', ende: '20:30', zusatz: 'live online über Zoom, für die angemeldeten Kursteilnehmenden', link: '/praeventionskurse-online' },
  { id: 'morning', titel: 'Morning Energy Yoga', start: '09:00', zusatz: 'live online', link: '/yoga-studio-online' },
];
const ANMELDE_TAGE = 14; // so weit im Voraus kann man sich eintragen
const PLAN_KEY = 'plan';
// Startplan, solange noch nichts gespeichert ist
const START_PLAN = {
  di18: ['2026-11-17', '2026-11-24', '2026-12-01', '2026-12-08', '2026-12-15'],
  di1930: ['2026-11-17', '2026-11-24', '2026-12-01', '2026-12-08', '2026-12-15'],
  do1815: ['2026-11-19', '2026-12-03', '2026-12-10', '2026-12-17'],
  aroha: ['2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09', '2026-12-16'],
  faszien: ['2026-11-24', '2026-12-08'],
  yinonline: ['2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09', '2026-12-16'],
  morning: ['2026-11-15', '2026-11-22', '2026-12-06', '2026-12-20', '2026-12-27'],
};
let PLAN = START_PLAN;
const ARTEN = ['Karte', 'epassi/Hansefit', 'Einzelstunde', 'Schnupperstunde'];
const KARTEN = { '5er': { stunden: 5, monate: 6 }, '10er': { stunden: 10, monate: 12 } };
const KARTEN_KEY = 'karten';
const KARTEN_LOESCHEN_MONATE = 6; // nach Ablauf der Karte
const CODE_ZEICHEN = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// Nur die echte Website nutzt den gemeinsamen Speicher. Vorschauen bekommen je Deploy einen eigenen,
// damit Testeinträge nie in den echten Daten landen.
let PRODUKTION = true;
const store = () => PRODUKTION
  ? getStore({ name: 'wochen-anmeldung', consistency: 'strong' })
  : getDeployStore({ name: 'wochen-anmeldung', consistency: 'strong' });
const VORSCHAU_SCHLUESSEL = 'vorschau-bettina';
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

// Termine kommen aus dem Plan, den Bettina auf der Anmeldeliste pflegt
async function ladePlan(st) {
  const r = await st.getWithMetadata(PLAN_KEY, { type: 'json' });
  return { doc: r ? r.data : { termine: JSON.parse(JSON.stringify(START_PLAN)) }, etag: r ? r.etag : null };
}
const nachZeit = (a, b) => (a.datum + a.start).localeCompare(b.datum + b.start);
// Noch nicht begonnen
function kommt(d, start) {
  const { datum, zeit } = jetztBerlin();
  return d > datum || (d === datum && zeit < start);
}
function geplante(kurse) {
  const out = [];
  for (const s of kurse) for (const d of PLAN[s.id] || []) out.push({ ...s, datum: d, key: `s/${d}_${s.id}` });
  return out.sort(nachZeit);
}
// Anmeldung offen: die nächsten 14 Tage, bis Stundenbeginn
function naechsteTermine() {
  const bis = plusTage(jetztBerlin().datum, ANMELDE_TAGE);
  return geplante(STUNDEN).filter((t) => kommt(t.datum, t.start) && t.datum <= bis);
}
function spaetereTermine() {
  const bis = plusTage(jetztBerlin().datum, ANMELDE_TAGE);
  return geplante(STUNDEN).filter((t) => t.datum > bis);
}
function vergangeneTermine(tage) {
  const von = plusTage(jetztBerlin().datum, -tage);
  return geplante(STUNDEN).filter((t) => !kommt(t.datum, t.start) && t.datum >= von);
}
function infoTermine() {
  return INFO_KURSE.map((k) => ({
    titel: k.titel, zeit: k.ende ? `${k.start}–${k.ende}` : k.start, zusatz: k.zusatz, link: k.link || '',
    termine: (PLAN[k.id] || []).filter((d) => kommt(d, k.start)).sort().slice(0, 8).map(datumText),
  })).filter((k) => k.termine.length);
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
async function aendern(st, key, fn, loader = lade) {
  for (let v = 0; v < 6; v++) {
    const { doc, etag } = await loader(st, key);
    const ergebnis = fn(doc);
    if (ergebnis && (ergebnis.fehler || ergebnis.unveraendert)) return ergebnis;
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
    mindest: MINDEST, bestaetigt: !!doc.bestaetigt, findetStatt: !doc.ausfall && (!!doc.bestaetigt || n >= MINDEST),
  };
  if (eigeneIds.length) {
    res.eigene = {};
    doc.eintraege.forEach((e, i) => {
      if (eigeneIds.includes(e.id)) res.eigene[e.id] = i < PLAETZE ? { status: 'platz' } : { status: 'warteliste', position: i - PLAETZE + 1 };
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
  let soll = process.env.ANMELDUNG_KEY || (typeof Netlify !== 'undefined' ? Netlify.env.get('ANMELDUNG_KEY') : '');
  if (!PRODUKTION) soll = VORSCHAU_SCHLUESSEL;
  const ist = req.headers.get('x-anmeldung-key') || '';
  return !!soll && soll.length >= 12 && ist === soll;
}

// ---------- Karten ----------
async function ladeKarten(st) {
  const r = await st.getWithMetadata(KARTEN_KEY, { type: 'json' });
  return { doc: r ? r.data : { karten: [] }, etag: r ? r.etag : null };
}
function plusMonate(datum, n) {
  const [y, m, d] = datum.split('-').map(Number);
  const z = new Date(Date.UTC(y, m - 1 + n, d));
  return z.toISOString().slice(0, 10);
}
const rest = (k) => k.stunden + k.buchungen.reduce((a, b) => a + b.delta, 0);
const neuerCode = (karten) => {
  for (;;) {
    const c = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => CODE_ZEICHEN[b % CODE_ZEICHEN.length]).join('');
    if (!karten.some((k) => k.code === c)) return c;
  }
};
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const datumDE = (d) => d.split('-').reverse().join('.');

// Hat die Stunde stattgefunden? Ausfall nein, bestätigt ja, sonst mindestens 5 inklusive aller späten Absagen
// (auch erlassene: Wer kurzfristig absagt, ändert nichts daran, dass die Stunde zustande kam)
function stattgefunden(doc) {
  if (doc.ausfall) return false;
  if (doc.bestaetigt) return true;
  const platz = Math.min(doc.eintraege.length, PLAETZE);
  return platz + doc.spaet.length >= MINDEST;
}
const begonnen = (t) => minutenBis(t.datum, t.start) <= 0;

// Bucht vergangene Stunden auf die Karten. Läuft wiederholbar: Buchungen einer Stunde
// werden neu berechnet, solange die Stunde gespeichert ist (28 Tage).
async function abrechnen(st) {
  const { blobs } = await st.list({ prefix: 's/' });
  const sitzungen = [];
  for (const b of blobs) {
    const t = terminAusKey(b.key);
    if (!t || !begonnen(t)) continue;
    const { doc } = await lade(st, b.key);
    const soll = [];
    if (stattgefunden(doc)) {
      doc.eintraege.slice(0, PLAETZE).forEach((e) => e.kartenId && soll.push({ kartenId: e.kartenId, eintrag: e.id, art: 'Teilnahme' }));
      doc.spaet.forEach((e) => e.kartenId && !e.erlassen && soll.push({ kartenId: e.kartenId, eintrag: e.id, art: 'Späte Absage' }));
    }
    sitzungen.push({ t, soll });
  }
  if (!sitzungen.length) return;
  await aendern(st, KARTEN_KEY, (doc) => {
    const vorher = JSON.stringify(doc.karten);
    for (const k of doc.karten) {
      for (const { t, soll } of sitzungen) {
        k.buchungen = k.buchungen.filter((b) => b.key !== t.key);
        soll.filter((x) => x.kartenId === k.id).forEach((x) =>
          k.buchungen.push({ key: t.key, datum: t.datum, titel: t.titel, art: x.art, delta: -1, eintrag: x.eintrag })
        );
      }
      k.buchungen.sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    }
    return JSON.stringify(doc.karten) === vorher ? { unveraendert: true } : { ok: true };
  }, ladeKarten);
}

function karteAdmin(k) {
  const heute = jetztBerlin().datum;
  return { id: k.id, name: k.name, typ: k.typ, code: k.code, stunden: k.stunden, gekauft: k.gekauft, gueltigBis: k.gueltigBis,
    abgelaufen: k.gueltigBis < heute, rest: rest(k), buchungen: k.buchungen };
}

export default async (req, context) => {
  const ctx = context?.deploy?.context;
  PRODUKTION = !ctx || ctx === 'production';
  const st = store();
  const url = new URL(req.url);
  PLAN = (await ladePlan(st)).doc.termine;

  if (req.method === 'GET') {
    if (url.searchParams.get('admin') === '1') {
      if (!istAdmin(req)) return json({ fehler: 'Schlüssel stimmt nicht.' }, 401);
      await abrechnen(st);
      const kartenDoc = (await ladeKarten(st)).doc;
      const restVon = (id) => { const k = id && kartenDoc.karten.find((x) => x.id === id); return k ? rest(k) : null; };
      const termine = [...naechsteTermine(), ...vergangeneTermine(14)];
      const liste = [];
      for (const t of termine) {
        const { doc } = await lade(st, t.key);
        liste.push({
          key: t.key, titel: t.titel, datum: t.datum, datumText: datumText(t.datum), zeit: `${t.start}–${t.ende}`,
          kommend: t.datum >= jetztBerlin().datum && naechsteTermine().some((x) => x.key === t.key),
          ausfall: !!doc.ausfall, bestaetigt: !!doc.bestaetigt, mindest: MINDEST, plaetze: PLAETZE,
          eintraege: doc.eintraege.map((e, i) => ({ id: e.id, name: e.name, art: e.art, ts: e.ts, warteliste: i >= PLAETZE, kartenRest: restVon(e.kartenId) })),
          spaet: doc.spaet.map((e) => ({ id: e.id, name: e.name, art: e.art, abgesagt: e.abgesagt, erlassen: !!e.erlassen })),
        });
      }
      return json({ termine: liste });
    }
    if (url.searchParams.get('karten') === '1') {
      if (!istAdmin(req)) return json({ fehler: 'Schlüssel stimmt nicht.' }, 401);
      await abrechnen(st);
      const grenze = plusMonate(jetztBerlin().datum, -KARTEN_LOESCHEN_MONATE);
      await aendern(st, KARTEN_KEY, (doc) => { doc.karten = doc.karten.filter((k) => k.gueltigBis >= grenze); return { ok: true }; }, ladeKarten);
      const { doc } = await ladeKarten(st);
      return json({ karten: doc.karten.map(karteAdmin).sort((a, b) => a.name.localeCompare(b.name, 'de')) });
    }
    if (url.searchParams.has('karte')) {
      const code = normCode(url.searchParams.get('karte'));
      if (code.length < 6) return json({ fehler: 'Bitte gib deinen Kartencode ein.' }, 400);
      await abrechnen(st);
      const k = (await ladeKarten(st)).doc.karten.find((x) => x.code === code);
      if (!k) return json({ fehler: 'Diesen Kartencode gibt es nicht. Schau noch einmal nach oder frag mich.' }, 404);
      const a = karteAdmin(k);
      return json({ vorname: k.name.split(' ')[0], typ: k.typ, stunden: k.stunden, rest: a.rest, gueltigBis: datumDE(k.gueltigBis), abgelaufen: a.abgelaufen,
        verlauf: k.buchungen.map((b) => ({ datum: b.datum ? datumText(b.datum) : '', titel: b.titel || b.notiz || 'Korrektur', art: b.art, delta: b.delta })) });
    }
    if (url.searchParams.get('plan') === '1') {
      if (!istAdmin(req)) return json({ fehler: 'Schlüssel stimmt nicht.' }, 401);
      const heute = jetztBerlin().datum;
      return json({ kurse: [...STUNDEN.map((s) => ({ ...s, anmeldung: true })), ...INFO_KURSE.map((s) => ({ ...s, anmeldung: false }))].map((s) => ({
        id: s.id, titel: s.titel, zeit: s.ende ? `${s.start}–${s.ende}` : s.start, anmeldung: s.anmeldung,
        termine: (PLAN[s.id] || []).filter((d) => d >= heute).sort().map((d) => ({ datum: d, text: datumText(d) })),
      })) });
    }
    const ids = (url.searchParams.get('ids') || '').split(',').filter((x) => /^[a-f0-9]{16}$/.test(x)).slice(0, 20);
    const out = [];
    for (const t of naechsteTermine()) out.push(oeffentlich(t, (await lade(st, t.key)).doc, ids));
    const spaeter = spaetereTermine().map((t) => ({ datumText: datumText(t.datum), titel: t.titel, zeit: `${t.start}–${t.ende}` }));
    return json({ termine: out, spaeter, info: infoTermine() });
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
    let art = ARTEN.includes(body.art) ? body.art : '';
    if (!art) return json({ fehler: 'Bitte wähl aus, wie du teilnimmst.' }, 400);
    let karte = null;
    if (art === 'Karte') {
      const code = normCode(body.code);
      karte = (await ladeKarten(st)).doc.karten.find((x) => x.code === code);
      if (!karte) return json({ fehler: 'Diesen Kartencode gibt es nicht. Schau noch einmal nach oder frag mich in der WhatsApp-Gruppe.' }, 400);
      art = `${karte.typ}-Karte`;
    }
    const id = zufall(8), token = zufall(16), tokenHash = await sha(token);
    const r = await aendern(st, t.key, (doc) => {
      if (doc.ausfall) return { fehler: 'Diese Stunde fällt aus.' };
      if (doc.eintraege.length >= PLAETZE + 30) return { fehler: 'Die Warteliste ist voll.' };
      if (karte && doc.eintraege.some((e) => e.kartenId === karte.id)) return { fehler: 'Mit dieser Karte bist du für diese Stunde schon eingetragen.' };
      doc.eintraege.push({ id, name, art, ts: new Date().toISOString(), tokenHash, ...(karte ? { kartenId: karte.id } : {}) });
      const i = doc.eintraege.length - 1;
      return i < PLAETZE ? { status: 'platz' } : { status: 'warteliste', position: i - PLAETZE + 1 };
    });
    if (r.fehler) return json(r, 409);
    if (Math.random() < 0.1) aufraeumen(st).catch(() => {});
    let kartenInfo = {};
    if (karte) {
      await abrechnen(st).catch(() => {});
      const k = (await ladeKarten(st)).doc.karten.find((x) => x.id === karte.id);
      kartenInfo = { kartenRest: rest(k), kartenAbgelaufen: k.gueltigBis < jetztBerlin().datum };
    }
    return json({ ok: true, id, token, key: t.key, ...r, ...kartenInfo });
  }

  if (body.action === 'abmelden') {
    const tb = terminAusKey(String(body.key || ''));
    if (tb && begonnen(tb)) return json({ fehler: 'Die Stunde hat schon begonnen.' }, 409);
    const tokenHash = await sha(String(body.token || ''));
    const r = await aendern(st, String(body.key || ''), (doc) => {
      const i = doc.eintraege.findIndex((e) => e.id === body.id && e.tokenHash === tokenHash);
      if (i < 0) return { fehler: 'Anmeldung nicht gefunden.' };
      const t = terminAusKey(String(body.key || ''));
      const [e] = doc.eintraege.splice(i, 1);
      // Späte Absage: nur wer einen Platz hatte, nicht bei ausgefallener Stunde
      const fenster = !!t && imFristfenster(t);
      // Auch wer im Fristfenster nachgerückt ist, sagt kostenpflichtig ab
      const spaet = fenster && i < PLAETZE && !doc.ausfall;
      if (spaet) doc.spaet.push({ id: e.id, name: e.name, art: e.art, abgesagt: new Date().toISOString(), ...(e.kartenId ? { kartenId: e.kartenId } : {}) });
      return { ok: true, spaet };
    });
    return json(r, r.fehler ? 404 : 200);
  }

  // Ab hier nur mit Schlüssel
  if (!istAdmin(req)) return json({ fehler: 'Schlüssel stimmt nicht.' }, 401);

  if (body.action === 'karte_neu') {
    const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const typ = KARTEN[body.typ] ? body.typ : '';
    const gekauft = /^\d{4}-\d{2}-\d{2}$/.test(body.gekauft || '') ? body.gekauft : jetztBerlin().datum;
    const genutzt = Math.max(0, Math.min(KARTEN[typ]?.stunden || 0, parseInt(body.genutzt, 10) || 0));
    if (name.length < 2 || !typ) return json({ fehler: 'Bitte Name und Kartenart angeben.' }, 400);
    let neu;
    const r = await aendern(st, KARTEN_KEY, (doc) => {
      neu = { id: zufall(8), code: neuerCode(doc.karten), name, typ, stunden: KARTEN[typ].stunden, gekauft,
        gueltigBis: plusMonate(gekauft, KARTEN[typ].monate), buchungen: [] };
      if (genutzt) neu.buchungen.push({ datum: gekauft, notiz: 'Übertrag, bereits genutzt', art: 'Korrektur', delta: -genutzt });
      doc.karten.push(neu);
      return { ok: true };
    }, ladeKarten);
    return r.fehler ? json(r, 409) : json({ ok: true, karte: karteAdmin(neu) });
  }
  if (body.action === 'karte_buchung') {
    const delta = parseInt(body.delta, 10);
    if (![-1, 1].includes(delta)) return json({ fehler: 'Ungültige Korrektur.' }, 400);
    const r = await aendern(st, KARTEN_KEY, (doc) => {
      const k = doc.karten.find((x) => x.id === body.kartenId);
      if (!k) return { fehler: 'Karte nicht gefunden.' };
      k.buchungen.push({ datum: jetztBerlin().datum, notiz: String(body.notiz || '').slice(0, 80) || (delta < 0 ? 'Stunde ohne Anmeldung' : 'Korrektur'), art: 'Korrektur', delta });
      return { ok: true };
    }, ladeKarten);
    return json(r, r.fehler ? 404 : 200);
  }
  if (body.action === 'karte_loeschen') {
    const r = await aendern(st, KARTEN_KEY, (doc) => {
      const n = doc.karten.length;
      doc.karten = doc.karten.filter((x) => x.id !== body.kartenId);
      return n === doc.karten.length ? { fehler: 'Karte nicht gefunden.' } : { ok: true };
    }, ladeKarten);
    return json(r, r.fehler ? 404 : 200);
  }
  if (body.action === 'plan_dazu' || body.action === 'plan_weg') {
    const kurs = [...STUNDEN, ...INFO_KURSE].find((x) => x.id === body.id);
    const d = String(body.datum || '');
    if (!kurs || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return json({ fehler: 'Bitte Kurs und Datum angeben.' }, 400);
    if (body.action === 'plan_weg' && STUNDEN.includes(kurs)) {
      const { doc } = await lade(st, `s/${d}_${kurs.id}`);
      if (doc.eintraege.length) return json({ fehler: 'Für diesen Termin sind schon Leute eingetragen. Markier die Stunde in der Anmeldeliste als ausgefallen, dann sehen alle, dass sie nicht stattfindet.' }, 409);
    }
    const grenze = plusTage(jetztBerlin().datum, -30);
    const r = await aendern(st, PLAN_KEY, (doc) => {
      const l = new Set(doc.termine[kurs.id] || []);
      if (body.action === 'plan_dazu') l.add(d); else l.delete(d);
      doc.termine[kurs.id] = [...l].filter((x) => x >= grenze).sort();
      return { ok: true };
    }, ladePlan);
    return json(r, r.fehler ? 409 : 200);
  }
  const key = String(body.key || '');
  if (!/^s\/\d{4}-\d{2}-\d{2}_[a-z0-9]+$/.test(key)) return json({ fehler: 'Unbekannte Stunde.' }, 400);
  if (body.action === 'ausfall') {
    const r = await aendern(st, key, (doc) => { doc.ausfall = !!body.wert; if (doc.ausfall) doc.bestaetigt = false; return { ok: true }; });
    return json(r, r.fehler ? 409 : 200);
  }
  if (body.action === 'bestaetigen') {
    const r = await aendern(st, key, (doc) => { doc.bestaetigt = !!body.wert; if (doc.bestaetigt) doc.ausfall = false; return { ok: true }; });
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
