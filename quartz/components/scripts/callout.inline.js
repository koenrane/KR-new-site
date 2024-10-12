/**
 * Toggles the collapsed state of a callout.
 * @this {HTMLElement} The title element of the callout
 */
function toggleCallout() {
  const outerBlock = this.parentElement
  outerBlock.classList.toggle("is-collapsed")
}

/**
 * Initializes all collapsible callouts on the page.
 */
function setupCallout() {
  const collapsible = document.getElementsByClassName("callout is-collapsible")
  Array.from(collapsible).forEach(function (div) {
    const title = div.firstElementChild
    if (title) {
      title.addEventListener("click", toggleCallout)

      window.addCleanup(() => {
        title.removeEventListener("click", toggleCallout)
      })
    }
  })
}

// function updateCalloutHeights() {
//   const collapsible = document.getElementsByClassName("callout is-collapsible")
//   Array.from(collapsible).forEach(function (div) {
//     const title = div.firstElementChild
//     const content = div.lastElementChild
//     const collapsed = div.classList.contains("is-collapsed")

//     // Remove any existing inline max-height
//     div.style.maxHeight = ""
//     content.style.maxHeight = ""

//     // Calculate the correct height
//     const height = collapsed ? title.offsetHeight : div.scrollHeight

//     // Set the new max-height
//     div.style.maxHeight = `${height}px`
//     if (!collapsed) {
//       content.style.maxHeight = `${content.scrollHeight}px`
//     }
//   })
// }

// // Function to handle resize events
// function handleResize() {
//   updateCalloutHeights()
// }

document.addEventListener("nav", setupCallout)
// window.addEventListener("resize", handleResize)
