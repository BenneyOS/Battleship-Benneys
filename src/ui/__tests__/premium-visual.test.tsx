/**
 * Premium Visual System verification tests (Bright Arcade PRD §5–6).
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import App from '../../App';
import fs from 'node:fs';
import path from 'node:path';

afterEach(() => {
  cleanup();
});

function startGame() {
  render(<App />);
  fireEvent.click(screen.getByText('Auto-Place Ships'));
  fireEvent.click(screen.getByText('Start Game'));
}

/* ── §5.1 Token & contrast checks ────────────────────────────── */
describe('§5.1 Token system & contrast', () => {
  it('App.css defines all required token custom properties', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    const requiredTokens = [
      '--surface-0',
      '--surface-1',
      '--surface-2',
      '--surface-edge',
      '--brand-cyan',
      '--brand-steel',
      '--brand-navy',
      '--accent-warm',
      '--state-miss',
      '--state-hit',
      '--state-sunk',
      '--text-primary',
      '--text-secondary',
      '--text-muted',
      '--neon-cyan',
      '--gold',
      '--warm-cta',
      '--field-top',
      '--field-mid',
      '--field-deep',
      '--font-display',
      '--font-body',
    ];
    for (const token of requiredTokens) {
      expect(css).toContain(token);
    }
  });

  it('elevation steps are distinct hex values', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    const extract = (token: string) => {
      const re = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(#[0-9a-fA-F]{6})`);
      const m = css.match(re);
      return m ? m[1].toLowerCase() : null;
    };
    const s0 = extract('--surface-0');
    const s1 = extract('--surface-1');
    const s2 = extract('--surface-2');
    expect(s0).not.toBeNull();
    expect(s1).not.toBeNull();
    expect(s2).not.toBeNull();
    expect(s0).not.toBe(s1);
    expect(s1).not.toBe(s2);
    expect(s0).not.toBe(s2);
  });

  it('elevation steps have meaningful tonal separation (>= 10 lightness units)', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    const extract = (token: string) => {
      const re = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(#[0-9a-fA-F]{6})`);
      const m = css.match(re);
      return m ? m[1].toLowerCase() : null;
    };
    const hexToLightness = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
    };
    const s0 = extract('--surface-0')!;
    const s1 = extract('--surface-1')!;
    const s2 = extract('--surface-2')!;
    const l0 = hexToLightness(s0);
    const l1 = hexToLightness(s1);
    const l2 = hexToLightness(s2);
    expect(l1 - l0).toBeGreaterThanOrEqual(10);
    expect(l2 - l1).toBeGreaterThanOrEqual(10);
  });

  it('combat state tokens are mutually distinct', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    const extract = (token: string) => {
      const re = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(#[0-9a-fA-F]{6})`);
      const m = css.match(re);
      return m ? m[1].toLowerCase() : null;
    };
    const miss = extract('--state-miss');
    const hit = extract('--state-hit');
    const sunk = extract('--state-sunk');
    expect(miss).not.toBeNull();
    expect(hit).not.toBeNull();
    expect(sunk).not.toBeNull();
    expect(miss).not.toBe(hit);
    expect(hit).not.toBe(sunk);
    expect(miss).not.toBe(sunk);
  });

  it('hit and CTA are distinct tokens', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    const extract = (token: string) => {
      const re = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(#[0-9a-fA-F]{6})`);
      const m = css.match(re);
      return m ? m[1].toLowerCase() : null;
    };
    const hit = extract('--state-hit');
    const cta = extract('--warm-cta');
    expect(hit).not.toBeNull();
    expect(cta).not.toBeNull();
    expect(hit).not.toBe(cta);
  });

  it('no surviving dark-theme hex values (#0A192F/#112240)', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    expect(css.toLowerCase()).not.toContain('#0a192f');
    expect(css.toLowerCase()).not.toContain('#112240');
  });

  it('no hardcoded hex colors in component files (BoardGrid, TurnBanner, AccuracyChip)', () => {
    const files = [
      path.resolve(__dirname, '../components/BoardGrid.tsx'),
      path.resolve(__dirname, '../components/TurnBanner.tsx'),
      path.resolve(__dirname, '../components/AccuracyChip.tsx'),
    ];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf-8');
      const lines = src.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
        const hexInStyle = line.match(/(?:color|background|border|shadow|fill|stroke)\s*[:=]\s*['"]#[0-9a-fA-F]{3,8}['"]/g);
        if (hexInStyle) {
          const varPattern = /var\([^)]*#[0-9a-fA-F]{3,8}[^)]*\)/;
          if (!varPattern.test(line)) {
            expect.fail(`Hardcoded hex color in ${path.basename(f)}: ${line.trim()}`);
          }
        }
      }
    }
  });
});

/* ── §5.2 Logo checks — CSS/HTML text, no raster ─────────────── */
describe('§5.2 Logo / header structure (CSS rebuild)', () => {
  it('logo lockup renders with accessible name', () => {
    render(<App />);
    const logo = screen.getByTestId('logo-header');
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute('aria-label')).toBe("Benny's Battleship");
  });

  it('no raster logo asset is referenced (no IMG tag in logo)', () => {
    render(<App />);
    const logo = screen.getByTestId('logo-header');
    expect(logo.querySelector('img')).toBeNull();
  });

  it('logo contains BATTLESHIP text', () => {
    render(<App />);
    const logo = screen.getByTestId('logo-header');
    const battleshipText = logo.querySelector('.logo-lockup__battleship');
    expect(battleshipText).not.toBeNull();
    expect(battleshipText!.textContent).toContain('Battleship');
  });

  it("logo contains BENNY'S text", () => {
    render(<App />);
    expect(screen.getByText(/Benny/i)).toBeInTheDocument();
  });

  it('logo has data-testid for targeting', () => {
    render(<App />);
    const logo = screen.getByTestId('logo-header');
    expect(logo).toBeInTheDocument();
    expect(logo.className).toContain('logo-lockup');
  });

  it('no raster logo PNG exists in assets', () => {
    const assetDir = path.resolve(__dirname, '../../assets');
    const files = fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : [];
    expect(files).not.toContain('logo.png');
  });
});

/* ── §5.3 Typography checks ──────────────────────────────────── */
describe('§5.3 Typography', () => {
  it('CSS declares arcade display font token', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    expect(css).toContain('Press Start 2P');
    expect(css).toContain('--font-display');
  });

  it('CSS declares body font token', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    expect(css).toContain('--font-body');
    expect(css).toContain('sans-serif');
  });

  it('font-display: swap is used for web font loading', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    expect(css).toContain('display=swap');
  });
});

/* ── §5.4 Atmosphere checks ──────────────────────────────────── */
describe('§5.4 Atmosphere', () => {
  it('atmosphere texture div is present with aria-hidden', () => {
    render(<App />);
    const texture = document.querySelector('.atmosphere-texture');
    expect(texture).not.toBeNull();
    expect(texture?.getAttribute('aria-hidden')).toBe('true');
  });

  it('atmosphere shimmer div is present with aria-hidden', () => {
    render(<App />);
    const shimmer = document.querySelector('.atmosphere-shimmer');
    expect(shimmer).not.toBeNull();
    expect(shimmer?.getAttribute('aria-hidden')).toBe('true');
  });

  it('CSS includes reduced-motion suppression for shimmer and logo', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('.atmosphere-shimmer');
    const reducedMotionBlock = css.substring(
      css.indexOf('prefers-reduced-motion'),
    );
    expect(reducedMotionBlock).toContain('animation: none');
  });

  it('CSS includes bright directional gradient on game-layout', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    expect(css).toContain('.game-layout');
    expect(css).toContain('linear-gradient');
  });

  it('CSS includes scanlines', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    expect(css).toContain('repeating-linear-gradient');
  });

  it('CSS includes board bezel with glowing cyan border', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../App.css'),
      'utf-8',
    );
    expect(css).toContain('.board-bezel');
    expect(css).toContain('var(--neon-cyan)');
  });
});

/* ── §5.5 Coherence / regression ─────────────────────────────── */
describe('§5.5 Coherence / regression', () => {
  it('"Still afloat" sentence stays removed', () => {
    startGame();
    expect(screen.queryByText(/Still afloat/i)).not.toBeInTheDocument();
  });

  it('accuracy chip still present outside banner during play', () => {
    startGame();
    const chip = screen.getByTestId('accuracy-chip');
    expect(chip).toBeInTheDocument();
    const banner = screen.getByTestId('turn-banner');
    expect(banner.contains(chip)).toBe(false);
  });

  it('enemy fleet checklist still renders in game phase', () => {
    startGame();
    expect(screen.getByTestId('enemy-fleet-checklist')).toBeInTheDocument();
  });

  it('setup progress renders during placement', () => {
    render(<App />);
    expect(screen.getByText(/ships placed/i)).toBeInTheDocument();
  });

  it('event line appears after firing', () => {
    startGame();
    const enemyZone = screen.getByTestId('zone-enemy');
    const cells = enemyZone.querySelectorAll('[data-coord]');
    if (cells.length > 0) {
      fireEvent.click(cells[0]);
    }
    expect(screen.queryByTestId('event-line')).toBeInTheDocument();
  });

  it('index.css body background uses surface-0 token', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../index.css'),
      'utf-8',
    );
    expect(css).toContain('var(--surface-0');
  });

  it('redundant progress text removed ("N more to go" and "N%")', () => {
    startGame();
    expect(screen.queryByText(/more to go/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/% of the enemy fleet destroyed/i)).not.toBeInTheDocument();
  });
});
