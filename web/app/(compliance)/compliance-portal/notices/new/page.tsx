'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, AlertCircle, Info, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'

const noticeTypes = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'regulatory_update', label: 'Regulatory Update' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'security_alert', label: 'Security Alert' },
  { value: 'offering_update', label: 'Offering Update' },
  { value: 'terms_update', label: 'Terms Update' },
  { value: 'feature_release', label: 'Feature Release' }
]

const priorityOptions = [
  { value: 'low', label: 'Low', description: 'General information' },
  { value: 'normal', label: 'Normal', description: 'Standard announcement' },
  { value: 'high', label: 'High', description: 'Important update' },
  { value: 'critical', label: 'Critical', description: 'Urgent action required' }
]

const audienceOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'verified', label: 'Verified Users Only' },
  { value: 'investors', label: 'Active Investors' }
]

export default function CreateNoticePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    notice_type: 'announcement',
    priority: 'normal',
    target_audience: 'all'
  })

  const handleSubmit = async (broadcast: boolean = false) => {
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('You must be logged in to create notices')
        return
      }

      // Get the portal account ID for the current user
      const { data: portalAccount } = await supabase
        .from('portal_accounts')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!portalAccount) {
        toast.error('Portal account not found. Please contact an administrator.')
        return
      }

      // If broadcasting, use the broadcast function (which creates both notice and notifications)
      if (broadcast) {
        // Try the simpler admin function first, fall back to regular if it fails
        const { data: broadcastData, error: broadcastError } = await supabase.rpc('admin_broadcast_notice', {
          p_title: formData.title,
          p_content: formData.content,
          p_notice_type: formData.notice_type,
          p_priority: formData.priority,
          p_target_audience: formData.target_audience
        })

        if (broadcastError) {
          console.error('Broadcast error full object:', broadcastError)
          console.error('Broadcast error details:', {
            message: broadcastError?.message || 'No message',
            code: broadcastError?.code || 'No code',
            details: broadcastError?.details || 'No details',
            hint: broadcastError?.hint || 'No hint'
          })

          // Try the regular broadcast function as fallback
          const { data: fallbackData, error: fallbackError } = await supabase.rpc('broadcast_system_notice', {
            p_title: formData.title,
            p_content: formData.content,
            p_notice_type: formData.notice_type,
            p_priority: formData.priority,
            p_target_audience: formData.target_audience
          })

          if (fallbackError) {
            toast.error(`Notice created but broadcast failed: ${fallbackError.message || 'Unknown error'}`)
          } else {
            const count = fallbackData?.[0]?.notifications_created || 0
            toast.success(`Notice broadcast to ${count} users!`)
          }
        } else {
          const count = broadcastData?.[0]?.notifications_created || 0
          toast.success(`Notice broadcast to ${count} users!`)
        }
      } else {
        // Only create the notice without broadcasting
        const { data: notice, error: noticeError } = await supabase
          .from('system_notices')
          .insert([{
            title: formData.title,
            content: formData.content,
            notice_type: formData.notice_type,
            priority: formData.priority,
            target_audience: formData.target_audience,
            is_published: false,
            published_at: null,
            published_by: null,
            broadcast_at: null,
            broadcast_by: null,
            created_by: portalAccount.id,
            metadata: {}
          }])
          .select()
          .single()

        if (noticeError) {
          console.error('Notice creation error:', noticeError)
          toast.error(`Failed to create notice: ${noticeError.message}`)
          return
        }

        toast.success('Notice saved as draft')
      }

      router.push('/compliance-portal/notices')
    } catch (error: unknown) {
      console.error('Error creating notice:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create notice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600" />
          Create System Notice
        </h1>
        <p className="text-gray-600 mt-1">
          Compose and broadcast platform-wide announcements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notice Details</CardTitle>
              <CardDescription>
                Compose your notice content and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter notice title"
                  className="mt-1"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter notice content..."
                  className="mt-1 min-h-[150px]"
                  required
                />
              </div>

              {/* Notice Type */}
              <div>
                <Label htmlFor="notice_type">Notice Type</Label>
                <Select
                  value={formData.notice_type}
                  onValueChange={(value) => setFormData({ ...formData, notice_type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {noticeTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label>Priority</Label>
                <RadioGroup
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  className="mt-2 space-y-2"
                >
                  {priorityOptions.map((option) => (
                    <div key={option.value} className="flex items-start gap-2">
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                        <span className="font-medium">{option.label}</span>
                        {option.description && (
                          <span className="text-sm text-gray-500 ml-2">{option.description}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Target Audience */}
              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {audienceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/compliance-portal/notices')}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              variant="outline"
              disabled={loading || !formData.title || !formData.content}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading || !formData.title || !formData.content}
            >
              Broadcast Now
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.title || formData.content ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {formData.title || 'Notice Title'}
                    </h3>
                    {formData.priority === 'critical' && (
                      <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                        <AlertCircle className="h-3 w-3" />
                        Critical
                      </div>
                    )}
                    {formData.priority === 'high' && (
                      <div className="flex items-center gap-1 text-orange-600 text-xs mt-1">
                        <AlertCircle className="h-3 w-3" />
                        High Priority
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {formData.content || 'Notice content will appear here...'}
                  </p>
                  <div className="pt-2 border-t space-y-1 text-xs text-gray-500">
                    <p>Type: {formData.notice_type.replace('_', ' ')}</p>
                    <p>Audience: {formData.target_audience === 'all' ? 'All users' : formData.target_audience}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  Enter content to see preview
                </p>
              )}
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Guidelines</AlertTitle>
            <AlertDescription className="mt-2 space-y-1 text-xs">
              <p>• Keep titles concise and descriptive</p>
              <p>• Use clear, professional language</p>
              <p>• Critical notices trigger immediate notifications</p>
              <p>• High priority shows warning indicators</p>
              <p>• Broadcasts cannot be undone</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}