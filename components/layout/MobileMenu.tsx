"use client"

import { usePathname, useRouter } from 'next/navigation'
import { 
  Menu,
  X,
  Plus, 
  MessageSquare, 
  Grid3x3, 
  User, 
  Settings, 
  Wallet, 
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { useState, useEffect } from 'react'
import { useNavigation } from './NavigationContext'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatItem {
  id: string
  title: string
  lastMessage?: string
  timestamp?: Date
}

export function MobileMenu() {
  const pathname = usePathname()
  const router = useRouter()
  const { 
    isMobileMenuOpen, 
    toggleMobileMenu, 
    closeMobileMenu,
    isChatsExpanded, 
    toggleChatsExpanded, 
    activeChat, 
    setActiveChat 
  } = useNavigation()
  
  const [accountExpanded, setAccountExpanded] = useState(false)
  
  // Mock chat data - will be replaced with real data
  const recentChats: ChatItem[] = [
    { id: '1', title: 'Product Strategy Discussion', timestamp: new Date(Date.now() - 3600000) },
    { id: '2', title: 'Code Review Assistant', timestamp: new Date(Date.now() - 7200000) },
    { id: '3', title: 'Marketing Campaign Ideas', timestamp: new Date(Date.now() - 86400000) }
  ]
  
  const isActive = (path: string) => pathname === path
  
  // Close menu on route change
  useEffect(() => {
    closeMobileMenu()
  }, [pathname, closeMobileMenu])
  
  const handleNewChat = () => {
    setActiveChat(null)
    router.push('/chat')
    closeMobileMenu()
  }
  
  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId)
    router.push(`/chat/${chatId}`)
    closeMobileMenu()
  }
  
  const navigateTo = (path: string) => {
    router.push(path)
    closeMobileMenu()
  }
  
  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }
  
  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 left-4 z-50 h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200"
      >
        <AnimatePresence mode="wait">
          {isMobileMenuOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-5 w-5 text-gray-700" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobileMenu}
              className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed left-0 top-0 h-full w-72 bg-gray-50 border-r border-gray-200 z-50 overflow-hidden flex flex-col shadow-xl"
            >
              {/* Mobile Sidebar Header */}
              <div className="flex h-16 items-center justify-between px-4 bg-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-base">A</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">Ampel</span>
                </div>
              </div>
              
              {/* Mobile Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {/* New Chat Button */}
                <button
                  onClick={handleNewChat}
                  className="w-full h-11 flex items-center justify-center gap-2 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-semibold">New Chat</span>
                </button>
                
                {/* Chats Card */}
                <Collapsible.Root 
                  open={isChatsExpanded} 
                  onOpenChange={toggleChatsExpanded}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <Collapsible.Trigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">Chats</span>
                    </div>
                    <motion.div
                      animate={{ rotate: isChatsExpanded ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </motion.div>
                  </Collapsible.Trigger>
                  
                  <Collapsible.Content>
                    {isChatsExpanded && (
                      <div className="border-t border-gray-100 py-1">
                        {recentChats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => handleChatSelect(chat.id)}
                            className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                              activeChat === chat.id ? 'bg-sky-50 border-l-2 border-sky-500 text-sky-600' : 'text-gray-700'
                            }`}
                          >
                            <p className="text-sm truncate flex-1 mr-2">{chat.title}</p>
                            <span className="text-xs text-gray-400 group-hover:text-gray-500">
                              {chat.timestamp && getRelativeTime(chat.timestamp)}
                            </span>
                          </button>
                        ))}
                        {recentChats.length === 0 && (
                          <p className="px-4 py-2 text-sm text-gray-500">No recent chats</p>
                        )}
                      </div>
                    )}
                  </Collapsible.Content>
                </Collapsible.Root>
                
                {/* Apps Card */}
                <button
                  onClick={() => navigateTo('/apps')}
                  className={`w-full bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3 transition-all ${
                    isActive('/apps') 
                      ? 'bg-sky-50 border-sky-500' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Grid3x3 className={`h-4 w-4 ${isActive('/apps') ? 'text-sky-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${isActive('/apps') ? 'text-sky-600' : 'text-gray-900'}`}>Apps</span>
                </button>
                
                {/* Account Card */}
                <Collapsible.Root 
                  open={accountExpanded} 
                  onOpenChange={setAccountExpanded}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <Collapsible.Trigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">Account</span>
                    </div>
                    <motion.div
                      animate={{ rotate: accountExpanded ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </motion.div>
                  </Collapsible.Trigger>
                  
                  <Collapsible.Content>
                    {accountExpanded && (
                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={() => navigateTo('/settings')}
                          className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                            isActive('/settings') ? 'bg-sky-50 border-l-2 border-sky-500' : ''
                          }`}
                        >
                          <Settings className={`h-4 w-4 ${isActive('/settings') ? 'text-sky-600' : 'text-gray-400'}`} />
                          <span className={`text-sm ${isActive('/settings') ? 'text-sky-600' : 'text-gray-700'}`}>Settings</span>
                        </button>
                        
                        <button
                          onClick={() => navigateTo('/equity-wallet')}
                          className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                            isActive('/equity-wallet') ? 'bg-sky-50 border-l-2 border-sky-500' : ''
                          }`}
                        >
                          <Wallet className={`h-4 w-4 ${isActive('/equity-wallet') ? 'text-sky-600' : 'text-gray-400'}`} />
                          <span className={`text-sm ${isActive('/equity-wallet') ? 'text-sky-600' : 'text-gray-700'}`}>Equity Wallet</span>
                        </button>
                        
                        <button
                          onClick={() => navigateTo('/data-controls')}
                          className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                            isActive('/data-controls') ? 'bg-sky-50 border-l-2 border-sky-500' : ''
                          }`}
                        >
                          <Shield className={`h-4 w-4 ${isActive('/data-controls') ? 'text-sky-600' : 'text-gray-400'}`} />
                          <span className={`text-sm ${isActive('/data-controls') ? 'text-sky-600' : 'text-gray-700'}`}>Data Controls</span>
                        </button>
                      </div>
                    )}
                  </Collapsible.Content>
                </Collapsible.Root>
              </div>
              
              {/* Mobile Sidebar Footer */}
              <div className="bg-white border-t border-gray-200 p-3">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">Guest User</p>
                    <p className="text-xs text-gray-500">Free Plan</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}