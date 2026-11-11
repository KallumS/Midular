/* Midular - built by ableton/kit/build.py from ableton/device.json. Do not edit; edit the sources and rebuild. */
var DEVICE = {"main": "Midular.jsfx", "title": "Midular"};
DEVICE.files = {"Midular.jsfx": "desc:Midular - MIDI sampler (classic / one-shot / slice / granular)\ntags: MIDI sampler slicer granular instrument\n//\n// Midular turns a MIDI phrase into a playable instrument, the way Simpler or\n// Bitwig's Sampler turn an audio file into one - except every stage of the\n// signal path works on notes instead of samples.\n//\n//   Classic    polyphonic; each held key loops the phrase\n//   One-Shot   monophonic; one trigger plays the phrase start to finish\n//   Slice      chops the phrase and maps the pieces across the keyboard\n//   Granular   up to 256 independent grains with their own motion and direction\n//\n// Phrases are imported with Scripts/midular_import.lua, which hands them over\n// through gmem (see md_ticket_poll), and are saved inside the project.  The\n// Source File slider - .txt files in <REAPER resource path>/Data/midular/ -\n// remains as a fallback.  See README.md and docs/FORMAT.md.\n//\n// Copyright (C) 2026  Midular contributors.\n// Licensed under the GNU General Public License v3 (see LICENSE).\n\nin_pin:none\nout_pin:none\noptions:no_meter gfx_hz=30 gmem=Midular\n\n// --- source -----------------------------------------------------------------\nslider1:/midular:default.txt:Source File\n\n// --- play -------------------------------------------------------------------\nslider2:0<0,3,1{Classic,One-Shot,Slice,Granular}>-Mode\nslider3:60<0,127,1>-Root Key\nslider4:0<-48,48,1>-Transpose\nslider5:1<0,2,1{Off,Transpose,Rate (Pitch)}>-Key Tracking\nslider6:8<1,16,1>-Polyphony\nslider7:2<0,2,1{Source,Played Key,Blend}>-Velocity Source\nslider8:100<0,200,1>-Velocity Scale\nslider9:100<1,400,1>-Note Length\nslider10:0<0,16,1>-Output Channel\nslider11:0<0,60,0.1>-Humanize Timing\nslider12:0<0,48,1>-Humanize Velocity\nslider13:0<0,1,1{Off,On}>-MIDI Thru\n\n// --- warp -------------------------------------------------------------------\nslider14:1<0,2,1{Free (Source Tempo),Sync (Project),Fixed Length}>-Warp Mode\nslider15:1<0.0625,8,0.0001>-Speed\nslider16:4<0.25,64,0.25>-Fixed Length\nslider17:0<0,1,1{Retrigger,Transport Lock}>-Start Mode\nslider18:0<0,5,1{Off,1/16,1/8,1/4,1/2,1 Bar}>-Trigger Quantize\nslider19:0<0,99,0.01>-Region Start\nslider20:100<1,100,0.01>-Region Length\nslider21:0<0,1,1{Off,On}>-Reverse\n\n// --- loop -------------------------------------------------------------------\nslider22:1<0,1,1{Off,On}>-Loop\nslider23:0<0,2,1{Forward,Reverse,Ping-Pong}>-Loop Mode\nslider24:0<0,99,0.01>-Loop Start\nslider25:100<1,100,0.01>-Loop Length\nslider26:0<0,64,1>-Loop Count\n\n// --- amplitude envelope -----------------------------------------------------\nslider27:0<0,5000,1>-Attack\nslider28:500<0,10000,1>-Decay\nslider29:100<0,100,0.1>-Sustain\nslider30:80<0,10000,1>-Release\nslider31:100<0,100,0.1>-Envelope Amount\nslider32:0<-1,1,0.01>-Envelope Curve\n\n// --- note filter ------------------------------------------------------------\nslider33:0<0,4,1{Off,Lowpass,Highpass,Bandpass,Notch}>-Filter Mode\nslider34:64<0,127,0.1>-Filter Cutoff\nslider35:24<0.5,60,0.1>-Filter Width\nslider36:12<0,48,0.1>-Filter Slope\nslider37:0<0,100,0.1>-Filter Resonance\nslider38:0<-100,100,1>-Filter Key Tracking\nslider39:5<0,100,1>-Filter Threshold\n\n// --- slice ------------------------------------------------------------------\nslider40:0<0,4,1{Divisions,Beats,Onsets,Pitch Changes,Manual Markers}>-Slice Method\nslider41:16<1,128,1>-Slice Divisions\nslider42:1<0,6,1{1/32,1/16,1/8,1/4,1/2,1 Bar,2 Bars}>-Slice Grid\nslider43:50<0,100,1>-Onset Sensitivity\nslider44:36<0,127,1>-Slice Map Root\nslider45:0<0,1,1{Until Slice End,While Held}>-Slice Gate\n\n// --- granular ---------------------------------------------------------------\nslider46:4<1,256,1>-Grain Count\nslider47:1<0.01,8,0.001>-Grain Size\nslider48:20<0,100,0.1>-Grain Spray\nslider49:0<-4,4,0.001>-Grain Motion\nslider50:0<0,3,1{Forward,Reverse,Alternate,Random}>-Grain Direction\nslider51:100<1,100,1>-Grain Density\nslider52:0<0,24,1>-Grain Pitch Spread\nslider53:2<0,2,1{Even,Random,Cloud}>-Grain Spread\nslider54:1<1,999,1>-Grain Seed\n\n// --- mono behaviour ---------------------------------------------------------\nslider55:0<0,2,1{Restart,Ignore While Playing,Legato}>-One-Shot Retrigger\nslider56:0<0,1,1{Off,On}>-Mono Choke\n\n// --- internal -----------------------------------------------------------------\n// Written by midular_import.lua (TrackFX_SetParam) to address a phrase waiting\n// in the gmem mailbox to this instance.  Not a control; no panel cell.\nslider57:0<0,1000000,1>-Import Ticket\n\nimport midular_core.jsfx-inc\nimport midular_engine.jsfx-inc\nimport midular_ui.jsfx-inc\n\n@init\n\next_noinit = 1;\n\n// ---------------------------------------------------------------------------\n// Parameter fan-out.  Called every block so that changes made from @gfx take\n// effect even if the host does not re-run @slider.\n// ---------------------------------------------------------------------------\nfunction md_apply_params() local(span, h)\n(\n  p_mode      = slider2 | 0;\n  p_root      = slider3 | 0;\n  p_transp    = slider4 | 0;\n  p_keytrack  = slider5 | 0;\n  p_poly      = max(slider6 | 0, 1);\n  p_velmode   = slider7 | 0;\n  p_velamt    = slider8;\n  p_gate      = slider9;\n  p_outchan   = slider10 | 0;\n  p_humt      = slider11;\n  p_humv      = slider12;\n  p_thru      = slider13 | 0;\n\n  p_warp      = slider14 | 0;\n  p_speed     = max(slider15, 0.0001);\n  p_fixlen    = max(slider16, 0.01);\n  p_startmode = slider17 | 0;\n  p_tquant    = slider18 | 0;\n  p_srcstart  = slider19;\n  p_srclen    = slider20;\n  p_reverse   = slider21 | 0;\n\n  p_loopon    = slider22 | 0;\n  p_loopmode  = slider23 | 0;\n  p_loopstart = slider24;\n  p_looplen   = slider25;\n  p_loopcnt   = slider26 | 0;\n\n  p_atk       = slider27;\n  p_dec       = slider28;\n  p_sus       = slider29;\n  p_rel       = slider30;\n  p_envamt    = slider31;\n  p_envcurve  = slider32;\n\n  p_fmode     = slider33 | 0;\n  p_fcut      = slider34;\n  p_fwidth    = slider35;\n  p_fslope    = slider36;\n  p_freso     = slider37;\n  p_fkey      = slider38;\n  p_fthresh   = slider39;\n\n  p_slmethod  = slider40 | 0;\n  p_sldiv     = slider41 | 0;\n  p_slgrid    = slider42 | 0;\n  p_slsens    = slider43;\n  p_slroot    = slider44 | 0;\n  p_slgate    = slider45 | 0;\n\n  p_gcount    = slider46 | 0;\n  p_gsize     = slider47;\n  p_gspray    = slider48;\n  p_gmotion   = slider49;\n  p_gdir      = slider50 | 0;\n  p_gdens     = slider51;\n  p_gpitch    = slider52 | 0;\n  p_gshape    = slider53 | 0;\n  p_gseed     = slider54 | 0;\n\n  p_osretrig  = slider55 | 0;\n  p_choke     = slider56 | 0;\n\n  // playback region and loop bounds, in source beats\n  md_reg_a = md_src_len * p_srcstart * 0.01;\n  md_reg_b = min(md_reg_a + md_src_len * p_srclen * 0.01, md_src_len);\n  md_reg_b - md_reg_a < 0.0001 ? md_reg_b = min(md_reg_a + 0.0001, md_src_len);\n  span = max(md_reg_b - md_reg_a, 0.0001);\n\n  md_loop_a = md_reg_a + span * p_loopstart * 0.01;\n  md_loop_b = min(md_loop_a + span * p_looplen * 0.01, md_reg_b);\n  md_loop_a = min(md_loop_a, md_loop_b - 0.0001);\n  md_loop_a < md_reg_a ? md_loop_a = md_reg_a;\n\n  md_ratio     = md_warp_ratio();      // cached: `tempo` is not valid in @gfx\n  md_base_rate = md_bps * md_ratio;\n\n  // rebuild the slice map only when something it depends on actually moved\n  h = p_slmethod * 10000000 + p_sldiv * 10000 + p_slgrid * 1000 + p_slsens * 3 +\n      md_reg_a * 7.13 + md_reg_b * 13.7 + md_nmark * 31 + md_src_n * 0.077 + md_src_len * 0.31;\n  (h != md_slice_hash || md_slice_dirty) ? (\n    md_slice_hash  = h;\n    md_slice_dirty = 0;\n    md_build_slices(md_reg_a, md_reg_b, p_slmethod, p_sldiv, p_slgrid, p_slsens);\n  );\n);\n\n// ---------------------------------------------------------------------------\n// Control panel layout\n// ---------------------------------------------------------------------------\nfunction md_build_ui()\n(\n  md_nctl = 0;\n\n  // ---- page 1: PLAY --------------------------------------------------------\n  md_ctl_cell(CT_SELECT,  2, 0,   0, 3,   1, 0, 0, 1, \"Mode\",        \"Classic|One-Shot|Slice|Granular\");\n  md_ctl_cell(CT_KNOB,    3, 60,  0, 127, 1, 1, 0, 1, \"Root Key\",    \"note %d\");\n  md_ctl_cell(CT_KNOB,    4, 0, -48, 48,  1, 2, 0, 1, \"Transpose\",   \"%+d semitones\");\n  md_ctl_cell(CT_SELECT,  5, 1,   0, 2,   1, 3, 0, 1, \"Key Tracking\", \"Off|Transpose|Rate\");\n  md_ctl_cell(CT_KNOB,    6, 8,   1, 16,  1, 4, 0, 1, \"Polyphony\",   \"%d\");\n  md_ctl_cell(CT_SELECT,  7, 2,   0, 2,   1, 5, 0, 1, \"Velocity\",    \"Source|Played Key|Blend\");\n  md_ctl_cell(CT_KNOB,    8, 100, 0, 200, 1, 6, 0, 1, \"Velocity Scale\",   \"%d %%\");\n\n  md_ctl_cell(CT_KNOB,    9, 100, 1, 400, 1, 0, 1, 1, \"Note Length\", \"%d %%\");\n  md_ctl_cell(CT_KNOB,   10, 0,   0, 16,  1, 1, 1, 1, \"Output Channel\", \"%d\");\n  md_ctl_cell(CT_KNOB,   11, 0,   0, 60, 0.1,2, 1, 1, \"Humanize Timing\",  \"%.1f ms\");\n  md_ctl_cell(CT_KNOB,   12, 0,   0, 48,  1, 3, 1, 1, \"Humanize Velocity\",   \"%d\");\n  md_ctl_cell(CT_TOGGLE, 13, 0,   0, 1,   1, 4, 1, 1, \"MIDI Thru\",   \"Off|On\");\n  md_ctl_cell(CT_SELECT, 55, 0,   0, 2,   1, 5, 1, 1, \"Retrigger\",   \"Restart|Ignore|Legato\");\n  md_ctl_cell(CT_TOGGLE, 56, 0,   0, 1,   1, 6, 1, 1, \"Mono Choke\",  \"Off|On\");\n\n  // ---- page 2: WARP + LOOP -------------------------------------------------\n  md_ctl_cell(CT_SELECT, 14, 1,   0, 2,   1, 0, 0, 2, \"Warp Mode\",        \"Free|Sync|Fixed Length\");\n  md_ctl_cell(CT_KNOB,   15, 1, 0.0625, 8, 0.0001, 1, 0, 2, \"Speed\", \"\u00c3\u0097%.3f\");\n  md_ctl_cell(CT_KNOB,   16, 4, 0.25, 64, 0.25, 2, 0, 2, \"Fixed Length\", \"%.2f beats\");\n  md_ctl_cell(CT_SELECT, 17, 0,   0, 1,   1, 3, 0, 2, \"Start Mode\",       \"Retrigger|Transport Lock\");\n  md_ctl_cell(CT_SELECT, 18, 0,   0, 5,   1, 4, 0, 2, \"Trigger Quantize\",  \"Off|1/16|1/8|1/4|1/2|1 Bar\");\n  md_ctl_cell(CT_KNOB,   19, 0,   0, 99, 0.01, 5, 0, 2, \"Region Start\", \"%.2f %%\");\n  md_ctl_cell(CT_KNOB,   20, 100, 1, 100, 0.01, 6, 0, 2, \"Region Length\", \"%.2f %%\");\n\n  md_ctl_cell(CT_TOGGLE, 21, 0,   0, 1,   1, 0, 1, 2, \"Reverse\",     \"Off|On\");\n  md_ctl_cell(CT_TOGGLE, 22, 1,   0, 1,   1, 1, 1, 2, \"Loop\",        \"Off|On\");\n  md_ctl_cell(CT_SELECT, 23, 0,   0, 2,   1, 2, 1, 2, \"Loop Mode\",   \"Forward|Reverse|Ping-Pong\");\n  md_ctl_cell(CT_KNOB,   24, 0,   0, 99, 0.01, 3, 1, 2, \"Loop Start\", \"%.2f %%\");\n  md_ctl_cell(CT_KNOB,   25, 100, 1, 100, 0.01, 4, 1, 2, \"Loop Length\", \"%.2f %%\");\n  md_ctl_cell(CT_KNOB,   26, 0,   0, 64,  1, 5, 1, 2, \"Loop Count\",  \"%d\");\n\n  // ---- page 3: AMP + FILTER ------------------------------------------------\n  md_ctl_cell(CT_KNOB,   27, 0,   0, 5000, 1, 0, 0, 3, \"Attack\",     \"%d ms\");\n  md_ctl_cell(CT_KNOB,   28, 500, 0, 10000, 1, 1, 0, 3, \"Decay\",     \"%d ms\");\n  md_ctl_cell(CT_KNOB,   29, 100, 0, 100, 0.1, 2, 0, 3, \"Sustain\",   \"%.1f %%\");\n  md_ctl_cell(CT_KNOB,   30, 80,  0, 10000, 1, 3, 0, 3, \"Release\",   \"%d ms\");\n  md_ctl_cell(CT_KNOB,   31, 100, 0, 100, 0.1, 4, 0, 3, \"Envelope Amount\",\"%.1f %%\");\n  md_ctl_cell(CT_KNOB,   32, 0,  -1, 1, 0.01, 5, 0, 3, \"Envelope Curve\",  \"%+.2f\");\n\n  md_ctl_cell(CT_SELECT, 33, 0,   0, 4,   1, 0, 1, 3, \"Filter\",      \"Off|Lowpass|Highpass|Bandpass|Notch\");\n  md_ctl_cell(CT_KNOB,   34, 64,  0, 127, 0.1, 1, 1, 3, \"Cutoff\",    \"note %.0f\");\n  md_ctl_cell(CT_KNOB,   35, 24, 0.5, 60, 0.1, 2, 1, 3, \"Width\",     \"%.1f semitones\");\n  md_ctl_cell(CT_KNOB,   36, 12,  0, 48, 0.1, 3, 1, 3, \"Slope\",      \"%.1f semitones\");\n  md_ctl_cell(CT_KNOB,   37, 0,   0, 100, 0.1, 4, 1, 3, \"Resonance\", \"%.1f %%\");\n  md_ctl_cell(CT_KNOB,   38, 0,-100, 100, 1, 5, 1, 3, \"Key Tracking\", \"%+d %%\");\n  md_ctl_cell(CT_KNOB,   39, 5,   0, 100, 1, 6, 1, 3, \"Threshold\",   \"%d %%\");\n\n  // ---- page 4: SLICE -------------------------------------------------------\n  md_ctl_cell(CT_SELECT, 40, 0,   0, 4,   1, 0, 0, 4, \"Method\",      \"Divisions|Beats|Onsets|Pitch Changes|Manual Markers\");\n  md_ctl_cell(CT_KNOB,   41, 16,  1, 128, 1, 1, 0, 4, \"Divisions\",   \"%d\");\n  md_ctl_cell(CT_SELECT, 42, 1,   0, 6,   1, 2, 0, 4, \"Grid\",        \"1/32|1/16|1/8|1/4|1/2|1 Bar|2 Bars\");\n  md_ctl_cell(CT_KNOB,   43, 50,  0, 100, 1, 3, 0, 4, \"Sensitivity\", \"%d %%\");\n  md_ctl_cell(CT_KNOB,   44, 36,  0, 127, 1, 4, 0, 4, \"Map Root\",    \"note %d\");\n  md_ctl_cell(CT_SELECT, 45, 0,   0, 1,   1, 5, 0, 4, \"Gate\",        \"Until Slice End|While Held\");\n\n  // ---- page 5: GRANULAR ----------------------------------------------------\n  md_ctl_cell(CT_KNOB,   46, 4,   1, 256, 1, 0, 0, 5, \"Grains\",      \"%d\");\n  md_ctl_cell(CT_KNOB,   47, 1, 0.01, 8, 0.001, 1, 0, 5, \"Size\",  \"%.3f beats\");\n  md_ctl_cell(CT_KNOB,   48, 20,  0, 100, 0.1, 2, 0, 5, \"Spray\",     \"%.1f %%\");\n  md_ctl_cell(CT_KNOB,   49, 0,  -4, 4, 0.001, 3, 0, 5, \"Motion\",    \"%+.3f\");\n  md_ctl_cell(CT_SELECT, 50, 0,   0, 3,   1, 4, 0, 5, \"Direction\",   \"Forward|Reverse|Alternate|Random\");\n  md_ctl_cell(CT_KNOB,   51, 100, 1, 100, 1, 5, 0, 5, \"Density\",     \"%d %%\");\n  md_ctl_cell(CT_KNOB,   52, 0,   0, 24,  1, 6, 0, 5, \"Pitch Spread\",\"%d semitones\");\n\n  md_ctl_cell(CT_SELECT, 53, 2,   0, 2,   1, 0, 1, 5, \"Spread\",      \"Even|Random|Cloud\");\n  md_ctl_cell(CT_KNOB,   54, 1,   1, 999, 1, 1, 1, 5, \"Seed\",        \"%d\");\n);\n\nfunction md_reset_state() local(i)\n(\n  i = 0; while (i < MAX_VOICES) ( VOICES[i * V_STRIDE + V_STATE] = 0; i += 1; );\n  i = 0; while (i < MAX_GRAINS) ( GRAINS[i * G_STRIDE + G_OWNER] = 0; i += 1; );\n  i = 0; while (i < MAX_VOICES + MAX_GRAINS) ( STREAMS[i * S_STRIDE + S_ACTIVE] = 0; i += 1; );\n  i = 0;\n  while (i < MAX_SOUND) (\n    SOUND[i * N_STRIDE + N_USED] = 0;\n    SOUND[i * N_STRIDE + N_KEY]  = -1;\n    SOUND[i * N_STRIDE + N_OWNER] = -1;\n    i += 1;\n  );\n  memset(SOUNDMAP, 0, 2048);\n  md_pend_drop(-1);        // owner 0 is a real voice, so free slots must be -1\n  md_sustain = 0;\n);\n\nmd_init_consts();\nmd_ui_consts();\nmd_build_ui();\nmd_reset_state();\n\nmd_now        = 0;\nmd_agecnt     = 1;\nmd_srate      = srate;\nmd_bps        = 120 / 60 / max(srate, 1);\nmd_blk_len    = 0;\nmd_ts_num     = 4;\nmd_ts_den     = 4;\nmd_lastfile   = -1;\nmd_lastplay   = 0;\nmd_reload     = 1;\nmd_slice_dirty = 1;\nmd_src_n      = 0;\nmd_src_len    = 4;\nmd_src_tempo  = 120;\nmd_src_tsnum  = 4;\nmd_src_tsden  = 4;\nmd_nmark      = 0;\nmd_nslices    = 0;\nmd_slice_hash = -1;\nmd_scanning   = 0;\n// Deliberately NOT initialised here: md_stage_ready, md_ticket_seen,\n// md_mark_edited, md_restore_left, md_ser_*.  @serialize can run before\n// @init, and these carry what it restored.  Globals start at 0 anyway.\nstrcpy(#md_name, \"(no source)\");\n\n@slider\n\n// Parameter fan-out happens in @block (so UI-driven changes apply even when the\n// host does not re-run this section); all that is needed here is to invalidate\n// the cached slice map.\nmd_slice_dirty = 1;\nmd_ticket_poll(slider57);   // TrackFX_SetParam lands here even with no audio\n\n@block\n\nsrate != md_srate ? ( md_srate = srate; md_reset_state(); );\n\nmd_blk_start = md_now;\nmd_blk_len   = samplesblock;\nmd_blk_beat  = beat_position;\nmd_ts_num    = max(ts_num, 1);\nmd_ts_den    = max(ts_denom, 1);\nmd_bps       = max(tempo, 1) / 60 / max(srate, 1);\nmd_playing   = play_state == 1 || play_state == 5;    // playing or recording\n\n// ---- transport ------------------------------------------------------------\nplay_state != md_lastplay ? (\n  ((md_lastplay == 1 || md_lastplay == 5) && play_state != 1 && play_state != 5) ? md_panic(0);\n  md_lastplay = play_state;\n);\n\n// ---- the phrase -------------------------------------------------------------\n// 1. A phrase handed over by the importer (Import Ticket + gmem) or restored by\n//    @serialize waits in STAGE.  Installing it is the audio thread's job.\nmd_ticket_poll(slider57);\nmd_stage_ready ? (\n  md_stage_ready = 0;\n  md_panic(0);\n  md_install_stage() ? md_reload = 1;\n);\n\n// 2. The Source File slider (fallback route).  md_scanning: the GUI is stepping\n//    slider1 to list the files (md_scan_files); those values are not a choice.\nmd_load_file = md_reload && md_src_kind != 2;     // an embedded phrase has no file\n(slider1 != md_lastfile && !md_scanning) ? (\n  (md_lastfile >= 0 && md_restore_left <= 0) ? (\n    // the user picked a file: it replaces the phrase, edited markers and all\n    md_mark_edited = 0;\n    md_load_file = 1;\n  ) : (\n    // first look, or slider1 arriving with a restored project/undo state: a\n    // phrase the state carried wins; otherwise (version 1 state, or none) the\n    // file is the phrase.  Edited markers are kept either way.\n    md_src_kind != 2 ? md_load_file = 1;\n  );\n  md_lastfile = slider1;\n);\nmd_restore_left > 0 ? md_restore_left -= samplesblock;\nmd_load_file ? (\n  md_panic(0);\n  md_fh = file_open(slider1);\n  md_fh >= 0 ? (\n    md_load_handle(md_fh) ? ( strcpy_fromslider(#md_name, slider1); md_src_kind = 1; )\n                          : md_make_default();\n    file_close(md_fh);\n  ) : md_make_default();\n  md_sync_cur();\n);\n(md_load_file || md_reload) ? ( md_apply_markers(); md_slice_dirty = 1; );\nmd_reload = 0;\n\nmd_apply_params();\n\n// ---- MIDI input -----------------------------------------------------------\nwhile (midirecv(md_off, md_m1, md_m2, md_m3)) (\n  md_st = md_m1 & $xF0;\n  md_ch = md_m1 & $x0F;\n  md_t  = md_blk_start + md_off;\n\n  (md_st == $x90 && md_m3 > 0) ? (\n    md_trigger(md_m2, md_m3, md_ch, md_t);\n    p_thru ? midisend(md_off, md_m1, md_m2, md_m3);\n  ) :\n  (md_st == $x80 || (md_st == $x90 && md_m3 == 0)) ? (\n    md_note_off(md_m2, md_ch, md_t);\n    p_thru ? midisend(md_off, md_m1, md_m2, md_m3);\n  ) :\n  (md_st == $xB0 && md_m2 == 64) ? (\n    // consumed, not passed on: the instrument downstream would otherwise\n    // sustain every generated note as well and smear the phrase\n    md_m3 >= 64 ? md_sustain = 1 : ( md_sustain = 0; md_sustain_off(md_t); );\n  ) :\n  (md_st == $xB0 && (md_m2 == 120 || md_m2 == 123)) ? (\n    md_panic(md_off);\n    midisend(md_off, md_m1, md_m2, md_m3);\n  ) :\n  midisend(md_off, md_m1, md_m2, md_m3);\n);\n\n// ---- render ---------------------------------------------------------------\nmd_render_block();\nmd_now += samplesblock;\n\n@serialize\n\n// Version 2 also stores the phrase, so a project plays the same anywhere - it\n// no longer depends on a file in Data/midular/ (or on that file keeping its\n// position in the folder list, which is what the file slider really saves).\n//\n//   ver, markersEdited, nEditedMarkers, editedMarkers[],\n//   ticketSeen, hasPhrase, [phrase block: 7 header values, markers, name, notes]\n//\n// Version 1 stopped after editedMarkers; it still loads.\nmd_init_consts();\nmd_ser_avail = file_avail(0);\nmd_ser_avail >= 3 ? (\n  file_var(0, md_ser_ver);\n  file_var(0, md_mark_edited);\n  file_var(0, md_ser_nmark);\n  md_ser_nmark = md_clamp(md_ser_nmark | 0, 0, MAX_MARKERS);\n  md_ser_nmark > 0 ? file_mem(0, MARKERS_SV, md_ser_nmark);\n  md_ser_ver >= 2 ? (\n    file_var(0, md_ticket_seen);   // so the restored Import Ticket isn't a new request\n    file_var(0, md_ser_has);\n    md_ser_has ? (\n      md_ser_block(STAGE, STAGE + PB_NOTES, 1);\n      md_stage_ready = STAGE[PB_N] > 0;\n    );\n  );\n  md_reload = 1;\n  // REAPER restores slider1 alongside this state, possibly a block or two\n  // apart; for a moment its changes are part of the restore, not a user pick\n  md_restore_left = 0.3 * (md_srate > 0 ? md_srate : 48000);\n) : (\n  md_ser_avail < 0 ? (\n    // MARKERS_SV / md_ser_nmark are kept in step with every edit by\n    // md_markers_edited(), so a reload between edits and a save keeps them too\n    md_ser_ver = 2;\n    md_ser_nmark = md_mark_edited ? md_clamp(md_ser_nmark | 0, 0, MAX_MARKERS) : 0;\n    file_var(0, md_ser_ver);\n    file_var(0, md_mark_edited);\n    file_var(0, md_ser_nmark);\n    md_ser_nmark > 0 ? file_mem(0, MARKERS_SV, md_ser_nmark);\n    file_var(0, md_ticket_seen);\n    // A phrase still waiting in STAGE is the one that is about to play, so save\n    // that (the importer's undo point can be taken before @block installs it).\n    md_ser_pb    = md_stage_ready ? STAGE : CURHDR;\n    md_ser_notes = md_stage_ready ? STAGE + PB_NOTES : BUF_NOTES;\n    md_ser_has   = (md_stage_ready || md_src_kind >= 1) && md_ser_pb[PB_N] > 0;\n    file_var(0, md_ser_has);\n    md_ser_has ? md_ser_block(md_ser_pb, md_ser_notes, 0);\n  );\n);\n\n@gfx 920 600\n\ngfx_getchar();\nmd_ui_mouse();\nmd_ui_draw();\n", "midular_core.jsfx-inc": "// midular_core.jsfx-inc\n// Midular - MIDI sampler for REAPER.\n// Core layer: memory map, math helpers, source-data loading and slice analysis.\n//\n// This file only defines functions (per JSFX import rules, statements placed in\n// an imported @init section are not guaranteed to run).  All of the actual\n// initialisation happens in Midular.jsfx.\n//\n// Copyright (C) 2026  Midular contributors.  Licensed under the GPL v3.\n\n@init\n\n// ---------------------------------------------------------------------------\n// Memory map / constants\n// ---------------------------------------------------------------------------\nfunction md_init_consts()\n(\n  MD_MAGIC      = 7473;       // magic number expected as first record of a .txt source\n  MD_FMT_VER    = 1;\n\n  MAX_NOTES     = 32768;\n  NOTE_STRIDE   = 5;          // start(beats), len(beats), pitch, velocity, channel\n  BUF_NOTES     = 0;          // .. 163840\n\n  ORD_FWD       = 200000;     // note indices sorted by forward key\n  ORD_REV       = 240000;     // note indices sorted by reverse (mirrored) key\n  KEY_FWD       = 280000;     // KEY_FWD[i]  = start(i)\n  KEY_REV       = 320000;     // KEY_REV[i]  = srclen - (start(i) + len(i))\n\n  MAX_MARKERS   = 256;\n  MARKERS       = 360000;     // live marker list (source beats, kept sorted)\n  MARKERS_SV    = 360500;     // markers as stored in the project (@serialize)\n\n  MAX_SLICES    = 128;\n  SLICES        = 361000;     // stride 2: [startBeat, endBeat]\n\n  MAX_VOICES    = 16;\n  MAX_GRAINS    = 256;\n  S_STRIDE      = 16;\n  STREAMS       = 362000;     // (MAX_VOICES + MAX_GRAINS) * S_STRIDE\n  // stream fields\n  S_ACTIVE      = 0;\n  S_POS         = 1;          // current position on the virtual timeline (beats)\n  S_EVI         = 2;          // index into the active order array\n  S_DIR         = 3;          // +1 forward, -1 reversed\n  S_SEGA        = 4;          // loop return point (virtual beats)\n  S_SEGB        = 5;          // end of segment    (virtual beats)\n  S_RATE        = 6;          // virtual beats per sample (always >= 0)\n  S_LOOPS       = 7;          // completed loop passes\n  S_OWNER       = 8;          // owning voice index\n  S_TRANSP      = 9;          // extra transpose (grains)\n  S_VELSC       = 10;         // extra velocity scale (grains)\n  S_ENDSMP      = 11;         // absolute sample at which the stream expires (0 = never)\n  S_LOOPEN      = 12;         // 1 if the segment loops\n  S_LOOPMODE    = 13;         // 0 fwd, 1 rev, 2 ping-pong\n  S_GRAIN       = 14;         // 1 if this stream belongs to a grain\n\n  V_STRIDE      = 32;\n  VOICES        = 368000;\n  V_STATE       = 0;          // 0 free, 1 held, 2 releasing\n  V_KEY         = 1;\n  V_VEL         = 2;\n  V_CHAN        = 3;\n  V_STARTSMP    = 4;          // absolute sample the voice starts sounding\n  V_RELSMP      = 5;\n  V_RELLVL      = 6;\n  V_TRANSP      = 7;\n  V_RATESC      = 8;\n  V_STREAM      = 9;          // stream index used by non-granular modes\n  V_NGRAIN      = 10;\n  V_AGE         = 11;\n  V_SLICE       = 12;\n  V_GNEXT       = 13;         // next grain spawn (absolute samples)\n  V_GIDX        = 14;         // rotating grain slot\n  V_RNG         = 15;         // per-voice RNG state\n  V_ALIVE       = 16;         // 1 while any stream of this voice is still running\n  V_SEGA        = 17;         // voice segment bounds in source beats (for grains / UI)\n  V_SEGB        = 18;\n  V_DIR         = 19;\n  V_RATE        = 20;\n  V_GBASE       = 21;         // first grain slot owned by this voice\n  V_MODE        = 22;         // mode captured at trigger time\n  V_SUSHOLD     = 23;         // note-off arrived while the sustain pedal was down\n  V_HOLD        = 24;         // 1 if note-off is ignored (one-shot, slice \"until end\")\n\n  G_STRIDE      = 8;\n  GRAINS        = 369000;\n  G_OWNER       = 0;          // owning voice + 1 (0 = free)\n  G_BIRTH       = 1;          // absolute sample the current grain cycle started\n  G_LIFE        = 2;          // length of the cycle (grain length / density)\n  G_ALT         = 3;          // alternating-direction flip-flop\n\n  MAX_SOUND     = 512;\n  N_STRIDE      = 4;\n  SOUND         = 372000;     // [key, offSample, owner, used]\n  N_KEY         = 0;\n  N_OFF         = 1;\n  N_OWNER       = 2;\n  N_USED        = 3;\n  SOUNDMAP      = 375000;     // 2048 entries: chan*128+pitch -> slot+1\n\n  // note-ons that fall in a later block (humanize can push a note past the end\n  // of the current one); fired by md_pend_flush() when their block comes round\n  MAX_PEND      = 256;\n  P_STRIDE      = 6;\n  PEND          = 382000;     // [time, chan, pitch, vel, dur, owner]\n\n  MAX_CTLS      = 224;\n  C_STRIDE      = 16;\n  CTLS          = 378000;\n\n  SCRATCH       = 390000;     // MAX_NOTES scratch for sorting keys\n\n  // ---- phrase blocks ------------------------------------------------------\n  // A phrase travels as a \"phrase block\": the same layout in gmem (from the\n  // importer), in STAGE (waiting for @block to install it) and in CURHDR (the\n  // header of the phrase now playing, whose notes live in BUF_NOTES).\n  // scripts/midular_import.lua mirrors these offsets - change both together.\n  PB_N          = 8;          // note count\n  PB_LEN        = 9;          // length in beats\n  PB_TEMPO      = 10;\n  PB_TSNUM      = 11;\n  PB_TSDEN      = 12;\n  PB_NMARK      = 13;         // marker count\n  PB_NAMELEN    = 14;         // name length in bytes\n  PB_MARK       = 64;         // MAX_MARKERS marker positions\n  PB_NAME       = 320;        // NAME_MAX character codes\n  PB_NOTES      = 512;        // note records, NOTE_STRIDE each\n  NAME_MAX      = 128;\n\n  CURHDR        = 384000;     // .. 384512; markers as the phrase carried them:\n  MARKERS_OG    = CURHDR + PB_MARK;\n  STAGE         = 430000;     // .. 594352\n\n  // ---- gmem mailbox (options:gmem=Midular) ---------------------------------\n  // The importer writes a phrase block, sets G_STATE to 2 and puts G_TICKET on\n  // one instance's Import Ticket slider.  That instance - and only that one -\n  // copies it, sets G_STATE to 3 and echoes the ticket in G_ACK.\n  G_MAGIC       = 0;          // MD_MAGIC when the mailbox holds a phrase\n  G_PROTO       = 1;          // mailbox layout version, GM_PROTO\n  G_STATE       = 2;          // 0 idle, 1 being written, 2 ready, 3 taken\n  G_TICKET      = 3;\n  G_ACK         = 4;\n  GM_PROTO      = 1;\n\n  md_rng        = 12345;\n);\n\n// ---------------------------------------------------------------------------\n// Small helpers\n// ---------------------------------------------------------------------------\nfunction md_clamp(x, lo, hi) ( x < lo ? lo : (x > hi ? hi : x) );\n\n// Park-Miller LCG whose state lives in memory so every voice/grain can own one.\n//\n// The modulo is done in floating point on purpose.  EEL2's % truncates its\n// operands to (at most) 32-bit integers, but state * 16807 needs ~46 bits, so\n// `%` collapses the generator into a 3-value cycle.  Every intermediate here is\n// an integer below 2^53, so the double arithmetic is exact.\nfunction md_wrap_int(x, m) ( x - floor(x / m) * m );\n\nfunction md_rndm(p)\n(\n  (p[0] < 1 || p[0] >= 2147483647) ? p[0] = 1 + md_wrap_int(floor(abs(p[0])), 2147483646);\n  p[0] = md_wrap_int(p[0] * 16807, 2147483647);\n  p[0] * 0.0000000004656612875;\n);\n\nfunction md_rnd_bi(p) ( md_rndm(p) * 2 - 1 );\n\n// ---------------------------------------------------------------------------\n// Sorting (iterative heapsort - EEL2 forbids recursion)\n// ---------------------------------------------------------------------------\nfunction md_sift(idx, key, root, n) local(child, tmp)\n(\n  while (root * 2 + 1 < n) (\n    child = root * 2 + 1;\n    (child + 1 < n && key[idx[child]] < key[idx[child + 1]]) ? child += 1;\n    key[idx[root]] < key[idx[child]] ? (\n      tmp = idx[root]; idx[root] = idx[child]; idx[child] = tmp;\n      root = child;\n    ) : (\n      root = n;   // nothing left to do: force the loop to end\n    );\n  );\n);\n\nfunction md_heapsort(idx, key, n) local(i, tmp)\n(\n  n > 1 ? (\n    i = (n >> 1) - 1;\n    while (i >= 0) ( md_sift(idx, key, i, n); i -= 1; );\n    i = n - 1;\n    while (i > 0) (\n      tmp = idx[0]; idx[0] = idx[i]; idx[i] = tmp;\n      md_sift(idx, key, 0, i);\n      i -= 1;\n    );\n  );\n);\n\n// First index in ord[] whose key is >= pos.  Plain binary search.\nfunction md_find_ev(ord, key, n, pos) local(lo, hi, mid)\n(\n  lo = 0; hi = n;\n  while (lo < hi) (\n    mid = (lo + hi) >> 1;\n    key[ord[mid]] < pos ? lo = mid + 1 : hi = mid;\n  );\n  lo;\n);\n\n// ---------------------------------------------------------------------------\n// Source data\n// ---------------------------------------------------------------------------\nfunction md_build_order() local(i, np)\n(\n  i = 0;\n  while (i < md_src_n) (\n    np = BUF_NOTES + i * NOTE_STRIDE;\n    KEY_FWD[i] = np[0];\n    KEY_REV[i] = md_src_len - (np[0] + np[1]);\n    ORD_FWD[i] = i;\n    ORD_REV[i] = i;\n    i += 1;\n  );\n  md_heapsort(ORD_FWD, KEY_FWD, md_src_n);\n  md_heapsort(ORD_REV, KEY_REV, md_src_n);\n);\n\nfunction md_add_note(st, ln, pit, vel, chan) local(np)\n(\n  md_src_n < MAX_NOTES ? (\n    np = BUF_NOTES + md_src_n * NOTE_STRIDE;\n    np[0] = st;\n    np[1] = max(ln, 0.001);\n    np[2] = md_clamp(pit | 0, 0, 127);\n    np[3] = md_clamp(vel | 0, 1, 127);\n    np[4] = md_clamp(chan | 0, 0, 15);\n    md_src_n += 1;\n  );\n);\n\n// Built-in fallback pattern so the plug-in is usable before anything is imported.\nfunction md_make_default() local(i, p)\n(\n  md_src_n = 0;\n  md_nmark_og = 0;\n  md_src_kind = 0;\n  md_src_len = 4;\n  md_src_tempo = 120;\n  md_src_tsnum = 4;\n  md_src_tsden = 4;\n  strcpy(#md_name, \"(built-in pattern)\");\n  i = 0;\n  while (i < 16) (\n    p = 60 + (i % 4 == 0 ? 0 : (i % 4 == 1 ? 4 : (i % 4 == 2 ? 7 : 11)));\n    md_add_note(i * 0.25, 0.22, p, 100 - (i % 4) * 8, 0);\n    i % 4 == 0 ? md_add_note(i * 0.25, 0.45, p - 24, 110, 0);\n    i += 1;\n  );\n  md_build_order();\n);\n\n// Fallback for a missing or bogus length: the last note end, rounded up.\nfunction md_len_from_notes() local(i)\n(\n  md_src_len = 0;\n  i = 0;\n  while (i < md_src_n) (\n    md_src_len = max(md_src_len, BUF_NOTES[i * NOTE_STRIDE] + BUF_NOTES[i * NOTE_STRIDE + 1]);\n    i += 1;\n  );\n  md_src_len = max(ceil(md_src_len), 1);\n);\n\nfunction md_rd(h)\n(\n  file_avail(h) > 0 ? ( md_rd_ok = 1; file_var(h, md_rd_v); md_rd_v ) : ( md_rd_ok = 0; 0 );\n);\n\n// Reads a Midular source file (see docs/FORMAT.md).  Returns 1 on success.\nfunction md_load_handle(h)\n  local(magic, ver, cnt, nmark, i, st, ln, pit, vel, chn, ok)\n(\n  ok = 0;\n  h >= 0 ? (\n    magic = md_rd(h);\n    ver   = md_rd(h);\n    (md_rd_ok && magic == MD_MAGIC && ver >= 1 && ver <= MD_FMT_VER) ? (\n      md_src_n     = 0;\n      md_nmark_og  = 0;\n      md_src_len   = md_rd(h);\n      cnt          = md_rd(h) | 0;\n      md_src_tempo = md_rd(h);\n      md_src_tsnum = md_rd(h);\n      md_src_tsden = md_rd(h);\n      nmark        = md_rd(h) | 0;\n      md_rd(h); md_rd(h); md_rd(h); md_rd(h);   // reserved\n\n      md_src_tempo <= 0 ? md_src_tempo = 120;\n      md_src_tsnum <= 0 ? md_src_tsnum = 4;\n      md_src_tsden <= 0 ? md_src_tsden = 4;\n\n      cnt = md_clamp(cnt, 0, MAX_NOTES);\n      i = 0;\n      while (i < cnt && md_rd_ok) (\n        st  = md_rd(h);\n        ln  = md_rd(h);\n        pit = md_rd(h);\n        vel = md_rd(h);\n        chn = md_rd(h);\n        md_rd_ok ? md_add_note(st, ln, pit, vel, chn);\n        i += 1;\n      );\n\n      nmark = md_clamp(nmark, 0, MAX_MARKERS);\n      i = 0;\n      while (i < nmark && md_rd_ok) (\n        st = md_rd(h);\n        md_rd_ok ? ( MARKERS_OG[md_nmark_og] = st; md_nmark_og += 1; );\n        i += 1;\n      );\n\n      md_src_len <= 0 ? md_len_from_notes();\n      md_src_n > 0 ? ( md_build_order(); ok = 1; );\n    );\n  );\n  ok;\n);\n\n// ---------------------------------------------------------------------------\n// Phrase blocks: the importer's mailbox, the project copy, and installing them\n// ---------------------------------------------------------------------------\n\n// Mirror the phrase now playing into CURHDR (BUF_NOTES already holds its\n// notes), so @serialize can write it the same way whichever source it came from.\nfunction md_sync_cur() local(i, n)\n(\n  CURHDR[PB_N]     = md_src_n;\n  CURHDR[PB_LEN]   = md_src_len;\n  CURHDR[PB_TEMPO] = md_src_tempo;\n  CURHDR[PB_TSNUM] = md_src_tsnum;\n  CURHDR[PB_TSDEN] = md_src_tsden;\n  CURHDR[PB_NMARK] = md_nmark_og;\n  n = min(strlen(#md_name), NAME_MAX);\n  CURHDR[PB_NAMELEN] = n;\n  i = 0;\n  while (i < n) ( CURHDR[PB_NAME + i] = str_getchar(#md_name, i); i += 1; );\n);\n\n// Keep a phrase block's counts inside the buffers they index.\nfunction md_pb_clamp(pb)\n(\n  pb[PB_N]       = md_clamp(pb[PB_N] | 0, 0, MAX_NOTES);\n  pb[PB_NMARK]   = md_clamp(pb[PB_NMARK] | 0, 0, MAX_MARKERS);\n  pb[PB_NAMELEN] = md_clamp(pb[PB_NAMELEN] | 0, 0, NAME_MAX);\n);\n\n// Install the phrase waiting in STAGE as the playing phrase.  Called from\n// @block only: the audio thread is the one reading BUF_NOTES.\nfunction md_install_stage() local(n, i, sp, ok)\n(\n  ok = 0;\n  md_pb_clamp(STAGE);\n  n = STAGE[PB_N];\n  n > 0 ? (\n    md_src_n = 0;\n    i = 0;\n    while (i < n) (\n      sp = STAGE + PB_NOTES + i * NOTE_STRIDE;\n      md_add_note(sp[0], sp[1], sp[2], sp[3], sp[4]);\n      i += 1;\n    );\n    md_src_len   = STAGE[PB_LEN];\n    md_src_tempo = STAGE[PB_TEMPO] > 0 ? STAGE[PB_TEMPO] : 120;\n    md_src_tsnum = STAGE[PB_TSNUM] > 0 ? STAGE[PB_TSNUM] : 4;\n    md_src_tsden = STAGE[PB_TSDEN] > 0 ? STAGE[PB_TSDEN] : 4;\n    md_src_len <= 0 ? md_len_from_notes();\n\n    md_nmark_og = STAGE[PB_NMARK];\n    md_nmark_og > 0 ? memcpy(MARKERS_OG, STAGE + PB_MARK, md_nmark_og);\n\n    strcpy(#md_name, \"\");\n    i = 0;\n    while (i < STAGE[PB_NAMELEN]) ( str_setchar(#md_name, i, STAGE[PB_NAME + i]); i += 1; );\n    strlen(#md_name) < 1 ? strcpy(#md_name, \"(imported phrase)\");\n\n    md_build_order();\n    md_src_kind = 2;\n    md_sync_cur();\n    ok = 1;\n  );\n  ok;\n);\n\n// Live markers: the user's edits if there are any, else the phrase's own.\nfunction md_apply_markers()\n(\n  md_mark_edited ? (\n    md_nmark = md_clamp(md_ser_nmark | 0, 0, MAX_MARKERS);\n    md_nmark > 0 ? memcpy(MARKERS, MARKERS_SV, md_nmark);\n  ) : (\n    md_nmark = md_nmark_og;\n    md_nmark > 0 ? memcpy(MARKERS, MARKERS_OG, md_nmark);\n  );\n);\n\n// Check the Import Ticket slider.  A new value is a request from the importer:\n// if the gmem mailbox holds a ready phrase addressed with that ticket, copy it\n// to STAGE for @block to install, and acknowledge.  Runs from both @slider\n// (which fires on TrackFX_SetParam even with no audio running) and @block.\nfunction md_ticket_poll(t) local(n, i, e)\n(\n  t != md_ticket_seen ? (\n    md_ticket_seen = t;\n    (t > 0 && gmem[G_MAGIC] == MD_MAGIC && gmem[G_PROTO] == GM_PROTO &&\n     gmem[G_STATE] == 2 && gmem[G_TICKET] == t) ? (\n      i = PB_N;\n      while (i < PB_MARK) ( STAGE[i] = gmem[i]; i += 1; );\n      md_pb_clamp(STAGE);\n      n = STAGE[PB_NMARK];\n      i = 0; while (i < n) ( STAGE[PB_MARK + i] = gmem[PB_MARK + i]; i += 1; );\n      n = STAGE[PB_NAMELEN];\n      i = 0; while (i < n) ( STAGE[PB_NAME + i] = gmem[PB_NAME + i]; i += 1; );\n      e = PB_NOTES + STAGE[PB_N] * NOTE_STRIDE;\n      i = PB_NOTES; while (i < e) ( STAGE[i] = gmem[i]; i += 1; );\n\n      gmem[G_STATE] = 3;\n      gmem[G_ACK]   = t;\n      md_mark_edited = 0;        // a new phrase: edits to the old markers go\n      md_stage_ready = 1;\n    );\n  );\n);\n\n// @serialize helper: reads or writes one phrase block (header, markers, name,\n// notes) - file_mem works in both directions.\nfunction md_ser_block(pb, notes, reading)\n(\n  file_mem(0, pb + PB_N, 7);\n  reading ? md_pb_clamp(pb);\n  pb[PB_NMARK]   > 0 ? file_mem(0, pb + PB_MARK, pb[PB_NMARK]);\n  pb[PB_NAMELEN] > 0 ? file_mem(0, pb + PB_NAME, pb[PB_NAMELEN]);\n  pb[PB_N]       > 0 ? file_mem(0, notes, pb[PB_N] * NOTE_STRIDE);\n);\n\n// ---------------------------------------------------------------------------\n// Slice analysis\n// ---------------------------------------------------------------------------\nfunction md_slice_push(a, b)\n(\n  (md_nslices < MAX_SLICES && b - a > 0.000001) ? (\n    SLICES[md_nslices * 2]     = a;\n    SLICES[md_nslices * 2 + 1] = b;\n    md_nslices += 1;\n  );\n);\n\n// Equal divisions of [a,b].\nfunction md_slice_divisions(a, b, n) local(i, w)\n(\n  n = md_clamp(n | 0, 1, MAX_SLICES);\n  w = (b - a) / n;\n  i = 0;\n  while (i < n) ( md_slice_push(a + i * w, a + (i + 1) * w); i += 1; );\n);\n\n// Fixed musical grid across [a,b]; the final partial slice is kept.\nfunction md_slice_grid(a, b, g) local(t, nx)\n(\n  g <= 0 ? g = 1;\n  t = a;\n  while (t < b - 0.000001 && md_nslices < MAX_SLICES) (\n    nx = min(t + g, b);\n    md_slice_push(t, nx);\n    t = nx;\n  );\n);\n\n// Note onsets, clustered with a tolerance derived from the sensitivity control.\n// sens 0   -> coarse (1/4 note cluster, only strong onsets)\n// sens 100 -> fine   (every distinct note start becomes a slice)\nfunction md_slice_onsets(a, b, sens) local(i, ni, k, tol, last, nn, minv, vel)\n(\n  tol  = 0.5 * pow(0.02, sens / 100);          // 0.5 beat .. 0.01 beat\n  minv = (1 - sens / 100) * 48;                // ignore quiet notes at low sensitivity\n  last = -1000000;\n  nn   = 0;\n  i    = 0;\n  while (i < md_src_n && md_nslices < MAX_SLICES) (\n    ni  = ORD_FWD[i];\n    k   = KEY_FWD[ni];\n    vel = BUF_NOTES[ni * NOTE_STRIDE + 3];\n    (k >= a - 0.000001 && k < b - 0.000001 && vel >= minv && k - last > tol) ? (\n      nn > 0 ? md_slice_push(last, k) : (k > a + 0.000001 ? md_slice_push(a, k));\n      last = k;\n      nn  += 1;\n    );\n    i += 1;\n  );\n  nn > 0 ? md_slice_push(last, b) : md_slice_push(a, b);\n);\n\n// New slice whenever the leading (highest) pitch of an onset group changes.\nfunction md_slice_pitch(a, b, sens)\n  local(i, ni, k, p, tol, gstart, gtop, prevtop, last)\n(\n  tol     = 0.5 * pow(0.02, sens / 100);\n  gstart  = -1000000;\n  gtop    = -1;\n  prevtop = -1000000;\n  last    = a;\n  i       = 0;\n  while (i < md_src_n && md_nslices < MAX_SLICES) (\n    ni = ORD_FWD[i];\n    k  = KEY_FWD[ni];\n    p  = BUF_NOTES[ni * NOTE_STRIDE + 2];\n    (k >= a - 0.000001 && k < b - 0.000001) ? (\n      (gtop < 0 || k - gstart > tol) ? (\n        // the previous onset group is complete - did its leading pitch change?\n        (gtop >= 0 && gtop != prevtop) ? (\n          gstart > last + 0.000001 ? ( md_slice_push(last, gstart); last = gstart; );\n          prevtop = gtop;\n        );\n        gstart = k;\n        gtop   = p;\n      ) : (\n        gtop = max(gtop, p);\n      );\n    );\n    i += 1;\n  );\n  (gtop >= 0 && gtop != prevtop && gstart > last + 0.000001) ? ( md_slice_push(last, gstart); last = gstart; );\n  md_slice_push(last, b);\n  md_nslices == 0 ? md_slice_push(a, b);\n);\n\n// User markers (imported with the file or placed in the editor).\nfunction md_slice_markers(a, b) local(i, t, last, n)\n(\n  // markers are kept sorted by md_marker_add()\n  last = a;\n  n    = 0;\n  i    = 0;\n  while (i < md_nmark && md_nslices < MAX_SLICES) (\n    t = MARKERS[i];\n    (t > a + 0.000001 && t < b - 0.000001) ? ( md_slice_push(last, t); last = t; n += 1; );\n    i += 1;\n  );\n  md_slice_push(last, b);\n);\n\nfunction md_build_slices(a, b, method, div, grid, sens) local(g)\n(\n  md_nslices = 0;\n  b - a < 0.0001 ? b = a + 0.0001;\n  method == 0 ? md_slice_divisions(a, b, div) :\n  method == 1 ? (\n    g = grid == 0 ? 0.125 : grid == 1 ? 0.25 : grid == 2 ? 0.5 :\n        grid == 3 ? 1     : grid == 4 ? 2    :\n        grid == 5 ? md_src_tsnum * 4 / md_src_tsden :\n                    md_src_tsnum * 8 / md_src_tsden;\n    md_slice_grid(a, b, g);\n  ) :\n  method == 2 ? md_slice_onsets(a, b, sens) :\n  method == 3 ? md_slice_pitch(a, b, sens) :\n                md_slice_markers(a, b);\n  md_nslices == 0 ? md_slice_push(a, b);\n);\n\n// ---------------------------------------------------------------------------\n// Marker editing (used by the UI, persisted through @serialize)\n// ---------------------------------------------------------------------------\nfunction md_marker_add(t) local(i, j)\n(\n  md_nmark < MAX_MARKERS ? (\n    i = 0;\n    while (i < md_nmark && MARKERS[i] < t) ( i += 1; );\n    j = md_nmark;\n    while (j > i) ( MARKERS[j] = MARKERS[j - 1]; j -= 1; );\n    MARKERS[i] = t;\n    md_nmark += 1;\n  );\n);\n\nfunction md_marker_remove_near(t, tol) local(i, best, bd, d)\n(\n  best = -1; bd = tol;\n  i = 0;\n  while (i < md_nmark) (\n    d = abs(MARKERS[i] - t);\n    d < bd ? ( bd = d; best = i; );\n    i += 1;\n  );\n  best >= 0 ? (\n    while (best < md_nmark - 1) ( MARKERS[best] = MARKERS[best + 1]; best += 1; );\n    md_nmark -= 1;\n    1;\n  ) : 0;\n);\n", "midular_engine.jsfx-inc": "// midular_engine.jsfx-inc\n// Midular - MIDI sampler for REAPER.\n// Playback engine: output note pool, envelope, note filter, streams, voices,\n// slices and the granular cloud.\n//\n// Everything is scheduled on an absolute sample clock (md_now), so note-ons and\n// note-offs are emitted with sample-accurate offsets from @block.\n//\n// Copyright (C) 2026  Midular contributors.  Licensed under the GPL v3.\n\n@init\n\n// ---------------------------------------------------------------------------\n// Output note pool\n//\n// A single (channel,pitch) pair can only sound once at a time in MIDI, so the\n// pool is keyed by chan*128+pitch and re-triggering an already sounding note\n// emits its note-off first.\n// ---------------------------------------------------------------------------\nfunction md_off_at(slot, off) local(sp, key)\n(\n  sp = SOUND + slot * N_STRIDE;\n  sp[N_USED] ? (\n    key = sp[N_KEY];\n    midisend(md_clamp(off | 0, 0, max(md_blk_len - 1, 0)), $x80 + (key >> 7), key & 127, 0);\n    SOUNDMAP[key] = 0;\n    sp[N_USED]  = 0;\n    sp[N_KEY]   = -1;\n    sp[N_OWNER] = -1;\n  );\n);\n\nfunction md_sound_alloc() local(i, slot)\n(\n  slot = -1;\n  i = 0;\n  while (i < MAX_SOUND && slot < 0) (\n    SOUND[i * N_STRIDE + N_USED] ? i += 1 : slot = i;\n  );\n  slot;\n);\n\nfunction md_note_fire(chan, pitch, vel, tsmp, dursmp, owner) local(key, slot, sp, o, prev)\n(\n  key = chan * 128 + pitch;\n  o   = md_clamp((tsmp - md_blk_start) | 0, 0, max(md_blk_len - 1, 0));\n  slot = SOUNDMAP[key] - 1;\n  slot >= 0 ? (\n    // the previous note may already be due to end earlier in this block - end\n    // it then, not at the new note-on (offs are only flushed after rendering)\n    prev = SOUND[slot * N_STRIDE + N_OFF] - md_blk_start;\n    md_off_at(slot, min(o, prev));\n  );\n  slot = md_sound_alloc();\n  slot >= 0 ? (\n    sp = SOUND + slot * N_STRIDE;\n    midisend(o, $x90 + chan, pitch, vel);\n    sp[N_KEY]   = key;\n    sp[N_OFF]   = tsmp + max(dursmp, 16);\n    sp[N_OWNER] = owner;\n    sp[N_USED]  = 1;\n    SOUNDMAP[key] = slot + 1;\n  );\n);\n\n// Note-ons due in a later block are parked in PEND rather than clamped to the\n// end of this one.  A full queue drops the note, like a full sounding pool.\nfunction md_note_on(chan, pitch, vel, tsmp, dursmp, owner) local(i, pp)\n(\n  tsmp >= md_blk_start + md_blk_len ? (\n    i = 0;\n    while (i < MAX_PEND && PEND[i * P_STRIDE + 5] >= 0) ( i += 1; );\n    i < MAX_PEND ? (\n      pp = PEND + i * P_STRIDE;\n      pp[0] = tsmp; pp[1] = chan; pp[2] = pitch; pp[3] = vel; pp[4] = dursmp; pp[5] = owner;\n    );\n  ) : md_note_fire(chan, pitch, vel, tsmp, dursmp, owner);\n);\n\nfunction md_pend_flush() local(i, pp, e)\n(\n  e = md_blk_start + md_blk_len;\n  i = 0;\n  while (i < MAX_PEND) (\n    pp = PEND + i * P_STRIDE;\n    (pp[5] >= 0 && pp[0] < e) ? (\n      md_note_fire(pp[1], pp[2], pp[3], pp[0], pp[4], pp[5]);\n      pp[5] = -1;\n    );\n    i += 1;\n  );\n);\n\n// owner < 0 clears the whole queue\nfunction md_pend_drop(owner) local(i)\n(\n  i = 0;\n  while (i < MAX_PEND) (\n    (owner < 0 || PEND[i * P_STRIDE + 5] == owner) ? PEND[i * P_STRIDE + 5] = -1;\n    i += 1;\n  );\n);\n\nfunction md_flush_offs() local(i, sp, e)\n(\n  e = md_blk_start + md_blk_len;\n  i = 0;\n  while (i < MAX_SOUND) (\n    sp = SOUND + i * N_STRIDE;\n    (sp[N_USED] && sp[N_OFF] < e) ? md_off_at(i, sp[N_OFF] - md_blk_start);\n    i += 1;\n  );\n);\n\nfunction md_notes_off_owner(vi, tsmp) local(i, o)\n(\n  o = tsmp - md_blk_start;\n  i = 0;\n  while (i < MAX_SOUND) (\n    (SOUND[i * N_STRIDE + N_USED] && SOUND[i * N_STRIDE + N_OWNER] == vi) ? md_off_at(i, o);\n    i += 1;\n  );\n  md_pend_drop(vi);\n);\n\n// sounding plus still-queued notes: a voice is not finished while either remain\nfunction md_owner_notes(vi) local(i, n)\n(\n  n = 0;\n  i = 0;\n  while (i < MAX_SOUND) (\n    (SOUND[i * N_STRIDE + N_USED] && SOUND[i * N_STRIDE + N_OWNER] == vi) ? n += 1;\n    i += 1;\n  );\n  i = 0;\n  while (i < MAX_PEND) ( PEND[i * P_STRIDE + 5] == vi ? n += 1; i += 1; );\n  n;\n);\n\nfunction md_all_notes_off(off) local(i)\n(\n  i = 0;\n  while (i < MAX_SOUND) ( md_off_at(i, off); i += 1; );\n  md_pend_drop(-1);\n);\n\n// ---------------------------------------------------------------------------\n// Amplitude envelope (sampled at note-on time - MIDI has no continuous level)\n// ---------------------------------------------------------------------------\n// Linear ADSR level before the curve is applied.  The release stage starts from\n// V_RELLVL, which is stored in this same uncurved space so the curve is only\n// ever applied once.\nfunction md_env_raw(vp, tsmp) local(t, a, d, s, r, lv)\n(\n  a = p_atk * 0.001 * srate;\n  d = p_dec * 0.001 * srate;\n  s = p_sus * 0.01;\n  r = p_rel * 0.001 * srate;\n\n  vp[V_STATE] == 2 ? (\n    r <= 0 ? lv = 0 : lv = vp[V_RELLVL] * (1 - (tsmp - vp[V_RELSMP]) / r);\n  ) : (\n    t = tsmp - vp[V_STARTSMP];\n    t < 0 ? t = 0;\n    (a > 0 && t < a) ? lv = t / a :\n    (d > 0 && (t - a) < d) ? lv = 1 + (s - 1) * ((t - a) / d) :\n                             lv = s;\n  );\n  md_clamp(lv, 0, 1);\n);\n\nfunction md_env_at(vp, tsmp) local(lv, c)\n(\n  lv = md_env_raw(vp, tsmp);\n  c = p_envcurve;\n  c > 0.001  ? lv = pow(lv, 1 + c * 3) :\n  c < -0.001 ? lv = pow(lv, 1 / (1 - c * 3));\n  lv;\n);\n\n// ---------------------------------------------------------------------------\n// Multi-mode note filter\n//\n// Returns a 0..1+ weight for a pitch.  Notes whose weight falls below the\n// threshold are removed from the stream entirely; the rest are attenuated,\n// which is the MIDI equivalent of a filter slope.\n// ---------------------------------------------------------------------------\nfunction md_filt_gain(pitch, key) local(cut, d, g, w, sl, rs)\n(\n  p_fmode == 0 ? ( 1 ) : (\n    cut = p_fcut + (key - p_root) * p_fkey * 0.01;\n    sl  = max(p_fslope, 0.01);\n    w   = max(p_fwidth, 0.1);\n\n    p_fmode == 1 ? ( d = pitch - cut ) :\n    p_fmode == 2 ? ( d = cut - pitch ) :\n    p_fmode == 3 ? ( d = abs(pitch - cut) - w * 0.5 ) :\n                   ( d = w * 0.5 - abs(pitch - cut) );\n    g = d <= 0 ? 1 : 1 - d / sl;\n    g = md_clamp(g, 0, 1);\n\n    rs = p_freso * 0.01;\n    rs > 0 ? (\n      d = (pitch - cut) / max(w * 0.5, 0.5);\n      p_fmode == 4 ? g = g * (1 + rs * 1.5 * exp(-sqr(abs(d) - 1) * 2))\n                   : g = g * (1 + rs * 1.5 * exp(-sqr(d) * 0.5));\n    );\n    g;\n  );\n);\n\n// ---------------------------------------------------------------------------\n// Emitting a single source note through the whole chain\n// ---------------------------------------------------------------------------\nfunction md_emit(si, ni, tsmp)\n  local(sp, vi, vp, np, pitch, vel, dur, g, env, chan, rate, ln, win)\n(\n  sp = STREAMS + si * S_STRIDE;\n  vi = sp[S_OWNER];\n  vp = VOICES + vi * V_STRIDE;\n  np = BUF_NOTES + ni * NOTE_STRIDE;\n\n  pitch = np[2] + p_transp + vp[V_TRANSP] + sp[S_TRANSP];\n  (pitch >= 0 && pitch <= 127) ? (\n    g = md_filt_gain(pitch, vp[V_KEY]);\n    g >= p_fthresh * 0.01 ? (\n      env = md_env_at(vp, tsmp);\n      env = (1 - p_envamt * 0.01) + p_envamt * 0.01 * env;\n\n      vel = p_velmode == 0 ? np[3] :\n            p_velmode == 1 ? vp[V_VEL] :\n                             np[3] * vp[V_VEL] / 127;\n      vel = vel * p_velamt * 0.01 * env * g * sp[S_VELSC];\n\n      // grains get a soft window so the cloud breathes instead of clicking in\n      sp[S_GRAIN] ? (\n        win = 0.3 + 0.7 * sin(md_clamp(md_emit_frac, 0, 1) * $pi);\n        vel = vel * win;\n      );\n\n      p_humv > 0 ? vel += md_rnd_bi(vp + V_RNG) * p_humv;\n      vel = md_clamp(vel | 0, 0, 127);\n      vel > 0 ? (\n        rate = max(sp[S_RATE], 0.000000000001);\n        ln   = np[1] * p_gate * 0.01;\n        dur  = ln / rate;\n        chan = p_outchan == 0 ? np[4] : (p_outchan - 1);\n        p_humt > 0 ? tsmp += md_rndm(vp + V_RNG) * p_humt * 0.001 * srate;\n        md_note_on(chan, pitch | 0, vel, tsmp, dur, vi);\n      );\n    );\n  );\n);\n\n// ---------------------------------------------------------------------------\n// Streams\n//\n// A stream walks a \"virtual\" timeline.  Playing forwards the virtual timeline\n// is simply source time; playing backwards it is mirrored (t -> srclen - t), so\n// a reversed phrase keeps its note lengths and plays last-note-first.  Both\n// directions therefore use exactly the same monotonically increasing scan.\n// ---------------------------------------------------------------------------\nfunction md_stream_setup(si, vi, startPos, regA, regB, loopA, loopB, loopen, dir, rate, loopmode, isgrain)\n  local(sp, SL, a, b, p)\n(\n  sp = STREAMS + si * S_STRIDE;\n  SL = md_src_len;\n  dir >= 0 ? (\n    p = startPos;\n    a = loopen ? loopA : regA;\n    b = loopen ? loopB : regB;\n  ) : (\n    p = SL - startPos;\n    a = SL - (loopen ? loopB : regB);\n    b = SL - (loopen ? loopA : regA);\n  );\n  b - a < 0.0001 ? b = a + 0.0001;\n  p > b ? p = a;\n\n  sp[S_ACTIVE]   = 1;\n  sp[S_POS]      = p;\n  sp[S_DIR]      = dir >= 0 ? 1 : -1;\n  sp[S_SEGA]     = a;\n  sp[S_SEGB]     = b;\n  sp[S_RATE]     = max(rate, 0);\n  sp[S_LOOPS]    = 0;\n  sp[S_OWNER]    = vi;\n  sp[S_TRANSP]   = 0;\n  sp[S_VELSC]    = 1;\n  sp[S_ENDSMP]   = 0;\n  sp[S_LOOPEN]   = loopen;\n  sp[S_LOOPMODE] = loopmode;\n  sp[S_GRAIN]    = isgrain;\n  sp[S_EVI]      = md_find_ev(dir >= 0 ? ORD_FWD : ORD_REV, dir >= 0 ? KEY_FWD : KEY_REV, md_src_n, p);\n);\n\n// A voice that ignores note-off (V_HOLD) must have a natural end, so for it a\n// loop count of 0 means \"play once\" rather than \"loop forever\" - otherwise it\n// could only be stopped by voice stealing or a panic.\nfunction md_stream_end(si) local(sp, SL, na, nb, hold)\n(\n  sp = STREAMS + si * S_STRIDE;\n  sp[S_LOOPS] += 1;\n  hold = VOICES[sp[S_OWNER] * V_STRIDE + V_HOLD];\n  (sp[S_LOOPEN] && (p_loopcnt == 0 ? !hold : sp[S_LOOPS] < p_loopcnt)) ? (\n    sp[S_LOOPMODE] == 2 ? (\n      SL = md_src_len;\n      na = SL - sp[S_SEGB];\n      nb = SL - sp[S_SEGA];\n      sp[S_SEGA] = na;\n      sp[S_SEGB] = nb;\n      sp[S_DIR]  = -sp[S_DIR];\n      sp[S_POS]  = na;\n    ) : (\n      sp[S_POS] = sp[S_SEGA];\n    );\n    sp[S_EVI] = md_find_ev(sp[S_DIR] > 0 ? ORD_FWD : ORD_REV,\n                           sp[S_DIR] > 0 ? KEY_FWD : KEY_REV,\n                           md_src_n, sp[S_POS]);\n  ) : (\n    sp[S_ACTIVE] = 0;\n  );\n);\n\nfunction md_stream_render(si, basesmp, nsmp)\n  local(sp, pos, newpos, rate, chunk, remain, curoff, tolimit, i, n, ord, keyb, evk, guard, span)\n(\n  sp = STREAMS + si * S_STRIDE;\n  (sp[S_ACTIVE] && nsmp > 0) ? (\n    remain = nsmp;\n    curoff = 0;\n    guard  = 0;\n    n      = md_src_n;\n    while (remain > 0.000000001 && sp[S_ACTIVE] && (guard += 1) < 512) (\n      sp[S_DIR] > 0 ? ( ord = ORD_FWD; keyb = KEY_FWD; ) : ( ord = ORD_REV; keyb = KEY_REV; );\n      pos     = sp[S_POS];\n      rate    = sp[S_RATE];\n      tolimit = rate > 0.000000000001 ? (sp[S_SEGB] - pos) / rate : 1000000000;\n      tolimit < 0 ? tolimit = 0;\n      chunk   = min(remain, tolimit);\n      newpos  = pos + rate * chunk;\n      span    = max(sp[S_SEGB] - sp[S_SEGA], 0.000000001);\n\n      i = sp[S_EVI];\n      while (i < n && keyb[ord[i]] < newpos) (\n        evk = keyb[ord[i]];\n        evk >= pos ? (\n          md_emit_frac = (evk - sp[S_SEGA]) / span;\n          md_emit(si, ord[i], basesmp + curoff + (evk - pos) / max(rate, 0.000000000001));\n        );\n        i += 1;\n      );\n      sp[S_EVI] = i;\n      sp[S_POS] = newpos;\n      curoff   += chunk;\n      remain   -= chunk;\n\n      newpos >= sp[S_SEGB] - 0.000000001 ? md_stream_end(si);\n      (sp[S_ENDSMP] > 0 && basesmp + curoff >= sp[S_ENDSMP]) ? sp[S_ACTIVE] = 0;\n    );\n  );\n);\n\n// ---------------------------------------------------------------------------\n// Grains\n// ---------------------------------------------------------------------------\nfunction md_grain_free(vi) local(vp, i, g)\n(\n  vp = VOICES + vi * V_STRIDE;\n  i = 0;\n  while (i < vp[V_NGRAIN]) (\n    g = vp[V_GBASE] + i;\n    GRAINS[g * G_STRIDE + G_OWNER] = 0;\n    STREAMS[(MAX_VOICES + g) * S_STRIDE + S_ACTIVE] = 0;\n    i += 1;\n  );\n  vp[V_NGRAIN] = 0;\n);\n\n// Reserve a contiguous run of grain slots; shrinks the request if the pool is busy.\nfunction md_grain_reserve(vi, want) local(i, run, start, got)\n(\n  want = md_clamp(want | 0, 1, MAX_GRAINS);\n  got  = 0;\n  while (want >= 1 && got == 0) (\n    i = 0; run = 0; start = 0;\n    while (i < MAX_GRAINS && got == 0) (\n      GRAINS[i * G_STRIDE + G_OWNER] == 0 ? (\n        run == 0 ? start = i;\n        run += 1;\n        run >= want ? got = 1;\n      ) : ( run = 0 );\n      i += 1;\n    );\n    got ? (\n      i = 0;\n      while (i < want) (\n        GRAINS[(start + i) * G_STRIDE + G_OWNER] = vi + 1;\n        GRAINS[(start + i) * G_STRIDE + G_BIRTH] = 0;\n        GRAINS[(start + i) * G_STRIDE + G_LIFE]  = 0;\n        GRAINS[(start + i) * G_STRIDE + G_ALT]   = 0;\n        i += 1;\n      );\n      VOICES[vi * V_STRIDE + V_GBASE]  = start;\n      VOICES[vi * V_STRIDE + V_NGRAIN] = want;\n    ) : ( want = want >> 1 );\n  );\n  got;\n);\n\nfunction md_grain_spawn(vi, g, tsmp)\n  local(vp, sp, gp, si, a, b, L, pos, size, dir, life, ctr, pit, endp)\n(\n  vp = VOICES + vi * V_STRIDE;\n  gp = GRAINS + g * G_STRIDE;\n  si = MAX_VOICES + g;\n\n  a = vp[V_SEGA];\n  b = vp[V_SEGB];\n  L = max(b - a, 0.0001);\n  size = md_clamp(p_gsize, 0.005, L);\n\n  // motion drifts the cloud across the region as project time passes\n  ctr = p_gmotion * (tsmp - vp[V_STARTSMP]) * md_bps;\n\n  p_gshape == 0 ? pos = a + ((g - vp[V_GBASE]) / max(vp[V_NGRAIN], 1)) * L + ctr :\n  p_gshape == 1 ? pos = a + md_rndm(vp + V_RNG) * L + ctr :\n                  pos = a + L * 0.5 + ctr + md_rnd_bi(vp + V_RNG) * L * 0.25;\n  p_gspray > 0 ? pos += md_rnd_bi(vp + V_RNG) * p_gspray * 0.01 * L;\n\n  // EEL2's % is integer-only, so wrap by hand\n  pos = pos - floor((pos - a) / L) * L;\n  endp = min(pos + size, b);\n  endp - pos < 0.0001 ? ( pos = a; endp = min(a + size, b); );\n\n  p_gdir == 0 ? dir = 1 :\n  p_gdir == 1 ? dir = -1 :\n  p_gdir == 2 ? ( gp[G_ALT] = 1 - gp[G_ALT]; dir = gp[G_ALT] > 0 ? 1 : -1; ) :\n                ( dir = md_rndm(vp + V_RNG) < 0.5 ? -1 : 1 );\n\n  pit = p_gpitch > 0 ? floor(md_rnd_bi(vp + V_RNG) * p_gpitch + 0.5) : 0;\n\n  md_stream_setup(si, vi, dir >= 0 ? pos : endp, pos, endp, 0, 0, 0, dir, vp[V_RATE], 0, 1);\n  sp = STREAMS + si * S_STRIDE;\n  sp[S_TRANSP] = pit;\n\n  life = (endp - pos) / max(vp[V_RATE], 0.000000000001);\n  sp[S_ENDSMP] = tsmp + life + 1;\n  gp[G_BIRTH]  = tsmp;\n  gp[G_LIFE]   = max(life * 100 / md_clamp(p_gdens, 1, 100), 16);\n);\n\nfunction md_gran_render(vi, basesmp, nsmp) local(vp, i, g, si, sp, gp, cyc, st)\n(\n  vp = VOICES + vi * V_STRIDE;\n  i = 0;\n  while (i < vp[V_NGRAIN]) (\n    g  = vp[V_GBASE] + i;\n    si = MAX_VOICES + g;\n    sp = STREAMS + si * S_STRIDE;\n    gp = GRAINS  + g  * G_STRIDE;\n\n    sp[S_ACTIVE] ? md_stream_render(si, basesmp, nsmp);\n\n    // grains keep respawning through the release stage; the envelope fades them\n    // out and md_render_block() retires the voice once it reaches zero\n    cyc = gp[G_BIRTH] + gp[G_LIFE];\n    (vp[V_STATE] && !sp[S_ACTIVE] && basesmp + nsmp > cyc) ? (\n      st = max(basesmp, cyc);\n      md_grain_spawn(vi, g, st);\n      md_stream_render(si, st, basesmp + nsmp - st);\n    );\n    i += 1;\n  );\n);\n\n// ---------------------------------------------------------------------------\n// Voices\n// ---------------------------------------------------------------------------\nfunction md_voice_alive(vi) local(vp, i, n, a)\n(\n  vp = VOICES + vi * V_STRIDE;\n  a  = STREAMS[vi * S_STRIDE + S_ACTIVE];\n  (a == 0 && vp[V_NGRAIN] > 0) ? a = 1;   // a granular voice lives until its envelope ends\n  a;\n);\n\nfunction md_voice_kill(vi, tsmp) local(vp)\n(\n  vp = VOICES + vi * V_STRIDE;\n  vp[V_STATE] ? (\n    STREAMS[vi * S_STRIDE + S_ACTIVE] = 0;\n    vp[V_NGRAIN] > 0 ? md_grain_free(vi);\n    md_notes_off_owner(vi, tsmp);\n    vp[V_STATE]   = 0;\n    vp[V_SUSHOLD] = 0;\n  );\n);\n\nfunction md_voice_release(vi, tsmp) local(vp)\n(\n  vp = VOICES + vi * V_STRIDE;\n  vp[V_STATE] == 1 ? (\n    vp[V_RELLVL] = md_env_raw(vp, tsmp);\n    vp[V_STATE]  = 2;\n    vp[V_RELSMP] = tsmp;\n    p_rel <= 0 ? md_voice_kill(vi, tsmp);\n  );\n);\n\nfunction md_voice_alloc(tsmp) local(i, vp, free, oldrel, oldrela, oldest, oldesta, nact)\n(\n  free = -1; oldrel = -1; oldrela = 1000000000; oldest = -1; oldesta = 1000000000; nact = 0;\n  i = 0;\n  while (i < MAX_VOICES) (\n    vp = VOICES + i * V_STRIDE;\n    vp[V_STATE] == 0 ? ( free < 0 ? free = i ) : (\n      nact += 1;\n      (vp[V_STATE] == 2 && vp[V_AGE] < oldrela) ? ( oldrela = vp[V_AGE]; oldrel = i; );\n      vp[V_AGE] < oldesta ? ( oldesta = vp[V_AGE]; oldest = i; );\n    );\n    i += 1;\n  );\n  (nact >= p_poly || free < 0) ? (\n    i = oldrel >= 0 ? oldrel : oldest;\n    i >= 0 ? ( md_voice_kill(i, tsmp); free = i; );\n  );\n  free;\n);\n\nfunction md_active_voice() local(i, r)\n(\n  r = -1;\n  i = 0;\n  while (i < MAX_VOICES && r < 0) ( VOICES[i * V_STRIDE + V_STATE] ? r = i; i += 1; );\n  r;\n);\n\n// Warp ratio: source beats consumed per project beat.\nfunction md_warp_ratio()\n(\n  p_warp == 0 ? (md_src_tempo / 60) / max(tempo / 60, 0.000000001) * p_speed :\n  p_warp == 1 ? p_speed :\n                (md_src_len / max(p_fixlen, 0.01)) * p_speed;\n);\n\nfunction md_quantize_start(tsmp) local(g, bt, tgt)\n(\n  g = p_tquant == 1 ? 0.25 :\n      p_tquant == 2 ? 0.5  :\n      p_tquant == 3 ? 1    :\n      p_tquant == 4 ? 2    :\n      p_tquant == 5 ? md_ts_num * 4 / md_ts_den : 0;\n  (g > 0 && md_playing && md_bps > 0) ? (\n    bt  = md_blk_beat + (tsmp - md_blk_start) * md_bps;\n    tgt = ceil(bt / g - 0.000001) * g;\n    tsmp = tsmp + (tgt - bt) / md_bps;\n  );\n  tsmp;\n);\n\nfunction md_voice_start(vi, key, vel, chan, tsmp, sl)\n  local(vp, a, b, la, lb, span, rate, dir, loopen, startp, ratio, i)\n(\n  vp = VOICES + vi * V_STRIDE;\n\n  vp[V_STATE]    = 1;\n  vp[V_KEY]      = key;\n  vp[V_VEL]      = vel;\n  vp[V_CHAN]     = chan;\n  vp[V_RELSMP]   = 0;\n  vp[V_RELLVL]   = 1;\n  vp[V_SUSHOLD]  = 0;\n  vp[V_MODE]     = p_mode;\n  vp[V_HOLD]     = (p_mode == 1) || (p_mode == 2 && p_slgate == 0);\n  vp[V_SLICE]    = sl;\n  vp[V_NGRAIN]   = 0;\n  vp[V_AGE]      = md_agecnt;\n  md_agecnt     += 1;\n  vp[V_RNG]      = 1 + md_wrap_int(p_gseed * 7919 + key * 131 + md_agecnt * 17, 2147483646);\n  vp[V_STARTSMP] = md_quantize_start(tsmp);\n\n  // --- pitch / rate mapping -------------------------------------------------\n  // V_RATESC is the voice's own speed factor; the tempo-dependent part is\n  // re-applied every block in md_render_block() so held voices follow tempo,\n  // Speed and Warp changes.\n  vp[V_TRANSP] = 0;\n  vp[V_RATESC] = 1;\n  p_mode != 2 ? (\n    p_keytrack == 1 ? vp[V_TRANSP] = key - p_root :\n    p_keytrack == 2 ? vp[V_RATESC] = pow(2, (key - p_root) / 12);\n  );\n  rate = md_base_rate * vp[V_RATESC];\n  vp[V_RATE] = rate;\n\n  // --- region ---------------------------------------------------------------\n  (p_mode == 2 && sl >= 0) ? (\n    a = SLICES[sl * 2];\n    b = SLICES[sl * 2 + 1];\n  ) : (\n    a = md_reg_a;\n    b = md_reg_b;\n  );\n  span = max(b - a, 0.0001);\n  vp[V_SEGA] = a;\n  vp[V_SEGB] = b;\n\n  la = a + span * p_loopstart * 0.01;\n  lb = la + span * p_looplen * 0.01;\n  lb = min(lb, b);\n  la = min(la, lb - 0.0001);\n  la < a ? la = a;\n\n  // a voice that ignores note-off only loops for a finite Loop Count; with\n  // count 0 it plays the region once (see md_stream_end)\n  loopen = (p_mode == 3 || (vp[V_HOLD] && p_loopcnt == 0)) ? 0 : p_loopon;\n  dir    = p_reverse ? -1 : 1;\n  (loopen && p_loopmode == 1) ? dir = -dir;\n  vp[V_DIR] = dir;\n\n  // --- transport lock -------------------------------------------------------\n  startp = dir >= 0 ? a : b;\n  (p_startmode == 1 && md_playing && p_mode != 2) ? (\n    ratio  = md_ratio;\n    startp = md_blk_beat + (vp[V_STARTSMP] - md_blk_start) * md_bps;\n    startp = startp * ratio;\n    startp = startp - floor(startp / span) * span;     // phase into the region\n    // reverse playback runs from the region end, so the phase counts back from b\n    dir >= 0 ? (\n      startp = a + startp;\n      startp > b ? startp = a;\n    ) : (\n      startp = b - startp;\n      startp < a ? startp = b;\n    );\n  );\n\n  p_mode == 3 ? (\n    md_grain_reserve(vi, p_gcount) ? (\n      // \"Even\" spawns the whole cloud at once (the region is split in parallel);\n      // the random shapes stagger the first cycle so the cloud fades in.\n      la = p_gshape == 0 ? 0 : md_clamp(p_gsize, 0.005, span) / max(rate, 0.000000000001);\n      i = 0;\n      while (i < vp[V_NGRAIN]) (\n        GRAINS[(vp[V_GBASE] + i) * G_STRIDE + G_BIRTH] = vp[V_STARTSMP] - 1;\n        GRAINS[(vp[V_GBASE] + i) * G_STRIDE + G_LIFE]  = la * i / vp[V_NGRAIN];\n        GRAINS[(vp[V_GBASE] + i) * G_STRIDE + G_ALT]   = 0;\n        i += 1;\n      );\n    ) : ( vp[V_STATE] = 0 );\n  ) : (\n    md_stream_setup(vi, vi, startp, a, b, la, lb, loopen, dir, rate, p_loopmode, 0);\n  );\n);\n\nfunction md_trigger(key, vel, chan, tsmp) local(vi, sl, av, vp)\n(\n  md_src_n > 0 ? (\n    sl = -1;\n    p_mode == 2 ? (\n      sl = key - p_slroot;\n      (sl < 0 || sl >= md_nslices) ? sl = -2;\n    );\n    sl != -2 ? (\n      av = md_active_voice();\n      (p_mode == 1 && av >= 0 && p_osretrig == 1) ? (\n        0;                                   // ignore retriggers while playing\n      ) : (\n        (p_mode == 1 && av >= 0 && p_osretrig == 2) ? (\n          // legato: keep the playhead, adopt the new key\n          vp = VOICES + av * V_STRIDE;\n          vp[V_KEY] = key;\n          vp[V_VEL] = vel;\n          p_keytrack == 1 ? vp[V_TRANSP] = key - p_root;\n          p_keytrack == 2 ? (\n            vp[V_RATESC] = pow(2, (key - p_root) / 12);\n            vp[V_RATE]   = md_base_rate * vp[V_RATESC];\n            STREAMS[av * S_STRIDE + S_RATE] = vp[V_RATE];\n          );\n        ) : (\n          (p_mode == 1 || p_choke) ? (\n            vi = 0;\n            while (vi < MAX_VOICES) ( VOICES[vi * V_STRIDE + V_STATE] ? md_voice_kill(vi, tsmp); vi += 1; );\n          );\n          vi = md_voice_alloc(tsmp);\n          vi >= 0 ? md_voice_start(vi, key, vel, chan, tsmp, sl);\n        );\n      );\n    );\n  );\n);\n\n// One-shot always plays to the end; slice mode can be told to do the same.\n// That is decided per voice at trigger time (V_HOLD), so switching mode while a\n// key is down cannot strand a looping voice that no longer listens to note-off.\nfunction md_note_off(key, chan, tsmp) local(i, vp)\n(\n  i = 0;\n  while (i < MAX_VOICES) (\n    vp = VOICES + i * V_STRIDE;\n    (vp[V_STATE] == 1 && !vp[V_HOLD] && vp[V_KEY] == key && vp[V_CHAN] == chan) ? (\n      md_sustain ? vp[V_SUSHOLD] = 1 : md_voice_release(i, tsmp);\n    );\n    i += 1;\n  );\n);\n\nfunction md_sustain_off(tsmp) local(i, vp)\n(\n  i = 0;\n  while (i < MAX_VOICES) (\n    vp = VOICES + i * V_STRIDE;\n    (vp[V_STATE] == 1 && vp[V_SUSHOLD]) ? ( vp[V_SUSHOLD] = 0; md_voice_release(i, tsmp); );\n    i += 1;\n  );\n);\n\nfunction md_panic(off) local(i)\n(\n  i = 0;\n  while (i < MAX_VOICES) (\n    VOICES[i * V_STRIDE + V_STATE] ? md_voice_kill(i, md_blk_start + off);\n    i += 1;\n  );\n  md_all_notes_off(off);\n  md_sustain = 0;\n);\n\n// ---------------------------------------------------------------------------\n// Per-block rendering\n// ---------------------------------------------------------------------------\nfunction md_render_block() local(i, vp, st, n, e)\n(\n  e = md_blk_start + md_blk_len;\n  md_pend_flush();\n  i = 0;\n  while (i < MAX_VOICES) (\n    vp = VOICES + i * V_STRIDE;\n    vp[V_STATE] ? (\n      // follow tempo / Speed / Warp changes; grains pick this up on respawn\n      vp[V_RATE] = md_base_rate * vp[V_RATESC];\n      vp[V_NGRAIN] == 0 ? STREAMS[i * S_STRIDE + S_RATE] = vp[V_RATE];\n\n      st = max(md_blk_start, vp[V_STARTSMP]);\n      n  = e - st;\n      n > 0 ? (\n        vp[V_NGRAIN] > 0 ? md_gran_render(i, st, n) : md_stream_render(i, st, n);\n      );\n\n      (vp[V_STATE] == 2 && md_env_at(vp, e) <= 0.0001) ? md_voice_kill(i, e);\n\n      (vp[V_STATE] && md_voice_alive(i) == 0 && md_owner_notes(i) == 0) ? md_voice_kill(i, e);\n\n      // a held voice whose envelope has decayed all the way to zero is done\n      (vp[V_STATE] == 1 && p_sus <= 0 && p_envamt >= 100 &&\n       md_env_at(vp, e) <= 0.0001 && md_owner_notes(i) == 0) ? md_voice_kill(i, e);\n    );\n    i += 1;\n  );\n  md_flush_offs();\n);\n", "midular_ui.jsfx-inc": "// midular_ui.jsfx-inc\n// Midular - MIDI sampler for REAPER.\n// Custom @gfx interface: piano-roll source display with live playheads, slice\n// markers and grain positions, plus a table-driven control panel.\n//\n// Copyright (C) 2026  Midular contributors.  Licensed under the GPL v3.\n\n@init\n\n// ---------------------------------------------------------------------------\n// Control table\n// ---------------------------------------------------------------------------\nfunction md_ui_consts()\n(\n  C_TYPE = 0; C_SL = 1; C_DEF = 2; C_MIN = 3; C_MAX = 4; C_STEP = 5;\n  C_X = 6; C_Y = 7; C_W = 8; C_H = 9; C_PAGE = 10; C_LABEL = 11; C_OPTS = 12;\n\n  CT_KNOB = 1; CT_SELECT = 2; CT_TOGGLE = 3;\n\n  UI_W = 920; UI_H = 600;\n  RL_X = 14; RL_Y = 44; RL_W = 892; RL_H = 196;      // piano roll\n  TB_Y = 250; TB_H = 26;                              // tab bar\n  PN_Y = 284;                                         // control panel\n  KN_W = 118; KN_H = 116;\n  md_nctl = 0;\n  md_page = 1;\n  md_drag = -1;\n);\n\nfunction md_ctl_add(type, sl, def, mn, mx, st, x, y, w, h, page, label, opts) local(c)\n(\n  md_nctl < MAX_CTLS ? (\n    c = CTLS + md_nctl * C_STRIDE;\n    c[C_TYPE] = type; c[C_SL] = sl; c[C_DEF] = def;\n    c[C_MIN] = mn; c[C_MAX] = mx; c[C_STEP] = st;\n    c[C_X] = x; c[C_Y] = y; c[C_W] = w; c[C_H] = h;\n    c[C_PAGE] = page; c[C_LABEL] = label; c[C_OPTS] = opts;\n    md_nctl += 1;\n  );\n);\n\n// Adds a control into column `col` (0..6) / row `row` (0..1) of a panel page.\nfunction md_ctl_cell(type, sl, def, mn, mx, st, col, row, page, label, opts)\n(\n  md_ctl_add(type, sl, def, mn, mx, st,\n             16 + col * 126, PN_Y + 6 + row * 124, KN_W, KN_H, page, label, opts);\n);\n\n// ---------------------------------------------------------------------------\n// Drawing helpers\n// ---------------------------------------------------------------------------\nfunction md_txt(x, y, w, h, s, flags) ( gfx_x = x; gfx_y = y; gfx_drawstr(s, flags, x + w, y + h); );\n\nfunction md_arc(cx, cy, r, a0, a1, steps) local(i, a, da, px, py, nx, ny)\n(\n  da = (a1 - a0) / steps;\n  a  = a0;\n  px = cx + sin(a) * r; py = cy - cos(a) * r;\n  i = 0;\n  while (i < steps) (\n    a += da;\n    nx = cx + sin(a) * r; ny = cy - cos(a) * r;\n    gfx_line(px, py, nx, ny, 1);\n    px = nx; py = ny;\n    i += 1;\n  );\n);\n\n// Copies the nth \"|\"-delimited field of src into dst.\nfunction md_field(dst, src, n) local(i, l, f, c)\n(\n  strcpy(dst, \"\");\n  l = strlen(src);\n  i = 0; f = 0;\n  while (i < l) (\n    c = str_getchar(src, i);\n    c == $'|' ? ( f += 1; f > n ? i = l; ) :\n    ( f == n ? str_setchar(dst, strlen(dst), c) );\n    i += 1;\n  );\n  dst;\n);\n\nfunction md_ctl_val(ci) ( slider(CTLS[ci * C_STRIDE + C_SL]) );\n\nfunction md_ctl_set(ci, v) local(c, sl, st)\n(\n  c  = CTLS + ci * C_STRIDE;\n  sl = c[C_SL];\n  st = c[C_STEP];\n  st > 0 ? v = floor(v / st + 0.5) * st;\n  v = md_clamp(v, c[C_MIN], c[C_MAX]);\n  slider(sl) = v;\n  sliderchange(2 ^ (sl - 1));\n  slider_automate(2 ^ (sl - 1));\n);\n\nfunction md_ctl_valstr(dst, ci) local(c, v)\n(\n  c = CTLS + ci * C_STRIDE;\n  v = slider(c[C_SL]);\n  c[C_TYPE] == CT_KNOB ? sprintf(dst, c[C_OPTS], v) : md_field(dst, c[C_OPTS], v | 0);\n  dst;\n);\n\nfunction md_draw_knob(ci, hot) local(c, cx, cy, r, v, f, a, a0, a1)\n(\n  c  = CTLS + ci * C_STRIDE;\n  cx = c[C_X] + c[C_W] * 0.5;\n  cy = c[C_Y] + 46;\n  r  = 24;\n  v  = slider(c[C_SL]);\n  f  = md_clamp((v - c[C_MIN]) / max(c[C_MAX] - c[C_MIN], 0.000000001), 0, 1);\n  a0 = -2.3562; a1 = 2.3562;\n  a  = a0 + (a1 - a0) * f;\n\n  gfx_set(0.14, 0.15, 0.19, 1);\n  gfx_circle(cx, cy, r + 3, 1, 1);\n  gfx_set(0.26, 0.28, 0.34, 1);\n  md_arc(cx, cy, r, a0, a1, 26);\n  hot ? gfx_set(0.45, 0.85, 1.0, 1) : gfx_set(0.28, 0.66, 0.92, 1);\n  md_arc(cx, cy, r, a0, a, 24);\n  md_arc(cx, cy, r - 1, a0, a, 24);\n  gfx_set(0.88, 0.92, 0.97, 1);\n  gfx_line(cx + sin(a) * (r - 13), cy - cos(a) * (r - 13),\n           cx + sin(a) * (r - 2),  cy - cos(a) * (r - 2), 1);\n\n  gfx_set(0.62, 0.66, 0.73, 1);\n  md_txt(c[C_X], c[C_Y], c[C_W], 14, c[C_LABEL], 1 | 4);\n  gfx_set(0.90, 0.93, 0.98, 1);\n  md_ctl_valstr(#md_tmp, ci);\n  md_txt(c[C_X], c[C_Y] + 76, c[C_W], 16, #md_tmp, 1 | 4);\n);\n\nfunction md_draw_select(ci, hot) local(c, x, y, w)\n(\n  c = CTLS + ci * C_STRIDE;\n  x = c[C_X] + 6; y = c[C_Y] + 34; w = c[C_W] - 12;\n  gfx_set(0.62, 0.66, 0.73, 1);\n  md_txt(c[C_X], c[C_Y] + 14, c[C_W], 14, c[C_LABEL], 1 | 4);\n  hot ? gfx_set(0.22, 0.30, 0.40, 1) : gfx_set(0.16, 0.18, 0.23, 1);\n  gfx_rect(x, y, w, 24);\n  gfx_set(0.32, 0.36, 0.44, 1);\n  gfx_rect(x, y, w, 1); gfx_rect(x, y + 23, w, 1);\n  gfx_rect(x, y, 1, 24); gfx_rect(x + w - 1, y, 1, 24);\n  gfx_set(0.88, 0.92, 0.98, 1);\n  md_ctl_valstr(#md_tmp, ci);\n  md_txt(x, y + 4, w, 16, #md_tmp, 1 | 4);\n);\n\nfunction md_draw_toggle(ci, hot) local(c, x, y, w, on)\n(\n  c  = CTLS + ci * C_STRIDE;\n  on = slider(c[C_SL]) >= 0.5;\n  x = c[C_X] + 18; y = c[C_Y] + 36; w = c[C_W] - 36;\n  gfx_set(0.62, 0.66, 0.73, 1);\n  md_txt(c[C_X], c[C_Y] + 14, c[C_W], 14, c[C_LABEL], 1 | 4);\n  on ? gfx_set(0.16, 0.52, 0.72, 1) : (hot ? gfx_set(0.22, 0.24, 0.30, 1) : gfx_set(0.15, 0.16, 0.20, 1));\n  gfx_rect(x, y, w, 24);\n  gfx_set(0.34, 0.38, 0.46, 1);\n  gfx_rect(x, y, w, 1); gfx_rect(x, y + 23, w, 1);\n  gfx_rect(x, y, 1, 24); gfx_rect(x + w - 1, y, 1, 24);\n  gfx_set(0.92, 0.95, 1.0, 1);\n  md_ctl_valstr(#md_tmp, ci);\n  md_txt(x, y + 4, w, 16, #md_tmp, 1 | 4);\n);\n\n// ---------------------------------------------------------------------------\n// Piano roll\n// ---------------------------------------------------------------------------\nfunction md_roll_x(t) ( RL_X + md_clamp(t / max(md_src_len, 0.000001), 0, 1) * RL_W );\n\nfunction md_draw_roll() local(i, np, x0, x1, y, h, lo, hi, v, span, s, vp, pos, dir, sl, gi)\n(\n  gfx_set(0.09, 0.10, 0.13, 1);\n  gfx_rect(RL_X, RL_Y, RL_W, RL_H);\n\n  md_src_n > 0 ? (\n    lo = 127; hi = 0;\n    i = 0;\n    while (i < md_src_n) (\n      np = BUF_NOTES + i * NOTE_STRIDE;\n      lo = min(lo, np[2]); hi = max(hi, np[2]);\n      i += 1;\n    );\n    lo -= 2; hi += 2;\n    span = max(hi - lo, 6);\n    h    = max(RL_H / span, 2);\n\n    // bar grid\n    gfx_set(0.16, 0.17, 0.21, 1);\n    s = max(md_src_tsnum * 4 / max(md_src_tsden, 1), 0.25);\n    i = 0;\n    while (i * s <= md_src_len && i < 256) ( x0 = md_roll_x(i * s); gfx_rect(x0, RL_Y, 1, RL_H); i += 1; );\n\n    // region + loop shading\n    gfx_set(0.20, 0.42, 0.58, 0.16);\n    x0 = md_roll_x(md_reg_a); x1 = md_roll_x(md_reg_b);\n    gfx_rect(x0, RL_Y, max(x1 - x0, 1), RL_H);\n    p_loopon ? (\n      gfx_set(0.95, 0.72, 0.25, 0.55);\n      x0 = md_roll_x(md_loop_a); x1 = md_roll_x(md_loop_b);\n      gfx_rect(x0, RL_Y, 1, RL_H); gfx_rect(x1 - 1, RL_Y, 1, RL_H);\n      gfx_set(0.95, 0.72, 0.25, 0.10);\n      gfx_rect(x0, RL_Y, max(x1 - x0, 1), RL_H);\n    );\n\n    // slice boundaries\n    p_mode == 2 ? (\n      gfx_set(0.45, 0.90, 0.62, 0.7);\n      i = 0;\n      while (i < md_nslices) (\n        x0 = md_roll_x(SLICES[i * 2]);\n        gfx_rect(x0, RL_Y, 1, RL_H);\n        gfx_set(0.45, 0.90, 0.62, 0.35);\n        md_txt(x0 + 2, RL_Y + 2, 40, 12, sprintf(#md_tmp, \"%d\", i + 1), 0);\n        gfx_set(0.45, 0.90, 0.62, 0.7);\n        i += 1;\n      );\n    );\n\n    // user markers\n    gfx_set(0.85, 0.45, 0.95, 0.8);\n    i = 0;\n    while (i < md_nmark) ( x0 = md_roll_x(MARKERS[i]); gfx_rect(x0, RL_Y, 1, RL_H); i += 1; );\n\n    // notes\n    i = 0;\n    while (i < md_src_n) (\n      np = BUF_NOTES + i * NOTE_STRIDE;\n      x0 = md_roll_x(np[0]);\n      x1 = md_roll_x(np[0] + np[1]);\n      y  = RL_Y + RL_H - (np[2] - lo + 1) * h;\n      v  = 0.35 + 0.55 * np[3] / 127;\n      s  = md_filt_gain(np[2] + p_transp, p_root) >= p_fthresh * 0.01;\n      s ? gfx_set(0.30 * v, 0.72 * v, 0.98 * v, 1) : gfx_set(0.26, 0.27, 0.31, 1);\n      gfx_rect(x0, y, max(x1 - x0, 2), max(h - 1, 2));\n      i += 1;\n    );\n\n    // live playheads\n    i = 0;\n    while (i < MAX_VOICES) (\n      vp = VOICES + i * V_STRIDE;\n      vp[V_STATE] ? (\n        vp[V_NGRAIN] > 0 ? (\n          gi = 0;\n          while (gi < vp[V_NGRAIN]) (\n            s = STREAMS + (MAX_VOICES + vp[V_GBASE] + gi) * S_STRIDE;\n            s[S_ACTIVE] ? (\n              pos = s[S_DIR] > 0 ? s[S_POS] : md_src_len - s[S_POS];\n              gfx_set(1.0, 0.55, 0.30, 0.55);\n              gfx_rect(md_roll_x(pos), RL_Y, 1, RL_H);\n            );\n            gi += 1;\n          );\n        ) : (\n          s = STREAMS + i * S_STRIDE;\n          s[S_ACTIVE] ? (\n            pos = s[S_DIR] > 0 ? s[S_POS] : md_src_len - s[S_POS];\n            gfx_set(1.0, 0.95, 0.55, 0.9);\n            gfx_rect(md_roll_x(pos), RL_Y, 2, RL_H);\n          );\n        );\n      );\n      i += 1;\n    );\n  ) : (\n    gfx_set(0.45, 0.47, 0.52, 1);\n    md_txt(RL_X, RL_Y + RL_H * 0.5 - 8, RL_W, 16, \"No MIDI source loaded\", 1 | 4);\n  );\n\n  gfx_set(0.24, 0.26, 0.32, 1);\n  gfx_rect(RL_X, RL_Y, RL_W, 1); gfx_rect(RL_X, RL_Y + RL_H - 1, RL_W, 1);\n  gfx_rect(RL_X, RL_Y, 1, RL_H); gfx_rect(RL_X + RL_W - 1, RL_Y, 1, RL_H);\n);\n\n// ---------------------------------------------------------------------------\n// File selection\n// ---------------------------------------------------------------------------\n// Steps slider1 through the folder and reads each name back.  md_scanning tells\n// @block (another thread) to ignore slider1 meanwhile - otherwise it would load\n// every phrase the scan passes over and cut off whatever is playing.\nfunction md_scan_files() local(i, sv, done)\n(\n  md_scanning = 1;\n  sv = slider1;\n  strcpy(#md_filelist, \"\");\n  md_nfiles = 0;\n  strcpy(64, \"\");\n  i = 0; done = 0;\n  while (i < 128 && !done) (\n    slider1 = i;\n    strcpy_fromslider(#md_tmp, slider1);\n    (strlen(#md_tmp) < 1 || (i > 0 && strcmp(#md_tmp, 64) == 0)) ? done = 1 : (\n      i > 0 ? strcat(#md_filelist, \"|\");\n      strcat(#md_filelist, #md_tmp);\n      strcpy(64, #md_tmp);\n      md_nfiles += 1;\n      i += 1;\n    );\n  );\n  slider1 = sv;\n  md_scanning = 0;\n  md_nfiles;\n);\n\nfunction md_file_menu() local(r)\n(\n  md_scan_files();\n  md_nfiles > 0 ? (\n    gfx_x = mouse_x; gfx_y = mouse_y;\n    r = gfx_showmenu(#md_filelist);\n    r > 0 ? (\n      slider1 = r - 1;\n      sliderchange(slider1);   // @block notices the new value and loads it\n    );\n  );\n);\n\n// ---------------------------------------------------------------------------\n// Header / tabs / status\n// ---------------------------------------------------------------------------\nfunction md_draw_header() local(x, w)\n(\n  gfx_set(0.11, 0.12, 0.16, 1);\n  gfx_rect(0, 0, UI_W, 38);\n  gfx_setfont(2, \"Arial\", 20, $'b');\n  gfx_set(0.30, 0.72, 0.98, 1);\n  md_txt(14, 8, 160, 22, \"MIDULAR\", 4);\n  gfx_setfont(1, \"Arial\", 13);\n  gfx_set(0.45, 0.48, 0.55, 1);\n  md_txt(132, 11, 180, 18, \"MIDI Sampler\", 4);\n\n  x = 300; w = 340;\n  (mouse_x >= x && mouse_x < x + w && mouse_y >= 6 && mouse_y < 32) ?\n    gfx_set(0.20, 0.28, 0.38, 1) : gfx_set(0.15, 0.16, 0.21, 1);\n  gfx_rect(x, 6, w, 26);\n  gfx_set(0.32, 0.36, 0.44, 1);\n  gfx_rect(x, 6, w, 1); gfx_rect(x, 31, w, 1); gfx_rect(x, 6, 1, 26); gfx_rect(x + w - 1, 6, 1, 26);\n  gfx_set(0.88, 0.92, 0.98, 1);\n  // the playing phrase's own name: after an import or a project load the file\n  // slider no longer says what is playing\n  md_txt(x + 8, 10, w - 96, 18, #md_name, 4);\n  md_src_kind == 2 ? (\n    gfx_set(0.45, 0.90, 0.62, 0.9);\n    md_txt(x + w - 88, 10, 80, 18, \"In Project\", 2 | 4);\n  );\n\n  gfx_set(0.50, 0.54, 0.62, 1);\n  sprintf(#md_tmp, \"%d notes \u00c2\u00b7 %.2f beats \u00c2\u00b7 %.1f BPM \u00c2\u00b7 %d/%d\",\n          md_src_n, md_src_len, md_src_tempo, md_src_tsnum | 0, md_src_tsden | 0);\n  md_txt(652, 11, 256, 18, #md_tmp, 2 | 4);\n);\n\nfunction md_draw_tabs() local(i, x, w, hot)\n(\n  w = 176;\n  i = 0;\n  while (i < 5) (\n    x = 14 + i * (w + 4);\n    hot = (mouse_x >= x && mouse_x < x + w && mouse_y >= TB_Y && mouse_y < TB_Y + TB_H);\n    md_page == i + 1 ? gfx_set(0.18, 0.42, 0.60, 1) : (hot ? gfx_set(0.18, 0.20, 0.25, 1) : gfx_set(0.13, 0.14, 0.18, 1));\n    gfx_rect(x, TB_Y, w, TB_H);\n    md_page == i + 1 ? gfx_set(1.0, 1.0, 1.0, 1) : gfx_set(0.60, 0.64, 0.72, 1);\n    md_field(#md_tmp, \"Play|Warp and Loop|Amp and Filter|Slice|Granular\", i);\n    md_txt(x, TB_Y + 5, w, 16, #md_tmp, 1 | 4);\n    i += 1;\n  );\n);\n\nfunction md_draw_status() local(i, n)\n(\n  n = 0;\n  i = 0;\n  while (i < MAX_VOICES) ( VOICES[i * V_STRIDE + V_STATE] ? n += 1; i += 1; );\n  gfx_set(0.11, 0.12, 0.16, 1);\n  gfx_rect(0, UI_H - 26, UI_W, 26);\n  gfx_set(0.50, 0.54, 0.62, 1);\n  sprintf(#md_tmp, \"%d voices \u00c2\u00b7 %d slices \u00c2\u00b7 warp \u00c3\u0097%.3f \u00c2\u00b7 %s\",\n          n, md_nslices, md_ratio,\n          p_mode == 0 ? \"Classic\" : p_mode == 1 ? \"One-Shot\" : p_mode == 2 ? \"Slice\" : \"Granular\");\n  md_txt(14, UI_H - 22, 280, 18, #md_tmp, 4);\n  gfx_set(0.34, 0.37, 0.44, 1);\n  md_txt(UI_W - 640, UI_H - 22, 626, 18,\n         \"Command-drag to fine-tune \u00c2\u00b7 Double-click to reset \u00c2\u00b7 Markers: Command-click to add, right-click to remove\", 2 | 4);\n);\n\n// ---------------------------------------------------------------------------\n// Marker edits are mirrored into MARKERS_SV straight away, so they survive a\n// reload (which restores from MARKERS_SV) even before the project is saved.\n// ---------------------------------------------------------------------------\nfunction md_markers_edited()\n(\n  md_mark_edited = 1;\n  md_ser_nmark   = md_nmark;\n  md_nmark > 0 ? memcpy(MARKERS_SV, MARKERS, md_nmark);\n  md_slice_dirty = 1;\n  sliderchange(-1);\n);\n\n// ---------------------------------------------------------------------------\n// Main draw + interaction\n// ---------------------------------------------------------------------------\nfunction md_ui_draw() local(i, c, hot)\n(\n  gfx_set(0.075, 0.08, 0.10, 1);\n  gfx_rect(0, 0, max(gfx_w, UI_W), max(gfx_h, UI_H));\n  gfx_setfont(1, \"Arial\", 13);\n\n  md_draw_header();\n  md_draw_roll();\n  md_draw_tabs();\n\n  gfx_set(0.10, 0.11, 0.14, 1);\n  gfx_rect(8, PN_Y, UI_W - 16, UI_H - PN_Y - 32);\n\n  i = 0;\n  while (i < md_nctl) (\n    c = CTLS + i * C_STRIDE;\n    (c[C_PAGE] == 0 || c[C_PAGE] == md_page) ? (\n      hot = (md_drag == i) || (mouse_x >= c[C_X] && mouse_x < c[C_X] + c[C_W] &&\n                               mouse_y >= c[C_Y] && mouse_y < c[C_Y] + c[C_H]);\n      c[C_TYPE] == CT_KNOB   ? md_draw_knob(i, hot) :\n      c[C_TYPE] == CT_SELECT ? md_draw_select(i, hot) :\n                               md_draw_toggle(i, hot);\n    );\n    i += 1;\n  );\n  md_draw_status();\n);\n\nfunction md_ui_hit() local(i, c, r)\n(\n  r = -1;\n  i = 0;\n  while (i < md_nctl && r < 0) (\n    c = CTLS + i * C_STRIDE;\n    (c[C_PAGE] == 0 || c[C_PAGE] == md_page) ?\n      ((mouse_x >= c[C_X] && mouse_x < c[C_X] + c[C_W] &&\n        mouse_y >= c[C_Y] && mouse_y < c[C_Y] + c[C_H]) ? r = i);\n    i += 1;\n  );\n  r;\n);\n\nfunction md_ui_mouse() local(ci, c, dy, rng, t, i, x, w)\n(\n  // ---- press ----\n  (mouse_cap & 1) && !(md_lastcap & 1) ? (\n    md_click_t = time_precise();\n    // file button\n    (mouse_y >= 6 && mouse_y < 32 && mouse_x >= 300 && mouse_x < 640) ? md_file_menu() :\n    // tabs\n    (mouse_y >= TB_Y && mouse_y < TB_Y + TB_H && mouse_x >= 14) ? (\n      i = floor((mouse_x - 14) / 180);\n      (i >= 0 && i < 5) ? md_page = i + 1;\n    ) :\n    // piano roll: ctrl-click drops a slice marker\n    (mouse_y >= RL_Y && mouse_y < RL_Y + RL_H && mouse_x >= RL_X && mouse_x < RL_X + RL_W) ? (\n      (mouse_cap & 4) ? (\n        t = (mouse_x - RL_X) / RL_W * md_src_len;\n        md_marker_add(t);\n        md_markers_edited();\n      );\n    ) : (\n      ci = md_ui_hit();\n      ci >= 0 ? (\n        c = CTLS + ci * C_STRIDE;\n        c[C_TYPE] == CT_TOGGLE ? md_ctl_set(ci, slider(c[C_SL]) >= 0.5 ? c[C_MIN] : c[C_MAX]) :\n        c[C_TYPE] == CT_SELECT ? (\n          gfx_x = mouse_x; gfx_y = mouse_y;\n          i = gfx_showmenu(c[C_OPTS]);\n          i > 0 ? md_ctl_set(ci, c[C_MIN] + (i - 1) * max(c[C_STEP], 1));\n        ) : (\n          md_drag    = ci;\n          md_drag_y  = mouse_y;\n          md_drag_v  = slider(c[C_SL]);\n          // double click restores the default\n          (time_precise() - md_dbl_t < 0.35 && md_dbl_c == ci) ? (\n            md_ctl_set(ci, c[C_DEF]);\n            md_drag_v = c[C_DEF];\n          );\n          md_dbl_t = time_precise();\n          md_dbl_c = ci;\n        );\n      );\n    );\n  );\n\n  // ---- right click on the roll removes the nearest marker ----\n  (mouse_cap & 2) && !(md_lastcap & 2) ? (\n    (mouse_y >= RL_Y && mouse_y < RL_Y + RL_H && mouse_x >= RL_X && mouse_x < RL_X + RL_W) ? (\n      t = (mouse_x - RL_X) / RL_W * md_src_len;\n      md_marker_remove_near(t, md_src_len * 0.02) ? md_markers_edited();\n    );\n  );\n\n  // ---- drag ----\n  (mouse_cap & 1) && md_drag >= 0 ? (\n    c   = CTLS + md_drag * C_STRIDE;\n    rng = c[C_MAX] - c[C_MIN];\n    dy  = md_drag_y - mouse_y;\n    md_ctl_set(md_drag, md_drag_v + dy * rng / ((mouse_cap & 4) ? 2400 : 220));\n  );\n\n  !(mouse_cap & 1) ? md_drag = -1;\n\n  // ---- wheel ----\n  mouse_wheel != 0 ? (\n    ci = md_ui_hit();\n    ci >= 0 ? (\n      c = CTLS + ci * C_STRIDE;\n      md_ctl_set(ci, slider(c[C_SL]) + sign(mouse_wheel) * max(c[C_STEP], (c[C_MAX] - c[C_MIN]) / 100));\n    );\n    mouse_wheel = 0;\n  );\n\n  md_lastcap = mouse_cap;\n);\n"};

/* ---- kit/palette.js ---- */
/* The devices' colours in Live: after Ableton Live 8's default theme.
 *
 * The scheme is Starting Blocks' own experiment of 18 September 2026
 * (commit 2765b0a3, "theme the window after Live 8"): a neutral grey chrome
 * meant to sit quietly under brightly coloured clips, controls raised off it,
 * and one warm amber spent where Live spends its accent, on what is switched
 * on. It was built from the theme's described character, not Live's own
 * files, so it is a likeness, not a match.
 *
 * Two changes from that experiment, both for the family's rules (every word
 * 7:1 on what it sits on, ink on every button, marks and edges 3:1):
 *   - the chrome is #3E3E3E, a step darker than its #4A4A4A, because on
 *     #4A4A4A a secondary word cannot reach 7:1 and still look secondary;
 *   - buttons are a light grey with dark ink, as the house scheme's are,
 *     because light words on its #5E5E5E buttons reach only 5:1.
 * The greys are neutral (R = G = B), as Live's are: the house rule that
 * every grey leans blue is the yellow scheme's, and Live's look is not that.
 *
 * Palette.tone(r, g, b) is how the REAPER windows (the JSFX and Lua scripts,
 * drawn through gfx.js) take the scheme without a line of theirs changing:
 *   - the house scheme's own colours map one for one (HOUSE below), each
 *     chosen so the pairs the scripts rely on stay 7:1 for words and 3:1
 *     for edges;
 *   - the house yellow, and the shades the scripts make of it, become the
 *     amber, shaded the same way;
 *   - any other grey loses its tint at the same brightness, so a script
 *     with a palette of its own keeps every contrast it had;
 *   - every other colour (a material, an engine, a part) is left alone.
 */
var Palette = (function () {
  'use strict';
  var C = {
    ground: 0x3E3E3E,     // the chrome: Live 8's #4A4A4A, a step darker (see above)
    raised: 0x484848,     // a control that is off
    sunken: 0x2E2E2E,     // lists, fields, a roll or a page: Live 8's roll ground
    deep: 0x262626,       // a roll's own ground under a sunken frame
    popup: 0x333333,      // menus
    rule: 0x555555,       // separators: they group, they do not act
    edge: 0x8C8C8C,       // the edge of anything that acts: 3.2:1 on the chrome
    control: 0xB4B4B4,    // buttons, with ink on them
    controlHover: 0xC4C4C4,
    controlHeld: 0xAAAAAA,
    accent: 0xD7A93C,     // Live 8's warm amber: what is on
    accentHeld: 0xCDA139,  // held: ink on it still 7.2:1
    ink: 0x1A1A1A,        // words on a button, grey or amber; also a window's darkest ground
                          // (AutoCC paints its window in the ink), so words are 7:1 on it too
    text: 0xF0F0F0,       // 9.4:1 on the chrome
    label: 0xD8D8D8,      // 7.5:1
    dim: 0xD4D4D4,        // secondary words, 7.2:1
    mark: 0xA8A8A8,       // a mark that is not a word, or a control that is off
    note: 0xA8D8E8,       // Live 8's cool note colour, for a roll
    ring: 0xFAFAFA,       // the keyboard's place
    warn: 0xF0605A,       // a warning's mark, never its words: 3.3:1 on the chrome
    warnText: 0xFFC8C2    // a warning's words, 7.3:1
  };
  // The house scheme (HousePalette, every family repo's docs/COLOUR.md) to this one.
  var HOUSE = {
    0x111419: C.deep, 0x14171C: C.ink, 0x1A1D23: C.sunken, 0x1B1F25: C.popup, 0x1E2228: 0x343434,
    0x22262D: 0x363636, 0x23272E: C.ground, 0x2A2F37: C.raised, 0x3A404A: C.rule, 0x585F6B: 0x707070,
    0x646B77: 0x7A7A7A, 0x6D7581: C.edge, 0x8A919C: C.mark, 0x8F96A2: C.controlHeld, 0xA9AFBA: C.control,
    0xB0B6C0: C.dim, 0xB6BCC6: C.dim, 0xBFC5CE: C.label, 0xC0C6CF: C.controlHover, 0xDDE1E7: C.text,
    0xF2F4F7: C.ring, 0xFFF200: C.accent, 0xD1C600: C.accentHeld, 0xFF9E96: C.warnText, 0xFFA6A0: C.warnText, 0xD2483F: C.warn
  };
  function rgb(hex, a) {
    return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255, a === undefined ? 1 : a];
  }
  function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function unlin(l) { return l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055; }
  function luminance(r, g, b) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }
  function contrast(a, b) {
    var la = luminance(a[0], a[1], a[2]), lb = luminance(b[0], b[1], b[2]);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  var AMBER = rgb(C.accent);
  // r, g, b from 0 to 1; returns [r, g, b].
  function tone(r, g, b) {
    r = clamp(r); g = clamp(g); b = clamp(b);
    var R = Math.round(r * 255), G = Math.round(g * 255), B = Math.round(b * 255);
    var hex = (R << 16) | (G << 8) | B;
    if (HOUSE[hex] !== undefined) { var t = rgb(HOUSE[hex]); return [t[0], t[1], t[2]]; }
    // The house yellow and its shades: lighter ones mix in white (blue rises
    // from 0), darker ones scale down (red and green fall together).
    if (R >= 120 && G >= 110 && Math.abs(R - G) <= 40 && B <= Math.min(R, G) - 90) {
      var w = B / 255, k = Math.max(R, G) / 255;
      return [0, 1, 2].map(function (i) { return clamp(AMBER[i] * k + (1 - AMBER[i] * k) * w); });
    }
    // A grey with a tint, from any palette: neutral at the same brightness.
    var hi = Math.max(R, G, B), lo = Math.min(R, G, B);
    if (hi - lo <= 28) { var n = unlin(luminance(r, g, b)); return [n, n, n]; }
    return [r, g, b];
  }
  return { C: C, HOUSE: HOUSE, rgb: rgb, tone: tone, luminance: luminance, contrast: contrast };
})();


/* ---- kit/runtime/jsfx.js ---- */
/* Middaw's JSFX runtime: the family's REAPER plug-ins, run unchanged.
 *
 * A JSFX file is a header (sliders, pins, imports) and sections of EEL2 code:
 * @init, @slider, @block, @sample, @serialize and @gfx. This file reads the
 * header, compiles the EEL2 in each section to JavaScript, and runs it the way
 * REAPER does: @init once, @slider when a slider moves, then for every block
 * @block once and @sample once per sample frame. MIDI arrives through
 * midirecv() and leaves through midisend() with its sample offset.
 *
 * @gfx is not run by default: Middaw draws each device's controls itself from
 * the sliders, so a device looks like the rest of the app. With
 * `{ gfx: true }` it is compiled too, and `runGfx(host, ...)` runs it: every
 * gfx_* call goes to the host, which draws (the Ableton devices' [v8ui]).
 *
 * Everything in EEL2 is a double. Variables live in one Float64Array, so the
 * generated code reads `v[12]`; memory (`buf[i]`) is EEL2's 8M words, given
 * out in 64k-word blocks only when written to, as EEL2 itself does.
 */
(function (NS) {
  'use strict';

  var EPS = 0.00001;
  var MAXLOOP = 1048576;
  var BLOCK = 65536, NBLOCKS = 128;

  // ------------------------------------------------------------ header ----
  function parseSliderLine(line) {
    var m = /^slider(\d+):(?:([A-Za-z_][\w.]*)=)?\s*([^<]*?)\s*<([^>]*)>(.*)$/.exec(line);
    if (!m) return null;
    var inner = m[4], enumNames = null;
    var em = /\{([^}]*)\}/.exec(inner);
    if (em) { enumNames = em[1].split(','); inner = inner.replace(em[0], ''); }
    var shape = null, sm = /:(log|sqr)(?:=([^,>]*))?/.exec(inner);
    if (sm) { shape = { kind: sm[1], value: sm[2] === undefined ? null : Number(sm[2]) }; inner = inner.replace(sm[0], ''); }
    var parts = inner.split(',').map(function (s) { return s.trim(); });
    var desc = m[5].trim();
    var hidden = desc[0] === '-';
    if (hidden) desc = desc.slice(1);
    return {
      index: Number(m[1]), variable: (m[2] || ('slider' + m[1])).toLowerCase(),
      def: Number(m[3]) || 0, min: Number(parts[0]) || 0, max: parts[1] === undefined ? 1 : Number(parts[1]),
      step: parts[2] === undefined || parts[2] === '' ? 0 : Number(parts[2]),
      names: enumNames, shape: shape, name: desc, hidden: hidden
    };
  }

  // A JSFX file and its imports -> header and sections.
  function parseFile(text, readImport) {
    var out = { desc: '', sliders: [], inPins: [], outPins: [], options: '', sections: {}, gfxSize: null };
    var order = ['init', 'slider', 'block', 'sample', 'serialize', 'gfx'];
    order.forEach(function (s) { out.sections[s] = []; });
    function take(src, isImport) {
      var lines = src.replace(/\r\n?/g, '\n').split('\n');
      var section = null, buf = [], startLine = 0;
      function flush() {
        if (section && out.sections[section]) out.sections[section].push({ code: buf.join('\n'), line: startLine });
        buf = [];
      }
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var sm = /^@(\w+)(.*)$/.exec(line);
        if (sm) {
          flush();
          section = sm[1].toLowerCase();
          startLine = i + 2;
          if (section === 'gfx') {
            var sz = sm[2].trim().split(/\s+/).map(Number);
            if (sz.length >= 2 && !out.gfxSize) out.gfxSize = [sz[0], sz[1]];
          }
          continue;
        }
        if (section) { buf.push(line); continue; }
        var t = line.trim();
        if (/^desc:/.test(t)) { if (!isImport || !out.desc) out.desc = t.slice(5).trim(); }
        else if (/^slider\d+:/.test(t)) { var s = parseSliderLine(t); if (s) out.sliders.push(s); }
        else if (/^in_pin:/.test(t)) out.inPins.push(t.slice(7).trim());
        else if (/^out_pin:/.test(t)) out.outPins.push(t.slice(8).trim());
        else if (/^options:/.test(t)) out.options += ' ' + t.slice(8).trim();
        else if (/^import\s+/.test(t)) {
          var name = t.replace(/^import\s+/, '').trim();
          var inc = readImport ? readImport(name) : null;
          if (inc === null || inc === undefined) throw new Error('JSFX import not found: ' + name);
          take(inc, true);
        }
      }
      flush();
    }
    take(text, false);
    out.sliders.sort(function (a, b) { return a.index - b.index; });
    out.inPins = out.inPins.filter(function (p) { return p !== 'none'; });
    out.outPins = out.outPins.filter(function (p) { return p !== 'none'; });
    return out;
  }

  // ------------------------------------------------------------- lexer ----
  var OPS = ['===', '!==', '<<=', '>>=', '==', '!=', '<=', '>=', '<<', '>>', '&&', '||',
    '+=', '-=', '*=', '/=', '%=', '^=', '|=', '&=', '~=',
    '+', '-', '*', '/', '%', '^', '<', '>', '!', '&', '|', '~', '?', ':',
    '(', ')', '[', ']', ',', ';', '='];
  var CONSTS = { pi: Math.PI, phi: (1 + Math.sqrt(5)) / 2, e: Math.E };

  function EelError(msg, line) { this.message = (line ? 'line ' + line + ': ' : '') + msg; this.line = line; }
  EelError.prototype = Object.create(Error.prototype);
  EelError.prototype.name = 'EelError';

  // REAPER's strings are bytes: one character per UTF-8 byte, as the C runtime
  // keeps them.
  function bytes(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.codePointAt(i);
      if (c > 0xffff) i++;
      if (c < 0x80) out += String.fromCharCode(c);
      else if (c < 0x800) out += String.fromCharCode(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out += String.fromCharCode(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out += String.fromCharCode(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
    return out;
  }

  function lex(src, firstLine) {
    var toks = [], i = 0, n = src.length, line = firstLine || 1;
    while (i < n) {
      var c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { var j = src.indexOf('\n', i); i = j < 0 ? n : j; continue; }
      if (c === '/' && src[i + 1] === '*') {
        var k = src.indexOf('*/', i + 2); if (k < 0) k = n;
        for (var q = i; q < k; q++) if (src[q] === '\n') line++;
        i = k + 2; continue;
      }
      if (c === '"') {
        var buf = '', p = i + 1;
        while (p < n && src[p] !== '"') {
          if (src[p] === '\\' && p + 1 < n) {
            var e = src[p + 1];
            buf += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e; p += 2;
          } else { if (src[p] === '\n') line++; buf += src[p++]; }
        }
        toks.push({ k: 'str', v: bytes(buf), line: line }); i = p + 1; continue;
      }
      if (c === "'") {
        var close = src.indexOf("'", i + 1);
        var val = 0;
        var lit = bytes(src.slice(i + 1, close));
        for (var x = 0; x < lit.length; x++) val = val * 256 + lit.charCodeAt(x);
        toks.push({ k: 'num', v: val, line: line }); i = close + 1; continue;
      }
      if (c === '#') {
        var nm = /^#[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i, i + 200));
        if (nm) { toks.push({ k: 'nstr', v: nm[0].toLowerCase(), line: line }); i += nm[0].length; }
        else { toks.push({ k: 'tmpstr', line: line }); i++; }
        continue;
      }
      if (c === '$') {
        var rest = src.slice(i, i + 64), m;
        if ((m = /^\$x([0-9A-Fa-f]+)/.exec(rest))) { toks.push({ k: 'num', v: parseInt(m[1], 16), line: line }); i += m[0].length; continue; }
        if ((m = /^\$'(.)'/.exec(rest))) { toks.push({ k: 'num', v: m[1].charCodeAt(0), line: line }); i += m[0].length; continue; }
        if ((m = /^\$~(\d+)/.exec(rest))) { toks.push({ k: 'num', v: Math.pow(2, Number(m[1])) - 1, line: line }); i += m[0].length; continue; }
        if ((m = /^\$(pi|phi|e)\b/i.exec(rest))) { toks.push({ k: 'num', v: CONSTS[m[1].toLowerCase()], line: line }); i += m[0].length; continue; }
        throw new EelError('bad $ constant', line);
      }
      var hx = /^0[xX][0-9A-Fa-f]+/.exec(src.slice(i, i + 40));
      if (hx) { toks.push({ k: 'num', v: parseInt(hx[0], 16), line: line }); i += hx[0].length; continue; }
      var num = /^(\d+\.\d*|\.\d+|\d+)/.exec(src.slice(i, i + 64));
      if (num) { toks.push({ k: 'num', v: Number(num[0]), line: line }); i += num[0].length; continue; }
      var id = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i, i + 200));
      if (id) {
        var w = id[0].toLowerCase();
        toks.push({ k: (w === 'function' || w === 'local' || w === 'instance' || w === 'globals' || w === 'global' || w === 'static') ? 'kw' : 'id', v: w, line: line });
        i += id[0].length; continue;
      }
      var op = null;
      for (var o = 0; o < OPS.length; o++) if (src.substr(i, OPS[o].length) === OPS[o]) { op = OPS[o]; break; }
      if (!op) throw new EelError("unexpected '" + c + "'", line);
      toks.push({ k: 'op', v: op, line: line }); i += op.length;
    }
    toks.push({ k: 'eof', line: line });
    return toks;
  }

  // ------------------------------------------------------------ parser ----
  var ASSIGN = { '=': 1, '+=': 1, '-=': 1, '*=': 1, '/=': 1, '%=': 1, '^=': 1, '|=': 1, '&=': 1, '~=': 1, '<<=': 1, '>>=': 1 };
  var CMP = { '==': 1, '===': 1, '!=': 1, '!==': 1, '<': 1, '>': 1, '<=': 1, '>=': 1 };

  function parse(toks, funcs) {
    var p = 0;
    function peek() { return toks[p]; }
    function at(k, v) { var t = toks[p]; return t.k === k && (v === undefined || t.v === v); }
    function eat(k, v) { if (at(k, v)) return toks[p++]; return null; }
    function expect(k, v) {
      var t = eat(k, v);
      if (!t) { var q = toks[p]; throw new EelError('expected ' + (v || k) + ', got ' + (q.v !== undefined ? q.v : q.k), q.line); }
      return t;
    }

    function program() {
      var items = [];
      for (;;) {
        while (eat('op', ';')) {}
        if (at('eof')) break;
        if (at('kw', 'function')) { func(); continue; }
        items.push(assign());
        if (!at('op', ';') && !at('eof') && !at('kw', 'function')) {
          var t = peek();
          throw new EelError("missing ';' before " + (t.v !== undefined ? t.v : t.k), t.line);
        }
      }
      return { k: 'seq', items: items };
    }
    function func() {
      var line = expect('kw', 'function').line;
      var name = expect('id').v;
      expect('op', '(');
      var params = [];
      while (!at('op', ')')) { params.push(expect('id').v.replace(/\*$/, '')); eat('op', ','); }
      expect('op', ')');
      var locals = [], instance = [], globals = null;
      while (at('kw')) {
        var kw = toks[p++].v;
        expect('op', '(');
        var list = [];
        while (!at('op', ')')) {
          if (at('op', '*')) { p++; list.push('*'); }
          else list.push(expect('id').v.replace(/\*$/, ''));
          eat('op', ',');
        }
        expect('op', ')');
        if (kw === 'local' || kw === 'static') locals = locals.concat(list);
        else if (kw === 'instance') instance = instance.concat(list);
        else globals = (globals || []).concat(list);
      }
      expect('op', '(');
      var body = block();
      expect('op', ')');
      while (eat('op', ';')) {}
      funcs[name] = { name: name, params: params, locals: locals, instance: instance, globals: globals, body: body, line: line };
    }
    function block() {
      var items = [];
      for (;;) {
        while (eat('op', ';')) {}
        if (at('op', ')') || at('eof')) break;
        if (at('kw', 'function')) { func(); continue; }
        items.push(assign());
        if (!at('op', ';')) break;
      }
      while (eat('op', ';')) {}
      return items.length === 1 ? items[0] : { k: 'seq', items: items };
    }
    function arg() {
      var items = [assign()];
      while (at('op', ';')) {
        p++;
        if (at('op', ')') || at('op', ',')) break;
        items.push(assign());
      }
      return items.length === 1 ? items[0] : { k: 'seq', items: items };
    }
    function assign() {
      var lhs = ternary();
      var t = peek();
      if (t.k === 'op' && ASSIGN[t.v]) {
        p++;
        return { k: 'assign', op: t.v, lhs: lhs, rhs: assign(), line: t.line };
      }
      return lhs;
    }
    function ternary() {
      var c = logic();
      if (eat('op', '?')) {
        var a = at('op', ':') ? { k: 'num', v: 0 } : assign();
        var b = null;
        if (eat('op', ':')) b = assign();
        return { k: 'if', c: c, a: a, b: b };
      }
      return c;
    }
    function logic() {
      var n = cmp();
      while (at('op', '&&') || at('op', '||')) n = { k: 'logic', op: toks[p++].v, a: n, b: cmp() };
      return n;
    }
    function cmp() {
      var n = bit();
      while (peek().k === 'op' && CMP[peek().v]) n = { k: 'bin', op: toks[p++].v, a: n, b: bit() };
      return n;
    }
    function bit() {
      var n = add();
      while (at('op', '|') || at('op', '&') || at('op', '~')) n = { k: 'bin', op: toks[p++].v, a: n, b: add() };
      return n;
    }
    function add() {
      var n = mul();
      while (at('op', '+') || at('op', '-')) n = { k: 'bin', op: toks[p++].v, a: n, b: mul() };
      return n;
    }
    function mul() {
      var n = shift();
      while (at('op', '*') || at('op', '/')) n = { k: 'bin', op: toks[p++].v, a: n, b: shift() };
      return n;
    }
    function shift() {
      var n = mod();
      while (at('op', '<<') || at('op', '>>')) n = { k: 'bin', op: toks[p++].v, a: n, b: mod() };
      return n;
    }
    function mod() {
      var n = pow();
      while (at('op', '%')) { p++; n = { k: 'bin', op: '%', a: n, b: pow() }; }
      return n;
    }
    function pow() {
      var n = unary();
      if (at('op', '^')) { p++; return { k: 'bin', op: '^', a: n, b: pow() }; }
      return n;
    }
    function unary() {
      var t = peek();
      if (t.k === 'op' && (t.v === '!' || t.v === '-' || t.v === '+')) { p++; return { k: 'un', op: t.v, a: unary() }; }
      return postfix();
    }
    function postfix() {
      var n = primary();
      while (at('op', '[')) {
        p++;
        var idx = at('op', ']') ? { k: 'num', v: 0 } : assign();
        expect('op', ']');
        n = { k: 'index', base: n, idx: idx };
      }
      return n;
    }
    function primary() {
      var t = toks[p++];
      switch (t.k) {
        case 'num': return { k: 'num', v: t.v };
        case 'str': return { k: 'strlit', v: t.v };
        case 'nstr': return { k: 'nstr', v: t.v };
        case 'tmpstr': return { k: 'tmpstr', id: p };
        case 'op':
          if (t.v === '(') { var b = block(); expect('op', ')'); return b; }
          break;
        case 'id':
          if (at('op', '(')) {
            p++;
            var args = [];
            while (!at('op', ')')) { args.push(arg()); if (!eat('op', ',')) break; }
            expect('op', ')');
            if ((t.v === 'while' || t.v === 'loop') && at('op', '(')) {
              p++; var body = block(); expect('op', ')');
              args.push(body);
            }
            return { k: 'call', name: t.v, args: args, line: t.line };
          }
          return { k: 'var', name: t.v, line: t.line };
      }
      throw new EelError('unexpected ' + (t.v !== undefined ? t.v : t.k), t.line);
    }
    return program();
  }

  // ---------------------------------------------------------- compiler ----
  // Builtins that are plain maths: name -> JS expression template.
  var MATH = {
    sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', asin: 'Math.asin', acos: 'Math.acos',
    atan: 'Math.atan', atan2: 'Math.atan2', sqrt: 'H.sqrt', exp: 'Math.exp', log: 'Math.log',
    log10: 'Math.log10', abs: 'Math.abs', floor: 'Math.floor', ceil: 'Math.ceil',
    min: 'Math.min', max: 'Math.max', pow: 'Math.pow', sign: 'H.sign', invsqrt: 'H.invsqrt',
    sqr: 'H.sqr', rand: 'H.rand', exp2: 'H.exp2'
  };

  function Compiler(slotsOf) {
    this.slots = slotsOf;          // name -> index into v
    this.funcs = {};
    this.compiledFuncs = {};
    this.funcCode = [];
    this.strConsts = [];
    this.temps = 0;
    this.gfx = false;              // compile gfx_* calls for a host to draw
  }
  Compiler.prototype.slot = function (name) {
    var s = this.slots[name];
    if (s === undefined) { s = this.slots.__count++; this.slots[name] = s; }
    return s;
  };

  Compiler.prototype.compileSection = function (code, firstLine) {
    var ast = parse(lex(code, firstLine), this.funcs);
    var saveTemps = this.temps;
    this.temps = 0;
    var body = this.stmts(ast, null, true, 'r');
    var temps = this.tempDecl();
    this.temps = saveTemps;
    return 'var r = 0;' + temps + body + 'return r;';
  };
  Compiler.prototype.tempDecl = function () {
    if (!this.temps) return '';
    var names = [];
    for (var i = 1; i <= this.temps; i++) names.push('t' + i);
    return 'var ' + names.join(', ') + ';';
  };
  Compiler.prototype.temp = function () { this.temps++; return 't' + this.temps; };

  // Names inside a function: parameters, statics, instance variables, or
  // globals. A function called as ns.f() keeps its instance() variables, and
  // anything it names as this.x, in ns: ns.x (REAPER's pseudo-objects).
  Compiler.prototype.ref = function (name, ctx) {
    if (ctx) {
      var pi = ctx.fn.params.indexOf(name);
      if (pi >= 0) return 'p' + pi;
      if (ctx.fn.locals.indexOf(name) >= 0) return 'v[' + this.slot(ctx.fn.name + '::' + name) + ']';
      if (ctx.fn.instance.indexOf(name) >= 0) return 'v[' + this.slot(ctx.ns ? ctx.ns + '.' + name : name) + ']';
    }
    if (name.indexOf('this.') === 0) return 'v[' + this.slot(resolveThis(name, ctx)) + ']';
    return 'v[' + this.slot(name) + ']';
  };
  // this.x, this.child.x: the namespace the function was called in.
  function resolveThis(name, ctx) {
    var ns = ctx && ctx.ns ? ctx.ns : '';
    if (name === 'this') return ns;
    return ns ? ns + '.' + name.slice(5) : name.slice(5);
  }

  function hasControl(n) {
    if (!n || typeof n !== 'object') return false;
    if (n.k === 'call' && (n.name === 'loop' || n.name === 'while')) return true;
    for (var key in n) {
      var c = n[key];
      if (Array.isArray(c)) { for (var i = 0; i < c.length; i++) if (hasControl(c[i])) return true; }
      else if (c && typeof c === 'object' && c.k && hasControl(c)) return true;
    }
    return false;
  }

  // Statements computing `n`; the value lands in `target` when wanted.
  Compiler.prototype.stmts = function (n, ctx, want, target) {
    if (n.k === 'seq') {
      var out = '';
      if (!n.items.length) return want ? target + ' = 0;' : '';
      for (var i = 0; i < n.items.length; i++) {
        var last = i === n.items.length - 1;
        out += this.stmts(n.items[i], ctx, want && last, target);
      }
      return out;
    }
    if (n.k === 'call' && n.name === 'loop') {
      var cnt = this.temp(), ii = this.temp();
      var s = cnt + ' = Math.min(' + MAXLOOP + ', Math.trunc(' + this.expr(n.args[0], ctx) + ')); ';
      if (want) s += target + ' = 0; ';
      s += 'for (' + ii + ' = 0; ' + ii + ' < ' + cnt + '; ' + ii + '++) {' + (n.args[1] ? this.stmts(n.args[1], ctx, want, target) : '') + '}';
      return s;
    }
    if (n.k === 'call' && n.name === 'while') {
      var guard = this.temp(), r = this.temp();
      if (n.args.length >= 2) {
        return guard + ' = 0; ' + (want ? target + ' = 0; ' : '') + 'while (Math.abs(' + this.expr(n.args[0], ctx) + ') >= ' + EPS + ' && ' + guard + '++ < ' + MAXLOOP + ') {' +
          this.stmts(n.args[1], ctx, want, target) + '}';
      }
      return guard + ' = 0; do {' + this.stmts(n.args[0], ctx, true, r) + (want ? target + ' = ' + r + ';' : '') +
        '} while (Math.abs(' + r + ') >= ' + EPS + ' && ++' + guard + ' < ' + MAXLOOP + ');';
    }
    if (n.k === 'if' && hasControl(n)) {
      var o = 'if (Math.abs(' + this.expr(n.c, ctx) + ') >= ' + EPS + ') {' + this.stmts(n.a, ctx, want, target) + '}';
      if (n.b) o += ' else {' + this.stmts(n.b, ctx, want, target) + '}';
      else if (want) o += ' else { ' + target + ' = 0; }';
      return o;
    }
    var e = this.expr(n, ctx);
    return (want ? target + ' = ' + e : e) + ';';
  };

  function T(e) { return '(Math.abs(' + e + ') >= ' + EPS + ')'; }

  Compiler.prototype.expr = function (n, ctx) {
    var self = this;
    // A loop inside an expression: the statements holding it run in a
    // closure. Only a loop, a sequence or a conditional is one; anything else
    // compiles its parts, each of which takes its own closure if it needs one.
    if (hasControl(n) && (n.k === 'seq' || n.k === 'if' || (n.k === 'call' && (n.name === 'loop' || n.name === 'while')))) {
      return '(() => { var rr = 0; ' + this.stmts(n, ctx, true, 'rr') + ' return rr; })()';
    }
    switch (n.k) {
      case 'raw': return n.code;
      case 'num': return n.v < 0 ? '(' + String(n.v) + ')' : String(n.v);
      case 'strlit': return String(this.strConst(n.v));
      case 'nstr': return 'S.named(' + JSON.stringify(n.v) + ')';
      case 'tmpstr': return 'S.tempStr(' + n.id + ')';
      case 'var': return this.varRead(n.name, ctx);
      case 'seq': {
        if (!n.items.length) return '0';
        return '(' + n.items.map(function (x) { return self.expr(x, ctx); }).join(', ') + ')';
      }
      case 'if':
        return '(' + T(this.expr(n.c, ctx)) + ' ? ' + this.expr(n.a, ctx) + ' : ' + (n.b ? this.expr(n.b, ctx) : '0') + ')';
      case 'logic': {
        var a = T(this.expr(n.a, ctx)), b = T(this.expr(n.b, ctx));
        return '((' + a + (n.op === '&&' ? ' && ' : ' || ') + b + ') ? 1 : 0)';
      }
      case 'un':
        if (n.op === '!') return '(' + T(this.expr(n.a, ctx)) + ' ? 0 : 1)';
        if (n.op === '-') return '(-' + this.expr(n.a, ctx) + ')';
        return this.expr(n.a, ctx);
      case 'bin': return this.binary(n.op, this.expr(n.a, ctx), this.expr(n.b, ctx));
      case 'index': return this.memRead(n, ctx);
      case 'assign': return this.assignment(n, ctx);
      case 'call': return this.call(n, ctx);
    }
    throw new EelError('cannot compile ' + n.k);
  };

  Compiler.prototype.binary = function (op, a, b) {
    switch (op) {
      case '+': return '(' + a + ' + ' + b + ')';
      case '-': return '(' + a + ' - ' + b + ')';
      case '*': return '(' + a + ' * ' + b + ')';
      case '/': return '(' + a + ' / ' + b + ')';
      case '%': return 'H.mod(' + a + ', ' + b + ')';
      case '^': return 'Math.pow(' + a + ', ' + b + ')';
      case '<<': return 'H.shl(' + a + ', ' + b + ')';
      case '>>': return 'H.shr(' + a + ', ' + b + ')';
      case '|': return 'H.bor(' + a + ', ' + b + ')';
      case '&': return 'H.band(' + a + ', ' + b + ')';
      case '~': return 'H.bxor(' + a + ', ' + b + ')';
      case '==': return '(Math.abs(' + a + ' - ' + b + ') < ' + EPS + ' ? 1 : 0)';
      case '!=': return '(Math.abs(' + a + ' - ' + b + ') < ' + EPS + ' ? 0 : 1)';
      case '===': return '(' + a + ' === ' + b + ' ? 1 : 0)';
      case '!==': return '(' + a + ' !== ' + b + ' ? 1 : 0)';
      case '<': case '>': case '<=': case '>=': return '(' + a + ' ' + op + ' ' + b + ' ? 1 : 0)';
    }
    throw new EelError('bad operator ' + op);
  };

  Compiler.prototype.strConst = function (s) {
    var i = this.strConsts.indexOf(s);
    if (i < 0) { i = this.strConsts.length; this.strConsts.push(s); }
    return 10000 + i;
  };

  Compiler.prototype.varRead = function (name, ctx) {
    if (name === 'gmem') return 'S.gmemBase';
    return this.ref(name, ctx);
  };

  Compiler.prototype.address = function (n, ctx) {
    if (n.base.k === 'var' && n.base.name === 'gmem') return { gmem: true, addr: this.expr(n.idx, ctx) };
    var base = this.expr(n.base, ctx);
    var idx = n.idx.k === 'num' && n.idx.v === 0 ? null : this.expr(n.idx, ctx);
    return { gmem: false, addr: idx === null ? base : '(' + base + ' + ' + idx + ')' };
  };
  Compiler.prototype.memRead = function (n, ctx) {
    var a = this.address(n, ctx);
    if (a.gmem) return 'S.grd(' + a.addr + ')';
    // Inline: a typed array read out of range is undefined, which || makes 0.
    return '(M[(' + a.addr + ' + ' + EPS + ') | 0] || 0)';
  };

  var COMPOUND = { '+=': '+', '-=': '-', '*=': '*', '/=': '/', '%=': '%', '^=': '^', '|=': '|', '&=': '&', '~=': '~', '<<=': '<<', '>>=': '>>' };

  Compiler.prototype.assignment = function (n, ctx) {
    var self = this;
    var lhs = n.lhs, rhs = this.expr(n.rhs, ctx);
    function value(cur) { return n.op === '=' ? rhs : self.binary(COMPOUND[n.op], cur, rhs); }
    if (lhs.k === 'var') {
      var r = this.ref(lhs.name, ctx);
      return '(' + r + ' = ' + value(r) + ')';
    }
    if (lhs.k === 'index') {
      var a = this.address(lhs, ctx), t = this.temp();
      var rdf = a.gmem ? 'S.grd' : 'rd', wrf = a.gmem ? 'S.gwr' : 'wr';
      return '(' + t + ' = ' + a.addr + ', ' + wrf + '(' + t + ', ' + value(rdf + '(' + t + ')') + '))';
    }
    if (lhs.k === 'if') {
      var tv = this.temp();
      var asg = function (side) { return side ? self.assignment({ k: 'assign', op: '=', lhs: side, rhs: { k: 'raw', code: tv } }, ctx) : '0'; };
      if (n.op !== '=') throw new EelError('compound assignment to a conditional is not supported');
      return '(' + tv + ' = ' + rhs + ', ' + T(this.expr(lhs.c, ctx)) + ' ? ' + asg(lhs.a) + ' : ' + asg(lhs.b) + ')';
    }
    if (lhs.k === 'nstr' || lhs.k === 'strlit') {
      return 'S.strcpy(' + this.expr(lhs, ctx) + ', ' + rhs + ')';
    }
    if (lhs.k === 'call' && lhs.name === 'slider') {
      var si = this.temp();
      return '(' + si + ' = ' + this.expr(lhs.args[0], ctx) + ', S.setSliderByIndex(' + si + ', ' + value('S.sliderByIndex(' + si + ')') + '))';
    }
    if (lhs.k === 'seq' && lhs.items.length) {
      var head = lhs.items.slice(0, -1).map(function (x) { return self.expr(x, ctx); });
      return '(' + head.concat([this.assignment({ k: 'assign', op: n.op, lhs: lhs.items[lhs.items.length - 1], rhs: n.rhs }, ctx)]).join(', ') + ')';
    }
    throw new EelError('cannot assign to ' + lhs.k);
  };

  // A variable passed by reference (midirecv, file_var): its JS lvalue.
  Compiler.prototype.lvalue = function (n, ctx) {
    if (n.k === 'var') return this.ref(n.name, ctx);
    return null;
  };

  Compiler.prototype.call = function (n, ctx) {
    var self = this, name = n.name, args = n.args;
    function A(i) { return args[i] === undefined ? '0' : self.expr(args[i], ctx); }
    function all() { return args.map(function (x) { return self.expr(x, ctx); }).join(', '); }
    if (MATH[name]) return MATH[name] + '(' + all() + ')';
    switch (name) {
      case 'midirecv': {
        var lv = args.map(function (x) { return self.lvalue(x, ctx); });
        var sets = [];
        for (var i = 0; i < lv.length; i++) {
          if (!lv[i]) continue;
          var src = lv.length >= 4 ? 'S.mr[' + i + ']' : (i === 2 ? '(S.mr[2] + S.mr[3] * 256)' : 'S.mr[' + i + ']');
          sets.push(lv[i] + ' = ' + src);
        }
        return '(S.midirecv() ? (' + (sets.length ? sets.join(', ') + ', ' : '') + 'S.mr[1]) : 0)';
      }
      case 'midisend':
        if (args.length >= 4) return 'S.midisend(' + A(0) + ', ' + A(1) + ', ' + A(2) + ', ' + A(3) + ')';
        return 'S.midisend3(' + A(0) + ', ' + A(1) + ', ' + A(2) + ')';
      case 'midisend_buf': return 'S.midisendBuf(' + A(0) + ', ' + A(1) + ', ' + A(2) + ')';
      case 'midisyx': return 'S.midisendBuf(' + A(0) + ', ' + A(1) + ', ' + A(2) + ')';
      case 'file_var': {
        var fv = this.lvalue(args[1], ctx);
        if (!fv) return 'S.fileVar(' + A(0) + ', ' + A(1) + ')';
        return '(' + fv + ' = S.fileVar(' + A(0) + ', ' + fv + '))';
      }
      case 'file_riff': {
        // channels and sample rate come back through the arguments
        var nc = this.lvalue(args[1], ctx), fr = this.lvalue(args[2], ctx);
        var t0 = this.temp();
        return '(' + t0 + ' = S.fileRiff(' + A(0) + ')' + (nc ? ', ' + nc + ' = S.riff[0]' : '') + (fr ? ', ' + fr + ' = S.riff[1]' : '') + ', ' + t0 + ')';
      }
      case 'slider': return 'S.sliderByIndex(' + A(0) + ')';
      case 'loop': case 'while':
        return '(() => { var rr = 0; ' + this.stmts(n, ctx, true, 'rr') + ' return rr; })()';
      case 'match': case 'matchi': {
        var refs = args.slice(2).map(function (x) { return self.lvalue(x, ctx); });
        var call = 'S.match(' + (name === 'matchi' ? 'true' : 'false') + ', ' + A(0) + ', ' + A(1) + ')';
        if (!refs.length) return call;
        var tm = this.temp();
        var assigns = refs.map(function (r, k) { return r ? r + ' = S.matchOut[' + k + ']' : ''; }).filter(Boolean);
        return '(' + tm + ' = ' + call + ', ' + tm + ' ? (' + (assigns.length ? assigns.join(', ') + ', ' : '') + '1) : 0)';
      }
    }
    if (this.funcs[name]) return this.userCall(this.funcs[name], args, ctx, '');
    if (name.indexOf('.') > 0) {
      var base = name.slice(name.lastIndexOf('.') + 1), prefix = name.slice(0, name.lastIndexOf('.'));
      if (this.funcs[base]) return this.userCall(this.funcs[base], args, ctx, prefix === 'this' || prefix.indexOf('this.') === 0 ? resolveThis(prefix, ctx) : prefix);
    }
    if (/^gfx_|^mouse_/.test(name)) {
      if (!this.gfx) return '(' + (args.length ? all() + ', ' : '') + '0)';
      // Width and height come back through the arguments, as file_riff's do.
      if (name === 'gfx_measurestr' || name === 'gfx_measurechar' || name === 'gfx_getimgdim') {
        var mw = this.lvalue(args[1] || { k: 'num', v: 0 }, ctx), mh = this.lvalue(args[2] || { k: 'num', v: 0 }, ctx);
        var tg = this.temp();
        return '(' + tg + ' = S.call(' + JSON.stringify(name) + ', ' + A(0) + ')' + (mw ? ', ' + mw + ' = S.gm[0]' : '') +
               (mh ? ', ' + mh + ' = S.gm[1]' : '') + ', ' + tg + ')';
      }
    }
    return 'S.call(' + JSON.stringify(name) + (args.length ? ', ' + all() : '') + ')';
  };

  // One compiled copy per function and namespace, as EEL2 does: a.f() and
  // b.f() are two functions, each with its own instance variables.
  Compiler.prototype.userCall = function (fn, args, ctx, ns) {
    var self = this;
    ns = ns || '';
    if (args.length !== fn.params.length && !(args.length === 1 && fn.params.length === 0)) {
      // EEL2 refuses the wrong number of arguments at compile time.
      throw new EelError(fn.name + '() takes ' + fn.params.length + ' arguments, given ' + args.length);
    }
    var jsName = 'F_' + fn.name.replace(/\./g, '_') + (ns ? '$' + ns.replace(/\./g, '$') : '');
    var key = fn.name + '@' + ns;
    if (!this.compiledFuncs[key]) {
      this.compiledFuncs[key] = true;
      var saved = this.temps;
      this.temps = 0;
      var body = this.stmts(fn.body, { fn: fn, ns: ns }, true, 'r');
      var temps = this.tempDecl();
      this.temps = saved;
      var params = fn.params.map(function (_, i) { return 'p' + i; });
      this.funcCode.push('function ' + jsName + '(' + params.join(', ') + ') { var r = 0;' + temps + body + ' return r; }');
    }
    return jsName + '(' + args.slice(0, fn.params.length).map(function (x) { return self.expr(x, ctx); }).join(', ') + ')';
  };

  // ----------------------------------------------------------- helpers ----
  function i64(x) { return Math.trunc(x); }
  function bigOp(a, b, f) { return Number(BigInt.asIntN(64, f(BigInt(i64(a)), BigInt(i64(b))))); }
  var H = {
    sqrt: function (x) { return Math.sqrt(Math.abs(x)); },
    sign: function (x) { return x > 0 ? 1 : (x < 0 ? -1 : 0); },
    invsqrt: function (x) { return 1 / Math.sqrt(x); },
    sqr: function (x) { return x * x; },
    exp2: function (x) { return Math.pow(2, x); },
    rand: function (x) { return Math.random() * (x === undefined ? 1 : x); },
    mod: function (a, b) {
      var ib = Math.trunc(Math.abs(b));
      return ib ? Math.trunc(Math.abs(a)) % ib : 0;
    },
    shl: function (a, b) { return bigOp(a, b, function (x, y) { return x << (y & 63n); }); },
    shr: function (a, b) { return bigOp(a, b, function (x, y) { return x >> (y & 63n); }); },
    bor: function (a, b) {
      if (Math.abs(a) < 2147483648 && Math.abs(b) < 2147483648) return (i64(a) | i64(b));
      return bigOp(a, b, function (x, y) { return x | y; });
    },
    band: function (a, b) {
      if (Math.abs(a) < 2147483648 && Math.abs(b) < 2147483648) return (i64(a) & i64(b));
      return bigOp(a, b, function (x, y) { return x & y; });
    },
    bxor: function (a, b) {
      if (Math.abs(a) < 2147483648 && Math.abs(b) < 2147483648) return (i64(a) ^ i64(b));
      return bigOp(a, b, function (x, y) { return x ^ y; });
    }
  };

  // C's %f: the double's exact decimal value, rounded half to even.
  var F64 = new Float64Array(1), U32 = new Uint32Array(F64.buffer);
  function toFixedC(x, f) {
    if (!isFinite(x)) return String(x);
    var neg = x < 0; F64[0] = Math.abs(x);
    var hi = U32[1], lo = U32[0], exp = (hi >>> 20) & 0x7ff;
    var mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
    if (exp === 0) exp = 1; else mant |= 1n << 52n;
    var e = exp - 1075, D, sc;
    if (e >= 0) { D = mant << BigInt(e); sc = 0; } else { D = mant * (5n ** BigInt(-e)); sc = -e; }
    var q;
    if (f >= sc) q = D * (10n ** BigInt(f - sc));
    else {
      var div = 10n ** BigInt(sc - f); q = D / div; var r2 = (D % div) * 2n;
      if (r2 > div || (r2 === div && (q & 1n) === 1n)) q += 1n;
    }
    var s = q.toString();
    if (f > 0) { while (s.length <= f) s = '0' + s; s = s.slice(0, s.length - f) + '.' + s.slice(s.length - f); }
    return (neg && /[1-9]/.test(s) ? '-' : (neg ? '-' : '')) + s;
  }

  // EEL2's sprintf, on doubles.
  function eelFormat(fmt, values) {
    var vi = 0;
    return fmt.replace(/%([-+ 0#]*)(\d*)(?:\.(\d+))?([dixXfgecs%])/g, function (all, flags, width, prec, conv) {
      if (conv === '%') return '%';
      var v = values[vi++], s;
      if (v === undefined) v = 0;
      switch (conv) {
        case 'd': case 'i': s = String(Math.trunc(v.num !== undefined ? v.num : v)); break;
        case 'x': s = (Math.trunc(v) >>> 0).toString(16); break;
        case 'X': s = (Math.trunc(v) >>> 0).toString(16).toUpperCase(); break;
        case 'f': s = toFixedC(Number(v), prec === undefined ? 6 : Number(prec)); break;
        case 'e': s = Number(v).toExponential(prec === undefined ? 6 : Number(prec)); break;
        case 'g': s = String(Number(Number(v).toPrecision(prec === undefined ? 6 : Math.max(1, Number(prec))))); break;
        case 'c': s = String.fromCharCode(Math.trunc(v)); break;
        case 's': s = v.str !== undefined ? v.str : String(v); break;
      }
      if (flags.indexOf('+') >= 0 && conv !== 's' && Number(v) >= 0) s = '+' + s;
      var w = Number(width || 0);
      while (s.length < w) s = flags.indexOf('-') >= 0 ? s + ' ' : (flags.indexOf('0') >= 0 && conv !== 's' ? '0' + s : ' ' + s);
      return s;
    });
  }

  // ---------------------------------------------------------- instance ----
  function JSFX(text, opts) {
    opts = opts || {};
    this.file = parseFile(text, opts.readImport);
    this.srate = opts.sampleRate || 48000;
    this.slots = { __count: 0 };
    var self = this;
    var C = new Compiler(this.slots);
    C.gfx = !!opts.gfx;
    // Predeclare what the host reads and writes.
    ['srate', 'samplesblock', 'tempo', 'play_state', 'play_position', 'beat_position', 'ts_num', 'ts_denom',
     'num_ch', 'trigger', 'pdc_delay', 'pdc_bot_ch', 'pdc_top_ch', 'pdc_midi', 'ext_noinit', 'ext_nodenorm',
     'ext_midi_bus', 'midi_bus', 'gfx_ext_retina'].forEach(function (n) { C.slot(n); });
    for (var c = 0; c < 64; c++) C.slot('spl' + c);
    for (var s = 1; s <= 64; s++) C.slot('slider' + s);
    this.file.sliders.forEach(function (sl) { C.slot(sl.variable); });
    if (C.gfx) ['gfx_r', 'gfx_g', 'gfx_b', 'gfx_a', 'gfx_a2', 'gfx_x', 'gfx_y', 'gfx_w', 'gfx_h', 'gfx_texth', 'gfx_mode', 'gfx_clear',
                'gfx_dest', 'gfx_ext_flags', 'mouse_x', 'mouse_y', 'mouse_cap', 'mouse_wheel', 'mouse_hwheel'].forEach(function (n) { C.slot(n); });

    var sections = {};
    ['init', 'slider', 'block', 'sample', 'serialize'].concat(C.gfx ? ['gfx'] : []).forEach(function (name) {
      var parts = self.file.sections[name];
      if (!parts.length) return;
      sections[name] = parts.map(function (part) { return C.compileSection(part.code, part.line); });
    });
    // @gfx is parsed for its functions only, so @init code that calls a
    // helper defined there still compiles.
    if (!C.gfx) this.file.sections.gfx.forEach(function (part) {
      try { parse(lex(part.code, part.line), C.funcs); } catch (e) { /* the window is not run */ }
    });

    // Room for names a later eval() adds: the generated code holds on to v.
    this.v = new Float64Array(this.slots.__count + 4096);
    this.strConsts = C.strConsts;
    var src = [];
    src.push('"use strict";');
    // Memory is one Float64Array that doubles when written past its end, up
    // to EEL2's 8M words; rd and wr sit beside it so V8 can inline them.
    src.push('var v = S.v, M = new Float64Array(' + BLOCK + ');');
    src.push('function rd(a) { var i = (a + ' + EPS + ') | 0; return (i >= 0 && i < M.length) ? M[i] : 0; }');
    src.push('function wr(a, x) { var i = (a + ' + EPS + ') | 0; if (i >= 0 && i < M.length) { M[i] = x; return x; } return grow(i, x); }');
    src.push('function grow(i, x) { if (i < 0 || i >= ' + (BLOCK * NBLOCKS) + ') return x; var n = M.length; while (n <= i) n *= 2;' +
             ' var N = new Float64Array(Math.min(n, ' + (BLOCK * NBLOCKS) + ')); N.set(M); M = N; M[i] = x; return x; }');
    src.push('S.rd = rd; S.wr = wr; S.clearMem = function () { M = new Float64Array(' + BLOCK + '); };');
    // Code compiled later (eval) runs in this scope, beside M, v and the helpers.
    src.push('S.evalIn = function (code) { return eval(code); };');
    src.push(C.funcCode.join('\n'));
    Object.keys(sections).forEach(function (name) {
      src.push('S.sec_' + name + ' = [' + sections[name].map(function (b) { return 'function () {' + b + '}'; }).join(',\n') + '];');
    });
    this.code = src.join('\n');
    this.reset();
    new Function('S', 'H', this.code)(this, H);
  }

  JSFX.prototype.reset = function () {
    this.v.fill(0);
    this.mem = new Array(NBLOCKS);
    this.gmem = NS.sharedGmem || (NS.sharedGmem = {});
    this.gmemName = (/gmem=(\S+)/.exec(this.file.options) || [])[1] || '';
    this.strings = {};
    this.namedIds = {};
    this.nextNamed = 90000;
    this.midiIn = []; this.midiInPos = 0; this.midiOut = [];
    this.mr = [0, 0, 0, 0];
    this.matchOut = [];
    this.serial = null;
    this.blockCount = 0;
    this.sliderDirty = true;
    this.sampleFrame = 0;
    var self = this;
    if (this.clearMem) this.clearMem();
    this.file.sliders.forEach(function (sl) { self.v[self.slots[sl.variable]] = sl.def; });
  };

  JSFX.prototype.slot = function (name) { return this.slots[name.toLowerCase()]; };
  JSFX.prototype.getVar = function (name) { var s = this.slot(name); return s === undefined ? 0 : this.v[s]; };
  JSFX.prototype.setVar = function (name, val) { var s = this.slot(name); if (s !== undefined) this.v[s] = val; };

  JSFX.prototype.sliderVar = function (n) {
    for (var i = 0; i < this.file.sliders.length; i++) if (this.file.sliders[i].index === n) return this.file.sliders[i].variable;
    return 'slider' + n;
  };
  JSFX.prototype.sliderByIndex = function (n) { return this.v[this.slots[this.sliderVar(Math.trunc(n))]] || 0; };
  JSFX.prototype.setSliderByIndex = function (n, val) { this.v[this.slots[this.sliderVar(Math.trunc(n))]] = val; return val; };
  JSFX.prototype.getSlider = function (n) { return this.sliderByIndex(n); };
  JSFX.prototype.setSlider = function (n, val) {
    this.setSliderByIndex(n, val);
    this.sliderDirty = true;
  };

  JSFX.prototype.runSection = function (name) {
    var list = this['sec_' + name];
    if (!list) return 0;
    var r = 0;
    for (var i = 0; i < list.length; i++) r = list[i]();
    return r;
  };

  JSFX.prototype.setTime = function (t) {
    var v = this.v, s = this.slots;
    if (t.tempo !== undefined) v[s.tempo] = t.tempo;
    if (t.playState !== undefined) v[s.play_state] = t.playState;
    if (t.beat !== undefined) v[s.beat_position] = t.beat;
    if (t.seconds !== undefined) v[s.play_position] = t.seconds;
    if (t.num !== undefined) v[s.ts_num] = t.num;
    if (t.den !== undefined) v[s.ts_denom] = t.den;
  };

  JSFX.prototype.init = function (sampleRate) {
    if (sampleRate) this.srate = sampleRate;
    var keep = this.file.sliders.map(function (sl) { return this.v[this.slots[sl.variable]]; }, this);
    this.reset();
    this.file.sliders.forEach(function (sl, i) { this.v[this.slots[sl.variable]] = keep[i]; }, this);
    var v = this.v, s = this.slots;
    v[s.srate] = this.srate;
    v[s.num_ch] = Math.max(this.file.inPins.length, this.file.outPins.length);
    v[s.tempo] = v[s.tempo] || 120; v[s.ts_num] = v[s.ts_num] || 4; v[s.ts_denom] = v[s.ts_denom] || 4;
    this.runSection('init');
    this.runSection('slider');
    this.sliderDirty = false;
    this.initialised = true;
  };

  /* One block: `inputs`/`outputs` are arrays of Float32Array per channel (or
   * null for a MIDI-only device), `midi` is [{offset, data:[b1,b2,b3]}]
   * sorted by offset. Returns the MIDI sent, with offsets. */
  JSFX.prototype.process = function (n, inputs, outputs, midi) {
    if (!this.initialised) this.init();
    var v = this.v, s = this.slots;
    if (this.sliderDirty) { this.sliderDirty = false; this.runSection('slider'); }
    v[s.samplesblock] = n;
    this.midiIn = midi || [];
    this.midiInPos = 0;
    this.midiOut = [];
    this.runSection('block');
    var sec = this.sec_sample;
    if (sec && sec.length) {
      var nIn = inputs ? inputs.length : 0, nOut = outputs ? outputs.length : 0;
      var nch = Math.max(nIn, nOut, 2);
      var spl = [];
      for (var c = 0; c < nch; c++) spl.push(s['spl' + c]);
      for (var i = 0; i < n; i++) {
        this.sampleFrame = i;
        for (var ci = 0; ci < nch; ci++) v[spl[ci]] = ci < nIn && inputs[ci] ? inputs[ci][i] : 0;
        for (var k = 0; k < sec.length; k++) sec[k]();
        for (var co = 0; co < nOut; co++) if (outputs[co]) outputs[co][i] = v[spl[co]];
      }
    } else if (outputs && inputs) {
      for (var ch = 0; ch < outputs.length; ch++) if (outputs[ch] && inputs[ch]) outputs[ch].set(inputs[ch]);
    }
    // MIDI a plug-in did not read passes through, as in REAPER.
    for (var r = this.midiInPos; r < this.midiIn.length; r++) this.midiOut.push(this.midiIn[r]);
    this.blockCount++;
    var out = this.midiOut;
    out.sort(function (a, b) { return a.offset - b.offset; });
    return out;
  };

  // ------------------------------------------------------- the host API --
  JSFX.prototype.midirecv = function () {
    if (this.midiInPos >= this.midiIn.length) return 0;
    var ev = this.midiIn[this.midiInPos++];
    this.mr[0] = ev.offset; this.mr[1] = ev.data[0]; this.mr[2] = ev.data[1] || 0; this.mr[3] = ev.data[2] || 0;
    return 1;
  };
  JSFX.prototype.midisend = function (offset, b1, b2, b3) {
    this.midiOut.push({ offset: Math.max(0, Math.trunc(offset)), data: [Math.trunc(b1) & 255, Math.trunc(b2) & 127, Math.trunc(b3) & 127] });
    return b1;
  };
  JSFX.prototype.midisend3 = function (offset, b1, b23) {
    b23 = Math.trunc(b23);
    return this.midisend(offset, b1, b23 & 255, (b23 >> 8) & 255);
  };
  JSFX.prototype.midisendBuf = function (offset, buf, len) {
    var data = [];
    for (var i = 0; i < len; i++) data.push(Math.trunc(this.rd(buf + i)) & 255);
    this.midiOut.push({ offset: Math.max(0, Math.trunc(offset)), data: data });
    return len;
  };

  JSFX.prototype.grd = function (a) { var g = this.gmem[this.gmemName]; if (!g) return 0; var i = (a + EPS) | 0; return g[i] || 0; };
  JSFX.prototype.gwr = function (a, val) {
    var g = this.gmem[this.gmemName] || (this.gmem[this.gmemName] = {});
    g[(a + EPS) | 0] = val; return val;
  };

  // Strings: literals are 10000+, named strings 90000+, slots 0-1023 free.
  JSFX.prototype.str = function (id) {
    id = Math.trunc(id);
    if (id >= 10000 && id < 90000) return this.strConsts[id - 10000] || '';
    return this.strings[id] || '';
  };
  JSFX.prototype.setStr = function (id, s) { this.strings[Math.trunc(id)] = s; return id; };
  JSFX.prototype.named = function (name) {
    var id = this.namedIds[name];
    if (id === undefined) { id = this.namedIds[name] = this.nextNamed++; this.strings[id] = ''; }
    return id;
  };
  JSFX.prototype.tempStr = function (site) { var id = 200000 + site; if (this.strings[id] === undefined) this.strings[id] = ''; return id; };
  JSFX.prototype.strcpy = function (d, s) { return this.setStr(d, this.str(s)); };
  JSFX.prototype.match = function (ci, pat, sid) {
    var p = this.str(pat), s = this.str(sid);
    var re = '^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
    return new RegExp(re, ci ? 'i' : '').test(s) ? 1 : 0;
  };

  JSFX.prototype.riff = [0, 0];
  JSFX.prototype.fileRiff = function (h) {
    var f = this.files && this.files[Math.trunc(h)];
    this.riff = f ? [f.channels, f.rate] : [0, 0];
    return f ? 1 : 0;
  };
  // One frame of @gfx, drawn by `host`: an object with a method per gfx_*
  // function (each called with the JSFX first), as the Ableton devices give.
  // `w`, `h` and `mouse` ({x, y, cap, wheel, hwheel}) are what REAPER sets.
  JSFX.prototype.runGfx = function (host, w, h, mouse) {
    if (!this.sec_gfx) return 0;
    if (!this.initialised) this.init();
    var v = this.v, s = this.slots;
    this.gfxHost = host;
    v[s.gfx_w] = w; v[s.gfx_h] = h;
    if (mouse) {
      v[s.mouse_x] = mouse.x; v[s.mouse_y] = mouse.y; v[s.mouse_cap] = mouse.cap;
      if (mouse.wheel) v[s.mouse_wheel] += mouse.wheel;
      if (mouse.hwheel) v[s.mouse_hwheel] += mouse.hwheel;
    }
    return this.runSection('gfx');
  };
  JSFX.prototype.gm = [0, 0];

  JSFX.prototype.call = function (name) {
    var a = Array.prototype.slice.call(arguments, 1);
    if (this.gfxHost && this.gfxHost[name]) return +this.gfxHost[name].apply(this.gfxHost, [this].concat(a)) || 0;
    var f = BUILTINS[name];
    if (!f) {
      if (!this.warned) this.warned = {};
      if (!this.warned[name] && typeof console !== 'undefined') { this.warned[name] = true; console.warn('JSFX: no ' + name + '()'); }
      return 0;
    }
    return f.apply(this, a);
  };

  // @serialize: values written in order, read back in order.
  JSFX.prototype.fileVar = function (h, cur) {
    h = Math.trunc(h);
    if (h === 0 && this.serial) {
      if (this.serial.mode === 'write') { this.serial.data.push(cur); return cur; }
      var d = this.serial.data[this.serial.pos++];
      return d === undefined ? cur : (typeof d === 'number' ? d : cur);
    }
    var f = this.files && this.files[h];
    if (f && f.pos < f.values.length) return f.values[f.pos++];
    return cur;
  };
  JSFX.prototype.serialize = function () {
    this.serial = { mode: 'write', data: [], pos: 0 };
    this.runSection('serialize');
    var data = this.serial.data;
    this.serial = null;
    return { sliders: this.file.sliders.map(function (sl) { return this.v[this.slots[sl.variable]]; }, this), data: data };
  };
  JSFX.prototype.deserialize = function (state) {
    if (!state) return;
    if (!this.initialised) this.init();
    if (state.sliders) this.file.sliders.forEach(function (sl, i) {
      if (state.sliders[i] !== undefined) this.v[this.slots[sl.variable]] = state.sliders[i];
    }, this);
    this.serial = { mode: 'read', data: state.data || [], pos: 0 };
    this.runSection('serialize');
    this.serial = null;
    this.sliderDirty = true;
  };

  // Run a line of EEL2 against this instance: how a device's own buttons
  // (Panic, Transfer to Pads...) are pressed from Middaw's controls.
  JSFX.prototype.eval = function (code) {
    var C = new Compiler(this.slots);
    C.gfx = !!opts.gfx;
    C.strConsts = this.strConsts;
    // reuse the instance's functions by recompiling them into this snippet
    var funcs = {};
    var self = this;
    ['init', 'slider', 'block', 'sample', 'serialize', 'gfx'].forEach(function (name) {
      self.file.sections[name].forEach(function (part) { try { parse(lex(part.code, part.line), funcs); } catch (e) {} });
    });
    C.funcs = funcs;
    var body = C.compileSection(code, 1);
    var fn = this.evalIn('(function () {' + C.funcCode.join('\n') + ' return function () {' + body + '}; })()');
    if (this.slots.__count > this.v.length) throw new EelError('too many new variables in eval');
    return fn();
  };

  var BUILTINS = {
    memset: function (d, val, n) { for (var i = 0; i < n; i++) this.wr(d + i, val); return d; },
    memcpy: function (d, s, n) {
      var tmp = [];
      for (var i = 0; i < n; i++) tmp.push(this.rd(s + i));
      for (var j = 0; j < n; j++) this.wr(d + j, tmp[j]);
      return d;
    },
    freembuf: function (n) { return n; },
    mem_set_values: function () { return 0; },
    time: function () { return Math.floor(Date.now() / 1000); },
    time_precise: function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; },
    sliderchange: function () { if (this.onSliderChange) this.onSliderChange(); return 0; },
    slider_automate: function () { if (this.onSliderChange) this.onSliderChange(); return 0; },
    slider_show: function () { return 0; },
    strlen: function (s) { return this.str(s).length; },
    strcpy: function (d, s) { return this.setStr(d, this.str(s)); },
    strcat: function (d, s) { return this.setStr(d, this.str(d) + this.str(s)); },
    strcmp: function (a, b) { var x = this.str(a), y = this.str(b); return x < y ? -1 : x > y ? 1 : 0; },
    stricmp: function (a, b) { var x = this.str(a).toLowerCase(), y = this.str(b).toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; },
    strncpy: function (d, s, n) { return this.setStr(d, this.str(s).slice(0, n)); },
    strcpy_substr: function (d, s, off, len) {
      var str = this.str(s);
      if (off < 0) off = Math.max(0, str.length + off);
      return this.setStr(d, len === undefined ? str.slice(off) : str.substr(off, Math.max(0, len)));
    },
    str_getchar: function (s, i) { var str = this.str(s); if (i < 0) i += str.length; return i >= 0 && i < str.length ? str.charCodeAt(i) : 0; },
    str_setchar: function (s, i, c) {
      var str = this.str(s); if (i < 0) i += str.length;
      if (i >= 0 && i <= str.length) this.setStr(s, str.slice(0, i) + String.fromCharCode(c) + str.slice(i + 1));
      return c;
    },
    sprintf: function (d, fmt) {
      var self = this, vals = Array.prototype.slice.call(arguments, 2);
      var f = this.str(fmt);
      // %s takes a string handle
      var vi = 0;
      var mapped = [];
      f.replace(/%[-+ 0#]*\d*(?:\.\d+)?([dixXfgecs%])/g, function (all, conv) {
        if (conv === '%') return all;
        var x = vals[vi++];
        mapped.push(conv === 's' ? { str: self.str(x) } : x);
        return all;
      });
      return this.setStr(d, eelFormat(f, mapped));
    },
    file_open: function (s) {
      var name = this.str(s);
      var vals = this.openFile ? this.openFile(name) : null;
      if (!vals) return -1;
      if (!this.files) { this.files = {}; this.nextFile = 1; }
      var h = this.nextFile++;
      this.files[h] = { values: vals.samples || vals, pos: 0, channels: vals.channels || 1, rate: vals.rate || this.srate };
      return h;
    },
    file_close: function (h) { if (this.files) delete this.files[h]; return 0; },
    file_rewind: function (h) { if (this.files && this.files[h]) this.files[h].pos = 0; return 0; },
    file_avail: function (h) {
      h = Math.trunc(h);
      if (h === 0 && this.serial) return this.serial.mode === 'write' ? -1 : this.serial.data.length - this.serial.pos;
      var f = this.files && this.files[h];
      return f ? f.values.length - f.pos : 0;
    },
    file_riff: function () { return 0; },
    file_text: function () { return 0; },
    file_mem: function (h, addr, n) {
      h = Math.trunc(h);
      if (h === 0 && this.serial) {
        if (this.serial.mode === 'write') { for (var i = 0; i < n; i++) this.serial.data.push(this.rd(addr + i)); }
        else { for (var j = 0; j < n; j++) { var d = this.serial.data[this.serial.pos++]; this.wr(addr + j, typeof d === 'number' ? d : 0); } }
        return n;
      }
      var f = this.files && this.files[h];
      if (!f) return 0;
      var k = 0;
      for (; k < n && f.pos < f.values.length; k++) this.wr(addr + k, f.values[f.pos++]);
      return k;
    },
    file_string: function (h, s) {
      h = Math.trunc(h);
      if (h === 0 && this.serial) {
        if (this.serial.mode === 'write') this.serial.data.push({ s: this.str(s) });
        else { var d = this.serial.data[this.serial.pos++]; if (d && d.s !== undefined) this.setStr(s, d.s); }
      }
      return 1;
    },
    export_buffer_to_project: function () { return this.exportBuffer ? this.exportBuffer.apply(this, arguments) : 0; },
    get_host_placement: function () { return 0; },
    get_host_numchan: function () { return 2; },
    set_host_numchan: function () { return 0; },
    get_pin_mapping: function () { return 0; },
    set_pdc: function () { return 0; },
    printf: function () { return 0; },
    gfx_getchar: function () { return 0; }
  };

  NS.JSFX = JSFX;
  NS.parseFile = parseFile;
  NS.parseSliderLine = parseSliderLine;
  NS.lexEel = lex;
  NS.parseEel = parse;
  NS.EelError = EelError;
})(typeof module === 'object' && module.exports
  ? (module.exports = (globalThis.MiddawJSFX = globalThis.MiddawJSFX || {}))
  : (globalThis.MiddawJSFX = globalThis.MiddawJSFX || {}));


/* ---- kit/gfx.js ---- */
/* REAPER's gfx_* drawing, on Max's mgraphics: the host a JSFX's @gfx runs on
 * (MiddawJSFX's runGfx). Each method takes the JSFX first, reads gfx_r, gfx_x
 * and the rest from its variables, and draws as REAPER would: text from its
 * top-left, gfx_x moved on past it, angles from twelve o'clock clockwise.
 *
 * gfx_showmenu cannot wait for a choice inside a frame, so it asks for one:
 * `menu` is set, the frame returns 0, and the device draws the menu. When an
 * item is chosen the device puts the variables back as they were at the start
 * of that frame and runs it again, and this time gfx_showmenu returns the item.
 */
var Gfx = (function () {
  'use strict';
  function Host(g) {
    this.g = g;
    this.fonts = { 0: { name: 'Arial', size: 13, flags: 0 } };
    this.font = 0;
    this.menu = null;        // { text, x, y } asked for this frame
    this.choice = 0;         // the item to give gfx_showmenu on the replayed frame
    this.slots = null;
  }
  Host.prototype.begin = function (g, fx) {
    this.g = g;
    if (!this.slots || this.fx !== fx) {
      this.fx = fx;
      var s = fx.slots;
      this.slots = { r: s.gfx_r, g: s.gfx_g, b: s.gfx_b, a: s.gfx_a, x: s.gfx_x, y: s.gfx_y, texth: s.gfx_texth,
                     mx: s.mouse_x, my: s.mouse_y, clear: s.gfx_clear };
    }
    this.menu = null;
    this.applyFont();
  };
  Host.prototype.v = function (k) { return this.fx.v[this.slots[k]]; };
  Host.prototype.set = function (k, x) { this.fx.v[this.slots[k]] = x; };
  // Every colour the script sets goes through Palette.tone: the house scheme
  // becomes Live's, other greys lose their tint, other colours stay.
  function toned(r, g, b) { return typeof Palette !== 'undefined' ? Palette.tone(r, g, b) : [clamp(r), clamp(g), clamp(b)]; }
  Host.prototype.colour = function () {
    var c = toned(this.v('r') || 0, this.v('g') || 0, this.v('b') || 0);
    this.g.set_source_rgba(c[0], c[1], c[2], clamp(this.v('a')));
  };
  // EEL2 strings are bytes; REAPER draws them as UTF-8.
  function utf8(s) { try { return decodeURIComponent(escape(s)); } catch (e) { return s; } }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : (x || 0); }
  function num(x, d) { return x === undefined || x !== x ? d : x; }

  // ------------------------------------------------------------ colour ---
  Host.prototype.gfx_set = function (fx, r, g, b, a) {
    r = num(r, 0);
    this.set('r', r); this.set('g', num(g, r)); this.set('b', num(b, r)); this.set('a', num(a, 1));
    return 0;
  };

  // ------------------------------------------------------------ shapes ---
  Host.prototype.gfx_rect = function (fx, x, y, w, h, filled) {
    if (!(w > 0 && h > 0)) return 0;
    this.colour();
    if (num(filled, 1)) { this.g.rectangle(x, y, w, h); this.g.fill(); }
    else { this.g.set_line_width(1); this.g.rectangle(x + 0.5, y + 0.5, w - 1, h - 1); this.g.stroke(); }
    return 0;
  };
  Host.prototype.gfx_line = function (fx, x1, y1, x2, y2) {
    this.colour();
    this.g.set_line_width(1);
    this.g.move_to(x1 + 0.5, y1 + 0.5); this.g.line_to(x2 + 0.5, y2 + 0.5); this.g.stroke();
    return 0;
  };
  Host.prototype.gfx_lineto = function (fx, x, y) {
    this.gfx_line(fx, this.v('x'), this.v('y'), x, y);
    this.set('x', x); this.set('y', y);
    return 0;
  };
  Host.prototype.gfx_circle = function (fx, x, y, r, fill) {
    this.colour();
    this.g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (num(fill, 0)) this.g.fill(); else { this.g.set_line_width(1); this.g.stroke(); }
    return 0;
  };
  Host.prototype.gfx_arc = function (fx, x, y, r, a1, a2) {
    this.colour();
    this.g.set_line_width(1);
    this.g.arc(x, y, Math.max(0, r), a1 - Math.PI / 2, a2 - Math.PI / 2);
    this.g.stroke();
    return 0;
  };
  Host.prototype.gfx_roundrect = function (fx, x, y, w, h, radius) {
    this.colour();
    this.g.set_line_width(1);
    this.g.rectangle_rounded(x + 0.5, y + 0.5, w, h, radius * 2, radius * 2);
    this.g.stroke();
    return 0;
  };
  Host.prototype.gfx_triangle = function (fx) {
    var p = Array.prototype.slice.call(arguments, 1);
    if (p.length < 6) return 0;
    this.colour();
    this.g.move_to(p[0], p[1]);
    for (var i = 2; i + 1 < p.length; i += 2) this.g.line_to(p[i], p[i + 1]);
    this.g.close_path();
    this.g.fill();
    return 0;
  };
  Host.prototype.gfx_gradrect = function (fx, x, y, w, h, r, g, b, a) {
    var c = toned(r || 0, g || 0, b || 0);
    this.g.set_source_rgba(c[0], c[1], c[2], clamp(num(a, 1)));
    this.g.rectangle(x, y, w, h); this.g.fill();
    return 0;
  };

  // -------------------------------------------------------------- text ---
  // gfx_setfont(idx, name, size, flags): flags is a character code, 'b' bold, 'i' italic.
  Host.prototype.gfx_setfont = function (fx, idx, name, size, flags) {
    idx = Math.trunc(num(idx, 0));
    if (name !== undefined && idx > 0) {
      this.fonts[idx] = { name: fx.str(name) || 'Arial', size: num(size, 13), flags: Math.trunc(num(flags, 0)) };
    }
    this.font = this.fonts[idx] ? idx : 0;
    this.applyFont();
    return 1;
  };
  Host.prototype.gfx_getfont = function () { return this.font; };
  Host.prototype.applyFont = function () {
    var f = this.fonts[this.font] || this.fonts[0], fl = f.flags;
    // REAPER's names for the system face are not names Max can ask for
    var face = /^\./.test(f.name) || /^segoe/i.test(f.name) ? 'Arial' : f.name;
    var bold = fl === 98 || ((fl >> 8) & 255) === 98 || ((fl >> 16) & 255) === 98;
    var italic = fl === 105 || ((fl >> 8) & 255) === 105 || ((fl >> 16) & 255) === 105;
    this.g.select_font_face(face, italic ? 'italic' : 'normal', bold ? 'bold' : 'normal');
    this.g.set_font_size(f.size);
    this.size = f.size;
    if (this.slots) this.set('texth', Math.round(f.size));
  };
  Host.prototype.measure = function (s) {
    var m = this.g.text_measure(s);
    return [m[0], Math.max(m[1], this.size)];
  };
  Host.prototype.gfx_measurestr = function (fx, s) { this.fx.gm = this.measure(utf8(fx.str(s))); return this.fx.gm[0]; };
  Host.prototype.gfx_measurechar = function (fx, c) { this.fx.gm = this.measure(String.fromCharCode(c)); return this.fx.gm[0]; };
  Host.prototype.text = function (s, flags, right, bottom) {
    var x = this.v('x'), y = this.v('y'), m = this.measure(s);
    flags = Math.trunc(num(flags, 0));
    if (right !== undefined && !(flags & 256)) {
      if (flags & 1) x = x + (right - x - m[0]) / 2; else if (flags & 2) x = right - m[0];
      if (flags & 4) y = y + (bottom - y - m[1]) / 2; else if (flags & 8) y = bottom - m[1];
    }
    this.colour();
    this.g.move_to(x, y + this.size * 0.8);
    this.g.show_text(s);
    this.set('x', x + m[0]);
    return 0;
  };
  Host.prototype.gfx_drawstr = function (fx, s, flags, right, bottom) { return this.text(utf8(fx.str(s)), flags, right, bottom); };
  Host.prototype.gfx_drawchar = function (fx, c) { return this.text(String.fromCharCode(c)); };
  Host.prototype.gfx_drawnumber = function (fx, n, digits) { return this.text(Number(n).toFixed(Math.max(0, Math.trunc(num(digits, 0))))); };
  Host.prototype.gfx_printf = function (fx, fmt) {
    var args = Array.prototype.slice.call(arguments, 2);
    var s = fx.str(fmt).replace(/%(-?\d*)(?:\.(\d+))?([dfsxXc%])/g, function (m, w, p, k) {
      if (k === '%') return '%';
      var a = args.shift();
      if (k === 's') return fx.str(a);
      if (k === 'c') return String.fromCharCode(a);
      if (k === 'x' || k === 'X') { var h = Math.trunc(a).toString(16); return k === 'X' ? h.toUpperCase() : h; }
      return k === 'd' ? String(Math.trunc(a)) : Number(a).toFixed(p === undefined ? 6 : +p);
    });
    return this.text(utf8(s));
  };

  // ------------------------------------------------------------- input ---
  // gfx_getchar(65536) asks about the window: 1 it has focus, 2 it is shown,
  // 4 the mouse is in it. With no argument it is the next key typed, which the
  // window's [key] hands in (Host.key); with a key it asks whether it is held.
  Host.prototype.gfx_getchar = function (fx, c) {
    if (c === 65536) return 1 | 2 | (this.mouseIn ? 4 : 0);
    if (c) return 0;
    return this.keys && this.keys.length ? this.keys.shift() : 0;
  };
  // Max's key codes as REAPER's gfx_getchar gives them: the arrows and the
  // editing keys are four-letter codes there.
  var KEYS = { 28: 0x6C656674, 29: 0x72676874, 30: 0x7570, 31: 0x646F776E, 127: 0x64656C, 8: 8, 9: 9, 13: 13, 27: 27,
               '-9': 0x6C656674, '-10': 0x72676874, '-11': 0x7570, '-12': 0x646F776E };
  Host.prototype.key = function (code) {
    (this.keys = this.keys || []).push(KEYS[code] !== undefined ? KEYS[code] : code);
    if (this.keys.length > 32) this.keys.shift();
  };
  Host.prototype.gfx_showmenu = function (fx, s) {
    if (this.choice) { var k = this.choice; this.choice = 0; return k; }
    this.menu = { text: utf8(fx.str(s)), x: this.v('x'), y: this.v('y') };
    return 0;
  };
  Host.prototype.gfx_setcursor = function () { return 0; };
  Host.prototype.gfx_getdropfile = function () { return 0; };
  Host.prototype.gfx_update = function () { return 0; };

  // A menu as gfx_showmenu writes it: items split by |, '#' greyed, '!'
  // ticked, '>' opens a submenu, '<' closes one. Numbered as REAPER numbers
  // them: every item that is not a submenu's title, in order, from 1.
  function parseMenu(text) {
    var out = [], depth = 0, n = 0;
    String(text).split('|').forEach(function (raw) {
      var t = raw, grey = false, tick = false, opens = false, closes = false;
      for (;;) {
        var c = t.charAt(0);
        if (c === '#') { grey = true; t = t.slice(1); } else if (c === '!') { tick = true; t = t.slice(1); }
        else if (c === '>') { opens = true; t = t.slice(1); } else if (c === '<') { closes = true; t = t.slice(1); } else break;
      }
      if (opens) { out.push({ label: t, title: true, depth: depth }); depth++; return; }
      if (t === '' && !closes) { out.push({ rule: true, depth: depth }); return; }
      n++;
      out.push({ label: t, index: n, grey: grey, tick: tick, depth: depth });
      if (closes) depth = Math.max(0, depth - 1);
    });
    return out;
  }

  // gfx_clear's colour (r + g * 256 + b * 65536) as Live draws it.
  function clearColour(c) { return toned((c & 255) / 255, ((c >> 8) & 255) / 255, ((c >> 16) & 255) / 255); }

  // The menu gfx_showmenu asked for, drawn the same in every device.
  var ITEM_H = 20;
  function drawMenu(g, r, items, hover) {
    var P = Palette.C, rgb = Palette.rgb, c;
    c = rgb(P.popup); g.set_source_rgba(c[0], c[1], c[2], 1); g.rectangle(r[0], r[1], r[2], r[3]); g.fill();
    c = rgb(P.edge); g.set_source_rgba(c[0], c[1], c[2], 1); g.set_line_width(1); g.rectangle(r[0] + 0.5, r[1] + 0.5, r[2] - 1, r[3] - 1); g.stroke();
    items.forEach(function (it, i) {
      var y = r[1] + 4 + i * ITEM_H;
      if (it.rule) { c = rgb(P.rule); g.set_source_rgba(c[0], c[1], c[2], 1); g.rectangle(r[0] + 6, y + ITEM_H / 2, r[2] - 12, 1); g.fill(); return; }
      var on = i === hover && it.index && !it.grey;
      if (on) { c = rgb(P.accent); g.set_source_rgba(c[0], c[1], c[2], 1); g.rectangle(r[0] + 2, y, r[2] - 4, ITEM_H); g.fill(); }
      c = rgb(on ? P.ink : it.grey || it.title ? P.dim : P.text);
      g.set_source_rgba(c[0], c[1], c[2], 1);
      g.move_to(r[0] + 22 + it.depth * 12, y + 14);
      g.show_text(it.label);
      if (it.tick) { g.move_to(r[0] + 7 + it.depth * 12, y + 14); g.show_text('✓'); }
    });
  }

  return { Host: Host, parseMenu: parseMenu, clearColour: clearColour, drawMenu: drawMenu, ITEM_H: ITEM_H };
})();


/* ---- kit/live.js ---- */
/* The Live set, as the family's devices need it: the song's tempo, meter and
 * scale, the notes of the clip being edited, somewhere to put new notes, and
 * a way to hear notes before they are used.
 *
 * Everything goes through the Live Object Model (LiveAPI). Times are beats,
 * which in Live are quarter notes - the unit every family engine already
 * speaks - so nothing is converted but the field names.
 */
var Live = (function () {
  'use strict';
  function api(path) { return new LiveAPI(null, path); }
  function one(a, prop) { var v = a.get(prop); return Array.isArray(v) ? v[0] : v; }
  function exists(a) { return a && Number(a.id) !== 0; }
  function json(v) {
    if (typeof v === 'string') return JSON.parse(v);
    if (Array.isArray(v) && typeof v[0] === 'string' && v.length === 1) return JSON.parse(v[0]);
    return v;
  }

  // Live 12's scale names, as ScaleView numbers its scales (1-16). A scale
  // ScaleView has no name for is left out: the device keeps its own key.
  var SCALE = {
    'Major': 1, 'Minor': 2, 'Harmonic Minor': 3, 'Dorian': 5, 'Phrygian': 6, 'Lydian': 7,
    'Mixolydian': 8, 'Major Pentatonic': 10, 'Minor Pentatonic': 11, 'Minor Blues': 13,
    'Whole Tone': 14, 'Whole-half Dim.': 15, 'Half-whole Dim.': 16
  };
  // ScaleView's eighteen roots, and the spelling a key on each pitch class
  // takes: flats for the major side, sharps where a minor key has them.
  var ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Cb'];
  var MAJOR_SIDE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  var MINOR_SIDE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  var MINORISH = { 2: 1, 3: 1, 5: 1, 6: 1, 11: 1, 13: 1 };
  var SCALE_NAMES = ['Major', 'Minor (Natural)', 'Harmonic Minor', 'Ionian', 'Dorian', 'Phrygian', 'Lydian',
                     'Mixolydian', 'Aeolian', 'Major Pentatonic', 'Minor Pentatonic', 'Major Blues', 'Minor Blues',
                     'Whole Tone', 'Diminished Whole-Half', 'Diminished Half-Whole'];

  // Live's scale (a root pitch class and a name) as the family's key, or
  // null for a scale ScaleView does not have.
  function keyOf(pc, name) {
    var sc = SCALE[String(name)];
    if (!sc) return null;
    return { root: ROOTS.indexOf((MINORISH[sc] ? MINOR_SIDE : MAJOR_SIDE)[((+pc % 12) + 12) % 12]) + 1, scale: sc };
  }

  function song() {
    var s = api('live_set');
    var out = { tempo: +one(s, 'tempo') || 120, num: +one(s, 'signature_numerator') || 4,
                den: +one(s, 'signature_denominator') || 4, playing: !!+one(s, 'is_playing'),
                position: +one(s, 'current_song_time') || 0, key: null };
    var mode = s.get('scale_mode');
    if (mode !== undefined && mode !== null) {
      var name = String(one(s, 'scale_name')), pc = +one(s, 'root_note');
      out.liveScale = { on: !!+(Array.isArray(mode) ? mode[0] : mode), name: name, root: pc };
      out.key = keyOf(pc, name);
    }
    return out;
  }

  function detailClip() {
    var c = api('live_set view detail_clip');
    if (!exists(c) || !+one(c, 'is_midi_clip')) return null;
    return c;
  }

  // The clip being edited: its selected notes if any are selected, else every
  // note in its loop. Starts are from the start of what was taken.
  function clipNotes() {
    var c = detailClip();
    if (!c) return null;
    var from = +one(c, 'loop_start') || 0, to = +one(c, 'loop_end') || 0;
    var raw = null, selected = false;
    try { raw = json(c.call('get_selected_notes_extended')); selected = raw && raw.notes && raw.notes.length > 0; } catch (e) { raw = null; }
    if (!selected) raw = json(c.call('get_notes_extended', 0, 128, from, Math.max(0, to - from)));
    var notes = ((raw && raw.notes) || []).filter(function (n) { return !n.mute; }).map(function (n) {
      return { start: n.start_time, len: n.duration, pitch: n.pitch, vel: Math.round(n.velocity) };
    });
    var first = selected && notes.length ? Math.min.apply(null, notes.map(function (n) { return n.start; })) : from;
    var beats = to - from;
    if (selected) {
      var bar = 4, end = 0;
      notes.forEach(function (n) { end = Math.max(end, n.start + n.len); });
      first = Math.floor(first / bar) * bar;
      beats = Math.ceil((end - first) / bar) * bar;
    }
    notes.forEach(function (n) { n.start -= first; });
    notes.sort(function (a, b) { return a.start - b.start || a.pitch - b.pitch; });
    return { notes: notes, beats: beats, name: String(one(c, 'name') || ''), selected: selected, drums: drumTrack() };
  }

  // A track whose instrument is a Drum Rack plays drums: its note numbers name
  // drums, not pitches, and the engines treat them that way.
  function drumTrack() {
    try {
      var track = api('this_device canonical_parent'), n = track.getcount('devices');
      for (var i = 0; i < n; i++) if (+one(api(track.unquotedpath + ' devices ' + i), 'can_have_drum_pads')) return true;
    } catch (e) { /* not known: not drums */ }
    return false;
  }

  function liveNotes(notes) {
    return { notes: notes.map(function (n) {
      return { pitch: Math.max(0, Math.min(127, Math.round(n.pitch))), start_time: Math.max(0, n.start),
               duration: Math.max(1 / 128, n.len), velocity: Math.max(1, Math.min(127, Math.round(n.vel || 100))), mute: 0 };
    }) };
  }

  function undoable(fn) {
    var s = api('live_set');
    try { s.call('begin_undo_step'); } catch (e) { /* Live before 11.1 */ }
    try { return fn(); } finally { try { s.call('end_undo_step'); } catch (e2) { /* as above */ } }
  }

  function show(clip) {
    try { api('live_set view').set('detail_clip', 'id', Number(clip.id)); } catch (e) { /* the clip is made either way */ }
  }

  function selectedScene() {
    var scene = api('live_set view selected_scene'), n = api('live_set').getcount('scenes');
    for (var i = 0; i < n; i++) if (Number(api('live_set scenes ' + i).id) === Number(scene.id)) return i;
    return 0;
  }
  function thisTrack() {
    var track = api('this_device canonical_parent');
    if (!exists(track) || !+one(track, 'has_midi_input')) return null;
    return track;
  }
  // Where this device's track is in the set, for putting new tracks beside it.
  function trackIndex(track) {
    var n = api('live_set').getcount('tracks');
    for (var i = 0; i < n; i++) if (Number(api('live_set tracks ' + i).id) === Number(track.id)) return i;
    return n - 1;
  }
  function clipInSlot(slot, notes, beats, name) {
    slot.call('create_clip', Math.max(1, beats));
    var clip = api(slot.unquotedpath + ' clip');
    if (name) clip.set('name', name);
    clip.call('add_new_notes', liveNotes(notes));
    return clip;
  }
  function freeSlot(track, from) {
    var n = track.getcount('clip_slots');
    for (var k = 0; k < n; k++) {
      var at = (from + k) % n, slot = api(track.unquotedpath + ' clip_slots ' + at);
      if (!+one(slot, 'has_clip')) return { slot: slot, at: at };
    }
    return null;
  }
  function arrangementClipOn(track, notes, beats, name, at) {
    var before = track.getcount('arrangement_clips');
    try { track.call('create_midi_clip', at, Math.max(1, beats)); } catch (e) { /* checked below */ }
    var count = track.getcount('arrangement_clips');
    if (!(count > before)) return false;
    for (var i = 0; i < count; i++) {
      var clip = api(track.unquotedpath + ' arrangement_clips ' + i);
      if (Math.abs((+one(clip, 'start_time') || 0) - at) < 1e-6) {
        if (name) clip.set('name', name);
        clip.call('add_new_notes', liveNotes(notes));
        return true;
      }
    }
    return false;
  }

  // New notes, as a new clip in the first free slot on this device's track,
  // from the selected scene down. `more` are further parts ({name, notes}),
  // each on a new MIDI track after this one, in the same scene. Returns what
  // happened, for the status line.
  function newClip(notes, beats, name, more) {
    var track = thisTrack();
    if (!track) return { ok: false, message: 'This device needs to be on a MIDI track.' };
    var free = freeSlot(track, selectedScene());
    if (!free) return { ok: false, message: 'Every clip slot on this track is full. Add a scene, then try again.' };
    return undoable(function () {
      var clip = clipInSlot(free.slot, notes, beats, name);
      var made = newTracks(track, more, function (t) {
        clipInSlot(api(t.unquotedpath + ' clip_slots ' + free.at), this.notes, beats, this.name);
      });
      show(clip);
      return { ok: true, message: 'Added a clip in scene ' + (free.at + 1) + (made ? ', and ' + made + ' on new tracks beside it.' : '.') };
    });
  }

  // New notes on a new MIDI track beside this one, in the selected scene:
  // a suggestion goes with the music it was made for, not over it.
  function newTrackClip(notes, beats, name, more) {
    var track = thisTrack();
    if (!track) return { ok: false, message: 'This device needs to be on a MIDI track.' };
    var scene = selectedScene();
    return undoable(function () {
      var parts = [{ name: name, notes: notes }].concat(more || []);
      newTracks(track, parts, function (t) { show(clipInSlot(api(t.unquotedpath + ' clip_slots ' + scene), this.notes, beats, this.name)); });
      return { ok: true, message: parts.length === 1 ? 'Added a track beside this one, with the clip in scene ' + (scene + 1) + '.'
                                                     : 'Added ' + parts.length + ' tracks beside this one, with the clips in scene ' + (scene + 1) + '.' };
    });
  }

  // Each further part on a new MIDI track, in order, after this one.
  function newTracks(track, more, put) {
    if (!more || !more.length) return '';
    var at = trackIndex(track), song = api('live_set');
    more.forEach(function (part, k) {
      song.call('create_midi_track', at + 1 + k);
      var t = api('live_set tracks ' + (at + 1 + k));
      t.set('name', part.name);
      put.call(part, t);
    });
    return more.length === 1 ? 'one more part' : more.length + ' more parts';
  }

  // New notes in place of the notes of the clip being edited, from its loop start.
  function replaceInClip(notes, beats) {
    var c = detailClip();
    if (!c) return { ok: false, message: 'No MIDI clip is open. Open one in Detail View, then try again.' };
    var from = +one(c, 'loop_start') || 0;
    return undoable(function () {
      var span = Math.max(beats, (+one(c, 'loop_end') || 0) - from);
      c.call('remove_notes_extended', 0, 128, from, span);
      c.call('add_new_notes', liveNotes(notes.map(function (n) {
        return { start: n.start + from, len: n.len, pitch: n.pitch, vel: n.vel };
      })));
      if ((+one(c, 'loop_end') || 0) < from + beats) c.set('loop_end', from + beats);
      return { ok: true, message: 'Replaced the notes in “' + (String(one(c, 'name') || '') || 'the clip') + '”.' };
    });
  }

  // New notes in the Arrangement at the insert marker, on this device's track
  // (Track.create_midi_clip, Live 12.2 and later); further parts as above.
  function arrangementClip(notes, beats, name, more) {
    var track = thisTrack();
    if (!track) return { ok: false, message: 'This device needs to be on a MIDI track.' };
    var at = +one(api('live_set'), 'current_song_time') || 0;
    return undoable(function () {
      if (!arrangementClipOn(track, notes, beats, name, at)) {
        return { ok: false, message: 'This version of Live can\u2019t add Arrangement clips from a device. Choose New Clip instead.' };
      }
      var made = newTracks(track, more, function (t) { arrangementClipOn(t, this.notes, beats, this.name, at); });
      return { ok: true, message: 'Added a clip to the Arrangement at beat ' + (Math.round(at * 100) / 100 + 1) +
               (made ? ', and ' + made + ' on new tracks beside it.' : '.') };
    });
  }

  // ------------------------------------------------------------ player ---
  // Notes heard through this device's MIDI out: the instrument after it on
  // the track plays them. A Task ticks every few milliseconds and sends what
  // is due; nothing waits on the transport.
  function Player(send) {
    this.send = send; this.events = []; this.pos = 0; this.t0 = 0; this.task = null; this.sounding = {};
    this.onEnd = null;
  }
  Player.prototype.play = function (notes, tempo, onEnd) {
    this.stop();
    var ms = 60000 / (tempo || 120), ev = [];
    notes.forEach(function (n) {
      ev.push({ t: n.start * ms, on: true, pitch: n.pitch, vel: n.vel || 100 });
      ev.push({ t: (n.start + n.len) * ms - 1, on: false, pitch: n.pitch });
    });
    ev.sort(function (a, b) { return a.t - b.t || (a.on === b.on ? 0 : a.on ? 1 : -1); });
    this.events = ev; this.pos = 0; this.t0 = Date.now(); this.onEnd = onEnd || null;
    var self = this;
    this.task = new Task(function () { self.tick(); }, this);
    this.task.interval = 4;
    this.task.repeat();
    this.tick();
  };
  Player.prototype.tick = function () {
    var now = Date.now() - this.t0;
    while (this.pos < this.events.length && this.events[this.pos].t <= now) {
      var e = this.events[this.pos++];
      if (e.on) { this.sounding[e.pitch] = (this.sounding[e.pitch] || 0) + 1; this.send([0x90, e.pitch, Math.max(1, Math.min(127, Math.round(e.vel)))]); }
      else if (this.sounding[e.pitch]) { this.sounding[e.pitch]--; this.send([0x80, e.pitch, 0]); }
    }
    if (this.pos >= this.events.length) {
      var end = this.onEnd;
      this.stop();
      if (end) end();
    }
  };
  Player.prototype.playing = function () { return !!this.task; };
  Player.prototype.stop = function () {
    if (this.task) { this.task.cancel(); this.task.freepeer && this.task.freepeer(); this.task = null; }
    var self = this;
    Object.keys(this.sounding).forEach(function (p) {
      for (var i = 0; i < self.sounding[p]; i++) self.send([0x80, +p, 0]);
    });
    this.sounding = {};
    this.onEnd = null;
  };

  return { song: song, clipNotes: clipNotes, newClip: newClip, newTrackClip: newTrackClip, replaceInClip: replaceInClip,
           arrangementClip: arrangementClip, drumTrack: drumTrack, Player: Player, ROOTS: ROOTS, SCALE_NAMES: SCALE_NAMES,
           keyOf: keyOf };
})();


/* ---- actions.js ---- */
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


/* ---- kit/jsfx_device.js ---- */
/* A family JSFX as a Max for Live MIDI effect: the .jsfx itself, unchanged,
 * on Middaw's EEL2 runtime, with its own @gfx window drawn in this [v8ui].
 *
 * The [v8ui] sits in the device's window subpatcher, which the device strip's
 * Show Window button opens. Its code runs whether the window is open or not.
 *
 * A Task ticks every few milliseconds: the MIDI that arrived since the last
 * tick goes in, a block as long as the time that passed is run, and what the
 * plug-in sends comes straight out. Live's tempo, meter, transport and song
 * position are what REAPER would give it.
 *
 * Expects, before it: Gfx, Live, MiddawJSFX, and DEVICE = { main, files,
 * actions? }. A device's own buttons (Load Clip, Insert the Take) are in
 * ACTIONS, defined in the repository's ableton/actions.js, which shares this
 * file's global scope: its own functions must not reuse a name defined here
 * (send, say, load, tick...), or this file's takes its place.
 * Inlet 0: bang (Live is ready), MIDI bytes, restore, and the strip's
 * commands. Outlets: 0 MIDI bytes, 1 the saved state to [pattr], 2 the
 * strip's status line.
 *
 * DEVICE.audio: the sound is gen~'s (ableton/kit/jsfx2gen.js), not this
 * file's. The plug-in here runs @init, @slider and @gfx only, for its window;
 * what its sliders say goes to gen~ (outlet 3, "sliderN value"), with Live's
 * tempo and transport, and MIDI goes to gen~ through the buffer~ the patcher
 * names in "mqname" (three values a message, the count at 0).
 */
inlets = 1;
outlets = DEVICE.audio ? (DEVICE.drops ? 5 : 4) : 3;
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var SR = 48000;
var ACTIONS = typeof ACTIONS === 'undefined' ? {} : ACTIONS;

// The bundle keeps files as bytes; the runtime reads a .jsfx as text.
function source(name) {
  var t = DEVICE.files[name];
  if (t === undefined) return null;
  try { return decodeURIComponent(escape(t)); } catch (e) { return t; }
}
var fx = new MiddawJSFX.JSFX(source(DEVICE.main), { gfx: true, sampleRate: SR, readImport: source });
fx.init(SR);

var D = {
  ready: false, pending: null, task: null, last: 0, beat: 0, pos: 0,
  midiIn: [], running: [], status: '', host: new Gfx.Host(mgraphics),
  mouse: { x: -1, y: -1, cap: 0, wheel: 0 }, release: false, frameSaw: true,
  menu: null, menuSnap: null, menuMouse: null, frames: 0, song: { tempo: 120, num: 4, den: 4, playing: false }
};

function say(msg) { D.status = msg || ''; outlet(2, 'set', D.status); }
function send(data) { for (var i = 0; i < data.length; i++) outlet(0, data[i]); }

// ---------------------------------------------------------------- MIDI --
// [midiin] gives a byte at a time; a message is whole once its data are in.
function msg_int(b) {
  b = b & 255;
  if (b >= 0xF8) return;                      // real-time: not passed to the plug-in
  if (b & 0x80) { D.running = [b]; return; }
  if (!D.running.length) return;
  D.running.push(b);
  var st = D.running[0] & 0xF0, need = (st === 0xC0 || st === 0xD0) ? 2 : 3;
  if (D.running[0] >= 0xF0) { D.running = []; return; }  // system messages are not passed on
  if (D.running.length === need) {
    D.midiIn.push(need === 2 ? [D.running[0], D.running[1], 0] : D.running.slice());
    D.running = [D.running[0]];
  }
}

// --------------------------------------------------------------- clock --
function readSong() {
  try {
    var s = Live.song();
    D.song = { tempo: s.tempo, num: s.num, den: s.den, playing: s.playing, position: s.position };
  } catch (e) { /* outside Live */ }
}
// ------------------------------------------------------------ gen~ ----
var GEN = { sent: {}, mq: null, written: 0, CAP: 256, every: 0 };
function mqname(name) {
  try { GEN.mq = new Buffer(String(name)); } catch (e) { GEN.mq = null; }
}
function toGen() {
  fx.file.sliders.forEach(function (sl) {
    var v = fx.sliderByIndex(sl.index);
    if (GEN.sent[sl.index] !== v) { GEN.sent[sl.index] = v; outlet(3, 'slider' + sl.index, v); }
  });
  (DEVICE.fromWindow || []).forEach(function (n) {
    var v = fx.getVar(n);
    if (GEN.sent['w_' + n] !== v) { GEN.sent['w_' + n] = v; outlet(3, 'w_' + n, v); }
  });
  if ((GEN.every++ % 12) === 0) {
    outlet(3, 'tempo', D.song.tempo); outlet(3, 'play_state', D.song.playing ? 1 : 0);
    outlet(3, 'beat_position', D.song.playing ? D.song.position : D.beat);
    outlet(3, 'ts_num', D.song.num); outlet(3, 'ts_denom', D.song.den);
  }
}
function midiToGen(data) {
  if (!GEN.mq) return;
  var at = 1 + 3 * (GEN.written % GEN.CAP);
  GEN.mq.poke(1, at, [data[0], data[1], data[2]]);
  GEN.written++;
  GEN.mq.poke(1, 0, GEN.written);
}

function tick() {
  if (DEVICE.audio) {
    if ((D.frames++ & 63) === 0) readSong();
    if (D.midiIn.length) { D.midiIn.forEach(midiToGen); D.midiIn = []; }
    if ((D.frames % 5) === 0) toGen();
    if (ACTIONS.tick) ACTIONS.tick(fx);
    if ((D.frames & 511) === 0) save();
    return;
  }
  var now = Date.now();
  var ms = Math.min(100, Math.max(0, now - D.last));
  D.last = now;
  if ((D.frames++ & 63) === 0 || D.song.playing) readSong();
  var n = Math.max(1, Math.round(ms * SR / 1000));
  var spb = SR * 60 / D.song.tempo;
  fx.setTime({ tempo: D.song.tempo, num: D.song.num, den: D.song.den, playState: D.song.playing ? 1 : 0,
               beat: D.song.playing ? D.song.position : D.beat, seconds: (D.song.playing ? D.song.position : D.beat) * 60 / D.song.tempo });
  if (!D.song.playing) D.beat += n / spb;
  var midi = D.midiIn.map(function (data) { return { offset: 0, data: data }; });
  D.midiIn = [];
  var out = fx.process(n, null, null, midi);
  for (var i = 0; i < out.length; i++) send(out[i].data);
  if (ACTIONS.tick) ACTIONS.tick(fx);
  if ((D.frames & 511) === 0) save();
}
function start() {
  if (D.task) return;
  D.last = Date.now();
  D.task = new Task(tick, this);
  D.task.interval = 4;
  D.task.repeat();
  var draw = new Task(function () { mgraphics.redraw(); }, this);
  draw.interval = 33;
  draw.repeat();
  D.drawTask = draw;
}

// ------------------------------------------------------------ messages --
function bang() {
  D.ready = true;
  readSong();
  if (D.pending) { load(D.pending); D.pending = null; }
  start();
}
function restore(text) {
  var st = null;
  try { st = JSON.parse(String(text)); } catch (e) { return; }
  if (!D.ready) { D.pending = st; return; }
  load(st);
}
function load(st) {
  if (st && st.v === 1 && st.fx) { fx.deserialize(st.fx); fx.runSection('slider'); lastSaved = JSON.stringify(st); GEN.sent = {}; }
}
// The plug-in's @serialize, kept with the Live set: written when it changes,
// so an untouched device does not mark the set as changed.
var lastSaved = '';
function save() {
  var s = JSON.stringify({ v: 1, fx: fx.serialize() });
  if (s === lastSaved) return;
  lastSaved = s;
  outlet(1, 'set', s);
}
// The strip's buttons: "action <name>".
function action(name) {
  var a = ACTIONS[name];
  if (!a) return;
  try { var msg = a(fx, Live); if (msg) say(msg); } catch (e) { say(String(e.message || e)); }
  save();
  mgraphics.redraw();
}
// Keys typed while the window has focus, from its [key].
function key(code) { D.host.key(code); mgraphics.redraw(); }
function anything() {
  var a = ACTIONS[messagename];
  if (a) action(messagename);
}

// --------------------------------------------------------------- paint --
function size() {
  var r = (typeof box !== 'undefined' && box.rect) ? box.rect : [0, 0].concat(fx.file.gfxSize || [800, 600]);
  return [r[2] - r[0], r[3] - r[1]];
}
function paint() {
  var g = mgraphics, sz = size(), h = D.host;
  var clear = fx.getVar('gfx_clear');
  var c = clear >= 0 ? clear : 0;           // REAPER keeps the last frame for -1; a [v8ui] cannot
  var k = Gfx.clearColour(c);
  g.set_source_rgba(k[0], k[1], k[2], 1);
  g.rectangle(0, 0, sz[0], sz[1]);
  g.fill();
  if (D.menu) { frame(g, sz, D.menuMouse); drawMenu(g, sz); return; }
  var snap = new Float64Array(fx.v);
  var mouse = { x: D.mouse.x, y: D.mouse.y, cap: D.mouse.cap, wheel: D.mouse.wheel };
  D.mouse.wheel = 0;
  frame(g, sz, mouse);
  D.frameSaw = true;
  if (D.release) { D.release = false; D.mouse.cap = 0; }
  if (h.menu) { D.menu = { items: Gfx.parseMenu(h.menu.text), x: mouse.x, y: mouse.y, hover: -1 }; D.menuSnap = snap; D.menuMouse = mouse; }
}
function frame(g, sz, mouse) {
  D.host.begin(g, fx);
  D.host.mouseIn = mouse.x >= 0 && mouse.y >= 0 && mouse.x < sz[0] && mouse.y < sz[1];
  try { fx.runGfx(D.host, sz[0], sz[1], mouse); } catch (e) { say('The window stopped: ' + (e.message || e)); }
}

// The menu gfx_showmenu asked for, over the window.
var ITEM_H = Gfx.ITEM_H;
function menuRect(sz) {
  var m = D.menu, w = 40;
  mgraphics.select_font_face('Arial', 'normal', 'normal');
  mgraphics.set_font_size(12);
  m.items.forEach(function (it) { if (it.label) w = Math.max(w, mgraphics.text_measure(it.label)[0] + 40 + it.depth * 12); });
  var h = m.items.length * ITEM_H + 8;
  var x = Math.min(m.x, sz[0] - w - 2), y = Math.min(m.y, sz[1] - h - 2);
  return [Math.max(0, x), Math.max(0, y), w, h];
}
function drawMenu(g, sz) {
  g.select_font_face('Arial', 'normal', 'normal'); g.set_font_size(12);
  Gfx.drawMenu(g, menuRect(sz), D.menu.items, D.menu.hover);
}
function menuAt(x, y) {
  var r = menuRect(size());
  if (x < r[0] || x >= r[0] + r[2] || y < r[1] + 4 || y >= r[1] + r[3] - 4) return -1;
  return Math.floor((y - r[1] - 4) / ITEM_H);
}
function chooseMenu(i) {
  var m = D.menu, it = i >= 0 ? m.items[i] : null;
  if (it && (!it.index || it.grey)) return;          // a title, a rule or a greyed item: the menu stays
  D.menu = null;
  // The frame that asked runs again from where it started, and gets the answer.
  fx.v.set(D.menuSnap);
  D.host.choice = it ? it.index : 0;
  if (!it) { D.host.choice = 0; D.host.cancelled = true; }
  var g = mgraphics, sz = size();
  if (it) frame(g, sz, D.menuMouse);
  D.host.choice = 0;
  D.mouse.cap = 0;
  save();
  mgraphics.redraw();
}

// --------------------------------------------------------------- mouse --
// REAPER's mouse_cap: 1 left, 2 right, 4 Command, 8 Shift, 16 Option, 32 Control.
function caps(but, cmd, shift, opt, ctrl) {
  return (ctrl ? 2 : 1) | (cmd ? 4 : 0) | (shift ? 8 : 0) | (opt ? 16 : 0);
}
function onclick(x, y, but, cmd, shift, capslock, opt, ctrl) {
  if (D.menu) { chooseMenu(menuAt(x, y)); return; }
  D.mouse.x = x; D.mouse.y = y; D.mouse.cap = caps(but, cmd, shift, opt, ctrl);
  D.frameSaw = false;
  mgraphics.redraw();
}
function ondrag(x, y, but) {
  if (D.menu) return;
  D.mouse.x = x; D.mouse.y = y;
  if (!but) {
    // A click shorter than a frame is still seen down for one frame.
    if (D.frameSaw) D.mouse.cap = 0; else D.release = true;
    save();
  }
  mgraphics.redraw();
}
function onidle(x, y) {
  if (D.menu) { var i = menuAt(x, y); if (i !== D.menu.hover) { D.menu.hover = i; mgraphics.redraw(); } return; }
  D.mouse.x = x; D.mouse.y = y;
}
function onidleout() { if (!D.menu) { D.mouse.x = -1; D.mouse.y = -1; } }
function onwheel(x, y, dx, dy) { D.mouse.wheel += Math.round(dy * 120); mgraphics.redraw(); }

