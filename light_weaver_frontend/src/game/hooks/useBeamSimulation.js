import { useEffect, useMemo, useState } from 'react';

/**
 * Ray stepping across grid with simple reflections on two mirror types:
 * - 'slash' reflects (dx,dy) as (dy,dx) with inversion appropriate to axis
 * - 'backslash' reflects (dx,dy) as (-dy,-dx) similarly
 * We model direction as one of: 'up','down','left','right'.
 */

const dirToVec = {
  up:    { dr: -1, dc:  0 },
  down:  { dr:  1, dc:  0 },
  left:  { dr:  0, dc: -1 },
  right: { dr:  0, dc:  1 },
};

function reflect(orientation, dir) {
  // For '/' mirror: up->right, right->up, down->left, left->down
  // For '\' mirror: up->left, left->up, down->right, right->down
  if (orientation === 'slash') {
    return { up: 'right', right: 'up', down: 'left', left: 'down' }[dir];
  }
  return { up: 'left', left: 'up', down: 'right', right: 'down' }[dir];
}

// PUBLIC_INTERFACE
export default function useBeamSimulation({ grid, lasers, rows, cols, targets, onTargetsUpdate }) {
  /**
   * Computes beam segments in grid units.
   * Returns array of segments: { x1,y1,x2,y2,color? }
   * Also updates targets lit state instantly.
   */
  const [segments, setSegments] = useState([]);

  const safeGrid = useMemo(() => grid.map(r => r.map(t => t ? { ...t } : { type: 'empty' })), [grid]);
  const targetList = useMemo(() => targets.map(t => ({ ...t })), [targets]);

  useEffect(() => {
    const segs = [];
    // reset targets lit
    targetList.forEach(t => { t.lit = false; });

    lasers.forEach(l => {
      let r = l.r;
      let c = l.c;
      let dir = l.dir;

      let guard = 0;
      const maxSteps = rows * cols * 4;
      while (guard++ < maxSteps) {
        const v = dirToVec[dir];
        const nr = r + v.dr;
        const nc = c + v.dc;

        // Segment from center to next cell center in grid coords
        segs.push({ x1: c, y1: r, x2: nc, y2: nr, color: l.color || '#fb923c' });

        r = nr; c = nc;
        if (r < 0 || r >= rows || c < 0 || c >= cols) break;

        // Check target hit
        const hitTarget = targetList.find(t => t.r === r && t.c === c);
        if (hitTarget) {
          hitTarget.lit = true;
          // Continue past target; in future could stop beam here
        }

        const tile = safeGrid[r][c];
        if (tile.type === 'mirror') {
          dir = reflect(tile.orientation, dir);
        } else if (tile.type === 'block') {
          // stop beam on block
          break;
        } else {
          // empty, continue
        }
      }
    });

    setSegments(segs);
    // push lit state out
    onTargetsUpdate && onTargetsUpdate(targetList);
  }, [safeGrid, lasers, rows, cols, onTargetsUpdate]); // targets included via onTargetsUpdate

  return segments;
}
