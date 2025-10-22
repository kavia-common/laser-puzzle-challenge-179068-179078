const rows = 8;
const cols = 8;

// Build empty grid
function makeEmpty() {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: 'empty' }))
  );
}

// Seed mirrors for the MVP
const initialGrid = makeEmpty();
initialGrid[3][2] = { type: 'mirror', orientation: 'slash' };
initialGrid[4][5] = { type: 'mirror', orientation: 'backslash' };

// Targets
const targets = [
  { r: 2, c: 6, lit: false },
];

// Lasers
const lasers = [
  { r: 6, c: 1, dir: 'up', color: '#fb923c' }, // orange beam
];

// Static items (reserved for walls/emitters if needed)
const staticItems = [];

const level1 = {
  name: 'First Reflection',
  rows,
  cols,
  initialGrid,
  targets,
  lasers,
  staticItems,
};

export default level1;
