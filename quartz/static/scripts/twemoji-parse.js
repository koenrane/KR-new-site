document.addEventListener("DOMContentLoaded", () => {
  const placeholder = "__EMOJI_PLACEHOLDER__"

  // Get the HTML content of the body
  let bodyHTML = document.body.innerHTML

  // Perform the replacements on the HTML string
  bodyHTML = bodyHTML.replace(/↩/g, placeholder)
  bodyHTML = twemoji.parse(bodyHTML, { callback: twemoji.convert.toImage })
  const regexPlaceholder = /__EMOJI_PLACEHOLDER__/g
  bodyHTML = bodyHTML.replace(regexPlaceholder, "⤴")

  // Update the body's HTML with the modified content
  document.body.innerHTML = bodyHTML
})
