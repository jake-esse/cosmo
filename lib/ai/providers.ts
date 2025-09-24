import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { LanguageModel } from 'ai';

export type Provider = 'openai' | 'anthropic' | 'google' | 'xai';

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

const xaiProvider = createXai({
  apiKey: process.env.XAI_API_KEY,
});

export function getModel(provider: Provider, modelId: string): LanguageModel {
  console.log('[PROVIDERS] Getting model for provider:', provider, 'modelId:', modelId);

  // Check if API key is configured
  const apiKeyEnvMap: Record<Provider, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_AI_API_KEY',
    xai: 'XAI_API_KEY',
  };

  const apiKey = process.env[apiKeyEnvMap[provider]];
  console.log('[PROVIDERS] API key found:', !!apiKey, 'Length:', apiKey?.length);

  if (!apiKey || apiKey.startsWith('your_')) {
    throw new Error(`${provider.toUpperCase()} API key not configured. Please set ${apiKeyEnvMap[provider]} in your environment variables.`);
  }

  console.log('[PROVIDERS] Using model ID:', modelId);

  try {
    switch (provider) {
      case 'anthropic':
        console.log('[PROVIDERS] Creating Anthropic model');
        return anthropicProvider(modelId);
      case 'openai':
        console.log('[PROVIDERS] Creating OpenAI model');
        return openaiProvider(modelId);
      case 'google':
        console.log('[PROVIDERS] Creating Google model');
        return googleProvider(modelId);
      case 'xai':
        console.log('[PROVIDERS] Creating xAI model');
        return xaiProvider(modelId);
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
    xai: 'XAI_API_KEY',
  };

  const envVarName = apiKeyEnvMap[provider];
  const apiKey = process.env[envVarName];
  
  return !!(apiKey && !apiKey.startsWith('your_'));
}

export function getAvailableProviders(): Provider[] {
  const allProviders: Provider[] = ['anthropic', 'openai', 'google', 'xai'];
  return allProviders.filter(isProviderAvailable);
}