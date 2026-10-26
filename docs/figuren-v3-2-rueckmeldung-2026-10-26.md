# Figuren v3.2 – Rückmeldung (Hotfix „Mädchen in Rot“)

Stand: 26.10.2026 · Umsetzung: Claude (Cowork) · Befund: der Edit machte aus dem T-Shirt ein Kleid, die
Grundfigur war winzig; Edits liefen auf neue Grundfiguren statt auf die bestandene.

Fünf Commits, nichts gepusht. Tests: `cd wimmel-wizard-v3 && npm test` → 80 grün.

## 1. Commits

| Nr. | Commit | Kern |
|---|---|---|
| 1 | `97befe5` | Grundfigur mit Hose: weißes kurzärmliges T-Shirt bis zur Hüfte in dunkelblauer Hose (Kinder ≤ 9: Shorts), dunkle Schuhe. **Schlüsselversion v4 / v4a** – alte v3-Einträge treffen nie mehr und gehen per Aufräumen weg |
| 2 | `8bf2dda` | Rahmen entschärft: „the figure fills about 85 percent of the image height, feet and a small ground shadow visible“, kein „empty margin“ mehr |
| 3 | `933635e` | Edit-Prompt: nur T-Shirt-Farbe, Schnitt/Länge halten, Hose/Shorts/Schuhe/Gesicht/Haare/Pose unverändert, „never a dress“; Stil-Satz bleibt |
| 4 | `7604ac6` | Edit scheitert → Wiederholung auf **derselben** Grundfigur bis 3 Edits; keine neue Grundfigur aus Stufe 2 (`MAX_NEUSTARTS 0`). Hinweis: die Datei trägt in diesem Commit auch schon die Stil-Logik aus (5) – der Trennschritt im Werkzeug ging daneben, inhaltlich ist alles da |
| 5 | `2f0dc37` | Stil in Stufe 2 mittel: nach 3 Edits mit nur `style_ok: false` wird der letzte solche Edit zugestellt, nicht ins Regal gelegt, im Log `[Stil grenzwertig]`, in der DEV-Zeile „Stil grenzwertig“, an der Person `figurVersuche.stilGrenzwertig` |

## 2. Prompts jetzt

Grundfigur (Mädchen 7, Zöpfe, Hautton hell):
```
wmlstil, girl, age 7, light skin tone, long straight blonde hair in two braids, wearing a plain white
short-sleeved t-shirt tucked into plain dark blue shorts, the t-shirt ends at the hips and is never longer,
simple dark shoes, no glasses, no hat, no accessories, round head, minimal face, dot eyes, single vertical
line nose, no ears, no mouth, no visible neck, full body from head to feet, standing upright, centered,
the figure fills about 85 percent of the image height, feet and a small ground shadow visible, flat color
fill, thick black marker outline, graphic recording sketchnote style, white background, front view
```
Erwachsene und Kinder ab 10: „… tucked into plain dark blue trousers …“ (`CHIPS.grundfigurEn(rolle, alter)`).

Edit (Rot, Brille):
```
Change ONLY the color of the t-shirt to a flat, solid bright red. Keep the t-shirt's cut and length exactly
(short-sleeved, ends at the hips), keep the trousers/shorts, shoes, face, hair and pose unchanged. It must
stay a t-shirt, never a dress. Add simple round glasses with thin black frames to the face. Keep the face,
hairstyle, hair color, skin tone, body, pose, proportions, line weight and the plain white background
exactly as they are. Style: flat colors with one darker hard-edged shadow tone per surface, like cut paper,
thick black marker outline, no gradients, no airbrush, no highlights, no new details, nothing else changes.
```

## 3. Ablauf je Figur-Anlage

1. Stufe 1 (unverändert): 2 Kandidaten, ggf. ein dritter; zugestellt wird nur `single_ok` + `complete_ok`,
   sonst „Das hat nicht geklappt, bitte noch einmal versuchen.“ Vollständige Grundfigur wird abgelegt (v4).
2. Stufe 2: Edit auf der bestandenen Grundfigur. Prüfung fehlerfrei → ablegen, fertig. Sonst Edit auf
   **derselben** Grundfigur wiederholen, bis 3 Edits. Danach:
   - beim besten Edit nur `style_ok: false` → zustellen, **nicht** ins Regal, „Stil grenzwertig“;
   - harte Fehler (single/complete/mouth) → Meldung an die Kundin, `[FIGUR] … error (edit_deckel)`.
3. Deckel 3 Grundfiguren + 3 Edits (≈ 0,39 $), Normalfall 2 + 2 + 1 + 1 ≈ 0,17 $, Regal-Treffer 0,09 $ / 0 $.

## 4. Alte Einträge

Schlüssel sind jetzt `v4|…` / `v4a|…`. Die beiden Mädchen-Grundfiguren aus dem Live-Test (v3) und alles
andere mit `v3`/`v2`/`v1` entfernt die Kuration:
`…/api/gutschein?mode=chipfiguren-aufraeumen&key=…` (Vorschau) → `&bestaetigt=1` (löschen, inkl. Blob).
Die Stufe-2-Ergebnisse dieses Laufs wurden ohnehin nie abgelegt (Prüfung durchgefallen).

## 5. Rauchtest

Chromium headless, 390 px, attrappierte Endpunkte: Mädchen 7, Blond · Lang · Glatt · Zöpfe · hell · Gelb ·
Mit Brille → Anfrage mit `chips` + `ausstattung`, Prompt beginnt „… wearing a plain white short-sleeved
t-shirt tucked into plain dark blue shorts …“; Figurenblatt mit DEV-Zeile „2 Grundfiguren · 3 Edits ·
5 Prüfungen · ≈ 0,35 $ · Prüfung 2026-10-26a · Deckel 3 + 3 · Stil grenzwertig“ (Attrappe). Keine JS-Fehler,
rote Zeilen nur Sandbox-Netz.

## 6. Testanleitung (nach Deploy + Aufräumen)

1. **Mädchen 7**: Blond · Lang · Glatt · Zöpfe · hell · **Rot** · Mit Brille · nichts → Blatt: rotes
   T-Shirt bis zur Hüfte, dunkelblaue Shorts, dunkle Schuhe, Zöpfe, Brille; Figur füllt das Blatt; DEV-Zeile
   „… 1 Edit …“ ohne „Stil grenzwertig“; Regal: `v4|girl|6-9|blond|glatt|lang|zoepfe|hell|-` und
   `v4a|…|rot|brille|nichts`.
2. **Opa**: Grau/Weiß · Glatze · hell-mittel · Vollbart · Blau · Ohne Brille · Hut → lange Hose, blaues
   T-Shirt, Hut; kein `mouth_ok: false` wegen Bart.
3. **Frau**: Schwarz · Mittel · Kraus · Dutt · dunkel · Grün · Ohne Brille · Kopftuch.
4. Log je Figur: `[FIGUR] cj_… done grund=2 edits=1 pruefungen=3 ≈17 ct`; bei Stil-Grenzfall zusätzlich
   `[Stil grenzwertig]`, dann im Regal **kein** v4a-Eintrag für diese Ausstattung.

## 7. Offen

- [ ] Aufräumen ausführen (Abschnitt 4).
- [ ] Prüf-Fassung `2026-10-26a`, Prompt-Fassung Grundfigur v3.2 ins Entscheidungsregister.
- [ ] Stufe 1 mit 1 statt 2 Kandidaten starten? (siehe v3.1-Rückmeldung, Abschnitt 8)
