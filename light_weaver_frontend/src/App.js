import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import './game/styles/game.css';
import GameBoard from './game/components/GameBoard';
import level1 from './game/engine/level1';

// Helper to fetch with timeout and graceful fallback
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 2500, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...rest, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// Resolve backend base URL: prefer env, else infer from window location on different port
function getBackendBaseUrl() {
  // Allow override via env if CRA-style injected at build time
  const envUrl = process.env.REACT_APP_BACKEND_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  // Default: assume backend runs on same hostname at 3001
  try {
    const loc = window.location;
    const proto = loc.protocol;
    const host = loc.hostname;
    const port = '3001';
    return `${proto}//${host}:${port}`;
  } catch {
    return 'http://localhost:3001';
  }
}

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

  // API status badge state
  const [apiStatus, setApiStatus] = useState({
    state: 'checking', // 'ok' | 'degraded' | 'offline' | 'checking'
    label: 'Checking API…',
    version: null
  });

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

  // Probe backend once on mount and when coming back online
  useEffect(() => {
    let cancelled = false;

    async function checkApi() {
      const base = getBackendBaseUrl();
      try {
        const res = await fetchWithTimeout(`${base}/version`, {
          method: 'GET',
          // Ensure SW and intermediate caches don't block fresh fetch
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          },
          timeout: 2500
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setApiStatus({
          state: 'ok',
          label: data?.version ? `API ${data.version}` : 'API online',
          version: data?.version || null
        });
      } catch (e) {
        if (cancelled) return;
        // Distinguish between abort/timeouts and other errors lightly
        const offline = !navigator.onLine || (e?.name === 'AbortError');
        setApiStatus({
          state: offline ? 'offline' : 'degraded',
          label: offline ? 'Offline' : 'API unreachable',
          version: null
        });
      }
    }

    checkApi();

    // Re-check when browser comes back online
    function onOnline() {
      setApiStatus((s) => ({ ...s, state: 'checking', label: 'Rechecking…' }));
      checkApi();
    }
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, []);

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
            <div
              className={`lw-badge ${apiStatus.state}`}
              title={apiStatus.version ? `Backend version ${apiStatus.version}` : 'Backend status'}
              aria-live="polite"
            >
              <span className="dot" aria-hidden="true">•</span>
              <span className="lw-badge-text">{apiStatus.label}</span>
            </div>
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
          <span>Offline-ready gameplay (API optional)</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
