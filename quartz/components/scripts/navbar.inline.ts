const hamburger = document.querySelector(".hamburger")
const menu = document.querySelector(".menu")

hamburger?.addEventListener("click", () => {
  menu?.classList.toggle("visible")
})

let lastScrollTop = 0 // Variable to keep track of last scroll position

window.addEventListener(
  "scroll",
  function () {
    let currentScroll = window.pageYOffset || document.documentElement.scrollTop

    if (currentScroll > lastScrollTop) {
      // Scrolling down
      document.querySelector("nav").classList.add("hidden")
    } else {
      // Scrolling up
      document.querySelector("nav").classList.remove("hidden")
    }
    if (currentScroll <= 0) {
      // At the top of the page
      document.querySelector("nav").classList.remove("hidden")
    }

    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll // For Mobile or negative scrolling
  },
  false,
)

const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
const currentTheme = localStorage.getItem("theme") ?? userPref
document.documentElement.setAttribute("saved-theme", currentTheme)

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

// Darkmode handling
document.addEventListener("nav", () => {
  // Hide the description after the user has interacted with the toggle
  const descriptionParagraph = document.querySelector(".darkmode > .description")

  const switchTheme = (e: Event) => {
    const newTheme = (e.target as HTMLInputElement)?.checked ? "dark" : "light"
    document.documentElement.setAttribute("saved-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    emitThemeChangeEvent(newTheme)

    // Toggle the label text
    if (localStorage.getItem("usedToggle") !== "true") {
      descriptionParagraph.classList.add("hidden")
    }
    // Prevent further clicks from having an effect
    localStorage.setItem("usedToggle", "true")
  }

  window.addEventListener("load", function () {
    if (localStorage.getItem("usedToggle") !== "true") {
      descriptionParagraph?.classList.remove("hidden")
    }
  })

  const themeChange = (e: MediaQueryListEvent) => {
    const newTheme = e.matches ? "dark" : "light"
    document.documentElement.setAttribute("saved-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    toggleSwitch.checked = e.matches
    emitThemeChangeEvent(newTheme)
  }

  // Darkmode toggle
  const toggleSwitch = document.querySelector("#darkmode-toggle") as HTMLInputElement
  toggleSwitch.addEventListener("change", switchTheme)
  window.addCleanup(() => toggleSwitch.removeEventListener("change", switchTheme))
  if (currentTheme === "dark") {
    toggleSwitch.checked = true
  }

  // Listen for changes in prefers-color-scheme
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  colorSchemeMediaQuery.addEventListener("change", themeChange)
  window.addCleanup(() => colorSchemeMediaQuery.removeEventListener("change", themeChange))
})
