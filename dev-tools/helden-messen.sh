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
# Zwei Varianten, jede mit DERSELBEN Pruefung (Live-Prompt, Kandidat + Figurenblaetter):
#   G  gemini ueber fal -- genau wie live
#   C  Claude (claude-sonnet-5) ueber die Anthropic-API
# Es laufen NUR Pruefaufrufe, keine Bildaufrufe. Zahl und geschaetzte Kosten stehen VOR dem ersten
# Aufruf da, danach wird gefragt.
#   VARIANTEN=GC         welche Varianten (G, C oder GC)
#   LAEUFE=3             Laeufe je Kandidat und Variante
#   PREIS_PRUEFUNG=0.02  angenommener Preis je Pruefaufruf in $, NUR fuer die Schaetzung
#   TROCKEN=1            nur zaehlen und schaetzen, kein Aufruf
set -o pipefail
cd "$(dirname "$0")/.." || exit 1

SITZUNG=docs/ref/sitzung.json
AUSWAHL=docs/ref/helden-auswahl.tsv
ROH=docs/ref/helden-roh.tsv
LAEUFE=${LAEUFE:-3}
VARIANTEN=$(echo "${VARIANTEN:-GC}" | tr 'a-z' 'A-Z')
case "$VARIANTEN" in *G*) HAT_G=1;; *) HAT_G=0;; esac
case "$VARIANTEN" in *C*) HAT_C=1;; *) HAT_C=0;; esac
PREIS_PRUEFUNG=${PREIS_PRUEFUNG:-0.02}

command -v node >/dev/null 2>&1 || { echo "node wird gebraucht, ist aber nicht da."; exit 1; }
[ -f "$SITZUNG" ] || { echo "$SITZUNG fehlt. Erst: TROCKEN=1 bash dev-tools/messen.sh <sessionId>"; exit 1; }
[ -f "$AUSWAHL" ] || { echo "$AUSWAHL fehlt. Erst: node dev-tools/helden-seite.js"; exit 1; }

ANZAHL=$(grep -vc '^#' "$AUSWAHL")
G_N=$(( HAT_G * ANZAHL * LAEUFE ))
C_N=$(( HAT_C * ANZAHL * LAEUFE ))
G_KOSTEN=$(node -e 'console.log((Number(process.argv[1])*Number(process.argv[2])).toFixed(2))' "$G_N" "$PREIS_PRUEFUNG")
# Claude: Obergrenze je Aufruf aus der Anthropic-Doku -- ein Bild kostet hoechstens 4.784 Token
# (lange Kante 2576 px), hier 1 Kandidat + Figurenblaetter; dazu der Prompt (Zeichen / 3,5) und
# grosszuegig 1.000 Ausgabe-Token. Preise Sonnet 5: 2 $ / 10 $ je Mio Token (Preisseite, 21.09.2026).
C_KOSTEN=$(node -e '
  global.window = {}; global.document = { createElement: () => ({ getContext: () => ({}) }) };
  global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  require("./wimmel-wizard-v3/public/js/pipeline.js");
  const P = global.window.Pipeline, fs = require("fs");
  const roh = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const st = roh.data || roh;
  const helden = (st.people || []).filter((p) => p.status === "done" && p.imageUrl);
  const specs = helden.map((p) => { const s = P.makeCharacterSpec({ id: p.id, name: p.name, role: p.role, sourceType: "chips" }); s.identityCore.age = p.age; return s; });
  const promptTok = Math.ceil(P.buildVerifyPrompt(specs, P.ACTIVE_SCENE_PHASE, "cutaway").length / 3.5) + 150;
  const ein = (helden.length + 1) * 4784 + promptTok, aus = 1000;
  const n = Number(process.argv[2]);
  const pe = Number(process.env.PREIS_EIN || 2), pa = Number(process.env.PREIS_AUS || 10);
  console.log((n * (ein / 1e6 * pe + aus / 1e6 * pa)).toFixed(2) + " " + ein);
' "$SITZUNG" "$C_N" 2>/dev/null)
C_BETRAG=${C_KOSTEN%% *}; C_EIN=${C_KOSTEN##* }
echo
echo "Kandidaten: $ANZAHL   Laeufe je Kandidat und Variante: $LAEUFE   Varianten: $VARIANTEN"
echo
echo "  G  PRUEFAUFRUFE ueber fal (gemini):         $G_N"
echo "  C  AUFRUFE ueber die Anthropic-API (Claude): $C_N"
echo "     BILDAUFRUFE:                             0"
echo
[ "$G_N" -gt 0 ] && echo "  G geschaetzt: rund $G_KOSTEN \$  (Annahme $PREIS_PRUEFUNG \$ je Aufruf -- NICHT nachgemessen; fal-Dashboard)"
[ "$C_N" -gt 0 ] && echo "  C hoechstens etwa $C_BETRAG \$  (Obergrenze: je Aufruf bis $C_EIN Eingabe- und 1.000 Ausgabe-Token,"
[ "$C_N" -gt 0 ] && echo "     2 \$ / 10 \$ je Mio Token. Kleinere Figurenblaetter kosten weniger; der echte Verbrauch"
[ "$C_N" -gt 0 ] && echo "     steht am Ende in docs/ref/helden-token.txt)"
echo
if [ "${TROCKEN:-}" = "1" ]; then echo "TROCKEN=1 gesetzt — Schluss vor dem ersten Aufruf."; exit 0; fi

printf 'Weiter? [j/N] '
read -r ANTWORT
case "$ANTWORT" in j|J|ja|Ja|y|Y) ;; *) echo "Abgebrochen, nichts ausgegeben."; exit 0 ;; esac
if [ "$HAT_G" = 1 ] && [ -z "${FAL_KEY:-}" ]; then
  printf 'FAL_KEY (Eingabe bleibt unsichtbar): '
  stty -echo 2>/dev/null; read -r FAL_KEY; stty echo 2>/dev/null; echo
  [ -n "$FAL_KEY" ] || { echo "Ohne FAL_KEY geht es nicht."; exit 1; }
fi
if [ "$HAT_C" = 1 ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  printf 'ANTHROPIC_API_KEY (Eingabe bleibt unsichtbar): '
  stty -echo 2>/dev/null; read -r ANTHROPIC_API_KEY; stty echo 2>/dev/null; echo
  [ -n "$ANTHROPIC_API_KEY" ] || { echo "Ohne ANTHROPIC_API_KEY geht es nicht."; exit 1; }
fi
rm -f docs/ref/helden-token.txt

FAL_KEY="${FAL_KEY:-}" ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" node dev-tools/_helden-lauf.js "$SITZUNG" "$AUSWAHL" "$LAEUFE" "$VARIANTEN" > "$ROH" || { echo "Der Messlauf ist abgebrochen. Was bis dahin kam, steht in $ROH."; }
echo
node dev-tools/_helden-tabelle.js "$ROH" docs/ref/wahrheit.tsv "$SITZUNG" "$AUSWAHL"
