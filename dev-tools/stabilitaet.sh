#!/usr/bin/env bash
# dev-tools/stabilitaet.sh — misst, wie stark die Gesichterzaehlung zwischen identischen
# Pruefaufrufen schwankt.
#
#     bash dev-tools/stabilitaet.sh [sessionId]
#
# Prueft jeden Kandidaten der Sitzung plus docs/ref/referenz.jpg in ZWEI Varianten, jede DREIMAL:
#   A  die heutige Live-Pruefung, unveraendert (buildVerifyPrompt)
#   B  eine schlanke reine Stilpruefung: nur shaded_of_ten, mouths_of_ten, blank_of_ten,
#      shadows_of_ten, light_direction
# Am Live-Verhalten aendert das nichts -- beides laeuft nur hier im Werkzeug.
#
# Es laufen NUR Pruefaufrufe, keine Bildaufrufe. Die Zahl und die geschaetzten Kosten stehen VOR
# der Abfrage des FAL_KEY; ein Abbruch davor kostet nichts.
#
# Umgebungsvariablen, alle optional:
#   APP=https://...          andere Adresse als wimmel-wizard-v3.vercel.app
#   SITZUNGSDATEI=pfad.json  fertige Sitzungs-JSON benutzen statt sie zu holen
#   LAEUFE=3                 Laeufe je Variante
#   NUR="7 Berg"             nur Bilder, deren Kennung diesen Text enthaelt (billiger Vorlauf)
#   PREIS_PRUEFUNG=0.02      angenommener Preis je Pruefaufruf in $, NUR fuer die Schaetzung
#   TROCKEN=1                alles bis zur Kostenansage, dann Schluss

set -o pipefail
cd "$(dirname "$0")/.." || exit 1

APP=${APP:-https://wimmel-wizard-v3.vercel.app}
REFERENZ=docs/ref/referenz.jpg
ROH=docs/ref/stabilitaet-roh.tsv
ERGEBNIS=docs/ref/stabilitaet.txt
LAEUFE=${LAEUFE:-3}
PREIS_PRUEFUNG=${PREIS_PRUEFUNG:-0.02}

command -v node >/dev/null 2>&1 || { echo "node wird gebraucht, ist aber nicht da."; exit 1; }
ARBEIT=$(mktemp -d) || exit 1
trap 'rm -rf "$ARBEIT"' EXIT

# ---------- 1. Sitzung besorgen ----------
if [ -n "${SITZUNGSDATEI:-}" ]; then
  echo "Sitzung aus Datei: $SITZUNGSDATEI"
  cp "$SITZUNGSDATEI" "$ARBEIT/sitzung.json" || exit 1
else
  SESSION=${1:-}
  if [ -n "$SESSION" ]; then echo "sessionId aus dem Aufruf: $SESSION"
  else printf 'sessionId: '; read -r SESSION; fi
  [ -n "$SESSION" ] || { echo "Ohne sessionId geht es nicht."; exit 1; }
  echo "Hole die Sitzung von $APP ..."
  curl -sS -X POST "$APP/api/session" -H 'content-type: application/json' \
    -d "{\"mode\":\"load\",\"sessionId\":\"$SESSION\"}" -o "$ARBEIT/sitzung.json" \
    || { echo "Der Server war nicht erreichbar."; exit 1; }
fi

# ---------- 2. Bildliste bauen: kennung <TAB> quelle ----------
: > "$ARBEIT/bilder.tsv"
[ -f "$REFERENZ" ] && printf 'REF\t%s\n' "$REFERENZ" >> "$ARBEIT/bilder.tsv"
node -e '
const fs=require("fs");
let roh; try{ roh=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); }
catch(e){ console.error("Die Antwort war kein lesbares JSON: "+e.message); process.exit(2); }
const st=roh&&roh.data?roh.data:roh;
const bilder=(st&&st.images)||[];
if(!bilder.length){ console.error("In dieser Sitzung sind keine Bilder gespeichert."); process.exit(3); }
bilder.forEach((b,bi)=>{
  const k=(b.candidates&&b.candidates.length)?b.candidates:[{url:b.src}];
  k.forEach((c,ci)=>{ if(c&&c.url) console.log([(bi+1)+" "+(b.title||"Bild")+" K"+(ci+1), c.url].join("\t")); });
});
' "$ARBEIT/sitzung.json" >> "$ARBEIT/bilder.tsv" || {
  echo; echo "Abgebrochen. Erste Zeichen der Serverantwort:"; head -c 400 "$ARBEIT/sitzung.json"; echo; exit 1; }

# NUR=... filtert die Bildliste, bevor gezaehlt und bezahlt wird.
if [ -n "${NUR:-}" ]; then
  grep -F "$NUR" "$ARBEIT/bilder.tsv" > "$ARBEIT/gefiltert.tsv"
  if [ ! -s "$ARBEIT/gefiltert.tsv" ]; then
    echo "NUR=\"$NUR\" passt auf kein Bild. Vorhandene Kennungen:"; cut -f1 "$ARBEIT/bilder.tsv" | sed 's/^/  /'; exit 1
  fi
  mv "$ARBEIT/gefiltert.tsv" "$ARBEIT/bilder.tsv"
  echo "Eingeschraenkt auf Kennungen mit \"$NUR\"."
fi

ANZAHL_BILDER=$(wc -l < "$ARBEIT/bilder.tsv" | tr -d ' ')
AUFRUFE=$((ANZAHL_BILDER * 2 * LAEUFE))
KOSTEN=$(node -e 'console.log((Number(process.argv[1])*Number(process.argv[2])).toFixed(2))' "$AUFRUFE" "$PREIS_PRUEFUNG")

echo
echo "Bilder (Kandidaten inkl. verworfener, plus Referenzbild): $ANZAHL_BILDER"
echo "Varianten: 2 (A Live-Pruefung, B schlanke Stilpruefung), Laeufe je Variante: $LAEUFE"
echo
echo "  PRUEFAUFRUFE:  $AUFRUFE"
echo "  BILDAUFRUFE:   0"
echo "  geschaetzte Kosten: rund $KOSTEN \$"
echo "  (Annahme $PREIS_PRUEFUNG \$ je Pruefaufruf -- NICHT nachgemessen. Der echte Preis steht im"
echo "   fal-Dashboard; mit PREIS_PRUEFUNG=... laesst sich die Schaetzung korrigieren.)"
echo

if [ "${TROCKEN:-}" = "1" ]; then echo "TROCKEN=1 gesetzt — Schluss vor dem ersten Aufruf."; exit 0; fi

printf 'Weiter? [j/N] '
read -r ANTWORT
case "$ANTWORT" in j|J|ja|Ja|y|Y) ;; *) echo "Abgebrochen, nichts ausgegeben."; exit 0 ;; esac

printf 'FAL_KEY (Eingabe bleibt unsichtbar): '
stty -echo 2>/dev/null; read -r FAL_KEY; stty echo 2>/dev/null; echo
[ -n "$FAL_KEY" ] || { echo "Ohne FAL_KEY geht es nicht."; exit 1; }

echo "Laeuft. $AUFRUFE Aufrufe nacheinander, das dauert."
FAL_KEY="$FAL_KEY" node dev-tools/_stabilitaet-lauf.js "$ARBEIT/bilder.tsv" "$LAEUFE" > "$ARBEIT/roh.tsv" || exit 1
cp "$ARBEIT/roh.tsv" "$ROH" 2>/dev/null

node dev-tools/_stabilitaet-tabelle.js "$ARBEIT/roh.tsv" "$ERGEBNIS" || exit 1
echo "Gespeichert in $ERGEBNIS, Rohdaten in $ROH"
