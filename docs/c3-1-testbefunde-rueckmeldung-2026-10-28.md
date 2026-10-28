# C3.1 Testbefunde vom 28.10. — Rückmeldung (28.10.2026)

Auftrag: `docs/auftrag-c3-1-testbefunde-2026-10-28.md`. Sechs Commits (einer je Punkt), alle committet, nichts gepusht. Kein Prompt-Wortlaut geändert. `npm test`: 101/101 grün (Mac). Rauchtest je Punkt (Chromium headless, 390 × 844, lokaler Server mit KV-/Stripe-/Mail-/fal-Attrappen) — Ergebnisse unten.

---

## 1. Zählfehler Gratis-Figuren — Ursache und Beleg

**Befund:** 4 gezeichnete Figuren, Konto „0 von 5“, Stopp bei der fünften.

**Ursache (zwei Fehler, beide im Server):**

1. **Doppelbuchung bei Regal-Treffern.** `char-job-start.js` buchte einen Regal-Treffer sofort (`figurenBuchen`), setzte am Job aber kein `figurGebucht`. Lief danach die Ausstattung als Edit (Stufe 2, Status wieder `in_progress`), buchte `char-job-status.js` beim Übergang auf `done` ein **zweites Mal** — eine Figur zählte doppelt. Beleg: Jobobjekt im Treffer-Zweig hatte `sessionId`, aber kein `figurGebucht` (Commit `da46be6`, Diff `api/char-job-start.js`); neuer Test `ausstattung.test.js` „Treffer-Job ist als gebucht markiert“.
2. **INCR-Zähler je fertigem Job.** Der Zähler zählte jeden abgeschlossenen Auftrag, nicht jede Figur: „Noch einmal zeichnen“ oder „Detail ändern“ einer bestehenden Figur zählte als neue. Dazu lief „Noch einmal zeichnen“ (anzahl 1, ohne Chips) als Art **„live“** — und die ist gratis gesperrt → Stopp-Screen „Mehr Figuren?“ statt Zeichnen.

Nicht die Ursache (geprüft): `FIGUREN_GRATIS = 0`/`FIGUREN_GRATIS_CHIPS = 5` sind nur Aliasnamen auf `KONTINGENTE`; die Prüfung ist `>=` korrekt (5 erlaubt, die 6. stoppt); Tiere zählen nicht gesondert; gescheiterte Läufe zählten schon vorher nicht (Test besteht weiter).

**Lösung — eine Quelle der Wahrheit:** Figuren werden als **Menge der zugestellten Figuren-IDs** geführt (`SET freitier:figur-ids[:chip|:foto]:<sid|konto:id>`, Mitglied = `personId` aus dem Client, ersatzweise die `jobId`), Stand = `SCARD`. Dieselbe Figur noch einmal zeichnen/ändern bleibt **eine** Figur; `figurenErlaubt()` lässt eine bekannte Figur immer wieder zeichnen (nur ein erster Foto-Weg prüft das Foto-Kontingent); `figurenBuchen()` ist idempotent. Der Client schickt `elementId` (personId) bei jedem Figuren-Start. Dashboard („Noch frei: x von y Figuren“) und Konto-Bereich lesen beide `kontingente()` vom Server; nach jeder Zustellung wird der Stand neu geholt.

**Migration:** Die alten INCR-Zähler (`freitier:figuren*`) werden nicht mehr gelesen — Sitzungen von vor heute fangen bei 0 an (vor dem Launch unkritisch; Matthias' Testkonto zeigt nach dem Deploy wieder den richtigen Stand). Beim Verknüpfen wandern die Mengen in die Konto-Mengen, beim Löschen werden sie mit entfernt.

**Rauchtest (15/15):** 5 Regal-Figuren gehen; Neu-Zeichnen von Figur 3 (als `anzahl 1` ohne Chips **und** über die Merkmale) zählt nicht; Dashboard „Noch frei: 0 von 5“ = Konto „Figuren: 0 von 5“; 6. Figur → Stopp-Screen „Mehr Figuren?“, Figur bleibt ohne Bild; gescheiterter Lauf (fal-Fehler) ändert den Stand nicht; mit Test-Schalter bezahlt → 6. zugestellt, Stand 6. Commit `da46be6`.

## 2. Unvollständige Merkmale → Stopp-Screen — Ursache und Beleg

**Ursache (Client):** Die Pflichtprüfung in `generateCharacterImage()` ließ **einen** Haar-Chip genügen (`hairPhraseEn` liefert schon bei Farbe allein „blonde hair“). Fehlte Länge/Struktur/Frisur, schickte der Client unvollständige Chips; der Server fand keinen Regal-Schlüssel (`CHIPS.schluessel()` → `null`), nahm still den **„live“**-Weg — der ist gratis gesperrt → Stopp-Screen (Zusammenhang mit Punkt 1, Fehler 2). Die Lieblingsfarbe war schon eine eigene Prüfung, deshalb kam dort korrekt der rote Hinweis. **Chips weg:** Der Merkmale-Entwurf war ein gemeinsamer Zustand für „die aktuelle Person“; jeder Personenwechsel (auch Stopp-Screen → „Erst mal weitermachen“ → zurück) setzte ihn auf null.

**Lösung:**
- `pflichtPruefung()` in Screen-Reihenfolge (Haarfarbe, -länge, -struktur, Frisur wenn möglich, Hautton, Lieblingsfarbe; Tiere: Fellfarbe/-länge/-muster) **vor** jeder Kontingent-Prüfung und vor jedem Serveraufruf. Roter Hinweis direkt unter der fehlenden Gruppe („Bitte noch die Haarlänge antippen.“), Gruppe rot umrandet, `scrollIntoView`; Antippen in der Gruppe nimmt die Markierung weg. Freitext-Weg bleibt: ohne jeden Haar-Chip und mit Notiz keine Haar-Pflicht.
- Entwurf wird **je Person** gespeichert (`person.merkmale`) und beim Wechsel wiederhergestellt — nichts geht nach Fehler, Neuladen oder Zurück verloren.
- Server (Punkt-1-Commit): unvollständige Chips → `400 { unvollstaendig: true }` statt stiller „live“-Weg; der Stopp-Screen kommt nur noch bei echtem Kontingent-Ende.

**Rauchtest (13/13):** Blond + Glatt ohne Länge → Hinweis unter der Längen-Gruppe, kein Serveraufruf, kein Stopp, Chips bleiben; Länge antippen → Markierung weg, nächster Hinweis „Frisur“; Wechsel zu Ben (leer) und zurück zu Lina (Chips da); Neuladen (Chips da); vollständig → gezeichnet; Server 400 ohne `stopp`. Commit `b2f23d8`.

## 3. Sichtbarer Fortschritt + Verlassen der Seite

**Anzeige:** Bottom-Bar „Ich zeichne ●●●“ (laufende Punkte) und ein schmaler gelber Balken oben an der Leiste; bei `prefers-reduced-motion` nur pulsierender Text. Hinweiszeile: „Das dauert etwa zwei Minuten. Du kannst derweil zu einer anderen Figur oder ins Figurenblatt – ich zeichne weiter und sage Bescheid.“ Die Anzeige wird nach jedem Rendern gesetzt und überlebt jeden Screen-Wechsel.

**Verlassen der Seite — geprüft, Befund und Behebung:**
- Der Auftrag läuft serverseitig weiter (Job in KV, `pendingJobId` an der Person) — das war schon so. **Nicht** so war: `charGenBusy` war **ein globales Flag** — während eine Figur lief, tat ein Klick „Figur zeichnen lassen“ bei einer **anderen** Figur still gar nichts; und zurück bei der laufenden Figur zeigte der Button nichts an. Jetzt Sperre **je Person** (`zeichnetGerade`): andere Figuren können parallel gezeichnet werden; Rückkehr zur laufenden Figur zeigt den Kasten „Wird gerade gezeichnet …“ + Anzeige, startet keinen zweiten Auftrag (gleiche jobId; der Server zählt je Figur-ID ohnehin nur einmal).
- Figurenblatt-Kachel zeigt „… / wird gezeichnet …“ für laufende Figuren; nach Fertigstellung ist die Figur da.
- Fertigstellung springt nur noch zum Figurenblatt, wenn die Kundin noch bei **dieser** Figur ist; sonst wird der aktuelle Screen frisch gezeichnet (nichts springt ihr dazwischen). Ein Fehler, der auftritt, während sie woanders ist, wird an der Person gemerkt und beim nächsten Öffnen gezeigt.
- Reload mitten im Lauf: Resume über `pendingJobId` wie bisher (geprüft: kein neuer Start, kein doppeltes Zählen).

**Rauchtest (15/15, Server-Attrappe mit 6 s langsamem Job):** Bar-Animation + Hinweis; Figurenblatt-Kachel „wird gezeichnet …“; zweite Figur startet parallel; Rückkehr → Anzeige weiter, kein zweiter Auftrag; Reload → Resume ohne neuen Start; fertig → Bild da, Bar normal, Figurenblatt; Fertigstellung während die Kundin bei einer anderen Figur ist → kein Sprung; reduced-motion → Punkte/Balken aus, Text pulsiert. Commit `65ed60a`.

## 4. Anmelde-Link auf anderem Gerät

- Der Token trug die anfragende Sitzung schon seit C3 (sie wurde beim Klick verknüpft); **neu:** das klickende Gerät wird nach `/app/konto?angemeldet=1&resume=<sid>` geschickt und lädt den Stand dieser Sitzung (Figuren/Bilder), wenn es selbst noch nichts angelegt hat — Befund „leere Seite am Handy“ behoben. Hat das klickende Gerät eigenen Inhalt, bleibt der; seine Sitzung hängt trotzdem am Konto.
- Anfragendes Gerät: „Wir haben dir einen Anmelde-Link geschickt … Sobald du ihn öffnest, bist du auch hier angemeldet.“ und Abfrage alle 3 s (max. 10 min) `GET /api/konto?mode=anmelde-warten&warte=…` mit einem Warte-Schlüssel, den nur dieses Gerät kennt (Antwort auf `anmelden-link`); nach dem Klick bekommt es damit einmalig das Cookie (`anmelde-warte:{w}`, 10 min) und zeichnet den Konto-Screen frisch.
- Texte in Mail und auf der Seite: „Du kannst den Link auf jedem Gerät öffnen.“

**Rauchtest (11/11, zwei Browser):** Laptop zeichnet Lina, fordert Link an; Handy (frischer Browser) klickt → zeigt Lina mit Bild, angemeldet; Laptop nach ≤ 3 s angemeldet, Cookie da; drittes Gerät mit eigenem Inhalt behält ihn, Konto hat 2 Sitzungen. Commit `25e8aa1`.

## 5. Daten löschen mit Restguthaben

- Bestätigungsseite: bei Guthaben/Paketen/Extra-Aktionen gelber Kasten „Dein Guthaben von 9,90 € verfällt beim Löschen und kann nicht erstattet werden.“, die betroffenen Pakete, eigener Haken „Ich weiß, dass mein Guthaben verfällt.“ — beide Wortlaute in `gutschein-config.js` (`GUTHABEN_VERFALL_SATZ`/`_HAKEN`), als Platzhalter für den Anwalt markiert. Ohne Haken kein Löschen (Client **und** Server: `400 { guthabenVerfaellt: true }`).
- **Kaufnachweis:** je gekauftem Paket bleibt `kaufnachweis:{stripe_session_id}` = `{ betrag_cent, datum, paket, stripe_session_id, stripe_payment_intent, konto_geloescht_am }` — kein Klarname, keine E-Mail, keine Konto-ID; Index `SET kaufnachweise`. Dafür merkt der Webhook jetzt die Stripe-Zahlungs-ID am Paket. Alles andere (Konto, E-Mail-Index, Sitzungen mit Figuren/Bildern, Zähler, Mengen) wird gelöscht; Gutscheine bleiben als Kaufbeleg (wie bisher).

**Rauchtest (12/12):** ohne Guthaben kein Haken; nach Kauf Hinweis mit 9,90 €; ohne Haken abgelehnt (Client + Server); mit Haken gelöscht, abgemeldet; Kaufnachweis anonym in KV. Commit `1826507`.

## 6. Nach der Stripe-Rückkehr

`/app/konto?aufgeladen=<typ>&session_id=<cs>`: solange das Paket nicht gebucht ist, Kasten „Zahlung wird verbucht …“ (ruhig pulsierend) und Abfrage alle 2 s (max. 2 min); sobald ein Paket mit dieser Checkout-Session da ist → „Danke! Zauberguthaben ist freigeschaltet. Eine Bestätigung kommt per Mail.“ und Screen frisch — kein Neuladen. Nach 2 min ein ehrlicher Hinweis (Mail folgt, Seite später öffnen). Schon gebucht beim Öffnen → sofort die Erfolgsmeldung.

**Rauchtest (6/6, Webhook um 5 s verzögert):** Kasten sichtbar, Guthaben 0; nach dem Webhook Erfolgsmeldung + 9,90 € ohne Reload; Knopf „Konto ✓“; erneutes Öffnen → sofort Erfolgsmeldung. Commit `c4c8229`. Danach C3-Gesamtrauchtest erneut: 41/41.

---

## Testanleitung für Matthias (Preview, Stripe-Testmodus)

Vorbereitung wie in C3: `STRIPE_MODUS=test`, Testkarte `4242 4242 4242 4242`. Für Punkt 1 am besten ein **frisches privates Fenster** (die alten Zähler des Testkontos werden nicht mehr gelesen; wer das alte Konto weiterbenutzt, sieht ab jetzt die Mengen-Zählung).

1. **Zählen:** 5 Figuren aus dem Regal anlegen und zeichnen. Nach jeder: Dashboard „Noch frei: n von 5 Figuren“ = Konto „Figuren: n von 5“. Bei Figur 3 „Noch einmal zeichnen“ und „Detail ändern“ → zählt nicht. Die 6. → Stopp-Screen „Mehr Figuren?“. Eine Figur mit Foto scheitern lassen (`FAL_KEY` kurz verstellen) → Stand unverändert.
2. **Merkmale:** Haarfarbe + Struktur antippen, Länge weglassen → „Figur zeichnen lassen“ → roter Hinweis unter der Längen-Gruppe, Gruppe umrandet, Seite scrollt hin; kein Stopp-Screen. Zum Figurenblatt und zurück → Chips noch da. Seite neu laden → Chips noch da.
3. **Fortschritt:** Figur zeichnen → unten „Ich zeichne ●●●“ + gelber Balken, Hinweiszeile „… derweil …“. Währenddessen ins Figurenblatt (Kachel „wird gezeichnet …“), eine zweite Figur anlegen und zeichnen (geht parallel), zurück zur ersten (Anzeige läuft, Kasten „Wird gerade gezeichnet …“), Seite neu laden (Anzeige läuft weiter, kein neuer Auftrag — in Vercel-Logs nur eine `char-job-start`-Anfrage je Figur). Nach Fertigstellung: Figur da, Stand +1. iOS: Einstellungen → Bedienungshilfen → Bewegung → „Bewegung reduzieren“ → nur pulsierender Text.
4. **Anderes Gerät:** Am Laptop Figuren anlegen, Link anfordern (Hinweis „… auch hier angemeldet“). Link am Handy öffnen → Handy zeigt die Figuren und ist angemeldet. Laptop: nach ≤ 3 s angemeldet (Knopf „Konto“), ohne Klick.
5. **Löschen:** Mit Zauberguthaben → „Meine Daten löschen“ → gelber Kasten „Dein Guthaben von 9,90 € verfällt …“, Haken. Ohne Haken → Hinweis, nichts passiert. Mit Haken → gelöscht. Upstash: `kaufnachweise` (SET) und `kaufnachweis:cs_…` (ohne E-Mail), `konto:…` weg.
6. **Stripe-Rückkehr:** Zauberguthaben kaufen → zurück auf `/app/konto`: „Zahlung wird verbucht …“ → nach Sekunden „Danke! Zauberguthaben ist freigeschaltet.“ ohne Reload, Guthaben 9,90 €. (Zum Sehen der Wartephase: im Stripe-Dashboard den Webhook kurz pausieren.)

## Hinweise

- Punkt 1 ändert das Datenmodell der Figuren-Zählung (Mengen statt Zähler). Keine neuen Umgebungsvariablen.
- Beide neuen Wortlaute (Guthaben-Verfall, Haken) sind — wie der Widerrufsverzicht — Platzhalter und in der Oberfläche als solche markiert; vor dem Launch entfernen.
- Die Kaufnachweise sind nur in Upstash (keine Admin-Ansicht). Wenn gewünscht, ein Admin-Modus `kaufnachweise` als kleiner Folgepunkt.
