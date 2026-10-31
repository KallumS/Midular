--[[ Runs midular_import.lua's real gmem writer against a stub and prints the
     mailbox as "index value" lines.  test_midular.py feeds that to the plug-in,
     so the Lua writer and the JSFX reader are tested against each other rather
     than each against its own idea of the layout.

       lua5.4 tests/gmem_dump.lua
--]]
local here = (arg[0] or ''):match('^(.*)[/\\]') or '.'
MIDULAR_IMPORT_LIB = true
local gmem = {}
reaper = {
  ShowMessageBox = function() end,
  gmem_attach = function() end,
  gmem_read = function(i) return gmem[i] or 0 end,
  gmem_write = function(i, v) gmem[i] = v end,
}
local M = assert(loadfile(here .. '/../Scripts/midular_import.lua'))()

local ph = M.new_phrase()
ph.name, ph.tempo, ph.tsnum, ph.tsden = 'Lua phrase', 100, 3, 4
M.add_note(ph, 0, 0.5, 60, 100, 0)
M.add_note(ph, 1, 0.5, 64, 90, 1)
M.add_note(ph, 2, 1.0, 67, 80, 2)
ph.markers = { 1.5 }
M.finish(ph)
M.write_gmem(ph)

local keys = {}
for k in pairs(gmem) do keys[#keys + 1] = k end
table.sort(keys)
for _, k in ipairs(keys) do print(string.format('%d %.17g', k, gmem[k])) end
