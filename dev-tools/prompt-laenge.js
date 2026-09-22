// dev-tools/prompt-laenge.js — misst die Prompt-Laenge im laengsten Fall (NEU, 18.09.2026)
//
// WOZU: api/scene-job-start.js weist eine zu lange instruction mit 400 ab -- und zwar erst beim
// Generieren, beim Kunden, nicht beim Entwickeln. Der Prompt waechst mit jeder neuen Regel, und am
// 18.09.2026 waren es nach mehreren Ergaenzungen nur noch 1,4 KB bis zur damaligen Grenze. Dieses
// Skript sagt in einer Sekunde, wie viel Luft noch ist. Nach jeder Prompt-Aenderung aufrufen.
//
//     node dev-tools/prompt-laenge.js

global.window = {};
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.fetch = () => Promise.reject(new Error("kein Netz noetig"));
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require("../wimmel-wizard-v3/public/js/pipeline.js");
const P = global.window.Pipeline;

// Muss zur Grenze in api/scene-job-start.js passen -- zwei Kopien, bei einer Aenderung beide.
const GRENZE = 30000; // seit 22.09.2026 (vorher 24.000), siehe api/scene-job-start.js

function held(i) {
  const s = P.makeCharacterSpec({ id: "held" + i, name: "Maximiliane" + i, role: "girl", sourceType: "chips" });
  s.identityCore.age = 6;
  s.identityCore.hairColor = "lange gewellte dunkelbraune Haare";
  s.defaultOutfit.top = "rotes Kleid mit weissen Punkten";
  return s;
}

let schlimmster = 0, schlimmsterFall = "";
Object.keys(P.THEME_META).forEach((themaName) => {
  const theme = P.THEME_META[themaName];
  Object.keys(P.SCENE_PHASES).forEach((phaseId) => {
    const phase = P.SCENE_PHASES[phaseId];
    phase.compositions.forEach((compId) => {
      for (let n = 1; n <= 5; n++) {
        const heroSpecs = []; for (let i = 1; i <= n; i++) heroSpecs.push(held(i));
        const comp = P.pickComposition(theme, phase, compId);
        const txt = P.scenePrompt({
          heroSpecs, theme, situations: P.autoSituations(theme, [], 20, []),
          bgCharacterCount: 4, phase, composition: comp,
          heroActions: P.pickHeroActions(heroSpecs, theme.locId, []),
        });
        const laenge = P.sceneComposeInstruction(txt).length;
        if (laenge > schlimmster) {
          schlimmster = laenge;
          schlimmsterFall = themaName + " / " + phaseId + " / " + compId + " / " + n + " Helden";
        }
      }
    });
  });
});

// NEU (21.09.2026): derselbe Durchlauf mit dem Testschalter helden=neu -- laengere
// Heldenbeschreibung aus dem Figurenblatt (mit Kleidung) und Unterscheidungssatz fuer Kinder.
// Absichtlich lange Beschreibungen, damit der schlimmste Fall gemessen wird.
function heldNeu(i) {
  const s = held(i);
  s.blatt = P.parseFigurenblatt(JSON.stringify({ hair_color: "light brown", hair: "long wavy with a fringe",
    // Je Held ein ANDERES Oberteil: sonst findet heldExklusivMerkmal() kein Alleinstellungsmerkmal
    // und der Einmal-Satz faellt kuerzer aus als im echten Fall (2026-09-21c).
    beard: false, top: ["red", "blue", "green", "yellow", "purple"][(i - 1) % 5] + "-and-white striped long-sleeved shirt with a collar",
    bottom: "dark blue dungarees with big front pockets", shoes: "yellow rubber boots", extras: "round glasses and a small green backpack" }));
  s.sceneDescription = P.heldBeschreibungAusBlatt(s, s.blatt);
  return s;
}
let schlimmsterNeu = 0, fallNeu = "";
Object.keys(P.THEME_META).forEach((themaName) => {
  const theme = P.THEME_META[themaName];
  Object.keys(P.SCENE_PHASES).forEach((phaseId) => {
    const phase = P.SCENE_PHASES[phaseId];
    phase.compositions.forEach((compId) => {
      for (let n = 1; n <= 5; n++) {
        const heroSpecs = []; for (let i = 1; i <= n; i++) heroSpecs.push(heldNeu(i));
        const comp = P.pickComposition(theme, phase, compId);
        const txt = P.scenePrompt({ heroSpecs, theme, situations: P.autoSituations(theme, [], 20, []),
          bgCharacterCount: 4, phase, composition: comp, heroActions: P.pickHeroActions(heroSpecs, theme.locId, []), heldenNeu: true,
          // NEU (2026-09-21f): koepfe=gross dazu -- der schlimmste Fall ist beides zusammen.
          koepfeGross: true });
        const laenge = P.sceneComposeInstruction(txt).length;
        if (laenge > schlimmsterNeu) { schlimmsterNeu = laenge; fallNeu = themaName + " / " + phaseId + " / " + compId + " / " + n + " Helden"; }
      }
    });
  });
});
console.log("Mit helden=neu + koepfe=gross, laengster Fall: " + fallNeu);
console.log("  instruction  " + schlimmsterNeu + " Zeichen   Puffer " + (GRENZE - schlimmsterNeu) + (GRENZE - schlimmsterNeu < 0 ? "   <-- UEBER DER GRENZE" : ""));
console.log("");
if (schlimmsterNeu > schlimmster) { schlimmster = schlimmsterNeu; schlimmsterFall = "helden=neu: " + fallNeu; }

// NEU (22.09.2026): derselbe Extremfall mit dem AUFGERAEUMTEN Aufbau (scenePromptNeu, siehe
// docs/prompt-inventar-2026-09-22.md). Nur Anzeige -- die App laeuft noch mit dem alten, deshalb
// zaehlt fuer die Grenze unten weiter der alte Wert.
let schlimmsterAufbauNeu = 0, fallAufbauNeu = "";
Object.keys(P.THEME_META).forEach((themaName) => {
  const theme = P.THEME_META[themaName];
  Object.keys(P.SCENE_PHASES).forEach((phaseId) => {
    const phase = P.SCENE_PHASES[phaseId];
    phase.compositions.forEach((compId) => {
      for (let n = 1; n <= 5; n++) {
        const heroSpecs = []; for (let i = 1; i <= n; i++) heroSpecs.push(heldNeu(i));
        const comp = P.pickComposition(theme, phase, compId);
        const txt = P.scenePromptNeu({ heroSpecs, theme, situations: P.autoSituations(theme, [], 20, []),
          bgCharacterCount: 4, phase, composition: comp, heroActions: P.pickHeroActions(heroSpecs, theme.locId, []), licht: true, koepfeGross: true });
        const laenge = P.sceneComposeInstructionNeu(txt).length;
        if (laenge > schlimmsterAufbauNeu) { schlimmsterAufbauNeu = laenge; fallAufbauNeu = themaName + " / " + phaseId + " / " + compId + " / " + n + " Helden"; }
      }
    });
  });
});
console.log("AUFGERAEUMTER Aufbau, laengster Fall: " + fallAufbauNeu);
console.log("  instruction  " + schlimmsterAufbauNeu + " Zeichen   Puffer " + (GRENZE - schlimmsterAufbauNeu));
console.log("");

const rest = GRENZE - schlimmster;
console.log("Laengster Fall: " + schlimmsterFall);
console.log("  instruction  " + schlimmster + " Zeichen");
console.log("  Grenze       " + GRENZE + " (api/scene-job-start.js)");
console.log("  Puffer       " + rest + (rest < 2000 ? "   <-- KNAPP, Grenze anheben" : ""));
process.exit(rest <= 0 ? 1 : 0);
