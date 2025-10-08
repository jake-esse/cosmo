import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface ComplianceUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'compliance_officer' | 'auditor' | 'viewer'
  permissions: string[]
  is_active: boolean
  last_login_at: string | null
}

export async function checkComplianceAccess(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('check_compliance_access', { p_user_id: userId })

  if (error) {
    console.error('Error checking compliance access:', error)
    return false
  }

  return data === true
}

export async function getComplianceUser(userId: string): Promise<ComplianceUser | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_compliance_user', { p_user_id: userId })

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0] as ComplianceUser
}

export async function updateComplianceLogin(userId: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .rpc('update_compliance_login', { p_user_id: userId })
}

export async function checkCompliancePermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('check_compliance_permission', {
      p_user_id: userId,
      p_permission: permission
    })

  if (error) {
    console.error('Error checking compliance permission:', error)
    return false
  }

  return data === true
}

export async function requireComplianceAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const hasAccess = await checkComplianceAccess(user.id)

  if (!hasAccess) {
    redirect('/dashboard?error=no_compliance_access')
  }

  // Update last login
  await updateComplianceLogin(user.id)

  const complianceUser = await getComplianceUser(user.id)

  return { user, complianceUser }
}

export async function requireCompliancePermission(permission: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const hasPermission = await checkCompliancePermission(user.id, permission)

  if (!hasPermission) {
    redirect('/compliance-portal?error=insufficient_permissions')
  }

  const complianceUser = await getComplianceUser(user.id)

  return { user, complianceUser }
}