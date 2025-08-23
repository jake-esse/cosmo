'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const referralCode = formData.get('referralCode') as string | null

  const supabase = await createClient()

  // Generate username from email (for backwards compatibility)
  const emailPrefix = email.split('@')[0].toLowerCase()
  const baseUsername = emailPrefix.replace(/[^a-z0-9]/g, '_')
  
  // Ensure metadata is properly formatted
  const metadata: Record<string, any> = {
    username: baseUsername, // Auto-generated from email for backwards compatibility
    user_name: baseUsername, // Redundancy for trigger
    full_name: fullName || emailPrefix,
    display_name: fullName || emailPrefix,
    name: fullName || emailPrefix, // Additional redundancy
  }
  
  if (referralCode) {
    metadata.referral_code = referralCode
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    // Provide more user-friendly error messages
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists. Please sign in instead.' }
    }
    if (error.message.includes('password')) {
      return { error: 'Password must be at least 6 characters long.' }
    }
    return { error: error.message }
  }

  if (data.user && !data.user.confirmed_at) {
    return { 
      success: true, 
      message: 'Please check your email to confirm your account',
      requiresEmailConfirmation: true 
    }
  }

  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    return { error: error.message }
  }

  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string
  
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password/confirm`,
  })

  if (error) {
    return { error: error.message }
  }

  return { 
    success: true, 
    message: 'Password reset email sent. Please check your inbox.' 
  }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function completeUserReferral(userId: string) {
  const adminClient = createAdminClient()
  
  try {
    const { data, error } = await adminClient.rpc('complete_referral', {
      p_referred_id: userId
    })
    
    if (error) {
      console.error('Error completing referral:', error)
      return { error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error in completeUserReferral:', error)
    return { error: 'Failed to complete referral' }
  }
}

export async function getUserBalance(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('get_user_balance', {
    p_user_id: userId
  })
  
  if (error) {
    console.error('Error getting user balance:', error)
    return null
  }
  
  return data?.[0] || null
}