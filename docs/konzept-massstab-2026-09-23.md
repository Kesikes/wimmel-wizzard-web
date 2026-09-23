# Konzept: ein gemeinsamer Maßstab für alle Figuren

**Stand 23.09.2026 · KONZEPT, nichts gebaut.** Idee des Nutzers, ausgearbeitet von Claude (Cowork).
Ersetzt die Silhouetten-Idee vom 22.09. (Einschätzung dazu im Register, Abschnitt 14).
Produktentscheidungen trifft Matthias; offene Punkte stehen am Ende gesammelt.

---

## 1. Was die Idee löst — drei Probleme mit einem Griff

**a) Alter und Größe.** Der Textweg ist ausgeschöpft: „age 4" wirkt nicht, „Alter als Größe"
(`ALTER_ALS_GROESSE`) wurde gebaut, verglichen und zeigte in zwei Szenen keine Wirkung. Die Ursache
liegt woanders: Ein Figurenblatt zeigt eine Person allein auf Weiß, ohne irgendeinen Bezug. Das
Modell kann daraus nicht ablesen, wie groß die Person **im Verhältnis** ist.

**b) Wiedererkennbarkeit der Bibliotheksfiguren.** Der Nutzer: „vermutlich der Grund, warum ich die
4–6 Figuren nie wiedererkenne." Der Verdacht trifft genau eine Stelle im Prompt
(`backgroundLibraryInstruction()`), die heute wörtlich verlangt:

> RE-DRESS THEM COMPLETELY for this scene: the sheets show people in coats, scarves, woolly hats and
> rain macs, and none of that may appear in this image … A figure from the sheets keeps their hair
> and their colours and gets the clothes that belong here.

Erkennbar sollen laut Register genau drei Dinge sein: **Silhouette, Haare, Farben** — und die
Kleidung trägt einen großen Teil von Silhouette und Farben. Wir ziehen der Figur also das aus, woran
man sie erkennen würde, und bitten dann um Wiedererkennbarkeit. Der Grund für die Umkleide steht
schon als offener Punkt im Code-Kommentar: „ob die Blätter (überwiegend Winter und Stadt — Mäntel,
Schals, Mützen) in einem Herbst-/Sommerbild inhaltlich stören. Zeigt das Kontrollbild das, kommen
thematische Sets." Genau diese thematischen Sets sind jetzt die Idee — und mit ihnen fällt der Grund
für die Umkleide weg.

**c) Marke.** WizzelWim in jedem Bild ist Suchspiel, Wiedererkennung und — das ist der Trick — ein
**fester Maßstabsanker**, der in jedem einzelnen Bild mitreist.

---

## 2. Die fünf Bausteine

1. **Zwei Bibliotheks-Sets:** Frühling/Sommer und Herbst/Winter. Die heutigen 13 Blätter sind
   überwiegend Winter/Stadt — sie werden das Herbst/Winter-Set. Neu zu bauen ist das
   Frühling/Sommer-Set.
2. **Keine Umkleide mehr.** Die Anweisung lautet künftig: genau diese Figuren übernehmen, mit ihrer
   Kleidung. Der Absatz „RE-DRESS THEM COMPLETELY" entfällt, die Blattwahl richtet sich nach der
   Jahreszeit des Themas.
3. **Gemeinsamer Maßstab auf den Heldenblättern:** gleiche Fußlinie, Erwachsene gleich groß.
4. **Maßstabsblatt je Familie:** alle Helden plus WizzelWim nebeneinander, in einem Maßstab. Die
   einzelnen Nahaufnahmen **bleiben** — sie tragen die Gesichtsauflösung und damit die Heldentreue.
5. **WizzelWim in jedem Bild**, abwählbar.

---

## 3. a) Den Satz „NOT their size" einengen

Heute steht im Prompt (`sceneComposeInstruction()`) wörtlich das Gegenteil dessen, was ein
Maßstabsblatt erreichen soll:

> Take their identity from those reference images, but **NOT their size**: the references are
> close-up character sheets in which one person fills the frame, and that is a property of the
> reference sheet, not of this scene.

Der Satz war richtig, solange jedes Blatt eine Nahaufnahme ohne Bezug war. Mit einem Maßstabsblatt
wird er zum Bremsklotz. **Formulierungsvorschlag** (ersetzt genau diesen Satz, gleiche Länge
±20 Zeichen):

> Take their identity from those reference images, but not their absolute size: how large any person
> is drawn in this scene is set by the size rule above and by nothing else — the single-character
> sheets are close-ups in which one person fills the frame, and that says nothing about this scene.
> What the sheets do tell you is how these people compare **with one another**. Reference image N
> shows all of them side by side, standing on one common ground line, drawn to one scale. Keep those
> proportions exactly: whoever reaches an adult's hip there reaches an adult's hip here, and whoever
> is a head shorter there is a head shorter here. Proportions from that sheet, absolute size from
> the size rule.

Zwei Dinge daran sind bewusst so gebaut:

- Der Satz nennt **das Blatt**, nicht das Endprodukt — nach dem Grundsatz aus der Falz-Korrektur.
- Er verlangt keinen Zweischritt („Erwachsener = ein Achtel der Bildhöhe, Kind anteilig davon"),
  sondern einen Vergleich („wer wem bis zur Hüfte geht"). Vergleichen kann das Modell, rechnen nicht.

**Nicht gemessen:** ob es wirkt. Das entscheidet der erste Test (Abschnitt 9).

---

## 4. b) Passen alle Bilder in die Referenzbilder?

Der Deckel: `api/fal-proxy.js` schneidet `styleRefUrls` bei **13** ab; dazu kommt das Basisbild
(leere Leinwand) als `image_urls[0]` → **14 Bilder insgesamt**. Die 14 stammen aus unserem eigenen
Kommentar zu `nano-banana-2/edit`; für `nano-banana-pro/edit` ist die Zahl **nicht nachgeprüft**.
Das Schema abzufragen kostet nichts und sollte vor dem Bauen passieren.

| | heute | mit dem Konzept |
|---|---|---|
| leere Leinwand | 1 | 1 |
| Heldenblätter (Nahaufnahmen) | bis 5 | bis 5 |
| Bibliotheksblätter | 3–4 (zufällig aus 13) | 3–4 (aus dem Set der Jahreszeit) |
| Maßstabsblatt | — | 1 |
| WizzelWim | — | 1 |
| **Summe im schlimmsten Fall** | **10** | **12** |

**Es fällt nichts weg.** Zwei Plätze bleiben frei. Falls die Pro-Variante doch weniger erlaubt, ist
die Reihenfolge des Verzichts: erst ein Bibliotheksblatt weniger (3 statt 4), dann WizzelWim
abwählen. Die Heldenblätter als Letztes — ihre Nahaufnahme ist der Grund, warum die Helden
überhaupt getroffen werden.

**Promptlänge** (gemessen mit `dev-tools/prompt-laenge.js`, schlimmster Fall Weihnachten / phase2 /
overview_cutaway):

| Figuren | Zeichen |
|---|---|
| 4 | 22.540 |
| 5 | 23.168 |
| **6 (5 Helden + WizzelWim)** | **23.760** |

Mit `helden=neu` liegt der schlimmste Fall rund 1.450 Zeichen höher, also bei sechs Figuren um
**25.200 — Puffer rund 4.800** zur eigenen Grenze von 30.000. Dazu kommen die beiden neuen Sätze
(Maßstab, WizzelWim), zusammen geschätzt 600–800 Zeichen. **Es passt**, aber der Puffer schrumpft;
`prompt-laenge.js` gehört nach jeder dieser Änderungen ausgeführt.

---

## 5. c) Wie das Maßstabsblatt entsteht

**Empfehlung: der Code montiert es, er lässt es nicht erzeugen.**

| | montiert | erzeugt |
|---|---|---|
| Kosten je Familie | 0 $ | ein Bildaufruf, 0,15 $ und aufwärts |
| Gesichter | bleiben **exakt** die der Blätter | werden neu gezeichnet → Identität driftet |
| Ergebnis | jedes Mal identisch | jedes Mal anders |
| Maßstab | vom Code gesetzt, also exakt | geschätzt vom Modell |

Die Montage ist technisch unkompliziert, weil die Blätter auf **schlichtem Weiß** stehen
(`charPrompt()`: „plain white background"): Der Code schneidet je Blatt den nicht-weißen Bereich
zu (Bounding Box), skaliert die Figur auf eine Zielhöhe und setzt sie auf eine gemeinsame Fußlinie.
Werkzeug: `sharp` serverseitig oder `canvas` im Browser.

Zwei Dinge müssen dafür festgelegt werden:

1. **Eine Tabelle Alter → Anteil der Erwachsenenhöhe.** Das ist eine **Produktentscheidung**, keine
   Messung — sie muss als solche im Register stehen. Vorschlag als Ausgangspunkt (an realen
   Wachstumskurven orientiert, gerundet): 2 J. = 0,50 · 4 J. = 0,58 · 6 J. = 0,66 · 8 J. = 0,73 ·
   10 J. = 0,79 · 12 J. = 0,86 · 14 J. = 0,94 · ab 16 J. = 1,00.
2. **Wohin das Blatt kommt.** fal muss es per URL abrufen können. Entweder als Datei auf unserem
   eigenen Host (wie die `bgchars`) oder als `data:`-URI im Aufruf — `isImageRef()` in `fal-proxy.js`
   erlaubt beides. Eine `data:`-URI spart jede Ablage und jede TTL-Frage, macht den Aufruf aber
   größer; bei einem schmalen Streifenbild ist das vertretbar.

**Wann:** sobald die Familie vollständig ist, also nach dem letzten Figurenblatt — und **neu**, sobald
eine Figur dazukommt oder ersetzt wird.

**Ehrlicher Haken:** Die Bounding Box misst die gezeichnete Figur, nicht die Person. Ein Hut, ein
erhobener Arm oder ein Sprung macht die Figur höher, ohne dass sie größer wäre. Die Blätter zeigen
laut `charPrompt()` alle „Full body, standing, front view" — das hält den Fehler klein, beseitigt
ihn aber nicht. Eine Stichprobe über die vorhandenen Blätter vor dem Bauen kostet nichts.

---

## 6. d) Risiko: das Maßstabsblatt wird als Gruppenbild abgemalt

Das Risiko ist real und von derselben Art wie der gemalte Falz — mit dem Unterschied, dass hier
etwas **Zeichenbares** im Referenzbild steht, und zwar genau die Figuren, die im Bild vorkommen
sollen. Drei Sicherungen, die zusammenwirken:

**1. Das Blatt sieht nicht aus wie eine Szene.** Reines Weiß, keine gezeichnete Bodenlinie (eine
Linie könnte als Horizont gelesen werden — die Füße stehen einfach auf gleicher Höhe), kein
Hintergrund, keine Requisiten, deutliche Abstände zwischen den Figuren.

**2. Ein Satz, direkt im Anschluss an den Maßstabssatz:**

> Reference image N is a measuring chart, not a scene: it exists only to show how tall these people
> are next to one another. Never draw them standing in a row, never draw them as a group, and never
> copy the white background or the spacing of that sheet. In this picture each of them is somewhere
> else entirely, busy with their own little scene, exactly as described above.

**3. Eine Messung, die wir schon haben.** `heroes_x` meldet seit `2026-09-22c` die waagerechte Lage
jedes Helden (0–100). Stehen alle Helden innerhalb einer schmalen Spanne, ist das genau das
Gruppenbild. Der Code kann die Spannweite (größter minus kleinster Wert) ausrechnen und ins Panel
schreiben — **als Messwert, ungewertet**, bis an ein paar Bildern klar ist, wo die Grenze liegt
(90-%-Regel).

---

## 7. e) Aufwand und einmalige Kosten für die Bibliothek

**Was heute da ist:** 13 kuratierte Gruppenblätter mit je 5–7 Figuren (rund 44 Einzelfiguren),
JPEG q90 auf 1800 px, rund 250 KB je Blatt, Originale in `asset-originals-v3/`. Jedes Blatt wurde
damals **einzeln gegen die Stilregeln geprüft** — das war der eigentliche Aufwand, nicht die
Erzeugung.

**Die entscheidende offene Frage** (Produktentscheidung): Sind die Sommerblätter **dieselben
Menschen in anderer Kleidung** oder ein **zweites Ensemble**?

- *Dieselben Menschen* — dann bleibt das Ensemble über ein ganzes Buch hinweg gleich, auch wenn
  Szenen in verschiedenen Jahreszeiten spielen. Technisch: kein freies Text-zu-Bild, sondern ein
  **Edit** der vorhandenen Blätter („dieselben Personen, Sommerkleidung"), damit die Gesichter
  bleiben. 13 Blätter × 2 Kandidaten × 0,15 $ = **3,90 $**, mit Nachläufern realistisch **8–12 $**.
- *Zweites Ensemble* — freies Text-zu-Bild über `flux-lora` (Preis je Blatt nicht belegt, steht im
  fal-Dashboard; erfahrungsgemäß deutlich unter dem Szenenpreis). Billiger, aber das Buch hat dann
  je nach Jahreszeit eine andere Statisterie.

Meine Empfehlung: **dieselben Menschen**, weil genau die Wiedererkennbarkeit der Zweck der Übung ist.

**Und ein Befund, der Geld spart:** Der gemeinsame Maßstab muss **nicht** auf die
Bibliotheksblätter. Die Größe der Hintergrundfiguren setzt ohnehin die Ebenenregel (Vordergrund,
Mittelgrund, Hintergrund), und ein Gruppenblatt mit 5–7 Figuren lässt sich nicht so einfach
maßstäblich normieren wie eine Einzelfigur — dafür müsste man die Blätter neu bauen. Der Maßstab
betrifft das Problem der **Helden**; dort löst ihn das Maßstabsblatt. Die Bibliothek braucht nur
die Jahreszeiten und den Wegfall der Umkleide.

**Kuratierung:** je Blatt einmal ansehen und gegen die Stilregeln prüfen — 13 Blätter, erfahrungsgemäß
ein bis zwei Stunden deine Zeit. Das ist der größere Posten, nicht die Dollar.

---

## 8. f) WizzelWim

**Wie ein Held — mit zwei Ausnahmen.**

| Regel | gilt für Wim? |
|---|---|
| genau einmal im Bild | **ja** |
| Aussehen genau wie auf seinem Blatt | **ja** |
| nicht im mittleren Streifen (Falzregel) | **ja** |
| vollständig sichtbar, nicht verdeckt, nicht angeschnitten | **ja** |
| Größenregel (Ebene bestimmt die Höhe) | **ja** — und er ist damit der Maßstabsanker im Bild |
| eigene Handlung aus `pickHeroActions()` | **nein** — er bekommt einen eigenen, festen Satz, sonst verbraucht er Situationen aus der buchweiten Sperrliste |
| zählt gegen die Grenze von 5 Helden | **nein** — er ist ein sechster Eintrag, siehe Längenmessung oben |

**Wie wir prüfen, dass er da ist:** gar nicht neu. Die Prüfung meldet bereits `heroes_found` — eine
Zahl je benannter Figur, 1 ist richtig, 0 heißt fehlt, 2+ heißt doppelt. Wim wird einfach eine
weitere benannte Figur in dieser Liste. Das kostet keinen zusätzlichen Aufruf und kein Geld, und es
fällt sofort im Panel auf. `heroes_x` sagt zusätzlich, wo er steht.

**Abwählbar:** ein Schalter im gespeicherten Zustand. Aus heißt: kein Referenzbild, kein Satz, kein
Eintrag in der Prüfliste — nicht etwa „Feld bleibt leer". Eine abgeschaltete Figur darf nirgendwo
wie eine fehlende aussehen.

**Was noch fehlt:** Wim hat noch kein festes Design. Das ist eine einmalige, gestalterische
Entscheidung von dir; danach ist es ein einziges Blatt, das für alle Kundinnen gleich bleibt.

---

## 9. g) Reihenfolge — was zuerst

Sortiert nach „billigste Frage zuerst, und jede Stufe ist für sich umkehrbar":

| # | Schritt | Kosten | beantwortet |
|---|---|---|---|
| 1 | `prompt-laenge.js` mit sechs Figuren, Schema von `nano-banana-pro/edit` abfragen | **0 $** | Passt das Konzept überhaupt in Länge und Bilderzahl? (Länge: siehe oben, ja) |
| 2 | Maßstabsblatt montieren + Satz „NOT their size" einengen, Vergleich mit/ohne an 3 Szenen | **~2 $** | **Wirkt der Maßstab beim Alter?** Das ist die Kernfrage. |
| 3 | WizzelWim: ein Blatt, ein Satz, ein Eintrag in `heroes_found` | ~1 $ Kontrollbilder | Kommt er zuverlässig genau einmal vor? |
| 4 | Umkleide streichen, Blattwahl nach Jahreszeit (erst mit dem vorhandenen Winter-Set) | ~1–2 $ | Erkennst du die Figuren jetzt wieder? |
| 5 | Frühling/Sommer-Set bauen und kuratieren | 8–12 $ + deine Zeit | — (reine Umsetzung, keine offene Frage mehr) |

**Warum diese Reihenfolge:** Schritt 2 ist die einzige Stufe, die scheitern kann, ohne dass eine
Ersatzidee bereitsteht — sie gehört deshalb nach vorn, bevor Geld in die Bibliothek fließt.
Schritt 4 lässt sich mit dem **vorhandenen** Winter-Set testen (eine Winterszene reicht), also
bevor das neue Set existiert. Schritt 5 ist das Teuerste und beantwortet keine Frage mehr.

---

## 10. Was Matthias entscheiden muss

1. **Sommerblätter:** dieselben Menschen in anderer Kleidung (Empfehlung) oder ein zweites Ensemble?
2. **Tabelle Alter → Anteil der Erwachsenenhöhe** — Vorschlag steht in Abschnitt 5, ist aber eine
   Produktentscheidung und keine Messung.
3. **WizzelWims Design** — einmalig, gilt dann für alle.
4. Zählt Wim als sechste Figur mit (Empfehlung: ja, die Länge trägt es), oder soll er einen der
   fünf Heldenplätze belegen?
5. Ob die Spannweite von `heroes_x` als Gruppenbild-Warnung ins Panel soll (nur Messwert).
