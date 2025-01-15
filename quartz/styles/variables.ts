// Individual exports
export const pageWidth = 750
export const mobileBreakpoint = 600
export const tabletBreakpoint = 1000
export const sidePanelWidth = 380
export const rightWidth = 450
export const rightPanelBegins = 0
export const marginsBegin = 825
export const topSpacing = "2rem"
export const fullPageWidth = 1580 // 750 + 380 + 450
export const baseMargin = "0.5rem"
export const boldWeight = 700
export const semiBoldWeight = 600
export const normalWeight = 400
export const lineHeight = "1.8rem"

// Shared variables between SCSS and TypeScript
export const variables = {
  pageWidth,
  mobileBreakpoint,
  tabletBreakpoint,
  sidePanelWidth,
  rightWidth,
  rightPanelBegins,
  marginsBegin,
  topSpacing,
  fullPageWidth,
  baseMargin,
  boldWeight,
  semiBoldWeight,
  normalWeight,
  lineHeight,
} as const

// Type for our variables
export type Variables = typeof variables
