import { describe, expect, it } from 'vitest'
import {
  getEligibilityByProductSlugs,
  serviceTypeLabel,
  SERVICE_LABELS,
} from './getEligibilityByProductSlugs'

const baseRaw: Record<string, unknown> = {
  ProcessedWithError: false,
  EDIErrorMessage: '',
  DMESummary: {
    ServiceCoveredInNet: 'YES',
    ServiceCoveredOutNet: 'NO',
    CoPayInNet: { Value: '$25.00' },
    CoInsInNet: '20%',
  },
  HBPC_Deductible_OOP_Summary: {
    IndividualDeductibleInNet: { Value: '$500.00' },
    IndividualDeductibleRemainingInNet: { Value: '$250.00' },
    IndividualOOP_InNet: { Value: '$5000.00' },
    IndividualOOPRemainingInNet: { Value: '$3500.00' },
  },
  StediApiCall: {
    requestBody: {
      encounter: {
        serviceTypeCodes: ['11', '12', '18', '30'],
      },
    },
  },
  benefitsInformation: [
    {
      code: 'A',
      name: 'Co-Insurance',
      serviceTypeCodes: ['11', '12'],
      benefitPercent: '20',
    },
    {
      code: 'B',
      name: 'Co-Payment',
      serviceTypeCodes: ['18'],
      benefitAmount: '50',
    },
  ],
}

describe('SERVICE_LABELS / serviceTypeLabel', () => {
  it('maps known DME codes', () => {
    expect(SERVICE_LABELS['11']).toBe('Used durable medical equipment')
    expect(SERVICE_LABELS['12']).toBe('DME purchase')
    expect(SERVICE_LABELS['18']).toBe('DME rental')
  })

  it('falls back for unknown codes', () => {
    expect(serviceTypeLabel('99')).toBe('Physician Inpatient Visit')
  })
})

describe('getEligibilityByProductSlugs', () => {
  it('filters encounter serviceTypeCodes by productSlugs', () => {
    const results = getEligibilityByProductSlugs(baseRaw, ['11', '18'])
    expect(results.map((r) => r.serviceCode)).toEqual(['11', '18'])
    expect(results[0].serviceType).toBe('Used durable medical equipment')
    expect(results[1].serviceType).toBe('DME rental')
  })

  it('maps summary fields with optional chaining', () => {
    const [r] = getEligibilityByProductSlugs(baseRaw, ['11'])
    expect(r.coveredInNet).toBe('YES')
    expect(r.coveredOutNet).toBe('NO')
    expect(r.coPayInNet).toBe('$25.00')
    expect(r.coInsInNet).toBe('20%')
    expect(r.deductible).toBe('$500.00')
    expect(r.deductibleRemaining).toBe('$250.00')
    expect(r.oop).toBe('$5000.00')
    expect(r.oopRemaining).toBe('$3500.00')
    expect(r.hasError).toBe(false)
    expect(r.errorCode).toBeUndefined()
  })

  it('attaches benefitsInformation rows that include the service code', () => {
    const [r11, r18] = getEligibilityByProductSlugs(baseRaw, ['11', '18'])
    expect(r11.benefits).toHaveLength(1)
    expect(r11.benefits?.[0].code).toBe('A')
    expect(r18.benefits).toHaveLength(1)
    expect(r18.benefits?.[0].code).toBe('B')
  })

  it('omits benefits when no benefitsInformation row matches the code', () => {
    const raw = {
      ...baseRaw,
      StediApiCall: {
        requestBody: { encounter: { serviceTypeCodes: ['12'] } },
      },
      benefitsInformation: [{ code: 'A', serviceTypeCodes: ['11'] }],
    }
    const [r12] = getEligibilityByProductSlugs(raw, ['12'])
    expect(r12.benefits).toBeUndefined()
  })

  it('handles partial / error payloads without throwing', () => {
    const results = getEligibilityByProductSlugs(
      {
        ProcessedWithError: true,
        EDIErrorMessage: 'AAA:72',
        StediApiCall: { requestBody: { encounter: { serviceTypeCodes: ['11'] } } },
      },
      ['11']
    )
    expect(results).toHaveLength(1)
    expect(results[0].hasError).toBe(true)
    expect(results[0].errorCode).toBe('AAA:72')
    expect(results[0].coveredInNet).toBeUndefined()
    expect(results[0].deductible).toBeUndefined()
  })

  it('returns empty when encounter codes are not in productSlugs', () => {
    expect(getEligibilityByProductSlugs(baseRaw, ['99'])).toEqual([])
  })

  it('uses all requested encounter codes when productSlugs is empty', () => {
    const results = getEligibilityByProductSlugs(baseRaw, [])
    expect(results.map((r) => r.serviceCode)).toEqual(['11', '12', '18'])
  })

  it('extracts per-code coinsurance from benefitsInformation', () => {
    const [r11] = getEligibilityByProductSlugs(baseRaw, ['11'])
    expect(r11.coInsInNet).toBe('20%')
    const [r18] = getEligibilityByProductSlugs(baseRaw, ['18'])
    expect(r18.coPayInNet).toBe('$50.00')
  })

  it('reads benefitsInformation from StediRawResponse when top-level is absent', () => {
    const raw = {
      ...baseRaw,
      benefitsInformation: undefined,
      StediRawResponse: { benefitsInformation: baseRaw.benefitsInformation },
    }
    const [r] = getEligibilityByProductSlugs(raw, ['11'])
    expect(r.benefits).toHaveLength(1)
  })
})
