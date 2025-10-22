import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import useBeamSimulation from '../hooks/useBeamSimulation';
import '../../index.css';
import '../styles/game.css';
import Tile from './Tile';

// Simple perf switch: window.__LW_DEV = true to view console.time entries
const isDevPerf = typeof window !== 'undefined' && !!window.__LW_DEV;

/**
 * GameBoard renders:
 * - A canvas for beams and overlay, using rAF to draw without re-rendering React tree.
 * - An interactive grid of tiles for mirrors (kept as lightweight buttons).
 * - Caches the static grid background using an offscreen canvas per cell size.
 */
const CELL_SIZE_BASE = 46; // slightly larger base for better touch targets

// PUBLIC_INTERFACE
export default function GameBoard({ grid, staticItems, targets, levelInfo, onRotate, onTargetsUpdate, success = false }) {
  /** grid: 2D array of tiles { type: 'empty'|'mirror'|'block', orientation? }
   * staticItems: reserved
   * targets: array of { r, c, lit }
   * levelInfo: { lasers: [{ r,c,dir }], rows, cols }
   */
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const offscreenRef = useRef(null); // caches static grid background per size
  const lastSizeRef = useRef({ cell: 0, rows: 0, cols: 0 });

  const { rows, cols } = levelInfo;
  const beams = useBeamSimulation({
    grid,
    lasers: levelInfo.lasers,
    rows: levelInfo.rows,
    cols: levelInfo.cols,
    targets,
    onTargetsUpdate
  });

  const cellSize = useMemo(() => {
    // Fit grid within container width with padding
    const width = containerRef.current?.clientWidth || (cols * CELL_SIZE_BASE + 16);
    const maxCell = Math.floor((Math.min(width, 600)) / cols);
    return Math.max(32, Math.min(60, maxCell));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, levelInfo.rows]);

  const ensureOffscreen = useCallback((cell, rCount, cCount) => {
    // Build or rebuild a cached static background for current geometry
    const keyChanged =
      !offscreenRef.current ||
      lastSizeRef.current.cell !== cell ||
      lastSizeRef.current.rows !== rCount ||
      lastSizeRef.current.cols !== cCount;

    if (!keyChanged) return offscreenRef.current;

    const dpr = window.devicePixelRatio || 1;
    const w = cCount * cell;
    const h = rCount * cell;
    const off = document.createElement('canvas');
    off.width = Math.floor(w * dpr);
    off.height = Math.floor(h * dpr);
    const octx = off.getContext('2d');
    octx.scale(dpr, dpr);

    // Background
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, w, h);

    // Grid lines
    octx.strokeStyle = 'rgba(0,0,0,0.06)';
    octx.lineWidth = 1;
    for (let r = 0; r <= rCount; r++) {
      octx.beginPath();
      octx.moveTo(0, r * cell + 0.5);
      octx.lineTo(w, r * cell + 0.5);
      octx.stroke();
    }
    for (let c = 0; c <= cCount; c++) {
      octx.beginPath();
      octx.moveTo(c * cell + 0.5, 0);
      octx.lineTo(c * cell + 0.5, h);
      octx.stroke();
    }

    offscreenRef.current = off;
    lastSizeRef.current = { cell, rows: rCount, cols: cCount };
    return off;
  }, []);

  useEffect(() => {
    // Draw using rAF to decouple from React updates
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cols * cellSize;
    const h = rows * cellSize;

    // Size canvas
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.scale(dpr, dpr);

    // Prepare offscreen
    const off = ensureOffscreen(cellSize, rows, cols);

    // Render once per update (already invoked within rAF in the hook)
    if (isDevPerf) console.time?.('board-draw');
    // Blit static bg
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(off, 0, 0, off.width / dpr, off.height / dpr);

    // Beams
    ctx.lineWidth = Math.max(2, Math.floor(cellSize / 14));
    ctx.lineCap = 'round';
    for (let i = 0; i < beams.length; i++) {
      const seg = beams[i];
      // subtle beam glow
      ctx.shadowColor = seg.color || '#fb923c';
      ctx.shadowBlur = Math.max(2, Math.floor(cellSize / 10));
      ctx.strokeStyle = seg.color || '#fb923c';
      ctx.beginPath();
      ctx.moveTo(seg.x1 * cellSize + cellSize / 2, seg.y1 * cellSize + cellSize / 2);
      ctx.lineTo(seg.x2 * cellSize + cellSize / 2, seg.y2 * cellSize + cellSize / 2);
      ctx.stroke();
    }
    // reset glow
    ctx.shadowBlur = 0;

    // Lasers origin highlight
    for (let i = 0; i < levelInfo.lasers.length; i++) {
      const l = levelInfo.lasers[i];
      ctx.fillStyle = '#ef4444';
      const x = l.c * cellSize;
      const y = l.r * cellSize;
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Targets highlight with pulse when lit
    const now = Date.now();
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const x = t.c * cellSize;
      const y = t.r * cellSize;
      const baseR = cellSize * 0.2;
      const lit = !!t.lit;

      // fill
      ctx.beginPath();
      ctx.fillStyle = lit ? '#10b981' : '#9CA3AF';
      ctx.arc(x + cellSize / 2, y + cellSize / 2, baseR, 0, Math.PI * 2);
      ctx.fill();

      // pulse ring on lit
      if (lit) {
        const pulse = (Math.sin(now / 200) + 1) / 2; // 0..1
        const ringR = baseR + pulse * (cellSize * 0.08);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(16,185,129,0.7)';
        ctx.lineWidth = Math.max(2, Math.floor(cellSize / 18));
        ctx.arc(x + cellSize / 2, y + cellSize / 2, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (isDevPerf) console.timeEnd?.('board-draw');
  }, [beams, cellSize, cols, rows, ensureOffscreen, levelInfo.lasers, targets, success]);

  // Memoized Tile to avoid re-rendering non-changing cells
  const MemoTile = useMemo(() => React.memo(Tile), []);

  return (
    <div className="lw-board" ref={containerRef} style={{ width: Math.min(600, cols * cellSize) }}>
      <div className={`lw-board-inner ${success ? 'glow' : ''}`} style={{ width: cols * cellSize, height: rows * cellSize }}>
        <canvas ref={canvasRef} className="lw-canvas" aria-label="Beam canvas" />
        <div className="lw-grid-overlay" role="grid" aria-label="Puzzle grid">
          {grid.map((row, r) => (
            <div className="lw-row" key={`r-${r}`} style={{ height: cellSize }} role="row">
              {row.map((tile, c) => (
                <MemoTile
                  key={`t-${r}-${c}`}
                  tile={tile}
                  r={r}
                  c={c}
                  size={cellSize}
                  onRotate={() => onRotate(r, c)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
