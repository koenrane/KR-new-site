import { wrapWithoutTransition } from "./component_script_utils"

type Theme = "light" | "dark" | "auto"

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
function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

/**
 * Updates the DOM to reflect the current theme state
 * @param theme - The theme to apply
 * @param emitEvent - Whether to emit a theme change event (default: true)
 */
function setThemeClass(theme: Theme, emitEvent: boolean = true) {
  document.documentElement.setAttribute("theme", theme)
  const toggleSwitch = document.querySelector("#darkmode-toggle") as HTMLInputElement
  if (toggleSwitch) {
    toggleSwitch.checked = theme === "dark"
  }
  if (emitEvent) {
    emitThemeChangeEvent(theme)
  }
}

/**
 * Updates the theme state and related UI elements
 * @param theme - The theme state to apply
 */
function updateTheme(theme: Theme): void {
  localStorage.setItem("saved-theme", theme)

  // Update UI for auto mode
  const autoText = document.querySelector("#darkmode-auto-text")
  if (autoText) {
    autoText.classList.toggle("hidden", theme !== "auto")
  }

  // Apply the appropriate theme
  if (theme === "auto") {
    setThemeClass(getSystemTheme())
  } else {
    setThemeClass(theme)
  }
}

/**
 * Cycles through theme states in the order: auto -> light -> dark -> auto
 * Updates the theme and marks the toggle as used
 */
const rotateTheme = () => {
  const currentTheme = localStorage.getItem("saved-theme") || "auto"
  let newTheme: Theme

  switch (currentTheme) {
    case "auto":
      newTheme = "light"
      break
    case "light":
      newTheme = "dark"
      break
    case "dark":
      newTheme = "auto"
      break
    default:
      newTheme = "auto"
  }

  updateTheme(newTheme)
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
  updateTheme(theme as Theme)

  // Set up click handler for the toggle
  const toggle = document.querySelector("#darkmode-toggle") as HTMLInputElement
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
        setThemeClass(newTheme)
      }
    }
    const wrappedSystemPreference = wrapWithoutTransition(doSystemPreference)

    const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    colorSchemeMediaQuery.addEventListener("change", wrappedSystemPreference)
  })
}

export { setupDarkMode }
