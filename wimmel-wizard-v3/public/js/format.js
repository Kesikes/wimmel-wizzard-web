/* ==========================================================================
   Wimmel Wizard v3 — Druckformat (Auftrag 3 Teil 3, 18.10.2026, Sortiment-Beschluss 16.10.2026)

   DIE EINE STELLE im Client für Seitenverhältnis, Beschnitt und Sicherheitsränder. Server-
   Gegenstück mit denselben Zahlen und der Herleitung: api/_lib/format.js.

   Doppelseite DIN hochkant (A4: 420 × 297 mm, A5: 296 × 210 mm) = 1,414 : 1. Erzeugt wird 3 : 2
   (fal.ai kennt kein 1,414 : 1), seitlich beschnitten (je 2,9 %). Sicherheitsrand 10 mm rundum
   (Peecho) → Prompt: 7 % links/rechts (inkl. Beschnitt), 5 % oben/unten. Falzstreifen 1/14.
   ========================================================================== */
const DRUCK = {
  seitenverhaeltnis: 1.414,          // Breite : Höhe der Doppelseite
  erzeugtVerhaeltnis: 1.5,           // 3 : 2, so kommt das Bild von fal.ai
  cssAspectRatio: "1.414 / 1",       // für die Beschnitt-Vorschau (buildCropViewport)
  randObenUnten: 0.05,               // Anteil der Bildhöhe (Prompt)
  randSeitlich: 0.07,                // Anteil der Bildbreite (Prompt)
  falzStreifen: 1 / 14,              // Anteil der Bildbreite in der Mitte
};
// Prozentzahl für den Prompt, ohne Nachkommastellen: randProzent(0.07) -> "7"
function randProzent(anteil) { return String(Math.round(anteil * 100)); }
