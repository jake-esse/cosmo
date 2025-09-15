import { CostCalculation, ModelConfig, TokenUsage } from './types';

export function calculateCosts(
  usage: TokenUsage,
  config: ModelConfig
): CostCalculation {
  // Calculate API costs (what we pay to the provider)
  const apiInputCost = (usage.promptTokens / 1000) * config.api_input_price_per_1k;
  const apiOutputCost = (usage.completionTokens / 1000) * config.api_output_price_per_1k;
  const totalApiCost = apiInputCost + apiOutputCost;

  // Apply markup for user costs (what users pay us)
  const markup = config.cost_markup_multiplier || 1.0;
  const userInputCost = apiInputCost * markup;
  const userOutputCost = apiOutputCost * markup;
  const totalUserCost = userInputCost + userOutputCost;

  return {
    apiInputCost,
    apiOutputCost,
    userInputCost,
    userOutputCost,
    totalApiCost,
    totalUserCost,
  };
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function estimateCost(
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  config: ModelConfig
): CostCalculation {
  const usage: TokenUsage = {
    promptTokens: estimatedInputTokens,
    completionTokens: estimatedOutputTokens,
    totalTokens: estimatedInputTokens + estimatedOutputTokens,
  };

  return calculateCosts(usage, config);
}