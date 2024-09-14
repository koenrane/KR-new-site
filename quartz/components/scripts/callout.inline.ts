/**
 * Toggles the collapsed state of a callout.
 * @this {HTMLElement} The title element of the callout
 */
function toggleCallout(this: HTMLElement) {
  const outerBlock = this.parentElement!
  outerBlock.classList.toggle("is-collapsed")
  const collapsed = outerBlock.classList.contains("is-collapsed")
  const height = collapsed ? this.scrollHeight : outerBlock.scrollHeight
  outerBlock.style.maxHeight = height + "px"

  // walk and adjust height of all parents
  let current = outerBlock
  let parent = outerBlock.parentElement
  while (parent) {
    if (!parent.classList.contains("callout")) {
      return
    }

    const collapsed = parent.classList.contains("is-collapsed")
    const height = collapsed ? parent.scrollHeight : parent.scrollHeight + current.scrollHeight
    parent.style.maxHeight = height + "px"

    current = parent
    parent = parent.parentElement
  }
}

/**
 * Initializes all collapsible callouts on the page.
 */
function setupCallout() {
  const collapsible = document.getElementsByClassName(
    "callout is-collapsible",
  ) as HTMLCollectionOf<HTMLElement>
  for (const div of collapsible) {
    const title = div.firstElementChild

    if (title) {
      title.addEventListener("click", toggleCallout)
      window.addCleanup(() => title.removeEventListener("click", toggleCallout))

      // only set this if the max height isn't already set
      //  This is a little hacky because to avoid FOUC,
      //  you have to manually set the max height of the callout to the height of the title
      if (!div.style.maxHeight) {
        const collapsed = div.classList.contains("is-collapsed")
        const height = collapsed ? title.scrollHeight : div.scrollHeight
        div.style.maxHeight = height + "px"
      }
    }
  }
}

document.addEventListener("nav", setupCallout)
window.addEventListener("resize", setupCallout)
