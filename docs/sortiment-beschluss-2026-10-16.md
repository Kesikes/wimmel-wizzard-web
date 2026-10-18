# WizzelWim Sortiment-Beschluss

Oct 16, 2026 · @Matthias

## Beschluss: zwei Produkte, beide versandkostenfrei

WizzelWim startet mit genau zwei Produkten, beide gedruckt und verschickt von Peecho, beide mit Versand im Preis. Bildzahl und Aufbau sind fest, es gibt keine Varianten.

|  | Wimmelheft (Einstieg) | Wimmelbuch (Hauptprodukt) |
| --- | --- | --- |
| Preis inkl. Versand | 29,90 € | 49,90 € |
| Peecho-Produkt | Magazines – glossy | Books – hardcover |
| Format | A5 hochkant, Doppelseite 29,6 × 21 cm | A4 hochkant, Doppelseite 42 × 29,7 cm |
| Papier | Silk coated 115 g | Gloss coated 200 g |
| Seiten laut Peecho-Rechner | 18 | 24 |
| Wimmelbilder | 4 | 7 |
| Weiterer Inhalt | Figuren-Doppelseite, Rätsel, Widmung, Lösungen | Figuren-Doppelseite, 2 Rätsel-Doppelseiten (Fehlerbild, Ausschnittsuche), Widmung, Lösungen |
| Peecho netto (Druck + Versand) | 5,06 € + 6,93 € = 11,99 € | 11,24 € + 5,45 € = 16,69 € |
| KI-Kosten | 2,96 € | 4,58 € |
| Deckungsbeitrag | 8,18 € | 17,56 € |
| Nach Gratis-Nutzerinnen (10 % Kaufquote) | 2,78–4,48 € | 12,16–13,86 € |

Annahmen: 19 % USt, KI 0,54 € je Bild (2K + Hochrechnen) plus 0,80 € Foto-Figuren, Zahlung 3 % + 0,35 €, Reklamationspuffer 3 %, keine Werbung. Für 1.000 € im Monat braucht es rund 80 Wimmelbücher.

Aufbau Wimmelbuch (22 Innenseiten, sofern Peecho die Cover mitzählt): Vordercover · Seite 1 Widmung · Figuren · 7 Wimmelbilder · Fehlerbild · Ausschnittsuche · Seite 22 Lösungen · Rückcover.

## Upsells

Fünf Zusatzangebote kommen dazu. Sie nutzen, was schon da ist (Bilder, Familie, Druckdatei), und haben deshalb kaum zusätzliche Kosten.

| Upsell | Preis | Wo angeboten | Kosten | Bleibt je Verkauf |
| --- | --- | --- | --- | --- |
| Alle Bilder digital in Druckqualität (Download) | 9,90 € | Checkout | praktisch null | ca. 8,00 € |
| Extra-Zauberpaket: 5 weitere Versuche oder Änderungen | 4,90 € | in der App, wenn das Korrekturkontingent aufgebraucht ist | ca. 0,70 € KI | ca. 3,30 € |
| Zweites Exemplar Wimmelbuch | 29,90 € inkl. Versand | Checkout | 16,69 € Peecho | ca. 6,80 € |
| Zweites Exemplar Wimmelheft | 19,90 € inkl. Versand | Checkout | 11,99 € Peecho | ca. 3,60 € |
| Folgebuch mit derselben Familie, neues Abenteuer | 39,90 € | Mail ca. 4 Wochen nach Lieferung, im Konto | wie Wimmelbuch, ohne Figuren und ohne Gratis-Nutzerinnen | ca. 10,50 € |

Digitale Inhalte tragen immer 19 % USt. Beim sofortigen Download braucht es die ausdrückliche Zustimmung der Kundin zum Erlöschen des Widerrufsrechts.

## Gestrichen

- **Ausmalbild:** weder als eigenes Produkt noch als Seite im Heft oder Buch.
- **Poster, Pappbuch, A6-Booklet, Bundles Buch + Poster, Hardcover mit 48 Seiten:** nicht im Sortiment.
- **Variable Bildzahlen:** entfallen, Heft hat immer 4, Buch immer 7 Wimmelbilder.

## Was das für die Technik bedeutet

Der Beschluss vereinfacht die App: zwei feste Produkte statt variabler Bildzahlen, ein Seitenverhältnis für alles, ein Druckpartner. Neu zu bauen sind vor allem die Peecho-Anbindung, der Rätsel-Generator und die Upsells im Checkout.

| Baustein | Was sich ändert oder neu ist |
| --- | --- |
| Produktlogik und Kontingente | Nur noch Heft (4 Bilder) und Buch (7 Bilder). Die alte Upsell-Logik mit 3/5 Bildern entfällt. Das Kontingent nach dem Aufladen reicht heute für 6 Bilder und muss auf 7 erhöht werden. |
| Bildformat | Seitenverhältnis 1,41 : 1 statt 2 : 1: Szenen in 3 : 2 erzeugen und seitlich beschneiden. Sicherheitsrand 10 mm rundum, auch am Bund (Falzregel bleibt). |
| Auflösung | Erzeugen in 2K. Nach dem Kauf nur die gekauften Bilder hochrechnen: Buch-Doppelseite ca. 4.960 × 3.510 px, Heft-Doppelseite ca. 3.500 × 2.480 px (je 300 dpi). |
| Rätsel-Generator (neu, ohne KI) | Fehlerbild: 5 automatische Änderungen (Fläche umfärben, Detail spiegeln, kleines Detail entfernen) plus Lösungsmarkierung. Ausschnittsuche: Ausschnitte aus den Wimmelbildern plus Lösung. Lösungsseite am Ende. Kein Ausmalbild. |
| Layout und Druckdatei | Ein PDF aus Einzelseiten: Vordercover, Inhalt, Rückcover. Jede Doppelseite in linke und rechte Hälfte teilen. Kein eigener Beschnitt (erzeugt Peecho). PDF/X-4, 300 dpi. Cover-Vorlage mit Titel, Name des Kindes und Bildausschnitt. |
| Peecho-Anbindung (neu) | Merchant-Konto (nötig für automatische Rückenbreite), Bestellung per API direkt an die Kundenadresse, Status und Tracking zurück ins Konto. Druckdateien vorher in eigenen Speicher (fal-Bilder nur 90 Tage). |
| Checkout (Stripe) | Zwei Produkte mit Preis inkl. Versand. Zusatzpositionen: Digitalpaket, zweites Exemplar Buch oder Heft (Menge 2 im selben Peecho-Auftrag). Checkbox Widerrufsverzicht für den Download. |
| Digital-Download (neu) | Nach dem Kauf wasserzeichenfreie, hochgerechnete Bilder als Download (Einzelbilder + PDF) über zeitlich begrenzte Links. |
| Extra-Zauberpaket | Kauf für 4,90 € schreibt 5 Aktionen gut. Hängt am Änderungs-Deckel (Baustein B) und am Stopp-Screen (Baustein D). |
| Folgebuch | Figuren der Familie dauerhaft im Konto speichern (heute verfallen Sessions nach 90 Tagen). Automatische Mail ca. 4 Wochen nach Lieferung mit Folgebuch für 39,90 €. Neues Buch startet mit den vorhandenen Figuren. |
| Entfällt | Ausmalbild, Poster, Pappbuch, Bundles, variable Bildzahlen. |

Vorgeschlagene Reihenfolge:

1. Peecho Merchant-Konto, Klärung der offenen Fragen, Probedruck beider Produkte (Bilder von Hand gesetzt).
2. Bildformat 1,41 : 1, Hochrechnen, Druckdatei-Erzeugung für beide Produkte.
3. Konto, Aufladen und Stripe (Baustein C) mit Kontingent 7 und Extra-Zauberpaket.
4. Rätsel-Generator (Fehlerbild, Ausschnittsuche, Lösungen).
5. Checkout mit Upsells, Digital-Download, Peecho-Bestellung per API.
6. Folgebuch-Mail und dauerhafte Figuren, nach dem Start.

## Offene Fragen

**An Peecho**

- [ ] Zählen die 24 Seiten beim Hardcover die beiden Cover mit (also 22 Innenseiten)?
- [ ] Ist „Magazines – glossy“ geheftet, und welche Seitenzahlen sind erlaubt (18 vs. 16/20)?
- [ ] Dickeres Papier oder festerer Umschlag fürs Heft möglich, zu welchem Preis?
- [ ] Günstigere Versandart fürs Heft als 6,93 € netto?
- [ ] Wie wird der Beschnitt erzeugt (spiegeln oder vergrößern)?
- [ ] Druckdaten in RGB oder PDF/X-4 mit FOGRA 39?
- [ ] Günstigerer Versand bei zwei Exemplaren in einem Paket?

**An die Steuerberatung**

- [ ] 7 % (Kinderbilderbuch) oder 19 % (Fotobuch) für Heft und Buch? Kalkuliert ist vorsichtig mit 19 %.
- [ ] Gutscheine: Einzweck- oder Mehrzweck-Gutschein?

**Intern**

- [ ] Kontingent nach dem Aufladen: von 6 auf 7 Bilder erhöhen, damit das Buch erreichbar ist.
