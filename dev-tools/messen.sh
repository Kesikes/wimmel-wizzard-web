#!/usr/bin/env bash
# dev-tools/messen.sh — misst den Stil aller Kandidaten einer Sitzung, auch der verworfenen.
#
#     bash dev-tools/messen.sh [sessionId]
#
# Die sessionId kann als Argument mitgegeben werden, sonst fragt das Skript danach.
#
# Fragt nach sessionId und FAL_KEY (verdeckt), holt den Sitzungsstand vom Server, sammelt die
# Bild-URLs ALLER Kandidaten (auch der nicht gewaehlten), prueft sie zusammen mit
# docs/ref/referenz.jpg und zeigt eine Tabelle. Dieselbe Tabelle landet in docs/ref/ergebnis.txt.
#
# Es laufen NUR Pruefaufrufe (openrouter/router/vision), keine Bildaufrufe. Vor dem ersten Aufruf
# wird gefragt, wie viele es werden.
#
# Umgebungsvariablen, alle optional:
#   APP=https://...          andere Adresse als wimmel-wizard-v3.vercel.app
#   SITZUNGSDATEI=pfad.json  fertige Sitzungs-JSON benutzen statt sie zu holen (zum Ausprobieren
#                            ohne Netz; dann wird auch nicht nach der sessionId gefragt)
#   NUR="7 Berg"             nur Bilder, deren Kennung diesen Text enthaelt (billiger Vorlauf)
#   TROCKEN=1                alles bis zur Tabelle, aber ohne einen einzigen Pruefaufruf

set -o pipefail
cd "$(dirname "$0")/.." || exit 1

APP=${APP:-https://wimmel-wizard-v3.vercel.app}
# Das Referenzbild liegt seit 20.09.2026 fest im Repo (Bauernhof, 18.09.) -- es ist der
# Bezugspunkt fuer den Stilvergleich und wird auch vom D-Richter gebraucht.
REFERENZ=wimmel-wizard-v3/public/assets/referenz-bauernhof-2026-09-18.jpg
ERGEBNIS=docs/ref/ergebnis.txt
# Rohdaten aufheben: ohne sie laesst sich hinterher nicht mehr nachrechnen, warum ein Kandidat
# gewonnen hat -- die gespeicherten Verify-Werte stehen NUR in der Sitzung. Beide Dateien sind in
# docs/ref/.gitignore und verlassen das Verzeichnis nicht.
SITZUNG_KOPIE=docs/ref/sitzung.json
MESSWERTE_KOPIE=docs/ref/messwerte.tsv

command -v node >/dev/null 2>&1 || { echo "node wird gebraucht, ist aber nicht da."; exit 1; }

ARBEIT=$(mktemp -d) || exit 1
trap 'rm -rf "$ARBEIT"' EXIT

# ---------- 1. Sitzung besorgen ----------
if [ -n "${SITZUNGSDATEI:-}" ]; then
  echo "Sitzung aus Datei: $SITZUNGSDATEI"
  cp "$SITZUNGSDATEI" "$ARBEIT/sitzung.json" || exit 1
else
  # Als Argument mitgegeben? Dann nicht fragen.
  SESSION=${1:-}
  if [ -n "$SESSION" ]; then
    echo "sessionId aus dem Aufruf: $SESSION"
  else
    printf 'sessionId: '
    read -r SESSION
  fi
  [ -n "$SESSION" ] || { echo "Ohne sessionId geht es nicht."; exit 1; }
  echo "Hole die Sitzung von $APP ..."
  curl -sS -X POST "$APP/api/session" \
    -H 'content-type: application/json' \
    -d "{\"mode\":\"load\",\"sessionId\":\"$SESSION\"}" \
    -o "$ARBEIT/sitzung.json" || { echo "Der Server war nicht erreichbar."; exit 1; }
fi

cp "$ARBEIT/sitzung.json" "$SITZUNG_KOPIE" 2>/dev/null

# ---------- 2. Kandidaten herausziehen ----------
# Ausgabe je Zeile: bildNr <TAB> bildTitel <TAB> kandNr <TAB> ja|nein <TAB> url
node -e '
const fs = require("fs");
let roh;
try { roh = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); }
catch (e) { console.error("Die Antwort war kein lesbares JSON: " + e.message); process.exit(2); }
const stand = roh && roh.data ? roh.data : roh;
const bilder = (stand && stand.images) || [];
if (!bilder.length) { console.error("In dieser Sitzung sind keine Bilder gespeichert."); process.exit(3); }
bilder.forEach((bild, bi) => {
  const kandidaten = (bild.candidates && bild.candidates.length) ? bild.candidates : [{ url: bild.src }];
  kandidaten.forEach((k, ki) => {
    if (!k || !k.url) return;
    const gewaehlt = (k.url === bild.src) ? "ja" : "nein";
    console.log([bi + 1, bild.title || "Wimmelbild", ki + 1, gewaehlt, k.url].join("\t"));
  });
});
' "$ARBEIT/sitzung.json" > "$ARBEIT/kandidaten.tsv"
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo
  echo "Abgebrochen. Erste Zeilen der Serverantwort, zur Kontrolle:"
  head -c 400 "$ARBEIT/sitzung.json"; echo
  exit 1
fi

# NEU (20.09.2026): NUR=... wie in stabilitaet.sh. Vorher kannte nur das Stabilitaets-Werkzeug
# diesen Filter -- in messen.sh wurde er STILL IGNORIERT. Wer ihn hier benutzte, bezahlte
# klaglos den vollen Lauf. Ein Schalter, der nichts tut, ist schlimmer als keiner.
if [ -n "${NUR:-}" ]; then
  # Die Kennung steht hier in ZWEI Spalten (Bildnummer und Titel, durch Tabulator getrennt) --
  # ein blosses grep auf "7 Berg" findet deshalb nichts. Verglichen wird die zusammengesetzte
  # Kennung, genau so, wie sie in der Tabelle erscheint.
  awk -F'\t' -v muster="$NUR" 'index($1" "$2, muster) > 0' "$ARBEIT/kandidaten.tsv" > "$ARBEIT/gefiltert.tsv"
  if [ ! -s "$ARBEIT/gefiltert.tsv" ]; then
    echo "NUR=\"$NUR\" passt auf kein Bild. Vorhandene Kennungen:"
    awk -F'\t' '{print "  " $1" "$2}' "$ARBEIT/kandidaten.tsv" | sort -u; exit 1
  fi
  mv "$ARBEIT/gefiltert.tsv" "$ARBEIT/kandidaten.tsv"
  echo "Eingeschraenkt auf Kennungen mit \"$NUR\"."
fi

ANZAHL_K=$(wc -l < "$ARBEIT/kandidaten.tsv" | tr -d ' ')
HAT_REFERENZ=nein
[ -f "$REFERENZ" ] && HAT_REFERENZ=ja
ANZAHL_GESAMT=$ANZAHL_K
[ "$HAT_REFERENZ" = ja ] && ANZAHL_GESAMT=$((ANZAHL_K + 1))

echo
echo "Gefunden: $ANZAHL_K Kandidaten in $(cut -f1 "$ARBEIT/kandidaten.tsv" | sort -u | wc -l | tr -d ' ') Bildern."
if [ "$HAT_REFERENZ" = ja ]; then
  echo "Referenzbild: $REFERENZ"
else
  echo "Referenzbild: $REFERENZ fehlt — wird uebersprungen."
fi
echo "Das ergibt $ANZAHL_GESAMT Pruefaufrufe. Bildaufrufe: keine."

if [ "${TROCKEN:-}" = "1" ]; then
  echo "TROCKEN=1 gesetzt — es wird nichts geprueft."
  : > "$ARBEIT/messwerte.tsv"
else
  printf 'Weiter? [j/N] '
  read -r ANTWORT
  case "$ANTWORT" in
    j|J|ja|Ja|y|Y) ;;
    *) echo "Abgebrochen, nichts ausgegeben."; exit 0 ;;
  esac

  printf 'FAL_KEY (Eingabe bleibt unsichtbar): '
  stty -echo 2>/dev/null; read -r FAL_KEY; stty echo 2>/dev/null; echo
  [ -n "$FAL_KEY" ] || { echo "Ohne FAL_KEY geht es nicht."; exit 1; }

  # ---------- 3. alles in EINEM Aufruf pruefen ----------
  QUELLEN=()
  [ "$HAT_REFERENZ" = ja ] && QUELLEN+=("$REFERENZ")
  while IFS=$'\t' read -r _ _ _ _ url; do QUELLEN+=("$url"); done < "$ARBEIT/kandidaten.tsv"

  echo "Pruefe $ANZAHL_GESAMT Bilder, das dauert einen Moment ..."
  FAL_KEY="$FAL_KEY" AUSGABE=tsv node dev-tools/stil-nachmessen.js "${QUELLEN[@]}" > "$ARBEIT/messwerte.tsv"
  cp "$ARBEIT/messwerte.tsv" "$MESSWERTE_KOPIE" 2>/dev/null
fi

# ---------- 4. Tabelle bauen ----------
node dev-tools/_messen-tabelle.js \
  "$ARBEIT/kandidaten.tsv" "$ARBEIT/messwerte.tsv" "$REFERENZ" "$ERGEBNIS" || exit 1

echo "Gespeichert in $ERGEBNIS"
echo "Rohdaten fuer die Auswertung: $SITZUNG_KOPIE und $MESSWERTE_KOPIE"
echo "Auswertung (ohne Netz, ohne Kosten): node dev-tools/auswertung.js"
