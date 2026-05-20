var e=`# pVerify User Guide\r
\r
This guide describes how HealthLynk uses pVerify for payer lookup, eligibility checks, and eligibility PDF retrieval.\r
\r
## Overview\r
\r
HealthLynk uses pVerify for:\r
\r
- OAuth token-based authentication\r
- Payer list retrieval (\`GetAllPayers\`)\r
- Eligibility requests (via configured eligibility path)\r
- Eligibility PDF report download by \`RequestID\`\r
\r
## Environment Setup\r
\r
Use \`.env\` and configure these values:\r
\r
- \`VITE_PVERIFY_API_BASE\`\r
- \`VITE_PVERIFY_CLIENT_ID\`\r
- \`VITE_PVERIFY_CLIENT_SECRET\`\r
- \`VITE_PVERIFY_CLIENT_API_ID\`\r
- \`VITE_PVERIFY_CLIENT_USER_NAME\` (optional)\r
- \`VITE_PVERIFY_ELIGIBILITY_PATH\`\r
\r
## Authentication Flow\r
\r
1. App requests token from \`POST /Token\` using \`client_credentials\`.\r
2. Access token is cached in memory until near expiry.\r
3. API calls include:\r
   - \`Authorization: Bearer <access_token>\`\r
   - \`Client-API-Id: <client_api_id>\`\r
   - \`Content-Type: application/json\`\r
   - \`Client-User-Name\` (when configured)\r
\r
## Payer List Retrieval\r
\r
- Endpoint used: \`GET /API/GetAllPayers\`\r
- App normalizes payer rows into:\r
  - \`payerName\`\r
  - \`payerCode\`\r
- Duplicate payer names are de-duplicated for dropdown use.\r
\r
### Why We Use It\r
\r
Use \`GetAllPayers\` to populate the payer dropdown in intake/eligibility screens so users select valid payer names and codes supported by pVerify.\r
\r
### Sample Response JSON (trimmed)\r
\r
\`\`\`json\r
[\r
  {\r
    "PayerName": "Aetna",\r
    "PayerCode": "60054"\r
  },\r
  {\r
    "PayerName": "Blue Cross Blue Shield",\r
    "PayerCode": "BC001"\r
  }\r
]\r
\`\`\`\r
\r
## Eligibility Requests\r
\r
- Eligibility endpoint path is controlled by \`VITE_PVERIFY_ELIGIBILITY_PATH\`.\r
- Typical path example: \`/api/EligibilitySummary\`\r
- Request includes subscriber/member details, payer code, provider details, and service information.\r
\r
### Why We Use It\r
\r
Use \`EligibilitySummary\` to validate coverage in real time before services are provided. This helps front-desk and billing teams confirm active insurance and reduce claim denials.\r
\r
### Sample Request JSON (example shape)\r
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
### Sample Success JSON (example shape)\r
\r
\`\`\`json\r
{\r
  "Status": "Success",\r
  "RequestID": 558493163,\r
  "PayerName": "Aetna",\r
  "Subscriber": {\r
    "MemberID": "W294768382",\r
    "Active": true\r
  },\r
  "Plan": {\r
    "PlanName": "Commercial PPO"\r
  }\r
}\r
\`\`\`\r
\r
## Eligibility PDF Download\r
\r
- Report path defaults to: \`/API/Report/EligibilityPDFReport/{RequestID}\`\r
- App supports retry behavior:\r
  - token refresh on \`401\`\r
  - GET-to-POST fallback when endpoint requires body/header handling\r
\r
### Why We Use It\r
\r
Use the PDF endpoint to generate a shareable eligibility report for audit trails, billing records, and user-facing download actions in the eligibility result page.\r
\r
## Error Handling in App\r
\r
- Missing env values throw clear setup errors.\r
- Token/API response parsing errors are surfaced with readable messages.\r
- Unauthorized responses trigger token cache clear + retry.\r
\r
## Security Notes\r
\r
- \`VITE_*\` values are exposed in browser bundles.\r
- For production, route pVerify through backend services and keep secrets server-side.\r
`;export{e as default};
//# sourceMappingURL=pverify-user-guide-2n70xMje.js.map