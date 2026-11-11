/* CLAWD: EL LOOP interface: every screen, the HUD, the loop indicator, control prompts,
   touch controls and saved progress. Plain script. Defines exactly one global: window.ChispaUI. */
(function (global) {
  'use strict';

  /* ---------- Player-facing text ----------
     Every word the player reads lives here. Stage names and hints live in ChispaCore.STAGES. */
  var TEXT = {
    lang: 'es',
    gameTop: 'CLAWD:',
    gameBottom: 'EL LOOP',
    gameName: 'Clawd: El Loop',
    tagline: ['Observa.', 'Piensa.', 'Actúa.', 'Verifica.'],
    footer: 'Demo de la comunidad. No es un producto oficial de Anthropic.',
    play: 'Jugar',
    controls: [['Mover', 'WASD'], ['Saltar', 'Espacio'], ['Modo rápido', 'Shift'], ['Reiniciar', 'R'], ['Pausa', 'Esc'], ['Silencio', 'M']],
    controlsLabel: 'Controles',
    touchNote: 'Arrastra a la izquierda para moverte. Usa los botones de la derecha para saltar y correr.',
    titleLabel: 'Inicio',
    back: 'Volver',
    chooseTask: 'Elige una tarea',
    demoMode: 'Modo demo',
    task: 'Tarea',
    locked: 'Bloqueada',
    notPlayed: 'Sin jugar',
    best: 'Mejor',
    stepsDone: function (a, t) { return a + ' de ' + t + ' pasos completos'; },
    retries: 'Reintentos',
    pause: 'Pausa',
    paused: 'Pausa',
    resume: 'Continuar',
    restartTask: 'Reiniciar tarea',
    selectTask: 'Elegir tarea',
    sound: 'Sonido',
    ambient: 'Ambiente',
    on: 'Sí',
    off: 'No',
    taskDone: function (n) { return 'Tarea ' + n + ' completa'; },
    time: 'Tiempo',
    target: 'objetivo',
    nextTask: 'Siguiente tarea',
    finish: 'Terminar',
    retry: 'Reintentar',
    newBest: 'Nuevo récord',
    medal: { gold: 'Oro', silver: 'Plata', bronze: 'Bronce' },
    medalLong: { gold: 'Medalla de oro', silver: 'Medalla de plata', bronze: 'Medalla de bronce' },
    finaleTitle: 'Loop completo.',
    finaleBody: 'Clawd terminó todas las tareas. Gracias por jugar.',
    bestSum: 'Suma de tus mejores tiempos:',
    toTitle: 'Inicio',
    jumpBtn: 'Saltar',
    sprintBtn: 'Rápido',
    loopLabel: 'Ciclo del agente',
    loop: { observar: 'Observar', pensar: 'Pensar', actuar: 'Actuar', verificar: 'Verificar', reintento: 'Reintento' },
    prompt: { move: 'Mover', jump: 'Saltar', sprint: 'Modo rápido', push: 'Empujar', restart: 'Reiniciar', skip: 'Omitir' },
    keySpace: 'Espacio',
    keyAny: 'Cualquier tecla',

    /* context board, receipt, glossary and anchor phrases (educational layer) */
    context: 'Contexto',
    papersN: function (n) { return n === 1 ? '1 papel' : n + ' papeles'; },
    readsN: function (n) { return n === 1 ? '1 lectura' : n + ' lecturas'; },
    paperType: { system: 'system prompt', user: 'user message', call: 'tool call', result: 'tool result', assistant: 'assistant message' },
    forgot: function (t) { return 'Se salió del contexto: ' + t; },
    subTitle: 'Subagente: contexto aparte',
    subContrast: function (k) { return '1 papel en tu contexto en vez de ' + k; },
    receipt: 'Recibo',
    receiptPapers: 'papeles en el contexto',
    receiptCalls: 'tool calls',
    receiptReads: 'lecturas del contexto',
    receiptHook: function (n) { return 'El hook dijo no ' + (n === 1 ? '1 vez' : n + ' veces') + ' y la tarea siguió.'; },
    receiptSub: function (a, b) { return 'Subagentes: ' + a + ' papeles en tu contexto en vez de ' + b + '.'; },
    glossary: 'Actores y papeles',
    glossaryActors: 'Actores',
    glossaryPapers: 'Papeles',
    glossaryGame: 'En el juego',
    glossaryIntro: 'El LLM lee todos los papeles del contexto en cada lectura y escribe uno nuevo.',
    actors: [
      ['Usuario', 'Pide la tarea.'],
      ['Harness', 'El código que rodea al LLM: arma el contexto, reparte los papeles y decide cuándo parar.'],
      ['LLM', 'Lee todo el contexto y escribe un papel. No ve ni toca nada más.'],
      ['Hook', 'Código fijo que revisa cada tool call antes de que corra: la deja pasar o dice no.'],
      ['Tool', 'Código que corre y devuelve un dato.'],
      ['Skill', 'Instrucciones escritas que el agente carga solo cuando las necesita.'],
      ['MCP', 'Tools que corren en otro programa y que escribió otra gente.'],
      ['Subagente', 'Otro loop con su propio contexto. Te devuelve un solo papel.']
    ],
    papers: [
      ['system', 'El rol y las reglas del agente. Va primero.'],
      ['user', 'Lo que pide el usuario.'],
      ['call', 'El LLM pide usar una tool. Lleva un número.'],
      ['result', 'Lo que devolvió la tool, con el mismo número. Puede ser un error.'],
      ['assistant', 'El LLM avisa que terminó.']
    ],
    inGame: [
      ['Caminar y saltar', 'Clawd piensa cómo llegar al próximo paso. Pisar un paso es actuar.'],
      ['Pisar un paso', 'un tool call y su tool result.'],
      ['Empujar una herramienta', 'un tool call a una tool.'],
      ['Tocar un error', 'el hook dice no, el error entra al contexto y sigues por otro camino.'],
      ['Caer', 'un tool call que salió mal: también entra al contexto.'],
      ['Un paso que se apaga', 'su papel se sale del contexto y el LLM ya no lo sabe.'],
      ['Paneles en par', 'dos subagentes: cada uno te devuelve un solo papel.']
    ],
    chapter: function (name) { return 'Capítulo ' + name; },

    /* mission card and "what happened" (narrative layer; the story itself lives in ChispaCore STORY) */
    missionTask: function (n, name) { return 'Tarea ' + n + ' · ' + name; },
    missionAsk: 'El usuario pide',
    missionWorld: 'En este mundo',
    missionGo: 'Muévete para empezar',
    missionGoTouch: 'Mueve el control para empezar',
    whatHappened: 'Qué pasó',

    /* mission HUD: the context panel carries the request, its progress and the window */
    contextSub: 'lo que Clawd sabe',
    missionBtn: 'Misión',
    missionBtnLabel: 'Ver la misión completa',
    missionClose: 'Toca la tarjeta o muévete para cerrarla',
    missionCloseTouch: 'Toca «Misión» o muévete para cerrarla',
    progress: 'Avance del pedido',
    progressN: function (a, t) { return a + ' de ' + t; },
    windowN: function (n, w) { return n + ' de ' + w + ' en la ventana'; },
    windowFull: function (n) { return 'Ventana llena (+' + n + ')'; },
    boardHint: 'Aquí se junta todo lo que Clawd sabe de tu pedido',
    pauseMission: 'Ver la misión',

    /* "Tu Clawd": the player's own Clawd and the share card */
    tuClawd: 'Tu Clawd',
    tuLead: 'Elige cómo se ve y cómo se llama. Es el Clawd que juega.',
    tuName: 'Nombre',
    tuNamePlaceholder: 'Clawd',
    tuColor: 'Color',
    tuAcc: 'Accesorio',
    tuPrompt: 'Tu nombre va en el system prompt, el primer papel de cada tarea:',
    tuPromptNote: 'El rol y las reglas de un agente los escribe quien lo arma.',
    tuDone: 'Listo',
    share: 'Tarjeta para compartir',
    shareFinale: 'Compartir tu Clawd',
    shareTitle: 'Tu tarjeta',
    shareWait: 'Armando la tarjeta…',
    shareDownload: 'Descargar imagen',
    shareHint: 'Si no se descarga, mantén presionada la imagen o haz clic derecho para guardarla.',
    shareClose: 'Cerrar',
    shareFile: 'mi-clawd.png',
    shareAlt: function (n) { return 'Tarjeta de ' + n + ' en Clawd: El Loop'; },
    cardGameTop: 'CLAWD:',
    cardGameBottom: 'EL LOOP',
    cardTag: 'Observa. Piensa. Actúa. Verifica.',
    cardMedals: 'Medallas',
    cardFooter: 'Demo de la comunidad. No es un producto oficial de Anthropic.',
    cardUrl: 'clawd-el-loop.pages.dev',
    trademark: 'Clawd, Claude, Haiku, Sonnet y Opus son marcas de Anthropic. Este proyecto es independiente.',
    anchorHint: 'Pulsa una tecla o toca para seguir'
  };

  // Chapters by task complexity, named after model tiers. `from` and `to` are stage indexes.
  // `anchor` is the phrase shown in large type when a chapter starts.
  var CHAPTERS = [
    { name: 'Haiku', note: 'Tareas cortas y simples', from: 0, to: 2,
      anchor: 'El LLM solo lee y escribe. El harness reparte el trabajo y decide cuándo parar.' },
    { name: 'Sonnet', note: 'Más pasos, más herramientas', from: 3, to: 6,
      anchor: 'Si no está en el contexto, el LLM no lo sabe.' },
    { name: 'Opus', note: 'Tareas largas con muchas piezas', from: 7, to: 9,
      anchor: 'El loop ya está hecho. Tu trabajo es el system prompt, las tools y los límites.' }
  ];

  // Context board: icon per paper type (16x16 strokes). Colors live in chispa-ui.css (--ch-p-*).
  var PAPER_ICON = {
    system: 'M4.5 2.5h7v11h-7z M6.5 5.5h3 M6.5 8h3 M6.5 10.5h2',
    user: 'M2.5 3.5h11v7H7.5l-3 2.5v-2.5h-2z',
    call: 'M2.5 8h8 M7.5 4.5 11 8l-3.5 3.5 M13.5 3.5v9',
    result: 'M13 3.5V8H4 M7 5 4 8l3 3',
    assistant: 'M3 8.5l3 3 7-7'
  };
  var SLIPS = 3;          // newest papers shown as readable slips (CSS shows fewer on small screens)
  var CHIP_MAX = 96;      // chips drawn in the pile before older ones fold into a "+N" chip
  var SUB_SHOW = 2.8;     // seconds the subagent card stays
  var NOTE_SHOW = 2.6;    // seconds a board note stays
  var CTX_WINDOW = 40;    // places in the context window drawn on the panel (a game measure, not tokens)
  var FLY_HOLD = 0.9;     // seconds a new paper is read next to the action before it travels
  var FLY_TRAVEL = 0.6;   // seconds of the trip to the panel
  var FLY_MAX = 3;        // papers on their way at once; older ones land at once
  var INTRO_SHOW = 5;     // seconds the panel calls for attention the first time it appears

  /* ---------- Medal rule (CONTRACT-chispa.md, item 6) ----------
     gold at or under par, silver at or under par * SILVER_FACTOR, bronze for any other completion. */
  var SILVER_FACTOR = 1.4;

  var TIP_SECONDS = 4;
  var RETRY_FLASH = 0.9;  // seconds 'reintento' stays lit before the loop returns to 'actuar'
  var LOOP_STEPS = ['observar', 'pensar', 'actuar', 'verificar'];
  var STORE_KEY = 'chispa.v1';
  var MEDALS = ['bronze', 'silver', 'gold'];
  var MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 };
  var SCREENS = ['title', 'select', 'playing', 'paused', 'complete', 'finale', 'glossary', 'clawd', 'share'];
  var LOOK_STORE = 'chispa.clawd.v1';   // the player's Clawd; chispa.v1 (progress) is never touched by it
  var URGENT_SECONDS = 2;
  var REVEAL_DELAY = 0.75; // seconds between the card arriving and the medal stamp

  var doc = global.document;
  var noop = function () {};

  var S = {
    ready: false,
    root: null,
    stages: [],
    on: {},
    sfx: noop,
    screen: 'title',
    stageIndex: 0,
    save: [],
    storageOk: true,
    lastRecord: null,
    muted: false,
    ambient: true,
    demo: false,
    touch: false,
    timers: [],
    fresh: false,
    prompt: null,
    loop: null,
    loopTimer: null,
    el: {},
    hud: { tenths: -1, falls: -1, awake: -1, total: -1, fadingOn: false, p: -1, secs: -1, urgent: false, idle: null, fadeMax: 6 },
    stick: { id: null, x: 0, z: 0, cx: 0, cy: 0 },
    held: { jump: false, sprint: false },
    glossaryFrom: 'title',
    look: null,
    shareFrom: 'title',
    shareUrl: null,
    missionOn: false,
    covers: null,
    anchor: null,
    ctxPlaced: false,
    ctx: { tr: null, ver: -1, n: 0, reads: 0, out: 0, chips: [], live: [], subTimer: null, noteTimer: null, folded: 0 }
  };

  /* ---------- small helpers ---------- */

  function h(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function attr(n, map) { for (var k in map) n.setAttribute(k, map[k]); return n; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function call(name, arg) {
    var fn = S.on && S.on[name];
    if (typeof fn === 'function') {
      try { fn(arg); } catch (e) { if (global.console) console.error('[ChispaUI] on.' + name, e); }
    }
  }
  function sfx(name) {
    try { S.sfx(name); } catch (e) { /* sound is never allowed to break the menus */ }
  }
  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function later(fn, seconds) { S.timers.push(setTimeout(fn, Math.max(0, seconds * 1000))); }
  function clearTimers() { for (var i = 0; i < S.timers.length; i++) clearTimeout(S.timers[i]); S.timers = []; }
  function clampIndex(i) {
    i = Math.floor(Number(i));
    if (!isFinite(i) || i < 0) return 0;
    return Math.min(i, Math.max(0, S.stages.length - 1));
  }
  function stage(i) { return S.stages[i] || { name: TEXT.task + ' ' + (i + 1), hint: '', par: 0 }; }
  function taskLabel(i) { return TEXT.task + ' ' + (i + 1); }

  function fmtTime(t) {
    if (t == null || !isFinite(t)) return '';
    var tenths = Math.floor(Math.max(0, t) * 10 + 1e-6);
    return fmtTenths(tenths);
  }
  function fmtTenths(tenths) {
    var m = Math.floor(tenths / 600);
    var s = Math.floor((tenths % 600) / 10);
    return m + ':' + (s < 10 ? '0' : '') + s + '.' + (tenths % 10);
  }
  function medalFor(time, par) {
    if (!(par > 0)) return 'bronze';
    if (time <= par + 1e-9) return 'gold';
    if (time <= par * SILVER_FACTOR + 1e-9) return 'silver';
    return 'bronze';
  }
  function coin(medal, size) {
    var c = h('span', 'ch-coin ch-coin--' + (medal || 'none'));
    if (size) c.style.setProperty('--s', size + 'px');
    c.setAttribute('aria-hidden', 'true');
    return c;
  }
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, map) { return attr(doc.createElementNS(SVG_NS, tag), map); }
  function lockIcon() {
    var svg = svgEl('svg', { viewBox: '0 0 16 16', 'class': 'ch-lock', 'aria-hidden': 'true' });
    svg.appendChild(svgEl('path', { d: 'M5 7V5a3 3 0 0 1 6 0v2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }));
    svg.appendChild(svgEl('rect', { x: '3', y: '7', width: '10', height: '7.5', rx: '2', fill: 'currentColor' }));
    return svg;
  }
  // Clawd, flat and blocky: wide body, two tall eyes, a stubby arm on each side, four short legs.
  function clawdIcon(cls) {
    var svg = svgEl('svg', { viewBox: '0 0 32 24', 'class': cls || 'ch-clawd', 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' });
    var body = svgEl('g', { 'class': 'ch-clawd__body' });
    var parts = [
      ['rect', { x: 0, y: 9, width: 4, height: 4, 'class': 'ch-clawd__arm' }],
      ['rect', { x: 28, y: 9, width: 4, height: 4, 'class': 'ch-clawd__arm' }],
      ['rect', { x: 4, y: 3, width: 24, height: 14, 'class': 'ch-clawd__fill' }],
      ['rect', { x: 4, y: 3, width: 24, height: 2, 'class': 'ch-clawd__light' }],
      ['rect', { x: 4, y: 15, width: 24, height: 2, 'class': 'ch-clawd__shade' }]
    ];
    parts.forEach(function (p) { body.appendChild(svgEl(p[0], p[1])); });
    var eyes = svgEl('g', { 'class': 'ch-clawd__eyes' });
    eyes.appendChild(svgEl('rect', { x: 10, y: 7, width: 2, height: 4 }));
    eyes.appendChild(svgEl('rect', { x: 20, y: 7, width: 2, height: 4 }));
    body.appendChild(eyes);
    var legs = svgEl('g', { 'class': 'ch-clawd__legs' });
    [6, 11, 18, 23].forEach(function (x, i) {
      legs.appendChild(svgEl('rect', { x: x, y: 17, width: 3, height: 5, 'class': 'ch-clawd__leg', style: '--i:' + i }));
    });
    svg.appendChild(legs);
    svg.appendChild(body);
    return svg;
  }

  /* ---------- saved progress ---------- */

  function blankSave() {
    var out = [];
    for (var i = 0; i < S.stages.length; i++) out.push({ best: null, medal: null });
    return out;
  }
  function loadSave() {
    var data = blankSave();
    var raw = null;
    try {
      raw = global.localStorage.getItem(STORE_KEY);
      S.storageOk = true;
    } catch (e) {
      S.storageOk = false;
    }
    if (!raw) return data;
    try {
      var parsed = JSON.parse(raw);
      var list = parsed && parsed.stages;
      if (Object.prototype.toString.call(list) !== '[object Array]') return data;
      for (var i = 0; i < data.length && i < list.length; i++) {
        var it = list[i] || {};
        var best = Number(it.best);
        data[i].best = it.best != null && isFinite(best) && best > 0 ? best : null;
        data[i].medal = MEDAL_RANK[it.medal] ? it.medal : null;
      }
    } catch (e) { /* corrupt entry: start fresh, overwrite on the next record */ }
    return data;
  }
  function writeSave() {
    try {
      global.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, stages: S.save }));
      S.storageOk = true;
    } catch (e) {
      S.storageOk = false; // progress still lives in memory for this session
    }
  }
  function realUnlocked(i) { return i === 0 || !!(S.save[i - 1] && S.save[i - 1].medal); }
  function progress() {
    var out = [];
    for (var i = 0; i < S.stages.length; i++) {
      var s = S.save[i] || { best: null, medal: null };
      out.push({ best: s.best, medal: s.medal, unlocked: S.demo || realUnlocked(i) });
    }
    return out;
  }
  function record(stageIndex, time, falls) {
    var i = clampIndex(stageIndex);
    time = Number(time);
    if (!isFinite(time) || time < 0) time = 0;
    falls = Math.max(0, Math.floor(Number(falls) || 0));
    var lr = S.lastRecord;
    if (lr && lr.stageIndex === i && lr.time === time && lr.falls === falls) {
      return { medal: lr.result.medal, best: lr.result.best, isNewBest: lr.result.isNewBest };
    }
    if (!S.save.length) S.save = blankSave();
    var slot = S.save[i];
    var medal = medalFor(time, stage(i).par);
    var nextWasUnlocked = i + 1 < S.stages.length && realUnlocked(i + 1);
    var isNewBest = slot.best == null || time < slot.best - 1e-9;
    if (isNewBest) slot.best = time;
    if (!slot.medal || MEDAL_RANK[medal] > MEDAL_RANK[slot.medal]) slot.medal = medal;
    writeSave();
    var result = { medal: medal, best: slot.best, isNewBest: isNewBest };
    S.lastRecord = {
      stageIndex: i, time: time, falls: falls, result: result,
      unlocked: i + 1 < S.stages.length && !nextWasUnlocked ? i + 1 : -1
    };
    return { medal: result.medal, best: result.best, isNewBest: result.isNewBest };
  }
  function nextUnplayed() {
    var p = progress();
    for (var i = 0; i < p.length; i++) if (p[i].unlocked && !p[i].medal) return i;
    for (var j = p.length - 1; j >= 0; j--) if (p[j].unlocked) return j;
    return 0;
  }
  function tally() {
    var t = { gold: 0, silver: 0, bronze: 0, total: 0, all: S.stages.length > 0 };
    for (var i = 0; i < S.stages.length; i++) {
      var s = S.save[i];
      if (s && s.medal) t[s.medal]++;
      if (s && s.best != null) t.total += s.best; else t.all = false;
    }
    return t;
  }

  /* ---------- DOM: layers ---------- */

  function layer(name, extra) {
    var n = h('section', 'ch-layer ch-' + name + (extra ? ' ' + extra : ''));
    n.id = 'ch-' + name;
    n.setAttribute('aria-hidden', 'true');
    n.inert = true;
    S.root.appendChild(n);
    S.el[name] = n;
    return n;
  }
  function button(label, cls, onClick) {
    var b = h('button', 'ch-btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function buildTitle() {
    var L = layer('title', 'ch-veil');
    L.setAttribute('aria-label', TEXT.titleLabel);
    var inner = h('div', 'ch-title__inner');

    var hero = h('div', 'ch-hero');
    hero.setAttribute('aria-hidden', 'true');
    hero.appendChild(clawdIcon('ch-clawd ch-clawd--hero'));
    hero.appendChild(h('span', 'ch-hero__step'));
    inner.appendChild(hero);

    var mark = h('h1', 'ch-mark');
    mark.setAttribute('aria-label', TEXT.gameName);
    var top = h('span', 'ch-mark__top', TEXT.gameTop);
    top.setAttribute('aria-hidden', 'true');
    var bottom = h('span', 'ch-mark__bottom');
    bottom.setAttribute('aria-hidden', 'true');
    bottom.appendChild(doc.createTextNode(TEXT.gameBottom));
    bottom.appendChild(h('span', 'ch-mark__cursor'));
    mark.appendChild(top);
    mark.appendChild(bottom);
    inner.appendChild(mark);

    // the tagline is the loop itself: each verb lights in turn once, then all stay lit
    var tag = h('p', 'ch-tagline');
    TEXT.tagline.forEach(function (w, i) {
      var s = h('span', 'ch-tagline__word', w);
      s.style.setProperty('--i', i);
      tag.appendChild(s);
      if (i < TEXT.tagline.length - 1) tag.appendChild(doc.createTextNode(' '));
    });
    inner.appendChild(tag);

    var play = button(TEXT.play, 'ch-btn--primary ch-play', function () {
      sfx('start');
      go('select');
    });
    S.el.titlePlay = play;
    inner.appendChild(play);
    var tuRow = h('div', 'ch-title__more');
    tuRow.appendChild(button(TEXT.tuClawd, 'ch-btn--quiet ch-btn--small ch-tu-open', function () { sfx('select'); go('clawd'); }));
    tuRow.appendChild(button(TEXT.glossary, 'ch-btn--quiet ch-btn--small ch-gloss-open', openGlossary));
    inner.appendChild(tuRow);

    var controls = h('ul', 'ch-controls');
    controls.setAttribute('aria-label', TEXT.controlsLabel);
    TEXT.controls.forEach(function (c) {
      var li = h('li');
      li.appendChild(h('span', 'ch-kbd', c[1]));
      li.appendChild(doc.createTextNode(c[0]));
      controls.appendChild(li);
    });
    inner.appendChild(controls);
    inner.appendChild(h('p', 'ch-touch-note', TEXT.touchNote));
    L.appendChild(inner);
    L.appendChild(h('p', 'ch-footer', TEXT.footer));
  }

  function buildSelect() {
    var L = layer('select', 'ch-veil');
    L.setAttribute('aria-label', TEXT.chooseTask);
    var panel = h('div', 'ch-panel');
    var head = h('div', 'ch-select__head');
    head.appendChild(button(TEXT.back, 'ch-btn--quiet ch-btn--small', function () { sfx('back'); go('title'); }));
    head.appendChild(h('h2', 'ch-h2', TEXT.chooseTask));
    var t = h('div', 'ch-tally');
    S.el.selectTally = t;
    head.appendChild(t);
    var demo = button('', 'ch-btn--quiet ch-btn--small ch-toggle ch-demo');
    demo.appendChild(h('span', null, TEXT.demoMode));
    demo.appendChild(h('span', 'ch-toggle__state', TEXT.off));
    setToggle(demo, false);
    demo.addEventListener('click', function () {
      S.demo = !S.demo;
      setToggle(demo, S.demo);
      sfx('select');
      renderSelect();
    });
    S.el.demo = demo;
    panel.appendChild(head);
    var chapters = h('div', 'ch-chapters');
    S.el.chapters = chapters;
    panel.appendChild(chapters);
    // presenter switch, kept discreet at the foot of the panel
    var foot = h('div', 'ch-select__foot');
    foot.appendChild(demo);
    panel.appendChild(foot);
    L.appendChild(panel);
  }

  function stageTile(i, p, next) {
    var b = h('button', 'ch-stage');
    b.type = 'button';
    b.dataset.index = i;
    var st = stage(i);
    b.appendChild(h('span', 'ch-stage__num', String(i + 1)));
    b.appendChild(h('span', 'ch-stage__name', st.name));
    var meta = h('span', 'ch-stage__meta');
    var label;
    if (!p.unlocked) {
      b.disabled = true;
      meta.appendChild(lockIcon());
      meta.appendChild(doc.createTextNode(TEXT.locked));
      label = taskLabel(i) + ', ' + st.name + ', ' + TEXT.locked.toLowerCase();
    } else if (p.medal) {
      b.classList.add('is-done');
      meta.appendChild(coin(p.medal, 15));
      meta.appendChild(doc.createTextNode(fmtTime(p.best)));
      label = taskLabel(i) + ', ' + st.name + ', ' + TEXT.medalLong[p.medal].toLowerCase() + ', ' + TEXT.best.toLowerCase() + ' ' + fmtTime(p.best);
    } else {
      meta.appendChild(coin(null, 15));
      meta.appendChild(doc.createTextNode(TEXT.notPlayed));
      label = taskLabel(i) + ', ' + st.name + ', ' + TEXT.notPlayed.toLowerCase();
    }
    if (i === next && !p.medal) b.classList.add('is-next');
    b.setAttribute('aria-label', label);
    b.appendChild(meta);
    b.addEventListener('click', onStageClick);
    return b;
  }
  function chapterList() {
    var n = S.stages.length;
    var out = [];
    var covered = 0;
    CHAPTERS.forEach(function (c) {
      var from = Math.max(c.from, covered), to = Math.min(c.to, n - 1);
      if (from <= to) { out.push({ name: c.name, note: c.note, from: from, to: to }); covered = to + 1; }
    });
    if (covered < n) out.push({ name: '', note: '', from: covered, to: n - 1 }); // stages beyond the plan
    return out;
  }
  function renderSelect() {
    var p = progress();
    var next = nextUnplayed();
    var host = S.el.chapters;
    var keepFocus = doc.activeElement === S.el.demo;
    clear(host);
    S.el.tiles = [];
    chapterList().forEach(function (c) {
      var sec = h('section', 'ch-chapter');
      if (c.name) {
        var hd = h('div', 'ch-chapter__head');
        hd.appendChild(h('h3', 'ch-chapter__name', c.name));
        hd.appendChild(h('span', 'ch-chapter__note', c.note));
        sec.appendChild(hd);
        sec.setAttribute('aria-label', c.name + '. ' + c.note);
      }
      var list = h('ul', 'ch-grid');
      for (var i = c.from; i <= c.to; i++) {
        var li = h('li');
        var tile = stageTile(i, p[i], next);
        li.appendChild(tile);
        list.appendChild(li);
        S.el.tiles[i] = tile;
      }
      sec.appendChild(list);
      host.appendChild(sec);
    });
    var t = tally();
    clear(S.el.selectTally);
    S.el.selectTally.setAttribute('aria-label', t.gold + ' ' + TEXT.medal.gold + ', ' + t.silver + ' ' + TEXT.medal.silver + ', ' + t.bronze + ' ' + TEXT.medal.bronze);
    MEDALS.slice().reverse().forEach(function (m) {
      var s = h('span');
      s.setAttribute('aria-hidden', 'true');
      s.appendChild(coin(m, 14));
      s.appendChild(doc.createTextNode(String(t[m])));
      S.el.selectTally.appendChild(s);
    });
    return keepFocus ? S.el.demo : S.el.tiles[next];
  }
  function onStageClick(e) {
    var i = Number(e.currentTarget.dataset.index);
    if (!progress()[i] || !progress()[i].unlocked) return;
    sfx('start');
    startStage(i, 'play');
  }

  function buildHud() {
    var L = layer('hud', 'ch-layer--hud');
    L.setAttribute('aria-label', TEXT.task);
    var top = h('div', 'ch-hud__top');
    var plaque = h('div', 'ch-plaque');
    var name = h('div', 'ch-plaque__name');
    var token = h('span', 'ch-token', '1');
    var nameText = h('span', null, '');
    name.appendChild(token);
    name.appendChild(nameText);
    plaque.appendChild(name);
    var row = h('div', 'ch-keys-row');
    var keys = h('div', 'ch-keys');
    keys.setAttribute('aria-hidden', 'true');
    var keysText = h('span', 'ch-sr', '');
    var ring = h('div', 'ch-ring');
    ring.setAttribute('aria-hidden', 'true');
    var ringNum = h('span', null, '');
    ring.appendChild(ringNum);
    row.appendChild(keys);
    row.appendChild(keysText);
    row.appendChild(ring);
    plaque.appendChild(row);
    top.appendChild(plaque);

    top.appendChild(buildLoop());

    var right = h('div', 'ch-hud__right');
    var clock = h('div', 'ch-clock');
    var time = h('span', 'ch-clock__time', '0:00.0');
    var falls = h('span', 'ch-clock__falls', TEXT.retries + ' 0');
    clock.appendChild(time);
    clock.appendChild(falls);
    right.appendChild(clock);
    var pause = h('button', 'ch-pause');
    pause.type = 'button';
    pause.tabIndex = -1; // keyboard players pause with Esc; Space must never press it
    pause.setAttribute('aria-label', TEXT.pause);
    pause.addEventListener('click', function () {
      pause.blur();
      if (S.screen !== 'playing') return;
      sfx('pause');
      call('pause');
      if (S.screen === 'playing') go('paused');
    });
    right.appendChild(pause);
    top.appendChild(right);
    L.appendChild(top);
    S.el.hudTop = top;
    L.appendChild(buildBoard());
    L.appendChild(buildMission());

    var bottom = h('div', 'ch-hud__bottom');
    var slot = h('div', 'ch-caption-slot');
    slot.setAttribute('aria-live', 'polite');
    var promptSlot = h('div', 'ch-prompt-slot');
    promptSlot.setAttribute('aria-live', 'polite');
    bottom.appendChild(slot);
    bottom.appendChild(promptSlot);
    L.appendChild(bottom);

    S.el.hudToken = token;
    S.el.hudName = nameText;
    S.el.keys = keys;
    S.el.keysText = keysText;
    S.el.ring = ring;
    S.el.ringNum = ringNum;
    S.el.time = time;
    S.el.falls = falls;
    S.el.clock = clock;
    S.el.captionSlot = slot;
    S.el.promptSlot = promptSlot;
    S.el.keyBars = [];
  }

  /* ---------- context board: the papers of the agent's context ---------- */

  function paperIcon(type) {
    var b = h('span', 'ch-pbadge ch-pbadge--' + type);
    b.setAttribute('aria-hidden', 'true');
    var svg = svgEl('svg', { viewBox: '0 0 16 16', width: '16', height: '16' });
    svg.appendChild(svgEl('path', { d: PAPER_ICON[type] || '', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    b.appendChild(svg);
    return b;
  }
  function buildBoard() {
    var box = h('aside', 'ch-ctx');
    box.setAttribute('aria-label', TEXT.context + ': ' + TEXT.contextSub);
    var head = h('div', 'ch-ctx__head');
    head.appendChild(h('span', 'ch-ctx__title', TEXT.context));
    head.appendChild(h('span', 'ch-ctx__sub', TEXT.contextSub));
    var mb = h('button', 'ch-ctx__mission', TEXT.missionBtn);
    mb.type = 'button';
    mb.tabIndex = -1; // keyboard players use Esc, then "Ver la misión"; Space must never press it
    mb.setAttribute('aria-label', TEXT.missionBtnLabel);
    mb.addEventListener('click', function (e) {
      e.stopPropagation();
      mb.blur();
      if (S.screen !== 'playing') return;
      sfx('select');
      if (S.missionOn) mission(null); else mission(S.stageIndex, true);
    });
    head.appendChild(mb);
    box.appendChild(head);
    var hint = h('p', 'ch-ctx__hint', TEXT.boardHint);
    box.appendChild(hint);
    // the request: the first paper of the context, always on top
    var ask = h('div', 'ch-ctx__ask');
    ask.appendChild(paperIcon('user'));
    var askText = h('p', null, '');
    ask.appendChild(askText);
    box.appendChild(ask);
    // the request's progress: one pill per part, lit when its step is in the context
    var parts = h('div', 'ch-ctx__parts');
    var ph = h('div', 'ch-ctx__parts-head');
    ph.appendChild(h('span', null, TEXT.progress));
    var pc = h('span', 'ch-ctx__parts-count', '');
    ph.appendChild(pc);
    parts.appendChild(ph);
    var pills = h('ul', 'ch-ctx__pills');
    parts.appendChild(pills);
    box.appendChild(parts);
    // the window: CTX_WINDOW places that fill with one chip per paper
    var win = h('div', 'ch-ctx__window');
    var pile = h('div', 'ch-ctx__pile');
    pile.setAttribute('aria-hidden', 'true');
    win.appendChild(pile);
    var meter = h('p', 'ch-ctx__meter', '');
    win.appendChild(meter);
    box.appendChild(win);
    var slips = h('ol', 'ch-ctx__slips');
    box.appendChild(slips);
    var note = h('p', 'ch-ctx__note', '');
    box.appendChild(note);
    var sub = h('div', 'ch-subcard');
    sub.setAttribute('aria-hidden', 'true');
    box.appendChild(sub);
    S.el.ctx = box;
    S.el.ctxAsk = askText;
    S.el.ctxPartsCount = pc;
    S.el.ctxPills = pills;
    S.el.ctxMeter = meter;
    S.el.ctxPile = pile;
    S.el.ctxSlips = slips;
    S.el.ctxNote = note;
    S.el.ctxSub = sub;
    S.el.ctxMissionBtn = mb;
    return box;
  }
  function chipClass(p) {
    return 'ch-chip ch-chip--' + p.type + (p.err ? ' is-err' : '') + (p.sub ? ' is-sub' : '') + (p.out ? ' is-out' : '');
  }
  function storyPart(call) {
    var core = global.ChispaCore;
    if (core && core.storyPart) return core.storyPart(call);
    return String(call || '');
  }
  function slip(p) {
    var li = h('li', 'ch-slip ch-slip--' + p.type + (p.err ? ' is-err' : '') + (p.sub ? ' is-sub' : '') + (p.out ? ' is-out' : '') + (p.ctx ? ' is-ctx' : ''));
    li.appendChild(h('span', 'ch-sr', TEXT.paperType[p.type] + ': '));
    li.appendChild(paperIcon(p.type));
    if (p.id != null) li.appendChild(h('span', 'ch-slip__num', '#' + p.id));
    li.appendChild(h('span', 'ch-slip__text', String(p.text)));
    return li;
  }
  function restart(n, cls) {
    n.classList.remove(cls);
    void n.offsetWidth;
    n.classList.add(cls);
  }
  function resetBoard() {
    var C = S.ctx;
    C.ver = -1; C.n = 0; C.reads = 0; C.out = 0; C.chips = []; C.live = []; C.folded = 0;
    if (C.subTimer) { clearTimeout(C.subTimer); C.subTimer = null; }
    if (C.noteTimer) { clearTimeout(C.noteTimer); C.noteTimer = null; }
    clearFlies();
    clear(S.el.ctxPile);
    for (var i = 0; i < CTX_WINDOW; i++) {
      var slot = h('i', 'ch-chip ch-chip--slot');
      S.el.ctxPile.appendChild(slot);
      C.chips.push(slot);
    }
    clear(S.el.ctxSlips);
    clear(S.el.ctxPills);
    C.pills = [];
    var st = stage(S.stageIndex).story;
    (st && st.steps ? st.steps : []).forEach(function (p) {
      var li = h('li', 'ch-pill' + (/^Agent\(/.test(p[0]) ? ' is-pair' : ''), storyPart(p[0]));
      S.el.ctxPills.appendChild(li);
      C.pills.push(li);
    });
    S.el.ctxPartsCount.textContent = C.pills.length ? TEXT.progressN(0, C.pills.length) : '';
    S.el.ctxAsk.textContent = st ? '«' + st.ask + '»' : '';
    S.el.ctxNote.textContent = '';
    S.el.ctxNote.classList.remove('is-on');
    S.el.ctxSub.classList.remove('is-on');
    S.el.ctx.classList.remove('is-reading', 'is-refused', 'is-arrive');
    S.el.ctxMeter.textContent = TEXT.windowN(0, CTX_WINDOW) + ' · ' + TEXT.readsN(0);
  }
  function boardNote(text) {
    var C = S.ctx, n = S.el.ctxNote;
    n.textContent = text;
    restart(n, 'is-on');
    if (C.noteTimer) clearTimeout(C.noteTimer);
    C.noteTimer = setTimeout(function () { C.noteTimer = null; n.classList.remove('is-on'); }, NOTE_SHOW * 1000);
  }
  // A subagent finished: show its own context (kept apart) folding into the one paper you get.
  function showSubagent(p) {
    var C = S.ctx, card = S.el.ctxSub;
    var inner = (global.ChispaCore && global.ChispaCore.SUB_INNER) || 6;
    clear(card);
    card.appendChild(h('span', 'ch-subcard__title', TEXT.subTitle));
    var row = h('span', 'ch-subcard__row');
    var apart = h('span', 'ch-subcard__apart');
    for (var i = 0; i < inner; i++) {
      var c = h('i', 'ch-chip ch-chip--' + (i % 2 ? 'result' : 'call'));
      c.style.setProperty('--i', i);
      apart.appendChild(c);
    }
    row.appendChild(apart);
    row.appendChild(h('span', 'ch-subcard__arrow', '→'));
    var one = h('i', 'ch-chip ch-chip--result is-sub ch-subcard__one');
    row.appendChild(one);
    card.appendChild(row);
    card.appendChild(h('span', 'ch-subcard__text', TEXT.subContrast(inner)));
    restart(card, 'is-on');
    if (C.subTimer) clearTimeout(C.subTimer);
    C.subTimer = setTimeout(function () { C.subTimer = null; card.classList.remove('is-on'); }, SUB_SHOW * 1000);
  }
  function renderBoard(tr) {
    var C = S.ctx, P = tr.papers, el = S.el, i, p;
    var from = C.n;
    // the request is the user message paper itself
    if (from === 0 && P[1] && P[1].type === 'user') el.ctxAsk.textContent = '«' + P[1].text + '»';
    // the window: each paper takes the next place; past the window the meter says how many over
    for (i = from; i < P.length && i < CTX_WINDOW; i++) C.chips[i].className = chipClass(P[i]);
    for (i = 0; i < P.length && i < CTX_WINDOW; i++) if (P[i].ctx) C.chips[i].classList.toggle('is-out', !!P[i].out);
    C.n = P.length;
    S.covers = null;
    var inCtx = P.length - (tr.forgotten || 0);
    el.ctxMeter.textContent = (inCtx > CTX_WINDOW ? TEXT.windowFull(inCtx - CTX_WINDOW) : TEXT.windowN(inCtx, CTX_WINDOW)) + ' · ' + TEXT.readsN(tr.reads);
    // the request's progress: a part is done while its step's result is in the context
    var done = 0;
    for (var k = 0; k < C.pills.length; k++) {
      var isDone = false, isOut = false;
      for (i = 2; i < P.length; i++) {
        p = P[i];
        if (p.type !== 'result' || p.key !== k || p.err) continue;
        if (p.out) isOut = true; else isDone = true;
      }
      C.pills[k].classList.toggle('is-done', isDone);
      C.pills[k].classList.toggle('is-out', isOut && !isDone);
      if (isDone) done++;
    }
    if (C.pills.length) el.ctxPartsCount.textContent = TEXT.progressN(done, C.pills.length);
    // every read is the LLM going over the whole pile again
    if (tr.reads > C.reads) { C.reads = tr.reads; restart(el.ctx, 'is-reading'); }
    for (i = from; i < P.length; i++) {
      p = P[i];
      if (p.type !== 'result') continue;
      if (p.err === 'hook') restart(el.ctx, 'is-refused');
      else if (p.sub && !p.err) showSubagent(p);
    }
    if (tr.forgotten > C.out) {
      C.out = tr.forgotten;
      for (i = P.length - 1; i >= 0; i--) if (P[i].ctx && P[i].out) { boardNote(TEXT.forgot(P[i].text)); break; }
    }
    // the newest papers as readable slips, newest on top, never cut
    clear(el.ctxSlips);
    C.live = [];
    for (i = P.length - 1; i >= Math.max(2, P.length - SLIPS); i--) {
      var sl = slip(P[i]);
      el.ctxSlips.appendChild(sl);
      if (P[i].ctx && !P[i].out) C.live.push({ p: P[i], el: sl, v: -1 });
    }
  }
  function placeBoard() {
    var top = S.el.hudTop, L = S.el.hud;
    if (!top || !L) return;
    var lr = L.getBoundingClientRect(), r = top.getBoundingClientRect();
    if (!r.height) return;
    var short = global.innerHeight <= 500 && global.innerWidth > global.innerHeight;
    S.el.ctx.style.top = Math.round(r.bottom - lr.top + (short ? 2 : 10)) + 'px';
    // The mission card sits under the top bar; on narrow portrait screens, under the board.
    if (S.el.mission) {
      S.el.mission.style.top = Math.round(r.bottom - lr.top + 10) + 'px';
    }
    S.ctxPlaced = true;
    S.covers = null;
  }
  // Cheap: call every frame while playing with the transcript from ChispaCore.makeTranscript.
  function context(tr) {
    if (!S.ready || !S.el.ctx) return;
    var C = S.ctx;
    if (!tr || !tr.papers) { if (C.tr) { C.tr = null; resetBoard(); } return; }
    if (tr !== C.tr) {
      C.tr = tr; resetBoard();
      if (!S.boardIntro) {
        S.boardIntro = true;
        restart(S.el.ctx, 'is-intro');
        setTimeout(function () { S.el.ctx.classList.remove('is-intro'); S.covers = null; }, INTRO_SHOW * 1000);
      }
    }
    if (tr.version !== C.ver) { C.ver = tr.version; renderBoard(tr); if (S.missionOn) S.ctxPlaced = false; }
    if (!S.ctxPlaced) placeBoard();
    for (var i = 0; i < C.live.length; i++) {
      var L = C.live[i], lf = L.p.out ? 0 : Math.round((Number(L.p.life) || 0) * 100) / 100;
      if (lf !== L.v) { L.v = lf; L.el.style.setProperty('--life', lf); }
    }
  }

  /* ---------- a new paper is a moment: read next to the action, then it travels ---------- */

  function clearFlies() {
    var list = S.flies || [];
    for (var i = 0; i < list.length; i++) { clearTimeout(list[i].t); if (list[i].el.parentNode) list[i].el.parentNode.removeChild(list[i].el); }
    S.flies = [];
  }
  // The highest y a paper may start at on touch screens, so it never sits on the controls.
  function touchFloor(H) {
    if (!S.touch) return H - 8;
    var y = H - 8, ns = [S.el.stick, S.el.pad];
    for (var i = 0; i < ns.length; i++) {
      if (!ns[i]) continue;
      var r = ns[i].getBoundingClientRect();
      if (r.height > 0) y = Math.min(y, r.top - 8);
    }
    return y;
  }
  // fly({ type, id, text, call?, err?, sub? }, x, y): x, y in viewport px where it happened.
  function fly(p, x, y) {
    if (!S.ready || !p || !S.el.hud || S.screen !== 'playing') return;
    var list = S.flies || (S.flies = []);
    while (list.length >= FLY_MAX) { var old = list.shift(); clearTimeout(old.t); if (old.el.parentNode) old.el.parentNode.removeChild(old.el); }
    var c = h('div', 'ch-fly ch-fly--' + p.type + (p.err ? ' is-err' : '') + (p.sub ? ' is-sub' : ''));
    c.setAttribute('aria-hidden', 'true');
    c.appendChild(paperIcon(p.type));
    var body = h('span', 'ch-fly__body');
    var num = p.id != null ? '#' + p.id + ' ' : '';
    if (p.call) body.appendChild(h('span', 'ch-fly__call', num + p.call));
    body.appendChild(h('span', 'ch-fly__text', (p.call ? '' : num) + String(p.text)));
    c.appendChild(body);
    S.el.hud.appendChild(c);
    var W = global.innerWidth, H = global.innerHeight, w = c.offsetWidth, hh = c.offsetHeight;
    x = isFinite(x) ? x : W / 2; y = isFinite(y) ? y : H / 2;
    // beside the action, on the panel's side, so it does not sit on the path ahead
    var left = x - w - 28 >= 8 ? x - w - 28 : Math.min(W - w - 8, x + 28);
    left = Math.max(8, left);
    var top = Math.max(8, Math.min(touchFloor(H) - hh, y - hh - 12));
    c.style.left = Math.round(left) + 'px';
    c.style.top = Math.round(top) + 'px';
    var item = { el: c, t: 0 };
    list.push(item);
    var land = function () {
      var i = list.indexOf(item);
      if (i >= 0) list.splice(i, 1);
      if (c.parentNode) c.parentNode.removeChild(c);
      if (S.el.ctx) restart(S.el.ctx, 'is-arrive');
    };
    item.t = setTimeout(function () {
      if (reducedMotion()) { c.classList.add('is-leaving'); item.t = setTimeout(land, 250); return; }
      var target = S.el.ctxSlips.getBoundingClientRect();
      if (!target.height) target = S.el.ctx.getBoundingClientRect();
      var dx = target.left - left, dy = target.top - top;
      c.style.transition = 'transform ' + FLY_TRAVEL + 's cubic-bezier(.5,0,.75,0), opacity ' + FLY_TRAVEL + 's ease-in';
      c.style.transform = 'translate(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px) scale(.55)';
      c.style.opacity = '0.25';
      c.classList.add('is-travel');
      item.t = setTimeout(land, FLY_TRAVEL * 1000);
    }, FLY_HOLD * 1000);
  }

  /* ---------- covers: HUD areas where 3D labels must not show half-hidden ---------- */

  // Rects (viewport px) of the opaque HUD panels: top bar pieces, context board, mission card.
  // Cached; recomputed only after a layout change marks them stale (S.covers = null).
  function covers() {
    if (!S.ready || (S.screen !== 'playing' && S.screen !== 'paused')) return [];
    if (!S.covers) {
      var list = [], els = [S.el.ctx, S.missionOn ? S.el.mission : null, S.touch ? S.el.stick : null, S.touch ? S.el.pad : null];
      var top = S.el.hudTop ? S.el.hudTop.children : [];
      for (var i = 0; i < top.length; i++) els.push(top[i]);
      for (var j = 0; j < els.length; j++) {
        var n = els[j];
        if (!n) continue;
        var r = n.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) list.push({ l: r.left, t: r.top, r: r.right, b: r.bottom });
      }
      S.covers = list;
    }
    return S.covers;
  }

  /* ---------- mission card: what the user asks now and what this world means ---------- */

  function buildMission() {
    var card = h('div', 'ch-mission');
    card.setAttribute('role', 'status');
    card.addEventListener('click', function () { mission(null); });
    S.el.mission = card;
    return card;
  }
  // The card's content (task, request, "En este mundo"), shared by the HUD card and the pause.
  function missionContent(box, i) {
    var st = stage(i).story;
    box.appendChild(h('p', 'ch-mission__task', TEXT.missionTask(i + 1, stage(i).name)));
    var ask = h('p', 'ch-mission__ask');
    ask.appendChild(paperIcon('user'));
    ask.appendChild(h('span', 'ch-sr', TEXT.missionAsk + ': '));
    ask.appendChild(h('span', null, '«' + st.ask + '»'));
    box.appendChild(ask);
    box.appendChild(h('p', 'ch-mission__h', TEXT.missionWorld));
    var ul = h('ul', 'ch-mission__legend');
    (st.legend || []).forEach(function (l) {
      var li = h('li');
      li.appendChild(h('i', 'ch-swatch ch-swatch--' + l[0]));
      li.appendChild(h('span', null, l[1]));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }
  // mission(stageIndex) shows the card of that task; mission(stageIndex, true) reopens it mid-task
  // (the stage hint is left alone); mission(null) hides it.
  function mission(i, reopen) {
    if (!S.ready || !S.el.mission) return;
    var card = S.el.mission, was = S.missionOn, wasReopen = S.missionReopen;
    var st = i != null ? stage(clampIndex(i)).story : null;
    S.covers = null;
    if (!st) {
      S.missionOn = false;
      S.missionReopen = false;
      card.classList.remove('is-on');
      if (S.el.ctxMissionBtn) S.el.ctxMissionBtn.classList.remove('is-on');
      if (was && !wasReopen && S.screen === 'playing' && !S.anchor) showCaption(stage(S.stageIndex).hint);
      return;
    }
    i = clampIndex(i);
    clear(card);
    missionContent(card, i);
    card.appendChild(h('p', 'ch-mission__go', reopen ? (S.touch ? TEXT.missionCloseTouch : TEXT.missionClose) : S.touch ? TEXT.missionGoTouch : TEXT.missionGo));
    S.missionOn = true;
    S.missionReopen = !!reopen;
    if (S.el.ctxMissionBtn) S.el.ctxMissionBtn.classList.add('is-on');
    if (!reopen) clear(S.el.captionSlot); // the stage hint waits until the first card is gone
    S.ctxPlaced = false;
    restart(card, 'is-on');
  }
    /* ---------- anchor phrase: one large line when a chapter starts ---------- */

  function buildAnchor() {
    var L = layer('anchor', 'ch-anchor');
    var box = h('div', 'ch-anchor__box');
    var chap = h('p', 'ch-anchor__chapter', '');
    var phrase = h('p', 'ch-anchor__phrase', '');
    var hint = h('p', 'ch-anchor__hint', TEXT.anchorHint);
    box.appendChild(chap);
    box.appendChild(phrase);
    box.appendChild(hint);
    L.appendChild(box);
    S.el.anchorChapter = chap;
    S.el.anchorPhrase = phrase;
  }
  function anchor(name) {
    if (!S.ready) return;
    var ch = null;
    for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].name === name) ch = CHAPTERS[i];
    var was = S.anchor;
    S.anchor = ch ? ch.name : null;
    if (ch) {
      S.el.anchorChapter.textContent = TEXT.chapter(ch.name);
      S.el.anchorPhrase.textContent = ch.anchor;
      clear(S.el.captionSlot); // the stage hint waits until the phrase is gone
    } else if (was && S.screen === 'playing' && !S.missionOn) {
      showCaption(stage(S.stageIndex).hint);
    }
    setLayer(S.el.anchor, !!ch);
    S.el.anchor.setAttribute('role', ch ? 'status' : 'presentation');
  }

  /* ---------- "Tu Clawd": name, color and accessory; saved apart from progress ---------- */

  function clawdData() { return (global.ChispaCore && global.ChispaCore.CLAWD) || null; }
  function safeName(n) {
    var core = global.ChispaCore;
    if (core && core.clawdName) return core.clawdName(n);
    n = String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, 16);
    return n || 'Clawd';
  }
  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function loadLook() {
    var D = clawdData(), out = { name: '', color: D ? D.colors[0].id : 'terracota', acc: 'ninguno' };
    var raw = null;
    try { raw = global.localStorage.getItem(LOOK_STORE); } catch (e) { raw = null; }
    if (!raw) return out;
    try {
      var p = JSON.parse(raw);
      if (p && typeof p.name === 'string') out.name = p.name.slice(0, 64);
      if (D && p && findById(D.colors, p.color)) out.color = p.color;
      if (D && p && findById(D.accessories, p.acc)) out.acc = p.acc;
    } catch (e) { /* a broken look falls back to the default Clawd */ }
    return out;
  }
  function saveLook() {
    try { global.localStorage.setItem(LOOK_STORE, JSON.stringify({ v: 1, name: S.look.name, color: S.look.color, acc: S.look.acc })); } catch (e) { /* the look still lives for this session */ }
  }
  // look(): what the render and the transcript use. name is always the safe, short name.
  function look() {
    var L = S.look || loadLook();
    return { name: safeName(L.name), color: L.color, acc: L.acc };
  }
  function lookChanged() {
    saveLook();
    renderTuState();
    call('clawd', look());
  }
  function promptText() {
    var core = global.ChispaCore, base = core && core.PAPER_TEXT ? core.PAPER_TEXT.system : 'Eres Clawd, un asistente.';
    return base.replace(/^Eres Clawd,/, 'Eres ' + look().name + ',');
  }
  function buildClawd() {
    // the layer is named 'tuclawd': 'ch-clawd' is already the Clawd icon's class
    var L = layer('tuclawd', 'ch-tu-screen');
    S.el.clawd = L;
    L.setAttribute('aria-label', TEXT.tuClawd);
    var panel = h('div', 'ch-panel ch-tu');
    var head = h('div', 'ch-select__head');
    head.appendChild(button(TEXT.back, 'ch-btn--quiet ch-btn--small', function () { sfx('back'); go('title'); }));
    head.appendChild(h('h2', 'ch-h2', TEXT.tuClawd));
    panel.appendChild(head);
    panel.appendChild(h('p', 'ch-sub', TEXT.tuLead));
    var D = clawdData();
    // name
    var nameLab = h('label', 'ch-tu__label', TEXT.tuName);
    nameLab.setAttribute('for', 'ch-tu-name');
    panel.appendChild(nameLab);
    var input = h('input', 'ch-tu__name');
    attr(input, { id: 'ch-tu-name', type: 'text', maxlength: String(D ? D.nameMax : 16), autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'done', placeholder: TEXT.tuNamePlaceholder });
    input.addEventListener('input', function () { S.look.name = input.value; lookChanged(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); input.blur(); focusEl(S.el.tuDone); } });
    panel.appendChild(input);
    // color
    panel.appendChild(h('p', 'ch-tu__label', TEXT.tuColor));
    var colors = h('div', 'ch-tu__colors');
    colors.setAttribute('role', 'group');
    colors.setAttribute('aria-label', TEXT.tuColor);
    S.el.tuColors = [];
    (D ? D.colors : []).forEach(function (c) {
      var b = button('', 'ch-tu__color', function () { sfx('move'); S.look.color = c.id; lookChanged(); });
      b.style.setProperty('--sw', c.body);
      b.setAttribute('aria-label', c.label);
      b.title = c.label;
      b.dataset.id = c.id;
      colors.appendChild(b);
      S.el.tuColors.push(b);
    });
    panel.appendChild(colors);
    // accessory
    panel.appendChild(h('p', 'ch-tu__label', TEXT.tuAcc));
    var accs = h('div', 'ch-tu__accs');
    accs.setAttribute('role', 'group');
    accs.setAttribute('aria-label', TEXT.tuAcc);
    S.el.tuAccs = [];
    (D ? D.accessories : []).forEach(function (a) {
      var b = button(a.label, 'ch-btn--small ch-tu__acc', function () { sfx('move'); S.look.acc = a.id; lookChanged(); });
      b.dataset.id = a.id;
      accs.appendChild(b);
      S.el.tuAccs.push(b);
    });
    panel.appendChild(accs);
    // personalising is writing the system prompt
    panel.appendChild(h('p', 'ch-tu__label ch-tu__label--prompt', TEXT.tuPrompt));
    var pr = h('p', 'ch-tu__prompt');
    pr.appendChild(paperIcon('system'));
    var prText = h('span', null, '');
    pr.appendChild(prText);
    panel.appendChild(pr);
    panel.appendChild(h('p', 'ch-tu__note', TEXT.tuPromptNote));
    var acts = h('div', 'ch-actions');
    var done = button(TEXT.tuDone, 'ch-btn--primary', function () { sfx('select'); go('title'); });
    acts.appendChild(done);
    acts.appendChild(button(TEXT.share, '', function () { openShare('clawd'); }));
    panel.appendChild(acts);
    L.appendChild(panel);
    S.el.tuName = input;
    S.el.tuPrompt = prText;
    S.el.tuDone = done;
  }
  function renderTuState() {
    if (!S.el.tuName) return;
    if (S.el.tuName.value !== S.look.name && global.document.activeElement !== S.el.tuName) S.el.tuName.value = S.look.name;
    (S.el.tuColors || []).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.id === S.look.color ? 'true' : 'false'); });
    (S.el.tuAccs || []).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.id === S.look.acc ? 'true' : 'false'); });
    S.el.tuPrompt.textContent = '«' + promptText() + '»';
  }

  /* ---------- share card: a 4:5 image of the player's Clawd ---------- */

  function shade(hex, f) {
    var n = parseInt(String(hex).slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var c = function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); };
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  // The Clawd from the front, a little from above and to the right: every box shows its front,
  // top and right faces, far boxes first. Same boxes as the 3D model (ChispaCore.CLAWD).
  function drawClawd(g, cx, cy, s, L) {
    var D = clawdData();
    if (!D) return;
    var col = findById(D.colors, L.color) || D.colors[0], acc = findById(D.accessories, L.acc) || D.accessories[0];
    var K = 0.32;
    var P = function (x, y, z) { return [cx + (x + z * K) * s, cy - (y + z * K) * s]; };
    var boxes = [];
    D.body.forEach(function (b) { boxes.push({ b: b, c: b[6] === 'body' ? col.body : b[6] === 'dark' ? col.dark : D.eye, a: 1 }); });
    acc.boxes.forEach(function (b) { boxes.push({ b: b, c: acc.parts[b[6]] || '#ffffff', a: b[6] === 'lens' ? 0.62 : 1 }); });
    boxes.sort(function (p, q) { return (q.b[5] + q.b[2] / 2) - (p.b[5] + p.b[2] / 2); });
    var poly = function (pts, fill) { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); };
    boxes.forEach(function (o) {
      var b = o.b, x0 = b[3] - b[0] / 2, x1 = b[3] + b[0] / 2, y0 = b[4] - b[1] / 2, y1 = b[4] + b[1] / 2, z0 = b[5] - b[2] / 2, z1 = b[5] + b[2] / 2;
      g.globalAlpha = o.a;
      poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], shade(o.c, 1.16));
      poly([P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0)], shade(o.c, 0.72));
      poly([P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)], o.c);
    });
    g.globalAlpha = 1;
  }
  function coinAt(g, x, y, r, base, edge) {
    g.fillStyle = edge; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = base; g.beginPath(); g.arc(x, y, r * 0.8, 0, Math.PI * 2); g.fill();
  }
  function drawCard() {
    var W = 1080, H = 1350, c = doc.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d'), L = look();
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1d1a3f'); sky.addColorStop(0.5, '#4a2a5e'); sky.addColorStop(0.82, '#c0607e'); sky.addColorStop(1, '#ff7a59');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    var glow = g.createRadialGradient(540, 650, 40, 540, 650, 470);
    glow.addColorStop(0, 'rgba(255,179,71,0.42)'); glow.addColorStop(1, 'rgba(255,179,71,0)');
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    // a step under the Clawd, like the game's panels
    g.fillStyle = 'rgba(255,243,220,0.16)'; g.fillRect(250, 860, 580, 34);
    g.fillStyle = '#ffb347'; g.fillRect(330, 846, 420, 18);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#fff3dc';
    g.font = '64px "Press Start 2P", monospace';
    g.fillText(TEXT.cardGameTop, 540, 168);
    g.fillStyle = '#ffb347';
    g.fillText(TEXT.cardGameBottom, 540, 258);
    g.fillStyle = 'rgba(255,243,220,0.82)';
    g.font = '700 34px "Atkinson Hyperlegible Next", "Segoe UI", sans-serif';
    g.fillText(TEXT.cardTag, 540, 326);
    drawClawd(g, 520, 660, 560, L);
    // the name: canvas text, never HTML
    g.fillStyle = '#fff3dc';
    var name = L.name, size = 86;
    var nameFont = function () { g.font = '800 ' + size + 'px "Atkinson Hyperlegible Next", "Segoe UI", sans-serif'; };
    nameFont();
    while (g.measureText(name).width > 940 && size > 40) { size -= 6; nameFont(); }
    g.fillText(name, 540, 1010);
    // medals from saved progress
    var t = tally();
    var medals = [['gold', '#ffcf5c', '#c9962f'], ['silver', '#d8dee6', '#8f98a6'], ['bronze', '#c9814f', '#7c4626']];
    g.font = '700 30px "Atkinson Hyperlegible Next", "Segoe UI", sans-serif';
    g.fillStyle = 'rgba(255,243,220,0.8)';
    g.fillText(TEXT.cardMedals, 540, 1086);
    medals.forEach(function (m, i) {
      var x = 340 + i * 200;
      coinAt(g, x - 34, 1140, 30, m[1], m[2]);
      g.fillStyle = '#fff3dc'; g.font = '800 48px "Atkinson Hyperlegible Next", "Segoe UI", sans-serif'; g.textAlign = 'left';
      g.fillText(String(t[m[0]]), x + 8, 1157);
      g.textAlign = 'center';
    });
    // where to play it
    g.fillStyle = '#ffb347';
    g.font = '800 38px "Atkinson Hyperlegible Next", "Segoe UI", sans-serif';
    g.fillText(TEXT.cardUrl, 540, 1240);
    g.fillStyle = 'rgba(255,243,220,0.7)';
    g.font = '600 26px "Atkinson Hyperlegible Next", "Segoe UI", sans-serif';
    g.fillText(TEXT.cardFooter, 540, 1300);
    return c;
  }
  function fontsReady() {
    var f = doc.fonts;
    if (!f || !f.load) return Promise.resolve();
    var all = Promise.all([f.load('800 86px "Atkinson Hyperlegible Next"'), f.load('64px "Press Start 2P"')]).catch(function () {});
    return Promise.race([all, new Promise(function (r) { setTimeout(r, 1500); })]);
  }
  function buildShare() {
    var L = layer('share', 'ch-veil--deep');
    L.setAttribute('aria-label', TEXT.shareTitle);
    var panel = h('div', 'ch-panel ch-share');
    panel.appendChild(h('h2', 'ch-h2', TEXT.shareTitle));
    var wait = h('p', 'ch-sub ch-share__wait', TEXT.shareWait);
    panel.appendChild(wait);
    var img = h('img', 'ch-share__img');
    img.alt = '';
    panel.appendChild(img);
    var acts = h('div', 'ch-actions');
    var dl = h('a', 'ch-btn ch-btn--primary ch-share__dl', TEXT.shareDownload);
    dl.setAttribute('download', TEXT.shareFile);
    dl.href = '#';
    acts.appendChild(dl);
    acts.appendChild(button(TEXT.shareClose, '', closeShare));
    panel.appendChild(acts);
    panel.appendChild(h('p', 'ch-tu__note', TEXT.shareHint));
    L.appendChild(panel);
    S.el.shareImg = img;
    S.el.shareDl = dl;
    S.el.shareWait = wait;
  }
  function openShare(from) {
    sfx('select');
    S.shareFrom = from === 'finale' ? 'finale' : 'clawd';
    go('share');
    var img = S.el.shareImg, dl = S.el.shareDl;
    img.removeAttribute('src');
    img.classList.remove('is-on');
    S.el.shareWait.hidden = false;
    fontsReady().then(function () {
      var c = drawCard();
      var done = function (url) {
        if (S.shareUrl && S.shareUrl.indexOf('blob:') === 0 && global.URL && URL.revokeObjectURL) URL.revokeObjectURL(S.shareUrl);
        S.shareUrl = url;
        img.src = url;
        img.alt = TEXT.shareAlt(look().name);
        dl.href = url;
        img.classList.add('is-on');
        S.el.shareWait.hidden = true;
      };
      if (c.toBlob && global.URL && URL.createObjectURL) c.toBlob(function (b) { done(b ? URL.createObjectURL(b) : c.toDataURL('image/png')); }, 'image/png');
      else done(c.toDataURL('image/png'));
    });
  }
  function closeShare() {
    sfx('back');
    go(S.shareFrom === 'finale' ? 'finale' : 'clawd');
  }

  /* ---------- glossary: actors and papers ---------- */

  function buildGlossary() {
    var L = layer('glossary', 'ch-veil--deep');
    L.setAttribute('aria-label', TEXT.glossary);
    var panel = h('div', 'ch-panel ch-gloss');
    var head = h('div', 'ch-select__head');
    var back = button(TEXT.back, 'ch-btn--quiet ch-btn--small', function () { sfx('back'); closeGlossary(); });
    head.appendChild(back);
    head.appendChild(h('h2', 'ch-h2', TEXT.glossary));
    panel.appendChild(head);
    panel.appendChild(h('p', 'ch-sub ch-gloss__intro', TEXT.glossaryIntro));
    var cols = h('div', 'ch-gloss__cols');
    var a = h('section', 'ch-gloss__sec');
    a.appendChild(h('h3', 'ch-gloss__h', TEXT.glossaryActors));
    var al = h('dl', 'ch-gloss__list');
    TEXT.actors.forEach(function (r) {
      var row = h('div', 'ch-gloss__row');
      row.appendChild(h('dt', null, r[0]));
      row.appendChild(h('dd', null, r[1]));
      al.appendChild(row);
    });
    a.appendChild(al);
    var b = h('section', 'ch-gloss__sec');
    b.appendChild(h('h3', 'ch-gloss__h', TEXT.glossaryPapers));
    var bl = h('dl', 'ch-gloss__list');
    TEXT.papers.forEach(function (r) {
      var row = h('div', 'ch-gloss__row ch-gloss__row--paper');
      var dt = h('dt', null);
      dt.appendChild(paperIcon(r[0]));
      dt.appendChild(h('span', null, TEXT.paperType[r[0]]));
      row.appendChild(dt);
      row.appendChild(h('dd', null, r[1]));
      bl.appendChild(row);
    });
    b.appendChild(bl);
    b.appendChild(h('h3', 'ch-gloss__h ch-gloss__h--game', TEXT.glossaryGame));
    var gl = h('dl', 'ch-gloss__list ch-gloss__list--game');
    TEXT.inGame.forEach(function (r) {
      var row = h('div', 'ch-gloss__row');
      row.appendChild(h('dt', null, r[0]));
      row.appendChild(h('dd', null, r[1]));
      gl.appendChild(row);
    });
    b.appendChild(gl);
    cols.appendChild(a);
    cols.appendChild(b);
    panel.appendChild(cols);
    panel.appendChild(h('p', 'ch-gloss__legal', TEXT.trademark));
    L.appendChild(panel);
    S.el.glossaryBack = back;
  }
  function openGlossary() {
    sfx('select');
    S.glossaryFrom = S.screen === 'paused' ? 'paused' : 'title';
    go('glossary');
  }
  function closeGlossary() {
    go(S.glossaryFrom === 'paused' ? 'paused' : 'title');
  }

  /* ---------- loop indicator ---------- */

  function buildLoop() {
    var box = h('div', 'ch-loop');
    box.setAttribute('role', 'status');
    box.setAttribute('aria-label', TEXT.loopLabel);
    var list = h('ol', 'ch-loop__steps');
    S.el.loopSteps = {};
    LOOP_STEPS.forEach(function (p) {
      var li = h('li', 'ch-loop__step', TEXT.loop[p]);
      list.appendChild(li);
      S.el.loopSteps[p] = li;
    });
    box.appendChild(list);
    var retry = h('span', 'ch-loop__retry', TEXT.loop.reintento);
    box.appendChild(retry);
    S.el.loop = box;
    return box;
  }
  function loop(phase) {
    if (!S.ready) return;
    if (phase != null && !TEXT.loop.hasOwnProperty(phase)) return;
    phase = phase || null;
    // safe to call every frame: a repeated phase is a no-op, and 'actuar' never cuts a retry flash short
    if (phase === S.loop && phase !== 'reintento') return;
    if (phase === 'actuar' && S.loopTimer) return;
    if (S.loopTimer) { clearTimeout(S.loopTimer); S.loopTimer = null; }
    if (phase === 'reintento') {
      setLoop('reintento');
      S.loopTimer = setTimeout(function () { S.loopTimer = null; setLoop('actuar'); }, RETRY_FLASH * 1000);
      return;
    }
    setLoop(phase || null);
  }
  function setLoop(phase) {
    var box = S.el.loop;
    var prev = S.loop;
    if (phase === prev && phase !== 'reintento') return;
    S.loop = phase;
    box.classList.toggle('is-on', !!phase);
    box.classList.toggle('is-retry', phase === 'reintento');
    if (phase === 'reintento') {
      // restart the flash even when two retries come back to back
      box.classList.remove('is-flash');
      void box.offsetWidth;
      box.classList.add('is-flash');
    }
    for (var i = 0; i < LOOP_STEPS.length; i++) {
      var p = LOOP_STEPS[i];
      var on = p === phase;
      var li = S.el.loopSteps[p];
      if (li.classList.contains('is-current') !== on) {
        li.classList.toggle('is-current', on);
        if (on) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      }
    }
  }

  function buildPaused() {
    var L = layer('paused', 'ch-veil--deep');
    L.setAttribute('aria-label', TEXT.paused);
    var panel = h('div', 'ch-panel');
    panel.appendChild(h('h2', 'ch-h2', TEXT.paused));
    var sub = h('p', 'ch-sub', '');
    S.el.pausedSub = sub;
    panel.appendChild(sub);
    var acts = h('div', 'ch-actions ch-actions--stack');
    var resume = button(TEXT.resume, 'ch-btn--primary', resumeAction);
    acts.appendChild(resume);
    acts.appendChild(button(TEXT.restartTask, '', function () { sfx('start'); startStage(S.stageIndex, 'retry'); }));
    acts.appendChild(button(TEXT.selectTask, '', quitAction));
    acts.appendChild(button(TEXT.glossary, 'ch-btn--quiet', openGlossary));
    var seeMission = button(TEXT.pauseMission, 'ch-btn--quiet ch-pause-mission', function () {
      sfx('select');
      var box = S.el.pausedMission, open = box.classList.toggle('is-on');
      seeMission.setAttribute('aria-expanded', open ? 'true' : 'false');
      clear(box);
      if (open) missionContent(box, S.stageIndex);
    });
    seeMission.setAttribute('aria-expanded', 'false');
    acts.appendChild(seeMission);
    panel.appendChild(acts);
    var pm = h('div', 'ch-paused__mission');
    panel.appendChild(pm);
    S.el.pausedMission = pm;
    S.el.pauseMissionBtn = seeMission;

    var toggles = h('div', 'ch-toggles');
    var sound = toggle(TEXT.sound, function (on) { S.muted = !on; call('mute', S.muted); });
    var amb = toggle(TEXT.ambient, function (on) { S.ambient = on; call('ambient', S.ambient); });
    toggles.appendChild(sound);
    toggles.appendChild(amb);
    panel.appendChild(toggles);
    L.appendChild(panel);
    S.el.resume = resume;
    S.el.soundToggle = sound;
    S.el.ambientToggle = amb;
  }
  function toggle(label, onChange) {
    var b = button('', 'ch-btn--quiet ch-btn--small ch-toggle');
    b.appendChild(h('span', null, label));
    b.appendChild(h('span', 'ch-toggle__state', TEXT.on));
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      setToggle(b, on);
      sfx('select');
      onChange(on);
    });
    return b;
  }
  function setToggle(b, on) {
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.lastChild.textContent = on ? TEXT.on : TEXT.off;
  }

  function buildComplete() {
    var L = layer('complete');
    L.setAttribute('aria-label', TEXT.taskDone(''));
    var panel = h('div', 'ch-panel');
    S.el.completePanel = panel;
    L.appendChild(panel);
  }

  function renderComplete(data) {
    var i = clampIndex(data && data.stageIndex != null ? data.stageIndex : S.stageIndex);
    S.stageIndex = i;
    var st = stage(i);
    var time = Number(data && data.time);
    if (!isFinite(time) || time < 0) time = 0;
    var falls = Math.max(0, Math.floor(Number(data && data.falls) || 0));
    var res = resultFor(i, time, falls);
    var last = i >= S.stages.length - 1;

    var panel = S.el.completePanel;
    clear(panel);
    panel.classList.remove('is-revealed');
    panel.appendChild(h('p', 'ch-result__stage', TEXT.taskDone(i + 1)));
    panel.appendChild(h('h2', 'ch-h2', st.name));

    var rows = h('dl', 'ch-result__rows');
    var r1 = h('div', 'ch-result__row');
    r1.style.setProperty('--i', 0);
    r1.appendChild(h('dt', null, TEXT.time));
    var dd1 = h('dd', null, fmtTime(time));
    if (st.par > 0) dd1.appendChild(h('span', 'ch-result__par', TEXT.target + ' ' + fmtTime(st.par)));
    r1.appendChild(dd1);
    var r2 = h('div', 'ch-result__row');
    r2.style.setProperty('--i', 1);
    r2.appendChild(h('dt', null, TEXT.retries));
    r2.appendChild(h('dd', null, String(falls)));
    rows.appendChild(r1);
    rows.appendChild(r2);
    if (!res.isNewBest && res.best != null) {
      var r3 = h('div', 'ch-result__row');
      r3.style.setProperty('--i', 2);
      r3.appendChild(h('dt', null, TEXT.best));
      r3.appendChild(h('dd', null, fmtTime(res.best)));
      rows.appendChild(r3);
    }
    panel.appendChild(rows);
    var happened = renderHappened(st.story);
    if (happened) panel.appendChild(happened);
    var receipt = renderReceipt(data && data.receipt);
    if (receipt) panel.appendChild(receipt);

    var medalRow = h('div', 'ch-result__medal');
    var slot = h('div', 'ch-medal-slot');
    slot.appendChild(coin(res.medal));
    medalRow.appendChild(slot);
    var mt = h('div', 'ch-medal-text');
    mt.appendChild(h('span', 'ch-medal-name', TEXT.medalLong[res.medal]));
    mt.appendChild(h('span', 'ch-newbest' + (res.isNewBest ? ' is-on' : ''), TEXT.newBest));
    medalRow.appendChild(mt);
    panel.appendChild(medalRow);

    var live = h('p', 'ch-sr', '');
    attr(live, { 'aria-live': 'polite' });
    panel.appendChild(live);

    var acts = h('div', 'ch-actions');
    var next = button(last ? TEXT.finish : TEXT.nextTask, 'ch-btn--primary', function () {
      sfx(last ? 'select' : 'start');
      if (last) {
        clearTimers();
        call('next');
        if (S.screen === 'complete') go('finale');
      } else {
        startStage(i + 1, 'next');
      }
    });
    acts.appendChild(next);
    acts.appendChild(button(TEXT.retry, '', function () { sfx('start'); startStage(i, 'retry'); }));
    acts.appendChild(button(TEXT.selectTask, '', quitAction));
    panel.appendChild(acts);

    var reveal = function () {
      panel.classList.add('is-revealed');
      sfx('medal-' + res.medal);
      live.textContent = TEXT.medalLong[res.medal] + (res.isNewBest ? '. ' + TEXT.newBest + '.' : '.');
      if (res.unlocked >= 0) later(function () { sfx('unlock'); }, 0.7);
    };
    if (reducedMotion()) reveal(); else later(reveal, REVEAL_DELAY);
    return next;
  }
  // What happened in the story, and which agent idea it was: two lines next to the receipt.
  function renderHappened(story) {
    if (!story || !story.done) return null;
    var box = h('div', 'ch-happened');
    box.style.setProperty('--i', 2);
    box.appendChild(h('p', 'ch-receipt__title', TEXT.whatHappened));
    box.appendChild(h('p', 'ch-happened__done', story.done));
    if (story.concept) box.appendChild(h('p', 'ch-happened__concept', story.concept));
    return box;
  }
  // The per-task receipt: counts from ChispaCore.transcriptReceipt, never money or tokens.
  function renderReceipt(r) {
    if (!r || typeof r !== 'object') return null;
    var num = function (v) { v = Math.floor(Number(v)); return isFinite(v) && v >= 0 ? v : 0; };
    var box = h('div', 'ch-receipt');
    box.style.setProperty('--i', 3);
    box.appendChild(h('p', 'ch-receipt__title', TEXT.receipt));
    var ul = h('ul', 'ch-receipt__nums');
    [[r.papers, TEXT.receiptPapers], [r.toolCalls, TEXT.receiptCalls], [r.reads, TEXT.receiptReads]].forEach(function (x) {
      var li = h('li');
      li.appendChild(h('b', null, String(num(x[0]))));
      li.appendChild(doc.createTextNode(' ' + x[1]));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    if (num(r.hookNo) > 0) box.appendChild(h('p', 'ch-receipt__note ch-receipt__note--hook', TEXT.receiptHook(num(r.hookNo))));
    if (num(r.subagents) > 0) box.appendChild(h('p', 'ch-receipt__note ch-receipt__note--sub', TEXT.receiptSub(num(r.subagents), num(r.withoutSubagents))));
    return box;
  }
  // show('complete') never records. It reads what record() returned, or rebuilds it from storage.
  function resultFor(i, time, falls) {
    var lr = S.lastRecord;
    if (lr && lr.stageIndex === i && Math.abs(lr.time - time) < 1e-6) {
      return { medal: lr.result.medal, best: lr.result.best, isNewBest: lr.result.isNewBest, unlocked: lr.unlocked };
    }
    var slot = S.save[i] || {};
    var best = slot.best != null ? slot.best : null;
    return {
      medal: medalFor(time, stage(i).par),
      best: best,
      isNewBest: best != null && Math.abs(best - time) < 1e-6,
      unlocked: -1
    };
  }

  function buildFinale() {
    var L = layer('finale', 'ch-veil');
    L.setAttribute('aria-label', TEXT.finaleTitle);
    var panel = h('div', 'ch-panel');
    S.el.finalePanel = panel;
    L.appendChild(panel);
  }
  function renderFinale() {
    var panel = S.el.finalePanel;
    clear(panel);
    var mark = h('div', 'ch-finale__mark');
    mark.setAttribute('aria-hidden', 'true');
    mark.appendChild(clawdIcon('ch-clawd ch-clawd--finale'));
    var steps = h('span', 'ch-finale__steps');
    for (var i = 0; i < 10; i++) {
      var s = h('i');
      s.style.setProperty('--i', i);
      steps.appendChild(s);
    }
    mark.appendChild(steps);
    panel.appendChild(mark);
    panel.appendChild(h('h2', 'ch-h2', TEXT.finaleTitle));
    var end = global.ChispaCore && global.ChispaCore.STORY_END;
    panel.appendChild(h('p', 'ch-sub ch-finale__story', end || TEXT.finaleBody));
    var t = tally();
    var list = h('ul', 'ch-finale__tally');
    MEDALS.slice().reverse().forEach(function (m) {
      var li = h('li');
      li.appendChild(coin(m));
      li.appendChild(h('b', null, String(t[m])));
      li.appendChild(doc.createTextNode(TEXT.medal[m]));
      list.appendChild(li);
    });
    panel.appendChild(list);
    if (t.all) panel.appendChild(h('p', 'ch-finale__total', TEXT.bestSum + ' ' + fmtTime(t.total)));
    var acts = h('div', 'ch-actions');
    var sel = button(TEXT.selectTask, 'ch-btn--primary', quitAction);
    acts.appendChild(sel);
    acts.appendChild(button(TEXT.toTitle, '', function () { sfx('back'); go('title'); }));
    acts.appendChild(button(TEXT.shareFinale, 'ch-btn--quiet ch-share-open', function () { openShare('finale'); }));
    panel.appendChild(acts);
    return sel;
  }

  /* ---------- touch controls ---------- */

  function buildTouch() {
    var L = layer('touch', 'ch-layer--touch');
    L.setAttribute('aria-hidden', 'true');
    var zone = h('div', 'ch-stick-zone');
    var base = h('div', 'ch-stick');
    var knob = h('div', 'ch-stick__knob');
    base.appendChild(knob);
    zone.appendChild(base);
    L.appendChild(zone);
    var pad = h('div', 'ch-pad');
    var sprint = h('button', 'ch-pad__btn ch-pad__sprint', TEXT.sprintBtn);
    var jump = h('button', 'ch-pad__btn ch-pad__jump', TEXT.jumpBtn);
    sprint.type = jump.type = 'button';
    sprint.tabIndex = jump.tabIndex = -1;
    pad.appendChild(sprint);
    pad.appendChild(jump);
    L.appendChild(pad);
    S.el.zone = zone;
    S.el.stick = base;
    S.el.knob = knob;
    S.el.pad = pad;
    holdButton(jump, 'jump');
    holdButton(sprint, 'sprint');

    zone.addEventListener('pointerdown', stickDown);
    zone.addEventListener('pointermove', stickMove);
    zone.addEventListener('pointerup', stickUp);
    zone.addEventListener('pointercancel', stickUp);
    zone.addEventListener('lostpointercapture', stickUp);
    L.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function stickRadius() { return 52; }
  function stickRest() {
    var zone = S.el.zone;
    var w = zone.clientWidth, hgt = zone.clientHeight;
    return { x: Math.min(w / 2, 98), y: Math.max(hgt / 2, hgt - 108) };
  }
  function placeStick(x, y) {
    S.stick.cx = x; S.stick.cy = y;
    S.el.stick.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }
  function setKnob(dx, dy) { S.el.knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
  function stickDown(e) {
    if (S.stick.id !== null || S.screen !== 'playing') return;
    e.preventDefault();
    S.stick.id = e.pointerId;
    try { S.el.zone.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
    var r = S.el.zone.getBoundingClientRect();
    var x = Math.max(68, Math.min(r.width - 68, e.clientX - r.left));
    var y = Math.max(68, Math.min(r.height - 68, e.clientY - r.top));
    S.stick.ox = r.left; S.stick.oy = r.top;
    placeStick(x, y);
    S.el.stick.classList.add('is-active');
    stickMove(e);
  }
  function stickMove(e) {
    if (e.pointerId !== S.stick.id) return;
    var R = stickRadius();
    var dx = e.clientX - S.stick.ox - S.stick.cx;
    var dy = e.clientY - S.stick.oy - S.stick.cy;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > R) { dx = dx / len * R; dy = dy / len * R; len = R; }
    setKnob(dx, dy);
    var mag = len / R;
    if (mag < 0.12) { S.stick.x = 0; S.stick.z = 0; return; }
    var k = (mag - 0.12) / 0.88 / mag; // rescale past the dead zone so small pushes still walk
    S.stick.x = clampUnit(dx / R * k);
    S.stick.z = clampUnit(dy / R * k);
  }
  function stickUp(e) {
    if (e && e.pointerId !== S.stick.id) return;
    S.stick.id = null;
    S.stick.x = 0; S.stick.z = 0;
    if (S.el.stick) {
      S.el.stick.classList.remove('is-active');
      setKnob(0, 0);
      var rest = stickRest();
      placeStick(rest.x, rest.y);
    }
  }
  function clampUnit(v) { return v > 1 ? 1 : v < -1 ? -1 : v; }
  function holdButton(btn, key) {
    var id = null;
    function down(e) {
      if (id !== null) return;
      e.preventDefault();
      id = e.pointerId;
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      S.held[key] = true;
      btn.classList.add('is-held');
    }
    function up(e) {
      if (e.pointerId !== id) return;
      id = null;
      S.held[key] = false;
      btn.classList.remove('is-held');
    }
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    btn._chRelease = function () { id = null; S.held[key] = false; btn.classList.remove('is-held'); };
  }
  function releaseTouch() {
    stickUp(null);
    S.held.jump = S.held.sprint = false;
    var btns = S.root ? S.root.querySelectorAll('.ch-pad__btn') : [];
    for (var i = 0; i < btns.length; i++) if (btns[i]._chRelease) btns[i]._chRelease();
  }
  function setTouch(on) {
    if (S.touch === on) return;
    S.touch = on;
    S.root.classList.toggle('ch-is-touch', on);
    syncTouchLayer();
    if (S.prompt) { var keep = S.prompt; S.prompt = null; prompt(keep); }
  }
  function syncTouchLayer() {
    var on = S.touch && S.screen === 'playing';
    setLayer(S.el.touch, on);
    if (on) { var rest = stickRest(); placeStick(rest.x, rest.y); } else releaseTouch();
  }
  function detectTouch() {
    var mm = global.matchMedia;
    var coarse = !!(mm && mm('(pointer: coarse)').matches);
    var noHover = !!(mm && mm('(hover: none)').matches);
    var points = (global.navigator && global.navigator.maxTouchPoints) || 0;
    if (coarse || (points > 0 && noHover)) setTouch(true);
    // hybrid devices: switch the controls on with the first real touch
    global.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') setTouch(true); }, true);
  }

  /* ---------- HUD ---------- */

  function resetHud(i) {
    var H = S.hud;
    H.tenths = H.falls = H.awake = H.total = H.p = H.secs = -1;
    H.fadingOn = H.urgent = false;
    H.idle = null;
    var st = stage(i);
    var C = global.ChispaCore && global.ChispaCore.C;
    H.fadeMax = st.fade > 0 ? st.fade : (C && C.fadeT > 0 ? C.fadeT : 6);
    S.el.hudToken.textContent = String(i + 1);
    S.el.hudName.textContent = st.name;
    S.el.ring.classList.remove('is-on', 'is-urgent');
    var total = 0;
    if (st.keys && st.keys.length) total = st.keys.length;
    hud({ time: 0, falls: 0, awake: 0, total: total, fading: null });
  }
  function buildBars(total) {
    var keys = S.el.keys;
    clear(keys);
    S.el.keyBars = [];
    for (var i = 0; i < total; i++) {
      var b = h('span', 'ch-keybar');
      keys.appendChild(b);
      S.el.keyBars.push(b);
    }
  }
  function hud(d) {
    if (!S.ready || !d) return;
    var H = S.hud, el = S.el;
    var tenths = Math.floor(Math.max(0, Number(d.time) || 0) * 10 + 1e-6);
    if (tenths !== H.tenths) {
      H.tenths = tenths;
      el.time.textContent = fmtTenths(tenths);
      var idle = tenths === 0;
      if (idle !== H.idle) { H.idle = idle; el.clock.classList.toggle('is-idle', idle); }
    }
    var falls = Math.max(0, Math.floor(Number(d.falls) || 0));
    if (falls !== H.falls) { H.falls = falls; el.falls.textContent = TEXT.retries + ' ' + falls; }

    var total = Math.max(0, Math.floor(Number(d.total) || 0));
    var awake = Math.max(0, Math.min(total, Math.floor(Number(d.awake) || 0)));
    if (total !== H.total) { H.total = total; buildBars(total); H.awake = 0; }
    if (awake !== H.awake) {
      var lo = Math.min(awake, H.awake < 0 ? 0 : H.awake), hi = Math.max(awake, H.awake);
      for (var i = lo; i < hi; i++) if (el.keyBars[i]) el.keyBars[i].classList.toggle('is-on', i < awake);
      H.awake = awake;
      el.keysText.textContent = TEXT.stepsDone(awake, total);
    }

    var f = d.fading;
    var on = f != null && isFinite(f);
    if (on !== H.fadingOn) { H.fadingOn = on; el.ring.classList.toggle('is-on', on); }
    if (on) {
      var p = Math.round(Math.max(0, Math.min(1, f / H.fadeMax)) * 100);
      if (p !== H.p) { H.p = p; el.ring.style.setProperty('--p', p / 100); }
      var secs = Math.max(0, Math.ceil(f));
      if (secs !== H.secs) { H.secs = secs; el.ringNum.textContent = String(secs); }
      var urgent = f <= URGENT_SECONDS;
      if (urgent !== H.urgent) { H.urgent = urgent; el.ring.classList.toggle('is-urgent', urgent); }
    } else if (H.urgent) {
      H.urgent = false;
      el.ring.classList.remove('is-urgent');
    }
  }
  function showCaption(text, seconds, isTip) {
    var slot = S.el.captionSlot;
    clear(slot);
    if (!text) return;
    var c = h('p', 'ch-caption' + (isTip ? ' ch-caption--tip' : ''), String(text));
    var words = String(text).split(/\s+/).length;
    var secs = seconds > 0 ? seconds : Math.max(4, Math.min(8, 2.5 + words * 0.28));
    c.style.setProperty('--d', secs + 's');
    c.addEventListener('animationend', function () { if (c.parentNode) c.parentNode.removeChild(c); });
    slot.appendChild(c);
  }

  /* ---------- control prompts and tips ---------- */

  function cap(text, wide, delay, held) {
    var c = h('span', 'ch-cap' + (wide ? ' ch-cap--wide' : '') + (held ? ' is-held' : '') + (delay != null ? ' is-cycling' : ''), text);
    if (delay != null) c.style.setProperty('--d', delay + 's');
    return c;
  }
  function cross(up, left, down, right) {
    // a key cluster drawn like the keyboard: one key on top, three below, pressed in turn
    var g = h('span', 'ch-cross');
    g.appendChild(h('span'));
    g.appendChild(cap(up, false, 0));
    g.appendChild(h('span'));
    g.appendChild(cap(left, false, 0.9));
    g.appendChild(cap(down, false, 0.6));
    g.appendChild(cap(right, false, 0.3));
    return g;
  }
  function miniStick(knobClass) {
    var st = h('span', 'ch-mini-stick');
    st.appendChild(h('span', 'ch-mini-stick__knob' + (knobClass ? ' ' + knobClass : '')));
    return st;
  }
  function pushScene() {
    var sc = h('span', 'ch-scene');
    sc.appendChild(clawdIcon('ch-clawd ch-scene__clawd'));
    sc.appendChild(h('span', 'ch-scene__crate'));
    return sc;
  }
  function hopper() {
    var w = h('span', 'ch-hopper');
    w.appendChild(clawdIcon('ch-clawd'));
    return w;
  }
  function plus() { return h('span', 'ch-plus', '+'); }
  function promptPicture(name, touch) {
    var pic = h('span', 'ch-prompt__pic');
    pic.setAttribute('aria-hidden', 'true');
    var add = function (n) { pic.appendChild(n); };
    var stack;
    if (name === 'push') { add(pushScene()); return pic; }
    if (!touch) {
      if (name === 'move') { add(cross('W', 'A', 'S', 'D')); add(h('span', 'ch-or', '/')); add(cross('↑', '←', '↓', '→')); }
      else if (name === 'jump') { stack = h('span', 'ch-stack'); stack.appendChild(hopper()); stack.appendChild(cap(TEXT.keySpace, true, 0)); add(stack); }
      else if (name === 'sprint') { add(cap('Shift', true, null, true)); add(plus()); add(cap('W', false, 0)); add(h('span', 'ch-dash')); }
      else if (name === 'restart') add(cap('R', false, 0));
      else if (name === 'skip') add(cap(TEXT.keyAny, true, 0));
    } else {
      if (name === 'move') add(miniStick('is-orbit'));
      else if (name === 'jump') { stack = h('span', 'ch-stack'); stack.appendChild(hopper()); stack.appendChild(h('span', 'ch-mini-btn ch-mini-btn--jump is-tap')); add(stack); }
      else if (name === 'sprint') { add(miniStick('is-forward')); add(plus()); add(h('span', 'ch-mini-btn ch-mini-btn--sprint is-held')); add(h('span', 'ch-dash')); }
      else if (name === 'restart') add(h('span', 'ch-mini-btn ch-mini-btn--pause is-tap'));
      else if (name === 'skip') add(h('span', 'ch-finger is-tap'));
    }
    return pic;
  }
  var CUES = ['move', 'jump', 'sprint', 'restart'];
  function renderPrompt() {
    var slot = S.el.promptSlot;
    var old = slot.firstChild;
    while (old) {
      var leaving = old;
      old = old.nextSibling;
      if (leaving.classList.contains('is-leaving')) continue;
      leaving.classList.add('is-leaving');
      (function (n) {
        var done = function () { if (n.parentNode) n.parentNode.removeChild(n); };
        n.addEventListener('animationend', done);
        setTimeout(done, 400);
      })(leaving);
    }
    for (var i = 0; i < CUES.length; i++) S.root.classList.remove('ch-cue-' + CUES[i]);
    var name = S.prompt;
    if (!name) return;
    if (S.touch && CUES.indexOf(name) >= 0) S.root.classList.add('ch-cue-' + name);
    var card = h('div', 'ch-prompt ch-prompt--' + name);
    card.appendChild(promptPicture(name, S.touch));
    card.appendChild(h('span', 'ch-prompt__label', TEXT.prompt[name]));
    slot.appendChild(card);
  }
  function prompt(name) {
    if (!S.ready) return;
    if (name != null && !TEXT.prompt.hasOwnProperty(name)) name = null;
    if (name === S.prompt) return;
    S.prompt = name;
    renderPrompt();
  }
  function tip(text, seconds) {
    if (!S.ready) return;
    var secs = Number(seconds);
    showCaption(text ? String(text) : '', secs > 0 ? secs : TIP_SECONDS, true);
  }

  /* ---------- navigation ---------- */

  function setLayer(n, on) {
    if (!n) return;
    n.classList.toggle('is-on', on);
    n.setAttribute('aria-hidden', on ? 'false' : 'true');
    n.inert = !on;
  }
  function focusEl(n) {
    if (!n) return;
    n.focus(); // let the browser scroll a focused tile into view inside a scrolling panel
  }
  function blurInside() {
    var a = doc.activeElement;
    if (a && S.root.contains(a) && a.blur) a.blur();
  }
  function startStage(i, cb) {
    clearTimers();
    var before = S.screen;
    S.fresh = true; // the next show('playing') starts the stage over, even from 'paused'
    if (cb === 'play') call('play', i);
    else if (cb === 'retry') call('retry');
    else if (cb === 'next') call('next');
    // the main session may navigate inside the callback; only fill in when it did not
    if (S.screen === before) show('playing', { stageIndex: i });
    S.fresh = false;
  }
  function resumeAction() {
    sfx('resume');
    call('resume');
    if (S.screen === 'paused') show('playing', { stageIndex: S.stageIndex });
  }
  function quitAction() {
    sfx('back');
    clearTimers();
    call('quit');
    if (S.screen !== 'select') go('select');
  }
  function go(name, data) { show(name, data); }

  function show(name, data) {
    if (!S.ready) return;
    if (SCREENS.indexOf(name) < 0) return;
    data = data || {};
    var prev = S.screen;
    var prevStage = S.stageIndex;
    clearTimers();
    S.covers = null;
    S.screen = name;

    if (name === 'playing') {
      var i = data.stageIndex != null ? clampIndex(data.stageIndex) : prevStage;
      var fresh = S.fresh;
      S.fresh = false;
      var resuming = prev === 'paused' && i === prevStage && !fresh;
      var same = prev === 'playing' && i === prevStage && !fresh;
      S.stageIndex = i;
      S.ctxPlaced = false;
      if (!resuming && !same) {
        resetHud(i);
        showCaption(stage(i).hint);
      }
    } else if (name === 'paused') {
      if (data.stageIndex != null) S.stageIndex = clampIndex(data.stageIndex);
      if (typeof data.muted === 'boolean') S.muted = data.muted;
      if (typeof data.ambient === 'boolean') S.ambient = data.ambient;
      S.el.pausedSub.textContent = taskLabel(S.stageIndex) + ', ' + stage(S.stageIndex).name;
      if (prev !== 'glossary') { S.el.pausedMission.classList.remove('is-on'); clear(S.el.pausedMission); S.el.pauseMissionBtn.setAttribute('aria-expanded', 'false'); }
      setToggle(S.el.soundToggle, !S.muted);
      setToggle(S.el.ambientToggle, S.ambient);
    }

    var hudOn = name === 'playing' || name === 'paused' || (name === 'glossary' && S.glossaryFrom === 'paused');
    if (name !== 'playing' && S.anchor) anchor(null);
    if (name !== 'playing' && name !== 'paused' && !(name === 'glossary' && S.glossaryFrom === 'paused') && S.missionOn) { S.missionOn = false; S.el.mission.classList.remove('is-on'); }
    setLayer(S.el.title, name === 'title');
    setLayer(S.el.select, name === 'select');
    setLayer(S.el.hud, hudOn);
    setLayer(S.el.paused, name === 'paused');
    setLayer(S.el.complete, name === 'complete');
    setLayer(S.el.finale, name === 'finale');
    setLayer(S.el.glossary, name === 'glossary');
    setLayer(S.el.clawd, name === 'clawd');
    setLayer(S.el.share, name === 'share');
    if (!hudOn) {
      clear(S.el.captionSlot);
      if (name !== 'complete') { prompt(null); loop(null); } // a menu ends the stage
    }
    syncTouchLayer();
    S.root.setAttribute('data-ch-screen', name);

    var target = null;
    if (name === 'title') target = S.el.titlePlay;
    else if (name === 'select') target = renderSelect();
    else if (name === 'paused') target = S.el.resume;
    else if (name === 'glossary') target = S.el.glossaryBack;
    else if (name === 'clawd') { renderTuState(); target = S.el.tuDone; }
    else if (name === 'share') target = S.el.shareDl;
    else if (name === 'complete') target = renderComplete(data);
    else if (name === 'finale') { target = renderFinale(); if (prev !== 'finale' && prev !== 'share') sfx('finale'); }

    if (name === 'playing') blurInside();
    else focusEl(target);
  }

  /* ---------- keyboard for menus ---------- */

  function focusables() {
    var L = S.el[S.screen];
    if (!L) return [];
    var list = L.querySelectorAll('button:not([disabled]):not([tabindex="-1"])');
    var out = [];
    for (var i = 0; i < list.length; i++) if (list[i].offsetParent !== null) out.push(list[i]);
    return out;
  }
  function moveFocus(dir) {
    var items = focusables();
    if (!items.length) return;
    var cur = doc.activeElement;
    if (items.indexOf(cur) < 0) { focusEl(items[0]); return; }
    var a = cur.getBoundingClientRect();
    var ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    var best = null, bestScore = Infinity;
    for (var i = 0; i < items.length; i++) {
      var n = items[i];
      if (n === cur) continue;
      var b = n.getBoundingClientRect();
      var dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
      var main, side;
      if (dir === 'left') { main = -dx; side = dy; }
      else if (dir === 'right') { main = dx; side = dy; }
      else if (dir === 'up') { main = -dy; side = dx; }
      else { main = dy; side = dx; }
      if (main <= 2) continue;
      var score = main + Math.abs(side) * 2.2;
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (!best) {
      // vertical lists wrap at their ends so a short menu never feels stuck
      var idx = items.indexOf(cur);
      if (dir === 'down' && idx === items.length - 1) best = items[0];
      if (dir === 'up' && idx === 0) best = items[items.length - 1];
    }
    if (best) { focusEl(best); sfx('move'); }
  }
  function onKey(e) {
    if (!S.ready || S.screen === 'playing' || e.defaultPrevented) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key;
    // typing a name: the field owns its keys, only Esc leaves the screen
    var typing = e.target && e.target.tagName === 'INPUT';
    if (typing && k !== 'Escape' && k !== 'Esc') return;
    var dir = k === 'ArrowUp' ? 'up' : k === 'ArrowDown' ? 'down' : k === 'ArrowLeft' ? 'left' : k === 'ArrowRight' ? 'right' : null;
    if (dir) { e.preventDefault(); moveFocus(dir); return; }
    if (k === 'Escape' || k === 'Esc') {
      e.preventDefault();
      // menus own Esc: keep the game's own handler from pausing again on the same press
      e.stopImmediatePropagation();
      if (S.screen === 'glossary') { sfx('back'); closeGlossary(); }
      else if (S.screen === 'share') closeShare();
      else if (S.screen === 'clawd') { sfx('back'); go('title'); }
      else if (S.screen === 'paused') resumeAction();
      else if (S.screen === 'select') { sfx('back'); go('title'); }
      else if (S.screen === 'complete' || S.screen === 'finale') quitAction();
      return;
    }
    if ((k === 'Enter' || k === ' ') && !S.root.contains(doc.activeElement)) {
      // focus left the menu (a click on the canvas): bring it back instead of doing nothing
      e.preventDefault();
      var items = focusables();
      if (items.length) focusEl(items[0]);
    }
  }

  /* ---------- public API ---------- */

  function init(opts) {
    opts = opts || {};
    if (S.ready) return;
    var root = opts.root;
    if (!root || !root.appendChild) {
      if (global.console) console.error('[ChispaUI] init needs a root element');
      return;
    }
    S.root = root;
    S.stages = opts.stages && opts.stages.length ? opts.stages
      : (global.ChispaCore && global.ChispaCore.STAGES) || [];
    S.on = opts.on || {};
    S.sfx = typeof opts.sfx === 'function' ? opts.sfx : noop;
    S.save = loadSave();
    S.look = loadLook();
    root.classList.add('ch-ui');
    root.setAttribute('lang', TEXT.lang);
    clear(root);
    buildTitle();
    buildSelect();
    // the touch layer goes under the HUD: HUD buttons (pause, Misión) stay tappable, while the
    // HUD layer itself takes no events, so a touch on the panel still reaches the stick
    buildTouch();
    buildHud();
    buildPaused();
    buildComplete();
    buildFinale();
    buildGlossary();
    buildClawd();
    buildShare();
    buildAnchor();
    S.ready = true;
    detectTouch();
    global.addEventListener('keydown', onKey, true);
    global.addEventListener('blur', releaseTouch);
    global.addEventListener('resize', function () { S.ctxPlaced = false; S.covers = null; });
    S.screen = '';
    show('title');
  }

  function input() {
    if (!S.ready || !S.touch || S.screen !== 'playing') return { x: 0, z: 0, jump: false, sprint: false };
    return { x: S.stick.x, z: S.stick.z, jump: S.held.jump, sprint: S.held.sprint };
  }

  global.ChispaUI = {
    init: init,
    show: show,
    hud: hud,
    input: input,
    record: record,
    progress: progress,
    prompt: prompt,
    tip: tip,
    loop: loop,
    context: context,
    anchor: anchor,
    mission: mission,
    covers: covers,
    missionShown: function () { return !!S.missionOn; },
    missionReopened: function () { return !!(S.missionOn && S.missionReopen); },
    fly: fly,
    look: look,
    screen: function () { return S.screen; }
  };
})(typeof window !== 'undefined' ? window : this);
