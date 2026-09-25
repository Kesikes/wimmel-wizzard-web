// api/_lib/grenzen.js — die Zahlen, die an MEHR ALS EINEM Endpunkt gelten. Eine Zahl, eine Stelle.
//
// ANLASS (25.09.2026, Befund des Nutzers beim Sammelblatt-Versuch): Fuer die Promptlaenge gab es
// ZWEI Grenzen an zwei Endpunkten, die dieselbe Sache bewachen.
//   api/scene-job-start.js   30.000  (am 22.09.2026 angehoben, Nutzer-Entscheidung)
//   api/fal-proxy.js         16.000  (seit 10.09.2026 unveraendert -- beim Anheben uebersehen)
// Der Produktpfad einer Szene laeuft ueber scene-job-start, deshalb fiel es monatelang nicht auf.
// Der Sammelblatt-Versuch laeuft ueber fal-proxy, und dort wurden ALLE 20 Fassungen bei rund 20.500
// Zeichen mit "Prompt zu lang" abgewiesen -- kein einziges Bild, und der Grund sah aus wie ein
// Fehler des Versuchs statt wie eine vergessene Zahl.
//
// Das ist dasselbe Muster wie beim gelben Kasten vom 24.09.: eine Aussage steht an zwei Stellen,
// eine wird gepflegt, die andere nicht, und niemand sucht nach Geschwistern. Die Abhilfe ist
// dieselbe wie bei HERO_REF_START in pipeline.js: die Zahl steht EINMAL.
//
// WARUM 30.000 UND NICHT 16.000 (technische Entscheidung, 25.09.2026):
// Die Grenze ist ein Missbrauchsschutz, kein fal-Limit (fal erlaubt laut Schema 50.000). Beide
// Endpunkte sind gleich oeffentlich, beide unauthentifiziert, beide mit eigener Anfragegrenze und
// beide an der Kosten-Notbremse. Wer einen 30.000 Zeichen langen Prompt schicken will, kann das
// ueber scene-job-start ohnehin -- die kleinere Zahl bei fal-proxy hat also nichts geschuetzt, was
// nicht schon offen war, und die Laenge aendert am Preis nichts (fal rechnet je Bild ab). Was
// wirklich schuetzt, sind die Anfragegrenzen je IP und der Tagesdeckel.
const MAX_PROMPT_ZEICHEN = 30000;

module.exports = { MAX_PROMPT_ZEICHEN };
