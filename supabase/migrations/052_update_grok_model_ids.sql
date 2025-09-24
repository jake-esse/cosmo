-- Update existing Grok models with correct IDs
UPDATE public.model_config
SET model_id = 'grok-4-0709'
WHERE model_id = 'grok-4' AND provider = 'xai';

UPDATE public.model_config
SET model_id = 'grok-4-fast-reasoning'
WHERE model_id = 'grok-4-fast' AND provider = 'xai';