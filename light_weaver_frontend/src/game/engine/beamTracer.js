//
// Simple beam tracer utility reserved for future engine expansions.
// Currently the simulation is implemented in the hook for instant UI sync,
// but public functions are provided here for potential reuse.
//

// PUBLIC_INTERFACE
export function reflectDirection(orientation, dir) {
  /** Reflect a cardinal direction on a mirror orientation. */
  if (orientation === 'slash') {
    return { up: 'right', right: 'up', down: 'left', left: 'down' }[dir];
  }
  return { up: 'left', left: 'up', down: 'right', right: 'down' }[dir];
}

// PUBLIC_INTERFACE
export function isInside(r, c, rows, cols) {
  /** True if cell is within the grid bounds. */
  return r >= 0 && c >= 0 && r < rows && c < cols;
}
