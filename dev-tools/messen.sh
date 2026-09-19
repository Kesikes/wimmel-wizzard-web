#!/usr/bin/env bash
# dev-tools/messen.sh — misst den Stil aller Kandidaten einer Sitzung, auch der verworfenen.
#
#     bash dev-tools/messen.sh
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
#   TROCKEN=1                alles bis zur Tabelle, aber ohne einen einzigen Pruefaufruf

set -o pipefail
cd "$(dirname "$0")/.." || exit 1

APP=${APP:-https://wimmel-wizard-v3.vercel.app}
REFERENZ=docs/ref/referenz.jpg
ERGEBNIS=docs/ref/ergebnis.txt

command -v node >/dev/null 2>&1 || { echo "node wird gebraucht, ist aber nicht da."; exit 1; }

ARBEIT=$(mktemp -d) || exit 1
trap 'rm -rf "$ARBEIT"' EXIT

# ---------- 1. Sitzung besorgen ----------
if [ -n "${SITZUNGSDATEI:-}" ]; then
  echo "Sitzung aus Datei: $SITZUNGSDATEI"
  cp "$SITZUNGSDATEI" "$ARBEIT/sitzung.json" || exit 1
else
  printf 'sessionId: '
  read -r SESSION
  [ -n "$SESSION" ] || { echo "Ohne sessionId geht es nicht."; exit 1; }
  echo "Hole die Sitzung von $APP ..."
  curl -sS -X POST "$APP/api/session" \
    -H 'content-type: application/json' \
    -d "{\"mode\":\"load\",\"sessionId\":\"$SESSION\"}" \
    -o "$ARBEIT/sitzung.json" || { echo "Der Server war nicht erreichbar."; exit 1; }
fi

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
fi

# ---------- 4. Tabelle bauen ----------
node dev-tools/_messen-tabelle.js \
  "$ARBEIT/kandidaten.tsv" "$ARBEIT/messwerte.tsv" "$REFERENZ" "$ERGEBNIS" || exit 1

echo "Gespeichert in $ERGEBNIS"
