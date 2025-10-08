/**
 * Component: DiscussionTab
 * Purpose: Discussion board for investor questions
 * Regulatory Requirement: SEC testing-the-waters communications
 * State: Manages discussion posts (demo data)
 */

import { useState } from "react"

interface DiscussionPost {
  id: string
  author: string
  content: string
  isAdmin: boolean
  timestamp: Date
  isReply?: boolean
}

interface DiscussionTabProps {
  isPublic?: boolean
}

export function DiscussionTab({ isPublic = false }: DiscussionTabProps) {
  const [posts] = useState<DiscussionPost[]>([
    {
      id: '1',
      author: 'James Esse',
      content: 'Welcome to our Regulation CF offering! I\'m here to answer any questions about Ampel and our vision for the future of AI applications. Feel free to ask anything!',
      isAdmin: true,
      timestamp: new Date('2024-01-15T10:00:00')
    },
    {
      id: '2',
      author: 'Sarah Chen',
      content: 'How long before we can trade these shares?',
      isAdmin: false,
      timestamp: new Date('2024-01-16T14:30:00')
    },
    {
      id: '3',
      author: 'James Esse',
      content: 'Great question! Per SEC rules, there\'s a 1-year holding period from when you receive your shares. After that, we plan to explore secondary market options, though we can\'t guarantee liquidity. Our goal is to eventually provide trading opportunities for shareholders.',
      isAdmin: true,
      timestamp: new Date('2024-01-16T15:00:00'),
      isReply: true
    },
    {
      id: '4',
      author: 'Michael Rodriguez',
      content: 'What happens to our shares if Ampel gets acquired?',
      isAdmin: false,
      timestamp: new Date('2024-01-17T09:15:00')
    },
    {
      id: '5',
      author: 'James Esse',
      content: 'In an acquisition scenario, common shareholders would participate pro-rata in the proceeds. The exact terms would depend on the acquisition agreement, but your shares would be converted to cash or acquiring company stock based on the deal terms.',
      isAdmin: true,
      timestamp: new Date('2024-01-17T10:00:00'),
      isReply: true
    },
    {
      id: '6',
      author: 'Emily Watson',
      content: 'Can international users participate in earning equity?',
      isAdmin: false,
      timestamp: new Date('2024-01-18T11:00:00')
    },
    {
      id: '7',
      author: 'James Esse',
      content: 'Currently, the Regulation CF offering is limited to US residents due to SEC regulations. However, we\'re exploring options for international participation in the future through different structures. Stay tuned for updates!',
      isAdmin: true,
      timestamp: new Date('2024-01-18T11:30:00'),
      isReply: true
    },
    {
      id: '8',
      author: 'David Park',
      content: 'How many total shares are being allocated for users?',
      isAdmin: false,
      timestamp: new Date('2024-01-19T16:00:00')
    },
    {
      id: '9',
      author: 'James Esse',
      content: 'We\'re initially allocating 10 million shares for the user equity pool. This may be expanded based on platform growth. The goal is to ensure meaningful ownership for active users while maintaining enough equity for future investors and team members.',
      isAdmin: true,
      timestamp: new Date('2024-01-19T16:45:00'),
      isReply: true
    }
  ])
  
  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-brand text-heading-md text-slate-900">Community Discussion</h3>
        <span className="font-sans text-body-sm text-slate-500">{posts.length} posts</span>
      </div>
      
      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className={post.isReply ? 'ml-12' : ''}>
            {post.isReply && (
              <div className="font-sans text-label-sm text-slate-500 mb-2">
                ↳ Response
              </div>
            )}
            <div className={`rounded-[20px] border p-6 ${
              !post.isAdmin ? 'bg-[#DFECC6]/20 border-[#DFECC6]/40' : 'bg-white border-[#B0C4C9]/40'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-semibold text-slate-900">{post.author}</span>
                    {post.isAdmin && (
                      <span className="px-3 py-1 bg-[#485C11] text-white rounded-[1000px] font-sans text-label-sm font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="font-sans text-label-sm text-slate-500 mt-0.5">
                    {formatDate(post.timestamp)} at {formatTime(post.timestamp)}
                  </div>
                </div>
              </div>
              <p className="font-sans text-body-md text-slate-700 leading-relaxed">{post.content}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Sign In Prompt */}
      <div className="bg-[#DFECC6]/30 rounded-[30px] p-8 text-center border border-[#DFECC6]/50">
        <p className="font-brand text-heading-sm text-slate-900 mb-2">Have a question?</p>
        <p className="font-sans text-body-sm text-slate-600 mb-4">
          Sign in to participate in the discussion and ask questions directly to the team.
        </p>
        <a
          href="/login"
          className="inline-block px-6 py-3 bg-[#485C11] text-white rounded-[1000px] hover:bg-[#485C11]/90 transition-colors font-sans font-semibold"
        >
          Sign In to Comment
        </a>
      </div>
    </div>
  )
}