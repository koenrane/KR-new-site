function attemptPlayVideos() {
  const videos = document.querySelectorAll("video[autoplay]")
  videos.forEach((video) => {
    // Ensure video is muted (Safari requirement)
    video.muted = true

    // Attempt to play
    const playPromise = video.play()

    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log("Autoplay prevented:", error)
      })
    }
  })
}

// Try to play videos as soon as possible
document.addEventListener("DOMContentLoaded", attemptPlayVideos)

// Also try on any user interaction
;["click", "scroll", "touchstart", "mouseover"].forEach((event) => {
  document.addEventListener(event, attemptPlayVideos, { once: true })
})
