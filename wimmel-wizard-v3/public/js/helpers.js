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

// NEU (Live-Test 06.09.2026, Dashboard "Mehr Infos"-Link): generischer, kleiner Bottom-Sheet-
// Helfer fuer kurze Erklaer-Popups (aktuell: Speicher-Mechanismus). Bewusst NICHT an ein
// vorgefertigtes DOM-Geruest gebunden (anders als die Landingpage-eigene ".lp-sheet", die nur in
// index.html existiert) -- baut Backdrop + Sheet direkt per h()/document.body.appendChild(), damit
// er von JEDEM Screen aus aufrufbar ist. Schliesst per Backdrop-Klick, "Verstanden"-Button oder Esc.
function openInfoSheet(title, bodyText) {
  closeInfoSheet();
  const backdrop = h("div", {
    id: "info-sheet-backdrop",
    style: { position: "fixed", inset: "0", zIndex: "300", background: "rgba(26,26,24,.55)" },
    onClick: closeInfoSheet
  });
  const sheet = h("div", {
    id: "info-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "info-sheet-title",
    style: {
      position: "fixed", zIndex: "301", left: "50%", bottom: "0", width: "100%", maxWidth: "430px",
      transform: "translateX(-50%)", background: "var(--paper)", color: "var(--ink)",
      borderTop: "5px solid var(--ink)", padding: "14px 18px 24px"
    }
  });
  sheet.appendChild(h("div", { style: { width: "46px", height: "5px", background: "var(--ink)", margin: "0 auto 14px" } }));
  sheet.appendChild(h("h2", { id: "info-sheet-title", class: "h-black", style: { margin: "0 0 10px", fontSize: "20px", lineHeight: "1.05", letterSpacing: "-.03em" } }, title));
  sheet.appendChild(h("p", { style: { margin: "0", fontSize: "14px", lineHeight: "1.55" } }, bodyText));
  sheet.appendChild(h("button", {
    type: "button", class: "h-black",
    style: { marginTop: "18px", width: "100%", minHeight: "48px", background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", cursor: "pointer" },
    onClick: closeInfoSheet
  }, "Verstanden"));
  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  document.addEventListener("keydown", infoSheetEscHandler);
}
function infoSheetEscHandler(e) {
  if (e.key === "Escape") closeInfoSheet();
}
function closeInfoSheet() {
  const b = document.getElementById("info-sheet-backdrop");
  const s = document.getElementById("info-sheet");
  if (b) b.remove();
  if (s) s.remove();
  document.removeEventListener("keydown", infoSheetEscHandler);
}
