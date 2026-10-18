# WizzelWim — Fortschritt & Fahrplan bis zum Launch

**Stand: 18.10.2026** · Zielmarke: Gutschein-Soft-Launch Anfang November 2026 (spätestens vor 27.11.), Produkt-Beta ab Januar 2027

Dieses Dokument hält fest, wo das Projekt steht, was vor dem Launch noch fertig
werden muss, und was warten kann. Es wird bei größeren Meilensteinen fortgeschrieben.

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
