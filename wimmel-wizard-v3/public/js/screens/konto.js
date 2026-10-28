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
  async loeschen() { const r = await Konto.post({ mode: "loeschen", bestaetigt: true }); AppState.update({ konto: null, bezahlt: false, kontingente: null }); return r; },
  // stoppZeigen(e): Fehler mit stopp-Objekt -> Stopp-Screen. Gibt true zurueck, wenn er gezeigt wurde.
  stoppZeigen(e) {
    const st = e && e.stopp;
    if (!st) return false;
    AppState.update({ stopp: Object.assign({ text: String((e && e.message) || ""), am: Date.now() }, st) });
    Router.goScreen("stopp");
    return true;
  },
  angebot: [], widerrufsverzichtSatz: "", einloesenAb: "", meldung: "",
  paket(typ) { return (Konto.angebot || []).find((p) => p.id === typ) || { id: typ, name: typ, preis: "" }; },
};
window.Konto = Konto;

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
      hinweis.textContent = (r.hinweis || "Wir haben dir einen Link geschickt.") + " Sobald du ihn öffnest, bist du auch hier angemeldet."; hinweis.style.color = "inherit"; hinweis.style.display = "block";
      knopf.textContent = "Mail ist unterwegs ✓";
      if (r.warte) Konto.aufAnmeldungWarten(r.warte, () => { Konto.meldung = "Angemeldet – alles Bisherige hängt jetzt an deinem Konto."; if (Router.current === "konto") kontoNeuZeichnen(); else if (typeof renderScreen === "function") renderScreen(); });
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
    if (params.get("angemeldet") === "1") wrap.appendChild(kontoHinweis("Angemeldet – alles Bisherige hängt jetzt an deinem Konto."));
    if (params.get("aufgeladen")) wrap.appendChild(kontoHinweis("Danke! Sobald Stripe die Zahlung bestätigt, ist " + Konto.paket(params.get("aufgeladen")).name + " freigeschaltet – das dauert meist nur Sekunden. Eine Bestätigung kommt per Mail."));
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
  return box;
}

// --- Daten loeschen: Bestaetigungsseite statt confirm() ----------------------------------------------
Screens.kontoLoeschen = {
  render(root) {
    const wrap = h("section", { class: "scr-pad" });
    wrap.appendChild(h("p", { class: "kicker kicker-red", style: { transform: "rotate(-2deg)" } }, "Meine Daten löschen"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "8px" } }, "Wirklich alles löschen?"));
    wrap.appendChild(h("p", { style: { margin: "0", fontSize: "14px", lineHeight: "1.5" } }, "Weg sind dann: dein Konto, alle damit verbundenen Sitzungen mit Figuren und Bildern, und die Zähler. Gekauftes Guthaben lässt sich danach nicht wiederherstellen. Gutscheine bleiben als Kaufbeleg bestehen."));
    const hinweis = kontoHinweis("", true); hinweis.style.display = "none";
    wrap.appendChild(kontoKnopf("Ja, alles löschen", async (ev) => {
      const b = ev.currentTarget; if (b.disabled) return; b.disabled = true; b.textContent = "löscht …";
      try { await Konto.loeschen(); try { localStorage.clear(); } catch (e) { /* egal */ } window.location.href = "/app/konto?geloescht=1"; }
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
