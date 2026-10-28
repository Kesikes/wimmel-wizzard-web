/* ==========================================================================
   Wimmel Wizard — Wasserzeichen als Rapport (C3.2 Teil 3, 28.10.2026)

   EINE Funktion fuer alle Stellen, an denen ein Bild ein Zeichen braucht (Teilen-Bild in szene.js,
   Gutschein-Vorschau auf /gutschein). Der Schriftzug "Wimmel Wizard" in der Logo-Schrift
   (Archivo Black, wie .h-black auf der Landingpage) wiederholt sich als Rapport ueber das ganze
   Bild, leicht diagonal, weiss mit dunkler Kontur und halbtransparent -- das Bild bleibt gut
   sichtbar, laesst sich aber nicht ohne Zeichen weiterverwenden. Gekaufte Bilder und die
   Druckdatei bekommen KEIN Zeichen (dort wird diese Datei nie aufgerufen).

   Alle Stellschrauben stehen in WASSERZEICHEN (Deckkraft, Winkel, Abstaende, Kontur).
   ========================================================================== */
(function (root) {
  const WASSERZEICHEN = {
    TEXT: "Wimmel Wizard",
    WINKEL_GRAD: -18,          // leicht diagonal
    DECKKRAFT: 0.18,           // 15-20 %: sichtbar, aber das Bild bleibt gut erkennbar
    ABSTAND_X: 0.45,           // Luecke zwischen zwei Schriftzuegen, Anteil der Textbreite
    ABSTAND_Y: 1.9,            // Zeilenabstand, Anteil der Schriftgroesse
    KONTUR: 0.10,              // dunkle Kontur, Anteil der Schriftgroesse
    SCHRIFT: "'Archivo Black', 'Archivo', Arial, sans-serif",
    FUELLUNG: "#F2EDE1",       // Papier
    KONTUR_FARBE: "#1A1A18",   // Tinte
    GROESSE_ANTEIL: 0.06,      // Schriftgroesse relativ zur Bildbreite (Teilen-Bild)
    GROESSE_MIN: 22,
  };
  function schriftGroesseFuer(breite) { return Math.max(WASSERZEICHEN.GROESSE_MIN, Math.round(breite * WASSERZEICHEN.GROESSE_ANTEIL)); }
  // schriftLaden(): die Logo-Schrift muss geladen sein, bevor ein Canvas sie zeichnet (sonst Fallback).
  async function schriftLaden(groesse) {
    try { if (document.fonts && document.fonts.load) await document.fonts.load("900 " + (groesse || 40) + "px 'Archivo Black'"); } catch (e) { /* Fallback-Schrift */ }
  }
  // kachel(groesse) -> Canvas mit zwei versetzten Zeilen (Ziegelversatz) -- der Rapport entsteht
  // durch Wiederholung dieser Kachel (createPattern bzw. CSS background-repeat).
  function kachel(groesse, deckkraft, variante) {
    const probe = document.createElement("canvas").getContext("2d");
    probe.font = "900 " + groesse + "px " + WASSERZEICHEN.SCHRIFT;
    const textBreite = Math.ceil(probe.measureText(WASSERZEICHEN.TEXT).width);
    const kw = Math.ceil(textBreite * (1 + WASSERZEICHEN.ABSTAND_X));
    const zeile = Math.ceil(groesse * WASSERZEICHEN.ABSTAND_Y);
    const c = document.createElement("canvas");
    c.width = kw; c.height = zeile * 2;
    const ctx = c.getContext("2d");
    ctx.font = "900 " + groesse + "px " + WASSERZEICHEN.SCHRIFT;
    ctx.textBaseline = "middle";
    ctx.globalAlpha = deckkraft == null ? WASSERZEICHEN.DECKKRAFT : deckkraft;
    ctx.lineJoin = "round";
    // variante "dunkel": auf hellem Papier (Gutschein-Vorschau) Tinte ohne Kontur, sonst Papier mit Tinten-Kontur.
    const dunkel = variante === "dunkel";
    ctx.lineWidth = Math.max(1, groesse * WASSERZEICHEN.KONTUR);
    ctx.strokeStyle = WASSERZEICHEN.KONTUR_FARBE;
    ctx.fillStyle = dunkel ? WASSERZEICHEN.KONTUR_FARBE : WASSERZEICHEN.FUELLUNG;
    const zeichne = (x, y) => { if (!dunkel) ctx.strokeText(WASSERZEICHEN.TEXT, x, y); ctx.fillText(WASSERZEICHEN.TEXT, x, y); };
    // Zeile 1 am linken Rand, Zeile 2 um eine halbe Kachel versetzt (laeuft ueber den Rand -> zwei Teile)
    zeichne(0, zeile / 2);
    zeichne(kw / 2, zeile * 1.5); zeichne(kw / 2 - kw, zeile * 1.5);
    return c;
  }
  // anwenden(ctx, breite, hoehe[, groesse]): Rapport diagonal ueber die ganze Flaeche legen.
  function anwenden(ctx, breite, hoehe, groesse) {
    const g = groesse || schriftGroesseFuer(breite);
    const muster = ctx.createPattern(kachel(g), "repeat");
    const diag = Math.ceil(Math.sqrt(breite * breite + hoehe * hoehe));
    ctx.save();
    ctx.translate(breite / 2, hoehe / 2);
    ctx.rotate(WASSERZEICHEN.WINKEL_GRAD * Math.PI / 180);
    ctx.fillStyle = muster;
    ctx.fillRect(-diag, -diag, diag * 2, diag * 2);
    ctx.restore();
  }
  // datenUrl(groesse) -> PNG-Data-URL der Kachel fuer CSS (background-image, repeat), z. B. Gutschein-Vorschau.
  function datenUrl(groesse, deckkraft, variante) { return kachel(groesse, deckkraft, variante).toDataURL("image/png"); }
  // alsHintergrund(el, groesse, deckkraft, variante): legt den Rapport als gedrehten Hintergrund auf
  // ein (ueberdimensioniertes, absolut positioniertes) Element -- CSS-Weg fuer die Gutschein-Vorschau.
  function alsHintergrund(el, groesse, deckkraft, variante) {
    if (!el) return;
    const k = kachel(groesse, deckkraft, variante);
    el.style.backgroundImage = "url(" + k.toDataURL("image/png") + ")";
    el.style.backgroundSize = k.width + "px " + k.height + "px";
    el.style.backgroundRepeat = "repeat";
    el.style.transform = "rotate(" + WASSERZEICHEN.WINKEL_GRAD + "deg)";
  }
  const Wasserzeichen = Object.assign({ schriftGroesseFuer, schriftLaden, kachel, anwenden, datenUrl, alsHintergrund }, WASSERZEICHEN);
  if (typeof module !== "undefined" && module.exports) module.exports = Wasserzeichen;
  else root.Wasserzeichen = Wasserzeichen;
})(typeof window !== "undefined" ? window : this);
