function attemptPlayVideos() {
  const videos = document.querySelectorAll("video[autoplay]")
  videos.forEach((video) => {
    // Ensure video is muted (Safari requirement)
    video.muted = true
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log("Autoplay prevented:", error)
      })
    }
  })
}

// Try to play videos on initial page load
document.addEventListener("DOMContentLoaded", attemptPlayVideos)

// Try to play videos on SPA navigation
document.addEventListener("nav", attemptPlayVideos)

// Also try on any user interaction
;["click", "scroll", "touchstart", "mouseover"].forEach((event) => {
  document.addEventListener(event, attemptPlayVideos, { once: true })
})
