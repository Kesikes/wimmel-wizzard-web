// prompt-inventar.js — NEU (22.09.2026, Plan Prompt-Aufraeumen Schritt 2). Offline, kostenlos.
// Baut den Bildprompt fuer alle Themen x Phasen x Kompositionen (3 und 5 Helden, heutige Vorgaben:
// Helden aus dem Figurenblatt, grosse Koepfe, Licht an), zerlegt ihn in Saetze und ordnet jeden Satz
// seiner HERKUNFT im Code zu (Konstante oder Funktion in pipeline.js). Ausgabe:
//   docs/ref/prompt-inventar.tsv  -- ein Satz je Zeile: Block, Herkunft, Zeichen, in wie vielen der
//                                    gebauten Prompts, Satzanfang
//   Konsole                       -- Summen je Herkunft, in Prompt-Reihenfolge
// Aufruf: node dev-tools/prompt-inventar.js
global.window = {};
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.fetch = () => Promise.reject(new Error("kein Netz noetig"));
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const fs = require("fs"), path = require("path");
const QUELLE = path.join(__dirname, "../wimmel-wizard-v3/public/js/pipeline.js");
require(QUELLE);
const P = global.window.Pipeline;
const src = fs.readFileSync(QUELLE, "utf8");
const zeilen = src.split("\n");

function held(i, role, age, top) {
  const s = P.makeCharacterSpec({ id: "h" + i, name: "H" + i, role, sourceType: "chips" });
  s.identityCore.age = age;
  s.blatt = P.parseFigurenblatt(JSON.stringify({ hair_color: ["blond", "brown", "black", "red", "grey"][i % 5], hair: "short wavy", beard: false, top, bottom: "blue shorts", shoes: "brown shoes", extras: "" }));
  s.sceneDescription = P.heldBeschreibungAusBlatt(s, s.blatt);
  return s;
}
const FAMILIE = [held(1, "boy", 3, "blue-and-white checked shirt"), held(2, "girl", 4, "cream polka dot top"), held(3, "man", 40, "green jumper"),
  held(4, "woman", 38, "yellow raincoat"), held(5, "girl", 7, "red striped dress")];

function saetze(t) { return t.split(/(?<=[.!?])\s+(?=[A-Z"„(])/).map((x) => x.trim()).filter(Boolean); }

// Herkunft: Satzanfang (ohne variable Teile) im Quelltext suchen; Treffer -> naechste umschliessende
// "const NAME =" oder "function NAME(" darueber.
const cache = new Map();
const MUSTER = [
  [/^wmlstil, /, "Eroeffnung (Ort, Komposition, Licht-Stichworte)"],
  [/appears only once and is the only/, "heldEinmalSatz"],
  [/^Reference image \d+ shows a/, "Heldenbeschreibung (imageRefMapping/heldBeschreibungAusBlatt)"],
  [/^In the background layer/, "densityInstruction (Hintergrund-Regionen)"],
  [/^Picture the image height divided/, "sizeRule"],
  [/^In the (foreground|midground|background), on the/, "Vignetten (sceneLayerText)"],
];
function herkunft(satz) {
  const probe = satz.replace(/\s+/g, " ");
  if (cache.has(probe)) return cache.get(probe);
  let erg = "?";
  for (const [re, name] of MUSTER) if (re.test(probe)) { cache.set(probe, name); return name; }
  // die laengsten festen Stuecke ohne Ziffern/Namen probieren
  const stuecke = probe.split(/(?:reference image \d+|Reference image \d+|H\d|\d+)/).map((x) => x.trim()).filter((x) => x.length >= 18).sort((a, b) => b.length - a.length);
  for (const st of stuecke) {
    const kurz = st.slice(0, 40).replace(/[\\"]/g, "");
    const idx = src.indexOf(kurz);
    if (idx < 0) continue;
    const zeile = src.slice(0, idx).split("\n").length - 1;
    for (let z = zeile; z >= 0; z--) {
      const m = zeilen[z].match(/^(?:const|var|let)\s+([A-Z_][A-Z0-9_]*)\s*=/) || zeilen[z].match(/^\s*(?:async\s+)?function\s+(\w+)\s*\(/);
      if (m) { erg = m[1]; break; }
    }
    break;
  }
  cache.set(probe, erg);
  return erg;
}

const alle = new Map(); // key: herkunft|satz -> {herkunft, satz, len, n, erstePos}
let prompts = 0;
const faelle = [];
Object.keys(P.THEME_META).forEach((themaName) => {
  const theme = P.THEME_META[themaName];
  Object.keys(P.SCENE_PHASES).forEach((phaseId) => {
    const phase = P.SCENE_PHASES[phaseId];
    phase.compositions.forEach((compId) => {
      [3, 5].forEach((n) => {
        const heroSpecs = FAMILIE.slice(0, n);
        const comp = P.pickComposition(theme, phase, compId);
        if (comp.id !== compId) return; // gesperrte Kombination (Berg/Stadt-Querschnitt)
        // nur Kombinationen, die im Betrieb vorkommen (Thema-Tabelle, Register Abschnitt 13)
        const haus = ["cutaway", "gridhouse", "overview_cutaway"].indexOf(compId) >= 0;
        if (haus !== (theme.type === "cutaway")) return;
        const txt = P.scenePrompt({ heroSpecs, theme, situations: P.autoSituations(theme, [], 20, []), bgCharacterCount: 4, phase, composition: comp,
          heroActions: P.pickHeroActions(heroSpecs, theme.locId, []), heldenNeu: true, koepfeGross: true, licht: true });
        const ins = P.sceneComposeInstruction(txt);
        prompts++;
        faelle.push({ fall: themaName + "/" + phaseId + "/" + compId + "/" + n, len: ins.length, saetze: saetze(ins).length });
        saetze(ins).forEach((s, pos) => {
          const h = herkunft(s);
          const key = h + "|" + s;
          const e = alle.get(key) || { herkunft: h, satz: s, len: s.length, n: 0, pos: [] };
          e.n++; e.pos.push(pos);
          alle.set(key, e);
        });
      });
    });
  });
});

const liste = [...alle.values()].map((e) => Object.assign(e, { mitte: e.pos.reduce((a, b) => a + b, 0) / e.pos.length }));
liste.sort((a, b) => a.mitte - b.mitte);
const tsv = ["mittlere_position\therkunft\tzeichen\tin_prompts\tsatz"].concat(liste.map((e) => [e.mitte.toFixed(1), e.herkunft, e.len, e.n + "/" + prompts, e.satz.replace(/\t/g, " ")].join("\t")));
fs.writeFileSync(path.join(__dirname, "../docs/ref/prompt-inventar.tsv"), tsv.join("\n") + "\n");

// Summen je Herkunft (Zeichen je Prompt im Mittel), in Prompt-Reihenfolge
const jeH = new Map();
liste.forEach((e) => {
  const g = jeH.get(e.herkunft) || { herkunft: e.herkunft, zeichen: 0, saetze: 0, mitte: [], varianten: 0 };
  g.zeichen += e.len * e.n / prompts; g.saetze += e.n / prompts; g.mitte.push(e.mitte); g.varianten++;
  jeH.set(e.herkunft, g);
});
const gruppen = [...jeH.values()].map((g) => Object.assign(g, { m: g.mitte.reduce((a, b) => a + b, 0) / g.mitte.length })).sort((a, b) => a.m - b.m);
console.log("Prompts gebaut: " + prompts + " (Themen x Phasen x Kompositionen, je 3 und 5 Helden)");
faelle.sort((a, b) => b.len - a.len);
console.log("Laengster: " + faelle[0].fall + " " + faelle[0].len + " Zeichen, " + faelle[0].saetze + " Saetze; kuerzester: " + faelle[faelle.length - 1].fall + " " + faelle[faelle.length - 1].len);
console.log("\nHerkunft                          Zeichen/Prompt  Saetze/Prompt  Varianten");
gruppen.forEach((g) => console.log(g.herkunft.padEnd(34) + String(Math.round(g.zeichen)).padStart(8) + String(g.saetze.toFixed(1)).padStart(14) + String(g.varianten).padStart(11)));
