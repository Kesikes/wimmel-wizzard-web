// Vergleicht die beiden Kopien der Wertungslogik: severityOf() im Browser-Modul pipeline.js und
// countViolations() in api/_lib/fal-queue.js. Kein fal-Aufruf, reine Rechnung.
const fs = require("fs"), vm = require("vm");
const src = fs.readFileSync(__dirname + "/../wimmel-wizard-v3/public/js/pipeline.js", "utf8");
const sandbox = { window: {}, document: { createElement: () => ({ style: {}, appendChild(){}, setAttribute(){} }) }, console, location: { origin: "http://x" } };
sandbox.window.document = sandbox.document;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const P = sandbox.window.Pipeline;
const Q = require(__dirname + "/../wimmel-wizard-v3/api/_lib/fal-queue.js");

const band = [55, 90];
const faelle = [
  { name: "alles sauber", v: { heroes_found: [1], shaded_of_ten: 0, blank_of_ten: 0, depth_ratio: 2.4, scale_est: 3.0, heads_ok: true, figures_est: 70, mouths_of_ten: 1, logic_ok: true, no_text_ok: true } },
  { name: "scale klein, Tiefe ok -> mittel", v: { heroes_found: [1], shaded_of_ten: 0, blank_of_ten: 0, depth_ratio: 3.2, scale_est: 2.2, heads_ok: true, figures_est: 70, mouths_of_ten: 1, logic_ok: true, no_text_ok: true } },
  { name: "scale klein, Tiefe schwach -> schwer", v: { heroes_found: [1], shaded_of_ten: 0, blank_of_ten: 0, depth_ratio: 1.2, scale_est: 2.2, heads_ok: true, figures_est: 70, mouths_of_ten: 1, logic_ok: true, no_text_ok: true } },
  { name: "Querschnitt: depth null, scale klein -> schwer", v: { heroes_found: [1], shaded_of_ten: 0, blank_of_ten: 0, depth_ratio: null, scale_est: 2.2, heads_ok: true, figures_est: 70, mouths_of_ten: 1, logic_ok: true, no_text_ok: true } },
  { name: "Stil: 2 plastisch, 1 leer", v: { heroes_found: [1], shaded_of_ten: 2, blank_of_ten: 1, depth_ratio: 2.4, scale_est: 3.0, heads_ok: true, figures_est: 70, mouths_of_ten: 1, logic_ok: true, no_text_ok: true } },
  { name: "Stil: genau 1 plastisch = erlaubt", v: { heroes_found: [1], shaded_of_ten: 1, blank_of_ten: 0, depth_ratio: 2.4, scale_est: 3.0, heads_ok: true, figures_est: 70, mouths_of_ten: 1, logic_ok: true, no_text_ok: true } },
  { name: "Heldin fehlt + Muender + zu wenig Figuren", v: { heroes_found: [0], shaded_of_ten: 0, blank_of_ten: 0, depth_ratio: 2.4, scale_est: 3.0, heads_ok: false, figures_est: 30, mouths_of_ten: 6, logic_ok: false, no_text_ok: false } },
];
let fehler = 0;
for (const f of faelle) {
  const a = P.severityOf(f.v, band);
  const b = Q.countViolations(JSON.stringify(f.v), band).severity;
  // helden seit 21.09.2026 mitverglichen (Auswahlstufe zwischen schwer und mittel).
  const gleich = a.heavy === b.heavy && a.helden === b.helden && a.medium === b.medium && a.light === b.light &&
                 JSON.stringify(a.gruende) === JSON.stringify(b.gruende);
  if (!gleich) fehler++;
  console.log((gleich ? "OK  " : "ABW ") + f.name);
  console.log("    client " + a.heavy + "/" + a.medium + "/" + a.light + " helden " + a.helden + "   server " + b.heavy + "/" + b.medium + "/" + b.light + " helden " + b.helden);
  a.gruende.forEach(g => console.log("      · " + g));
  if (!gleich) b.gruende.forEach(g => console.log("    S · " + g));
}
console.log(fehler ? "\n" + fehler + " ABWEICHUNG(EN)" : "\nbeide Kopien identisch");
