# C1 – Rückmeldung: Nur Deutschland + Kleinunternehmer (§ 19 UStG)

Stand: 26.10.2026 · Umsetzung: Claude (Cowork) · Auftrag: `docs/auftrag-c1-nur-de-kleinunternehmer-2026-10-26.md`

Vier Commits, nichts gepusht. Tests: `cd wimmel-wizard-v3 && npm test` → 74 grün. Preise unverändert.

## 1. Commits

| Teil | Commit | Dateien |
|---|---|---|
| A Versand nur DE | `8489946` | `gutschein-config.js` (`VERSANDLAENDER = ["DE"]`, `VERSAND_SATZ`, `EINLOESBAR_SATZ`), `gutschein-pdf.js`, `index.html`, `landing.js`, `gutschein.html`, `produkte.js`, `checkout.js`, `entscheidung.js`, `agb.html`-Platzhalter, Auftragsdatei |
| B § 19 UStG | `2ee29d3` | `gutschein-config.js` (`UST_HINWEIS`), `gutschein-mails.js`, `gutschein-pdf.js`, `gutschein-danke.html`, Test |
| C Umsatz-Zähler | `d7afcba` | `gutschein-service.js`, `cron/gutschein-zustellung.js`, Tests |
| D Rechtsträger | (dieser) | `rechts/impressum.html`, `rechts/agb.html` (nur Kommentar), dieses Doc, Fortschritt |

## 2. grep-Ergebnis (AT/CH)

`grep -rn -i -E "Österreich|Schweiz|DACH\b|AT und CH|DE/AT|DE, AT" public api --include=*.html --include=*.js`
→ **keine Treffer** (ausgenommen `public/referenz/` und „Dach“ in Szenen-Gags). Geändert wurden:
`index.html` (Zeile unter den Produktkacheln), `landing.js` (FAQ Versand), `gutschein.html` (FAQ + neuer Satz
„Einlösbar für den Versand innerhalb Deutschlands.“ unter den Produkten, aus der Config), `produkte.js`
(Kartentext), `checkout.js` (Bestellkarte), `gutschein-config.js` (`VERSAND_SATZ`, steht in Mail 1 und PDF),
`gutschein-pdf.js` (Wertzeile jetzt zweizeilig, Frist/Garantie rücken mit), AGB-Platzhalter.
`grep -rn -E "MwSt|inkl\. USt|automatic_tax"` → nur der erklärende Kommentar in `gutschein-config.js`.

`VERSANDLAENDER` liegt in `api/_lib/gutschein-config.js` (ein `api/_lib/produkte.js` gibt es nicht) und steht
auch in der öffentlichen Config (`versandlaender`) – nichts hängt bisher daran.

## 3. Stellen mit § 19-Hinweis („Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“)

1. Mail 1 (Kaufbestätigung), HTML und Textfassung – unter Wert/Frist/Garantie.
2. Mail 7 (Widerruf/Erstattung), HTML und Textfassung – unter dem Erstattungsbetrag.
3. Gutschein-PDF – Fußzeile, 7 pt, unter dem Beta-Satz (gerendert geprüft).
4. Danke-Seite `/gutschein/danke` – Zeile unter dem Betrag (aus `cfg.ust_hinweis`).
5. Statistik/Warnmail nennen die Grenze (kein Kundentext).

Stripe: `checkoutSessionParameter()` setzt kein `automatic_tax` – per Test abgesichert (auch in der kodierten
Anfrage). Stripe Tax im Dashboard ausschalten bleibt bei dir.

## 4. Umsatz-Zähler

- `umsatz:{jahr}` (Cent, `INCRBY`), Set `umsatz:jahre`. Kauf: `+ amount_total` (= `bezahlt_cent`, nicht
  `wert_cent`) ins Berliner Kaufjahr – idempotent, weil der Buchungsblock je Event/Session nur einmal läuft.
  Widerruf: `- bezahlt_cent` im Kaufjahr. Status „erstattet“ (Stichtags-Batch, Paket 3) gibt es noch nicht –
  dort dann `umsatzBuchen(-bezahlt_cent, kaufjahr)` aufrufen.
- `service.umsatzBuchen(cent, jahr)` ist exportiert und wird für C5 (Bestellungen) wiederverwendet.
- `?mode=statistik` → `umsatz: { je_jahr_cent, je_jahr, grenze_cent, warnung_ab_cent, dringend_ab_cent }`.
- Warnung: im bestehenden Cron `/api/cron/gutschein-zustellung` (täglich 07:00 UTC) nach der Zustellung,
  kein zweiter Vercel-Cron. Schwellen `UMSATZ_WARNUNG_CENT` 20 000 €, `UMSATZ_DRINGEND_CENT` 24 000 €,
  `UMSATZ_GRENZE_CENT` 25 000 €. Mail an `KONTAKT_EMAIL`, einmal je Tag (Cooldown-Schlüssel
  `umsatz:{datum}`, 26 h); Betreff „Kleinunternehmer-Grenze: 20000,00 € Jahresumsatz 2026 erreicht, Grenze
  25000,00 €“, ab 24 000 € mit „DRINGEND: “ davor. (Beträge ohne Tausenderpunkt – `cfg.euro()` formatiert so.)

## 5. Rechtsträger

Impressum- und AGB-Platzhalter tragen jetzt im HTML-Kommentar: Anbieter ist Matthias Kessler privat
(Einzelunternehmer, Kleinunternehmer § 19 UStG), nicht IICM; keine USt-IdNr.-Pflicht; Versand nur DE.
Sichtbare Platzhalter unverändert (der Punkt „USt-IdNr.“ im Impressum bleibt als Platzhalter für den Anwalt).

## 6. Testanleitung

1. Deploy, Stripe-Testmodus. `/gutschein` öffnen: unter den Produkten steht „Inkl. Versand innerhalb
   Deutschlands. Einlösbar für den Versand innerhalb Deutschlands.“; FAQ ohne AT/CH.
2. Testkauf (Karte 4242…). Mail 1: unter „Garantie“ der § 19-Satz; PDF-Anhang: Fußzeile mit § 19-Satz,
   Wertzeile „… · Inkl. Versand innerhalb Deutschlands“. Danke-Seite: Zeile unter dem Betrag.
3. `/api/gutschein?mode=statistik&key=…` → `umsatz.je_jahr["2026"]` = gezahlter Betrag (z. B. „29,90 €“).
4. Widerruf über den Link in Mail 1 → Mail 7 mit § 19-Satz; Statistik: Umsatz 2026 wieder kleiner.
5. Cron von Hand: `/api/cron/gutschein-zustellung?manuell=1` (ohne `CRON_SECRET`) → Antwort enthält
   `umsatz: { jahr, stand_cent, gemeldet: false }`. Warnmail testen: Redis `SET umsatz:2026 2000000`,
   Cron erneut → `gemeldet: true`, Mail an `KONTAKT_EMAIL`; danach den Wert wieder zurücksetzen.

## 7. Hotfixes (26.10.2026, vor Abschluss von C1)

| Commit | Was |
|---|---|
| `91aef09` | `charGenBusy`-Deklaration wiederhergestellt – mit `ebb01cc` (19.10.) war der ganze Block `charGenBusy` / `charGenErrorEl()` / `setBusyButtons()` vor `generateCharacterImage()` verloren gegangen (Safari: ReferenceError beim Klick auf „Figur zeichnen“); wortgleich aus `71582bb` zurückgeholt. |
| `68f8d10` | Brille als zwei Chips „Ohne Brille / Mit Brille“ (genau einer aktiv, Standard ohne) statt Umschalter. Beifang: `hairPhraseEn()` übergab die Frisur nicht – der Prompt hieß „long straight blonde hair“ statt „… in two braids“, der Server hätte die Grundfigur wegen `passtZumPrompt` nie abgelegt. Behoben. |

**Browser-Rauchtest** (Chromium headless, 390 px, Start-/Status-Endpunkte attrappiert): Mädchen 7 anlegen,
Blond · Lang · Glatt · Zöpfe · Hautton hell · Gelb · Mit Brille, „Figur zeichnen lassen“ klicken →
Anfrage an `/api/char-job-start` enthält `chips` (inkl. `frisur: zoepfe`) und `ausstattung`
(`gelb`, `brille: true`, `nichts`), Prompt beginnt mit „wmlstil, girl, age 7, light skin tone, long straight
blonde hair in two braids, wearing a plain simple white t-shirt, no glasses, no hat, no accessories, …“;
nach dem Poll hat die Person `imageUrl`, `chipSchluessel`, `oberteilEn`. **Keine JS-Fehler**; die einzigen
roten Konsolenzeilen sind Netzfehler der Sandbox (Google Fonts, `www.wimmelwizard.de`-Bild, fehlendes
`wizzelwim-family-hero.webp` im Testspiegel) – bitte einmal im echten Safari gegenprüfen.

## 8. Offen (bei dir)

- [ ] Stripe Tax im Dashboard aus.
- [ ] `KONTAKT_EMAIL` gesetzt (sonst geht die Warnmail an den Platzhalter `hallo@wimmelwizard.de`).
- [ ] Anwalt: Impressum/AGB auf die Privatperson, Versand nur DE, § 19 UStG.
