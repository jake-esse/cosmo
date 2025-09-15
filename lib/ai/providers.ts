import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModel } from 'ai';

export type Provider = 'openai' | 'anthropic' | 'google';

// Create provider instances with API keys
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

export function getModel(provider: Provider, modelId: string): LanguageModel {
  console.log('[PROVIDERS] Getting model for provider:', provider, 'modelId:', modelId);
  
  // Check if API key is configured
  const apiKeyEnvMap: Record<Provider, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_AI_API_KEY',
  };

  const apiKey = process.env[apiKeyEnvMap[provider]];
  console.log('[PROVIDERS] API key found:', !!apiKey, 'Length:', apiKey?.length);
  
  if (!apiKey || apiKey.startsWith('your_')) {
    throw new Error(`${provider.toUpperCase()} API key not configured. Please set ${apiKeyEnvMap[provider]} in your environment variables.`);
  }

  // Map model IDs to provider-specific format
  const modelMapping: Record<string, string> = {
    // Anthropic models - using actual available models
    'claude-3-5-haiku-latest': 'claude-3-haiku-20240307',
    'claude-sonnet-4-0': 'claude-3-5-sonnet-20241022',
    'claude-opus-4-1': 'claude-3-opus-20240229',
    
    // OpenAI models
    'gpt-5-nano': 'gpt-4o-mini',
    'gpt-5-mini': 'gpt-4o-mini',
    'gpt-5': 'gpt-4o',
    
    // Google models - using latest versions with vision support
    'gemini-2.5-flash-lite': 'gemini-1.5-flash-8b',
    'gemini-2.5-flash': 'gemini-1.5-flash',
    'gemini-2.5-pro': 'gemini-1.5-pro',
  };

  const mappedModelId = modelMapping[modelId] || modelId;
  console.log('[PROVIDERS] Mapped model ID:', mappedModelId);

  try {
    switch (provider) {
      case 'anthropic':
        console.log('[PROVIDERS] Creating Anthropic model');
        return anthropicProvider(mappedModelId);
      case 'openai':
        console.log('[PROVIDERS] Creating OpenAI model');
        return openaiProvider(mappedModelId);
      case 'google':
        console.log('[PROVIDERS] Creating Google model');
        return googleProvider(mappedModelId);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error('[PROVIDERS] Error creating model:', error);
    throw error;
  }
}

export function isProviderAvailable(provider: Provider): boolean {
  const apiKeyEnvMap: Record<Provider, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_AI_API_KEY',
  };

  const envVarName = apiKeyEnvMap[provider];
  const apiKey = process.env[envVarName];
  
  return !!(apiKey && !apiKey.startsWith('your_'));
}

export function getAvailableProviders(): Provider[] {
  const allProviders: Provider[] = ['anthropic', 'openai', 'google'];
  return allProviders.filter(isProviderAvailable);
}