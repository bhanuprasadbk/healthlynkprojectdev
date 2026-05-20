/**
 * Dashboard chart series only — layout/nav/theme use ThemeContext defaults.
 * Source: Inogen RepairsIQ Device Dashboard reference.
 */
export const repairsiqReferencePalette = {
  chartRed: '#C0392B',
  chartPurple: '#8E44AD',
  chartBlue: '#2980B9',
  chartTeal: '#16A085',
  navActiveOrange: '#F39C12',
  chartTooltipBackground: '#222222',
  chartTooltipText: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#7F8C8D',
  pageBackground: '#F4F7F6',
  cardBackground: '#FFFFFF',
  border: '#E0E0E0',
  successGreen: '#27AE60',
  accentBlue: '#3498DB',
  accentPurple: '#9B59B6',
  accentTurquoise: '#1ABC9C',
  accentOrangeDeep: '#E67E22',
} as const

/** Default series order aligned with reference bar / horizontal-bar charts */
export const repairsiqChartSeriesColors: string[] = [
  repairsiqReferencePalette.chartBlue,
  repairsiqReferencePalette.chartPurple,
  repairsiqReferencePalette.chartTeal,
  repairsiqReferencePalette.chartRed,
  repairsiqReferencePalette.navActiveOrange,
  repairsiqReferencePalette.successGreen,
  repairsiqReferencePalette.accentBlue,
  repairsiqReferencePalette.accentPurple,
  repairsiqReferencePalette.accentTurquoise,
  repairsiqReferencePalette.accentOrangeDeep,
]
