import { useEffect, useMemo, useRef, useState } from 'react';
import { traceBeams } from '../engine/beamTracer';

/**
 * Beam simulation hook optimized for rendering loops.
 * - Uses a pure tracer to compute segments.
 * - Batches recomputation once per animation frame when inputs change.
 * - Exposes a stable array reference that updates only when segments actually differ.
 */

// Dev instrumentation flag (no env needed per acceptance criteria)
// Enable in console via window.__LW_DEV = true
const isDevPerf = typeof window !== 'undefined' && !!window.__LW_DEV;

// PUBLIC_INTERFACE
export default function useBeamSimulation({ grid, lasers, rows, cols, targets, onTargetsUpdate }) {
  /**
   * Computes beam segments in grid units with batching per rAF.
   * Returns array of segments: { x1,y1,x2,y2,color? }.
   * Also emits target lit states via onTargetsUpdate once per frame.
   */
  const [segments, setSegments] = useState([]);
  const rafId = useRef(0);
  const pending = useRef(false);
  const lastInputs = useRef(null);
  const workSegments = useRef([]); // reusable array instance

  // Memoize shallow copies only when necessary to avoid frequent deep copies
  const safeGrid = useMemo(() => grid, [grid]);
  const lasersMemo = useMemo(() => lasers, [lasers]);
  const targetsMemo = useMemo(() => targets, [targets]);
  const dims = useMemo(() => ({ rows, cols }), [rows, cols]);

  useEffect(() => {
    // Queue a recompute on next frame, coalescing multiple changes
    if (pending.current) return;
    pending.current = true;

    rafId.current = window.requestAnimationFrame(() => {
      pending.current = false;
      if (isDevPerf) console.time?.('beam-trace');

      const out = workSegments.current;
      const result = traceBeams(safeGrid, lasersMemo, dims.rows, dims.cols, targetsMemo, out);

      if (isDevPerf) console.timeEnd?.('beam-trace');

      // Only update state if segments array changed in length or points
      let changed = segments.length !== result.segments.length;
      if (!changed) {
        for (let i = 0; i < segments.length; i++) {
          const a = segments[i], b = result.segments[i];
          if (a.x1 !== b.x1 || a.y1 !== b.y1 || a.x2 !== b.x2 || a.y2 !== b.y2 || a.color !== b.color) {
            changed = true; break;
          }
        }
      }
      if (changed) {
        // Create a new reference but reuse underlying objects from out
        setSegments(result.segments.slice());
      }

      // Push lit target state outward once per frame
      onTargetsUpdate && onTargetsUpdate(result.litTargets);
      lastInputs.current = { grid: safeGrid, lasers: lasersMemo, targets: targetsMemo, dims };
    });

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = 0;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeGrid, lasersMemo, targetsMemo, dims.rows, dims.cols]);

  return segments;
}
