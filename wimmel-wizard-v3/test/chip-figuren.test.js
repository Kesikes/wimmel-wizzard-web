// test/chip-figuren.test.js — Auftrag 3 Teil 5 (Vorbereitung): Schluessel-Normalisierung und
// Abgleich des Wertevorrats mit den Chip-Listen in charakter.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const C = require("../api/_lib/chip-figuren");

// Chip-Figuren v2 (19.10.2026): alle Listen in public/js/chips.js, Server und Client nutzen dieselbe Datei.
const CH = require("../public/js/chips.js");

test("eine Datei fuer Client und Server: chips.js laeuft im Browser-Modus und in Node", () => {
  const q = fs.readFileSync(path.join(__dirname, "..", "public", "js", "chips.js"), "utf8");
  const fenster = {};
  vm.runInNewContext(q, { window: fenster });
  assert.equal(fenster.CHIPS.VERSION, CH.VERSION);
  assert.equal(JSON.stringify(fenster.CHIPS.kombinationen()), JSON.stringify(CH.kombinationen()));
  assert.equal(C.CHIPS, CH, "Server-Modul nutzt dieselbe Datei");
  const app = fs.readFileSync(path.join(__dirname, "..", "public", "app.html"), "utf8");
  assert.ok(app.indexOf("/js/chips.js") < app.indexOf("/js/pipeline.js"), "chips.js vor pipeline.js geladen");
});

test("Listen laut Auftrag v3 (20.10.2026)", () => {
  const l = (xs) => xs.map((x) => x.label);
  assert.deepEqual(l(CH.haarfarben("girl")), ["Blond", "Hellbraun", "Dunkelbraun", "Schwarz", "Rot"]);
  assert.deepEqual(l(CH.haarfarben("woman")), ["Blond", "Hellbraun", "Dunkelbraun", "Schwarz", "Rot", "Grau/Weiß"]);
  assert.deepEqual(l(CH.haarfarben("grandfather")), ["Blond", "Hellbraun", "Dunkelbraun", "Schwarz", "Rot", "Grau/Weiß"]);
  assert.deepEqual(l(CH.HAARSTRUKTUR), ["Glatt", "Lockig", "Kraus"]);
  assert.deepEqual(l(CH.haarlaengen("girl")), ["Kurz", "Mittel", "Lang"]);
  assert.deepEqual(l(CH.haarlaengen("man")), ["Kurz", "Mittel", "Lang", "Glatze"]);
  assert.deepEqual(l(CH.FRISUR), ["Offen", "Pferdeschwanz", "Zöpfe", "Dutt"]);
  assert.deepEqual(CH.FRISUR.map((x) => x.en), ["loose hair", "ponytail", "two braids", "hair bun"]);
  assert.equal(CH.frisurMoeglich("mittel") && CH.frisurMoeglich("lang") && !CH.frisurMoeglich("kurz") && !CH.frisurMoeglich("glatze"), true);
  assert.deepEqual(l(CH.BART), ["Kein Bart", "Dreitagebart", "Schnauzer", "Vollbart"]);
  assert.equal(CH.hatBart("man") && CH.hatBart("grandfather") && !CH.hatBart("woman") && !CH.hatBart("boy"), true);
  assert.equal(CH.bartEn("vollbart", "grau"), "full gray/white beard");
  assert.equal(CH.bartEn("kein", "rot"), "clean-shaven");
  assert.deepEqual(CH.HAUTTON.map((x) => x.aria), ["hell", "hell-mittel", "mittel", "mittel-dunkel", "dunkel"]);
  assert.deepEqual(CH.HAUTTON.map((x) => x.en), ["light skin tone", "light-medium skin tone", "medium skin tone", "medium-dark skin tone", "dark skin tone"]);
  // Ausstattung
  assert.deepEqual(l(CH.OBERTEIL), ["Rot", "Gelb", "Grün", "Blau", "Orange", "Lila"]);
  assert.equal(CH.oberteilEn("rot"), "wearing a bright red top");
  assert.equal(CH.BRILLE_EN, "round glasses");
  assert.deepEqual(l(CH.extras("girl")), ["Mütze", "Kuscheltier im Arm", "nichts davon"]);
  assert.deepEqual(l(CH.extras("woman")), ["Hut", "Kopftuch", "nichts davon"]);
  assert.deepEqual(l(CH.extras("man")), ["Hut", "nichts davon"]);
  assert.deepEqual(l(CH.extras("grandmother")), ["Hut", "Kopftuch", "Gehstock", "nichts davon"]);
  assert.deepEqual(l(CH.extras("grandfather")), ["Hut", "Gehstock", "nichts davon"]);
  assert.deepEqual(l(CH.extras("girl", true)), ["Mütze", "Kuscheltier im Arm", "Rollstuhl", "nichts davon"], "Rollstuhl vorbereitet, unsichtbar");
  assert.equal(CH.finde(CH.EXTRAS, "rollstuhl").en, "sitting in a wheelchair");
  assert.deepEqual(CH.EXTRAS.map((x) => x.en).filter((e) => /\bcap\b|^scarf$|backpack|cardigan/.test(e)), [], "Kappe, Schal, Rucksack, Strickjacke gestrichen");
  assert.equal(CH.merkmalEn("Mütze"), "knitted beanie"); assert.equal(CH.merkmalEn("Hut"), "brimmed hat");
  assert.equal(CH.merkmalEn("Schlappohren"), null, "Tier-Chips weiter ueber translateChip");
  assert.equal(CH.haarPhraseEn({ haarfarbe: "schwarz", haarform: "kraus", haarlaenge: "kurz" }), "short tightly coiled, afro-textured black hair");
  assert.equal(CH.haarPhraseEn({ haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", frisur: "zoepfe" }), "long straight blonde hair in two braids");
  assert.equal(CH.haarPhraseEn({ haarfarbe: "blond", haarform: "glatt", haarlaenge: "kurz", frisur: "zoepfe" }), "short straight blonde hair", "Frisur nur bei mittel/lang");
  assert.equal(CH.haarPhraseEn({ haarfarbe: "grau", haarlaenge: "glatze" }), "bald head", "v4: keine Augenbrauen-Angabe");
  assert.deepEqual(CH.ausstattungEn({ oberteil: "gelb", brille: true, extra: "muetze" }), ["wearing a bright yellow top", "round glasses", "knitted beanie"]);
  assert.deepEqual(CH.ausstattungEn({ oberteil: "blau", brille: false, extra: "nichts" }), ["wearing a bright blue top"]);
  const edit = CH.ausstattungEditPrompt({ oberteil: "gruen", brille: true, extra: "kopftuch" });
  assert.match(edit, /Change ONLY the color of the upper garment to a flat, solid bright green/); assert.match(edit, /round glasses/); assert.match(edit, /headscarf/); assert.match(edit, /Keep the face, hairstyle/);
  assert.match(edit, /the pink round cheeks, the dot eyes and the nose line, hair, head size and body proportions exactly/); assert.doesNotMatch(edit, /t-shirt/); assert.match(edit, /one darker hard-edged shadow tone per surface/);
  // v4 (Kontaktbogen): keine Kleidungs-/Rahmenwoerter mehr in chips.js
  assert.equal(CH.GRUNDFIGUR_EN, undefined); assert.equal(CH.grundfigurEn, undefined); assert.equal(CH.FIGUR_RAHMEN_EN, undefined);
});

test("Schluessel v3: Version, Stufen, Frisur, Glatze, Hautton Pflicht; Ausstattung v3a", () => {
  const a = C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", frisur: "zoepfe", hautton: "hell" });
  assert.equal(a, "v5|girl|6-9|blond|glatt|lang|zoepfe|hell|-");
  assert.equal(C.schluessel({ rolle: "girl", alter: 9, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", frisur: "zoepfe", hautton: "hell", merkmal: "Brille" }), a, "Merkmal/Extra gehoert nicht in den Grund-Schluessel");
  assert.equal(C.schluessel({ rolle: "boy", alter: 3, haarfarbe: "hellbraun", haarform: "lockig", haarlaenge: "kurz", hautton: "mittel" }), "v5|boy|0-5|hellbraun|lockig|kurz|-|mittel|-", "kurz: keine Frisur");
  assert.equal(C.schluessel({ rolle: "boy", alter: 14, haarfarbe: "hellbraun", haarform: "lockig", haarlaenge: "mittel", frisur: "offen", hautton: "mittel" }), "v5|boy|10+|hellbraun|lockig|mittel|offen|mittel|-");
  assert.equal(C.schluessel({ rolle: "boy", alter: 14, haarfarbe: "hellbraun", haarform: "lockig", haarlaenge: "mittel", hautton: "mittel" }), null, "mittel ohne Frisur");
  assert.equal(C.schluessel({ rolle: "woman", alter: 34, haarfarbe: "grau", haarform: "kraus", haarlaenge: "mittel", frisur: "dutt", hautton: "dunkel" }), "v5|woman|-|grau|kraus|mittel|dutt|dunkel|-", "Erwachsene ohne Alter");
  assert.equal(C.schluessel({ rolle: "man", haarfarbe: "grau", haarform: "glatt", haarlaenge: "glatze", frisur: "dutt", hautton: "mittel-dunkel", bart: "vollbart" }), "v5|man|-|grau|-|glatze|-|mittel-dunkel|vollbart", "Glatze: Farbe bleibt, Struktur/Frisur nicht im Schluessel, Bart drin");
  assert.equal(C.schluessel({ rolle: "grandfather", haarfarbe: "grau", haarform: "kraus", haarlaenge: "kurz", hautton: "hell" }), "v5|grandfather|-|grau|kraus|kurz|-|hell|kein", "ohne Bart-Angabe = kein Bart");
  assert.equal(C.schluessel({ rolle: "man", haarfarbe: "grau", haarform: "kraus", haarlaenge: "kurz", hautton: "hell", bart: "ziegenbart" }), null, "unbekannter Bart");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blond", haarform: "glatt", haarlaenge: "glatze", hautton: "hell" }), null, "Glatze gibt es bei Kindern nicht");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "grau", haarform: "glatt", haarlaenge: "kurz", hautton: "hell" }), null, "Grau gibt es bei Kindern nicht");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blond", haarform: "glatt", haarlaenge: "kurz" }), null, "Hautton fehlt");
  assert.equal(C.schluessel({ rolle: "pet", tierart: "dog", haarfarbe: "brown", haarform: "striped", haarlaenge: "short", merkmal: "Schlappohren" }), "v5|pet:dog|-|brown|striped|short|schlappohren|-|-");
  assert.equal(C.schluessel({ rolle: "alien", haarfarbe: "blond", haarform: "glatt", haarlaenge: "kurz", hautton: "hell" }), null);
  assert.equal(C.schluessel(null), null);
  assert.equal(C.CHIPS.istAktuelleVersion(a), true);
  assert.equal(C.CHIPS.istAktuelleVersion("v3|girl|6-9|blond|glatt|lang|zoepfe|hell|-"), false);
  // Ausstattung
  const aa = C.ausstattungsSchluessel(a, { oberteil: "gelb", brille: true, extra: "nichts" }, "girl");
  assert.equal(aa, "v5a|" + a + "|gelb|brille|nichts");
  assert.equal(C.ausstattungsSchluessel(a, { oberteil: "gelb", brille: false }, "girl"), "v5a|" + a + "|gelb|-|nichts", "ohne Extra = nichts");
  assert.equal(C.ausstattungsSchluessel(a, { oberteil: "gelb", brille: false, extra: "rollstuhl" }, "girl"), "v5a|" + a + "|gelb|-|rollstuhl", "inaktives Extra ist ein gueltiger Schluessel (Test durch Matthias)");
  assert.equal(C.ausstattungsSchluessel(a, { brille: true }, "girl"), null, "Oberteil ist Pflicht");
  assert.equal(C.ausstattungsSchluessel(a, { oberteil: "gelb", extra: "gehstock" }, "girl"), null, "Extra gehoert nicht zur Rolle");
  assert.equal(C.ausstattungsSchluessel("v3|girl|6-9|blond|glatt|lang|zoepfe|hell|-", { oberteil: "gelb" }, "girl"), null, "nur auf v5-Grundfigur");
  assert.equal(C.CHIPS.istAktuelleAusstattungsVersion(aa), true);
  assert.equal(C.CHIPS.rolleAusSchluessel(a), "girl"); assert.equal(C.CHIPS.rolleAusSchluessel(aa), "girl");
});

test("Kombinationszahlen beider Stufen (Grundfigur Kinder 2.025, Frau/Oma 810, Mann/Opa 3.360)", () => {
  const k = C.kombinationen();
  assert.equal(k.grundfigur.girl, 5 * 27 * 5 * 3); assert.equal(k.grundfigur.boy, 2025);
  assert.equal(k.grundfigur.woman, 6 * 27 * 5); assert.equal(k.grundfigur.grandmother, 810);
  assert.equal(k.grundfigur.man, 6 * 28 * 5 * 4); assert.equal(k.grundfigur.grandfather, 3360);
  assert.equal(k.grundfigur.pet_je_tierart, 567);
  assert.equal(k.ausstattung.girl, 2025 * 6 * 2 * 3); assert.equal(k.ausstattung.woman, 810 * 36);
  assert.equal(k.ausstattung.man, 3360 * 24); assert.equal(k.ausstattung.grandmother, 810 * 48); assert.equal(k.ausstattung.grandfather, 3360 * 36);
});

test("Altersstufen <=5 / 6-9 / 10+", () => {
  assert.equal(C.alterStufe(0), "0-5"); assert.equal(C.alterStufe(5), "0-5");
  assert.equal(C.alterStufe(6), "6-9"); assert.equal(C.alterStufe(9), "6-9");
  assert.equal(C.alterStufe(10), "10+"); assert.equal(C.alterStufe(17), "10+");
  assert.equal(C.alterStufe(18), null); assert.equal(C.alterStufe("x"), null); assert.equal(C.alterStufe(-1), null);
});

test("passtZumPrompt: Rolle, Haarphrase+Frisur, Hautton, Bart, keine Ausstattung, Stilschwanz (v4)", () => {
  const chips = { rolle: "girl", alter: 6, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", frisur: "zoepfe", hautton: "hell" };
  const gut = "wmlstil, girl, age 6, light skin tone, long straight blonde hair in two braids, round head, minimal face, dot eyes, standing, white background, full body, front view";
  assert.equal(C.passtZumPrompt(chips, gut), true);
  assert.equal(C.passtZumPrompt(chips, gut.replace("light skin tone", "dark skin tone")), false, "anderer Hautton");
  assert.equal(C.passtZumPrompt(chips, gut.replace("two braids", "a ponytail")), false, "andere Frisur");
  assert.equal(C.passtZumPrompt(chips, gut.replace("girl", "boy")), false, "andere Rolle");
  assert.equal(C.passtZumPrompt(chips, gut.replace("two braids, ", "two braids, wearing a bright red top, ")), false, "Grundfigur muss neutral sein (keine Ausstattung)");
  assert.equal(C.passtZumPrompt(chips, gut.replace("two braids, ", "two braids, round glasses, ")), false, "keine Brille in der Grundfigur");
  assert.equal(C.passtZumPrompt(chips, "wmlstil, girl, age 6, light skin tone, long straight blonde hair in two braids, ugly monster"), false, "ohne Stilschwanz");
  assert.equal(C.passtZumPrompt(chips, gut.replace(", full body, front view", "")), false, "full body, front view muss stehen");
  assert.equal(C.passtZumPrompt({ rolle: "man", haarfarbe: "grau", haarlaenge: "glatze", hautton: "mittel", bart: "vollbart" }, "wmlstil, man, medium skin tone, bald head, full gray/white beard, round head, minimal face, dot eyes, full body, front view"), true);
  assert.equal(C.passtZumPrompt({ rolle: "man", haarfarbe: "grau", haarlaenge: "glatze", hautton: "mittel", bart: "vollbart" }, "wmlstil, man, medium skin tone, bald head, clean-shaven, round head, minimal face, dot eyes, full body, front view"), false, "anderer Bart");
  const tier = { rolle: "pet", tierart: "dog", haarfarbe: "brown", haarform: "striped", haarlaenge: "short" };
  assert.equal(C.passtZumPrompt(tier, "wmlstil, dog, short striped brown fur, round head, minimal face, dot eyes, full body, front view"), true, "Tiere ohne Hautton/Oberteil");
});

/* ---------------- Datenbank mit KV-Mock und Speicher-Attrappe ---------------- */
const { neuerKvMock } = require("./kv-mock");
function speicherAttrappe() {
  const dateien = new Map();
  return {
    dateien,
    ORDNER: { chips: "figuren/chips" },
    dateiname: (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    zeitstempel: () => "20261018-120000",
    oeffentlicheUrl: (pfad) => "https://www.wimmelwizard.de/api/image-proxy?blob=" + encodeURIComponent(pfad),
    speichern: async (pfad, bytes, typ) => { if (dateien.has(pfad)) throw new Error("Blob 409"); dateien.set(pfad, { bytes, typ }); return { pfad, url: "https://x.private.blob.vercel-storage.com/" + pfad }; },
    loeschen: async (pfad) => { dateien.delete(pfad); return true; },
    lesen: async (pfad) => (dateien.has(pfad) ? { bytes: dateien.get(pfad).bytes, contentType: dateien.get(pfad).typ } : null),
  };
}
const holen = async (url) => ({ ok: true, headers: { get: () => "image/png" }, arrayBuffer: async () => Buffer.from("PNG:" + url) });
const S = "v5|girl|6-9|blond|glatt|lang|zoepfe|hell|-";

test("DB: suchen leer, ablegen, treffer, verwerfen", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const db = C.mitDeps({ kvCommand: kv, speicher: sp, fetch: holen });
  assert.equal(await db.suchen(S), null);
  const r = await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/files/a.png", prompt: "wmlstil, girl", seed: 42, verify: { ok: true } });
  assert.equal(r.neu, true);
  assert.match(r.pfad, /^figuren\/chips\/v5-girl-6-9-blond-glatt-lang-zoepfe-hell\/20261018-120000-[a-z0-9]+\.png$/);
  assert.equal(r.url, "https://www.wimmelwizard.de/api/image-proxy?blob=" + encodeURIComponent(r.pfad));
  assert.equal(sp.dateien.size, 1);
  const t = await db.suchen(S);
  assert.equal(t.pfad, r.pfad); assert.equal(t.seed, 42); assert.equal(t.treffer, 0); assert.equal(t.prompt, "wmlstil, girl");
  await db.trefferBuchen(S); await db.trefferBuchen(S);
  assert.equal((await db.suchen(S)).treffer, 2);
  assert.deepEqual((await db.liste()).map((x) => x.schluessel), [S]);
  assert.equal(await db.verwerfen(S), true);
  assert.equal(await db.suchen(S), null);
  assert.equal(sp.dateien.size, 0, "Datei mit geloescht");
  assert.deepEqual(await db.liste(), []);
  assert.equal(await db.verwerfen(S), false);
});

test("DB: zwei gleichzeitige Ableger -- der erste gewinnt, der zweite raeumt auf", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  let n = 0; sp.zeitstempel = () => "t" + (++n);
  const db = C.mitDeps({ kvCommand: kv, speicher: sp, fetch: holen });
  const a = await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/a.png" });
  const b = await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/b.png" });
  assert.equal(a.neu, true); assert.equal(b.neu, false);
  assert.equal(b.pfad, a.pfad, "zweiter bekommt den Eintrag des ersten");
  assert.equal(sp.dateien.size, 1, "zweite Datei wieder geloescht");
});

test("DB: Eintraege anderer Versionen werden ignoriert und per aufraeumen() entfernt", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const db = C.mitDeps({ kvCommand: kv, speicher: sp, fetch: holen });
  const alt = "v3|girl|6-9|blond|glatt|lang|zoepfe|hell|-";
  // v1-Eintrag wie vom 18.10.: direkt in KV + Datei
  sp.dateien.set("figuren/chips/girl-6-9-blonde-straight-long-gummistiefel/20261018-1.png", { bytes: Buffer.from("x"), typ: "image/png" });
  await kv(["hset", C.keyFigur(alt), "pfad", "figuren/chips/girl-6-9-blonde-straight-long-gummistiefel/20261018-1.png", "treffer", "3"]);
  await kv(["sadd", C.KEY_ALLE, alt]);
  await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/a.png" });
  assert.equal(await db.suchen(alt), null, "v1 wird ignoriert");
  assert.deepEqual((await db.liste()).map((x) => x.schluessel), [S], "Liste nur aktuelle Version");
  assert.deepEqual(await db.vorschauAufraeumen(), [alt], "Vorschau loescht nichts");
  assert.equal(sp.dateien.size, 2);
  const r = await db.aufraeumen();
  assert.deepEqual(r, { version: "v5", geloescht: [alt] });
  assert.equal(sp.dateien.size, 1, "v1-Datei weg, v2-Datei bleibt");
  assert.deepEqual(await kv(["smembers", C.KEY_ALLE]), [S]);
  assert.deepEqual(await db.aufraeumen(), { version: "v5", geloescht: [] });
});

/* ---------------- Endpunkte: Treffer-Pfad und Ablegen nach done ---------------- */
test("char-job-start: Treffer -> Job sofort done, kein fal, eigener Zaehler bis FIGUREN_GRATIS_CHIPS", async () => {
  const kvMod = require("../api/_lib/kv");
  const kv = neuerKvMock(); kvMod.kvCommand = kv; kvMod.kvConfig = () => ({ url: "mock", token: "x" });
  kvMod.kvIncrWithExpiry = async (key, ttl) => Number(await kv(["incr", key]));
  kvMod.kvCommandSafe = async (p) => kv(p);
  kvMod.kvSetJson = async (k, v) => kv(["set", k, JSON.stringify(v)]);
  const sp = speicherAttrappe();
  const echteDeps = C.mitDeps; C.mitDeps = (d) => echteDeps(Object.assign({ kvCommand: kv, speicher: sp, fetch: holen }, d || {}));
  const rl = require("../api/_lib/rate-limit"); const rlAlt = rl.checkRateLimit; rl.checkRateLimit = async () => true;
  const kd = require("../api/_lib/kosten-deckel"); const kdAlt = kd.deckelErlaubt; kd.deckelErlaubt = async () => true;
  const ft = require("../api/_lib/free-tier");
  try {
    delete require.cache[require.resolve("../api/char-job-start")];
    const start = require("../api/char-job-start");
    const SID = "123e4567-e89b-12d3-a456-426614174000";
    const chips = { rolle: "girl", alter: 7, haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", frisur: "zoepfe", hautton: "hell" };
    const prompt = "wmlstil, girl, age 7, light skin tone, long straight blonde hair in two braids, round head, minimal face, dot eyes, full body, front view";
    const antwort = () => { const r = { code: 0, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
    // Kein Eintrag -> ohne FAL_KEY bricht der Live-Weg mit 500 ab (= der Live-Weg wurde gewaehlt)
    delete process.env.FAL_KEY;
    let res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips } }, res);
    assert.equal(res.code, 500, "kein Treffer -> Live-Weg");
    assert.equal(await kv(["scard", "freitier:figur-ids:" + SID]), 0, "C3: ein gescheiterter Lauf zaehlt nicht");
    // C3.1 Punkt 2: unvollstaendige Chips (kein Schluessel) sind ein Eingabefehler (400), kein Stopp
    res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips: Object.assign({}, chips, { haarlaenge: "" }) } }, res);
    assert.equal(res.code, 400); assert.equal(res.body.unvollstaendig, true); assert.equal(res.body.stopp, undefined);
    // Eintrag anlegen -> Treffer
    const db = C.mitDeps();
    await db.ablegen({ schluessel: S, bildUrl: "https://v3.fal.media/a.png", seed: 7 });
    for (let i = 1; i <= ft.FIGUREN_GRATIS_CHIPS; i++) {
      res = antwort();
      await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips, elementId: "person-" + i } }, res);
      assert.equal(res.code, 200, "Treffer " + i);
      assert.equal(res.body.chipTreffer, true);
      const job = JSON.parse(await kv(["get", "charjob:" + res.body.jobId]));
      assert.equal(job.status, "done"); assert.equal(job.chipTreffer, true); assert.equal(job.resultSeed, 7);
      assert.match(job.resultUrl, /image-proxy\?blob=figuren/);
    }
    assert.equal(await kv(["scard", "freitier:figur-ids:" + SID]), ft.FIGUREN_GRATIS_CHIPS, "C3: zugestellte Regal-Figuren zaehlen als Figuren");
    assert.equal(await kv(["scard", "freitier:figur-ids:chip:" + SID]), ft.FIGUREN_GRATIS_CHIPS);
    assert.equal((await db.suchen(S)).treffer, ft.FIGUREN_GRATIS_CHIPS);
    // C3.1: Person 3 noch einmal aus dem Regal -> kein neues Kontingent, Stand bleibt
    res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips, elementId: "person-3" } }, res);
    assert.equal(res.code, 200, "bekannte Figur neu zeichnen geht");
    assert.equal(await kv(["scard", "freitier:figur-ids:" + SID]), ft.FIGUREN_GRATIS_CHIPS, "Menge: dieselbe Figur zaehlt nicht doppelt");
    res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips, elementId: "person-6" } }, res);
    assert.equal(res.code, 403); assert.equal(res.body.kontingent, "figuren_chips"); assert.equal(res.body.stopp.stufe, "gratis"); assert.equal(res.body.stopp.zauberguthabenMoeglich, true);
    // Notiz/"Neu zeichnen": anzahl 1 geht nie an die DB -- und ist gratis eine "live"-Figur -> Stopp
    res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips, anzahl: 1 } }, res);
    assert.equal(res.code, 403, "anzahl 1 -> Live-Weg, gratis nicht erlaubt (C3)"); assert.equal(res.body.stopp.grund, "live");
    process.env.TEST_BEZAHLT_SESSION_IDS = SID;
    res = antwort();
    await start({ method: "POST", headers: {}, body: { prompt, sessionId: SID, chips, anzahl: 1, elementId: "p1" } }, res);
    assert.equal(res.code, 500, "bezahlt: anzahl 1 -> Live-Weg trotz Treffer");
    delete process.env.TEST_BEZAHLT_SESSION_IDS;
  } finally {
    C.mitDeps = echteDeps; rl.checkRateLimit = rlAlt; kd.deckelErlaubt = kdAlt;
  }
});

test("char-job-status: fertiger Job mit Schluessel wird abgelegt, resultUrl zeigt auf den Proxy", async () => {
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const echteDeps = C.mitDeps; C.mitDeps = (d) => echteDeps(Object.assign({ kvCommand: kv, speicher: sp, fetch: holen }, d || {}));
  try {
    const { chipFigurAblegen } = require("../api/char-job-status");
    const ok = { single_ok: true, complete_ok: true, mouth_ok: true, style_ok: true };
    const basis = { status: "done", chipSchluessel: S, chipGespeichert: false, resultUrl: "https://v3.fal.media/a.png", resultSeed: 5, prompt: "p", resultVerify: ok };
    // v4.1: Stil durchgefallen -> nicht ins Regal (Kundin behaelt ihr Blatt)
    const mitFehler = await chipFigurAblegen(Object.assign({}, basis, { resultViolations: 1, resultVerify: Object.assign({}, ok, { style_ok: false }) }));
    assert.equal(mitFehler.chipGespeichert, true); assert.equal(mitFehler.chipAbgelegt, false); assert.equal(mitFehler.chipGrund, "verstoesse");
    assert.equal(mitFehler.resultUrl, basis.resultUrl, "Kundin behaelt ihr Blatt");
    assert.equal(sp.dateien.size, 0);
    const unvollst = await chipFigurAblegen(Object.assign({}, basis, { resultViolations: 1, resultVerify: Object.assign({}, ok, { complete_ok: false }) }));
    assert.equal(unvollst.chipAbgelegt, false);
    const gut = await chipFigurAblegen(Object.assign({}, basis, { resultViolations: 0 }));
    assert.equal(gut.chipAbgelegt, true); assert.match(gut.resultUrl, /image-proxy\?blob=figuren%2Fchips/);
    assert.equal(gut.resultUrlFal, basis.resultUrl);
    assert.equal(sp.dateien.size, 1);
    const nochmal = await chipFigurAblegen(gut);
    assert.equal(nochmal, gut, "nur einmal");
    const ohne = await chipFigurAblegen({ status: "done", resultViolations: 0, resultUrl: "u" });
    assert.equal(ohne.chipGespeichert, undefined, "ohne Schluessel nichts");
    // Speicher kaputt -> Blatt bleibt unter fal-URL, kein Wurf
    sp.speichern = async () => { throw new Error("Blob 500"); };
    const kaputt = await chipFigurAblegen(Object.assign({}, basis, { chipSchluessel: "v5|boy|0-5|hellbraun|lockig|kurz|-|mittel|-", resultViolations: 0 }));
    assert.equal(kaputt.chipAbgelegt, false); assert.equal(kaputt.resultUrl, basis.resultUrl); assert.match(kaputt.chipGrund, /Blob 500/);
  } finally { C.mitDeps = echteDeps; }
});

// Figuren v4 (26.10.2026): pipeline.js im Node laden wie dev-tools/figuren-kontaktbogen.js -- der
// Grundfigur-Prompt muss WORTGLEICH Fassung A+H des Kontaktbogens sein, der Szenen-Satz sagt "upper garment".
test("v4: charPromptFromChips = Fassung A+H (Kontaktbogen), oberteilSatz 'upper garment'", () => {
  global.window = { location: { origin: "https://www.wimmelwizard.de" } };
  global.document = { createElement: () => ({ getContext: () => ({}) }) };
  global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  new Function(fs.readFileSync(path.join(__dirname, "..", "public", "js", "format.js"), "utf8") + "\n;Object.assign(globalThis, { DRUCK, randProzent });")();
  global.CHIPS = CH;
  new Function(fs.readFileSync(path.join(__dirname, "..", "public", "js", "pipeline.js"), "utf8"))();
  const P = global.window.Pipeline;
  const bau = (role, age, c) => {
    const hair = CH.haarPhraseEn(c, false); const ex = hair ? [hair] : [];
    if (CH.hatBart(role)) { const b = CH.bartEn(c.bart || "kein", c.haarfarbe); if (b) ex.push(b); }
    return P.charPromptFromChips({ role, age, chipLabels: [], extraEnParts: ex, noteEn: "", hauttonEn: CH.hauttonEn(c.hautton) });
  };
  const schluss = "round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view";
  assert.equal(bau("girl", 7, { haarfarbe: "blond", haarform: "glatt", haarlaenge: "lang", frisur: "zoepfe", hautton: "hell" }),
    "wmlstil, girl, age 7, light skin tone, long straight blonde hair in two braids, " + schluss);
  assert.equal(bau("grandfather", 72, { haarfarbe: "grau", haarlaenge: "glatze", hautton: "hell-mittel", bart: "vollbart" }),
    "wmlstil, grandfather, light-medium skin tone, bald head, full gray/white beard, " + schluss);
  assert.equal(bau("woman", 38, { haarfarbe: "schwarz", haarform: "kraus", haarlaenge: "mittel", frisur: "dutt", hautton: "dunkel" }),
    "wmlstil, woman, dark skin tone, medium-length tightly coiled, afro-textured black hair in a hair bun, " + schluss);
  assert.equal(P.charPromptFromChips({ role: "pet", chipLabels: [], extraEnParts: ["dog", "short striped brown fur"], noteEn: "" }), "wmlstil, pet, dog, short striped brown fur, " + schluss, "Tiere wie 71582bb");
  assert.ok(!/wearing|85 percent|ground shadow|eyebrows/.test(bau("boy", 4, { haarfarbe: "rot", haarform: "lockig", haarlaenge: "kurz", hautton: "mittel" })), "keine Kleidungs-/Rahmenwoerter");
  assert.equal(P.oberteilSatz({ role: "girl", oberteilEn: CH.oberteilEn("rot") }, 0), " The girl from reference image 2 wears a bright red upper garment.");
  assert.equal(P.oberteilSatz({ role: "girl" }, 0), "");
});

// Figuren v4.1 Teil A (26.10.2026): Ursache "Maedchen-Grundfigur fehlt im Regal". Dritte Runde
// (Einzelkandidat nach zwei Kandidaten mit Verstoessen): die bestandene Grundfigur hatte einen weichen
// Verstoss (mouth_ok false, violations 1) -> finalizeJob stellte sie zu, Stufe 2 editierte sie, aber
// chipFigurAblegen verlangte violations === 0. Jetzt: single_ok + complete_ok + style_ok => Regal.
test("v4.1: Grundfigur aus der dritten Runde mit weichem Verstoss liegt im Regal, bevor Stufe 2 startet", async () => {
  const charEngine = require("../api/_lib/char-job-engine");
  const kv = neuerKvMock(); const sp = speicherAttrappe();
  const echteDeps = C.mitDeps; C.mitDeps = (d) => echteDeps(Object.assign({ kvCommand: kv, speicher: sp, fetch: holen }, d || {}));
  try {
    const { chipFigurAblegen } = require("../api/char-job-status");
    const k = (seed, v, violations) => ({ seed, url: "https://v3.fal.media/" + seed + ".png", genStatus: "done", verifyStatus: "done", verify: v, violations });
    const job = { status: "in_progress", chipSchluessel: S, ausstattungSchluessel: "v5a|" + S + "|gelb|brille|nichts", prompt: "p" };
    charEngine.finalizeJob(job, [
      k(1, { single_ok: true, complete_ok: false, mouth_ok: true, style_ok: true }, 1),   // Runde 1: abgeschnitten
      k(2, { single_ok: false, complete_ok: true, mouth_ok: true, style_ok: true }, 1),   // Runde 1: zwei Figuren
      k(3, { single_ok: true, complete_ok: true, mouth_ok: false, style_ok: true }, 1),   // Runde 2 (3. Kandidat): vollstaendig, Mund
    ]);
    assert.equal(job.status, "done"); assert.equal(job.resultSeed, 3); assert.equal(job.resultViolations, 1);
    assert.equal(charEngine.grundfigurAblegbar(job.resultVerify), true);
    const abgelegt = await chipFigurAblegen(job);
    assert.equal(abgelegt.chipAbgelegt, true, "Grundfigur liegt im Regal, bevor der Edit startet");
    assert.match(abgelegt.resultUrl, /image-proxy\?blob=figuren%2Fchips%2Fv5-girl/);
    assert.ok((await C.mitDeps().suchen(S)), "suchen() findet die Grundfigur");
    // Stil durchgefallen bleibt draussen
    assert.equal(charEngine.grundfigurAblegbar({ single_ok: true, complete_ok: true, mouth_ok: true, style_ok: false }), false);
  } finally { C.mitDeps = echteDeps; }
});
