const criticalCSS = document.querySelector("head style")
if (criticalCSS && criticalCSS.length > 1) {
  console.warn("More than one style tag found - can't remove critical CSS, if it exists")
} else if (!criticalCSS) {
  console.warn("No style tag found - can't remove critical CSS, if it exists")
}

const link = document.querySelector('head link[href*="index.css"]')
if (link.href && !link.loaded) {
  link.addEventListener("load", () => {
    criticalCSS.remove()
  })
} else {
  criticalCSS.remove()
}
