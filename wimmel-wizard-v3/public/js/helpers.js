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

function assetPath(name) {
  return "assets/" + name;
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
