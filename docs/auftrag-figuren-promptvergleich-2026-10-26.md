# Cowork-Auftrag: Figuren-Prompt-Vergleich (Kontaktbogen) – statt weiterer Hotfixes

**Stand:** 26.10.2026 · **Anlass:** Seit Chips v3 werden die Figuren schlechter (Opa: kleiner ovaler Comic-Kopf statt großem runden WizzelWim-Kopf). Drei Hotfixes an einem Abend, jeder aus einem Einzelbild abgeleitet, jeder hat den Prompt verlängert. Ab jetzt: **ein kontrollierter Vergleich, Entscheidung nach Augenmaß durch Matthias.** Der Auftrag v3.3 (Prüfung mit Messwerten) wird NICHT umgesetzt.

**Nichts am Produktcode ändern.** Nur ein Werkzeug in `dev-tools/` und die Referenzbilder einchecken. Ein Commit. Push macht Matthias. Coworks Netz erreicht fal nicht – Matthias startet das Skript im Terminal.

## Referenzen
- Soll-Blätter: `wimmel-wizard-v3/public/assets/stil-referenz/soll-mann.png`, `soll-maedchen.png`, `soll-junge.png` (liegen ungetrackt im Ordner – bitte mit einchecken). Sie stammen aus dem Stand vor Chips v2.
- Prompt-Stand September/Auftrag 3: `git show 71582bb:wimmel-wizard-v3/public/js/pipeline.js`, `charPromptFromChips()` (Zeile ~187).

## Werkzeug `dev-tools/figuren-kontaktbogen.js`

**Testpersonen (3):**
1. Mädchen, 7 – blond, lang, glatt, Zöpfe, Hautton hell, Lieblingsfarbe Rot
2. Frau – schwarz, mittel, kraus, Dutt, Hautton dunkel, Lieblingsfarbe Grün
3. Opa – grau/weiß, Glatze, Hautton hell-mittel, Vollbart, Lieblingsfarbe Blau

**Prompt-Fassungen (3), jeweils genau so zusammengebaut, wie die jeweilige Code-Fassung es täte:**
- **A – Stand Auftrag 3 (`71582bb`):** `charPromptFromChips()` aus diesem Commit, mit denselben Chip-Begriffen, die es damals gab (Haarfarbe/-länge/-struktur, Bart als Zusatz). Kein Hautton-Satz (gab es noch nicht), kein Outfit, kein Rahmen-Satz. Wenn ein heutiger Chip damals nicht existierte (Frisur Zöpfe/Dutt), den Begriff knapp mit in die Haare schreiben („long straight blonde hair in two braids“).
- **B – Stand heute (v3.2, `3fc360c`):** exakt der Grundfigur-Prompt, den der heutige Code für diese Chips erzeugt (inkl. Hautton, weißes T-Shirt + Hose, Rahmen 85 %, Bart). Aus dem Code holen, nicht nachbauen.
- **C – Vorschlag, kurz und Stil zuerst:**
  `wmlstil, round head, minimal face, dot eyes, single vertical line nose, no ears, no mouth, no visible neck, flat color fill, thick black marker outline, graphic recording sketchnote style, <rolle+alter>, <hautton>, <haare>, <bart>, wearing a <farbe> t-shirt and dark blue <shorts|trousers>, full body, front view, white background`
  Keine Verbotsliste („no glasses, no hat, no accessories“), kein „never longer“, kein 85-%-Satz. Rolle wie heute (`grandfather` etc.), keine Alterswörter wie elderly/old.

**Einstellungen:** dieselben wie heute in `char-job-engine.js` (LoRA-URL, Scale, Steps, Guidance, Bildgröße), **zwei feste Seeds** (z. B. 101 und 202), für alle Fassungen gleich. Nur `fal-ai/flux-lora`, **keine Prüfung, kein Edit** – es geht nur um die Grundfigur.

**Ablauf:** 3 Personen × 3 Fassungen × 2 Seeds = **18 Bilder** (≈ 18 × 0,03 $ ≈ 0,55 $). `TROCKEN=1` zeigt nur die 9 Prompts und die Kosten.

**Ausgabe:** 
1. Ein **Kontaktbogen** als HTML-Datei `dev-tools/ausgabe/kontaktbogen-<datum>.html` (lokal öffnen in Safari): eine Zeile je Person, Spalten **Soll** (passendes Soll-Blatt: Mädchen→soll-maedchen, Frau→soll-mann als Stilvorbild Erwachsene, Opa→soll-mann) | **A s101** | **A s202** | **B s101** | **B s202** | **C s101** | **C s202**. Unter jedem Bild die Fassung, der Seed und die Promptlänge in Zeichen; der volle Prompt per Klick aufklappbar. Bilder als fal-URL eingebunden (keine Kopie nötig).
2. Dieselben Daten als JSON daneben (`kontaktbogen-<datum>.json`).
`dev-tools/ausgabe/` in `.gitignore`.

**Aufruf (im Kopf der Datei dokumentieren):**
```
cd ~/Developer/wimmel-wizzard-web
TROCKEN=1 node dev-tools/figuren-kontaktbogen.js
FAL_KEY=... node dev-tools/figuren-kontaktbogen.js
open dev-tools/ausgabe/kontaktbogen-*.html
```

## Rückmeldung
Commit, die 9 Prompts im Wortlaut (TROCKEN-Ausgabe), Promptlängen A/B/C, Aufrufbefehle. Nichts bewerten – das macht Matthias am Kontaktbogen.

## Danach (nicht Teil dieses Auftrags)
Matthias wählt die Fassung. Erst dann ein Auftrag, der sie einbaut – und, falls C gewinnt, die Vereinfachung: neue Figur direkt in der Lieblingsfarbe, Edit nur noch für eine andere Farbe auf vorhandener Grundfigur.
