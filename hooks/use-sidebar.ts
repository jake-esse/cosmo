import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ampel-sidebar-collapsed'

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        setIsCollapsed(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading sidebar state:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save state to localStorage when it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed))
      } catch (error) {
        console.error('Error saving sidebar state:', error)
      }
    }
  }, [isCollapsed, isLoading])

  const toggle = () => setIsCollapsed(prev => !prev)
  const expand = () => setIsCollapsed(false)
  const collapse = () => setIsCollapsed(true)

  return {
    isCollapsed,
    isLoading,
    toggle,
    expand,
    collapse,
  }
}