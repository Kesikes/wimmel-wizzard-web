// /api/order-notify.js — Vercel Serverless Function
//
// Halbautomatische Zwischenlösung für den Druckauftrag (siehe Chat-Notiz vom 31.07.2026):
// WIRmachenDRUCK bietet keine öffentliche Self-Service-API für Auftragsübermittlung – nur ein
// manuell einzurichtendes Wiederverkäufer-Programm. Bis das (oder ein Wechsel zu einem Print-on-
// Demand-Anbieter mit echter API wie Gelato/Prodigi) geklärt ist, macht diese Funktion Folgendes
// automatisch, sobald eine Zahlung erfolgreich war:
//   1. Lädt die Charakter-/Szenenbilder (fal.ai-CDN-URLs) serverseitig.
//   2. Baut daraus zwei druckfertige PDFs im exakten WIRmachenDRUCK-Format
//      "Pappbilderbuch mit Lay-Flat-Bindung, DIN A4 hoch" (Umschlag.pdf + Inhalt.pdf,
//      3mm Beschnitt bereits enthalten, siehe offizielles Datenblatt).
//   3. Schickt beide PDFs + alle Bestelldaten per E-Mail an dich (Resend-API).
// Der letzte Schritt – die PDFs im WIRmachenDRUCK-Warenkorb hochladen und bestellen – bleibt
// bewusst manuell, bis eine echte Anbindung steht.
//
// Secrets liegen als Vercel-Umgebungsvariablen:
//   RESEND_API_KEY     – dein Resend-API-Key (siehe DEPLOY-ANLEITUNG.md)
//   ORDER_NOTIFY_EMAIL – optional, Ziel-Adresse für die Bestell-Mail (Standard: mk@iicm.consulting)

const { PDFDocument } = require("pdf-lib");

// ---- WIRmachenDRUCK Datenblatt "Pappbilderbuch mit Lay-Flat-Bindung, DIN A4 hoch" ----
// Maße inkl. 3mm Beschnitt (randabfallende Objekte müssen bis hier reichen).
// Sicherheitsabstand 3mm und Buchrücken 9mm sind für alle Seitenzahl-Varianten identisch.
const MM = 2.834645669; // 1mm in PDF-Points
const SPEC = {
  coverBleedMm: { w: 435, h: 303 }, // Umschlag als Doppelseite inkl. Buchrücken
  innerBleedMm: { w: 426, h: 303 }, // Innenteil-Doppelseite
  tiers: [
    { pages: 16, spreads: 7 },
    { pages: 20, spreads: 9 },
    { pages: 24, spreads: 11 },
    { pages: 28, spreads: 13 }
  ]
};
function tierFor(spreadCount) {
  return SPEC.tiers.find(t => t.spreads >= spreadCount) || SPEC.tiers[SPEC.tiers.length - 1];
}

async function fetchImageBytes(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Bild konnte nicht geladen werden (" + resp.status + "): " + url);
  return new Uint8Array(await resp.arrayBuffer());
}
async function embedFill(pdfDoc, page, url, w, h) {
  const bytes = await fetchImageBytes(url);
  let img;
  try { img = await pdfDoc.embedPng(bytes); }
  catch (e) { img = await pdfDoc.embedJpg(bytes); }
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  page.drawImage(img, { x: (w - dw) / 2, y: (h - dh) / 2, width: dw, height: dh });
}

async function buildPdfs(characters, scenes) {
  // Umschlag.pdf: eine Doppelseite (Vorder- + Rückseite als gemeinsame Fläche).
  const coverDoc = await PDFDocument.create();
  const cw = SPEC.coverBleedMm.w * MM, ch = SPEC.coverBleedMm.h * MM;
  const coverPage = coverDoc.addPage([cw, ch]);
  const coverImg = (characters[0] && characters[0].img) || (scenes[0] && scenes[0].img);
  if (coverImg) await embedFill(coverDoc, coverPage, coverImg, cw, ch);
  const coverBytes = await coverDoc.save();

  // Inhalt.pdf: eine Seite pro Doppelseite. Erste Doppelseite stellt die Charaktere vor,
  // danach eine Doppelseite pro Wimmel-Szene.
  const images = [];
  if (characters[0]) images.push(characters[0].img);
  for (const s of scenes) if (s && s.img) images.push(s.img);
  const tier = tierFor(Math.max(images.length, 1));
  while (images.length < tier.spreads) images.push(images[images.length - 1]); // letzte Szene wiederholen statt Leerseite
  images.length = tier.spreads;

  const innerDoc = await PDFDocument.create();
  const iw = SPEC.innerBleedMm.w * MM, ih = SPEC.innerBleedMm.h * MM;
  for (const url of images) {
    const page = innerDoc.addPage([iw, ih]);
    if (url) await embedFill(innerDoc, page, url, iw, ih);
  }
  const innerBytes = await innerDoc.save();

  return { tier, coverBytes, innerBytes };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function tierLabel(tier) {
  return tier.pages + "-seitiges Lay-Flat-Bindung Pappbilderbuch DIN A4";
}

async function sendResendEmail(apiKey, payload) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return resp;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Nur POST erlaubt." }); return; }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    res.status(500).json({ error: "Server-Fehler: RESEND_API_KEY ist im Vercel-Projekt nicht gesetzt." });
    return;
  }

  const body = req.body || {};
  const order = body.order || {};
  const characters = Array.isArray(body.characters) ? body.characters.filter(c => c && c.img) : [];
  const scenes = Array.isArray(body.scenes) ? body.scenes.filter(s => s && s.img) : [];
  if (!scenes.length && !characters.length) {
    res.status(400).json({ error: "Keine Bilder übergeben." });
    return;
  }

  let pdfs;
  try {
    pdfs = await buildPdfs(characters, scenes);
  } catch (e) {
    res.status(502).json({ error: "Druckdaten-Aufbereitung fehlgeschlagen: " + String((e && e.message) || e) });
    return;
  }

  const ownerEmail = process.env.ORDER_NOTIFY_EMAIL || "mk@iicm.consulting";
  const fromAddr = "Wimmel Wizard <onboarding@resend.dev>"; // Resend-Sandbox-Absender, siehe DEPLOY-ANLEITUNG.md für eigene Domain

  const orderHtml = `
    <h2>Neue Wimmel-Wizard-Bestellung 🪄</h2>
    <p><b>Produkt:</b> ${escapeHtml(order.product || "–")}</p>
    <p><b>Druckformat:</b> ${escapeHtml(tierLabel(pdfs.tier))}</p>
    <p><b>Bezahlt:</b> ${escapeHtml(String(order.amount != null ? order.amount : "–"))} € via PayPal${order.sandbox ? " (⚠️ Sandbox-Test, kein echtes Geld!)" : ""}</p>
    <p><b>Kundin/Kunde:</b> ${escapeHtml(order.payer || "–")}${order.payerEmail ? " · " + escapeHtml(order.payerEmail) : ""}</p>
    <p><b>Bestell-Nr.:</b> ${escapeHtml(order.id || "–")}</p>
    <p><b>Zeit:</b> ${escapeHtml(order.time || "–")}</p>
    <p><b>Charaktere:</b> ${escapeHtml(characters.map(c => c.name).filter(Boolean).join(", ") || "–")}</p>
    <p><b>Szenen:</b> ${scenes.length}</p>
    <hr>
    <p>Angehängt: <b>Umschlag.pdf</b> + <b>Inhalt.pdf</b>, fertig im WIRmachenDRUCK-Format
       (3mm Beschnitt bereits enthalten, Bilder randfüllend platziert).</p>
    <p>➡️ Nächster Schritt (noch manuell): im WIRmachenDRUCK-Warenkorb "${escapeHtml(tierLabel(pdfs.tier))}"
       wählen, Menge 1, diese zwei PDFs hochladen (Umschlag als Doppelseite inkl. Buchrücken,
       Inhalt als Doppelseiten), Lieferadresse der Kundin/des Kunden eintragen, bestellen.</p>`;

  const attachments = [
    { filename: "Umschlag.pdf", content: Buffer.from(pdfs.coverBytes).toString("base64") },
    { filename: "Inhalt.pdf", content: Buffer.from(pdfs.innerBytes).toString("base64") }
  ];

  try {
    const resp = await sendResendEmail(RESEND_KEY, {
      from: fromAddr,
      to: [ownerEmail],
      subject: "Neue Bestellung: " + (order.product || "Wimmel Wizard") + " – " + (order.payer || "Kunde"),
      html: orderHtml,
      attachments
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      res.status(502).json({ error: "E-Mail-Versand fehlgeschlagen (" + resp.status + "): " + txt.slice(0, 200) });
      return;
    }
  } catch (e) {
    res.status(502).json({ error: "Verbindung zu Resend fehlgeschlagen: " + String(e) });
    return;
  }

  // Kundenbestätigung: best-effort, darf die Bestellung nicht blockieren. Hinweis: Resend kann ohne
  // eigene verifizierte Domain im Sandbox-Modus nur an die eigene Account-Adresse senden – bis eine
  // Domain verifiziert ist, schlägt das hier für echte Kunden-Adressen erwartungsgemäß fehl.
  let customerNotified = false;
  if (order.payerEmail) {
    try {
      const r2 = await sendResendEmail(RESEND_KEY, {
        from: fromAddr,
        to: [order.payerEmail],
        subject: "Dein Wimmel Wizard wird vorbereitet! 🪄",
        html: `<p>Hallo${order.payer ? " " + escapeHtml(order.payer) : ""},</p>
               <p>vielen Dank für deine Bestellung! Dein persönliches Wimmelbuch wird jetzt für den
               Druck vorbereitet. Du bekommst eine weitere Nachricht, sobald es auf dem Weg zu dir ist.</p>`
      });
      customerNotified = r2.ok;
    } catch (e) { /* bewusst kein Fehler nach außen – Haupt-Mail an dich ist raus */ }
  }

  res.status(200).json({ ok: true, tier: pdfs.tier, customerNotified });
};
