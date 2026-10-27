# Figuren v4.2 – Rückmeldung: eine Ausstattung gehört zu genau EINER Grundfigur

Stand: 27.10.2026 · Umsetzung: Claude (Cowork) · Befund Matthias 27.10.: Grundfigur neu abgelegt, Stufe 2
fand die verwaisten `v5a`-Einträge von gestern (Edit auf einer nie abgelegten Grundfigur) und lieferte ein
anderes Kind aus. Meine Einschätzung „unschädlich“ in der v4.1-Rückmeldung war **falsch** – bei „Detail
ändern“ (Farbwechsel) hätte die Kundin eine andere Figur bekommen. Korrigiert, siehe dort.

Vier Commits + Rückmeldung, nichts gepusht. Tests: `cd wimmel-wizard-v3 && npm test` → 85 grün.
Kein Prompt-Wortlaut geändert.

## 1. Commits

| Punkt | Commit | Kern |
|---|---|---|
| 1 | `de9cb6a` | Job trägt `chipPfad` (Blob-Pfad der Grundfigur: bei Regal-Treffer aus dem Eintrag, sonst aus dem Ablegen); die Ausstattung wird mit `grund_pfad` abgelegt; ohne `chipPfad` (Grundfigur nicht im Regal) wird sie **nicht** abgelegt (`ausstattungHinweis: grundfigur_nicht_im_regal`) |
| 2 | `2160598` | Treffer nur, wenn `grund_pfad == chipPfad`; sonst Fehltreffer (`ausstattungErsetzen`, `ausstattungFehltreffer` am Job), Edit neu auf der aktuellen Grundfigur, `ablegen({ ersetzen })` entfernt den alten Eintrag samt Datei; Einträge ohne `grund_pfad` treffen nie. Test „Ausstattung vorhanden, Grundfigur neu“ |
| 3 | `3d83d0b` | `verwerfen()` einer Grundfigur (Kuration, und damit auch Ersetzen) verwirft ihre Ausstattungen mit (`grund_pfad == pfad`; Altbestand ohne `grund_pfad` über den Schlüssel); fremde bleiben |
| 4 | `f421d7c` | Aufräumen nimmt verwaiste Ausstattungen dazu (`grund_pfad` fehlt oder zeigt auf keine abgelegte Grundfigur); Vorschau nennt sie unter `ausstattungen_verwaist` mit `grund_pfad` und aktueller Grundfigur |
| – | (dieser) | Rückmeldung, Korrektur in der v4.1-Rückmeldung, Fortschritt |

## 2. Was jetzt gilt (Ablauf Stufe 2)

1. Stufe 1 liefert die Grundfigur und – wenn sie im Regal liegt – ihren Blob-Pfad (`chipPfad`).
2. Stufe 2 sucht die Ausstattung. Treffer **nur**, wenn deren `grund_pfad` genau dieser Pfad ist
   → sofort fertig, kein Edit.
3. Sonst (Eintrag von einer anderen Grundfigur, Altbestand ohne `grund_pfad`, oder gar keiner):
   Edit auf der aktuellen Grundfigur; bei fehlerfreier Prüfung wird abgelegt, ein alter Eintrag
   dabei ersetzt (Eintrag + Datei). Log-Feld am Job: `ausstattungFehltreffer: <alter grund_pfad>`.
4. Liegt die Grundfigur selbst nicht im Regal (Stil durchgefallen), wird die Ausstattung nicht
   abgelegt – es kann keine Waise mehr entstehen.
5. Grundfigur verworfen (Kuration) → ihre Ausstattungen gehen mit.

Kosten: ein Fehltreffer kostet einen Edit + Prüfung (≈ 0,09 $) – einmal je Ausstattung, danach
Treffer. Für die beiden Mädchen von gestern heißt das: beim nächsten Rot/Gelb je ein neuer Edit auf
der heute abgelegten Grundfigur, die alten Einträge werden dabei ersetzt.

## 3. Aufräumen jetzt

`https://www.wimmelwizard.de/api/gutschein?mode=chipfiguren-aufraeumen&key=…`
→ Vorschau: `grundfiguren` (alte Versionen), `ausstattungen` (alte Versionen + Waisen),
`ausstattungen_verwaist` (je Eintrag `grund_pfad` und `grund_aktuell`) — die beiden Mädchen-
Ausstattungen von gestern müssen darin stehen (ihr `grund_pfad` fehlt bzw. zeigt nicht auf die
heutige Grundfigur).
→ `…&bestaetigt=1` löscht sie samt Datei. Danach ist das Regal konsistent; Aufräumen ist nicht
zwingend (Punkt 2 ersetzt Waisen beim nächsten Edit ohnehin), aber sauber.

## 4. Tests (neu)

- `v4.2: Ausstattung vorhanden, Grundfigur neu` – Eintrag von gestern (`grund_pfad` gestern.png),
  Job mit `chipPfad` heute.png → Fehltreffer, Edit neu, neuer Eintrag zeigt auf heute.png, alte
  Datei weg; gleicher Job danach → Treffer ohne fal-Aufruf; Eintrag ohne `grund_pfad` → nie Treffer.
- `v4.2: Grundfigur verwerfen oder ersetzen` – zwei Ausstattungen der Grundfigur weg, fremde bleibt,
  Dateien mitgelöscht; Altbestand ohne `grund_pfad` hängt am Schlüssel.
- Kuration: Vorschau listet zwei Waisen (ohne `grund_pfad` / mit fremdem `grund_pfad`), löscht erst
  mit `bestaetigt=1`, die passende Ausstattung bleibt.
- Bestehende Tests um `chipPfad`/`grund_pfad` ergänzt (Grund-Treffer in `char-job-start` trägt den Pfad).

## 5. Rauchtest

Chromium headless, 390 px, Endpunkte attrappiert (Status-Antwort mit `chipPfad`,
`ausstattungErsetzen`, `ausstattungFehltreffer`): Mädchen 7 Rot/Brille → Anfrage unverändert
(Prompt v4), Figurenblatt mit DEV-Zeile, „Passt so“ → „Gespeichert ✓“, Galerie, Figur fertig.
Keine JS-Fehler; der Client braucht die neuen Felder nicht und ignoriert sie.

## 6. Testanleitung (nach Deploy)

1. Vorschau Aufräumen aufrufen → `ausstattungen_verwaist` zeigt die zwei Mädchen-Einträge; mit
   `bestaetigt=1` löschen (oder liegen lassen, siehe 3).
2. **Mädchen 7** Blond·Lang·Glatt·Zöpfe·hell·**Rot**·Mit Brille → Grundfigur aus dem Regal
   (0 Grundfiguren), **1 Edit** (Fehltreffer bzw. kein Eintrag), Log `[FIGUR] … grund=0 edits=1 …
   [Grund-Treffer]`; Kuration: `v5a|…|rot|brille|nichts` mit `grund_pfad` = Pfad der Grundfigur.
3. **Mädchen 7** dieselben Chips, **Rot** noch einmal (z. B. zweite Sitzung) → 0 Grundfiguren,
   0 Edits, `[Ausstattung-Treffer]`.
4. Kuration: Grundfigur des Mädchens verwerfen → beide Mädchen-Ausstattungen verschwinden mit;
   nächstes Mädchen zeichnet neu (2 Grundfiguren · 1 Edit).
