document.addEventListener("DOMContentLoaded", () => {
  function replaceInTextNodes(element, search, replacement) {
    for (let node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Check if it's a text node
        node.textContent = node.textContent.replace(search, replacement)
      } else {
        replaceInTextNodes(node, search, replacement) // Recurse into child elements
      }
    }
  }

  replaceInTextNodes(document.body, /↩/g, "⤴")
  twemoji.parse(document.body) // Apply Twemoji after the replacement
})
