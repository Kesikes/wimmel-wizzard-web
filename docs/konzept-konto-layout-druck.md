# Konzeptpapier: Konto, Bezahlmodell, Wasserzeichen, Buchlayout, Druckdatei, Easter Egg

**Stand:** 19.09.2026 · **Kostenzahlen korrigiert am 20.09.2026**
**Zweck:** Übergabe an Cowork. Sechs Themen, die konzeptionell zusammengehören und nach der Bildqualität an der Reihe sind.
**Wichtig:** Nichts davon jetzt umsetzen. Erst müssen die Szenen-Testbilder für alle Kompositionstypen durch sein. Dieses Papier legt fest, was danach gebaut wird, und in welcher Reihenfolge.

---

## 0. Ausgangslage

Die Bildgenerierung funktioniert seit dem 18.09. verlässlich: Figurengröße, Dichte, Tiefenstaffelung und abwechslungsreiche Situationen sitzen. Damit verschiebt sich die Arbeit vom "Kann die App gute Bilder?" zum "Wie wird daraus ein verkauftes Produkt?".

Kostenlage (fal.ai), **korrigiert am 20.09.2026** — die Zahlen vom 18.09. waren beim Bildpreis doppelt zu hoch:

| Posten | Kosten |
|---|---|
| Szene, 2 Kandidaten à **0,15 $** (4K) | **0,30 $** |
| Dritter Kandidat, bei ca. 40 % der Szenen | 0,06 $ im Schnitt |
| Verify (Vision), 2–3 Aufrufe | **nicht gemessen** — kein belegter Preis je Aufruf |
| **Szene gesamt** | **ca. 0,36 $ plus Verify** |
| Figur (Flux + Zusatzansichten), Schätzung | 0,15–0,30 $ |

Die Annahme, 4K verdopple den Preis, trifft nicht zu. Beleg: fal-Dashboard, 499 Bildaufrufe = 74,85 $.

Daraus ergibt sich die Vorleistung, die das Bezahlmodell begrenzen muss.

---

## 1. Konto und Bezahlmodell

### Entscheidung

- **Kostenlos starten, ohne Konto:** bis zu **5 Figuren** und **1 Szene**.
- **Danach Konto anlegen und 5 € aufladen.** Erst dann sind weitere Szenen möglich.
- **Die 5 € werden vollständig auf den Produktpreis angerechnet.** Niemand zahlt doppelt.

Vorleistung pro Nutzerin ohne Kauf: rund 0,75 bis 1 $ (halbiert, siehe korrigierte Kostenlage oben). Damit ist der Fall "spielt stundenlang, kauft nie" wirtschaftlich gedeckelt.

### Warum jetzt doch ein Konto nötig ist

Guthaben muss den Browser überleben. Ohne Konto wäre es nach dem Leeren der Browserdaten oder auf einem anderen Gerät weg — bei einem bezahlten Betrag nicht vertretbar. Das Konto ist damit an das Guthaben gekoppelt, nicht an den Einstieg.

### Ablauf aus Sicht der Nutzerin

1. Landingpage, "Jetzt loslegen", **kein Konto nötig**.
2. Figuren anlegen (bis zu 5), erste Szene zaubern. Aha-Moment ohne jede Hürde.
3. Entscheidungspunkt nach dem ersten Bild (Poster / Mini-Wimmelbuch / Wimmelbuch) — wie im Briefing.
4. Will sie weitermachen: **"Konto anlegen und 5 € aufladen"**. E-Mail plus Passwort oder Magic Link, so kurz wie möglich.
5. Alles bisher Erstellte wird beim Anlegen des Kontos übernommen, nichts geht verloren. Das ist der kritische Punkt der ganzen Mechanik.
6. Weiterzaubern. Guthabenstand jederzeit sichtbar.
7. Beim Checkout: Produktpreis minus 5 € Guthaben.

### Offene Fragen (Matthias entscheidet)

- **Verfällt das Guthaben**, wenn nicht bestellt wird? Falls ja, mit welcher Frist? Das hat rechtliche und steuerliche Folgen (Gutscheinrecht), vor dem Launch mit Steuerberatung klären.
- **Reicht ein Aufladeschritt** von 5 €, oder braucht es eine zweite Stufe für Vielnutzerinnen?
- **Was passiert bei Nichtgefallen** — Rückerstattung des Guthabens oder nicht?
- **Wie viele Korrekturen und Neuversuche** sind nach dem Aufladen frei? Unbegrenzt wäre wieder ein offenes Kostenrisiko.

### Transparenz zu den KI-Kosten

Es soll auf der Seite erklärt werden, warum Bildgenerierung Geld kostet. Ton: nicht rechtfertigend, sondern erklärend und im WizzelWim-Ton, zum Beispiel sinngemäß "Jedes Bild wird wirklich neu gezaubert — und Zaubern braucht Strom." Das unterscheidet WizzelWim zugleich von Anbietern, die nur Namen in fertige Vorlagen setzen.

Platz dafür: eigener kurzer Abschnitt auf der Landingpage oder im Preisbereich, dazu ein Satz an der Stelle, an der das Aufladen verlangt wird.

---

## 2. Wasserzeichen für Vorschaubilder

### Ziel

Alle Bilder, die vor dem Kauf angezeigt werden, tragen ein sichtbares Wasserzeichen "WizzelWim". Herunterladen darf erlaubt bleiben, aber nur mit Wasserzeichen.

### Der entscheidende Punkt

Ein Wasserzeichen in der Anzeige nützt nichts, solange die App direkt auf die **fal.media-URL** verlinkt. Diese Adressen sind frei aufrufbar, wer sie kopiert, hat das Original. Beides muss also zusammen gelöst werden:

1. Bilder nicht mehr direkt von fal.media ausliefern, sondern über einen eigenen Endpunkt.
2. Dort das Wasserzeichen einrechnen.
3. Die unmarkierte Fassung erst nach dem Kauf zugänglich machen, für den Druck.

### Zu prüfen (Cowork)

- Bandbreite: Das Projekt läuft auf Vercel, aller Bildverkehr über eigene Funktionen geht auf das Kontingent. Zusammen mit dem Pro-Wechsel bewerten.
- Technischer Weg ohne zusätzliche Bibliotheken im Projekt (bisher bewusst ohne `node_modules` gebaut).
- Gestaltung: dezent, aber nicht wegschneidbar. Vorschlag: mehrfach über das Bild verteilt, geringe Deckkraft.

---

## 3. Buchlayout und Vorschau in der App

### Aufbau eines Buches

1. **Buchaußenseiten** (Cover vorne und hinten)
2. **Innenseite: Vorstellung der Figuren** (Doppelseite)
3. **"Uns findet ihr auf allen Seiten"** — Suchhinweis
4. **Wimmelbilder**, jeweils auf einer Doppelseite
5. **Widmung** am Schluss

### Seitenzahlen — festgelegt am 19.09.

Die Gesamtseitenzahl muss **durch 4 teilbar** sein. Feste Ausstattung jedes Buchs: 6 Seiten (Figurenvorstellung als Doppelseite, Suchhinweis, Widmung). Jedes Wimmelbild belegt eine Doppelseite.

| Wimmelbilder | Innenseiten | geht auf |
|---|---|---|
| 3 | 12 | ja |
| 4 | 14 | nein |
| 5 | 16 | ja |
| 6 | 18 | nein |

**Launch-Umfang:** Poster oder gerahmtes Bild (1 Bild), Softcover-Buch klein (3 Bilder, 12 Seiten), Softcover-Buch groß (5 Bilder, 16 Seiten). Nur ungerade Bildzahlen gehen auf — das gibt die Stufen von selbst vor und macht die Upselling-Logik einfach.

### Vorschau in der App

Die Nutzerin soll das Buch vor dem Kauf durchblättern können: Seite für Seite, in der echten Reihenfolge, mit Falzmarkierung. Das ist zugleich ein Verkaufsargument — sie sieht, was sie bekommt.

---

## 4. Buchfalz

In der Bildmitte sitzt bei einer Doppelseite der Falz. Dort wird das Bild gewölbt und teilweise verschluckt.

- **Regel:** Im mittleren Streifen (ca. 8–10 % der Bildbreite) keine Gesichter, keine Helden, keine Gags. Stattdessen ruhige Flächen: Himmel, Wiese, Weg, Hauswand.
- **Drei Umsetzungsorte:** im Bild-Prompt, als Verify-Kriterium (`fold_ok`), und als sichtbare Falzmarkierung in der Vorschau.
- **Festgelegt (19.09.):** Ein Wimmelbild läuft immer über eine Doppelseite. Die Regel gilt damit für jedes Buchbild. Beim Poster spielt sie keine Rolle.

---

## 5. Druckdatei — ein Paket

Drei offene Punkte gehören zusammen und sollten in einem Durchgang gebaut werden:

- **2:1-Beschnitt:** Es gibt aktuell keinen Beschnitt-Schritt im Code. Das generierte Bild landet unverändert im Ergebnis und passt so nicht auf das Endformat 296 × 148 mm.
- **300-dpi-Vermerk:** Die Datei trägt derzeit 72 dpi. Die Pixelzahl reicht (5504 px lange Kante), der Vermerk muss beim Export ohne Neuberechnung umgestellt werden.
- **Wasserzeichenfreie Fassung** für den Druck, siehe Abschnitt 2.
- **Falzabstand** berücksichtigen, siehe Abschnitt 4.

Formatlage (festgelegt 18.09.):

| Produkt | Format | dpi bei 5504 px | Urteil |
|---|---|---|---|
| Buchdoppelseite (2 × 15 × 15 cm) | 296 × 148 mm | 472 | reichlich |
| Poster / gerahmtes Bild | 30 × 60 cm | 233 | gut, kein Beschnitt nötig (2:1) |

4K reicht damit für alle Produkte, Hochskalieren ist nicht nötig.

---

## 6. WizzelWim als Easter Egg

### Idee

Die WizzelWim-Figur ist winzig klein in **jedem** Wimmelbild und auf dem Figurenblatt versteckt — als kleines Suchspiel. Per Default aktiv, von der Nutzerin abschaltbar.

### Umsetzung: als ganz normale Figur

WizzelWim wird technisch behandelt wie eine Heldin, nur mit **festem Referenzbild** statt hochgeladenem Foto. Damit greifen alle Mechanismen, die bereits funktionieren: Referenzbild im Edit-Aufruf, Charakterkonsistenz, eigene Handlung.

Drei Bedingungen:

1. **Er verbraucht keinen der 5 Heldenplätze.** Eigener Slot, unabhängig von den Familienfiguren.
2. **Fest im Hintergrund**, nicht in der Zufallsauswahl der Heldenplätze. Sonst steht der Zauberer irgendwann groß im Vordergrund und stiehlt dem Kind die Szene. Klein genug zum Suchen, groß genug zum Finden — vermutlich Hintergrundebene, aber im Test zu prüfen.
3. **`heroes_ok` darf ihn nicht als fehlende Heldin werten**, und sein Fehlen darf keinen dritten, teuren Generierungsversuch auslösen. Er ist ein Bonus, kein Pflichtinhalt.

**Vorher zu prüfen (Cowork):** Gibt es ein brauchbares WizzelWim-Referenzbild im `wmlstil`? Falls nicht, muss es zuerst erzeugt werden — einmalig, dann fest hinterlegt.

**Alternative**, falls das Mitgenerieren unzuverlässig bleibt: die Figur nachträglich ins fertige Bild setzen. Zuverlässiger, aber optisch aufgesetzt. Erst der Versuch über die Generierung.

---

## 7. Reihenfolge

Vorschlag für die Abarbeitung, nach Abschluss der Bildqualität:

1. **Druckdatei-Paket** (Beschnitt, dpi, Falzregel) — Voraussetzung für jeden echten Druckauftrag, also der härteste Termin.
2. **Wasserzeichen und eigene Bildauslieferung** — schützt das Produkt, sobald es öffentlich ist.
3. **Konto und Guthaben** — technisch der größte Brocken (Registrierung, Übernahme der bisherigen Arbeit, Zahlung, Guthabenverrechnung im Checkout).
4. **Buchlayout und Vorschau** — Verkaufsargument, aber erst sinnvoll, wenn die Bilder final sind.
5. **WizzelWim-Easter-Egg** — schön, aber nicht launch-kritisch.

---

## 8. Entscheidungen, die noch bei Matthias liegen

- Verfällt das Guthaben, und nach welcher Frist?
- Wie viele Korrekturen sind nach dem Aufladen frei?
- Rückerstattung bei Nichtgefallen: ja oder nein?
- Gerahmtes Bild: eigener Rahmenlieferant oder über die Druckerei?

*Erledigt am 19.09.: Produktstufen, Seitenzahlen und die Doppelseiten-Frage — siehe Abschnitt 3.*
