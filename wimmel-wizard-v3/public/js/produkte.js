/* ==========================================================================
   Wimmel Wizard v3 — Produkte (Sortiment-Beschluss 16.10.2026, Auftrag 3 Teil 1, 18.10.2026)

   DIE EINE STELLE im Client für Produktnamen, Preise und Bildzahlen. Genau zwei Produkte, beide
   mit festem Umfang und festem Preis, Versand innerhalb Deutschlands inklusive (Auftrag C1, 26.10.2026;
   Laenderliste: VERSANDLAENDER in api/_lib/gutschein-config.js). Kein Poster, kein
   Mini-Wimmelbuch, kein "ab", kein "Coming Soon".

   Server-Gegenstück: api/_lib/gutschein-config.js (PRODUKTE) — gleiche Zahlen, gleiche Namen.
   Wer hier etwas ändert, ändert es dort mit (und umgekehrt).
   Namensregel: Marke "Wimmel Wizard", der Zauberer/Stil heißt "WizzelWim".
   ========================================================================== */

const PRODUKTE = {
  heft: {
    id: "heft",
    name: "Wimmelheft",
    artikel: "ein Wimmelheft",
    preis: "29,90 €",
    wertCent: 2990,
    bilder: 4,
    kurz: "Genau 4 Wimmelbilder · A5 · 18 Seiten mit Rätseln und Widmung",
    versand: "inkl. Versand innerhalb Deutschlands",
  },
  buch: {
    id: "buch",
    name: "Wimmelbuch",
    artikel: "ein Wimmelbuch",
    preis: "49,90 €",
    wertCent: 4990,
    bilder: 7,
    kurz: "Genau 7 Wimmelbilder · A4 Hardcover · 24 Seiten mit Rätseln und Widmung",
    versand: "inkl. Versand innerhalb Deutschlands",
  },
};
// Reihenfolge in Listen: Einstieg zuerst, Hauptprodukt danach.
const PRODUKT_REIHENFOLGE = ["heft", "buch"];
// Standard für neue und für alte Sitzungen (alte Stände trugen tier als Zahl 0/1/2 — die werden
// alle auf "buch" abgebildet, siehe produktNormalisieren()).
const PRODUKT_STANDARD = "buch";
// Der größte Buchumfang — so viele Bilder passen höchstens in ein Produkt.
const BILDER_MAX = Math.max.apply(null, PRODUKT_REIHENFOLGE.map((id) => PRODUKTE[id].bilder));

function produktNormalisieren(wert) {
  return typeof wert === "string" && PRODUKTE[wert] ? wert : PRODUKT_STANDARD;
}
function produkt(id) { return PRODUKTE[produktNormalisieren(id)]; }

// bilderSatz(fertige): der Dashboard-Satz zum Stand der Bilder (Auftrag 3 Teil 1).
//   0..3  -> "2 von 4 Bildern fürs Wimmelheft"
//   4     -> "Euer Wimmelheft ist komplett – oder noch 3 Bilder, dann wird's ein Wimmelbuch."
//   5..6  -> "5 von 7 Bildern fürs Wimmelbuch"
//   7     -> "Euer Wimmelbuch ist komplett."
//   >7    -> "9 Bilder – ins Wimmelbuch passen 7, ihr sucht die besten aus."
function bilderSatz(fertige) {
  const heft = PRODUKTE.heft, buch = PRODUKTE.buch;
  if (fertige < heft.bilder) return fertige + " von " + heft.bilder + " Bildern fürs " + heft.name;
  if (fertige === heft.bilder) return "Euer " + heft.name + " ist komplett – oder noch " + (buch.bilder - heft.bilder) + " Bilder, dann wird's " + buch.artikel + ".";
  if (fertige < buch.bilder) return fertige + " von " + buch.bilder + " Bildern fürs " + buch.name;
  if (fertige === buch.bilder) return "Euer " + buch.name + " ist komplett.";
  return fertige + " Bilder – ins " + buch.name + " passen " + buch.bilder + ", ihr sucht die besten aus.";
}
// bilderZielFuer(fertige): das Produkt, auf das der Fortschrittsring gerade zuläuft.
function bilderZielFuer(fertige) { return fertige < PRODUKTE.heft.bilder ? PRODUKTE.heft : PRODUKTE.buch; }
