"use client"

import { create } from 'zustand'

interface NavigationState {
  isSidebarOpen: boolean
  isMobileMenuOpen: boolean
  activeChat: string | null
  
  toggleSidebar: () => void
  toggleMobileMenu: () => void
  setActiveChat: (chatId: string | null) => void
  closeMobileMenu: () => void
}

export const useNavigation = create<NavigationState>((set) => ({
  isSidebarOpen: true,
  isMobileMenuOpen: false,
  activeChat: null,
  
  toggleSidebar: () => set((state) => ({ 
    isSidebarOpen: !state.isSidebarOpen 
  })),
  
  toggleMobileMenu: () => set((state) => ({ 
    isMobileMenuOpen: !state.isMobileMenuOpen 
  })),
  
  setActiveChat: (chatId) => set({ 
    activeChat: chatId
  }),
  
  closeMobileMenu: () => set({ 
    isMobileMenuOpen: false 
  })
}))