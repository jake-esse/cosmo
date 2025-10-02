-- Migration: Add search tracking to model_usage table
-- Description: Adds search_used column to track when web search is used with AI models

-- Add search_used column to model_usage table
ALTER TABLE model_usage
ADD COLUMN IF NOT EXISTS search_used BOOLEAN DEFAULT false;

-- Add index for search usage analysis
CREATE INDEX IF NOT EXISTS idx_model_usage_search_used
ON model_usage(search_used)
WHERE search_used = true;