"use client"

import { useState } from "react"
import { FloatingNav } from "@/components/landing/FloatingNav"
import { MainNav } from "@/components/landing/MainNav"
import { Benefits } from "@/components/landing/Benefits"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Rewards } from "@/components/landing/Rewards"
import { CTASection } from "@/components/landing/CTASection"
import { Footer } from "@/components/landing/Footer"

export default function DevelopersPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // TODO: Implement actual waitlist submission
    // For now, just simulate a submission
    await new Promise(resolve => setTimeout(resolve, 1000))

    setSubmitted(true)
    setIsSubmitting(false)
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Floating Navigation (always visible) */}
      <FloatingNav />

      {/* Main Container */}
      <div className="relative flex flex-col items-center px-4 md:px-10 pb-5">
        {/* Main Navigation */}
        <div className="w-full max-w-[1200px] mx-auto">
          <MainNav />
        </div>

        {/* Hero Section with Waitlist Form */}
        <header className="w-full max-w-[1200px] mx-auto min-h-[500px] md:h-[738px] relative overflow-clip px-4 md:px-0">
          {/* Main Headline - Responsive */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[30px] md:top-[51px] w-full md:w-[1200px] text-center">
            <h1 className="font-brand font-normal text-5xl sm:text-6xl md:text-8xl lg:text-[160px] leading-[0.85] tracking-[-2px] md:tracking-[-8px] text-black">
              Build on Ampel.
            </h1>
          </div>

          {/* Subheadline - Responsive */}
          <div className="absolute left-1/2 -translate-x-1/2 top-32 md:top-56 w-full md:w-[1060px] text-center px-4 md:px-0">
            <p className="font-sans font-normal text-lg sm:text-xl md:text-[30px] leading-[1.4] tracking-[-0.15px] text-[#6F6F6F]">
              Come change the world by building your app on Ampel.
            </p>
          </div>

          {/* Hero Image with Waitlist Form Overlay - Responsive */}
          <div className="absolute left-0 md:left-0 right-0 md:right-auto top-[200px] md:top-[345px] w-full md:w-[1200px] h-[250px] md:h-[362px] rounded-[20px] md:rounded-[30px] overflow-hidden mx-auto">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/images/hero-landscape.webp')" }}
            />

            {/* Waitlist Form Overlay - No extra shading, just the form */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full px-6">
                {!submitted ? (
                  <div className="space-y-6">
                    {/* Wide container for text */}
                    <div className="text-center max-w-4xl mx-auto">
                      <h2 className="text-white text-4xl md:text-6xl font-brand font-normal mb-3">
                        Join the Developer Waitlist
                      </h2>
                      <p className="text-white/90 text-lg md:text-2xl">
                        Be notified when Ampel opens for third-party developers
                      </p>
                    </div>

                    {/* Narrower container for email form */}
                    <div className="max-w-sm mx-auto">
                      <form onSubmit={handleWaitlistSubmit}>
                        <div
                          className="relative h-[56px] rounded-[1000px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)]"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(20px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                            transform: 'translateZ(0)'
                          }}
                        >
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="absolute left-6 top-1/2 -translate-y-1/2 bg-transparent text-black placeholder:text-slate-600 focus:outline-none text-base w-[calc(100%-80px)]"
                            required
                          />

                          {/* Green Circle Submit Button */}
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#485C11] rounded-full flex items-center justify-center hover:bg-[#485C11]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Submit email"
                          >
                            {isSubmitting ? (
                              <span className="text-white text-xs">...</span>
                            ) : (
                              <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#DFECC6] rounded-full mb-4">
                      <svg className="w-8 h-8 text-[#485C11]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-white text-4xl md:text-6xl font-brand font-normal mb-3">
                      You&apos;re on the list!
                    </h2>
                    <p className="text-white/90 text-lg md:text-2xl">
                      We&apos;ll notify you when Ampel opens for developers.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full flex flex-col items-center">
          {/* Benefits Section */}
          <Benefits />

          {/* How It Works Section */}
          <HowItWorks />

          {/* Current Rewards Section */}
          <Rewards />

          {/* CTA Section with Mountain Image */}
          <CTASection />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}