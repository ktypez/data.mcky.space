import { useReducedMotion as motionUseReducedMotion } from 'motion/react'
import type { Transition, Variants } from 'motion/react'

// ---------------------------------------------------------------------------
// Reduced motion
// ---------------------------------------------------------------------------

/** Wrapper around Motion's useReducedMotion — returns true when user prefers reduced motion. */
export function useReducedMotion(): boolean {
  return motionUseReducedMotion() ?? false
}

// ---------------------------------------------------------------------------
// Transition presets
// ---------------------------------------------------------------------------

export const spring: Transition = { type: 'spring', stiffness: 300, damping: 24 }
export const springSlow: Transition = { type: 'spring', stiffness: 200, damping: 20 }
export const smooth: Transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
export const snappy: Transition = { duration: 0.12, ease: [0.87, 0, 0.13, 1] }
export const instant: Transition = { duration: 0 }

// ---------------------------------------------------------------------------
// Variant factories
// ---------------------------------------------------------------------------

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0 },
}

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
}

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
}

// ---------------------------------------------------------------------------
// Stagger container
// ---------------------------------------------------------------------------

export function staggerContainer(staggerAmount = 0.03): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: staggerAmount } },
  }
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: smooth },
}

// ---------------------------------------------------------------------------
// Sheet slide variants (per side)
// ---------------------------------------------------------------------------

type Side = 'top' | 'right' | 'bottom' | 'left'

const slideDistance = '100%'

export function sheetVariants(side: Side): Variants {
  const axis = side === 'top' || side === 'bottom' ? 'y' : 'x'
  const sign = side === 'bottom' || side === 'right' ? 1 : -1

  return {
    hidden: { opacity: 0, [axis]: `${sign * 100}%` },
    visible: { opacity: 1, [axis]: '0%' },
  }
}
