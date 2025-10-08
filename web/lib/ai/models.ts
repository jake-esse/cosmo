import { createClient } from '@/lib/supabase/server';
import { ModelConfig, ModelAccessCheck } from './types';
import { isProviderAvailable } from './providers';

export async function getUserAvailableModels(userId: string): Promise<ModelConfig[]> {
  const supabase = await createClient();

  // Get user tier
  const { data: tierData, error: tierError } = await supabase.rpc('get_user_tier', {
    p_user_id: userId,
  });

  if (tierError) {
    console.error('Error getting user tier:', tierError);
    throw new Error('Failed to get user tier');
  }

  const userTier = tierData || 'free';

  // Get tier hierarchy
  const tierHierarchy = getTierHierarchy(userTier);

  // Get all enabled models the user has access to
  const { data: models, error: modelsError } = await supabase
    .from('model_config')
    .select('*')
    .eq('enabled', true)
    .in('tier_required', tierHierarchy)
    .order('sort_order');

  if (modelsError) {
    console.error('Error fetching models:', modelsError);
    throw new Error('Failed to fetch models');
  }

  // Filter out models from unavailable providers
  const availableModels = models.filter(model => 
    isProviderAvailable(model.provider as 'openai' | 'anthropic' | 'google')
  );

  // Add usage info for each model
  const modelsWithUsage = await Promise.all(
    availableModels.map(async (model) => {
      const { data: accessData, error: accessError } = await supabase.rpc(
        'check_user_model_access',
        {
          p_user_id: userId,
          p_model_id: model.model_id,
        }
      );

      if (accessError) {
        console.error(`Error checking access for model ${model.model_id}:`, accessError);
        // Set defaults if check fails
        return {
          ...model,
          remaining_today: 0,
          daily_limit: getDailyLimit(model, userTier),
        };
      }

      // RPC returns an array with a single object, so we need to get the first element
      const access = Array.isArray(accessData) ? accessData[0] : accessData;

      return {
        ...model,
        remaining_today: access?.remaining || 0,
        daily_limit: access?.daily_limit !== undefined 
          ? access.daily_limit 
          : getDailyLimit(model, userTier),
      };
    })
  );

  return modelsWithUsage;
}

export async function checkModelAccess(
  userId: string,
  modelId: string
): Promise<ModelAccessCheck> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('check_user_model_access', {
    p_user_id: userId,
    p_model_id: modelId,
  });

  if (error) {
    console.error('Error checking model access:', error);
    throw new Error('Failed to check model access');
  }

  // RPC returns an array with a single object, so we need to get the first element
  return Array.isArray(data) ? data[0] : data;
}

export async function getModelConfig(modelId: string): Promise<ModelConfig | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('model_config')
    .select('*')
    .eq('model_id', modelId)
    .eq('enabled', true)
    .single();

  if (error) {
    console.error('Error fetching model config:', error);
    return null;
  }

  return data;
}

function getTierHierarchy(tier: string): string[] {
  switch (tier) {
    case 'pro':
      return ['free', 'plus', 'pro'];
    case 'plus':
      return ['free', 'plus'];
    case 'free':
    default:
      return ['free'];
  }
}

function getDailyLimit(model: ModelConfig, userTier: string): number | null {
  switch (userTier) {
    case 'pro':
      return model.daily_pro_tier_limit;
    case 'plus':
      return model.daily_plus_tier_limit;
    case 'free':
    default:
      return model.daily_free_tier_limit;
  }
}

export async function incrementDailyUsage(
  userId: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  console.log('[DAILY_USAGE] Attempting to track usage:', {
    userId,
    modelId,
    today,
    inputTokens,
    outputTokens
  });

  // First, try to get existing usage
  const { data: existingUsage, error: selectError } = await supabase
    .from('user_daily_usage')
    .select('message_count, input_tokens, output_tokens')
    .eq('user_id', userId)
    .eq('model_id', modelId)
    .eq('usage_date', today)
    .single();

  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('[DAILY_USAGE] Error selecting existing usage:', selectError);
  }

  if (existingUsage) {
    // Update existing record
    const { error: updateError } = await supabase
      .from('user_daily_usage')
      .update({
        message_count: (existingUsage.message_count || 0) + 1,
        input_tokens: (existingUsage.input_tokens || 0) + inputTokens,
        output_tokens: (existingUsage.output_tokens || 0) + outputTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .eq('usage_date', today);

    if (updateError) {
      console.error('[DAILY_USAGE] Error updating daily usage:', {
        error: updateError,
        userId,
        modelId,
        today
      });
    } else {
      console.log('[DAILY_USAGE] Successfully updated existing daily usage record');
    }
  } else {
    // Insert new record
    const { error: insertError } = await supabase
      .from('user_daily_usage')
      .insert({
        user_id: userId,
        model_id: modelId,
        usage_date: today,
        message_count: 1,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      });

    if (insertError) {
      console.error('[DAILY_USAGE] Error inserting daily usage:', {
        error: insertError,
        userId,
        modelId,
        today
      });
    } else {
      console.log('[DAILY_USAGE] Successfully inserted new daily usage record');
    }
  }
}