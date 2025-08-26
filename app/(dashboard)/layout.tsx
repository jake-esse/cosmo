import { Metadata } from "next"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/DashboardSidebar'
import DashboardHeader from '@/components/DashboardHeader'

export const metadata: Metadata = {
  title: "Dashboard - Cosmo",
  description: "Manage your AI apps and equity",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  // Check if user is admin using explicit database flag
  const isAdmin = profile?.is_admin === true

  return (
    <div className="min-h-screen bg-white">
      <DashboardSidebar isAdmin={isAdmin} />
      <div className="lg:pl-64">
        <DashboardHeader user={user} profile={profile} />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}