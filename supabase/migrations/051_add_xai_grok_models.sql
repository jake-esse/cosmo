-- First, update the provider check constraint to include 'xai'
ALTER TABLE public.model_config
DROP CONSTRAINT IF EXISTS model_config_provider_check;

ALTER TABLE public.model_config
ADD CONSTRAINT model_config_provider_check
CHECK (provider = ANY (ARRAY['anthropic'::text, 'openai'::text, 'google'::text, 'xai'::text]));

-- Add xAI Grok models to model_config
INSERT INTO public.model_config (
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
  free_tier_daily_limit,
  plus_tier_daily_limit,
  pro_tier_daily_limit,
  model_family,
  sort_order
) VALUES
  (
    'grok-4-0709',
    'xai',
    'Grok 4',
    'Most capable Grok model with advanced reasoning',
    true,
    'pro',
    3.0,  -- $3 per million input tokens
    15.0, -- $15 per million output tokens
    1.5,  -- 50% markup
    262144, -- 256K context window
    32768,  -- 32K max output
    true,
    true,
    true,
    0,    -- No free tier access
    0,    -- No plus tier access
    500,  -- Pro tier only
    'grok',
    20
  ),
  (
    'grok-4-fast-reasoning',
    'xai',
    'Grok 4 Fast Reasoning',
    'Fast and efficient Grok model with extensive context',
    true,
    'plus',
    0.2,  -- $0.20 per million input tokens
    0.5,  -- $0.50 per million output tokens
    1.5,  -- 50% markup
    2097152, -- 2M context window (2 million tokens)
    32768,  -- 32K max output
    true,
    true,
    true,
    0,    -- No free tier access
    200,  -- Plus tier limit
    1000, -- Pro tier limit
    'grok',
    21
  )
ON CONFLICT (model_id) DO UPDATE SET
  provider = EXCLUDED.provider,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  enabled = EXCLUDED.enabled,
  tier_required = EXCLUDED.tier_required,
  api_input_price_per_1k = EXCLUDED.api_input_price_per_1k,
  api_output_price_per_1k = EXCLUDED.api_output_price_per_1k,
  cost_markup_multiplier = EXCLUDED.cost_markup_multiplier,
  context_window = EXCLUDED.context_window,
  max_output_tokens = EXCLUDED.max_output_tokens,
  supports_vision = EXCLUDED.supports_vision,
  supports_tools = EXCLUDED.supports_tools,
  supports_streaming = EXCLUDED.supports_streaming,
  free_tier_daily_limit = EXCLUDED.free_tier_daily_limit,
  plus_tier_daily_limit = EXCLUDED.plus_tier_daily_limit,
  pro_tier_daily_limit = EXCLUDED.pro_tier_daily_limit,
  model_family = EXCLUDED.model_family,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();