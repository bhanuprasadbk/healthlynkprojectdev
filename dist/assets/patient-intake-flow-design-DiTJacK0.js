var e=`# Patient Intake Flow Design\r
\r
## Goal\r
\r
Define how the patient intake flow currently works in HealthLynk so engineering, QA, and product can align on behavior, dependencies, and extension points.\r
\r
## Scope\r
\r
This document covers:\r
\r
- Public patient intake at \`/patient\`\r
- Provider intake at \`/provider/patient-intake\`\r
- Eligibility submission handoff to result views\r
- Supporting integrations used during intake (payers, NPI, insurance-card OCR)\r
\r
This document does not cover:\r
\r
- Detailed eligibility result rendering logic\r
- Provider dashboard flows outside intake\r
- Authentication internals\r
\r
## Entry Points and Routing\r
\r
- Public route entry is \`ROUTES.PATIENT_HOME\` (\`/patient\`), handled by \`PatientHomeGate\`.\r
- \`PatientHomeGate\` uses auth + location state to decide whether to show patient flow or redirect authenticated users to dashboard.\r
- \`PatientFlow\` renders either:\r
  - \`PatientIntake\` when \`location.state.patientFlow !== 'eligibility'\`\r
  - \`EligibilityResult\` when \`location.state.patientFlow === 'eligibility'\`\r
- Provider/staff intake route is \`ROUTES.PROVIDER_PATIENT_INTAKE\` (\`/provider/patient-intake\`) and uses \`PatientIntake providerMode\`.\r
\r
## Core Screen Architecture\r
\r
\`PatientIntake\` is a two-step form with shared local state:\r
\r
1. **Patient Details step**\r
   - Patient demographics + contact\r
   - Optional SMS opt-in (OTP simulation)\r
   - Subscriber details with "same as patient" sync option\r
   - Insurance details with payer search\r
   - Insurance card upload + OCR extraction modal\r
2. **Service Details step**\r
   - Multi-select service type codes (default includes \`30\`)\r
   - Service date range\r
   - Provider (doctor) search via NPPES and row selection\r
\r
Validation is step-based:\r
\r
- Step 1 validates patient/subscriber/payer requirements.\r
- Step 2 validates service codes, provider identity, NPI format, and date rules.\r
\r
## State Model\r
\r
Primary state groups in \`PatientIntake\`:\r
\r
- **Form state (\`formData\`)**: all intake fields used to build eligibility payload.\r
- **Stepper state**: \`currentStep\` (1 or 2).\r
- **Validation state**: \`errors\` map keyed by form field.\r
- **Subscriber sync state**: \`subscriberSameAsPatient\` toggles bi-directional field updates from patient fields to subscriber fields.\r
- **SMS verification state**: modal visibility, OTP code, sent/verified flags, loading/error flags.\r
- **Insurance card extraction state**: uploaded file, processing flags, parsed person choices, pending OCR result.\r
- **Doctor search state**: result list, loading, no-result, selected row key.\r
- **Payer source state**: remote payer list, loading, and fallback behavior.\r
\r
## External Integrations and Data Sources\r
\r
### 1) Payer list loading\r
\r
On mount and whenever service selection changes:\r
\r
- If active service is \`stedi\`, load payers via \`fetchStediPayers\`.\r
- Else load via \`fetchPverifyPayers\`.\r
- If load fails, show toast and fall back to \`initialPayors\`.\r
\r
Selected payer name is mapped to \`payerCode\` using local lookup from loaded rows.\r
\r
### 2) Insurance card OCR autofill\r
\r
Upload flow:\r
\r
1. User uploads file (JPG/PNG/PDF; drag-drop or picker).\r
2. File is uploaded via \`uploadToCloudinary\`.\r
3. URL is sent to \`analyzeHealthInsuranceCardFromUrl\` (Azure Document Intelligence flow).\r
4. OCR output is mapped using \`mapAzureHealthInsuranceResultToIntakeForm\`.\r
5. If multiple persons are detected, user selects one before applying.\r
6. Mapped values patch intake fields and attempt payer matching via \`matchPverifyPayerForInsurer\`.\r
\r
### 3) Provider (doctor) lookup\r
\r
- Search query combines provider first + last name.\r
- \`searchProviders\` is called against NPPES-backed service.\r
- Results are rendered as selectable table rows from \`getNppesProviderTableRows\`.\r
- Selecting a row applies values with \`applyNppesProviderToFormFields\` and fills:\r
  - \`npi\`\r
  - provider name fields\r
  - practice address\r
  - phone/fax\r
  - taxonomy-derived display fields\r
\r
### 4) Eligibility submission\r
\r
On submit:\r
\r
1. \`submitEligibilityCheck\` chooses backend by \`selectedService\`:\r
   - \`submitPverifyEligibilityCheck\` for pVerify\r
   - \`submitStediEligibilityCheck\` for Stedi\r
2. Request body is built from intake fields (service codes included as multi-select set).\r
3. Raw response is mapped by \`mapPverifyToEligibilityView\`.\r
4. Navigation occurs to:\r
   - provider mode: \`ROUTES.PROVIDER_ELIGIBILITY_RESULT\`\r
   - public mode: \`ROUTES.PATIENT_HOME\` with \`patientFlow: 'eligibility'\`\r
5. Route state includes \`rawResponse\`, \`apiMeta\`, and \`intakeContext\`.\r
\r
## Intake-to-Eligibility Sequence\r
\r
1. User opens intake route.\r
2. Step 1 is completed (or partially autofilled by insurance card OCR).\r
3. User advances to Step 2.\r
4. User selects one or more service type codes, date range, and provider details (manual or NPI search).\r
5. Submit triggers eligibility request.\r
6. On success, app navigates to eligibility result context.\r
7. On failure, toast displays API/user-facing error.\r
\r
## Validation and Error Handling\r
\r
- Required fields enforced per step before progression/submission.\r
- Date constraints:\r
  - DOB cannot be in future.\r
  - \`serviceDateTo >= serviceDateFrom\`.\r
- NPI must be exactly 10 digits.\r
- Payer is invalid if name chosen but \`payerCode\` unresolved.\r
- Integration errors surface as toast messages; most keep user on form with editable state preserved.\r
\r
## UX Notes and Known Constraints\r
\r
- OTP flow is currently simulated (no real SMS backend).\r
- Insurance card upload UI accepts files but does not explicitly enforce max size in code path (copy says 10MB).\r
- Service type code UI is multi-select, but legacy \`cptHcpcCode\` is still maintained for compatibility.\r
- Navigation for public patient flow uses location state, not path changes, to switch between intake and eligibility.\r
\r
## Security and Compliance Considerations\r
\r
- Intake captures PHI/PII (name, DOB, subscriber/member details); transport and storage paths should be reviewed for HIPAA controls.\r
- OCR upload path includes third-party file storage + analysis; BAAs and retention policies should match compliance requirements.\r
- Runtime service credentials are loaded from environment variables and should remain out of client logs and commits.\r
\r
## Future Enhancements (Recommended)\r
\r
- Replace OTP simulation with production SMS verification service.\r
- Add explicit client-side file size checks before upload.\r
- Add analytics/telemetry around abandonment by step and validation type.\r
- Introduce integration health indicators (payer load, NPI availability, OCR status).\r
- Add automated end-to-end tests for:\r
  - subscriber same-as-patient toggles\r
  - multi-person OCR selection\r
  - NPI row selection persistence\r
  - pVerify vs Stedi payload path selection\r
\r
`;export{e as default};
//# sourceMappingURL=patient-intake-flow-design-DiTJacK0.js.map