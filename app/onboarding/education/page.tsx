"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function EducationPage() {
  const router = useRouter()
  const [acknowledgments, setAcknowledgments] = useState({
    understand_risks: false,
    shares_illiquid: false,
    accept_terms: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allChecked = Object.values(acknowledgments).every(v => v)

  const handleCheckChange = (key: keyof typeof acknowledgments) => {
    setAcknowledgments(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSubmit = async () => {
    if (!allChecked) return
    
    setIsSubmitting(true)
    setError(null)
    
    const supabase = createClient()
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError("You must be logged in to continue")
      setIsSubmitting(false)
      return
    }
    
    // Call the complete_onboarding_and_award_equity function
    const { error: rpcError } = await supabase
      .rpc('complete_onboarding_and_award_equity', {
        p_user_id: user.id,
        p_understands_risks: acknowledgments.understand_risks,
        p_understands_illiquidity: acknowledgments.shares_illiquid,
        p_understands_total_loss: false, // We removed this checkbox, so set to false
        p_accepts_terms: acknowledgments.accept_terms
      })
    
    if (rpcError) {
      console.error('Onboarding error:', rpcError)
      setError(rpcError.message)
      setIsSubmitting(false)
      return
    }
    
    // Success - redirect to complete page
    router.push('/onboarding/complete')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-brand text-3xl text-slate-900">Welcome to Ampel&apos;s Equity Program</h1>
        <p className="text-slate-600">Before receiving your shares, please review and acknowledge the following:</p>
      </div>

      {/* Risk Disclosure Cards */}
      <div className="space-y-4">
        <div className="card-section">
          <h3 className="font-semibold text-lg text-slate-900 mb-2">How it Works</h3>
          <p className="text-slate-700">
            Ampel is offering you equity in return for signing up and referring friends. There are no other requirements.
          </p>
        </div>

        <div className="card-section">
          <h3 className="font-semibold text-lg text-slate-900 mb-2">Real Equity</h3>
          <p className="text-slate-700">
            These are non-voting common shares worth $0.00001 each. You have no control over company decisions.
          </p>
        </div>

        <div className="card-section">
          <h3 className="font-semibold text-lg text-slate-900 mb-2">No Trading, Yet</h3>
          <p className="text-slate-700">
            Shares cannot be sold for at least 1 year per SEC rules. Even after that, there may be no buyers.
          </p>
        </div>

        <div className="card-section">
          <h3 className="font-semibold text-lg text-slate-900 mb-2">Ampel is a Startup</h3>
          <p className="text-slate-700">
            Most startups fail. As such, your shares may become worthless -- but as a user, you can make a difference!
          </p>
        </div>
      </div>

      {/* Acknowledgments */}
      <div className="card-section bg-slate-50">
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledgments.understand_risks}
              onChange={() => handleCheckChange('understand_risks')}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-slate-700">I understand the risks</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledgments.shares_illiquid}
              onChange={() => handleCheckChange('shares_illiquid')}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-slate-700">I understand shares are illiquid</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledgments.accept_terms}
              onChange={() => handleCheckChange('accept_terms')}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-slate-700">I accept the terms</span>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!allChecked || isSubmitting}
          className={`mt-6 w-full px-6 py-3 rounded-lg font-medium transition-all ${
            allChecked && !isSubmitting
              ? 'bg-slate-900 text-white hover:bg-slate-800' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}