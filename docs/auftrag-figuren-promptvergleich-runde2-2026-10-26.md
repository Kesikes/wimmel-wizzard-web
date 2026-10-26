# Cowork-Auftrag: Figuren-Prompt-Vergleich Runde 2 – auf Fassung A aufbauen

**Stand:** 26.10.2026 · **Ergebnis Runde 1 (Matthias):** Fassung A (Stand `71582bb`) gewinnt bei allen drei Personen klar – großer runder Kopf, kurzer Körper, Bäckchen. B und C erzeugen lange Comic-Körper. Befund: jedes zusätzliche Wort über Körper/Kleidung streckt die Figur.
**A fehlt aber:** Hautton (Frau kam hell statt dunkel) und Lieblingsfarbe (Kleidung frei).

**Nur `dev-tools/figuren-kontaktbogen.js` erweitern, kein Produktcode.** Ein Commit, Push macht Matthias.

## Fassungen Runde 2 (je EINE Änderung gegenüber A, gleiche Seeds 101/202, gleiche Einstellungen)

- **A** – unverändert wie Runde 1 (Kontrollspalte).
- **A+H** – A plus Hautton direkt hinter Rolle/Alter: `wmlstil, woman, dark skin tone, …` (Begriffe aus `CHIPS.hauttonEn`). Sonst Wort für Wort A.
- **A+H+F** – A+H plus EIN kurzes Farbwort für das Oberteil, ohne Hose/Schuhe/Schnitt: `…, <haare>, <bart>, red top, round head, …` (Farbe direkt vor dem Stilblock, nur zwei Wörter).
- **A+H → Edit** – das Bild aus A+H (gleicher Seed, nicht neu erzeugen, aus der Spalte A+H übernehmen) per `nano-banana-2/edit` mit dem heutigen Edit-Prompt aus `ausstattung-engine.js`, aber: „Change ONLY the color of the upper garment to <farbe> …; keep its cut, the trousers/skirt, shoes, face, hair, head size and body proportions exactly.“ Keine Prüfung.

Personen wie Runde 1 (Mädchen Rot, Frau Grün, Opa Blau). Bart beim Opa wie in A (`full gray/white beard`), **keine** Augenbrauen-Angabe (Soll hat keine).

**Kosten:** A+H und A+H+F je 6 Bilder, A wird erneut erzeugt (Kontrolle, 6) → 18 × 0,03 $; dazu 6 Edits × 0,08 $ ≈ **1,02 $**. `TROCKEN=1` zeigt Prompts und Kosten.

**Kontaktbogen:** Spalten **Soll | A s101 | A s202 | A+H s101 | A+H s202 | A+H+F s101 | A+H+F s202 | Edit s101 | Edit s202**, sonst wie Runde 1. Datei `kontaktbogen-runde2-<datum>.html`.

## Rückmeldung
Commit, die Prompts (TROCKEN), Aufrufbefehl. Keine Wertung.

## Was danach kommt
Gewinnt **A+H+F**: neue Figur direkt in der Farbe, einstufig; Edit nur für Farbwechsel einer vorhandenen Grundfigur.
Gewinnt **Edit**: Grundfigur = A+H (Kleidung frei, kein weißes Shirt erzwingen), Farbe immer per Edit.
In beiden Fällen: Outfit-Zwang (weißes Shirt, Hose, „never longer“, Verbotsliste) und der 85-%-Rahmen fliegen raus; „full body, front view“ wie in A genügt.
