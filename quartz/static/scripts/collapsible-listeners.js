function collapseHandler() {
  const foldIcon = this.querySelector(".fold-icon")
  const content = this.querySelector(".content")

  content?.classList.toggle("active")
  foldIcon.setAttribute("aria-expanded", this.classList.contains("active"))

  if (content) {
    content.style.maxHeight = content.classList.contains("active")
      ? content.scrollHeight + "px"
      : null
  }
}

document.addEventListener("DOMContentLoaded", function () {
  let collapsibles = document.getElementsByClassName("collapsible")

  for (let collapsible of collapsibles) {
    const foldIcon = collapsible.querySelector(".fold-icon")
    const title = collapsible.querySelector(".collapsible-title")
    title.addEventListener("click", collapseHandler.bind(collapsible))
    window.addCleanup(() => {
      title.removeEventListener("click", collapseHandler.bind(collapsible))
    })
  }
})
