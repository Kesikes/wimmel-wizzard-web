# Cowork-Auftrag: Figuren v4 – Gewinner aus dem Kontaktbogen einbauen

**Stand:** 26.10.2026 · **Entscheidung Matthias (Kontaktbogen Runde 2):** Grundfigur = **Fassung A+H** (Prompt wie `71582bb` plus Hautton, Kleidung frei), Lieblingsfarbe/Brille/Extra per **Edit** auf diese Grundfigur. A+H+F verworfen („top“ wird Mantel/Kleid, Figuren rücken zu nah). B/C (v3.x) verworfen: jedes Wort zu Körper/Kleidung streckt die Figur.
Grundlage für den Wortlaut: `dev-tools/figuren-kontaktbogen.js` (Fassungen „A+H“ und „Edit“, Runde 2). Ein Commit je Teil, Push macht Matthias. Browser-Rauchtest wie zuletzt.

## Teil A – Grundfigur-Prompt = A+H
- `charPromptFromChips()` / `chips.js`: Reihenfolge und Wortlaut exakt wie Fassung A+H im Kontaktbogen:
  `wmlstil, <rolle>[, age N], <hautton>, <haare inkl. frisur>[, <bart>], round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view`
- **Streichen:** `GRUNDFIGUR_EN` (weißes Shirt, Hose, Schuhe, „never longer“, „no glasses, no hat, no accessories“), `FIGUR_RAHMEN_EN` (85 %, Füße, Bodenschatten), Augenbrauen-Angabe beim Bart. Keine weiteren Wörter.
- Gilt auch für Figuren mit Notiz und für Tiere (Tiere: wie `71582bb`).

## Teil B – Edit (Stufe 2)
- Edit-Prompt wie Kontaktbogen „Edit“, ergänzt um Bäckchen (Befund: Mädchen s101 bekam rote Wangen):
  „Change ONLY the color of the upper garment to <farbe>. Keep its cut, the trousers/skirt, shoes, face, **the pink round cheeks, the dot eyes and the nose line**, hair, head size and body proportions exactly. …“ (Rest wie Kontaktbogen).
- Brille/Extra wie bisher im selben Edit, mit demselben „keep exactly“-Satz.
- „upper garment“ statt „t-shirt“, weil die Grundfigur jetzt freie Kleidung trägt (Jacke, Pulli, Bluse).

## Teil C – Prüfung
- Grundfigur: `single_ok` + `complete_ok` bleiben Pflicht (Frau s202 im Kontaktbogen war nur Kopf/Schultern → muss durchfallen). Stilfrage wie Fassung `2026-10-26a`.
- Edit: Stil „mittel“ wie in v3.2 bleibt.
- Kandidatenauswahl, Deckel (3 Grundfiguren + 3 Edits), „Edit auf derselben Grundfigur wiederholen“ aus v3.2 bleiben.

## Teil D – Szenen-Prompt
- `oberteilSatz()`: „wears a bright <farbe> upper garment“ statt „top/t-shirt“. Heldenbeschreibung aus dem fertigen Figurenblatt bleibt.

## Teil E – Version und Aufräumen
- Schlüssel **v5 / v5a**. In der Rückmeldung die Aufräum-Adresse nennen (v4-Einträge weg).

## Teil F – Arbeitsregel festhalten
- In `docs/entscheidungen.md` einen Eintrag „GÜLTIG seit 26.10.2026: Prompt-Änderungen an Figuren und Szenen nur nach Kontaktbogen (gleiche Seeds, eine Änderung je Spalte, Entscheidung nach Augenmaß durch Matthias)“, mit Verweis auf beide Kontaktbögen und den Befund „jedes Wort zu Körper/Kleidung streckt die Figur“.

## Rückmeldung
Commits, Prompt vorher/nachher (Mädchen, Frau, Opa), Rauchtest, Testanleitung mit den vier Figuren (Opa Blau/Hut, Frau Grün/Kopftuch, Mädchen Rot/Brille, Mädchen Gelb/Brille als Regal-Test: 0 Grundfiguren, 1 Edit).
