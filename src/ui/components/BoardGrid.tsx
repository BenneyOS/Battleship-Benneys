import type { Board, Coord } from '../../engine/types';
import { BOARD_SIZE } from '../../engine/types';
import { getCellState } from '../../engine/board';
import type { CellState } from '../../engine/board';

export interface PreviewState {
  cells: Coord[];
  isValid: boolean;
}

interface BoardGridProps {
  board: Board;
  showShips: boolean;
  onClick?: (coord: Coord) => void;
  onCellHover?: (coord: Coord) => void;
  onBoardLeave?: () => void;
  label: string;
  preview?: PreviewState | null;
  interactive: boolean;
  highlightedCell?: Coord | null;
}

const CELL_COLORS: Record<CellState, string> = {
  empty: 'var(--cell-bg)',
  ship: 'var(--state-ship)',
  miss: 'var(--state-miss)',
  hit: 'var(--state-hit)',
  sunk: 'var(--state-sunk)',
};

const CELL_SHADOWS: Record<CellState, string> = {
  empty: 'none',
  ship: 'inset 0 -2px 3px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.15), 0 0 6px rgba(38,166,154,0.3)',
  miss: 'none',
  hit: '0 0 4px var(--state-hit), 0 0 10px rgba(255,109,0,0.3), 0 0 20px rgba(255,109,0,0.1)',
  sunk: '0 0 4px var(--state-sunk), 0 0 10px rgba(194,24,91,0.3), 0 0 20px rgba(194,24,91,0.1)',
};

const CELL_SYMBOLS: Record<CellState, string> = {
  empty: '',
  ship: '',
  miss: '\u2022',
  hit: '\u2716',
  sunk: '\u2620',
};

const COLUMN_LABELS = 'ABCDEFGHIJ';

export function BoardGrid({
  board,
  showShips,
  onClick,
  onCellHover,
  onBoardLeave,
  label,
  preview,
  interactive,
  highlightedCell,
}: BoardGridProps) {
  const previewCellSet = new Set<string>();
  if (preview) {
    for (const c of preview.cells) {
      previewCellSet.add(`${c.x},${c.y}`);
    }
  }

  return (
    <div className="board-bezel" onMouseLeave={onBoardLeave}>
      <h3 style={{
        textAlign: 'center',
        color: 'var(--neon-cyan)',
        fontFamily: 'var(--font-display)',
        fontSize: 10,
        letterSpacing: 2,
        margin: '0 0 8px',
        textShadow: '0 0 8px rgba(0, 229, 255, 0.4)',
      }}>{label}</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 30, height: 30 }} />
            {Array.from({ length: BOARD_SIZE }, (_, i) => (
              <th
                key={i}
                style={{
                  width: 36,
                  height: 24,
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 8,
                }}
              >
                {COLUMN_LABELS[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: BOARD_SIZE }, (_, y) => (
            <tr key={y}>
              <td
                style={{
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 8,
                  width: 30,
                }}
              >
                {y + 1}
              </td>
              {Array.from({ length: BOARD_SIZE }, (_, x) => {
                const coord: Coord = { x, y };
                const cellState = getCellState(board, coord, showShips);
                const isPreview = previewCellSet.has(`${x},${y}`);
                const isHighlighted = highlightedCell?.x === x && highlightedCell?.y === y;
                const previewBg = preview
                  ? preview.isValid
                    ? 'rgba(102, 187, 106, 0.5)'
                    : 'rgba(239, 83, 80, 0.5)'
                  : undefined;
                const bg = isHighlighted
                  ? 'var(--gold)'
                  : isPreview && previewBg
                    ? previewBg
                    : CELL_COLORS[cellState];
                const isClickable = interactive && onClick;
                return (
                  <td
                    key={x}
                    data-coord={`${x},${y}`}
                    onClick={() => isClickable && onClick(coord)}
                    onMouseEnter={() => {
                      if (interactive && onCellHover) {
                        onCellHover(coord);
                      }
                    }}
                    className={[
                      'board-cell',
                      isClickable && cellState === 'empty' ? 'board-cell--interactive' : '',
                    ].filter(Boolean).join(' ')}
                    style={{
                      width: 36,
                      height: 36,
                      textAlign: 'center',
                      backgroundColor: bg,
                      border: '1px solid rgba(0, 229, 255, 0.2)',
                      boxShadow: cellState === 'empty' ? undefined : CELL_SHADOWS[cellState],
                      cursor: isClickable ? 'pointer' : 'default',
                      color: cellState === 'miss' ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontSize: 16,
                      fontWeight: 'bold',
                    }}
                  >
                    {CELL_SYMBOLS[cellState]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
