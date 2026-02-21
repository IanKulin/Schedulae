// UI timing constants (milliseconds)
const AUTOSAVE_DEBOUNCE_MS    = 500;  // debounce delay for grid slot auto-save
const SAVE_CONFIRM_DISPLAY_MS = 1500; // how long "Saved ✓" stays on save button
const FILE_STATUS_DISPLAY_MS  = 3000; // how long file-status messages auto-dismiss

// Grid layout constants
const GRID_TIMESLOT_COL_WIDTH = '180px'; // width of the first (time-slot) column
const GRID_TEACHER_COL_WIDTH  = '200px'; // width of each teacher column

// CommonJS export for Node test runner compatibility
if (typeof module !== 'undefined') {
  module.exports = {
    AUTOSAVE_DEBOUNCE_MS,
    SAVE_CONFIRM_DISPLAY_MS,
    FILE_STATUS_DISPLAY_MS,
    GRID_TIMESLOT_COL_WIDTH,
    GRID_TEACHER_COL_WIDTH,
  };
}
