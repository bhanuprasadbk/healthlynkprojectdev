var e=`# Stedi API Catalog (Healthcare)\r
\r
This catalog summarizes Stedi healthcare APIs that we may use in HealthLynk as integration needs grow.\r
\r
Source reference: [Stedi Healthcare API Reference](https://www.stedi.com/docs/healthcare/api-reference)\r
\r
## Authentication\r
\r
- All requests require \`Authorization\` header with a Stedi API key.\r
- Stedi supports test and production API keys.\r
- Some test-mode capabilities are endpoint-specific (for example, real-time eligibility test workflows).\r
\r
## Eligibility and Benefits\r
\r
### Eligibility Checks (X12 270/271)\r
\r
- \`POST\` Real-Time Eligibility Check JSON\r
- \`POST\` Real-Time Eligibility Check Raw X12\r
- \`POST\` Real-Time Eligibility Check SOAP\r
- \`POST\` Batch Eligibility Check\r
- \`GET\` Retrieve Batch Status\r
- \`GET\` Retrieve Batch Check Statuses\r
- \`GET\` Poll Batch Checks\r
- \`GET\` Eligibility PDF\r
\r
#### Why We Use It\r
\r
- Primary API for real-time eligibility verification when we need payer-authoritative coverage status.\r
- Useful when expanding beyond pVerify-specific payers or using Stedi-native workflows.\r
\r
#### Sample Request JSON (Real-Time Eligibility)\r
\r
\`\`\`json\r
{\r
  "encounter": {\r
    "serviceTypeCodes": ["MH"]\r
  },\r
  "provider": {\r
    "npi": "1999999984"\r
  },\r
  "subscriber": {\r
    "memberId": "W294768382",\r
    "firstName": "Chandan",\r
    "lastName": "Nandaram",\r
    "dateOfBirth": "19000101"\r
  },\r
  "tradingPartnerServiceId": "AHS"\r
}\r
\`\`\`\r
\r
#### Sample Success JSON (trimmed)\r
\r
\`\`\`json\r
{\r
  "status": "SUCCESS",\r
  "eligibilitySearchId": "019daf9e-f135-7781-bdd1-aeb59c2f5521",\r
  "id": "ec_019daf9e-f135-7781-bdd1-aea041b37d3e",\r
  "tradingPartnerServiceId": "AHS"\r
}\r
\`\`\`\r
\r
### Insurance Discovery\r
\r
- \`POST\` Insurance Discovery Check\r
- \`GET\` Insurance Discovery Check Results\r
\r
#### Why We Use It\r
\r
Use insurance discovery when user-provided payer/member data is incomplete and we need to identify likely active coverage options.\r
\r
### Coordination of Benefits\r
\r
- \`POST\` Coordination of Benefits Check\r
\r
#### Why We Use It\r
\r
Use COB checks when multiple coverages exist and claim/billing order determination is required.\r
\r
## Claims Processing\r
\r
### Claim Submission (X12 837)\r
\r
- \`POST\` Professional Claims JSON\r
- \`POST\` Professional Claims Raw X12\r
- \`POST\` Dental Claims JSON\r
- \`POST\` Dental Claims Raw X12\r
- \`POST\` Institutional Claims JSON\r
- \`POST\` Institutional Claims Raw X12\r
- \`GET\` CMS-1500 PDF (Business Identifier)\r
- \`GET\` CMS-1500 PDF (Transaction ID)\r
\r
#### Why We Use It\r
\r
Use these APIs for full claim lifecycle automation once eligibility verification is complete and services are ready for submission.\r
\r
### Attachments (X12 275)\r
\r
- \`POST\` Create Claim Attachment JSON\r
- \`POST\` Submit Claim Attachment Raw X12\r
\r
#### Why We Use It\r
\r
Use attachments for claim-supporting documents (clinical records or supplemental docs) required by payers.\r
\r
### Claim Acknowledgments (X12 277CA)\r
\r
- \`GET\` 277 Claim Acknowledgment Report\r
\r
#### Why We Use It\r
\r
Use 277CA to detect claim acceptance/rejection early and route work queues for correction.\r
\r
### Remittances (X12 835 ERA)\r
\r
- \`GET\` 835 ERA Report\r
- \`GET\` 835 ERA PDF\r
\r
#### Why We Use It\r
\r
Use ERA endpoints to reconcile payments, denials, and adjustments in finance workflows.\r
\r
### Real-Time Claim Status (X12 276/277)\r
\r
- \`POST\` Real-Time Claim Status JSON\r
- \`POST\` Real-Time Claim Status Raw X12\r
\r
#### Why We Use It\r
\r
Use claim status APIs for post-submission visibility without waiting for manual payer follow-up.\r
\r
## Payers, Providers, and Enrollments\r
\r
### Payers\r
\r
- \`GET\` Retrieve Payer\r
- \`GET\` List Payers JSON\r
- \`GET\` List Payers CSV\r
- \`GET\` Search Payers\r
\r
#### Base URL\r
\r
- \`https://healthcare.us.stedi.com/payers\`\r
\r
#### Why We Use It\r
\r
Use payer search/list APIs to map payer names to supported trading partners before eligibility or claims calls.\r
\r
#### Sample JSON (List/Search response shape)\r
\r
\`\`\`json\r
{\r
  "items": [\r
    {\r
      "id": "AHS",\r
      "name": "Aetna Health Services",\r
      "aliases": ["Aetna"],\r
      "is_active": true\r
    },\r
    {\r
      "id": "BCBS",\r
      "name": "Blue Cross Blue Shield",\r
      "is_active": true\r
    }\r
  ],\r
  "next_page_token": "2t7M75ZN1w4OnYFKKT0SUkT95w_ULzPR"\r
}\r
\`\`\`\r
\r
### Providers\r
\r
- \`POST\` Create Provider\r
- \`GET\` Retrieve Provider\r
- \`GET\` List Providers\r
- \`POST\` Update Provider\r
- \`DELETE\` Delete Provider\r
\r
### Enrollments\r
\r
- \`POST\` Create Enrollment\r
- \`GET\` Retrieve Enrollment\r
- \`GET\` Download Document\r
- \`GET\` List Enrollments\r
- \`POST\` Update Enrollment\r
- \`POST\` Update Task\r
- \`POST\` Upload Document\r
- \`DELETE\` Delete Enrollment\r
- \`DELETE\` Delete Document\r
\r
## Transaction Data and Events\r
\r
### Transaction Data\r
\r
- \`GET\` Poll Transactions\r
- \`GET\` List Transactions\r
- \`GET\` Transaction\r
- \`GET\` Transaction Input\r
- \`GET\` File Execution Input\r
- \`GET\` Transaction Output\r
\r
### Events\r
\r
- \`GET\` Retrieve Event\r
- \`GET\` List Events\r
\r
## Operational Notes for HealthLynk\r
\r
- Start with real-time eligibility JSON and eligibility PDF APIs for immediate value.\r
- For volume use-cases, consider batch eligibility and polling endpoints.\r
- Respect concurrency limits and handle \`429\` with retry/backoff.\r
- For PHI workflows, use HIPAA-conscious local tooling and avoid unsafe cloud history defaults.\r
- Keep API keys in secure server-side infrastructure for production integrations.\r
\r
## References\r
\r
- [Stedi Healthcare API Reference](https://www.stedi.com/docs/healthcare/api-reference)\r
- [Stedi Payers](https://healthcare.us.stedi.com/payers)\r
`;export{e as default};
//# sourceMappingURL=stedi-api-catalog-D4L2sEob.js.map