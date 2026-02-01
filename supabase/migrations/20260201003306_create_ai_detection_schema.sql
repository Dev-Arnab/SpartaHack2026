/*
  # AI Detection Platform Schema

  1. New Tables
    - `analyses`
      - `id` (uuid, primary key) - Unique identifier for each analysis
      - `user_id` (uuid) - User who performed the analysis (nullable for demo)
      - `file_name` (text) - Original filename
      - `file_type` (text) - Type of file (image, video, audio)
      - `file_url` (text) - URL to the stored file
      - `file_size` (bigint) - Size of file in bytes
      - `status` (text) - Status: pending, processing, completed, failed
      - `created_at` (timestamptz) - When analysis was requested
      - `completed_at` (timestamptz) - When analysis finished
    
    - `analysis_results`
      - `id` (uuid, primary key) - Unique identifier
      - `analysis_id` (uuid, foreign key) - Reference to analyses table
      - `model_name` (text) - Name of the detection model used
      - `model_version` (text) - Version of the model
      - `is_ai_generated` (boolean) - Whether content is AI-generated
      - `confidence_score` (numeric) - Confidence percentage (0-100)
      - `detection_type` (text) - Type: deepfake, ai_generated, authentic
      - `metadata` (jsonb) - Additional model-specific data
      - `created_at` (timestamptz) - When result was created

  2. Security
    - Enable RLS on all tables
    - Public read access for demo purposes (hackathon)
    - Anyone can create analyses
*/

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'audio')),
  file_url text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  model_version text DEFAULT 'v1',
  is_ai_generated boolean NOT NULL,
  confidence_score numeric(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  detection_type text NOT NULL CHECK (detection_type IN ('deepfake', 'ai_generated', 'authentic', 'uncertain')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_id ON analysis_results(analysis_id);

-- Enable Row Level Security
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Public read access for demo (hackathon purposes)
CREATE POLICY "Anyone can view analyses"
  ON analyses FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create analyses"
  ON analyses FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view analysis results"
  ON analysis_results FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create analysis results"
  ON analysis_results FOR INSERT
  TO public
  WITH CHECK (true);