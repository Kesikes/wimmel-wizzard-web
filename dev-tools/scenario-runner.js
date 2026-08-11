/*
 * Visueller Test-Runner für Wimmel Wizard.
 *
 * Zweck: echte Bildgenerierungs-Szenarien (Charaktere, Szenen, Tweaks, Multi-View-Tests) gegen
 * die LIVE App durchspielen, OHNE jedes Mal manuell durch den Chat zu klicken/tippen. Läuft direkt
 * im Browser-Kontext der bereits geladenen App (nutzt deren globale Funktionen/state), ruft dabei
 * ECHT fal.ai auf (reale Kosten, reale Bilder) und sammelt die Ergebnisse für ein Galerie-Review
 * durch einen Menschen – bewertet wird bewusst NICHT automatisch, das bleibt Menschenaufgabe.
 *
 * Benutzung (Browser-Konsole auf der deployten Seite, oder via javascript_tool):
 *   1. Dieses Script einmal einfügen/ausführen (definiert window.WWTest).
 *   2. await WWTest.run()                     // alle Szenarien
 *      await WWTest.run(["scene_park_gag"])   // nur ausgewählte
 *   3. Ergebnis: Array aus {id, label, prompt, imageUrl} bzw. {id, label, error}.
 *      Wird zusätzlich unter window.__wwTestResults abgelegt.
 *
 * Neue Szenarien einfach unten an WWTest.SCENARIOS anhängen – jedes Szenario bekommt die Helper
 * (T) und liefert ein Ergebnis-Objekt oder ein Array davon zurück.
 */
(function(){
  function makeChar({name, role="girl", roleLabel="Mädchen", age=5, hair, top, marker}){
    const spec = makeCharacterSpec({name, role, roleLabel, sourceType:"text"});
    spec.identityCore.age = age;
    spec.identityCore.hairColor = hair || "";
    spec.identityCore.signatureMarker = marker || "";
    spec.defaultOutfit.top = top || "";
    return {name, spec, drafts:[], currentDraftIndex:undefined};
  }

  async function addCharacter(opts){
    state.charDraft = makeChar(opts);
    await generateCharSheet(GEN_OP.INITIAL);
    const c = state.charDraft;
    const result = {label:`Charakter: ${c.name}`, prompt:c.prompt, imageUrl:c.img};
    state.characters.push(c);
    state.charDraft = null;
    return result;
  }

  async function tweakCharacter(instructionDe){
    // Erwartet: state.charDraft ist NOCH gesetzt (also VOR addCharacter()/dem Push in
    // state.characters aufrufen, sonst fehlt der Entwurf).
    const c = state.charDraft;
    if(!c) throw new Error("tweakCharacter: kein aktiver charDraft (vor addCharacter() aufrufen)");
    c.spec.defaultOutfit.top = (c.spec.defaultOutfit.top || "") + (c.spec.defaultOutfit.top ? ", " : "") + instructionDe;
    c.prompt = null;
    c.tweakInstruction = translate(instructionDe);
    await generateCharSheet(GEN_OP.EDIT);
    return {label:`Charakter-Tweak: "${instructionDe}"`, prompt:c.tweakInstruction, imageUrl:c.img};
  }

  async function makeScene({locId, gagIndex=0, storyDe, storyEn, extras=[]}){
    const loc = SCENE_LOCATIONS.find(l=>l.id===locId);
    if(!loc) throw new Error("makeScene: unbekannte locId " + locId);
    let de = storyDe, en = storyEn;
    if(de === undefined){
      const gag = (GAG_LIBRARY[locId] || GAG_LIBRARY.generic)[gagIndex];
      de = gag.de; en = gag.en;
    }
    state.sceneDraft = {loc, story:de, storyEn:en, extras};
    await generateScene(GEN_OP.INITIAL);
    const s = state.sceneDraft;
    return {label:`Szene: ${loc.label} – ${de}`, prompt:s.prompt, imageUrl:s.img};
  }

  async function tweakScene(instructionDe){
    const s = state.sceneDraft;
    if(!s) throw new Error("tweakScene: kein aktiver sceneDraft (vor finishScene() aufrufen)");
    s.story = (s.story || "") + (s.story ? ", " : "") + instructionDe;
    if(s.storyEn) s.storyEn = s.storyEn + ", " + translate(instructionDe);
    s.prompt = null;
    s.tweakInstruction = translate(instructionDe);
    await generateScene(GEN_OP.EDIT);
    return {label:`Szenen-Tweak: "${instructionDe}"`, prompt:s.tweakInstruction, imageUrl:s.img};
  }

  function finishScene(){
    if(state.sceneDraft){ state.scenes.push(state.sceneDraft); state.sceneDraft = null; }
  }

  function bootstrap(){
    // state ist erst nach erfolgreichem Login gesetzt (siehe `let state = null;` + loadState() in
    // index.html) – ohne vorherigen Login-Flow bricht jeder Szenario-Aufruf mit "Cannot read
    // properties of null" ab. Für den Test-Runner reicht ein fester Dummy-Account, kein echter
    // Login nötig.
    if(!state){
      gotoAuth();
      if(typeof authMode !== "undefined" && authMode !== "register") toggleAuthMode();
      document.getElementById("auth-email").value = "wwtest@example.com";
      document.getElementById("auth-pass").value = "wwtest123";
      doAuth();
    }
    if(!state) throw new Error("bootstrap(): Login fehlgeschlagen, state ist weiterhin null.");
    state.product = state.product || "mini";
    if(!Array.isArray(state.characters)) state.characters = [];
    if(!Array.isArray(state.scenes)) state.scenes = [];
  }

  const T = {makeChar, addCharacter, tweakCharacter, makeScene, tweakScene, finishScene};

  const SCENARIOS = [
    {
      id: "char_basic",
      label: "Charakter: Basis-Look",
      async run(T){
        return T.addCharacter({name:"Mira", role:"girl", roleLabel:"Mädchen", age:6, hair:"blonde curly pigtails", top:"green raincoat"});
      }
    },
    {
      id: "char_tweak",
      label: "Charakter: Tweak (Farbe ändern)",
      async run(T){
        state.charDraft = T.makeChar({name:"Ben", role:"boy", roleLabel:"Junge", age:7, hair:"short brown hair", top:"blue striped shirt"});
        await generateCharSheet(GEN_OP.INITIAL);
        const before = {label:"Charakter: Ben (vorher)", prompt:state.charDraft.prompt, imageUrl:state.charDraft.img};
        const after = await T.tweakCharacter("Mach das Hemd rot");
        state.characters.push(state.charDraft); state.charDraft = null;
        return [before, after];
      }
    },
    {
      id: "scene_park_gag",
      label: "Szene: Park-Gag mit Charakter-Referenz",
      async run(T){
        const char = await T.addCharacter({name:"Lea", role:"girl", roleLabel:"Mädchen", age:5, hair:"long black straight hair", top:"pink dress"});
        const scene = await T.makeScene({locId:"park", gagIndex:0});
        T.finishScene();
        return [char, scene];
      }
    },
    {
      id: "scene_zoo_gag",
      label: "Szene: Zoo-Gag",
      async run(T){
        const char = await T.addCharacter({name:"Tom", role:"boy", roleLabel:"Junge", age:8, hair:"short red hair", top:"yellow jacket"});
        const scene = await T.makeScene({locId:"zoo", gagIndex:0});
        T.finishScene();
        return [char, scene];
      }
    },
    {
      id: "scene_multi_char",
      label: "Szene: zwei Charaktere gemeinsam",
      async run(T){
        const c1 = await T.addCharacter({name:"Mia", role:"girl", roleLabel:"Mädchen", age:5, hair:"blonde curly pigtails", top:"green raincoat"});
        const c2 = await T.addCharacter({name:"Ben", role:"boy", roleLabel:"Junge", age:7, hair:"short brown hair", top:"blue striped shirt"});
        const scene = await T.makeScene({locId:"farm", gagIndex:0});
        T.finishScene();
        return [c1, c2, scene];
      }
    },
    {
      id: "scene_tweak",
      label: "Szene: Tweak nach Erstgenerierung",
      async run(T){
        const char = await T.addCharacter({name:"Anna", role:"girl", roleLabel:"Mädchen", age:6, hair:"long brown hair", top:"pink sweater"});
        const before = await T.makeScene({locId:"beach", gagIndex:0});
        const after = await T.tweakScene("Es regnet jetzt leicht");
        T.finishScene();
        return [char, before, after];
      }
    },
    {
      id: "multiview_experimental_lora",
      label: "Multi-View: experimentelles Seiten-/3-4-LoRA (Regressionscheck)",
      async run(T){
        const testLoraUrl = "https://v3b.fal.media/files/b/0aa58d10/U9jbGX-p8p2KoOtYGz3ai_pytorch_lora_weights.safetensors";
        const sidePrompt = "wmlstil, flat-color children's book character illustration, thick black marker outline, minimal graphic style, white background, blonde curly pigtails hair, green raincoat, round head, no ears, no mouth, no visible neck, FULL SIDE PROFILE VIEW facing left, only one dot eye visible, no nose line drawn, pure head silhouette in profile";
        const threeQPrompt = "wmlstil, flat-color children's book character illustration, thick black marker outline, minimal graphic style, white background, short brown hair, blue striped shirt, round head, no ears, no mouth, no visible neck, THREE QUARTER VIEW face turned right, one straight vertical nose line offset toward the right edge of the face, right eye hidden by the curve of the face, only the left eye visible as a dot";
        const side = await generateImage(sidePrompt, "char", undefined, undefined, undefined, {testLoraUrl});
        const threeQ = await generateImage(threeQPrompt, "char", undefined, undefined, undefined, {testLoraUrl});
        return [
          {label:"Multi-View: Seitenansicht", prompt:sidePrompt, imageUrl:side.url},
          {label:"Multi-View: 3/4-Ansicht", prompt:threeQPrompt, imageUrl:threeQ.url}
        ];
      }
    },
    {
      // Vortest fuer die Finalisierung des Seitenansicht-Trainings: statt wie beim ersten Multi-View-
      // Experiment rein prozedural erzeugte Platzhalterbilder zu drehen, nehmen wir hier ECHTE
      // Charakterbilder aus dem echten wmlstil-Trainingsset (vom Nutzer bereitgestellt,
      // wimmel_wizzard_lora_v4_training_data.zip) als Referenz und lassen nano-banana-2/edit sie in
      // Seiten-/3-4-Ansicht neu zeichnen. Ziel: pruefen, ob dieser Weg den ECHTEN, reichen Stil
      // (weiche Schattierung, rote Wangen, Details) erhaelt, bevor wir daraus ein ganzes neues
      // Trainingsset fuer ein finales LoRA bauen.
      id: "view_angle_real_style_test",
      label: "Seitenansicht-Test mit echtem Referenzbild (vor Trainingsset-Bau)",
      async run(T){
        const refBoyUrl = "https://raw.githubusercontent.com/Kesikes/wimmel-wizzard-web/main/training-assets/view_test_refs/ref_boy_hoodie.jpg";
        const refGirlUrl = "https://raw.githubusercontent.com/Kesikes/wimmel-wizzard-web/main/training-assets/view_test_refs/ref_girl_braids.jpg";
        // Nutzer-Feedback v4 (nach Sichtung der 30er-Batch): (a) Seitenansicht zeigte bei manchen
        // Charakteren trotz "NO nose line" noch eine kleine Dreiecksform an der Nasenposition -> jetzt
        // explizit "absolutely no nose shape of any kind, not even a small triangle, bump or dot"
        // ergaenzt. (b) bei anderen Charakteren fehlte in der Seitenansicht das Auge komplett (leeres
        // Gesicht) -> explizite Garantie "exactly one eye, drawn as a clearly visible dot, MUST always
        // be present" ergaenzt.
        const sideInstr = "Redraw this exact character in FULL SIDE PROFILE VIEW facing left, as if seen from the side. Keep the exact same hair style and color, headwear, clothing and all identifying details as the reference. The head is a round silhouette with no ears, no mouth and no visible neck. Exactly ONE eye, drawn as a clearly visible black dot, MUST always be present on the side of the face facing the viewer – the face must never appear completely blank. Absolutely NO nose shape of any kind is drawn at this angle – not a line, not a triangle, not a bump, not a dot, nothing at all where the nose would be – a completely smooth profile silhouette from forehead to chin. Match the exact illustration style of the reference image: thick black marker outline, flat colors with soft cel-shading exactly as shown, rosy cheek if visible from this angle. Full body, standing, plain white background.";
        // Nutzer-Feedback v1: Nase war ein Dreieck/Keil statt eines Strichs -> "thin straight vertical
        // line" ergänzt. Nutzer-Feedback v2: Nase war danach immer noch ein Haken/umgedrehtes "L"
        // -> expliziter Vergleich zum Tastatur-Strichzeichen "|" ergänzt (jetzt korrekt). Nutzer-
        // Feedback v3 (mit eigenem Referenzbild praezisiert): die 3/4-Drehung soll NICHT bedeuten, dass
        // nur die Nase verschoben wird waehrend die Augen mittig bleiben (oder gar ein Auge verschwindet)
        // – stattdessen wandert die GESAMTE Gesichtsgruppe (beide Augen UND Nase gemeinsam als Einheit)
        // ein Stueck nach rechts aus der Kopfmitte, so als waere das ganze Gesicht nach rechts verschoben.
        // Beide Augen bleiben voll sichtbar. Nutzer-Feedback v4 (nach Sichtung der 30er-Batch): (a) bei
        // mehreren Charakteren hat sich NUR der Kopf gedreht, der Koerper blieb frontal stehen – wirkt
        // wie ein abgeschraubter Kopf. Jetzt explizit Schultern/Oberkoerper mit in die Drehung
        // einbezogen. (b) "positioned close together" hat die Augen zu eng zusammengedrueckt – Nutzer
        // wollte sie von Hand wieder auseinanderziehen. Jetzt: normaler, unveraenderter Augenabstand
        // wie in der Referenz, nur als Gruppe verschoben statt zusammengequetscht.
        const threeQInstr = "Redraw this exact character in THREE QUARTER VIEW: the whole body is turned slightly to the right – head, shoulders AND upper body all rotate together as one unit, not just the head on an otherwise front-facing body. Keep the exact same hair style and color, headwear, clothing and all identifying details as the reference. The head is a round shape with no ears, no mouth and no visible neck. The entire facial feature group – both eyes AND the nose together, as one unit – is shifted slightly to the right of the vertical center of the face. Both eyes stay fully visible as small dots, keeping their normal spacing exactly as wide apart as in the reference image (do NOT squeeze them closer together), just shifted as a pair to the right side of the face; the nose is positioned right below the midpoint between the two eyes and moves right together with them. Draw the nose as ONE perfectly straight vertical line segment, like the keyboard character \"|\" – completely straight from top to bottom, with NO curve, NO hook, NO bend, NO foot or serif at the bottom end, NOT shaped like a check mark, a hook, a \"J\", or an upside-down \"L\". Match the exact illustration style of the reference image: thick black marker outline, flat colors with soft cel-shading exactly as shown, rosy cheeks. Full body, standing, plain white background.";
        // Neue Blickrichtung auf Nutzerwunsch: reine Rückansicht (nur Hinterkopf, kein Gesicht).
        const backInstr = "Redraw this exact character seen entirely from BEHIND (back view): only the back of the head is visible, no face at all – no eyes, no nose, no mouth, nothing facial. Show the back of the hair (or headwear) in the exact same color and style as the reference, and the back of the clothing (coat/shirt/jacket) exactly as in the reference, including its exact colors and details. Match the exact illustration style of the reference image: thick black marker outline, flat colors with soft cel-shading exactly as shown. Full body, standing, viewed directly from behind, plain white background.";
        const boySide = await generateImage(sideInstr, "char", undefined, refBoyUrl, undefined, {});
        const girlThreeQ = await generateImage(threeQInstr, "char", undefined, refGirlUrl, undefined, {});
        const boyBack = await generateImage(backInstr, "char", undefined, refBoyUrl, undefined, {});
        return [
          {label:"Echtstil-Test: Junge Seitenansicht", prompt:sideInstr, imageUrl:boySide.url},
          {label:"Echtstil-Test: Mädchen 3/4-Ansicht (v2, Strichnase)", prompt:threeQInstr, imageUrl:girlThreeQ.url},
          {label:"Echtstil-Test: Junge Rückansicht (Hinterkopf)", prompt:backInstr, imageUrl:boyBack.url}
        ];
      }
    }
  ];

  async function run(ids){
    bootstrap();
    const list = ids && ids.length ? SCENARIOS.filter(s=>ids.includes(s.id)) : SCENARIOS;
    const results = [];
    for(const s of list){
      try{
        const r = await s.run(T);
        (Array.isArray(r) ? r : [r]).forEach(item=>results.push({id:s.id, ...item}));
      }catch(e){
        results.push({id:s.id, label:s.label, error: String(e && e.message || e)});
      }
    }
    window.__wwTestResults = results;
    return results;
  }

  window.WWTest = {run, SCENARIOS, helpers:T, bootstrap};
})();
