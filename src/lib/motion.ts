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
// useMotion() — hook that returns all presets with reduced-motion awareness
// ---------------------------------------------------------------------------

/** All animation presets with reduced-motion baked in. Call once per component. */
export function useMotion() {
  const reduced = useReducedMotion()

  if (reduced) {
    return {
      spring: instant,
      smooth: instant,
      snappy: instant,
      springSmall: instant,
      instant,
      fadeIn: { hidden: {}, visible: {} },
      slideUp: { hidden: {}, visible: {} },
      slideDown: { hidden: {}, visible: {} },
      slideLeft: { hidden: {}, visible: {} },
      slideRight: { hidden: {}, visible: {} },
      scaleIn: { hidden: {}, visible: {} },
      staggerContainer: () => ({ hidden: {}, visible: {} }),
      staggerItem: { hidden: {}, visible: {} },
      sheetVariants: (_side: string) => ({ hidden: {}, visible: {} }),
    }
  }

  return {
    spring,
    smooth,
    snappy,
    springSmall,
    instant,
    fadeIn,
    slideUp,
    slideDown,
    slideLeft,
    slideRight,
    scaleIn,
    staggerContainer,
    staggerItem,
    sheetVariants,
  }
}

// ---------------------------------------------------------------------------
// Transition presets — tuned for 60fps butter
// ---------------------------------------------------------------------------

/** Smooth UI transition — 180ms with natural deceleration */
export const smooth: Transition = { duration: 0.18, ease: [0.25, 1, 0.5, 1] }

/** Snappy micro-interaction — 120ms, fast out */
export const snappy: Transition = { duration: 0.12, ease: [0.25, 1, 0.5, 1] }

/** Spring for dialogs/modals — crisp, minimal overshoot */
export const spring: Transition = { type: 'spring', stiffness: 400, damping: 30 }

/** Spring for smaller elements — slightly bouncier */
export const springSmall: Transition = { type: 'spring', stiffness: 500, damping: 28 }

/** Instant — for reduced motion fallback */
export const instant: Transition = { duration: 0 }

// ---------------------------------------------------------------------------
// Variant factories — minimal movement for 60fps
// ---------------------------------------------------------------------------

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0 },
}

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0 },
}

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
}

// ---------------------------------------------------------------------------
// Stagger container — fast stagger, snappy items
// ---------------------------------------------------------------------------

export function staggerContainer(staggerAmount = 0.025): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: staggerAmount } },
  }
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: snappy },
}

// ---------------------------------------------------------------------------
// Sheet slide variants (per side)
// ---------------------------------------------------------------------------

export function sheetVariants(side: 'top' | 'right' | 'bottom' | 'left'): Variants {
  const axis = side === 'top' || side === 'bottom' ? 'y' : 'x'
  const sign = side === 'bottom' || side === 'right' ? 1 : -1

  return {
    hidden: { opacity: 0, [axis]: `${sign * 100}%` },
    visible: { opacity: 1, [axis]: '0%' },
  }
}
