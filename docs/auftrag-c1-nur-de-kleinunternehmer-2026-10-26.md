# Cowork-Auftrag C1: Nur Deutschland + Kleinunternehmer (§ 19 UStG)

**Stand:** 26.10.2026 · **Grundlage:** `docs/sortiment-beschluss-2026-10-22.md` (Abschnitt „Steuer, Markt“ und „Zusätzlich aus Steuer und Markt“), `docs/arbeitsplan-2026-10-25.md`.
Kleiner Auftrag, betrifft App **und** Landingpage-Dateien – deshalb in **einer** Sitzung, keine zweite parallel. Ein Commit je Teil, Push macht Matthias. Preise bleiben unverändert (Heft 29,90 €, Buch 49,90 €).

## Teil A – Versand nur Deutschland (Texte)
- `public/index.html` (Zeile unter den Produktkacheln), `public/js/landing.js` (FAQ „Was kostet der Versand?“), `public/gutschein.html` (FAQ/Produkttexte): überall „Deutschland, Österreich und in die Schweiz“ → **„innerhalb Deutschlands“**. Mit `grep -i -E "Österreich|Schweiz|DACH"` gegenprüfen, auch in Mails (`api/_lib/gutschein-mails.js`) und Gutschein-PDF.
- Gutschein-Seite: ein Satz bei den Produkten: „Einlösbar für den Versand innerhalb Deutschlands.“
- In `api/_lib/produkte.js` (oder `gutschein-config.js`) eine Konstante `VERSANDLAENDER = ["DE"]` anlegen – der spätere Bestell-Checkout (C5) und Peecho (C2/C6) lesen daraus. Jetzt noch nichts anbinden.

## Teil B – § 19 UStG
- Konstante `UST_HINWEIS = "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."` in `gutschein-config.js`.
- Hinweis einfügen in: Mail 1 (Kaufbestätigung an Käuferin, unter dem Betrag), Gutschein-PDF (Fußzeile, klein), Danke-Seite (`/gutschein/danke`, unter dem Betrag), Mail 7 (Widerruf/Erstattung).
- Preise nirgends mehr als „inkl. MwSt.“ oder „inkl. USt“ bezeichnen (grep). Stripe-Tax wird im Dashboard von Matthias ausgeschaltet – im Code sicherstellen, dass `automatic_tax` nicht gesetzt ist.

## Teil C – Umsatz-Zähler mit Warnung
- In `gutschein-service.js`: Jahresumsatz = Summe `bezahlt_cent` aller Gutscheine mit Status ≠ widerrufen/erstattet, gruppiert nach Kaufjahr (Key z. B. `umsatz:{jahr}` als Redis-Zähler, atomar bei Zahlung erhöhen, bei Widerruf/Erstattung verringern).
- `?mode=statistik` zeigt den Jahresumsatz je Jahr.
- Täglicher Cron (`api/cron/gutschein-zustellung.js` erweitern oder eigener Cron, nur wenn Vercel-Limit es erlaubt): liegt der laufende Jahresumsatz über **20.000 €**, einmal pro Tag Mail an `KONTAKT_EMAIL` („Kleinunternehmer-Grenze: 20.000 € erreicht, Grenze 25.000 €“); ab 24.000 € täglich und im Betreff „DRINGEND“. Schwellen als Konstanten.
- Später (C5) zählt derselbe Zähler auch Bestellungen – Funktion `umsatzBuchen(cent, jahr)` so bauen, dass sie wiederverwendbar ist.

## Teil D – Rechtsträger-Texte
- Impressum-/AGB-Platzhalter (`public/rechts/*.html`) bekommen als Kommentar den Hinweis: Rechtsträger ist Matthias privat (Einzelunternehmer, Kleinunternehmer), nicht IICM. Keine Texte erfinden, nur den Platzhalter-Kommentar ergänzen.

## Nicht Teil
Preisänderungen, Bestell-Checkout, Peecho, Stufenmodell (3 Figuren gratis / Zauberguthaben – kommt mit C3).

## Rückmeldung
Commits je Teil, grep-Ergebnis (keine AT/CH-Reste), Liste der Stellen mit § 19-Hinweis, Testanleitung: Testkauf → Mail 1 und PDF mit Hinweis, `?mode=statistik` zeigt Umsatz 2026.
