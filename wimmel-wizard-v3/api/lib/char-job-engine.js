// api/lib/char-job-engine.js — NEU (Sammel-Runde 12.09.2026, Aufgabe "Warteschlangen-Umbau:
// Figuren-Pfad als Machbarkeitstest").
//
// ARCHITEKTUR-ENTSCHEIDUNG (Abweichung vom urspruenglich diskutierten Webhook-Ansatz): der Nutzer
// hatte fal.ai's Webhook-Mechanismus vorgeschlagen (fal.ai ruft uns von selbst auf, sobald fertig).
// Technisch moeglich, aber die Signatur-Pruefung dafuer (siehe fal.ai-Doku, ED25519 gegen ein JWKS,
// Nachricht ueber den ROHEN, ungeparsten Request-Body gebildet) braeuchte zuverlaessigen Zugriff auf
// die rohen Bytes des eingehenden Requests -- bei Vercels aelterem "module.exports = (req,res) => "
// Funktionsstil (den dieses Projekt fuer alle bisherigen api/*.js-Dateien verwendet) ist NICHT
// zweifelsfrei dokumentiert/ohne Live-Test verifizierbar, ob/wie zuverlaessig sich das automatische
// JSON-Parsing dafuer abschalten laesst (die dafuer gefundene Vercel-Doku zeigt durchgehend den
// NEUEN, Web-Standard-"Request"/"Response"-Funktionsstil, nicht diesen aelteren). Eine falsch
// verifizierte Signatur waere entweder eine Sicherheitsluecke (Verifikation faelschlich uebersprungen)
// oder ein kompletter Ausfall (Verifikation schlaegt IMMER fehl, genau das Muster, das den
// style_ok-Vorfall von gestern verursacht hat) -- und beides laesst sich von hier aus nicht gegen
// echte fal.ai-Webhooks live pruefen.
//
// Stattdessen: reines Poll-Modell, OHNE Webhook. Der Client fragt periodisch bei UNS nach
// (char-job-status.js), UND WIR fragen bei jeder dieser Anfragen kurz (server-zu-server, das dauert
// Sekundenbruchteile, kein Risiko fuer die 300s-Grenze) bei fal.ai's eigener Queue-API nach, ob ein
// Schritt inzwischen fertig ist, und schalten den Job-Zustand entsprechend weiter (dieses Datei hier).
// Ergebnis: derselbe Nutzen wie beim Webhook-Ansatz (kein lang offen gehaltener Verbindungsaufbau vom
// Handy aus, uebersteht Bildschirmsperre/App-Wechsel problemlos, da jede einzelne Anfrage nur wenige
// Sekunden dauert) -- nur ohne Signatur-Pruefungs-Risiko und ohne neuen Webhook-Endpunkt. Etwas
// weniger "sofort" als ein echter Push (der Fortschritt bewegt sich nur, wenn der Client gerade
// pollt), was bei einer ohnehin mehrminuetigen Gesamtwartezeit unerheblich ist. Falls sich das
// Poll-Modell im Live-Test bewaehrt, waere ein spaeterer Umstieg auf Webhooks eine reine
// Optimierung (schnellere Fortschrittsanzeige), kein Korrektheits-Thema.
//
// ZUSTANDSMODELL (ein Job-Datensatz, gespeichert unter "charjob:{jobId}" via api/lib/kv.js):
// {
//   jobId, prompt, status: "in_progress" | "done" | "error", error,
//   candidates: [{ seed, genRequestId, genStatus, url,
//                  verifyRequestId, verifyStatus, violations, verify }, ...],  // waechst auf bis zu 3
//   resultUrl, resultSeed, resultViolations, resultVerify,
//   createdAt, updatedAt
// }
// genStatus/verifyStatus je: "pending" (noch nicht abgefragt/submitted) | "polling" (submitted,
// warten auf COMPLETED) | "done" | "error".
//
// Jeder Aufruf von advanceCharacterJob() macht GENAU EINEN Fortschritts-Schritt pro noch offenem
// Kandidaten (nicht die komplette Kette auf einmal) -- absichtlich klein gehalten, damit ein
// einzelner Funktionsaufruf (aus char-job-status.js, selbst mit maxDuration 30s völlig ausreichend)
// nie laenger braucht als ein paar fal.ai-Statusabfragen, auch wenn der Client mal eine Weile nicht
// gepollt hat und mehrere Schritte gleichzeitig faellig waeren.

const FLUX_MODEL = "fal-ai/flux-lora";
const VERIFY_MODEL = "openrouter/router/vision";

// LORA_URL: DUPLIKAT von api/fal-proxy.js (dort mit ausfuehrlichem Trainings-Hintergrund
// kommentiert) -- bewusst dupliziert statt cross-required, damit diese neue, noch experimentelle
// Datei komplett eigenstaendig bleibt (siehe "Machbarkeitstest"-Rahmen dieser Aufgabe) und ein Fehler
// hier nicht versehentlich den bestehenden, produktiven fal-proxy.js-Pfad beeinflussen kann. MUSS
// manuell synchron gehalten werden, falls die LoRA in fal-proxy.js aktualisiert wird.
const LORA_URL =
  "https://v3b.fal.media/files/b/0aa5f3be/JhuEcl1_gByql8TcQ1Tqh_pytorch_lora_weights.safetensors";

// buildCharacterVerifyPrompt()/countViolations(): DUPLIKAT der client-seitigen Logik in
// pipeline.js (dort ausfuehrlich kommentiert, inkl. der Entschaerfung vom 12.09.2026 nach dem
// style_ok-Vorfall) -- nicht per require() geteilt, weil pipeline.js ein Browser-Modul ist
// (window.Pipeline = {...}, setzt document/window voraus), nicht direkt in Node einbindbar. MUSS
// manuell synchron gehalten werden, falls der Verify-Prompt/die Zaehl-Logik dort nochmal angepasst
// wird.
function buildCharacterVerifyPrompt() {
  return "Zeigt dieses Bild GENAU EINE einzelne Figur (eine Person oder ein Tier), vollständig und fehlerfrei gezeichnet? Prüfe besonders: Ist nur EIN Gesicht/EIN Körper zu sehen (nicht mehrere verschiedene Gesichter oder Körper gleichzeitig im Bild)? Ist ein VOLLSTÄNDIGER Kopf UND Körper zu sehen, ohne abgeschnittene Stellen, fehlende Körperteile oder unklare Kritzel-/Farbflecken-Artefakte (z. B. ein einzelner, unproportional langer Haarstrang ohne erkennbaren Kopf/Körper darunter)? Hat diese Figur einen sichtbaren Mund? Ist die FIGUR SELBST (Kopf/Körper, nicht der Hintergrund oder ein leichter Schlagschatten darunter) in einem flachen, minimalistischen Illustrationsstil mit dicken schwarzen Umrisslinien und flächigen Farben gezeichnet, so wie es für dieses Kinderbuch-Stilheft üblich ist? Ein einfarbiger/weißer Hintergrund und ein leichter, weicher Schlagschatten unter der Figur sind dabei normal und KEIN Stilverstoß — als Verstoß zählt nur, wenn die Figur selbst deutlich fotorealistisch, gemalt/aquarellartig wirkt oder ihr Gesicht/Körper starke Farbverläufe oder Schattierungen zeigt. Antworte NUR als JSON-Objekt mit genau diesen vier Feldern: {\"single_ok\": true/false, \"complete_ok\": true/false, \"mouth_ok\": true/false, \"style_ok\": true/false} — single_ok ist nur dann true, wenn wirklich nur eine einzige Figur mit einem Gesicht und einem Körper zu sehen ist; complete_ok ist nur dann true, wenn Kopf und Körper vollständig und ohne Artefakte/Fragmente gezeichnet sind; mouth_ok ist nur dann true, wenn die Figur KEINEN sichtbaren Mund hat; style_ok ist nur dann false, wenn die Figur selbst wirklich deutlich vom beschriebenen flachen Stil abweicht — im Zweifel (z. B. bei nur leichtem Schlagschatten oder normaler Kantenglättung) gilt style_ok als true.";
}
function countViolations(verifyOutputText) {
  const match = String(verifyOutputText || "").match(/\{[\s\S]*\}/);
  if (!match) return { violations: 99, parsed: null };
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch (e) { return { violations: 99, parsed: null }; }
  let violations = 0;
  Object.keys(parsed).forEach((k) => { if (/_ok$/.test(k) && parsed[k] === false) violations++; });
  return { violations, parsed };
}

function falHeaders(FAL_KEY) {
  return { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" };
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
  const resp = await fetch("https://queue.fal.run/" + model + "/requests/" + requestId + "/status", {
    headers: { Authorization: "Key " + FAL_KEY },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Queue-Status-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  return resp.json();
}

async function falQueueResult(model, requestId, FAL_KEY) {
  const resp = await fetch("https://queue.fal.run/" + model + "/requests/" + requestId, {
    headers: { Authorization: "Key " + FAL_KEY },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error("fal.ai Queue-Ergebnis-Fehler " + resp.status + ": " + txt.slice(0, 200));
  }
  return resp.json();
}

function newCandidate(seed) {
  return {
    seed, genRequestId: null, genStatus: "pending", url: null,
    verifyRequestId: null, verifyStatus: "pending", violations: null, verify: null,
  };
}

function charGenerateBody(prompt, seed) {
  return {
    prompt,
    loras: [{ path: LORA_URL, scale: 1 }],
    num_inference_steps: 42,
    guidance_scale: 5,
    num_images: 1,
    enable_safety_checker: true,
    output_format: "png",
    image_size: { width: 768, height: 1024 },
    ...(seed != null ? { seed } : {}),
  };
}

// createCharacterJob({prompt, FAL_KEY}): submitted die ersten 2 Kandidaten (analog zu
// composeCharacterImage()s "immer 2 parallele Kandidaten" in pipeline.js) und liefert den
// initialen Job-Datensatz zurueck -- SPEICHERT NICHTS selbst in KV, das macht der Aufrufer
// (char-job-start.js), damit diese Datei rein fal.ai-/Zustands-bezogen bleibt und leichter isoliert
// testbar ist (kein KV-Mock noetig fuer diese Funktion).
async function createCharacterJob({ jobId, prompt, FAL_KEY }) {
  const seedA = Math.floor(Math.random() * 1e9);
  const seedB = Math.floor(Math.random() * 1e9);
  const [reqA, reqB] = await Promise.all([
    submitFalQueue(FLUX_MODEL, charGenerateBody(prompt, seedA), FAL_KEY),
    submitFalQueue(FLUX_MODEL, charGenerateBody(prompt, seedB), FAL_KEY),
  ]);
  const candA = newCandidate(seedA); candA.genRequestId = reqA; candA.genStatus = "polling";
  const candB = newCandidate(seedB); candB.genRequestId = reqB; candB.genStatus = "polling";
  const now = Date.now();
  return {
    jobId, prompt, status: "in_progress", error: null,
    candidates: [candA, candB],
    resultUrl: null, resultSeed: null, resultViolations: null, resultVerify: null,
    createdAt: now, updatedAt: now,
  };
}

// advanceCharacterJob(job, {FAL_KEY}): EIN Fortschritts-Durchlauf (siehe Datei-Kommentar oben) --
// mutiert eine KOPIE von job und gibt sie zurueck (Aufrufer speichert sie danach in KV). Wirft
// bewusst NICHT bei einzelnen fal.ai-Fehlern (ein einzelner kaputter Kandidat soll nicht den ganzen
// Job zum Absturz bringen) -- markiert den betroffenen Kandidaten stattdessen als "error" und macht
// mit den uebrigen weiter, gleiches Prinzip wie Promise.allSettled() im bisherigen, synchronen Pfad
// (generateExtraViewsAndFinish() in charakter.js).
async function advanceCharacterJob(job, { FAL_KEY }) {
  if (job.status !== "in_progress") return job;
  const next = JSON.parse(JSON.stringify(job)); // flache Kopie reicht nicht (verschachtelte candidates) -> JSON-Roundtrip

  // Schritt 1: offene Generierungs-Kandidaten pruefen/abholen.
  for (const cand of next.candidates) {
    if (cand.genStatus !== "polling") continue;
    try {
      const st = await falQueueStatus(FLUX_MODEL, cand.genRequestId, FAL_KEY);
      if (st.status === "COMPLETED") {
        const result = await falQueueResult(FLUX_MODEL, cand.genRequestId, FAL_KEY);
        const url = result && result.images && result.images[0] && result.images[0].url;
        if (url) { cand.url = url; cand.genStatus = "done"; }
        else { cand.genStatus = "error"; }
      }
      // IN_QUEUE/IN_PROGRESS: bleibt "polling", naechster Aufruf prueft erneut.
    } catch (e) {
      cand.genStatus = "error";
    }
  }

  // Schritt 2: sobald ALLE aktuell bekannten Kandidaten mit der Generierung durch sind (done ODER
  // error -- ein fehlgeschlagener Kandidat blockiert die anderen nicht), Verify fuer die
  // erfolgreichen Kandidaten anstossen, die noch keinen Verify-Versuch haben.
  const allGenSettled = next.candidates.every((c) => c.genStatus === "done" || c.genStatus === "error");
  if (allGenSettled) {
    const verifyPrompt = buildCharacterVerifyPrompt();
    for (const cand of next.candidates) {
      if (cand.genStatus !== "done" || cand.verifyStatus !== "pending") continue;
      try {
        const reqId = await submitFalQueue(VERIFY_MODEL, {
          image_urls: [cand.url],
          prompt: verifyPrompt,
          system_prompt: "You are a meticulous visual QA checker for a children's illustration style guide. Carefully scan the ENTIRE image before answering. You may add reasoning before the JSON, but keep it to brief keywords or short phrases only — the JSON object itself must always fit within your response and be the very last thing in your answer, with no markdown formatting.",
          model: "google/gemini-2.5-pro",
          temperature: 0,
          reasoning: true,
          max_tokens: 1200,
        }, FAL_KEY);
        cand.verifyRequestId = reqId;
        cand.verifyStatus = "polling";
      } catch (e) {
        cand.verifyStatus = "error";
      }
    }
  }

  // Schritt 3: offene Verify-Kandidaten pruefen/abholen.
  for (const cand of next.candidates) {
    if (cand.verifyStatus !== "polling") continue;
    try {
      const st = await falQueueStatus(VERIFY_MODEL, cand.verifyRequestId, FAL_KEY);
      if (st.status === "COMPLETED") {
        const result = await falQueueResult(VERIFY_MODEL, cand.verifyRequestId, FAL_KEY);
        const scored = countViolations(result && result.output);
        cand.violations = scored.violations;
        cand.verify = scored.parsed;
        cand.verifyStatus = "done";
      }
    } catch (e) {
      cand.verifyStatus = "error";
    }
  }

  // Schritt 4: sobald ALLE Kandidaten (Generierung UND Verify) durchgelaufen sind, entscheiden --
  // dritten Kandidaten nachschieben (wie composeCharacterImage()s Verhalten bei Bedarf, hoechstens
  // EINMAL) oder Job abschliessen (besten verfuegbaren waehlen -- siehe Bugfix vom 12.09.2026: NIE
  // hart abbrechen, immer ein Ergebnis liefern, auch wenn keiner perfekt ist).
  const allSettled = next.candidates.every((c) =>
    (c.genStatus === "done" && c.verifyStatus === "done") || c.genStatus === "error" || c.verifyStatus === "error");
  if (allSettled) {
    const usable = next.candidates.filter((c) => c.genStatus === "done" && c.verifyStatus === "done");
    const hasPerfect = usable.some((c) => c.violations === 0);
    if (!hasPerfect && next.candidates.length < 3) {
      const seedC = Math.floor(Math.random() * 1e9);
      try {
        const reqC = await submitFalQueue(FLUX_MODEL, charGenerateBody(next.prompt, seedC), FAL_KEY);
        const candC = newCandidate(seedC); candC.genRequestId = reqC; candC.genStatus = "polling";
        next.candidates.push(candC);
      } catch (e) {
        // dritter Versuch schlaegt schon beim Submit fehl -- kein weiterer Retry-Versuch hier,
        // naechster Schritt unten (finalize mit dem, was wir haben) greift stattdessen.
        finalizeJob(next, usable);
      }
    } else {
      finalizeJob(next, usable);
    }
  }

  next.updatedAt = Date.now();
  return next;
}

// finalizeJob(): waehlt aus den nutzbaren Kandidaten den besten (wenigste Verstoesse), oder markiert
// den Job als Fehler, wenn KEIN einziger Kandidat nutzbar wurde (alle 2-3 Versuche technisch
// fehlgeschlagen -- das ist ein echter, seltener Fehlerfall, kein Qualitaets-Werturteil, deshalb
// hier bewusst DOCH ein Fehlerstatus, anders als die bewusst nie-blockierende style_ok-Entscheidung).
function finalizeJob(job, usableCandidates) {
  if (!usableCandidates.length) {
    job.status = "error";
    job.error = "Keiner der Generierungsversuche war erfolgreich — bitte nochmal versuchen.";
    return;
  }
  const best = usableCandidates.reduce((a, b) => (b.violations < a.violations ? b : a));
  job.status = "done";
  job.resultUrl = best.url;
  job.resultSeed = best.seed;
  job.resultViolations = best.violations;
  job.resultVerify = best.verify;
}

module.exports = {
  FLUX_MODEL, VERIFY_MODEL,
  buildCharacterVerifyPrompt, countViolations,
  submitFalQueue, falQueueStatus, falQueueResult,
  createCharacterJob, advanceCharacterJob,
};
