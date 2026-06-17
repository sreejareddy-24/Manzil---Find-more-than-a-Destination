-- CareerMate AI - Complete Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT UNIQUE,
  source TEXT DEFAULT 'web', -- 'web' or 'whatsapp'
  notification_enabled BOOLEAN DEFAULT true,
  notification_time TEXT DEFAULT '09:00',
  notification_types TEXT[] DEFAULT ARRAY['job', 'internship', 'hackathon', 'scholarship', 'fellowship'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Personal Info
  name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin TEXT,
  github TEXT,
  portfolio TEXT,
  summary TEXT,

  -- Skills
  skills TEXT[] DEFAULT '{}',
  technical_skills TEXT[] DEFAULT '{}',
  soft_skills TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',

  -- Career Info
  career_level TEXT DEFAULT 'fresher',
  target_roles TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',

  -- Education (JSON array)
  education JSONB DEFAULT '[]',

  -- Experience (JSON array)
  experience JSONB DEFAULT '[]',

  -- Projects (JSON array)
  projects JSONB DEFAULT '[]',

  -- Certifications (JSON array)
  certifications JSONB DEFAULT '[]',

  -- Awards & Publications
  awards TEXT[] DEFAULT '{}',
  publications TEXT[] DEFAULT '{}',

  -- AI Analysis
  career_score INTEGER DEFAULT 0 CHECK (career_score >= 0 AND career_score <= 100),
  skill_score INTEGER DEFAULT 0 CHECK (skill_score >= 0 AND skill_score <= 100),
  experience_score INTEGER DEFAULT 0,
  education_score INTEGER DEFAULT 0,
  profile_completeness INTEGER DEFAULT 0,

  missing_skills TEXT[] DEFAULT '{}',
  career_suggestions TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  immediate_actions TEXT[] DEFAULT '{}',
  roadmap JSONB DEFAULT '[]',

  -- Salary
  salary_range JSONB,
  growth_trajectory TEXT,

  -- Resume Storage
  resume_url TEXT,
  raw_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- OPPORTUNITIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  type TEXT NOT NULL DEFAULT 'job', -- job, internship, fellowship, scholarship, hackathon, competition, research, apprenticeship
  description TEXT,
  required_skills TEXT[] DEFAULT '{}',
  career_level TEXT,

  -- URLs
  url TEXT,
  apply_url TEXT,
  source TEXT, -- LinkedIn, Internshala, Devpost, etc.

  -- Dates
  posted_date TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),

  -- Financial
  stipend TEXT,
  salary TEXT,
  prize TEXT,
  duration TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON public.opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_is_active ON public.opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_posted_date ON public.opportunities(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_title_trgm ON public.opportunities USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_opportunities_skills ON public.opportunities USING gin(required_skills);

-- =============================================
-- USER MATCHES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,

  -- Scores
  match_score INTEGER DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  eligibility_score INTEGER DEFAULT 0,

  -- Analysis
  skill_overlap TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  why_match TEXT,
  skills_to_gain TEXT[] DEFAULT '{}',
  career_impact TEXT,
  selection_probability TEXT,
  selection_percentage INTEGER DEFAULT 50,
  application_tips TEXT[] DEFAULT '{}',
  expected_growth TEXT,

  -- State
  is_notified BOOLEAN DEFAULT false,
  is_saved BOOLEAN DEFAULT false,
  is_applied BOOLEAN DEFAULT false,

  notified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_matches_user_id ON public.user_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_matches_score ON public.user_matches(user_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_matches_saved ON public.user_matches(user_id, is_saved);

-- =============================================
-- APPLICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES public.opportunities(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'applied', -- applied, interview, offer, rejected, withdrawn
  notes TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);

-- =============================================
-- CONVERSATIONS TABLE (WhatsApp)
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT,
  role TEXT NOT NULL, -- 'user' or 'bot'
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.conversations(phone, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profile" ON public.profiles USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all profiles" ON public.profiles USING (auth.role() = 'service_role');

-- Opportunities (public read)
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read active opportunities" ON public.opportunities FOR SELECT USING (is_active = true OR auth.role() = 'service_role');
CREATE POLICY "Service role can manage opportunities" ON public.opportunities USING (auth.role() = 'service_role');

-- User matches
ALTER TABLE public.user_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own matches" ON public.user_matches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own matches" ON public.user_matches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages matches" ON public.user_matches USING (auth.role() = 'service_role');

-- Applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own applications" ON public.applications USING (auth.uid() = user_id);

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages conversations" ON public.conversations USING (auth.role() = 'service_role');

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create resumes storage bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload own resume"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role full access to resumes"
ON storage.objects
USING (bucket_id = 'resumes' AND auth.role() = 'service_role');

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_matches_updated_at BEFORE UPDATE ON public.user_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user record when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, source)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'source', 'web')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- SAMPLE DATA (Optional - remove in production)
-- =============================================

-- Insert some sample opportunities for testing
INSERT INTO public.opportunities (id, title, company, location, type, description, required_skills, url, apply_url, source, posted_date, is_active)
VALUES
  ('sample-1', 'Software Engineering Intern', 'Google India', 'Bangalore', 'internship', 'Join Google as a Software Engineering intern. Work on real products used by millions.', ARRAY['Python', 'Java', 'Algorithms', 'Data Structures'], 'https://careers.google.com', 'https://careers.google.com', 'Manual', NOW(), true),
  ('sample-2', 'Full Stack Developer', 'Razorpay', 'Bangalore', 'job', 'Build scalable payment infrastructure at Razorpay.', ARRAY['React', 'Node.js', 'PostgreSQL', 'AWS'], 'https://razorpay.com/jobs', 'https://razorpay.com/jobs', 'Manual', NOW(), true),
  ('sample-3', 'Smart India Hackathon 2025', 'Government of India', 'Pan India', 'hackathon', 'India''s biggest hackathon for students. Solve real-world problems with technology.', ARRAY['Innovation', 'Problem Solving', 'Programming'], 'https://sih.gov.in', 'https://sih.gov.in', 'Manual', NOW(), true),
  ('sample-4', 'Tata Scholarship for Higher Education', 'Tata Trusts', 'India', 'scholarship', 'Merit-cum-means scholarship for undergraduate students pursuing STEM.', ARRAY['Academic Excellence', 'Leadership'], 'https://www.tata.com', 'https://www.tata.com', 'Manual', NOW(), true),
  ('sample-5', 'Data Science Intern', 'Flipkart', 'Bangalore', 'internship', 'Work with petabytes of e-commerce data to build ML models.', ARRAY['Python', 'Machine Learning', 'SQL', 'TensorFlow'], 'https://www.flipkartcareers.com', 'https://www.flipkartcareers.com', 'Manual', NOW(), true)
ON CONFLICT (id) DO NOTHING;
