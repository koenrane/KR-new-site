// Individual exports
export const pageWidth = 750
export const mobileBreakpoint = 600
export const tabletBreakpoint = 1000
export const leftSidebarWidth = 380
export const rightSidebarWidth = 450
export const marginsBegin = 825
export const topSpacing = "2rem"
export const fullPageWidth = pageWidth + leftSidebarWidth + rightSidebarWidth
export const maxMobileWidth = fullPageWidth - 1

export const baseMargin = "0.5rem"
export const maxSidebarGap = "4rem" // 8 * baseMargin
export const maxContentWidth = pageWidth + rightSidebarWidth + 100 // 100 for gap
export const boldWeight = 700
export const semiBoldWeight = 600
export const normalWeight = 400
export const lineHeight = "1.8rem"
export const listPaddingLeft = "2rem"

// Shared variables between SCSS and TypeScript
export const variables = {
  pageWidth,
  mobileBreakpoint,
  tabletBreakpoint,
  leftSidebarWidth,
  rightSidebarWidth,
  marginsBegin,
  topSpacing,
  fullPageWidth,
  maxMobileWidth,
  maxSidebarGap,
  maxContentWidth,
  baseMargin,
  boldWeight,
  semiBoldWeight,
  normalWeight,
  lineHeight,
  listPaddingLeft,
} as const

export type Variables = typeof variables
