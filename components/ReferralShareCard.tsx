'use client'

import { useState, useEffect } from 'react'
import { Copy, CheckCircle, Mail, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReferralShareCardProps {
  referralCode: string
  referralUrl: string
}

export default function ReferralShareCard({ referralCode, referralUrl }: ReferralShareCardProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [showNativeShare, setShowNativeShare] = useState(false)
  
  useEffect(() => {
    // Check for native share capability on client side only
    if (typeof window !== 'undefined' && navigator.share) {
      setShowNativeShare(true)
    }
  }, [])
  
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }
  
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }
  
  const handleShareTwitter = () => {
    const text = `Join me on Cosmo and earn equity in AI apps! Use my referral code ${referralCode} to get started:`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralUrl)}`
    window.open(url, '_blank')
  }
  
  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`
    window.open(url, '_blank')
  }
  
  const handleShareEmail = () => {
    const subject = 'Join me on Cosmo - The AI App Store'
    const body = `Hi there!

I'm using Cosmo, the first app store where users earn equity in the AI apps they use.

Join using my referral code and we'll both earn equity points:

Referral Code: ${referralCode}
Sign up here: ${referralUrl}

See you there!`
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl)
  }
  
  const handleNativeShare = async () => {
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Cosmo',
          text: `Use my referral code ${referralCode} to join Cosmo and earn equity in AI apps!`,
          url: referralUrl,
        })
      } catch (err) {
        // User cancelled or error occurred
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
      }
    }
  }
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Share & Earn
        </h2>
        <Share2 className="h-5 w-5 text-blue-600" />
      </div>
      
      <div className="space-y-4">
        {/* Referral Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Referral Code
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white rounded-lg border border-gray-300 px-4 py-3">
              <span className="font-mono text-lg font-semibold text-gray-900">
                {referralCode}
              </span>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={handleCopyCode}
              className="bg-white"
            >
              {copiedCode ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Referral URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Referral Link
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white rounded-lg border border-gray-300 px-4 py-3 overflow-hidden">
              <span className="text-sm text-gray-600 truncate block">
                {referralUrl}
              </span>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={handleCopyUrl}
              className="bg-white"
            >
              {copiedUrl ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Share Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share on Social Media
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={handleShareTwitter}
              className="bg-white hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              Twitter
            </Button>
            
            <Button
              variant="outline"
              size="default"
              onClick={handleShareLinkedIn}
              className="bg-white hover:bg-[#0077B5] hover:text-white hover:border-[#0077B5] transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </Button>
            
            <Button
              variant="outline"
              size="default"
              onClick={handleShareEmail}
              className="bg-white hover:bg-gray-100 transition-colors"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            
            {/* Native Share (for mobile) - only render when available */}
            {showNativeShare && (
              <Button
                variant="outline"
                size="default"
                onClick={handleNativeShare}
                className="bg-white hover:bg-gray-100 transition-colors"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
          </div>
        </div>
        
        {/* Reward Info */}
        <div className="bg-white/70 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg">🎁</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Earn 50 points per referral
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Your friends get 25 points when they sign up with your code
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}