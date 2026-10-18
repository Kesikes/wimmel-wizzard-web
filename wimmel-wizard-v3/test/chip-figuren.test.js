// test/chip-figuren.test.js — Auftrag 3 Teil 5 (Vorbereitung): Schluessel-Normalisierung und
// Abgleich des Wertevorrats mit den Chip-Listen in charakter.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const C = require("../api/_lib/chip-figuren");

function listeAusQuelle(quelle, name) {
  // const NAME = [ ... ];  -> Array per eval des Literals (nur Literale, kein Code)
  const m = new RegExp("const " + name + " = (\\[[\\s\\S]*?\\]);").exec(quelle);
  assert.ok(m, name + " in charakter.js gefunden");
  return new Function("return " + m[1])();
}

test("Wertevorrat = Chip-Listen in charakter.js", () => {
  const q = fs.readFileSync(path.join(__dirname, "..", "public", "js", "screens", "charakter.js"), "utf8");
  assert.deepEqual(listeAusQuelle(q, "HAIR_COLORS").map((x) => x.en), C.HAARFARBE);
  assert.deepEqual(listeAusQuelle(q, "HAIR_TEXTURE").map((x) => x.en), C.HAARFORM);
  assert.deepEqual(listeAusQuelle(q, "HAIR_LENGTH").map((x) => x.en), C.HAARLAENGE);
  assert.deepEqual(listeAusQuelle(q, "CHIPS"), C.BESONDERHEIT);
  assert.deepEqual(listeAusQuelle(q, "FUR_COLORS").map((x) => x.en), C.FELLFARBE);
  assert.deepEqual(listeAusQuelle(q, "FUR_PATTERN").map((x) => x.en), C.FELLMUSTER);
  assert.deepEqual(listeAusQuelle(q, "PET_CHIPS"), C.TIER_BESONDERHEIT);
  assert.deepEqual(listeAusQuelle(q, "ROLE_CHIPS").map((x) => x.value), C.ROLLEN);
});

test("Schluessel: normalisiert, stabil, Pflichtfelder", () => {
  const a = C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blonde", haarform: "straight", haarlaenge: "long", besonderheit: "Gummistiefel" });
  assert.equal(a, "girl|6|blonde|straight|long|gummistiefel");
  assert.equal(C.schluessel({ rolle: " Girl ", alter: "6", haarfarbe: "Blonde", haarform: "STRAIGHT", haarlaenge: "long", besonderheit: "Gummistiefel" }), a, "Gross-/Kleinschreibung und Leerraum egal");
  assert.equal(C.schluessel({ rolle: "woman", alter: 34, haarfarbe: "gray/white", haarform: "curly", haarlaenge: "short" }), "woman|-|gray/white|curly|short|-", "Erwachsene ohne Alter");
  assert.equal(C.schluessel({ rolle: "boy", haarfarbe: "brown", haarform: "curly", haarlaenge: "short" }), "boy|-|brown|curly|short|-", "Kind ohne Alter");
  assert.equal(C.schluessel({ rolle: "boy", alter: 40, haarfarbe: "brown", haarform: "curly", haarlaenge: "short" }), "boy|-|brown|curly|short|-", "unplausibles Kindesalter faellt weg");
  assert.equal(C.schluessel({ rolle: "pet", tierart: "dog", haarfarbe: "brown", haarform: "spotted, multi-colored".length ? "striped" : "", haarlaenge: "short", besonderheit: "Schlappohren" }), "pet:dog|-|brown|striped|short|schlappohren");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blonde", haarform: "straight" }), null, "Laenge fehlt");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "pink", haarform: "straight", haarlaenge: "long" }), null, "unbekannte Farbe");
  assert.equal(C.schluessel({ rolle: "girl", alter: 6, haarfarbe: "blonde", haarform: "straight", haarlaenge: "long", besonderheit: "Zauberhut" }), null, "unbekannte Besonderheit");
  assert.equal(C.schluessel({ rolle: "alien", haarfarbe: "blonde", haarform: "straight", haarlaenge: "long" }), null);
  assert.equal(C.schluessel(null), null);
});

test("Kombinationszahlen", () => {
  const k = C.kombinationen();
  assert.equal(k.mensch_basis, 324);
  assert.equal(k.erwachsene, 1296);
  assert.equal(k.kinder_je_alter, 648);
  assert.equal(k.kinder_alle_alter, 11664);
  assert.equal(k.menschen_gesamt, 12960);
  assert.equal(k.tier_je_tierart, 567);
});
