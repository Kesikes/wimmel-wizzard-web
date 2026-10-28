# WizzelWim — Fortschritt & Fahrplan bis zum Launch

**Stand: 18.10.2026** · Zielmarke: Gutschein-Soft-Launch Anfang November 2026 (spätestens vor 27.11.), Produkt-Beta ab Januar 2027

Dieses Dokument hält fest, wo das Projekt steht, was vor dem Launch noch fertig
werden muss, und was warten kann. Es wird bei größeren Meilensteinen fortgeschrieben.

---

## 🧩 C3.2 (28.10.2026): höchstens 5 Helden je Bild, Zaubercode, Wasserzeichen als Rapport

`docs/c3-2-helden-login-wasserzeichen-rueckmeldung-2026-10-28.md`: `HELDEN_JE_BILD = 5` mit Rotation über
die Bilder und Auswahl-Schritt „Wer ist auf diesem Bild dabei?“ (nur bei > 5 Figuren; steuert Referenzen,
Beschreibungen und Prüfung); Anmelde-Mail mit 6-stelligem Zaubercode für die Anmeldung im selben Fenster,
Link-Tab erkennt offenen Tab; Wasserzeichen „Wimmel Wizard“ in Logo-Schrift als diagonaler Rapport
(wasserzeichen.js, eine Funktion, Konstanten) auf Teilen-Bild und Gutschein-Vorschau. Kein Prompt geändert.

---

## 🩹 C3.1 Testbefunde (28.10.2026): Zählfehler, Pflichtprüfung, Fortschritt, Geräte, Löschen, Stripe-Rückkehr

`docs/c3-1-testbefunde-rueckmeldung-2026-10-28.md`: Figuren zählen jetzt als Menge je Person (Regal-Treffer
mit Ausstattungs-Edit zählte doppelt, Neu-Zeichnen zählte als neue Figur); Pflichtprüfung je Merkmal-Gruppe
mit Hinweis unter der Gruppe, Chips bleiben je Person; sichtbarer Fortschritt in der Bottom-Bar, Sperre je
Figur, Verlassen der Seite geprüft; Anmelde-Link auf jedem Gerät (klickendes Gerät lädt die Sitzung,
anfragendes wird per Abfrage angemeldet); Löschen mit Guthaben nur mit Haken, anonymer Kaufnachweis bleibt;
Stripe-Rückkehr fragt bis zur Buchung ab. Rauchtests je Punkt grün, 101 Tests.

---

## 👤 C3 Konto & Aufladen (27.10.2026): Konto ohne Passwort, Zauberguthaben, Gutschein in der App

`docs/c3-konto-aufladen-rueckmeldung-2026-10-27.md`: Konto per Anmelde-Link (30 min, einmal) und
HttpOnly-Cookie (180 Tage), erste Anmeldung hängt die Sitzung mit allem ans Konto; Kontingente je Stufe
zentral in `free-tier.js` (Gratis 5 Chip-Figuren/1 Bild · Zauberguthaben 6 Figuren, 3 Foto, 7 Bilder ·
Großfamilie 10/6/7), Figuren zählen erst bei Zustellung. Pakete über Stripe (`konto-kauf.js`, Webhook
idempotent, Widerrufsverzicht-Haken Pflicht, § 19-Umsatz), Gutschein einlösen ab 01.01.2027 mit
Test-Schalter. Oberfläche: Konto-Bereich, Stopp-Screen mit zwei Wegen, Foto-Karte als Weg zum
Zauberguthaben; `ADMIN_SCHLUESSEL` + `/api/admin`. Rauchtest 390 px 41/41, 101 Tests grün.
Offen: Anrechnung beim Buch (C5), Anwalts-Wortlaut Widerrufsverzicht.

---

## 🖨️ C2 Peecho Stufe 1 (27.10.2026): Schnittstelle + Testbestellung (nur Wimmelbuch)

`docs/c2-peecho-stufe1-rueckmeldung-2026-10-27.md`: Peecho-Client (`api/_lib/peecho.js`, reines fetch,
Live-Sperre wie Stripe), Muster-Druck-PDF (24 Seiten inkl. Umschlag) mit Ablage `druck/muster/` und
signiertem Link (`api/druck-datei.js`), Testskript `dev-tools/peecho-test.js` fürs Testsystem, Webhook
`api/peecho-webhook.js` (signierte Callbacks, nur merken). Offen: API-Version v2/v3, Seitenzahl inkl.
Umschlag, Farbraum, Versandart — klärt der Testlauf bei Matthias.

---

## 🩹 Figuren v4.2 (27.10.2026): eine Ausstattung gehört zu genau einer Grundfigur

`docs/figuren-v4-2-rueckmeldung-2026-10-27.md`: Ausstattungen tragen den Blob-Pfad ihrer Grundfigur
(`grund_pfad`); Regal-Treffer nur bei passender Grundfigur, sonst Edit neu und Eintrag ersetzt; Grundfigur
verwerfen nimmt ihre Ausstattungen mit; Aufräumen entfernt Waisen (Vorschau `ausstattungen_verwaist`).
Befund: die verwaisten Einträge von gestern lieferten ein anderes Kind aus.

---

## 🩹 Figuren v4.1 (27.10.2026): drei kleine Fixes aus dem Live-Test

`docs/figuren-v4-1-rueckmeldung-2026-10-27.md`: Grundfigur liegt im Regal, sobald sie Basis eines Edits ist
(vorher sperrte „null Verstöße“ jede Figur aus der dritten Runde aus — deshalb fehlten die Mädchen-Grundfiguren);
„Passt so“ mit „Gespeichert ✓“ und Sprung zur Galerie; Kundentexte ohne „T-Shirt“. Stil v4 sitzt (Live-Test).

---

## 🎯 Figuren v4 (26.10.2026): Gewinner aus dem Kontaktbogen eingebaut

`docs/figuren-v4-rueckmeldung-2026-10-26.md`: Grundfigur = Fassung A+H (Prompt wie `71582bb` plus Hautton,
Kleidung frei, kein Outfit-Zwang, kein 85-%-Rahmen, keine Augenbrauen), Lieblingsfarbe/Brille/Extra per Edit
(„upper garment“, Bäckchen halten), Szenen-Satz „upper garment“, Schlüssel v5/v5a (v4 per Aufräumen weg).
Neue Arbeitsregel (Entscheidungsregister 18): Prompt-Änderungen an Figuren und Szenen nur nach Kontaktbogen
(`dev-tools/figuren-kontaktbogen.js`, gleiche Seeds, eine Änderung je Spalte, Entscheidung nach Augenmaß).
Befund: jedes Wort zu Körper/Kleidung streckt die Figur — v3.1/v3.2 hatten das verschlimmert.

---

## 🩹 Figuren v3.2 (26.10.2026): Hotfix „Mädchen in Rot“ — überholt durch v4

`docs/figuren-v3-2-rueckmeldung-2026-10-26.md`: Grundfigur mit Hose/Shorts und Schuhen (Schlüssel v4/v4a,
alte Einträge per Aufräumen weg), Rahmen 85 % der Bildhöhe, Edit-Prompt hält Schnitt/Länge („never a
dress“), Edits wiederholen auf derselben Grundfigur, Stil in Stufe 2 mittel (zustellen, nicht ablegen,
„Stil grenzwertig“).

---

## 🩹 Figuren v3.1 (26.10.2026): Hotfix nach dem Live-Test

`docs/figuren-v3-1-rueckmeldung-2026-10-26.md`: Bildrahmen ausdrücklich im Grundfigur-Prompt, Stufe 2 nur
auf vollständiger Grundfigur (sonst klare Meldung), Prüfung nach Stil-Karte (harte Papier-Schattierung
erlaubt, Bart kein Mund, Fassung `2026-10-26a`), Deckel 3 Grundfiguren + 3 Edits je Figur mit Zähler im
Log und DEV-Zeile am Figurenblatt. Normalfall ≈ 6 fal-Aufrufe ≈ 0,17 $ je Figur.

---

## 🧾 C1 (26.10.2026): Nur Deutschland + Kleinunternehmer

Umgesetzt und committet (`docs/c1-rueckmeldung-2026-10-26.md`): Versand nur innerhalb Deutschlands
(alle Texte, `VERSANDLAENDER = ["DE"]`), § 19-UStG-Hinweis in Mail 1/7, PDF und Danke-Seite, kein
Stripe-`automatic_tax`, Jahresumsatz-Zähler `umsatz:{jahr}` mit täglicher Warnmail ab 20 000 €
(DRINGEND ab 24 000 €, Grenze 25 000 €) im bestehenden Cron, Rechtsträger-Hinweis in den Platzhaltern.
**Bei dir:** Stripe Tax aus, `KONTAKT_EMAIL`, Anwalt-Texte auf die Privatperson.

---

## 🛠️ Auftrag 3 (18.10.2026 abends): App auf das Sortiment umgebaut

Umgesetzt und committet (Details in `docs/auftrag3-rueckmeldung-2026-10-18.md`):
- `/api/fal-proxy` nur noch mit bekannter Sitzung/Job (403 sonst), zweiter Zähler je Sitzung
- Produktlogik heft/buch (feste Preise, 4/7 Bilder), Dashboard-Sätze, Kontingent 7 Bilder
- Szenen 3:2 → Druck 1,414:1 (Beschnitt seitlich), Rand rundum im Prompt, 2K-Schalter
  (`SZENEN_AUFLOESUNG`, Standard 4K bis zum Vergleich: `dev-tools/aufloesung-2k-test.js`)
- Foto-Figuren erst nach Aufladen/Gutschein: Karte gesperrt, Server lehnt ab, Test-Schalter
- Gutschein-Feinschliff (Wasserzeichen, Mail-Grammatik, Live-Domain als Fallback)
- Chip-Figuren-Datenbank (Teil 5): Vercel Blob (privat, `wimmel-wizard-figuren`) + Upstash;
  gleiche Chips ohne Notiz → gleiche Figur ohne fal-Aufruf (bis 5 je Sitzung gratis), kein Treffer →
  live und danach für alle abgelegt; Altersstufen ≤5/6–9/10–13/14+; „Noch einmal zeichnen“ bei
  Regal-Figuren erst bezahlt; Kuration über `?mode=chipfiguren` / `chipfigur-verwerfen`.
  **Offen:** Live-Test gegen den echten Store (Cowork hat kein Netz dorthin).
- Chip-Figuren v2 (19.10.2026): Listen einmal in `public/js/chips.js` (Client + Server), rollenabhängige
  Haarfarben inkl. Glatze, Struktur „kraus“, Hautton (5 Tupfer, Pflicht), Merkmale je Rolle, Schlüssel mit
  Version `v2|…`, Altersstufen ≤5/6–9/10+; Hautton im Helden-Abgleich (Prompt-Fassung `2026-10-19a`).
  **Zu tun:** nach dem Deploy einmal `?mode=chipfiguren-aufraeumen&key=…` aufrufen (v1-Testeinträge weg);
  Prompt-Fassung `2026-10-19a` ins Entscheidungsregister.
- Ergänzung 20.10.: Bart-Gruppe bei Mann/Opa (Farbe = Haarfarbe), Glatze als Längen-Option; Schlüssel mit
  neuntem Feld `bart`; Mann/Opa 6 000 Kombinationen.
- Chip-Figuren v3 (22.10., `docs/chip-figuren-v3-rueckmeldung-2026-10-22.md`): Grundfigur (Schlüssel v3 mit
  Frisur, neutral in Weiß) + Ausstattung (Lieblingsfarbe Oberteil, Brille, ein Extra) als zweite Stufe per
  nano-banana-2/edit mit eigenem Speicher; Oberteil-Farbe im Szenen-Prompt und im Helden-Abgleich
  (Prompt-Fassung `2026-10-22a`); Kuration beider Stufen, Aufräumen mit Vorschau.
  **Offen:** Stufe-2-Laufzeit messen (`dev-tools/ausstattung-test.js`), v2-Einträge löschen, Register.

---

## 🎟️ Neu seit 18.10.2026: Paket 1 „Gutscheine verkaufen" ist gebaut

Vor dem fertigen Produkt kommt der Gutschein (Validierungstest, Weihnachts-Geschenkpfad), siehe
`docs/gutschein-briefing-2026-10-18.md`. Umgesetzt und committet (7 Commits dd5b94b…76d31de),
Details, Umgebungsvariablen, Platzhalter und Test-Checkliste in
`docs/gutschein-paket1-rueckmeldung-2026-10-18.md`:

- Stripe-Checkout (Karte/Apple Pay/Google Pay/PayPal, Rabattcodes) + Webhook mit Signaturprüfung,
  idempotent; Gutschein-Hash in Upstash, Statuswechsel nur über `setzeStatus()` (atomar)
- Gutschein-PDF (pdf-lib, eigener QR-Erzeuger), Mails 1/2/7 über Resend (Texte: Platzhalter),
  Zustellung am Wunschtag per Cron, Widerruf mit Erstattung des gezahlten Betrags
- Seiten `/gutschein` (Live-Vorschau, Exit-Intent-Frage), `/gutschein/danke`, `/einloesen` (nur
  Prüfung), `/widerruf`, Rechtsseiten als Platzhalter (Livemodus bleibt gesperrt, bis sie echt sind)
- Teilen-Knopf unter dem ersten Wimmelbild (Bild mit Wasserzeichen), Zähler je Quelle ohne Cookies
- 34 Tests (`npm test` im App-Ordner), Kaufweg lokal mit Stripe-Attrappe durchgespielt

**Vor dem Soft-Launch:** Vercel Pro (13 Funktionen), Umgebungsvariablen setzen, Stripe-Webhook
anlegen, Rechtstexte + Mail-Texte einsetzen, Checkliste K im Testmodus durchklicken.
**Nicht Teil von Paket 1:** Einlösen in der App (Paket 2, ab Januar), Erinnerungs-Mails und
Erstattungs-Batch (Paket 3), Sortiments-Umbau der App, Peecho.

---

## ✅ Fertig und funktioniert

- Kandidatenwahl (Kundin sieht beide Bilder, wählt selbst; Favorit vom Richter bestimmt)
- Stift: entfernen, neu zeichnen, Figur versetzen (zwei Markierungen), Zoom am Handy
- Falzregel (kein gemalter Falz/Farbverlauf mehr in der Bildmitte)
- Stil-Tor korrigiert (Mundfrage, die vorher systematisch falsch geraten hat)
- Chat- und Sprachweg (erstmals echt getestet, funktioniert, Wünsche kommen im Bild an)
- Figurenkosten gesenkt: 0,33 $ → 0,09 $ je Figur (ungenutzte Zusatz-Ansichten gestrichen)
- Kostenbremsen an allen bezahlten Endpunkten (Anfragegrenze, Deckel, Buchung)
- Tagesobergrenze mit Mail-Warnung (25 / 60 / 150 $)
- Ehrliche Anzeigen statt Ersatzwerten (Speicherstatus, Menschen-Zählung im Panel, u.a.)

---

## 🔴 Muss vor dem Launch stehen

### Größtes inhaltliches Problem
- [ ] **Doppelte Helden** — ca. jedes zweite Bild betroffen. Ursache ungeklärt,
      bisher nur Notbehelf (Stift zum Versetzen).

### Fehlt komplett
- [ ] **Kaufprozess in der App** — existiert weiterhin nicht (Paket 2/3). Der Gutschein-Kauf
      (Stripe) steht seit 18.10., der Bestell-Checkout mit Peecho-Anbindung fehlt.
- [ ] **Produktangebot & Preise final** — bisher nur Platzhalter; Kalkulation mit
      Versand, Zahlungsgebühren und Umsatzsteuer (7 % Bücher / 19 % Poster) fehlt.
- [x] **Startseite & FAQ** — steht seit Ende September (Sortiment-Anpassung 16.10., Rechtsseiten-Links 18.10.).
- [ ] **WizzelWim als wiederkehrendes Maskottchen** — nur Konzept, weder gestaltet noch gebaut.

### Angefangen, nicht fertig
- [ ] Rohe Fehlermeldungen — nur der Stift ist sauber; Zaubern, Figur zeichnen,
      Nachschärfen und Speichern zeigen im Fehlerfall noch Technik-Text.
- [ ] Bildwahl verbindlich machen — Mechanik nur als Idee, nicht gebaut.
- [ ] 90-Tage-Haltbarkeit bei fal — gekaufte Bilder brauchen spätestens beim
      Kauf einen eigenen Speicherort, sonst nach 3 Monaten nicht mehr druckbar.
      Speicher-Vorschlag (Vercel Blob / R2) liegt vor (Auftrag-3-Rückmeldung, 6.3).
- [ ] Chat-Weg-Robustheit — Sperre gegen fehlende Wünsche greift, aber die
      Ursache (Modell lässt Situationen oft weg) ist unverstanden.

---

## 🟢 Kann warten (ohne Schaden für den Launch)

- Sammelblatt/Maßstabsblatt für Helden (Test durchgefallen bzw. offen)
- Zoom-Seiten, angereichertes Buchlayout
- Kontogrenzen (setzen ohnehin erst funktionierende Konten voraus)
- Ausschnitt-Korrektur beim Stift statt ganzem Bild (spart Geld, ändert nichts an der Funktion)
- Jahreszeiten-Sets für die Bibliotheksfiguren
- Restliche Kleinigkeiten aus dem 4b-Durchgang (Kommentare, Statusabfrage-Grenzen)

---

## Empfohlene Reihenfolge

1. **Doppelte Helden** — echte Ursachensuche, nicht noch ein Testschalter
2. **Kaufprozess** — ohne den ist alles andere Theorie
3. **Preise & Produktangebot final**
4. **Startseite & FAQ**
5. Rest der Muss-Liste

---

## Gelernte Lektion (gilt für alles Weitere)

Kleine A/B-Tests mit 4–10 Bildern je Seite können bei diesem Produkt zwischen
zwei Prompt-Fassungen **nicht zuverlässig unterscheiden** — zwei Läufe mit
identischem Aufbau schwankten stärker (100 % gegen 33 %) als jeder gemessene
Unterschied zwischen zwei Fassungen. Entscheidungen über Stil- und Prompt-Feinheiten
werden deshalb ab jetzt mit dem Auge getroffen, nicht mit Scheinzahlen aus zu
kleinen Stichproben. Das betrifft rückwirkend auch die Entscheidung vom 22.09.
gegen den aufgeräumten Prompt (5 Szenen, 4:1) — im Register entsprechend vermerkt.

---

*Zuletzt aktualisiert: 18.10.2026*
