//
// Beam tracing utilities for Light Weaver.
// Deterministic, allocation-light, and suitable for running in rAF loops.
//
// Notes on performance and determinism:
// - Avoids array allocations in inner loops; uses small reusable objects.
// - Uses simple integer grid stepping and fixed max step guard.
// - Pure functions: no mutation of input structures.
// - Direction encoded as 'up'|'down'|'left'|'right'.
//

/**
 * Cardinal direction to vector delta.
 * Using frozen objects for safety without re-allocation.
 */
const DIR_TO_VEC = Object.freeze({
  up:    Object.freeze({ dr: -1, dc:  0 }),
  down:  Object.freeze({ dr:  1, dc:  0 }),
  left:  Object.freeze({ dr:  0, dc: -1 }),
  right: Object.freeze({ dr:  0, dc:  1 }),
});

// PUBLIC_INTERFACE
export function reflectDirection(orientation, dir) {
  /** Reflect a cardinal direction on a mirror orientation. */
  if (orientation === 'slash') {
    // '/' mirror
    // up->right, right->up, down->left, left->down
    switch (dir) {
      case 'up': return 'right';
      case 'right': return 'up';
      case 'down': return 'left';
      case 'left': return 'down';
      default: return dir;
    }
  }
  // '\' mirror
  // up->left, left->up, down->right, right->down
  switch (dir) {
    case 'up': return 'left';
    case 'left': return 'up';
    case 'down': return 'right';
    case 'right': return 'down';
    default: return dir;
  }
}

// PUBLIC_INTERFACE
export function isInside(r, c, rows, cols) {
  /** True if cell is within the grid bounds. */
  return r >= 0 && c >= 0 && r < rows && c < cols;
}

/**
 * INTERNAL: Step a single laser until exit or stop.
 * This function pushes line segments into the provided 'out' array.
 * It mutates 'workTargetMap' to mark lit targets (boolean array keyed by r*cols+c).
 *
 * @param {Object} laser - { r:number, c:number, dir:'up'|'down'|'left'|'right', color?:string }
 * @param {Array<Array<Object>>} grid - 2D tile grid ({ type: 'empty'|'mirror'|'block', orientation? })
 * @param {number} rows
 * @param {number} cols
 * @param {boolean[]} workTargetMap - length rows*cols; true indicates target cell. Will not be mutated except for reading.
 * @param {boolean[]} workLitMap - length rows*cols; will be set to true when lit.
 * @param {Array} out - destination for segments; segment: { x1,y1,x2,y2,color }
 * @param {number} maxSteps - safety cap on steps
 */
function stepLaser(laser, grid, rows, cols, workTargetMap, workLitMap, out, maxSteps) {
  let r = laser.r | 0;
  let c = laser.c | 0;
  let dir = laser.dir;
  const color = laser.color || '#fb923c';

  let guard = 0;
  const total = rows * cols;
  const seg = { x1: 0, y1: 0, x2: 0, y2: 0, color };

  while (guard++ < maxSteps) {
    const v = DIR_TO_VEC[dir];
    const nr = r + v.dr;
    const nc = c + v.dc;

    // segment in grid units (center-to-center)
    seg.x1 = c; seg.y1 = r;
    seg.x2 = nc; seg.y2 = nr;
    out.push({ x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2, color });

    r = nr; c = nc;
    if (!isInside(r, c, rows, cols)) break;

    // targets
    const idx = r * cols + c;
    if (idx >= 0 && idx < total && workTargetMap[idx]) {
      workLitMap[idx] = true;
      // let beam continue for now
    }

    const tile = grid[r][c];
    const type = tile?.type || 'empty';
    if (type === 'mirror') {
      dir = reflectDirection(tile.orientation, dir);
      continue;
    }
    if (type === 'block') {
      // stop at block
      break;
    }
    // empty -> continue
  }
}

// PUBLIC_INTERFACE
export function buildTargetMaps(targets, rows, cols) {
  /**
   * Build flat boolean maps for target existence and lit state.
   * Returns { targetMap:boolean[], litMap:boolean[] }.
   */
  const total = rows * cols;
  const targetMap = new Array(total);
  const litMap = new Array(total);
  for (let i = 0; i < total; i++) {
    targetMap[i] = false;
    litMap[i] = false;
  }
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const idx = t.r * cols + t.c;
    if (idx >= 0 && idx < total) targetMap[idx] = true;
  }
  return { targetMap, litMap };
}

// PUBLIC_INTERFACE
export function traceBeams(grid, lasers, rows, cols, targets, outSegments) {
  /**
   * Deterministic beam trace for the provided grid and lasers.
   * - outSegments: optional array to reuse; will be emptied and filled with segments.
   * - Returns { segments, litTargets } where litTargets is an array of {r,c,lit:true}.
   */
  const segs = Array.isArray(outSegments) ? outSegments : [];
  segs.length = 0;

  // build maps
  const { targetMap, litMap } = buildTargetMaps(targets, rows, cols);
  const maxSteps = rows * cols * 4;

  for (let i = 0; i < lasers.length; i++) {
    stepLaser(lasers[i], grid, rows, cols, targetMap, litMap, segs, maxSteps);
  }

  // produce lit targets
  const litTargets = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const idx = t.r * cols + t.c;
    litTargets.push({ r: t.r, c: t.c, lit: !!litMap[idx] });
  }

  return { segments: segs, litTargets };
}
