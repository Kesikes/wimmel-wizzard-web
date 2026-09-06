/* ==========================================================================
   Wimmel Wizard v3 — gemeinsame Render-Helfer
   Formsprache 1:1 aus den Referenzdateien portiert (Drehungs-Sequenzen,
   Offset-Schatten). Kein Redesign, nur die gleiche JS-Logik in Vanilla JS.
   ========================================================================== */

// Rotationssequenzen exakt wie in den Referenzdateien (rot(i)-Funktionen)
const ROT6 = [-2.2, 1.6, -1.2, 2.4, -1.8, 1.2];
const ROT6_APP = [-1.6, 1.4, -1, 1.8, -1.4, 1.1];
const ROT5_DESK = [-1.6, 1.4, -1, 1.8, -1.4];

function rot(i, table = ROT6) {
  return table[i % table.length];
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "style" && typeof v === "object") {
      Object.assign(node.style, v);
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined && v !== false) {
      node.setAttribute(k, v === true ? "" : v);
    }
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

// BUGFIX (Live-Test 05.09.2026, Priorität 1 der Nutzer-Rückmeldung): relative
// "assets/..."-Pfade lösen im Browser IMMER relativ zur aktuellen URL auf, nicht
// relativ zu app.html. Auf /app (Dashboard) ging das zufällig gut (ein einziges
// Pfadsegment -> Ersetzung landet korrekt bei /assets/...), auf jeder tieferen
// Route (/app/personen/neu, /app/bild/zaubern, /app/bestellen, /app/fertig, ...)
// wird daraus z.B. /app/personen/assets/wizzelwim-family-hero.png. Das trifft
// Vercels eigenen Catch-all-Rewrite "/app/:path*" -> app.html (siehe
// vercel.json), der Server liefert also HTML statt PNG zurück (Status 200,
// falscher Inhalt) -- der Browser zeigt das kaputte Bild-Icon. Genau dieselbe
// Pfadauflösung hat vorher auch die <script src="js/..."> -Tags in app.html
// getroffen (Blank-Screen-Crash bei Hard-Reload/Deep-Link auf tiefe Routen,
// siehe Task "Backlog: Routing-Bug"). Fix: root-absolute Pfad statt relativ --
// funktioniert unabhängig davon, auf welcher Route gerade gerendert wird.
function assetPath(name) {
  return "/assets/" + name;
}

// Fuer Live-Regionen / Statusmeldungen, ohne dass sie visuell auffallen
function announce(msg) {
  let region = document.getElementById("live-region");
  if (!region) {
    region = h("div", { id: "live-region", class: "sr-only", "aria-live": "polite" });
    document.body.appendChild(region);
  }
  region.textContent = msg;
}
