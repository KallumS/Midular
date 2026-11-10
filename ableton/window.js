// The picture in the README: `node ableton/window.js` redraws ableton/window.png.
// A phrase loaded from the clip in Detail View.
require('./kit/test/picture.js')(__dirname, { bundle: 'Midular.js', w: 920, h: 600, clip: 'Scale run',
  go(d) { d.send('action', 'loadClip'); d.run(300); } });
