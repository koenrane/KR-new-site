// Immediate theme setting to prevent FOUC
;(function () {
  const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  const currentTheme = localStorage.getItem("theme") ?? userPref
  document.documentElement.setAttribute("saved-theme", currentTheme) // Using data-theme for clarity and custom attribute handling

  // Emit theme change event if needed (you can define this function in your external JS if it's not used immediately)
  const emitThemeChangeEvent = (theme) => {
    const event = new CustomEvent("themechange", { detail: { theme } })
    document.dispatchEvent(event)
  }

  // If needed right away, you can call emitThemeChangeEvent(currentTheme);
  emitThemeChangeEvent(currentTheme)
})()
