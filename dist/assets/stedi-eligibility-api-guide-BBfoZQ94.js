var e=`# Healthcare Eligibility Verification (Stedi)\r
\r
## Overview\r
\r
This endpoint verifies a patient's healthcare eligibility by querying a payer (insurance company) through the Stedi medical network. It checks whether a subscriber (patient) is covered under a specific insurance plan and returns eligibility details such as coverage status, benefits, and any errors from the payer.\r
\r
Use this endpoint to confirm insurance coverage before rendering services, especially for mental health, medical, and other service types.\r
\r
## Endpoint\r
\r
| Method | URL |\r
|--------|-----|\r
| \`POST\` | \`https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3\` |\r
\r
## Authentication\r
\r
All requests must include an API key in the \`Authorization\` header.\r
\r
\`\`\`txt\r
Authorization: {{api_key}}\r
\`\`\`\r
\r
Obtain your API key from the [Stedi Dashboard](https://www.stedi.com/app). Store it as the \`api_key\` variable in your Postman environment.\r
\r
## Request Headers\r
\r
| Header | Value | Required | Description |\r
|--------|-------|----------|-------------|\r
| \`Authorization\` | \`{{api_key}}\` | Yes | API key used to authenticate the request |\r
| \`Content-Type\` | \`application/json\` | Yes | Indicates the request body is JSON |\r
\r
## Request Body\r
\r
The request body must be a JSON object with the following fields.\r
\r
### Top-Level Fields\r
\r
| Field | Type | Required | Description |\r
|-------|------|----------|-------------|\r
| \`tradingPartnerServiceId\` | \`string\` | Yes | Payer/trading partner identifier (for example, \`"AHS"\` for Aetna Health Services) |\r
| \`externalPatientId\` | \`string\` | No | Optional internal patient identifier for request/response correlation |\r
\r
### \`encounter\` Object\r
\r
| Field | Type | Required | Description |\r
|-------|------|----------|-------------|\r
| \`encounter.serviceTypeCodes\` | \`string[]\` | Yes | Service type codes, for example \`"30"\`, \`"MH"\`, \`"UC"\` |\r
\r
### \`provider\` Object\r
\r
| Field | Type | Required | Description |\r
|-------|------|----------|-------------|\r
| \`provider.npi\` | \`string\` | Yes | Provider NPI (10-digit identifier) |\r
| \`provider.organizationName\` | \`string\` | No | Provider organization name |\r
\r
### \`subscriber\` Object\r
\r
| Field | Type | Required | Description |\r
|-------|------|----------|-------------|\r
| \`subscriber.memberId\` | \`string\` | Yes | Member ID from insurance card |\r
| \`subscriber.firstName\` | \`string\` | Yes | Subscriber first name |\r
| \`subscriber.lastName\` | \`string\` | Yes | Subscriber last name |\r
| \`subscriber.dateOfBirth\` | \`string\` | Yes | DOB in \`YYYYMMDD\` format |\r
\r
### Example Request Body\r
\r
\`\`\`json\r
{\r
  "encounter": {\r
    "serviceTypeCodes": ["MH"]\r
  },\r
  "externalPatientId": "UAA111222333",\r
  "provider": {\r
    "npi": "1999999984",\r
    "organizationName": "ACME Health Services"\r
  },\r
  "subscriber": {\r
    "dateOfBirth": "19000101",\r
    "firstName": "Chandan",\r
    "lastName": "Nandaram",\r
    "memberId": "W294768382"\r
  },\r
  "tradingPartnerServiceId": "AHS"\r
}\r
\`\`\`\r
\r
## Response\r
\r
### Success Response (\`200 OK\`)\r
\r
A successful response returns eligibility details from the payer, including coverage information, benefits, and plan details.\r
\r
| Field | Type | Description |\r
|-------|------|-------------|\r
| \`status\` | \`string\` | \`"SUCCESS"\` when eligibility data is returned |\r
| \`eligibilitySearchId\` | \`string\` | Unique eligibility search UUID |\r
| \`id\` | \`string\` | Unique transaction identifier (\`ec_\` prefixed) |\r
| \`controlNumber\` | \`string\` | EDI control number |\r
| \`tradingPartnerServiceId\` | \`string\` | Queried payer ID |\r
| \`meta.outboundTraceId\` | \`string\` | Trace ID for debugging/support |\r
\r
### Error Response\r
\r
When the payer returns an error or the request is invalid, the response includes an \`errors\` array.\r
\r
| Field | Type | Description |\r
|-------|------|-------------|\r
| \`status\` | \`string\` | \`"ERROR"\` when request could not be fulfilled |\r
| \`eligibilitySearchId\` | \`string\` | Unique eligibility search UUID |\r
| \`id\` | \`string\` | Unique transaction identifier (\`ec_\` prefixed) |\r
| \`controlNumber\` | \`string\` | EDI control number |\r
| \`tradingPartnerServiceId\` | \`string\` | Queried payer ID |\r
| \`meta.outboundTraceId\` | \`string\` | Trace ID for debugging/support |\r
| \`errors[].code\` | \`string\` | EDI error code |\r
| \`errors[].description\` | \`string\` | Human-readable error description |\r
| \`errors[].followupAction\` | \`string\` | Suggested action |\r
| \`errors[].location\` | \`string\` | EDI segment/loop location |\r
| \`errors[].possibleResolutions\` | \`string\` | Detailed remediation guidance |\r
\r
### Example Error Response\r
\r
\`\`\`json\r
{\r
  "meta": { "outboundTraceId": "01KPQSXW9N32GC4Q2DB66JHAN6" },\r
  "controlNumber": "558493163",\r
  "tradingPartnerServiceId": "AHS",\r
  "errors": [\r
    {\r
      "code": "79",\r
      "description": "Invalid Participant Identification",\r
      "followupAction": "Please Correct and Resubmit",\r
      "location": "2100A",\r
      "possibleResolutions": "Payer AHS is not configured. Please check and resubmit."\r
    }\r
  ],\r
  "status": "ERROR",\r
  "eligibilitySearchId": "019daf9e-f135-7781-bdd1-aeb59c2f5521",\r
  "id": "ec_019daf9e-f135-7781-bdd1-aea041b37d3e"\r
}\r
\`\`\`\r
\r
## Example Request (cURL)\r
\r
\`\`\`bash\r
curl --request POST \\\r
  --url https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3 \\\r
  --header 'Authorization: YOUR_API_KEY' \\\r
  --header 'Content-Type: application/json' \\\r
  --data '{\r
    "encounter": {\r
      "serviceTypeCodes": ["MH"]\r
    },\r
    "externalPatientId": "UAA111222333",\r
    "provider": {\r
      "npi": "1999999984",\r
      "organizationName": "ACME Health Services"\r
    },\r
    "subscriber": {\r
      "dateOfBirth": "19000101",\r
      "firstName": "Chandan",\r
      "lastName": "Nandaram",\r
      "memberId": "W294768382"\r
    },\r
    "tradingPartnerServiceId": "AHS"\r
  }'\r
\`\`\`\r
\r
## Common Error Codes\r
\r
| Code | Description | Resolution |\r
|------|-------------|------------|\r
| \`79\` | Invalid Participant Identification | Verify \`tradingPartnerServiceId\` is correctly configured in Stedi |\r
| \`72\` | Invalid/Missing Subscriber/Insured ID | Validate \`subscriber.memberId\` |\r
| \`75\` | Subscriber Not Found | Validate subscriber name, DOB, and member ID against payer records |\r
\r
## Notes\r
\r
- Date of birth must be in \`YYYYMMDD\` format with no separators.\r
- \`tradingPartnerServiceId\` must be configured for your Stedi account.\r
- NPI is a 10-digit identifier and can be checked at [NPPES NPI Registry](https://npiregistry.cms.hhs.gov/).\r
- Service type code \`"MH"\` is mental health. For other codes see the [X12 service type code list](https://www.stedi.com/edi/x12/element/1365).\r
`;export{e as default};
//# sourceMappingURL=stedi-eligibility-api-guide-BBfoZQ94.js.map