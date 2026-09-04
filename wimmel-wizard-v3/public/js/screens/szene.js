/* ==========================================================================
   Wimmel Wizard v3 — Screens „Szene", „Zaubern", „Ergebnis" (Schritt 4)
   Texte wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   ========================================================================== */

const WAYS = [
  { n: "1", title: "Thema wählen", body: "Fertige Welten: Bauernhof, Weltraum, Weihnachtsabend, Ritterburg." },
  { n: "2", title: "Geschichte aufnehmen", body: "Abends beim Erzählen das Mikro mitlaufen lassen. Null Extra-Aufwand." },
  { n: "3", title: "Selbst eintippen", body: "Ein paar Sätze reichen. Ich frage nach, wenn etwas fehlt." }
];
const THEMES = ["Bauernhof im Herbst", "Weihnachtsabend", "Weltraum", "Ritterburg", "Unterwasser", "Zirkus"];
const THEME_BG = ["var(--blue)", "var(--yellow)", "var(--paper)", "var(--yellow)", "var(--blue)", "var(--paper)"];
const STARTHILFEN = ["Ein ganz normaler Morgen", "Der Tag, an dem alles schiefging", "Unser Lieblingsplatz"];

Screens.szene = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "scr-pad" });

    wrap.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Bild 2 von 5"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px" } }, [
      document.createTextNode("Woraus soll"), h("br"), document.createTextNode("ich die Szene"), h("br"),
      h("span", { style: { color: "var(--red)" } }, "bauen?")
    ]));
    wrap.appendChild(h("p", { class: "caveat-sub" }, "alle drei Wege sind gleich gut. das dritte kostet dich abends null Aufwand."));

    const list = h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
    WAYS.forEach((w, i) => {
      const on = s.sceneWay === i;
      const row = h("button", {
        type: "button",
        style: { display: "flex", gap: "8px", alignItems: "flex-start", width: "100%", cursor: "pointer", padding: "15px", border: "4px solid var(--ink)", color: "inherit", background: on ? "var(--yellow)" : "var(--paper)", boxShadow: on ? "6px 7px 0 var(--ink)" : "4px 5px 0 var(--ink)" },
        onClick: () => { AppState.update({ sceneWay: i }); rerender(); }
      });
      row.appendChild(h("span", { class: "h-black", style: { flex: "none", fontSize: "26px", lineHeight: ".8", width: "34px" } }, w.n));
      const textCol = h("span", { style: { flex: "1", minWidth: "0", textAlign: "left" } });
      textCol.appendChild(h("span", { class: "h-black", style: { display: "block", fontSize: "17px", lineHeight: "1", letterSpacing: "-.03em" } }, w.title));
      textCol.appendChild(h("span", { style: { display: "block", marginTop: "5px", fontSize: "13px", lineHeight: "1.4" } }, w.body));
      row.appendChild(textCol);
      list.appendChild(row);
    });
    wrap.appendChild(list);

    if (s.sceneWay === 0) wrap.appendChild(buildThemeGrid());
    if (s.sceneWay === 1) wrap.appendChild(buildRecordPanel());
    if (s.sceneWay === 2) wrap.appendChild(buildTextPanel());

    root.appendChild(wrap);
    function rerender() { root.innerHTML = ""; Screens.szene.render(root); }
  }
};

function buildThemeGrid() {
  const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px" } });
  THEMES.forEach((label, i) => {
    grid.appendChild(h("button", {
      type: "button",
      style: {
        cursor: "pointer", fontFamily: "'Archivo Black',sans-serif", fontSize: "13px", lineHeight: "1.05", letterSpacing: "-.02em",
        textTransform: "uppercase", textAlign: "left", padding: "16px 12px", minHeight: "84px", border: "4px solid var(--ink)",
        color: "var(--ink)", transform: "rotate(" + rot(i, ROT6_APP) + "deg)", background: THEME_BG[i % THEME_BG.length], boxShadow: "4px 5px 0 var(--ink)"
      },
      onClick: () => { AppState.update({ sceneTheme: label }); Router.goScreen("zaubern"); }
    }, label));
  });
  return grid;
}

function buildRecordPanel() {
  const panel = h("div", { style: { marginTop: "20px", border: "4px solid var(--ink)", background: "var(--ink)", color: "var(--paper)", padding: "20px 16px", textAlign: "center", boxShadow: "6px 7px 0 var(--red)" } });
  panel.appendChild(h("p", { class: "caveat", style: { margin: "0 0 16px", fontSize: "21px", lineHeight: "1.15", color: "var(--yellow)" } }, "erzähl heute Abend eine Geschichte wie sonst auch. ich hör einfach mit."));
  const bars = h("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "4px", height: "54px", marginBottom: "16px" } });
  for (let i = 0; i < 17; i++) {
    bars.appendChild(h("span", { style: { display: "block", width: "6px", height: "100%", background: i % 3 === 0 ? "var(--yellow)" : "var(--paper)", animation: "wave " + (0.7 + (i % 5) * 0.18).toFixed(2) + "s ease-in-out infinite", animationDelay: (i * 0.07).toFixed(2) + "s" } }));
  }
  panel.appendChild(bars);
  panel.appendChild(h("button", {
    type: "button", class: "h-black",
    style: { width: "100%", minHeight: "58px", background: "var(--red)", color: "var(--paper)", border: "4px solid var(--paper)", fontSize: "16px", cursor: "pointer", animation: "pulse 2.4s ease-out infinite" },
    onClick: () => Router.goScreen("zaubern")
  }, "Aufnahme stoppen · 04:12"));
  panel.appendChild(h("p", { style: { margin: "12px 0 0", fontSize: "12px", lineHeight: "1.45", color: "var(--paper-a75)" } }, "Danach zeige ich dir, was ich herausgehört habe – als antippbare Stichworte, die du korrigieren kannst."));
  return panel;
}

function buildTextPanel() {
  const s = AppState.data;
  const panel = h("div", { style: { marginTop: "20px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "16px" } });
  const ta = h("textarea", { class: "field", style: { minHeight: "120px" }, placeholder: "Wir waren im Herbst auf dem Bauernhof, Mia wollte nicht in den Stall und Papa hat den Traktor kaputt gemacht …", "aria-label": "Eure Geschichte" });
  ta.value = s.sceneText || "";
  ta.addEventListener("input", () => AppState.update({ sceneText: ta.value }));
  panel.appendChild(ta);
  panel.appendChild(h("p", { class: "h-black", style: { margin: "12px 0 8px", fontSize: "11px", letterSpacing: ".06em" } }, "oder eine Starthilfe antippen"));
  const chipWrap = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px" } });
  STARTHILFEN.forEach((label, i) => {
    chipWrap.appendChild(h("button", {
      type: "button",
      style: { border: "3px solid var(--ink)", background: i === 0 ? "var(--yellow)" : "#FFF", fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: "700", padding: "8px 10px", cursor: "pointer", color: "var(--ink)" },
      onClick: () => { ta.value = label; AppState.update({ sceneText: label }); }
    }, label));
  });
  panel.appendChild(chipWrap);
  return panel;
}

// ---- Zaubern ----

const JOKES = [
  "Warum nehmen Kühe nie den Aufzug? Weil sie schon oben ganz gut muhen können.",
  "Was sagt ein Traktor auf dem Bauernhof zum Heuballen? „Nichts, Traktoren reden nicht. Das war die Oma.“",
  "Warum hat der Bauer sein Huhn zum Schreiner geschickt? Es wollte unbedingt ein Ei-genheim."
];
const LOAD_STEPS = [
  { mark: "✓", label: "Figuren aus euren Charakterblättern gesetzt" },
  { mark: "✓", label: "Bauernhof gebaut, 41 Situationen verteilt" },
  { mark: "◐", label: "Variante 2 von 3 wird gezeichnet" },
  { mark: "○", label: "Qualitätsprüfung, dann zeige ich dir die beste" }
];

Screens.zaubern = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { style: { background: "var(--ink)", color: "var(--paper)", padding: "26px 14px 30px", minHeight: "74vh" } });

    wrap.appendChild(h("p", { class: "h-black", style: { margin: "0 0 8px", display: "inline-block", background: "var(--yellow)", color: "var(--ink)", border: "3px solid var(--paper)", fontSize: "9px", letterSpacing: ".1em", padding: "5px 8px", transform: "rotate(-2deg)" } }, "Ich zaubere · noch ca. 3 Minuten"));
    wrap.appendChild(h("h1", { class: "h-black", style: { fontSize: "30px", lineHeight: ".88", letterSpacing: "-.04em" } }, [
      document.createTextNode("Ich mache"), h("br"), document.createTextNode("das nicht"), h("br"),
      h("span", { style: { color: "var(--yellow)" } }, "schnell.")
    ]));
    wrap.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 0", fontSize: "20px", lineHeight: "1.12", color: "var(--paper-a90)" } }, "ich zeichne drei Varianten und behalte die beste. das dauert – dafür sitzt es dann."));

    const spinWrap = h("div", { style: { position: "relative", margin: "22px 0 0", display: "flex", justifyContent: "center" } });
    spinWrap.appendChild(h("span", { style: { position: "absolute", top: "50%", left: "50%", width: "168px", height: "168px", margin: "-84px 0 0 -84px", border: "4px dashed var(--paper-a38)", borderRadius: "50%", animation: "spin 22s linear infinite" } }));
    spinWrap.appendChild(h("img", { src: "assets/wizard-on-book.png", alt: "WizzelWim zaubert", style: { position: "relative", width: "128px", animation: "wob 3.6s ease-in-out infinite" } }));
    wrap.appendChild(spinWrap);

    const stepsWrap = h("div", { style: { marginTop: "22px", display: "flex", flexDirection: "column", gap: "5px" } });
    LOAD_STEPS.forEach((l, i) => {
      const row = h("div", { style: { display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", lineHeight: "1.4", padding: "11px 0", borderTop: "2px solid var(--paper-a45)", color: i > 2 ? "var(--paper-a45)" : "var(--paper)" } });
      row.appendChild(h("span", { class: "h-black", style: { flex: "none", width: "22px", fontSize: "13px" } }, l.mark));
      row.appendChild(h("span", { style: { flex: "1", minWidth: "0" } }, l.label));
      stepsWrap.appendChild(row);
    });
    wrap.appendChild(stepsWrap);

    const stayCard = h("div", { style: { marginTop: "24px", border: "4px solid var(--paper)", background: "var(--red)", padding: "16px", transform: "rotate(.8deg)" } });
    stayCard.appendChild(h("p", { class: "h-black", style: { fontSize: "15px", lineHeight: "1.05", letterSpacing: "-.02em" } }, "Willst du hierbleiben?"));
    stayCard.appendChild(h("p", { class: "caveat", style: { margin: "7px 0 12px", fontSize: "20px", lineHeight: "1.12" } }, "du kannst auch was anderes machen – ich schreib dir, wenn's fertig ist. oder ich erzähl dir Witze."));

    const jokeArea = h("div", {});
    function renderJokeArea() {
      jokeArea.innerHTML = "";
      if (!s.jokesOn) {
        const row = h("div", { style: { display: "flex", gap: "9px" } });
        row.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "var(--yellow)", border: "3px solid var(--ink)", fontSize: "13px", color: "var(--ink)" }, onClick: () => { AppState.update({ jokesOn: true }); renderJokeArea(); } }, "Witz, bitte"));
        row.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "rgba(26,26,24,.15)", border: "3px solid var(--paper)", fontSize: "13px", color: "var(--paper)" }, onClick: () => Router.goScreen("ergebnis") }, "Ich geh kurz weg"));
        jokeArea.appendChild(row);
      } else {
        const box = h("div", { style: { border: "3px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", padding: "14px" } });
        box.appendChild(h("p", { style: { fontSize: "15px", lineHeight: "1.45", fontWeight: "600" } }, JOKES[s.jokeIndex % JOKES.length]));
        box.appendChild(h("button", { type: "button", class: "h-black", style: { marginTop: "12px", minHeight: "44px", width: "100%", background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px" }, onClick: () => { AppState.update({ jokeIndex: s.jokeIndex + 1 }); renderJokeArea(); } }, "Noch einen"));
        jokeArea.appendChild(box);
      }
    }
    renderJokeArea();
    stayCard.appendChild(jokeArea);
    wrap.appendChild(stayCard);

    root.appendChild(wrap);
  }
};

// ---- Ergebnis ----

Screens.ergebnis = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "mobile-only", style: { padding: "18px 0 0" } });

    const head = h("div", { style: { padding: "0 14px" } });
    head.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Bild 2 · Bauernhof im Herbst"));
    head.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "14px" } }, [document.createTextNode("Da ist"), h("br"), document.createTextNode("es.")]));
    wrap.appendChild(head);

    const imgWrap = h("div", { style: { position: "relative", borderTop: "4px solid var(--ink)", borderBottom: "4px solid var(--ink)", background: "var(--ink)" } });
    const img = h("img", { src: "assets/hero-wimmelhaus.png", alt: "Fertiges Wimmelbild", style: { display: "block", width: "100%" } });
    imgWrap.appendChild(img);

    const canvas = h("canvas", { style: { position: "absolute", inset: "0", width: "100%", height: "100%", touchAction: "none" } });
    imgWrap.appendChild(canvas);
    canvas.classList.toggle("hidden", !s.penOn);

    const penTag = h("span", { class: "h-black", style: { position: "absolute", left: "22%", top: "34%", margin: "-30px 0 0 74px", background: "var(--red)", color: "var(--paper)", fontSize: "10px", letterSpacing: ".06em", padding: "5px 7px", transform: "rotate(-3deg)", pointerEvents: "none" } }, "das da weg");
    penTag.classList.toggle("hidden", !s.penOn);
    imgWrap.appendChild(penTag);

    wrap.appendChild(imgWrap);
    setupFreehand(canvas, img);

    const tools = h("div", { style: { display: "flex", gap: "8px", padding: "12px 14px 0" } });
    const penBtn = h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", fontSize: "12px", border: "3px solid var(--ink)", background: s.penOn ? "var(--red)" : "var(--paper)", color: s.penOn ? "var(--paper)" : "var(--ink)" } }, "Stift");
    penBtn.addEventListener("click", () => {
      const nowOn = !AppState.data.penOn;
      AppState.update({ penOn: nowOn });
      penBtn.style.background = nowOn ? "var(--red)" : "var(--paper)";
      penBtn.style.color = nowOn ? "var(--paper)" : "var(--ink)";
      canvas.classList.toggle("hidden", !nowOn);
      penTag.classList.toggle("hidden", !nowOn);
      hint.textContent = nowOn
        ? "kringel einfach drüber. ich muss nicht genau wissen, wo das Ding anfängt – ich verstehe, was du meinst."
        : "irgendwas störend? nimm den Stift und mal es durch. der Rest der Szene bleibt genau so.";
    });
    tools.appendChild(penBtn);
    tools.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px", color: "inherit" } }, "Detail antippen"));
    tools.appendChild(h("button", { type: "button", class: "h-black", style: { flex: "1", minHeight: "48px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "12px", color: "inherit" } }, "Nochmal zaubern"));
    wrap.appendChild(tools);

    const hintBox = h("div", { style: { margin: "16px 14px 0", position: "relative", background: "var(--blue)", border: "4px solid var(--ink)", padding: "15px 15px 15px 54px", boxShadow: "5px 6px 0 var(--ink)", transform: "rotate(-.8deg)" } });
    hintBox.appendChild(h("img", { src: "assets/wizard-magnifier.png", alt: "", style: { position: "absolute", left: "-18px", top: "-14px", width: "46px", transform: "rotate(-10deg)" } }));
    const hint = h("p", { class: "caveat", style: { fontSize: "20px", lineHeight: "1.12" } },
      s.penOn ? "kringel einfach drüber. ich muss nicht genau wissen, wo das Ding anfängt – ich verstehe, was du meinst."
              : "irgendwas störend? nimm den Stift und mal es durch. der Rest der Szene bleibt genau so.");
    hintBox.appendChild(hint);
    wrap.appendChild(hintBox);

    root.appendChild(wrap);
    root.appendChild(buildDesktopErgebnis(s));
  }
};

function buildDesktopErgebnis(s) {
  const grid = h("section", { class: "edit-desktop-grid desktop-only" });

  const left = h("div", { style: { position: "relative", background: "var(--ink)", padding: "26px 0 26px 32px", display: "flex", alignItems: "center" } });
  const imgBox = h("div", { style: { position: "relative", width: "100%", border: "4px solid var(--paper)" } });
  const dImg = h("img", { src: "assets/hero-wimmelhaus.png", alt: "Fertiges Wimmelbild", style: { display: "block", width: "100%" } });
  imgBox.appendChild(dImg);
  const dCanvas = h("canvas", { style: { position: "absolute", inset: "0", width: "100%", height: "100%", touchAction: "none" } });
  dCanvas.classList.toggle("hidden", !s.penOn);
  imgBox.appendChild(dCanvas);
  const dPenTag = h("span", { class: "h-black", style: { position: "absolute", left: "20%", top: "30%", margin: "-34px 0 0 160px", background: "var(--red)", color: "var(--paper)", fontSize: "12px", letterSpacing: ".06em", padding: "7px 10px", transform: "rotate(-3deg)", pointerEvents: "none" } }, "das da weg");
  dPenTag.classList.toggle("hidden", !s.penOn);
  imgBox.appendChild(dPenTag);
  left.appendChild(imgBox);
  grid.appendChild(left);
  setupFreehand(dCanvas, dImg);

  const aside = h("aside", { style: { background: "var(--paper)", borderLeft: "4px solid var(--ink)", padding: "26px 28px 26px 26px", display: "flex", flexDirection: "column", gap: "18px" } });

  const top = h("div", {});
  top.appendChild(h("p", { class: "kicker kicker-yellow", style: { transform: "rotate(-2deg)" } }, "Bild 2 · Bauernhof im Herbst"));
  top.appendChild(h("h1", { class: "h-black", style: { fontSize: "44px", lineHeight: ".88", letterSpacing: "-.045em" } }, "Da ist es."));
  top.appendChild(h("p", { class: "caveat", style: { margin: "8px 0 0", fontSize: "23px", lineHeight: "1.1" } }, "41 Situationen drin. schau erst mal in Ruhe."));
  aside.appendChild(top);

  const toolCol = h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
  const dPenBtn = h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "52px", fontSize: "13px", border: "3px solid var(--ink)", cursor: "pointer", background: s.penOn ? "var(--red)" : "var(--paper)", color: s.penOn ? "var(--paper)" : "var(--ink)" } }, "Stift · markieren, was weg soll");
  dPenBtn.addEventListener("click", () => {
    const nowOn = !AppState.data.penOn;
    AppState.update({ penOn: nowOn });
    dPenBtn.style.background = nowOn ? "var(--red)" : "var(--paper)";
    dPenBtn.style.color = nowOn ? "var(--paper)" : "var(--ink)";
    dCanvas.classList.toggle("hidden", !nowOn);
    dPenTag.classList.toggle("hidden", !nowOn);
    dHint.textContent = nowOn
      ? "kringel einfach drüber. ich muss nicht genau wissen, wo das Ding anfängt – ich verstehe, was du meinst."
      : "irgendwas störend? nimm den Stift und mal es durch. der Rest der Szene bleibt genau so.";
  });
  toolCol.appendChild(dPenBtn);
  toolCol.appendChild(h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "52px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" } }, "Einzelnes Detail antippen"));
  toolCol.appendChild(h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "52px", background: "var(--paper)", border: "3px solid var(--ink)", fontSize: "13px", color: "inherit" } }, "Ganze Szene nochmal zaubern"));
  aside.appendChild(toolCol);

  const dHintBox = h("div", { style: { position: "relative", background: "var(--blue)", border: "4px solid var(--ink)", boxShadow: "6px 7px 0 var(--ink)", padding: "18px 18px 18px 62px", transform: "rotate(-.8deg)" } });
  dHintBox.appendChild(h("img", { src: "assets/wizard-magnifier.png", alt: "", style: { position: "absolute", left: "-20px", top: "-16px", width: "52px", transform: "rotate(-10deg)" } }));
  const dHint = h("p", { class: "caveat", style: { fontSize: "22px", lineHeight: "1.12" } },
    s.penOn ? "kringel einfach drüber. ich muss nicht genau wissen, wo das Ding anfängt – ich verstehe, was du meinst."
            : "irgendwas störend? nimm den Stift und mal es durch. der Rest der Szene bleibt genau so.");
  dHintBox.appendChild(dHint);
  aside.appendChild(dHintBox);

  const bottom = h("div", { style: { marginTop: "auto", borderTop: "4px solid var(--ink)", paddingTop: "18px" } });
  bottom.appendChild(h("button", { type: "button", class: "h-black", style: { width: "100%", minHeight: "60px", background: "var(--red)", color: "var(--paper)", border: "3px solid var(--ink)", boxShadow: "5px 5px 0 var(--ink)", fontSize: "17px", cursor: "pointer" }, onClick: () => Router.goScreen("entscheidung") }, "Wimmelbild ist fertig!"));
  bottom.appendChild(h("p", { class: "caveat", style: { margin: "10px 0 0", textAlign: "center", fontSize: "20px" } }, "nachbessern geht auch später noch."));
  aside.appendChild(bottom);

  grid.appendChild(aside);
  return grid;
}

// Echtes Freihand-Kritzeln im Stift-Modus: Kreis, Durchstreichen, Gekritzel
// gelten alle gleichwertig als Zeiger auf ein Objekt (siehe Briefing Schritt 4).
function setupFreehand(canvas, img) {
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let last = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#E4442A";
  }
  if (img.complete) resize(); else img.addEventListener("load", resize);
  window.addEventListener("resize", resize);

  function point(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: cx, y: cy };
  }
  function start(e) {
    if (canvas.classList.contains("hidden")) return;
    drawing = true;
    last = point(e);
    e.preventDefault();
  }
  function move(e) {
    if (!drawing) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    e.preventDefault();
  }
  function end() { drawing = false; }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);
}
