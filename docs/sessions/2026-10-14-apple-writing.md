# 2026-10-14 - The window's words, to Apple's writing guidelines

Part of a sweep of every repository asked for by the user: the text in each
window to follow Apple's Human Interface Guidelines on writing, with the
rules Noterator settled in its decision 0053.

## What changed

- **Knob, toggle and select labels** were all capitals and abbreviated
  ("VEL SCALE", "TRIG QUANT", "REGION ST", "HUMAN VEL"). They are title style
  and spelled out now, matching the slider names REAPER shows: "Velocity
  Scale", "Trigger Quantize", "Region Start", "Humanize Velocity". Both
  "KEY TRACK"s are "Key Tracking".
- **Tabs**: "PLAY | WARP + LOOP | AMP + FILTER | SLICE | GRANULAR" became
  "Play | Warp and Loop | Amp and Filter | Slice | Granular".
- **Values**: "st" is "semitones", "bt" is "beats", the speed multiplier is
  "×1.000" (a multiplication sign, not an x).
- **Header**: "MIDI SAMPLER" is "MIDI Sampler". The phrase summary was
  "20 notes   4.00 beats   src 120.0 BP" - cut off in a render, because 212 px
  was too narrow. It is "20 notes · 4.00 beats · 120.0 BPM · 4/4" now,
  right-aligned in a wider box; the file button narrowed from 380 to 340 px to
  make room (its click area moved with it, 300-640).
- **Status line**: the mode reads "Classic", not "classic", and the hint
  ("ctrl-drag = fine   double-click = reset   ctrl-click roll = add marker
  right-click roll = remove", also cut off) is "Command-drag to fine-tune ·
  Double-click to reset · Markers: Command-click to add, right-click to remove".
  ⌘ was tried first and drew as an empty box in ysfx, whose font lacks it;
  Apple's own style spells "Command-click" out in running text anyway.
- **Slider names and enum lists** (what REAPER's parameter and automation lists
  show): "Env Amount" and "Env Curve" are "Envelope Amount" and "Envelope
  Curve", "Filter Key Track" is "Filter Key Tracking", and "Rate (pitch)",
  "Free (source tempo)", "Sync (project)" take capitals. Numbers, order,
  defaults and ranges are untouched, so saved projects and automation keep
  working.
- **The importer** (`midular_import.lua`, file name unchanged so the action
  keeps its name): its messages say what happened and then what to do -
  "“song.mid” couldn’t be read. It isn’t a Standard MIDI File." instead of
  "Could not read that file: not a Standard MIDI File (no MThd chunk)"; "There
  are no notes to import." instead of "No notes were found - nothing to
  import."; the success message ends "To use it, click the file name at the
  top of Midular’s window and choose it." The file dialog's title is "Choose a
  MIDI File to Import into Midular"; the undo point "Import MIDI Source into
  Midular".

## Left alone

- The "MIDULAR" wordmark in the header: it is the plug-in's logo, not a label.
- The select boxes' short option names ("Free", "Rate", "Ignore"): the box is
  106 px wide and the full names would not fit; the full names are in the
  slider enum lists, which REAPER shows.
- "note 60" style readouts and "(no source)": already plain.

## Verification

`python3 tests/test_midular.py` 55 passed, `lua5.4 tests/test_import.lua` 18
passed. All five tabs rendered before and after through ysfx (Reverberator's
`tools/build/gui`) and looked at: nothing overflows. Not yet seen in REAPER.
