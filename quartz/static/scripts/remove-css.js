function removeCSS() {
  const hideBodyStyle = document.querySelector("#hide-body")
  if (hideBodyStyle) {
    hideBodyStyle.remove()
    console.info("Removed hide body style")
  } else {
    console.warn("Hide body style element not found")
  }

  const style = document.querySelector("#critical-css")
  if (style) {
    style.remove()
    console.info("Removed critical styles")
  } else {
    console.warn("Critical style element not found")
  }
}

const mainCSS = document.querySelector('link[href="/index.css"]')
if (mainCSS) {
  removeCSS()
} else {
  document.addEventListener("DOMContentLoaded", removeCSS)
}
