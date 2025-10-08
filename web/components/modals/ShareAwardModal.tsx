'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ShareAwardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sharesAwarded: number
  referralCode: string
  wasReferred?: boolean
}

export function ShareAwardModal({
  open,
  onOpenChange,
  sharesAwarded,
  referralCode,
  wasReferred = false,
}: ShareAwardModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Reset copied state when modal closes
  useEffect(() => {
    if (!open) {
      setCopied(false)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Celebration Icon */}
        <div className="flex justify-center -mt-2">
          <div className="relative">
            {/* Sparkle animations */}
            <div className="absolute -top-4 -left-4 animate-pulse">
              <Sparkles className="w-6 h-6 text-[#485C11]" />
            </div>
            <div className="absolute -top-2 -right-4 animate-pulse delay-75">
              <Sparkles className="w-4 h-4 text-[#485C11]" />
            </div>
            <div className="absolute -bottom-2 left-2 animate-pulse delay-150">
              <Sparkles className="w-5 h-5 text-[#485C11]" />
            </div>

            {/* Main celebration icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-[#DFECC6] to-[#485C11]/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-[#485C11]" />
            </div>
          </div>
        </div>

        <DialogHeader className="text-center space-y-3">
          <DialogTitle className="font-brand text-[28px] leading-[1.1] tracking-[-1.4px] text-black">
            Congratulations! 🎉
          </DialogTitle>
          <DialogDescription className="font-sans text-[16px] text-[#6F6F6F]">
            You&apos;ve successfully joined Ampel
          </DialogDescription>
        </DialogHeader>

        {/* Shares Awarded Display */}
        <div className="bg-[#DFECC6]/50 border border-[#485C11]/20 rounded-[12px] p-6 text-center space-y-2">
          <p className="font-sans text-[14px] text-[#485C11] font-medium">
            SHARES AWARDED
          </p>
          <p className="font-brand text-[48px] leading-[1] tracking-[-2.4px] text-[#485C11]">
            {sharesAwarded}
          </p>
          {wasReferred && (
            <p className="font-sans text-[12px] text-[#485C11]/80 pt-1">
              Including 25 bonus shares for being referred!
            </p>
          )}
        </div>

        {/* Referral Code Section */}
        <div className="space-y-3">
          <div className="text-center space-y-1">
            <p className="font-sans text-[14px] font-medium text-black">
              Your Referral Code
            </p>
            <p className="font-sans text-[12px] text-[#6F6F6F]">
              Share with friends to earn 50 shares per referral
            </p>
          </div>

          {/* Referral Code Display with Copy Button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-[#E9E9E9] rounded-[12px] px-4 py-3 font-mono text-[18px] font-bold text-center text-[#485C11] tracking-wider">
              {referralCode}
            </div>
            <Button
              onClick={handleCopyReferralCode}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-[12px] border-[#E9E9E9] hover:bg-[#DFECC6] hover:border-[#485C11]/20 transition-colors"
            >
              {copied ? (
                <Check className="h-5 w-5 text-[#485C11]" />
              ) : (
                <Copy className="h-5 w-5 text-[#6F6F6F]" />
              )}
            </Button>
          </div>

          {copied && (
            <p className="text-center font-sans text-[12px] text-[#485C11] animate-in fade-in duration-200">
              ✓ Copied to clipboard
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#485C11]/5 to-[#DFECC6]/50 border border-[#485C11]/10 rounded-[12px] p-4 text-center">
          <p className="font-sans text-[13px] text-[#485C11]">
            <span className="font-semibold">Earn 50 shares</span> for every friend who joins.{' '}
            <span className="font-semibold">They get 25 shares</span> too!
          </p>
        </div>

        {/* Close Button */}
        <Button
          onClick={() => onOpenChange(false)}
          className="w-full bg-[#485C11] text-white font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#485C11]/90 transition-colors h-12"
        >
          Start Exploring
        </Button>
      </DialogContent>
    </Dialog>
  )
}
