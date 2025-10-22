import React, { useCallback } from 'react';

// PUBLIC_INTERFACE
export default function Tile({ tile, r, c, size, onRotate }) {
  /**
   * A single grid tile. Mirrors can be rotated by click/tap/Enter/Space.
   */
  const isInteractive = tile?.type === 'mirror';

  const handleClick = useCallback(() => {
    if (isInteractive) onRotate();
  }, [isInteractive, onRotate]);

  const handleKeyDown = useCallback((e) => {
    if (!isInteractive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRotate();
    }
  }, [isInteractive, onRotate]);

  const mirrorChar = tile?.orientation === 'backslash' ? '\\' : '/';

  return (
    <button
      className={`lw-tile ${tile?.type || 'empty'} ${isInteractive ? 'clickable' : ''}`}
      style={{ width: size, height: size }}
      aria-label={`Tile ${r + 1}, ${c + 1}${isInteractive ? ', mirror - click to rotate' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
    >
      {tile?.type === 'mirror' ? <span className="mirror-glyph">{mirrorChar}</span> : null}
    </button>
  );
}
