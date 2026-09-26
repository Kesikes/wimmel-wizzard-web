# WizzelWim — Übergabe an neuen PM-Chat

**Stand: 26.09.2026.** Dieser Chat war bisher die zentrale PM-Instanz für WizzelWim.
Ab jetzt laufen drei parallele Stränge (Helden-Ursache, Landingpage, User Flow/
Bestellprozess), jeweils eigener Chat + eigener Cowork-Auftrag. Dieses Dokument
ist der Kontext, den eine neue PM-Instanz braucht, um sofort weiterzuarbeiten.

---

## 1. Was automatisch da ist (Projekt-Gedächtnis)

Jeder neue Chat im Projekt „Projekt Wimmelbuch" sieht automatisch dieselben
Projektdateien: Ways of Working, Overview, Generation & Print, den technischen
Statusartikel. Das muss nicht neu erklärt werden.

## 2. Was NICHT automatisch da ist — deshalb dieses Dokument

Repo: `github.com/Kesikes/wimmel-wizzard-web`, lokal
`/Users/matthias/Developer/wimmel-wizzard-web`. Live: `wimmel-wizard-v3.vercel.app`.
Arbeitsweise: Cowork committet, Matthias pusht.

**Erster Schritt in jedem neuen PM-Chat:** `git log origin/main --oneline -5`
laufen lassen, um den echten aktuellen Stand zu sehen — die Commit-Liste unten
ist der Stand bei der Übergabe, nicht garantiert aktuell.

### Test-Sitzungen (für `TROCKEN=1 bash dev-tools/messen.sh <id>`)
- `1f002917-c6bf-4892-9119-41ea58ea2a91` — Hauptsitzung, Figuren A/B/C (B ist
  stilistisch durchgefallen, siehe unten)
- `9c73ec34-fb31-4c6e-8571-4356309e330b` — Kundendurchlauf-Test, Figuren
  Max/Andi/Moritz
- `f659ebe0-fd39-4acc-99f3-1c5e596117cf` — zwei neue Testfiguren

### Zentrale Doku im Repo (Quelle der Wahrheit für Entscheidungen)
- `docs/entscheidungen.md` — das Register, alle Produktentscheidungen mit
  Begründung, aktuell bei Abschnitt 17+
- `docs/wizzelwim-fortschritt.md` — Fortschrittsübersicht, heute (25./26.09.)
  neu angelegt, sollte bei jedem Meilenstein aller drei Stränge aktualisiert
  werden (siehe Abschnitt 5)

---

## 3. Wichtigstes offenes Problem (Strang „Helden")

**Doppelte Helden in rund der Hälfte aller Bilder.** Grundlinie war 29 von 63
Kandidaten / 21 von 35 Bildern (23.09.) — diese Rohdaten sind leider nicht mehr
reproduzierbar (Sitzungsdatei war nie versioniert, wurde überschrieben).

Bisherige Gegenmittel ohne belegte Wirkung: Einmal-Sätze je Held, exklusives
Merkmal, Blattfilter. Ein Sammelblatt-Test (24./25.09.) zeigte keinen Vorteil,
eher eine andere Fehlerart (fehlende statt doppelte Helden).

**Wichtige Lektion aus diesem Test:** Zwei identische Testaufbauten können bei
kleiner Stichprobe um 100 % gegen 33 % schwanken. Jeder künftige Test muss
VORHER sagen, wie viele Bilder für eine belastbare Aussage nötig sind. Das
betrifft rückwirkend auch die Prompt-Vergleichs-Entscheidung vom 22.09.
(5 Testszenen, 4:1 — zu kleine Stichprobe, im Register entsprechend zu
kennzeichnen, Status unklar, ob schon erledigt).

**Zuletzt an Cowork geschickt (26.09.), Antwort steht noch aus:** Auftrag,
NUR nachzudenken, nichts zu bauen — Bestandsaufnahme aller Belege/Vermutungen,
kostenlose Auswertung via `session-retten.py --sichere-alle` (90 Tage Upstash-
Sitzungen), 3–5 einzeln prüfbare Hypothesen mit je einer Vorab-Fallzahl für
ein belastbares Ergebnis. **Nächster Schritt im neuen Chat: prüfen, ob diese
Antwort schon da ist.**

---

## 4. Stand der übrigen Stränge

**Landingpage** (neuer eigener Chat + Cowork-Auftrag, noch nicht gestartet):
Relevante Referenz ist `wimmel-wizard-design-briefing-oatly-wizzelwim.md`
(Projektdatei). Ästhetik-Leitplanken aus Ways of Working: "Naive Design"
(Duolingo, Headspace, Mailchimp, Oatly, Innocent Drinks), StoryPicBooks.com
nur strukturell als Vorbild, Wizzard-Branding ausschließlich auf der
Landingpage (nicht im App-Chat-Ton).

**User Flow / Bestellprozess** (neuer eigener Chat + Cowork-Auftrag, noch nicht
gestartet): Laut Fortschrittsdoku fehlt der Kaufprozess komplett — kein
`gekauftAm`, keine Rechnung, kein Versand. Hängt eng mit der noch offenen
Produktpreis-Kalkulation zusammen (Versand, Zahlungsgebühren, Umsatzsteuer
7 % Bücher / 19 % Poster — noch nicht final gerechnet).

---

## 5. Wie die PM-Funktion über drei parallele Stränge im Loop bleibt

Kein automatischer Mechanismus — Chats sehen sich gegenseitig nicht. Deshalb:

1. **`docs/wizzelwim-fortschritt.md` ist das gemeinsame Scoreboard.** Nach
   jedem abgeschlossenen Schritt in JEDEM der drei Stränge kurz dort abhaken
   oder ergänzen — das kann Matthias selbst tun oder jeweils am Ende eines
   Cowork-Auftrags erledigen lassen.
2. **Ritual statt Technik:** Am Ende eines Arbeitstages oder nach einem
   größeren Cowork-Ergebnis aus Landingpage- oder Userflow-Chat kurz die
   Kernaussage (3–5 Zeilen) in den PM-Chat kopieren. Der PM-Chat muss nicht
   jedes Detail kennen, nur: was wurde entschieden, was wurde gebaut, gibt es
   einen Konflikt mit einem anderen Strang.
3. **Git-Konfliktrisiko im Blick behalten:** Alle drei Stränge arbeiten am
   selben Repo. Vor jedem Cowork-Push in einem Strang lieber `git pull`, wenn
   parallel an einem anderen Strang gerade gepusht wurde. Landingpage berührt
   vermutlich andere Dateien als Helden-Fix/Pipeline und Bestellprozess;
   Helden-Fix und Bestellprozess könnten sich eher überschneiden
   (`scene-job-start.js`, `pipeline.js`) — bei diesen beiden im Zweifel eher
   nacheinander statt exakt gleichzeitig arbeiten lassen.
4. **Register bleibt der Ort für Produktentscheidungen**, unabhängig vom
   Strang — jeder Cowork-Auftrag trägt seine Entscheidungen dort ein, nicht
   nur in den Chat-Antworten.

---

*Dieses Dokument beim Start eines neuen Chats als erste Nachricht anhängen
oder einfügen.*
