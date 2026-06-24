import type { Board } from './types';
import { isSunk } from './board';

// ─── Feature 1: Setup Placement Progress ────────────────────────────────────

export interface FleetDef {
  name: string;
  length: number;
}

export interface SetupProgressData {
  placed: number;
  total: number;
  remaining: number;
  nextShip: FleetDef | null;
  percent: number;
  isComplete: boolean;
}

export function setupProgress(
  board: Board,
  fleetDef: readonly FleetDef[],
): SetupProgressData {
  const placed = board.ships.length;
  const total = fleetDef.length;
  const remaining = total - placed;
  const nextShip = placed < total ? fleetDef[placed] : null;
  const percent = total === 0 ? 0 : Math.round((placed / total) * 100);
  const isComplete = placed === total;
  return { placed, total, remaining, nextShip, percent, isComplete };
}

// ─── Feature 2: Battle Fleet-Damage Progress ────────────────────────────────

export interface FleetProgressData {
  total: number;
  sunk: number;
  remaining: number;
  percent: number;
  isDefeated: boolean;
}

export function fleetProgress(targetBoard: Board): FleetProgressData {
  const total = targetBoard.ships.length;
  const sunk = targetBoard.ships.filter((s) => isSunk(targetBoard, s)).length;
  const remaining = total - sunk;
  const percent = total === 0 ? 0 : Math.round((sunk / total) * 100);
  const isDefeated = total > 0 && sunk === total;
  return { total, sunk, remaining, percent, isDefeated };
}

// ─── Milestone Logic ────────────────────────────────────────────────────────

const THRESHOLDS = [50, 70, 90, 100] as const;

/**
 * Returns the highest threshold crossed by the given percent,
 * or null if percent is below 50.
 */
export function milestoneFor(percent: number): number | null {
  let highest: number | null = null;
  for (const t of THRESHOLDS) {
    if (percent >= t) highest = t;
  }
  return highest;
}

// ─── Feature 3: Coordinate Labeling ─────────────────────────────────────────

const COLS = 'ABCDEFGHIJ';

/**
 * Convert engine coord {x, y} to grid label like "C3".
 * x=0 → A, y=0 → row 1.
 */
export function labelFor(coord: { x: number; y: number }): string {
  return `${COLS[coord.x]}${coord.y + 1}`;
}

/**
 * Parse a grid label like "C3" back to engine coord {x, y}.
 */
export function parseCellLabel(label: string): { x: number; y: number } {
  const col = label[0].toUpperCase();
  const row = parseInt(label.slice(1), 10);
  return { x: COLS.indexOf(col), y: row - 1 };
}

// ─── Move Announcement Formatting ──────────────────────────────────────────

export type ShotOutcome = 'miss' | 'hit' | 'sunk';

export function formatMove(
  coord: { x: number; y: number },
  result: ShotOutcome,
  sunkShipName?: string,
): string {
  const label = labelFor(coord);
  if (result === 'miss') return `Computer fires at ${label} \u2014 Miss`;
  if (result === 'sunk') return `Computer fires at ${label} \u2014 Hit! Your ${sunkShipName} is sunk`;
  return `Computer fires at ${label} \u2014 Hit!`;
}
