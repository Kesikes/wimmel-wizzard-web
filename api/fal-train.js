// /api/fal-train.js — Vercel Serverless Function
// EXPERIMENTAL, P0.5-Machbarkeitstest (Multi-View-Charakter-Sheets): dünner Passthrough-Proxy
// zu fal-ai/flux-lora-fast-training, um probeweise ein kleines LoRA auf den prozedural erzeugten
// Seiten-/3-4-Ansicht-Trainingsbildern zu trainieren und zu sehen, ob das Modell dadurch lernt,
// diese Ansichten zuverlässig zu treffen. Kein Teil des regulären Produktpfads — nur für
// gezielte manuelle Testaufrufe über die Browser-Konsole. Nutzt fal's Queue-API, weil Training
// mehrere Minuten dauert und eine einzelne Vercel-Funktion nicht so lange blockieren kann/soll.
//
// action=submit   { imagesDataUrl, triggerWord?, steps?, createMasks?, isStyle? } -> { request_id, status_url, response_url }
// action=status    { statusUrl }                                                  -> fal status JSON
// action=result    { responseUrl }                                                -> fal result JSON (diffusers_lora_file.url etc.)

const TRAIN_APP = "fal-ai/flux-lora-fast-training";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    res.status(500).json({ error: "Server-Fehler: FAL_KEY ist im Vercel-Projekt nicht gesetzt." });
    return;
  }
  const body = req.body || {};
  const action = body.action;
  const headers = { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" };

  try {
    if (action === "submit") {
      const imagesDataUrl = String(body.imagesDataUrl || "");
      if (!imagesDataUrl.startsWith("data:") && !/^https?:\/\//.test(imagesDataUrl)) {
        res.status(400).json({ error: "imagesDataUrl fehlt oder ungültig." });
        return;
      }
      const trainBody = {
        images_data_url: imagesDataUrl,
        create_masks: body.createMasks !== undefined ? !!body.createMasks : false,
        is_style: body.isStyle !== undefined ? !!body.isStyle : false,
        steps: Number.isFinite(body.steps) ? Math.trunc(body.steps) : 1000,
        ...(body.triggerWord ? { trigger_word: String(body.triggerWord) } : {}),
      };
      const resp = await fetch(`https://queue.fal.run/${TRAIN_APP}`, {
        method: "POST",
        headers,
        body: JSON.stringify(trainBody),
      });
      const txt = await resp.text();
      if (!resp.ok) { res.status(502).json({ error: `fal.ai Submit-Fehler ${resp.status}: ${txt.slice(0, 400)}` }); return; }
      res.status(200).json(JSON.parse(txt));
      return;
    }

    if (action === "status") {
      const statusUrl = String(body.statusUrl || "");
      if (!/^https:\/\/queue\.fal\.run\//.test(statusUrl)) { res.status(400).json({ error: "statusUrl fehlt oder ungültig." }); return; }
      const resp = await fetch(statusUrl, { headers: { Authorization: "Key " + FAL_KEY } });
      const txt = await resp.text();
      if (!resp.ok) { res.status(502).json({ error: `fal.ai Status-Fehler ${resp.status}: ${txt.slice(0, 400)}` }); return; }
      res.status(200).json(JSON.parse(txt));
      return;
    }

    if (action === "result") {
      const responseUrl = String(body.responseUrl || "");
      if (!/^https:\/\/queue\.fal\.run\//.test(responseUrl)) { res.status(400).json({ error: "responseUrl fehlt oder ungültig." }); return; }
      const resp = await fetch(responseUrl, { headers: { Authorization: "Key " + FAL_KEY } });
      const txt = await resp.text();
      if (!resp.ok) { res.status(502).json({ error: `fal.ai Result-Fehler ${resp.status}: ${txt.slice(0, 400)}` }); return; }
      res.status(200).json(JSON.parse(txt));
      return;
    }

    res.status(400).json({ error: "Unbekannte action. Erwartet: submit, status, result." });
  } catch (e) {
    res.status(502).json({ error: "Verbindung zu fal.ai fehlgeschlagen: " + String(e) });
  }
};
