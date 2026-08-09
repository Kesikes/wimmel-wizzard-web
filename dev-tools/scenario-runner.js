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
