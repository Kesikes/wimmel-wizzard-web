/* ==========================================================================
   Wimmel Wizard v3 — Client-Router für den App-Bereich (/app/...)
   Echte Routen statt des Demo-Screen-Umschalters aus der Referenz (siehe
   Briefing Abschnitt 4: "Der Screen-Umschalter im Header der Referenz ist
   ein Demo-Werkzeug und wird im Produkt zur echten Route"). Kein Framework,
   History-API + einfacher Pfad-Matcher.
   ========================================================================== */

// Reihenfolge und Pfade exakt entlang der SCREENS-Liste aus der Referenz
const SCREEN_ORDER = [
  "dashboard", "charakter", "charakterblatt", "szene", "zaubern",
  "ergebnis", "entscheidung", "widmung", "bestellen", "fertig"
];

// Registry fuer die Screen-Module (dashboard.js, charakter.js, ...). Muss vor
// den Screen-<script>-Tags in app.html geladen sein, da diese sofort beim
// Laden "Screens.xyz = {...}" schreiben.
const Screens = {};
window.Screens = Screens;

const ROUTES = [
  { path: "/app", screen: "dashboard" },
  { path: "/app/personen/neu", screen: "charakter" },
  { path: "/app/personen", screen: "charakterblatt" },
  { path: "/app/bild/neu", screen: "szene" },
  { path: "/app/bild/zaubern", screen: "zaubern" },
  { path: "/app/bild/:id", screen: "ergebnis" },
  { path: "/app/entscheidung", screen: "entscheidung" },
  { path: "/app/widmung", screen: "widmung" },
  { path: "/app/bestellen", screen: "bestellen" },
  { path: "/app/fertig", screen: "fertig" }
];

function routeForPath(pathname) {
  for (const r of ROUTES) {
    if (r.path.indexOf(":") === -1) {
      if (r.path === pathname) return { route: r, params: {} };
    } else {
      const parts = r.path.split("/");
      const actual = pathname.split("/");
      if (parts.length !== actual.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith(":")) params[parts[i].slice(1)] = actual[i];
        else if (parts[i] !== actual[i]) { ok = false; break; }
      }
      if (ok) return { route: r, params };
    }
  }
  return null;
}

function pathForScreen(screenKey, params) {
  const r = ROUTES.find((r) => r.screen === screenKey);
  if (!r) return "/app";
  if (r.path.indexOf(":id") !== -1) {
    return r.path.replace(":id", (params && params.id) || AppState.data.currentImageId || "1");
  }
  return r.path;
}

const Router = {
  current: null,
  params: {},
  listeners: [],

  navigate(pathname, opts = {}) {
    if (window.location.pathname !== pathname) {
      if (opts.replace) window.history.replaceState({}, "", pathname);
      else window.history.pushState({}, "", pathname);
    }
    this.resolve();
    scrollToTop();
  },

  goScreen(screenKey, params) {
    this.navigate(pathForScreen(screenKey, params));
  },

  resolve() {
    const match = routeForPath(window.location.pathname);
    if (!match) {
      // Unbekannte /app/...-Route: zurueck aufs Dashboard
      this.navigate("/app", { replace: true });
      return;
    }
    this.current = match.route.screen;
    this.params = match.params;
    this.listeners.forEach((fn) => fn(this.current, this.params));
  },

  onChange(fn) {
    this.listeners.push(fn);
  },

  screenIndex() {
    return SCREEN_ORDER.indexOf(this.current);
  }
};

window.addEventListener("popstate", () => Router.resolve());

window.Router = Router;
window.SCREEN_ORDER = SCREEN_ORDER;
window.pathForScreen = pathForScreen;
