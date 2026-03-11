-- Create GHL Contacts Table
CREATE TABLE ghl_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id TEXT NOT NULL,
    external_contact_id TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT,
    campaign_id TEXT,
    ad_set_id TEXT,
    last_interaction_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_external_contact UNIQUE (clinic_id, external_contact_id)
);

-- Add indexes for performance
CREATE INDEX idx_ghl_contacts_clinic ON ghl_contacts (clinic_id);
CREATE INDEX idx_ghl_contacts_source ON ghl_contacts (source);
CREATE INDEX idx_ghl_contacts_created_at ON ghl_contacts (created_at DESC);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_ghl_contacts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ghl_contacts_modtime
BEFORE UPDATE ON ghl_contacts
FOR EACH ROW
EXECUTE FUNCTION update_ghl_contacts_timestamp();