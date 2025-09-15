export interface ModelConfig {
  model_id: string;
  provider: 'openai' | 'anthropic' | 'google';
  display_name: string;
  tier_required: 'free' | 'plus' | 'pro';
  max_context_tokens: number;
  max_output_tokens: number;
  api_input_price_per_1k: number;
  api_output_price_per_1k: number;
  cost_markup_multiplier: number;
  daily_free_tier_limit: number | null;
  daily_plus_tier_limit: number | null;
  daily_pro_tier_limit: number | null;
  enabled: boolean;
  sort_order: number;
  remaining_today?: number;
  daily_limit?: number;
}

export interface ModelUsage {
  user_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  api_input_cost: number;
  api_output_cost: number;
  user_input_cost: number;
  user_output_cost: number;
  created_at?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamingOptions {
  userId: string;
  modelId: string;
  messages: ChatMessage[];
  onTokenUsage?: (usage: TokenUsage) => void;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostCalculation {
  apiInputCost: number;
  apiOutputCost: number;
  userInputCost: number;
  userOutputCost: number;
  totalApiCost: number;
  totalUserCost: number;
}

export interface ModelAccessCheck {
  has_access: boolean;
  remaining: number;
  daily_limit: number | null;
  tier_required: string;
  current_tier: string;
}

export interface ChatError {
  error: true;
  message: string;
  code?: string;
  canRetry: boolean;
  suggestedAction?: string;
}