#!/usr/bin/env python3
"""Executes Midular.jsfx in the mini EEL2 interpreter and checks its MIDI output.

    python3 tests/test_midular.py
"""
import os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import fixtures
from harness import Host, note_on, note_off, summarize, SRATE

JSFX = os.path.join(HERE, os.pardir, 'Midular.jsfx')
BL = 512
ARP = fixtures.arp()
FLAT = fixtures.flat()
DEMO = os.path.join(HERE, os.pardir, 'Data', 'midular', 'default.txt')

_state = {'pass': 0, 'fail': 0}


def check(label, cond, detail=''):
    good = bool(cond)
    _state['pass' if good else 'fail'] += 1
    print('  %-52s %s%s' % (label, 'ok' if good else 'FAIL', ('   ' + detail) if detail else ''))


def section(name):
    print('\n%s' % name)


def mk(setup=(), src=ARP):
    h = Host(JSFX, src)
    h.block(64)                       # first block loads the source file
    for sl, v in setup:
        h.set_slider(sl, v)
    return h


def play(h, script=None, blocks=200, tempo=120.0):
    script = script or {}
    ev, base = [], 0
    for i in range(blocks):
        ev += summarize(h.block(BL, script.get(i, []), tempo), base)
        base += BL
    return ev


def ons(ev):  return [e for e in ev if e[1] == 'on ']
def offs(ev): return [e for e in ev if e[1] == 'off']


def sounding(h):
    ip = h.ip
    base, stride, used = int(ip.g['SOUND']), int(ip.g['N_STRIDE']), int(ip.g['N_USED'])
    return sum(1 for i in range(int(ip.g['MAX_SOUND'])) if ip.mem[base + i * stride + used])


def active_voices(h):
    ip = h.ip
    base, stride = int(ip.g['VOICES']), int(ip.g['V_STRIDE'])
    return sum(1 for i in range(int(ip.g['MAX_VOICES'])) if ip.mem[base + i * stride])


def gap(ev):
    o = ons(ev)
    return round(o[1][0] - o[0][0]) if len(o) > 1 else -1


# ---------------------------------------------------------------- source load
section('source loading')
h = mk()
check('arp.txt: 8 notes, 4 beats, 120 BPM, 1 marker',
      (h.ip.g['md_src_n'], h.ip.g['md_src_len'], h.ip.g['md_src_tempo'], h.ip.g['md_nmark'])
      == (8, 4.0, 120.0, 1))
h = mk(src=DEMO)
check('shipped default.txt loads (36 notes, 8 beats, 3 markers)',
      (h.ip.g['md_src_n'], h.ip.g['md_src_len'], h.ip.g['md_nmark']) == (36, 8.0, 3))
h = Host(JSFX, os.path.join(HERE, 'does-not-exist.txt'))
h.block(64)
check('missing file falls back to the built-in pattern', h.ip.g['md_src_n'] > 0)

# --------------------------------------------------------------------- modes
section('modes')
ev = play(mk([(2, 0), (22, 1), (5, 1)]), {0: [note_on(0, 60, 100)], 400: [note_off(0, 60)]}, 460)
check('classic loops while held', len(ons(ev)) == 18, '%d note-ons' % len(ons(ev)))
check('classic: every note-on is closed', len(ons(ev)) == len(offs(ev)))

ev = play(mk([(2, 0), (22, 1), (5, 1)]), {0: [note_on(0, 67, 100)], 300: [note_off(0, 67)]}, 340)
check('classic: key tracking transposes (+7)', [e[2] for e in ons(ev)][:4] == [67, 70, 74, 77])

ev = play(mk([(2, 1), (22, 0)]), {0: [note_on(0, 60, 100)], 20: [note_off(0, 60)]}, 400)
check('one-shot plays through an early note-off', len(ons(ev)) == 8)

ev = play(mk([(2, 2), (40, 0), (41, 8), (44, 36), (22, 0)]),
          {0: [note_on(0, 36, 100)], 60: [note_on(0, 37, 100)], 120: [note_on(0, 43, 100)]}, 300)
check('slice: keys 36/37/43 select slices 1/2/8', [e[2] for e in ons(ev)] == [60, 63, 70])

ev = play(mk([(2, 2), (40, 0), (41, 8), (44, 36)]), {0: [note_on(0, 20, 100)]}, 60)
check('slice: unmapped key does not trigger', len(ons(ev)) == 0)

h = mk([(2, 3), (46, 8), (47, 0.25), (48, 0), (53, 0)])
ev = play(h, {0: [note_on(0, 60, 100)], 300: [note_off(0, 60)]}, 400)
check('granular: 8 grains produce a dense cloud', len(ons(ev)) > 100, '%d note-ons' % len(ons(ev)))
check('granular: cloud closes every note', len(ons(ev)) == len(offs(ev)))
check('granular: nothing left sounding', sounding(h) == 0 and active_voices(h) == 0)

# ------------------------------------------------------------ warp and timing
section('warping and timing')
check('warp free keeps the source tempo at 180 BPM project',
      abs(gap(play(mk([(2, 1), (14, 0), (22, 0)]), {0: [note_on(0, 60, 100)]}, 400, 180.0)) - 12000) < 3)
check('warp sync follows the project tempo',
      abs(gap(play(mk([(2, 1), (14, 1), (22, 0)]), {0: [note_on(0, 60, 100)]}, 400, 180.0)) - 8000) < 3)
check('warp fixed length stretches 4 beats to 8',
      abs(gap(play(mk([(2, 1), (14, 2), (16, 8), (22, 0)]), {0: [note_on(0, 60, 100)]}, 800)) - 24000) < 3)
check('speed x2 halves the note spacing',
      abs(gap(play(mk([(2, 1), (14, 1), (15, 2), (22, 0)]), {0: [note_on(0, 60, 100)]}, 400)) - 6000) < 3)
ev = play(mk([(2, 1), (18, 3), (22, 0)]), {0: [note_on(100, 60, 100)]}, 200)
check('trigger quantize 1/4 delays to the next beat', abs(ons(ev)[0][0] - 23936) < 700,
      'first on at %d' % ons(ev)[0][0])

# ---------------------------------------------------- looping and direction
section('looping and direction')
ev = play(mk([(2, 1), (21, 1), (22, 0)]), {0: [note_on(0, 60, 100)]}, 400)
check('reverse mirrors the phrase', [e[2] for e in ons(ev)] == [70, 67, 63, 60, 70, 67, 63, 60])
ev = play(mk([(2, 0), (22, 1), (23, 2)]), {0: [note_on(0, 60, 100)], 500: [note_off(0, 60)]}, 560)
check('ping-pong loop stays balanced', len(ons(ev)) == len(offs(ev)) and len(ons(ev)) > 16)
ev = play(mk([(2, 1), (22, 1), (26, 2)]), {0: [note_on(0, 60, 100)]}, 600)
check('loop count 2 stops after two passes', len(ons(ev)) == 16)
ev = play(mk([(2, 1), (22, 0), (19, 50), (20, 50)]), {0: [note_on(0, 60, 100)]}, 400)
check('region 50%-100% plays the second half only', len(ons(ev)) == 4)

# ------------------------------------------------------------------ slicing
section('slice analysis')
for method, name, extra, want in [(0, 'divisions', [(41, 4)], 4), (1, 'beats', [(42, 3)], 4),
                                  (2, 'onsets', [(43, 80)], 8), (3, 'pitch changes', [(43, 80)], 8),
                                  (4, 'manual markers', [], 2)]:
    h = mk([(2, 2), (40, method)] + extra)
    h.block(BL)
    check('slice by %-14s -> %d slices' % (name, h.ip.g['md_nslices']), h.ip.g['md_nslices'] == want)

# ---------------------------------------------------------------- envelope
section('amplitude envelope')
v = [e[3] for e in ons(play(mk([(2, 1), (22, 0), (7, 0), (27, 500), (28, 0)], FLAT),
                            {0: [note_on(0, 60, 100)]}, 400))]
check('attack ramps velocity up', v == sorted(v) and v[0] < 127 and v[-1] == 127, str(v[:4]))
v = [e[3] for e in ons(play(mk([(2, 1), (22, 0), (7, 0), (27, 0), (28, 1000), (29, 20)], FLAT),
                            {0: [note_on(0, 60, 100)]}, 400))]
check('decay falls to the sustain level', v[0] == 127 and v[-1] <= 30, str(v))
ev = play(mk([(2, 0), (22, 1), (7, 0), (30, 600)], FLAT), {0: [note_on(0, 60, 100)], 30: [note_off(0, 60)]}, 200)
tail = [e[3] for e in ons(ev)][-3:]
check('release fades the tail out', tail == sorted(tail, reverse=True), str(tail))
v = [e[3] for e in ons(play(mk([(2, 1), (22, 0), (7, 0), (27, 500), (31, 0)], FLAT),
                            {0: [note_on(0, 60, 100)]}, 400))]
check('env amount 0% leaves velocity untouched', all(x == 127 for x in v))

# ------------------------------------------------------------------- filter
section('note filter')
ev = play(mk([(2, 1), (22, 0), (33, 1), (34, 62), (36, 1), (39, 50)]), {0: [note_on(0, 60, 100)]}, 400)
check('lowpass at note 62 keeps only 60', sorted(set(e[2] for e in ons(ev))) == [60])
ev = play(mk([(2, 1), (22, 0), (33, 2), (34, 65), (36, 1), (39, 50)]), {0: [note_on(0, 60, 100)]}, 400)
check('highpass at note 65 keeps only 67 and 70', sorted(set(e[2] for e in ons(ev))) == [67, 70])
ev = play(mk([(2, 1), (22, 0), (33, 0)]), {0: [note_on(0, 60, 100)]}, 400)
check('filter off passes everything', len(ons(ev)) == 8)

# ------------------------------------------------------------ velocity/gate
section('velocity and gate')
for mode, want in [(0, 127), (1, 64), (2, 64)]:
    v = ons(play(mk([(2, 1), (22, 0), (7, mode)], FLAT), {0: [note_on(0, 60, 64)]}, 200))[0][3]
    check('velocity source %d -> %d' % (mode, v), abs(v - want) <= 1)
ev = play(mk([(2, 1), (22, 0), (9, 50)], FLAT), {0: [note_on(0, 60, 100)]}, 200)
check('note length 50% halves the gate (0.2 -> 0.1 beat)',
      abs((offs(ev)[0][0] - ons(ev)[0][0]) - 2400) < 40, '%d samples' % (offs(ev)[0][0] - ons(ev)[0][0]))
v = [e[3] for e in ons(play(mk([(2, 1), (22, 0), (7, 0), (11, 20), (12, 20)], FLAT),
                            {0: [note_on(0, 60, 100)]}, 200))]
check('humanize varies velocity', len(set(v)) > 1)
ev = play(mk([(2, 1), (22, 0), (10, 5), (13, 1)]), {0: [note_on(0, 60, 100)]}, 100)
check('output channel 5 and MIDI thru', 4 in set(e[4] for e in ons(ev)) and 0 in set(e[4] for e in ons(ev)))

# ----------------------------------------------------------- voice lifecycle
section('voice lifecycle')
h = mk([(2, 0), (6, 2), (22, 1)])
play(h, {0: [note_on(0, 60, 100)], 2: [note_on(0, 62, 100)], 4: [note_on(0, 64, 100)]}, 60)
check('polyphony limit steals voices', active_voices(h) <= 2)

h = mk([(2, 0), (22, 1), (30, 0)])
play(h, {0: [(0, 0xB0, 64, 127), note_on(0, 60, 100)], 10: [note_off(0, 60)], 40: [(0, 0xB0, 64, 0)]}, 80)
check('sustain pedal holds then releases', active_voices(h) == 0)

h = mk([(2, 0), (22, 1)])
play(h, {0: [note_on(0, 60, 100)]}, 30)
play(h, {0: [(0, 0xB0, 123, 0)]}, 3)
check('CC123 silences everything', sounding(h) == 0 and active_voices(h) == 0)

h = mk([(2, 0), (22, 1)])
play(h, {0: [note_on(0, 60, 100)]}, 30)
h.ip.g['play_state'] = 0.0
play(h, {}, 3)
check('stopping the transport silences everything', sounding(h) == 0 and active_voices(h) == 0)

h = mk([(2, 0), (22, 1), (30, 50)])
play(h, {0: [note_on(0, 60, 100)], 100: [note_off(0, 60)]}, 200)
check('release leaves no stuck notes', sounding(h) == 0 and active_voices(h) == 0)

t0 = time.time()
h = mk([(2, 3), (46, 256), (47, 0.1)])
ev = play(h, {0: [note_on(0, 60, 100)], 200: [note_off(0, 60)]}, 260)
check('256 grains run clean', sounding(h) == 0 and active_voices(h) == 0 and len(ons(ev)) > 500,
      '%d note-ons in %.1fs' % (len(ons(ev)), time.time() - t0))

# ------------------------------------------------------------ shipped defaults
section('factory settings')
# Every mode, untouched: press a key, let go, wait. Nothing may keep playing.
# (One-Shot and Slice once looped forever here: Loop defaults on and both
# ignore note-off, and the older tests hid it by switching Loop off.)
for mode, name, key in [(0, 'classic', 60), (1, 'one-shot', 60), (2, 'slice', 36), (3, 'granular', 60)]:
    h = mk([(2, mode)], src=DEMO)
    ev = play(h, {0: [note_on(0, key, 100)], 10: [note_off(0, key)]}, 1000)
    late = [e for e in ons(ev) if e[0] > 600 * BL]
    check('%s stops by itself after the key is released' % name,
          not late and sounding(h) == 0 and active_voices(h) == 0,
          '%d late note-ons, %d voices left' % (len(late), active_voices(h)))

h = mk([(2, 0)])
play(h, {0: [note_on(0, 60, 100)]}, 20)
h.set_slider(2, 1)                    # switch to One-Shot with the key still down
play(h, {0: [note_off(0, 60)]}, 60)
check('switching mode while a key is held does not strand it', active_voices(h) == 0)

ev = play(mk([(2, 1), (22, 1), (24, 25), (25, 25)]), {0: [note_on(0, 60, 100)]}, 400)
check('one-shot with loop count 0 plays the whole region once', len(ons(ev)) == 8,
      '%d note-ons' % len(ons(ev)))

h = mk([(2, 2), (40, 0), (41, 4), (45, 1)])
ev = play(h, {0: [note_on(0, 36, 100)], 300: [note_off(0, 36)]}, 400)
check('slice "while held" still loops until note-off',
      len(ons(ev)) > 4 and active_voices(h) == 0, '%d note-ons' % len(ons(ev)))

dflt = [(46, 4), (47, 1), (48, 20), (53, 2)]
h = mk([(2, 3)], src=DEMO)
check('granular defaults are 4 grains, 1 beat, cloud, 20% spray',
      all(h.ip.g['slider%d' % k] == v for k, v in dflt))
ev = play(h, {0: [note_on(0, 60, 100)]}, 375)
check('granular defaults stay playable (< 60 notes/s)', len(ons(ev)) / 4.0 < 60,
      '%.0f notes/s' % (len(ons(ev)) / 4.0))

# -------------------------------------------------------------- randomness
section('randomness')
h = mk()
ip = h.ip
addr = int(ip.g['SCRATCH'])
ip.mem[addr] = 1.0
xs = [ip.call('md_rndm', [('num', float(addr))], None) for _ in range(2000)]
check('generator is uniform, not a short cycle',
      len(set(xs)) == 2000 and 0.45 < sum(xs) / len(xs) < 0.55 and min(xs) < 0.05 and max(xs) > 0.95,
      'mean %.3f, %d distinct' % (sum(xs) / len(xs), len(set(xs))))
v = [e[3] for e in ons(play(mk([(2, 0), (22, 1), (7, 0), (8, 50), (12, 20)], FLAT),
                            {0: [note_on(0, 60, 100)]}, 400))]
check('humanize velocity moves both ways', min(v) < 63 < max(v), '%d..%d' % (min(v), max(v)))
h = mk([(2, 3), (46, 8), (47, 0.5), (50, 3)])
ip = h.ip
G = {k: int(ip.g[k]) for k in ('STREAMS', 'S_STRIDE', 'S_DIR', 'MAX_VOICES')}
dirs = set()
for i in range(120):
    h.block(BL, [note_on(0, 60, 100)] if i == 0 else [])
    for g in range(8):                # grain g owns stream MAX_VOICES + g
        sp = G['STREAMS'] + (G['MAX_VOICES'] + g) * G['S_STRIDE']
        if ip.mem[sp]: dirs.add(ip.mem[sp + G['S_DIR']])
check('random grain direction picks both directions', dirs == {1.0, -1.0}, str(sorted(dirs)))

# ------------------------------------------------------------ timing fixes
section('timing')
h = mk([(2, 0), (22, 1), (14, 1)])
ev = play(h, {0: [note_on(0, 60, 100)]}, 100, 120.0)
ev2 = play(h, {}, 100, 240.0)
o1, o2 = ons(ev), ons(ev2)
g1, g2 = o1[-1][0] - o1[-2][0], o2[-1][0] - o2[-2][0]
check('a held voice follows a tempo change', abs(g1 - 12000) < 3 and abs(g2 - 6000) < 3,
      'gap %d -> %d samples' % (g1, g2))

h = mk([(2, 1), (18, 3), (22, 0)])
h.ip.g['play_state'] = 5.0
ev = play(h, {0: [note_on(100, 60, 100)]}, 200)
check('trigger quantize also applies while recording', abs(ons(ev)[0][0] - 23936) < 700,
      'first on at %d' % ons(ev)[0][0])

h = mk([(2, 0), (22, 1), (17, 1), (21, 1)])
h.beat = 1.5
ev = play(h, {0: [note_on(0, 60, 100)]}, 20)
check('transport lock in reverse starts at the mirrored phase', ons(ev)[0][2] == 60,
      'first pitch %d' % ons(ev)[0][2])

ev = play(mk([(2, 1), (22, 0)], fixtures.retrig()), {0: [note_on(0, 60, 100)]}, 60)
check('a repeated note ends on time, not at the next note-on',
      [e[0] for e in offs(ev)][:1] == [9600] and [e[0] for e in ons(ev)] == [0, 9696],
      'offs %s ons %s' % ([e[0] for e in offs(ev)], [e[0] for e in ons(ev)]))

ev = play(mk([(2, 1), (22, 0), (11, 60)], FLAT), {0: [note_on(0, 60, 100)]}, 200)
late = [e[0] - i * 12000 for i, e in enumerate(ons(ev))]
check('humanize timing can push a note past the block end',
      len(late) == 8 and max(late) > BL and min(late) >= 0 and max(late) <= 2880 and len(offs(ev)) == 8,
      'delays %s' % late)

v = [e[3] for e in ons(play(mk([(2, 0), (22, 1), (7, 0), (28, 0), (29, 50), (30, 2000), (32, 0.2)], FLAT),
                            {0: [note_on(0, 60, 100)], 100: [note_off(0, 60)]}, 200))]
# notes every 12000 samples; the key goes up at 51200, so v[5] is the first released note
check('release starts where sustain was (curve applied once)', v[5] >= 0.75 * v[4], str(v[:6]))

# --------------------------------------------------------------- MIDI input
section('MIDI input')
h = mk([(2, 0), (22, 1)])
out = []
for i in range(20):
    out += h.block(BL, {0: [(0, 0xB0, 64, 127), note_on(0, 60, 100)], 10: [(0, 0xB0, 64, 0)]}.get(i, []))
check('sustain pedal is consumed, not passed to the instrument',
      not [m for m in out if (m[1] & 0xF0) == 0xB0 and m[2] == 64])
h = mk([(2, 0), (22, 1)])
out = []
for i in range(3):
    out += h.block(BL, [(0, 0xB1, 1, 90), (0, 0xE0, 0, 64)] if i == 0 else [])
check('other CCs and pitch bend still pass', [(m[1], m[2]) for m in out] == [(0xB1, 1), (0xE0, 0)])

# --------------------------------------------------------- phrases and markers
section('phrases and markers')
def ctrl_click(h, frac):
    ip = h.ip
    ip.g.update(mouse_x=ip.g['RL_X'] + ip.g['RL_W'] * frac, mouse_y=ip.g['RL_Y'] + 40, mouse_cap=5.0)
    h.gfx(); ip.g['mouse_cap'] = 0.0; h.gfx()

def markers(h):
    ip = h.ip
    return [round(ip.mem[int(ip.g['MARKERS']) + i], 3) for i in range(int(ip.g['md_nmark']))]

h = mk()
h.ip.file_paths[1] = DEMO
ctrl_click(h, 0.75)
check('ctrl-click adds a marker to the phrase', markers(h) == [2.0, 3.0], str(markers(h)))
h.ip.g['md_reload'] = 1.0; h.block(BL)
check('edited markers survive a reload before saving', markers(h) == [2.0, 3.0], str(markers(h)))
state = h.save_state()
h2 = Host(JSFX, ARP); h2.load_state(state); h2.block(BL)
check('edited markers are restored from the project', markers(h2) == [2.0, 3.0], str(markers(h2)))
h.ip.g['slider1'] = 1.0; h.block(BL)
check('switching phrase uses the new phrase\'s own markers', markers(h) == [2.0, 4.0, 6.0], str(markers(h)))

h = mk()
h.ip.file_paths[1] = DEMO
play(h, {0: [note_on(0, 60, 100)]}, 10)
import runtime as _rt
_orig = _rt.BUILTIN['strcpy_fromslider']
def _mid_scan(ip, a, _calls=[]):
    _calls.append(1)
    if len(_calls) == 2:              # audio thread runs while slider1 points at another file
        h.block(BL)
    return _orig(ip, a)
_rt.BUILTIN['strcpy_fromslider'] = _mid_scan
ip = h.ip
ip.g.update(mouse_x=400.0, mouse_y=20.0, mouse_cap=1.0); h.gfx(); ip.g['mouse_cap'] = 0.0
_rt.BUILTIN['strcpy_fromslider'] = _orig
out = h.block(BL)
check('opening the file menu does not reload the phrase',
      h.ip.g['md_src_n'] == 8 and active_voices(h) == 1 and int(ip.g['md_nfiles']) == 2,
      'notes %d, voices %d, files %d' % (h.ip.g['md_src_n'], active_voices(h), ip.g['md_nfiles']))

# ----------------------------------------------------------------------- UI
section('interface')
h = mk()                      # no slider overrides: sliders still hold their defaults
ip = h.ip
C, S = int(ip.g['CTLS']), int(ip.g['C_STRIDE'])
F = {k: int(ip.g[k]) for k in ('C_SL', 'C_DEF', 'C_MIN', 'C_MAX', 'C_X', 'C_Y', 'C_W', 'C_PAGE')}
n = int(ip.g['md_nctl'])
sl = sorted(int(ip.mem[C + i * S + F['C_SL']]) for i in range(n))
check('every slider 2..56 has exactly one control', sl == list(range(2, 57)))
bad = [int(ip.mem[C + i * S + F['C_SL']]) for i in range(n)
       if abs(ip.mem[C + i * S + F['C_DEF']] - ip.g['slider%d' % int(ip.mem[C + i * S + F['C_SL']])]) > 1e-6]
check('control defaults match the slider declarations', not bad, str(bad))
outside = [i for i in range(n) if ip.mem[C + i * S + F['C_X']] + ip.mem[C + i * S + F['C_W']] > 920]
check('every control fits the window', not outside)
cells = [(ip.mem[C + i * S + F['C_PAGE']], ip.mem[C + i * S + F['C_X']], ip.mem[C + i * S + F['C_Y']])
         for i in range(n)]
check('no two controls share a cell', len(cells) == len(set(cells)))

ip.g['slider2'] = 2.0         # slice mode, so the roll draws slice markers too
h.block(BL)
# Sliders are drawn above the @gfx canvas by REAPER, so a visible one pushes the
# GUI down the window. Everything the panel draws must carry the '-' hide prefix.
import re as _re
_hdr = open(os.path.join(HERE, os.pardir, 'Midular.jsfx')).read()
_shown = [int(m.group(1)) for m in
          _re.finditer(r'^slider(\d+):.*>(?!-)', _hdr, _re.M)]
check('every panel slider is hidden from the plug-in UI', not _shown,
      'visible: %s' % _shown)

for page in range(1, 6):
    ip.g['md_page'] = float(page)
    h.gfx()
check('all five panel pages draw', True)

ip.g['md_page'] = 1.0
knob = next(i for i in range(n) if int(ip.mem[C + i * S + F['C_SL']]) == 3)
x, y = ip.mem[C + knob * S + F['C_X']] + 40, ip.mem[C + knob * S + F['C_Y']] + 40
before = ip.g['slider3']
ip.g.update(mouse_x=x, mouse_y=y, mouse_cap=1.0); h.gfx()
ip.g['mouse_y'] = y - 30.0; h.gfx()
after = ip.g['slider3']
ip.g['mouse_cap'] = 0.0; h.gfx()
check('dragging a knob changes its slider', after > before, '%g -> %g' % (before, after))

tog = next(i for i in range(n) if int(ip.mem[C + i * S + F['C_SL']]) == 13)
x, y = ip.mem[C + tog * S + F['C_X']] + 40, ip.mem[C + tog * S + F['C_Y']] + 40
ip.g.update(mouse_x=x, mouse_y=y, mouse_cap=1.0); h.gfx(); ip.g['mouse_cap'] = 0.0; h.gfx()
check('clicking a toggle flips it', ip.g['slider13'] == 1)

ip.g.update(mouse_x=14.0 + 3 * 180 + 10, mouse_y=ip.g['TB_Y'] + 5, mouse_cap=1.0); h.gfx()
ip.g['mouse_cap'] = 0.0; h.gfx()
check('clicking a tab changes page', ip.g['md_page'] == 4)

n0 = ip.g['md_nmark']
ip.g.update(mouse_x=ip.g['RL_X'] + 400, mouse_y=ip.g['RL_Y'] + 40, mouse_cap=5.0)
h.gfx(); ip.g['mouse_cap'] = 0.0; h.gfx()
added = ip.g['md_nmark']
ip.g['mouse_cap'] = 2.0; h.gfx(); ip.g['mouse_cap'] = 0.0; h.gfx()
check('ctrl-click adds a marker, right-click removes it',
      added == n0 + 1 and ip.g['md_nmark'] == n0 and ip.g['md_mark_edited'] == 1)

print('\n%d passed, %d failed' % (_state['pass'], _state['fail']))
sys.exit(1 if _state['fail'] else 0)
