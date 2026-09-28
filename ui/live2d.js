(function () {
  const MODEL = '../assets/live2d/MO/MO.model3.json';
  const BASE = { Param156: 1 };

  const HAIR_PARTS = ['Part136', 'Part141', 'Part146', 'Part147', 'Part196', 'Part3', 'Part33', 'Part29', 'Part30',
    'Part40', 'Part44', 'Part206', 'Part204', 'Part148', 'Part19', 'Part48'];
  const SKIN_PARTS = ['Part110', 'Part126', 'Part134', 'Part112', 'Part103', 'Part105'];
  const TOP_PARTS = ['Part127', 'ArtMesh399_Skinning', 'ArtMesh400_Skinning', 'ArtMesh401_Skinning',
    'ArtMesh403_Skinning', 'ArtMesh404_Skinning', 'ArtMesh405_Skinning'];
  const SLEEVE_PARTS = ['ArtMesh402_Skinning2', 'ArtMesh402_Skinning', 'ArtMesh406_Skinning'];
  const SKIRT_PARTS = ['Part132', 'Part171'];
  const IRIS = ['ArtMesh243', 'ArtMesh503', 'ArtMesh504', 'ArtMesh562', 'ArtMesh563', 'ArtMesh564'];

  const HAIR_COLORS = {
    ink: { label: 'Ink', swatch: '#1b1b1f' },
    rouge: { label: 'Rouge', swatch: '#dc4256', hair: [.86, .26, .34], hi: [1, .78, .8] },
    sakura: { label: 'Sakura', swatch: '#fa9eb8', hair: [.98, .62, .72], hi: [1, .93, .95] },
    honey: { label: 'Honey', swatch: '#fad175', hair: [.98, .82, .46], hi: [1, .97, .88] },
    mint: { label: 'Mint', swatch: '#6bd6bd', hair: [.42, .84, .74], hi: [.9, 1, .97] },
    night: { label: 'Night', swatch: '#3d427a', hair: [.24, .26, .48], hi: [.72, .76, 1] },
    silver: { label: 'Silver', swatch: '#d6d4e6', hair: [.84, .83, .9], hi: [1, 1, 1] },
    cocoa: { label: 'Cocoa', swatch: '#8c573d', hair: [.55, .34, .24], hi: [.96, .86, .78] },
    lilac: { label: 'Lilac', swatch: '#b59cf0', hair: [.71, .61, .94], hi: [.97, .94, 1] },
    ember: { label: 'Ember', swatch: '#f28a3c', hair: [.95, .54, .24], hi: [1, .9, .8] },
    sky: { label: 'Sky', swatch: '#7dc2f5', hair: [.49, .76, .96], hi: [.94, .98, 1] },
  };
  const EYE_COLORS = {
    ink: { label: 'Ink', swatch: '#1b1b1f' },
    ruby: { label: 'Ruby', swatch: '#c7293f', c: [.78, .16, .26] },
    amethyst: { label: 'Amethyst', swatch: '#9e4dc7', c: [.62, .3, .78] },
    azure: { label: 'Azure', swatch: '#3385db', c: [.2, .52, .86] },
    jade: { label: 'Jade', swatch: '#1f9980', c: [.12, .6, .5] },
    amber: { label: 'Amber', swatch: '#f2b733', c: [.95, .72, .2] },
    violet: { label: 'Violet', swatch: '#8c5cd9', c: [.55, .36, .85] },
    forest: { label: 'Forest', swatch: '#4d9e59', c: [.3, .62, .35] },
    rose: { label: 'Rose', swatch: '#f07aa8', c: [.94, .48, .66] },
  };
  const SKIN_TONES = {
    porcelain: { label: 'Porcelain', swatch: '#ffffff' },
    warm: { label: 'Warm', swatch: '#fff0e6', c: [1, .94, .9] },
    rosy: { label: 'Rosy', swatch: '#ffe6e6', c: [1, .9, .9] },
    tan: { label: 'Tan', swatch: '#f5d6bd', c: [.96, .84, .74] },
  };

  const OUTFITS = {
    school: { label: 'School', swatch: '#f4f4f6', p: {} },
    sakura: { label: 'Sakura', swatch: '#ffccdb', p: {}, top: [1, .8, .86], sleeve: [1, .8, .86], skirt: [.35, .32, .5] },
    midnight: { label: 'Midnight vest', swatch: '#5c669e', p: { Param137: 1 }, top: [.36, .4, .62], skirt: [.25, .25, .35] },
    mint: { label: 'Mint', swatch: '#ccffeb', p: { Param50: 2 }, top: [.8, 1, .92], sleeve: [.8, 1, .92], skirt: [.3, .52, .47] },
    cocoa: { label: 'Cocoa vest', swatch: '#b88c70', p: { Param137: 1 }, top: [.72, .55, .44], skirt: [.45, .32, .26] },
    lilac: { label: 'Lilac', swatch: '#dbccff', p: { Param50: 1 }, top: [.86, .8, 1], sleeve: [.86, .8, 1], skirt: [.42, .36, .62] },
    rouge: { label: 'Rouge', swatch: '#ff8594', p: {}, top: [1, .52, .58], sleeve: [1, .52, .58], skirt: [.28, .2, .26] },
    sporty: { label: 'Sporty', swatch: '#ffedb3', p: { Param192: 1, Param50: 5 }, top: [1, .93, .7], sleeve: [1, .93, .7] },
    noir: { label: 'Noir', swatch: '#3a3a44', p: { Param137: 1 }, top: [.26, .26, .3], skirt: [.2, .2, .24] },
  };

  const nums = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => [a + i, String(a + i)]);
  const CUSTOM = [
    { section: 'Hair', items: [
      { key: 'bangs', label: 'Bangs', param: 'Param20', options: nums(0, 6).map(([v]) => [v, String(v + 1)]) },
      { key: 'back', label: 'Back hair', param: 'Param117', options: [[0, 'Long'], [1, 'Layered'], [2, 'Soft'], [3, 'Braids'], [4, 'Bob']] },
      { key: 'tails', label: 'Tails & buns', param: ['Param131', 'Param134'], options: [[0, 'None'], [1, 'Twin tails'], [2, 'Loops'], [3, 'Odango'], [4, 'Pigtails'], [5, 'Wings']] },
      { key: 'ahoge', label: 'Ahoge', param: 'Param19', options: [[0, 'None'], ...nums(1, 7)] },
      { key: 'flip', label: 'Flicked ends', param: ['Param209', 'Param211'], options: [[0, 'Off'], [1, 'On']] },
      { key: 'streak', label: 'Streak', param: 'Param194', options: [[0, 'None'], [1, 'One'], [2, 'Two']] },
    ] },
    { section: 'Ears & head', items: [
      { key: 'ears', label: 'Ears', param: 'Param151', options: [[0, 'None'], [1, 'Cat'], [2, 'Bear'], [3, 'Bunny'], [4, 'Kitty'], [5, 'Floppy'], [6, 'Lop'], [7, 'Horse'], [8, 'Mouse']] },
      { key: 'head', label: 'On top', param: 'Param128', options: [[0, 'None'], [1, 'Crown'], [2, 'Bow'], ...nums(3, 6)] },
      { key: 'band', label: 'Headband', param: 'Param204', options: [[0, 'None'], [1, 'Band'], [2, 'Band 2']] },
      { key: 'bigbow', label: 'Big bow', param: 'Param208', options: [[0, 'Off'], [1, 'On']] },
      { key: 'horns', label: 'Horns', param: 'Param152', options: [[0, 'None'], [1, 'Oni'], ...nums(2, 3)] },
      { key: 'pins', label: 'Hairpins', param: ['Param148', 'Param149'], options: [[0, 'None'], ...nums(1, 4)] },
    ] },
    { section: 'Face', items: [
      { key: 'blush', label: 'Blush', param: 'Param74', options: [[0, 'None'], ...nums(1, 5)] },
      { key: 'glasses', label: 'Glasses', param: 'Param153', options: [[0, 'None'], [1, 'Round'], [2, 'Square'], ...nums(3, 5)] },
      { key: 'catmouth', label: 'Cat mouth', param: 'Param2', options: [[0, 'Off'], [1, 'On']] },
      { key: 'mask', label: 'Mask', param: 'Param73', options: [[0, 'None'], [1, 'Mask'], ...nums(2, 3)] },
    ] },
  ];

  const FORMS = {
    mo: { name: 'Mo', p: { Param19: 1, Param74: 3 }, hair: 'ink', eye: 'ink', skin: 'porcelain', outfit: 'school',
      taps: ['Hehe~', 'Copied & carried!', 'Need a paste?', 'Boop!', 'Mm?'], mad: ['Hey!!', 'Stop poking!', 'Mou~!!'] },
    rouge: { name: 'Rouge', p: { Param19: 1, Param74: 3, Param194: 1 }, hair: 'rouge', eye: 'ruby', skin: 'warm', outfit: 'rouge',
      taps: ['Rouge on duty ♥', 'Copied & carried!', 'Need a paste?', 'Hehe~'], mad: ['Mou~!!', 'Stop poking!', 'Hmph!!'] },
    momo: { name: 'Momo', p: { Param131: 1, Param134: 1, Param128: 2, Param74: 3 }, hair: 'sakura', eye: 'amethyst', skin: 'rosy', outfit: 'sakura',
      taps: ['Kyaa~', 'Twin tails!', 'Ehehe ♡', 'Boing boing'], mad: ['Meanie!!', 'Hmph!', 'No touching!'] },
    sunny: { name: 'Sunny', p: { Param117: 4, Param209: 1, Param211: 1, Param74: 1 }, hair: 'honey', eye: 'azure', skin: 'warm', outfit: 'sporty',
      taps: ['Good morning!', 'Sunshine~', 'Yay!', 'Copy that!'], mad: ['Hey now!', 'Rude!!', 'Grr~'] },
    mint: { name: 'Mint', p: { Param131: 3, Param134: 3, Param74: 3 }, hair: 'mint', eye: 'jade', skin: 'warm', outfit: 'mint',
      taps: ['Fresh copy!', 'Odango power!', 'Hi hi~', 'Sparkly!'], mad: ['Meanie!', 'No more!!', 'Grr~'] },
    yoru: { name: 'Yoru', p: { Param151: 1, Param2: 1, Param20: 3 }, hair: 'night', eye: 'amber', skin: 'warm', outfit: 'midnight',
      taps: ['…nya?', 'Stargazing~', 'Purr…', 'Night mode ✦'], mad: ['Fshhh!', 'Nya!!', 'Leave me be!'] },
    golshi: { name: 'Golshi', p: { Param151: 7, Param19: 5, Param74: 3 }, hair: 'silver', eye: 'violet', skin: 'warm', outfit: 'lilac',
      taps: ['Wanna see a dropkick?', 'Full sail!', 'Yakisoba time!', 'Pakapuu~'], mad: ['HEY!!', 'Dropkick incoming!', 'Stop that!!'] },
    kuri: { name: 'Kuri', p: { Param117: 3, Param19: 2, Param74: 3 }, hair: 'cocoa', eye: 'forest', skin: 'warm', outfit: 'cocoa',
      taps: ['Autumn vibes~', 'Braids!', 'Tea time?', 'Hehe'], mad: ['Hey!', 'Stop it!', 'Hmph!'] },
  };

  function valueOf(formKey, custom, item) {
    if (custom && custom[item.key] !== undefined) return custom[item.key];
    const p = FORMS[formKey].p, id = Array.isArray(item.param) ? item.param[0] : item.param;
    return p[id] ?? 0;
  }
  const look = (formKey, custom, k) => (custom && custom[k]) || FORMS[formKey][k];

  const FACES = {
    normal: {},
    happy: { ParamEyeLSmile: 1, ParamEyeRSmile: 1, ParamEyeLOpen: 0, ParamEyeROpen: 0, ParamMouthOpenY: .7, ParamMouthForm: 1 },
    laugh: { ParamEyeLSmile: 1, ParamEyeRSmile: 1, ParamEyeLOpen: 0, ParamEyeROpen: 0, ParamMouthOpenY: 1, ParamMouthForm: 1, Param126: .4 },
    shock: { ParamMouthOpenY: 1, ParamMouthForm: -.3, Param48: 1, ParamBrowLY: 1, ParamBrowRY: 1 },
    angry: { Param17: 1, Param18: 1, ParamMouthForm: -1, ParamBrowLForm: -1, ParamBrowRForm: -1, ParamBrowLY: -1, ParamBrowRY: -1, Param126: 1 },
    sad: { ParamMouthForm: -1, ParamBrowLY: 1, ParamBrowRY: 1, ParamBrowLForm: 1, ParamBrowRForm: 1, ParamEyeLOpen: .75, ParamEyeROpen: .75 },
    wink: { ParamEyeROpen: 0, ParamEyeRSmile: 1, ParamMouthOpenY: .6, ParamMouthForm: 1 },
    star: { Param48: 1, ParamMouthOpenY: .8, ParamMouthForm: 1, ParamBrowLY: .6, ParamBrowRY: .6 },
    love: { ParamEyeLSmile: .6, ParamEyeRSmile: .6, ParamEyeLOpen: .5, ParamEyeROpen: .5, ParamMouthForm: 1, Param126: .5 },
    smug: { ParamEyeLOpen: .55, ParamEyeROpen: .55, ParamMouthForm: 1, ParamBrowLForm: -.4, ParamBrowRForm: -.4 },
    sleepy: { ParamEyeLOpen: .08, ParamEyeROpen: .08, ParamMouthForm: 0, ParamAngleZ: 8 },
    dizzy: { ParamEyeLOpen: .45, ParamEyeROpen: .45, ParamMouthForm: -.5, ParamBrowLY: .8, ParamBrowRY: .8 },
    gulp: { ParamMouthOpenY: .9, ParamMouthForm: .3, Param126: 1, Param48: .8 },
  };

  const STAGE = { left: -14, top: -40, w: 136, h: 164 };

  const CSS = `
  .m-wrap { position: absolute; left: ${STAGE.left}px; top: ${STAGE.top}px; width: ${STAGE.w}px; height: ${STAGE.h}px;
    -webkit-mask-image: linear-gradient(#000 76%, transparent 97%); pointer-events: none; }
  .m-wrap canvas { display: block; width: 100%; height: 100%; }
  .m-wrap.poof { animation: m-poof .7s ease-in-out; }
  @keyframes m-poof { 0% { opacity: 1; filter: none; } 45% { opacity: 0; filter: blur(6px) brightness(2); } 100% { opacity: 1; filter: none; } }
  .m-bubble { position: absolute; left: 76%; top: -10px; white-space: nowrap; font: 600 11px/1 "Segoe UI Variable Text","Segoe UI",system-ui; padding: 6px 9px;
    border-radius: 10px 10px 10px 3px; background: var(--fg, #fff); color: var(--ink, #111); pointer-events: none; z-index: 5;
    opacity: 0; transform: translateY(4px) scale(.8); transform-origin: 0 100%; transition: opacity .15s, transform .3s cubic-bezier(.3,1.5,.5,1); }
  .m-bubble.on { opacity: 1; transform: none; }
  .m-bubble.mad { background: var(--rouge, #ff4d5e); color: #fff; }
  .m-spark { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: var(--rouge, #ff4d5e); pointer-events: none; z-index: 4;
    animation: m-spark .6s ease-out forwards; }
  @keyframes m-spark { from { transform: translate(0,0) scale(1); opacity: 1; } to { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; } }
  .m-vein { position: absolute; right: 12%; top: -4%; font: 800 16px/1 system-ui; opacity: 0; transition: opacity .2s; pointer-events: none; z-index: 4; }
  .m-vein.on { opacity: 1; animation: m-pulse .5s ease-in-out infinite; }
  @keyframes m-pulse { 50% { transform: scale(1.25); } }
  `;
  let cssDone = false;
  function ensureCss() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
  }

  const svg = key => `<img src="../assets/live2d/forms/${FORMS[key] ? key : 'mo'}.png" alt="" style="width:100%;height:100%;border-radius:12px;display:block;object-fit:cover">`;

  function mount(host, formKey, initialCustom) {
    ensureCss();
    let form = FORMS[formKey] ? formKey : 'mo';
    let custom = initialCustom || {};
    host.innerHTML = `<div class="m-wrap"><canvas></canvas></div><div class="m-bubble"></div><div class="m-vein">💢</div>`;
    const wrap = host.querySelector('.m-wrap'), bubble = host.querySelector('.m-bubble'), vein = host.querySelector('.m-vein');
    const canvas = host.querySelector('canvas');

    const cur = {};
    let target = {};
    let gaze = { x: 0, y: 0 };
    let blink = 1, talking = 0, wobble = 0, face = 'normal', mood = null, boilT = 0, boilFast = 0;
    let faceT = null, moodT = null, sayT = null;
    let model = null, app = null, rig = null, running = true, applyColors = () => {};
    let styleParams = {};
    const body = { y: 0, vy: 0, sq: 0, vsq: 0, shake: 0 };

    function resolveStyle() {
      const p = { ...FORMS[form].p };
      for (const sec of CUSTOM) for (const item of sec.items) {
        if (custom[item.key] === undefined) continue;
        for (const id of [].concat(item.param)) p[id] = custom[item.key];
      }
      Object.assign(p, OUTFITS[look(form, custom, 'outfit')]?.p || {});
      styleParams = p;
    }
    resolveStyle();

    const setFace = (name, ms) => {
      face = name; target = FACES[name] || {};
      clearTimeout(faceT);
      if (ms) faceT = setTimeout(() => setFace(mood === 'mad' ? 'angry' : 'normal'), ms);
    };

    (async () => {
      const W = STAGE.w, H = STAGE.h;
      PIXI.live2d.Live2DModel.registerTicker(PIXI.Ticker);
      app = new PIXI.Application({ view: canvas, width: W, height: H, backgroundAlpha: 0, antialias: true,
        resolution: Math.min(2, window.devicePixelRatio || 1) * 1.5, autoDensity: true });
      model = await PIXI.live2d.Live2DModel.from(MODEL, { autoInteract: false });

      rig = new PIXI.Container();
      rig.addChild(model);
      app.stage.addChild(rig);
      const b = model.getLocalBounds();
      const zoom = 1.72, s = W / b.width * zoom;
      model.scale.set(s);
      const groundY = H + 40;
      rig.position.set(W / 2, groundY);
      model.x = -(b.x + b.width * .48) * s;
      model.y = (H * .40 - groundY) - (b.y + b.height * .158) * s;

      const core = model.internalModel.coreModel, raw = core.getModel();
      const pIds = Array.from(raw.parts.ids), pPar = raw.parts.parentIndices, dPar = raw.drawables.parentPartIndices, dIds = Array.from(raw.drawables.ids);
      const RULES = [['hair', HAIR_PARTS], ['skin', SKIN_PARTS], ['sleeve', SLEEVE_PARTS], ['top', TOP_PARTS], ['skirt', SKIRT_PARTS]];
      const groupOf = d => {
        for (let q = dPar[d]; q >= 0; q = pPar[q]) for (const [g, list] of RULES) if (list.includes(pIds[q])) return g;
        return null;
      };
      const groups = { hair: [], skin: [], sleeve: [], top: [], skirt: [], eye: IRIS.map(id => dIds.indexOf(id)).filter(i => i >= 0) };
      for (let d = 0; d < dIds.length; d++) { const g = groupOf(d); if (g) groups[g].push(d); }
      const paint = (list, mul, scr) => {
        for (const d of list) {
          core.setOverwriteFlagForDrawableMultiplyColors(d, !!mul);
          core.setOverwriteFlagForDrawableScreenColors(d, !!scr);
          if (mul) core.setMultiplyColorByRGBA(d, mul[0], mul[1], mul[2], 1);
          if (scr) core.setScreenColorByRGBA(d, scr[0], scr[1], scr[2], 1);
        }
      };
      applyColors = () => {
        const h = HAIR_COLORS[look(form, custom, 'hair')] || HAIR_COLORS.ink;
        const e = EYE_COLORS[look(form, custom, 'eye')] || EYE_COLORS.ink;
        const sk = SKIN_TONES[look(form, custom, 'skin')] || SKIN_TONES.porcelain;
        const o = OUTFITS[look(form, custom, 'outfit')] || OUTFITS.school;
        paint(groups.hair, h.hi, h.hair);
        paint(groups.eye, null, e.c);
        paint(groups.skin, sk.c);
        paint(groups.top, o.top);
        paint(groups.sleeve, o.sleeve);
        paint(groups.skirt, o.skirt);
      };
      applyColors();

      const idx = {};
      const set = (id, v) => { let i = idx[id]; if (i === undefined) i = idx[id] = core.getParameterIndex(id); if (i >= 0) core.setParameterValueByIndex(i, v); };
      let last = performance.now();
      model.internalModel.on('beforeModelUpdate', () => {
        const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
        const k = 1 - Math.exp(-dt * 12);
        const neutral = { ParamEyeLOpen: 1, ParamEyeROpen: 1, Param48: .5 };
        const keys = new Set([...Object.keys(cur), ...Object.keys(target)]);
        for (const id of keys) {
          const from = cur[id] ?? neutral[id] ?? 0, to = target[id] ?? neutral[id] ?? 0;
          cur[id] = from + (to - from) * k;
        }
        cur.lx = (cur.lx || 0) + (gaze.x - (cur.lx || 0)) * (1 - Math.exp(-dt * 6));
        cur.ly = (cur.ly || 0) + (gaze.y - (cur.ly || 0)) * (1 - Math.exp(-dt * 6));
        const t = now / 1000;
        for (const [id, v] of Object.entries(BASE)) set(id, v);

        boilT += dt * (boilFast > now ? 9 : 3.6);
        const fr = Math.floor(boilT) % 3;
        set('Param28', fr === 0 ? 1 : 0); set('Param29', fr === 1 ? 1 : 0); set('Param33', fr === 2 ? 1 : 0);
        for (const [id, v] of Object.entries(styleParams)) set(id, v);
        for (const id of keys) set(id, (id === 'ParamEyeLOpen' || id === 'ParamEyeROpen') ? cur[id] * blink : cur[id]);
        if (!keys.has('ParamEyeLOpen')) { set('ParamEyeLOpen', blink); set('ParamEyeROpen', blink); }
        const air = Math.max(-1, Math.min(1, -body.vy / 300));
        set('ParamAngleX', cur.lx * 22 + Math.sin(t * .7) * 2);
        set('ParamAngleY', -cur.ly * 14 + Math.sin(t * .9) * 1.5 + air * 6);
        set('ParamAngleZ', (cur.ParamAngleZ || 0) + Math.sin(t * .6) * 2.5 + Math.sin(t * 14) * wobble * 10);
        set('ParamBodyAngleX', cur.lx * 6);
        set('ParamBodyAngleY', air * 4);
        set('ParamEyeBallX', cur.lx * .9);
        set('ParamEyeBallY', -cur.ly * .8);
        set('ParamBreath', (Math.sin(t * 2.2) + 1) / 2);
        if (talking > now) set('ParamMouthOpenY', Math.max(cur.ParamMouthOpenY || 0, (Math.sin(t * 22) + 1) * .3));
        wobble *= Math.exp(-dt * 3);
      });

      app.ticker.add(() => {
        const dt = Math.min(.033, app.ticker.deltaMS / 1000);
        if (body.y < 0 || body.vy < 0) {
          body.vy += 1900 * dt; body.y += body.vy * dt;
          if (body.y >= 0) { body.y = 0; body.vsq -= Math.min(4.5, body.vy / 120); body.vy = 0; }
        }
        body.vsq += (-150 * body.sq - 11 * body.vsq) * dt; body.sq += body.vsq * dt;
        body.shake *= Math.exp(-dt * 8);
        const stretch = body.y < 0 ? Math.min(.06, -body.vy / 9000) : 0;
        rig.scale.set(1 + body.sq * .09 - stretch, 1 - body.sq * .09 + stretch * 1.4);
        rig.position.x = W / 2 + Math.sin(performance.now() / 22) * body.shake * 4;
        rig.position.y = groundY + body.y;
      });
      if (!running) pause();
    })().catch(e => console.error('[mascot]', e));

    let lastPoke = Date.now();
    const doBlink = () => { blink = 0; setTimeout(() => blink = .35, 70); setTimeout(() => blink = 1, 130); };
    (function idle() {
      setTimeout(() => {
        if (!mood && (face === 'normal' || face === 'smug')) { doBlink(); if (Math.random() < .25) setTimeout(doBlink, 260); }
        if (face === 'normal' && !mood && Date.now() - lastPoke > 45000 && Math.random() < .3) setFace('sleepy', 5000);
        idle();
      }, 2200 + Math.random() * 3000);
    })();

    const hop = (h = 1) => { if (body.y === 0 && body.vy === 0) { body.vsq += 2.2; setTimeout(() => { body.vy = -330 * h; }, 70); } };
    const squish = (a = 1) => { body.vsq += 3.2 * a; };
    const shake = () => { body.shake = 1; };
    const say = (text, mad) => {
      bubble.textContent = text; bubble.classList.toggle('mad', !!mad); bubble.classList.add('on');
      talking = performance.now() + Math.min(1400, 250 + text.length * 55);
      clearTimeout(sayT); sayT = setTimeout(() => bubble.classList.remove('on'), 1700);
    };
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const sparks = count => {
      for (let i = 0; i < count; i++) {
        const s = document.createElement('div'); s.className = 'm-spark';
        const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 25;
        s.style.left = '50%'; s.style.top = '35%';
        s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
        host.appendChild(s); setTimeout(() => s.remove(), 650);
      }
    };
    const boil = () => { boilFast = performance.now() + 700; };

    function getMad() {
      mood = 'mad'; vein.classList.add('on');
      setFace('angry'); shake(); wobble = .6;
      say(pick(FORMS[form].mad), true);
      clearTimeout(moodT);
      moodT = setTimeout(() => { mood = null; vein.classList.remove('on'); setFace('smug', 1500); say('…fine. Hmph.'); }, 3200);
    }

    const taps = [];
    function tap() {
      lastPoke = Date.now();
      const now = Date.now();
      taps.push(now);
      while (taps.length && now - taps[0] > 2600) taps.shift();
      boil();
      if (mood === 'mad') { clearTimeout(moodT); getMad(); return; }
      if (taps.length >= 6) { getMad(); return; }
      if (taps.length >= 4) { setFace('sad', 1200); squish(.8); say('W-wait…'); return; }
      pick([
        () => { setFace('happy', 1300); hop(); },
        () => { setFace('love', 1300); squish(); },
        () => { setFace('wink', 1200); squish(.6); },
        () => { setFace('shock', 900); hop(.7); },
        () => { setFace('laugh', 1200); wobble = .4; squish(.5); },
        () => { setFace('star', 1300); hop(1.15); sparks(6); },
        () => { setFace('dizzy', 1300); wobble = .8; },
      ])();
      say(pick(FORMS[form].taps));
    }

    function setForm(key, newCustom, animate = true) {
      if (!FORMS[key]) return;
      const apply = () => { form = key; custom = newCustom || {}; resolveStyle(); applyColors(); };
      if (key === form || !animate) return apply();
      wrap.classList.remove('poof'); void wrap.offsetWidth; wrap.classList.add('poof');
      setTimeout(() => { apply(); setFace('happy', 1100); hop(.8); sparks(10); say(`${FORMS[form].name}!`); boil(); }, 300);
    }

    function setCustom(next) {
      custom = next || {};
      resolveStyle(); applyColors(); boil();
      if (face === 'normal') setFace('happy', 600);
      squish(.4);
    }

    function pause() { running = false; if (app) { app.ticker.stop(); PIXI.Ticker.shared.stop(); } }
    function resume() { running = true; if (app) { PIXI.Ticker.shared.start(); app.ticker.start(); } }

    host.addEventListener('click', tap);
    return {
      tap, setForm, setCustom, say, pause, resume, get form() { return form; }, get custom() { return custom; },
      look(dx, dy) { gaze = { x: Math.max(-1, Math.min(1, dx / 220)), y: Math.max(-1, Math.min(1, dy / 160)) }; },
      gulp() { setFace('gulp', 900); squish(1.2); boil(); },
      cheer() { setFace('star', 1100); hop(1.1); sparks(8); boil(); },
      toss() { setFace('laugh', 900); wobble = .5; hop(.6); },
    };
  }

  window.Mascot = { FORMS, CUSTOM, HAIR_COLORS, EYE_COLORS, SKIN_TONES, OUTFITS, valueOf, look, svg, mount, ensureCss };
})();
