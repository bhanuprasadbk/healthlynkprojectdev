CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(120) UNIQUE NOT NULL,
    password_hash TEXT NULL,
    display_name VARCHAR(120) NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'caregiver',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sso_provider VARCHAR(120) NULL,
    sso_subject VARCHAR(255) UNIQUE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payors (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payor_plans (
    id VARCHAR(36) PRIMARY KEY,
    payor_id VARCHAR(36) NOT NULL REFERENCES payors(id) ON DELETE CASCADE,
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(60) NOT NULL,
    auto_check_frequency VARCHAR(60) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS providers (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    npi VARCHAR(10) UNIQUE NOT NULL,
    fax_number VARCHAR(40) NULL,
    pin VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_locations (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(36) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    location_name VARCHAR(255) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_payor_plan_maps (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(36) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    payor_id VARCHAR(36) NOT NULL REFERENCES payors(id) ON DELETE CASCADE,
    plan_id VARCHAR(36) NOT NULL REFERENCES payor_plans(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_service_types (
    slug VARCHAR(80) PRIMARY KEY,
    label VARCHAR(120) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cpt_hcpc_codes (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    category VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    authorization_required BOOLEAN NOT NULL DEFAULT FALSE,
    product_service_slug VARCHAR(80) NOT NULL REFERENCES product_service_types(slug),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payor_plan_cpt_rules (
    id VARCHAR(36) PRIMARY KEY,
    plan_id VARCHAR(36) NOT NULL REFERENCES payor_plans(id) ON DELETE CASCADE,
    cpt_hcpc_code_id VARCHAR(36) NOT NULL REFERENCES cpt_hcpc_codes(id) ON DELETE CASCADE,
    authorization_required BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    external_ref VARCHAR(120) UNIQUE NULL,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    zip_code VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(40) NULL,
    sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_intakes (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    subscriber_id VARCHAR(120) NULL,
    payer_name VARCHAR(255) NULL,
    payer_code VARCHAR(60) NULL,
    service_type_codes JSONB NULL,
    group_number VARCHAR(120) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eligibility_checks (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    payor_id VARCHAR(36) NOT NULL REFERENCES payors(id),
    plan_id VARCHAR(36) NULL REFERENCES payor_plans(id),
    status VARCHAR(60) NOT NULL DEFAULT 'unknown',
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pverify_request_id VARCHAR(255) NULL,
    request_payload JSONB NULL,
    response_payload JSONB NULL,
    created_by_user_id VARCHAR(36) NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS prior_authorizations (
    id VARCHAR(36) PRIMARY KEY,
    request_number VARCHAR(80) UNIQUE NOT NULL,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    payor_id VARCHAR(36) NOT NULL REFERENCES payors(id),
    plan_id VARCHAR(36) NULL REFERENCES payor_plans(id),
    service_code VARCHAR(30) NOT NULL,
    service_description TEXT NOT NULL,
    diagnosis_code VARCHAR(30) NOT NULL,
    diagnosis_description TEXT NOT NULL,
    urgency VARCHAR(20) NOT NULL DEFAULT 'routine',
    requested_service_date DATE NOT NULL,
    submitted_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    provider_id VARCHAR(36) NULL REFERENCES providers(id),
    reason_for_request TEXT NULL,
    previous_treatments TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prior_auth_documents (
    id VARCHAR(36) PRIMARY KEY,
    prior_auth_id VARCHAR(36) NOT NULL REFERENCES prior_authorizations(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NULL,
    mime_type VARCHAR(120) NULL,
    storage_provider VARCHAR(80) NOT NULL,
    storage_url TEXT NOT NULL,
    uploaded_by_user_id VARCHAR(36) NULL REFERENCES users(id),
    uploaded_by_label VARCHAR(120) NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prior_auth_activity (
    id VARCHAR(36) PRIMARY KEY,
    prior_auth_id VARCHAR(36) NOT NULL REFERENCES prior_authorizations(id) ON DELETE CASCADE,
    event_type VARCHAR(40) NOT NULL,
    status_label VARCHAR(120) NULL,
    description TEXT NOT NULL,
    performed_by_user_id VARCHAR(36) NULL REFERENCES users(id),
    performed_by_label VARCHAR(120) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    recipient_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(60) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(500) NULL,
    action_label VARCHAR(120) NULL,
    action_state JSONB NULL,
    metadata_json JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(40) NOT NULL DEFAULT 'idle',
    role_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    permission_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    payor_id VARCHAR(36) NULL REFERENCES payors(id),
    plan_id VARCHAR(36) NULL REFERENCES payor_plans(id),
    frequency_mode VARCHAR(40) NOT NULL DEFAULT 'plan_rule',
    custom_frequency VARCHAR(120) NULL,
    automation_job VARCHAR(120) NULL,
    last_run_at TIMESTAMPTZ NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_key VARCHAR(120) NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    size VARCHAR(40) NOT NULL DEFAULT 'medium',
    chart_type VARCHAR(40) NULL,
    data_source VARCHAR(120) NULL,
    config JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_backups (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(255) NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(80) NOT NULL,
    key VARCHAR(120) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_order ON dashboard_widgets(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_dashboard_backups_user ON dashboard_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_intakes_patient ON patient_intakes(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_locations_provider ON provider_locations(provider_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_checks_patient ON eligibility_checks(patient_id);

CREATE TABLE IF NOT EXISTS master_categories (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(80) UNIQUE NOT NULL,
    label VARCHAR(120) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_options (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL REFERENCES master_categories(id) ON DELETE CASCADE,
    value VARCHAR(120) NOT NULL,
    label VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata_json JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_master_option_category_value ON master_options(category_id, value);
CREATE INDEX IF NOT EXISTS idx_master_options_category_active ON master_options(category_id, is_active, sort_order);

ALTER TABLE payor_plans ADD COLUMN IF NOT EXISTS plan_type_option_id VARCHAR(36) NULL REFERENCES master_options(id);
ALTER TABLE payor_plans ADD COLUMN IF NOT EXISTS auto_check_frequency_option_id VARCHAR(36) NULL REFERENCES master_options(id);
ALTER TABLE payor_plans ADD COLUMN IF NOT EXISTS status_option_id VARCHAR(36) NULL REFERENCES master_options(id);
ALTER TABLE provider_locations ADD COLUMN IF NOT EXISTS state_option_id VARCHAR(36) NULL REFERENCES master_options(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS relation_option_id VARCHAR(36) NULL REFERENCES master_options(id);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(40) NULL;
ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS patient_intake_id VARCHAR(36) NULL REFERENCES patient_intakes(id);
ALTER TABLE prior_authorizations ADD COLUMN IF NOT EXISTS subscriber_id VARCHAR(120) NULL;
ALTER TABLE prior_authorizations ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255) NULL;
ALTER TABLE prior_authorizations ADD COLUMN IF NOT EXISTS provider_npi VARCHAR(10) NULL;
ALTER TABLE prior_authorizations ADD COLUMN IF NOT EXISTS provider_address TEXT NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_user_id VARCHAR(36) NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_username VARCHAR(120) NULL,
    actor_role VARCHAR(40) NULL,
    action VARCHAR(40) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(36) NULL,
    entity_label VARCHAR(255) NULL,
    changes JSONB NULL,
    metadata_json JSONB NULL,
    request_method VARCHAR(10) NULL,
    request_path VARCHAR(500) NULL,
    status_code INTEGER NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, occurred_at DESC);
