# CLAUDE.md

Working notes for Midular, a MIDI sampler written in JSFX (EEL2) for REAPER.
`README.md` documents the plug-in for users; this file is the stuff you need
before changing the code.

## Testing

JSFX only runs inside REAPER, so `tests/` carries a small EEL2 interpreter and
JSFX host stub that load the real `.jsfx` and its imports, run the sections, and
inspect the MIDI that comes out. **Run both suites after any change** — they are
the only verification available without the DAW.

```
python3 tests/test_midular.py     # 102 checks: engine, modes, slicing, env, filter,
                                  #   import hand-over, project state, UI
lua5.4  tests/test_import.lua      # 38 checks: SMF reader, .txt writer, gmem writer,
                                  #   picking the Midular instance
```

The interpreter lives in `tests/eel2.py` (lexer/parser), `tests/runtime.py`
(evaluator, builtins, host stubs) and `tests/jsfx.py` (section splitting,
imports). If you use an EEL2 feature the project does not use yet, you will
probably have to teach the interpreter about it — that is expected and cheap.
It does not implement FFT/MDCT, `@sample`, MIDI buses or real drawing, and
`gfx_showmenu()` always returns "nothing selected". `Host.save_state()` /
`load_state()` drive `@serialize` in both directions, and `runtime.GMEM` is
the shared `gmem[]` (one namespace, shared by every `Host`, like REAPER).

The import hand-over is tested **across the two languages**: `gmem_dump.lua`
runs the importer's real `write_gmem` against a stub and prints the mailbox,
and `test_midular.py` feeds that to the real plug-in. So a layout change on
one side only fails the suite. Those checks need `lua5.4` (or `lua`) on the
PATH; without it they are reported as SKIPPED, not passed.

**The harness was written by the same hand as the plug-in, so it shares its
assumptions.** Every bug found so far in REAPER or in review sat exactly where
the harness was more lenient than EEL2 (scientific notation, `%` past 32 bits).
When you learn how EEL2 really behaves, make the harness *refuse* the wrong
thing rather than just fixing the code. And test the factory defaults: the
original one-shot/slice tests switched Loop off, which hid the fact that with
the shipped settings those modes never stopped.

The harness is ~1000x slower than real JSFX. **This says nothing about the
plug-in's performance**: EEL2 is JIT-compiled to native code, so 256 grains is
cheap in REAPER. Don't "optimise" based on harness timings.

## JSFX / EEL2 constraints that shaped this design

These were all confirmed against the official reference (reaper.fm/sdk/js) and
several of them are not obvious.

**Language**

- **No recursion.** A function may only call functions declared *before* it.
  This is why `import` order in `Midular.jsfx` is core → engine → ui, and why
  e.g. `md_voice_kill` is declared above `md_voice_release`. Sorting and binary
  search are iterative for the same reason (`md_heapsort`, `md_find_ev`).
- **No scientific notation.** `1.0e-9` lexes as the number `1.0` followed by the
  identifier `e`, and REAPER rejects it: `syntax error: '... 1.0 <!> e-9'`.
  Write every constant out in full (`0.000000001`). This shipped once, in 45
  places; `tests/eel2.py` now raises on it by name so it cannot recur.
- **`$'c'` is the documented form for a character code**, not bare `'c'`. The
  graphics reference shows font flags as `'b'`/`'i'`/`'u'` in prose, which is not
  a promise about the lexer — use `$'b'`.
- **`%` is integer-only, and only safe below 2^31.** It truncates the absolute
  values of both operands to (at most) 32-bit integers; beyond that the result
  depends on the CPU. The original Park-Miller generator did `(s * 16807) %
  2147483647`, which needs ~46 bits, so in REAPER "random" collapsed into a
  3-value cycle (random direction always reverse, humanize only ever quieter).
  Use `md_wrap_int(x, m)` (floor-based, exact below 2^53) for big values and
  for float modulo. The harness now raises on an out-of-range `%`.
- **`==` is fuzzy** (equal within 1e-5), and conditionals treat any value with
  magnitude below 1e-5 as false. Use `===` when you need exactness.
- **Imported files must only *define functions* in their `@init`.** Statements
  placed there are not guaranteed to run when the importing file has its own
  `@init`. All initialisation happens in `Midular.jsfx`'s `@init`, which calls
  `md_init_consts()` / `md_ui_consts()` / `md_build_ui()` / `md_reset_state()`.
- `sliderN:name=default<...>` variable-name syntax would break `slider(i)`
  access, which the table-driven GUI depends on. That is why sliders are plain
  `sliderN` and `md_apply_params()` fans them out into named globals by hand.
- **A `@gfx` canvas does not replace the sliders — REAPER stacks the sliders
  above it.** With 55 of them the canvas ends up far below the fold, which looks
  exactly like "the GUI isn't there". Every slider the panel draws therefore
  carries the documented `-` prefix on its description
  (`slider2:0<0,3,1{...}>-Mode`), which hides it from the plug-in UI while
  leaving it active, automatable and visible under the Param button. A test
  asserts this so a newly added slider cannot push the canvas down again.
  `slider1` (Source File) is deliberately left visible as a fallback until the
  in-GUI file menu is confirmed working in REAPER.

**Files**

- There is **no reliable way to read arbitrary binary bytes.** You get media
  files via `file_riff`, numeric tokens from `.txt`, and a `file_string` that is
  only documented as binary-safe inside `@serialize`. Hence: no SMF parsing in
  JSFX, and the `.txt` token format in `docs/FORMAT.md`.
- A file slider (`slider1:/midular:default.txt:Source File`) browses
  `<REAPER resource path>/Data/<dir>` and lists only `.wav`, `.txt`, `.ogg` and
  `.raw`. The format had to be one of those; `.txt` is the readable one.
- A `.txt` opened with `file_open()` tokenises into numbers separated by commas
  or newlines. `#` and `;` start comments, and `NAME = 1.0` lines are consumed as
  symbolic constants rather than records.
- **`file_open(slider1)` and `strcpy_fromslider(str, slider1)` need the literal
  `sliderN` token at the call site.** The compiler special-cases it; you cannot
  pass the value through a variable or a function parameter. That is why the
  file is opened inline in `@block` rather than inside a loader function.
- `md_load_handle()` reads exactly `noteCount` records from the header instead of
  relying on EOF detection, because text-mode `file_avail()` semantics at the
  last token are ambiguous in the docs.

**Sections and state**

- `ext_noinit = 1` stops `@init` running on every transport start. Combined with
  a **non-empty `@serialize`** (which prevents memory being re-zeroed), the
  loaded phrase survives playback starts. Both are required; don't remove either.
- `@serialize` may run before `@init`, so it calls `md_init_consts()` first —
  otherwise the memory-map constants are 0 and it would write over the note
  buffer at address 0.
- **MIDI processing belongs in `@block`**, with sample offsets inside the block.
  There is no `@sample` section and there shouldn't be.
- **`tempo`, `beat_position`, `play_state` and `ts_num`/`ts_denom` are not valid
  in `@gfx`.** Cache anything the UI needs during `@block` — `md_ratio` exists
  purely because the status line used to call `md_warp_ratio()` from `@gfx`.
- `@gfx` runs on a different thread from audio. UI writes to shared memory
  (markers, sliders) are racy by design; keep them small and idempotent.

## ReaScript API (verified against the v7.79 reference)

Every `reaper.*` call in `Scripts/midular_import.lua` — all 45, including the
gmem hand-over and instance lookup added later — has been checked against the
official signatures; return counts and argument order are correct as written.
The ones worth remembering because they are easy to get wrong:

- `CountProjectMarkers(proj)` returns **three** values; the first is the combined
  marker+region count that `EnumProjectMarkers(idx)` indexes over. Its `retval`
  is an integer (0 = no more), while its `isrgn` is a Lua boolean.
- `TimeMap_GetTimeSigAtTime(proj, time)` returns `num, denom, tempo` — tempo
  last, not first.
- `MIDI_CountEvts` returns `retval, notecnt, cccnt, textsyxcnt`; the note count is
  the *second* value.
- `GetTakeMarker(take, idx)` returns the position in **take source seconds**, so
  converting to an item position needs `(src - D_STARTOFFS) / D_PLAYRATE`.
- `GetUserFileNameForRead(fn, title, defext)` — filename buffer first, title second.
- `GetTouchedOrFocusedFX(1)` returns `ok, trackidx, itemidx, takeidx, fxidx,
  parm`: `trackidx` -1 is the master, `itemidx` -1 means a track FX, and `fxidx`
  may carry 0x1000000 (record-input FX) or 0x2000000 (container), which the
  `TrackFX_*` calls accept as-is. The deprecated `GetFocusedFX` returns
  `GetFocusedFX2() & 3` (1 = track FX) with a 1-based track number, 0 = master.
- `gmem_read` / `gmem_write` take indices in `[0, 1<<25)`; the mailbox uses
  about 164k.
- `TrackFX_GetParam` returns `value, min, max` — native units, which is why the
  importer reads the ticket back to confirm `TrackFX_SetParam` took it.

## Architecture invariants

- **One absolute sample clock.** `md_now` advances by `samplesblock` each block;
  everything (voice starts, note-offs, grain cycles, quantised triggers) is
  scheduled in absolute samples and converted to a block offset only at
  `midisend` time.
- **Reverse is a mirrored timeline, not a backwards scan.** Forward playback
  walks source time; reverse walks `srclen - t`. Two pre-sorted index arrays
  (`ORD_FWD`/`KEY_FWD` and `ORD_REV`/`KEY_REV`) let both directions use the same
  monotonically increasing scan, so note lengths survive and ping-pong is just a
  segment mirror plus a re-seek (`md_stream_end`).
- **Stream pool indices are fixed:** voice `i` owns stream `i`; grain `g` owns
  stream `MAX_VOICES + g`. Voices reserve a *contiguous* run of grain slots
  (`md_grain_reserve`), shrinking the request if the pool is busy.
- **Output notes are keyed by `chan*128 + pitch`.** A pair can only sound once at
  a time in MIDI, so `md_note_on` emits the previous note-off first. Never emit a
  note-on you cannot later turn off: if the 512-slot pool is full the note is
  dropped deliberately.
- **Voice speed is recomputed every block.** A voice stores only its own factor
  (`V_RATESC`, the key-tracking pitch ratio); `md_render_block` multiplies it by
  the current `md_base_rate`, so held keys follow tempo, Speed and Warp.
- **Note-ons due after this block are queued, not clamped** (`PEND`,
  `md_note_on` → `md_pend_flush`). Humanize can push a note up to 60 ms late.
  Queue slots are free when their owner is `-1` — voice 0 is a real owner, so
  `md_reset_state` must clear the queue rather than rely on zeroed memory.
- **Whether a voice ignores note-off is decided at trigger time** (`V_HOLD`:
  One-Shot, or Slice with Gate "Until Slice End"). A hold voice must have a
  natural end, so for it Loop Count 0 means "play once", not "forever"
  (`md_voice_start`, `md_stream_end`). Never let a voice exist that neither
  note-off nor its own timeline can end.
- **CC64 is consumed.** Midular applies the pedal to its own voices; passing it
  on would make the instrument sustain every generated note as well.
- **Marker edits are mirrored into `MARKERS_SV` immediately**
  (`md_markers_edited`), because a reload restores from there. Picking a
  different phrase clears `md_mark_edited` so the new phrase keeps its own
  markers; a project/preset load (`md_ser_loaded`) does not.
- **The file-menu scan raises `md_scanning`** while it steps `slider1` from
  `@gfx`, and `@block` ignores `slider1` until it drops — otherwise the audio
  thread loads every phrase the scan passes over.
- **A phrase reaches the engine through STAGE, and only `@block` installs it.**
  Three routes fill STAGE: the importer (gmem, via `md_ticket_poll`, which
  runs from both `@slider` and `@block`), `@serialize` reading a project, and
  — for the `.txt` fallback — nothing (files load straight in `@block`).
  `md_install_stage()` copies STAGE into `BUF_NOTES` on the audio thread,
  because that thread is the one reading the notes. All three layouts (gmem
  mailbox, STAGE, CURHDR) share the *phrase block* offsets `PB_*`;
  `Scripts/midular_import.lua` mirrors them in its `G` table. Change both.
- **The gmem mailbox is addressed by ticket.** `gmem` is one namespace for
  every instance, so the script writes the phrase, sets `G_STATE` to ready
  *last*, and only then puts the ticket on one instance's hidden `slider57`
  (Import Ticket) with `TrackFX_SetParam`. The instance whose ticket changed,
  and matches `G_TICKET`, copies it, sets `G_STATE` to taken and echoes the
  ticket in `G_ACK` (the script waits up to 2 s for that). `md_ticket_seen` is
  saved in the project so a restored ticket is never a new request.
- **The playing phrase is saved in the project** (`@serialize` version 2) —
  whether it came from the importer or a `.txt`. `md_src_kind` says where it
  came from: 0 built-in pattern (not saved), 1 file, 2 embedded (imported or
  restored). A kind-2 phrase is never replaced by the file slider's value,
  only by the user *changing* it. CURHDR mirrors the playing phrase's header
  (`md_sync_cur`) so serialize writes every kind the same way; a phrase still
  waiting in STAGE is saved instead, because the importer's undo point can be
  taken before `@block` installs it.
- **For 0.3 s after `@serialize` reads, slider1 changes are part of the
  restore** (`md_restore_left`), not the user picking a file. REAPER may apply
  the slider and the state a block or two apart; without the window, undo
  could load a file over the restored phrase. Storing slider1's value in the
  state was tried and rejected: on another machine with fewer files REAPER
  clamps the slider, and the mismatch then reads as a pick.
- **Some globals must not be initialised in `@init`** — `md_stage_ready`,
  `md_ticket_seen`, `md_mark_edited`, `md_restore_left`, `md_ser_*` —
  because `@serialize` can run first and they carry what it restored.
- **Parameters fan out in `@block`, not `@slider`.** The GUI writes sliders
  directly, and the host does not reliably re-run `@slider` for those writes.
  `@slider` only sets `md_slice_dirty`.
- Slice rebuilding is guarded by a hash of everything it depends on
  (`md_apply_params`), so it is not recomputed every block.
- The memory map is one place: `md_init_consts()` in `midular_core.jsfx-inc`.
  Change offsets there and nowhere else, and mind the `MAX_*` ceilings
  (32768 notes, 256 markers, 128 slices, 16 voices, 256 grains, 512 sounding,
  256 queued note-ons, 128-byte phrase names). The gmem mailbox needs about
  164k slots for a full phrase.

## Adding or changing a parameter

A slider lives in two places that must agree:

1. the `sliderN:` declaration in `Midular.jsfx`
2. a matching `md_ctl_cell(...)` in `md_build_ui()`, which repeats the default,
   min, max and step so the knob can map its range

`md_apply_params()` then needs a line to read it. The UI test asserts that every
slider from 2 upwards has exactly one control, that control defaults match the
declarations, that nothing falls outside the window and that no two controls
share a cell — so a mismatch fails the suite rather than shipping.

## State as of the last REAPER session (parked)

Confirmed working in REAPER 7 on macOS:

- it compiles, and `import <name>.jsfx-inc` resolves from the plug-in's own
  folder with all four files side by side in `Effects/Midular/`
- all 55 parameters parse with the right defaults and enum labels (`slider57`,
  Import Ticket, has been added since)
- the file slider finds `Data/midular/default.txt`
- the `@gfx` panel renders once the sliders are hidden
- idle cost is negligible (0.03% CPU)

Still unverified, in rough order of likelihood:

1. **The gmem import, end to end.** The script's API calls are verified (see
   above); what the reference cannot say is how the JSFX side behaves:
   - The hidden slider's parameter name reads back as `Import Ticket` (the
     script also accepts `-Import Ticket`).
   - `TrackFX_SetParam` on a JSFX slider takes the slider's own units. The
     script reads the value back and retries with `TrackFX_SetParamNormalized`
     if not, so either way should work.
   - `@slider` runs on `TrackFX_SetParam` even with the transport stopped, and
     `gmem[]` is usable there. If not, the import still lands on the next
     `@block`; the script then reports that it is waiting.
   - `options:` accepts `gmem=Midular` alongside `no_meter gfx_hz=30`.
   - A phrase of thousands of notes in `@serialize`: project size, load time,
     and whether REAPER stores the values at full precision.
   - Undo/redo of an import, and that opening the project elsewhere plays the
     stored phrase whatever `Data/midular/` holds.
2. The file-list enumeration in `md_scan_files()`, which steps `slider1` and
   reads back `strcpy_fromslider` to discover the available phrases. `slider1`
   stays visible until this and item 1 are confirmed, so there is always a way
   to pick a phrase.
3. Exact text-mode `file_avail()` behaviour at EOF (mitigated as described above)
4. `sliderchange()` / `slider_automate()` masks for sliders above 32, where the
   bitmask exceeds 32 bits
5. Whether the engine actually sounds right — it was parked before playing
   through it in anger. The harness proves the note output is what the design
   intends; it says nothing about whether the design is musical.

**Parked with known rough edges.** The owner's verdict after first load was that
it "needs a lot of work"; the specifics were not captured. Treat the UI polish,
default parameter values and the feel of each mode as open questions rather than
settled, and check these notes before suspecting the engine of a bug.

**Reading a failure:** REAPER prints the first compile error at the top of the FX
window and then falls back to the generated slider UI, because the header parses
even when the code does not. So read the error line first; the compiler stops at
the first error, so fixing one can reveal the next. Note that "sliders and no
custom GUI" has *two* possible causes — a compile error, or visible sliders
pushing the `@gfx` canvas below the fold (see the `-` prefix note above). If
there is no error message, it is the second one.

## Agreed next steps

From an October 2026 review:

1. ~~Fix the defaults and the bugs the review found.~~ Done — see the
   invariants above and the `factory settings`, `randomness`, `timing` and
   `phrases and markers` tests.
2. ~~Import through `gmem` and save the phrase in the project.~~ Done in the
   code and tests; still to confirm in REAPER (item 1 above). Once it is, the
   `.txt` route can shrink: hide `slider1`, drop `md_scan_files` and the file
   button, and make the importer's file fallback an explicit "export" action.
   Useful findings from the API reference that still apply:

   - `TrackFX_SetNamedConfigParm`'s `FILE` / `FILEx` values are **RS5k only** —
     there is no named-config route to a JSFX file slider. Don't go looking.
   - Find the instance with `GetTouchedOrFocusedFX(1)` (`GetFocusedFX` is
     deprecated; the script falls back to it only on builds without the new
     call), then confirm it before touching anything — the script does that by
     requiring the Import Ticket parameter, which survives renaming.
   - `TrackFX_GetFormattedParamValue` renders a file slider as its
     **filename** — match on that, never on alphabetical order, if a script
     ever has to drive `slider1`.

3. **Rework grains.** A grain currently fires only the notes whose *start*
   falls inside its window, at their full source length. So a grain over a held
   chord is silent, and short grains don't shorten anything. A grain should play
   every note that *overlaps* its window, clipped to the grain's length.

## Conventions

- GPL v3; every source file carries a short header comment.
- Comments explain *why* — particularly where a JSFX constraint forced the shape
  of the code. Don't strip those; they are the map back to this file.
