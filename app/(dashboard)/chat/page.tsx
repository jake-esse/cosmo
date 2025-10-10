'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import { PageLayout } from '@/components/layout/PageLayout'
import { ShareAwardModal } from '@/components/modals/ShareAwardModal'
import { useEffect, useState, Suspense } from 'react'
import { useNavigation } from '@/components/layout/NavigationContext'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ChatPageContent() {
  const [userInitials, setUserInitials] = useState('JE')
  const [conversationTitle, setConversationTitle] = useState('Chat')
  const [currentChatId, setCurrentChatId] = useState<string | undefined>()
  const { setActiveChat } = useNavigation()
  const searchParams = useSearchParams()

  // Share award modal state
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharesAwarded, setSharesAwarded] = useState(0)
  const [referralCode, setReferralCode] = useState('')
  const [wasReferred, setWasReferred] = useState(false)

  useEffect(() => {
    // Get user initials from localStorage or session
    // This would normally come from your auth context
    const storedName = localStorage.getItem('userName') || 'Jake Esse'
    const initials = storedName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    setUserInitials(initials)
  }, [])

  // Check if user just completed onboarding and show share award modal
  useEffect(() => {
    const checkAndShowShareModal = async () => {
      // Check if modal has already been shown
      const hasSeenModal = localStorage.getItem('share_award_modal_seen')
      if (hasSeenModal) {
        return
      }

      // Check if user is coming from onboarding
      const fromOnboarding = searchParams.get('from') === 'onboarding' ||
                            sessionStorage.getItem('just_completed_onboarding') === 'true'

      if (!fromOnboarding) {
        return
      }

      try {
        const supabase = createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get user's profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_code, referred_by, shares_awarded_at')
          .eq('id', user.id)
          .single()

        if (!profile) return

        // Only show modal if shares were recently awarded (within last hour)
        if (!profile.shares_awarded_at) return

        const sharesAwardedTime = new Date(profile.shares_awarded_at).getTime()
        const oneHourAgo = Date.now() - (60 * 60 * 1000)

        if (sharesAwardedTime < oneHourAgo) {
          // Shares were awarded too long ago, don't show modal
          return
        }

        // Get user's equity balance
        const { data: balanceData } = await supabase
          .rpc('get_user_balance', { p_user_id: user.id })

        if (balanceData) {
          setSharesAwarded(balanceData.total_balance || 0)
        }

        setReferralCode(profile.referral_code || '')
        setWasReferred(!!profile.referred_by)

        // Show the modal
        setShowShareModal(true)

        // Clear the session flag
        sessionStorage.removeItem('just_completed_onboarding')
      } catch (error) {
        console.error('Error loading share award data:', error)
      }
    }

    checkAndShowShareModal()
  }, [searchParams])

  const handleConversationCreated = (conversationId: string, title: string) => {
    console.log('Conversation created:', conversationId, title)
    setConversationTitle(title)
    setActiveChat(conversationId)
    setCurrentChatId(conversationId)

    // Update URL without navigation to prevent component remount
    window.history.replaceState({}, '', `/chat/conversation?id=${conversationId}`)
  }

  const handleConversationUpdated = () => {
    // This will trigger the sidebar to refresh
    // The refresh happens automatically via the useEffect in Sidebar
  }

  const handleShareModalClose = (open: boolean) => {
    setShowShareModal(open)
    if (!open) {
      // Mark modal as seen so it doesn't show again
      localStorage.setItem('share_award_modal_seen', 'true')
    }
  }

  return (
    <PageLayout pageName={conversationTitle}>
      <ChatInterface
        chatId={currentChatId}
        userInitials={userInitials}
        onConversationCreated={handleConversationCreated}
        onConversationUpdated={handleConversationUpdated}
        // Don't pass onSendMessage to use real AI streaming
      />

      {/* Share Award Modal */}
      <ShareAwardModal
        open={showShareModal}
        onOpenChange={handleShareModalClose}
        sharesAwarded={sharesAwarded}
        referralCode={referralCode}
        wasReferred={wasReferred}
      />
    </PageLayout>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <PageLayout pageName="Chat">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#485C11] border-r-transparent mb-4"></div>
            <p className="text-slate-600 font-sans">Loading...</p>
          </div>
        </div>
      </PageLayout>
    }>
      <ChatPageContent />
    </Suspense>
  )
}