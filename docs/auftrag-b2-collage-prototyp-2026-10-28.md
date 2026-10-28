# Cowork-Auftrag B2: Collage-Prototyp (nur dev-tools, kein Produktcode)

**Stand:** 28.10.2026 · **Läuft nach C3.2 in derselben Sitzung** (nie parallel im Repo-Ordner).
**Ziel:** Mit eigenen Augen sehen, ob ein Wimmelbild aus **Hintergrund (KI) + per Code platzierten Figuren aus unserer Datenbank** wie EIN Bild wirkt – und ob das die Probleme „Held fehlt/doppelt“, „zu wenig Gewimmel“, „Stil der Figuren“ löst. Entscheidung danach durch Matthias nach Augenmaß (Kontaktbogen-Regel, `docs/entscheidungen.md` Abschnitt 18).
**Grundlage:** `docs/arbeitsplan-2026-10-25.md` Abschnitt 0b (Stil-Karte, Arbeitsteilung), Hand-Mock `dev-tools/collage-prototyp/input/hand-mock-gardasee.png` (nur ausgeschnitten + eingesetzt, Prinzip trägt).
Netz: Cowork erreicht fal nicht → Matthias startet im Terminal mit `FAL_KEY`. `TROCKEN=1` Pflicht. Ein Commit, Push macht Matthias.

## Eingaben (liegen in `dev-tools/collage-prototyp/input/`, bitte einchecken)
- `hintergrund-gardasee-gpt.png` – menschenleerer Hintergrund aus ChatGPT/GPT Image 2 (Promenade, Haus im Querschnitt, Steg, Wiese, Kiesstrand)
- `ortsfoto-haus-1.jpg`, `ortsfoto-haus-2.jpg` – zwei Fotos von Matthias' Haus (für den Ortsfoto-Arm)
- `hand-mock-gardasee.png` – Vergleich

## Werkzeug `dev-tools/collage-prototyp/collage.js`

**1. Hintergründe**
- H1: das vorhandene `hintergrund-gardasee-gpt.png` (keine Kosten).
- H2: **neu per `fal-ai`-Endpunkt `openai/gpt-image-2`** (Text→Bild): Bauernhof im Spätsommer, menschenleer, viel freie Fläche (Hof, Wiese, Weg), leicht von oben, Stil-Karte (Abschnitt 0b) als Text. Querformat 3:2.
- H3 (Ortsfoto-Arm): `openai/gpt-image-2/edit` mit den beiden Hausfotos: „Zeichne daraus einen menschenleeren Wimmelbild-Hintergrund…“ – Wortlaut siehe Chat 26.10. (im Werkzeug als Konstante hinterlegen: anthrazitfarbenes Haus, Holzlatten-Balkon, Wintergarten, Sonnensegel, Garage, großer Garten mit Sandkasten, Nachbarhäuser, ohne Menschen, Stil-Karte).
- Preise/Parameter aus der fal-Doku des Modells übernehmen, Kosten in der Ausgabe ausweisen.

**2. Figuren**
- **5 Helden** = Grundfiguren aus dem Regal (v5), Kurationsliste per `/api/admin?mode=chipfiguren` (Opa, Frau, Mädchen …); fehlende per heutigem Produkt-Prompt (Fassung A+H) erzeugen.
- **15–20 Nebenfiguren**: zufällige Chip-Kombinationen (Kinder/Erwachsene/Großeltern gemischt, Hautton/Haare gestreut), erzeugt mit dem Produkt-Prompt A+H, gleiche Einstellungen wie `char-job-engine.js`. Lieblingsfarbe per Edit wie in Stufe 2 (bunt gemischt).
- **2–3 Helden-Situationen** per `nano-banana-2/edit` auf dem Figurenblatt, z. B. „isst ein Eis, von der Seite“, „zeigt mit dem Arm auf den See“, „sitzt auf einer Bank“ – Gesicht/Kopf/Proportionen unverändert (Edit-Sätze wie Stufe 2). Eine Situation mit zwei Helden zusammen versuchen.
- Freistellen: weißen Hintergrund + grauen Bodenschatten entfernen (z. B. fal `birefnet` o. ä.; wenn einfacher: Farbschwelle wie im Hand-Mock), Kanten sauber.

**3. Platzieren (Code)**
- Je Hintergrund Zonen von Hand als Konstanten (Polygone/Rechtecke: Promenade, Wiese, Steg, Strand, Zimmer im Querschnitt) mit Tiefe 0–1.
- Figurengröße nach Tiefe (vorne groß, hinten klein; Maßstab je Hintergrund als Konstante), Füße auf der Zone, keine Überlappung > 20 %, Falzstreifen (Mitte ± 1 cm bei Druckmaß) frei von Helden, Helden auf beide Bildhälften verteilt, jeder genau einmal.
- Flacher Bodenschatten (Ellipse, harte Kante) unter jeder Figur.
- Ziel je Bild: 5 Helden + 15–20 Nebenfiguren (+ Situationen).

**4. Varianten je Hintergrund**
- **V1 roh:** nur Code-Collage.
- **V2 leicht eingebettet:** V1 durch `openai/gpt-image-2/edit` mit „Integriere die Figuren natürlich in die Szene (Bodenschatten, kleine Überschneidungen), ändere KEINE Figur in Gesicht, Kopfgröße, Kleidung oder Position, keine neuen Figuren“.
- **V3 leicht eingebettet (Alternative):** dasselbe mit `nano-banana-2/edit`.

**5. Ausgabe**
- Kontaktbogen `dev-tools/ausgabe/collage-<datum>.html`: je Hintergrund eine Zeile: Hintergrund | V1 | V2 | V3 | Hand-Mock (nur H1), Klick = Vollbild; darunter Liste der verwendeten Figuren, Kosten je Schritt und gesamt.
- JSON mit allen Positionen (wer wo, Größe) daneben – Grundlage für Rätsel und Helden-Prüfung später.
- Erwartete Kosten in `TROCKEN=1` vorab (Ziel: unter 5 $).

## Nicht Teil
Produktcode, Situationen-Katalog (B1, wartet auf die Gag-Durchsicht), Posen-Bibliothek, Stil-LoRA-Training.

## Rückmeldung
Commit, Aufrufbefehle, erwartete Kosten, offene Punkte (z. B. Freistellen-Qualität, Zonen-Pflege je Hintergrund).
