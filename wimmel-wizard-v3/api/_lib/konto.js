// api/_lib/konto.js — NEU (C3 Konto & Aufladen, Teil A, 27.10.2026). Das Konto ohne Passwort:
// Anmelde-Link per Mail, Konto-Cookie, Datenmodell in Upstash, Verknuepfung mit Sitzungen.
//
// WANN ENTSTEHT EIN KONTO: erst wenn die Kundin es braucht -- beim Aufladen (Teil B), beim Einloesen
// eines Gutscheins (Teil C) oder ueber "Anmelden" im Konto-Bereich. Vorher bleibt alles wie bisher an
// der anonymen Sitzung (api/session.js, "Besitz der ID = Zugriff").
//
// ANMELDUNG: E-Mail eingeben -> Mail (Resend, Absender wie die Gutschein-Mails) mit Einmal-Link
// (signiert wie die Gutschein-Links, 30 Minuten gueltig, genau einmal benutzbar: der Link traegt eine
// Nonce, die beim Einloesen mit SET NX verbraucht wird) -> Klick setzt das Konto-Cookie (HttpOnly,
// Secure, SameSite=Lax, 180 Tage; Inhalt = signiertes Token mit der Konto-ID, kein Klartext).
// Beim ersten Anmelden haengt sich die aktuelle Sitzung mit allem Bisherigen (Figuren, Bilder,
// Zaehler) ans Konto (sitzungVerknuepfen); mehrere Sitzungen je Konto sind moeglich.
//
// DATENMODELL (Upstash, OHNE TTL -- ein Konto verfaellt nicht wie eine Sitzung):
//   konto:{id}                 JSON { id, email, erstellt_am, bezahlt, guthaben_cent, pakete: [{ typ, cent,
//                              am, stripe_session_id }], extra_aktionen, gutschein_code, sitzungen: [sid…] }
//   konto-email:{sha256(email)}  -> id (E-Mail klein/normalisiert; der Hash haelt die Adresse aus dem Schluessel)
//   sitzung-konto:{sid}        -> id (Rueckweg von der Sitzung zum Konto, free-tier.js bezahltStatus())
//   anmelde-nonce:{nonce}      "1" (SET NX, 30 min) -- verbrauchte Anmelde-Links
// KONTINGENTE: die Zaehler (freitier:*) haengen am Kontingent-Traeger -- Konto, sobald die Sitzung
// verknuepft ist, sonst Sitzung (free-tier.js traegerKey()). Beim Verknuepfen wandern die
// Sitzungszaehler ins Konto (INCRBY), damit nichts Bisheriges verloren geht oder doppelt zaehlt.
//
// Abhaengigkeiten injizierbar (Tests): mitDeps({ kv, jetzt, mail }).
const crypto = require("crypto");
const cfg = require("./gutschein-config");
const tokenLib = require("./gutschein-token");

const COOKIE_NAME = "ww_konto";
const COOKIE_TAGE = 180;
const ANMELDE_LINK_MINUTEN = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ZAEHLER = ["figuren", "figuren_chips", "figuren_foto", "bilder"]; // figuren* = Altzaehler (C3.1: nur noch geloescht/uebertragen, nicht gelesen)
const MENGEN = ["figur-ids", "figur-ids:chip", "figur-ids:foto"]; // C3.1: Figuren als Mengen (free-tier.js FIGUR_MENGEN)

function emailNormalisieren(e) { return String(e || "").trim().toLowerCase(); }
function emailGueltig(e) { const n = emailNormalisieren(e); return !!n && n.length <= 254 && EMAIL_RE.test(n); }
function emailHash(e) { return crypto.createHash("sha256").update(emailNormalisieren(e)).digest("hex"); }
function keyKonto(id) { return "konto:" + id; }
function keyEmail(e) { return "konto-email:" + emailHash(e); }
function keySitzung(sid) { return "sitzung-konto:" + String(sid).toLowerCase(); }

function standardDeps() {
  return { kv: (p) => require("./kv").kvCommand(p), jetzt: () => new Date(), mail: (a) => require("./mail").sendMail(a) };
}
function mitDeps(deps) {
  const d = Object.assign(standardDeps(), deps || {});

  async function lesen(id) {
    if (!id) return null;
    const roh = await d.kv(["get", keyKonto(id)]);
    if (!roh) return null;
    try { return JSON.parse(roh); } catch (e) { return null; }
  }
  async function speichern(k) { await d.kv(["set", keyKonto(k.id), JSON.stringify(k)]); return k; }
  async function perEmail(email) {
    if (!emailGueltig(email)) return null;
    const id = await d.kv(["get", keyEmail(email)]);
    return id ? lesen(id) : null;
  }
  // anlegenOderLesen(email) -> Konto (neu oder vorhanden). Der E-Mail-Index wird mit SET NX gesetzt --
  // zwei gleichzeitige erste Anmeldungen derselben Adresse ergeben trotzdem nur ein Konto.
  async function anlegenOderLesen(email) {
    if (!emailGueltig(email)) throw new Error("E-Mail-Adresse ungueltig.");
    const vorhanden = await perEmail(email);
    if (vorhanden) return vorhanden;
    const id = "k_" + crypto.randomBytes(12).toString("hex");
    const neu = await d.kv(["set", keyEmail(email), id, "NX"]);
    if (neu !== "OK") return perEmail(email);
    const k = { id, email: emailNormalisieren(email), erstellt_am: d.jetzt().toISOString(), bezahlt: false, guthaben_cent: 0, pakete: [], extra_aktionen: 0, gutschein_code: "", sitzungen: [] };
    await speichern(k);
    return k;
  }
  async function kontoZuSitzung(sid) {
    if (!SESSION_ID_RE.test(String(sid || ""))) return null;
    const id = await d.kv(["get", keySitzung(sid)]);
    return id ? lesen(id) : null;
  }
  // sitzungVerknuepfen(kontoId, sid) -> Konto. Haengt die Sitzung ans Konto und uebertraegt ihre
  // Kontingent-Zaehler (freitier:*:{sid}) auf den Konto-Traeger (freitier:*:konto:{id}).
  async function sitzungVerknuepfen(kontoId, sid) {
    const k = await lesen(kontoId);
    if (!k) throw new Error("Konto nicht gefunden.");
    if (!SESSION_ID_RE.test(String(sid || ""))) throw new Error("Ungueltige sessionId.");
    const s = String(sid).toLowerCase();
    const bisher = await d.kv(["get", keySitzung(s)]);
    if (bisher && bisher !== k.id) throw new Error("Diese Sitzung gehoert schon zu einem anderen Konto.");
    if (!bisher) {
      await d.kv(["set", keySitzung(s), k.id]);
      for (const z of ZAEHLER) {
        const wert = Number(await d.kv(["get", "freitier:" + z + ":" + s])) || 0;
        if (wert > 0) { await d.kv(["incrby", "freitier:" + z + ":konto:" + k.id, String(wert)]); await d.kv(["del", "freitier:" + z + ":" + s]); }
      }
      // C3.1: Figuren-Mengen der Sitzung in die des Kontos (Vereinigung, keine Doppelten)
      for (const m of MENGEN) {
        const ids = await d.kv(["smembers", "freitier:" + m + ":" + s]);
        if (Array.isArray(ids) && ids.length) { await d.kv(["sadd", "freitier:" + m + ":konto:" + k.id].concat(ids)); await d.kv(["del", "freitier:" + m + ":" + s]); }
      }
    }
    if (!k.sitzungen.includes(s)) { k.sitzungen.push(s); await speichern(k); }
    return k;
  }
  // paketGutschreiben(kontoId, { typ, cent, stripe_session_id }) -> { konto, neu }. Idempotent ueber
  // stripe_session_id (ein Stripe-Event kann mehrfach kommen). Zauberguthaben setzt bezahlt=true und
  // erhoeht guthaben_cent (wird beim Buchkauf angerechnet, C5); Extra-Zauberpaket gibt 5 Aktionen.
  async function paketGutschreiben(kontoId, p) {
    const k = await lesen(kontoId);
    if (!k) throw new Error("Konto nicht gefunden.");
    if (p.stripe_session_id && k.pakete.some((x) => x.stripe_session_id === p.stripe_session_id)) return { konto: k, neu: false };
    const paket = cfg.PAKETE[p.typ];
    if (!paket) throw new Error("Unbekanntes Paket: " + p.typ);
    k.pakete.push({ typ: p.typ, cent: Number(p.cent) || paket.cent, am: d.jetzt().toISOString(), stripe_session_id: p.stripe_session_id || "", stripe_payment_intent: p.stripe_payment_intent || "" });
    if (p.typ === "zauberguthaben") { k.bezahlt = true; k.guthaben_cent = (k.guthaben_cent || 0) + (Number(p.cent) || paket.cent); }
    if (p.typ === "extra") k.extra_aktionen = (k.extra_aktionen || 0) + (paket.aktionen || 0);
    await speichern(k);
    return { konto: k, neu: true };
  }
  // gutscheinGutschreiben(kontoId, { code, cent }) -> Konto: wirkt wie Zauberguthaben, Guthaben = bezahlt_cent.
  async function gutscheinGutschreiben(kontoId, g) {
    const k = await lesen(kontoId);
    if (!k) throw new Error("Konto nicht gefunden.");
    if (k.gutschein_code === g.code) return k;
    k.bezahlt = true; k.guthaben_cent = (k.guthaben_cent || 0) + (Number(g.cent) || 0); k.gutschein_code = g.code;
    k.pakete.push({ typ: "gutschein", cent: Number(g.cent) || 0, am: d.jetzt().toISOString(), gutschein_code: g.code });
    await speichern(k);
    return k;
  }
  // extraVerbrauchen(kontoId) -> true, wenn eine Extra-Aktion abgebucht wurde (Korrekturkontingent erschoepft).
  async function extraVerbrauchen(kontoId) {
    const k = await lesen(kontoId);
    if (!k || !(k.extra_aktionen > 0)) return false;
    k.extra_aktionen -= 1; await speichern(k);
    return true;
  }
  // --- C3.3 (28.10.2026): die Familie gehoert zum Konto ---------------------------------------------
  // Eine "Familie" ist eine Sitzung des Kontos (k.sitzungen) mit ihrem gespeicherten Stand
  // (session:{sid}, api/session.js). familien() liefert je Sitzung eine knappe Zusammenfassung fuer
  // Auswahl-Screen und "Meine Familien" -- zuletzt geaenderte zuerst.
  async function sitzungsStand(sid) {
    try { const roh = await d.kv(["get", "session:" + sid]); return roh ? JSON.parse(roh) : null; } catch (e) { return null; }
  }
  function familieZusammenfassen(sid, data, aktuell) {
    const people = data && Array.isArray(data.people) ? data.people.filter(Boolean) : [];
    const bilder = data && Array.isArray(data.images) ? data.images.filter((b) => b && b.status === "done").length : 0;
    return {
      sid, figuren: people.length, bilder, namen: people.map((p) => p.name).filter(Boolean),
      vorschau: people.filter((p) => typeof p.imageUrl === "string" && /^https?:\/\//.test(p.imageUrl)).slice(0, 5).map((p) => ({ name: p.name || "", bild: p.imageUrl })),
      geaendert: (data && data.savedAt) || null, leer: people.length === 0 && bilder === 0, gespeichert: !!data, aktuell: !!aktuell,
    };
  }
  async function familien(kontoId, aktuelleSid) {
    const k = await lesen(kontoId);
    if (!k) return [];
    const aktuell = String(aktuelleSid || "").toLowerCase();
    const liste = [];
    for (const sid of k.sitzungen || []) liste.push(familieZusammenfassen(sid, await sitzungsStand(sid), sid === aktuell));
    return liste.sort((a, b) => String(b.geaendert || "").localeCompare(String(a.geaendert || "")));
  }
  // familieEntfernen(kontoId, sid, { nurLeer }) -> { ok }: Sitzung vom Konto loesen und ihren Stand
  // loeschen. nurLeer: nur wenn die Sitzung nichts enthaelt (Aufraeumen nach dem Laden einer anderen
  // Familie). Die Kontingente bleiben am Konto -- gezaehlte Figuren/Bilder zaehlen weiter (C3.3 Punkt 3).
  async function familieEntfernen(kontoId, sid, opts) {
    const k = await lesen(kontoId);
    if (!k) throw Object.assign(new Error("Konto nicht gefunden."), { nutzerfehler: true });
    const s = String(sid || "").toLowerCase();
    if (!(k.sitzungen || []).includes(s)) throw Object.assign(new Error("Diese Familie gehört nicht zu deinem Konto."), { nutzerfehler: true });
    if (opts && opts.nurLeer) {
      const f = familieZusammenfassen(s, await sitzungsStand(s), false);
      if (!f.leer) throw Object.assign(new Error("Diese Familie ist nicht leer."), { nutzerfehler: true });
    }
    k.sitzungen = k.sitzungen.filter((x) => x !== s);
    await speichern(k);
    await d.kv(["del", keySitzung(s), "session:" + s]);
    return { ok: true };
  }
  // hatGuthaben(k): Guthaben oder gekaufte Pakete, die beim Loeschen verfallen wuerden.
  function hatGuthaben(k) { return !!(k && ((k.guthaben_cent || 0) > 0 || (k.pakete || []).length > 0 || (k.extra_aktionen || 0) > 0)); }
  function hatPaket(k, typ) { return !!(k && Array.isArray(k.pakete) && k.pakete.some((p) => p.typ === typ)); }
  // stufe(k) -> "gratis" | "zauberguthaben" | "grossfamilie"
  function stufe(k) { if (!k || !k.bezahlt) return "gratis"; return hatPaket(k, "grossfamilie") ? "grossfamilie" : "zauberguthaben"; }

  // loeschen(kontoId) -> { geloescht: [...], kaufnachweise }: Konto, Index, Sitzungszuordnungen,
  // Sitzungsstaende (session:{sid}) und Zaehler -- "Meine Daten loeschen". Gutscheine bleiben
  // (Kaufbeleg, Erstattung). C3.1 Punkt 5: je gekauftem Paket bleibt ein MINIMALER, ANONYMER
  // Kaufnachweis fuer die Buchhaltung (kaufnachweis:{stripe_session_id}: Betrag, Datum, Paket,
  // Stripe-IDs, Loeschdatum -- kein Klarname, keine E-Mail, keine Konto-ID); Index SET kaufnachweise.
  async function loeschen(kontoId) {
    const k = await lesen(kontoId);
    if (!k) return { geloescht: [], kaufnachweise: 0 };
    let kaufnachweise = 0;
    for (const p of k.pakete || []) {
      if (p.typ === "gutschein" || !(p.stripe_session_id || p.am)) continue;
      const id = p.stripe_session_id || ("k-" + crypto.createHash("sha256").update(k.id + "|" + p.am).digest("hex").slice(0, 24));
      const nachweis = { betrag_cent: Number(p.cent) || 0, datum: p.am, paket: p.typ, stripe_session_id: p.stripe_session_id || "", stripe_payment_intent: p.stripe_payment_intent || "", konto_geloescht_am: d.jetzt().toISOString() };
      await d.kv(["set", "kaufnachweis:" + id, JSON.stringify(nachweis)]);
      await d.kv(["sadd", "kaufnachweise", id]);
      kaufnachweise++;
    }
    const keys = [keyKonto(k.id), keyEmail(k.email)];
    for (const z of ZAEHLER.concat(MENGEN)) keys.push("freitier:" + z + ":konto:" + k.id);
    for (const s of k.sitzungen || []) {
      keys.push(keySitzung(s), "session:" + s);
      for (const z of ZAEHLER.concat(MENGEN)) keys.push("freitier:" + z + ":" + s);
    }
    await d.kv(["del"].concat(keys));
    return { geloescht: keys, kaufnachweise };
  }

  // --- Anmelde-Link -------------------------------------------------------------------------------
  // C3.1 Punkt 4 (28.10.2026): die ANFRAGENDE Sitzung steht im Token (sid, seit C3) -- und zusaetzlich
  // ein Warte-Schluessel (w): das anfragende Geraet fragt damit alle 3 s nach (mode=anmelde-warten),
  // ob der Link irgendwo geklickt wurde, und bekommt dann selbst das Cookie. Der Link darf auf jedem
  // Geraet geoeffnet werden; das klickende Geraet laedt danach die Sitzung aus dem Token (resume).
  function anmeldeToken(email, sid, jetztMs, warte) {
    const bis = Math.floor((jetztMs || d.jetzt().getTime()) / 1000) + ANMELDE_LINK_MINUTEN * 60;
    return tokenLib.signiere({ z: "anmelden", email: emailNormalisieren(email), sid: SESSION_ID_RE.test(String(sid || "")) ? String(sid).toLowerCase() : "", nonce: crypto.randomBytes(12).toString("hex"), bis, w: warte || "" });
  }
  function anmeldeUrl(email, sid, jetztMs, warte) { return cfg.siteUrl() + "/api/konto?mode=anmelden&token=" + encodeURIComponent(anmeldeToken(email, sid, jetztMs, warte)); }
  // anmeldeLinkSenden(email, sid) -> { ok, url, warte } -- verschickt die Mail (url nur fuer Tests/Log, nie an den Client; warte geht an das anfragende Geraet).
  // C3.2 Teil 2 (28.10.2026): zusaetzlich zum Link ein 6-stelliger Zaubercode -- gleiche Gueltigkeit
  // (30 min), einmal benutzbar, hoechstens CODE_VERSUCHE Fehlversuche, dann neu anfordern. Der Code
  // haengt am Warte-Schluessel (anmelde-code:{w}), den nur das anfragende Geraet kennt; eine
  // Anmeldung per Code entwertet den Link (Nonce wird verbraucht) und umgekehrt bleibt der Code
  // nach dem Link-Klick wirkungslos (Warte-Schluessel ist dann abgeholt).
  const CODE_VERSUCHE = 5;
  function neuerCode() { return String(crypto.randomInt(0, 1000000)).padStart(6, "0"); }
  async function anmeldeLinkSenden(email, sid) {
    if (!emailGueltig(email)) throw Object.assign(new Error("Bitte eine gültige E-Mail-Adresse eingeben."), { nutzerfehler: true });
    const warte = crypto.randomBytes(16).toString("hex");
    const token = anmeldeToken(email, sid, null, warte);
    const url = cfg.siteUrl() + "/api/konto?mode=anmelden&token=" + encodeURIComponent(token);
    const code = neuerCode();
    const nonce = (tokenLib.pruefe(token, "anmelden") || {}).nonce || "";
    await d.kv(["set", "anmelde-code:" + warte, JSON.stringify({ code, email: emailNormalisieren(email), sid: SESSION_ID_RE.test(String(sid || "")) ? String(sid).toLowerCase() : "", nonce, versuche: 0 }), "EX", String(ANMELDE_LINK_MINUTEN * 60)]);
    const codeSchoen = code.slice(0, 3) + " " + code.slice(3);
    const ok = await d.mail({
      to: emailNormalisieren(email), from: cfg.mailAbsender(),
      subject: "Dein Zaubercode für Wimmel Wizard: " + codeSchoen,
      text: "Hallo,\n\ndein Zaubercode für Wimmel Wizard: " + codeSchoen + "\n\nGib ihn in der App ein – dann bist du im selben Fenster angemeldet. Oder öffne diesen Link – du kannst den Link auf jedem Gerät öffnen:\n\n" + url + "\n\nBeides gilt " + ANMELDE_LINK_MINUTEN + " Minuten und nur einmal. Wenn du das nicht warst, ignoriere diese Mail einfach.\n\nWimmel Wizard · " + cfg.kontaktEmail(),
      html: "<p>Hallo,</p><p>dein Zaubercode für Wimmel Wizard:</p><p style=\"font-size:28px;font-weight:900;letter-spacing:.12em;margin:8px 0 14px\">" + codeSchoen + "</p><p>Gib ihn in der App ein – dann bist du im selben Fenster angemeldet. Oder öffne diesen Link – du kannst den Link auf jedem Gerät öffnen:</p><p><a href=\"" + url + "\" style=\"display:inline-block;padding:12px 18px;background:#1a1a18;color:#f3efe6;text-decoration:none;font-weight:700\">Jetzt anmelden</a></p><p style=\"font-size:12px;color:#666\">Oder diesen Link öffnen: " + url + "</p><p>Beides gilt " + ANMELDE_LINK_MINUTEN + " Minuten und nur einmal. Wenn du das nicht warst, ignoriere diese Mail einfach.</p><p>Wimmel Wizard · " + cfg.kontaktEmail() + "</p>",
    });
    return { ok: !!ok, url, warte, code };
  }
  // anmeldeCodeEinloesen(warte, codeEingabe) -> { konto, sid } | wirft mit .nutzerfehler (+ .versucheUebrig).
  async function anmeldeCodeEinloesen(warte, codeEingabe) {
    if (!/^[0-9a-f]{32}$/.test(String(warte || ""))) throw Object.assign(new Error("Bitte zuerst einen Zaubercode anfordern."), { nutzerfehler: true });
    const key = "anmelde-code:" + warte;
    const roh = await d.kv(["get", key]);
    if (!roh) throw Object.assign(new Error("Dieser Zaubercode ist abgelaufen oder schon benutzt – bitte einen neuen anfordern."), { nutzerfehler: true });
    const e = JSON.parse(roh);
    const code = String(codeEingabe || "").replace(/\D/g, "");
    if (code !== e.code) {
      e.versuche = (e.versuche || 0) + 1;
      if (e.versuche >= CODE_VERSUCHE) { await d.kv(["del", key]); throw Object.assign(new Error("Zu oft daneben – bitte einen neuen Zaubercode anfordern."), { nutzerfehler: true, versucheUebrig: 0 }); }
      const ttl = Number(await d.kv(["ttl", key])); await d.kv(["set", key, JSON.stringify(e), "EX", String(ttl > 0 ? ttl : 60)]);
      throw Object.assign(new Error("Der Code stimmt nicht – noch " + (CODE_VERSUCHE - e.versuche) + (CODE_VERSUCHE - e.versuche === 1 ? " Versuch." : " Versuche.")), { nutzerfehler: true, versucheUebrig: CODE_VERSUCHE - e.versuche });
    }
    await d.kv(["del", key]);
    if (e.nonce) await d.kv(["set", "anmelde-nonce:" + e.nonce, "1", "NX", "EX", String(ANMELDE_LINK_MINUTEN * 60 + 60)]); // Link entwerten
    let k = await anlegenOderLesen(e.email);
    if (e.sid) { try { k = await sitzungVerknuepfen(k.id, e.sid); } catch (err) { /* wie beim Link */ } }
    return { konto: k, sid: e.sid || "" };
  }
  // anmeldeWarten(warte) -> kontoId | null: einmalig, sobald der Link geklickt wurde (Schluessel wird
  // danach geloescht). Nur wer den Warte-Schluessel aus der Antwort auf anmelden-link hat, kommt dran.
  async function anmeldeWarten(warte) {
    if (!/^[0-9a-f]{32}$/.test(String(warte || ""))) return null;
    const kontoId = await d.kv(["get", "anmelde-warte:" + warte]);
    if (!kontoId) return null;
    await d.kv(["del", "anmelde-warte:" + warte]);
    return String(kontoId);
  }
  // anmeldeTokenEinloesen(token) -> { konto, sid } | wirft mit .nutzerfehler. Einmalig (Nonce SET NX).
  async function anmeldeTokenEinloesen(token) {
    const p = tokenLib.pruefe(token, "anmelden");
    if (!p || !emailGueltig(p.email) || !p.nonce) throw Object.assign(new Error("Dieser Anmelde-Link ist ungültig."), { nutzerfehler: true });
    if (!Number.isFinite(p.bis) || p.bis * 1000 < d.jetzt().getTime()) throw Object.assign(new Error("Dieser Anmelde-Link ist abgelaufen – bitte einen neuen anfordern."), { nutzerfehler: true });
    const frisch = await d.kv(["set", "anmelde-nonce:" + p.nonce, "1", "NX", "EX", String(ANMELDE_LINK_MINUTEN * 60 + 60)]);
    if (frisch !== "OK") throw Object.assign(new Error("Dieser Anmelde-Link wurde schon benutzt – bitte einen neuen anfordern."), { nutzerfehler: true });
    let k = await anlegenOderLesen(p.email);
    if (p.sid) { try { k = await sitzungVerknuepfen(k.id, p.sid); } catch (e) { /* Sitzung gehoert zu einem anderen Konto: Anmeldung trotzdem gueltig */ } }
    // C3.1 Punkt 4: dem wartenden (anfragenden) Geraet Bescheid geben -- 10 Minuten abholbar.
    if (p.w && /^[0-9a-f]{32}$/.test(String(p.w))) { await d.kv(["set", "anmelde-warte:" + p.w, k.id, "EX", "600"]); await d.kv(["del", "anmelde-code:" + p.w]); } // C3.2: Code nach Link-Klick wirkungslos
    return { konto: k, sid: p.sid || "" };
  }

  // --- Cookie ---------------------------------------------------------------------------------------
  function cookieToken(kontoId) { return tokenLib.signiere({ z: "konto", id: kontoId }); }
  function cookieSetzen(res, kontoId, loeschen) {
    const teile = [COOKIE_NAME + "=" + (loeschen ? "" : encodeURIComponent(cookieToken(kontoId))), "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=" + (loeschen ? 0 : COOKIE_TAGE * 24 * 3600)];
    if (/^https:/.test(cfg.siteUrl())) teile.push("Secure");
    res.setHeader("Set-Cookie", teile.join("; "));
  }
  function kontoIdAusRequest(req) {
    const roh = (req && req.headers && req.headers.cookie) || "";
    for (const teil of String(roh).split(";")) {
      const [n, ...rest] = teil.trim().split("=");
      if (n === COOKIE_NAME) {
        const p = tokenLib.pruefe(decodeURIComponent(rest.join("=")), "konto");
        return p && p.id ? String(p.id) : null;
      }
    }
    return null;
  }
  async function kontoAusRequest(req) { return lesen(kontoIdAusRequest(req)); }

  return { lesen, speichern, perEmail, anlegenOderLesen, kontoZuSitzung, sitzungVerknuepfen, paketGutschreiben, gutscheinGutschreiben, extraVerbrauchen, hatPaket, hatGuthaben, stufe, loeschen, familien, familieEntfernen,
    anmeldeToken, anmeldeUrl, anmeldeLinkSenden, anmeldeTokenEinloesen, anmeldeWarten, anmeldeCodeEinloesen, CODE_VERSUCHE, cookieToken, cookieSetzen, kontoIdAusRequest, kontoAusRequest };
}

module.exports = { mitDeps, emailNormalisieren, emailGueltig, emailHash, keyKonto, keyEmail, keySitzung, COOKIE_NAME, COOKIE_TAGE, ANMELDE_LINK_MINUTEN, ZAEHLER, MENGEN };
