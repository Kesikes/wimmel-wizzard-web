// api/_lib/gutschein.js — NEU (Cowork-Auftrag "Paket 1: Gutscheine verkaufen", Teil A, 18.10.2026).
//
// Datenmodell und Statuswechsel für Gutscheine, auf dem vorhandenen Upstash-Redis (api/_lib/kv.js,
// reines fetch(), kein npm-Paket).
//
//   Hash   gutschein:{code}                    alle Felder des Gutscheins, OHNE TTL
//   Set    gutscheine:alle                     alle Codes
//   Set    gutscheine:by_stichtag:{YYYY-MM-DD} Codes je Erstattungsstichtag (für den Batch in Paket 3)
//   Set    gutscheine:by_quelle:{quelle}       Codes je Verkaufsquelle (Auftrag Abschnitt I)
//   Set    gutscheine:by_konto:{konto_id}      ab Einlösung (Paket 2)
//   Set    gutscheine:erstattung_fehler        Codes, deren Erstattung schiefging (Paket 3)
//   Set    gutscheine:zustellung_offen         Codes mit Wunschdatum, Mail 2 noch nicht raus (Cron, Teil E)
//   String gutschein:by_session:{stripe_session_id} -> code  (Danke-Seite fragt damit nach)
//
// STATUSWECHSEL laufen AUSSCHLIESSLICH über setzeStatus(code, von, nach). Erlaubt sind genau:
//   gekauft -> widerrufen | erstattet | eingeloest
//   eingeloest -> produziert
//   produziert -> versandt
// Alles andere wird abgelehnt und geloggt. Der Wechsel selbst ist ATOMAR: ein Lua-Skript prüft den
// Ist-Status und setzt den neuen in einem Schritt (Upstash EVAL über die REST-API). Zwei
// gleichzeitige Aufrufe können den Gutschein also nicht doppelt einlösen oder doppelt erstatten —
// der zweite sieht den geänderten Status und scheitert. Kein Client schreibt je einen Status.
//
// TESTBARKEIT: mitKv(kvCommand) baut das Modul auf einer beliebigen kvCommand-Funktion auf. Die
// Tests (test/gutschein.test.js) nutzen den In-Memory-Mock aus test/kv-mock.js; der Standard-Export
// unten hängt am echten Upstash-Client.
const crypto = require("crypto");
const cfg = require("./gutschein-config");

// Code-Format WW-XXXX-XXXX. Alphabet ohne 0/O/1/I/L (Briefing Abschnitt 6): nichts, was man am
// Telefon oder auf dem Ausdruck verwechseln kann.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = /^WW-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

const STATUS = ["gekauft", "eingeloest", "produziert", "versandt", "erstattet", "widerrufen"];
const UEBERGAENGE = {
  gekauft: ["widerrufen", "erstattet", "eingeloest"],
  eingeloest: ["produziert"],
  produziert: ["versandt"],
  versandt: [],
  erstattet: [],
  widerrufen: [],
};
// Welches Zeitstempel-Feld der jeweilige Zielstatus setzt.
const ZEITFELD = { eingeloest: "eingeloest_am", produziert: "produziert_am", versandt: "versandt_am", erstattet: "erstattet_am", widerrufen: "widerrufen_am" };

// Das Lua-Skript: KEYS[1] = Hash, ARGV[1] = erwarteter Ist-Status, ARGV[2] = neuer Status,
// ARGV[3] = Zeitstempel-Feld, ARGV[4] = Zeitstempel. Rückgabe {1, neu} bei Erfolg, {0, ist} sonst
// (ist = "" wenn der Gutschein nicht existiert).
const SKRIPT_STATUS = [
  "local ist = redis.call('HGET', KEYS[1], 'status')",
  "if not ist then return {0, ''} end",
  "if ist ~= ARGV[1] then return {0, ist} end",
  "redis.call('HSET', KEYS[1], 'status', ARGV[2], ARGV[3], ARGV[4])",
  "return {1, ARGV[2]}",
].join("\n");

// neuerCode(): kryptografisch zufällig (crypto.randomInt, gleichverteilt über das Alphabet).
function neuerCode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return "WW-" + s.slice(0, 4) + "-" + s.slice(4);
}

// normalisiereCode(eingabe) -> "WW-XXXX-XXXX" oder null, wenn aus der Eingabe kein Code wird.
// Tolerant (Auftrag Abschnitt A): Kleinbuchstaben, fehlende Bindestriche, Leerzeichen, O->0,
// I/L->1. Hinweis: 0 und 1 kommen im Alphabet nicht vor — die Abbildung macht die Eingabe also
// nie "gültiger", sie ist nur die bestellte Toleranzregel und schadet nicht. Ein fehlendes "WW"
// wird ergänzt (die Kundin tippt vielleicht nur den hinteren Teil ab).
function normalisiereCode(eingabe) {
  let s = String(eingabe || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  s = s.replace(/O/g, "0").replace(/[IL]/g, "1");
  if (s.startsWith("WW") && s.length === 10) s = s.slice(2);
  if (s.length !== 8) return null;
  const code = "WW-" + s.slice(0, 4) + "-" + s.slice(4);
  return CODE_RE.test(code) ? code : null;
}

function istCode(code) { return typeof code === "string" && CODE_RE.test(code); }

function key(code) { return "gutschein:" + code; }

// Redis-Hashes speichern nur Strings. Verschachtelte Felder (einwilligung, erinnerungen) liegen als
// JSON-String; Zahlenfelder (*_cent) kommen als Zahl zurück.
const JSON_FELDER = ["einwilligung", "erinnerungen"];
const ZAHL_FELDER = ["wert_cent", "restwert_cent", "bezahlt_cent", "rabatt_cent"];
function hashZuObjekt(roh) {
  if (!roh) return null;
  let paare = {};
  if (Array.isArray(roh)) {
    // Upstash liefert HGETALL als flache Liste [feld, wert, feld, wert, ...]
    for (let i = 0; i + 1 < roh.length; i += 2) paare[roh[i]] = roh[i + 1];
  } else if (typeof roh === "object") {
    paare = roh;
  }
  if (!Object.keys(paare).length) return null;
  const g = {};
  for (const [k, v] of Object.entries(paare)) {
    if (JSON_FELDER.includes(k)) { try { g[k] = JSON.parse(v); } catch (e) { g[k] = null; } }
    else if (ZAHL_FELDER.includes(k)) g[k] = Number(v);
    else g[k] = v;
  }
  return g;
}
function objektZuPaare(obj) {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out.push(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return out;
}

function mitKv(kvCommand) {
  // lesen(code) -> Gutschein-Objekt oder null.
  async function lesen(code) {
    if (!istCode(code)) return null;
    return hashZuObjekt(await kvCommand(["hgetall", key(code)]));
  }

  // anlegen(felder): erzeugt einen neuen Gutschein im Status "gekauft". Der Code wird HIER
  // erzeugt (nie im Client), die Eindeutigkeit sichert HSETNX auf dem Feld "code": gibt es den
  // Hash schon, wird ein neuer Code gewürfelt (praktisch nie: 31^8 ≈ 850 Milliarden Möglichkeiten).
  // Pflicht: produkt, kaeufer_email, gekauft_am (ISO-Zeitpunkt), stripe_session_id. Fristen werden
  // aus gekauft_am berechnet, nicht übergeben. Gibt den fertigen Gutschein zurück.
  async function anlegen(felder) {
    const produkt = cfg.PRODUKTE[felder.produkt];
    if (!produkt) throw new Error("anlegen: unbekanntes Produkt " + felder.produkt);
    if (!felder.kaeufer_email) throw new Error("anlegen: kaeufer_email fehlt");
    if (!felder.stripe_session_id) throw new Error("anlegen: stripe_session_id fehlt");
    const gekauftAm = felder.gekauft_am || new Date().toISOString();
    const kaufTag = cfg.berlinDatum(gekauftAm);
    const frist = cfg.einloesefrist(kaufTag);
    const stichtag = cfg.erstattungsstichtag(frist);
    const quelle = cfg.quelleNormalisieren(felder.quelle);
    const bezahlt = Number.isFinite(Number(felder.bezahlt_cent)) ? Number(felder.bezahlt_cent) : produkt.wert_cent;

    let code = null;
    for (let versuch = 0; versuch < 5; versuch++) {
      const kandidat = neuerCode();
      const neu = await kvCommand(["hsetnx", key(kandidat), "code", kandidat]);
      if (Number(neu) === 1) { code = kandidat; break; }
    }
    if (!code) throw new Error("anlegen: kein freier Code nach 5 Versuchen");

    const g = {
      code,
      status: "gekauft",
      produkt: produkt.id,
      wert_cent: produkt.wert_cent,            // voller Produktwert, auch bei Rabatt (Auftrag J2)
      restwert_cent: produkt.wert_cent,
      bezahlt_cent: bezahlt,                   // amount_total der Session — Grundlage JEDER Erstattung
      rabatt_code: felder.rabatt_code || "",
      rabatt_cent: Number(felder.rabatt_cent) || 0,
      kaeufer_email: String(felder.kaeufer_email).trim().toLowerCase(),
      kaeufer_name: felder.kaeufer_name || "",
      empfaenger_name: felder.empfaenger_name || "",
      empfaenger_email: felder.empfaenger_email || "",
      widmung: String(felder.widmung || "").slice(0, cfg.WIDMUNG_MAX_ZEICHEN),
      versand_an: felder.versand_an === "empfaengerin" ? "empfaengerin" : "mich",
      versand_datum: felder.versand_datum || "",
      versand_mail2_am: "",
      stripe_session_id: felder.stripe_session_id,
      stripe_payment_intent: felder.stripe_payment_intent || "",
      stripe_charge: felder.stripe_charge || "",
      stripe_event_id: felder.stripe_event_id || "",
      gekauft_am: gekauftAm,
      einloesefrist: frist,
      erstattungsstichtag: stichtag,
      konto_id: "",
      eingeloest_am: "",
      einwilligung: null,
      erinnerungen: { m3: "", w2: "" },
      peecho_order_id: "",
      tracking: "",
      erstattet_am: "",
      widerrufen_am: "",
      stripe_refund: "",
      quelle,
      mail1_am: "",
    };
    await kvCommand(["hset", key(code)].concat(objektZuPaare(g)));
    await kvCommand(["sadd", "gutscheine:alle", code]);
    await kvCommand(["sadd", "gutscheine:by_stichtag:" + stichtag, code]);
    await kvCommand(["sadd", "gutscheine:by_quelle:" + quelle, code]);
    await kvCommand(["set", "gutschein:by_session:" + felder.stripe_session_id, code]);
    if (g.versand_an === "empfaengerin" && g.empfaenger_email) {
      await kvCommand(["sadd", "gutscheine:zustellung_offen", code]);
    }
    return g;
  }

  // feldSetzen(code, felder): Nicht-Status-Felder nachtragen (Zeitstempel, Stripe-IDs, Mails).
  // Das Feld "status" ist hier VERBOTEN — dafür gibt es nur setzeStatus().
  async function feldSetzen(code, felder) {
    if (!istCode(code)) throw new Error("feldSetzen: ungültiger Code");
    if (Object.prototype.hasOwnProperty.call(felder, "status")) throw new Error("feldSetzen: status nur über setzeStatus()");
    const paare = objektZuPaare(felder);
    if (!paare.length) return;
    await kvCommand(["hset", key(code)].concat(paare));
  }

  // setzeStatus(code, von, nach) -> { ok: true, status } oder { ok: false, grund, status }.
  // DIE einzige Stelle für Statuswechsel, siehe Kopfkommentar.
  async function setzeStatus(code, von, nach) {
    const ablehnen = (grund, ist) => {
      try { console.warn("[gutschein] Statuswechsel abgelehnt: " + code + " " + von + " -> " + nach + " (" + grund + (ist ? ", ist: " + ist : "") + ")"); } catch (e) { /* egal */ }
      return { ok: false, grund, status: ist || null };
    };
    if (!istCode(code)) return ablehnen("ungültiger Code");
    if (!STATUS.includes(von) || !STATUS.includes(nach)) return ablehnen("unbekannter Status");
    if (!UEBERGAENGE[von].includes(nach)) return ablehnen("Übergang nicht erlaubt");
    const jetzt = new Date().toISOString();
    const res = await kvCommand(["eval", SKRIPT_STATUS, "1", key(code), von, nach, ZEITFELD[nach], jetzt]);
    const [erfolg, status] = Array.isArray(res) ? res : [0, ""];
    if (Number(erfolg) === 1) return { ok: true, status: nach, zeit: jetzt };
    if (!status) return ablehnen("Gutschein existiert nicht");
    return ablehnen("Ist-Status weicht ab", status);
  }

  // codeZuSession(sessionId) -> Code oder null (für die Danke-Seite).
  async function codeZuSession(sessionId) {
    if (!sessionId || typeof sessionId !== "string") return null;
    const code = await kvCommand(["get", "gutschein:by_session:" + sessionId]);
    return istCode(code) ? code : null;
  }

  return { lesen, anlegen, feldSetzen, setzeStatus, codeZuSession };
}

module.exports = Object.assign(
  mitKv((parts) => require("./kv").kvCommand(parts)),
  { mitKv, neuerCode, normalisiereCode, istCode, key, ALPHABET, STATUS, UEBERGAENGE, SKRIPT_STATUS, hashZuObjekt }
);
