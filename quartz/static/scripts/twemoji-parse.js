const placeholder = "__EMOJI_PLACEHOLDER__"

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

function wrappedParseTwemoji(element) {
  replaceInTextNodes(element, /↩/g, placeholder)
  twemoji.parse(element)
  replaceInTextNodes(element, /__EMOJI_PLACEHOLDER__/g, "⤴")
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeOut(100)
  wrappedParseTwemoji(document.body)
})
