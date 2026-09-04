/* ==========================================================================
   Wimmel Wizard v3 — Screens „Bestellen" und „Fertig" (Schritt 6)
   Texte wörtlich aus referenz/App-Flow-v4-OatlyWimmel.dc.html.
   Hinweis: Die Bestellkarte zeigt wie in Referenz und Briefing-Text literal
   immer „Mini-Wimmelbuch · 49 €", unabhängig von der Tier-Wahl im
   Entscheidungsscreen (der Bottom-Bar-CTA "Jetzt bestellen · 49 €" ist in
   beiden Quellen ebenfalls statisch) — bei Bedarf leicht auf AppState.data.tier
   umstellbar.
   ========================================================================== */

const PAYS = ["PayPal", "Kreditkarte", "Klarna", "Rechnung"];

Screens.bestellen = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { class: "scr-pad" });

    wrap.appendChild(h("p", { class: "kicker kicker-blue", style: { transform: "rotate(-2deg)" } }, "Bestellung · nichts Verstecktes"));
    wrap.appendChild(h("h1", { class: "h1-scr", style: { fontSize: "31px", marginBottom: "16px" } }, [document.createTextNode("Ab in"), h("br"), document.createTextNode("den Druck.")]));

    const orderCard = h("div", { style: { display: "flex", gap: "12px", border: "4px solid var(--ink)", background: "var(--paper)", boxShadow: "6px 7px 0 var(--ink)", padding: "14px" } });
    orderCard.appendChild(h("img", { src: "assets/example_gardasee.png", alt: "Euer Wimmelbuch", style: { flex: "none", width: "96px", border: "3px solid var(--ink)", alignSelf: "flex-start" } }));
    const orderText = h("div", { style: { flex: "1", minWidth: "0" } });
    orderText.appendChild(h("p", { class: "h-black", style: { fontSize: "16px", lineHeight: "1", letterSpacing: "-.02em" } }, "Mini-Wimmelbuch"));
    orderText.appendChild(h("p", { style: { margin: "6px 0 0", fontSize: "13px", lineHeight: "1.4" } }, "2 Wimmelbilder + Charakterseite, 8 Seiten, Hardcover, mit Widmung."));
    orderText.appendChild(h("p", { class: "h-black", style: { margin: "8px 0 0", fontSize: "20px" } }, "49 €"));
    orderCard.appendChild(orderText);
    wrap.appendChild(orderCard);

    const delivery = h("div", { style: { marginTop: "14px", border: "4px solid var(--ink)", background: "var(--yellow)", padding: "14px", transform: "rotate(-.6deg)" } });
    delivery.appendChild(h("p", { class: "h-black", style: { fontSize: "14px", lineHeight: "1.1", letterSpacing: "-.02em" } }, "Kommt sicher an bis Fr, 18. Dezember"));
    delivery.appendChild(h("p", { class: "caveat", style: { margin: "5px 0 0", fontSize: "19px" } }, "also vor Weihnachten. mit Puffer."));
    wrap.appendChild(delivery);

    const fields = h("div", { style: { marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" } });
    fields.appendChild(h("input", { class: "field", placeholder: "Vor- und Nachname", "aria-label": "Vor- und Nachname" }));
    fields.appendChild(h("input", { class: "field", placeholder: "Straße und Hausnummer", "aria-label": "Straße und Hausnummer" }));
    const row = h("div", { style: { display: "flex", gap: "10px" } });
    row.appendChild(h("input", { class: "field", style: { flex: "none", width: "110px" }, placeholder: "PLZ", "aria-label": "Postleitzahl" }));
    row.appendChild(h("input", { class: "field", style: { flex: "1", minWidth: "0" }, placeholder: "Ort", "aria-label": "Ort" }));
    fields.appendChild(row);
    wrap.appendChild(fields);

    wrap.appendChild(h("p", { class: "h-black", style: { margin: "18px 0 8px", fontSize: "11px", letterSpacing: ".06em" } }, "Bezahlen mit"));
    const payWrap = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px" } });
    PAYS.forEach((label, i) => {
      const on = s.payMethod === i;
      const btn = h("button", { type: "button", class: "pay-btn" + (on ? " on" : ""), onClick: () => { AppState.update({ payMethod: i }); rerender(); } }, label);
      payWrap.appendChild(btn);
    });
    wrap.appendChild(payWrap);

    wrap.appendChild(h("p", { style: { margin: "14px 0 0", fontSize: "12px", lineHeight: "1.45", color: "rgba(26,26,24,.7)" } }, "Gedruckt und gebunden in Deutschland. Deine Daten bleiben auf deutschen Servern. Fotos sind längst gelöscht."));

    root.appendChild(wrap);
    function rerender() { root.innerHTML = ""; Screens.bestellen.render(root); }
  }
};

Screens.fertig = {
  render(root) {
    const s = AppState.data;
    const wrap = h("section", { style: { background: "var(--red)", color: "var(--paper)", padding: "24px 14px 30px", minHeight: "74vh", textAlign: "center" } });

    const bubbleWrap = h("div", { style: { position: "relative", width: "100%", maxWidth: "320px", margin: "0 auto 14px", transform: "rotate(-2deg)" } });
    bubbleWrap.appendChild(h("img", { src: "assets/wizard-speechbubble.png", alt: "WizzelWim", style: { width: "100%" } }));
    bubbleWrap.appendChild(h("p", { class: "h-black", style: { position: "absolute", left: "45%", top: "8%", width: "52%", height: "52%", display: "flex", alignItems: "center", fontSize: "18px", lineHeight: ".98", letterSpacing: "-.03em", color: "var(--ink)", textAlign: "left" } }, "Ich fange sofort an!"));
    wrap.appendChild(bubbleWrap);

    wrap.appendChild(h("h1", { class: "h-black", style: { fontSize: "32px", lineHeight: ".88", letterSpacing: "-.04em" } }, [
      document.createTextNode("Euer Buch"), h("br"), document.createTextNode("ist unterwegs"), h("br"),
      h("span", { style: { color: "var(--yellow)" } }, "zu euch.")
    ]));
    wrap.appendChild(h("p", { class: "caveat", style: { margin: "12px 0 20px", fontSize: "21px", lineHeight: "1.12" } }, "in zehn Tagen liegt es auf dem Couchtisch und jemand sucht eine halbe Stunde die Katze."));

    const box = h("div", { style: { border: "4px solid var(--paper)", background: "rgba(26,26,24,.22)", padding: "16px", textAlign: "left" } });
    box.appendChild(orderRow("Bestellung", "WW-2026-04817", true));
    box.appendChild(orderRow("Da bis", "Fr, 18. Dezember"));
    box.appendChild(orderRow("Widmung", s.dedication ? "„" + s.dedication.replace(/^„|“$/g, "") + "“" : "„Für Mia, die alles findet.“"));
    wrap.appendChild(box);

    wrap.appendChild(h("button", { type: "button", class: "h-black", style: { marginTop: "18px", width: "100%", minHeight: "56px", background: "var(--yellow)", color: "var(--ink)", border: "4px solid var(--ink)", fontSize: "15px", cursor: "pointer" }, onClick: () => Router.goScreen("dashboard") }, "Noch ein Bild machen"));

    root.appendChild(wrap);
  }
};

function orderRow(label, value, first) {
  const p = h("p", { style: { margin: first ? "0" : "10px 0 0", display: "flex", gap: "10px", fontSize: "14px", lineHeight: "1.5" } });
  p.appendChild(h("span", { class: "h-black", style: { letterSpacing: ".06em", textTransform: "uppercase", fontSize: "11px", width: "108px", flex: "none", paddingTop: "3px" } }, label));
  p.appendChild(h("span", {}, value));
  return p;
}
