"use client"

import { useState } from "react"
import Link from "next/link"
import { PageLayout } from "@/components/layout/PageLayout"

export default function AppsPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setSubmitted(true)
    setEmail("")
    
    // Reset success message after 3 seconds
    setTimeout(() => setSubmitted(false), 3000)
  }
  
  return (
    <PageLayout pageName="Apps">
      <div className="max-w-6xl mx-auto p-8">
        {/* Featured App - Ampel */}
        <div className="mb-8">
          <Link href="/apps/ampel" className="block">
            <div className="bg-white rounded-[30px] border border-[#B0C4C9] hover:border-[#DFECC6] transition-all hover:shadow-lg p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-brand text-heading-lg text-slate-900 mb-2">Ampel</h3>
                  <p className="font-sans text-body-lg text-slate-600">AI App Store Platform</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span className="px-4 py-1.5 rounded-[1000px] text-label-md bg-[#485C11] text-white font-semibold">
                    Earn Real Shares
                  </span>
                  <span className="px-4 py-1.5 rounded-[1000px] text-label-md bg-[#DFECC6] text-[#485C11] font-medium">
                    Regulation CF
                  </span>
                </div>
              </div>
              
              <p className="font-sans text-body-lg text-slate-700 mb-6 leading-relaxed">
                Join the first app store where users earn equity through engagement. Get 100 shares just for signing up, 
                earn more by referring friends, and participate in the future of AI applications.
              </p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-[#DFECC6]/30 rounded-[20px] border border-[#DFECC6]/50">
                  <p className="font-brand text-3xl font-normal text-slate-900">100</p>
                  <p className="font-sans text-label-sm text-slate-600 mt-1 font-medium">Shares on Signup</p>
                </div>
                <div className="text-center p-4 bg-[#DFECC6]/30 rounded-[20px] border border-[#DFECC6]/50">
                  <p className="font-brand text-3xl font-normal text-slate-900">50</p>
                  <p className="font-sans text-label-sm text-slate-600 mt-1 font-medium">Per Referral</p>
                </div>
                <div className="text-center p-4 bg-[#DFECC6]/30 rounded-[20px] border border-[#DFECC6]/50">
                  <p className="font-brand text-3xl font-normal text-slate-900">25</p>
                  <p className="font-sans text-label-sm text-slate-600 mt-1 font-medium">For Being Referred</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-[#B0C4C9]/40">
                <div className="flex items-center gap-4 font-sans text-body-md text-slate-600">
                  <span>1,200+ shareholders</span>
                  <span>•</span>
                  <span>Ends Dec 31, 2025</span>
                </div>
                <button className="px-5 py-2.5 bg-[#485C11] text-white rounded-[1000px] hover:bg-[#485C11]/90 transition-all font-sans text-button-sm shadow-sm">
                  Get Your Shares →
                </button>
              </div>
            </div>
          </Link>
        </div>
        
        {/* Waitlist Card */}
        <div className="bg-[#485C11] rounded-[30px] border border-[#485C11] p-10">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="font-brand text-heading-lg text-white mb-3">Coming Soon</h3>
            <p className="font-sans text-body-lg text-[#DFECC6] mb-2">Build or connect an app on Ampel</p>
            <p className="font-sans text-body-md text-white/70 mb-8 leading-relaxed">
              Be the first to know when we open our platform to developers. 
              Join the waitlist to get early access and exclusive benefits.
            </p>
            
            <form onSubmit={handleWaitlistSubmit} className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 bg-white/10 border border-[#DFECC6]/40 rounded-[1000px] focus:outline-none focus:ring-2 focus:ring-[#DFECC6] focus:border-transparent text-white placeholder-[#DFECC6]/60 font-sans text-body-md"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className={`px-6 py-3 rounded-[1000px] font-sans font-semibold text-button-sm transition-all ${
                  isSubmitting || !email
                    ? 'bg-[#DFECC6]/20 text-[#DFECC6]/40 cursor-not-allowed'
                    : 'bg-[#DFECC6] text-[#485C11] hover:bg-[#DFECC6]/90 shadow-sm'
                }`}
              >
                {isSubmitting ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
            
            {submitted && (
              <p className="mt-4 font-sans text-body-md text-white bg-[#DFECC6]/20 px-5 py-2.5 rounded-[1000px] inline-block">
                ✓ You&apos;re on the list! We&apos;ll email you when we launch.
              </p>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}