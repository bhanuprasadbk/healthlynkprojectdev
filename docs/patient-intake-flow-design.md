# Patient Intake Flow Design

## Goal

Define how the patient intake flow currently works in HealthLynk so engineering, QA, and product can align on behavior, dependencies, and extension points.

## Scope

This document covers:

- Public patient intake at `/patient`
- Provider intake at `/provider/patient-intake`
- Eligibility submission handoff to result views
- Supporting integrations used during intake (payers, NPI, insurance-card OCR)

This document does not cover:

- Detailed eligibility result rendering logic
- Provider dashboard flows outside intake
- Authentication internals

## Entry Points and Routing

- Public route entry is `ROUTES.PATIENT_HOME` (`/patient`), handled by `PatientHomeGate`.
- `PatientHomeGate` uses auth + location state to decide whether to show patient flow or redirect authenticated users to dashboard.
- `PatientFlow` renders either:
  - `PatientIntake` when `location.state.patientFlow !== 'eligibility'`
  - `EligibilityResult` when `location.state.patientFlow === 'eligibility'`
- Provider/staff intake route is `ROUTES.PROVIDER_PATIENT_INTAKE` (`/provider/patient-intake`) and uses `PatientIntake providerMode`.

## Core Screen Architecture

`PatientIntake` is a two-step form with shared local state:

1. **Patient Details step**
   - Patient demographics + contact
   - Optional SMS opt-in (OTP simulation)
   - Subscriber details with "same as patient" sync option
   - Insurance details with payer search
   - Insurance card upload + OCR extraction modal
2. **Service Details step**
   - Multi-select service type codes (default includes `30`)
   - Service date range
   - Provider (doctor) search via NPPES and row selection

Validation is step-based:

- Step 1 validates patient/subscriber/payer requirements.
- Step 2 validates service codes, provider identity, NPI format, and date rules.

## State Model

Primary state groups in `PatientIntake`:

- **Form state (`formData`)**: all intake fields used to build eligibility payload.
- **Stepper state**: `currentStep` (1 or 2).
- **Validation state**: `errors` map keyed by form field.
- **Subscriber sync state**: `subscriberSameAsPatient` toggles bi-directional field updates from patient fields to subscriber fields.
- **SMS verification state**: modal visibility, OTP code, sent/verified flags, loading/error flags.
- **Insurance card extraction state**: uploaded file, processing flags, parsed person choices, pending OCR result.
- **Doctor search state**: result list, loading, no-result, selected row key.
- **Payer source state**: remote payer list, loading, and fallback behavior.

## External Integrations and Data Sources

### 1) Payer list loading

On mount and whenever service selection changes:

- If active service is `stedi`, load payers via `fetchStediPayers`.
- Else load via `fetchPverifyPayers`.
- If load fails, show toast and fall back to `initialPayors`.

Selected payer name is mapped to `payerCode` using local lookup from loaded rows.

### 2) Insurance card OCR autofill

Upload flow:

1. User uploads file (JPG/PNG/PDF; drag-drop or picker).
2. File is uploaded via `uploadToCloudinary`.
3. URL is sent to `analyzeHealthInsuranceCardFromUrl` (Azure Document Intelligence flow).
4. OCR output is mapped using `mapAzureHealthInsuranceResultToIntakeForm`.
5. If multiple persons are detected, user selects one before applying.
6. Mapped values patch intake fields and attempt payer matching via `matchPverifyPayerForInsurer`.

### 3) Provider (doctor) lookup

- Search query combines provider first + last name.
- `searchProviders` is called against NPPES-backed service.
- Results are rendered as selectable table rows from `getNppesProviderTableRows`.
- Selecting a row applies values with `applyNppesProviderToFormFields` and fills:
  - `npi`
  - provider name fields
  - practice address
  - phone/fax
  - taxonomy-derived display fields

### 4) Eligibility submission

On submit:

1. `submitEligibilityCheck` chooses backend by `selectedService`:
   - `submitPverifyEligibilityCheck` for pVerify
   - `submitStediEligibilityCheck` for Stedi
2. Request body is built from intake fields (service codes included as multi-select set).
3. Raw response is mapped by `mapPverifyToEligibilityView`.
4. Navigation occurs to:
   - provider mode: `ROUTES.PROVIDER_ELIGIBILITY_RESULT`
   - public mode: `ROUTES.PATIENT_HOME` with `patientFlow: 'eligibility'`
5. Route state includes `rawResponse`, `apiMeta`, and `intakeContext`.

## Intake-to-Eligibility Sequence

1. User opens intake route.
2. Step 1 is completed (or partially autofilled by insurance card OCR).
3. User advances to Step 2.
4. User selects one or more service type codes, date range, and provider details (manual or NPI search).
5. Submit triggers eligibility request.
6. On success, app navigates to eligibility result context.
7. On failure, toast displays API/user-facing error.

## Validation and Error Handling

- Required fields enforced per step before progression/submission.
- Date constraints:
  - DOB cannot be in future.
  - `serviceDateTo >= serviceDateFrom`.
- NPI must be exactly 10 digits.
- Payer is invalid if name chosen but `payerCode` unresolved.
- Integration errors surface as toast messages; most keep user on form with editable state preserved.

## UX Notes and Known Constraints

- OTP flow is currently simulated (no real SMS backend).
- Insurance card upload UI accepts files but does not explicitly enforce max size in code path (copy says 10MB).
- Service type code UI is multi-select, but legacy `cptHcpcCode` is still maintained for compatibility.
- Navigation for public patient flow uses location state, not path changes, to switch between intake and eligibility.

## Security and Compliance Considerations

- Intake captures PHI/PII (name, DOB, subscriber/member details); transport and storage paths should be reviewed for HIPAA controls.
- OCR upload path includes third-party file storage + analysis; BAAs and retention policies should match compliance requirements.
- Runtime service credentials are loaded from environment variables and should remain out of client logs and commits.

## Future Enhancements (Recommended)

- Replace OTP simulation with production SMS verification service.
- Add explicit client-side file size checks before upload.
- Add analytics/telemetry around abandonment by step and validation type.
- Introduce integration health indicators (payer load, NPI availability, OCR status).
- Add automated end-to-end tests for:
  - subscriber same-as-patient toggles
  - multi-person OCR selection
  - NPI row selection persistence
  - pVerify vs Stedi payload path selection

