# C3 Konto & Aufladen — Rückmeldung (27.10.2026)

Auftrag: `docs/auftrag-c3-konto-aufladen-2026-10-27.md`. Alles committet, nichts gepusht (Push macht Matthias).
Tests: `npm test` → 101/101 grün (Mac). Rauchtest Chromium 390 px: 41/41 (siehe § 6).

---

## 1. Commits (je Teil)

| Teil | Commit | Inhalt |
|---|---|---|
| A | `e7d0109` | Konto ohne Passwort: `api/_lib/konto.js` (Modell, Anmelde-Link, Cookie, Verknüpfen, Löschen), `api/konto.js` (Endpunkt), `free-tier.js` neu: Kontingente je Stufe, Buchen nur bei Zustellung, `stoppAntwort()`; `char-job-start/-status.js`; Auftragsdatei; `test/konto.test.js` |
| B | `4385097` | Kaufen über Stripe: `api/_lib/konto-kauf.js` (Checkout, Webhook-Verarbeitung, Gutschrift, `umsatzBuchen()`, Bestätigungsmail), `stripe.js paketCheckoutSessionAnlegen`, `gutschein-config.js PAKETE/WIDERRUFSVERZICHT_SATZ`, `stripe-webhook.js` Dispatch, `aenderungs-deckel.js` Extra-Aktionen |
| C | `8698fb6` | Gutschein in der App einlösen: `konto-kauf.js einloesen()` (tolerant, `EINLOESEN_AB` mit Test-Schalter, `setzeStatus` atomar, Guthaben = `bezahlt_cent`) |
| D | `15441ff` | Oberfläche: `public/js/screens/konto.js` (neu: Konto, Löschen-Bestätigung, Stopp-Screen, `window.Konto`), Router-Routen, Konto-Knopf im Header, Foto-Karte als Weg zum Zauberguthaben, Stopp-Screen aus 403-Antworten in `charakter.js`/`szene.js`, `pipeline.js` |
| E | `627aad7` | `ADMIN_SCHLUESSEL` (Fallback `GUTSCHEIN_ADMIN_SCHLUESSEL`), `/api/admin?mode=…` als Rewrite auf `/api/gutschein` |
| — | (dieser) | Rückmeldung + Fortschritt |

---

## 2. Umgebungsvariablen

Neu (Vercel-Projekt, Preview **und** Production, soweit genannt):

| Variable | Zweck | Wert |
|---|---|---|
| `ADMIN_SCHLUESSEL` | Admin-Modi (`statistik`, `chipfiguren…`) unter `/api/admin?mode=…&key=…` und `/api/gutschein?mode=…` | optional — fehlt er, gilt weiter `GUTSCHEIN_ADMIN_SCHLUESSEL`; ist er gesetzt, zählt **nur** er |
| `TEST_EINLOESEN_SESSION_IDS` | Test-Schalter: Gutschein schon vor dem 01.01.2027 einlösbar | `*` (alle) oder Liste von Sitzungs-IDs, kommagetrennt; in Production **nicht** setzen |

Bestehend, jetzt auch vom Konto genutzt (nichts zu ändern): `GUTSCHEIN_SIGNIER_SCHLUESSEL` (Anmelde-Token, Cookie), `SITE_URL` (Links in der Anmelde-Mail, `Secure`-Cookie nur bei https), `RESEND_API_KEY` + `MAIL_ABSENDER` (Anmelde- und Bestätigungsmail), `STRIPE_MODUS` + `STRIPE_SECRET_KEY_TEST` / `STRIPE_WEBHOOK_SECRET_TEST` (Paket-Checkout läuft über denselben Webhook `/api/stripe-webhook` wie der Gutschein — kein neuer Endpunkt in Stripe nötig), `TEST_BEZAHLT_SESSION_IDS` (bleibt als Notschalter).

Keine neue Serverless-Funktion außer `api/konto.js` (steht in `vercel.json`).

---

## 3. Datenmodell (Upstash)

| Schlüssel | Inhalt | TTL |
|---|---|---|
| `konto:{id}` | `{ id, email, erstellt_am, bezahlt, guthaben_cent, pakete:[{typ, cent, am, stripe_session_id?, code?}], extra_aktionen, gutschein_code, sitzungen:[sid…] }` — `id` = `k_` + 24 hex | keine |
| `konto-email:{sha256(email)}` | Konto-ID (Index, `SET NX` — eine E-Mail = ein Konto; E-Mail normalisiert klein/getrimmt) | keine |
| `sitzung-konto:{sid}` | Konto-ID der verknüpften Sitzung (`bezahltStatus()`/`kontingente()` lesen hierüber das Konto) | keine |
| `freitier:{figuren\|figuren_chips\|figuren_foto\|bilder}:konto:{id}` | Zähler **am Konto** (beim Verknüpfen werden die Sitzungszähler `freitier:…:{sid}` per INCRBY übertragen und gelöscht) | keine |
| `freitier:…:{sid}` | wie bisher, nur solange keine Verknüpfung | 90 Tage |
| `anmelde-nonce:{nonce}` | Einmal-Link eingelöst (`SET NX`) | 30 min + Puffer |
| `konto-checkout:{cs_…}` | laufender Paket-Checkout `{ konto_id, typ, am, widerrufsverzicht_am }` | 3 Tage (nach Webhook gelöscht) |
| `stripe-event:{evt_…}` | Webhook-Idempotenz (wie beim Gutschein) | 30 Tage |
| `umsatz:{jahr}` | § 19-Zähler, Pakete zählen mit (`umsatzBuchen()` aus C1) | keine |

Cookie `ww_konto`: signiertes Token `{z:"konto", id}` (HMAC wie die Gutschein-Token), `HttpOnly; SameSite=Lax; Path=/; Max-Age=180 Tage; Secure` (bei https). Anmelde-Link: `/api/konto?mode=anmelden&token=…`, 30 Minuten, einmal; der Link trägt die Sitzungs-ID, die erste Anmeldung hängt diese Sitzung mit allem (Figuren, Bilder, Zähler) ans Konto.

Stufen und Kontingente (zentral `free-tier.js KONTINGENTE`): Gratis 5 Chip-Figuren / 0 Foto / 1 Bild · Zauberguthaben 6 Figuren (3 Foto) / 7 Bilder · Großfamilie 10 Figuren (6 Foto) / 7 Bilder. Gezählt wird **nur** beim Übergang eines Figuren-Jobs auf `done` (`char-job-status.js`) bzw. bei Regal-Treffer sofort; Bilder wie bisher erst bei Erfolg (`scene-job-engine.js`). Ein gescheiterter Lauf zählt nichts. Extra-Zauberpaket: `extra_aktionen` += 5; `aenderungs-deckel.js` nimmt bei erreichtem Deckel eine Aktion vom Konto, bevor es ablehnt.

Pakete (`gutschein-config.js PAKETE`, Beträge an einer Stelle): `zauberguthaben` 9,90 € · `grossfamilie` 4,90 € (nur mit Zauberguthaben) · `extra` 4,90 € (nur bei erschöpftem Kontingent; der Änderungs-Deckel meldet das aus der 403-Antwort als `stopp.extraMoeglich`). Zauberguthaben und Gutschein werden als `guthaben_cent` am Konto geführt — die Anrechnung beim Heft/Buch ist C5.

---

## 4. Oberfläche (Teil D) — was wo ist

- **Konto-Knopf** oben rechts im Header: „Anmelden“ → „Konto“ → „Konto ✓“ (mit Zauberguthaben). Route `/app/konto`.
- **Konto-Bereich**: E-Mail, Guthaben („wird beim Buch voll angerechnet“), Pakete, „Noch frei“ je Stufe, Aufladen-Kasten (Zauberguthaben → danach Großfamilie; Extra nur bei vollem Kontingent oder nach Deckel), „Ich habe einen Gutschein“, Abmelden, „Meine Daten löschen“ → Bestätigungsseite `/app/konto/loeschen` (kein `confirm()`).
- **Stopp-Screen** `/app/stopp`: erscheint, sobald der Server eine 403 mit `stopp` schickt (Figuren, Foto, Bild, Änderungs-Deckel) oder die Foto-Karte angetippt wird. Kurz, warm, zwei Wege: „Zauberguthaben für 9,90 € – wird beim Buch voll angerechnet“ und „Ich habe einen Gutschein“; ohne Konto zuerst das Anmelde-Formular. „Erst mal weitermachen“ führt zurück. Kein Countdown, kein Druck.
- **Foto-Karte**: statt Schloss das Etikett „ZAUBER“ und „Mit Zauberguthaben.“; der Hinweis (Vorher/Nachher) hat den Knopf „Zauberguthaben für 9,90 € · oder Gutschein“. Nach dem Kauf ist die Karte offen (Foto-Weg schickt jetzt `foto:true`, damit der Server Foto-Figuren getrennt zählt).
- **Widerrufsverzicht**: Haken ist Pflicht vor jedem Paket-Kauf (Wortlaut kommt vom Server, `WIDERRUFSVERZICHT_SATZ`; Platzhalter, markiert „wird vom Anwalt geprüft“ — die Markierung muss vor dem Launch raus).
- Stripe-Rückkehr: `/app/konto?aufgeladen=<typ>` zeigt „Danke! Sobald Stripe die Zahlung bestätigt …“; die Gutschrift kommt per Webhook, meist innerhalb von Sekunden (Seite einmal neu laden, es gibt keinen Live-Poll — bewusst schlank gehalten).

---

## 5. Testanleitung (Stripe-Testmodus, Preview-Deployment)

Vorbereitung: `STRIPE_MODUS=test`, `TEST_EINLOESEN_SESSION_IDS=*` im Preview, einen Test-Gutschein über `/gutschein` mit Testkarte kaufen (Code aus der Mail). Testkarte überall `4242 4242 4242 4242`, beliebiges Datum/CVC.

1. **Gratis bis Stopp-Screen**: `/app` in einem frischen Browser (oder privates Fenster), fünf Figuren aus dem Regal anlegen („Merkmale antippen“). Die sechste → Stopp-Screen „Mehr Figuren?“ mit Anmelde-Formular und Gutschein-Kasten. Ebenso: Foto-Karte antippen → Hinweis → Knopf → Stopp-Screen „Mit Foto? Gern.“ Ein Wimmelbild zaubern, das zweite → Stopp „Mehr Wimmelbilder?“.
2. **Anmelden per Link**: E-Mail eintragen → Mail „Dein Anmelde-Link für Wimmel Wizard“ → Link klicken → `/app/konto?angemeldet=1`, Konto zeigt E-Mail und „Noch frei · Gratis“; Knopf oben wird „Konto“. Link ein zweites Mal klicken → `?anmeldung=…` mit Hinweis (einmal gültig). Erwartung in Upstash: `konto:k_…`, `sitzung-konto:{sid}`, Zähler unter `freitier:…:konto:k_…`.
3. **Zauberguthaben**: auf dem Stopp-Screen oder im Konto Haken setzen → „Jetzt kaufen · 9,90 €“ → Stripe-Testkasse → zurück `/app/konto?aufgeladen=zauberguthaben` → nach Reload: Guthaben 9,90 €, Paket „Zauberguthaben“, „Noch frei · Zauberguthaben: Figuren 6, davon per Foto 3, Wimmelbilder 7“; Mail „Zauberguthaben freigeschaltet – 9,90 €“ (mit § 19-Hinweis). Figur-Screen: Foto-Karte offen. Sieben Bilder möglich, das achte → Stopp (Maximum dieser Stufe).
4. **Großfamilie**: im Konto erscheint „Großfamilie – 4,90 €“ erst **nach** dem Zauberguthaben (vorher 409 „erst mit dem Zauberguthaben“). Kaufen → „Noch frei: Figuren 10, davon per Foto 6“. Beim Stopp nach der sechsten Figur bietet der Stopp-Screen direkt Großfamilie an.
5. **Extra-Zauberpaket**: eine Figur zweimal ändern (Deckel 2) → dritte Änderung → Stopp „Noch mal ändern?“ mit Extra-Zauberpaket (nur mit Zauberguthaben). Kaufen → Konto zeigt „Extra-Aktionen 5“; die Änderung geht jetzt durch, Zähler sinkt auf 4. Ohne erschöpftes Kontingent lehnt der Server das Paket mit 409 ab (Kasten erscheint im Konto nur, wenn Figuren oder Bilder voll sind oder zuletzt ein Deckel gemeldet wurde).
6. **Gutschein einlösen**: zweites Konto (andere E-Mail, neues privates Fenster): Stopp-Screen → „Ich habe einen Gutschein“ → Code in beliebiger Schreibweise (`ww abcd efgh`) → „Gutschein eingelöst … 29,90 € werden beim Buch angerechnet“, Stufe Zauberguthaben, Foto-Karte offen. Danach `TEST_EINLOESEN_SESSION_IDS` löschen und mit einem dritten Gutschein prüfen: „Dein Gutschein ist gültig – eingelöst wird ab 01.01.2027.“ Abgelehnte Codes: Tippfehler → „sieht nicht nach einem Wimmel-Wizard-Code aus“; unbekannt → „kennen wir nicht“; widerrufen/eingelöst → Meldung aus `pruefen()`; zweiter Code auf demselben Konto → „Auf diesem Konto ist schon ein Gutschein eingelöst“.
7. **Gescheiterter Lauf zählt nicht**: bei einer Figur mit Foto den Lauf scheitern lassen (z. B. Netz trennen, bis fal ablehnt, oder `FAL_KEY` im Preview kurz verstellen) → Fehlerkasten, „Noch frei“ im Konto unverändert. Zum Vergleich: ein erfolgreicher Lauf senkt „Figuren“ und „davon per Foto“ um eins.
8. **Daten löschen**: Konto → „Meine Daten löschen“ → Bestätigungsseite → „Ja, alles löschen“ → `/app/konto?geloescht=1`, Knopf „Anmelden“, lokaler Stand leer. Upstash: `konto:…`, `konto-email:…`, `sitzung-konto:…`, `freitier:…:konto:…`, `session:{sid}` und Sitzungszähler weg; der Gutschein selbst bleibt (Kaufbeleg).

Admin (Teil E): `/api/admin?mode=statistik&key=<ADMIN_SCHLUESSEL>` liefert dasselbe wie `/api/gutschein?mode=statistik&key=…`.

---

## 6. Rauchtest (Teil D, headless Chromium 390 × 844, lokaler Server mit KV-/Stripe-/Mail-Attrappen)

41 Prüfpunkte, alle grün: Konto-Knopf „Anmelden“ → Konto-Screen ohne Bottom-Bar, kein horizontales Scrollen → Anmelde-Mail mit Link → Link öffnet, Cookie `ww_konto` (HttpOnly, Lax), Konto zeigt E-Mail und „Figuren: 5 von 5“, Sitzung verknüpft → Figur-Screen: Foto-Karte „Mit Zauberguthaben.“ → Hinweis → Stopp-Screen „Mit Foto? Gern.“ mit beiden Wegen und Widerrufssatz → Kauf ohne Haken abgelehnt, mit Haken zur Stripe-Attrappe → Webhook → Konto 9,90 €, Paket, Großfamilie angeboten, Kontingent 6/3/7, Knopf „Konto ✓“, Bestätigungsmail → Foto-Karte offen → falscher Gutschein-Code klar abgelehnt, echter Code eingelöst (Guthaben 39,80 €, „Zauberguthaben, Gutschein“) → Zähler auf 6 gesetzt: Konto zeigt „0 von 6“ und Extra-Zauberpaket; Server antwortet 403 mit `stopp.grund="figuren"`; Client zeigt „Mehr Figuren?“ mit Großfamilie; „Erst mal weitermachen“ → Figurenblatt → Löschen-Bestätigung → gelöscht, abgemeldet, KV-Schlüssel weg → keine JS-Fehler in der Konsole.

Nicht im Rauchtest (braucht fal/Stripe echt): tatsächliches Zeichnen mit Foto, Stripe-Kasse selbst, Webhook-Signatur — dafür die Testanleitung oben.

---

## 7. Hinweise / Abweichungen

- **Gutschein + Zauberguthaben auf einem Konto** ist möglich (Guthaben addiert sich, 39,80 € im Test). Der Auftrag sagt dazu nichts; gesperrt ist nur ein zweiter Gutschein je Konto. Falls unerwünscht: eine Zeile in `paketErlaubt()`.
- **Bilder** zählen wie bisher erst bei echtem Erfolg (`scene-job-engine.js` bucht am Ende, der Start prüft nur) — der Grundsatz „nur zugestellte zählen“ gilt damit für Figuren und Bilder.
- **`/app?bezahlt=an`** (Test-Schalter) bleibt und überstimmt die Anzeige; `Konto.laden()` wird dann übersprungen.
- **Widerrufsverzicht-Wortlaut** ist Platzhalter (`WIDERRUFSVERZICHT_SATZ`), in der Oberfläche sichtbar als „[Platzhalter-Wortlaut, wird vom Anwalt geprüft]“ — vor dem Launch entfernen (eine Zeile in `screens/konto.js aufladenKasten()`).
- Nicht Teil (wie im Auftrag): Bestell-Checkout mit Anrechnung (C5), Druckdatei (C4), Peecho aus der App (C6), Hintergründe/Ortsfotos.
