/* CHISPA audio: every sound is synthesized with the Web Audio API.
   No samples, no libraries. Defines exactly one global: window.ChispaAudio. */
(function (root) {
  'use strict';

  var AC = root.AudioContext || root.webkitAudioContext || null;

  var VOICE_CAP = 36;      // simultaneous one-shot voices (melody and UI are exempt)
  var MUSIC_CAP = 80;      // scheduled melody voices
  var DEFAULT_ROOT = 60;

  var ctx = null;
  var failed = false;
  var bus = null;          // { master, comp, world, worldLP, worldPause, sfx, music, amb, ui }
  var noiseBuf = null;

  var muted = false;
  var ambientOn = true;
  var paused = false;
  var stageRoot = DEFAULT_ROOT;
  var stageSet = false;

  var voices = [];         // live one-shot voices { end, kill, prio, music }
  var pad = null;          // current ambient pad
  var duckUntil = 0;
  var duckTimer = null;
  var melodyVoices = [];

  var lastStepAt = 0;
  var stepFlip = false;
  var lastSleepAt = 0;
  var lastCrateAt = 0;
  var lastLandAt = 0;

  /* ---------- helpers ---------- */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function now() { return ctx ? ctx.currentTime : 0; }

  function live() {
    return !!(ctx && bus && !failed && !muted && ctx.state !== 'closed');
  }

  function ctxOK() { return !!(ctx && bus && !failed && ctx.state !== 'closed'); }

  function safe(fn) {
    return function () {
      try { return fn.apply(null, arguments); }
      catch (e) { return undefined; }
    };
  }

  function makeNoise() {
    var len = Math.floor(ctx.sampleRate * 1.2);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function build() {
    ctx = new AC();
    var master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 14;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
    var limiter = ctx.createDynamicsCompressor();   // fast safety stage
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;
    master.connect(comp);
    comp.connect(limiter);
    limiter.connect(ctx.destination);

    var worldPause = ctx.createGain();
    var worldLP = ctx.createBiquadFilter();
    worldLP.type = 'lowpass';
    worldLP.frequency.value = 20000;
    worldLP.Q.value = 0.5;
    worldPause.connect(worldLP);
    worldLP.connect(master);

    var world = ctx.createGain();
    world.connect(worldPause);
    var sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(world);
    var music = ctx.createGain(); music.gain.value = 1; music.connect(world);
    var amb = ctx.createGain(); amb.gain.value = 1; amb.connect(world);
    var ui = ctx.createGain(); ui.gain.value = 0.9; ui.connect(master);
    amb.gain.value = 0.075;

    bus = { master: master, comp: comp, limiter: limiter, world: world, worldLP: worldLP,
            worldPause: worldPause, sfx: sfx, music: music, amb: amb, ui: ui };
    noiseBuf = makeNoise();
    applyPause(true);
  }

  /* ---------- voice bookkeeping (no node leaks) ---------- */

  function reap() {
    if (!ctx) return;
    var t = ctx.currentTime;
    for (var i = voices.length - 1; i >= 0; i--) {
      if (voices[i].end < t - 0.4) { voices[i].kill(); voices.splice(i, 1); }
    }
  }

  function oneShotCount() {
    var n = 0;
    for (var i = 0; i < voices.length; i++) if (!voices[i].music && !voices[i].ui) n++;
    return n;
  }

  /* A voice owns a list of nodes. It is stopped and disconnected once its last source ends,
     or by reap() if the context never delivers onended (suspended tab). */
  function makeVoice(nodes, sources, end, opt) {
    var done = false;
    var v = {
      end: end, prio: opt.prio || 0, music: !!opt.music, ui: !!opt.ui,
      kill: function () {
        if (done) return;
        done = true;
        for (var i = 0; i < sources.length; i++) {
          try { sources[i].onended = null; sources[i].stop(); } catch (e) {}
          try { sources[i].disconnect(); } catch (e3) {}
        }
        for (var j = 0; j < nodes.length; j++) {
          try { nodes[j].disconnect(); } catch (e2) {}
        }
        var ix = voices.indexOf(v);
        if (ix >= 0) voices.splice(ix, 1);
        if (v.music) { var mx = melodyVoices.indexOf(v); if (mx >= 0) melodyVoices.splice(mx, 1); }
      }
    };
    var longest = sources[0];
    for (var s = 0; s < sources.length; s++) if (sources[s]._end > longest._end) longest = sources[s];
    longest.onended = function () { v.kill(); };
    voices.push(v);
    if (v.music) melodyVoices.push(v);
    return v;
  }

  function admit(prio, music, ui) {
    if (music || ui) return true;
    reap();
    var n = oneShotCount();
    if (n < VOICE_CAP) return true;
    if (prio >= 2 && n < VOICE_CAP + 10) return true;
    return false;
  }

  /* ---------- primitive builders ---------- */

  function osc(type, freq, t0, t1) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.start(t0);
    o.stop(t1);
    o._end = t1;
    return o;
  }

  function noiseSrc(t0, dur) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = false;
    var off = Math.random() * (noiseBuf.duration - dur - 0.05);
    s.start(t0, Math.max(0, off), dur + 0.02);
    s._end = t0 + dur + 0.03;
    return s;
  }

  function env(g, t0, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  /* ---------- instruments ---------- */

  /* Marimba bar: fundamental, a 4x partial (real bars are tuned near 1:4:10), a very short
     10x knock, a mallet click of band-passed noise, and a slower resonator bloom. */
  function marimba(m, when, o) {
    o = o || {};
    var out = o.out || bus.sfx;
    var prio = o.prio || 0;
    if (!admit(prio, o.music, o.ui)) return null;
    var t = when;
    var vel = (o.vel == null ? 1 : o.vel);
    var bright = o.bright == null ? 1 : o.bright;
    var f = mtof(m) * Math.pow(2, (o.detune == null ? rnd(-6, 6) : o.detune) / 1200);
    var dur = clamp(1.05 - (m - 55) * 0.014, 0.32, 1.1) * (o.len || 1);
    var load = (o.music || o.ui) ? 1 : clamp(1 - oneShotCount() * 0.018, 0.55, 1);
    var peak = 0.3 * vel * load;
    var end = t + dur + 0.12;

    var vg = ctx.createGain();
    vg.gain.value = 1;
    vg.connect(out);
    var nodes = [vg];
    var srcs = [];

    // fundamental
    var o1 = osc('sine', f, t, end);
    var g1 = ctx.createGain();
    env(g1, t, peak, 0.003, dur);
    o1.connect(g1); g1.connect(vg);
    nodes.push(g1); srcs.push(o1);

    // upper partial near the 4th harmonic, decays about 4x faster
    if (f * 4 < 9000) {
      var o2 = osc('sine', f * 4.02, t, end);
      var g2 = ctx.createGain();
      env(g2, t, peak * 0.3 * bright, 0.002, dur * 0.26);
      o2.connect(g2); g2.connect(vg);
      nodes.push(g2); srcs.push(o2);
    }
    // tiny knock partial, gone in a few milliseconds of audible time
    if (f * 10 < 9000) {
      var o3 = osc('sine', f * 9.9, t, end);
      var g3 = ctx.createGain();
      env(g3, t, peak * 0.1 * bright, 0.001, 0.045);
      o3.connect(g3); g3.connect(vg);
      nodes.push(g3); srcs.push(o3);
    }
    // resonator bloom: a lower-key echo of the fundamental that swells slightly later
    var o4 = osc('triangle', f, t, end);
    var g4 = ctx.createGain();
    g4.gain.setValueAtTime(0.0001, t);
    g4.gain.linearRampToValueAtTime(peak * 0.2, t + 0.03);
    g4.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.1);
    var lp4 = ctx.createBiquadFilter();
    lp4.type = 'lowpass'; lp4.frequency.value = Math.min(f * 2.2, 5000);
    o4.connect(lp4); lp4.connect(g4); g4.connect(vg);
    nodes.push(g4, lp4); srcs.push(o4);

    // mallet click
    var ns = noiseSrc(t, 0.03);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = clamp(f * 3.2, 900, 4200) * rnd(0.9, 1.1);
    bp.Q.value = 1.4;
    var gn = ctx.createGain();
    env(gn, t, 0.16 * vel * bright * (o.click == null ? 1 : o.click), 0.0015, 0.022);
    ns.connect(bp); bp.connect(gn); gn.connect(vg);
    nodes.push(bp, gn); srcs.push(ns);

    return makeVoice(nodes, srcs, end, { prio: prio, music: o.music, ui: o.ui });
  }

  /* Glassy bell for celebratory sounds: inharmonic partials, long soft decay. */
  function bell(m, when, o) {
    o = o || {};
    var out = o.out || bus.sfx;
    if (!admit(o.prio || 0, o.music, o.ui)) return null;
    var t = when;
    var vel = o.vel == null ? 1 : o.vel;
    var f = mtof(m);
    var dur = (o.len || 1) * 1.3;
    var end = t + dur + 0.1;
    var vg = ctx.createGain();
    vg.connect(out);
    var nodes = [vg], srcs = [];
    var parts = [[1, 1, 1], [2.756, 0.22, 0.45], [5.404, 0.08, 0.2]];
    for (var i = 0; i < parts.length; i++) {
      var pf = f * parts[i][0];
      if (pf > 11000) continue;
      var op = osc('sine', pf, t, end);
      var gp = ctx.createGain();
      env(gp, t, 0.17 * vel * parts[i][1], 0.004, dur * parts[i][2]);
      op.connect(gp); gp.connect(vg);
      nodes.push(gp); srcs.push(op);
    }
    return makeVoice(nodes, srcs, end, { prio: o.prio || 0, music: o.music, ui: o.ui });
  }

  /* Short pitched sweep through a lowpass: jumps, respawn, falling tone, swells. */
  function sweep(f0, f1, t, dur, peak, type, out, o) {
    o = o || {};
    if (!admit(o.prio || 0, false, o.ui)) return null;
    var end = t + dur + 0.1;
    var oc = osc(type || 'sine', f0, t, end);
    oc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = o.cut || 2200; lp.Q.value = 0.4;
    var g = ctx.createGain();
    env(g, t, peak, o.attack || 0.01, dur - (o.attack || 0.01));
    oc.connect(lp); lp.connect(g); g.connect(out || bus.sfx);
    return makeVoice([lp, g], [oc], end, { prio: o.prio || 0, ui: o.ui });
  }

  /* Filtered noise burst: footsteps, thumps, cracks. */
  function burst(t, dur, type, freq, q, peak, out, o) {
    o = o || {};
    if (!admit(o.prio || 0, false, o.ui)) return null;
    var ns = noiseSrc(t, dur);
    var fl = ctx.createBiquadFilter();
    fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
    var g = ctx.createGain();
    env(g, t, peak, 0.002, dur);
    ns.connect(fl); fl.connect(g); g.connect(out || bus.sfx);
    return makeVoice([fl, g], [ns], t + dur + 0.05, { prio: o.prio || 0, ui: o.ui });
  }

  /* Soft pad swell on a set of midi notes (stage complete, chord, finale). */
  function swell(notes, t, dur, peak, out, o) {
    o = o || {};
    if (!admit(2, o.music, o.ui)) return;
    var end = t + dur + 0.2;
    var vg = ctx.createGain();
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.3;
    env(vg, t, peak, dur * 0.35, dur * 0.65);
    vg.connect(lp); lp.connect(out || bus.sfx);
    var nodes = [vg, lp], srcs = [];
    for (var i = 0; i < notes.length; i++) {
      var f = mtof(notes[i]);
      var a = osc('triangle', f * Math.pow(2, 4 / 1200), t, end);
      var b = osc('sine', f * Math.pow(2, -4 / 1200), t, end);
      a.connect(vg); b.connect(vg);
      srcs.push(a, b);
    }
    makeVoice(nodes, srcs, end, { prio: 2, ui: o.ui, music: o.music });
  }

  /* ---------- ambient pad ---------- */

  function startPad() {
    if (!ctxOK() || !ambientOn || !stageSet || pad) return;
    var t = now();
    var base = stageRoot;
    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(1, t + 3.5);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 0.5;
    out.connect(lp); lp.connect(bus.amb);
    var nodes = [out, lp], srcs = [];

    // filter breathing
    var fl = ctx.createOscillator(); fl.frequency.value = 0.045;
    var fg = ctx.createGain(); fg.gain.value = 220;
    fl.connect(fg); fg.connect(lp.frequency); fl.start(t);
    nodes.push(fg); srcs.push(fl);

    // root, fifth, octave, plus a ninth: open and mode-neutral
    var chord = [
      { m: base - 12, g: 0.5, lfo: 0.051, type: 'triangle' },
      { m: base - 5,  g: 0.34, lfo: 0.067, type: 'sine' },
      { m: base,      g: 0.3, lfo: 0.083, type: 'sine' },
      { m: base + 7,  g: 0.17, lfo: 0.109, type: 'sine' },
      { m: base + 14, g: 0.09, lfo: 0.137, type: 'sine' }
    ];
    for (var i = 0; i < chord.length; i++) {
      var c = chord[i];
      var vg = ctx.createGain();
      vg.gain.value = c.g * 0.5;
      var lf = ctx.createOscillator(); lf.frequency.value = c.lfo;
      var lg = ctx.createGain(); lg.gain.value = c.g * 0.45;
      lf.connect(lg); lg.connect(vg.gain); lf.start(t);
      for (var d = 0; d < 2; d++) {
        var o = ctx.createOscillator();
        o.type = c.type;
        o.frequency.value = mtof(c.m);
        o.detune.value = d ? 7 : -6;
        o.start(t);
        o.connect(vg);
        srcs.push(o);
      }
      vg.connect(out);
      nodes.push(vg, lg); srcs.push(lf);
    }
    pad = { out: out, nodes: nodes, srcs: srcs };
    ambLevel();
  }

  function stopPad(fade) {
    if (!pad) return;
    var p = pad;
    pad = null;
    var t = now();
    var fd = fade == null ? 1.2 : fade;
    try {
      p.out.gain.cancelScheduledValues(t);
      p.out.gain.setValueAtTime(p.out.gain.value, t);
      p.out.gain.linearRampToValueAtTime(0.0001, t + fd);
      for (var i = 0; i < p.srcs.length; i++) p.srcs[i].stop(t + fd + 0.05);
    } catch (e) {}
    var finished = false;
    function dispose() {
      if (finished) return;
      finished = true;
      for (var j = 0; j < p.srcs.length; j++) {
        try { p.srcs[j].onended = null; p.srcs[j].disconnect(); } catch (e1) {}
      }
      for (var k = 0; k < p.nodes.length; k++) {
        try { p.nodes[k].disconnect(); } catch (e2) {}
      }
    }
    p.srcs[p.srcs.length - 1].onended = dispose;
    // fallback for suspended contexts: node disposal after the fade, by wall clock
    setTimeout(dispose, (fd + 0.5) * 1000);
  }

  function ambLevel() {
    if (!bus) return;
    var t = now();
    var target = ambientOn ? (duckUntil > t ? 0.022 : 0.075) : 0;
    bus.amb.gain.cancelScheduledValues(t);
    bus.amb.gain.setValueAtTime(bus.amb.gain.value, t);
    bus.amb.gain.linearRampToValueAtTime(target, t + 0.4);
  }

  function applyPause(instant) {
    if (!bus) return;
    var t = now();
    var g = paused ? 0.32 : 1;
    var f = paused ? 700 : 20000;
    bus.worldPause.gain.cancelScheduledValues(t);
    bus.worldLP.frequency.cancelScheduledValues(t);
    if (instant) {
      bus.worldPause.gain.setValueAtTime(g, t);
      bus.worldLP.frequency.setValueAtTime(f, t);
    } else {
      bus.worldPause.gain.setTargetAtTime(g, t, 0.06);
      bus.worldLP.frequency.setTargetAtTime(f, t, 0.08);
    }
  }

  /* ---------- game sounds ---------- */

  function sWake(k) {
    var m = stageRoot + (k.note | 0);
    var fading = k.type === 'f';
    var chord = k.type === 'c';
    marimba(m, now() + 0.005, {
      vel: rnd(0.88, 1),
      bright: (fading ? 0.8 : chord ? 1.15 : 1) * rnd(0.85, 1.1),
      prio: 2
    });
    if (chord) {
      // a faint shimmer on chord keys so their wake sounds slightly "expectant"
      bell(m + 12, now() + 0.02, { vel: 0.18, len: 0.6, prio: 1 });
    }
  }

  function sSleep(k) {
    var t = now();
    if (t - lastSleepAt < 0.07) return;
    lastSleepAt = t;
    var m = stageRoot + (k.note | 0);
    var f = mtof(m);
    sweep(f, f * 0.72, t, 0.5, 0.075, 'sine', bus.sfx, { cut: 1500, attack: 0.02, prio: 1 });
    sweep(f * 2, f * 1.44, t, 0.22, 0.014, 'sine', bus.sfx, { cut: 2500, attack: 0.01, prio: 0 });
  }

  function sChord(keys) {
    var t = now() + 0.04;
    var r = stageRoot;
    // the chord keys' own notes ripple up, then resolve on the root and its fifth
    var n = Math.min(keys && keys.length ? keys.length : 0, 4);
    for (var i = 0; i < n; i++) {
      marimba(r + (keys[i].note | 0) + 12, t + i * 0.055, { vel: 0.7, bright: 1.2, prio: 2 });
    }
    var s = t + n * 0.055 + 0.07;
    marimba(r + 12, s, { vel: 0.95, bright: 1.1, prio: 2, len: 1.3 });
    marimba(r + 19, s + 0.02, { vel: 0.8, bright: 1.1, prio: 2, len: 1.3 });
    bell(r + 24, s + 0.04, { vel: 0.7, len: 1, prio: 2 });
    swell([r, r + 7, r + 16], s, 1.3, 0.05, bus.sfx);
  }

  function sJump(sprint) {
    var t = now();
    var f0 = (sprint ? 330 : 270) * rnd(0.96, 1.05);
    sweep(f0, f0 * 1.85, t, 0.11, sprint ? 0.085 : 0.065, 'sine', bus.sfx, { cut: sprint ? 3200 : 2200, prio: 1 });
    if (sprint) {
      sweep(f0 * 2, f0 * 3.2, t + 0.01, 0.09, 0.022, 'triangle', bus.sfx, { cut: 4500, prio: 0 });
      burst(t, 0.06, 'highpass', 4200, 0.7, 0.02, bus.sfx, { prio: 0 });
    }
  }

  function sLand(s) {
    var t = now();
    if (s < 2.5) return;
    if (t - lastLandAt < 0.05) return;
    lastLandAt = t;
    var v = clamp((s - 2.5) / 20, 0, 1);
    var f = rnd(130, 150);
    sweep(f * 1.1, f * 0.5, t, 0.1 + 0.1 * v, 0.07 + 0.2 * v, 'sine', bus.sfx, { cut: 500 + 800 * v, attack: 0.004, prio: 1 });
    burst(t, 0.04 + 0.06 * v, 'bandpass', 700 + 900 * v, 0.9, 0.04 + 0.14 * v, bus.sfx, { prio: 0 });
  }

  function sStep(s) {
    var t = now();
    if (t - lastStepAt < 0.08) return;
    lastStepAt = t;
    stepFlip = !stepFlip;
    var v = clamp((s || 5) / 8.6, 0.4, 1.1);
    var f = (stepFlip ? 210 : 175) * rnd(0.93, 1.07);
    sweep(f * 1.3, f * 0.8, t, 0.05, 0.05 * v, 'sine', bus.sfx, { cut: 900, attack: 0.002, prio: 0 });
    burst(t, 0.03, 'bandpass', (stepFlip ? 1700 : 1400) * rnd(0.9, 1.1), 1.1, 0.035 * v, bus.sfx, { prio: 0 });
  }

  function sDeath(cause, big) {
    var t = now();
    if (cause === 'fall') {
      // dropped into the clouds: a soft falling sigh, no rattle
      sweep(520, 150, t, 0.5, 0.07, 'sine', bus.sfx, { cut: 1100, attack: 0.03, prio: 2 });
      burst(t, 0.3, 'lowpass', 600, 0.5, 0.025, bus.sfx, { prio: 1 });
      return;
    }
    // cracked key: a quick wooden rattle plus a low, slightly beating buzz
    var offs = [0, 0.026, 0.055, 0.092, 0.138, 0.19];
    for (var i = 0; i < offs.length; i++) {
      burst(t + offs[i], 0.03, 'bandpass', rnd(700, 2400), 2.2, 0.1 * (1 - i * 0.13), bus.sfx, { prio: 2 });
    }
    var f = rnd(92, 104);
    sweep(f, f * 0.93, t, 0.3, 0.055, 'sawtooth', bus.sfx, { cut: 520, attack: 0.012, prio: 2 });
    sweep(f * 1.059, f * 0.99, t, 0.3, 0.045, 'sawtooth', bus.sfx, { cut: 480, attack: 0.012, prio: 2 });
    sweep(f * 3.4, f * 2.9, t + 0.01, 0.14, 0.012, 'square', bus.sfx, { cut: 900, attack: 0.005, prio: 1 });
  }

  function sRespawn() {
    var t = now() + 0.02;
    sweep(330, 700, t, 0.16, 0.06, 'sine', bus.sfx, { cut: 2600, attack: 0.02, prio: 1 });
    marimba(stageRoot + 12, t + 0.1, { vel: 0.4, bright: 0.9, prio: 1, len: 0.6 });
  }

  function sCrate() {
    var t = now();
    if (t - lastCrateAt < 0.08) return;
    lastCrateAt = t;
    for (var i = 0; i < 2; i++) {
      var tt = t + i * 0.085;
      sweep(rnd(260, 300) * (i ? 0.82 : 1), 150, tt, 0.07, 0.09, 'sine', bus.sfx, { cut: 900, attack: 0.002, prio: 1 });
      burst(tt, 0.04, 'bandpass', 1100, 1, 0.07, bus.sfx, { prio: 0 });
    }
    sweep(180, 420, t + 0.18, 0.12, 0.03, 'sine', bus.sfx, { cut: 1500, attack: 0.02, prio: 0 });
  }

  function sComplete() {
    var t = now() + 0.01;
    var r = stageRoot;
    var seq = [0, 7, 12, 16];
    for (var i = 0; i < seq.length; i++) {
      marimba(r + 12 + seq[i], t + i * 0.07, { vel: 0.7 + i * 0.05, bright: 1.1, prio: 2, len: 0.7 });
    }
    sweep(mtof(r + 12), mtof(r + 24), t, 0.3, 0.03, 'sine', bus.sfx, { cut: 3000, attack: 0.05, prio: 1 });
  }

  var HANDLERS = {
    wake: function (e) { if (e.k) sWake(e.k); },
    sleep: function (e) { if (e.k) sSleep(e.k); },
    chord: function (e) { sChord(e.keys || []); },
    jump: function (e) { sJump(!!e.sprint); },
    land: function (e) { sLand(+e.s || 0); },
    step: function (e) { sStep(+e.s || 5); },
    death: function (e) { sDeath(e.cause); },
    respawn: function () { sRespawn(); },
    crateReset: function () { sCrate(); },
    complete: function () { sComplete(); }
  };

  /* ---------- melody replay ---------- */

  function planMelody(melody) {
    var n = melody ? melody.length : 0;
    if (!n) return { onsets: [], span: 0 };
    var t0 = melody[0].t;
    var span = melody[n - 1].t - t0;
    var onsets = [0];
    if (n > 1) {
      var target = clamp(span * 0.3, 1.4, 4.4);
      var gap = 0.09;
      if (span <= 0.001) {
        for (var i = 1; i < n; i++) onsets.push(i * 0.26);
      } else {
        var k = target / span;
        for (var j = 1; j < n; j++) {
          var o = (melody[j].t - t0) * k;
          if (o < onsets[j - 1] + gap) o = onsets[j - 1] + gap;
          onsets.push(o);
        }
      }
      // never longer than ~6 s whatever the input
      var last = onsets[n - 1];
      if (last > 6) { var s = 6 / last; for (var q = 0; q < n; q++) onsets[q] *= s; }
    }
    return { onsets: onsets, span: onsets[n - 1] };
  }

  function duck(seconds) {
    if (!bus) return;
    var t = now();
    duckUntil = t + seconds;
    ambLevel();
    if (duckTimer) clearTimeout(duckTimer);
    duckTimer = setTimeout(function () { duckTimer = null; duckUntil = 0; safe(ambLevel)(); }, (seconds + 0.1) * 1000);
  }

  function endDuck() {
    duckUntil = 0;
    if (duckTimer) { clearTimeout(duckTimer); duckTimer = null; }
    if (ctxOK()) ambLevel();
  }

  function stopMelody() {
    var list = melodyVoices.slice();
    for (var i = 0; i < list.length; i++) list[i].kill();
    melodyVoices.length = 0;
  }

  /* ---------- public API ---------- */

  var API = {};

  API.unlock = safe(function () {
    if (failed) return;
    if (!AC) { failed = true; return; }
    if (!ctx) {
      try { build(); } catch (e) { failed = true; ctx = null; bus = null; return; }
    }
    if (ctx.state !== 'running' && ctx.resume) { var rp = ctx.resume(); if (rp && rp.catch) rp.catch(function () {}); }
    if (stageSet && ambientOn) startPad();
  });

  API.setStage = safe(function (stage) {
    var r = stage && typeof stage.root === 'number' ? stage.root : DEFAULT_ROOT;
    stageRoot = r;
    stageSet = true;
    stopMelody();
    endDuck();
    if (ctxOK()) {
      stopPad(1.2);
      if (ambientOn) startPad();
    }
  });

  API.handle = safe(function (events, world) {
    if (!live() || !events || !events.length) return;
    var sleeps = 0;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (!e) continue;
      if (e.t === 'sleep' && ++sleeps > 3) continue;
      var h = HANDLERS[e.t];
      if (h) safe(h)(e);
    }
    reap();
  });

  API.playMelody = safe(function (melody, rootNote) {
    var r = typeof rootNote === 'number' ? rootNote : stageRoot;
    var plan = planMelody(melody);
    var lead = 0.42;                 // lets the stage-complete flourish breathe first
    var tail = 1.5;                  // final chord body
    var total = lead + plan.span + 0.4 + tail;
    if (!live() || !plan.onsets.length) return total;
    stopMelody();
    var t = now() + lead;
    var n = Math.min(plan.onsets.length, MUSIC_CAP - 6);
    for (var i = 0; i < n; i++) {
      var note = melody[i];
      var m = r + (note.n | 0);
      var accent = i === n - 1 ? 1 : (i % 4 === 0 ? 0.92 : 0.8);
      marimba(m, t + plan.onsets[i], {
        out: bus.music, music: true, vel: accent * rnd(0.92, 1), bright: 1,
        detune: rnd(-2, 2), len: 0.95
      });
    }
    var fin = t + plan.span + 0.4;
    var chord = [r, r + 7, r + 12, r + 16, r + 19];
    for (var c = 0; c < chord.length; c++) {
      marimba(chord[c], fin + c * 0.022, {
        out: bus.music, music: true, vel: 0.85 - c * 0.05, bright: 1.1, detune: 0, len: 1.5
      });
    }
    bell(r + 24, fin + 0.1, { out: bus.music, music: true, vel: 0.55, len: 1.2 });
    swell([r, r + 7, r + 12], fin, 1.9, 0.045, bus.music, { music: true });
    duck(lead + plan.span + 0.4 + tail);
    return total;
  });

  var UI = {
    move: function (t) {
      var n = [84, 86, 88, 91, 93][(Math.random() * 5) | 0];
      marimba(n, t, { out: bus.ui, ui: true, vel: 0.34, bright: 0.7, len: 0.28, click: 0.7 });
    },
    select: function (t) {
      marimba(76, t, { out: bus.ui, ui: true, vel: 0.62, len: 0.5 });
      marimba(83, t + 0.06, { out: bus.ui, ui: true, vel: 0.7, len: 0.6 });
    },
    back: function (t) {
      marimba(79, t, { out: bus.ui, ui: true, vel: 0.5, len: 0.45 });
      marimba(72, t + 0.07, { out: bus.ui, ui: true, vel: 0.45, bright: 0.8, len: 0.5 });
    },
    start: function (t) {
      var seq = [60, 64, 67, 72];
      for (var i = 0; i < seq.length; i++) {
        marimba(seq[i], t + i * 0.075, { out: bus.ui, ui: true, vel: 0.65 + i * 0.07, len: 0.75 });
      }
      swell([60, 67, 72], t + 0.1, 0.8, 0.03, bus.ui, { ui: true });
    },
    pause: function (t) {
      marimba(72, t, { out: bus.ui, ui: true, vel: 0.45, bright: 0.7, len: 0.5 });
      marimba(67, t + 0.08, { out: bus.ui, ui: true, vel: 0.4, bright: 0.7, len: 0.55 });
    },
    resume: function (t) {
      marimba(67, t, { out: bus.ui, ui: true, vel: 0.42, bright: 0.8, len: 0.45 });
      marimba(72, t + 0.07, { out: bus.ui, ui: true, vel: 0.5, len: 0.55 });
    },
    'medal-gold': function (t) {
      var seq = [72, 76, 79, 84, 88];
      for (var i = 0; i < seq.length; i++) {
        marimba(seq[i], t + i * 0.085, { out: bus.ui, ui: true, vel: 0.72, bright: 1.2, len: 0.9 });
        bell(seq[i] + 12, t + i * 0.085 + 0.01, { out: bus.ui, ui: true, vel: 0.4, len: 0.8 });
      }
      var f = t + 0.5;
      [72, 79, 84, 88, 91].forEach(function (m, i) {
        bell(m, f + i * 0.02, { out: bus.ui, ui: true, vel: 0.5, len: 1.4 });
      });
      swell([60, 67, 72], f, 1.6, 0.04, bus.ui, { ui: true });
    },
    'medal-silver': function (t) {
      var seq = [72, 76, 79, 84];
      for (var i = 0; i < seq.length; i++) {
        marimba(seq[i], t + i * 0.09, { out: bus.ui, ui: true, vel: 0.62, bright: 1.05, len: 0.8 });
      }
      bell(84, t + 0.3, { out: bus.ui, ui: true, vel: 0.4, len: 1 });
      swell([60, 67], t + 0.3, 1.1, 0.025, bus.ui, { ui: true });
    },
    'medal-bronze': function (t) {
      var seq = [72, 76, 79];
      for (var i = 0; i < seq.length; i++) {
        marimba(seq[i], t + i * 0.1, { out: bus.ui, ui: true, vel: 0.55, bright: 0.9, len: 0.8 });
      }
      swell([60, 67], t + 0.2, 0.8, 0.02, bus.ui, { ui: true });
    },
    unlock: function (t) {
      burst(t, 0.03, 'bandpass', 1500, 1.2, 0.08, bus.ui, { ui: true });
      var seq = [79, 84, 91];
      for (var i = 0; i < seq.length; i++) {
        bell(seq[i], t + 0.06 + i * 0.07, { out: bus.ui, ui: true, vel: 0.55, len: 0.8 });
      }
    },
    finale: function (t) {
      var seq = [60, 64, 67, 72, 76, 79, 84];
      for (var i = 0; i < seq.length; i++) {
        marimba(seq[i], t + i * 0.11, { out: bus.ui, ui: true, vel: 0.65 + i * 0.04, bright: 1.1, len: 1 });
      }
      var f = t + seq.length * 0.11 + 0.1;
      [60, 67, 72, 76, 79, 84].forEach(function (m, i) {
        marimba(m, f + i * 0.025, { out: bus.ui, ui: true, vel: 0.8, bright: 1.1, len: 1.6 });
        bell(m + 12, f + 0.05 + i * 0.025, { out: bus.ui, ui: true, vel: 0.35, len: 1.8 });
      });
      swell([48, 55, 60, 64], f, 2.6, 0.05, bus.ui, { ui: true });
    }
  };

  API.ui = safe(function (name) {
    if (!live()) return;
    var f = UI[name];
    if (f) f(now() + 0.005);
    reap();
  });

  API.setPaused = safe(function (p) {
    paused = !!p;
    applyPause(false);
  });

  API.setMuted = safe(function (m) {
    muted = !!m;
    if (bus) {
      var t = now();
      bus.master.gain.cancelScheduledValues(t);
      bus.master.gain.setTargetAtTime(muted ? 0 : 0.85, t, 0.04);
    }
    if (muted) stopMelody();
    else if (ctxOK() && ambientOn && stageSet) startPad();
  });
  API.isMuted = function () { return muted; };

  API.setAmbient = safe(function (a) {
    ambientOn = !!a;
    if (!ctxOK()) return;
    if (ambientOn) { startPad(); ambLevel(); }
    else { stopPad(0.6); ambLevel(); }
  });
  API.isAmbient = function () { return ambientOn; };

  root.ChispaAudio = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
