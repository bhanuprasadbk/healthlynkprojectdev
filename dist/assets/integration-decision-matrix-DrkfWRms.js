var e=`# Integration Decision Matrix (pVerify vs Stedi)\r
\r
Use this matrix to quickly decide which integration to use for each healthcare workflow in HealthLynk.\r
\r
## Decision Table\r
\r
| Use Case | Recommended Provider | Recommended API | Required Inputs | Expected Output |\r
|----------|----------------------|-----------------|-----------------|-----------------|\r
| Map payer names to trading partner IDs before Stedi eligibility calls | Stedi | Payers APIs (\`GET\` list/search/retrieve) | API key, payer name/search term | Trading partner payer ID (for example \`AHS\`) and payer metadata |\r
| Populate payer dropdown during intake | pVerify | \`GET /API/GetAllPayers\` | API credentials, auth token | Normalized payer list (\`payerName\`, \`payerCode\`) |\r
| Real-time eligibility check for known payer code | pVerify | \`POST /api/EligibilitySummary\` (configured via env) | Payer code, subscriber details, provider NPI, service date/type | Eligibility result with active/inactive coverage and request ID |\r
| Download eligibility report PDF by request ID | pVerify | \`GET/POST /API/Report/EligibilityPDFReport/{RequestID}\` | \`RequestID\`, auth headers | PDF blob/report for download and sharing |\r
| Real-time eligibility check using Stedi trading partner model | Stedi | \`POST /change/medicalnetwork/eligibility/v3\` | \`tradingPartnerServiceId\`, subscriber, provider, service type codes | Eligibility response with status, transaction IDs, payer response data |\r
| Batch eligibility processing at higher volume | Stedi | Batch eligibility + poll endpoints | Batch payload, API key | Batch job IDs, status polling, per-check outcomes |\r
| Eligibility report retrieval from Stedi flow | Stedi | \`GET\` Eligibility PDF | Eligibility/search identifier and API key | Eligibility PDF for audit or user download |\r
| Discover insurance when payer/member details are incomplete | Stedi | Insurance Discovery APIs | Patient identity fields per endpoint | Candidate coverage matches and discovery results |\r
| Determine primary/secondary payer responsibility | Stedi | Coordination of Benefits Check | Subscriber/member policy details | COB ordering and responsibility insights |\r
| Claims submission after eligibility confirmation | Stedi | 837 claims submission APIs | Claim payload (professional/dental/institutional), payer routing data | Claim transaction IDs and submission acknowledgment trail |\r
\r
## Quick Selection Rules\r
\r
- Use **pVerify** when the workflow is intake/eligibility-first and already based on \`payerCode\` + \`EligibilitySummary\`.\r
- Use **Stedi** when you need broader clearinghouse capabilities (batch eligibility, claims, COB, discovery, remittance workflows).\r
- For current HealthLynk UI eligibility + PDF actions, **pVerify is the default path**.\r
- Add Stedi paths where network coverage, transaction visibility, or advanced claims workflows are required.\r
\r
## Sample JSON: pVerify Eligibility Request (example shape)\r
\r
\`\`\`json\r
{\r
  "PayerCode": "60054",\r
  "Provider": {\r
    "NPI": "1999999984"\r
  },\r
  "Subscriber": {\r
    "MemberID": "W294768382",\r
    "FirstName": "Chandan",\r
    "LastName": "Nandaram",\r
    "DOB": "01/01/1900"\r
  },\r
  "DOS": "04/22/2026",\r
  "ServiceCodes": ["30", "MH"]\r
}\r
\`\`\`\r
\r
## Sample JSON: Stedi Eligibility Request\r
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
## Notes\r
\r
- Keep credentials and secrets out of frontend bundles in production.\r
- For production-grade integrations, route both providers through backend services with audit logging and retry controls.\r
- Standardize internal response mapping so UI components remain provider-agnostic.\r
- Stedi payer directory reference: [https://healthcare.us.stedi.com/payers](https://healthcare.us.stedi.com/payers)\r
`;export{e as default};
//# sourceMappingURL=integration-decision-matrix-DrkfWRms.js.map