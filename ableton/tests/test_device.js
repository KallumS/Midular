/* The Max for Live device, run in Node on a pretend Max and a pretend Live.
 *   python3 ableton/kit/build.py ableton/device.json && node --test ableton/tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { liveSet } = require('../kit/test/max.js');
const suite = require('../kit/test/jsfx_suite.js');

const { device } = suite({ bundle: path.join(__dirname, '..', 'Midular.js'), name: 'Midular', window: [920, 600] });

const PHRASE = [60, 62, 64, 65, 67, 69, 71, 72].map((p, i) => ({ pitch: p, start_time: i * 0.5, duration: 0.4, velocity: 100 }));

test('Load Clip hands the open clip to Midular, and a key plays it back', () => {
  const set = liveSet();
  set.open(set.clip(4, PHRASE, { name: 'Scale run' }));
  const d = device({ set });
  d.run(50);
  d.send('action', 'loadClip');
  d.run(200);
  assert.ok(/^Loaded “Scale run”: 8 notes/.test(d.status()), d.status());
  d.out.length = 0;
  d.note(true, 60, 100);
  d.run(2500);
  d.note(false, 60);
  d.run(500);
  const pitches = new Set();
  const b = d.midi();
  for (let i = 0; i + 2 < b.length; i += 3) if ((b[i] & 0xF0) === 0x90 && b[i + 2] > 0) pitches.add(b[i + 1]);
  assert.ok(pitches.size >= 4, 'the phrase played: ' + [...pitches].join(' '));
});

test('Load Clip without a clip says what to do', () => {
  const d = device();
  d.send('action', 'loadClip');
  assert.ok(/^No MIDI clip is open/.test(d.status()), d.status());
});
