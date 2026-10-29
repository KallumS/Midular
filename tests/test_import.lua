--[[ Tests midular_import.lua without REAPER: the Standard MIDI File reader, the
     .txt writer, the gmem hand-over and how it picks a Midular instance.

       lua5.4 tests/test_import.lua
--]]

local here = (arg[0] or ''):match('^(.*)[/\\]') or '.'

local pass, fail = 0, 0
local function check(label, cond, detail)
  if cond then pass = pass + 1 else fail = fail + 1 end
  print(string.format('  %-52s %s%s', label, cond and 'ok' or 'FAIL',
                      detail and ('   ' .. detail) or ''))
end

-- ---------------------------------------------------------------- fixture
local function vlq(n)
  local out = { n % 128 }
  n = math.floor(n / 128)
  while n > 0 do
    table.insert(out, 1, (n % 128) + 128)
    n = math.floor(n / 128)
  end
  return string.char(table.unpack(out))
end

local function u32(n)
  return string.char(math.floor(n / 16777216) % 256, math.floor(n / 65536) % 256,
                     math.floor(n / 256) % 256, n % 256)
end

local function u16(n) return string.char(math.floor(n / 256) % 256, n % 256) end
local function chunk(tag, data) return tag .. u32(#data) .. data end

local TPQ = 480

-- track 0: tempo 120, 3/4, a marker on beat 3
local t0 = vlq(0) .. '\xff\x51\x03' .. string.char(0x07, 0xa1, 0x20)
        .. vlq(0) .. '\xff\x58\x04' .. string.char(3, 2, 24, 8)
        .. vlq(TPQ * 3) .. '\xff\x06' .. vlq(4) .. 'mk01'
        .. vlq(0) .. '\xff\x2f\x00'

-- track 1: four notes using running status and note-on-velocity-0 for note-offs
local notes = { { 0, TPQ, 60, 100 }, { TPQ, TPQ // 2, 64, 90 },
                { TPQ, TPQ, 67, 80 }, { TPQ * 3, TPQ * 2, 72, 110 } }
local events = {}
for _, n in ipairs(notes) do
  events[#events + 1] = { n[1], n[3], n[4] }
  events[#events + 1] = { n[1] + n[2], n[3], 0 }
end
table.sort(events, function(a, b)
  if a[1] ~= b[1] then return a[1] < b[1] end
  return (a[3] == 0 and 0 or 1) < (b[3] == 0 and 0 or 1)
end)
local t1, last, running = '', 0, nil
for _, e in ipairs(events) do
  t1 = t1 .. vlq(e[1] - last); last = e[1]
  if running ~= 0x90 then t1 = t1 .. string.char(0x90); running = 0x90 end
  t1 = t1 .. string.char(e[2], e[3])
end
t1 = t1 .. vlq(0) .. '\xff\x2f\x00'

local mid = chunk('MThd', u16(1) .. u16(2) .. u16(TPQ)) .. chunk('MTrk', t0) .. chunk('MTrk', t1)

-- ------------------------------------------------------ load as a library
MIDULAR_IMPORT_LIB = true
reaper = { ShowMessageBox = function() end }
local M = assert(loadfile(here .. '/../Scripts/midular_import.lua'))()

print('\nStandard MIDI File reader')
local ph, err = M.parse_smf(mid)
check('parses the file', ph ~= nil, err)
check('reads the tempo meta event', ph.tempo == 120, tostring(ph.tempo))
check('reads the time signature', ph.tsnum == 3 and ph.tsden == 4,
      ph.tsnum .. '/' .. ph.tsden)
check('pairs all four notes', #ph.notes == 4, tostring(#ph.notes))
check('converts ticks to beats', ph.notes[1][1] == 0 and ph.notes[1][2] == 1)
check('handles running status', ph.notes[2][3] == 64 and ph.notes[2][2] == 0.5)
check('treats note-on velocity 0 as note-off', ph.notes[4][2] == 2)
check('keeps channel and velocity', ph.notes[1][4] == 100 and ph.notes[1][5] == 0)
check('reads marker meta events', #ph.markers == 1 and ph.markers[1] == 3)
check('rounds the length out to whole bars', ph.length == 6, tostring(ph.length))

print('\nrejection and naming')
local bad, berr = M.parse_smf('not a midi file at all')
check('rejects a non-MIDI file', bad == nil, tostring(berr))
check('sanitize strips unsafe characters', M.sanitize('My Loop #1!') == 'My Loop _1_.txt')
check('sanitize supplies a name', M.sanitize('') == 'phrase.txt')
check('sanitize keeps an existing extension', M.sanitize('a.txt') == 'a.txt')

print('\nwriter')
local tmp = os.tmpname()
check('writes a source file', M.write_phrase(ph, tmp))
local out = assert(io.open(tmp)):read('*a')
os.remove(tmp)
check('starts with the magic number', out:match('\n7473\n') ~= nil)
check('declares the right note count', out:match('\n4\n') ~= nil)
check('emits one record per note', select(2, out:gsub('\n[%d%.]+, [%d%.]+, %d+, %d+, %d+', '')) == 4)

-- ------------------------------------------------------------ gmem hand-over
print('\ngmem hand-over')
local G = M.G
local gmem, writes = {}, {}
reaper.gmem_attach = function(name) reaper._attached = name end
reaper.gmem_read = function(i) return gmem[i] or 0 end
reaper.gmem_write = function(i, v) gmem[i] = v; writes[#writes + 1] = { i, v } end

local p2 = M.new_phrase()
p2.name, p2.tempo, p2.tsnum, p2.tsden = 'Lua phrase', 100, 3, 4
M.add_note(p2, 0, 0.5, 60, 100, 0)
M.add_note(p2, 1, 0.5, 64, 90, 1)
M.add_note(p2, 2, 1.0, 67, 80, 2)
p2.markers = { 1.5 }
M.finish(p2)

local t1 = M.write_gmem(p2)
check('attaches to the "Midular" namespace', reaper._attached == 'Midular')
check('first ticket is 1', t1 == 1, tostring(t1))
check('mailbox is marked ready with magic and protocol',
      gmem[G.MAGIC] == 7473 and gmem[G.PROTO] == M.GM_PROTO and gmem[G.STATE] == 2 and gmem[G.TICKET] == 1)
check('marks "being written" first and "ready" last',
      writes[1][1] == G.STATE and writes[1][2] == 1 and
      writes[#writes][1] == G.STATE and writes[#writes][2] == 2)
check('writes the header', gmem[G.N] == 3 and gmem[G.LEN] == 3 and gmem[G.TEMPO] == 100 and
      gmem[G.TSNUM] == 3 and gmem[G.TSDEN] == 4 and gmem[G.NMARK] == 1)
check('writes notes as start, length, pitch, velocity, channel',
      gmem[G.NOTES + 5] == 1 and gmem[G.NOTES + 6] == 0.5 and gmem[G.NOTES + 7] == 64 and
      gmem[G.NOTES + 8] == 90 and gmem[G.NOTES + 9] == 1)
check('writes markers and the name as bytes', gmem[G.MARK] == 1.5 and gmem[G.NAMELEN] == 10 and
      gmem[G.NAME] == ('L'):byte() and gmem[G.NAME + 9] == ('e'):byte())
check('clears the previous receipt', gmem[G.ACK] == 0)
check('each import gets a new ticket', M.write_gmem(p2) == 2)
gmem[G.TICKET] = 999999
check('tickets wrap inside the slider range', M.write_gmem(p2) == 1)
p2.name = string.rep('x', 300)
M.write_gmem(p2)
check('long names are cut to 128 bytes', gmem[G.NAMELEN] == 128)

-- ---------------------------------------------------------- picking a target
print('\npicking a Midular')
local MIDULAR = {}
for i = 1, 56 do MIDULAR[i] = 'param ' .. i end
MIDULAR[57] = 'Import Ticket'
MIDULAR[58], MIDULAR[59], MIDULAR[60] = 'Bypass', 'Wet', 'Delta'   -- REAPER adds these
local OTHER = { 'Gain', 'Pan' }

local master, tracks, selected, focus
local function setup(t) master = t.master or { fx = {} }; tracks = t.tracks; selected = t.selected or {}; focus = t.focus end
reaper.GetMasterTrack = function() return master end
reaper.CountTracks = function() return #tracks end
reaper.GetTrack = function(_, i) return tracks[i + 1] end
reaper.CountSelectedTracks = function() return #selected end
reaper.GetSelectedTrack = function(_, i) return selected[i + 1] end
reaper.TrackFX_GetCount = function(tr) return #tr.fx end
reaper.TrackFX_GetNumParams = function(tr, fx) return #tr.fx[fx + 1] end
reaper.TrackFX_GetParamName = function(tr, fx, p) return true, tr.fx[fx + 1][p + 1] end
reaper.GetTouchedOrFocusedFX = function(mode)
  if mode ~= 1 or not focus then return false end
  return true, focus[1], focus[2] or -1, 0, focus[3], 0
end

local A = { fx = { OTHER, MIDULAR } }
local B = { fx = { MIDULAR } }
local C = { fx = { OTHER } }

setup { tracks = { A, B, C }, focus = { 1, -1, 0 } }
local t = M.find_target()
check('uses the Midular whose window is open', t and t.track == B and t.fx == 0 and t.param == 56)
setup { tracks = { A, B, C }, focus = { 2, -1, 0 }, selected = { A } }
t = M.find_target()
check('else the one on the selected tracks', t and t.track == A and t.fx == 1)
setup { tracks = { A, B, C }, focus = { 0, 0, 1 } }
local none, why = M.find_target()
check('ignores a focused take FX; two candidates -> "several"', none == nil and why == 'several', tostring(why))
setup { tracks = { C, B } }
t = M.find_target()
check('else the only one in the project', t and t.track == B)
setup { tracks = { C } }
none, why = M.find_target()
check('none in the project -> "none"', none == nil and why == 'none', tostring(why))
setup { tracks = { C }, master = { fx = { MIDULAR } }, focus = { -1, -1, 0 } }
t = M.find_target()
check('finds a Midular on the master track', t and t.track == master)
local renamed = {}
for i = 1, 57 do renamed[i] = MIDULAR[i] end
renamed[57] = '-Import Ticket'
setup { tracks = { { fx = { renamed } } } }
check('matches the parameter whatever the FX is called', M.find_target() ~= nil)

-- ------------------------------------------------------------ sending the ticket
print('\nsending the ticket')
local set = {}
reaper.TrackFX_SetParam = function(tr, fx, p, v) set.native = v; set.value = v end
reaper.TrackFX_GetParam = function() return set.value end
reaper.TrackFX_SetParamNormalized = function(tr, fx, p, v) set.norm = v; set.value = v * 1000000 end
M.send_ticket({ track = B, fx = 0, param = 56 }, 4242)
check('sets the Import Ticket parameter in slider units', set.native == 4242 and set.norm == nil)
set = {}
reaper.TrackFX_SetParam = function(tr, fx, p, v) set.value = v * 1000000 end   -- a build that normalises
M.send_ticket({ track = B, fx = 0, param = 56 }, 4242)
check('falls back to the normalised setter if the value does not stick',
      set.norm and math.abs(set.norm * 1000000 - 4242) < 0.001)

print(string.format('\n%d passed, %d failed', pass, fail))
os.exit(fail > 0 and 1 or 0)
