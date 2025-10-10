'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileDown, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/config'

const exportTypes = [
  { value: 'user_profiles', label: 'User Profiles', description: 'User IDs, names, and registration dates' },
  { value: 'equity_transactions', label: 'Equity Transactions', description: 'All equity point transactions and balances' },
  { value: 'referrals', label: 'Referral Data', description: 'Referral relationships and status' },
  { value: 'notifications', label: 'Notification History', description: 'User notifications and read status' },
  { value: 'audit_logs', label: 'Audit Logs', description: 'Database operation audit trail' }
]

const dateRangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' }
]

export default function ExportsPage() {
  const [exporting, setExporting] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['user_profiles'])
  const [dateRange, setDateRange] = useState('30d')
  const [format, setFormat] = useState('csv')

  const handleExport = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one data type to export')
      return
    }

    setExporting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Get the portal account ID for the current user
      const { data: portalAccount } = await supabase
        .from('portal_accounts')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single()

      if (!portalAccount) {
        toast.error('Portal account not found')
        return
      }

      // Process each selected type separately
      for (const exportType of selectedTypes) {
        // Create export record
        const { data: exportRecord, error: exportError } = await supabase
          .from('compliance_exports')
          .insert([{
            portal_account_id: portalAccount.id,
            export_type: exportType,
            export_format: format,
            status: 'processing',
            requested_at: new Date().toISOString(),
            metadata: {
              date_range: dateRange,
              export_type: exportType
            }
          }])
          .select()
          .single()

        if (exportError) {
          console.error('Error creating export record:', exportError)
          toast.error(`Failed to start export for ${exportType}`)
          continue
        }

        // Call the API to generate and download the CSV
        try {
          const response = await fetch(getApiUrl('/api/compliance/export'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              export_id: exportRecord.id,
              export_type: exportType,
              date_range: dateRange
            })
          })

          if (!response.ok) {
            throw new Error('Export failed')
          }

          // Get the blob from the response
          const blob = await response.blob()

          // Create download link
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `export-${exportType}-${new Date().toISOString().split('T')[0]}.${format}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)

          toast.success(`Export completed for ${exportType.replace('_', ' ')}`)
        } catch (apiError) {
          console.error('API error:', apiError)
          toast.error(`Failed to export ${exportType.replace('_', ' ')}`)

          // Update the export record to failed
          await supabase
            .from('compliance_exports')
            .update({ status: 'failed' })
            .eq('id', exportRecord.id)
        }
      }
    } catch (error) {
      console.error('Error creating export:', error)
      toast.error('Failed to start export')
    } finally {
      setExporting(false)
    }
  }


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <FileDown className="h-6 w-6 text-blue-600" />
          Export Compliance Data
        </h1>
        <p className="text-gray-600 mt-1">
          Export user and platform data for regulatory compliance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configure Export</CardTitle>
              <CardDescription>
                Select the data types and date range to export
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Types */}
              <div>
                <Label className="text-base mb-3 block">Data Types</Label>
                <div className="space-y-3">
                  {exportTypes.map((type) => (
                    <div key={type.value} className="flex items-start gap-3">
                      <Checkbox
                        id={type.value}
                        checked={selectedTypes.includes(type.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTypes([...selectedTypes, type.value])
                          } else {
                            setSelectedTypes(selectedTypes.filter(t => t !== type.value))
                          }
                        }}
                        disabled={false}
                      />
                      <div className="flex-1">
                        <Label htmlFor={type.value} className="cursor-pointer">
                          {type.label}
                        </Label>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <Label htmlFor="dateRange">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Format - Currently only CSV */}
              <div>
                <Label htmlFor="format">Export Format</Label>
                <Select value={format} onValueChange={setFormat} disabled>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Default)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={exporting || selectedTypes.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {exporting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing Export...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Start Export
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Information */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-1 mt-2">
              <p>• Exports are generated instantly as CSV files</p>
              <p>• Each selected type downloads separately</p>
              <p>• All exports are logged for audit purposes</p>
              <p>• Data is filtered by the selected date range</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}