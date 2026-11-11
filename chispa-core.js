/* CHISPA core: constants, stage data, and the fixed-step simulation.
   Pure JavaScript with no DOM or Three.js access, so it also runs headless in Node. */
(function (root) {
  'use strict';

  var C = {
    dt: 1 / 120,
    r: 0.35,
    walk: 5.2,
    sprint: 8.6,
    accGround: 60,
    decGround: 70,
    accAir: 24,
    gUp: 30,
    gDown: 46,
    jumpV: 10.8,
    jumpCut: 0.5,
    coyote: 0.1,
    buffer: 0.13,
    maxFall: 28,
    respawnT: 0.42,
    crateHalf: 0.5,
    crateG: 40,
    push: 3.2,
    fadeT: 6,
    chordT: 3,
    solidThick: 1.2,
    keyThick: 0.45,
    crackThick: 0.35
  };

  // Major pentatonic over two octaves, in semitones above the stage root.
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

  /* Stage format (all plain data):
     spawn:  [x, z, top]
     solids: [x0, x1, z0, z1, top, thick?]
     keys:   [x0, x1, z0, z1, top, type?, group?]   type: 'n' normal, 'f' fading, 'c' chord
     cracks: [x0, x1, z0, z1, top, thick?]
     crates: [x, z, bottom]
     teach:  [{ at: [x, z], r, prompt?, tip? }]  render-only teaching spots (control prompts, tips after deaths)
     chapter: model tier the stage belongs to (Haiku, Sonnet, Opus)
     story:   attached from STORY below (the narrative of the task)
     Forward is -z. The camera sits on the +z side. */
  var STAGES = [
    {
      name: 'Primer prompt', chapter: 'Haiku',
      hint: 'Camina sobre cada paso para completarlo.',
      root: 60, par: 5.5,
      spawn: [0, 1, 0],
      // Rails keep a first-time player on the path; jumping over one is a choice.
      solids: [[-2, 2, 3, -3, 0], [-2, 2, -5, -9, 0], [-2, 2, -11, -14, 0], [2, 6, -11, -14, 0], [6, 7.5, -11, -14, 1, 2.2],
        [-2.3, -2, 3.3, -7, 2.4, 3.6], [2, 2.3, 3.3, -7, 2.4, 3.6], [-2, 2, 3.3, 3, 2.4, 3.6],
        [-2.3, -2, -7, -14.3, 0.6, 1.8], [2, 2.3, -7, -11, 0.6, 1.8],
        [-2, 6, -14, -14.3, 0.6, 1.8], [2.3, 6, -10.7, -11, 0.6, 1.8], [6, 10.3, -14, -14.3, 1.6, 2.8], [6, 10.3, -10.7, -11, 1.6, 2.8], [10, 10.3, -11, -14, 1.6, 2.8]],
      keys: [[-2, 2, -3, -5, 0], [-2, 2, -9, -11, 0], [7.5, 10, -11, -14, 1]],
      cracks: [], crates: [],
      teach: [{ at: [4.6, -12.5], r: 1.6, prompt: 'jump', tip: 'Salta para subir al escalón.' }]
    },
    {
      name: 'Paso a paso', chapter: 'Haiku',
      hint: 'Salta de paso en paso. Mantén el salto para llegar más lejos.',
      root: 62, par: 5.5,
      spawn: [0, 1, 0],
      // The first gap has a floor (a pit you can climb out of): the first jump is learned safely.
      solids: [[-2.5, 2.5, 2.5, -2, 0], [-2.8, -2.5, 2.8, -4.4, 2.4, 3.6], [2.5, 2.8, 2.8, -4.4, 2.4, 3.6], [-2.5, 2.5, 2.8, 2.5, 2.4, 3.6],
        [-2.5, 2.5, -4.4, -5.4, -0.8, 0.6], [-2.8, -2.5, -4.4, -5.4, 0.6, 2], [2.5, 2.8, -4.4, -5.4, 0.6, 2],
        [-2.5, 2.5, -22.4, -25.5, 1.5]],
      keys: [[-2.5, 2.5, -2, -4.4, 0], [-2.5, 2.5, -5.4, -7.8, 0.3], [-2, 2, -8.8, -11.2, 0.6], [-2, 2, -12.2, -14.6, 0.9], [-2, 2, -15.6, -18, 1.2], [-2, 2, -19, -21.4, 1.5]],
      cracks: [], crates: [],
      teach: [{ at: [0, -4.6], r: 1.4, prompt: 'jump', tip: 'Salta cada hueco. Mantén el salto para llegar más lejos.' },
        { at: [0, -8.3], r: 1.4, prompt: 'jump' }, { at: [0, -11.7], r: 1.4, prompt: 'jump' }, { at: [0, -15.1], r: 1.4, prompt: 'jump' }, { at: [0, -18.5], r: 1.4, prompt: 'jump' }]
    },
    {
      name: 'Alucinación', chapter: 'Haiku',
      hint: 'Un error te devuelve al inicio. Esquívalo.',
      root: 64, par: 6,
      spawn: [0, 1, 0],
      solids: [[-4, 4, 3, -16.5, 0]],
      keys: [[-1.5, 1.5, -2, -4, 0], [-1, 1, -8.5, -10.5, 0], [2, 4, -14, -16, 0], [-4, -2, -14, -16, 0]],
      // The first error sits off the path: touching it is clearly a choice.
      cracks: [[-4, -2.6, 1.5, -0.5, 0.35], [-4, -0.8, -6, -7, 0.35], [0.8, 4, -6, -7, 0.35], [-4, 1.2, -12, -13, 0.35]],
      crates: [],
      teach: [{ at: [0, -6.5], r: 1.6, tip: 'Tocar un error es volver a empezar. Pasa por el medio.' },
        { at: [0, -12.5], r: 2.2, tip: 'Rodea el error por la derecha.' }]
    },
    {
      name: 'Sin red', chapter: 'Sonnet',
      hint: 'Salta los huecos: toque corto, salto corto; mantén para ir lejos.',
      root: 65, par: 8,
      spawn: [0, 1, 0],
      solids: [[-2, 2, 3, -2, 0], [-2, 2, -9, -11.5, 0.8], [4.4, 7, -13.9, -16.5, 0]],
      keys: [[-1.5, 1.5, -4.4, -6.6, 0], [4.4, 7, -9, -11.5, 0.8], [4.4, 7, -18.9, -21, 0.6], [-0.5, 2, -18.9, -21, 1.2]],
      cracks: [], crates: [],
      teach: [{ at: [0, -3.2], r: 1.6, prompt: 'jump', tip: 'Salta justo antes del borde y mantén el salto.' },
        { at: [0, -7.8], r: 1.6, prompt: 'jump' }, { at: [3.2, -10.2], r: 1.6, prompt: 'jump' }, { at: [5.7, -12.7], r: 1.6, prompt: 'jump' },
        { at: [5.7, -17.7], r: 1.6, prompt: 'jump' }, { at: [3.2, -20], r: 1.6, prompt: 'jump' }]
    },
    {
      name: 'Herramientas', chapter: 'Sonnet',
      hint: 'Empuja la herramienta y úsala.',
      root: 67, par: 5,
      spawn: [0, 1, 0],
      solids: [[-3, 3, 3, -6, 0], [-0.6, 0.6, -6, -6.6, 0], [-3, 3, -6.6, -14, 0],
        [-6, -0.6, -6, -6.6, 3.2, 4.4], [0.6, 6, -6, -6.6, 3.2, 4.4], [-0.6, 0.6, -6, -6.6, 3.2, 1.6]],
      keys: [[1, 3, 0, -2, 0], [-3, -1, -10, -12, 0], [1, 3, -12, -14, 0]],
      cracks: [], crates: [[0, -6.3, 0]],
      teach: [{ at: [0, -4.6], r: 2, prompt: 'push', tip: 'Camina contra la herramienta para empujarla por la puerta.' }]
    },
    {
      name: 'Escalar', chapter: 'Sonnet',
      hint: 'Empuja la herramienta contra la pared y súbete a ella.',
      root: 57, par: 16.5,
      spawn: [0, 1, 0],
      solids: [[-8, 8, 3, -14, 0], [-8, -3.5, -8, -14, 2.6, 3.8], [3.5, 8, -8, -14, 2.6, 3.8]],
      keys: [[-7, -4.5, -10, -12.5, 2.6], [-1.5, 1.5, -11, -13, 0], [4.5, 7, -10, -12.5, 2.6]],
      cracks: [], crates: [[-5.5, -2, 0], [5.5, -2, 0]],
      teach: [{ at: [-5.5, -0.9], r: 1.4, prompt: 'push' }, { at: [5.5, -0.9], r: 1.4, prompt: 'push' },
        { at: [-5.5, -7.2], r: 1.8, tip: 'Pega la herramienta a la pared y salta encima.' },
        { at: [5.5, -7.2], r: 1.8, tip: 'Pega la herramienta a la pared y salta encima.' }]
    },
    {
      name: 'Modo rápido', chapter: 'Sonnet',
      hint: 'Mantén Shift o Rápido para correr: el salto con carrera llega mucho más lejos.',
      root: 59, par: 8,
      spawn: [0, 1, 0],
      solids: [[-2, 2, 3, -5, 0], [-2, 2, -17.7, -21.7, 0.5]],
      keys: [[-1.5, 1.5, -9.5, -13.5, 0], [-1.5, 1.5, -26.2, -30, 0.5], [3.5, 6.5, -26.2, -30, 1.4], [3.5, 6.5, -34.5, -38, 1.4]],
      cracks: [], crates: [],
      teach: [{ at: [0, -4], r: 2.4, prompt: 'sprint', tip: 'Este hueco pide carrera: mantén Shift o Rápido.' },
        { at: [0, -12.6], r: 2.2, prompt: 'sprint', tip: 'Este hueco pide carrera: mantén Shift o Rápido.' },
        { at: [0, -20.8], r: 2.2, prompt: 'sprint', tip: 'Este hueco pide carrera: mantén Shift o Rápido.' },
        { at: [5, -29.2], r: 2, prompt: 'sprint', tip: 'Toma carrera desde el fondo del paso y salta en el borde.' }]
    },
    {
      name: 'Ventana de contexto', chapter: 'Opus',
      hint: 'El contexto se agota: termina antes de olvidar.',
      root: 62, par: 9.5, fade: 7.5,
      spawn: [-1, 1, 0],
      solids: [[-6, 2, 3, -3.5, 0]],
      // The first context step sits on solid ground, so its timer can be watched safely.
      keys: [[-6, -3.5, -1, -3.5, 0, 'n'], [-0.5, 2, -1, -3.5, 0, 'f'],
        [-1.25, 1.25, -5.5, -8, 0, 'f'], [3.25, 5.75, -5.5, -8, 0, 'f'], [3.25, 5.75, -10, -12.5, 0, 'f'],
        [-1.25, 1.25, -10, -12.5, 0, 'f'], [-5.75, -3.25, -10, -12.5, 0, 'f'], [-5.75, -3.25, -5.5, -8, 0, 'f']],
      cracks: [], crates: [],
      teach: [{ at: [0, -4.5], r: 1.4, prompt: 'jump', tip: 'Recorre el contexto en una sola pasada, sin volver atrás.' },
        { at: [2.25, -6.75], r: 1.2, prompt: 'jump' }, { at: [4.5, -9], r: 1.2, prompt: 'jump' },
        { at: [2.25, -11.25], r: 1.2, prompt: 'jump' }, { at: [-2.25, -11.25], r: 1.2, prompt: 'jump' }, { at: [-4.5, -9], r: 1.2, prompt: 'jump' }]
    },
    {
      name: 'Cadena de herramientas', chapter: 'Opus',
      hint: 'Rellena la zanja con herramientas. El contexto no espera.',
      root: 64, par: 13, fade: 6.5,
      spawn: [0, 1.6, 0],
      solids: [[-3, 3, 3, -3, 0], [-0.55, 0.55, -3, -6, 0], [-0.55, 0.55, -8.2, -11, 0], [-3, 3, -11, -18.5, 0],
        [-1.6, -0.55, -1, -11, 2.8, 4], [0.55, 1.6, -1, -11, 2.8, 4], [-0.55, 0.55, -4, -10, 2.8, 1.8]],
      keys: [[-3, -1.8, 2, -1, 0, 'n'], [1.8, 3, 2, -1, 0, 'f'], [-3, -1, -12.5, -14.5, 0, 'f'], [1, 3, -14.5, -16.5, 0, 'f'], [-1, 1, -16.5, -18.5, 0, 'n']],
      cracks: [[-0.55, 0.55, -6, -8.2, -1, 0.3]],
      crates: [[0, -4.2, 0], [0, -2.4, 0]],
      teach: [{ at: [0, -0.6], r: 1.4, prompt: 'push' }, { at: [0, -6.8], r: 1.6, tip: 'Empuja las dos herramientas a la zanja antes de cruzar.' }]
    },
    {
      name: 'El orquestador', chapter: 'Opus',
      hint: 'Dos subagentes en paralelo: actívalos casi a la vez.',
      root: 60, par: 21.5, fade: 6.5, chord: 3,
      spawn: [0, 1.5, 0],
      solids: [[-3, 3, 3, -3, 0], [-3, 3, -5.4, -12, 0], [-3, 3, -16.3, -22, 0.6], [-3, 3, -22, -25, 3.2, 3.8],
        [-3, 3, -27, -33, 1.2], [-3, 3, -41.6, -46, 2.2]],
      keys: [[-3, -1, 0, -2, 0, 'n'], [-3, -1.5, -10, -12, 0, 'n'],
        [-3, -1.4, -22.5, -24.5, 3.2, 'c', 0], [1.4, 3, -22.5, -24.5, 3.2, 'c', 0],
        [-3, -1.5, -29, -31, 1.2, 'c', 1], [6.5, 8.5, -29, -31, 1.2, 'c', 1],
        [6.5, 8.5, -33.2, -35.2, 1.6, 'f'], [2.3, 4.3, -33.2, -35.2, 1.6, 'f'], [-1.9, 0.1, -33.2, -35.2, 1.6, 'f'],
        [-1.9, 0.1, -37.4, -39.4, 2.2, 'f'], [-1, 1, -43.5, -45.5, 2.2, 'n']],
      cracks: [[-3, -0.8, -7.5, -8.3, 0.35], [0.8, 3, -7.5, -8.3, 0.35]],
      crates: [[2, -18.5, 0.6]],
      teach: [{ at: [0, -7.9], r: 1.4, tip: 'Pasa entre los errores, por el medio.' },
        { at: [0, -14], r: 2.4, prompt: 'sprint', tip: 'Este hueco pide carrera: mantén Shift o Rápido.' },
        { at: [2, -20.5], r: 1.6, tip: 'Empuja la herramienta a la pared y súbete.' },
        { at: [4.6, -30], r: 2.2, prompt: 'sprint', tip: 'Corre y salta al otro subagente antes de que su pareja se apague.' },
        { at: [5, -36.3], r: 3, tip: 'Contexto: completa los últimos cuatro pasos de una sola pasada.' }]
    }
  ];

  /* ---------- The story: one request that grows over the ten tasks ----------
     Every player-facing word of the narrative lives here. STORY[i] belongs to STAGES[i]:
       ask      the user's message at this point of the story (the user message paper)
       legend   [kind, text] lines of the mission card: what this world means.
                kind: step | error | tool | gap | context | pair
       steps    one [tool call, tool result, 3D label?] per key, in key order
                (paired keys: the Agent call and the subagent's single result)
       tools    one [tool call, tool result, 3D label] per crate, in crate order
       errors   one [tool call, 3D label] per error panel, in crack order: a made-up
                answer the hook refuses (the result paper is always "ERROR · hook dijo no")
       fall     [tool call, tool result] when Clawd falls: a step that went wrong
       answer   the assistant message that closes the task: what the user receives
       done     what Clawd did in the story; concept: the agent idea it was */
  var STORY = [
    {
      ask: 'Quiero organizar una noche de juegos para mis amigos el sábado.',
      legend: [['move', 'Caminar y saltar: Clawd piensa cómo llegar al próximo paso.'],
        ['step', 'Pisar un paso es actuar: Clawd lee una parte de tu mensaje para entender qué pides.']],
      steps: [['leer("noche de juegos")', 'es una reunión'], ['leer("el sábado")', 'fecha: este sábado'], ['leer("mis amigos")', 'faltan cuántos y dónde']],
      tools: [], errors: [],
      fall: ['adivinar("qué pide")', 'ERROR · paso en falso'],
      answer: '¡Buena idea! Te ayudo a armarla. ¿Cuántos amigos vienen?',
      done: 'Clawd leyó tu mensaje y te respondió. La tarea terminó cuando te llegó esa respuesta.',
      concept: 'Concepto: el loop. El agente piensa, actúa paso a paso y termina cuando te responde.'
    },
    {
      ask: 'Somos ocho. Ayúdame a organizar todo.',
      legend: [['step', 'Cada paso es una parte del plan: fecha, hora, lugar, invitados, comida y juegos.'],
        ['gap', 'Huecos: un paso en falso. Si caes, ese intento falló y vuelves a empezar.']],
      steps: [['plan("fecha")', 'sábado'], ['plan("hora")', '7 de la noche'], ['plan("invitados")', '8 amigos'],
        ['plan("lugar")', 'por definir'], ['plan("comida")', 'por definir'], ['plan("juegos")', 'por definir']],
      tools: [], errors: [],
      fall: ['saltarse("un paso")', 'ERROR · el plan quedó cojo'],
      answer: 'Plan: sábado a las 7, ocho amigos. Faltan lugar, comida y juegos.',
      done: 'Clawd partió tu pedido en seis pasos y te mostró el plan con lo que falta.',
      concept: 'Concepto: dividir la tarea. Cada paso es un tool call con su resultado.'
    },
    {
      ask: '¿Cuántos confirmaron? ¿Qué juegos tenemos?',
      legend: [['step', 'Pasos dorados: datos comprobados (el chat del grupo, los juegos contados).'],
        ['error', 'Paneles rojos: respuestas inventadas que suenan bien. Nadie las verificó: el hook no deja usarlas.']],
      steps: [['leer("chat del grupo")', 'confirmaron 6', '✓ chat del grupo'], ['contar("juegos")', 'tienes 3 juegos', '✓ juegos contados'],
        ['preguntar("Ana")', 'Ana trae 2', '✓ Ana respondió'], ['sumar("total")', '5 juegos', '✓ cuenta hecha']],
      tools: [],
      errors: [['afirmar("todos pueden")', 'todos pueden el sábado'], ['afirmar("Leo trae consola")', 'Leo trae la consola'],
        ['afirmar("sobran juegos")', 'seguro sobran juegos'], ['afirmar("Marta viene")', 'Marta dijo que sí']],
      fall: ['adivinar("cuántos vienen")', 'ERROR · sin datos'],
      answer: 'Confirmaron 6 de 8. Hay 5 juegos: 3 tuyos y 2 que trae Ana.',
      done: 'Clawd respondió solo con datos comprobados. Las respuestas inventadas las frenó el hook.',
      concept: 'Concepto: alucinación. Un LLM puede inventar algo que suena bien; verificar y los hooks lo frenan.'
    },
    {
      ask: 'En mi casa no cabemos. ¿Dónde la hacemos?',
      legend: [['step', 'Pasos: buscar lugares y reservar uno.'],
        ['gap', 'Huecos: una reserva que falla. El error entra al contexto y Clawd prueba por otro lado.']],
      steps: [['buscar("lugares cerca")', '3 opciones'], ['reservar("café de juegos")', 'lleno el sábado'],
        ['reservar("salón comunal")', 'disponible'], ['confirmar("reserva")', 'reservado, 7 p. m.']],
      tools: [], errors: [],
      fall: ['reservar("terraza")', 'ERROR · no disponible'],
      answer: 'Reservé el salón comunal, sábado 7 p. m. El café de juegos estaba lleno.',
      done: 'El café de juegos estaba lleno: ese dato entró al contexto y Clawd reservó otro lugar.',
      concept: 'Concepto: errores y reintentos. Un resultado con error no corta el loop: el LLM lo lee y cambia de plan.'
    },
    {
      ask: '¿Quiénes vienen al final? No quiero olvidar a nadie.',
      legend: [['tool', 'La caja es una herramienta: la lista de invitados. Empujarla por la puerta es usarla.'],
        ['step', 'Pasos: lo que Clawd resuelve con lo que la herramienta le dice.']],
      steps: [['revisar("mensajes")', '2 sin responder'], ['escribir("Leo y Ana")', 'mensaje enviado'], ['confirmar("lista final")', 'Leo y Ana vienen']],
      tools: [['lista_invitados()', '8 nombres', 'lista de invitados']], errors: [],
      fall: ['suponer("quién viene")', 'ERROR · paso en falso'],
      answer: 'Vienen los 8: te dejo la lista. Leo y Ana acaban de confirmar.',
      done: 'Clawd dejó de suponer y usó la lista de invitados para saber quién viene.',
      concept: 'Concepto: tools. El LLM no ve nada: pide una tool, el código corre y le devuelve un dato.'
    },
    {
      ask: 'Se sumaron cuatro amigos más. ¿Nos alcanza todo?',
      legend: [['tool', 'Cajas: herramientas (invitados y compras). Pégalas a la pared y súbete para llegar alto.'],
        ['step', 'Pasos altos: lo que el plan necesita ahora que creció.']],
      steps: [['calcular("sillas")', 'faltan 4'], ['reacomodar("salón")', 'mesa extra'], ['duplicar("bebidas")', 'bebidas para 12']],
      tools: [['lista_invitados()', 'ahora son 12', 'invitados'], ['lista_compras(12)', 'compras para 12', 'compras']], errors: [],
      fall: ['subir("sin herramienta")', 'ERROR · no alcanza'],
      answer: 'Con 12 alcanza: 4 sillas más, una mesa extra y bebidas para todos.',
      done: 'El plan creció y Clawd combinó dos herramientas para llegar a lo que antes no alcanzaba.',
      concept: 'Concepto: escalar. Una tarea más grande pide más pasos y varias tools juntas.'
    },
    {
      ask: '¡Necesito la invitación ya! Salgo en cinco minutos.',
      legend: [['gap', 'Huecos largos: sin modo rápido no llegas. Es una respuesta contra el reloj.'],
        ['step', 'Pasos: escribir la invitación, completarla y enviarla.']],
      steps: [['redactar("invitación")', 'borrador listo'], ['agregar("dirección")', 'salón comunal'],
        ['agregar("hora")', 'sábado 7 p. m.'], ['enviar("grupo")', 'invitación enviada']],
      tools: [], errors: [],
      fall: ['enviar("a medias")', 'ERROR · no llegó'],
      answer: 'Listo: la invitación ya está en el grupo.',
      done: 'Clawd respondió rápido sin saltarse pasos: la invitación llegó completa.',
      concept: 'Concepto: rapidez. Ir más rápido no cambia el loop: cada paso sigue siendo un tool call.'
    },
    {
      ask: 'Ah, y recuerda: Sofía es alérgica al maní.',
      legend: [['context', 'Pasos verde azulado: detalles de una charla larga. Si tardas en volver, se salen del contexto y Clawd los olvida.'],
        ['step', 'Primero, releer la conversación. Después, armar el menú sin maní.']],
      steps: [['releer("conversación")', '40 mensajes'], ['recordar("alergia")', 'Sofía: nada con maní'],
        ['elegir("pizza")', 'sin maní'], ['elegir("snacks")', 'sin maní'], ['elegir("postre")', 'sin maní'],
        ['elegir("salsas")', 'sin maní'], ['elegir("bebidas")', 'listas'], ['revisar("menú")', 'todo sin maní']],
      tools: [], errors: [],
      fall: ['saltar("un detalle")', 'ERROR · paso en falso'],
      answer: 'Menú listo y todo sin maní, por Sofía.',
      done: 'La charla se alargó y Clawd mantuvo la alergia de Sofía en el contexto hasta el final.',
      concept: 'Concepto: ventana de contexto. Lo que se sale del contexto, el LLM ya no lo sabe.'
    },
    {
      ask: 'Hagamos pizza casera. ¿Me pides los ingredientes?',
      legend: [['tool', 'Cajas en cadena: la receta alimenta la lista de compras. Llena la zanja con las dos.'],
        ['error', 'Fondo rojo: pedir de memoria, sin la lista. El hook lo frena.'],
        ['context', 'Pasos verde azulado: datos que se olvidan si tardas.']],
      steps: [['elegir("pizza casera")', 'receta elegida'], ['revisar("despensa")', 'falta queso'],
        ['pedir(lista)', 'pedido hecho'], ['pagar("pedido")', 'pagado'], ['confirmar("entrega")', 'sábado 5 p. m.']],
      // Crate 1 sits nearer: it is pushed first and moves crate 0, so 1 is the recipe and 0 the list.
      tools: [['lista_compras(receta)', '14 productos', 'lista de compras'], ['receta("pizza")', 'ingredientes para 12', 'receta']],
      errors: [['pedir("de memoria")', 'pedir de memoria']],
      fall: ['pedir("sin receta")', 'ERROR · faltó un dato'],
      answer: 'Pedido hecho: llega el sábado a las 5 con todo para la pizza.',
      done: 'La receta alimentó la lista y la lista alimentó el pedido: una herramienta tras otra.',
      concept: 'Concepto: cadena de tools. El resultado de una tool es la entrada de la siguiente.'
    },
    {
      ask: '¡Llegó el sábado! ¿Está todo listo?',
      legend: [['pair', 'Paneles violeta en par: subagentes que trabajan a la vez. Cada uno vuelve con un solo papel.'],
        ['error', 'Paneles rojos: «ya está todo» sin revisar. El hook lo frena.'],
        ['tool', 'La caja: el calendario. Empújala a la pared y súbete.'],
        ['context', 'Al final, los últimos detalles, de una sola pasada.']],
      steps: [['revisar("plan")', '4 frentes abiertos'], ['repartir("frentes")', '4 subagentes'],
        ['Agent("comida")', 'comida: pizza en el horno'], ['Agent("música")', 'música: lista sonando'],
        ['Agent("invitados")', 'invitados: 12 en camino'], ['Agent("juegos")', 'juegos: 5 en la mesa'],
        ['encender("luces")', 'luces listas'], ['ordenar("sillas")', '12 sillas'], ['servir("bebidas")', 'servidas'],
        ['abrir("puerta")', '¡llegan!'], ['avisar("usuario")', 'todo listo']],
      tools: [['calendario("sábado")', 'todo a las 7 p. m.', 'calendario']],
      errors: [['confirmar("ya está todo")', 'ya está todo'], ['confirmar("nadie falta")', 'nadie falta']],
      fall: ['improvisar()', 'ERROR · paso en falso'],
      answer: 'Todo listo: pizza en el horno, música, 12 amigos y 5 juegos. ¡A jugar!',
      done: 'Clawd repartió el trabajo entre cuatro subagentes y juntó sus respuestas: la noche está lista.',
      concept: 'Concepto: orquestación. Subagentes en paralelo, cada uno con su contexto y un solo papel de vuelta.'
    }
  ];
  // The short name of a step in the mission progress: the quoted argument of its tool call
  // (leer("el sábado") -> el sábado), else the bare argument, else the tool name.
  function storyPart(call) {
    var s = String(call || ''), m = s.match(/"([^"]+)"/);
    if (m) return m[1];
    m = s.match(/\(([^)]+)\)/);
    if (m) return m[1];
    return s.replace(/\(\)$/, '');
  }
  /* ---------- "Tu Clawd": the player's own Clawd (render and card data, no physics) ----------
     Body boxes and accessories are [w, h, d, x, y, z, part] in the Clawd's local space
     (front is -z, the torso top sits at y 0.25). The render builds them with cubes; the share
     card draws the same boxes in 2D. Accessories are our own cube designs. */
  var CLAWD = {
    defaultName: 'Clawd',
    nameMax: 16,
    // body: main color; dark: legs; emissive and darkEmissive: the glow. The first is the game's own.
    colors: [
      { id: 'terracota', label: 'Terracota', body: '#d97757', dark: '#b85d40', emissive: '#b0482a', darkEmissive: '#7a2e14' },
      { id: 'ambar', label: 'Ámbar', body: '#e9a23b', dark: '#c07f22', emissive: '#a8661a', darkEmissive: '#6e400e' },
      { id: 'menta', label: 'Menta', body: '#3fb8a6', dark: '#2a8f80', emissive: '#1f7a6d', darkEmissive: '#124a42' },
      { id: 'violeta', label: 'Violeta', body: '#8c7ae6', dark: '#6a58c4', emissive: '#5a48b0', darkEmissive: '#352a70' },
      { id: 'rosa', label: 'Rosa', body: '#e8708a', dark: '#c4506a', emissive: '#b04460', darkEmissive: '#702638' },
      { id: 'grafito', label: 'Grafito', body: '#6b6680', dark: '#4e4a60', emissive: '#3c384e', darkEmissive: '#221f30' }
    ],
    body: [
      [0.78, 0.44, 0.52, 0, 0.03, 0, 'body'], [0.12, 0.13, 0.2, -0.45, 0, 0, 'body'], [0.12, 0.13, 0.2, 0.45, 0, 0, 'body'],
      [0.1, 0.16, 0.12, -0.28, -0.27, 0, 'dark'], [0.1, 0.16, 0.12, -0.1, -0.27, 0, 'dark'],
      [0.1, 0.16, 0.12, 0.1, -0.27, 0, 'dark'], [0.1, 0.16, 0.12, 0.28, -0.27, 0, 'dark'],
      [0.07, 0.15, 0.02, -0.16, 0.08, -0.265, 'eye'], [0.07, 0.15, 0.02, 0.16, 0.08, -0.265, 'eye']
    ],
    eye: '#1c1418',
    // parts: name -> color (an accessory's boxes name their part)
    accessories: [
      { id: 'ninguno', label: 'Ninguno', parts: {}, boxes: [] },
      { id: 'gorra', label: 'Gorra', parts: { cap: '#2f5fa8', visor: '#24497f' },
        boxes: [[0.52, 0.12, 0.44, 0, 0.31, 0.02, 'cap'], [0.46, 0.035, 0.22, 0, 0.265, -0.3, 'visor'], [0.08, 0.04, 0.08, 0, 0.385, 0.02, 'visor']] },
      { id: 'auriculares', label: 'Auriculares', parts: { band: '#2a2238', cup: '#ffb347' },
        boxes: [[0.66, 0.05, 0.09, 0, 0.36, 0, 'band'], [0.05, 0.14, 0.09, -0.31, 0.3, 0, 'band'], [0.05, 0.14, 0.09, 0.31, 0.3, 0, 'band'],
          [0.1, 0.17, 0.22, -0.44, 0.13, 0, 'cup'], [0.1, 0.17, 0.22, 0.44, 0.13, 0, 'cup']] },
      { id: 'corona', label: 'Corona', parts: { gold: '#ffcf5c', gem: '#e8708a' },
        boxes: [[0.44, 0.06, 0.32, 0, 0.28, 0, 'gold'], [0.08, 0.1, 0.08, -0.16, 0.36, -0.1, 'gold'], [0.08, 0.13, 0.08, 0, 0.375, -0.1, 'gold'],
          [0.08, 0.1, 0.08, 0.16, 0.36, -0.1, 'gold'], [0.06, 0.05, 0.02, 0, 0.29, -0.165, 'gem']] },
      { id: 'bufanda', label: 'Bufanda', parts: { wool: '#e04a5f', stripe: '#fff3dc' },
        boxes: [[0.82, 0.09, 0.56, 0, -0.13, 0, 'wool'], [0.11, 0.2, 0.04, 0.2, -0.25, -0.29, 'wool'], [0.11, 0.03, 0.045, 0.2, -0.2, -0.29, 'stripe']] },
      { id: 'lentes', label: 'Lentes', parts: { frame: '#1d1a3f', lens: '#8fe3d8' },
        boxes: [[0.19, 0.17, 0.02, -0.16, 0.08, -0.285, 'frame'], [0.19, 0.17, 0.02, 0.16, 0.08, -0.285, 'frame'],
          [0.13, 0.025, 0.02, 0, 0.12, -0.285, 'frame'], [0.13, 0.11, 0.01, -0.16, 0.08, -0.297, 'lens'], [0.13, 0.11, 0.01, 0.16, 0.08, -0.297, 'lens']] },
      { id: 'antena', label: 'Antena', parts: { stem: '#2a2238', bulb: '#ffb347' },
        boxes: [[0.04, 0.24, 0.04, 0.12, 0.37, 0, 'stem'], [0.12, 0.12, 0.12, 0.12, 0.52, 0, 'bulb']] }
    ]
  };
  // A safe, short name: one line, at most nameMax characters, never empty. It is always shown
  // as text (textContent), never parsed as HTML.
  function clawdName(name) {
    var s = String(name == null ? '' : name).replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    s = Array.from(s).slice(0, CLAWD.nameMax).join('').trim();
    return s || CLAWD.defaultName;
  }

  // Closing of the whole story, shown after task 10.
  var STORY_END = 'Todo empezó con un mensaje. Clawd lo leyó, armó el plan, verificó los datos, reintentó, usó herramientas y repartió el trabajo. Eso es un agente: un loop que termina cuando tienes tu respuesta.';
  for (var si = 0; si < STAGES.length; si++) STAGES[si].story = STORY[si];


  function mkBox(x0, x1, z0, z1, top, thick, kind) {
    return {
      min: [Math.min(x0, x1), top - thick, Math.min(z0, z1)],
      max: [Math.max(x0, x1), top, Math.max(z0, z1)],
      kind: kind, key: null
    };
  }

  function makeWorld(index) {
    var S = STAGES[index];
    var w = {
      index: index, stage: S, boxes: [], keys: [], crates: [], events: [],
      time: 0, started: false, falls: 0, done: false, melody: [], tick: 0,
      fadeT: S.fade || C.fadeT, chordT: S.chord || C.chordT
    };
    var minTop = Infinity, i, a, b;
    for (i = 0; i < S.solids.length; i++) {
      a = S.solids[i];
      b = mkBox(a[0], a[1], a[2], a[3], a[4], a[5] || C.solidThick, 'solid');
      w.boxes.push(b); minTop = Math.min(minTop, a[4] - 1);
    }
    for (i = 0; i < S.cracks.length; i++) {
      a = S.cracks[i];
      b = mkBox(a[0], a[1], a[2], a[3], a[4], a[5] || C.crackThick, 'crack');
      w.boxes.push(b); minTop = Math.min(minTop, a[4] - 1);
    }
    for (i = 0; i < S.keys.length; i++) {
      a = S.keys[i];
      b = mkBox(a[0], a[1], a[2], a[3], a[4], C.keyThick, 'key');
      var k = {
        id: i, box: b, type: a[5] || 'n', group: a[6] == null ? -1 : a[6],
        note: PENTA[i % PENTA.length], awake: false, locked: false, t: 0
      };
      b.key = k;
      w.boxes.push(b); w.keys.push(k); minTop = Math.min(minTop, a[4]);
    }
    for (i = 0; i < S.crates.length; i++) {
      a = S.crates[i];
      var h = C.crateHalf;
      var c = {
        id: i, start: [a[0], a[2] + h, a[1]], p: [a[0], a[2] + h, a[1]], v: [0, 0, 0],
        pv: [0, 0, 0], pushT: 0, ground: true, wasGround: true, blk: [0, 0, 0], box: { min: [0, 0, 0], max: [0, 0, 0], kind: 'crate', key: null },
        moving: 0
      };
      crateBox(c);
      w.crates.push(c);
    }
    w.killY = minTop - 8;
    var sp = S.spawn;
    w.spawn = [sp[0], sp[2] + C.r + 0.02, sp[1]];
    w.player = {
      p: w.spawn.slice(), v: [0, 0, 0], g: false, co: 0, bu: 0, jumping: false, airSprint: false,
      prevJump: false, dead: false, deadT: 0, onKey: null, stepT: 0.5, ground: null
    };
    // Bounds for the camera sweep.
    var bmin = [Infinity, Infinity, Infinity], bmax = [-Infinity, -Infinity, -Infinity];
    w.boxes.forEach(function (bx) {
      for (var j = 0; j < 3; j++) { bmin[j] = Math.min(bmin[j], bx.min[j]); bmax[j] = Math.max(bmax[j], bx.max[j]); }
    });
    w.bounds = { min: bmin, max: bmax };
    return w;
  }

  function crateBox(c) {
    var h = C.crateHalf;
    c.box.min[0] = c.p[0] - h; c.box.min[1] = c.p[1] - h; c.box.min[2] = c.p[2] - h;
    c.box.max[0] = c.p[0] + h; c.box.max[1] = c.p[1] + h; c.box.max[2] = c.p[2] + h;
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function die(w, cause) {
    var P = w.player;
    if (P.dead || w.done) return;
    P.dead = true; P.deadT = C.respawnT; w.falls++;
    w.events.push({ t: 'death', cause: cause, p: P.p.slice() });
  }

  function respawn(w) {
    var P = w.player;
    P.p = w.spawn.slice(); P.v = [0, 0, 0]; P.dead = false; P.g = false; P.co = 0; P.bu = 0; P.jumping = false;
    w.keys.forEach(function (k) {
      if (k.type === 'c' && !k.locked && k.awake) { k.awake = false; w.events.push({ t: 'sleep', k: k }); }
    });
    w.events.push({ t: 'respawn' });
  }

  // Resolve one AABB (the crate) against another; returns the axis used or -1.
  function overlapAxis(a, b, vy, rest) {
    var ox = Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]);
    if (ox <= 0) return null;
    var oy = Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]);
    if (oy <= 0) return null;
    var oz = Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]);
    if (oz <= 0) return null;
    var aCy = (a.min[1] + a.max[1]) / 2, bCy = (b.min[1] + b.max[1]) / 2;
    // Resting tolerance: a box sitting just inside another's top resolves upward (no snagging on seams).
    if (aCy > bCy && b.max[1] - a.min[1] < 0.06 && vy <= 0.01 && rest) return { axis: 1, o: oy };
    if (oy <= ox && oy <= oz) return { axis: 1, o: oy };
    return ox < oz ? { axis: 0, o: ox } : { axis: 2, o: oz };
  }

  function stepCrates(w) {
    var dt = C.dt, cs = w.crates, i, j, c, it, r;
    for (i = 0; i < cs.length; i++) {
      c = cs[i];
      // Only a crate resting on something can be pushed; falling crates drop straight down.
      if (c.pushT > 0 && c.ground) { c.v[0] = c.pv[0]; c.v[2] = c.pv[2]; c.pushT--; }
      else { c.v[0] = 0; c.v[2] = 0; }
      c.v[1] = Math.max(-C.maxFall, c.v[1] - C.crateG * dt);
      c.p[0] += c.v[0] * dt; c.p[1] += c.v[1] * dt; c.p[2] += c.v[2] * dt;
      c.blk[0] = c.blk[1] = c.blk[2] = 0;
      c.wasGround = c.ground; c.ground = false;
      crateBox(c);
    }
    for (it = 0; it < 3; it++) {
      for (i = 0; i < cs.length; i++) {
        c = cs[i];
        for (j = 0; j < w.boxes.length; j++) {
          var b = w.boxes[j];
          r = overlapAxis(c.box, b, c.v[1], c.wasGround);
          if (!r) continue;
          var bc = (b.min[r.axis] + b.max[r.axis]) / 2;
          var s = c.p[r.axis] >= bc ? 1 : -1;
          c.p[r.axis] += s * r.o;
          if (c.v[r.axis] * s < 0) c.v[r.axis] = 0;
          c.blk[r.axis] = -s;
          if (r.axis === 1) c.ground = true;
          crateBox(c);
        }
      }
      for (i = 0; i < cs.length; i++) {
        for (j = i + 1; j < cs.length; j++) {
          var A = cs[i], B = cs[j];
          var upper = A.p[1] >= B.p[1] ? A : B, lower = upper === A ? B : A;
          r = overlapAxis(upper.box, lower.box, upper.v[1], upper.wasGround);
          if (!r) continue;
          if (r.axis === 1) {
            upper.p[1] += r.o; if (upper.v[1] < 0) upper.v[1] = 0; upper.ground = true; crateBox(upper);
            continue;
          }
          var ax = r.axis;
          var mover = Math.abs(A.v[ax]) >= Math.abs(B.v[ax]) ? A : B, other = mover === A ? B : A;
          var dir = other.p[ax] >= mover.p[ax] ? 1 : -1;
          if (other.blk[ax] === dir || !other.wasGround) {
            mover.p[ax] -= dir * r.o; mover.v[ax] = 0; mover.blk[ax] = dir; crateBox(mover);
          } else {
            other.p[ax] += dir * r.o; other.pv[ax] = mover.v[ax]; other.pv[ax === 0 ? 2 : 0] = 0; other.pushT = 2; crateBox(other);
          }
        }
      }
    }
    for (i = 0; i < cs.length; i++) {
      c = cs[i];
      c.moving = Math.abs(c.v[0]) + Math.abs(c.v[2]) > 0.3 ? 1 : 0;
      if (c.p[1] < w.killY) {
        c.p = c.start.slice(); c.v = [0, 0, 0]; c.pushT = 0; crateBox(c);
        w.events.push({ t: 'crateReset', c: c });
      }
    }
  }

  function contact(w, b, crate) {
    var P = w.player, p = P.p, v = P.v, r = C.r;
    var cx = clamp(p[0], b.min[0], b.max[0]);
    var cy = clamp(p[1], b.min[1], b.max[1]);
    var cz = clamp(p[2], b.min[2], b.max[2]);
    var dx = p[0] - cx, dy = p[1] - cy, dz = p[2] - cz;
    var d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r * r) return;
    if (b.kind === 'crack') { die(w, 'crack'); return; }
    var nx, ny, nz, pen;
    if (d2 > 1e-12) {
      var d = Math.sqrt(d2); nx = dx / d; ny = dy / d; nz = dz / d; pen = r - d;
    } else {
      // Center inside the box: leave through the nearest face.
      var faces = [p[0] - b.min[0], b.max[0] - p[0], p[1] - b.min[1], b.max[1] - p[1], p[2] - b.min[2], b.max[2] - p[2]];
      var m = 0;
      for (var f = 1; f < 6; f++) if (faces[f] < faces[m]) m = f;
      nx = m === 0 ? -1 : m === 1 ? 1 : 0; ny = m === 2 ? -1 : m === 3 ? 1 : 0; nz = m === 4 ? -1 : m === 5 ? 1 : 0;
      pen = faces[m] + r;
    }
    var pushing = false;
    if (crate && Math.abs(ny) < 0.5) {
      var ax = Math.abs(nx) > Math.abs(nz) ? 0 : 2;
      var dir = (ax === 0 ? nx : nz) > 0 ? -1 : 1;
      var along = v[ax] * dir;
      if (along > 0.2) {
        var sp = Math.min(along, C.push);
        crate.pv[ax] = dir * sp; crate.pv[ax === 0 ? 2 : 0] = 0; crate.pushT = 2;
        v[ax] = dir * sp;
        pushing = true;
        w.pushing = crate;
      }
    }
    p[0] += nx * pen; p[1] += ny * pen; p[2] += nz * pen;
    if (!pushing) {
      var vn = v[0] * nx + v[1] * ny + v[2] * nz;
      if (vn < 0) { v[0] -= nx * vn; v[1] -= ny * vn; v[2] -= nz * vn; }
    }
    if (ny > 0.55) {
      P.g = true;
      if (!P.ground || (b.kind === 'key' && P.ground.kind !== 'key')) P.ground = b;
    }
  }

  function collidePlayer(w) {
    var P = w.player;
    P.g = false; P.ground = null; w.pushing = null;
    for (var it = 0; it < 3; it++) {
      for (var i = 0; i < w.boxes.length; i++) { contact(w, w.boxes[i], null); if (P.dead) return; }
      for (var j = 0; j < w.crates.length; j++) contact(w, w.crates[j].box, w.crates[j]);
    }
  }

  function wake(w, k) {
    k.awake = true;
    if (w.melody.length < 48) w.melody.push({ n: k.note, t: w.time, k: k.id });
    w.events.push({ t: 'wake', k: k });
  }

  function updateKeys(w, onKey) {
    var dt = C.dt, ks = w.keys, i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      if (k.type === 'f') {
        if (k === onKey) { if (!k.awake) wake(w, k); k.t = w.fadeT; }
        else if (k.awake) { k.t -= dt; if (k.t <= 0) { k.awake = false; k.t = 0; w.events.push({ t: 'sleep', k: k }); } }
      } else if (k.type === 'c') {
        if (k === onKey && !k.awake) { wake(w, k); k.t = w.chordT; }
      } else if (k === onKey && !k.awake) {
        wake(w, k);
      }
    }
    // Chord pairs: lock when every key of a group is awake, otherwise count down.
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      if (k.type !== 'c' || !k.awake || k.locked) continue;
      var all = true, mates = [];
      for (var j = 0; j < ks.length; j++) {
        if (ks[j].type === 'c' && ks[j].group === k.group) { mates.push(ks[j]); if (!ks[j].awake) all = false; }
      }
      if (all) {
        mates.forEach(function (m) { m.locked = true; m.t = 0; });
        w.events.push({ t: 'chord', keys: mates });
      } else {
        k.t -= dt;
        if (k.t <= 0) { k.awake = false; k.t = 0; w.events.push({ t: 'sleep', k: k }); }
      }
    }
    var done = ks.length > 0;
    for (i = 0; i < ks.length; i++) if (!ks[i].awake) { done = false; break; }
    if (done && !w.done) { w.done = true; w.events.push({ t: 'complete' }); }
  }

  // The key under the player: the contact box if it is a key, otherwise a key whose top
  // sits right under the sphere (flush keys inside a deck never get their own contact).
  function findKey(w) {
    var P = w.player, p = P.p;
    if (P.ground && P.ground.kind === 'key') return P.ground.key;
    var foot = p[1] - C.r;
    for (var i = 0; i < w.keys.length; i++) {
      var b = w.keys[i].box;
      if (p[0] >= b.min[0] && p[0] <= b.max[0] && p[2] >= b.min[2] && p[2] <= b.max[2] && Math.abs(foot - b.max[1]) < 0.08) return w.keys[i];
    }
    return null;
  }

  function moveTowards(v, tx, tz, maxD) {
    var dx = tx - v[0], dz = tz - v[2], d = Math.hypot(dx, dz);
    if (d <= maxD || d < 1e-9) { v[0] = tx; v[2] = tz; return; }
    v[0] += dx / d * maxD; v[2] += dz / d * maxD;
  }

  // input: { x, z, jump, sprint } with x/z in world space (-z is forward).
  function step(w, input) {
    var dt = C.dt, P = w.player, ev = w.events;
    if (w.done) return;
    w.tick++;
    // The clock starts on the first input, so reading the stage costs nothing.
    if (!w.started && (Math.abs(input.x || 0) + Math.abs(input.z || 0) > 0.05 || input.jump)) w.started = true;
    if (w.started) w.time += dt;
    if (P.dead) {
      P.deadT -= dt;
      if (P.deadT <= 0) respawn(w);
      updateKeys(w, null);
      return;
    }
    var ix = input.x || 0, iz = input.z || 0, m = Math.hypot(ix, iz);
    if (m > 1) { ix /= m; iz /= m; m = 1; }
    var sprint = !!input.sprint, jp = !!input.jump;
    if (P.g) P.airSprint = sprint;
    var top = (P.g ? sprint : (P.airSprint || sprint)) ? C.sprint : C.walk;
    var acc = P.g ? (m > 0.05 ? C.accGround : C.decGround) : C.accAir;
    moveTowards(P.v, ix * top, iz * top, acc * dt);

    if (jp && !P.prevJump) P.bu = C.buffer; else P.bu = Math.max(0, P.bu - dt);
    P.prevJump = jp;
    if (P.g) P.co = C.coyote; else P.co = Math.max(0, P.co - dt);
    if (P.bu > 0 && P.co > 0) {
      P.v[1] = C.jumpV; P.bu = 0; P.co = 0; P.jumping = true; P.g = false; P.airSprint = sprint;
      ev.push({ t: 'jump', sprint: sprint });
    }
    if (P.jumping && !jp && P.v[1] > 0) { P.v[1] *= C.jumpCut; P.jumping = false; }
    if (P.v[1] <= 0) P.jumping = false;
    P.v[1] = Math.max(-C.maxFall, P.v[1] - (P.v[1] > 0 ? C.gUp : C.gDown) * dt);
    var vyBefore = P.v[1];
    P.p[0] += P.v[0] * dt; P.p[1] += P.v[1] * dt; P.p[2] += P.v[2] * dt;

    stepCrates(w);
    var wasG = P.g;
    collidePlayer(w);
    if (P.dead) return;
    if (!wasG && P.g) ev.push({ t: 'land', s: -vyBefore });
    if (P.g) {
      var hs = Math.hypot(P.v[0], P.v[2]);
      if (hs > 1) {
        P.stepT -= dt * hs;
        if (P.stepT <= 0) { P.stepT = 1.5; ev.push({ t: 'step', s: hs }); }
      }
    }
    if (P.p[1] < w.killY) { die(w, 'fall'); return; }
    P.onKey = P.g ? findKey(w) : null;
    updateKeys(w, P.onKey);
  }

  /* ---------- Papers: the agent's context, built from the events above ----------
     A transcript reads core events and the world but never writes to the world, so the
     physics is the same with or without it. Mapping (see REPORT-educativa.md):
       stage start         system prompt + user message (story.ask)
       step wakes          tool call #n and its tool result #n (story.steps[key])
       fading step sleeps  its result paper leaves the context (out = true)
       crate starts moving tool call #n and its result (story.tools[crate]), once per crate
       touch an error      tool call #n with the made-up answer (story.errors[crack]), then the
                           hook refuses it: result #n ERROR · hook dijo no
       fall                tool call #n and its error result (story.fall)
       paired step wakes   tool call #n Agent(...): a subagent; its single result arrives when
                           the pair locks, or an error result when its window runs out
       task complete       assistant message (story.answer): what the user receives
     The generic texts in PAPER_TEXT are only a fallback for stages without a story.
     Every turn of the LLM reads the whole context: one read per batch of tool calls emitted in
     the same physics step, plus the final read that writes the assistant message. */
  var PAPER_TYPES = ['system', 'user', 'call', 'result', 'assistant'];
  var PAPER_TEXT = {
    system: 'Eres Clawd, un asistente. Ayuda al usuario con su noche de juegos. No inventes datos: usa solo datos comprobados.',
    callStep: function (n) { return 'paso(' + n + ')'; },
    resultStep: function (n) { return 'paso ' + n + ' listo'; },
    callAgent: function (n) { return 'Agent("paso ' + n + '")'; },
    resultAgent: function (n) { return 'subagente: paso ' + n + ' listo'; },
    resultAgentLate: 'ERROR · el subagente no terminó a tiempo',
    callTool: function (n) { return 'herramienta(' + n + ')'; },
    resultTool: function (n) { return 'herramienta ' + n + ' movida'; },
    callError: 'paso(error)',
    resultHook: 'ERROR · hook dijo no',
    callFall: 'saltar()',
    resultFall: 'ERROR · caída',
    assistant: function (a, t) { return 'Listo: ' + a + ' de ' + t + ' pasos completos.'; }
  };
  // Papers a subagent keeps in its own context instead of yours: three tool calls and their results.
  var SUB_INNER = 6;

  // opts.name: the player's Clawd name for the system prompt (default "Clawd": today's text).
  function makeTranscript(w, opts) {
    var tr = {
      papers: [], calls: 0, reads: 0, hookNo: 0, subagents: 0, forgotten: 0, version: 0,
      pending: {}, pushed: {}, done: false, fadeT: w.fadeT
    };
    var nm = clawdName(opts && opts.name);
    addPaper(tr, { type: 'system', text: nm === CLAWD.defaultName ? PAPER_TEXT.system : PAPER_TEXT.system.replace(/^Eres Clawd,/, 'Eres ' + nm + ',') });
    var st = w.stage.story;
    addPaper(tr, { type: 'user', text: (st && st.ask) || w.stage.hint || w.stage.name });
    return tr;
  }
  function addPaper(tr, p) {
    p.i = tr.papers.length; p.out = false;
    tr.papers.push(p); tr.version++;
    return p;
  }
  function addCall(tr, text, extra) {
    var p = { type: 'call', id: ++tr.calls, text: text, turn: tr.reads };
    for (var k in extra) p[k] = extra[k];
    return addPaper(tr, p).id;
  }
  function addResult(tr, id, text, extra) {
    var p = { type: 'result', id: id, text: text };
    for (var k in extra) p[k] = extra[k];
    return addPaper(tr, p);
  }

  function storyPair(list, i, call, result) {
    var p = list && list[i];
    return p ? [p[0], p[1]] : [call, result];
  }
  // Index of the error panel (crack) nearest to point p, or -1. Used for the story text of a refusal.
  function crackIndex(w, p) {
    var best = -1, bd = Infinity, n = -1;
    for (var i = 0; i < w.boxes.length; i++) {
      var b = w.boxes[i];
      if (b.kind !== 'crack') continue;
      n++;
      var dx = Math.max(b.min[0] - p[0], 0, p[0] - b.max[0]), dy = Math.max(b.min[1] - p[1], 0, p[1] - b.max[1]), dz = Math.max(b.min[2] - p[2], 0, p[2] - b.max[2]);
      var d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  // Call after every core.step(w, ...) with that step's events, before they are cleared.
  function feedTranscript(tr, events, w) {
    if (!tr || tr.done) return;
    var turn = false, i, e, k, n, id, txt;
    var st = w.stage.story || null;
    // The LLM reads the whole context once per turn, and may emit several tool calls in it.
    var think = function () { if (!turn) { turn = true; tr.reads++; } };
    for (i = 0; i < events.length; i++) {
      e = events[i];
      if (e.t === 'wake') {
        k = e.k; n = k.id + 1; think();
        if (k.type === 'c') {
          txt = storyPair(st && st.steps, k.id, PAPER_TEXT.callAgent(n), PAPER_TEXT.resultAgent(n));
          tr.pending[k.id] = addCall(tr, txt[0], { sub: true, key: k.id });
        } else {
          txt = storyPair(st && st.steps, k.id, PAPER_TEXT.callStep(n), PAPER_TEXT.resultStep(n));
          id = addCall(tr, txt[0], { key: k.id });
          addResult(tr, id, txt[1], k.type === 'f' ? { key: k.id, ctx: true, life: 1 } : { key: k.id });
        }
      } else if (e.t === 'chord') {
        e.keys.forEach(function (m) {
          var pid = tr.pending[m.id];
          if (pid == null) return;
          delete tr.pending[m.id];
          addResult(tr, pid, storyPair(st && st.steps, m.id, '', PAPER_TEXT.resultAgent(m.id + 1))[1], { sub: true, key: m.id });
          tr.subagents++;
        });
      } else if (e.t === 'sleep') {
        k = e.k;
        if (k.type === 'c' && tr.pending[k.id] != null) {
          addResult(tr, tr.pending[k.id], PAPER_TEXT.resultAgentLate, { sub: true, key: k.id, err: 'time' });
          delete tr.pending[k.id];
        } else if (k.type === 'f') {
          for (var j = tr.papers.length - 1; j >= 0; j--) {
            var p = tr.papers[j];
            if (p.ctx && !p.out && p.key === k.id) { p.out = true; p.life = 0; tr.forgotten++; tr.version++; break; }
          }
        }
      } else if (e.t === 'death') {
        think();
        if (e.cause === 'crack') {
          var ci = crackIndex(w, e.p);
          txt = storyPair(st && st.errors, ci, PAPER_TEXT.callError, '');
          id = addCall(tr, txt[0], { crack: ci });
          addResult(tr, id, PAPER_TEXT.resultHook, { err: 'hook', crack: ci });
          tr.hookNo++;
        } else {
          txt = st && st.fall ? st.fall : [PAPER_TEXT.callFall, PAPER_TEXT.resultFall];
          id = addCall(tr, txt[0], {});
          addResult(tr, id, txt[1], { err: 'fall' });
        }
      } else if (e.t === 'crateReset') {
        delete tr.pushed[e.c.id];
      }
    }
    // A tool (crate) is called once when it starts to move (pushed by Clawd or by another
    // crate, so a chain of tools shows every link); again only after it is reset.
    for (i = 0; i < w.crates.length; i++) {
      var c = w.crates[i];
      if (!c.moving || tr.pushed[c.id]) continue;
      think();
      tr.pushed[c.id] = true;
      txt = storyPair(st && st.tools, c.id, PAPER_TEXT.callTool(c.id + 1), PAPER_TEXT.resultTool(c.id + 1));
      id = addCall(tr, txt[0], { tool: c.id });
      addResult(tr, id, txt[1], { tool: c.id });
    }
    // Context clocks: a fading step's paper shows how long it stays in the context.
    for (i = tr.papers.length - 1; i >= 2; i--) {
      var q = tr.papers[i];
      if (q.ctx && !q.out) { k = w.keys[q.key]; q.life = k && k.awake ? Math.max(0, Math.min(1, k.t / w.fadeT)) : 0; }
    }
    if (w.done) {
      var awake = 0;
      for (i = 0; i < w.keys.length; i++) if (w.keys[i].awake) awake++;
      tr.reads++;
      addPaper(tr, { type: 'assistant', text: (st && st.answer) || PAPER_TEXT.assistant(awake, w.keys.length) });
      tr.done = true;
    }
  }

  // The per-task receipt: counts only, no money and no tokens.
  function transcriptReceipt(tr) {
    var calls = 0;
    for (var i = 0; i < tr.papers.length; i++) if (tr.papers[i].type === 'call') calls++;
    return {
      papers: tr.papers.length, toolCalls: calls, reads: tr.reads, hookNo: tr.hookNo,
      subagents: tr.subagents, withoutSubagents: tr.subagents * SUB_INNER, forgotten: tr.forgotten
    };
  }

  var api = {
    C: C, STAGES: STAGES, PENTA: PENTA, makeWorld: makeWorld, step: step,
    PAPER_TYPES: PAPER_TYPES, PAPER_TEXT: PAPER_TEXT, SUB_INNER: SUB_INNER, STORY: STORY, STORY_END: STORY_END, crackIndex: crackIndex, storyPart: storyPart, CLAWD: CLAWD, clawdName: clawdName,
    makeTranscript: makeTranscript, feedTranscript: feedTranscript, transcriptReceipt: transcriptReceipt
  };
  root.ChispaCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
