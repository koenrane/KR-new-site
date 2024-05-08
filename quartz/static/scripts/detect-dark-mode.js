// Immediate theme setting to prevent FOUC
;(function () {
  const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  const currentTheme = localStorage.getItem("theme") ?? userPref
  document.documentElement.setAttribute("saved-theme", currentTheme) // Using data-theme for clarity and custom attribute handling
})()
