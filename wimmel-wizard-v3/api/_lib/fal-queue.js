// api/lib/fal-queue.js — NEU (Sammel-Runde 15.09.2026, "Warteschlangen-Architektur auf Szenen-Pfad
// uebertragen"). Enthaelt die generische, modell-unabhaengige fal.ai-Warteschlangen-/Verify-Plumbing,
// die api/lib/char-job-engine.js (Figuren-Pfad) UND das neue api/lib/scene-job-engine.js (Szenen-Pfad)
// BEIDE brauchen -- vorher lag das komplett dupliziert in char-job-engine.js (siehe dortiger
// Kommentar-Rest zu pipeline.js: DAS bleibt dupliziert, weil pipeline.js ein Browser-Modul ist und
// nicht per require() eingebunden werden kann). char-job-engine.js UND scene-job-engine.js sind
// dagegen BEIDE serverseitige Node-CommonJS-Module -- ein Teilen per require() ist hier technisch
// unproblematisch und reduziert das Risiko, das der Verify-Bugfix vom 15.09.2026 gezeigt hat: eine
// einzelne falsch kopierte Zeile (Warteschlange statt synchroner Aufruf) an zwei Stellen zu pflegen
// ist fehleranfaelliger als eine gemeinsame, einmal getestete Quelle.
//
// VERIFY_MODEL/callFalVerifySync(): siehe ausfuehrlichen Bugfix-Kommentar, der hier herzog (vorher in
// char-job-engine.js) -- der Verify-Aufruf (openrouter/router/vision) unterstuetzt den asynchronen
// queue.fal.run-Warteschlangen-Modus nicht zuverlaessig (Live-Test 15.09.2026: schlug bei JEDEM
// Kandidaten fehl). Laeuft daher bewusst SYNCHRON ueber den direkten fal.run-Endpunkt, genau wie der
// bestehende, produktive Verify-Aufruf in api/fal-proxy.js das für dieses Modell schon immer tut.
const VERIFY_MODEL = "openrouter/router/vision";

const { sendMailWithCooldown } = require("./mail");

// logFalError(context, message): ZENTRALE Stelle fuer JEDEN fal.ai-bezogenen Fehler auf der
// serverseitigen Job-Warteschlange (char-job-engine.js/scene-job-engine.js UND deren Einstiegspunkte
// api/char-job-start.js/api/scene-job-start.js) -- NEU (Sammel-Runde 16.09.2026, live gefunden:
// "fal.ai 403 User is locked. Reason: TOP_UP" direkt bei der Nutzerin sichtbar). Vorher wurden
// fal.ai-Fehler hier je nach Stelle entweder komplett verschluckt (char-job-engine.js:
// advanceCharacterJob()s Generierungs-Katch-Block setzte nur genStatus:"error", OHNE die Nachricht
// irgendwo festzuhalten -- der genaue Grund war aus den Logs nicht mehr rekonstruierbar) oder 1:1 roh
// bis zum Job-Ergebnis durchgereicht (scene-job-engine.js finalizeJob() haengte den ersten gefundenen
// Rohfehler als "(Details: ...)" an die client-sichtbare Fehlermeldung -- das war der wahrscheinlichste
// tatsaechliche Ursprung des gemeldeten "TOP_UP"-Texts, siehe auch api/char-job-start.js/
// api/scene-job-start.js, die einen kompletten Job-Start-Fehler bisher ebenfalls 1:1 durchgereicht
// haben). logFalError() vereinheitlicht das: loggt den vollen Rohfehler SERVERSEITIG (Vercel-
// Funktionslogs), erkennt den Sonderfall "Account gesperrt/kein Guthaben" (403 + TOP_UP/locked/
// credit/balance im Fehlertext -- das ist der einzige Fehlerfall, der NICHT von selbst beim naechsten
// Versuch verschwindet) und loest dafuer eine gedaempfte Warn-Mail aus (siehe sendMailWithCooldown()
// in mail.js), gibt aber IMMER nur einen ruhigen, fuer die Nutzerin geeigneten Text zurueck, den alle
// Aufrufer statt des Rohfehlers verwenden.
async function logFalError(context, message) {
  const msg = String(message || "");
  console.error("[FAL_ERROR]", context, msg.slice(0, 500));
  if (/\b403\b/.test(msg) && /TOP_UP|locked|credit|balance/i.test(msg)) {
    console.error("[FAL_BILLING_ALERT]", context, "fal.ai-Account moeglicherweise gesperrt/ohne Guthaben.");
    try {
      await sendMailWithCooldown("fal-billing", 15 * 60, {
        to: "mk@iicm.consulting",
        subject: "⚠️ fal.ai Guthaben-Problem (Wimmel Wizard)",
        html:
          "<p>fal.ai meldet einen Fehler, der nach einem Guthaben-/Sperr-Problem aussieht (Aufruf: <b>" + context + "</b>):</p>" +
          "<pre>" + msg.slice(0, 500).replace(/[<>]/g, "") + "</pre>" +
          '<p>Bitte im <a href="https://fal.ai/dashboard/usage-billing">fal.ai-Dashboard</a> pruefen. Bis das behoben ist, sehen Nutzerinnen statt einer echten Fehlermeldung nur "Da hat gerade etwas nicht geklappt" -- die App bleibt also nutzbar, generiert aber keine Bilder.</p>',
      });
    } catch (mailErr) {
      console.error("[FAL_BILLING_ALERT] Warn-Mail fehlgeschlagen:", String(mailErr));
    }
  }
  return "Da hat gerade etwas nicht geklappt. Versuch es bitte in ein paar Minuten nochmal.";
}

function falHeaders(FAL_KEY) {
  return { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" };
}

// falBaseAppId(): GEFUNDEN per Live-Test 15.09.2026 direkt nach dem Szenen-Deploy -- alle 3
// Generierungs-Kandidaten scheiterten mit "fal.ai Queue-Status-Fehler 405" (davor unsichtbar, siehe
// genError-Bugfix direkt zuvor, der diese Meldung erst sichtbar gemacht hat). Ursache laut fal.ai-
// Dokumentation (docs.fal.ai/model-apis/model-endpoints/queue, per Websuche bestaetigt): manche
// Modelle bieten mehrere Faehigkeiten unter Unterpfaden an (Beispiel dort: "fal-ai/flux/dev") -- der
// Unterpfad gehoert NUR in den Submit-Aufruf, NICHT in die Status-/Ergebnis-Abfrage, die stattdessen
// die BASIS-App-ID (nur "namespace/modellname", ohne Unterpfad) erwartet. SCENE_MODEL
// ("fal-ai/nano-banana-pro/edit") hat genau so einen Unterpfad ("/edit") -- FLUX_MODEL
// ("fal-ai/flux-lora", Figuren-Pfad) hat KEINEN, weshalb der Figuren-Pfad davon nie betroffen war und
// im Machbarkeitstest fehlerfrei lief. submitFalQueue() bekommt weiterhin das volle model (mit
// Unterpfad) -- falQueueStatus()/falQueueResult() kappen jetzt selbst auf die ersten zwei
// Pfadsegmente, bevor sie die URL bauen, damit kein Aufrufer das von sich aus wissen/beachten muss.
function falBaseAppId(model) {
  const parts = String(model).split("/");
  return parts.slice(0, 2).join("/");
}

async function submitFalQueue(model, body, FAL_KEY) {
  const resp = await fetch("https://queue.fal.run/" + model, {
    method: "POST", headers: falHeaders(FAL_KEY), body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Queue-Submit-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  const data = await resp.json();
  if (!data || !data.request_id) throw new Error("fal.ai Queue-Submit hat keine request_id geliefert.");
  return data.request_id;
}

async function falQueueStatus(model, requestId, FAL_KEY) {
  const resp = await fetch("https://queue.fal.run/" + falBaseAppId(model) + "/requests/" + requestId + "/status", {
    headers: { Authorization: "Key " + FAL_KEY },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Queue-Status-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  return resp.json();
}

async function falQueueResult(model, requestId, FAL_KEY) {
  const resp = await fetch("https://queue.fal.run/" + falBaseAppId(model) + "/requests/" + requestId, {
    headers: { Authorization: "Key " + FAL_KEY },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Queue-Ergebnis-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  return resp.json();
}

// callFalVerifySync(imageUrls, prompt, FAL_KEY): EIN direkter, synchroner Aufruf (kein Queue-Submit).
// system_prompt/model/temperature/reasoning/max_tokens 1:1 identisch zum bestehenden, produktiven
// Verify-Aufruf in api/fal-proxy.js (mode:"verify") -- siehe dortige Kommentare zur Herleitung dieser
// konkreten Werte (Modellvergleich, Live-Test-Kalibrierung).
// GEAENDERT (Verify-Blindspot-Fix 16.09.2026): imageUrls ist jetzt ein Array statt eines einzelnen
// Strings -- der Szenen-Pfad (scene-job-engine.js) schickt zusaetzlich zum generierten Bild die
// Helden-Referenzbilder mit (siehe dortiger Kommentar). Ein einzelner String bleibt gueltig
// (char-job-engine.js schickt weiterhin nur EIN Bild, dort automatisch in ein Array gewickelt).
async function callFalVerifySync(imageUrls, prompt, FAL_KEY) {
  const urls = (Array.isArray(imageUrls) ? imageUrls : [imageUrls]).filter(Boolean);
  const resp = await fetch("https://fal.run/" + VERIFY_MODEL, {
    method: "POST",
    headers: falHeaders(FAL_KEY),
    body: JSON.stringify({
      image_urls: urls,
      prompt,
      system_prompt: "You are a meticulous visual QA checker for a children's illustration style guide. Carefully scan the ENTIRE image before answering. You may add reasoning before the JSON, but keep it to brief keywords or short phrases only — the JSON object itself must always fit within your response and be the very last thing in your answer, with no markdown formatting.",
      model: "google/gemini-2.5-pro",
      temperature: 0,
      reasoning: true,
      max_tokens: 1200,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Vision-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  const data = await resp.json();
  return (data && data.output) || "";
}

// countViolations(): generisches "*_ok"-Zaehlmuster -- funktioniert unveraendert fuer den
// Charakter-Verify (4 Felder: single_ok/complete_ok/mouth_ok/style_ok) UND den Szenen-Verify (3
// Felder: heroes_ok/mouths_ok/style_ok), da beide Prompts konsequent dieser Namenskonvention folgen
// (siehe buildCharacterVerifyPrompt() in char-job-engine.js bzw. buildSceneVerifyPrompt() in
// scene-job-engine.js).
function countViolations(verifyOutputText) {
  const match = String(verifyOutputText || "").match(/\{[\s\S]*\}/);
  if (!match) return { violations: 99, parsed: null };
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch (e) { return { violations: 99, parsed: null }; }
  let violations = 0;
  Object.keys(parsed).forEach((k) => { if (/_ok$/.test(k) && parsed[k] === false) violations++; });
  return { violations, parsed };
}

module.exports = {
  VERIFY_MODEL, falHeaders, falBaseAppId,
  submitFalQueue, falQueueStatus, falQueueResult, callFalVerifySync,
  countViolations, logFalError,
};
