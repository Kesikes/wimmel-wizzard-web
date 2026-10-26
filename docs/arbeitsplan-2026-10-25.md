# Wimmel Wizard – Arbeitsplan ab 25.10.2026

**Ergänzt** `projektstand-2026-10-18.md` (Grundlagen, Infrastruktur, Gutschein bleiben dort gültig). Wo sich etwas geändert hat, gilt dieses Dokument. Beschlüsse im Repo: `docs/sortiment-beschluss-2026-10-22.md` (Kleinunternehmer, nur Deutschland), `docs/auftrag-chip-figuren-v3-2026-10-20.md`, `docs/chip-figuren-v3-rueckmeldung-2026-10-22.md`, `docs/gag-katalog-durchsicht-2026-10-25.xlsx`.

---

## 0. Was sich seit dem 18.10. geändert hat

- **Steuer/Markt (22.10., mit Steuerberater):** Kleinunternehmer ab 2026 (unter 25.000 €), 2027 bis 100.000 €. **Nur Deutschland**, kein AT/CH. Preise ohne USt, Pflichthinweis § 19 UStG auf Rechnung und Bestätigung. Deckungsbeitrag Buch ca. 21 €, Heft ca. 10 €.
- **Chips v3 (22.10., gebaut, noch nicht gepusht):** Grundfigur (Frisur, Hautton, Bart, neutral weiß) + Ausstattung (Lieblingsfarbe Oberteil, Brille, ein Extra) als zweite Stufe per Bildbearbeitung. Oberteil-Farbe im Szenen-Prompt und im Helden-Abgleich.
- **Bild-Strategie (24./25.10.):** Umstieg auf ein **Collage-Modell** beschlossen zu testen: Code platziert Helden und Nebenfiguren, KI zeichnet Hintergrund und kleine Gruppen. Drei Schichten: erzählte Situationen der Kundin (pro Buch neu), Standard-Situationen aus einem Katalog (einmal produziert, keine Wiederholung im Buch), Füll-Figuren aus der Datenbank. Ortsfotos der Kundin als Hintergrund-Vorlage als vierter Baustein.
- **Gag-Bibliothek:** Durchsicht-Tabelle liegt vor (244 Gags, 52 Gruppen, 56 Helden-Aktionen, 54 neue Vorschläge). Befund: Bibliothek ist schon europäisch; der „amerikanische“ Eindruck kommt aus dem Hintergrund-Prompt. Wiederholung liegt im Typ (Hälfte Missgeschick/Tier).

## 0b. Befund 26.10. (GPT-Image-2-Test von Matthias)

- GPT Image 2 komponiert dichte, europäische, bunte Wimmelszenen weit besser als Nano Banana (ca. 80 Menschen, 25+ Situationen, kein Text, keine Dopplung) – aber nur gesteuert, nicht stilgebunden: der WizzelWim-Stil wird nicht gehalten.
- **Regel:** Stil felsenfest geht nur per Training (LoRA, offene Modelle). Geschlossene Modelle (GPT Image 2, Nano Banana) lassen sich nur steuern (70–85 %, driftet über 7 Bilder).
- **Arbeitsteilung:** GPT Image 2 zeichnet den Hintergrund (menschenleer, Stil-Karte), Figuren kommen aus der LoRA-Datenbank, der Code platziert. Hand-Mock bestätigt das Prinzip.
- **Stil-Paket je Stil** (für spätere Stil-Auswahl): Stil-Karte (Text), Referenz-Set (3 Figurenblätter + 2 Szenen), Figuren-LoRA (40–80 kuratierte Bilder), Hintergrund-Prompt, Stil-Tor.
- Stil-Karte WizzelWim (Entwurf): große runde Köpfe (Erwachsene ¼, Kinder ⅓), Punktaugen, senkrechter Nasenstrich, kein Mund/Ohren/Hals, dicke schwarze Kontur, kräftige Farbflächen, Schatten nur als zweiter dunklerer Ton mit harter Kante (wie Papier), keine Verläufe, Umgebung darf Licht und Tiefe haben, keine Schrift.
- Ortsfotos als Szenenvorlage: nur in der Bezahl-Version.

## 1. Zwei Spuren

Alles Offene läuft in zwei Spuren, die sich nicht blockieren:

- **Spur A – Verkaufen können:** Gutschein live, Bestellablauf bis zur Druckerei. Hängt an Rechtstexten, Gewerbe, Stripe-Aktivierung.
- **Spur B – Bilder besser machen:** Gag-Katalog, Collage-Prototyp, Stil (europäisch, kräftiger), neue Pipeline. Fasst den Code der App erst an, wenn der Prototyp überzeugt.

Cowork arbeitet immer nur an **einem** Auftrag; die Reihenfolge unten ist die Warteschlange. Matthias' eigene Aufgaben laufen parallel.

## 2. Matthias – sofort (ohne Cowork)

| # | Aufgabe | Dauer |
|---|---|---|
| M1 | Chips v3 pushen: `git add docs/sortiment-beschluss-2026-10-22.md && git commit -m "Sortiment-Beschluss 22.10.2026" && git push` | 5 min |
| M2 | Alte v2-Figuren aufräumen (`?mode=chipfiguren-aufraeumen&key=…`, erst Vorschau, dann `&bestaetigt=1`) | 5 min |
| M3 | Drei Testfiguren anlegen (Mädchen Zöpfe/Gelb/Brille, Opa Glatze/Vollbart/Hut, Frau Dutt/Kopftuch/Grün), Treffer-Test, eine Szene zaubern, Screenshots an PM-Chat | 30 min |
| M4 | Gag-Katalog durchsehen (`docs/gag-katalog-durchsicht-2026-10-25.xlsx`), Datei zurück an PM-Chat | 1–2 h |
| M5 | Peecho-Testkonto: API-Schlüssel, Produkt-IDs (Magazines glossy A5, Books hardcover A4), Testguthaben, Firmendaten als Einzelunternehmer; offene Fragen an Peecho schicken | 1 h |
| M6 | Restliche Gutschein-Tests: Widerruf, PayPal, Rabattcode, Wunschdatum, Teilen am Handy | 1 h |
| M7 | 2K-Vergleichstest im Terminal (`dev-tools/aufloesung-2k-test.js`), Ergebnis nach Augenmaß | 30 min |
| M8 | Seitenvorlagen fürs Buch gestalten: Cover, Widmung, Figurenseite, Rätselseite, Lösungsseite (PDF mit Beschnitt, variable Felder frei) | laufend |
| M9 | Instagram-Handle, App-Video, Lösch-Mailadresse an Landingpage-Cowork | laufend |

## 3. Cowork-Warteschlange (App-Sitzung)

| # | Auftrag | Inhalt | Voraussetzung | Status |
|---|---|---|---|---|
| C1 | **Nur Deutschland + Kleinunternehmer** | Versandtexte DE statt DACH (Landingpage, FAQ, Gutschein-Seite), Stripe-Checkout nur DE-Adressen, § 19-Hinweis in Mail 1 und Gutschein-PDF, Umsatz-Zähler mit Warnung bei 20.000 €, Peecho-Zielland DE vormerken | M1 | Auftrag schreibt PM-Chat |
| C2 | **Peecho Stufe 1** | REST-Client, Muster-PDF je Produkt, Testbestellung im Peecho-Testsystem, Status-Rückkanal vorbereiten | M5 | Auftrag liegt vor (PM-Chat 19.10.) |
| C3 | **Konto & Aufladen** | Anmelden per Mail-Link, 5 € aufladen über Stripe, Guthaben im Konto, Figuren/Bilder dauerhaft, „Ich habe einen Gutschein“ (Einlösen) | C1 | Auftrag folgt |
| C4 | **Druckdatei-Generator** | Vorlagen + pdf-lib, Hochrechnen der gekauften Bilder, Teilen in Einzelseiten, Rätsel ohne KI (Fehlerbild: Umfärben/Spiegeln/Entfernen; Ausschnittsuche), Figurenseite, Widmung, Rückenbreite von Peecho, Vorschau mit Wasserzeichen, automatische Prüfung | C2, M8 (bis dahin Platzhalter-Vorlagen) | Auftrag folgt |
| C5 | **Bestell-Checkout** | Bilder wählen, Vorschau freigeben, Adresse (nur DE), Upsells (Digitalpaket, 2. Exemplar, Extra-Zauberpaket), Rabatt-/Gutscheincode, Stripe, Guthaben anrechnen, Widerrufsverzicht beim Download | C3, C4 | Auftrag folgt |
| C6 | **Fulfillment** | Nach Zahlung: Druckdatei → Peecho → Status/Tracking ins Konto → Mails „in Produktion“, „unterwegs“; Digital-Download über zeitlich begrenzte Links | C2, C4, C5 | Auftrag folgt |
| C7 | **Ende-zu-Ende-Test** | Figur → Aufladen → Bilder → Checkout (Testkarte) → Peecho-Testbestellung → Mails; danach echter Probedruck beider Produkte | C6 | – |

Spur B, eingeschoben wenn M4 fertig ist (zwischen C2 und C3 oder parallel in einer **zweiten** Sitzung, die nur `dev-tools/` und `docs/` anfasst):

| # | Auftrag | Inhalt | Voraussetzung |
|---|---|---|---|
| B1 | **Situationen-Katalog** | Aus der Durchsicht: Vorlagen mit Rollen-Platzhaltern, Figurenzahl, Ebene, Tags (Thema, Jahreszeit), Running Gags; als Datei im Repo, noch ohne Anbindung | M4 |
| B2 | **Collage-Prototyp** (nur dev-tools, ca. 5 $) | Eine Szene: **Hintergrund per GPT Image 2** (kurzer Prompt + Stil-Karte, menschenleer mit freier Fläche; einmal frei, einmal aus Urlaubsfoto), 5 Helden + 20 Datenbank-Figuren per Code platziert (Posen!), einmal ohne und einmal mit leichter Harmonisierung. Grundlage: Hand-Mock vom 26.10. (`collage-mock-gardasee.png`) – Prinzip bestätigt, fehlen Posen, Füll-Figuren, Einbettung | B1, Chips v3 live |
| B3 | **Entscheidung nach Augenmaß** | Matthias vergleicht; bei Ja: Auftrag „Collage-Pipeline“ (Posen je Figur, Gruppen-Produktion, Layout-Engine, Ortsfoto-Upload mit Personen-Entfernung) als eigenes Paket **nach** C7 | B2 |

## 4. Landingpage-Sitzung

| # | Auftrag |
|---|---|
| L1 | Versand nur Deutschland (Teil von C1, aber Landingpage-Dateien) |
| L2 | Instagram-Handle einsetzen, App-Video einbauen, Lösch-Mailadresse, „Lieblingspulli“ bleibt (stimmt mit Chips v3) |
| L3 | Nach dem Probedruck: echte Produktfotos |
| L4 | Nach der Stil-Entscheidung: Beispielbilder nachziehen |

## 5. Extern (nicht Cowork)

| Was | Wer | Blockiert |
|---|---|---|
| Rechtstexte Impressum, AGB, Widerruf, Datenschutz (inkl. fal/OpenRouter/Google, Ortsfotos, Widerrufsverzicht Download) | Anwalt | Gutschein-Livemodus, jeder echte Verkauf |
| Gewerbeanmeldung, Kleinunternehmer-Anzeige | Matthias | Stripe-Aktivierung |
| Steuerfragen offen: 7 % oder 19 % ab 2028, Gutschein Einzweck/Mehrzweck, Reverse Charge Peecho/KI | Steuerberatung | Rechnungstexte |
| Stripe aktivieren (Einzelunternehmen), Live-Schlüssel, Live-Webhook, Steuer aus | Matthias | Livemodus |
| Peecho Merchant-Konto, Antworten auf die offenen Fragen | Matthias/Peecho | C2, C4 |
| Strato-Weiterleitung Apex → www | Matthias | kosmetisch |

## 6. Zeitplan

| Wann | Spur A | Spur B |
|---|---|---|
| **bis 1.11.** | M1–M7, C1, Peecho-Testkonto | M4 Gag-Durchsicht |
| **bis 8.11.** | C2 Peecho Stufe 1, Testbestellung | B1 Katalog |
| **bis 15.11.** | C3 Konto & Aufladen; Rechtstexte da → Gutschein live, Soft Launch | B2 Prototyp, B3 Entscheidung |
| **bis 30.11.** | C4 Druckdatei (mit M8-Vorlagen), Probedruck | Stil-Testrunde (europäisch, bunter) in den Prompt übernehmen |
| **Dezember** | C5 Checkout, C6 Fulfillment, C7 Ende-zu-Ende | ggf. Collage-Pipeline als Paket |
| **Januar 2027** | Einlösungen, erste echte Bücher | – |

Puffer: Der Gutschein-Livegang hängt allein an den Rechtstexten. Alles andere kann im Testmodus fertig werden.

## 7. Regeln (unverändert)

Cowork committet, Matthias pusht · nie zwei Sitzungen im selben Repo-Ordner (Spur B nur in `dev-tools/` und `docs/`) · Schlüssel nur in Vercel/Notiz · Stil- und Prompt-Entscheidungen nach Augenmaß, nicht nach kleinen Stichproben · Livemodus erst mit echten Rechtstexten.
