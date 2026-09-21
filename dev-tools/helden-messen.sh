#!/usr/bin/env bash
# dev-tools/helden-messen.sh — misst, wie verlaesslich die automatische Heldenzaehlung
# (heroes_found) ist: dreimal dieselbe Pruefung je Kandidat, verglichen mit deiner Zaehlung.
#
#     bash dev-tools/helden-messen.sh
#
# Vorher (einmal):
#   TROCKEN=1 bash dev-tools/messen.sh <sessionId>   holt die Sitzung nach docs/ref/sitzung.json
#   node dev-tools/helden-seite.js                   baut docs/ref/helden.html + helden-auswahl.tsv
#   docs/ref/helden.html oeffnen, zaehlen, Zeilen in docs/ref/wahrheit.tsv einfuegen
#
# Die Reihenfolge Zaehlen -> Messen ist egal; die Auswertung laesst sich jederzeit ohne Kosten
# wiederholen: node dev-tools/_helden-tabelle.js
#
# Es laufen NUR Pruefaufrufe (gemini ueber fal), keine Bildaufrufe. Zahl und geschaetzte Kosten
# stehen VOR dem ersten Aufruf da, danach wird gefragt.
#   LAEUFE=3             Laeufe je Kandidat
#   PREIS_PRUEFUNG=0.02  angenommener Preis je Pruefaufruf in $, NUR fuer die Schaetzung
#   TROCKEN=1            nur zaehlen und schaetzen, kein Aufruf
set -o pipefail
cd "$(dirname "$0")/.." || exit 1

SITZUNG=docs/ref/sitzung.json
AUSWAHL=docs/ref/helden-auswahl.tsv
ROH=docs/ref/helden-roh.tsv
LAEUFE=${LAEUFE:-3}
PREIS_PRUEFUNG=${PREIS_PRUEFUNG:-0.02}

command -v node >/dev/null 2>&1 || { echo "node wird gebraucht, ist aber nicht da."; exit 1; }
[ -f "$SITZUNG" ] || { echo "$SITZUNG fehlt. Erst: TROCKEN=1 bash dev-tools/messen.sh <sessionId>"; exit 1; }
[ -f "$AUSWAHL" ] || { echo "$AUSWAHL fehlt. Erst: node dev-tools/helden-seite.js"; exit 1; }

ANZAHL=$(grep -vc '^#' "$AUSWAHL")
AUFRUFE=$(( ANZAHL * LAEUFE ))
KOSTEN=$(node -e 'console.log((Number(process.argv[1])*Number(process.argv[2])).toFixed(2))' "$AUFRUFE" "$PREIS_PRUEFUNG")
echo
echo "Kandidaten: $ANZAHL   Laeufe je Kandidat: $LAEUFE"
echo "  PRUEFAUFRUFE ueber fal: $AUFRUFE"
echo "  BILDAUFRUFE:            0"
echo "  geschaetzt: rund $KOSTEN \$  (Annahme $PREIS_PRUEFUNG \$ je Pruefaufruf -- NICHT nachgemessen;"
echo "  der echte Preis steht im fal-Dashboard)"
echo
if [ "${TROCKEN:-}" = "1" ]; then echo "TROCKEN=1 gesetzt — Schluss vor dem ersten Aufruf."; exit 0; fi

printf 'Weiter? [j/N] '
read -r ANTWORT
case "$ANTWORT" in j|J|ja|Ja|y|Y) ;; *) echo "Abgebrochen, nichts ausgegeben."; exit 0 ;; esac
printf 'FAL_KEY (Eingabe bleibt unsichtbar): '
stty -echo 2>/dev/null; read -r FAL_KEY; stty echo 2>/dev/null; echo
[ -n "$FAL_KEY" ] || { echo "Ohne FAL_KEY geht es nicht."; exit 1; }

FAL_KEY="$FAL_KEY" node dev-tools/_helden-lauf.js "$SITZUNG" "$AUSWAHL" "$LAEUFE" > "$ROH" || { echo "Der Messlauf ist abgebrochen. Was bis dahin kam, steht in $ROH."; }
echo
node dev-tools/_helden-tabelle.js "$ROH" docs/ref/wahrheit.tsv "$SITZUNG" "$AUSWAHL"
