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

  const placeholder = "__EMOJI_PLACEHOLDER__"
  replaceInTextNodes(document.body, /↩/g, placeholder)
  twemoji.parse(document.body)
  replaceInTextNodes(document.body, /__EMOJI_PLACEHOLDER__/g, "⤴")
})
