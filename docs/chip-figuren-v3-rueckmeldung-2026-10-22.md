# Chip-Figuren v3 – Rückmeldung (Grundfigur + Ausstattung)

Stand: 22.10.2026 · Umsetzung: Claude (Cowork) · Auftrag: `docs/auftrag-chip-figuren-v3-2026-10-20.md`

Alles committet, nichts gepusht. Nur App-Dateien (`api/**`, `public/js/**`, `test/**`), dazu
`dev-tools/ausstattung-test.js`. Tests: `cd wimmel-wizard-v3 && npm test` → 71 grün.

## 1. Commits

| Teil | Commit | Dateien | Test |
|---|---|---|---|
| A Chip-Listen v3 | `88b0fc5` | `public/js/chips.js`, `api/_lib/chip-figuren.js`, `test/chip-figuren.test.js`, Auftragsdatei | Listen laut Auftrag, Schlüssel v3/v3a, Kombinationen, Aufräum-Vorschau |
| B Zwei Stufen | `2f887b0` | `api/_lib/ausstattung-engine.js` (neu), `sitzung.js`, `char-job-start.js`, `char-job-status.js`, `charakter.js`, `pipeline.js`, `state.js`, `test/ausstattung.test.js`, `dev-tools/ausstattung-test.js` | 7 Tests mit fal-Attrappe: Treffer, Edit + Ablegen, Wiederholung → Neustart → Zustellen, Tageslimit, Submit-Fehler, Start-Handler |
| C Szene + Prüfung | `d8752ef` | `pipeline.js`, `szene.js` | Prompt-Satz gerendert („The girl from reference image 2 wears a bright yellow top.“), Prompt-Fassung `2026-10-22a` |
| D Aufräumen/Kuration | `1a52396` | `api/gutschein.js`, Test | Liste getrennt, Vorschau löscht nichts, `bestaetigt=1` löscht, verwerfen je Art |
| E Oberfläche | (dieser) | `charakter.js`, `chips.js` (Shim weg), dieses Doc, Fortschritt | drei Testfiguren headless bei 390 px, keine JS-Fehler, kein Querscrollen |

## 2. Kombinationszahlen (per Test abgesichert, `CHIPS.kombinationen()`)

Frisuren je Haarfarbe: kurz × 3 Strukturen = 3, mittel/lang × 3 Strukturen × 4 Frisuren = 24 → **27**; Mann/Opa + Glatze = 28.

| Rolle | Grundfigur (Schlüssel v3) | × Ausstattung (6 Farben × Brille 2 × Extras) | Ausstattung gesamt |
|---|---|---|---|
| Mädchen / Junge | 5 × 27 × 5 Hauttöne × 3 Stufen = **2 025** | × 36 (3 Extras) | 72 900 |
| Frau | 6 × 27 × 5 = **810** | × 36 (3 Extras) | 29 160 |
| Oma | **810** | × 48 (4 Extras) | 38 880 |
| Mann | 6 × 28 × 5 × 4 Bärte = **3 360** | × 24 (2 Extras) | 80 640 |
| Opa | **3 360** | × 36 (3 Extras) | 120 960 |
| Tier je Tierart | 567 (unverändert, einstufig) | – | – |

„Rollstuhl“ zählt nicht mit (aktiv: false, unsichtbar), ist aber als Schlüssel gültig.

## 3. Was gebaut ist

**Teil A – `public/js/chips.js` (v3).** Frisur (Offen/Pferdeschwanz/Zöpfe/Dutt) nur bei mittel/lang, in der
Haar-Phrase („long straight blonde hair in two braids“) und im Schlüssel. Ausstattung: Oberteil (Rot, Gelb,
Grün, Blau, Orange, Lila → `wearing a bright red top`), Brille (`round glasses`), ein Extra je Rolle (Kinder
Mütze/Kuscheltier, Frau Hut/Kopftuch, Mann Hut, Oma Hut/Kopftuch/Gehstock, Opa Hut/Gehstock, immer „nichts
davon“); Rollstuhl (`sitting in a wheelchair`) mit `aktiv: false`. Gestrichen: Kappe, Hut/Kappe, Rucksack,
Schal, Strickjacke. Schlüssel `v3|rolle|stufe|haarfarbe|struktur|laenge|frisur|hautton|bart` und
`v3a|<grund>|farbe|brille|extra`. `GRUNDFIGUR_EN` („plain simple white t-shirt, no glasses, no hat, no
accessories“) und `ausstattungEditPrompt()` stehen ebenfalls dort (eine Stelle für Client und Server).

**Teil B – zwei Stufen.** `char-job-start`: Grundfigur im Speicher? → kein flux-Aufruf; Ausstattung im
Speicher? → sofort fertig; sonst Edit (`fal-ai/nano-banana-2/edit`, Eingabe = Grundfigur über unseren
Proxy) eingereiht, Job bleibt `in_progress` mit `stufe: 2` – der Client pollt wie bisher und merkt nichts.
Kein Grund-Treffer → Stufe 1 wie bisher; sobald `done`, Grundfigur ablegen und Stufe 2 starten.
Stil-Prüfung (dieselbe wie Stufe 1) nach jedem Edit; Verstöße → einmal wiederholen, dann einmal neu aus
Stufe 1 (neue Kandidaten), danach wird das letzte Bild zugestellt, ohne es abzulegen. Nur fehlerfreie
Ausstattungen landen in `figuren/chips/ausstattung/` (`chipausstattung:{v3a}`, HSETNX, Trefferzähler).
Farbe gewählt + „nichts/keine Brille“ → Stufe 2 läuft trotzdem (Farbe ist Pflicht). Mit Notiz: einstufig
live, Ausstattung direkt im Prompt, nichts im gemeinsamen Speicher. Tiere: einstufig.
Missbrauch: jeder Edit zählt ins Tageslimit je Sitzung (`FAL_PROXY_JE_SITZUNG_TAG`, jetzt in
`sitzung.tagesaufrufErlaubt()`) und in den Kosten-Tagesdeckel (`charedit`). Gratis-Regel unverändert
(Treffer bis `FIGUREN_GRATIS_CHIPS`, Stufe 2 ist Teil der Figur).

**Teil C.** Szenen-Prompt: je Held zusätzlich „The girl from reference image 2 wears a bright yellow top.“
(aus `person.oberteilEn`). Helden-Abgleich (Zählregel, strenge Dopplungsregel, Ähnlichkeit) nennt jetzt
Frisur (offen/Zöpfe/Pferdeschwanz/Dutt) und die Farbe des Oberteils. `PROMPT_LABEL = 2026-10-22a`.

**Teil D.** `GET /api/gutschein?mode=chipfiguren&key=…` → `grundfiguren` und `ausstattungen` getrennt
(mit Bild-URL, Treffern, Datum, bei Ausstattungen der Grund-Schlüssel) + Kombinationszahlen.
`?mode=chipfiguren-aufraeumen&key=…` → **nur Vorschau** der Einträge älterer Versionen (v1, v2);
`&bestaetigt=1` löscht sie samt Blob-Dateien. `?mode=chipfigur-verwerfen&key=…&schluessel=…` erkennt die
Art am Präfix (`v3a|` = Ausstattung).

**Teil E.** Panel-Reihenfolge: Alter (Zahlenfeld, Kinder) → Haarfarbe → Länge → Struktur (nicht bei Glatze)
→ Frisur (nur mittel/lang) → Hautton → Bart (Mann/Opa) → Lieblingsfarbe (Tupfer mit Beschriftung, Pflicht)
→ Brille (Schalter „Ohne Brille / Mit Brille“) → Ein Extra („nichts davon“ vorausgewählt). Pflichtmeldungen:
Frisur, Hautton, Lieblingsfarbe. Bei 390 px kein Querscrollen; drei Testfiguren headless durchgeklickt.

## 4. Kosten und Laufzeit Stufe 2

Nicht aus Cowork messbar (kein Netz zu fal.ai). Belegte Preise (`kosten-deckel.js`): Edit 0,08 $ +
Prüfung 0,01 $ = **0,09 $ je Versuch**; schlimmster Fall (2 Versuche, Neustart mit 2 Kandidaten à 0,03 $
+ 2 Prüfungen, 2 Versuche) ≈ 0,44 $. Laufzeit misst das Skript:

```
cd ~/Developer/wimmel-wizzard-web
TROCKEN=1 node dev-tools/ausstattung-test.js "<grundfigur-url>" gelb ja muetze
FAL_KEY=... node dev-tools/ausstattung-test.js "<grundfigur-url>" gelb ja muetze
```

Grundfigur-URL aus `?mode=chipfiguren` (Feld `url`) oder eine fal.media-Figur aus einer gesicherten
Sitzung. Ausgabe: Bild-URL, `edit_sekunden`, `pruefung_sekunden`, Verstöße, Kosten. Bitte die Zahl in
dieses Doc nachtragen.

## 5. Zu löschende v2-Einträge

Liste holen (löscht nichts):
`https://www.wimmelwizard.de/api/gutschein?mode=chipfiguren-aufraeumen&key=<GUTSCHEIN_ADMIN_SCHLUESSEL>`
Antwort `{ vorschau: true, grundfiguren: [...], ausstattungen: [...] }` – das sind genau die Einträge, die mit
`&bestaetigt=1` samt Datei verschwinden. Aus Cowork kann ich Upstash nicht lesen; der v1-Testeintrag vom
18.10. und alles mit `v2|` stehen dort, sofern sie je abgelegt wurden.

## 6. Testanleitung (nach Deploy, Stripe/fal live)

Jeweils neue Figur ohne Notiz anlegen, „Figur zeichnen lassen“, bis zum Figurenblatt warten.
1. **Mädchen, 7**: Blond · Lang · Glatt · Zöpfe · Hautton hell · Gelb · Mit Brille · nichts →
   Blatt: gelbes Oberteil, Zöpfe, Brille. Danach `?mode=chipfiguren`: ein Eintrag unter `grundfiguren`
   (`v3|girl|6-9|blond|glatt|lang|zoepfe|hell|-`, weißes Oberteil, ohne Brille) und einer unter
   `ausstattungen` (`v3a|…|gelb|brille|nichts`).
2. **Opa**: Grau/Weiß · Glatze · Hautton hell-mittel · Vollbart · Blau · Ohne Brille · Hut →
   `v3|grandfather|-|grau|-|glatze|-|hell-mittel|vollbart` + `…|blau|-|hut`.
3. **Frau**: Schwarz · Mittel · Kraus · Dutt · Hautton dunkel · Grün · Ohne Brille · Kopftuch →
   `v3|woman|-|schwarz|kraus|mittel|dutt|dunkel|-` + `…|gruen|-|kopftuch`.
4. Zweite Sitzung (anderer Browser/privates Fenster), Figur 1 mit denselben Chips: fertig ohne fal-Aufruf
   (im Vercel-Log kein Queue-Submit; Zähler `treffer` in beiden Listen +1).
5. Figur 1 noch einmal mit **Rot** statt Gelb: Grundfigur-Treffer, nur ein Edit; neuer Eintrag unter
   `ausstattungen`.
6. Szene zaubern: im Prompt (Vercel-Log / Entscheidungsregister) steht „… wears a bright yellow top.“;
   die Figur trägt das Oberteil in der Farbe.

## 7. Offen

- [ ] Laufzeit/Kosten eines Stufe-2-Aufrufs messen (Abschnitt 4) und hier nachtragen.
- [ ] v2-Einträge: Vorschau ansehen, dann `&bestaetigt=1`.
- [ ] Prompt-Fassung `2026-10-22a` ins Entscheidungsregister.
- [ ] Landingpage spricht vom „Lieblingspulli“ – passt jetzt; Wortlaut dort nicht angefasst (nicht Teil des Auftrags).
