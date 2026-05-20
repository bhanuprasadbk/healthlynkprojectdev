# pVerify User Guide

This guide describes how HealthLynk uses pVerify for payer lookup, eligibility checks, and eligibility PDF retrieval.

## Overview

HealthLynk uses pVerify for:

- OAuth token-based authentication
- Payer list retrieval (`GetAllPayers`)
- Eligibility requests (via configured eligibility path)
- Eligibility PDF report download by `RequestID`

## Environment Setup

Use `.env` and configure these values:

- `VITE_PVERIFY_API_BASE`
- `VITE_PVERIFY_CLIENT_ID`
- `VITE_PVERIFY_CLIENT_SECRET`
- `VITE_PVERIFY_CLIENT_API_ID`
- `VITE_PVERIFY_CLIENT_USER_NAME` (optional)
- `VITE_PVERIFY_ELIGIBILITY_PATH`

## Authentication Flow

1. App requests token from `POST /Token` using `client_credentials`.
2. Access token is cached in memory until near expiry.
3. API calls include:
   - `Authorization: Bearer <access_token>`
   - `Client-API-Id: <client_api_id>`
   - `Content-Type: application/json`
   - `Client-User-Name` (when configured)

## Payer List Retrieval

- Endpoint used: `GET /API/GetAllPayers`
- App normalizes payer rows into:
  - `payerName`
  - `payerCode`
- Duplicate payer names are de-duplicated for dropdown use.

### Why We Use It

Use `GetAllPayers` to populate the payer dropdown in intake/eligibility screens so users select valid payer names and codes supported by pVerify.

### Sample Response JSON (trimmed)

```json
[
  {
    "PayerName": "Aetna",
    "PayerCode": "60054"
  },
  {
    "PayerName": "Blue Cross Blue Shield",
    "PayerCode": "BC001"
  }
]
```

## Eligibility Requests

- Eligibility endpoint path is controlled by `VITE_PVERIFY_ELIGIBILITY_PATH`.
- Typical path example: `/api/EligibilitySummary`
- Request includes subscriber/member details, payer code, provider details, and service information.

### Why We Use It

Use `EligibilitySummary` to validate coverage in real time before services are provided. This helps front-desk and billing teams confirm active insurance and reduce claim denials.

### Sample Request JSON (example shape)

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

### Sample Success JSON (example shape)

```json
{
  "Status": "Success",
  "RequestID": 558493163,
  "PayerName": "Aetna",
  "Subscriber": {
    "MemberID": "W294768382",
    "Active": true
  },
  "Plan": {
    "PlanName": "Commercial PPO"
  }
}
```

## Eligibility PDF Download

- Report path defaults to: `/API/Report/EligibilityPDFReport/{RequestID}`
- App supports retry behavior:
  - token refresh on `401`
  - GET-to-POST fallback when endpoint requires body/header handling

### Why We Use It

Use the PDF endpoint to generate a shareable eligibility report for audit trails, billing records, and user-facing download actions in the eligibility result page.

## Error Handling in App

- Missing env values throw clear setup errors.
- Token/API response parsing errors are surfaced with readable messages.
- Unauthorized responses trigger token cache clear + retry.

## Security Notes

- `VITE_*` values are exposed in browser bundles.
- For production, route pVerify through backend services and keep secrets server-side.
