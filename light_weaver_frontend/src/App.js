import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import './game/styles/game.css';
import GameBoard from './game/components/GameBoard';
import level1 from './game/engine/level1';

// PUBLIC_INTERFACE
function App() {
  /**
   * App entry point for Light Weaver.
   * - Applies Ocean Professional theme via CSS variables.
   * - Renders a single-level laser puzzle with live simulation.
   */
  const [theme, setTheme] = useState('light');
  const [grid, setGrid] = useState(level1.initialGrid);
  const [staticItems, setStaticItems] = useState(level1.staticItems);
  const [targets, setTargets] = useState(level1.targets);
  const [boardSize, setBoardSize] = useState({ rows: level1.rows, cols: level1.cols });
  const [rotationKey, setRotationKey] = useState(0); // trigger rerender for canvas sizing on layout changes

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const styleVars = useMemo(() => ({
    '--color-primary': '#2563EB',
    '--color-secondary': '#F59E0B',
    '--color-success': '#F59E0B',
    '--color-error': '#EF4444',
    '--bg': '#f9fafb',
    '--surface': '#ffffff',
    '--text': '#111827',
  }), []);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(styleVars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [styleVars]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    // small resize to ensure canvas pixel ratio resets with theme changes
    setRotationKey(k => k + 1);
  };

  const handleRotate = useCallback((r, c) => {
    setGrid(prev => {
      const next = prev.map(row => row.slice());
      const tile = next[r][c];
      if (tile.type === 'mirror') {
        // Rotate through 4 mirror orientations: '/', '\' plus flipped states conceptually
        // We'll encode orientation as one of: 'slash' and 'backslash'
        const nextOri = tile.orientation === 'slash' ? 'backslash' : 'slash';
        next[r][c] = { ...tile, orientation: nextOri };
      }
      return next;
    });
  }, []);

  const handleReset = () => {
    setGrid(level1.initialGrid.map(r => r.map(t => ({ ...t }))));
    setStaticItems(level1.staticItems.map(s => ({ ...s })));
    setTargets(level1.targets.map(t => ({ ...t })));
    setBoardSize({ rows: level1.rows, cols: level1.cols });
    setRotationKey(k => k + 1);
  };

  const levelInfo = useMemo(() => ({
    lasers: level1.lasers,
    rows: boardSize.rows,
    cols: boardSize.cols
  }), [boardSize]);

  return (
    <div className="App">
      <header className="lw-header">
        <div className="lw-container">
          <div className="lw-brand">
            <div className="lw-logo" aria-hidden="true">✨</div>
            <div className="lw-titles">
              <h1 className="lw-title">Light Weaver</h1>
              <p className="lw-subtitle">Weave beams. Hit targets. Feel brilliant.</p>
            </div>
          </div>
          <div className="lw-actions">
            <button
              className="lw-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
            <button className="lw-btn lw-btn-secondary" onClick={handleReset} aria-label="Reset level">
              ⟳ Reset
            </button>
          </div>
        </div>
      </header>

      <main className="lw-main">
        <section className="lw-card">
          <div className="lw-card-header">
            <h2 className="lw-card-title">Level 1: First Reflection</h2>
            <p className="lw-card-desc">Rotate mirrors to guide the beam into the target.</p>
          </div>
          <div className="lw-board-wrap">
            <GameBoard
              key={rotationKey}
              grid={grid}
              staticItems={staticItems}
              targets={targets}
              levelInfo={levelInfo}
              onRotate={handleRotate}
              onTargetsUpdate={setTargets}
            />
          </div>
          <div className="lw-legend">
            <div className="legend-item"><span className="legend-swatch swatch-laser"></span> Laser</div>
            <div className="legend-item"><span className="legend-swatch swatch-mirror"></span> Mirror</div>
            <div className="legend-item"><span className="legend-swatch swatch-target"></span> Target</div>
            <div className="legend-item"><span className="legend-swatch swatch-beam"></span> Beam</div>
          </div>
        </section>
      </main>

      <footer className="lw-footer">
        <div className="lw-container">
          <span>Ocean Professional Theme</span>
          <span className="dot">•</span>
          <span>Offline-ready PWA</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
