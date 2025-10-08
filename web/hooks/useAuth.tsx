'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@shared/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: Error | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) throw userError
        
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError
          }
          
          setAuthState({
            user,
            profile,
            loading: false,
            error: null
          })
        } else {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null
          })
        }
      } catch (error) {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          error: error as Error
        })
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        setAuthState({
          user: session.user,
          profile,
          loading: false,
          error: null
        })
      } else {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          error: null
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    ...authState,
    signIn,
    signUp,
    signOut
  }
}