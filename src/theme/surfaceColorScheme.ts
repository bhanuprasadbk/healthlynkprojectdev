/**
 * Whether a hex surface is dark enough to prefer `color-scheme: dark` and
 * light-themed native chrome (e.g. date picker icon) via invert/filter.
 */
export function surfacePrefersDarkColorScheme(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum < 0.45
}
