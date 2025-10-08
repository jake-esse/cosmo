"use client"

import { useEffect, useState } from "react"

interface DebugInfo {
  providers?: unknown
  models?: unknown
  providerInit?: unknown
  error?: string
  loading: boolean
}

export default function DebugModelsPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({ loading: true })

  useEffect(() => {
    loadDebugInfo()
  }, [])

  async function loadDebugInfo() {
    try {
      // Fetch provider debug info
      const providersRes = await fetch('/api/debug-providers', {
        cache: 'no-store'
      })
      const providers = await providersRes.json()

      // Fetch provider initialization test
      const initRes = await fetch('/api/test-provider-init', {
        cache: 'no-store'
      })
      const providerInit = await initRes.json()

      // Fetch available models
      const modelsRes = await fetch('/api/chat/models', {
        cache: 'no-store'
      })
      const models = await modelsRes.json()

      setDebugInfo({
        providers,
        providerInit,
        models,
        loading: false
      })
    } catch (error: unknown) {
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      })
    }
  }

  if (debugInfo.loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading Debug Information...</h1>
        </div>
      </div>
    )
  }

  if (debugInfo.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-red-600 mb-8">Error Loading Debug Info</h1>
          <pre className="bg-red-50 p-4 rounded">{debugInfo.error}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Model & Provider Debug Information</h1>

        {/* Quick Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium text-gray-600 mb-2">Available Providers</h3>
              <div className="space-y-1">
                {((debugInfo.providers as { summary?: { availableProviders?: string[] } })?.summary?.availableProviders || []).map((p: string) => (
                  <div key={p} className="text-green-600">✅ {p}</div>
                ))}
                {((debugInfo.providers as { summary?: { unavailableProviders?: string[] } })?.summary?.unavailableProviders || []).map((p: string) => (
                  <div key={p} className="text-red-600">❌ {p}</div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium text-gray-600 mb-2">Working Providers (Init Test)</h3>
              <div className="space-y-1">
                {((debugInfo.providerInit as { summary?: { workingProviders?: string[] } })?.summary?.workingProviders || []).map((p: string) => (
                  <div key={p} className="text-green-600">✅ {p}</div>
                ))}
                {((debugInfo.providerInit as { summary?: { failedProviders?: string[] } })?.summary?.failedProviders || []).map((p: string) => (
                  <div key={p} className="text-red-600">❌ {p}</div>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium text-gray-600 mb-2">Models API</h3>
              <div className="text-sm">
                <div>Total Models: {(debugInfo.models as { models?: unknown[] })?.models?.length || 0}</div>
                <div>Providers: {[...new Set((debugInfo.models as { models?: Array<{ provider: string }> })?.models?.map((m) => m.provider) || [])].join(', ')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Environment Variables */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Environment Variable Access</h2>
          <div className="space-y-4">
            {((debugInfo.providers as { providers?: Array<{
              name: string
              envVarName: string
              keyExists: boolean
              keyLength: number
              isPlaceholder: boolean
              directAccess: boolean
              dynamicAccess: boolean
              isAvailable: boolean
              directValue?: string
              description?: string
            }> })?.providers || []).map((p) => (
              <div key={p.name} className="border-l-4 border-gray-300 pl-4">
                <h3 className="font-medium text-lg">{p.name.toUpperCase()}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>Environment Variable: <code className="bg-gray-100 px-1">{p.envVarName}</code></div>
                  <div>Key Exists: <span className={p.keyExists ? 'text-green-600' : 'text-red-600'}>{p.keyExists ? 'Yes' : 'No'}</span></div>
                  <div>Key Length: {p.keyLength}</div>
                  <div>Is Placeholder: <span className={p.isPlaceholder ? 'text-yellow-600' : 'text-gray-600'}>{p.isPlaceholder ? 'Yes' : 'No'}</span></div>
                  <div>Direct Access: {p.directAccess ? '✅' : '❌'}</div>
                  <div>Dynamic Access: {p.dynamicAccess ? '✅' : '❌'}</div>
                  <div className="col-span-2">
                    Available: <span className={p.isAvailable ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                      {p.isAvailable ? 'YES' : 'NO'}
                    </span>
                  </div>
                  {p.directValue && (
                    <div className="col-span-2">Preview: <code className="bg-gray-100 px-1">{p.directValue}</code></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Initialization Tests */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Provider Initialization Tests</h2>
          <div className="space-y-4">
            {((debugInfo.providerInit as { basicTests?: Array<{
              provider: string
              importSuccess: boolean
              modelCreation: boolean
              apiKeyFound: boolean
              modelId: string
              importError?: string
              modelError?: string
              testMessage?: string
            }> })?.basicTests || []).map((test) => (
              <div key={test.provider} className="border-l-4 border-gray-300 pl-4">
                <h3 className="font-medium text-lg">{test.provider.toUpperCase()}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>Import Success: {test.importSuccess ? '✅' : '❌'}</div>
                  <div>Model Creation: {test.modelCreation ? '✅' : '❌'}</div>
                  <div>API Key Found: {test.apiKeyFound ? '✅' : '❌'}</div>
                  <div>Model ID: <code className="bg-gray-100 px-1">{test.modelId}</code></div>
                  {test.importError && (
                    <div className="col-span-2 text-red-600">Import Error: {test.importError}</div>
                  )}
                  {test.modelError && (
                    <div className="col-span-2 text-red-600">Model Error: {test.modelError}</div>
                  )}
                  {test.testMessage && (
                    <div className="col-span-2 text-green-600">{test.testMessage}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available Models from API */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Models from /api/models</h2>
          {(debugInfo.models as { models?: Array<{
            provider: string
            id: string
            name: string
            available: boolean
          }> })?.models ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Provider</th>
                    <th className="text-left p-2">Model ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {((debugInfo.models as { models: Array<{
                    provider: string
                    id: string
                    name: string
                    available: boolean
                  }> }).models).map((model) => (
                    <tr key={`${model.provider}-${model.id}`} className="border-b">
                      <td className="p-2">{model.provider}</td>
                      <td className="p-2"><code className="bg-gray-100 px-1">{model.id}</code></td>
                      <td className="p-2">{model.name}</td>
                      <td className="p-2">{model.available ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500">No models data available</div>
          )}
        </div>

        {/* Runtime Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Runtime Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Runtime: {(debugInfo.providers as { runtimeInfo?: { runtime: string } })?.runtimeInfo?.runtime}</div>
            <div>Node Version: {(debugInfo.providers as { runtimeInfo?: { nodeVersion: string } })?.runtimeInfo?.nodeVersion}</div>
            <div>Platform: {(debugInfo.providers as { runtimeInfo?: { platform: string } })?.runtimeInfo?.platform}</div>
            <div>Environment: {(debugInfo.providers as { runtimeInfo?: { env: string } })?.runtimeInfo?.env}</div>
            <div>Total Env Vars: {(debugInfo.providers as { runtimeInfo?: { envVarCount: number } })?.runtimeInfo?.envVarCount}</div>
            <div>AI-Related Env Vars: {(debugInfo.providers as { runtimeInfo?: { relevantEnvVars: unknown[] } })?.runtimeInfo?.relevantEnvVars?.length}</div>
          </div>

          {(debugInfo.providers as { runtimeInfo?: { relevantEnvVars?: Array<{
            key: string
            exists: boolean
            length: number
            preview?: string
          }> } })?.runtimeInfo?.relevantEnvVars && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">AI-Related Environment Variables:</h3>
              <div className="space-y-1">
                {((debugInfo.providers as { runtimeInfo: { relevantEnvVars: Array<{
                  key: string
                  exists: boolean
                  length: number
                  preview?: string
                }> } }).runtimeInfo.relevantEnvVars).map((envVar) => (
                  <div key={envVar.key} className="text-sm font-mono bg-gray-50 p-2 rounded">
                    <span className={envVar.exists ? 'text-green-600' : 'text-red-600'}>
                      {envVar.exists ? '✅' : '❌'}
                    </span>{' '}
                    {envVar.key} ({envVar.length} chars)
                    {envVar.preview && <span className="text-gray-500"> - {envVar.preview}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Raw JSON Data */}
        <details className="bg-white p-6 rounded-lg shadow">
          <summary className="cursor-pointer font-semibold text-lg">Raw Debug Data (JSON)</summary>
          <div className="mt-4">
            <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </details>

        <div className="text-center py-4">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Debug Info
          </button>
        </div>
      </div>
    </div>
  )
}