import { setupDarkMode } from "./darkmode"
import { setupHamburgerMenu } from "./hamburgerMenu"
import { setupScrollHandler } from "./scrollHandler"
import { setupSearch } from "./search"

function setupPondVideoHover(): void {
  const videoElement = document.getElementById("pond-video") as HTMLVideoElement | null

  if (videoElement) {
    videoElement.addEventListener("mouseenter", () => {
      void videoElement.play()
    })

    videoElement.addEventListener("mouseleave", () => {
      videoElement.pause()
    })
  }
}

// Initial setup
setupDarkMode()
setupHamburgerMenu()
setupSearch()
setupScrollHandler() // Mobile: hide navbar on scroll down, show on scroll up
setupPondVideoHover()

// Re-run setup functions after SPA navigation
document.addEventListener("nav", () => {
  setupPondVideoHover()
})
