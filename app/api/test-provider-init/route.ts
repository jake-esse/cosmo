import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs' // Use Node.js runtime for full testing

interface ProviderTestResult {
  provider: string
  importSuccess: boolean
  importError?: string
  modelCreation: boolean
  modelError?: string
  apiKeyFound: boolean
  modelId: string
  testMessage?: string
}

async function testOpenAI(): Promise<ProviderTestResult> {
  const result: ProviderTestResult = {
    provider: 'openai',
    importSuccess: false,
    modelCreation: false,
    apiKeyFound: !!process.env.OPENAI_API_KEY,
    modelId: 'gpt-5-nano'
  }

  try {
    const { openai } = await import('@ai-sdk/openai')
    result.importSuccess = true

    try {
      const model = openai('gpt-5-nano')
      result.modelCreation = !!model
      result.testMessage = 'OpenAI provider initialized successfully'
    } catch (modelError: unknown) {
      result.modelError = modelError instanceof Error ? modelError.message : 'Unknown model creation error'
    }
  } catch (importError: unknown) {
    result.importError = importError instanceof Error ? importError.message : 'Unknown import error'
  }

  return result
}

async function testAnthropic(): Promise<ProviderTestResult> {
  const result: ProviderTestResult = {
    provider: 'anthropic',
    importSuccess: false,
    modelCreation: false,
    apiKeyFound: !!process.env.ANTHROPIC_API_KEY,
    modelId: 'claude-3-5-haiku-latest'
  }
  
  try {
    const { anthropic } = await import('@ai-sdk/anthropic')
    result.importSuccess = true
    
    try {
      const model = anthropic('claude-3-5-haiku-latest')
      result.modelCreation = !!model
      result.testMessage = 'Anthropic provider initialized successfully'
    } catch (modelError: unknown) {
      result.modelError = modelError instanceof Error ? modelError.message : 'Unknown model creation error'
    }
  } catch (importError: unknown) {
    result.importError = importError instanceof Error ? importError.message : 'Unknown import error'
  }

  return result
}

async function testGoogle(): Promise<ProviderTestResult> {
  const result: ProviderTestResult = {
    provider: 'google',
    importSuccess: false,
    modelCreation: false,
    apiKeyFound: !!process.env.GOOGLE_AI_API_KEY,
    modelId: 'gemini-2.5-flash-lite'
  }

  try {
    const { google } = await import('@ai-sdk/google')
    result.importSuccess = true

    try {
      const model = google('gemini-2.5-flash-lite')
      result.modelCreation = !!model
      result.testMessage = 'Google provider initialized successfully'
    } catch (modelError: unknown) {
      result.modelError = modelError instanceof Error ? modelError.message : 'Unknown model creation error'
    }
  } catch (importError: unknown) {
    result.importError = importError instanceof Error ? importError.message : 'Unknown import error'
  }
  
  return result
}

async function testProviderWithKey(provider: string, apiKey: string | undefined): Promise<{
  provider: string
  success?: boolean
  error?: string
  clientCreated?: boolean
  method?: string
  stack?: string
}> {
  if (!apiKey) {
    return { provider, error: 'No API key found' }
  }

  try {
    switch (provider) {
      case 'openai':
        const { createOpenAI } = await import('@ai-sdk/openai')
        const openaiClient = createOpenAI({
          apiKey,
          compatibility: 'strict'
        })
        return {
          provider,
          success: true,
          clientCreated: !!openaiClient,
          method: 'createOpenAI'
        }

      case 'anthropic':
        const { createAnthropic } = await import('@ai-sdk/anthropic')
        const anthropicClient = createAnthropic({
          apiKey
        })
        return {
          provider,
          success: true,
          clientCreated: !!anthropicClient,
          method: 'createAnthropic'
        }

      case 'google':
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
        const googleClient = createGoogleGenerativeAI({
          apiKey
        })
        return {
          provider,
          success: true,
          clientCreated: !!googleClient,
          method: 'createGoogleGenerativeAI'
        }

      default:
        return { provider, error: 'Unknown provider' }
    }
  } catch (error: unknown) {
    return {
      provider,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }
  }
}

export async function GET(request: NextRequest) {
  console.log('[TEST-PROVIDER-INIT] Starting provider initialization tests')
  
  // Test basic imports and model creation
  const basicTests = await Promise.all([
    testOpenAI(),
    testAnthropic(),
    testGoogle()
  ])
  
  // Test with explicit API key configuration
  const explicitTests = await Promise.all([
    testProviderWithKey('openai', process.env.OPENAI_API_KEY),
    testProviderWithKey('anthropic', process.env.ANTHROPIC_API_KEY),
    testProviderWithKey('google', process.env.GOOGLE_AI_API_KEY)
  ])
  
  // Check package.json dependencies
  let dependencies: Record<string, string> = {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const packageJson = require('../../../package.json') as { dependencies: Record<string, string> }
    dependencies = {
      '@ai-sdk/anthropic': packageJson.dependencies['@ai-sdk/anthropic'] || 'not found',
      '@ai-sdk/openai': packageJson.dependencies['@ai-sdk/openai'] || 'not found',
      '@ai-sdk/google': packageJson.dependencies['@ai-sdk/google'] || 'not found',
      'ai': packageJson.dependencies['ai'] || 'not found'
    }
  } catch (e) {
    dependencies = { error: 'Could not load package.json' }
  }
  
  // Test environment variable access methods
  const envAccessTests = {
    direct: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY
    },
    bracketed: {
      OPENAI_API_KEY: !!process.env['OPENAI_API_KEY'],
      ANTHROPIC_API_KEY: !!process.env['ANTHROPIC_API_KEY'],
      GOOGLE_AI_API_KEY: !!process.env['GOOGLE_AI_API_KEY']
    }
  }
  
  const response = {
    timestamp: new Date().toISOString(),
    basicTests,
    explicitTests,
    dependencies,
    envAccessTests,
    summary: {
      workingProviders: basicTests.filter(t => t.modelCreation).map(t => t.provider),
      failedProviders: basicTests.filter(t => !t.modelCreation).map(t => t.provider),
      providersWithKeys: basicTests.filter(t => t.apiKeyFound).map(t => t.provider),
      providersWithoutKeys: basicTests.filter(t => !t.apiKeyFound).map(t => t.provider)
    }
  }
  
  console.log('[TEST-PROVIDER-INIT] Test results:', JSON.stringify(response, null, 2))
  
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}