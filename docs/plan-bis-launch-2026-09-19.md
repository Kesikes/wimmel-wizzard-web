# WizzelWim: Priorisierter Plan bis zum Launch

**Stand:** 19.09.2026 · **technisch nachgezogen am 20.09.2026**
**Launch-Ziel:** November 2026
**Ergänzt:** das Konzeptpapier vom 19.09. (Konto, Wasserzeichen, Layout, Druckdatei, Easter Egg)

---

## Wo wir stehen

Die Bildgenerierung funktioniert seit dem 18.09. verlässlich: Figurengröße, Dichte, Tiefenstaffelung und abwechslungsreiche Situationen sitzen, die Prüfung liefert brauchbare Urteile und das Notizfeld erklärt, was gestört hat. Damit ist der schwierigste Teil gelöst.

Was jetzt folgt, ist kein Bildproblem mehr, sondern Produkt: Wie wird aus einem guten Bild ein bestelltes Buch?

**Leitgedanke für die Reihenfolge:** Zuerst das, was heute schon kaputt ist oder blockiert. Dann das, was ohne einander nicht funktioniert. Zuletzt das, was schön wäre.

---

## Phase 0 — Diese Woche: fertig machen, was angefangen ist

Ziel: Der bestehende Ablauf funktioniert auf allen Geräten fehlerfrei. Nichts Neues.

### 0.1 Restliche Testbilder (Cowork begleitet, Matthias startet) — ABGESCHLOSSEN 19.09.2026

Die vier offenen Kompositionstypen prüfen, je ein Bild:

| Aufruf | Thema | prüft |
|---|---|---|
| `/app?phase=phase1&komposition=cutaway` | Weihnachten | Haus-Querschnitt, Innen/Außen-Regel |
| `/app?phase=phase1&komposition=gridhouse` | Weihnachten | Setzkasten, viele Räume |
| `/app?phase=phase2&komposition=overview_open` | Urlaub | Phase-2-Perspektive und -Dichte |
| `/app?phase=phase2&komposition=overview_cutaway` | Weihnachten | Phase 2 innen plus außen |

Kosten: ca. 1,25 bis 1,75 $ (halbiert, seit der Bildpreis mit 0,15 $ statt 0,30 $ belegt ist). **Erledigt:** alle Typen durch, inzwischen sieben Szenen in der Messreihe.

**Offen aus dem letzten Bild:** Am unteren Rand des Strandbildes waren einzelne Figuren angeschnitten und Gesichter leer. Bitte prüfen, ob die Regel bei allen Themen gleich weit vorn im Prompt steht.

### 0.2 Editiermodi und Stiftwerkzeug reparieren

Das Stiftwerkzeug und die Editiermodi funktionieren nicht richtig. Bitte systematisch durchtesten (alle Modi, mobil und Desktop), Fehlerliste erstellen, dann beheben. Das ist launch-kritisch: Wer ein Detail ändern will und dabei scheitert, bestellt nicht.

### 0.3 Desktop-Version instand setzen

Am Desktop fehlen Funktionen, und man kann nicht frei zwischen den Schritten springen — die Navigation fehlt praktisch ganz. Am Desktop ist strikte Schritt-für-Schritt-Führung auch falsch, dort ist Platz und man erwartet freies Springen.

**Geklärt (Cowork, 19.09.): es sind ZWEI getrennte Darstellungen** — `Screens.ergebnis.render()` für mobil, `buildDesktopErgebnis()` für Desktop, beide in `szene.js`. Genau daher kamen die zwei Fehler (das 0-Pixel-Bild und der Warnkasten, der nur mobil nachgezogen war) und zuletzt die zwei toten Knöpfe, die zweimal entfernt werden mussten. **Zusammenführen, bevor neue Funktionen gebaut werden.**

### 0.4 Kleine Textkorrekturen

- **Dashboard:** "0 von 5 Wimmelbildern" streichen. Es gibt keine feste Grenze, die Grenze ergibt sich aus dem Produkt (siehe 1.1).
- **Zauber-Screen:** Der gelbe Störer verlangt noch, den Bildschirm anzulassen und den Tab offenzuhalten. Das stimmt seit der Warteschlange nicht mehr. Text ersetzen durch etwas wie: "Das dauert ein bis zwei Minuten. Du kannst das Handy ruhig weglegen — ich zaubere weiter."
- **Szenen-Auswahl:** Die drei Wege brauchen erklärende Untertitel statt nur Überschriften:
  - *Thema wählen / Fertige Welten:* "Der einfachste und schnellste Weg zum ersten Bild."
  - *Selbst eintippen oder einsprechen:* "Beschreib einfach, was du im Kopf hast. Ich frage nach, wenn mir etwas fehlt."
  - *Gute-Nacht-Geschichte aufnehmen:* "Zwei Fliegen mit einer Klappe: Erzähl die Geschichte deinem Kind — und ich höre mit."

### 0.5 Freitext-Geschichte testen (Matthias)

Bisher wurde nur mit den fertigen Themen getestet. Der Weg "erzählen statt wählen" ist ungeprüft. Mit einer realistischen, etwas weitschweifigen Testgeschichte durchspielen und beurteilen:

- Wird der Ort erkannt und daraus eine stimmige Szene?
- Kommen die konkreten Situationen als Vignetten an?
- Wird der Held erkannt und platziert?
- Was passiert mit Unbildbarem (Erinnerungen, Gefühle, Zeitsprünge)?
- Fragt die App nach, wenn etwas fehlt?

**Geschichte, Prüfpunkte und ein Befund aus dem Code:** `testgeschichte-freitext.md`. Kurz: Chat und Aufnahme verhalten sich **unterschiedlich**. Der Chat liefert `situations_en` als Liste und kann nachfragen; die Aufnahme legt das ganze Transkript als **einen einzigen** Eintrag ab, danach füllt `autoSituations()` mit 19 Bibliotheks-Vignetten auf. Beim Testen festhalten, welcher Weg benutzt wurde.

**Daraus folgt ein eigener Bauauftrag:** Das Transkript muss wie im Chat in eine Liste zerlegt werden. Sonst ist die erzählte Geschichte eine Vignette unter zwanzig — also ein beliebiges Bild mit einem Gruß von der Geschichte statt der Geschichte als Bild.

---

## Phase 1 — Danach: Produktlogik und Vorschau

Ziel: Die Nutzerin versteht, was sie bekommt, und sieht es vor dem Kauf.

### 1.1 Produktlogik statt fester Grenzen

Nicht die App begrenzt die Zahl der Bilder, sondern das Produkt ergibt sich aus ihr:

**Festgelegt (19.09.), Launch-Umfang:**

| Wimmelbilder | Produkt | Innenseiten |
|---|---|---|
| 1 | Poster oder gerahmtes Bild, 30 × 60 cm | — |
| 3 | Softcover-Buch 15 × 15 cm, klein | 12 |
| 5 | Softcover-Buch 15 × 15 cm, groß | 16 |

Warum nur ungerade Zahlen: Jedes Buch hat 6 feste Seiten (Figurenvorstellung als Doppelseite, Suchhinweis, Widmung), jedes Wimmelbild belegt eine Doppelseite. Nur bei 3 und 5 Bildern ist die Seitenzahl durch 4 teilbar, was produktionstechnisch nötig ist. 2, 4 oder 6 Bilder gehen nicht auf.

Daraus folgt die Upselling-Logik: Bei 2 Bildern "noch eins, dann wird ein Buch daraus", bei 4 Bildern "noch eins, dann passen fünf hinein". Wer bei 2 oder 4 stehen bleibt, bekommt entweder ein Bild mehr vorgeschlagen oder eines weniger ins Buch gelegt. Wichtig ist der freundliche Ton — ein Hinweis auf Möglichkeiten, keine Verkaufsschranke.

KI-Kosten: ca. **0,45 $** (Poster), **1,35 $** (kleines Buch), **2,10 $** (großes Buch), jeweils zuzüglich Figuren. (Korrigiert am 20.09.: der Bildpreis liegt bei 0,15 $, nicht 0,30 $ — die früheren Zahlen waren doppelt zu hoch.)

### 1.2 Buchvorschau als eigener Schritt

Bisher endet der Ablauf beim einzelnen Bild. Bei einem Buch muss die Nutzerin das ganze Buch sehen: Cover, Figurenvorstellung, Suchhinweis, die Wimmelbilder als Doppelseiten, die Widmung.

- **Platz:** ein eigener Schritt zwischen Widmung und Bestellung.
- **Beim Poster** bleibt es bei der einfachen Bildvorschau.
- **Falzmarkierung** in der Vorschau anzeigen (siehe 2.1).
- Seitenzahl immer durch 4 teilbar, Minimum 8 Seiten.

### 1.3 Quick Win: Textbox im Bild

Auf dem Ergebnis-Screen eine kleine, halbtransparente Textbox mit hellem Hintergrund einfügen können, frei im Bild verschiebbar — wie bei einer Glückwunschkarte. Für einen kurzen Erklärtext oder eine Widmung direkt im Wimmelbild.

Klein im Aufwand, sichtbar im Ergebnis. Deshalb hier und nicht später.

---

## Phase 2 — Vor dem ersten echten Verkauf

Ziel: Aus dem Bild wird eine Druckdatei, und das Produkt ist geschützt.

### 2.1 Druckdatei-Paket

Drei Dinge gehören zusammen und sollten in einem Durchgang gebaut werden:

- **2:1-Beschnitt** — existiert im Code noch gar nicht.
- **300-dpi-Vermerk** beim Export, ohne Neuberechnung (Pixelzahl reicht mit 5504 px).
- **Falzregel:** im mittleren Streifen (ca. 8–10 % der Breite) keine Gesichter, Helden oder Gags. Umzusetzen an drei Stellen: im Bild-Prompt, als Verify-Kriterium `fold_ok`, als Markierung in der Vorschau.

**Festgelegt (19.09.):** Ein Wimmelbild läuft immer über eine Doppelseite. Die Falzregel gilt damit für jedes Buchbild. Beim Poster spielt sie keine Rolle.

Formatlage: Buchdoppelseite 296 × 148 mm, also 15 × 15 cm je Einzelseite (472 dpi), Poster 30 × 60 cm (233 dpi). 4K reicht für beides.

### 2.2 Wasserzeichen und eigene Bildauslieferung

Alle Vorschaubilder tragen sichtbar "WizzelWim". Entscheidend: Solange die App direkt auf die fal.media-Adresse verlinkt, nützt ein Wasserzeichen nichts — diese Adressen sind frei aufrufbar. Beides zusammen lösen:

1. Bilder über einen eigenen Endpunkt ausliefern.
2. Dort das Wasserzeichen einrechnen.
3. Unmarkierte Fassung erst nach dem Kauf, für den Druck.

Zu bewerten: Bandbreite auf Vercel, zusammen mit dem Wechsel auf Pro.

---

## Phase 3 — Der größte Brocken: Konto und Guthaben

Ziel: Die Vorleistung ist gedeckelt, ohne den Einstieg zu verbauen.

**Modell:** Kostenlos starten ohne Konto, bis zu 5 Figuren und 1 Szene. Danach Konto anlegen und 5 € aufladen. Die 5 € werden vollständig auf den Produktpreis angerechnet.

**Der kritische Punkt:** Beim Anlegen des Kontos muss alles bisher Erstellte übernommen werden. Geht dort etwas verloren, verlierst du die Kundin genau im Moment der Kaufentscheidung. Das ist die Stelle, die am gründlichsten getestet werden muss.

**Dazu gehört:** Guthabenstand sichtbar, Verrechnung im Checkout, und ein kurzer, erklärender Abschnitt zur Preiszusammensetzung im WizzelWim-Ton ("Jedes Bild wird wirklich neu gezaubert — und Zaubern braucht Strom.").

**Vorher zu klären (Matthias):**
- Verfällt das Guthaben, und nach welcher Frist? (Gutscheinrecht, mit Steuerberatung klären)
- Wie viele Korrekturen und Neuversuche sind nach dem Aufladen frei?
- Rückerstattung bei Nichtgefallen: ja oder nein?

**Außerdem vor dem Launch:** Vercel Hobby ist nur für nicht-kommerzielle Nutzung. Wechsel auf Pro (20 $/Monat) einplanen.

---

## Phase 4 — Nach dem Launch

### 4.1 Erzähl-Einstieg mit Helden-Vorschlägen

Statt "erst Figuren, dann Szene" ein zweiter Weg: erst drauflos erzählen, dann schlägt die App die Helden vor, die in der Geschichte vorkommen — samt Nebenfiguren wie dem Hund. Die Nutzerin bestätigt, ergänzt oder streicht.

Wichtig: **Vorschläge, kein automatisches Anlegen.** Und die App muss nachfragen, wie die Figuren aussehen, denn im Erzählen steht das selten.

Der Baustein passt technisch gut, weil die Beschreibung ohnehin schon analysiert wird. Aber er ändert den Einstieg — deshalb erst, wenn der bestehende Ablauf stabil verkauft.

### 4.2 WizzelWim als Easter Egg

Die Zaubererfigur klitzeklein in jedem Bild versteckt, per Default an, abschaltbar. Technisch als ganz normale Figur mit festem Referenzbild, mit drei Bedingungen: kein Verbrauch eines der 5 Heldenplätze, fest im Hintergrund, und `heroes_ok` darf sein Fehlen nicht als Fehler werten.

---

## Zusammenfassung der Reihenfolge

| Phase | Inhalt | Warum hier |
|---|---|---|
| **0** | Restliche Testbilder, Editiermodi, Desktop, Texte, Freitext-Test | Heute kaputt oder blockierend |
| **1** | Produktlogik, Buchvorschau, Textbox | Die Nutzerin muss verstehen und sehen, was sie kauft |
| **2** | Druckdatei-Paket, Wasserzeichen | Ohne das kein echter Druckauftrag, kein Schutz |
| **3** | Konto und Guthaben | Größter Brocken, aber ohne Phase 1 und 2 sinnlos |
| **4** | Erzähl-Einstieg, Easter Egg | Schön, nicht launch-kritisch |

---

## Entscheidungen, die noch bei Matthias liegen

1. Verfällt das Guthaben, und nach welcher Frist? (Gutscheinrecht, mit Steuerberatung)
2. Wie viele Korrekturen sind nach dem Aufladen frei?
3. Rückerstattung bei Nichtgefallen: ja oder nein?
4. Gerahmtes Bild: eigener Rahmenlieferant oder über die Druckerei? Rahmen sind ein Versandthema für sich (Glas, Gewicht). Falls aufwendig, zum Start nur Poster anbieten und den Rahmen als Hinweis nennen.

Alle vier betreffen Phase 3 und blockieren Phase 0 bis 2 nicht.
