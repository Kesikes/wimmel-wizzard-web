# WizzelWim: Projektstand

**Stand:** 19.09.2026, abends
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

Cowork kann in seiner Umgebung weder pushen noch Dateien löschen. Scheitert ein Befehl an `.git/index.lock` oder `.git/HEAD.lock`, entfernt Matthias sie mit `rm`.

**Dokumente im Repo unter `docs/`:** `plan-bis-launch`, `konzept-konto-layout-druck`, `verify-kalibrierung-2026-09-17`, `kandidatenwahl-und-kriterien-2026-09-19`, `plan-nachtraege-2026-09-19`, `stilbruch-tests-2026-09-16`.

**Werkzeuge unter `dev-tools/`:** `session-retten.py` (gespeicherte Sitzungen finden und sichern), `gag-mix.js` (Gag-Mischung testen), `prompt-laenge.js`, `wertung-vergleich.js`.

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
| `mouths_of_ten` | Münder unter den 10 größten Gesichtern | max. 3 | mittel |
| `shaded_of_ten` | plastisch schattierte unter den 10 größten | max. 1 | mittel |
| `blank_of_ten` | leere Gesichter unter den 10 größten | 0 | mittel |
| `logic_ok` | Innen/Außen nicht vermischt | — | leicht |
| `no_text_ok` | kein Text im Bild | — | leicht |
| `notiz` | Freitext des Prüfmodells, nicht gewertet | — | — |

**Auswahl:** erst schwere Verstöße vergleichen, bei Gleichstand mittlere, dann leichte. **Dritter Versuch nur, wenn der beste Kandidat einen schweren Verstoß hat.** Harte Obergrenze: 3 Bildaufrufe je Szene.

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

**Testschalter:** `/app?phase=phase1&komposition=cutaway`. Gültige Werte: `open`, `cutaway`, `gridhouse`, `overview_cutaway`, `overview_open`. Beenden über den Knopf im Hinweis.

---

## 5. Kostenlage (belegt, 19.09.)

| Posten | Preis |
|---|---|
| `nano-banana-pro/edit` | **0,15 $** je Bild (nicht 0,30 $ — frühere Rechnungen waren doppelt zu hoch) |
| Szene mit 2 Kandidaten | 0,30 $ |
| Verify | Centbeträge |
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

- **Stil-Rückschritt nach `8ef4d85`:** Figuren sind jetzt zu flach, haben komische Nasen, treffen den Stil nicht. Verdacht: Der Umbau hat auch die Anweisung ans Bildmodell verschärft, nicht nur die Prüfung.
- **Der inhaltliche Kern dahinter, nie sauber getrennt:** Die **Figuren** sollen flach sein (Punktaugen, Nasenstrich, dicke Kontur). Das **Bild** als Ganzes nicht — es braucht Licht, Schatten und Atmosphäre. Referenzbild ist das Bauernhofbild vom 18.09.
- **Doppelte Helden:** Die Leinwand-Korrektur hat das Fehlen behoben, nicht die Dopplungen. `7901d2f` liegt bereit (Heldenregel weiter nach vorn), noch nicht gepusht.

### Bildqualität

- `cutaway` nachtesten (Maßstabsbruch behoben?)
- Offene Szenen enger führen, mit benannten Zonen
- Warum das Modell bei Gebäuden von selbst zum Querschnitt neigt

### Produkt (nach Phasenplan)

- Phase 0.2: Editiermodi systematisch (erledigt: Stift-Ausgang, „Detail antippen" entfernt, „Nochmal zaubern" ausgeblendet)
- Phase 0.3: Oberflächen zusammenführen — **Voraussetzung** für Bildersammlung und Kandidaten-Umschalter
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

**Live:** `93d1a9f` (Testmodus-Ausstieg), davor `8ef4d85` (Stil wird gezählt). Prompt-Fassung `2026-09-19g · f6a75742`.

**Liegt bereit, nicht gepusht:** `7901d2f` (Heldenregel weiter nach vorn), Fassung `2026-09-22a`.

**Prompt-Fassung prüfen:** In der App auf einem Bild „🔧 Test-Details anzeigen" öffnen, erste Zeile. Die Prüfsumme berechnet sich aus dem Quelltext und ändert sich bei jeder Prompt-Änderung von selbst.

---

## 10. Bekannte Stolpersteine

- **Sitzungen:** Nur auf **einem** Gerät gleichzeitig öffnen. Der Überschreibschutz beim Synchronisieren ist noch nicht gebaut. Einstieg über `/app?resume=<id>`.
- **Gesicherte Sitzungen** liegen unter `dev-tools/session-sicherung/`. Zum Auflisten: `python3 dev-tools/session-retten.py` mit gesetzten `KV_REST_API_URL` und `KV_REST_API_TOKEN` (Werte in Vercel unter Storage → Upstash → „Show secret").
- **Demo-Sitzung:** Manche Einstiege erzeugen eine Sitzung mit Beispieldaten (Mia, Papa, Oma Rosi) und Bildpfaden auf `assets/`. Das ist kein Datenverlust.
- **Guthaben bei fal.ai** vor größeren Testreihen aufladen, sonst bricht es mit „User is locked. Reason: TOP_UP" ab.
