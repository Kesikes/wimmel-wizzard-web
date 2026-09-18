// dev-tools/gag-mix.js — Kontrollwerkzeug fuer die Vignetten-Mischung (NEU, 18.09.2026)
//
// WOZU: der Mengen-Befund vom 18.09.2026 war, dass beim Bauernhof zwoelf von zwanzig Vignetten
// ueberhaupt keinen Menschen enthielten. Seitdem gibt es drei Stellschrauben dagegen
// (GROUP_LIBRARY, GROUP_SLOTS und den Tier-Deckel in topUpSituations, alle in pipeline.js).
// Dieses Skript zeigt, was dabei herauskommt -- ohne einen einzigen Bildaufruf und ohne Kosten.
//
// AUSSERDEM prueft es die Heuristik istNurTier() gegen: sie ordnet Gags ueber eine Wortliste ein,
// und eine Wortliste irrt sich. Die Ausgabe listet jeden als "nur Tier" eingestuften Gag einzeln
// auf, damit man Fehlzuordnungen mit blossem Auge findet.
//
// AUFRUF (im Repo-Wurzelverzeichnis):
//     node dev-tools/gag-mix.js            # alle sechs Themen, je 200 Durchlaeufe
//     node dev-tools/gag-mix.js farm 1000  # ein Thema, eigene Zahl
//
// Die Mischung ist zufaellig (shuffledPool), deshalb wird gemittelt statt einmal gezogen.

global.window = {};
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.fetch = () => Promise.reject(new Error("kein Netz noetig"));
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require("../wimmel-wizard-v3/public/js/pipeline.js");
const P = global.window.Pipeline;

const THEMEN = Object.keys(P.THEME_META).map((k) => ({ name: k, locId: P.THEME_META[k].locId }));
const nurThema = process.argv[2];
const LAEUFE = parseInt(process.argv[3], 10) || 200;
const ZIEL = 20;

// Exakte Menge aller Gruppen-Vignetten-Texte -- sicherer als ein Textmuster (ein Muster uebersieht
// z.B. "a knot of about nine relatives", und genau solche Fehlalarme will dieses Skript nicht
// produzieren, es soll ja selbst die Kontrolle sein).
const GRUPPEN_TEXTE = new Set();
Object.keys(P.GROUP_LIBRARY).forEach((k) => P.GROUP_LIBRARY[k].forEach((g) => GRUPPEN_TEXTE.add(g.en)));


let fehler = 0;

THEMEN.filter((t) => !nurThema || t.locId === nurThema || t.name.toLowerCase() === nurThema.toLowerCase())
  .forEach((t) => {
    let tierSumme = 0, menschSumme = 0, gruppenSumme = 0;
    let schlechtesterTier = 0, wenigsteGruppen = 99;
    for (let i = 0; i < LAEUFE; i++) {
      const sits = P.autoSituations(P.THEME_META[t.name], [], ZIEL, []);
      const tier = sits.filter((s) => P.istNurTier(s.text)).length;
      const mensch = sits.filter((s) => P.hatMensch(s.text)).length;
      const gruppen = sits.filter((s) => GRUPPEN_TEXTE.has(s.text)).length;
      tierSumme += tier; menschSumme += mensch; gruppenSumme += gruppen;
      if (tier > schlechtesterTier) schlechtesterTier = tier;
      if (gruppen < wenigsteGruppen) wenigsteGruppen = gruppen;
    }
    const deckel = Math.floor(ZIEL / 4);
    const tierSchnitt = (tierSumme / LAEUFE).toFixed(1);
    const ok = schlechtesterTier <= deckel && wenigsteGruppen >= P.GROUP_SLOTS;
    if (!ok) fehler++;
    console.log(
      (ok ? "  OK  " : "  !!  ") + t.name.padEnd(13) +
      "reine Tier-Gags " + tierSchnitt + " im Schnitt, schlechtester Fall " + schlechtesterTier + " (Deckel " + deckel + ")" +
      " | Vignetten mit Menschen " + (menschSumme / LAEUFE).toFixed(1) + " von " + ZIEL +
      " | Gruppen " + (gruppenSumme / LAEUFE).toFixed(1) + ", mindestens " + wenigsteGruppen + " (Soll " + P.GROUP_SLOTS + ")"
    );
  });

console.log("");
console.log("Als \"nur Tier\" eingestuft (Heuristik istNurTier -- bitte durchsehen):");
Object.keys(P.GAG_LIBRARY).forEach((loc) => {
  const treffer = P.GAG_LIBRARY[loc].filter((g) => P.istNurTier(g.en));
  if (!treffer.length) return;
  console.log("  " + loc + " (" + treffer.length + " von " + P.GAG_LIBRARY[loc].length + "):");
  treffer.forEach((g) => console.log("      " + g.en));
});

console.log("");
process.exit(fehler ? 1 : 0);
