# Integration Decision Matrix (pVerify vs Stedi)

Use this matrix to quickly decide which integration to use for each healthcare workflow in HealthLynk.

## Decision Table

| Use Case | Recommended Provider | Recommended API | Required Inputs | Expected Output |
|----------|----------------------|-----------------|-----------------|-----------------|
| Map payer names to trading partner IDs before Stedi eligibility calls | Stedi | Payers APIs (`GET` list/search/retrieve) | API key, payer name/search term | Trading partner payer ID (for example `AHS`) and payer metadata |
| Populate payer dropdown during intake | pVerify | `GET /API/GetAllPayers` | API credentials, auth token | Normalized payer list (`payerName`, `payerCode`) |
| Real-time eligibility check for known payer code | pVerify | `POST /api/EligibilitySummary` (configured via env) | Payer code, subscriber details, provider NPI, service date/type | Eligibility result with active/inactive coverage and request ID |
| Download eligibility report PDF by request ID | pVerify | `GET/POST /API/Report/EligibilityPDFReport/{RequestID}` | `RequestID`, auth headers | PDF blob/report for download and sharing |
| Real-time eligibility check using Stedi trading partner model | Stedi | `POST /change/medicalnetwork/eligibility/v3` | `tradingPartnerServiceId`, subscriber, provider, service type codes | Eligibility response with status, transaction IDs, payer response data |
| Batch eligibility processing at higher volume | Stedi | Batch eligibility + poll endpoints | Batch payload, API key | Batch job IDs, status polling, per-check outcomes |
| Eligibility report retrieval from Stedi flow | Stedi | `GET` Eligibility PDF | Eligibility/search identifier and API key | Eligibility PDF for audit or user download |
| Discover insurance when payer/member details are incomplete | Stedi | Insurance Discovery APIs | Patient identity fields per endpoint | Candidate coverage matches and discovery results |
| Determine primary/secondary payer responsibility | Stedi | Coordination of Benefits Check | Subscriber/member policy details | COB ordering and responsibility insights |
| Claims submission after eligibility confirmation | Stedi | 837 claims submission APIs | Claim payload (professional/dental/institutional), payer routing data | Claim transaction IDs and submission acknowledgment trail |

## Quick Selection Rules

- Use **pVerify** when the workflow is intake/eligibility-first and already based on `payerCode` + `EligibilitySummary`.
- Use **Stedi** when you need broader clearinghouse capabilities (batch eligibility, claims, COB, discovery, remittance workflows).
- For current HealthLynk UI eligibility + PDF actions, **pVerify is the default path**.
- Add Stedi paths where network coverage, transaction visibility, or advanced claims workflows are required.

## Sample JSON: pVerify Eligibility Request (example shape)

```json
{
  "PayerCode": "60054",
  "Provider": {
    "NPI": "1999999984"
  },
  "Subscriber": {
    "MemberID": "W294768382",
    "FirstName": "Chandan",
    "LastName": "Nandaram",
    "DOB": "01/01/1900"
  },
  "DOS": "04/22/2026",
  "ServiceCodes": ["30", "MH"]
}
```

## Sample JSON: Stedi Eligibility Request

```json
{
  "encounter": {
    "serviceTypeCodes": ["MH"]
  },
  "provider": {
    "npi": "1999999984"
  },
  "subscriber": {
    "memberId": "W294768382",
    "firstName": "Chandan",
    "lastName": "Nandaram",
    "dateOfBirth": "19000101"
  },
  "tradingPartnerServiceId": "AHS"
}
```

## Notes

- Keep credentials and secrets out of frontend bundles in production.
- For production-grade integrations, route both providers through backend services with audit logging and retry controls.
- Standardize internal response mapping so UI components remain provider-agnostic.
- Stedi payer directory reference: [https://healthcare.us.stedi.com/payers](https://healthcare.us.stedi.com/payers)
