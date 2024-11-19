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
  if (mainCSS.sheet && mainCSS.sheet.cssRules.length > 0) {
    removeCSS()
  } else {
    mainCSS.addEventListener("load", removeCSS)
  }
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const mainCSS = document.querySelector('link[href="/index.css"]')
    if (mainCSS) {
      if (mainCSS.sheet && mainCSS.sheet.cssRules.length > 0) {
        removeCSS()
      } else {
        mainCSS.addEventListener("load", removeCSS)
      }
    } else {
      removeCSS()
    }
  })
}
