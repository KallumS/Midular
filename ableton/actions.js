/* Midular in Live: what Scripts/midular_import.lua does in REAPER.
 *
 * Load Clip takes the clip open in Detail View and hands it to Midular the
 * way the importer does: the phrase into the "Midular" gmem mailbox, then a
 * new ticket on the Import Ticket slider (slider57), which the plug-in answers
 * by writing the ticket into the mailbox's ACK. Times are beats. */
var MIDULAR = { MAGIC: 0, PROTO: 1, STATE: 2, TICKET: 3, ACK: 4, N: 8, LEN: 9, TEMPO: 10, TSNUM: 11, TSDEN: 12,
                NMARK: 13, NAMELEN: 14, MARK: 64, NAME: 320, NOTES: 512, ID: 7473, WRITING: 1, READY: 2,
                MAX_NOTES: 32768, NAME_MAX: 128, TICKET_SLIDER: 57, TICKET_MAX: 1000000 };
var waiting = null;

var ACTIONS = {
  loadClip: function (fx, Live) {
    var c = Live.clipNotes();
    if (!c) return 'No MIDI clip is open. Open one in Detail View, then try again.';
    if (!c.notes.length) return 'That clip has no notes. Choose a clip with notes, then try again.';
    var s = Live.song(), G = MIDULAR;
    var g = fx.gmem[fx.gmemName] || (fx.gmem[fx.gmemName] = {});
    var name = unescape(encodeURIComponent(c.name || 'Clip')).replace(/[\x00-\x1f]/g, '').slice(0, G.NAME_MAX);
    var notes = c.notes.slice(0, G.MAX_NOTES);
    var ticket = Math.floor(g[G.TICKET] || 0) % (G.TICKET_MAX - 1) + 1;
    g[G.STATE] = G.WRITING;
    g[G.N] = notes.length; g[G.LEN] = c.beats; g[G.TEMPO] = s.tempo;
    g[G.TSNUM] = s.num; g[G.TSDEN] = s.den; g[G.NMARK] = 0; g[G.NAMELEN] = name.length;
    for (var k = 0; k < name.length; k++) g[G.NAME + k] = name.charCodeAt(k);
    notes.forEach(function (n, i) {
      var at = G.NOTES + i * 5;
      g[at] = n.start; g[at + 1] = n.len; g[at + 2] = n.pitch; g[at + 3] = n.vel; g[at + 4] = 0;
    });
    g[G.ACK] = 0; g[G.TICKET] = ticket; g[G.PROTO] = 1; g[G.MAGIC] = G.ID;
    g[G.STATE] = G.READY;
    fx.setSlider(G.TICKET_SLIDER, ticket);
    waiting = { ticket: ticket, name: c.name || 'the clip', n: notes.length, ticks: 0 };
    return 'Loading “' + waiting.name + '” into Midular…';
  },
  // The plug-in's receipt, or none.
  tick: function (fx) {
    if (!waiting) return;
    var g = fx.gmem[fx.gmemName] || {};
    if (g[MIDULAR.ACK] === waiting.ticket) {
      say('Loaded “' + waiting.name + '”: ' + waiting.n + ' notes. Play a key to hear it.');
      waiting = null;
    } else if (++waiting.ticks > 500) {
      say('Midular didn’t take the clip. Try again.');
      waiting = null;
    }
  }
};
