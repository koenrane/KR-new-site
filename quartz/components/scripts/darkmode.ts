import { wrapWithoutTransition } from "./component_script_utils"

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEvent = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

function getDescriptionParagraph(): HTMLParagraphElement | null {
  return document.querySelector(".darkmode > .description")
}

function getToggleSwitch(): HTMLInputElement | null {
  return document.querySelector("#darkmode-toggle") as HTMLInputElement
}

function themeChange(e: MediaQueryListEvent): void {
  const newTheme = e.matches ? "dark" : "light"
  document.documentElement.setAttribute("saved-theme", newTheme)
  localStorage.setItem("theme", newTheme)

  const toggleSwitch = getToggleSwitch()
  if (toggleSwitch) {
    toggleSwitch.checked = e.matches
  }
  emitThemeChangeEvent(newTheme)
}

function switchTheme(e: Event): void {
  const newTheme = (e.target as HTMLInputElement)?.checked ? "dark" : "light"
  document.documentElement.setAttribute("saved-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  emitThemeChangeEvent(newTheme)

  // Toggle the label text
  const descriptionParagraph = getDescriptionParagraph()
  if (localStorage.getItem("usedToggle") !== "true" && descriptionParagraph) {
    descriptionParagraph.classList.add("hidden")
  }
  // Prevent further clicks from having an effect
  localStorage.setItem("usedToggle", "true")
}

const wrappedSwitchTheme = wrapWithoutTransition(switchTheme)

export function setupDarkMode() {
  const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  const currentTheme = localStorage.getItem("theme") ?? userPref
  document.documentElement.setAttribute("saved-theme", currentTheme)

  document.addEventListener("nav", () => {
    // Hide the description after the user has interacted with the toggle
    window.addEventListener("load", function () {
      if (localStorage.getItem("usedToggle") !== "true") {
        const descriptionParagraph = getDescriptionParagraph()
        descriptionParagraph?.classList.remove("hidden")
      }
    })

    // Darkmode toggle
    const toggleSwitch = getToggleSwitch()
    if (toggleSwitch) {
      toggleSwitch.addEventListener("change", wrappedSwitchTheme)
      toggleSwitch.checked = currentTheme === "dark"
    }

    // Listen for changes in prefers-color-scheme
    const wrappedThemeChange = wrapWithoutTransition(themeChange)
    const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    colorSchemeMediaQuery.addEventListener("change", wrappedThemeChange)
  })
}
