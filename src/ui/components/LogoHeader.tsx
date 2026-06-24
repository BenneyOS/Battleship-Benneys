/**
 * CSS/HTML Logo Lockup — no raster dependency.
 * "BENNY'S" (smaller, upper) + "BATTLESHIP" (large, primary)
 * in the arcade display face with neon-cyan glow + layered offset shadow.
 * Ship + radar marks rendered as inline SVG (vector, recolors via tokens).
 */
export function LogoHeader() {
  return (
    <div
      className="logo-lockup"
      role="banner"
      aria-label="Benny's Battleship"
      data-testid="logo-header"
    >
      <div className="logo-lockup__top">
        {/* Ship mark (simple vessel silhouette) */}
        <span className="logo-lockup__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17h18l-3-5H6l-3 5zm6-7h6l1-3H8l1 3zm3-5l1-2h-2l1 2z" />
          </svg>
        </span>

        <span className="logo-lockup__benneys">Benny&apos;s</span>

        {/* Radar/sonar mark */}
        <span className="logo-lockup__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            <circle cx="12" cy="12" r="2" />
            <line x1="12" y1="12" x2="18" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
      </div>

      <div className="logo-lockup__battleship">Battleship</div>
    </div>
  );
}
