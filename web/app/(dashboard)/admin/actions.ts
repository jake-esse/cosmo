'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Complete a referral manually (for testing)
export async function completeReferralManually(referredUserId: string) {
  const supabase = await createClient()
  
  try {
    // Call the complete_referral_secure function
    const { data, error } = await supabase.rpc('complete_referral_secure', {
      p_referred_id: referredUserId
    })
    
    if (error) throw error
    
    revalidatePath('/admin/referrals')
    return { success: true, data }
  } catch (error) {
    console.error('Error completing referral:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Test fraud detection
export async function testFraudDetection(referrerId: string, referredId: string, testIp: string) {
  const supabase = await createClient()
  
  try {
    // Calculate fraud score
    const { data: fraudScore, error: fraudError } = await supabase.rpc('calculate_referral_fraud_score', {
      p_referrer_id: referrerId,
      p_referred_id: referredId,
      p_signup_ip: testIp
    })
    
    if (fraudError) throw fraudError
    
    // Check IP security
    const { data: ipCheck, error: ipError } = await supabase.rpc('check_ip_security', {
      p_ip: testIp,
      p_action: 'referral'
    })
    
    if (ipError) throw ipError
    
    return { 
      success: true, 
      fraudScore,
      ipCheck
    }
  } catch (error) {
    console.error('Error testing fraud detection:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Test referral validation
export async function testReferralValidation(userId: string, referralCode: string) {
  const supabase = await createClient()
  
  try {
    // Validate referral code format
    const { data: isValid, error: validError } = await supabase.rpc('validate_referral_code', {
      p_code: referralCode
    })
    
    if (validError) throw validError
    
    // Check if user can send referral
    const { data: canRefer, error: referError } = await supabase.rpc('can_send_referral', {
      p_user_id: userId
    })
    
    if (referError) throw referError
    
    return { 
      success: true, 
      codeValid: isValid,
      canRefer
    }
  } catch (error) {
    console.error('Error testing validation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Block/unblock suspicious user
export async function toggleUserBlock(userId: string, reason: string, adminId: string) {
  const supabase = await createClient()
  
  try {
    // Check current status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_suspicious')
      .eq('id', userId)
      .single()
    
    if (profileError) throw profileError
    
    if (profile.is_suspicious) {
      // Unblock user
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspicious: false,
          suspension_reason: null,
          suspended_at: null
        })
        .eq('id', userId)
      
      if (error) throw error
    } else {
      // Block user
      const { data, error } = await supabase.rpc('block_suspicious_user', {
        p_user_id: userId,
        p_reason: reason,
        p_admin_id: adminId
      })
      
      if (error) throw error
    }
    
    revalidatePath('/admin/referrals')
    return { success: true }
  } catch (error) {
    console.error('Error toggling user block:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Update security configuration
export async function updateSecurityConfig(configKey: string, configValue: string) {
  const supabase = await createClient()
  
  try {
    // Parse the value appropriately based on the config key
    let parsedValue: string | number | boolean = configValue
    
    // For boolean configs
    if (configKey === 'require_email_verification') {
      parsedValue = configValue === 'true'
    } 
    // For numeric configs (including decimals)
    else if (!isNaN(Number(configValue))) {
      parsedValue = Number(configValue)
    }
    
    // Use RPC to update the config value
    const { data, error } = await supabase.rpc('update_security_config', {
      p_config_key: configKey,
      p_config_value: parsedValue
    })
    
    if (error) throw error
    
    if (data && data.success === false) {
      throw new Error(data.error || 'Failed to update config')
    }
    
    revalidatePath('/admin/referrals')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Error updating config:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Clear referral attempts for testing
export async function clearReferralAttempts(userId?: string) {
  const supabase = await createClient()
  
  try {
    let query = supabase.from('referral_attempts').delete()
    
    if (userId) {
      query = query.eq('referrer_id', userId)
    } else {
      // Delete all attempts older than 1 hour for testing
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      query = query.lt('created_at', oneHourAgo)
    }
    
    const { error } = await query
    
    if (error) throw error
    
    revalidatePath('/admin/referrals')
    return { success: true }
  } catch (error) {
    console.error('Error clearing attempts:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Test idempotency
export async function testIdempotency(userId: string, requestId: string) {
  const supabase = await createClient()
  
  try {
    // Try to award points twice with same request ID
    const results = []
    
    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabase.rpc('award_equity_points', {
        p_user_id: userId,
        p_action_type: 'referral_completed',
        p_amount: 50,
        p_request_id: requestId,
        p_description: `Test idempotency attempt ${i + 1}`
      })
      
      results.push({ attempt: i + 1, data, error: error?.message })
    }
    
    return { 
      success: true, 
      results,
      idempotent: results[0].data === results[1].data
    }
  } catch (error) {
    console.error('Error testing idempotency:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}