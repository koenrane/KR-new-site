document.addEventListener("DOMContentLoaded", () => {
  const placeholder = "__EMOJI_PLACEHOLDER__"

  // Get the HTML content of the body
  let bodyHTML = document.body.innerHTML

  // Perform the replacements on the HTML string
  bodyHTML = bodyHTML.replace(/↩/g, placeholder)
  twemoji.parse(bodyHTML)
  const regexPlaceholder = /__EMOJI_PLACEHOLDER__/g
  bodyHTML = bodyHTML.replace(regexPlaceholder, "⤴")

  // Update the body's HTML with the modified content
  document.body.innerHTML = bodyHTML
})
