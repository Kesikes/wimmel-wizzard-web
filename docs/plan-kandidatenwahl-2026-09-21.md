# Plan: Kandidatenwahl statt Feinschliff der Auswahl (21.09.2026)

**Nur Plan, nichts gebaut.** Rahmen des Nutzers: keine neuen Messreihen, keine neuen Testschalter,
bis die Kandidatenwahl steht.

Befund, der den Richtungswechsel trägt: In fast jeder Szene gibt es einen guten Kandidaten, aber die
automatische Auswahl trifft ihn oft nicht — Heldenzählung rund 70 %, gemini-Stilprüfung blind
(1 von 6 Stilbrüchen erkannt), Stil-Tor nur grobe Brüche, Richter rund 4 von 5.

Register (neu, Abschnitt 4): „Die automatische Auswahl bestimmt nur noch den Favoriten. Die
Entscheidung trifft die Kundin."

---

## 1. Grundstand: welche Schalter werden Standard?

| Schalter | Standard? | Begründung aus den Messungen |
|---|---|---|
| Licht | **ja** (ist es schon) | Lichttest 20.09.: mit Licht 10/10 Schatten, Gesichter flach. |
| Heldenbeschreibung aus dem Figurenblatt (`helden=neu`, Teil Beschreibung) | **ja** | Kleidung 12/12 richtig (vorher 3/12). Kosten einmalig rund 2 Cent je Figur. Umbau: die Beschreibung entsteht künftig beim **Fertigstellen der Figur** (charakter.js), nicht erst beim ersten Zaubern — dann kostet der erste Zauberlauf keine Zusatzzeit. Bestehende Figuren bekommen sie beim nächsten Zaubern wie heute. |
| Einmal-Satz je Held mit exklusivem Merkmal, Unterscheidungssatz Kinder | **ja** (hängt an der Beschreibung) | Keine eigene Messung. Dopplungen blieben ungefähr gleich (12 statt 13 in 36 Plätzen) — schadet nicht nachweisbar, hilft nicht nachweisbar. Er kostet nichts und passt zur Produktentscheidung; bleibt drin, bis etwas dagegen spricht. |
| Stil-Tor, Teil A (erste Frage) | **ja** | 0 Fehlalarme in allen Messungen, erkennt grobe Brüche (23 K2, 26 K2). Voraussetzung dafür, dass nur bestandene Kandidaten gezeigt werden. Rund 2 Cent je Kandidat. |
| Stil-Tor, Teil B (Kopfmessung) | **nein** (`STIL_TOR_KOPF_MESSEN = false`) | Trennt nicht (21g). Kostet einen zweiten Aufruf je Kandidat ohne Nutzen für die Kundin. |
| Richter | **ja, aber anders als heute** | Er bestimmt künftig **immer** den Favoriten (Abschnitt 2), nicht nur bei Gleichstand. Rund 4/5 Treffer. Kosten: zwei Aufrufe je Szene, rund 5–6 Cent. |
| Blattfilter | **nein** | Verdacht auf schwächeren Stil-Anker; die Szenen 22–27 liefen alle mit Filter und hatten 3 von 5 Stilbrüche. Kein sauberer Vergleich, aber auch kein Beleg für Nutzen: die Dopplungen blieben gleich. |
| `koepfe=gross` | **vorläufig ja** — mit einem Vorbehalt | Meine Kopie der Sitzung endet bei Szene 27; **Panels mit diesem Schalter habe ich nicht gesehen**. Für „ja" spricht: der Satz ist positiv, stimmt mit Referenz und Blättern überein, und die Produktentscheidung legt feine Proportionen ausdrücklich in den Bildprompt. Dagegen: ungemessen. Vorschlag ohne Messreihe: `TROCKEN=1 bash dev-tools/messen.sh <sessionId>` (kostenlos), ich schaue die Szenen mit „Köpfe GROSS" durch; zeigen sie keinen Rückschritt, wird er Standard. |

**Die Testschalter selbst** bleiben als Kontrollschalter erhalten (wie `licht=aus`), aber mit
umgekehrter Richtung: was Standard wird, bekommt einen AUS-Schalter. Keine neuen Schalter.

**Kosten je Szene mit diesem Grundstand** (2 Kandidaten): Bilder 0,30 $ + gemini-Prüfung +
Stil-Tor rund 4 Cent + Richter rund 5–6 Cent. Ein dritter Kandidat nur noch, wenn keiner das
Stil-Tor besteht (Abschnitt 2).

**Aufwand:** rund ½ Tag (Standards umdrehen, Beschreibung in die Figurenerstellung verlegen,
Register, Test).

---

## 2. Kandidatenwahl

Entscheidung steht in `kandidatenwahl-und-kriterien-2026-09-19.md` Abschnitt 2 und jetzt im
Register. Offene Punkte und Vorschlag:

**Favorit:** bestimmt nur noch der Richter. Neu: er läuft bei **jedem** Paar, das das Stil-Tor
besteht — nicht mehr nur bei Gleichstand der schweren Verstöße. Die Heldenzählung und die übrigen
gemini-Felder entscheiden die Reihenfolge nicht mehr.
- Richter **uneinig** (Reihenfolge-Effekt, bisher 1 von 10): Vorschlag — dann steht der Kandidat
  vorn, der zuerst fertig war (K1). Kein Rückfall auf die Heldenzählung, sonst käme sie durch die
  Hintertür zurück.
- Richter **gescheitert**: dasselbe.

**Nur bestandene Kandidaten werden gezeigt:**

| Fall | Vorschlag |
|---|---|
| beide bestehen | beide, umschaltbar, Richter-Favorit vorn, unbeschriftet |
| **genau einer** besteht | **nur dieser**, ohne Umschalter. Kein dritter Kandidat — sonst bezahlt jedes Bild mit einem Stilbruch einen weiteren Lauf, und die Kundin hat trotzdem ein brauchbares Bild. |
| **keiner** besteht | automatisch **ein** dritter Kandidat (wie heute). Besteht der, wird er gezeigt. Besteht auch er nicht: **kein Bild**, sondern der Hinweis „Das hat diesmal nicht geklappt" mit „Nochmal zaubern". **Offene Produktfrage an dich:** ist dieser neue Durchgang für die Kundin kostenlos? Er kostet uns rund 0,40 $. |
| Stil-Tor gescheitert (kein Urteil) | Kandidat gilt als bestanden — ein technischer Fehler darf der Kundin kein Bild wegnehmen. |

**Dritter Kandidat:** Vorschlag — nur noch, wenn **keiner** das Stil-Tor besteht. Die bisherigen
schweren gemini-Felder (Tiefe, Figurengröße) lösen dann keinen dritten Lauf mehr aus. Das spart
Geld und folgt der Produktentscheidung (Stil und Helden sind die Ausschlusskriterien, nicht die
Figurengröße). Bitte bestätigen.

**Wechseln bis zum Kauf, danach fest; Protokoll der Wahl** — wie im Register. Das Datenmodell
trägt es schon (`candidates` hängt am Bild); neu ist ein Feld `gewaehlt` und `gewaehltAm`.

**Lebensdauer der fal-Dateien:** 90 Tage (seit dem Lifecycle-Header). Für „Wechseln bis zum Kauf"
reicht das; für Nachdrucke nicht — das gehört in Phase 2 (eigene Bildauslieferung).

**Ist die Zusammenführung der Oberflächen erledigt? Nein.** Der Ergebnis-Screen existiert weiter
doppelt: `Screens.ergebnis.render()` (mobil) und `buildDesktopErgebnis()` (Desktop). Ich habe den
„Nicht bestanden"-Hinweis am 21.09. noch an beiden Stellen einbauen müssen. Phase 0.3 ist damit
**der erste Schritt** der Kandidatenwahl.

**Aufwand:** Zusammenführung rund 1 Tag; Kandidatenwahl selbst rund 1 Tag (Umschalter,
Favorit-Logik im Server, Anzeige nur bestandener, Fälle „einer/keiner", Sperre nach Kauf,
Protokoll).

---

## 3. Hinweis in der App

Vorschlag Wortlaut (kurz, ohne Technikwörter):

> „Die Bilder malt eine KI. Sie macht manchmal kleine Fehler — zum Beispiel ist eine Figur doppelt
> da. Mit dem Stift kannst du solche Stellen einfach korrigieren."

Ort: **einmal** unter dem Bild auf dem Ergebnis-Screen, direkt über dem Stift-Knopf — dort, wo die
Kundin den Fehler sieht und die Lösung gleich daneben hat. Nicht beim Umschalten, dort lenkt er vom
Vergleichen ab. Der bisherige gelbe Warnkasten („Bitte einmal gegenchecken") entfällt laut
Register-Entscheidung 19.09.; der Hinweis ersetzt ihn.

**Aufwand:** rund 1 Stunde (nach der Zusammenführung nur an einer Stelle).

---

## 4. Stift am Handy

Heute: ein Canvas in Bildschirmauflösung, ein Finger malt, **kein Zoom, kein Rückgängig**; ein
zweiter Finger malt einfach mit (es wird immer `touches[0]` genommen).

Vorschlag:
- **Querformat-Hinweis**, sobald der Stift an ist und das Handy hochkant gehalten wird. Nur ein
  Hinweis, kein Zwang — iOS Safari lässt die Ausrichtung ohnehin nicht festlegen.
- **Zwei Finger: zoomen und verschieben**, ein Finger: malen. Umsetzung über eine gemeinsame
  Transformation von Bild und Malfläche; die Striche werden in **Bildkoordinaten** gespeichert,
  nicht in Bildschirmpixeln — sonst passt die Markierung nach dem Zoomen nicht mehr zum Bild.
- **Setzt ein zweiter Finger auf, wird der angefangene Strich verworfen.** Dazu werden Striche
  erst beim Loslassen endgültig; bis dahin sind sie vorläufig.
- **Rückgängig** (letzter Strich) und das vorhandene „Markierung löschen" (alle).
- Zoom zurücksetzen per Doppeltipp mit zwei Fingern oder Knopf „ganzes Bild".

**Braucht es einen Umschalter „Malen / Verschieben"?** Vorschlag: **nein, zunächst nicht.** Mit
„ein Finger malt, zwei Finger bewegen" und dem Verwerfen des angefangenen Strichs ist der
häufigste Fehler abgedeckt. Ein Umschalter ist ein Bedienschritt mehr, den viele übersehen. Er
kommt, wenn dein Handytest zeigt, dass beim Verschieben mit zwei Fingern trotzdem Striche
entstehen.

**Aufwand:** rund 1–1,5 Tage, plus dein Test am echten Handy (Berührungsgesten lassen sich hier
nur nachgebildet prüfen).

---

## 5. Thema und Kompositionstyp

Heute (`pickComposition()` + `THEME_META.type`):

| Thema | Typ | Phase 1 | Phase 2 |
|---|---|---|---|
| Bauernhof | landscape | open | overview_open |
| Weihnachten | cutaway | cutaway, gridhouse (~¼) | overview_cutaway |
| Urlaub (Strand) | landscape | open | overview_open |
| Berg | landscape | open | overview_open |
| Stadt | landscape | open | overview_open |
| Spielplatz | landscape | open | overview_open |
| frei erzählt (Chat) | vom Modell: „cutaway" bei Innenräumen, sonst „landscape" | wie oben je Typ | wie oben je Typ |

**Vorschlag zur Entscheidung** (deine Tabelle, ✓ = erlaubt):

| Thema | open | overview_open | cutaway | gridhouse | overview_cutaway |
|---|---|---|---|---|---|
| Bauernhof | ✓ | ✓ | — | — | ? (Bauernhaus aufgeschnitten + Hof — neu, nur wenn du willst) |
| Weihnachten | — | — | ✓ | ✓ | ✓ |
| Urlaub | ✓ | ✓ | — | — | — |
| Berg | ✓ | ✓ | **nie** | **nie** | **nie** |
| Stadt | ✓ | ✓ | **nie** | **nie** | **nie** |
| Spielplatz | ✓ | ✓ | — | — | — |

**Kann heute im normalen Betrieb eine unpassende Kombination entstehen?**
- Mit den festen Themen: **nein.** Berg und Stadt sind „landscape" und bekommen nie einen
  Querschnitt. Die Stadt-Querschnitte in deinen Testszenen kamen vom Testschalter
  `?komposition=cutaway`, der im Speicher bleibt, bis er beendet wird.
- Über den **Chat-Weg: ja, grundsätzlich.** Dort setzt das Sprachmodell den Typ. Die Anweisung
  nennt Stadt und Berge ausdrücklich „landscape", Innenräume „cutaway" — eine Geschichte „im Café
  in der Stadt" wird damit aber zu Recht ein Querschnitt. Wenn „Stadt nie als Querschnitt" auch
  dort gelten soll, braucht es eine Regel im Code, nicht nur im Prompt.

**Aufwand:** rund 1 Stunde, sobald du die Tabelle entschieden hast.

---

## Reihenfolge und Aufwand

| # | Schritt | Aufwand | warum hier |
|---|---|---|---|
| 1 | Grundstand (Abschnitt 1) + Thema-Tabelle (Abschnitt 5) | ½ Tag + 1 h | klein, legt fest, was die Kandidaten überhaupt erzeugt; beides unabhängig von der Oberfläche |
| 2 | Ergebnis-Screen zusammenführen (Phase 0.3) | 1 Tag | Voraussetzung, sonst alles doppelt |
| 3 | Kandidatenwahl + Hinweistext | 1 Tag + 1 h | Kern des Richtungswechsels |
| 4 | Stift am Handy | 1–1,5 Tage + dein Handytest | braucht den zusammengeführten Screen, sonst doppelt |

Zusammen rund 4 Arbeitstage. Vor Schritt 1 brauche ich von dir: die Thema-Tabelle, die Antwort zu
`koepfe=gross` (oder die frische Sitzung zum Durchsehen), die Antwort zum kostenlosen neuen
Durchgang im Fall „keiner besteht" und die Bestätigung zum dritten Kandidaten.
