
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email VARCHAR(255) UNIQUE NOT NULL,

  password_hash VARCHAR(255) NOT NULL,

  name VARCHAR(255) NOT NULL,

  language VARCHAR(2) DEFAULT 'tr',

  plan VARCHAR(20) DEFAULT 'free',

  projects_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE TABLE projects (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(500) NOT NULL,

  status VARCHAR(20) DEFAULT 'pending',

  current_step VARCHAR(50),

  progress INT DEFAULT 0,

  settings JSONB NOT NULL,

  cover_data JSONB,

  error_message TEXT,

  source_file_url VARCHAR(1000),

  output_pdf_url VARCHAR(1000),

  output_latex_url VARCHAR(1000),

  page_count INT,

  file_size BIGINT,

  processing_time_ms INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE TABLE files (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  type VARCHAR(20) NOT NULL,

  filename VARCHAR(500) NOT NULL,

  storage_path VARCHAR(1000) NOT NULL,

  file_size BIGINT NOT NULL,

  mime_type VARCHAR(100) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE TABLE processing_logs (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  step VARCHAR(50) NOT NULL,

  status VARCHAR(20) NOT NULL,

  message TEXT,

  metadata JSONB,

  duration_ms INT,

  created_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE INDEX idx_projects_user ON projects(user_id);

CREATE INDEX idx_projects_status ON projects(status);

CREATE INDEX idx_projects_user_status ON projects(user_id, status);

CREATE INDEX idx_files_project ON files(project_id);

CREATE INDEX idx_files_project_type ON files(project_id, type);

CREATE INDEX idx_logs_project ON processing_logs(project_id);

CREATE INDEX idx_logs_project_step ON processing_logs(project_id, step);

CREATE OR REPLACE FUNCTION update_updated_at()

RETURNS TRIGGER AS $$

BEGIN

  NEW.updated_at = NOW();

  RETURN NEW;

END;

$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at

  BEFORE UPDATE ON users

  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at

  BEFORE UPDATE ON projects

  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

