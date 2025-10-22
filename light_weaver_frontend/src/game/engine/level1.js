const rows = 8;
const cols = 8;

// Build empty grid
function makeEmpty() {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: 'empty' }))
  );
}

// Seed mirrors for the MVP (slightly tuned for a clean 3-4 move solve)
const initialGrid = makeEmpty();
// A gentle path: up from (6,1)-> reflect right -> up -> right into target
initialGrid[5][1] = { type: 'mirror', orientation: 'backslash' }; // turns up->right
initialGrid[5][4] = { type: 'mirror', orientation: 'slash' };     // turns right->up
initialGrid[2][4] = { type: 'mirror', orientation: 'backslash' }; // turns up->right near target

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
