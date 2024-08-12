function isSafari() {
  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.includes("safari")
}

const altText = "A goose and a trout play in a pond in front of a castle."
function loadAppropriateVideo() {
  const container = document.getElementById("header-video-container")

  if (isSafari()) {
    container.innerHTML = `<img src="https://assets.turntrout.com/static/pond.gif" alt=${altText}>`
  } else {
    container.innerHTML = `<video autoPlay loop muted playsInline id="header-video" class="header-img no-select no-vsc" alt=${altText}> <source src="https://assets.turntrout.com/static/pond.webm" type="video/webm"></source> </video>`
  }
}

// Call this function when the page loads
window.addEventListener("load", loadAppropriateVideo)
