// Headless verification for CHISPA.
// Loads the core script embedded in chispa.html (or chispa-core.js with --src),
// measures movement capabilities, and plays every stage with a route-following bot
// on the real physics. Usage: node verify-chispa.mjs [--src]
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const useSrc = process.argv.includes('--src');
let code;
if (useSrc) {
  code = fs.readFileSync(path.join(here, 'chispa-core.js'), 'utf8');
} else {
  const html = fs.readFileSync(path.join(here, 'chispa.html'), 'utf8');
  const m = html.match(/<script id="chispa-core">([\s\S]*?)<\/script>/);
  if (!m) { console.error('core script block not found in chispa.html'); process.exit(2); }
  code = m[1];
}
const sandbox = { window: {}, Math, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const core = sandbox.window.ChispaCore;
const { C, STAGES } = core;
const DT = C.dt;

// ---------- capability measurement ----------
function withStage(def, fn) {
  STAGES.push(def);
  try { return fn(STAGES.length - 1); } finally { STAGES.pop(); }
}

function flatJump(sprint) {
  return withStage({ name: 't', hint: '', root: 60, par: 1, spawn: [0, 0, 0], solids: [[-50, 50, 50, -50, 0]], keys: [[40, 41, 40, 41, 0]], cracks: [], crates: [] }, (i) => {
    const w = core.makeWorld(i);
    for (let n = 0; n < 120; n++) core.step(w, { x: 0, z: -1, sprint });
    w.events.length = 0;
    const z0 = w.player.p[2]; let apex = w.player.p[1]; const y0 = w.player.p[1];
    let t = 0, landed = false, jumped = false;
    while (t < 3) {
      core.step(w, { x: 0, z: -1, sprint, jump: true });
      t += DT; apex = Math.max(apex, w.player.p[1]);
      for (const e of w.events) { if (e.t === 'jump') jumped = true; if (e.t === 'land' && jumped) landed = true; }
      w.events.length = 0;
      if (landed) break;
    }
    return { dist: z0 - w.player.p[2], apex: apex - y0, air: t };
  });
}

// Largest gap crossed when jumping `early` metres before the edge.
function maxGap(sprint, early, rise = 0) {
  let lo = 0.5, hi = 10;
  for (let k = 0; k < 22; k++) {
    const g = (lo + hi) / 2;
    const ok = withStage({ name: 't', hint: '', root: 60, par: 1, spawn: [0, 25, 0],
      solids: [[-2, 2, 30, 0, 0], [-2, 2, -g, -g - 12, rise]], keys: [[-1, 1, -g - 8, -g - 10, rise]], cracks: [], crates: [] }, (i) => {
      const w = core.makeWorld(i);
      for (let n = 0; n < 900; n++) {
        const P = w.player;
        const jump = P.p[2] <= early || (P.p[2] < early + 0.6 && !P.g);
        core.step(w, { x: 0, z: -1, sprint, jump });
        if (w.events.some((e) => e.t === 'death')) return false;
        if (P.g && P.p[2] < -g - 0.2) return true;
        w.events.length = 0;
      }
      return false;
    });
    if (ok) lo = g; else hi = g;
  }
  return lo;
}

// ---------- route bot ----------
// Waypoint: [x, z, flags]. Flags: j = jump on arrival, s = sprint toward it,
// w<sec> = wait on arrival, h<sec> = walk toward it for <sec> then continue.
// opts.world continues an existing world; opts.tr feeds that transcript of papers every step
// (the render does the same), opts.feed = false skips the transcript entirely.
function runRoute(index, route, limit = 240, opts = {}) {
  const w = opts.world || core.makeWorld(index);
  const feed = opts.feed !== false && typeof core.feedTranscript === 'function';
  const tr = feed ? (opts.tr || core.makeTranscript(w)) : null;
  let wi = 0, jumpHold = 0, wait = 0, hold = 0, pending = 0;
  const log = { deaths: [], completed: false, time: 0, stuckAt: null };
  let t = 0;
  while (t < limit && !w.done) {
    const P = w.player;
    const wp = route[Math.min(wi, route.length - 1)];
    const flags = wp[2] || '';
    let input = { x: 0, z: 0, jump: jumpHold > 0, sprint: false };
    if (wait > 0) { wait -= DT; }
    else if (wi < route.length && !P.dead) {
      const dx = wp[0] - P.p[0], dz = wp[1] - P.p[2], d = Math.hypot(dx, dz);
      const hm = flags.match(/h([\d.]+)/);
      let reached = d < 0.3;
      if (hm) { hold += DT; reached = hold >= parseFloat(hm[1]); }
      if (reached) {
        hold = 0;
        if (flags.includes('j')) pending = 0.5;
        const wm = flags.match(/w([\d.]+)/);
        if (wm) wait = parseFloat(wm[1]);
        wi++;
      }
      const tgt = route[Math.min(wi, route.length - 1)];
      const tx = tgt[0] - P.p[0], tz = tgt[1] - P.p[2], td = Math.hypot(tx, tz);
      if (td > 0.05 && wait <= 0) { input.x = tx / td; input.z = tz / td; }
      input.sprint = (tgt[2] || '').includes('s');
      input.jump = jumpHold > 0;
    }
    // A pending jump is pressed as soon as the player is on the ground (like a human would).
    if (pending > 0) { pending -= DT; if (P.g && jumpHold <= 0) { jumpHold = 0.4; pending = 0; } }
    input.jump = jumpHold > 0;
    jumpHold -= DT;
    core.step(w, input);
    if (tr) core.feedTranscript(tr, w.events, w);
    t += DT;
    for (const e of w.events) if (e.t === 'death') log.deaths.push({ cause: e.cause, at: e.p.map((v) => +v.toFixed(2)), wp: wi });
    w.events.length = 0;
    if (log.deaths.length > 0) break;
  }
  log.completed = w.done;
  log.time = +w.time.toFixed(2);
  log.wp = wi;
  log.awake = w.keys.filter((k) => k.awake).length + '/' + w.keys.length;
  log.pos = w.player.p.map((v) => +v.toFixed(2));
  log.crates = w.crates.map((c) => c.p.map((v) => +v.toFixed(2)));
  log.falls = w.falls;
  log.world = w;
  log.tr = tr;
  return log;
}

const ROUTES = [
  // 1 First Light
  [[0, -4], [0, -10], [0, -12.5], [5.2, -12.5, 'j'], [8.7, -12.5]],
  // 2 Bar by Bar
  [[0, -2.6], [0, -4.0, 'j'], [0, -6.6], [0, -7.4, 'j'], [0, -10], [0, -10.8, 'j'], [0, -13.4], [0, -14.2, 'j'], [0, -16.8],
    [0, -17.6, 'j'], [0, -20.2]],
  // 3 Hairline
  [[0, -3], [0, -5], [0, -6.5], [0, -9.5], [2.6, -11], [2.6, -12.5], [3, -15], [-3, -15]],
  // 4 Open Air
  [[0, -1.6, 'j'], [0, -5.5], [0, -6.2, 'j'], [0, -10.2], [1.6, -10.2, 'j'], [5.7, -10.2], [5.7, -11.1, 'j'], [5.7, -15.2],
    [5.7, -16.1, 'j'], [5.7, -20], [4.8, -20, 'j'], [0.8, -20]],
  // 5 Heavy Door
  [[2, -1], [0, -4.5], [0, -7.0], [-1.6, -7.0], [-2, -11], [2, -13]],
  // 6 Climbing Crates
  [[-5.5, -0.6], [-5.5, -6.6], [-5.5, -4.6], [-5.5, -6.2, 'j'], [-5.5, -7.5], [-5.5, -7.7, 'j'], [-5.6, -11], [-3, -11], [0, -12],
    [3.5, -0.3], [5.5, -0.6], [5.5, -6.6], [5.5, -4.6], [5.5, -6.2, 'j'], [5.5, -7.5], [5.5, -7.7, 'j'], [5.7, -11]],
  // 7 Long Jump
  [[0, 1.5], [0, -4.5, 'sj'], [0, -11.5, 's'], [0, -12.9, 'sj'], [0, -19.7, 's'], [0, -21.2, 'sj'], [0, -28, 's'],
    [1.1, -28, 'j'], [5, -28], [5, -26.6], [5, -29.6, 'sj'], [5, -36, 's']],
  // 8 Fading Light
  [[-4.75, -2.25], [0.75, -2.25], [0.2, -3.1, 'j'], [0, -6.75], [0.9, -6.75, 'j'], [4.5, -6.75], [4.5, -7.65, 'j'], [4.5, -11.25],
    [3.6, -11.25, 'j'], [0, -11.25], [-0.9, -11.25, 'j'], [-4.5, -11.25], [-4.5, -10.35, 'j'], [-4.5, -6.75]],
  // 9 Under the Frame
  [[-2.4, 0.5], [0, 0.6], [0, -6.65, 'w0.5'], [0, -0.2], [2.4, 0.5], [0, -0.5], [0, -12], [-2, -13.5], [2, -15.5], [0, -17.5]],
  // 10 Full Bloom
  [[-2, -1], [0, -2.6, 'j'], [0, -6.5], [0, -8.9], [-2.2, -11], [0, -9.3], [0, -11.65, 'sj'], [0, -19, 's'], [0.8, -17.3], [2, -17.3],
    [2, -20.65], [2, -19], [2, -20.3, 'j'], [2, -21.5], [2, -21.7, 'j'], [2.2, -23.5], [-2.2, -23.5], [0, -24.2], [0, -24.6, 'j'], [0, -28],
    [-2.25, -30], [2.6, -30, 'sj'], [7.5, -30, 's'], [7.5, -30.65, 'j'], [7.5, -34.2], [6.85, -34.2, 'j'], [3.3, -34.2],
    [2.65, -34.2, 'j'], [-0.9, -34.2], [-0.9, -35.0, 'j'], [-0.9, -38.4], [-0.9, -39.2, 'j'], [0, -44.5]]
];

export { core, runRoute, ROUTES, flatJump, maxGap };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const walk = flatJump(false), run = flatJump(true);
  console.log('Capabilities (flat ground, full hold):');
  console.log(`  apex height ${walk.apex.toFixed(2)} m, airtime ${walk.air.toFixed(2)} s`);
  console.log(`  walk jump distance ${walk.dist.toFixed(2)} m, sprint jump distance ${run.dist.toFixed(2)} m`);
  const gw = maxGap(false, 0.05), gs = maxGap(true, 0.05);
  const gwl = maxGap(false, 0.6), gsl = maxGap(true, 0.6);
  console.log(`  max gap, jumping at the edge:     walk ${gw.toFixed(2)} m, sprint ${gs.toFixed(2)} m`);
  console.log(`  max gap, jumping 0.6 m early:     walk ${gwl.toFixed(2)} m, sprint ${gsl.toFixed(2)} m`);
  console.log(`  sprint gap with +0.6 m rise (edge): ${maxGap(true, 0.05, 0.6).toFixed(2)} m`);
  let fails = 0;
  STAGES.forEach((s, i) => {
    if (!ROUTES[i]) { console.log(`Stage ${i + 1} ${s.name}: no route`); fails++; return; }
    const r = runRoute(i, ROUTES[i]);
    const ok = r.completed && r.deaths.length === 0;
    if (!ok) fails++;
    console.log(`Stage ${i + 1} ${s.name.padEnd(16)} ${ok ? 'PASS' : 'FAIL'}  time ${r.time}s  keys ${r.awake}  par ${s.par}` +
      (ok ? '' : `  wp ${r.wp}/${ROUTES[i].length} pos ${r.pos} deaths ${JSON.stringify(r.deaths)} crates ${JSON.stringify(r.crates)}`));
  });

  // ---------- mechanics checks: each stage's new idea is actually needed ----------
  console.log('Mechanics checks:');
  const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
  const noSprint = (route) => route.map((w) => [w[0], w[1], (w[2] || '').replace('s', '')]);
  const r7 = runRoute(6, noSprint(ROUTES[6]), 30);
  check('Long Jump cannot be finished without sprint', !r7.completed && r7.deaths.length > 0, `walk-only bot: ${r7.deaths.length ? 'fell at wp ' + r7.deaths[0].wp : 'no death'}`);
  const r10 = runRoute(9, noSprint(ROUTES[9]), 60);
  check('Full Bloom sprint gap needs sprint', !r10.completed && r10.deaths.length > 0);
  // Under the Frame: run straight through the corridor without touching the crates' slot first.
  const w9 = core.makeWorld(8); w9.crates.forEach((c) => { c.p = [5, -50, 5]; c.start = [5, -50, 5]; });
  let died9 = false;
  for (let n = 0; n < 600 && !died9; n++) { const P = w9.player; core.step(w9, { x: -P.p[0] * 2, z: -1, sprint: true, jump: P.p[2] < -5.6 }); died9 = w9.events.some((e) => e.t === 'death'); w9.events.length = 0; }
  check('Under the Frame: the cracked trench cannot be crossed without crates (sprint-hop under the roof)', died9);
  // Climbing Crates: the high blocks are out of reach from the floor.
  const w6 = core.makeWorld(5); w6.player.p = [-5.5, 0.37, -7.2]; let maxY = 0;
  for (let n = 0; n < 240; n++) { core.step(w6, { x: 0, z: -1, jump: n < 60 }); maxY = Math.max(maxY, w6.player.p[1]); w6.events.length = 0; }
  check('Climbing Crates: ledge (top 2.6) unreachable from the floor without a crate', w6.player.p[1] < 1, `highest center ${maxY.toFixed(2)} m`);
  // Cracked key kills, and respawn takes under a second.
  const w3 = core.makeWorld(2); w3.player.p = [-2, 0.37, -1.8]; let deathAt = -1, respawnAt = -1;
  for (let n = 0; n < 400 && respawnAt < 0; n++) { core.step(w3, { x: 0, z: -1 }); for (const e of w3.events) { if (e.t === 'death' && deathAt < 0) deathAt = n; if (e.t === 'respawn') respawnAt = n; } w3.events.length = 0; }
  check('Cracked key kills on touch and respawn happens in under a second', deathAt >= 0 && respawnAt > deathAt && (respawnAt - deathAt) * DT < 1, `respawn after ${((respawnAt - deathAt) * DT).toFixed(2)} s`);
  // Awake keys stay awake after a death.
  const w1 = core.makeWorld(3); w1.keys[0].awake = true; w1.player.p = [0, 0.37, 2.9];
  for (let n = 0; n < 400; n++) { core.step(w1, { x: 0, z: 1 }); w1.events.length = 0; }
  check('Normal keys stay awake after falling into the clouds (stage 4)', w1.keys[0].awake && w1.falls >= 1);
  // Stages 1 and 2 cannot be failed in their opening seconds: hold any sideways or backward direction,
  // walking or mashing jump while sprinting, or simply hold forward, for 3 s.
  for (const si of [0, 1]) {
    let deaths = 0, firstKeyAwake = 0, runs = 0;
    const dirs = [[0, 1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -0.2], [-1, -0.2]];
    const cases = [];
    for (const [dx, dz] of dirs) for (const jump of [false, true]) cases.push({ dx, dz, jump, sprint: true });
    cases.push({ dx: 0, dz: -1, jump: false, sprint: false });
    for (const k of cases) {
      const w = core.makeWorld(si); runs++;
      for (let n = 0; n < 360; n++) { core.step(w, { x: k.dx, z: k.dz, jump: k.jump && n % 50 < 25, sprint: k.sprint }); if (w.events.some((e) => e.t === 'death')) deaths++; w.events.length = 0; }
    }
    const wf = core.makeWorld(si);
    for (let n = 0; n < 240; n++) core.step(wf, { x: 0, z: -1 });
    firstKeyAwake = wf.keys[0].awake;
    check(`Stage ${si + 1}: no death in the first 3 s (15 input patterns); walking forward wakes the first key`, deaths === 0 && firstKeyAwake, `${deaths} deaths in ${runs} runs`);
  }
  // The first cracked key of stage 3 is off the path: walking straight ahead never touches it.
  const w3b = core.makeWorld(2); let d3 = 0;
  for (let n = 0; n < 240; n++) { core.step(w3b, { x: 0, z: -1 }); if (w3b.events.some((e) => e.t === 'death')) d3++; w3b.events.length = 0; }
  check('Stage 3: the first cracked key is off the straight path', d3 === 0 && w3b.keys[0].awake);
  // Fading key sleeps after its timer; chord key sleeps when its partner is not woken in time.
  const w8 = core.makeWorld(7); const fk = w8.keys[1]; w8.player.p = [(fk.box.min[0] + fk.box.max[0]) / 2, 0.37, (fk.box.min[2] + fk.box.max[2]) / 2];
  for (let n = 0; n < 30; n++) core.step(w8, { x: 0, z: 0 });
  const wasAwake = fk.awake; w8.player.p = [-1, 0.37, 0];
  let sleptAt = -1; for (let n = 0; n < 1200 && sleptAt < 0; n++) { core.step(w8, { x: 0, z: 0 }); if (!fk.awake) sleptAt = n; }
  check('Fading key falls asleep after its timer', wasAwake && sleptAt > 0, `after ${(sleptAt * DT).toFixed(2)} s, timer ${w8.fadeT} s`);
  const wc = core.makeWorld(9); const ck = wc.keys[2]; wc.player.p = [(ck.box.min[0] + ck.box.max[0]) / 2, 3.57, (ck.box.min[2] + ck.box.max[2]) / 2];
  for (let n = 0; n < 20; n++) core.step(wc, { x: 0, z: 0 });
  const cAwake = ck.awake; wc.player.p = [0, 3.57, -23.5];
  for (let n = 0; n < 480; n++) core.step(wc, { x: 0, z: 0 });
  check('Chord key alone falls asleep after the chord window', cAwake && !ck.awake && !ck.locked);
  // ---------- papers: the context board (S1 to S5 of TASK-educativa.md) ----------
  console.log('Paper checks (context board):');
  const hasPapers = typeof core.makeTranscript === 'function' && typeof core.feedTranscript === 'function' && typeof core.transcriptReceipt === 'function';
  check('Core exposes makeTranscript, feedTranscript and transcriptReceipt', hasPapers);
  if (hasPapers) {
    const TYPES = ['system', 'user', 'call', 'result', 'assistant'];
    // Every rule a finished transcript must keep. Returns a list of problems (empty = fine).
    const audit = (tr) => {
      const bad = [], P = tr.papers;
      if (!P.length || P[0].type !== 'system') bad.push('first paper is not the system prompt');
      if (P.length < 2 || P[1].type !== 'user') bad.push('second paper is not the user message');
      P.forEach((p, i) => { if (!TYPES.includes(p.type)) bad.push(`paper ${i} has type ${p.type}`); if (!p.text) bad.push(`paper ${i} has no text`); });
      const calls = P.filter((p) => p.type === 'call'), results = P.filter((p) => p.type === 'result');
      calls.forEach((c, n) => {
        if (c.id !== n + 1) bad.push(`call ${n} has number ${c.id}, expected ${n + 1}`);
        const rs = results.filter((r) => r.id === c.id);
        if (rs.length !== 1) bad.push(`call #${c.id} has ${rs.length} results`);
        else if (rs[0].i < c.i) bad.push(`result #${c.id} comes before its call`);
      });
      results.forEach((r) => { if (!calls.some((c) => c.id === r.id)) bad.push(`result #${r.id} has no call`); });
      if (P.filter((p) => p.type === 'system' || p.type === 'user').length !== 2) bad.push('system prompt or user message repeated');
      const asst = P.filter((p) => p.type === 'assistant');
      if (asst.length !== 1 || P[P.length - 1].type !== 'assistant') bad.push('the assistant message is not the single last paper');
      // Receipt (S5): it must match the papers actually emitted.
      const rc = core.transcriptReceipt(tr);
      if (rc.papers !== P.length) bad.push(`receipt papers ${rc.papers} != ${P.length}`);
      if (rc.toolCalls !== calls.length) bad.push(`receipt tool calls ${rc.toolCalls} != ${calls.length}`);
      const turns = new Set(calls.map((c) => c.turn)).size;
      if (rc.reads !== turns + 1) bad.push(`receipt reads ${rc.reads} != ${turns} call turns + 1 final read`);
      if (rc.hookNo !== results.filter((r) => r.err === 'hook').length) bad.push('receipt hook count does not match the hook papers');
      if (rc.subagents !== results.filter((r) => r.sub && !r.err).length) bad.push('receipt subagent count does not match the subagent papers');
      if (/\$|USD|token/i.test(JSON.stringify(rc))) bad.push('receipt mentions money or tokens');
      return bad;
    };
    // S1 + S5 on every stage's bot run.
    const allBad = [];
    const runs = STAGES.map((s, i) => runRoute(i, ROUTES[i]));
    runs.forEach((r, i) => { const b = audit(r.tr); if (b.length) allBad.push(`stage ${i + 1}: ${b[0]}`); });
    check('S1/S5 every stage: five paper types, system + user first, each tool call numbered with exactly one matching result, assistant last, receipt matches the papers', allBad.length === 0, allBad.slice(0, 3).join('; ') || runs.map((r) => core.transcriptReceipt(r.tr).papers).join('/') + ' papers');
    // S8: feeding the transcript never changes the physics.
    const same = STAGES.every((s, i) => { const a = runs[i], b = runRoute(i, ROUTES[i], 240, { feed: false }); return a.time === b.time && a.falls === b.falls && a.completed === b.completed && JSON.stringify(a.pos) === JSON.stringify(b.pos); });
    check('S8 the transcript is read-only: every route has the same time, falls and end position with and without it', same);
    // S3: a hook refuses stepping on an error; the refusal is a paper and the task goes on.
    const wh = core.makeWorld(2), th = core.makeTranscript(wh); wh.player.p = [-2, 0.37, -1.8];
    let resp = false;
    for (let n = 0; n < 400 && !resp; n++) { core.step(wh, { x: 0, z: -1 }); core.feedTranscript(th, wh.events, wh); resp = wh.events.some((e) => e.t === 'respawn'); wh.events.length = 0; }
    const hookP = th.papers.find((p) => p.type === 'result' && p.err === 'hook');
    const hookCall = hookP && th.papers.find((p) => p.type === 'call' && p.id === hookP.id);
    const rh = runRoute(2, ROUTES[2], 240, { world: wh, tr: th });
    check('S3 touching an error: the hook says no, "ERROR · hook dijo no" enters the context with its call number, and the task still completes', !!hookP && hookP.text === 'ERROR · hook dijo no' && !!hookCall && rh.completed && audit(th).length === 0 && core.transcriptReceipt(th).hookNo === 1,
      hookP ? `#${hookP.id} ${hookCall && hookCall.text} -> ${hookP.text}; ${audit(th)[0] || 'audit clean'}` : 'no hook paper');
    // S4: each subagent adds exactly one paper to the main context, and the receipt shows the contrast.
    const t10 = runs[9].tr, rc10 = core.transcriptReceipt(t10);
    const agentCalls = t10.papers.filter((p) => p.type === 'call' && p.sub);
    const subResults = t10.papers.filter((p) => p.type === 'result' && p.sub);
    check('S4 stage 10: four subagents, one result paper each, receipt contrasts with the papers they kept apart',
      agentCalls.length === 4 && subResults.length === 4 && agentCalls.every((c) => subResults.filter((r) => r.id === c.id).length === 1) && rc10.subagents === 4 && rc10.withoutSubagents === 4 * core.SUB_INNER && core.SUB_INNER > 1,
      `${agentCalls.length} Agent calls, ${subResults.length} subagent papers, without subagents ${rc10.withoutSubagents}`);
    // S4 failure path: a subagent whose partner never arrives still answers with exactly one (error) paper.
    const wl = core.makeWorld(9), tl = core.makeTranscript(wl), lk = wl.keys[2];
    wl.player.p = [(lk.box.min[0] + lk.box.max[0]) / 2, 3.57, (lk.box.min[2] + lk.box.max[2]) / 2];
    for (let n = 0; n < 20; n++) { core.step(wl, { x: 0, z: 0 }); core.feedTranscript(tl, wl.events, wl); wl.events.length = 0; }
    wl.player.p = [0, 3.57, -23.5];
    for (let n = 0; n < 480; n++) { core.step(wl, { x: 0, z: 0 }); core.feedTranscript(tl, wl.events, wl); wl.events.length = 0; }
    const lateCall = tl.papers.find((p) => p.type === 'call' && p.sub), late = lateCall && tl.papers.filter((p) => p.type === 'result' && p.id === lateCall.id);
    check('S4 a lone subagent times out with exactly one error paper under its call number', !!late && late.length === 1 && late[0].err === 'time');
    // Context mechanic on the board: a fading step that sleeps marks its paper as out of the context.
    const wf8 = core.makeWorld(7), tf8 = core.makeTranscript(wf8), fk8 = wf8.keys[1];
    wf8.player.p = [(fk8.box.min[0] + fk8.box.max[0]) / 2, 0.37, (fk8.box.min[2] + fk8.box.max[2]) / 2];
    for (let n = 0; n < 30; n++) { core.step(wf8, { x: 0, z: 0 }); core.feedTranscript(tf8, wf8.events, wf8); wf8.events.length = 0; }
    const ctxP = tf8.papers.find((p) => p.type === 'result' && p.ctx);
    const lifeBefore = ctxP ? ctxP.life : -1;
    wf8.player.p = [-1, 0.37, 0];
    for (let n = 0; n < 1200 && fk8.awake; n++) { core.step(wf8, { x: 0, z: 0 }); core.feedTranscript(tf8, wf8.events, wf8); wf8.events.length = 0; }
    check('S2 a fading step that goes dark takes its paper out of the context (the board shows it)', !!ctxP && lifeBefore > 0.9 && ctxP.out === true && ctxP.life === 0 && core.transcriptReceipt(tf8).forgotten === 1);

    // ---------- narrative (N1 to N8 of TASK-narrativa.md) ----------
    console.log('Narrative checks:');
    const GENERIC = [/^paso\(\d+\)$/, /^paso \d+ listo$/, /^herramienta\(\d+\)$/, /^herramienta \d+ movida$/, /^paso\(error\)$/, /^saltar\(\)$/,
      /^ERROR · caída$/, /^Agent\("paso \d+"\)$/, /^subagente: paso \d+ listo$/, /^Listo: \d+ de \d+ pasos completos\.$/, /Pisar un error no está permitido/];
    const isPair = (x, n) => Array.isArray(x) && x.length >= n && x.slice(0, n).every((t) => typeof t === 'string' && t.trim().length > 0);
    const dataBad = [];
    STAGES.forEach((s, i) => {
      const st = s.story, tag = `stage ${i + 1}`;
      if (!st) { dataBad.push(`${tag}: no story`); return; }
      for (const f of ['ask', 'answer', 'done', 'concept']) if (typeof st[f] !== 'string' || !st[f].trim()) dataBad.push(`${tag}: no ${f}`);
      if (!Array.isArray(st.legend) || !st.legend.length || st.legend.length > 4 || !st.legend.every((l) => isPair(l, 2))) dataBad.push(`${tag}: legend must have 1 to 4 lines`);
      if (!Array.isArray(st.steps) || st.steps.length !== s.keys.length || !st.steps.every((p) => isPair(p, 2))) dataBad.push(`${tag}: one [call, result] per step`);
      if (!Array.isArray(st.tools) || st.tools.length !== s.crates.length || !st.tools.every((p) => isPair(p, 3))) dataBad.push(`${tag}: one [call, result, label] per tool`);
      if (!Array.isArray(st.errors) || st.errors.length !== s.cracks.length || !st.errors.every((p) => isPair(p, 2))) dataBad.push(`${tag}: one [call, label] per error panel`);
      if (!isPair(st.fall, 2)) dataBad.push(`${tag}: no fall texts`);
      // The mission card explains every kind of thing this world has.
      const kinds = new Set(st.legend.map((l) => l[0]));
      const need = [];
      if (s.cracks.length) need.push('error');
      if (s.crates.length) need.push('tool');
      if (s.keys.some((k) => k[5] === 'c')) need.push('pair');
      if (s.keys.some((k) => k[5] === 'f')) need.push('context');
      need.forEach((k) => { if (!kinds.has(k)) dataBad.push(`${tag}: legend misses ${k}`); });
      // Short and key: texts read at a glance.
      if (st.ask.length > 70 || st.answer.length > 90 || st.done.length > 110 || st.concept.length > 110) dataBad.push(`${tag}: a text is too long`);
      if (st.legend.some((l) => l[1].length > 125)) dataBad.push(`${tag}: a legend line is too long`);
    });
    check('N1/N2/N5 all 10 tasks carry a story: request, mission legend (one line per kind of thing in the world), step, tool, error and fall texts, answer, "what happened" and concept', dataBad.length === 0, dataBad.slice(0, 3).join('; '));
    const textBad = [];
    runs.forEach((r, i) => {
      const st = STAGES[i].story, P = r.tr.papers;
      P.forEach((p) => { if (GENERIC.some((re) => re.test(p.text))) textBad.push(`stage ${i + 1}: generic "${p.text}"`); });
      if (st && P[1].text !== st.ask) textBad.push(`stage ${i + 1}: user message is not the story request`);
      if (st && P[P.length - 1].text !== st.answer) textBad.push(`stage ${i + 1}: assistant message is not the story answer`);
    });
    check('N3 every paper of every task uses the story text (no generic paso(3) or paso 3 listo left); user message = request, assistant message = answer', textBad.length === 0, textBad.slice(0, 3).join('; '));
    // N4: the refused call names the made-up answer of the panel that was touched.
    const hc = th.papers.find((p) => p.type === 'call' && p.crack != null);
    const claim = hc && STAGES[2].story.errors[hc.crack];
    check('N4 task 3: the refused tool call is the made-up answer written on the touched panel', !!claim && hc.text === claim[0] && core.crackIndex(wh, [0, 0.4, -12.5]) === 3, hc ? `${hc.text} (panel «${claim && claim[1]}»)` : 'no refusal');
    // A fall is a story step that went wrong, too.
    const wf4 = core.makeWorld(3), tf4 = core.makeTranscript(wf4);
    for (let n = 0; n < 600 && !wf4.falls; n++) { core.step(wf4, { x: 0, z: -1 }); core.feedTranscript(tf4, wf4.events, wf4); wf4.events.length = 0; }
    const fp = tf4.papers.find((p) => p.type === 'result' && p.err === 'fall');
    check('N3 a fall enters the context with the task\'s own story text', !!fp && fp.text === STAGES[3].story.fall[1], fp ? fp.text : 'no fall');
    // Task 9: both tools of the chain enter the context, recipe first.
    const t9 = runs[8].tr.papers.filter((p) => p.type === 'call' && p.tool != null).map((p) => p.text);
    check('N3 task 9: the tool chain shows both links in order (recipe, then shopping list)', t9.length === 2 && /^receta/.test(t9[0]) && /^lista_compras/.test(t9[1]), t9.join(' -> '));
    // Mission progress: one short, unique part per step, so the pills read as the parts of the request.
    const partBad = [];
    STAGES.forEach((s, i) => {
      const parts = s.story.steps.map((p) => core.storyPart(p[0]));
      if (parts.some((p) => !p || p.length > 22)) partBad.push(`stage ${i + 1}: empty or long part`);
      if (new Set(parts).size !== parts.length) partBad.push(`stage ${i + 1}: repeated part (${parts.join(', ')})`);
    });
    check('H4 every task has one short, unique progress part per step', partBad.length === 0, partBad.slice(0, 2).join('; ') || STAGES.map((s) => s.story.steps.length).join('/') + ' parts');
    // C4: personalising is writing the system prompt; with no name the papers are today's.
    const sysOf = (opts) => core.makeTranscript(core.makeWorld(0), opts).papers[0].text;
    const today = 'Eres Clawd, un asistente. Ayuda al usuario con su noche de juegos. No inventes datos: usa solo datos comprobados.';
    const named = sysOf({ name: '  Lu <b>&amp;</b>  ' });
    const long = sysOf({ name: 'x'.repeat(40) });
    check('C4 the system prompt carries the chosen name; no name, blank or default name gives today\'s text; names are one short line',
      sysOf() === today && sysOf({ name: '' }) === today && sysOf({ name: '   ' }) === today && sysOf({ name: 'Clawd' }) === today &&
      named === today.replace('Eres Clawd,', 'Eres Lu <b>&amp;</b>,') && long === today.replace('Eres Clawd,', 'Eres ' + 'x'.repeat(core.CLAWD.nameMax) + ',') &&
      core.clawdName('a\nb\tc') === 'a b c', named);
    check('N6 the story has a closing for the end of task 10', typeof core.STORY_END === 'string' && core.STORY_END.length > 40 && core.STORY_END.length < 260);
  }
  // Robustness: every route still passes with waypoints jittered by up to 0.12 m.
  console.log('Robustness (20 jittered runs per stage, waypoints moved up to 0.12 m):');
  let seed = 12345; const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  STAGES.forEach((s, i) => {
    let ok = 0;
    for (let k = 0; k < 20; k++) {
      const route = ROUTES[i].map((w) => [w[0] + (rand() - 0.5) * 0.24, w[1] + (rand() - 0.5) * 0.24, w[2]]);
      const r = runRoute(i, route, 120);
      if (r.completed && r.deaths.length === 0) ok++;
    }
    console.log(`  Stage ${String(i + 1).padStart(2)} ${s.name.padEnd(16)} ${ok}/20`);
    if (ok < 16) fails++;
  });
  process.exitCode = fails ? 1 : 0;
}
