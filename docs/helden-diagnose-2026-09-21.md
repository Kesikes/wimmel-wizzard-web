# Helden fehlen oder kommen doppelt vor — Diagnose (21.09.2026)

Nur Befund und Vorschlag, **nichts umgebaut**. Grundlage: `docs/ref/sitzung.json` (Stand 20.09., 19:39,
Bilder 1–10) und die vier Sicherungen in `dev-tools/session-sicherung/`.

**Wichtige Einschränkung vorweg:** Die Szenen mit `[0,1,1]`, `[1,0,4]`, `[4,2,2]` sind **nicht** in
meinen Daten — sie sind nach dem 20.09. abends entstanden und liegen nur auf dem Server, den ich
von hier nicht erreiche. Alles unten ist aus 13 geprüften Kandidaten gerechnet. Das ist wenig; die
Zahlen zeigen eine Richtung, keinen Beweis. Nach einem `dev-tools/messen.sh <sessionId>` (holt die
Sitzung nach `docs/ref/sitzung.json`) rechne ich a) neu.

Helden in allen Bildern: A = Junge, 3 · B = Mädchen, 4 · C = Mann, 40.

## a) Wie oft gilt „jeder Held genau einmal"?

`heroes_found` gibt es erst ab Bild 4 (Bilder 1–3 und die Sicherungen haben nur `heroes_ok`,
das die Dopplung nachweislich nie erkannt hat — zählen also nicht).

| Kompositionstyp | Kandidaten | genau einmal | Anteil |
|---|---|---|---|
| open (Bilder 6–10, Berg) | 9 | 7 | 78 % |
| cutaway (Bilder 4–5, Testmodus) | 4 | 2 | 50 % |
| gridhouse, overview* | 0 | — | keine Daten |
| **gesamt** | **13** | **9** | **69 %** |

Ein Kandidat (Bild 7 K2) war ungeprüft und fehlt in der Tabelle.

Was in den 13 steckt:
- **6 fehlende Helden, 0 Dopplungen.** Die Dopplungen bis 4× sind neu — sie kommen nur in den
  Szenen nach dem 20.09. abends vor.
- **B (das Mädchen) fehlt 4 von 6 Mal.**
- Jede Szene hatte mindestens einen Kandidaten mit `[1,1,1]`. Trotzdem hat Bild 6 den Kandidaten
  mit `[0,0,1]` genommen: `heroes_found` ist nur „mittel" und zählt beim Gleichstand genauso viel
  wie ein Mund zu viel. Da hat die Auswahl einen richtigen Kandidaten weggeworfen.

## b) Wie verlässlich ist `heroes_found`?

**Nicht gemessen.** Der Stabilitätstest vom 19./20.09. kann es nicht messen: Variante A benutzt
eine erfundene Figur („Kind") ohne Referenzbild, die Heldenzählung darin ist also sinnlos.

Vorschlag, gleich aufgebaut wie beim Stabilitätstest:
1. **Wahrheit von dir.** Du zählst in 10–12 Kandidaten jeden Helden selbst und trägst ihn in
   `docs/ref/wahrheit.tsv` ein, z. B. `12 Berg K1  heroes_found  1,0,4`. Ausgewählt nach
   Möglichkeit: alle mit einem Wert ungleich 1 aus den letzten Szenen, dazu einige `[1,1,1]`.
2. **Mehrfach prüfen.** Neue Variante im Stabilitätswerkzeug: der Live-Prüfprompt mit den
   **echten** Helden (Namen und Referenzbilder aus der Sitzung), 3 Läufe je Kandidat. Zusätzlich,
   nur im Werkzeug: das Modell sagt für jeden Fund, **wo** es ihn gesehen hat („B: links unten am
   Zaun"). Dann kannst du eine Dopplung in Sekunden nachprüfen und wir sehen, ob eine „4" vier echte
   Kopien sind oder vier ähnliche Nebenfiguren.
3. **Auswerten je Held:** Kippt die Zahl zwischen den Läufen? Trifft sie deine Zählung? Getrennt
   nach „fälschlich fehlt" und „fälschlich doppelt".
4. **Entscheidungsregel, bevor gemessen wird:** schwer nur dann, wenn die Zählung in mindestens
   9 von 10 Fällen mit deiner übereinstimmt. Sonst kauft „schwer" dritte Kandidaten für
   Fehlalarme.

Kosten: Die Prüfung läuft über fal (OpenRouter-Router), also **braucht das deine Freigabe**.
12 Kandidaten × 3 Läufe = 36 Prüfaufrufe, bei 0,01 $ je Aufruf (belegt 23.09.2026; hier stand ursprünglich 0,02 $),
rund 0,70 $ (geschätzt, nicht gemessen). Keine Bildaufrufe. Voraussetzung: die Kandidaten-URLs
der letzten Szenen sind noch abrufbar.

## c) Vermutete Ursachen, nach Stärke der Belege

1. **Hintergrund-Blätter enthalten Doppelgänger der Helden — stärkster Verdacht für die Dopplungen.**
   Ich habe mir alle 13 bgchars-Blätter angesehen. Darin sind: ein Mädchen mit Zöpfen im
   **gepunkteten Kleid** (Blatt 8) — B ist „wavy blonde, light-colored polka-dot shirt" —, mehrere
   kleine blonde Jungen (Blätter 7, 9, 11) und mehrere Männer mit Bart (Blätter 2, 9). Der Prompt
   verlangt, 4–6 Figuren aus den Blättern *erkennbar* zu übernehmen. Treffen sie einen Helden,
   entsteht eine Figur, die das Bildmodell für den Helden hält — und die Prüfung auch, denn sie
   zählt nach „Frisur, Haarfarbe, wichtigstes Kleidungsstück". Das ist **keine Verwechslung der
   Reihenfolge**: Bild 1 Leinwand, 2–4 Helden, danach die Blätter, und der Prompt sagt das korrekt
   („NOT named heroes"). Es ist eine Ähnlichkeit im Inhalt.
2. **Zu allgemeine Beschreibung.** C ist nur „short, straight, brown hair and a beard" — **keine
   Kleidung**. Jeder bärtige Mann zählt. A und B sind bis auf das Hemdmuster gleich beschrieben
   („toddler … chibi proportions, large round head, short small body", beide blond). „toddler chibi"
   selbst ist nicht das Problem — es beschreibt die Proportionen, nicht die Person; zu wenig
   Unterscheidendes steht daneben. Passt zu `[1,0,4]` (C vierfach) und zu A↔B-Verwechslungen.
3. **Helden werden in die hintere Ebene gestellt — stärkster Verdacht fürs Fehlen.** Je Szene
   bekommt ein Held „well back in the scene, noticeably smaller" bzw. im Querschnitt „back or the
   top of the house". Von 13 so platzierten Held-Kandidat-Paaren fehlten **4 (31 %)**, von den 26
   übrigen **2 (8 %)**. Im Druck ist eine Hintergrundfigur rund 6 mm hoch. Entweder lässt das
   Bildmodell sie weg, oder die Prüfung übersieht sie — beides ist für ein Suchbuch dasselbe
   Problem.
4. **Position und Gewicht im Prompt.** Die Zuordnung Bild → Held steht bei 18–20 % des Prompts, die
   Handlungen bei 33–37 %, die Regel „genau einmal" erst bei 83 %. Und nur der **erste** Held
   bekommt den eigenen Satz „appears only once: if you have already drawn …" — B und C nicht. Der
   Junge steht 4-mal im Prompt, Mädchen und Mann je 2-mal. Nach unserer Regel „Position schlägt
   Wortlaut" ist das ungleich verteilt. Allein erklärt es aber nicht, warum gerade B fehlt.
5. **Querschnitt.** 2 von 4 richtig — zu wenig Daten, um zu sagen, ob es am Querschnitt liegt oder
   an Ursache 3 (B stand beide Male „oben/hinten im Haus").

Warum die Dopplungen erst jetzt auftauchen, kann ich ohne die neuen Daten nicht sagen. Seit Bild 10
geändert: Licht fest im Prompt (15b6051, Fassung 2026-09-20b) und der Richter (20c/20d). Das ist eine
Frage an die neuen Daten, keine Behauptung.

## d) Was kostet `heroes_found` auf „schwer"?

Ein dritter Kandidat kommt, wenn **kein** geprüfter Kandidat ohne schweren Verstoß ist. Er kostet
0,15 $ (Bild) plus eine Prüfung (0,01 $, belegt 23.09.2026 — hier stand 0,02 $) und kommt höchstens einmal je Szene.

Rechnung: p = Anteil Kandidaten mit Heldenfehler, dazu rund 10 % mit einem anderen schweren
Verstoß (2 von 19 geprüften in den Daten).

| p (Heldenfehler je Kandidat) | Anteil Szenen mit 3. Kandidat | Mehrkosten je Szene | je Buch (5 Bilder) | Szenen mit Held richtig: heute → mit schwer |
|---|---|---|---|---|
| 31 % (meine Daten) | 14 % | 0,01 $ | ~0,06 $ | 90 % → 97 % |
| 50 % | 30 % | ~0,05 $ | ~0,26 $ | 75 % → 88 % |
| 70 % („fast jedes Bild") | 53 % | ~0,09 $ | ~0,45 $ | 51 % → 66 % |

Die rechte Spalte setzt voraus, dass die Auswahl einen richtigen Kandidaten auch wirklich nimmt.
Die Zahlen stimmen nur, wenn `heroes_found` stimmt — deshalb zuerst b).

Zwei Dinge fallen dabei auf:
- **Umsonst zu haben:** Die Auswahl zwischen den zwei vorhandenen Kandidaten kann den Heldenfehler
  vor die übrigen mittleren Fehler stellen, ohne dass ein dritter Kandidat kommt. Das hätte Bild 6
  gerettet und kostet nichts. (Vorschlag, nicht umgesetzt.)
- **Bei 70 % hilft der dritte Kandidat wenig** (51 → 66 %). Ist die Fehlerrate so hoch, gehört das
  Geld in die Ursache (c1–c3), nicht in weitere Versuche.

## Empfohlene Reihenfolge

1. `messen.sh` → a) mit den neuen Szenen neu rechnen (kostenlos).
2. b) messen (~0,70 $, deine Freigabe).
3. Wenn die Zählung trägt: Heldenfehler in der Auswahl vorziehen (kostenlos), danach an c1–c3.
4. „schwer" erst, wenn die Fehlerrate durch 3. unter etwa ein Drittel gefallen ist.

---

# Nachtrag 21.09.2026: e) Maßnahmen und f) zweiter Schritt

Stand: Die Auswahl zieht Heldenfehler seit `b01ad36` (Fassung `2026-09-21a`) vor. Das rettet ein Bild
nur, wenn einer der beiden Kandidaten richtig ist. Die Trefferquote beim **Erzeugen** hebt es nicht.
Darum geht es hier.

## e) Was hebt die Trefferquote beim Erzeugen am meisten?

Die Fehler haben zwei Formen mit **verschiedenen Ursachen**. Deshalb getrennt:

| Fehlerform | wahrscheinlichste Ursache | Maßnahme |
|---|---|---|
| Held **fehlt** | er steht in der hinteren Ebene (31 % gegen 8 %) | e1 |
| Held **doppelt** | Doppelgänger in den bgchars-Blättern, zu allgemeine Beschreibung | e2, e3 |
| beides | Regel „genau einmal" nur für den ersten Helden, spät im Prompt | e4 |

### Reihenfolge, nach erwartetem Nutzen je Aufwand

**e1. Kein Held mehr in der hinteren Ebene.** `pickHeroPlacements()` verteilt drei Helden auf
vorne / Mitte / hinten, also steht in **jeder** Szene genau einer hinten. Vorschlag: nur noch vorne
und Mitte, hinten erst ab dem vierten Helden. Kostet nichts und kaum Promptlänge, trifft genau die
Form mit den meisten Belegen. Spannung zur Produktidee „Suchen gehört zum Spiel": Gesucht wird
weiter, weil die Helden verteilt und klein bleiben; nur ein 6-mm-Held ist im Druck nicht mehr zu
erkennen.

**e2. Doppelgänger aus den Blättern heraushalten: filtern, nicht entfernen.** Entfernen hilft nur
bei *unseren* Testhelden. Jede Kundin bringt andere Helden mit, und bei 13 Blättern mit rund 75
Figuren hat fast jeder Held irgendwo einen Doppelgänger (blonde Kleinkinder, bärtige Männer). Das
Filtern je Szene ist allgemein:
- einmalig je Bibliotheksfigur eine kurze Merkmalliste anlegen (Altersstufe, Haarfarbe, Haarlänge,
  Bart ja/nein, Hauptkleidung und Farbe). Ich lege sie an, du schaust drüber;
- beim Szenenstart fällt jedes Blatt weg, auf dem eine Figur einem Helden in **Altersstufe und
  Haarfarbe** gleicht (bei Männern zusätzlich Bart). Von 13 Blättern bleiben genug für 3–4 übrig;
  wenn nicht, werden es eben weniger Blätter.

Keine Laufzeitkosten, keine Promptlänge. Nachteil: ein Stück Pflege bei jedem neuen Blatt. Eine
reine Promptlösung („keine Bibliotheksfigur darf einem Helden gleichen") wäre billiger, geht aber
gegen den Promptrest von rund 1.500 Zeichen und wirkt erfahrungsgemäß schwächer als ein Bild, das
gar nicht erst mitgeschickt wird.

**e3. Schärfere Beschreibung, aus dem Figurenblatt statt aus dem Foto.** Die Szenenbeschreibung
eines Helden kommt aus der Fotobeschreibung (`describePhotoTraits()`: Haare plus **ein** Merkmal).
Deshalb steht beim Mann nur „kurze braune Haare, Bart", **ohne Kleidung**, obwohl er auf seinem
Figurenblatt eindeutig angezogen ist. Vorschlag: beim Fertigstellen einer Figur das **fertige
Figurenblatt** einmal beschreiben lassen (Kleidung, Farben, Schuhe; ein Prüfaufruf, 0,01 $ je
Figur, einmalig). Für die Kinder zusätzlich ein Unterscheidungssatz im Szenenprompt, wenn zwei
Helden in Altersstufe und Haarfarbe gleich sind: „the boy … and the girl … are two different
children: [Unterschied 1], [Unterschied 2]". Hebt vor allem die Verwechslung A↔B und die Dopplung
des Mannes. Ändert nichts an der Figur selbst, nur an ihrer Beschreibung.

**e4. „Genau einmal" für jeden Helden, an der richtigen Stelle.** Heute hat nur der erste Held
seinen eigenen Satz, und die Regel steht bei 83 % des Prompts. Dafür liegt der Zweig
`positions-test` bereit (Regel direkt hinter die Platzierung, Wortlaut unverändert). Ich ordne es
hinter e1–e3 ein, weil es die schwächsten Belege hat und Promptlänge kostet.

### Wie testen, ohne dass sich zwei Änderungen gegenseitig verdecken

Unsere Regel: eine Änderung je Test. Hier geht eine sinnvolle Ausnahme, weil e1 und e2 auf
**verschiedene** Fehlerformen zielen und die Heldenzählung beide getrennt ausweist: e1 muss die
Nullen senken, e2 die Zweier. Wirkt nur eins, sieht man welches. e3 danach einzeln, e4 zuletzt.

Je Test rund 8 Szenen mit 2 Kandidaten = 2,40 $ Bild plus Prüfung. Voraussetzung ist b): Stimmt
die Zählung nicht, messen wir mit einem Zollstock, der sich verbiegt.

## f) Option: Helden in einem zweiten Schritt einsetzen

**Machbar: ja.** Technisch ist es derselbe Weg wie der Stift auf dem Ergebnis-Screen:
`nano-banana-pro/edit` mit dem fertigen Bild als Bild 1, dazu die Figurenblätter und eine Anweisung
„setze diese Figuren an diese Stellen, ändere sonst nichts". Der Stift funktioniert laut
Durchsicht vom 19.09. in beiden Modi, das Grundmuster trägt also.

Zwei Spielarten:

| | F1: Szene ohne Helden, dann alle einsetzen | F2: nur reparieren |
|---|---|---|
| Ablauf | Szene ohne benannte Helden erzeugen, danach ein Aufruf, der alle Helden einsetzt | wie heute; nur wenn die Prüfung einen Helden vermisst, wird er eingesetzt |
| Mehrkosten je Szene | 0,15 $ je bearbeitetem Kandidat + neue Prüfung (0,01 $, belegt 23.09.). Nur beim gewählten: **+0,16 $**, bei beiden: **+0,32 $** | nur im Fehlerfall **+0,16 $** |
| heute je Szene zum Vergleich | 0,30 $ plus Prüfung | |
| Dauer | +1–2 Minuten | +1–2 Minuten im Fehlerfall |
| löst „fehlt" | ja | ja |
| löst „doppelt" | nur, wenn die Szene keine Doppelgänger enthält, also zusammen mit e2 | **nein**: entfernen hieße eine Stelle markieren, und wo die zweite Kopie steht, weiß der Code nicht zuverlässig |

**Risiken, nach Gewicht:**
1. **Das ganze Bild wird neu gezeichnet.** Das Modell malt kein Pflaster auf, es rechnet das Bild
   komplett neu. Alles, was wir mühsam eingestellt haben (flache Gesichter, keine Münder, kein
   Text, Licht), kann dabei wieder kippen. Die Prüfung muss nach dem Einsetzen **noch einmal**
   laufen, sonst tauschen wir einen bekannten Fehler gegen einen unbekannten.
2. **Falsche Größe.** Größe war schon im ersten Schritt unser häufigster mittlerer Fehler; beim
   Einsetzen fehlt dem Modell der ganze Massstabsteil des Prompts. Die Figurenblätter zeigen eine
   Person formatfüllend, genau das hat früher zu Riesenhelden geführt.
3. **Stilbruch am Helden.** Er kommt direkt vom Figurenblatt und kann schärfer, größer oder
   detaillierter wirken als seine Umgebung. Nahtstellen im Sinne sichtbarer Kanten erwarte ich
   dagegen kaum, gerade weil alles neu gerechnet wird.
4. **Handlung passt nicht.** Die Vignette war für den Helden gebaut; eingesetzt steht er daneben
   statt mittendrin.

**Einschätzung:** Kein erster Schritt. e1–e3 kosten zur Laufzeit nichts und greifen an der
Ursache; F1 kostet dauerhaft etwa 55 % mehr Bildgeld je Szene und bringt neue Risiken. Sinnvoll
als **F2-Rettungsnetz**, falls nach e1–e3 noch ein Rest fehlender Helden bleibt: Es kostet nur im
Fehlerfall, und „fehlt" ist genau die Form, die es lösen kann.

Wenn du es früh sehen willst: ein Werkzeugversuch ohne Produktcode, an 5 gespeicherten Kandidaten,
denen ein Held fehlt: je ein Einsetz-Aufruf plus Prüfung, rund 0,85 $. Braucht deine Freigabe.

---

# Nachtrag 2: neue Sitzung und deine Zählung (21.09.2026)

Neue Sitzung: 21 Bilder, 35 Kandidaten mit `heroes_found`. Deine Zählung: 12 Kandidaten der
Szenen 16–21 (alle Stadt, Querschnitt), eingetragen in `wahrheit.tsv`.

## a) neu, nach der gespeicherten Live-Zählung

| Typ | genau einmal (laut Prüfung) |
|---|---|
| open | 7 von 11 |
| cutaway | 7 von 24 |
| alle | 14 von 35 (40 %) |

Nach Fassung: `2026-09-20c` 4 von 12, `2026-09-20d` **0 von 6**. Diese Zahlen stehen aber auf der
Prüfung, und die ist unzuverlässig (nächster Abschnitt).

## Nach deiner Zählung

- **Genau einmal: 4 von 12.** Mit Kleidung wie auf dem Blatt (deine strenge Regel): **3 von 12**.
- **Das Problem ist Doppeln, nicht Fehlen:** in 36 Held-Plätzen 13-mal doppelt, 2-mal fehlend.
- **Am häufigsten doppelt ist der Mann C: 6 von 12.** Mädchen B 4, Junge A 3. Gefehlt hat nur A (2-mal).

## Wie gut war die Live-Prüfung? (ein Lauf je Kandidat, noch nicht die dreifache Messung)

- **22 von 36 Held-Plätzen stimmen (61 %).** Die Regel für „schwer" verlangt 90 %.
- Häufigster Fehler: **Die Prüfung meldet „fehlt", obwohl der Held genau einmal da ist: 6-mal**,
  fast immer beim Jungen A. In Kandidat 16 K1 meldete sie sogar alle drei als fehlend.
- 3 Dopplungen hat sie als „einmal" durchgelassen.
- `heroes_ok` passt in 6 von 12 Fällen zu deiner Kleidungsangabe. Das ist nicht besser als
  Münzwurf.

## Was das an meinem Bericht ändert

1. **e1 (hintere Ebene) verliert seinen Beleg.** Die 31 % gegen 8 % beruhten auf der Live-Zählung,
   und die meldet gerade beim Kind oft fälschlich „fehlt". Echtes Fehlen ist in deiner Zählung
   selten (2 von 36). e1 rückt nach hinten.
2. **e2 und e3 rücken nach vorne.** Das echte Problem ist Doppeln, und am stärksten beim Mann,
   dessen Beschreibung keine Kleidung enthält und für den es auf den Blättern mehrere bärtige
   Doppelgänger gibt.
3. **`heroes_found` bleibt mittel.** Mit 61 % würde „schwer" dritte Kandidaten für Fehlalarme
   kaufen. Die neue Auswahlstufe (`b01ad36`) hat in den Szenen 16–21 nichts verändert, weil dort
   beide Kandidaten jeweils einen Heldenfehler gemeldet bekamen. Ihr Nutzen hängt an einer
   besseren Zählung.
4. **Die Prüfung selbst ist jetzt eine eigene Baustelle**, gleichrangig mit dem Erzeugen.
