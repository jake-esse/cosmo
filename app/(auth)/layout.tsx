import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cosmo - AI App Store",
  description: "Join the first AI app store where users earn equity",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Cosmo</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}