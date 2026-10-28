// dev-tools/collage-prototyp/zonen.js — Zonen je Hintergrund (B2, 28.10.2026), VON HAND gepflegt.
//
// Koordinaten relativ (0..1) zur Bildbreite/-hoehe. Eine Zone ist ein Polygon, in dem die FUESSE einer
// Figur stehen duerfen. tiefe = [oben, unten]: 0 = ganz hinten (klein), 1 = ganz vorne (gross); die
// Tiefe eines Fusspunkts wird zwischen Ober- und Unterkante der Zone linear verteilt. "helden": ob
// Helden hier stehen duerfen (Zimmer im Querschnitt nur fuer Nebenfiguren). "max": hoechstens so viele
// Figuren in dieser Zone (Zimmer: 1-2).
//
// MASSSTAB: Hoehe eines ERWACHSENEN als Anteil der Bildhoehe bei Tiefe 0 und 1 (Kinder/Grosseltern
// skaliert das Werkzeug mit rollenFaktor()). Fuer H1 aus dem Hand-Mock abgelesen und etwas kleiner
// gesetzt (mehr Gewimmel): Hand-Mock Erwachsener vorne
// (Fuss bei 80 % der Hoehe) ca. 21 %, hinten auf dem Steg (49 %) ca. 9 %.
//
// H2 und H3 entstehen erst im Lauf -- ihre Zonen sind SCHAETZUNGEN fuer "viel freie Flaeche vorne und
// in der Mitte" (so verlangt es der Prompt). Nach dem ersten Lauf: `ZONEN=1 node dev-tools/collage-
// prototyp/collage.js` zeichnet alle Zonen ueber die Hintergruende (ausgabe/collage-zonen-*.png),
// dann hier nachziehen und mit `NUR_V1=1` (kostenlos) neu platzieren.
const ZONEN = {
  H1: {
    titel: "Gardasee (GPT Image 2, vorhanden)",
    massstab: { hinten: 0.075, vorne: 0.21 },
    zonen: [
      { id: "platz-vorne", helden: true, tiefe: [0.70, 0.80], poly: [[0.03, 0.765], [0.33, 0.765], [0.37, 0.80], [0.20, 0.815], [0.03, 0.805]] },
      { id: "weg-unten", helden: true, tiefe: [0.90, 0.98], poly: [[0.42, 0.905], [0.54, 0.90], [0.555, 0.975], [0.41, 0.975]] },
      { id: "promenade", helden: true, tiefe: [0.48, 0.62], poly: [[0.50, 0.50], [0.60, 0.535], [0.82, 0.625], [0.80, 0.655], [0.70, 0.62], [0.60, 0.58], [0.50, 0.545]] },
      { id: "steg", helden: true, tiefe: [0.30, 0.36], poly: [[0.62, 0.50], [0.775, 0.478], [0.78, 0.497], [0.63, 0.52]] }, // nur vor dem Ruderboot
      { id: "wiese", helden: true, tiefe: [0.62, 0.78], poly: [[0.72, 0.70], [0.80, 0.675], [0.95, 0.70], [0.95, 0.80], [0.86, 0.82], [0.77, 0.80]] },
      { id: "strand", helden: true, tiefe: [0.84, 0.92], poly: [[0.78, 0.835], [0.98, 0.84], [0.98, 0.90], [0.88, 0.905], [0.80, 0.88]] },
      { id: "zimmer-kueche", helden: false, max: 2, tiefe: [0.16, 0.16], poly: [[0.06, 0.528], [0.25, 0.528], [0.25, 0.538], [0.06, 0.538]] },
      { id: "zimmer-wohnen", helden: false, max: 1, tiefe: [0.16, 0.16], poly: [[0.15, 0.357], [0.24, 0.357], [0.24, 0.367], [0.15, 0.367]] },
      { id: "zimmer-laden", helden: false, max: 1, tiefe: [0.16, 0.16], poly: [[0.195, 0.722], [0.25, 0.722], [0.25, 0.732], [0.195, 0.732]] },
    ],
  },
  H2: {
    titel: "Bauernhof Spätsommer (GPT Image 2, neu)",
    massstab: { hinten: 0.08, vorne: 0.22 },
    geschaetzt: true,
    zonen: [
      { id: "vorne", helden: true, tiefe: [0.80, 0.95], poly: [[0.05, 0.80], [0.95, 0.80], [0.95, 0.95], [0.05, 0.95]] },
      { id: "mitte", helden: true, tiefe: [0.55, 0.75], poly: [[0.06, 0.62], [0.94, 0.62], [0.94, 0.77], [0.06, 0.77]] },
      { id: "hinten", helden: false, tiefe: [0.35, 0.50], poly: [[0.10, 0.50], [0.90, 0.50], [0.90, 0.59], [0.10, 0.59]] },
    ],
  },
  H3: {
    titel: "Unser Haus (GPT Image 2 Edit aus zwei Ortsfotos)",
    massstab: { hinten: 0.08, vorne: 0.22 },
    geschaetzt: true,
    zonen: [
      { id: "garten-vorne", helden: true, tiefe: [0.80, 0.95], poly: [[0.05, 0.80], [0.95, 0.80], [0.95, 0.95], [0.05, 0.95]] },
      { id: "garten-mitte", helden: true, tiefe: [0.55, 0.75], poly: [[0.06, 0.63], [0.94, 0.63], [0.94, 0.77], [0.06, 0.77]] },
      { id: "weg-hinten", helden: false, tiefe: [0.38, 0.50], poly: [[0.10, 0.52], [0.90, 0.52], [0.90, 0.60], [0.10, 0.60]] },
    ],
  },
};
module.exports = { ZONEN };
