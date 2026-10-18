# Paket 1 „Gutscheine verkaufen“ – Rückmeldung zur Umsetzung

Stand: 18.10.2026 · Umsetzung: Claude (Cowork) · Auftrag: Cowork-Auftrag Paket 1 vom 18.10.2026
Grundlage: `docs/gutschein-briefing-2026-10-18.md`, `docs/sortiment-beschluss-2026-10-16.md`

Alles ist committet, nichts gepusht (Push macht Matthias). Alles läuft zuerst im Stripe-Testmodus –
der Livemodus ist technisch gesperrt, bis die vier Rechtsseiten echten Text haben (Abschnitt 5).

---

## 1. Commits (in dieser Reihenfolge)

| Commit | Teil | Geänderte Dateien | Wie getestet |
|---|---|---|---|
| `dd5b94b` | 0 Rahmen | `.gitignore`, beide Docs | – |
| `f9cdfc1` | A Datenmodell | `api/_lib/gutschein-config.js`, `api/_lib/gutschein.js`, `api/_lib/kv.js` (kvCommand exportiert), `api/_lib/mail.js` (Absender/Anhänge), `test/kv-mock.js`, `test/gutschein.test.js` | 14 Tests (node --test), inkl. doppelter `setzeStatus`-Aufrufe |
| `956193d` | D PDF | `package.json` (pdf-lib), `api/_lib/qr.js`, `api/_lib/gutschein-pdf.js`, `api/_lib/gutschein-token.js`, `api/_assets/wizzelwim-gutschein.png`, `test/qr-token-pdf.test.js`, `test/qr-pruefen.py` | PDF gerendert und angesehen; QR mit OpenCV für alle Versionen 1–10 und aus dem gerenderten PDF decodiert |
| `251619a` | B/E/F Server | `api/_lib/stripe.js`, `api/_lib/gutschein-service.js`, `api/_lib/gutschein-mails.js`, `api/gutschein.js`, `api/stripe-webhook.js`, `api/cron/gutschein-zustellung.js`, `test/gutschein-service.test.js` | 34 Tests gesamt: Webhook doppelt (Event-ID und Session-ID), Rabattcode, Cron idempotent, Widerruf erstattet genau `bezahlt_cent`, Signaturprüfung |
| `19a466a` | C/G Seiten | `public/gutschein.html` (neu), `public/gutschein-danke.html`, `public/einloesen.html`, `public/widerruf.html`, `public/css/gutschein.css`, `public/js/gutschein-seiten.js`, `vercel.json` | Kompletter Kaufweg lokal mit Stripe-Attrappe im Headless-Chromium (390 px und 1280 px): Seite → Checkout → Webhook → Danke-Seite → PDF-Download → /einloesen (gültig/ungültig) → Widerruf über Mail-Link → Exit-Intent |
| `1f8b61d` | H Recht | `public/rechts/{impressum,agb,widerrufsbelehrung,datenschutz}.html`, `public/index.html` | Seiten gerendert; Schalter-Test in `gutschein.test.js` |
| `76d31de` | J Teilen | `public/js/screens/szene.js`, `api/_lib/free-tier.js` | Bild-Erzeugung mit Wasserzeichen im Headless-Chromium (1600 px, JPEG), Leiste gerendert; Web-Share am echten Handy steht noch aus (Checkliste K8) |

Abweichung vom „ein Commit je Teil“: B, E und F teilen sich die Server-Logik in `gutschein-service.js`
und sind deshalb ein Commit; J2 (Rabattcodes) steckt serverseitig in B.

---

## 2. Umgebungsvariablen (Vercel → Settings → Environment Variables)

| Variable | Test-Wert | Live-Wert | Pflicht |
|---|---|---|---|
| `STRIPE_MODUS` | `test` (oder leer) | `live` – wird erst wirksam, wenn alle vier Rechtsseiten fertig sind | ja |
| `STRIPE_SECRET_KEY_TEST` | `sk_test_…` (Stripe → Developers → API keys, Testmodus) | – | ja |
| `STRIPE_WEBHOOK_SECRET_TEST` | `whsec_…` vom Test-Webhook-Endpoint | – | ja |
| `STRIPE_SECRET_KEY_LIVE` | – | `sk_live_…` | vor Live |
| `STRIPE_WEBHOOK_SECRET_LIVE` | – | `whsec_…` vom Live-Webhook-Endpoint | vor Live |
| `STRIPE_PMC_ID` | optional: `pmc_…` (Payment-Method-Configuration aus dem Dashboard) für einen eigenen Zahlarten-Satz; sonst gelten die Dashboard-Einstellungen. SEPA ist im Code ausgeschlossen. (Seit 18.10.2026 abends: `STRIPE_ZAHLARTEN` entfällt, API 2026-09-30 kennt `payment_method_types` nicht mehr) | wie Test | nein |
| `GUTSCHEIN_SIGNIER_SCHLUESSEL` | langer Zufallswert (z. B. `openssl rand -hex 32`) | **anderer** Zufallswert | ja – ohne ihn keine PDF-/Widerrufs-Links |
| `SITE_URL` | `https://wimmel-wizard-v3.vercel.app` (Fallback, wenn leer) | `https://wimmelwizard.de` (ohne Schrägstrich) | ja – steht in Mails, PDF, QR |
| `RESEND_API_KEY` | vorhanden | vorhanden | ja |
| `MAIL_ABSENDER` | optional, Standard `Matthias von Wimmel Wizard <matthias@wimmelwizard.de>` – Domain muss bei Resend verifiziert sein | wie Test | nein |
| `KONTAKT_EMAIL` | **PLATZHALTER** `hallo@wimmelwizard.de` – steht auf Seiten, in Mails, im PDF | echte Adresse | ja |
| `INSTAGRAM_URL` | leer (Danke-Seite zeigt dann nur den Satz) | `https://www.instagram.com/…` | nein |
| `CRON_SECRET` | Zufallswert – Vercel schickt ihn beim Cron als Bearer-Token | wie Test | vor Live |
| `GUTSCHEIN_ADMIN_SCHLUESSEL` | Zufallswert für `/api/gutschein?mode=statistik&key=…` | wie Test | nein |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | vorhanden (Upstash) | vorhanden | ja |

**Im Stripe-Dashboard einrichten (Test UND Live getrennt):**
- Webhook-Endpoint `{SITE_URL}/api/stripe-webhook`, Events `checkout.session.completed` und
  `checkout.session.async_payment_succeeded` → Signing Secret in `STRIPE_WEBHOOK_SECRET_*`.
- Zahlarten (Karte, Apple Pay, Google Pay, PayPal) unter Settings → Payment methods aktivieren – dynamische Zahlungsmethoden, kein Code nötig.
- Rabattcodes: Products → Coupons → Promotion code anlegen (Betrag/Prozent, Stückzahl, Ablauf) – J2.

**Vercel:** Der Umbau bringt das Projekt auf **13 Serverless Functions** (vorher 10) – das Hobby-Limit
von 12 ist überschritten, der Deploy braucht **Vercel Pro** (wird laut Auftrag umgestellt). Der Cron
(`0 7 * * *` UTC, täglich) braucht ebenfalls Pro.

---

## 3. Platzhalter, die Matthias füllt

| Was | Wo | Woran erkennbar |
|---|---|---|
| Impressum, AGB, Widerrufsbelehrung, Datenschutz | `public/rechts/*.html` | gelber Kasten + Marker `PLATZHALTER-RECHTSTEXT` (Kommentar und Kasten entfernen, sobald der echte Text drin ist – erst dann geht Live) |
| Mail-Texte 1, 2, 7 | `api/_lib/gutschein-mails.js` (`mail1`, `mail2`, `mail7`) | Kommentar `[PLATZHALTER Mail …]`; Texte kommen aus `docs/gutschein-mailtexte.md` |
| Kontaktadresse | `KONTAKT_EMAIL` (Umgebung); Fallback in `gutschein-config.js`; Footer `index.html` (`mailto:hallo@wimmelwizard.de`) | `hallo@wimmelwizard.de` |
| Instagram-Handle | `INSTAGRAM_URL`; der Satz in `index.html` („Wie kam die Idee?“) bleibt auskommentiert | leer |
| Absender-Domain | `MAIL_ABSENDER` + Resend-Domainverifizierung | – |
| „Stand: [Datum]“ auf den Rechtsseiten | `public/rechts/*.html` | `[Datum]` |

---

## 4. Was wo liegt (Kurzkarte)

- **Eine Stelle für alles:** `api/_lib/gutschein-config.js` – Produkte/Preise, Fristen (+12 Monate,
  Stichtag 1. des Folgemonats, Widerruf 14 + 2 Tage), Garantie-/Beta-/Einlöse-Satz, SITE_URL,
  Zahlarten, Quellen, Exit-Intent-Optionen, Livemodus-Schalter. Seiten holen das über
  `/api/gutschein?mode=config`, Mail und PDF lesen es direkt.
- **Daten:** `api/_lib/gutschein.js` – Hash `gutschein:{code}` ohne TTL, Indizes, `setzeStatus()`
  atomar per Lua, Codes `WW-XXXX-XXXX`.
- **Abläufe:** `api/_lib/gutschein-service.js`; Endpunkte `api/gutschein.js` (mode-Dispatch),
  `api/stripe-webhook.js`, `api/cron/gutschein-zustellung.js`.
- **PDF:** `api/_lib/gutschein-pdf.js` (pdf-lib) + `api/_lib/qr.js`; wird nie gespeichert, Download
  über signierten Token (`api/_lib/gutschein-token.js`).
- **Seiten:** `public/gutschein.html`, `gutschein-danke.html`, `einloesen.html`, `widerruf.html`,
  `rechts/*.html`; Rewrites in `vercel.json`.
- **Zähler (ohne Personenbezug):** `gz:z:{aufruf|checkout|bezahlt|bezahlt_rabatt|bezahlt_ohne_rabatt}:{quelle}`,
  `gz:gefehlt:{wahl}`, Listen `gz:feedback:ueberzeugt` / `gz:feedback:gefehlt`,
  `gz:teilen:sitzungen_erstes_bild` (Zahl) / `gz:teilen:sitzungen` (Set) → alles auf einen Blick:
  `GET /api/gutschein?mode=statistik&key=…`.
- **Tests:** `cd wimmel-wizard-v3 && npm test` (34 Tests, In-Memory-KV-Mock in `test/kv-mock.js`).

---

## 5. Entscheidungen, die ich getroffen habe (bitte gegenlesen)

1. **Livemodus-Schalter** prüft die vier Rechtsseiten auf den Marker `PLATZHALTER-RECHTSTEXT` – erst
   als Datei (`public/rechts/`), sonst die öffentlich ausgelieferte Seite unter `SITE_URL`. Nicht
   lesbar = nicht fertig = Testmodus. `STRIPE_MODUS=live` allein schaltet also nichts um.
2. **E-Mail der Käuferin** sammeln wir nicht selbst ein – Stripe Checkout fragt sie ohnehin ab
   (Pflicht), und wir nehmen sie aus der Session. Ein Feld weniger auf der Seite.
3. **Schriften im PDF:** Archivo/Caveat sind OFL-lizenziert (Einbetten erlaubt), pdf-lib braucht dafür
   aber `@pdf-lib/fontkit` – zweites Paket, laut Auftrag nicht erlaubt. Das PDF nutzt deshalb
   Helvetica/Helvetica-Bold/-Oblique (PDF-Standardschriften, kein Einbetten nötig). Vorschlag:
   `@pdf-lib/fontkit` freigeben, dann Archivo Black als Headline und Caveat für die Widmung.
4. **QR-Code** als eigenes Modul `api/_lib/qr.js` (Byte-Modus, Stufe M, Versionen 1–10), gegengeprüft
   mit OpenCV (`test/qr-pruefen.py`).
5. **Code-Toleranz O→0, I/L→1** ist eingebaut wie bestellt – da das Alphabet weder 0 noch 1 enthält,
   macht sie eine Eingabe nie gültiger (ein Code enthält diese Zeichen nie). Fehlendes „WW“ wird
   ergänzt, Bindestriche/Leerzeichen/Kleinschreibung sind egal.
6. **Mail 2 „sofort“:** ohne Wunschdatum geht sie direkt im Webhook raus; mit Wunschdatum nimmt der
   tägliche Cron (07:00 UTC) sie am Tag mit. Jede Mail wird atomar als „verschickt“ markiert, bevor
   sie rausgeht – zwei Instanzen schicken nie doppelt; schlägt der Versand fehl, wird das Feld wieder
   freigegeben.
7. **Exit-Intent am Handy:** Es gibt kein echtes Exit-Intent-Signal. Gezeigt wird die Frage (einmal je
   Besuch, nur Variable) bei Rückkehr von der Bezahlseite (`?abgebrochen=1`, Stripe-Cancel-URL) und
   bei schnellem Hochscrollen, nachdem man schon weit unten war; am Desktop beim Verlassen nach oben.
8. **Entwurf verloren** (Checkout-Session nach >2 Tagen oder KV-Ausfall): Der Gutschein wird trotzdem
   angelegt (Produkt aus den Stripe-Metadaten, Name aus Stripe, ohne Widmung) – bezahltes Geld ohne
   Gutschein wäre schlimmer. Steht im Log.
9. **Refund scheitert beim Widerruf:** Status bleibt `widerrufen` (Code für die Kundin ungültig), Code
   landet in `gutscheine:erstattung_fehler` und im Log – Matthias erstattet dann im Stripe-Dashboard
   von Hand. Erstattet wird immer `bezahlt_cent` (in `stripe.erstatten()` als Parameter verankert;
   `wert_cent` wird dort nie angefasst).
10. **Teilen-Loop:** Web-Share-API mit Datei (Handy: Nutzerin wählt WhatsApp/Instagram), am Desktop
    Download + Text in der Zwischenablage + `wa.me`-Link. Die Seiten-URL im Wasserzeichen ist
    `location.origin` (keine zweite Konstante, aber auch nicht aus der Config – auf der eigenen Domain
    identisch).
11. **Statistik-Endpunkt** `mode=statistik` (mit `GUTSCHEIN_ADMIN_SCHLUESSEL`) ist nicht bestellt, aber
    nötig, um die Zähler überhaupt lesen zu können, bis das Dashboard (Paket 3) kommt.

---

## 6. Offene Punkte / Fragen

- [ ] **Vercel Pro** umstellen (13 Funktionen, Cron) – sonst scheitert der Deploy.
- [ ] `includeFiles` in `vercel.json` nutzt ein Klammer-Glob (`{api/_assets/**,public/rechts/**}`).
      Falls Vercel das beim Deploy bemängelt: zwei Einträge daraus machen bzw. nur `api/_assets/**`
      (die Rechtsseiten-Prüfung fällt dann automatisch auf die HTTP-Variante zurück, das PDF ohne
      Illustration läuft ebenfalls).
- [ ] Zahlarten im Stripe-Dashboard aktivieren (Karte, Apple Pay, Google Pay, PayPal).
- [ ] Resend: Domain verifizieren, Absender `MAIL_ABSENDER` festlegen.
- [ ] `docs/gutschein-mailtexte.md` liefern → Texte in `gutschein-mails.js` einsetzen.
- [ ] Rechtstexte vom Anwalt einsetzen (Marker entfernen) → dann `STRIPE_MODUS=live`.
- [ ] Checkliste K (unten) im Testmodus durchklicken – K8 (Teilen am Handy) habe ich nicht prüfen
      können, nur im Headless-Browser.
- [ ] Für Paket 2 vorgemerkt (nicht gebaut): Im Bestell-Checkout der App sollen Stripe-Rabattcodes und
      unsere WW-Codes eingebbar sein; Button „Ich habe einen Gutschein“ am Aufladen-Screen.
- [ ] Frage: Soll die Danke-Seite auch den Betrag ausweisen, der tatsächlich gezahlt wurde (bei
      Rabatt)? Aktuell zeigt sie den Gutscheinwert; der gezahlte Betrag steht in Stripes eigener Mail.
- [ ] Frage: `@pdf-lib/fontkit` freigeben (siehe 5.3)?

---

## 7. Ende-zu-Ende-Test (Stripe-Testmodus) – Checkliste K

Testkarte: `4242 4242 4242 4242`, beliebiges Datum in der Zukunft, beliebige CVC. PayPal im Testmodus
über den Stripe-Sandbox-Dialog.

1. [ ] Wimmelheft mit Testkarte kaufen → Danke-Seite mit Code, Mail 1 mit PDF (PDF öffnen, QR scannen
       → führt auf `/einloesen?code=…`).
2. [ ] Wimmelbuch mit PayPal (Test) kaufen → dasselbe.
3. [ ] Zustellung an Empfängerin mit Wunschdatum morgen → am nächsten Morgen nach 07:00 UTC Mail 2
       (oder sofort testen: `GET /api/cron/gutschein-zustellung` mit Header
       `Authorization: Bearer {CRON_SECRET}`; ohne gesetztes Secret: `?manuell=1`).
4. [ ] Widerruf über den Link in Mail 1 → Refund im Stripe-Dashboard sichtbar, Status `widerrufen`,
       Mail 7, `/einloesen` meldet den Code als zurückgegeben.
5. [ ] Webhook im Stripe-Dashboard „erneut senden“ → Antwort `schon_verarbeitet`, kein zweiter
       Gutschein (Statistik: Zahl bleibt).
6. [ ] `/gutschein?utm_source=pinterest` aufrufen und kaufen → `quelle=pinterest` am Gutschein
       (Statistik: `je_quelle.pinterest.bezahlt`).
7. [ ] Promotion-Code im Test-Dashboard anlegen, im Checkout einlösen → `bezahlt_cent` = Betrag nach
       Rabatt (Statistik `bezahlt_rabatt`); Widerruf erstattet genau diesen Betrag.
8. [ ] In der App ein erstes Wimmelbild zaubern → unter dem Bild die Teilen-Leiste; WhatsApp am Handy →
       Bild mit Wasserzeichen kommt an; Statistik `teilen.sitzungen_mit_teilen_klick` steigt.
9. [ ] `/einloesen` mit gültigem, ungültigem (`WW-AAAA-AAAA`) und widerrufenem Code.
10. [ ] `/gutschein?abgebrochen=1` → Exit-Intent-Frage erscheint; Antwort landet in der Statistik.
