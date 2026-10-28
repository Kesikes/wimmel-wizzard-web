// dev-tools/collage-prototyp/zonen.js — Zonen je Hintergrund (B2 28.10.2026, Runde 2 B2.2), VON HAND gepflegt.
//
// Koordinaten relativ (0..1) zur Bildbreite/-hoehe. Eine Zone ist ein Polygon, in dem die FUESSE einer
// Figur stehen duerfen (Runde 2 prueft auch die Fussbreite links/rechts). "helden": ob Helden hier
// stehen duerfen (Zimmer im Querschnitt nur fuer Nebenfiguren). "max": hoechstens so viele Figuren.
//
// RUNDE 2 (collage-runde2.js):
//   typ    Was hier passt: "gehen" (Wege: Seitenansicht gehend, tragend), "stehen" (Plaetze, Zimmer:
//          vorne, Ruecken, buecken), "sitzen" (Bank im Sprite -- nur auf ebenem Boden: Wiese, Terrasse,
//          Platz, Promenade), "wasser-ufer" (am Wasser: Ruecken zum Betrachter, buecken, schauen).
//   kopf   ZIEL-KOPFMASS = Wangenabstand (siehe kopf.js) als Anteil der Bildhoehe, linear zwischen zwei
//          Fuss-Hoehen: { y: [hinten, vorne], wangen: [hinten, vorne] }. Gilt fuer ALLE Figuren gleich --
//          Kinder/Erwachsene unterscheiden sich nur in der Koerperlaenge. Faustregel: Erwachsener ≈ 3,4 x
//          Wangenabstand hoch.
//   zone.wangen  feste Kopfgroesse fuer Zimmer im Querschnitt (Tiefe der Hausfront, nicht der Fusshoehe).
//   sonne  Richtung des Bodenschattens fuer V4 ([dx, dy], x nach rechts).
// Die Felder massstab/tiefe bleiben fuer collage.js (Runde 1).
//
// PFLEGE: `ZONEN=1 node dev-tools/collage-prototyp/collage.js` zeichnet die Zonen ueber die Hintergruende,
// danach mit `NUR_V1=1 node dev-tools/collage-prototyp/collage-runde2.js` kostenlos neu platzieren.
// H2/H3 sind nach den echten Bildern aus Runde 1 (28.10., 20:21) eingemessen.
const ZONEN = {
  H1: {
    titel: "Gardasee (GPT Image 2, vorhanden)",
    massstab: { hinten: 0.075, vorne: 0.21 },
    kopf: { y: [0.49, 0.80], wangen: [0.019, 0.047] },
    sonne: [1, 0.12],
    zonen: [
      { id: "platz-vorne", helden: true, typ: ["stehen", "gehen", "sitzen"], tiefe: [0.70, 0.80], poly: [[0.03, 0.765], [0.34, 0.765], [0.40, 0.785], [0.40, 0.81], [0.26, 0.815], [0.12, 0.81], [0.03, 0.805]] },
      { id: "weg-mitte", helden: true, typ: ["gehen", "stehen"], tiefe: [0.85, 0.92], poly: [[0.27, 0.825], [0.40, 0.82], [0.46, 0.85], [0.47, 0.875], [0.40, 0.875], [0.31, 0.865]] },
      { id: "promenade", helden: true, typ: ["gehen", "stehen", "sitzen"], tiefe: [0.48, 0.58], poly: [[0.495, 0.50], [0.52, 0.515], [0.53, 0.555], [0.525, 0.60], [0.50, 0.60]] },
      { id: "promenade-see", helden: true, typ: ["wasser-ufer", "gehen", "stehen"], tiefe: [0.50, 0.62], poly: [[0.53, 0.525], [0.60, 0.565], [0.70, 0.598], [0.78, 0.627], [0.775, 0.645], [0.72, 0.625], [0.62, 0.605], [0.60, 0.575], [0.53, 0.545]] }, // unter der Ufermauer, ueber den Beeten
      { id: "steg", helden: true, typ: ["wasser-ufer", "stehen"], tiefe: [0.30, 0.36], poly: [[0.62, 0.50], [0.775, 0.478], [0.78, 0.497], [0.63, 0.52]] }, // nur vor dem Ruderboot
      { id: "wiese", helden: true, typ: ["stehen", "sitzen"], tiefe: [0.62, 0.78], poly: [[0.72, 0.70], [0.80, 0.675], [0.95, 0.70], [0.95, 0.80], [0.86, 0.82], [0.77, 0.80]] },
      { id: "strand", helden: true, typ: ["wasser-ufer", "stehen", "sitzen"], tiefe: [0.84, 0.92], poly: [[0.78, 0.835], [0.98, 0.84], [0.98, 0.90], [0.88, 0.905], [0.80, 0.88]] },
      { id: "cafe", helden: false, max: 3, typ: ["stehen"], tiefe: [0.62, 0.66], poly: [[0.29, 0.625], [0.36, 0.62], [0.44, 0.64], [0.44, 0.655], [0.36, 0.665], [0.29, 0.655]] }, // zwischen den Tischen
      { id: "zimmer-kueche", helden: false, max: 2, typ: ["stehen"], wangen: 0.029, tiefe: [0.16, 0.16], poly: [[0.06, 0.528], [0.25, 0.528], [0.25, 0.538], [0.06, 0.538]] },
      { id: "zimmer-wohnen", helden: false, max: 1, typ: ["stehen"], wangen: 0.029, tiefe: [0.16, 0.16], poly: [[0.15, 0.357], [0.24, 0.357], [0.24, 0.367], [0.15, 0.367]] },
      { id: "zimmer-laden", helden: false, max: 1, typ: ["stehen"], wangen: 0.029, tiefe: [0.16, 0.16], poly: [[0.195, 0.722], [0.25, 0.722], [0.25, 0.732], [0.195, 0.732]] },
    ],
  },
  H2: {
    titel: "Bauernhof Spätsommer (GPT Image 2, Runde 1)",
    massstab: { hinten: 0.08, vorne: 0.22 },
    kopf: { y: [0.42, 0.85], wangen: [0.016, 0.044] },
    sonne: [1, 0.1],
    zonen: [
      { id: "hof-hinten", helden: true, typ: ["gehen", "stehen"], tiefe: [0.40, 0.55], poly: [[0.30, 0.43], [0.42, 0.425], [0.60, 0.425], [0.70, 0.445], [0.75, 0.50], [0.72, 0.555], [0.50, 0.565], [0.32, 0.555], [0.27, 0.50]] },
      { id: "hof-vorne", helden: true, typ: ["stehen", "gehen", "sitzen"], tiefe: [0.56, 0.85], poly: [[0.32, 0.58], [0.72, 0.575], [0.84, 0.60], [0.88, 0.70], [0.85, 0.79], [0.65, 0.82], [0.45, 0.83], [0.33, 0.80], [0.29, 0.70]] },
      { id: "vor-dem-haus", helden: true, typ: ["stehen", "sitzen", "gehen"], tiefe: [0.36, 0.40], poly: [[0.40, 0.415], [0.60, 0.415], [0.63, 0.44], [0.40, 0.445]] },
      { id: "weg-feld", helden: false, typ: ["gehen"], tiefe: [0.25, 0.35], poly: [[0.285, 0.355], [0.315, 0.33], [0.325, 0.345], [0.30, 0.40], [0.265, 0.445], [0.235, 0.445], [0.26, 0.40]] },
      { id: "teich-ufer", helden: true, typ: ["wasser-ufer", "sitzen", "stehen"], tiefe: [0.70, 0.78], poly: [[0.07, 0.775], [0.18, 0.765], [0.245, 0.75], [0.28, 0.775], [0.22, 0.805], [0.10, 0.81]] },
    ],
  },
  H3: {
    titel: "Unser Haus (GPT Image 2 Edit aus zwei Ortsfotos, Runde 1)",
    massstab: { hinten: 0.08, vorne: 0.22 },
    kopf: { y: [0.35, 0.95], wangen: [0.023, 0.036] },
    sonne: [1, 0.1],
    zonen: [
      { id: "terrasse", helden: true, typ: ["stehen", "sitzen"], tiefe: [0.55, 0.62], poly: [[0.17, 0.59], [0.21, 0.60], [0.30, 0.615], [0.38, 0.575], [0.40, 0.575], [0.33, 0.635], [0.18, 0.605]] }, // vor dem Tisch
      { id: "pflaster", helden: true, typ: ["gehen", "stehen"], tiefe: [0.60, 0.72], poly: [[0.36, 0.62], [0.44, 0.585], [0.53, 0.585], [0.53, 0.64], [0.62, 0.665], [0.74, 0.685], [0.76, 0.715], [0.70, 0.73], [0.55, 0.70], [0.45, 0.67]] },
      { id: "einfahrt", helden: true, typ: ["gehen", "stehen"], tiefe: [0.75, 0.94], poly: [[0.71, 0.76], [0.86, 0.73], [0.84, 0.80], [0.80, 0.88], [0.80, 0.94], [0.71, 0.94], [0.70, 0.84]] },
      { id: "garten-links", helden: true, typ: ["stehen", "sitzen"], tiefe: [0.30, 0.36], poly: [[0.19, 0.30], [0.255, 0.30], [0.255, 0.36], [0.16, 0.365], [0.16, 0.33]] }, // hinter dem Sonnensegel, rechts vom Apfelbaum
      { id: "sandkasten", helden: true, max: 2, typ: ["stehen"], tiefe: [0.44, 0.47], poly: [[0.12, 0.445], [0.18, 0.44], [0.185, 0.465], [0.125, 0.47]] },
      { id: "garten-rechts", helden: true, typ: ["stehen", "sitzen"], tiefe: [0.30, 0.41], poly: [[0.81, 0.32], [0.86, 0.33], [0.95, 0.38], [0.95, 0.41], [0.86, 0.405], [0.82, 0.37]] }, // Waescheleine, vor dem Garagendach
      { id: "gehweg", helden: true, typ: ["gehen"], tiefe: [0.86, 0.99], poly: [[0.06, 0.865], [0.20, 0.885], [0.40, 0.935], [0.55, 0.965], [0.53, 0.99], [0.38, 0.965], [0.20, 0.925], [0.06, 0.905]] },
      { id: "zimmer-oben-mitte", helden: false, max: 1, typ: ["stehen"], wangen: 0.028, tiefe: [0.6, 0.6], poly: [[0.44, 0.30], [0.50, 0.30], [0.50, 0.31], [0.44, 0.31]] },
      { id: "zimmer-oben-rechts", helden: false, max: 1, typ: ["stehen"], wangen: 0.028, tiefe: [0.6, 0.6], poly: [[0.59, 0.345], [0.64, 0.345], [0.64, 0.355], [0.59, 0.355]] },
      { id: "wohnzimmer", helden: false, max: 1, typ: ["stehen"], wangen: 0.028, tiefe: [0.6, 0.6], poly: [[0.30, 0.525], [0.37, 0.52], [0.37, 0.53], [0.30, 0.535]] },
      { id: "wintergarten", helden: false, max: 1, typ: ["stehen"], wangen: 0.028, tiefe: [0.6, 0.6], poly: [[0.56, 0.595], [0.61, 0.595], [0.61, 0.605], [0.56, 0.605]] },
    ],
  },
};
module.exports = { ZONEN };
