# CHISPA integration contract

_Kept as it was used while building the game: one main session, a UI worker and an audio worker, then one session per layer. "Session" means a Claude Code session._

> **Tu Clawd (2026-11-11, `feat/tu-clawd`).** Additive.
> 1. Core: `CLAWD` (colors, the first being today's Clawd; body boxes; six cube accessories plus
>    "ninguno") shared by the render and the share card; `clawdName(name)` (one line, at most 16
>    characters, never empty); `makeTranscript(world, { name })` writes the name into the system
>    prompt, and with no name the text is exactly today's.
> 2. UI: screen `'clawd'` ("Tu Clawd", from the title; its layer is `#ch-tuclawd` because `.ch-clawd`
>    is the Clawd icon's class), screen `'share'` (the 1080x1350 card, from Tu Clawd and the finale),
>    `look()` -> `{ name, color, acc }` (name already safe), and the `on.clawd(look)` callback on every
>    change. The look is stored under `chispa.clawd.v1`; `chispa.v1` is never written by it.
> 3. Shell: `applyLook(look)` repaints the Clawd and builds the accessory on the body (render only),
>    a `'clawd'` mode with a close-up camera for the preview, the name passed to `makeTranscript`.
>    Keys typed into a text field never reach the game. `showTitle`/`showSelect` clear `ch-sweep`.

> **Mission HUD (2026-11-11, `feat/hud-mision`).** Additive, plus one layering fix.
> 1. Core: `storyPart(call)`, the short name of a step for the mission progress (unique per task;
>    the verifier checks it). Three calls renamed so their parts do not repeat.
> 2. UI: the context board is now the context panel: "Contexto · lo que Clawd sabe", the request
>    (user message) always on top, the request's progress (one pill per step, lit while its result is
>    in the context), a window of 40 places that fills with one chip per paper, the newest papers
>    unclipped, and a "Misión" button. New calls: `fly({ type, id, text, call?, err?, sub? }, x, y)`
>    (a paper born at viewport point x, y that travels to the panel), `mission(i, true)` (reopen
>    mid-task; leaves the hint alone), `missionReopened()`. The pause has "Ver la misión".
> 3. Shell: records the papers each physics step adds and flies the results, subagent calls and the
>    answer from where they happened (step, crate, error panel, fall spot, Clawd). Enter closes a
>    shown mission card; a reopened card closes after 0.6 s of movement.
> 4. Layering fix: `#ch-ui > *` (id specificity) beat the UI's `pointer-events: none` on the HUD
>    and touch layers, so on touch screens the touch layer took every tap meant for the HUD (the
>    pause button too, already in v4). Both layers now take no events themselves, and the touch layer
>    is built before the HUD so HUD buttons sit above it. On touch screens the mission card takes no
>    events either (a stick drag may start over it; it closes by moving or with "Misión"), and during
>    the end-of-task sweep nothing in `#ch-ui` takes events.

> **Narrative layer (2026-11-11, `feat/narrativa`).** All additive except two noted behaviors.
> 1. Core: `STORY` (one entry per stage, also attached as `STAGES[i].story`) holds every story word:
>    `ask`, `legend` ([kind, text], kind `move|step|error|tool|gap|context|pair`), `steps` ([call, result, label?]
>    per key), `tools` ([call, result, label] per crate), `errors` ([call, label] per crack), `fall`,
>    `answer`, `done`, `concept`; plus `STORY_END` and `crackIndex(world, p)`. The per-stage `ask`
>    field from the educational layer is gone (moved into `story.ask`).
> 2. Transcript: papers use the story texts. A crate is now a tool call when it **starts to move**
>    (pushed by Clawd or by another crate), not only when Clawd pushes it, so a chain of tools shows
>    every link. Refusal papers carry `crack` (the panel index).
> 3. UI: `mission(stageIndex | null)` shows or hides the mission card (request + what this world
>    means); it holds the stage hint until it closes; a click on it closes it. The result card adds
>    "Qué pasó" (`story.done` + `story.concept`) next to the receipt. The finale shows `STORY_END`.
> 4. Shell: shows the mission card on every task start (under the anchor phrase at chapter starts),
>    hides it on the first move or Enter; story tip on the first refused made-up answer of a task;
>    3D labels (world-sized sprites) on error panels, tools and task 3's checked data.
>    Behavior change: the Space press that skips the anchor phrase or Observar no longer also jumps.

> **Educational layer (2026-11-11, `feat/capa-educativa`).** One session now owns every part.
> All additive; no event shape, file name, global or save key changed.
> 1. Core: each stage has `ask` (the user message). New pure API on `ChispaCore`, no DOM:
>    `makeTranscript(world)`, `feedTranscript(tr, events, world)` (call after every `step`,
>    before the events are cleared), `transcriptReceipt(tr)`, plus `PAPER_TYPES`, `PAPER_TEXT`,
>    `SUB_INNER`. The transcript only reads the world; the verifier proves the physics is the
>    same with and without it. Paper: `{ i, type, id?, text, err?: 'hook'|'fall'|'time', sub?, ctx?, key?, life?, out, turn? }`.
> 2. UI: `context(tr)` every frame while playing (re-renders only when `tr.version` changes);
>    `anchor(chapterName | null)` shows or hides the chapter's anchor phrase; `show('complete', { ..., receipt })`
>    adds the receipt; new screen `'glossary'` ("Actores y papeles"), opened by the UI itself from
>    the title and the pause, Esc or Volver goes back.
> 3. Shell: feeds the transcript, starts each chapter (tasks 1, 4 and 8) with the anchor phrase
>    unless the same task is being replayed, and shows a one-time tip the first time an error is touched.
> 4. Paper colors and icons are fixed for the whole game (`--ch-p-*` in `chispa-ui.css`, `PAPER_ICON`
>    in `chispa-ui.js`): system prompt slate, user message sky blue, tool call terracotta,
>    tool result amber, assistant message green. Errors keep the type color and add a red outline;
>    subagent papers add a violet ring; a paper out of the context is hollow with a teal outline.

> **Core changes by the main session, 2026-11-10.** All additive; no event shape was changed.
> 1. `melody` entries also carry `k` (key index) so the render can flash each key during replay: `{ n, t, k }`.
> 2. Chord keys also use `k.t`: seconds left in the chord window (fading keys: seconds before sleep). Keys also have `id`, `group` (chord pair id, -1 otherwise) and `locked` (chord pair completed).
> 3. `world.time` starts on the first movement or jump input, not at stage load. `world.started` tells which.
> 4. Extra world fields audio may read in `handle(events, world)`: `world.pushing` (the crate being pushed this step, or null), `world.player` (`p` position, `v` velocity, `g` grounded, `dead`), `world.boxes` (cracked keys have `kind === 'crack'`, `min`/`max` corners) for a proximity buzz, `world.fadeT` / `world.chordT` (full timer lengths).
> 6. **Polish round 1 (main session):** silver is now `par * 1.4` (gold stays `par`). Every `par` in `STAGES` is retuned to about 1.3 times the bot time. Stages may carry an optional `teach` array (`[{ at: [x, z], r, prompt?, tip? }]`): render-only data that the UI can ignore.
> 5. The render calls `ChispaUI.record()` itself on completion, then `show('complete', ...)` once the melody replay and camera sweep end. The UI should not record again inside `show`.

Three sessions build CHISPA in parallel. This file is the only agreement between them.
If something here is wrong or missing, do not work around it silently: write the problem
at the top of your report and pick the closest reading.

## Ownership (nobody edits a file they do not own)

| File | Owner | Role |
|------|-------|------|
| `chispa-core.js`, `verify-chispa.mjs` | main session; educational layer session since 2026-11-11 | physics, stages, events, papers transcript. Read-only for workers |
| render, camera, main loop, keyboard gameplay input | main session | Three.js scene and glue |
| `chispa-audio.js` | audio worker | all sound |
| `chispa-ui.js`, `chispa-ui.css` | UI worker | every screen, HUD, touch controls, saved progress |
| `chispa.html` (final single file) and `dist/` | main session | inlines the parts above |

## Rules for every part

- Plain scripts, not ES modules. Each file is one IIFE that defines exactly one global:
  `window.ChispaCore`, `window.ChispaAudio`, `window.ChispaUI`. No other globals.
- No libraries, no external files, no images. Fonts: Google Fonts only, optional.
- DOM ids and CSS classes are prefixed `ch-`. CSS custom properties are prefixed `--ch-`.
- A part must not throw if another part is missing (the dev pages load one part alone).
- All UI copy in English.
- The parts get inlined into one HTML file: no `</script>` inside string literals, no
  dependence on file paths or load order beyond "core first".

## Core, as it exists today (read `chispa-core.js` for the exact shapes)

`ChispaCore` exposes the constants, the `STAGES` array (`name`, `hint`, `root` as a MIDI
note, `par` in seconds, optional `fade` and `chord`), `makeWorld`, and `step`.
The world has `time` (starts on the first input), `started`, `falls`, `done`, `melody` (`[{ n, t, k }]`, `n` in semitones above the
stage root, `t` in seconds, `k` the key index), `pushing` (crate being pushed or null), `player`, `boxes`, `keys`, `crates`,
`fadeT`, `chordT`, `bounds`, and `events`, refilled every step.

Events (`t` is the type): `jump {sprint}`, `land {s}` (impact speed), `step {s}`,
`wake {k}`, `sleep {k}`, `chord {keys}`, `death {cause, p}`, `respawn`, `crateReset {c}`,
`complete`. A key `k` has `note` (semitones above the stage root), `type` (`'n'` normal,
`'f'` fading, `'c'` chord), `awake`, `t` (seconds left: fading keys before sleep, chord keys in the pair window),
`id`, `group` (chord pair, -1 otherwise), `locked` (chord pair done).
The pitch of a key is MIDI `stage.root + k.note`.

## Shared look (so render and UI match)

```
--ch-indigo: #1d1a3f;   deep dusk sky, panel backgrounds
--ch-plum:   #4a2a5e;   mid sky
--ch-coral:  #ff7a59;   horizon, primary accent
--ch-amber:  #ffb347;   awake keys, lantern light, highlights
--ch-teal:   #2ec4b6;   secondary accent, fading-key timers
--ch-cream:  #fff3dc;   text
--ch-wood:   #8a5a3c;   sleeping keys, wooden UI details
--ch-crack:  #2a1f24;   hazards
```

Warm, soft and handcrafted: rounded shapes, wood and lantern light. Not a neon grid, not
a generic dark dashboard. Medals: gold `#ffcf5c`, silver `#d8dee6`, bronze `#c9814f`.

## `ChispaAudio` (audio worker implements, main session calls)

```
unlock()                 call inside the first user gesture; creates or resumes the AudioContext
setStage(stage)          stage object from ChispaCore.STAGES; sets the root note and restarts ambience
handle(events, world)    every frame, with the events produced by the steps of that frame
playMelody(melody, root) plays the composed melody back, compressed to a pleasant length;
                         returns its duration in seconds
ui(name)                 'move' | 'select' | 'back' | 'start' | 'pause' | 'resume' | 'medal-gold'
                         | 'medal-silver' | 'medal-bronze' | 'unlock' | 'finale'
setPaused(bool)          duck or suspend sound while the game is paused
setMuted(bool) / isMuted()
setAmbient(bool) / isAmbient()
```

Every method is safe to call before `unlock()` and when Web Audio is unavailable.

## `ChispaUI` (UI worker implements, main session calls)

```
init({ root, stages, on, sfx })
    root    element that overlays the canvas; the UI builds all its DOM inside it
    stages  ChispaCore.STAGES
    on      callbacks the UI calls: play(stageIndex), retry(), next(), resume(), pause(),
            quit() (back to stage select), mute(bool), ambient(bool)
    sfx     function(name) -> the main session wires it to ChispaAudio.ui
show(screen, data)
    'title'
    'select'
    'playing'   data: { stageIndex }   shows the HUD and the stage hint caption
    'paused'
    'complete'  data: { stageIndex, time, falls, melodyDuration }  result card with medal
    'finale'    after the last stage
hud({ time, falls, awake, total, fading })   cheap, called every frame while playing;
                                             fading = seconds left on the most urgent fading key, or null
input()            -> { x, z, jump, sprint }  touch state; x and z in [-1, 1], forward is z = -1,
                                             jump and sprint are held states. All zero on non-touch devices
record(stageIndex, time, falls) -> { medal, best, isNewBest }   saves and returns the result
progress()         -> [{ best, medal, unlocked }] per stage
screen()           -> current screen name
```

Keyboard: the main session owns gameplay keys while `screen() === 'playing'` (WASD,
arrows, Space, Shift, R) and calls `on`-equivalent transitions itself for Esc and M.
The UI owns keyboard navigation of its own menus (arrows, Enter, Esc) on every other
screen, and Esc on `'paused'` resumes.

Medals: gold at or under `par`, silver at or under `par * 1.4` (changed in polish round 1, was 1.5), bronze for any other
completion. A stage unlocks when the previous one has any medal. Progress is stored in
`localStorage` under `chispa.v1`, wrapped in try/catch; without storage the game still
works for the session.

## Polish round 1: self-explaining play (added by the orchestrator session)

New `ChispaUI` calls (UI worker implements, main session calls):

```
prompt(name | null)   'move' | 'jump' | 'sprint' | 'push' | 'restart' | 'skip' | null
                      a small control card near the bottom centre showing HOW to do the action:
                      key caps on keyboard devices, a picture of the touch control on touch
                      devices. No sentences, at most two words. Stays until prompt(null).
                      Calling it with the name already shown does nothing.
tip(text, seconds)    a one-line caption in the hint slot; seconds defaults to 4.
```

The main session decides when to call them. The UI never decides game state.

Naming: the game's name, the instrument fantasy and the stage names are about to change.
Every fantasy word (game name, tagline, what a "key" is called, stage names, hint text)
must live in data or in one constants block per file, never scattered through code or
CSS, so the rename is one small edit per file.

## Identity round: "CLAWD: EL LOOP" (added by the orchestrator session)

Read `TASK-chispa-identity.md`. All player-facing text is now Spanish; the rule "All UI
copy in English" above no longer applies. The marimba and lantern fantasy is gone.

New `ChispaUI` call (UI worker implements, main session calls):

```
loop(phase)   'observar' | 'pensar' | 'actuar' | 'verificar' | 'reintento' | null
              lights the matching step of the loop indicator in the HUD. 'reintento'
              flashes briefly and the UI returns by itself to 'actuar'. null hides it.
```

`ChispaUI.progress()` reports every stage as unlocked while "Modo demo" is on.

### Palette, identity round (main session)

The render now uses these; the older tokens above stay valid for compatibility.

```
--ch-terracotta: #d97757;   Clawd, primary accent
--ch-clay:       #c0674a;   platform sides, pressed accent
--ch-sand:       #efe2cc;   platform tops, light panels
--ch-cream:      #fff3dc;   text on dark, step panels (#fbf3e6 in 3D)
--ch-amber:      #ffb347;   completed steps, highlights
--ch-teal:       #2ec4b6;   contexto (fading) clocks and beacons
--ch-violet:     #8c7ae6;   subagentes (paired steps), their bead link and beacons
--ch-error:      #ff3d5a;   errors (glitch panels), danger glow
--ch-indigo:     #1d1a3f;   dusk sky top, dark panels
```
