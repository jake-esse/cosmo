import { Metadata } from "next"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: "Admin - Cosmo",
  description: "Admin dashboard for Cosmo platform",
}

async function checkAdminAccess(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  // Get profile with admin flag
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  
  // Simply return the is_admin flag
  return profile?.is_admin === true
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  // Check admin access
  const isAdmin = await checkAdminAccess(user.id)
  
  if (!isAdmin) {
    redirect('/dashboard')
  }
  
  return (
    <div>
      {/* Admin Header Banner */}
      <div className="bg-red-600 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">Admin Mode</span>
          <span className="text-xs opacity-75">• Full system access enabled</span>
        </div>
      </div>
      
      {/* Admin Content */}
      <div className="bg-gray-50 min-h-screen">
        {children}
      </div>
    </div>
  )
}