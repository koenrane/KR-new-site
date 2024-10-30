Promise.all(
  Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((link) => {
    if (link.href && !link.loaded) {
      return new Promise((resolve, reject) => {
        link.addEventListener("load", resolve)
        link.addEventListener("error", reject)
      })
    }
    return Promise.resolve()
  }),
)
  .then(() => {
    // Only select from the head
    const criticalStyle = document.querySelector("head style")
    if (criticalStyle && criticalStyle.length > 1) {
      throw new Error("More than one critical style tag found")
    } else if (criticalStyle) {
      criticalStyle.remove()
    }
  })
  .catch((err) => console.error("Error removing critical CSS:", err))
