import { Metadata } from "next"
import { requireComplianceAccess } from '@/lib/compliance/auth'
import { Shield, AlertCircle } from 'lucide-react'
import { ComplianceNav } from '@/components/compliance/ComplianceNav'

export const metadata: Metadata = {
  title: "Compliance Portal - Cosmo",
  description: "Compliance and regulatory administration portal",
}

export default async function ComplianceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, complianceUser } = await requireComplianceAccess()

  if (!complianceUser) {
    // This should not happen due to requireComplianceAccess, but safety check
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You do not have access to the compliance portal.</p>
          <a href="/dashboard" className="text-blue-600 hover:text-blue-800 underline">
            Return to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compliance Header Banner */}
      <div className="bg-blue-600 text-white px-4 py-2 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Compliance Mode</span>
            <span className="text-xs opacity-75">• {complianceUser.role.replace('_', ' ').toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="opacity-75">Logged in as: {complianceUser.full_name}</span>
            <a
              href="/dashboard"
              className="text-white hover:text-blue-100 underline"
            >
              Exit Portal
            </a>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <ComplianceNav user={complianceUser} />

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}