/* public/js/gutschein-seiten.js — NEU (Paket 1, Teil C/G/I). Gemeinsame Helfer der Gutschein-
   Seiten: Config vom Server (EINE Quelle für Preise/Wortlaute, siehe api/_lib/gutschein-config.js),
   utm_source lesen (ohne Cookies, ohne localStorage — nur Variable und URL), API-Aufrufe,
   Header/Footer-Kleinkram. Kein Framework, kein Build-Step. */
(function () {
  var QUELLE = (function () {
    try {
      var p = new URLSearchParams(location.search);
      var v = (p.get("utm_source") || "").toLowerCase().trim();
      return v || "direkt";
    } catch (e) { return "direkt"; }
  })();

  var configPromise = null;
  function config() {
    if (!configPromise) {
      configPromise = fetch("/api/gutschein?mode=config").then(function (r) { if (!r.ok) throw new Error("Config " + r.status); return r.json(); });
    }
    return configPromise;
  }

  function post(mode, daten) {
    var body = Object.assign({ mode: mode }, daten || {});
    return fetch("/api/gutschein", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j && j.error ? j.error : "Server " + r.status); e.status = r.status; throw e; } return j; }); });
  }

  function syncHeader() {
    var header = document.getElementById("lp-header");
    var shell = document.getElementById("app");
    if (header && shell) shell.style.paddingTop = "0px"; // .gs-wrap bringt den Abstand selbst mit
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // mitQuelle(url): hängt utm_source an interne Links, damit die Quelle bis zum Checkout überlebt
  function mitQuelle(url) {
    if (!QUELLE || QUELLE === "direkt") return url;
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "utm_source=" + encodeURIComponent(QUELLE);
  }

  function footerFuellen(cfg) {
    var el = document.getElementById("gs-kontakt-link");
    if (el && cfg && cfg.kontakt_email) { el.href = "mailto:" + cfg.kontakt_email; el.textContent = "Kontakt"; }
  }

  window.GutscheinSeiten = { quelle: QUELLE, config: config, post: post, esc: esc, mitQuelle: mitQuelle, syncHeader: syncHeader, footerFuellen: footerFuellen };
  syncHeader();
})();
