"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EducationPage() {
  const router = useRouter()

  // Redirect to the new onboarding page
  useEffect(() => {
    router.replace('/onboarding')
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-600">Redirecting to onboarding...</p>
    </div>
  )
}