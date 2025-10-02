-- Migration: Add Grok features and web search support
-- Description: Adds grok-4-fast-non-reasoning model, supports_web_search column, and ui_hidden column

-- Add supports_web_search column to model_config table
ALTER TABLE model_config
ADD COLUMN IF NOT EXISTS supports_web_search BOOLEAN DEFAULT false;

-- Add ui_hidden column to model_config table
ALTER TABLE model_config
ADD COLUMN IF NOT EXISTS ui_hidden BOOLEAN DEFAULT false;

-- Insert grok-4-fast-non-reasoning model
INSERT INTO model_config (
  model_id,
  provider,
  display_name,
  description,
  enabled,
  tier_required,
  api_input_price_per_1k,
  api_output_price_per_1k,
  cost_markup_multiplier,
  context_window,
  max_output_tokens,
  supports_vision,
  supports_tools,
  supports_streaming,
  supports_web_search,
  free_tier_daily_limit,
  plus_tier_daily_limit,
  pro_tier_daily_limit,
  model_family,
  sort_order,
  ui_hidden
) VALUES (
  'grok-4-fast-non-reasoning',
  'xai',
  'Grok 4 Fast',
  'Fast and efficient Grok model optimized for speed',
  true,
  'free',
  0.1,
  0.3,
  1.5,
  2097152,  -- 2M context window
  32768,    -- 32K max output
  true,
  true,
  true,
  true,     -- supports web search
  500,      -- free tier daily limit
  500,      -- plus tier daily limit
  500,      -- pro tier daily limit
  'grok',
  22,       -- sort order after grok-4-fast-reasoning
  false     -- visible in UI
) ON CONFLICT (model_id) DO NOTHING;

-- Update display name for grok-4-fast-reasoning
UPDATE model_config
SET display_name = 'Grok 4 Fast (Reasoning)'
WHERE model_id = 'grok-4-fast-reasoning';

-- Set supports_web_search = true for both fast Grok models
UPDATE model_config
SET supports_web_search = true
WHERE model_id IN ('grok-4-fast-reasoning', 'grok-4-fast-non-reasoning');

-- Set supports_web_search = false for grok-4-0709 (only fast models support web search)
UPDATE model_config
SET supports_web_search = false
WHERE model_id = 'grok-4-0709';

-- Hide all non-xAI models from UI (but keep them enabled)
UPDATE model_config
SET ui_hidden = true
WHERE provider != 'xai';

-- Ensure xAI models are visible in UI
UPDATE model_config
SET ui_hidden = false
WHERE provider = 'xai';

-- Update tier_required and daily limits for grok-4-fast-reasoning to match requirements
UPDATE model_config
SET
  tier_required = 'free',
  free_tier_daily_limit = 200,
  plus_tier_daily_limit = 200,
  pro_tier_daily_limit = 200
WHERE model_id = 'grok-4-fast-reasoning';

-- Update pricing for grok-4-fast-non-reasoning (ensure it matches requirements)
UPDATE model_config
SET
  api_input_price_per_1k = 0.1,
  api_output_price_per_1k = 0.3
WHERE model_id = 'grok-4-fast-non-reasoning';