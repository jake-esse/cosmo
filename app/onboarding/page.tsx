"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { completeEducationAcknowledgment, skipSharesForNow, trackSectionRead, getEducationProgress } from "./actions"
import { Lightbulb, BookOpen, Shield, TrendingUp, Building2, Bell, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react"

interface EducationSection {
  id: string
  title: string
  icon: React.ReactNode
  content: string
}

const educationSections: EducationSection[] = [
  {
    id: "how_it_works",
    title: "How It Works",
    icon: <BookOpen className="w-5 h-5" />,
    content: `Earn non-voting common stock shares through platform use. No money required.

• Sign-up: 100 shares
• Referrals: 50 shares (you) + 25 shares (friend)
• Premium subscription: 100 shares/month

This is real stock that cannot be sold or transferred yet.`
  },
  {
    id: "risks",
    title: "Considerations",
    icon: <Lightbulb className="w-5 h-5" />,
    content: `It's important to consider that:

• Ampel is an early stage company and may fail
• Your shares may become worthless
• You can't yet sell these shares
• Your ownership will be diluted over time`
  },
  {
    id: "restrictions",
    title: "Transfer Restrictions",
    icon: <Shield className="w-5 h-5" />,
    content: `These shares are restricted securities under SEC regulations.

• You can't yet sell or transfer them
• They are not listed on any exchange
• Even after the 1-year holding period, there may be no buyers

These restrictions are permanent. The shares are designed to align long-term incentives, not to provide liquidity.`
  },
  {
    id: "security_type",
    title: "Security Type",
    icon: <TrendingUp className="w-5 h-5" />,
    content: `You are receiving non-voting common stock. This is the same class of shares held by founders, but without voting rights.

• No voting rights
• Last priority in liquidation
• Subject to dilution along with other shareholders`
  },
  {
    id: "company_overview",
    title: "Company Overview",
    icon: <Building2 className="w-5 h-5" />,
    content: `Ampel is an early-stage AI platform startup:

• Industry: AI/Software
• Stage: Pre-revenue
• Employees: 1
• Founded: 2025
• Business model: Subscriptions and in-app revenue share

We are attempting to build a new model for AI app distribution with shared ownership. This is experimental and may not work.`
  },
  {
    id: "company_risks",
    title: "Company-Specific Risks",
    icon: <Bell className="w-5 h-5" />,
    content: `Specific risks related to Ampel:

• No revenue - we have not generated any income
• Unproven model - our business model is experimental
• Only 1 employee (the founder)
• Regulatory uncertainty - securities regulations may impact our model
• Competition - our product and business model can be replicated
• Technology risk - dependent on third-party AI providers

Any of these factors could cause the company to fail.`
  }
]

export default function OnboardingPage() {
  const router = useRouter()
  const [openSections, setOpenSections] = useState<string[]>([])
  const [readSections, setReadSections] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sectionTimers, setSectionTimers] = useState<Record<string, number>>({})
  const [totalTimeSpent, setTotalTimeSpent] = useState(0)

  // Load existing progress on mount
  useEffect(() => {
    async function loadProgress() {
      const progress = await getEducationProgress()
      if (progress) {
        setReadSections(progress.sections_read || [])
        setTotalTimeSpent(progress.time_spent_seconds || 0)
      }
    }
    loadProgress()
  }, [])

  // Track time spent in sections
  useEffect(() => {
    const interval = setInterval(() => {
      if (openSections.length > 0) {
        setSectionTimers(prev => {
          const updated = { ...prev }
          openSections.forEach(sectionId => {
            updated[sectionId] = (updated[sectionId] || 0) + 1
          })
          return updated
        })
        setTotalTimeSpent(prev => prev + 1)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [openSections])

  const handleSectionChange = async (value: string[]) => {
    const previouslyOpen = openSections
    const newlyOpened = value.filter(v => !previouslyOpen.includes(v))

    // Track sections that were just closed
    for (const sectionId of previouslyOpen) {
      if (!value.includes(sectionId) && !readSections.includes(sectionId)) {
        const timeSpent = sectionTimers[sectionId] || 0
        if (timeSpent >= 3) { // Require at least 3 seconds to count as read
          setReadSections(prev => [...prev, sectionId])
          await trackSectionRead(sectionId, timeSpent)
        }
      }
    }

    // Mark newly opened sections
    for (const sectionId of newlyOpened) {
      if (!sectionTimers[sectionId]) {
        setSectionTimers(prev => ({ ...prev, [sectionId]: 0 }))
      }
    }

    setOpenSections(value)
  }

  const allSectionsRead = educationSections.every(section =>
    readSections.includes(section.id) || openSections.includes(section.id)
  )

  const handleSubmit = async () => {
    if (!acknowledged || !allSectionsRead) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Track any still-open sections as read
      for (const sectionId of openSections) {
        if (!readSections.includes(sectionId)) {
          const timeSpent = sectionTimers[sectionId] || 0
          await trackSectionRead(sectionId, timeSpent)
        }
      }

      // Complete the acknowledgment with shares
      await completeEducationAcknowledgment(
        [...readSections, ...openSections],
        totalTimeSpent
      )

      // Redirect will happen automatically via the server action
    } catch (err) {
      console.error('Submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    if (!allSectionsRead) return

    setIsSkipping(true)
    setError(null)

    try {
      // Track any still-open sections as read
      for (const sectionId of openSections) {
        if (!readSections.includes(sectionId)) {
          const timeSpent = sectionTimers[sectionId] || 0
          await trackSectionRead(sectionId, timeSpent)
        }
      }

      // Complete without shares
      await skipSharesForNow(
        [...readSections, ...openSections],
        totalTimeSpent
      )

      // Redirect will happen automatically via the server action
    } catch (err) {
      console.error('Skip error:', err)
      setError(err instanceof Error ? err.message : 'Failed to skip onboarding')
      setIsSkipping(false)
    }
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-brand text-4xl text-gray-900 mb-4">
            Ampel&apos;s Equity Incentive Program
          </h1>
          <p className="text-lg text-gray-600">
            Please read all sections carefully to understand what you&apos;re receiving
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#DFECC6] rounded-full">
            <BookOpen className="w-4 h-4 text-[#485C11]" />
            <span className="text-sm font-medium text-[#485C11]">
              {readSections.length + openSections.filter(id => !readSections.includes(id)).length} of {educationSections.length} sections read
            </span>
          </div>
        </div>

        {/* Educational Sections */}
        <div className="bg-white rounded-[30px] border border-[#B0C4C9]/40 p-8 mb-8">
          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={handleSectionChange}
            className="space-y-4"
          >
            {educationSections.map((section) => {
              const isRead = readSections.includes(section.id)
              const isOpen = openSections.includes(section.id)
              const timeSpent = sectionTimers[section.id] || 0

              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border border-[#B0C4C9]/40 rounded-2xl overflow-hidden"
                >
                  <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 text-left w-full">
                      <div className={`${isRead ? 'text-[#485C11]' : 'text-gray-400'}`}>
                        {section.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {section.title}
                        </h3>
                        {(isRead || (isOpen && timeSpent >= 3)) && (
                          <span className="inline-flex items-center gap-1 text-xs text-[#485C11] mt-1">
                            <CheckCircle2 className="w-3 h-3" /> Read
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4 bg-gray-50/50">
                    <div className="prose prose-gray max-w-none">
                      <p className="whitespace-pre-line text-gray-700 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>

        {/* Acknowledgment Section */}
        <div className="bg-white rounded-[30px] border border-[#B0C4C9]/40 p-8">
          <h2 className="font-brand text-xl text-gray-900 mb-6">
            Acknowledgment & Share Acceptance
          </h2>

          {!allSectionsRead && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200/50 rounded-2xl">
              <p className="text-amber-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Please read all sections before proceeding
              </p>
            </div>
          )}

          <div className="space-y-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={!allSectionsRead}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-[#485C11] focus:ring-[#485C11] disabled:opacity-50"
              />
              <span className={`text-gray-700 leading-relaxed ${!allSectionsRead ? 'opacity-50' : ''}`}>
                I acknowledge that I have read and understood all the information provided about the equity shares,
                including the risks, restrictions, and the nature of the securities being offered. I understand that
                these shares may become worthless and that I cannot sell or transfer them.
              </span>
            </label>

            {/* Share Acceptance Info */}
            <div className="p-4 bg-[#DFECC6]/30 border border-[#485C11]/20 rounded-2xl">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#485C11]" />
                Share Distribution Options
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                You can choose to accept your equity shares now or defer them for later:
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#485C11] font-semibold">•</span>
                  <span><strong>Accept Now:</strong> Receive 100+ welcome shares immediately</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-semibold">•</span>
                  <span><strong>Skip for Now:</strong> No shares awarded yet - claim them anytime from your account</span>
                </li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="mt-8 space-y-3">
            {/* Primary Action - Accept Shares */}
            <button
              onClick={handleSubmit}
              disabled={!acknowledged || !allSectionsRead || isSubmitting || isSkipping}
              className={`w-full px-6 py-4 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 ${
                acknowledged && allSectionsRead && !isSubmitting && !isSkipping
                  ? 'bg-[#485C11] text-white hover:bg-[#3a4a0e] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  I Understand and Accept Shares
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Secondary Action - Skip Shares */}
            {allSectionsRead && (
              <button
                onClick={handleSkip}
                disabled={!allSectionsRead || isSubmitting || isSkipping}
                className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors text-sm"
              >
                {isSkipping ? 'Processing...' : 'Skip shares for now - I\'ll claim them later'}
              </button>
            )}
          </div>

          <p className="mt-6 text-xs text-gray-500 text-center">
            By continuing, you agree to Ampel&apos;s Terms of Service and acknowledge receipt of our Risk Disclosures.
          </p>
        </div>
      </div>
    </div>
  )
}