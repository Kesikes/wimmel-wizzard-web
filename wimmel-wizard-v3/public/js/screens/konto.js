/* ==========================================================================
   Wimmel Wizard v3 — Konto, Stopp-Screen, Daten löschen (C3 Konto & Aufladen, 27.10.2026)

   Drei Screens ausserhalb der Rail (router.js: /app/konto, /app/konto/loeschen, /app/stopp) und der
   Helfer window.Konto, der mit api/konto.js spricht. Stand des Kontos liegt in AppState.data.konto
   (null = nicht angemeldet); AppState.data.bezahlt folgt daraus (Foto-Karte, Anzeige). Die Wahrheit
   prueft immer der Server (free-tier.js) -- der Client zeigt nur an.

   STOPP-SCREEN: wird gezeigt, wenn ein Server-Fehler ein "stopp"-Objekt traegt (Kontingent
   erreicht, Foto gesperrt, Aenderungs-Deckel). Kurz, warm, zwei Wege: Zauberguthaben (9,90 EUR,
   beim Buch voll angerechnet) und "Ich habe einen Gutschein". Kein Druck, kein Countdown.
   ========================================================================== */

const Konto = {
  // laden(): Stand vom Server holen (Cookie + Kontingente der Sitzung) und in den State legen.
  async laden() {
    try {
      const resp = await fetch("/api/konto?mode=status&sessionId=" + encodeURIComponent(AppState.data.sessionId || ""), { credentials: "same-origin" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || ("Status " + resp.status));
      Konto.angebot = data.pakete_angebot || []; Konto.widerrufsverzichtSatz = data.widerrufsverzicht_satz || ""; Konto.einloesenAb = data.einloesen_ab || "";
      Konto.guthabenVerfallSatz = data.guthaben_verfall_satz || ""; Konto.guthabenVerfallHaken = data.guthaben_verfall_haken || "";
      const konto = data.angemeldet ? data : null;
      // Sitzung noch nicht am Konto -> jetzt anhaengen (einmal), danach Kontingente des Kontos.
      if (konto && data.kontingente && data.kontingente.sitzungNichtVerknuepft) { try { return await Konto.verknuepfen(); } catch (e) { /* unten normal weiter */ } }
      AppState.update({ konto, kontingente: data.kontingente || null, bezahlt: !!(konto && konto.bezahlt) || !!(data.kontingente && data.kontingente.bezahlt) });
      return data;
    } catch (e) {
      console.warn("[konto] Status nicht geladen: " + (e && e.message ? e.message : e));
      return null;
    }
  },
  async post(body) {
    const resp = await fetch("/api/konto", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) { const err = new Error(data.error || ("Fehler " + resp.status)); err.data = data; err.httpStatus = resp.status; throw err; }
    return data;
  },
  async verknuepfen() {
    const data = await Konto.post({ mode: "verknuepfen", sessionId: AppState.data.sessionId });
    AppState.update({ konto: data, kontingente: data.kontingente || null, bezahlt: !!data.bezahlt });
    return data;
  },
  async anmeldeLink(email) { return Konto.post({ mode: "anmelden-link", email, sessionId: AppState.data.sessionId }); },
  // C3.1 Punkt 4: nach dem Versand alle 3 s (max. 10 min) nachfragen, ob der Link -- auf welchem Geraet
  // auch immer -- benutzt wurde. Dann hat auch dieses Geraet das Cookie: Stand laden, Screen frisch.
  warteTimer: null,
  aufAnmeldungWarten(warte, onFertig) {
    Konto.warteStoppen();
    const bis = Date.now() + 10 * 60 * 1000;
    const tick = async () => {
      if (Date.now() > bis) { Konto.warteStoppen(); return; }
      try {
        const resp = await fetch("/api/konto?mode=anmelde-warten&warte=" + encodeURIComponent(warte), { credentials: "same-origin" });
        const data = await resp.json();
        if (data && data.angemeldet) { Konto.warteStoppen(); await Konto.laden(); if (onFertig) onFertig(); return; }
      } catch (e) { /* naechster Versuch */ }
      Konto.warteTimer = setTimeout(tick, 3000);
    };
    Konto.warteTimer = setTimeout(tick, 3000);
  },
  warteStoppen() { if (Konto.warteTimer) { clearTimeout(Konto.warteTimer); Konto.warteTimer = null; } },
  // C3.1 Punkt 6: nach der Stripe-Rueckkehr alle 2 s (max. 2 min) nachsehen, ob das Paket gebucht ist.
  buchungTimer: null,
  aufBuchungWarten(typ, cs) {
    if (Konto.buchungTimer) clearTimeout(Konto.buchungTimer);
    const bis = Date.now() + 2 * 60 * 1000;
    const tick = async () => {
      const data = await Konto.laden();
      const k = data && data.angemeldet ? data : null;
      const da = !!(k && (k.pakete || []).some((p) => cs ? p.stripe_session_id === cs : p.typ === typ));
      if (da) { Konto.buchungTimer = null; Konto.meldung = "Danke! " + Konto.paket(typ).name + " ist freigeschaltet. Eine Bestätigung kommt per Mail."; if (Router.current === "konto") kontoNeuZeichnen(); return; }
      if (Date.now() > bis) { Konto.buchungTimer = null; const el = document.getElementById("buchung-hinweis"); if (el) el.textContent = "Die Bestätigung von Stripe lässt auf sich warten. Sobald sie da ist, ist das Paket freigeschaltet – wir schreiben dir dann per Mail. Du kannst diese Seite später einfach noch einmal öffnen."; return; }
      Konto.buchungTimer = setTimeout(tick, 2000);
    };
    Konto.buchungTimer = setTimeout(tick, 1500);
  },
  async aufladen(typ, erschoepft) {
    const data = await Konto.post({ mode: "aufladen", typ, sessionId: AppState.data.sessionId, widerrufsverzicht: true, erschoepft: !!erschoepft });
    if (data.url) window.location.href = data.url;
    return data;
  },
  async einloesen(code) {
    const resp = await fetch("/api/konto", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "einloesen", code, sessionId: AppState.data.sessionId }) });
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 401) { const err = new Error(data.error || "Bitte zuerst anmelden."); err.nichtAngemeldet = true; throw err; }
    if (data.ok) await Konto.laden();
    return data;
  },
  async abmelden() { await Konto.post({ mode: "abmelden" }); AppState.update({ konto: null, bezahlt: false }); await Konto.laden(); },
  async loeschen(guthabenVerfaellt) { const r = await Konto.post({ mode: "loeschen", bestaetigt: true, guthabenVerfaellt: guthabenVerfaellt === true }); AppState.update({ konto: null, bezahlt: false, kontingente: null }); return r; },
  // --- C3.3 Punkt 1 (28.10.2026): nach JEDER Anmeldung die Familie des Kontos laden --------------------
  // Vorher hing eine Anmeldung nur die anfragende (oft leere) Sitzung ans Konto; geladen wurde eine
  // andere nur beim Link auf einem anderen Geraet. Jetzt, fuer Link, Code, Link im neuen Tab und
  // anderes Geraet gleich: aktuelle Sitzung leer -> die zuletzt geaenderte Familie des Kontos laden
  // (und die leere Sitzung vom Konto loesen); aktuelle mit Inhalt UND eine andere mit Inhalt ->
  // Auswahl-Screen (/app/familien); sonst bleibt es beim Anhaengen.
  async familien() { const r = await Konto.post({ mode: "familien", sessionId: AppState.data.sessionId }); return r.familien || []; },
  hatInhalt(s) { s = s || AppState.data; return (s.people || []).length > 0 || (s.images || []).some((b) => b && b.status === "done"); },
  async familieOeffnen(sid, opts) {
    const alt = AppState.data.sessionId;
    if (sid === alt) return;
    if (Konto.hatInhalt()) { try { await Pipeline.saveSessionRemote(alt, AppState.data); } catch (e) { /* bleibt lokal, Sync holt es nach */ } }
    const data = await Pipeline.loadSessionRemote(sid);
    if (!data) throw new Error("Diese Familie konnte gerade nicht geladen werden – bitte gleich noch einmal versuchen.");
    AppState.hydrate(Object.assign({}, data, { sessionId: sid, stopp: null }));
    if (opts && opts.altLeerEntfernen && alt) { try { await Konto.post({ mode: "familie-entfernen", sid: alt, leer: true }); } catch (e) { /* nicht leer oder schon weg -- bleibt im Konto */ } }
    await Konto.laden();
  },
  familieLaeuft: false, auswahlListe: null,
  // familieNachAnmeldung(opts) -> "nichts" | "geladen" | "auswahl". opts.ohneAuswahl: nur laden, nie
  // den Auswahl-Screen zeigen (fuer Hintergrund-Tabs, die nur mitbekommen, dass angemeldet wurde).
  async familieNachAnmeldung(opts) {
    if (Konto.familieLaeuft || !AppState.data.konto) return "nichts";
    Konto.familieLaeuft = true;
    try {
      let liste = await Konto.familien();
      const andere = liste.filter((f) => !f.aktuell && !f.leer);
      if (!andere.length) return "nichts";
      if (!Konto.hatInhalt()) {
        await Konto.familieOeffnen(andere[0].sid, { altLeerEntfernen: true });
        const namen = andere[0].namen.slice(0, 4).join(", ") + (andere[0].namen.length > 4 ? " …" : "");
        Konto.meldung = "Willkommen zurück – eure Familie ist geladen" + (namen ? ": " + namen : "") + ".";
        return "geladen";
      }
      if (opts && opts.ohneAuswahl) return "nichts";
      // Auswahl: den eigenen Stand erst speichern, damit seine Karte aktuell ist.
      try { await Pipeline.saveSessionRemote(AppState.data.sessionId, AppState.data); liste = await Konto.familien(); } catch (e) { /* Karte zeigt den letzten Stand */ }
      Konto.auswahlListe = liste.filter((f) => f.aktuell || !f.leer);
      Router.goScreen("familien");
      return "auswahl";
    } catch (e) {
      console.warn("[konto] Familie nach Anmeldung: " + (e && e.message ? e.message : e));
      return "nichts";
    } finally { Konto.familieLaeuft = false; }
  },
  // nachAnmeldungWeiter(): gemeinsamer Abschluss aller Anmelde-Wege im Client.
  async nachAnmeldungWeiter(opts) {
    const r = await Konto.familieNachAnmeldung(opts);
    if (r === "auswahl") return r;
    if (!Konto.meldung) Konto.meldung = "Angemeldet – alles Bisherige hängt jetzt an deinem Konto.";
    if (Router.current === "konto") kontoNeuZeichnen(); else if (typeof renderScreen === "function") renderScreen();
    return r;
  },
  // stoppZeigen(e): Fehler mit stopp-Objekt -> Stopp-Screen. Gibt true zurueck, wenn er gezeigt wurde.
  stoppZeigen(e) {
    const st = e && e.stopp;
    if (!st) return false;
    AppState.update({ stopp: Object.assign({ text: String((e && e.message) || ""), am: Date.now() }, st) });
    Router.goScreen("stopp");
    return true;
  },
  angebot: [], widerrufsverzichtSatz: "", einloesenAb: "", meldung: "",
  // C3.2 Teil 2: Tabs desselben Browsers reden ueber einen BroadcastChannel. Der aus der Mail
  // geoeffnete Tab fragt "wer-da?"; antwortet ein offener Wimmel-Wizard-Tab, meldet der neue Tab ihn
  // an ("angemeldet": der andere Tab laedt den Konto-Stand -- das Cookie teilen sie ohnehin) und
  // zeigt selbst nur "Du bist angemeldet ✓ – du kannst dieses Fenster schließen".
  tabKanal: null, andererTab: false,
  tabStart() {
    if (Konto.tabKanal || typeof BroadcastChannel === "undefined") return;
    try {
      Konto.tabKanal = new BroadcastChannel("wimmel-wizard-konto");
      Konto.tabKanal.onmessage = async (ev) => {
        const m = ev && ev.data || {};
        if (m.typ === "wer-da") Konto.tabKanal.postMessage({ typ: "da" });
        if (m.typ === "angemeldet") { await Konto.laden(); await Konto.nachAnmeldungWeiter({ ohneAuswahl: true }); } // C3.3: leerer Tab laedt die Familie
      };
    } catch (e) { Konto.tabKanal = null; }
  },
  tabMelden(typ) { try { if (Konto.tabKanal) Konto.tabKanal.postMessage({ typ }); } catch (e) { /* egal */ } },
  // tabPruefen() -> Promise<boolean>: gibt es im selben Browser schon einen offenen Tab?
  tabPruefen() {
    return new Promise((loesen) => {
      Konto.tabStart();
      if (!Konto.tabKanal) { loesen(false); return; }
      let fertig = false;
      const alt = Konto.tabKanal.onmessage;
      Konto.tabKanal.onmessage = (ev) => { const m = ev && ev.data || {}; if (m.typ === "da" && !fertig) { fertig = true; Konto.tabKanal.onmessage = alt; loesen(true); } else if (alt) alt(ev); };
      Konto.tabKanal.postMessage({ typ: "wer-da" });
      setTimeout(() => { if (!fertig) { fertig = true; Konto.tabKanal.onmessage = alt; loesen(false); } }, 500);
    });
  },
  paket(typ) { return (Konto.angebot || []).find((p) => p.id === typ) || { id: typ, name: typ, preis: "" }; },
};
window.Konto = Konto;

// C3.2 Teil 1 (28.10.2026): Hinweis bei Grossfamilie / mehr als 5 Figuren.
const HELDEN_HINWEIS = "Auf jedem Bild sind bis zu 5 eurer Figuren – ihr bestimmt, wer.";
// --- gemeinsame Bausteine ----------------------------------------------------------------------------
function kontoKasten(farbe, kinder) {
  return h("div", { style: { marginTop: "14px", border: "4px solid var(--ink)", background: farbe || "var(--paper)", padding: "14px", boxShadow: "5px 6px 0 var(--ink)" } }, kinder);
}
function kontoKnopf(text, onClick, extra) {
  return h("button", Object.assign({ type: "button", class: "h-black", style: Object.assign({ display: "block", width: "100%", minHeight: "50px", fontSize: "14px", cursor: "pointer", border: "3px solid var(--ink)", background: "var(--red)", color: "var(--paper)", boxShadow: "4px 4px 0 var(--ink)", marginTop: "10px" }, (extra && extra.style) || {}), onClick }, extra && extra.attrs || {}), text);
}
function kontoHinweis(text, fehler) {
  return h("p", { style: { margin: "10px 0 0", fontSize: "13px", lineHeight: "1.45", color: fehler ? "var(--red)" : "inherit" }, "aria-live": "polite" }, text);
}
// Anmelde-Formular: E-Mail -> Link per Mail. onFertig(hinweis) nach dem Versand.
// C3.2 Teil 2 (28.10.2026): "Oder gib hier deinen Zaubercode ein" -- Anmeldung im selben Fenster.
function zaubercodeFeld(warte, onFertig) {
  const wrap = h("div", { style: { marginTop: "14px", paddingTop: "12px", borderTop: "2px dashed var(--ink)" } });
  wrap.appendChild(h("label", { for: "zaubercode", class: "h-black", style: { display: "block", fontSize: "12px", letterSpacing: ".04em" } }, "Oder gib hier deinen Zaubercode ein"));
  wrap.appendChild(h("p", { style: { margin: "4px 0 0", fontSize: "12px", lineHeight: "1.4" } }, "Der 6-stellige Code steht in der Mail – damit bleibst du in diesem Fenster."));
  const feld = h("input", { class: "field", id: "zaubercode", inputmode: "numeric", autocomplete: "one-time-code", placeholder: "123 456", "aria-label": "Zaubercode", maxlength: "7", style: { letterSpacing: ".18em", fontSize: "20px", textAlign: "center" } });
  const hinweis = kontoHinweis("", true); hinweis.style.display = "none";
  const knopf = kontoKnopf("Mit Zaubercode anmelden", async () => {
    const code = String(feld.value || "").replace(/\D/g, "");
    if (code.length !== 6) { hinweis.textContent = "Bitte die 6 Ziffern aus der Mail eingeben."; hinweis.style.display = "block"; return; }
    knopf.disabled = true;
    try {
      await Konto.post({ mode: "anmelden-code", warte, code, sessionId: AppState.data.sessionId });
      Konto.warteStoppen(); await Konto.laden(); if (onFertig) onFertig();
    } catch (e) {
      hinweis.textContent = (e && e.message) || "Das hat nicht geklappt."; hinweis.style.display = "block";
      knopf.disabled = !!(e && e.data && e.data.versucheUebrig === 0);
      if (knopf.disabled) knopf.textContent = "Bitte neuen Code anfordern";
    }
  }, { style: { background: "var(--ink)" } });
  feld.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); knopf.click(); } });
  wrap.appendChild(feld); wrap.appendChild(knopf); wrap.appendChild(hinweis);
  return wrap;
}
function anmeldeFormular(titel, untertitel) {
  const box = kontoKasten("var(--yellow)");
  box.appendChild(h("p", { class: "h-black", style: { margin: "0 0 6px", fontSize: "16px", lineHeight: "1.05", letterSpacing: "-.02em" } }, titel || "Anmelden – ohne Passwort"));
  box.appendChild(h("p", { style: { margin: "0 0 10px", fontSize: "13px", lineHeight: "1.45" } }, untertitel || "Wir schicken dir einen Link per Mail. Ein Klick, und alles Bisherige hängt an deinem Konto. Du kannst den Link auf jedem Gerät öffnen."));
  const feld = h("input", { class: "field", type: "email", inputmode: "email", autocomplete: "email", placeholder: "deine@mail.de", "aria-label": "E-Mail-Adresse", id: "konto-email" });
  const hinweis = kontoHinweis(""); hinweis.style.display = "none";
  const knopf = kontoKnopf("Anmelde-Link schicken", async () => {
    const email = String(feld.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { hinweis.textContent = "Bitte eine gültige E-Mail-Adresse eingeben."; hinweis.style.color = "var(--red)"; hinweis.style.display = "block"; return; }
    knopf.disabled = true; knopf.textContent = "schickt …";
    try {
      const r = await Konto.anmeldeLink(email);
      hinweis.textContent = (r.hinweis || "Wir haben dir eine Mail geschickt.") + " Sobald du den Link öffnest, bist du auch hier angemeldet."; hinweis.style.color = "inherit"; hinweis.style.display = "block";
      knopf.textContent = "Mail ist unterwegs ✓";
      const fertig = async () => { Konto.tabMelden("angemeldet"); await Konto.nachAnmeldungWeiter(); }; // C3.3: Familie laden / Auswahl
      if (r.warte) { Konto.aufAnmeldungWarten(r.warte, fertig); box.appendChild(zaubercodeFeld(r.warte, fertig)); }
    } catch (e) {
      hinweis.textContent = (e && e.message) || "Das hat nicht geklappt."; hinweis.style.color = "var(--red)"; hinweis.style.display = "block";
      knopf.disabled = false; knopf.textContent = "Anmelde-Link schicken";
    }
  });
  box.appendChild(feld); box.appendChild(knopf); box.appendChild(hinweis);
  return box;
}
// Aufladen-Knopf mit Widerrufsverzicht-Haken (Pflicht, sonst kein Checkout).
function aufladenKasten(typ, erschoepft, titelText) {
  const p = Konto.paket(typ);
  const box = kontoKasten("var(--paper)");
  box.appendChild(h("p", { class: "h-black", style: { margin: "0", fontSize: "16px", lineHeight: "1.05", letterSpacing: "-.02em" } }, titelText || (p.name + " – " + p.preis)));
  box.appendChild(h("p", { style: { margin: "6px 0 0", fontSize: "13px", lineHeight: "1.45" } }, p.kurz || ""));
  if (typ === "grossfamilie") box.appendChild(h("p", { style: { margin: "6px 0 0", fontSize: "13px", lineHeight: "1.45" } }, HELDEN_HINWEIS)); // C3.2 Teil 1
  const haken = h("input", { type: "checkbox", id: "widerruf-" + typ, style: { width: "20px", height: "20px", flex: "none", marginTop: "2px" } });
  const label = h("label", { for: "widerruf-" + typ, style: { display: "flex", gap: "10px", alignItems: "flex-start", margin: "12px 0 0", fontSize: "12px", lineHeight: "1.4", cursor: "pointer" } }, [haken, document.createTextNode(Konto.widerrufsverzichtSatz || "Ich stimme zu, dass Wimmel Wizard sofort mit der Leistung beginnt, und weiß, dass ich dadurch mein Widerrufsrecht verliere.")]);
  box.appendChild(label);
  box.appendChild(h("p", { style: { margin: "4px 0 0", fontSize: "10px", color: "var(--ink-a70)" } }, "[Platzhalter-Wortlaut, wird vom Anwalt geprüft]"));
  const hinweis = kontoHinweis(""); hinweis.style.display = "none";
  const knopf = kontoKnopf("Jetzt kaufen · " + p.preis, async () => {
    if (!haken.checked) { hinweis.textContent = "Bitte den Hinweis zum Widerrufsrecht bestätigen."; hinweis.style.color = "var(--red)"; hinweis.style.display = "block"; return; }
    knopf.disabled = true; knopf.textContent = "weiter zu Stripe …";
    try { await Konto.aufladen(typ, erschoepft); }
    catch (e) { hinweis.textContent = (e && e.message) || "Das hat nicht geklappt."; hinweis.style.color = "var(--red)"; hinweis.style.display = "block"; knopf.disabled = false; knopf.textContent = "Jetzt kaufen · " + p.preis; }
  });
  box.appendChild(knopf); box.appendChild(hinweis);
  return box;
}
// Gutschein-Eingabe (tolerant, der Server normalisiert).
function gutscheinKasten(onErfolg) {
  const box = kontoKasten("var(--blue)");
  box.appendChild(h("p", { class: "h-black", style: { margin: "0 0 6px", fontSize: "16px", lineHeight: "1.05", letterSpacing: "-.02em" } }, "Ich habe einen Gutschein"));
  box.appendChild(h("p", { style: { margin: "0 0 10px", fontSize: "13px", lineHeight: "1.45" } }, "Code aus der Mail oder vom Gutschein-PDF – Groß/klein und Bindestriche sind egal."));
  const feld = h("input", { class: "field", placeholder: "WW-XXXX-XXXX", "aria-label": "Gutschein-Code", id: "gutschein-code", autocomplete: "off", spellcheck: "false", style: { textTransform: "uppercase", letterSpacing: ".06em" } });
  const hinweis = kontoHinweis(""); hinweis.style.display = "none";
  const knopf = kontoKnopf("Gutschein einlösen", async () => {
    knopf.disabled = true;
    try {
      const r = await Konto.einloesen(String(feld.value || ""));
      hinweis.textContent = r.meldung || (r.ok ? "Eingelöst." : "Das hat nicht geklappt."); hinweis.style.color = r.ok ? "inherit" : "var(--red)"; hinweis.style.display = "block";
      if (r.ok) { knopf.textContent = "Eingelöst ✓"; Konto.meldung = r.meldung || ""; if (onErfolg) onErfolg(r); else kontoNeuZeichnen(); } else knopf.disabled = false;
    } catch (e) {
      hinweis.textContent = e && e.nichtAngemeldet ? "Bitte zuerst anmelden – dann hängt der Gutschein an deinem Konto." : ((e && e.message) || "Das hat nicht geklappt."); hinweis.style.color = "var(--red)"; hinweis.style.display = "block"; knopf.disabled = false;
    }
  }, { style: { background: "var(--ink)" } });
  box.appendChild(feld); box.appendChild(knopf); box.appendChild(hinweis);
  return box;
}

// kontoNeuZeichnen(): Konto-Screen nach einer Aenderung (Einloesen) frisch aufbauen; Konto.meldung
// wird dabei einmal oben angezeigt.
function kontoNeuZeichnen() {
  const root = document.getElementById("screen-root");
  if (!root || Router.current !== "konto") return;
  root.innerHTML = ""; Screens.konto.render(root); window.scrollTo(0, 0);
}
// --- Konto-Bereich ----------------------------------------------------------------------------------
Screens.konto = {
  render(root) {
    const s = AppState.data; const k = s.konto; const kt = s.kontingente;
    const wrap = h("section", { class: "scr-pad" });
    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Konto"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "8px" } }, k ? "Dein Konto" : "Anmelden"));
    const params = new URLSearchParams(window.location.search);
    if (params.get("angemeldet") === "1" && Konto.andererTab) {
      // C3.2 Teil 2: der andere, schon offene Tab ist angemeldet -- dieser hier darf zu.
      const box = kontoKasten("var(--yellow)");
      box.appendChild(h("p", { class: "h-black", style: { margin: "0 0 6px", fontSize: "18px", lineHeight: "1.05" } }, "Du bist angemeldet ✓"));
      box.appendChild(h("p", { style: { margin: "0", fontSize: "13px", lineHeight: "1.45" } }, "Dein anderes Wimmel-Wizard-Fenster ist jetzt angemeldet – du kannst dieses Fenster schließen."));
      box.appendChild(kontoKnopf("Hier weitermachen", () => { Konto.andererTab = false; Konto.nachAnmeldungWeiter(); }, { style: { background: "var(--ink)" } }));
      root.appendChild(h("section", { class: "scr-pad" }, [h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Konto"), box]));
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    if (params.get("angemeldet") === "1") wrap.appendChild(kontoHinweis("Angemeldet – alles Bisherige hängt jetzt an deinem Konto."));
    // C3.1 Punkt 6 (28.10.2026): Rueckkehr von Stripe -- "Zahlung wird verbucht …" und alle 2 s den
    // Konto-Stand abfragen (max. 2 min), bis das Paket mit dieser Checkout-Session gebucht ist;
    // dann Erfolgsmeldung und Screen frisch. Kein manuelles Neuladen mehr noetig.
    if (params.get("aufgeladen")) {
      const typ = params.get("aufgeladen"), cs = params.get("session_id") || "";
      const schonDa = !!(k && (k.pakete || []).some((p) => cs ? p.stripe_session_id === cs : p.typ === typ));
      if (schonDa) wrap.appendChild(kontoHinweis("Danke! " + Konto.paket(typ).name + " ist freigeschaltet. Eine Bestätigung kommt per Mail."));
      else {
        const box = kontoKasten("var(--yellow)");
        box.appendChild(h("p", { class: "h-black buchung-puls", style: { margin: "0 0 6px", fontSize: "16px", lineHeight: "1.05" } }, "Zahlung wird verbucht …"));
        box.appendChild(h("p", { style: { margin: "0", fontSize: "13px", lineHeight: "1.45" }, "aria-live": "polite", id: "buchung-hinweis" }, "Stripe hat deine Zahlung angenommen – wir warten auf die Bestätigung, das dauert meist nur Sekunden."));
        wrap.appendChild(box);
        Konto.aufBuchungWarten(typ, cs);
      }
    }
    if (params.get("aufladen") === "abgebrochen") wrap.appendChild(kontoHinweis("Kein Problem – nichts wurde gekauft."));
    if (params.get("anmeldung")) wrap.appendChild(kontoHinweis(params.get("anmeldung"), true));
    if (params.get("geloescht") === "1") wrap.appendChild(kontoHinweis("Dein Konto und deine gespeicherten Stände sind gelöscht."));
    if (Konto.meldung) { wrap.appendChild(kontoHinweis(Konto.meldung)); Konto.meldung = ""; }
    if (!k) {
      wrap.appendChild(h("p", { class: "caveat-sub" }, "ohne Passwort. nur eine Mail."));
      wrap.appendChild(anmeldeFormular());
      wrap.appendChild(gutscheinKasten());
      if (kt) wrap.appendChild(kontingentKasten(kt));
    } else {
      const info = kontoKasten("var(--paper)");
      info.appendChild(h("p", { style: { margin: "0", fontSize: "13px" } }, [h("span", { class: "h-black", style: { fontSize: "11px", letterSpacing: ".06em" } }, "E-MAIL "), document.createTextNode(k.email)]));
      info.appendChild(h("p", { style: { margin: "8px 0 0", fontSize: "13px" } }, [h("span", { class: "h-black", style: { fontSize: "11px", letterSpacing: ".06em" } }, "GUTHABEN "), document.createTextNode(k.guthaben + (k.guthaben_cent ? " – wird beim Buch voll angerechnet" : ""))]));
      const pakete = (k.pakete || []).map((p) => p.name).join(", ");
      info.appendChild(h("p", { style: { margin: "8px 0 0", fontSize: "13px" } }, [h("span", { class: "h-black", style: { fontSize: "11px", letterSpacing: ".06em" } }, "PAKETE "), document.createTextNode(pakete || "noch keins")]));
      if (k.extra_aktionen) info.appendChild(h("p", { style: { margin: "8px 0 0", fontSize: "13px" } }, [h("span", { class: "h-black", style: { fontSize: "11px", letterSpacing: ".06em" } }, "EXTRA-AKTIONEN "), document.createTextNode(String(k.extra_aktionen))]));
      wrap.appendChild(info);
      wrap.appendChild(meineFamilien()); // C3.3 Punkt 2
      if (kt) wrap.appendChild(kontingentKasten(kt));
      if (!k.bezahlt) wrap.appendChild(aufladenKasten("zauberguthaben"));
      else if (k.stufe === "zauberguthaben") wrap.appendChild(aufladenKasten("grossfamilie"));
      const kontingentVoll = kt && (kt.figuren.stand >= kt.figuren.grenze || kt.bilder.stand >= kt.bilder.grenze);
      if (k.bezahlt && (kontingentVoll || (s.stopp && s.stopp.grund === "aenderung"))) wrap.appendChild(aufladenKasten("extra", !!(s.stopp && s.stopp.grund === "aenderung")));
      if (!k.gutschein_code) wrap.appendChild(gutscheinKasten());
      const reihe = h("div", { style: { display: "flex", gap: "10px", marginTop: "18px" } });
      reihe.appendChild(kontoKnopf("Abmelden", async () => { await Konto.abmelden(); Router.goScreen("konto"); }, { style: { background: "var(--paper)", color: "var(--ink)", marginTop: "0" } }));
      reihe.appendChild(kontoKnopf("Meine Daten löschen", () => Router.goScreen("kontoLoeschen"), { style: { background: "var(--paper)", color: "var(--red)", marginTop: "0" } }));
      wrap.appendChild(reihe);
    }
    wrap.appendChild(kontoKnopf("Zurück zur App", () => Router.goScreen("dashboard"), { style: { background: "var(--ink)", marginTop: "18px" } }));
    root.appendChild(wrap);
    if (params.toString()) window.history.replaceState(null, "", window.location.pathname);
  }
};
function kontingentKasten(kt) {
  const box = kontoKasten("var(--paper)");
  const stufe = { gratis: "Gratis", zauberguthaben: "Zauberguthaben", grossfamilie: "Großfamilie" }[kt.stufe] || kt.stufe;
  box.appendChild(h("p", { class: "h-black", style: { margin: "0 0 6px", fontSize: "11px", letterSpacing: ".06em" } }, "NOCH FREI · " + stufe.toUpperCase()));
  const zeile = (t) => h("p", { style: { margin: "4px 0 0", fontSize: "13px" } }, t);
  box.appendChild(zeile("Figuren: " + Math.max(0, kt.figuren.grenze - kt.figuren.stand) + " von " + kt.figuren.grenze + (kt.stufe === "gratis" ? " (aus dem Regal)" : "")));
  if (kt.figuren.fotoGrenze) box.appendChild(zeile("davon per Foto: " + Math.max(0, kt.figuren.fotoGrenze - kt.figuren.foto) + " von " + kt.figuren.fotoGrenze));
  box.appendChild(zeile("Wimmelbilder: " + Math.max(0, kt.bilder.grenze - kt.bilder.stand) + " von " + kt.bilder.grenze));
  if (kt.figuren.grenze > 5) box.appendChild(h("p", { style: { margin: "8px 0 0", fontSize: "12px", lineHeight: "1.4", color: "var(--ink-a70)" } }, HELDEN_HINWEIS)); // C3.2 Teil 1
  return box;
}

// --- C3.3: Familien-Karte (Auswahl-Screen und "Meine Familien") -------------------------------------
function familieDatum(iso) {
  if (!iso) return "noch nicht gespeichert";
  const d = new Date(iso); if (isNaN(d)) return "";
  const heute = new Date(); const gleich = d.toDateString() === heute.toDateString();
  const zeit = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return "geändert " + (gleich ? "heute, " + zeit : "am " + d.toLocaleDateString("de-DE") + ", " + zeit);
}
function familienKarte(f, modus, onWahl) {
  const karte = h("div", { "data-familie": f.sid, style: { marginTop: "12px", border: "4px solid var(--ink)", background: f.aktuell ? "var(--yellow)" : "var(--paper)", boxShadow: "5px 6px 0 var(--ink)", padding: "12px 14px" } });
  const kopf = h("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } });
  const bilder = h("div", { style: { display: "flex" } });
  (f.vorschau || []).forEach((v, i) => bilder.appendChild(h("img", { src: v.bild, alt: v.name, title: v.name, style: { width: "40px", height: "40px", objectFit: "cover", border: "3px solid var(--ink)", background: "var(--blue)", marginLeft: i ? "-8px" : "0", borderRadius: "50%" } })));
  if (!(f.vorschau || []).length) bilder.appendChild(h("span", { style: { width: "40px", height: "40px", border: "3px dashed var(--ink)", borderRadius: "50%", display: "inline-block" } }));
  kopf.appendChild(bilder);
  const titel = (f.namen || []).slice(0, 4).join(", ") + ((f.namen || []).length > 4 ? " …" : "");
  kopf.appendChild(h("p", { class: "h-black", style: { margin: "0", fontSize: "15px", lineHeight: "1.1", letterSpacing: "-.01em", flex: "1 1 140px" } }, titel || "noch ohne Figuren"));
  if (f.aktuell) kopf.appendChild(h("span", { class: "h-black", style: { fontSize: "9px", letterSpacing: ".08em", padding: "4px 6px", background: "var(--ink)", color: "var(--paper)" } }, modus === "auswahl" ? "IN DIESEM FENSTER" : "GEÖFFNET"));
  karte.appendChild(kopf);
  karte.appendChild(h("p", { style: { margin: "8px 0 0", fontSize: "12px", lineHeight: "1.4" } }, f.figuren + (f.figuren === 1 ? " Figur" : " Figuren") + " · " + f.bilder + (f.bilder === 1 ? " Bild" : " Bilder") + " · " + familieDatum(f.geaendert)));
  if (modus === "anzeige") return karte;
  if (modus === "auswahl") {
    karte.appendChild(kontoKnopf(f.aktuell ? "Diese weiterbearbeiten" : "Diese Familie öffnen", () => onWahl(f), { style: f.aktuell ? { background: "var(--ink)" } : {} }));
  } else {
    const reihe = h("div", { style: { display: "flex", gap: "8px", marginTop: "10px" } });
    if (!f.aktuell) {
      reihe.appendChild(kontoKnopf("Öffnen", () => onWahl(f, "oeffnen"), { style: { marginTop: "0", background: "var(--ink)", minHeight: "42px" } }));
      reihe.appendChild(kontoKnopf("Entfernen", () => onWahl(f, "entfernen"), { attrs: { "data-aktion": "entfernen" }, style: { marginTop: "0", background: "var(--paper)", color: "var(--red)", minHeight: "42px" } }));
    }
    if (reihe.children.length) karte.appendChild(reihe);
  }
  return karte;
}
// C3.3 Punkt 2: "Meine Familien" im Konto-Bereich -- alle Familien (Sitzungen) mit Vorschau, Oeffnen
// und Entfernen (Bestaetigungsseite). Grundlage fuer das spaetere Folgebuch mit derselben Familie.
function meineFamilien() {
  const box = h("div", { id: "meine-familien", style: { marginTop: "18px" } });
  box.appendChild(h("p", { class: "h-black", style: { margin: "0", fontSize: "16px", lineHeight: "1.05", letterSpacing: "-.02em" } }, "Meine Familien"));
  box.appendChild(h("p", { style: { margin: "4px 0 0", fontSize: "12px", lineHeight: "1.4" } }, "Jede Familie behält ihre Figuren und Bilder – auf jedem Gerät, auf dem du angemeldet bist."));
  const liste = h("div", {}, [h("p", { style: { margin: "10px 0 0", fontSize: "12px", color: "var(--ink-a70)" } }, "lädt …")]);
  const hinweis = kontoHinweis("", true); hinweis.style.display = "none";
  box.appendChild(liste); box.appendChild(hinweis);
  Konto.familien().then((familien) => {
    liste.innerHTML = "";
    const sichtbar = familien.filter((f) => f.aktuell || !f.leer);
    Konto.familienCache = sichtbar;
    if (!sichtbar.length) { liste.appendChild(h("p", { style: { margin: "10px 0 0", fontSize: "12px" } }, "Noch keine Familie gespeichert.")); return; }
    sichtbar.forEach((f) => liste.appendChild(familienKarte(f, "konto", async (gewaehlt, aktion) => {
      if (aktion === "entfernen") { Konto.familieZiel = gewaehlt; Router.goScreen("familieEntfernen"); return; }
      try { await Konto.familieOeffnen(gewaehlt.sid); Konto.meldung = "Familie geöffnet: " + gewaehlt.namen.slice(0, 4).join(", ") + "."; kontoNeuZeichnen(); }
      catch (e) { hinweis.textContent = (e && e.message) || "Das hat nicht geklappt."; hinweis.style.display = "block"; }
    })));
  }).catch((e) => { liste.innerHTML = ""; liste.appendChild(kontoHinweis((e && e.message) || "Familien konnten gerade nicht geladen werden.", true)); });
  return box;
}
// Bestaetigungsseite "Familie entfernen?" (statt confirm()).
Screens.familieEntfernen = {
  render(root) {
    const f = Konto.familieZiel;
    if (!f) { Router.goScreen("konto"); return; }
    const wrap = h("section", { class: "scr-pad" });
    wrap.appendChild(h("p", { class: "kicker kicker-red", style: { transform: "rotate(-2deg)" } }, "Meine Familien"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "8px" } }, "Familie entfernen?"));
    wrap.appendChild(familienKarte(f, "anzeige"));
    wrap.appendChild(h("p", { style: { margin: "14px 0 0", fontSize: "14px", lineHeight: "1.5" } }, "Diese Familie mit allen Figuren und Bildern wird aus deinem Konto entfernt. Das lässt sich nicht rückgängig machen. Was schon gezaubert wurde, zählt weiter zu eurem Kontingent."));
    const hinweis = kontoHinweis("", true); hinweis.style.display = "none";
    wrap.appendChild(kontoKnopf("Ja, Familie entfernen", async (ev) => {
      const b = ev.currentTarget; if (b.disabled) return; b.disabled = true; b.textContent = "entfernt …";
      try { await Konto.post({ mode: "familie-entfernen", sid: f.sid, bestaetigt: true, sessionId: AppState.data.sessionId }); Konto.familieZiel = null; Konto.meldung = "Familie entfernt."; await Konto.laden(); Router.goScreen("konto"); }
      catch (e) { hinweis.textContent = (e && e.message) || "Das hat nicht geklappt."; hinweis.style.display = "block"; b.disabled = false; b.textContent = "Ja, Familie entfernen"; }
    }));
    wrap.appendChild(hinweis);
    wrap.appendChild(kontoKnopf("Nein, zurück", () => { Konto.familieZiel = null; Router.goScreen("konto"); }, { style: { background: "var(--paper)", color: "var(--ink)" } }));
    root.appendChild(wrap);
  }
};
// Auswahl-Screen nach der Anmeldung: "Welche Familie moechtest du weiterbearbeiten?"
Screens.familien = {
  render(root) {
    const wrap = h("section", { class: "scr-pad" });
    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Angemeldet ✓"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "29px", marginBottom: "8px" } }, "Welche Familie möchtest du weiterbearbeiten?"));
    wrap.appendChild(h("p", { style: { margin: "0", fontSize: "13px", lineHeight: "1.45" } }, "In deinem Konto liegt schon eine Familie, und hier im Fenster ist eine neue entstanden. Die andere bleibt im Konto erhalten – du findest sie unter „Meine Familien“."));
    const hinweis = kontoHinweis("", true); hinweis.style.display = "none";
    const liste = Konto.auswahlListe || [];
    if (!liste.length) { Router.goScreen("dashboard"); return; }
    liste.forEach((f) => wrap.appendChild(familienKarte(f, "auswahl", async (gewaehlt) => {
      try {
        if (!gewaehlt.aktuell) await Konto.familieOeffnen(gewaehlt.sid);
        Konto.auswahlListe = null;
        Router.goScreen("dashboard");
      } catch (e) { hinweis.textContent = (e && e.message) || "Das hat nicht geklappt."; hinweis.style.display = "block"; }
    })));
    wrap.appendChild(hinweis);
    root.appendChild(wrap);
  }
};

// --- Daten loeschen: Bestaetigungsseite statt confirm() ----------------------------------------------
Screens.kontoLoeschen = {
  render(root) {
    const wrap = h("section", { class: "scr-pad" });
    wrap.appendChild(h("p", { class: "kicker kicker-red", style: { transform: "rotate(-2deg)" } }, "Meine Daten löschen"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "8px" } }, "Wirklich alles löschen?"));
    wrap.appendChild(h("p", { style: { margin: "0", fontSize: "14px", lineHeight: "1.5" } }, "Weg sind dann: dein Konto, alle damit verbundenen Sitzungen mit Figuren und Bildern, und die Zähler. Gutscheine bleiben als Kaufbeleg bestehen; von gekauften Paketen bleibt nur ein anonymer Kaufnachweis für die Buchhaltung (Betrag, Datum, Paket, Stripe-Zahlungs-ID – ohne Name und E-Mail)."));
    // C3.1 Punkt 5: Restguthaben/Pakete -> deutlicher Hinweis + eigener Pflicht-Haken.
    const k = AppState.data.konto; const mitGuthaben = !!(k && k.hat_guthaben);
    let haken = null;
    if (mitGuthaben) {
      const box = kontoKasten("var(--yellow)");
      box.appendChild(h("p", { class: "h-black", style: { margin: "0 0 6px", fontSize: "15px", lineHeight: "1.1" } }, (Konto.guthabenVerfallSatz || "Dein Guthaben von {betrag} verfällt beim Löschen und kann nicht erstattet werden.").replace("{betrag}", k.guthaben)));
      if ((k.pakete || []).length) box.appendChild(h("p", { style: { margin: "0 0 6px", fontSize: "13px", lineHeight: "1.45" } }, "Pakete, die dann weg sind: " + k.pakete.map((p) => p.name).join(", ") + "."));
      haken = h("input", { type: "checkbox", id: "guthaben-verfaellt", style: { width: "20px", height: "20px", flex: "none", marginTop: "2px" } });
      box.appendChild(h("label", { for: "guthaben-verfaellt", style: { display: "flex", gap: "10px", alignItems: "flex-start", margin: "10px 0 0", fontSize: "13px", lineHeight: "1.4", cursor: "pointer" } }, [haken, document.createTextNode(Konto.guthabenVerfallHaken || "Ich weiß, dass mein Guthaben verfällt.")]));
      box.appendChild(h("p", { style: { margin: "4px 0 0", fontSize: "10px", color: "var(--ink-a70)" } }, "[Platzhalter-Wortlaut, wird vom Anwalt geprüft]"));
      wrap.appendChild(box);
    }
    const hinweis = kontoHinweis("", true); hinweis.style.display = "none";
    wrap.appendChild(kontoKnopf("Ja, alles löschen", async (ev) => {
      const b = ev.currentTarget; if (b.disabled) return;
      if (haken && !haken.checked) { hinweis.textContent = "Bitte bestätigen, dass dein Guthaben verfällt."; hinweis.style.display = "block"; return; }
      b.disabled = true; b.textContent = "löscht …";
      try { await Konto.loeschen(!!(haken && haken.checked)); try { localStorage.clear(); } catch (e) { /* egal */ } window.location.href = "/app/konto?geloescht=1"; }
      catch (e) { hinweis.textContent = (e && e.message) || "Das hat nicht geklappt."; hinweis.style.display = "block"; b.disabled = false; b.textContent = "Ja, alles löschen"; }
    }));
    wrap.appendChild(hinweis);
    wrap.appendChild(kontoKnopf("Nein, zurück", () => Router.goScreen("konto"), { style: { background: "var(--paper)", color: "var(--ink)" } }));
    root.appendChild(wrap);
  }
};

// --- Stopp-Screen: Kontingent erreicht ----------------------------------------------------------------
Screens.stopp = {
  render(root) {
    const s = AppState.data; const st = s.stopp || { grund: "figuren", stufe: "gratis", text: "" }; const k = s.konto;
    const wrap = h("section", { class: "scr-pad" });
    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Kurz anhalten"));
    const titel = st.grund === "foto" ? "Mit Foto? Gern." : st.grund === "bild" ? "Mehr Wimmelbilder?" : st.grund === "aenderung" ? "Noch mal ändern?" : "Mehr Figuren?";
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "8px" } }, titel));
    if (st.text) wrap.appendChild(h("p", { class: "caveat-sub", style: { fontSize: "19px" } }, st.text));
    if (st.grund === "aenderung") {
      if (k && k.bezahlt) wrap.appendChild(aufladenKasten("extra", true, "Extra-Zauberpaket – " + Konto.paket("extra").preis));
      else wrap.appendChild(h("p", { style: { fontSize: "13px", lineHeight: "1.45", marginTop: "12px" } }, "Mit dem Zauberguthaben und einem Konto gibt es dafür das Extra-Zauberpaket (5 weitere Versuche)."));
    }
    if (!k) {
      wrap.appendChild(anmeldeFormular("Zauberguthaben für 9,90 €", "wird beim Buch voll angerechnet. Erst anmelden (ohne Passwort), dann kaufen – alles Bisherige bleibt."));
      wrap.appendChild(gutscheinKasten());
    } else if (!k.bezahlt) {
      wrap.appendChild(aufladenKasten("zauberguthaben", false, "Zauberguthaben für 9,90 € – wird beim Buch voll angerechnet"));
      if (!k.gutschein_code) wrap.appendChild(gutscheinKasten(() => Router.goScreen("dashboard")));
    } else if (st.grossfamilieMoeglich && k.stufe === "zauberguthaben") {
      wrap.appendChild(aufladenKasten("grossfamilie", false, "Großfamilie – " + Konto.paket("grossfamilie").preis));
    } else if (st.grund !== "aenderung") {
      wrap.appendChild(h("p", { style: { fontSize: "13px", lineHeight: "1.45", marginTop: "12px" } }, "Das ist das Maximum dieser Stufe – mit dem, was da ist, wird das Buch trotzdem wunderbar."));
    }
    wrap.appendChild(kontoKnopf("Erst mal weitermachen", () => { AppState.update({ stopp: null }); Router.goScreen(st.grund === "bild" ? "szene" : "charakterblatt"); }, { style: { background: "var(--ink)", marginTop: "18px" } }));
    root.appendChild(wrap);
  }
};
