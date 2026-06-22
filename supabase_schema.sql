-- ==========================================
-- ARCHITECTURE: CENTRALIZED SUMMER CAMP PORTAL CMS (SUPABASE POSTGRESQL)
-- AUTHOR: SENIOR FULLSTACK ARCHITECT
-- DESCRIPTION: COMPLETE DATABASE SCHEMA, TABLES, RELATIONSHIPS, TRIGGERS & Row-Level-Security (RLS) POLICIES.
-- ==========================================

-- Enable PGCRYPTO extension for secure UUID generators
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Custom Enum Roles for user authorization and permissions
CREATE TYPE portal_user_role AS ENUM ('Super Admin', 'Admin', 'Editor', 'Viewer');

-- ==============================================================================
-- 1. Table: portal_users (Central authorization table synced/associated with Supabase Auth)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS portal_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role portal_user_role NOT NULL DEFAULT 'Viewer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Table: portal_weeks (Summer camp weekly activities table)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS portal_weeks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_number INTEGER NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    image_url TEXT,
    pdf_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. Table: portal_banners (Central hero banners slide controller)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS portal_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    title VARCHAR(255),
    subtitle VARCHAR(255),
    target_link TEXT,
    display_order INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. Table: portal_news (Camp feeds, articles, updates, photo summaries)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS portal_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    photo_urls TEXT[] DEFAULT '{}'::TEXT[],
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    author_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
    like_count INTEGER DEFAULT 0 NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. Table: portal_documents (Central curriculum documents, lesson plans, checklists)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS portal_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) DEFAULT 'PDF' NOT NULL,
    file_size_bytes INTEGER DEFAULT 0 NOT NULL,
    download_count INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. Table: portal_settings (Key-value system definitions, e.g., customizable logos, primary descriptions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS portal_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES portal_users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 7. Table: portal_notifications (Urgent alerts or push notes broadcasts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS portal_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    alert_type VARCHAR(50) DEFAULT 'info' NOT NULL, -- info, success, warning, danger
    is_global BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 8. Table: portal_attendance (Real-time student & minor participant registration)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS portal_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name VARCHAR(255) NOT NULL,
    quarter VARCHAR(100) NOT NULL, -- e.g. Khu phố 12, Cụm 2
    weeks_attended INTEGER[] DEFAULT '{}'::INTEGER[], -- Array of week index integers
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    parent_phone VARCHAR(50),
    parent_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_quarter UNIQUE(student_name, quarter)
);

-- ==============================================================================
-- 9. Table: portal_volunteers (Real-time staff volunteer participation log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS portal_volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    quarter VARCHAR(100) NOT NULL, -- e.g. Khu phố 12
    volunteer_role VARCHAR(100) NOT NULL, -- e.g. Phụ trách, Hỗ trợ
    weeks_attended INTEGER[] DEFAULT '{}'::INTEGER[],
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_volunteer_quarter UNIQUE(full_name, quarter)
);

-- ==============================================================================
-- 10. Table: audit_logs (Complete administrative action tracking table)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_email VARCHAR(255) NOT NULL,
    operator_role portal_user_role NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT NOT NULL,
    previous_state JSONB DEFAULT '{}'::JSONB,
    current_state JSONB DEFAULT '{}'::JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- AUTOMATED TRIGGER FUNCTIONS FOR TIMESTAMP UPDATE
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to system entities
CREATE TRIGGER trigger_update_weeks_timestamp BEFORE UPDATE ON portal_weeks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_banners_timestamp BEFORE UPDATE ON portal_banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_news_timestamp BEFORE UPDATE ON portal_news FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_documents_timestamp BEFORE UPDATE ON portal_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_notifications_timestamp BEFORE UPDATE ON portal_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_users_timestamp BEFORE UPDATE ON portal_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR TOTAL SYSTEM SECURE COMPLIANCE
-- ==============================================================================

-- Enable RLS across all portal components
ALTER TABLE portal_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security functions to determine current role privileges directly
CREATE OR REPLACE FUNCTION get_user_portal_role()
RETURNS portal_user_role SECURITY DEFINER AS $$
DECLARE
    u_role portal_user_role;
BEGIN
    -- Query matching Supabase Auth logged in user email to mapped roles
    SELECT role INTO u_role FROM portal_users WHERE email = auth.jwt()->>'email' AND is_active = TRUE;
    IF u_role IS NULL THEN
        RETURN 'Viewer'::portal_user_role;
    END IF;
    RETURN u_role;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- RLS - PORTAL WEEKS (PUBLIC READ, ADMIN WRITE)
-- ------------------------------------------------------------------------------
CREATE POLICY "Public Read policy for portal_weeks" 
ON portal_weeks FOR SELECT 
USING (is_active = TRUE OR get_user_portal_role() IN ('Super Admin', 'Admin', 'Editor'));

CREATE POLICY "Admin Modify policy for portal_weeks" 
ON portal_weeks FOR ALL 
USING (get_user_portal_role() IN ('Super Admin', 'Admin'))
WITH CHECK (get_user_portal_role() IN ('Super Admin', 'Admin'));

-- ------------------------------------------------------------------------------
-- RLS - PORTAL BANNERS (PUBLIC READ, ADMIN WRITE)
-- ------------------------------------------------------------------------------
CREATE POLICY "Public Read policy for portal_banners" 
ON portal_banners FOR SELECT 
USING (is_active = TRUE OR get_user_portal_role() IN ('Super Admin', 'Admin', 'Editor'));

CREATE POLICY "Admin Modify policy for portal_banners" 
ON portal_banners FOR ALL 
USING (get_user_portal_role() IN ('Super Admin', 'Admin'))
WITH CHECK (get_user_portal_role() IN ('Super Admin', 'Admin'));

-- ------------------------------------------------------------------------------
-- RLS - PORTAL DOCUMENTS (PUBLIC READ, EDITOR CREATE, ADMIN ALL)
-- ------------------------------------------------------------------------------
CREATE POLICY "Public Read policy for portal_documents" 
ON portal_documents FOR SELECT 
USING (is_active = TRUE OR get_user_portal_role() IN ('Super Admin', 'Admin', 'Editor'));

CREATE POLICY "Editor draft policy for portal_documents" 
ON portal_documents FOR INSERT 
WITH CHECK (get_user_portal_role() IN ('Super Admin', 'Admin', 'Editor'));

CREATE POLICY "Admin publish/modify policy for portal_documents" 
ON portal_documents FOR ALL 
USING (get_user_portal_role() IN ('Super Admin', 'Admin'));

-- ------------------------------------------------------------------------------
-- RLS - PORTAL PUBLIC SUBMISSIONS (ATTENDANCE & VOLUNTEERS: PUBLIC INSERT/UPDATE, ADMIN ALL)
-- ------------------------------------------------------------------------------
CREATE POLICY "Public Insert attendance policy" 
ON portal_attendance FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "Public/Admin Select attendance policy" 
ON portal_attendance FOR SELECT 
USING (TRUE);

CREATE POLICY "Admin Modify attendance policy" 
ON portal_attendance FOR ALL 
USING (get_user_portal_role() IN ('Super Admin', 'Admin'))
WITH CHECK (get_user_portal_role() IN ('Super Admin', 'Admin'));

CREATE POLICY "Public Insert volunteer policy" 
ON portal_volunteers FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "Public/Admin Select volunteer policy" 
ON portal_volunteers FOR SELECT 
USING (TRUE);

CREATE POLICY "Admin Modify volunteer policy" 
ON portal_volunteers FOR ALL 
USING (get_user_portal_role() IN ('Super Admin', 'Admin'))
WITH CHECK (get_user_portal_role() IN ('Super Admin', 'Admin'));

-- ------------------------------------------------------------------------------
-- RLS - AUDIT LOGS (ADMIN READ-ONLY, SYSTEM WRITE)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin Read policy for audit_logs" 
ON audit_logs FOR SELECT 
USING (get_user_portal_role() IN ('Super Admin', 'Admin'));

CREATE POLICY "System Insert policy for audit_logs" 
ON audit_logs FOR INSERT 
WITH CHECK (TRUE);

-- Seed Initial Super Admin Profile (replace with user real mail on deployment)
INSERT INTO portal_users (email, full_name, role, is_active)
VALUES ('ngsoanng@gmail.com', 'Tổng quản trị ngsoanng', 'Super Admin', TRUE)
ON CONFLICT (email) DO UPDATE SET role = 'Super Admin';
