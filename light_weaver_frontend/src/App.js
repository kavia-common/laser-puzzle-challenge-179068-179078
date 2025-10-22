import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

  // UX state
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState(() => {
    const v = localStorage.getItem('lw_best_level1');
    return v ? parseInt(v, 10) : null;
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [hitPulse, setHitPulse] = useState(false); // brief banner pulse on first complete hit
  const historyRef = useRef([]); // stack of {r,c}
  const lastTargetsLitRef = useRef(false); // track success transitions

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
    '--color-success': '#10B981',
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

  /**
   * Rotate a mirror at (r,c). Uses functional setState to batch updates.
   * Pushes to history for undo and increments moves.
   */
  const handleRotate = useCallback((r, c) => {
    setGrid(prev => {
      const tile = prev[r][c];
      if (tile?.type !== 'mirror') return prev;

      // push history (r,c) to allow undo toggle
      historyRef.current.push({ r, c });

      const next = prev.map(row => row);
      const nextOri = tile.orientation === 'slash' ? 'backslash' : 'slash';
      const newRow = next[r].slice();
      newRow[c] = { ...tile, orientation: nextOri };
      next[r] = newRow;

      // increment move count
      setMoves(m => m + 1);
      return next;
    });
  }, []);

  // PUBLIC_INTERFACE
  const handleUndo = useCallback(() => {
    const last = historyRef.current.pop();
    if (!last) return;
    const { r, c } = last;
    setGrid(prev => {
      const tile = prev[r][c];
      if (tile?.type !== 'mirror') return prev;
      const next = prev.map(row => row);
      const newRow = next[r].slice();
      // reverse the rotation
      const prevOri = tile.orientation === 'slash' ? 'backslash' : 'slash';
      newRow[c] = { ...tile, orientation: prevOri };
      next[r] = newRow;
      setMoves(m => Math.max(0, m - 1));
      return next;
    });
  }, []);

  const handleReset = () => {
    setGrid(level1.initialGrid.map(r => r.map(t => ({ ...t }))));
    setStaticItems(level1.staticItems.map(s => ({ ...s })));
    setTargets(level1.targets.map(t => ({ ...t })));
    setBoardSize({ rows: level1.rows, cols: level1.cols });
    setRotationKey(k => k + 1);
    setMoves(0);
    historyRef.current = [];
    setShowSuccess(false);
    setHitPulse(false);
    lastTargetsLitRef.current = false;
  };

  const onTargetsUpdate = useCallback((newTargets) => {
    setTargets(newTargets);
    const allLit = newTargets.every(t => !!t.lit);
    // transition detection for visual pulse and success modal
    if (allLit && !lastTargetsLitRef.current) {
      setHitPulse(true);
      setTimeout(() => setHitPulse(false), 600);

      // set best score (lower is better)
      setBest(prevBest => {
        const newBest = prevBest == null ? moves : Math.min(prevBest, moves);
        localStorage.setItem('lw_best_level1', String(newBest));
        return newBest;
      });

      // brief delay before showing modal for nicer feel
      setTimeout(() => setShowSuccess(true), 250);
    }
    if (!allLit && lastTargetsLitRef.current) {
      setShowSuccess(false);
    }
    lastTargetsLitRef.current = allLit;
  }, [moves]);

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
            <button className="lw-btn lw-btn-secondary" onClick={handleUndo} aria-label="Undo last move" disabled={historyRef.current.length === 0}>
              ↶ Undo
            </button>
          </div>
        </div>
      </header>

      <main className="lw-main">
        <section className="lw-card" aria-live="polite">
          <div className="lw-card-header">
            <h2 className="lw-card-title">Level 1: First Reflection</h2>
            <p className="lw-card-desc">Rotate mirrors to guide the beam into the target.</p>
          </div>

          <div className="lw-hud">
            <div className="lw-hud-item" aria-label={`Moves used: ${moves}`} role="status">
              🧭 Moves: <strong>{moves}</strong>
            </div>
            <div className="lw-hud-item" aria-label={`Best score: ${best ?? 'none yet'}`} role="status">
              ⭐ Best: <strong>{best ?? '—'}</strong>
            </div>
          </div>

          {hitPulse && (
            <div className="lw-banner success" role="status" aria-live="assertive">
              Target hit! Beautiful reflection ✨
            </div>
          )}

          <div className="lw-board-wrap">
            <GameBoard
              key={rotationKey}
              grid={grid}
              staticItems={staticItems}
              targets={targets}
              levelInfo={levelInfo}
              onRotate={handleRotate}
              onTargetsUpdate={onTargetsUpdate}
              success={lastTargetsLitRef.current}
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

      {showSuccess && (
        <div className="lw-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="success-title">
          <div className="lw-modal">
            <h3 id="success-title" className="lw-modal-title">Level Complete 🎉</h3>
            <p className="lw-modal-desc">You guided the beam to the target in <strong>{moves}</strong> moves.</p>
            <div className="lw-modal-actions">
              <button className="lw-btn" onClick={handleReset} aria-label="Play again">
                ▶ Play again
              </button>
              <button
                className="lw-btn lw-btn-secondary"
                onClick={() => setShowSuccess(false)}
                aria-label="Continue to next level"
              >
                ➡ Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
