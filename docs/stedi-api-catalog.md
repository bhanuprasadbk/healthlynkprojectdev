# Stedi API Catalog (Healthcare)

This catalog summarizes Stedi healthcare APIs that we may use in HealthLynk as integration needs grow.

Source reference: [Stedi Healthcare API Reference](https://www.stedi.com/docs/healthcare/api-reference)

## Authentication

- All requests require `Authorization` header with a Stedi API key.
- Stedi supports test and production API keys.
- Some test-mode capabilities are endpoint-specific (for example, real-time eligibility test workflows).

## Eligibility and Benefits

### Eligibility Checks (X12 270/271)

- `POST` Real-Time Eligibility Check JSON
- `POST` Real-Time Eligibility Check Raw X12
- `POST` Real-Time Eligibility Check SOAP
- `POST` Batch Eligibility Check
- `GET` Retrieve Batch Status
- `GET` Retrieve Batch Check Statuses
- `GET` Poll Batch Checks
- `GET` Eligibility PDF

#### Why We Use It

- Primary API for real-time eligibility verification when we need payer-authoritative coverage status.
- Useful when expanding beyond pVerify-specific payers or using Stedi-native workflows.

#### Sample Request JSON (Real-Time Eligibility)

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

#### Sample Success JSON (trimmed)

```json
{
  "status": "SUCCESS",
  "eligibilitySearchId": "019daf9e-f135-7781-bdd1-aeb59c2f5521",
  "id": "ec_019daf9e-f135-7781-bdd1-aea041b37d3e",
  "tradingPartnerServiceId": "AHS"
}
```

### Insurance Discovery

- `POST` Insurance Discovery Check
- `GET` Insurance Discovery Check Results

#### Why We Use It

Use insurance discovery when user-provided payer/member data is incomplete and we need to identify likely active coverage options.

### Coordination of Benefits

- `POST` Coordination of Benefits Check

#### Why We Use It

Use COB checks when multiple coverages exist and claim/billing order determination is required.

## Claims Processing

### Claim Submission (X12 837)

- `POST` Professional Claims JSON
- `POST` Professional Claims Raw X12
- `POST` Dental Claims JSON
- `POST` Dental Claims Raw X12
- `POST` Institutional Claims JSON
- `POST` Institutional Claims Raw X12
- `GET` CMS-1500 PDF (Business Identifier)
- `GET` CMS-1500 PDF (Transaction ID)

#### Why We Use It

Use these APIs for full claim lifecycle automation once eligibility verification is complete and services are ready for submission.

### Attachments (X12 275)

- `POST` Create Claim Attachment JSON
- `POST` Submit Claim Attachment Raw X12

#### Why We Use It

Use attachments for claim-supporting documents (clinical records or supplemental docs) required by payers.

### Claim Acknowledgments (X12 277CA)

- `GET` 277 Claim Acknowledgment Report

#### Why We Use It

Use 277CA to detect claim acceptance/rejection early and route work queues for correction.

### Remittances (X12 835 ERA)

- `GET` 835 ERA Report
- `GET` 835 ERA PDF

#### Why We Use It

Use ERA endpoints to reconcile payments, denials, and adjustments in finance workflows.

### Real-Time Claim Status (X12 276/277)

- `POST` Real-Time Claim Status JSON
- `POST` Real-Time Claim Status Raw X12

#### Why We Use It

Use claim status APIs for post-submission visibility without waiting for manual payer follow-up.

## Payers, Providers, and Enrollments

### Payers

- `GET` Retrieve Payer
- `GET` List Payers JSON
- `GET` List Payers CSV
- `GET` Search Payers

#### Base URL

- `https://healthcare.us.stedi.com/payers`

#### Why We Use It

Use payer search/list APIs to map payer names to supported trading partners before eligibility or claims calls.

#### Sample JSON (List/Search response shape)

```json
{
  "items": [
    {
      "id": "AHS",
      "name": "Aetna Health Services",
      "aliases": ["Aetna"],
      "is_active": true
    },
    {
      "id": "BCBS",
      "name": "Blue Cross Blue Shield",
      "is_active": true
    }
  ],
  "next_page_token": "2t7M75ZN1w4OnYFKKT0SUkT95w_ULzPR"
}
```

### Providers

- `POST` Create Provider
- `GET` Retrieve Provider
- `GET` List Providers
- `POST` Update Provider
- `DELETE` Delete Provider

### Enrollments

- `POST` Create Enrollment
- `GET` Retrieve Enrollment
- `GET` Download Document
- `GET` List Enrollments
- `POST` Update Enrollment
- `POST` Update Task
- `POST` Upload Document
- `DELETE` Delete Enrollment
- `DELETE` Delete Document

## Transaction Data and Events

### Transaction Data

- `GET` Poll Transactions
- `GET` List Transactions
- `GET` Transaction
- `GET` Transaction Input
- `GET` File Execution Input
- `GET` Transaction Output

### Events

- `GET` Retrieve Event
- `GET` List Events

## Operational Notes for HealthLynk

- Start with real-time eligibility JSON and eligibility PDF APIs for immediate value.
- For volume use-cases, consider batch eligibility and polling endpoints.
- Respect concurrency limits and handle `429` with retry/backoff.
- For PHI workflows, use HIPAA-conscious local tooling and avoid unsafe cloud history defaults.
- Keep API keys in secure server-side infrastructure for production integrations.

## References

- [Stedi Healthcare API Reference](https://www.stedi.com/docs/healthcare/api-reference)
- [Stedi Payers](https://healthcare.us.stedi.com/payers)
