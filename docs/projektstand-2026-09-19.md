# WizzelWim: Projektstand

**Stand:** 19.09.2026, abends · **technisch nachgezogen am 20.09.2026** (siehe `entscheidungen.md`)
**Zweck:** Nachschlagewerk und Einstieg für neue Sitzungen. Ergänzt `plan-bis-launch-2026-09-19.md` und `konzept-konto-layout-druck.md`.

---

## 1. Technik und Arbeitsweise

- **Repo:** github.com/Kesikes/wimmel-wizzard-web, Branch `main`. Lokal: `/Users/matthias/Developer/wimmel-wizzard-web`
- **App-Ordner:** `wimmel-wizard-v3/` (nur dieser wird deployt)
- **Live:** https://wimmel-wizard-v3.vercel.app, Vercel-Projekt `wimmel-wizard-v3`, Tarif Hobby
- **Datenbank:** Upstash Redis `upstash-kv-cerulean-arrow` — Warteschlange (Jobs, 1 h) und Session-Speicher (90 Tage)
- **Bildmodelle über fal.ai:** Figuren über Flux mit `wmlstil`-LoRA, Szenen über `nano-banana-pro/edit`, Prüfung über Vision

**Arbeitsteilung:** Cowork committet, Matthias pusht im Terminal:

```
cd /Users/matthias/Developer/wimmel-wizzard-web
git log origin/main..HEAD --oneline
git push
```

Cowork kann in seiner Umgebung nicht pushen. Löschen im verbundenen Ordner ist seit dem 19.09. freigegeben — Lock-Dateien (`.git/index.lock`, `.git/HEAD.lock`) räumt Cowork selbst weg.

**Dokumente im Repo unter `docs/`:** `entscheidungen` (**das Register — was GILT; bei Widerspruch geht es vor**), `projektstand`, `plan-bis-launch`, `konzept-konto-layout-druck`, `verify-kalibrierung-2026-09-17`, `kandidatenwahl-und-kriterien-2026-09-19`, `plan-nachtraege-2026-09-19`, `stilbruch-tests-2026-09-16`, `testgeschichte-freitext`.

**Werkzeuge unter `dev-tools/`:** `session-retten.py` (gespeicherte Sitzungen finden und sichern), `gag-mix.js`, `prompt-laenge.js`, `wertung-vergleich.js` (beide Kopien der Wertungslogik gegeneinander), `stil-nachmessen.js` (Stilwerte an fertigen Bildern, nur Prüfaufrufe), `messen.sh` + `_messen-tabelle.js` (alle Kandidaten einer Sitzung messen), `auswertung.js` (heute gemessen gegen damals gespeichert, plus Begründung der Auswahl), `stabilitaet.sh` + `_stabilitaet-lauf.js`/`_stabilitaet-tabelle.js`/`_stabilitaet-claude.js` (vier Prüfvarianten gegeneinander), `paare-bauen.js` (Blindtest-Seite), `kosten.js` (Token in Dollar).

---

## 2. Die wichtigste Erkenntnis

**Wo sich etwas messen lässt, lässt man das Modell zählen und entscheidet im Code.**

Ein Vision-Modell ist gut darin, einen benannten Defekt zu finden, sobald er als Zahl formuliert ist — und schlecht darin, ein Gesamturteil zu fällen. Sechsmal hat dieselbe Umstellung geholfen: Dichte, Tiefe, Figurengröße, doppelte Helden, Münder und Stil.

**Zweite Erkenntnis:** Nicht der Wortlaut einer Regel entscheidet, sondern **wo sie im Prompt steht**. Mehrfach lag der Fehler nicht in der Formulierung, sondern darin, dass tausende Zeichen davor etwas Gegenteiliges nahelegten.

**Dritte Erkenntnis:** Anweisung und Prüfung dürfen bewusst auseinanderlaufen — streng in der Anweisung ans Bildmodell, nachsichtiger in der Prüfung. Das Modell überschreitet Vorgaben ohnehin.

---

## 3. Prüfkriterien und Schwellen (Stand 19.09.)

| Feld | Art | Schwelle | Gewicht |
|---|---|---|---|
| `heroes_found` | Zahl je Held | genau 1 | vorläufig mittel |
| `heroes_ok` | Ähnlichkeit der vorhandenen | — | schwer |
| `scale_est` | wie oft passt die größte Figur in die Bildhöhe | `SCALE_MIN_FIT` 2,8 | schwer, wenn Tiefe fehlt; sonst mittel |
| `depth_ratio` | größte zu kleinste Figur | `DEPTH_MIN_RATIO` 1,8 | schwer; im Querschnitt `null` |
| `figures_est` | geschätzte Zahl MENSCHLICHER Figuren | Phase 1: 55–130, Phase 2: 40–95 | mittel |
| `heads_ok` | Kopfgrößen innerhalb einer Tiefenebene | — | mittel |
| `mouths_of_ten` | Münder unter den 10 größten Gesichtern | max. 3 | mittel |
| `shaded_of_ten` | plastisch schattierte unter den 10 größten | max. 1 | mittel |
| `blank_of_ten` | leere Gesichter unter den 10 größten | 0 | mittel |
| `logic_ok` | Innen/Außen nicht vermischt | — | leicht |
| `no_text_ok` | kein Text im Bild | — | leicht |
| `notiz` | Freitext des Prüfmodells, nicht gewertet | — | — |

**Auswahl (seit 20.09. dreistufig):** zuerst geprüfte Kandidaten ohne schweren Verstoß, dann **ungeprüfte**, zuletzt geprüfte mit schwerem Verstoß. Innerhalb der ersten und dritten Gruppe stufenweise: erst schwere Verstöße, bei Gleichstand mittlere, dann leichte.

**Ungeprüft** ist ein Kandidat, dessen Prüfaufruf zweimal gescheitert ist (Ausnahme *oder* unlesbare Antwort). Wiederholt wird einmal — ein Prüfaufruf, kein Bildaufruf. Ungeprüft verliert nicht automatisch und gewinnt nicht automatisch.

**Dritter Versuch nur, wenn der beste Kandidat einen schweren Verstoß hat** — und seit 20.09. nur dann, wenn überhaupt ein Kandidat geprüft werden konnte. Harte Obergrenze: 3 Bildaufrufe je Szene.

**Bewusst nicht kalibriert:** Die Skala des Modells schwankt bei hoher Dichte um 20–30 %. Unter etwa 40 geschätzten Figuren ist der Wert stabil. Untergrenzen dürfen knapp sitzen, Obergrenzen brauchen Luft.

---

## 4. Kompositionstypen

| Typ | Aufbau | Stand |
|---|---|---|
| `open` | offene Szene mit Tiefe | funktioniert, aber am wenigsten strukturiert und damit am unsaubersten |
| `cutaway` | Haus im Querschnitt | Maßstabsbruch zuletzt behoben, noch nicht nachgetestet |
| `gridhouse` | Setzkasten mit ≥10 Räumen | funktioniert |
| `overview_open` | Phase 2, Blick von oben aufs Gelände | funktioniert |
| `overview_cutaway` | Phase 2, Haus plus Umgebung | **bestes Ergebnis** (0 Verstöße) |

**Auffälliger Zusammenhang:** Je stärker ein Typ strukturiert ist, desto besser das Ergebnis. Konsequenz für später: offene Szenen nicht freier, sondern enger führen, etwa mit benannten Zonen.

**Testschalter:** `/app?phase=phase1&komposition=cutaway&licht=an`. Gültige Werte: Komposition `open`, `cutaway`, `gridhouse`, `overview_cutaway`, `overview_open`; Licht `an`. **Ein leerer Wert bei EINEM der drei beendet den Testmodus ganz** (`/app?phase=` löscht auch Komposition und Licht), ebenso der Knopf „Testmodus beenden" im Hinweis.

---

## 5. Kostenlage (belegt, 19.09.)

| Posten | Preis |
|---|---|
| `nano-banana-pro/edit` | **0,15 $** je Bild (nicht 0,30 $ — frühere Rechnungen waren doppelt zu hoch) |
| Szene mit 2 Kandidaten | 0,30 $ |
| Verify | **nicht gemessen** — steckt zusammen mit der Figurengenerierung in den 29 $ Differenz zwischen 103,86 $ gesamt und 74,85 $ Bildkosten. Wer damit rechnet, rechnet mit einer Annahme. |
| Stift-Korrektur | jede angewendete Korrektur ist ein volles Bild |

Verbrauch bis 19.09.: 103,86 $ gesamt, davon ein erheblicher Teil durch den Wettlauf-Fehler (bis zu zehn Aufrufe je Szene statt zwei).

**Session-Kosten nach heutigem Stand:** Poster ca. 0,45 $, kleines Buch (3 Bilder) ca. 1,35 $, großes Buch (5 Bilder) ca. 2,10 $, jeweils plus Figuren.

---

## 6. Produktentscheidungen

- **Launch-Umfang:** Poster oder gerahmtes Bild 30 × 60 cm (1 Bild), Softcover-Buch 15 × 15 cm mit 3 Bildern (12 Innenseiten) oder 5 Bildern (16 Innenseiten). Nur ungerade Bildzahlen gehen auf.
- **Jedes Wimmelbild läuft über eine Doppelseite** (296 × 148 mm).
- **Bezahlmodell:** kostenlos starten ohne Konto (bis 5 Figuren, 1 Szene), danach Konto und 5 € Guthaben, vollständig auf den Produktpreis angerechnet.
- **Verworfene Bilder** zählen nicht gegen das Kontingent und bleiben im Papierkorb wiederherstellbar.
- **Kandidatenwahl:** Die Nutzerin wählt zwischen den erzeugten Kandidaten, umschaltbar statt nebeneinander. Favorit vorn, aber unbeschriftet. Wechseln bis zum Kauf, danach fest. Wird gebaut, nachdem die Oberflächen zusammengeführt sind.
- **Bibliothek (bgchars) bleibt, und sie erfüllt ZWEI Zwecke.** Entstanden in zwei Schritten am 18.09.:
  1. Zuerst wurde der Anspruch „einzelne Figuren wiedererkennen" aufgegeben, weil Cowork ihn bei der Figurengröße für aussichtslos hielt. Die Blätter dienten nur noch als **Stil-Anker**: Maßstab dafür, wie sorgfältig Nebenfiguren gezeichnet sein sollen. Das ist der Teil, der die sichtbare Verbesserung gebracht hat — seitdem haben Nebenfiguren eigene Frisuren, Kleidung und Farben statt grauer Füllmasse.
  2. Auf Matthias' Wunsch danach **wieder erweitert**. Cowork rechnete nach und korrigierte sich: Vordergrundfiguren sind im Druck 18,5 mm hoch, Mittelgrund 10,6 mm, erst im Hintergrund (5,9 mm) trägt nichts mehr. Seitdem gilt: **4 bis 6 Figuren erkennbar von den Blättern übernehmen, alle im Mittelgrund**, erkennbar an Silhouette, Haaren und Farbkombination — nicht an Brillen, Knöpfen oder Mustern. Alle übrigen Nebenfiguren werden im selben Stil frei erfunden.
  **Aktueller Stand: beides ist im Prompt.** Matthias erkennt die 4–6 Figuren in der Praxis aber selten wieder. Zwei wahrscheinliche Gründe: Die Blätter zeigen überwiegend Winter- und Stadtfiguren und müssen für jede Szene komplett neu eingekleidet werden (übrig bleiben nur Frisur und Farben), und es gibt **kein Prüfkriterium** dafür — niemand misst, ob die Anweisung wirkt.
  **Offene Option:** thematische Sets erzeugen (Bauernhof, Strand, Weihnachten). Dann müsste nichts umgezogen werden und die Figuren blieben wiedererkennbar. Cowork hat eine Kostenschätzung dafür angeboten, sie wurde noch nicht eingeholt.
- **fal-Bilder:** Aufbewahrung auf 90 Tage gesetzt. Spätestens beim Kauf muss die Druckdatei in eigenen Speicher.

---

## 7. Messreihe Kandidatenwahl

| # | Thema / Typ | Ergebnis |
|---|---|---|
| 1 | Weihnachten / gridhouse | Treffer |
| 2 | Urlaub / overview_open | Treffer |
| 3 | Weihnachten / overview_cutaway | Treffer, 0 Verstöße |
| 4 | Stadt / open | **Fehlschlag** — App wählte den flachen Querschnitt statt der Szene mit Tiefe |
| 5 | Stadt / open | Treffer bei der Auswahl, aber beide Kandidaten unbrauchbar (Münder, Stil daneben) |

**Lehre aus Zeile 5:** „Treffer" heißt nicht „gutes Bild". Die Auswahl zwischen zwei Kandidaten kann stimmen und das Ergebnis trotzdem unbrauchbar sein.

---

## 8. Aktuell offen

### Dringend

- **Stil-Rückschritt: die Ursache ist gefunden, und sie ist NICHT `8ef4d85`.** Der frühere Verdacht („der Umbau hat auch die Anweisung ans Bildmodell verschärft") ist am 19.09. deterministisch widerlegt: die Prüfsumme über die Bildprompt-Erzeuger ist vor und nach `8ef4d85` identisch (`2b5d392c`), einzige Abweichung liegt in `buildVerifyPrompt`. An dem Text, der zur Bilderzeugung geht, hat sich kein Zeichen geändert.
  **Die tatsächliche Ursache** ist der Abspann in `sceneComposeInstruction()`: er verlangte, dass nichts „shaded, gradient, or softly airbrushed" gezeichnet wird, mit dem Zusatz „across the entire image" — gemeint waren die Figuren, dastehen tat es fürs ganze Bild, und zwar an der stärksten Stelle überhaupt, ganz am Prompt-Ende. Am 20.09. auf die Figuren begrenzt.
- **Der inhaltliche Kern dahinter:** Die **Figuren** sollen flach sein (Punktaugen, Nasenstrich, dicke Kontur). Das **Bild** als Ganzes nicht — es braucht Licht, Schatten und Atmosphäre. Referenzbild ist das Bauernhofbild vom 18.09. Steht seit 20.09. als Abschnitt 11 im Register. Die positive Hälfte (Licht ausdrücklich verlangen) sitzt weiter hinter `/app?licht=an` und ist erst jetzt überhaupt testbar — vorher hob der Abspann sie auf.
- **Doppelte Helden:** Die Leinwand-Korrektur hat das Fehlen behoben, nicht die Dopplungen. Der Positions-Test liegt auf dem Zweig **`positions-test`** (`7901d2f`) und bewusst **nicht** auf `main`; auf `main` steht `allCharactersRule()` weiter am Prompt-Ende.
- **Freitext-Weg, Aufnahme:** Das Transkript landet als EIN Eintrag in `sceneUserSituations`, danach füllt `autoSituations()` mit 19 Bibliotheks-Vignetten auf. Die erzählte Geschichte ist damit eine Vignette unter zwanzig. Muss wie im Chat in eine Liste zerlegt werden. Siehe `testgeschichte-freitext.md`.

### Bildqualität

- `cutaway` nachtesten (Maßstabsbruch behoben?)
- Offene Szenen enger führen, mit benannten Zonen
- Warum das Modell bei Gebäuden von selbst zum Querschnitt neigt

### Produkt (nach Phasenplan)

- Phase 0.1: **abgeschlossen** (alle Kompositionstypen durch)
- Phase 0.2: Editiermodi systematisch (erledigt: Stift-Ausgang, „Detail antippen" entfernt, „Nochmal zaubern" ausgeblendet)
- Phase 0.3: Oberflächen zusammenführen — **Voraussetzung** für Bildersammlung und Kandidaten-Umschalter. Die offene Frage aus dem Plan ist beantwortet: es sind **zwei getrennte Darstellungen** (`Screens.ergebnis.render()` mobil, `buildDesktopErgebnis()` Desktop). Genau daher kamen das 0-Pixel-Bild und der nur mobil nachgezogene Warnkasten.
- Phase 0.5: Freitext-Weg testen — Geschichte und Prüfpunkte liegen in `testgeschichte-freitext.md`
- Phase 1: Produktlogik, Buchvorschau, Textbox im Bild
- Phase 2: Druckdatei-Paket (2:1-Beschnitt, 300 dpi, Falzregel), Wasserzeichen und eigene Bildauslieferung
- Phase 3: Konto und Guthaben
- Phase 4: Erzähl-Einstieg mit Helden-Vorschlägen, WizzelWim-Easter-Egg

### Entscheidungen, die noch bei Matthias liegen

1. Verfällt das Guthaben, und nach welcher Frist? (Gutscheinrecht)
2. Wie viele Korrekturen sind nach dem Aufladen frei?
3. Rückerstattung bei Nichtgefallen?
4. Gerahmtes Bild: eigener Lieferant oder über die Druckerei?

---

## 9. Commit-Stand

**Stand 20.09.2026.** Seit `93d1a9f` sind unter anderem dazugekommen: Namens-Leck behoben, Bild- und Prüf-Fassung getrennt, Lichtschalter, „ungeprüft" statt schlechtester Kandidat, Geltungsbereich des Stil-Abspanns korrigiert. Der jeweils aktuelle Stand steht in `git log`, nicht hier — diese Zeile veraltet sonst wieder.

**Zwei Fassungen statt einer, seit 19.09.:** `BILD_FASSUNG` (Bildprompt) und `PRUEF_FASSUNG` (Prüfprompt und Schwellen). Eine geänderte Prüf-Fassung heißt **nicht**, dass sich der Bildprompt geändert hat — genau dieser Fehlschluss hat am 19.09. eine halbe Stunde gekostet.

**Nicht auf `main`:** Zweig `positions-test` (`7901d2f`, Fassung `2026-09-22a`), der Positions-Test für die Dopplungsregel.

**Prompt-Fassung prüfen:** In der App auf einem Bild „🔧 Test-Details anzeigen" öffnen. Dort stehen Bild- und Prüf-Fassung getrennt, und zwar die **am Bild gespeicherten** — nicht die des gerade geladenen Codes.

---

## 10. Bekannte Stolpersteine

- **Sitzungen:** Nur auf **einem** Gerät gleichzeitig öffnen. Der Überschreibschutz beim Synchronisieren ist noch nicht gebaut. Einstieg über `/app?resume=<id>`.
- **Gesicherte Sitzungen** liegen unter `dev-tools/session-sicherung/`. Zum Auflisten: `python3 dev-tools/session-retten.py` mit gesetzten `KV_REST_API_URL` und `KV_REST_API_TOKEN` (Werte in Vercel unter Storage → Upstash → „Show secret").
- **Demo-Sitzung:** Manche Einstiege erzeugen eine Sitzung mit Beispieldaten (Mia, Papa, Oma Rosi) und Bildpfaden auf `assets/`. Das ist kein Datenverlust.
- **Guthaben bei fal.ai** vor größeren Testreihen aufladen, sonst bricht es mit „User is locked. Reason: TOP_UP" ab.
