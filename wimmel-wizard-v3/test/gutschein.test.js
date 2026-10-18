// test/gutschein.test.js — Teil A: Datenmodell, Code, Statuswechsel. Läuft mit Node allein:
//   cd wimmel-wizard-v3 && node --test test/
const test = require("node:test");
const assert = require("node:assert/strict");
const { neuerKvMock } = require("./kv-mock");
const G = require("../api/_lib/gutschein");
const cfg = require("../api/_lib/gutschein-config");

function modul() { const kv = neuerKvMock(); return { kv, g: G.mitKv(kv) }; }
const BASIS = { produkt: "buch", kaeufer_email: "Oma@Example.de", kaeufer_name: "Oma", stripe_session_id: "cs_test_1", gekauft_am: "2026-11-05T10:00:00.000Z" };

test("Code-Format und Alphabet", () => {
  for (let i = 0; i < 200; i++) {
    const c = G.neuerCode();
    assert.match(c, /^WW-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.doesNotMatch(c, /[0O1IL]/);
  }
  assert.equal(G.ALPHABET.length, 31);
});

test("Code-Eingabe tolerant", () => {
  assert.equal(G.normalisiereCode("ww-ab2c-d3ef"), "WW-AB2C-D3EF");
  assert.equal(G.normalisiereCode("WWAB2CD3EF"), "WW-AB2C-D3EF");
  assert.equal(G.normalisiereCode(" ab2c d3ef "), "WW-AB2C-D3EF");
  assert.equal(G.normalisiereCode("AB2C-D3EF"), "WW-AB2C-D3EF");
  // O/I/L werden zu 0/1 — die kommen im Alphabet nicht vor, das Ergebnis ist dann ungültig
  assert.equal(G.normalisiereCode("WW-ABOC-D3EF"), null);
  assert.equal(G.normalisiereCode("WW-AB2C-D3E"), null);
  assert.equal(G.normalisiereCode(""), null);
  assert.equal(G.normalisiereCode(null), null);
});

test("Fristen: +12 Monate, Stichtag 1. des Folgemonats, Widerruf 14+2 Tage", () => {
  assert.equal(cfg.einloesefrist("2026-11-05"), "2027-11-05");
  assert.equal(cfg.einloesefrist("2026-12-31"), "2027-12-31");
  assert.equal(cfg.einloesefrist("2028-02-29"), "2029-02-28");
  assert.equal(cfg.erstattungsstichtag("2027-11-05"), "2027-12-01");
  assert.equal(cfg.erstattungsstichtag("2027-12-31"), "2028-01-01");
  assert.equal(cfg.widerrufAblauf("2026-11-05"), "2026-11-21");
  assert.equal(cfg.widerrufAblauf("2026-12-20"), "2027-01-05");
  assert.equal(cfg.datumDeutsch("2027-11-05"), "05.11.2027");
  assert.equal(cfg.euro(2990), "29,90 €");
  assert.equal(cfg.euro(4990), "49,90 €");
});

test("anlegen: Hash, Fristen, Indizes, Quelle", async () => {
  const { kv, g } = modul();
  const neu = await g.anlegen(Object.assign({}, BASIS, { quelle: "pinterest", widmung: "x".repeat(300) }));
  assert.match(neu.code, /^WW-/);
  assert.equal(neu.status, "gekauft");
  assert.equal(neu.wert_cent, 4990);
  assert.equal(neu.bezahlt_cent, 4990);
  assert.equal(neu.kaeufer_email, "oma@example.de");
  assert.equal(neu.einloesefrist, "2027-11-05");
  assert.equal(neu.erstattungsstichtag, "2027-12-01");
  assert.equal(neu.widmung.length, 200);
  const gelesen = await g.lesen(neu.code);
  assert.equal(gelesen.status, "gekauft");
  assert.equal(gelesen.wert_cent, 4990);
  assert.deepEqual(gelesen.erinnerungen, { m3: "", w2: "" });
  assert.equal(await kv(["sismember", "gutscheine:alle", neu.code]), 1);
  assert.equal(await kv(["sismember", "gutscheine:by_stichtag:2027-12-01", neu.code]), 1);
  assert.equal(await kv(["sismember", "gutscheine:by_quelle:pinterest", neu.code]), 1);
  assert.equal(await kv(["sismember", "gutscheine:zustellung_offen", neu.code]), 0);
  assert.equal(await g.codeZuSession("cs_test_1"), neu.code);
  assert.equal(await kv(["ttl", "gutschein:" + neu.code]), -1, "Hash ohne TTL");
});

test("anlegen: unbekannte Quelle wird direkt, Rabatt bleibt getrennt vom Wert", async () => {
  const { kv, g } = modul();
  const neu = await g.anlegen(Object.assign({}, BASIS, { produkt: "heft", quelle: "tiktok", bezahlt_cent: 1990, rabatt_code: "TEST10", rabatt_cent: 1000 }));
  assert.equal(neu.quelle, "direkt");
  assert.equal(neu.wert_cent, 2990);
  assert.equal(neu.bezahlt_cent, 1990);
  assert.equal(neu.rabatt_code, "TEST10");
  assert.equal(await kv(["sismember", "gutscheine:by_quelle:direkt", neu.code]), 1);
});

test("anlegen: Zustellung an Empfängerin landet in zustellung_offen", async () => {
  const { kv, g } = modul();
  const neu = await g.anlegen(Object.assign({}, BASIS, { versand_an: "empfaengerin", empfaenger_email: "kind@example.de", versand_datum: "2026-12-24" }));
  assert.equal(await kv(["sismember", "gutscheine:zustellung_offen", neu.code]), 1);
});

test("anlegen: Pflichtfelder", async () => {
  const { g } = modul();
  await assert.rejects(() => g.anlegen({ produkt: "poster", kaeufer_email: "a@b.de", stripe_session_id: "x" }), /unbekanntes Produkt/);
  await assert.rejects(() => g.anlegen({ produkt: "buch", stripe_session_id: "x" }), /kaeufer_email/);
  await assert.rejects(() => g.anlegen({ produkt: "buch", kaeufer_email: "a@b.de" }), /stripe_session_id/);
});

test("anlegen: Code-Kollision wird neu gewürfelt", async () => {
  const { kv, g } = modul();
  const erster = await g.anlegen(BASIS);
  // Kollision erzwingen: HSETNX meldet für den ersten Versuch "existiert schon" (0).
  let abgelehnt = 0;
  const echt = kv;
  const kvMitKollision = async (parts) => {
    if (parts[0] === "hsetnx" && abgelehnt < 2) { abgelehnt++; return 0; }
    return echt(parts);
  };
  const g2 = G.mitKv(kvMitKollision);
  const zweiter = await g2.anlegen(Object.assign({}, BASIS, { stripe_session_id: "cs_2" }));
  assert.equal(abgelehnt, 2, "zwei Kollisionen überstanden");
  assert.notEqual(zweiter.code, erster.code);
  // Dauerkollision -> klarer Fehler statt Endlosschleife
  const immerBelegt = G.mitKv(async (parts) => (parts[0] === "hsetnx" ? 0 : echt(parts)));
  await assert.rejects(() => immerBelegt.anlegen(Object.assign({}, BASIS, { stripe_session_id: "cs_3" })), /kein freier Code/);
  // 100 Gutscheine, 100 verschiedene Codes
  const codes = new Set([erster.code, zweiter.code]);
  for (let i = 0; i < 100; i++) codes.add((await g.anlegen(Object.assign({}, BASIS, { stripe_session_id: "cs_" + i }))).code);
  assert.equal(codes.size, 102);
  assert.equal(await kv(["scard", "gutscheine:alle"]), 102);
});

test("setzeStatus: erlaubte Übergänge", async () => {
  const { g } = modul();
  const a = await g.anlegen(BASIS);
  assert.equal((await g.setzeStatus(a.code, "gekauft", "eingeloest")).ok, true);
  assert.equal((await g.lesen(a.code)).status, "eingeloest");
  assert.ok((await g.lesen(a.code)).eingeloest_am);
  assert.equal((await g.setzeStatus(a.code, "eingeloest", "produziert")).ok, true);
  assert.equal((await g.setzeStatus(a.code, "produziert", "versandt")).ok, true);
  const b = await g.anlegen(Object.assign({}, BASIS, { stripe_session_id: "cs_b" }));
  assert.equal((await g.setzeStatus(b.code, "gekauft", "widerrufen")).ok, true);
  assert.ok((await g.lesen(b.code)).widerrufen_am);
  const c = await g.anlegen(Object.assign({}, BASIS, { stripe_session_id: "cs_c" }));
  assert.equal((await g.setzeStatus(c.code, "gekauft", "erstattet")).ok, true);
});

test("setzeStatus: alles andere wird abgelehnt", async () => {
  const { g } = modul();
  const a = await g.anlegen(BASIS);
  const vorher = console.warn; const logs = []; console.warn = (m) => logs.push(m);
  try {
    assert.equal((await g.setzeStatus(a.code, "gekauft", "produziert")).ok, false);
    assert.equal((await g.setzeStatus(a.code, "gekauft", "versandt")).ok, false);
    assert.equal((await g.setzeStatus(a.code, "eingeloest", "produziert")).ok, false, "Ist-Status ist gekauft");
    assert.equal((await g.setzeStatus(a.code, "gekauft", "unsinn")).ok, false);
    assert.equal((await g.setzeStatus("WW-AAAA-AAAA", "gekauft", "eingeloest")).ok, false, "existiert nicht");
    assert.equal((await g.setzeStatus("kaputt", "gekauft", "eingeloest")).ok, false);
    assert.equal((await g.lesen(a.code)).status, "gekauft", "nichts verändert");
    assert.ok(logs.length >= 6, "jede Ablehnung wird geloggt");
  } finally { console.warn = vorher; }
  // Nach Widerruf geht nichts mehr — auch keine Erstattung (die wäre doppelt)
  await g.setzeStatus(a.code, "gekauft", "widerrufen");
  assert.equal((await g.setzeStatus(a.code, "widerrufen", "erstattet")).ok, false);
  assert.equal((await g.setzeStatus(a.code, "gekauft", "erstattet")).ok, false);
  assert.equal((await g.setzeStatus(a.code, "widerrufen", "gekauft")).ok, false, "kein Weg zurück");
});

test("setzeStatus: doppelter Aufruf — nur der erste gewinnt", async () => {
  const { g } = modul();
  const a = await g.anlegen(BASIS);
  const vorher = console.warn; console.warn = () => {};
  try {
    const [r1, r2] = await Promise.all([
      g.setzeStatus(a.code, "gekauft", "eingeloest"),
      g.setzeStatus(a.code, "gekauft", "eingeloest"),
    ]);
    assert.equal([r1.ok, r2.ok].filter(Boolean).length, 1);
    const r3 = await g.setzeStatus(a.code, "gekauft", "erstattet");
    assert.equal(r3.ok, false);
    assert.equal(r3.status, "eingeloest");
  } finally { console.warn = vorher; }
});

test("feldSetzen: Status ist tabu", async () => {
  const { g } = modul();
  const a = await g.anlegen(BASIS);
  await g.feldSetzen(a.code, { stripe_charge: "ch_1", mail1_am: "2026-11-05T10:01:00.000Z" });
  assert.equal((await g.lesen(a.code)).stripe_charge, "ch_1");
  await assert.rejects(() => g.feldSetzen(a.code, { status: "versandt" }), /nur über setzeStatus/);
});

test("hashZuObjekt: Upstash-Liste und Objekt", () => {
  const a = G.hashZuObjekt(["code", "WW-AAAA-AAAA", "wert_cent", "2990", "erinnerungen", "{\"m3\":\"\"}"]);
  assert.equal(a.wert_cent, 2990);
  assert.deepEqual(a.erinnerungen, { m3: "" });
  assert.equal(G.hashZuObjekt([]), null);
  assert.equal(G.hashZuObjekt(null), null);
  assert.equal(G.hashZuObjekt({ code: "x", bezahlt_cent: "1" }).bezahlt_cent, 1);
});

test("Livemodus-Schalter: ohne echte Rechtstexte bleibt es Testmodus", async () => {
  const alt = process.env.STRIPE_MODUS;
  process.env.STRIPE_MODUS = "live";
  try {
    // process.cwd() ist beim Testlauf der App-Ordner: public/rechts/*.html enthalten Platzhalter
    // -> nicht fertig -> test. (Sobald Matthias echte Texte einsetzt, kippt dieser Test bewusst.)
    const st = await cfg.rechtsseitenStatus();
    assert.deepEqual(Object.keys(st).sort(), ["agb", "datenschutz", "impressum", "widerrufsbelehrung"]);
    if (!(await cfg.rechtsseitenFertig())) assert.equal(await cfg.stripeModus(), "test");
  } finally { if (alt === undefined) delete process.env.STRIPE_MODUS; else process.env.STRIPE_MODUS = alt; }
  process.env.STRIPE_MODUS = "test";
  assert.equal(await cfg.stripeModus(), "test");
  const s = await cfg.stripeSchluessel();
  assert.equal(s.modus, "test");
  delete process.env.STRIPE_MODUS;
});
