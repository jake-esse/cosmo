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
  
  // IMPORTANT: Referral Completion Timing
  // There's a race condition where email verification can complete before the referral record is created
  // This is handled by multiple failsafes:
  // 1. The handle_new_user_secure_v2 trigger checks if email is already verified and completes referral immediately
  // 2. The auth callback tries multiple RPC methods to complete pending referrals
  // 3. The dashboard page checks for pending referrals on every load
  // This ensures referral points are awarded regardless of timing
  
  // Get request headers for security tracking
  const headersList = await headers()
  
  // Extract IP address from various headers (in order of preference)
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const cfConnectingIp = headersList.get('cf-connecting-ip')
  const remoteAddr = headersList.get('x-remote-addr')
  
  let ipAddress = '0.0.0.0' // Default fallback
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    ipAddress = forwardedFor.split(',')[0].trim()
  } else if (realIp) {
    ipAddress = realIp
  } else if (cfConnectingIp) {
    // Cloudflare specific header
    ipAddress = cfConnectingIp
  } else if (remoteAddr) {
    ipAddress = remoteAddr
  }
  
  // Get user agent
  const userAgent = headersList.get('user-agent') || 'Unknown'
  
  // Validate IP address format (basic check)
  const isValidIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(ipAddress) || 
                    /^[a-fA-F0-9:]+$/.test(ipAddress) // IPv6
  
  if (!isValidIp) {
    console.warn('Invalid IP address format:', ipAddress)
    ipAddress = '0.0.0.0'
  }
  
  // Log for debugging
  console.log('Signup attempt:', {
    email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially hide email
    referralCode: referralCode || 'none',
    ipAddress,
    userAgent: userAgent.substring(0, 50) // First 50 chars only
  })
  
  // Validate referral code format if provided
  if (referralCode) {
    // Check if code matches expected pattern (8 uppercase alphanumeric)
    const isValidCode = /^[A-Z0-9]{8}$/.test(referralCode.toUpperCase())
    if (!isValidCode) {
      console.warn('Invalid referral code format:', referralCode)
      return { error: 'Invalid referral code format. Please check and try again.' }
    }
  }

  // Generate username from email (for backwards compatibility)
  const emailPrefix = email.split('@')[0].toLowerCase()
  const baseUsername = emailPrefix.replace(/[^a-z0-9]/g, '_')
  
  // Ensure metadata is properly formatted with security data
  const metadata: Record<string, unknown> = {
    username: baseUsername, // Auto-generated from email for backwards compatibility
    user_name: baseUsername, // Redundancy for trigger
    full_name: fullName || emailPrefix,
    display_name: fullName || emailPrefix,
    name: fullName || emailPrefix, // Additional redundancy
    signup_ip: ipAddress, // For security tracking
    user_agent: userAgent, // For fraud detection
  }
  
  if (referralCode) {
    // Store uppercase version for consistency
    metadata.referral_code = referralCode.toUpperCase()
    console.log('Referral code included in signup:', referralCode.toUpperCase())
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
    console.error('Signup error:', error.message)
    // Provide more user-friendly error messages
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists. Please sign in instead.' }
    }
    if (error.message.includes('password')) {
      return { error: 'Password must be at least 6 characters long.' }
    }
    return { error: error.message }
  }

  if (data.user) {
    console.log('User created successfully:', {
      userId: data.user.id,
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      hasReferralCode: !!referralCode,
      ipAddress,
      confirmed: !!data.user.confirmed_at
    })
    
    if (!data.user.confirmed_at) {
      return { 
        success: true, 
        message: 'Please check your email to confirm your account',
        requiresEmailConfirmation: true 
      }
    }
  }

  redirect('/chat')
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

  // Return success instead of redirecting to avoid NEXT_REDIRECT error
  // Let the client handle the redirect
  return { success: true }
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

  redirect('/chat')
}

export async function completeUserReferral(userId: string) {
  const adminClient = createAdminClient()
  
  try {
    console.log('Attempting to complete referral for user:', userId)
    
    // Use the secure version of complete_referral
    const { data, error } = await adminClient.rpc('complete_referral_secure', {
      p_referred_id: userId
    } as never)
    
    if (error) {
      console.error('Error completing referral:', error)
      return { error: error.message }
    }
    
    console.log('Referral completion result:', data)
    
    // Check if the response indicates success
    if (data && typeof data === 'object' && 'success' in data) {
      if (!data.success) {
        console.warn('Referral not completed:', data.reason)
        return { error: data.reason || 'Referral could not be completed' }
      }
    }
    
    return { success: true, data }
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
  
  // The new function returns JSONB directly
  return data
}

export async function getUserReferralStats(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('get_user_referral_stats', {
    p_user_id: userId
  })
  
  if (error) {
    console.error('Error getting referral stats:', error)
    return null
  }
  
  return data
}

export async function applyReferralCode(userId: string, referralCode: string) {
  const adminClient = createAdminClient()
  const headersList = await headers()
  
  // Get IP and user agent for security tracking
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const cfConnectingIp = headersList.get('cf-connecting-ip')
  
  let ipAddress = '0.0.0.0'
  if (forwardedFor) {
    ipAddress = forwardedFor.split(',')[0].trim()
  } else if (realIp) {
    ipAddress = realIp
  } else if (cfConnectingIp) {
    ipAddress = cfConnectingIp
  }
  
  const userAgent = headersList.get('user-agent') || 'Unknown'
  
  // Validate referral code format
  const isValidCode = /^[A-Z0-9]{8}$/.test(referralCode.toUpperCase())
  if (!isValidCode) {
    return { error: 'Invalid referral code format' }
  }
  
  try {
    console.log('Applying referral code:', {
      userId,
      code: referralCode.toUpperCase(),
      ipAddress
    })
    
    const { data, error } = await adminClient.rpc('validate_and_apply_referral_code', {
      p_user_id: userId,
      p_referral_code: referralCode.toUpperCase(),
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    })
    
    if (error) {
      console.error('Error applying referral code:', error)
      return { error: error.message }
    }
    
    console.log('Referral code application result:', data)
    
    if (data && typeof data === 'object' && 'success' in data) {
      if (!data.success) {
        return { error: data.reason || 'Could not apply referral code' }
      }
      return { success: true, data }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error in applyReferralCode:', error)
    return { error: 'Failed to apply referral code' }
  }
}