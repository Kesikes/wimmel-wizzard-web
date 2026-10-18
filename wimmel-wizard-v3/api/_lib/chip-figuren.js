// api/_lib/chip-figuren.js — NEU (Auftrag 3 Teil 5, 18.10.2026): Schlüssel und Wertevorrat für die
// gemeinsame Figuren-Datenbank aus Chip-Figuren.
//
// IDEE: Zwei Kundinnen, die dieselben Chips wählen (Mädchen, 6, blond, glatt, lang, Gummistiefel),
// bekommen dieselbe Figur -- aus dem Speicher, ohne fal.ai-Aufruf. Der Schlüssel ist die
// normalisierte Chip-Kombination. Freitext (charNote) gehört NICHT in den Schlüssel und nicht in die
// Figur: er geht in die Szenenbeschreibung (siehe Rückmeldung, Abschnitt charNote).
//
// STAND: nur Schlüssel + Wertevorrat (reine Funktionen, getestet). Speicher und Anbindung an
// api/char-job-start.js folgen, sobald der Speicher entschieden ist (Rückmeldung, Speicher-Vorschlag).
//
// WERTEVORRAT = die Chip-Listen aus public/js/screens/charakter.js (HAIR_COLORS, HAIR_TEXTURE,
// HAIR_LENGTH, CHIPS, FUR_COLORS, FUR_PATTERN, PET_CHIPS, ROLE_CHIPS). test/chip-figuren.test.js
// prüft, dass beide Listen gleich sind -- wer dort einen Chip ändert, ändert ihn hier mit.
const ROLLEN = ["girl", "boy", "woman", "man", "grandmother", "grandfather", "pet"];
const KINDER = ["girl", "boy"];
const ALTER_MAX_KIND = 17;
const HAARFARBE = ["blonde", "brown", "black", "red", "gray/white", "colorful, dyed"];
const HAARFORM = ["curly", "straight"];
const HAARLAENGE = ["short", "medium-length", "long"];
const BESONDERHEIT = ["Strickjacke", "Blümchenbluse", "Brille an der Kette", "Gehstock", "Perlenkette", "Gummistiefel", "immer eine Tasche dabei", "lacht viel"];
const FELLFARBE = ["brown", "black", "white", "gray", "cream", "reddish-brown", "spotted, multi-colored"];
const FELLMUSTER = ["solid-colored", "striped", "patchy, multi-colored patterns"];
const TIER_BESONDERHEIT = ["Schlappohren", "Stehohren", "buschiger Schwanz", "Stummelschwanz", "Flecken auf dem Rücken", "trägt ein Halsband", "immer mit einem Ball", "schläft am liebsten in der Sonne"];

function norm(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " ");
}
function slug(v) {
  return norm(v).replace(/[^a-z0-9äöüß/,.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// schluessel({ rolle, alter, tierart, haarfarbe, haarform, haarlaenge, besonderheit }) -> String | null
// null = keine gültige Chip-Figur (fehlende Pflichtwerte, unbekannte Werte) -> live erzeugen, nicht
// speichern. Werte sind die englischen Chip-Werte (en) bzw. die deutschen Chip-Labels der
// Besonderheit, genau wie sie charakter.js/pipeline.js in den Prompt schreiben.
function schluessel(e) {
  e = e || {};
  const rolle = norm(e.rolle);
  const istTier = rolle === "pet" || !!e.tierart;
  if (!istTier && !ROLLEN.includes(rolle)) return null;
  const farben = istTier ? FELLFARBE : HAARFARBE;
  const formen = istTier ? FELLMUSTER : HAARFORM;
  const besonderheiten = istTier ? TIER_BESONDERHEIT : BESONDERHEIT;
  const farbe = norm(e.haarfarbe), form = norm(e.haarform), laenge = norm(e.haarlaenge);
  // Alle drei Haar-/Fell-Chips sind Pflicht für einen Treffer -- sonst wäre der Prompt zu unbestimmt,
  // und zwei "gleiche" Schlüssel könnten sehr verschiedene Figuren meinen.
  if (!farben.map(norm).includes(farbe) || !formen.map(norm).includes(form) || !HAARLAENGE.map(norm).includes(laenge)) return null;
  const bes = e.besonderheit ? String(e.besonderheit).trim() : "";
  if (bes && !besonderheiten.includes(bes)) return null;
  let alter = "-";
  if (KINDER.includes(rolle)) {
    const a = Number(e.alter);
    if (Number.isInteger(a) && a >= 0 && a <= ALTER_MAX_KIND) alter = String(a);
  }
  const rollenTeil = istTier ? "pet:" + (slug(e.tierart) || "pet") : rolle;
  return [rollenTeil, alter, slug(farbe), slug(form), slug(laenge), bes ? slug(bes) : "-"].join("|");
}

// Kombinationszahlen (für die Rückmeldung und ein späteres Vorwärm-Skript).
function kombinationen() {
  const menschBasis = HAARFARBE.length * HAARFORM.length * HAARLAENGE.length * (BESONDERHEIT.length + 1); // 6*2*3*9 = 324
  const kinderAlter = ALTER_MAX_KIND + 1; // 0..17
  return {
    mensch_basis: menschBasis,
    erwachsene: 4 * menschBasis,
    kinder_je_alter: 2 * menschBasis,
    kinder_alle_alter: 2 * kinderAlter * menschBasis,
    menschen_gesamt: 4 * menschBasis + 2 * kinderAlter * menschBasis,
    tier_je_tierart: FELLFARBE.length * FELLMUSTER.length * HAARLAENGE.length * (TIER_BESONDERHEIT.length + 1), // 7*3*3*9 = 567
  };
}

module.exports = { schluessel, kombinationen, ROLLEN, KINDER, ALTER_MAX_KIND, HAARFARBE, HAARFORM, HAARLAENGE, BESONDERHEIT, FELLFARBE, FELLMUSTER, TIER_BESONDERHEIT, norm, slug };
