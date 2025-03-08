import { wrapWithoutTransition } from "./component_script_utils"

export type Theme = "light" | "dark" | "auto"

/**
 * Emits a custom 'themechange' event with the current theme
 * @param theme - The current theme state
 */
const emitThemeChangeEvent = (theme: Theme) => {
  const event: CustomEvent = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

/**
 * Determines the system's color scheme preference
 * @returns The system's preferred theme ('light' or 'dark')
 */
export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Updates the DOM to reflect the current theme state
 * @param theme - The theme to apply
 * @param emitEvent - Whether to emit a theme change event (default: true)
 */
function setThemeClassOnRoot(theme: Theme, emitEvent: boolean = true) {
  document.documentElement.setAttribute("theme", theme)
  if (emitEvent) {
    emitThemeChangeEvent(theme)
  }
}

/**
 * Updates the theme state and related UI elements
 * @param theme - The theme state to apply
 */
function handleThemeUpdate(theme: Theme): void {
  localStorage.setItem("saved-theme", theme)

  // Update UI for auto mode
  const autoText = document.querySelector("#darkmode-auto-text")
  if (autoText) {
    autoText.classList.toggle("hidden", theme !== "auto")
  }

  // Apply the appropriate theme
  if (theme === "auto") {
    setThemeClassOnRoot(getSystemTheme())
  } else {
    setThemeClassOnRoot(theme)
  }
}

const getNextTheme = (): Theme => {
  const currentTheme = localStorage.getItem("saved-theme") || "auto"
  let nextTheme: Theme

  switch (currentTheme) {
    case "auto":
      nextTheme = "light"
      break
    case "light":
      nextTheme = "dark"
      break
    case "dark":
      nextTheme = "auto"
      break
    default:
      nextTheme = "auto"
  }

  return nextTheme
}

/**
 * Cycles through theme states in the order: auto -> light -> dark -> auto
 */
export const rotateTheme = () => {
  const nextTheme = getNextTheme()
  handleThemeUpdate(nextTheme)
}

/**
 * Initializes the dark mode functionality:
 * - Sets up initial theme based on saved preference or auto mode
 * - Configures theme toggle click handler
 * - Sets up system preference change listener
 * - Manages description visibility based on toggle usage
 */
function setupDarkMode() {
  const savedTheme = localStorage.getItem("saved-theme")
  const theme = savedTheme || "auto"
  handleThemeUpdate(theme as Theme)

  // Set up click handler for the toggle
  const toggle = document.querySelector("#theme-toggle") as HTMLButtonElement
  if (toggle) {
    toggle.addEventListener("click", wrapWithoutTransition(rotateTheme))
  }

  document.addEventListener("nav", () => {
    /**
     * Handles system color scheme preference changes
     * @param e - MediaQueryList event containing the new preference
     */
    function doSystemPreference(e: MediaQueryListEvent): void {
      if (localStorage.getItem("saved-theme") === "auto") {
        const newTheme = e.matches ? "dark" : "light"
        setThemeClassOnRoot(newTheme)
      }
    }
    const wrappedSystemPreference = wrapWithoutTransition(doSystemPreference)

    const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    colorSchemeMediaQuery.addEventListener("change", wrappedSystemPreference)
  })
}

export { setupDarkMode }
