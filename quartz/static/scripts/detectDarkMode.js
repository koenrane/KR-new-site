let theme = localStorage.getItem("saved-theme") || "auto"

// If the theme is auto, set it to the user's preference
if (theme === "auto") {
  const userPref = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  theme = userPref
}

document.documentElement.setAttribute("theme", theme)
