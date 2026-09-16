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

// callFalVerifySync(imageUrl, prompt, FAL_KEY): EIN direkter, synchroner Aufruf (kein Queue-Submit).
// system_prompt/model/temperature/reasoning/max_tokens 1:1 identisch zum bestehenden, produktiven
// Verify-Aufruf in api/fal-proxy.js (mode:"verify") -- siehe dortige Kommentare zur Herleitung dieser
// konkreten Werte (Modellvergleich, Live-Test-Kalibrierung).
async function callFalVerifySync(imageUrl, prompt, FAL_KEY) {
  const resp = await fetch("https://fal.run/" + VERIFY_MODEL, {
    method: "POST",
    headers: falHeaders(FAL_KEY),
    body: JSON.stringify({
      image_urls: [imageUrl],
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
  countViolations,
};
