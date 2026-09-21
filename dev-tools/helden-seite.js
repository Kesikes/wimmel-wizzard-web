// dev-tools/helden-seite.js — baut die Zaehlseite fuer die Heldenmessung (Auftrag b, 21.09.2026).
//
//     node dev-tools/helden-seite.js [sitzung.json]        (Vorgabe: docs/ref/sitzung.json)
//     ANZAHL=12 node dev-tools/helden-seite.js             (wie viele Kandidaten, Vorgabe 12)
//
// Erzeugt:
//   docs/ref/helden.html          je Kandidat das Bild gross und je Held: fehlt / einmal / doppelt,
//                                 Kleidung stimmt ja / nein. Unten stehen die fertigen Zeilen fuer
//                                 docs/ref/wahrheit.tsv zum Kopieren.
//   docs/ref/helden-auswahl.tsv   welche Kandidaten gemessen werden (kennung, url). Genau diese
//                                 Liste nimmt dev-tools/helden-messen.sh -- die Seite und die
//                                 Messung reden also garantiert ueber dieselben Bilder.
//
// BLIND: auf der Seite steht weder, was das Pruefmodell gezaehlt hat, noch welchen Kandidaten die
// App gewaehlt hat. Sonst misst der Test am Ende, wie sehr du dem Modell zustimmst.
//
// Auswahl: die letzten ANZAHL Kandidaten mit Bild, ueber alle Szenen der Sitzung. Die Helden
// kommen aus der Sitzung (fertige Figuren mit Bild, in der Reihenfolge, in der die App sie an den
// Bildaufruf gibt). Wurde seit einer Szene eine Figur ergaenzt, passt das nicht mehr -- dann steht
// bei der Szene ein Hinweis (verglichen mit der Laenge der damals gespeicherten Zaehlung).
const fs = require("fs");
const sitzungDatei = process.argv[2] || "docs/ref/sitzung.json";
const ANZAHL = Number(process.env.ANZAHL || 12);
const roh = JSON.parse(fs.readFileSync(sitzungDatei, "utf8"));
const stand = roh && roh.data ? roh.data : roh;
const bilder = (stand && stand.images) || [];
const helden = ((stand && stand.people) || []).filter((p) => p && p.status === "done" && p.imageUrl);
if (!helden.length) { console.error("In der Sitzung gibt es keine fertige Figur mit Bild."); process.exit(1); }

const alle = [];
bilder.forEach((bild, bi) => {
  (bild.candidates || []).forEach((c, ci) => {
    if (!c || !c.url) return;
    const gespeichert = c.verify && Array.isArray(c.verify.heroes_found) ? c.verify.heroes_found.length : null;
    alle.push({ kennung: (bi + 1) + " " + (bild.title || "Bild") + " K" + (ci + 1), url: c.url, gespeichert });
  });
});
const auswahl = alle.slice(-ANZAHL);
if (!auswahl.length) { console.error("Keine Kandidaten mit Bild in der Sitzung."); process.exit(1); }

function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

fs.writeFileSync("docs/ref/helden-auswahl.tsv",
  "# docs/ref/helden-auswahl.tsv — von dev-tools/helden-seite.js erzeugt. Spalten: kennung, url\n" +
  "# Helden in dieser Reihenfolge: " + helden.map((h) => h.name + " (" + h.role + ")").join(", ") + "\n" +
  auswahl.map((k) => k.kennung + "\t" + k.url).join("\n") + "\n");

const heldKopf = helden.map((h, i) =>
  '<figure class="ref"><img src="' + esc(h.imageUrl) + '" alt=""><figcaption>' + esc(h.name) +
  ' <span class="hinweis">(' + esc(h.role) + (h.age ? ", " + esc(h.age) : "") + ')</span></figcaption></figure>').join("");

const abschnitte = auswahl.map((k, ki) => {
  const warn = (k.gespeichert != null && k.gespeichert !== helden.length)
    ? '<p class="warnung">Achtung: bei diesem Bild wurden damals ' + k.gespeichert + ' Figuren gezaehlt, heute sind es ' + helden.length + '. Die Figurenliste hat sich seitdem geaendert — bitte nur die Figuren werten, die damals dabei waren, oder das Bild weglassen.</p>' : "";
  const zeilen = helden.map((h, hi) => {
    const n = "k" + ki + "h" + hi;
    return '<tr><td class="held"><img src="' + esc(h.imageUrl) + '" alt=""><b>' + esc(h.name) + '</b></td>' +
      '<td><label><input type="radio" name="' + n + 'z" value="0"> fehlt</label>' +
      '<label><input type="radio" name="' + n + 'z" value="1"> einmal</label>' +
      '<label><input type="radio" name="' + n + 'z" value="2+"> doppelt</label></td>' +
      '<td><span class="klabel">Kleidung stimmt:</span><label><input type="radio" name="' + n + 'k" value="ja"> ja</label>' +
      '<label><input type="radio" name="' + n + 'k" value="nein"> nein</label></td></tr>';
  }).join("");
  return '<section class="kand" data-ki="' + ki + '" data-kennung="' + esc(k.kennung) + '">' +
    '<h2>' + (ki + 1) + ' / ' + auswahl.length + ' — ' + esc(k.kennung) + '</h2>' + warn +
    '<a href="' + esc(k.url) + '" target="_blank" rel="noopener"><img class="szene" src="' + esc(k.url) + '" alt=""></a>' +
    '<p class="hinweis">Antippen oeffnet das Bild in voller Groesse in einem neuen Tab — zum Suchen kleiner Figuren.</p>' +
    '<table>' + zeilen + '</table><div class="eintrag" id="z' + ki + '">noch nicht vollstaendig</div></section>';
}).join("\n");

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Heldenzaehlung</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         margin: 0; padding: 24px 16px 64px; line-height: 1.5; background: #faf8f4; color: #1a1a18; }
  @media (prefers-color-scheme: dark) { body { background: #16161a; color: #eee; } }
  header, section { max-width: 1600px; margin: 0 auto 44px; }
  h1 { font-size: 26px; margin: 0 0 12px; } h2 { font-size: 19px; margin: 0 0 10px; }
  .anleitung { border: 3px solid currentColor; padding: 14px 16px; margin-bottom: 24px; }
  .refs { display: flex; gap: 12px; flex-wrap: wrap; }
  .ref { margin: 0; width: 160px; } .ref img { width: 100%; border: 2px solid rgba(128,128,128,.5); }
  .ref figcaption { font-weight: 700; }
  img.szene { width: 100%; height: auto; display: block; border: 2px solid rgba(128,128,128,.5); }
  table { border-collapse: collapse; margin-top: 10px; width: 100%; }
  td { padding: 8px 10px 8px 0; border-bottom: 1px solid rgba(128,128,128,.3); vertical-align: middle; }
  td.held { width: 190px; } td.held img { width: 44px; vertical-align: middle; margin-right: 8px; }
  label { margin-right: 16px; white-space: nowrap; cursor: pointer; }
  input[type=radio] { transform: scale(1.3); margin-right: 5px; }
  .klabel { margin-right: 10px; opacity: .75; }
  .eintrag, textarea { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px;
         background: rgba(128,128,128,.12); padding: 8px 10px; margin-top: 10px; white-space: pre; }
  textarea { width: 100%; min-height: 220px; border: 0; color: inherit; box-sizing: border-box; }
  .hinweis { opacity: .7; font-size: 14px; } .warnung { border: 2px solid #c60; padding: 8px 10px; }
  button { font-size: 15px; padding: 10px 16px; cursor: pointer; }
  .fortschritt { position: sticky; top: 0; background: inherit; padding: 8px 0; font-weight: 700; z-index: 2; }
</style></head><body>
<header>
  <h1>Heldenzaehlung — ${auswahl.length} Kandidaten</h1>
  <div class="anleitung">
    <p><b>Worum es geht:</b> Du zaehlst, wie oft jede benannte Figur im Bild vorkommt. Deine Zaehlung
    ist die Wahrheit, gegen die danach die automatische Pruefung gemessen wird. Auf dieser Seite steht
    <b>nicht</b>, was die Pruefung gezaehlt hat und welchen Kandidaten die App gewaehlt hat.</p>
    <p><b>Je Figur:</b> fehlt / einmal / doppelt (zwei oder mehr). <b>Kleidung stimmt</b> heisst:
    Frisur, Haarfarbe und Kleidung wie auf dem Figurenblatt. Fehlt die Figur, lass Kleidung leer.
    Ist eine Figur zweimal da und nur eine davon richtig angezogen: doppelt, Kleidung nein.</p>
    <p><b>Eintragen:</b> ganz unten stehen die fertigen Zeilen. „Kopieren", dann ans Ende von
    <code>docs/ref/wahrheit.tsv</code> einfuegen. Deine Eingaben bleiben in diesem Browser gespeichert,
    du kannst also zwischendurch aufhoeren.</p>
  </div>
  <h2>Die Figurenblaetter</h2>
  <div class="refs">${heldKopf}</div>
</header>
<div class="fortschritt" id="fortschritt"></div>
${abschnitte}
<section>
  <h2>Zeilen fuer docs/ref/wahrheit.tsv</h2>
  <p class="hinweis">Nur vollstaendig ausgefuellte Kandidaten erscheinen hier.</p>
  <textarea id="alle" readonly></textarea>
  <p><button id="kopieren">Kopieren</button> <span id="kopiert" class="hinweis"></span></p>
</section>
<script>
(function () {
  var N = ${helden.length};
  var SPEICHER = "heldenzaehlung:" + ${JSON.stringify(auswahl.map((k) => k.kennung).join("|"))};
  var TAB = "\\t";
  function lies() { try { return JSON.parse(localStorage.getItem(SPEICHER) || "{}"); } catch (e) { return {}; } }
  function schreib(d) { try { localStorage.setItem(SPEICHER, JSON.stringify(d)); } catch (e) {} }
  var daten = lies();
  Object.keys(daten).forEach(function (name) {
    var el = document.querySelector('input[name="' + name + '"][value="' + daten[name] + '"]');
    if (el) el.checked = true;
  });
  function wert(name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; }
  function aktualisiere() {
    var alle = [], fertig = 0, kands = document.querySelectorAll("section.kand");
    kands.forEach(function (sec) {
      var ki = sec.getAttribute("data-ki"), kennung = sec.getAttribute("data-kennung");
      var zahlen = [], kleid = [], voll = true;
      for (var h = 0; h < N; h++) {
        var z = wert("k" + ki + "h" + h + "z"), k = wert("k" + ki + "h" + h + "k");
        var kInput = document.querySelectorAll('input[name="k' + ki + 'h' + h + 'k"]');
        kInput.forEach(function (i) { i.disabled = (z === "0"); if (z === "0") i.checked = false; });
        if (z === null) voll = false;
        if (z !== "0" && k === null) voll = false;
        zahlen.push(z); kleid.push(z === "0" ? "-" : k);
      }
      var box = document.getElementById("z" + ki);
      if (voll) {
        fertig++;
        var zeilen = kennung + TAB + "heroes_found" + TAB + zahlen.join(",") + "\\n" +
                     kennung + TAB + "heroes_kleidung" + TAB + kleid.join(",");
        box.textContent = zeilen; alle.push(zeilen);
      } else box.textContent = "noch nicht vollstaendig";
    });
    document.getElementById("alle").value = alle.length ? "# Heldenzaehlung, eingetragen " + new Date().toISOString().slice(0, 10) + "\\n" + alle.join("\\n") + "\\n" : "";
    document.getElementById("fortschritt").textContent = fertig + " von " + kands.length + " Kandidaten vollstaendig";
  }
  document.addEventListener("change", function (e) {
    if (e.target && e.target.type === "radio") { daten[e.target.name] = e.target.value; schreib(daten); aktualisiere(); }
  });
  document.getElementById("kopieren").addEventListener("click", function () {
    var t = document.getElementById("alle");
    t.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(function () { ok = true; }).catch(function () {});
    document.getElementById("kopiert").textContent = "kopiert — jetzt in wahrheit.tsv einfuegen";
  });
  aktualisiere();
})();
</script>
</body></html>`;
fs.writeFileSync("docs/ref/helden.html", html);
console.log("Geschrieben: docs/ref/helden.html (" + auswahl.length + " Kandidaten, " + helden.length + " Helden: " +
  helden.map((h) => h.name).join(", ") + ")");
console.log("Geschrieben: docs/ref/helden-auswahl.tsv");
