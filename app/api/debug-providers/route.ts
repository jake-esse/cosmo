import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs' // Use Node.js runtime for full environment access

interface ProviderDebugInfo {
  name: string
  envVarName: string
  directAccess: boolean
  directValue?: string
  dynamicAccess: boolean
  dynamicValue?: string
  keyExists: boolean
  keyLength: number
  isPlaceholder: boolean
  isAvailable: boolean
  runtimeCheck?: any
}

function checkProvider(name: string, envVarName: string): ProviderDebugInfo {
  // Direct access
  const directValue = process.env[envVarName]
  
  // Dynamic access
  const dynamicValue = process.env[envVarName]
  
  const keyExists = !!directValue
  const keyLength = directValue?.length || 0
  const isPlaceholder = directValue?.startsWith('your_') || directValue?.startsWith('sk-your') || false
  
  // Mock the isProviderAvailable logic
  const isAvailable = keyExists && !isPlaceholder && keyLength > 0
  
  return {
    name,
    envVarName,
    directAccess: !!directValue,
    directValue: directValue ? `${directValue.substring(0, 10)}...` : undefined,
    dynamicAccess: !!dynamicValue,
    dynamicValue: dynamicValue ? `${dynamicValue.substring(0, 10)}...` : undefined,
    keyExists,
    keyLength,
    isPlaceholder,
    isAvailable
  }
}

export async function GET(request: NextRequest) {
  console.log('[DEBUG-PROVIDERS] Starting provider debug check')
  
  const providers = [
    checkProvider('openai', 'OPENAI_API_KEY'),
    checkProvider('anthropic', 'ANTHROPIC_API_KEY'),
    checkProvider('google', 'GOOGLE_AI_API_KEY')
  ]
  
  // Check all environment variables
  const allEnvVars = Object.keys(process.env)
  const relevantEnvVars = allEnvVars.filter(key => 
    key.includes('OPENAI') || 
    key.includes('ANTHROPIC') || 
    key.includes('GOOGLE') ||
    key.includes('GEMINI') ||
    key.includes('AI')
  )
  
  // Check runtime environment
  const runtimeInfo = {
    nodeVersion: process.version,
    runtime: (globalThis as any).EdgeRuntime ? 'edge' : 'nodejs',
    hasEdgeRuntime: !!(globalThis as any).EdgeRuntime,
    platform: process.platform,
    env: process.env.NODE_ENV,
    envVarCount: allEnvVars.length,
    relevantEnvVars: relevantEnvVars.map(key => ({
      key,
      exists: !!process.env[key],
      length: process.env[key]?.length || 0,
      preview: process.env[key] ? `${process.env[key]!.substring(0, 10)}...` : 'undefined'
    }))
  }
  
  // Test dynamic provider availability (simulating what happens in the app)
  const dynamicTests = {
    openai: {
      usingProcess: !!process.env.OPENAI_API_KEY,
      usingGlobal: !!(global as any).process?.env?.OPENAI_API_KEY,
      usingImport: false // Will test import.meta.env if needed
    },
    anthropic: {
      usingProcess: !!process.env.ANTHROPIC_API_KEY,
      usingGlobal: !!(global as any).process?.env?.ANTHROPIC_API_KEY,
      usingImport: false
    },
    google: {
      usingProcess: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      usingGlobal: !!(global as any).process?.env?.GOOGLE_GENERATIVE_AI_API_KEY,
      usingImport: false
    }
  }
  
  const response = {
    timestamp: new Date().toISOString(),
    providers,
    runtimeInfo,
    dynamicTests,
    summary: {
      availableProviders: providers.filter(p => p.isAvailable).map(p => p.name),
      unavailableProviders: providers.filter(p => !p.isAvailable).map(p => p.name),
      totalEnvVars: allEnvVars.length,
      aiRelatedEnvVars: relevantEnvVars.length
    }
  }
  
  console.log('[DEBUG-PROVIDERS] Debug results:', JSON.stringify(response, null, 2))
  
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}