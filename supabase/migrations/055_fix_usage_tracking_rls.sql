-- Fix RLS policies for usage tracking tables
-- These tables need to allow inserts from authenticated users for their own data

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own usage" ON model_usage;
DROP POLICY IF EXISTS "Users can view their own usage" ON model_usage;
DROP POLICY IF EXISTS "Users can insert their daily usage" ON user_daily_usage;
DROP POLICY IF EXISTS "Users can view their daily usage" ON user_daily_usage;
DROP POLICY IF EXISTS "Users can update their daily usage" ON user_daily_usage;

-- Enable RLS on both tables
ALTER TABLE model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for model_usage table
CREATE POLICY "Users can insert their own usage"
  ON model_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage"
  ON model_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for user_daily_usage table
CREATE POLICY "Users can insert their daily usage"
  ON user_daily_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their daily usage"
  ON user_daily_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their daily usage"
  ON user_daily_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also ensure the tables have proper defaults for tracking
ALTER TABLE model_usage
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE user_daily_usage
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Add trigger to auto-update updated_at on user_daily_usage
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_daily_usage_updated_at ON user_daily_usage;

CREATE TRIGGER update_user_daily_usage_updated_at
  BEFORE UPDATE ON user_daily_usage
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();