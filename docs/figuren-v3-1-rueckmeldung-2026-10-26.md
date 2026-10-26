# Figuren v3.1 – Rückmeldung (Hotfix nach dem Live-Test 26.10.)

Stand: 26.10.2026 · Umsetzung: Claude (Cowork) · Befund: Opa ~8 Grundfiguren, 6 Edits, 14 Prüfungen; Mädchen mehrere Anläufe.

Vier Commits, nichts gepusht. Tests: `cd wimmel-wizard-v3 && npm test` → 79 grün.

## 1. Commits

| Nr. | Commit | Kern |
|---|---|---|
| 1 | `69420b9` | Grundfigur-Prompt mit ausdrücklichem Bildrahmen (alle Rollen); Server verlangt ihn beim Ablegen |
| 2 | `7bc9d14` | Stufe 2 nie auf unvollständiger Grundfigur (`single_ok` + `complete_ok` Pflicht), höchstens 3 Grundfiguren je Figur, klare Meldung an die Kundin |
| 3 | `7cffedc` | Prüfung + Edit-Prompt nach Stil-Karte (harte Papier-Schattierung gewünscht, Bart kein Mund, `complete_ok` streng), Prüf-Fassung `2026-10-26a` |
| 4 | `c6943e1` | Kostendeckel je Figur (3 Grundfiguren + 3 Edits), Versuchszähler am Job, Log, DEV-Zeile am Figurenblatt |

## 2. Ursachen, wie sie im Code standen

1. **Unvollständige Grundfiguren wurden zugestellt.** `finalizeJob()` wählte den Kandidaten mit den
   wenigsten Verstößen – auch wenn `complete_ok: false` war. Darauf setzte Stufe 2 auf, die Prüfung
   des Edits fiel durch (Füße fehlen weiterhin), Wiederholung, Neustart aus Stufe 1 mit **zwei** neuen
   Kandidaten, wieder dasselbe. So kamen 8 Grundfiguren und 6 Edits zusammen.
2. **Der Bildrahmen stand nie ausdrücklich im Prompt.** v2 und v3 hatten dieselben Wörter
   „standing … full body, front view“ – v3 schob nur den Oberteil-Satz davor. Dass es in v2 seltener
   auffiel, lag daran, dass dort keine zweite Stufe auf dem Blatt aufsetzte und die Prüfung milder
   wirkte (ein Verstoß reichte nicht zum Scheitern).
3. **Die Stilfrage bestrafte die gewünschte Schattierung.** „starke Farbverläufe oder Schattierungen“
   galten als Verstoß – das Soll-Beispiel (Mädchen in Gelb mit Brille) hat genau die harte
   Papier-Schattierung. Dazu „Hat die Figur einen sichtbaren Mund?“ ohne Bart-Ausnahme beim Opa.

## 3. Grundfigur-Prompt vorher/nachher

Vorher (v3, 22.10.):
```
wmlstil, girl, age 7, light skin tone, long straight blonde hair in two braids, wearing a plain simple white
t-shirt, no glasses, no hat, no accessories, round head, minimal face, dot eyes, single vertical line nose,
no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording
sketchnote style, white background, full body, front view
```
Nachher (v3.1):
```
wmlstil, girl, age 7, light skin tone, long straight blonde hair in two braids, wearing a plain simple white
t-shirt, no glasses, no hat, no accessories, round head, minimal face, dot eyes, single vertical line nose,
no ears, no mouth, no visible neck, full body from head to feet, standing upright, feet and ground shadow
visible, centered, with empty margin above the head and below the feet, flat color fill, thick black marker
outline, graphic recording sketchnote style, white background, front view
```
`FIGUR_RAHMEN_EN` steht in `chips.js`, `pipeline.js` hängt es an jeden Figuren-Prompt (auch Tiere und
Figuren mit Notiz); `passtZumPrompt()` lässt ohne den Rahmen nichts in den gemeinsamen Speicher.

## 4. Ablauf jetzt (je Figur-Anlage)

- Stufe 1: 2 Kandidaten, ggf. ein dritter (wie bisher). Zugestellt wird nur ein Kandidat mit
  `single_ok` **und** `complete_ok`; sonst `status: error` mit „Das hat nicht geklappt, bitte noch einmal
  versuchen.“ – nichts wird abgelegt.
- Stufe 2 startet nur auf einer vollständigen Grundfigur (Speicher-Treffer gelten als geprüft). Edit
  scheitert → einmal wiederholen → einmal neu aus Stufe 1 mit **einem** Kandidaten, aber nur solange
  insgesamt < 3 Grundfiguren → danach die Meldung.
- Deckel: **3 Grundfiguren + 3 Edits** je Anlage, mit Prüfungen ≈ 3×3 + 3×8 + 6×1 = **0,39 $**
  (im Auftrag standen ≈ 0,60 $ – mit den belegten Preisen aus `kosten-deckel.js` ist es weniger).
- Abschluss ins Vercel-Log: `[FIGUR] cj_… done|error (grund) grund=1 edits=1 pruefungen=2 ≈12 ct`.
- Figurenblatt: gestrichelte DEV-Zeile „Versuche: 1 Grundfigur · 1 Edit · 2 Prüfungen · ≈ 0,12 $ ·
  Prüfung 2026-10-26a · Deckel 3 + 3“ (plus „aus dem Regal“, wenn Speicher-Treffer).

**Erwartete fal-Aufrufe im Normalfall:** Stufe 1 reiht immer 2 Kandidaten ein (bestehendes Verhalten,
nicht angefasst) → **2 Grundfiguren + 2 Prüfungen + 1 Edit + 1 Prüfung = 6 Aufrufe ≈ 0,17 $**.
Das Ziel „1 Grundfigur + 1 Edit + 2 Prüfungen“ (≈ 0,12 $) erreichen wir erst, wenn Stufe 1 mit einem
Kandidaten startet – das wäre eine Zeile (`anzahl` in `char-job-start.js`), kostet aber im Fehlerfall
einen weiteren Umlauf. Bei Grundfigur aus dem Speicher: 1 Edit + 1 Prüfung ≈ 0,09 $; bei beidem aus dem
Speicher: 0 Aufrufe.

## 5. Prüf-Fassung `2026-10-26a`

- `complete_ok` streng: von Kopf bis Fuß, beide Füße im Bild; abgeschnittener Fuß/Kopf = false.
- Mund: Lippen, Mundstrich, Mundöffnung – **ein Bart ist kein Mund**.
- Stil: Schatten als zweiter, dunklerer Farbton mit harter Kante ist **gewünscht**; Verstoß nur bei
  weichen Verläufen, Airbrush, Glanzlichtern, Fotorealismus/Aquarell.
- Edit-Prompt: „flat colors with one darker hard-edged shadow tone per surface, like cut paper, thick
  black marker outline, no gradients, no airbrush, no highlights“.
- Client-Kopie in `pipeline.js` ist identisch (Test).

## 6. Rauchtest

Chromium headless, 390 px, Start-/Status-Endpunkte attrappiert: Mädchen 7, Blond · Lang · Glatt ·
Zöpfe · hell · Gelb · Mit Brille → Anfrage mit `chips` + `ausstattung`, Prompt wie oben (Rahmen
enthalten), Person mit `imageUrl`, `chipSchluessel`, `oberteilEn`, `figurVersuche`; Figurenblatt zeigt
die DEV-Zeile. Keine JS-Fehler; rote Konsolenzeilen nur Netz der Sandbox (Fonts, Bild-URL, Hero-Asset).

## 7. Testanleitung (nach Deploy)

Je Figur ohne Notiz anlegen, „Figur zeichnen lassen“, dann Figurenblatt + Vercel-Log ansehen.
1. **Mädchen 7**: Blond · Lang · Glatt · Zöpfe · hell · Gelb · Mit Brille · nichts.
   Erwartung: Blatt komplett von Kopf bis Fuß, gelbes Oberteil, Brille; DEV-Zeile „2 Grundfiguren · 1 Edit
   · 3 Prüfungen“ (oder weniger bei Regal-Treffer); Log `[FIGUR] … done grund=2 edits=1 pruefungen=3`.
2. **Opa**: Grau/Weiß · Glatze · hell-mittel · Vollbart · Blau · Ohne Brille · Hut.
   Erwartung: Vollbart ohne `mouth_ok: false`; kein Neustart wegen Bart; gleiche Zählerwerte.
3. **Frau**: Schwarz · Mittel · Kraus · Dutt · dunkel · Grün · Ohne Brille · Kopftuch.
4. Negativprobe: in `?mode=chipfiguren` nachsehen, dass keine abgeschnittene Figur unter `grundfiguren`
   liegt; falls doch (von vor v3.1): `chipfigur-verwerfen`.
5. Deckel-Probe (optional, teuer ≈ 0,39 $): eine Figur, die dreimal scheitert, endet mit „Das hat nicht
   geklappt, bitte noch einmal versuchen.“ und `[FIGUR] … error (edit_deckel|grundfigur_deckel)`.

## 8. Offen

- [ ] Entscheidung: Stufe 1 mit 1 statt 2 Kandidaten starten (Ziel 1+1+2)? Eine Zeile, im Fehlerfall ein Umlauf mehr.
- [ ] Ein gescheiterter Lauf zählt weiter gegen das Gratis-Figurenkontingent (bestehende Regel „jede Generierung zählt“) – bei einem Fehler auf unserer Seite ungerecht; mit C3 (Stufenmodell) klären.
- [ ] Prüf-Fassung `2026-10-26a` ins Entscheidungsregister.
