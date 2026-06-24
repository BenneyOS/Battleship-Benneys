import type { Board, Coord } from '../../engine/types';
import { BOARD_SIZE } from '../../engine/types';
import { getCellState } from '../../engine/board';
import type { CellState } from '../../engine/board';

interface BoardGridProps {
  board: Board;
  showShips: boolean;
  onClick?: (coord: Coord) => void;
  label: string;
  hoverPreview?: { origin: Coord; orientation: 'horizontal' | 'vertical'; length: number } | null;
  interactive: boolean;
  highlightedCell?: Coord | null;
}

const CELL_COLORS: Record<CellState, string> = {
  empty: '#1a2a3a',
  ship: '#4a7c59',
  miss: '#3a4a5a',
  hit: '#c0392b',
  sunk: '#7b241c',
};

const CELL_SYMBOLS: Record<CellState, string> = {
  empty: '',
  ship: '',
  miss: '\u2022',
  hit: '\u2716',
  sunk: '\u2716',
};

const COLUMN_LABELS = 'ABCDEFGHIJ';

export function BoardGrid({
  board,
  showShips,
  onClick,
  label,
  hoverPreview,
  interactive,
  highlightedCell,
}: BoardGridProps) {
  const previewCells = new Set<string>();
  if (hoverPreview) {
    for (let i = 0; i < hoverPreview.length; i++) {
      const x = hoverPreview.origin.x + (hoverPreview.orientation === 'horizontal' ? i : 0);
      const y = hoverPreview.origin.y + (hoverPreview.orientation === 'vertical' ? i : 0);
      if (x < BOARD_SIZE && y < BOARD_SIZE) {
        previewCells.add(`${x},${y}`);
      }
    }
  }

  return (
    <div style={{ display: 'inline-block', margin: '0 16px' }}>
      <h3 style={{ textAlign: 'center', color: '#ecf0f1', margin: '0 0 8px' }}>{label}</h3>
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
                  color: '#95a5a6',
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
                  color: '#95a5a6',
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
                const isPreview = previewCells.has(`${x},${y}`);
                const isHighlighted = highlightedCell?.x === x && highlightedCell?.y === y;
                const bg = isHighlighted
                  ? '#f39c12'
                  : isPreview
                    ? '#2e86c1'
                    : CELL_COLORS[cellState];
                const isClickable = interactive && onClick;
                return (
                  <td
                    key={x}
                    onClick={() => isClickable && onClick(coord)}
                    style={{
                      width: 36,
                      height: 36,
                      textAlign: 'center',
                      backgroundColor: bg,
                      border: '1px solid #2c3e50',
                      cursor: isClickable ? 'pointer' : 'default',
                      color: cellState === 'miss' ? '#7f8c8d' : '#ecf0f1',
                      fontSize: 16,
                      fontWeight: 'bold',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (isClickable) {
                        (e.currentTarget as HTMLElement).style.opacity = '0.8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = '1';
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
