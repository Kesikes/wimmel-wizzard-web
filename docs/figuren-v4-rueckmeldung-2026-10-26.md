# Figuren v4 – Rückmeldung (Gewinner aus dem Kontaktbogen eingebaut)

Stand: 26.10.2026 · Umsetzung: Claude (Cowork) · Auftrag: `docs/auftrag-figuren-v4-einbau-2026-10-26.md`
· Entscheidung Matthias (Kontaktbogen Runde 2): Grundfigur = **A+H**, Farbe/Brille/Extra per **Edit**.

Sechs Commits, nichts gepusht. Tests: `cd wimmel-wizard-v3 && npm test` → 82 grün.

## 1. Commits

| Teil | Commit | Kern |
|---|---|---|
| A | `9178849` | Grundfigur-Prompt = Fassung A+H: `GRUNDFIGUR_EN`/`grundfigurEn`, `FIGUR_RAHMEN_EN` und die Augenbrauen-Angabe gestrichen; Schlussblock wortgleich `71582bb`; gilt mit Notiz und für Tiere; `passtZumPrompt` verlangt „keine Ausstattungswörter“ + „full body, front view“; Auftragsdatei; Kontaktbogen-Werkzeug: B/C eingefroren (RUNDE=1 bleibt wiederholbar) |
| B | `18bcba3` | Edit-Prompt „upper garment“ statt T-Shirt, Bäckchen/Punktaugen/Nasenstrich/Kopfgröße/Proportionen halten; Brille/Extra wie bisher |
| C | `2d7f221` | Prüfung unverändert streng — Test hält `single_ok` + `complete_ok` Pflicht, Fassung `2026-10-26a`, Deckel 3 + 3, Edit-Wiederholung auf derselben Grundfigur fest |
| D | `c86e146` | Szenen-Satz „wears a bright <farbe> upper garment“; Node-Test lädt `pipeline.js` und prüft den v4-Prompt wortgleich gegen A+H |
| E | `35b185b` | Schlüssel **v5 / v5a** |
| F | (dieser) | Entscheidungsregister Abschnitt 18 (Arbeitsregel Kontaktbogen + Fassung v4), Fortschritt, diese Rückmeldung |

## 2. Prompts vorher / nachher

**Mädchen 7** (Blond · Lang · Glatt · Zöpfe · hell)

vorher (v3.2):
```
wmlstil, girl, age 7, light skin tone, long straight blonde hair in two braids, wearing a plain white short-sleeved t-shirt tucked into plain dark blue shorts, the t-shirt ends at the hips and is never longer, simple dark shoes, no glasses, no hat, no accessories, round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, full body from head to feet, standing upright, centered, the figure fills about 85 percent of the image height, feet and a small ground shadow visible, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, front view
```
nachher (v4 = A+H, 309 Zeichen):
```
wmlstil, girl, age 7, light skin tone, long straight blonde hair in two braids, round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view
```

**Frau** (Schwarz · Mittel · Kraus · Dutt · dunkel)

vorher (v3.2):
```
wmlstil, woman, dark skin tone, medium-length tightly coiled, afro-textured black hair in a hair bun, wearing a plain white short-sleeved t-shirt tucked into plain dark blue trousers, the t-shirt ends at the hips and is never longer, simple dark shoes, no glasses, no hat, no accessories, round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, full body from head to feet, standing upright, centered, the figure fills about 85 percent of the image height, feet and a small ground shadow visible, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, front view
```
nachher (v4):
```
wmlstil, woman, dark skin tone, medium-length tightly coiled, afro-textured black hair in a hair bun, round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view
```
Hinweis, keine Wertung: im Kontaktbogen stand bei der Frau „medium-length **curly** black hair“, weil
Fassung A die Begriffe von `71582bb` nutzte (damals gab es nur Locken/Glatt). Der heutige Chip „Kraus“
heißt „tightly coiled, afro-textured“ — das ist der einzige Unterschied zur Spalte A+H. Wenn das Wort
getauscht werden soll: nach der neuen Regel erst Kontaktbogen.

**Opa** (Grau/Weiß · Glatze · hell-mittel · Vollbart)

vorher (v3.2):
```
wmlstil, grandfather, light-medium skin tone, bald head, no hair, gray/white eyebrows, full gray/white beard, wearing a plain white short-sleeved t-shirt tucked into plain dark blue trousers, the t-shirt ends at the hips and is never longer, simple dark shoes, no glasses, no hat, no accessories, round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, full body from head to feet, standing upright, centered, the figure fills about 85 percent of the image height, feet and a small ground shadow visible, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, front view
```
nachher (v4 = A+H, 309 Zeichen):
```
wmlstil, grandfather, light-medium skin tone, bald head, full gray/white beard, round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, standing, flat color fill, thick black marker outline, graphic recording sketchnote style, white background, full body, front view
```

**Edit** (Stufe 2, Rot + Brille):
```
Change ONLY the color of the upper garment to a flat, solid bright red. Keep its cut, the trousers/skirt, shoes, face, the pink round cheeks, the dot eyes and the nose line, hair, head size and body proportions exactly. Add simple round glasses with thin black frames to the face. Keep the face, hairstyle, hair color, skin tone, body, pose, proportions, line weight and the plain white background exactly as they are. Style: flat colors with one darker hard-edged shadow tone per surface, like cut paper, thick black marker outline, no gradients, no airbrush, no highlights, no new details, nothing else changes.
```

**Szenen-Satz:** „The girl from reference image 2 wears a bright red upper garment.“

## 3. Aufräumen (v4-Einträge weg)

Schlüssel sind jetzt `v5|…` / `v5a|…`; alles mit `v4`/`v4a` (weißes T-Shirt mit Hose, 85-%-Rahmen)
trifft nie mehr und geht per Kuration weg:
`https://www.wimmelwizard.de/api/gutschein?mode=chipfiguren-aufraeumen&key=…` (Vorschau)
→ `…&bestaetigt=1` (löschen, inkl. Blob).

## 4. Rauchtest

Chromium headless, 390 px, Start-/Status-Endpunkte attrappiert: Mädchen 7, Blond · Lang · Glatt ·
Zöpfe · hell · **Rot** · Mit Brille → Anfrage an `char-job-start` mit `chips` + `ausstattung`
(`oberteil: rot, brille: true, extra: nichts`), Prompt **wortgleich** A+H (siehe oben); Figurenblatt mit
`chipSchluessel v5|girl|6-9|blond|glatt|lang|zoepfe|hell|-`, `oberteilEn`, DEV-Zeile „2 Grundfiguren · 1 Edit
· 3 Prüfungen · ≈ 0,17 $ · Prüfung 2026-10-26a · Deckel 3 + 3“ (Attrappe). Keine JS-Fehler; rote Zeilen
nur Sandbox-Netz (Fonts, Hero-Asset, Bild-URL).

## 5. Testanleitung (nach Deploy + Aufräumen)

Je Figur ohne Notiz anlegen, „Figur zeichnen lassen“, Figurenblatt + Vercel-Log ansehen.

1. **Opa** · Grau/Weiß · Glatze · hell-mittel · Vollbart · **Blau** · Ohne Brille · **Hut**
   → Blatt: großer runder Kopf, kurzer Körper, Vollbart ohne Augenbrauen-Strich, blaues Oberteil
   (Schnitt frei), Hut; Log `[FIGUR] cj_… done grund=2 edits=1 pruefungen=3 ≈17 ct`; Regal
   `v5|grandfather|-|grau|-|glatze|-|hell-mittel|vollbart` und `v5a|…|blau|-|hut`.
2. **Frau** · Schwarz · Mittel · Kraus · Dutt · dunkel · **Grün** · Ohne Brille · **Kopftuch**
   → dunkler Hautton (im Kontaktbogen kam A ohne Hautton hell), grünes Oberteil, Kopftuch.
3. **Mädchen 7** · Blond · Lang · Glatt · Zöpfe · hell · **Rot** · **Mit Brille** · nichts
   → rotes Oberteil, kein Kleid-Zwang mehr (die Grundfigur trägt, was sie trägt — nur die Farbe
   wechselt), Bäckchen bleiben, Brille; Regal `v5|girl|6-9|blond|glatt|lang|zoepfe|hell|-` und
   `v5a|…|rot|brille|nichts`.
4. **Mädchen 7** · dieselben Chips · **Gelb** · Mit Brille · nichts — **Regal-Test**: Grundfigur aus
   dem Regal (Treffer aus 3.), nur ein neuer Edit → DEV-Zeile „0 Grundfiguren · 1 Edit · 1 Prüfung
   · ≈ 0,09 $ · aus dem Regal“, Log `[FIGUR] … grund=0 edits=1 pruefungen=1 ≈9 ct [Grund-Treffer]`.
5. Negativprobe: die Frau darf nur mit `complete_ok` durch — ein Blatt „nur Kopf/Schultern“ (wie
   s202 im Kontaktbogen) endet in „Das hat nicht geklappt, bitte noch einmal versuchen.“, nichts
   im Regal; `[FIGUR] … error (unvollstaendig|grundfigur_deckel)`.

## 6. Offen

- [ ] Aufräumen ausführen (Abschnitt 3).
- [ ] „Kraus“-Wortlaut (siehe Hinweis bei der Frau) — falls gewünscht, per Kontaktbogen.
- [ ] Figuren **mit Notiz** bleiben einstufig: dort stehen die Ausstattungswörter („wearing a bright red
  top“, Brille, Extra) weiterhin im flux-lora-Prompt. Nicht Teil des Auftrags; nach dem Befund „jedes
  Wort streckt“ wäre auch hier Grundfigur + Edit denkbar — per Kontaktbogen prüfen.
- [ ] Stufe 1 mit 1 statt 2 Kandidaten (seit v3.1 offen).
