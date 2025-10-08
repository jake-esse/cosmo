"use client"

import { usePathname, useRouter } from 'next/navigation'
import { 
  Plus, 
  MessageSquare, 
  Grid3x3, 
  User, 
  Settings, 
  Wallet, 
  Shield,
  ChevronDown
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import * as Collapsible from '@radix-ui/react-collapsible'
import { useState } from 'react'
import { useNavigation } from './NavigationContext'
import { motion, AnimatePresence } from 'framer-motion'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { setActiveChat } = useNavigation()
  const [accountExpanded, setAccountExpanded] = useState(false)
  
  const handleNewChat = () => {
    setActiveChat(null)
    router.push('/chat')
  }
  
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex h-full flex-col bg-muted/50 border-r">
        {/* Sidebar Header with Logo */}
        <div className="flex h-16 items-center justify-between px-4 bg-card border-b">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-base">A</span>
            </div>
            <span className="text-xl text-foreground sidebar-brand">Ampel</span>
          </div>
          <ThemeToggle />
        </div>
        
        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/70 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5" />
            <span className="sidebar-button-text font-semibold">New Chat</span>
          </button>
          
          {/* Chats Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Chats button clicked, navigating to /chat/history')
              router.push('/chat/history')
            }}
            className={`w-full rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 px-4 py-3 flex items-center gap-3 ${
              pathname === '/chat/history'
                ? 'bg-primary/10 border-primary' 
                : 'bg-white border-gray-200 hover:bg-accent'
            }`}
          >
            <MessageSquare className={`h-4 w-4 ${pathname === '/chat/history' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-base sidebar-section-title ${pathname === '/chat/history' ? 'text-primary' : 'text-foreground'}`}>Chats</span>
          </button>
          
          {/* Apps Card */}
          <button
            onClick={() => router.push('/apps')}
            className={`w-full rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 px-4 py-3 flex items-center gap-3 ${
              pathname === '/apps' 
                ? 'bg-primary/10 border-primary' 
                : 'bg-white border-gray-200 hover:bg-accent'
            }`}
          >
            <Grid3x3 className={`h-4 w-4 ${pathname === '/apps' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-base sidebar-section-title ${pathname === '/apps' ? 'text-primary' : 'text-foreground'}`}>Apps</span>
          </button>
          
          {/* Account Card */}
          <Collapsible.Root 
            open={accountExpanded} 
            onOpenChange={setAccountExpanded}
            className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
          >
            <Collapsible.Trigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-base text-foreground sidebar-section-title">Account</span>
              </div>
              <motion.div
                animate={{ rotate: accountExpanded ? 0 : -90 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </Collapsible.Trigger>
            
            <Collapsible.Content>
              <AnimatePresence>
                {accountExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t "
                  >
                    <div className="py-1">
                      <button
                        onClick={() => router.push('/settings')}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors ${
                          pathname === '/settings' ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        <Settings className={`h-4 w-4 ${pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm sidebar-item-title ${pathname === '/settings' ? 'text-primary' : 'text-foreground'}`}>Settings</span>
                      </button>
                      
                      <button
                        onClick={() => router.push('/equity-wallet')}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors ${
                          pathname === '/equity-wallet' ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        <Wallet className={`h-4 w-4 ${pathname === '/equity-wallet' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm sidebar-item-title ${pathname === '/equity-wallet' ? 'text-primary' : 'text-foreground'}`}>Equity Wallet</span>
                      </button>
                      
                      <button
                        onClick={() => router.push('/data-controls')}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors ${
                          pathname === '/data-controls' ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        <Shield className={`h-4 w-4 ${pathname === '/data-controls' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm sidebar-item-title ${pathname === '/data-controls' ? 'text-primary' : 'text-foreground'}`}>Data Controls</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Collapsible.Content>
          </Collapsible.Root>
        </div>
        
        {/* Sidebar Footer */}
        <div className="bg-card border-t p-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Guest User</p>
              <p className="text-xs text-muted-foreground">Free Plan</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}