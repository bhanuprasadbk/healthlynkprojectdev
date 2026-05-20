# Healthcare Eligibility Verification (Stedi)

## Overview

This endpoint verifies a patient's healthcare eligibility by querying a payer (insurance company) through the Stedi medical network. It checks whether a subscriber (patient) is covered under a specific insurance plan and returns eligibility details such as coverage status, benefits, and any errors from the payer.

Use this endpoint to confirm insurance coverage before rendering services, especially for mental health, medical, and other service types.

## Endpoint

| Method | URL |
|--------|-----|
| `POST` | `https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3` |

## Authentication

All requests must include an API key in the `Authorization` header.

```txt
Authorization: {{api_key}}
```

Obtain your API key from the [Stedi Dashboard](https://www.stedi.com/app). Store it as the `api_key` variable in your Postman environment.

## Request Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Authorization` | `{{api_key}}` | Yes | API key used to authenticate the request |
| `Content-Type` | `application/json` | Yes | Indicates the request body is JSON |

## Request Body

The request body must be a JSON object with the following fields.

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tradingPartnerServiceId` | `string` | Yes | Payer/trading partner identifier (for example, `"AHS"` for Aetna Health Services) |
| `externalPatientId` | `string` | No | Optional internal patient identifier for request/response correlation |

### `encounter` Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `encounter.serviceTypeCodes` | `string[]` | Yes | Service type codes, for example `"30"`, `"MH"`, `"UC"` |

### `provider` Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider.npi` | `string` | Yes | Provider NPI (10-digit identifier) |
| `provider.organizationName` | `string` | No | Provider organization name |

### `subscriber` Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscriber.memberId` | `string` | Yes | Member ID from insurance card |
| `subscriber.firstName` | `string` | Yes | Subscriber first name |
| `subscriber.lastName` | `string` | Yes | Subscriber last name |
| `subscriber.dateOfBirth` | `string` | Yes | DOB in `YYYYMMDD` format |

### Example Request Body

```json
{
  "encounter": {
    "serviceTypeCodes": ["MH"]
  },
  "externalPatientId": "UAA111222333",
  "provider": {
    "npi": "1999999984",
    "organizationName": "ACME Health Services"
  },
  "subscriber": {
    "dateOfBirth": "19000101",
    "firstName": "Chandan",
    "lastName": "Nandaram",
    "memberId": "W294768382"
  },
  "tradingPartnerServiceId": "AHS"
}
```

## Response

### Success Response (`200 OK`)

A successful response returns eligibility details from the payer, including coverage information, benefits, and plan details.

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | `"SUCCESS"` when eligibility data is returned |
| `eligibilitySearchId` | `string` | Unique eligibility search UUID |
| `id` | `string` | Unique transaction identifier (`ec_` prefixed) |
| `controlNumber` | `string` | EDI control number |
| `tradingPartnerServiceId` | `string` | Queried payer ID |
| `meta.outboundTraceId` | `string` | Trace ID for debugging/support |

### Error Response

When the payer returns an error or the request is invalid, the response includes an `errors` array.

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | `"ERROR"` when request could not be fulfilled |
| `eligibilitySearchId` | `string` | Unique eligibility search UUID |
| `id` | `string` | Unique transaction identifier (`ec_` prefixed) |
| `controlNumber` | `string` | EDI control number |
| `tradingPartnerServiceId` | `string` | Queried payer ID |
| `meta.outboundTraceId` | `string` | Trace ID for debugging/support |
| `errors[].code` | `string` | EDI error code |
| `errors[].description` | `string` | Human-readable error description |
| `errors[].followupAction` | `string` | Suggested action |
| `errors[].location` | `string` | EDI segment/loop location |
| `errors[].possibleResolutions` | `string` | Detailed remediation guidance |

### Example Error Response

```json
{
  "meta": { "outboundTraceId": "01KPQSXW9N32GC4Q2DB66JHAN6" },
  "controlNumber": "558493163",
  "tradingPartnerServiceId": "AHS",
  "errors": [
    {
      "code": "79",
      "description": "Invalid Participant Identification",
      "followupAction": "Please Correct and Resubmit",
      "location": "2100A",
      "possibleResolutions": "Payer AHS is not configured. Please check and resubmit."
    }
  ],
  "status": "ERROR",
  "eligibilitySearchId": "019daf9e-f135-7781-bdd1-aeb59c2f5521",
  "id": "ec_019daf9e-f135-7781-bdd1-aea041b37d3e"
}
```

## Example Request (cURL)

```bash
curl --request POST \
  --url https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3 \
  --header 'Authorization: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "encounter": {
      "serviceTypeCodes": ["MH"]
    },
    "externalPatientId": "UAA111222333",
    "provider": {
      "npi": "1999999984",
      "organizationName": "ACME Health Services"
    },
    "subscriber": {
      "dateOfBirth": "19000101",
      "firstName": "Chandan",
      "lastName": "Nandaram",
      "memberId": "W294768382"
    },
    "tradingPartnerServiceId": "AHS"
  }'
```

## Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `79` | Invalid Participant Identification | Verify `tradingPartnerServiceId` is correctly configured in Stedi |
| `72` | Invalid/Missing Subscriber/Insured ID | Validate `subscriber.memberId` |
| `75` | Subscriber Not Found | Validate subscriber name, DOB, and member ID against payer records |

## Notes

- Date of birth must be in `YYYYMMDD` format with no separators.
- `tradingPartnerServiceId` must be configured for your Stedi account.
- NPI is a 10-digit identifier and can be checked at [NPPES NPI Registry](https://npiregistry.cms.hhs.gov/).
- Service type code `"MH"` is mental health. For other codes see the [X12 service type code list](https://www.stedi.com/edi/x12/element/1365).
