// prompt-vergleich.js — NEU (22.09.2026, Plan Prompt-Aufraeumen Schritt 5).
//
// Vergleicht den ALTEN mit dem AUFGERAEUMTEN Bildprompt an 6 festen Test-Szenen mit euren echten
// Figuren (aus docs/ref/sitzung.json). Jeder Auftrag laeuft ueber den normalen Weg der App
// (/api/scene-job-start, mit Pruefung, Stil-Tor und Richter) -- also KOSTET ES GELD:
// 12 Auftraege x etwa 0,40 $ = rund 5 $ (vom Nutzer am 22.09.2026 freigegeben).
//
//   node dev-tools/prompt-vergleich.js            startet bzw. setzt fort und baut danach die Seite
//   node dev-tools/prompt-vergleich.js seite      baut nur die Vergleichsseite neu (kein Aufruf)
//   TROCKEN=1 node dev-tools/prompt-vergleich.js  baut nur die Instruktionen, schickt nichts los
//
// Fortsetzbar: jeder Auftrag steht mit seiner jobId in docs/ref/vergleich/lauf.json, BEVOR er
// losgeschickt wird. Ein zweiter Aufruf startet nichts doppelt, er fragt die bekannten Auftraege
// weiter ab (der Server lehnt eine bekannte jobId als "bereits gestartet" ab und berechnet nichts).
// Achtung: Ein Auftrag lebt auf dem Server eine Stunde. Das Fenster bitte offen lassen, bis alle
// fertig sind. Der Server erlaubt 10 Starts je Stunde -- das Werkzeug wartet dann von selbst.
//
// Fairness: je Szene bekommen alt und neu dieselben Vignetten, dieselben Heldenhandlungen und
// dieselben Hintergrundblaetter (gleicher Zufallsstartwert je Szene).
global.window = { location: { origin: process.env.APP || "https://wimmel-wizard-v3.vercel.app" } };
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.assetPath = (n) => "/assets/" + n;
const fs = require("fs"), path = require("path");
const APP = global.window.location.origin;
const nodeFetch = global.fetch;
require(path.join(__dirname, "../wimmel-wizard-v3/public/js/pipeline.js"));
const P = global.window.Pipeline;
const DIR = path.join(__dirname, "../docs/ref/vergleich");
const LAUF = path.join(DIR, "lauf.json");
fs.mkdirSync(DIR, { recursive: true });

// Zufall mit Startwert (mulberry32), damit alt und neu je Szene dieselben Zufallsentscheidungen sehen.
function mitStartwert(seed, fn) {
  const orig = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = orig; }
}

function helden() {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/ref/sitzung.json"), "utf8")).data;
  return (s.people || []).filter((p) => p.status === "done" && p.imageUrl).slice(0, 5).map((p) => {
    const spec = P.makeCharacterSpec({ id: p.id, name: p.name, role: p.role, sourceType: "chips" });
    spec.identityCore.age = p.age;
    spec.imageUrl = p.imageUrl;
    const blatt = p.blatt && p.blatt.fuer === p.imageUrl ? p.blatt.daten : null;
    spec.sceneDescription = p.sceneDescription || null;
    if (blatt) { spec.blatt = blatt; spec.sceneDescription = P.heldBeschreibungAusBlatt(spec, blatt); }
    return spec;
  });
}

const CAFE = { locId: "generic", type: "cutaway", en: "a cosy café with a long counter, small round tables, a kitchen behind and a room upstairs",
  regions: ["at the counter", "at the small tables", "in the kitchen", "upstairs"], regionMin: 5 };
const SZENEN = [
  { id: "T1", titel: "Bauernhof, offen", thema: "Bauernhof", komp: "open", fassungen: ["alt", "neu"] },
  { id: "T2", titel: "Stadt, offen", thema: "Stadt", komp: "open", fassungen: ["alt", "neu"] },
  { id: "T3", titel: "Weihnachten, Querschnitt", thema: "Weihnachten", komp: "cutaway", fassungen: ["alt", "neu"] },
  { id: "T4", titel: "Berg, offen", thema: "Berg", komp: "open", fassungen: ["alt", "neu"] },
  { id: "T5", titel: "Bauernhof, overview_cutaway (neuer Typ, nur neu)", thema: "Bauernhof", komp: "overview_cutaway", fassungen: ["neu", "neu2"] },
  { id: "T6", titel: "Chat-Weg: Café, Querschnitt", thema: null, komp: "cutaway", fassungen: ["alt", "neu"] },
];

function baue(szene, fassung, heroSpecs, seed) {
  const theme = szene.thema ? P.THEME_META[szene.thema] : CAFE;
  const aufbau = fassung.startsWith("neu") ? "neu" : "alt";
  return mitStartwert(seed, () => {
    const situations = P.autoSituations(theme, [], 20, []);
    return P.buildSceneComposeInputs({ heroSpecs, theme, situations, phase: P.ACTIVE_SCENE_PHASE, composition: szene.komp,
      usedTexts: [], licht: true, heldenNeu: true, blattfilter: false, koepfeGross: true, aufbau });
  });
}

function lade() { try { return JSON.parse(fs.readFileSync(LAUF, "utf8")); } catch (e) { return { auftraege: [] }; } }
function speichere(l) { fs.writeFileSync(LAUF, JSON.stringify(l, null, 1)); }
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
function neueId() { return "sj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10).replace(/[^a-z0-9]/g, "x"); }

async function starte(a) {
  for (;;) {
    const resp = await nodeFetch(APP + "/api/scene-job-start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a.body) });
    const txt = await resp.text();
    if (resp.status === 429) { console.log("  " + a.name + ": Stundengrenze erreicht, warte 5 Minuten …"); await warte(5 * 60 * 1000); continue; }
    if (!resp.ok) throw new Error(a.name + ": Start abgelehnt, HTTP " + resp.status + ": " + txt.slice(0, 200));
    return;
  }
}
async function frageAb(a) {
  for (;;) {
    let job = null;
    try {
      const resp = await nodeFetch(APP + "/api/scene-job-status?jobId=" + encodeURIComponent(a.jobId));
      const d = await resp.json().catch(() => ({}));
      if (resp.status === 404) { a.fehler = "Auftrag auf dem Server unbekannt oder abgelaufen (1 Stunde)"; return; }
      job = d.job || null;
    } catch (e) { /* Verbindungsaussetzer: weiter abfragen */ }
    if (job && job.status === "done") { a.ergebnis = job; return; }
    if (job && job.status === "error") { a.fehler = job.error || "Fehler"; a.ergebnis = job; return; }
    await warte(10000);
  }
}

async function lauf() {
  const heroSpecs = helden();
  if (!heroSpecs.length) throw new Error("Keine fertigen Figuren in docs/ref/sitzung.json.");
  console.log("Figuren: " + heroSpecs.map((s) => s.name + " (" + s.role + ", " + s.identityCore.age + ")").join(", "));
  const l = lade();
  SZENEN.forEach((sz, si) => sz.fassungen.forEach((f) => {
    const name = sz.id + "-" + f;
    if (l.auftraege.find((a) => a.name === name)) return;
    const b = baue(sz, f, heroSpecs, 1000 + si);
    l.auftraege.push({ name, szene: sz.id, titel: sz.titel, fassung: f.startsWith("neu") ? "neu" : "alt", jobId: neueId(), zeichen: b.instruction.length,
      body: { jobId: null, instruction: b.instruction, verifyPrompt: b.verifyPrompt, editImageUrl: b.editImageUrl, styleRefUrls: b.styleRefUrls, heroRefUrls: b.heroRefUrls,
        figuresBand: b.figuresBand, richter: true, richterRefUrl: P.richterReferenzUrl(), stilTor: true } });
  }));
  l.auftraege.forEach((a) => { a.body.jobId = a.jobId; });
  speichere(l);
  l.auftraege.forEach((a) => console.log("  " + a.name.padEnd(8) + a.fassung.padEnd(5) + String(a.zeichen).padStart(6) + " Zeichen"));
  if (process.env.TROCKEN === "1") {
    l.auftraege.forEach((a) => fs.writeFileSync(path.join(DIR, a.name + ".txt"), a.body.instruction));
    console.log("TROCKEN=1: nichts losgeschickt. Instruktionen stehen in docs/ref/vergleich/*.txt.");
    return;
  }
  // hoechstens 3 gleichzeitig; Fertige werden uebersprungen
  const offen = l.auftraege.filter((a) => !a.ergebnis && !a.fehler);
  let i = 0;
  async function arbeiter() {
    while (i < offen.length) {
      const a = offen[i++];
      if (!a.gestartet) { console.log("Starte " + a.name + " …"); await starte(a); a.gestartet = new Date().toISOString(); speichere(l); }
      console.log("Warte auf " + a.name + " …");
      await frageAb(a);
      speichere(l);
      console.log("  " + a.name + ": " + (a.fehler ? "FEHLER — " + a.fehler : (a.ergebnis.resultKeinBild ? "kein Bild (keiner hat das Stil-Tor bestanden)" : "fertig")));
    }
  }
  await Promise.all([arbeiter(), arbeiter(), arbeiter()]);
  seite(l);
}

function stilTorZahlen(l, fassung) {
  let k = 0, nein = 0, keinBild = 0, auftr = 0;
  l.auftraege.filter((a) => a.fassung === fassung && a.ergebnis).forEach((a) => {
    auftr++;
    if (a.ergebnis.resultKeinBild) keinBild++;
    (a.ergebnis.candidates || []).forEach((c) => { if (c.genStatus === "done") { k++; if (c.stilTor && c.stilTor.urteil === "nein") nein++; } });
  });
  return { auftr, k, nein, keinBild };
}

function seite(l) {
  l = l || lade();
  const best = (a) => a && a.ergebnis && Array.isArray(a.ergebnis.angebot) && a.ergebnis.angebot[0] ? a.ergebnis.angebot[0].url : null;
  const paare = [], einzeln = [];
  SZENEN.forEach((sz) => {
    const al = l.auftraege.filter((a) => a.szene === sz.id);
    if (sz.fassungen.every((f) => f.startsWith("neu"))) { einzeln.push({ sz, bilder: al.map(best) }); return; }
    const alt = al.find((a) => a.fassung === "alt"), neu = al.find((a) => a.fassung === "neu");
    // crypto statt Math.random: die Zuordnung soll sicher zufaellig sein (im ersten Test standen
    // zufaellig alle fuenf Szenen gleich -- moeglich, aber so ist es eindeutig).
    const links = require("crypto").randomInt(2) === 0 ? "alt" : "neu";
    if (!l.zuordnung) l.zuordnung = {};
    if (!l.zuordnung[sz.id]) l.zuordnung[sz.id] = links;
    const li = l.zuordnung[sz.id];
    paare.push({ sz, links: best(li === "alt" ? alt : neu), rechts: best(li === "alt" ? neu : alt) });
  });
  speichere(l);
  const za = stilTorZahlen(l, "alt"), zn = stilTorZahlen(l, "neu");
  const kriterien = ["Gesamteindruck", "Helden eins zu eins (inkl. Alter und Größe)", "Stil", "Größe und Zoom", "Dichte", "Falz (Mitte frei von Helden)", "Fehler (doppelt, Schrift, abgeschnitten)"];
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const bild = (u) => u ? '<a href="' + esc(u) + '" target="_blank"><img src="' + esc(u) + '"></a>' : '<div class="leer">kein Bild<br>(keiner hat das Stil-Tor bestanden, oder Fehler)</div>';
  let html = '<!doctype html><meta charset="utf-8"><title>Prompt-Vergleich alt/neu</title><style>body{font:15px system-ui;margin:20px;max-width:1500px}h2{margin-top:40px}.paar{display:grid;grid-template-columns:1fr 1fr;gap:14px}img{width:100%;border:2px solid #222}.leer{border:2px dashed #999;padding:60px;text-align:center;color:#777}table{border-collapse:collapse;margin-top:10px}td,th{border:1px solid #ccc;padding:5px 8px;text-align:left}td.w{white-space:nowrap}.hinweis{background:#fff6cc;padding:10px 14px;border:1px solid #e6d27a}</style>';
  html += '<h1>Prompt-Vergleich: bester Kandidat links gegen bester Kandidat rechts</h1><p class="hinweis">Welche Seite alt und welche neu ist, ist je Szene zufällig und steht erst nach dem Absenden da. „Bester Kandidat" = der Favorit, den die App der Kundin zuerst zeigt. Bild anklicken = volle Größe.</p>';
  paare.forEach((p, pi) => {
    html += '<h2>' + esc(p.sz.id + " · " + p.sz.titel) + '</h2><div class="paar"><div><b>Links</b>' + bild(p.links) + '</div><div><b>Rechts</b>' + bild(p.rechts) + '</div></div><table><tr><th>Kriterium</th><th>links besser</th><th>gleich</th><th>rechts besser</th></tr>';
    kriterien.forEach((k, ki) => {
      html += '<tr><td>' + esc(k) + '</td>' + ["L", "G", "R"].map((v) => '<td class="w"><input type="radio" name="' + p.sz.id + '_' + ki + '" value="' + v + '"></td>').join("") + '</tr>';
    });
    html += '</table><p>Anmerkung: <input size="90" name="' + p.sz.id + '_notiz"></p>';
  });
  einzeln.forEach((e) => {
    html += '<h2>' + esc(e.sz.id + " · " + e.sz.titel) + '</h2><div class="paar">' + e.bilder.map((u) => '<div>' + bild(u) + '</div>').join("") + '</div><p>Taugt der Typ für den Bauernhof? <label><input type="radio" name="' + e.sz.id + '_ok" value="ja"> ja</label> <label><input type="radio" name="' + e.sz.id + '_ok" value="nein"> nein</label> <label><input type="radio" name="' + e.sz.id + '_ok" value="offen"> weiß nicht</label> · Anmerkung: <input size="70" name="' + e.sz.id + '_notiz"></p>';
  });
  html += '<h2>Stil-Tor je Fassung (Messwert)</h2><table><tr><th>Fassung</th><th>Aufträge</th><th>Kandidaten</th><th>am Stil-Tor gescheitert</th><th>kein Bild</th></tr>' +
    [["alt", za], ["neu", zn]].map(([f, z]) => '<tr><td>' + f + '</td><td>' + z.auftr + '</td><td>' + z.k + '</td><td>' + z.nein + '</td><td>' + z.keinBild + '</td></tr>').join("") + '</table>';
  html += '<p><button id="los">Absenden und auflösen</button></p><pre id="aus"></pre><script>const Z=' + JSON.stringify(l.zuordnung) + ';const K=' + JSON.stringify(kriterien) + ';' +
    'document.getElementById("los").onclick=()=>{const f={};document.querySelectorAll("input").forEach(i=>{if((i.type==="radio"&&i.checked)||(i.type!=="radio"&&i.value))f[i.name]=i.value});' +
    'const sum={};K.forEach((k,ki)=>{sum[k]={neu:0,gleich:0,alt:0,offen:0};Object.keys(Z).forEach(s=>{const v=f[s+"_"+ki];if(!v){sum[k].offen++;return}if(v==="G"){sum[k].gleich++;return}const seite=v==="L"?Z[s]:(Z[s]==="alt"?"neu":"alt");sum[k][seite]++})});' +
    'let t="Zuordnung (links war): "+JSON.stringify(Z)+"\\n\\nJe Kriterium (Szenen):\\n";K.forEach(k=>{const s=sum[k];t+=k+": neu besser "+s.neu+", gleich "+s.gleich+", alt besser "+s.alt+(s.offen?", offen "+s.offen:"")+"\\n"});' +
    't+="\\nRohantworten:\\n"+JSON.stringify(f,null,1);document.getElementById("aus").textContent=t;};</script>';
  const ziel = path.join(DIR, "vergleich.html");
  fs.writeFileSync(ziel, html);
  console.log("\nVergleichsseite: " + ziel);
  console.log("Stil-Tor alt: " + za.nein + " von " + za.k + " Kandidaten gescheitert, kein Bild " + za.keinBild + "; neu: " + zn.nein + " von " + zn.k + ", kein Bild " + zn.keinBild);
}

if (process.argv[2] === "seite") seite();
else lauf().catch((e) => { console.error("ABBRUCH: " + (e && e.message ? e.message : e)); process.exit(1); });
