// api/_lib/format.js — NEU (Auftrag 3 Teil 3, 18.10.2026, Sortiment-Beschluss 16.10.2026).
//
// DIE EINE STELLE (Server) für Seitenverhältnis und Auflösung der Szenen. Client-Gegenstück mit
// denselben Zahlen: public/js/format.js (Beschnitt-Vorschau, Prompt-Ränder).
//
// DRUCKFORMAT: Beide Produkte sind hochkant mit einer Doppelseite im DIN-Verhältnis — Wimmelbuch
// A4 (Doppelseite 420 × 297 mm), Wimmelheft A5 (296 × 210 mm) — also 1,414 : 1 (vorher 2 : 1 bei
// 296 × 148 mm). nano-banana-pro/edit kennt kein 1,414 : 1; die nächstgelegene Stufe ist 3 : 2
// (1,5 : 1). Erzeugt wird 3 : 2, beschnitten wird SEITLICH: (1,5 − 1,414) / 1,5 = 5,7 % der
// Breite, je 2,9 % links und rechts. (Vorher 16 : 9 → 2 : 1, Beschnitt oben/unten 11 %.)
//
// SICHERHEITSRAND 10 mm rundum (Peecho), auch am Bund. In Prozent des erzeugten 3:2-Bilds, mit
// dem Heft als engstem Fall (296 × 210 mm): seitlich 2,9 % Beschnitt + 10 mm von 296 mm (3,4 %)
// = 6,3 % → 7 %; oben/unten 10 mm von 210 mm = 4,8 % → 5 %. Die Falzregel (Streifen von etwa
// 1/14 der Breite in der Mitte) deckt die 10 mm am Bund beiderseits ab (1/14 von 420 mm = 30 mm).
//
// AUFLÖSUNG: Schalter SZENEN_AUFLOESUNG = "2K" | "4K" (Umgebungsvariable). Standard bleibt 4K,
// bis der Vergleichslauf (dev-tools/aufloesung-2k-test.js) gezeigt hat, dass 2K beim Verify
// gleich gut abschneidet — erst dann im Vercel-Projekt SZENEN_AUFLOESUNG=2K setzen (Sortiment:
// in 2K erzeugen, nur gekaufte Bilder hochrechnen). Eine Zahl, eine Stelle.
const SZENE_ASPECT_RATIO = "3:2";          // erzeugt (fal.ai-Enum)
const DRUCK_SEITENVERHAELTNIS = 1.414;     // Doppelseite DIN hochkant, Breite : Höhe
const BESCHNITT_SEITLICH_ANTEIL = (1.5 - DRUCK_SEITENVERHAELTNIS) / 1.5; // ≈ 0,057 (gesamt, beide Seiten)
const RAND_OBEN_UNTEN = 0.05;              // Prompt-Sicherheitsrand oben/unten, Anteil der Bildhöhe
const RAND_SEITLICH = 0.07;                // Prompt-Sicherheitsrand links/rechts, Anteil der Bildbreite
const FALZ_STREIFEN = 1 / 14;              // Anteil der Bildbreite in der Mitte, frei von Helden

const AUFLOESUNGEN = ["2K", "4K"];
function szenenAufloesung() {
  const v = String(process.env.SZENEN_AUFLOESUNG || "4K").toUpperCase();
  return AUFLOESUNGEN.includes(v) ? v : "4K";
}

module.exports = { SZENE_ASPECT_RATIO, DRUCK_SEITENVERHAELTNIS, BESCHNITT_SEITLICH_ANTEIL, RAND_OBEN_UNTEN, RAND_SEITLICH, FALZ_STREIFEN, AUFLOESUNGEN, szenenAufloesung };
