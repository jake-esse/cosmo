'use client'

import { useState } from 'react'
import { Settings, Save, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateSecurityConfig } from '@/app/(dashboard)/admin/actions'

interface SecurityConfig {
  id: string
  config_key: string
  config_value: unknown
  description: string
  active: boolean
}

interface AdminSecurityConfigProps {
  config: SecurityConfig[]
}

export default function AdminSecurityConfig({ config }: AdminSecurityConfigProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  
  const handleEdit = (key: string, currentValue: unknown) => {
    setEditing(key)
    // Handle JSONB values - could be number, boolean, or string
    const valueStr = typeof currentValue === 'object' && currentValue !== null ?
      JSON.stringify(currentValue) :
      String(currentValue)
    setValues(prev => ({ ...prev, [key]: valueStr }))
  }
  
  const handleSave = async (key: string) => {
    setSaving(key)
    setSavedMessage(null)
    
    const result = await updateSecurityConfig(key, values[key])
    
    if (result.success) {
      setEditing(null)
      setSavedMessage(key)
      // Clear success message after 3 seconds
      setTimeout(() => setSavedMessage(null), 3000)
      // Force a page refresh to get updated values
      window.location.reload()
    } else {
      alert(`Error updating ${key}: ${result.error}`)
    }
    setSaving(null)
  }
  
  const handleCancel = (key: string) => {
    setEditing(null)
    delete values[key]
  }
  
  const getConfigDisplay = (key: string) => {
    switch (key) {
      case 'max_referrals_per_day':
        return { label: 'Max Daily Referrals', unit: 'per user' }
      case 'max_referrals_per_week':
        return { label: 'Max Weekly Referrals', unit: 'per user' }
      case 'max_referrals_per_month':
        return { label: 'Max Monthly Referrals', unit: 'per user' }
      case 'max_signups_per_ip_per_day':
        return { label: 'Max Daily Signups', unit: 'per IP' }
      case 'max_signups_per_ip_per_week':
        return { label: 'Max Weekly Signups', unit: 'per IP' }
      case 'referral_cooldown_minutes':
        return { label: 'Referral Cooldown', unit: 'minutes' }
      case 'min_account_age_hours':
        return { label: 'Min Account Age', unit: 'hours' }
      case 'require_email_verification':
        return { label: 'Require Email Verification', unit: '' }
      case 'suspicious_ip_threshold':
        return { label: 'Suspicious IP Threshold', unit: 'accounts' }
      case 'auto_block_suspicious_threshold':
        return { label: 'Auto-block Threshold', unit: 'fraud score' }
      default:
        return { label: key, unit: '' }
    }
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Security Configuration
          </h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Click Edit to modify values. Set &quot;Min Account Age&quot; to 0 to allow immediate referrals for testing.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {config.map((item) => {
          const display = getConfigDisplay(item.config_key)
          const isEditing = editing === item.config_key
          
          return (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {display.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
              
              <div className="mt-3">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type={item.config_key.includes('require') ? 'checkbox' : 'text'}
                      value={values[item.config_key] || ''}
                      onChange={(e) => setValues(prev => ({
                        ...prev,
                        [item.config_key]: item.config_key.includes('require') 
                          ? e.target.checked.toString()
                          : e.target.value
                      }))}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSave(item.config_key)}
                      disabled={saving === item.config_key}
                    >
                      {saving === item.config_key ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(item.config_key)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-gray-900">
                        {typeof item.config_value === 'boolean' 
                          ? (item.config_value ? 'Yes' : 'No')
                          : item.config_value}
                      </span>
                      {display.unit && (
                        <span className="text-xs text-gray-500">{display.unit}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(item.config_key, item.config_value)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}