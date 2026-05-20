import { describe, expect, it } from 'vitest'
import {
  isShowAllCatalogQuery,
  matchBenefitChatCatalogOptions,
  topBenefitChatSuggestionMatches,
  type BenefitChatCatalogOption,
} from './benefitChatCatalogSearch'

const sample: BenefitChatCatalogOption[] = [
  {
    value: 'cpt:abc-1%3A99213',
    label: '99213 — Office visit established · CPT',
  },
  {
    value: 'cpt:def-2%3AE0424',
    label: 'E0424 — Oxygen equipment rental · HCPC',
  },
  {
    value: 'cpt:ghi-3%3A70551',
    label: '70551 — MRI brain without contrast · CPT',
  },
]

describe('isShowAllCatalogQuery', () => {
  it('recognizes All variants', () => {
    expect(isShowAllCatalogQuery('All')).toBe(true)
    expect(isShowAllCatalogQuery(' all ')).toBe(true)
    expect(isShowAllCatalogQuery('ALL')).toBe(true)
  })

  it('does not treat partial matches as show-all', () => {
    expect(isShowAllCatalogQuery('allergy')).toBe(false)
    expect(isShowAllCatalogQuery('')).toBe(false)
  })
})

describe('matchBenefitChatCatalogOptions', () => {
  it('returns the full catalog when query is All', () => {
    expect(matchBenefitChatCatalogOptions(sample, 'All')).toEqual(sample)
    expect(matchBenefitChatCatalogOptions(sample, 'all')).toHaveLength(3)
  })

  it('matches CPT code in label', () => {
    const r = matchBenefitChatCatalogOptions(sample, '99213')
    expect(r).toHaveLength(1)
    expect(r[0].label).toContain('99213')
  })

  it('matches description substring (case-insensitive)', () => {
    const r = matchBenefitChatCatalogOptions(sample, 'MRI')
    expect(r).toHaveLength(1)
    expect(r[0].label).toContain('70551')
  })

  it('matches HCPC category token in label', () => {
    const r = matchBenefitChatCatalogOptions(sample, 'hcpc')
    expect(r.length).toBeGreaterThanOrEqual(1)
    expect(r.some((x) => x.label.includes('E0424'))).toBe(true)
  })

  it('matches value substring (encoded id/code in value)', () => {
    const r = matchBenefitChatCatalogOptions(sample, '70551')
    expect(r.some((x) => x.value.includes('70551'))).toBe(true)
  })

  it('returns empty for no match', () => {
    expect(matchBenefitChatCatalogOptions(sample, 'ZZZ999')).toEqual([])
  })

  it('returns empty for blank query', () => {
    expect(matchBenefitChatCatalogOptions(sample, '   ')).toEqual([])
  })

  it('returns multiple when query is broad', () => {
    const r = matchBenefitChatCatalogOptions(sample, 'CPT')
    expect(r.length).toBeGreaterThanOrEqual(2)
  })
})

describe('topBenefitChatSuggestionMatches', () => {
  it('caps at limit', () => {
    const many: BenefitChatCatalogOption[] = Array.from({ length: 12 }, (_, i) => ({
      value: `cpt:x:${i}`,
      label: `Code ${i}`,
    }))
    const all = matchBenefitChatCatalogOptions(many, 'code')
    const top = topBenefitChatSuggestionMatches(all, 8)
    expect(top).toHaveLength(8)
  })
})
