import React, { useEffect, useMemo, useRef } from 'react';
import useBeamSimulation from '../hooks/useBeamSimulation';
import '../../index.css';
import '../styles/game.css';
import Tile from './Tile';

/**
 * GameBoard renders:
 * - A canvas for beams and overlay.
 * - An interactive grid of tiles for mirrors/targets (for accessibility).
 * - It computes beams via the simulation hook on each state change.
 */
const CELL_SIZE_BASE = 44; // base size; responsive scaling applied

// PUBLIC_INTERFACE
export default function GameBoard({ grid, staticItems, targets, levelInfo, onRotate, onTargetsUpdate }) {
  /** grid: 2D array of tiles { type: 'empty'|'mirror'|'block', orientation? }
   * staticItems: e.g. walls in the future
   * targets: array of { r, c, lit }
   * levelInfo: { lasers: [{ r,c,dir }], rows, cols }
   */
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const beams = useBeamSimulation({ grid, lasers: levelInfo.lasers, rows: levelInfo.rows, cols: levelInfo.cols, targets, onTargetsUpdate });

  const { rows, cols } = levelInfo;

  const cellSize = useMemo(() => {
    // Fit grid within container width with padding
    const width = containerRef.current?.clientWidth || (cols * CELL_SIZE_BASE + 16);
    const maxCell = Math.floor((Math.min(width, 600)) / cols);
    return Math.max(26, Math.min(56, maxCell));
  }, [cols, levelInfo.rows]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Draw beams on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cols * cellSize;
    const h = rows * cellSize;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Draw grid background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellSize + 0.5);
      ctx.lineTo(w, r * cellSize + 0.5);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellSize + 0.5, 0);
      ctx.lineTo(c * cellSize + 0.5, h);
      ctx.stroke();
    }

    // Beams
    ctx.lineWidth = Math.max(2, Math.floor(cellSize / 14));
    ctx.lineCap = 'round';
    beams.forEach(seg => {
      ctx.strokeStyle = seg.color || '#fb923c';
      ctx.beginPath();
      ctx.moveTo(seg.x1 * cellSize + cellSize / 2, seg.y1 * cellSize + cellSize / 2);
      ctx.lineTo(seg.x2 * cellSize + cellSize / 2, seg.y2 * cellSize + cellSize / 2);
      ctx.stroke();
    });

    // Lasers origin highlight
    levelInfo.lasers.forEach(l => {
      ctx.fillStyle = '#ef4444';
      const x = l.c * cellSize;
      const y = l.r * cellSize;
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.18, 0, Math.PI * 2);
      ctx.fill();
    });

    // Targets highlight
    targets.forEach(t => {
      const x = t.c * cellSize;
      const y = t.r * cellSize;
      ctx.fillStyle = t.lit ? '#10b981' : '#9CA3AF';
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [beams, cellSize, cols, rows, levelInfo.lasers, targets]);

  return (
    <div className="lw-board" ref={containerRef} style={{ width: Math.min(600, cols * cellSize) }}>
      <div className="lw-board-inner" style={{ width: cols * cellSize, height: rows * cellSize }}>
        <canvas ref={canvasRef} className="lw-canvas" aria-label="Beam canvas" />
        <div className="lw-grid-overlay">
          {grid.map((row, r) => (
            <div className="lw-row" key={`r-${r}`} style={{ height: cellSize }}>
              {row.map((tile, c) => (
                <Tile
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
