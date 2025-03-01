/**
 * Opens a collapsed callout.
 * @param {Event} event The click event
 */
function openCallout(event) {
  const callout = event.currentTarget
  if (callout.classList.contains("is-collapsed")) {
    callout.classList.remove("is-collapsed")
  }
}

/**
 * Closes an open callout if clicked on title.
 * @param {Event} event The click event
 */
function closeCallout(event) {
  const title = event.currentTarget
  const callout = title.parentElement
  if (!callout.classList.contains("is-collapsed")) {
    callout.classList.add("is-collapsed")
    event.stopPropagation()
  }
}

/**
 * Initializes all collapsible callouts on the page.
 */
function setupCallout() {
  const collapsible = document.getElementsByClassName("callout is-collapsible")
  Array.from(collapsible).forEach(function (div) {
    // Add click handler to entire callout for opening
    div.addEventListener("click", openCallout)

    // We don't want content to close because that'd be annoying if the user
    // clicks on the content while reading.
    const title = div.querySelector(".callout-title")
    if (title) {
      title.addEventListener("click", closeCallout)
    }
  })
}

document.addEventListener("nav", setupCallout)
