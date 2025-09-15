"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ReactNode } from "react"

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.3,
        ease: "easeInOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface FadeTransitionProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function FadeTransition({ children, className, delay = 0 }: FadeTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.2,
        delay,
        ease: "easeInOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface SlideTransitionProps {
  children: ReactNode
  className?: string
  direction?: "left" | "right" | "up" | "down"
}

export function SlideTransition({ 
  children, 
  className, 
  direction = "left" 
}: SlideTransitionProps) {
  const variants = {
    left: { initial: { x: -20 }, animate: { x: 0 } },
    right: { initial: { x: 20 }, animate: { x: 0 } },
    up: { initial: { y: -20 }, animate: { y: 0 } },
    down: { initial: { y: 20 }, animate: { y: 0 } }
  }

  const selectedVariant = variants[direction]

  return (
    <motion.div
      initial={{ opacity: 0, ...selectedVariant.initial }}
      animate={{ opacity: 1, ...selectedVariant.animate }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeInOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface LayoutTransitionProps {
  children: ReactNode
  className?: string
}

export function LayoutTransition({ children, className }: LayoutTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.15,
          ease: "easeInOut"
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}