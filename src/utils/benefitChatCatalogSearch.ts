/**
 * CPT/HCPC benefit-chat catalog search (patient AI result).
 * Matches UI behavior: case-insensitive substring on label or value.
 */
export type BenefitChatCatalogOption = {
  value: string
  label: string
}

/** True when the user wants the full configured catalog (e.g. "All", "all"). */
export function isShowAllCatalogQuery(query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return false
  return normalized === 'all' || normalized.replace(/[^a-z0-9]/g, '') === 'all'
}

export function matchBenefitChatCatalogOptions(
  options: BenefitChatCatalogOption[],
  query: string
): BenefitChatCatalogOption[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  if (isShowAllCatalogQuery(normalized)) return [...options]
  return options.filter((option) => {
    const label = option.label.toLowerCase()
    const value = option.value.toLowerCase()
    return label.includes(normalized) || value.includes(normalized)
  })
}

export function topBenefitChatSuggestionMatches(
  matches: BenefitChatCatalogOption[],
  limit = 8
): BenefitChatCatalogOption[] {
  return matches.slice(0, limit)
}
