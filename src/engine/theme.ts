/** The stylesheet's own values, for the canvas and the script, which cannot inherit them the way an element does. */

/** One custom property as the stylesheet declares it, which is where every reader below starts. */
const declared = (token: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim();

/** One color from the stylesheet, so that nothing that draws decides what anything looks like. */
export function themeColor(token: string): string {
  return declared(token) || '#ffffff';
}

/** One length token from the stylesheet in pixels, for the canvas to match a CSS measure. */
export function themePixels(token: string): number {
  return parseFloat(declared(token)) || 0;
}

/** One duration token from the stylesheet in milliseconds, for motion the script has to outlast. */
function themeMs(token: string, fallback: number): number {
  const raw = declared(token);
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return raw.endsWith('ms') ? value : value * 1000;
}

/** How long a panel takes to open, close, or change height, which two pieces of the interface wait out. */
export function panelMotionMs(): number {
  return themeMs('--panel-motion', 150);
}
