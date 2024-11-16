function toggleShadowNavbar() {
  const navbar = document.querySelector("#navbar")
  if (!navbar) return
  navbar.classList.toggle("shadow", window.scrollY > 5)
}

function scrollDisplayUpdate() {
  let lastScrollY = window.scrollY
  let ticking = false
  const scrollThreshold = 50 // Minimum scroll distance before toggle

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY
        const delta = currentScrollY - lastScrollY

        toggleShadowNavbar()

        if (Math.abs(delta) > scrollThreshold) {
          if (delta > 0) {
            document.getElementById("navbar")?.classList.add("hide-above-screen")
          } else {
            document.getElementById("navbar")?.classList.remove("hide-above-screen")
          }
          lastScrollY = currentScrollY
        }

        ticking = false
      })
      ticking = true
    }
  })
}

// Event listeners
export function setupScrollHandler() {
  ;["scroll", "touchmove"].forEach((event: string) => {
    window.addEventListener(event, scrollDisplayUpdate)
  })
}
