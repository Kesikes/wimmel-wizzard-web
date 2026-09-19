// dev-tools/paare-bauen.js — baut den Blindtest fuer Variante D.
//
//     node dev-tools/paare-bauen.js [sitzung.json]
//
// Erzeugt docs/ref/paare.html: je Szene beide Kandidaten gross nebeneinander, beschriftet NUR mit
// "links" und "rechts". Welche Seite welcher Kandidat ist, wird gewuerfelt und steht
// ausschliesslich in docs/ref/paare-zuordnung.tsv -- nicht in der HTML-Datei, auch nicht im
// Dateinamen, auch nicht in der Reihenfolge. Auf der Seite steht nichts darueber, welchen
// Kandidaten die App gewaehlt hat oder was Variante D sagt.
const fs = require("fs");
const path = require("path");

const sitzungDatei = process.argv[2] || "docs/ref/sitzung.json";
const zielHtml = "docs/ref/paare.html";
const zielZuordnung = "docs/ref/paare-zuordnung.tsv";

const roh = JSON.parse(fs.readFileSync(sitzungDatei, "utf8"));
const stand = roh && roh.data ? roh.data : roh;
const bilder = (stand && stand.images) || [];

const zuordnung = ["# docs/ref/paare-zuordnung.tsv — welche Seite welcher Kandidat war.",
  "# NICHT anschauen, bevor die Blindwahl in docs/ref/wahrheit.tsv steht.",
  "# Spalten: szene, seite, kandidat", ""];
const abschnitte = [];
let szenen = 0;

bilder.forEach((bild, bi) => {
  const kand = (bild.candidates || []).filter((c) => c && c.url);
  const szene = (bi + 1) + " " + (bild.title || "Bild");
  if (kand.length !== 2) {
    abschnitte.push('<section><h2>' + esc(szene) + '</h2><p class="hinweis">Nur ' + kand.length +
      ' Kandidat(en) — kein Paar, uebersprungen.</p></section>');
    return;
  }
  szenen++;
  // Muenzwurf je Szene.
  const linksIstErster = Math.random() < 0.5;
  const links = linksIstErster ? kand[0] : kand[1];
  const rechts = linksIstErster ? kand[1] : kand[0];
  const nameLinks = szene + " K" + (kand.indexOf(links) + 1);
  const nameRechts = szene + " K" + (kand.indexOf(rechts) + 1);
  zuordnung.push([szene, "links", nameLinks].join("\t"));
  zuordnung.push([szene, "rechts", nameRechts].join("\t"));
  abschnitte.push(
    '<section>\n  <h2>' + esc(szene) + '</h2>\n  <div class="paar">\n' +
    '    <figure><img src="' + esc(links.url) + '" alt=""><figcaption>links</figcaption></figure>\n' +
    '    <figure><img src="' + esc(rechts.url) + '" alt=""><figcaption>rechts</figcaption></figure>\n' +
    '  </div>\n  <p class="eintrag">' + esc(szene) + '&#9;besser&#9;<b>links</b> oder <b>rechts</b></p>\n</section>');
});

function esc(t) {
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blindtest: welcher Kandidat trifft den Gesichtsstil?</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         margin: 0; padding: 24px 16px 64px; line-height: 1.5; background: #faf8f4; color: #1a1a18; }
  @media (prefers-color-scheme: dark) { body { background: #16161a; color: #eee; } }
  header, section { max-width: 1600px; margin: 0 auto 40px; }
  h1 { font-size: 26px; margin: 0 0 12px; }
  h2 { font-size: 19px; margin: 0 0 10px; }
  .anleitung { border: 3px solid currentColor; padding: 14px 16px; margin-bottom: 32px; }
  .anleitung code { font-size: 13px; }
  .paar { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 800px) { .paar { grid-template-columns: 1fr; } }
  figure { margin: 0; }
  img { width: 100%; height: auto; display: block; border: 2px solid rgba(128,128,128,.5); }
  figcaption { font-weight: 700; font-size: 15px; letter-spacing: .08em; text-transform: uppercase;
               padding: 6px 2px; }
  .eintrag { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px;
             background: rgba(128,128,128,.12); padding: 8px 10px; margin-top: 10px; }
  .hinweis { opacity: .7; }
</style></head><body>
<header>
  <h1>Blindtest: welcher Kandidat trifft den Gesichtsstil?</h1>
  <div class="anleitung">
    <p><b>Was hier steht:</b> je Szene die beiden erzeugten Kandidaten, nebeneinander. Welche Seite
    welcher Kandidat ist, wurde gewuerfelt. Auf dieser Seite steht <b>nicht</b>, welchen die App
    gewaehlt hat und auch nicht, was das Pruefmodell sagt.</p>
    <p><b>Worauf schauen:</b> nur die Gesichter — Punktaugen, ein einzelner senkrechter Nasenstrich
    innerhalb der Gesichtsflaeche, kein Mund. Alles andere ist fuer diesen Test egal.</p>
    <p><b>So traegst du deine Wahl ein:</b> oeffne <code>docs/ref/wahrheit.tsv</code> und schreib je
    Szene eine Zeile. Drei Felder, getrennt durch einen <b>Tabulator</b> (nicht Leerzeichen):</p>
    <p><code>&lt;Szene&gt;&#9;besser&#9;links</code> &nbsp; oder &nbsp; <code>&lt;Szene&gt;&#9;besser&#9;rechts</code></p>
    <p>Unter jedem Bildpaar steht die fertige Zeile, du musst nur links oder rechts einsetzen.
    Die Aufloesung, welche Seite welcher Kandidat war, steht in
    <code>docs/ref/paare-zuordnung.tsv</code> — <b>erst danach</b> hineinschauen. Das Werkzeug loest
    es beim Auswerten selbst auf.</p>
  </div>
</header>
${abschnitte.join("\n")}
</body></html>
`;

fs.mkdirSync(path.dirname(zielHtml), { recursive: true });
fs.writeFileSync(zielHtml, html);
fs.writeFileSync(zielZuordnung, zuordnung.join("\n") + "\n");
console.log("Geschrieben:");
console.log("  " + zielHtml + "   (" + szenen + " Bildpaare)");
console.log("  " + zielZuordnung + "   — erst nach der Blindwahl anschauen");
