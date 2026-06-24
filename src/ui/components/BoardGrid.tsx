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
  empty: 'var(--surface-2, #1e3a56)',
  ship: '#4a7c59',
  miss: 'var(--state-miss, #3a4a5a)',
  hit: 'var(--state-hit, #d4920b)',
  sunk: 'var(--state-sunk, #8b0000)',
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
    <div style={{ display: 'inline-block', margin: '0 16px' }} onMouseLeave={onBoardLeave}>
      <h3 style={{ textAlign: 'center', color: 'var(--text-primary, #ecf0f1)', margin: '0 0 8px' }}>{label}</h3>
      <table style={{ borderCollapse: 'collapse' }}>
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
                  color: 'var(--text-secondary, #95a5a6)',
                  fontSize: 12,
                  fontWeight: 600,
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
                  color: 'var(--text-secondary, #95a5a6)',
                  fontSize: 12,
                  fontWeight: 600,
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
                    ? 'rgba(46, 204, 113, 0.5)'
                    : 'rgba(231, 76, 60, 0.5)'
                  : undefined;
                const bg = isHighlighted
                  ? '#f39c12'
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
                    style={{
                      width: 36,
                      height: 36,
                      textAlign: 'center',
                      backgroundColor: bg,
                      border: '1px solid var(--surface-edge, #2a5070)',
                      cursor: isClickable ? 'pointer' : 'default',
                      color: cellState === 'miss' ? 'var(--text-muted, #7f8c8d)' : 'var(--text-primary, #ecf0f1)',
                      fontSize: 16,
                      fontWeight: 'bold',
                      transition: 'background-color 0.15s',
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
