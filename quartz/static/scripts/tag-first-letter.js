function updateFirstParagraph() {
  const paragraphs = document.querySelectorAll("article > p:first-of-type")
  paragraphs.forEach((paragraph) => {
    const firstLetter = paragraph.textContent.charAt(0)
    paragraph.setAttribute("data-first-letter", firstLetter)

    // If the first letter is an apostrophe, add a space before it
    const secondLetter = paragraph.textContent.charAt(1)
    if (secondLetter === "'" || secondLetter === "’") {
      // Find the second letter's text node
      let secondLetterNode = paragraph.firstChild
      secondLetterNode.textContent = firstLetter + " " + secondLetterNode.textContent.slice(1)
    }
  })
}

document.addEventListener("DOMContentLoaded", function () {
  // Call the function initially to set the attribute on page load
  updateFirstParagraph()

  // Create a MutationObserver to watch for changes in the DOM
  const observer = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (
        mutation.type === "childList" ||
        mutation.type === "subtree" ||
        mutation.type === "characterData"
      ) {
        updateFirstParagraph()
      }
    }
  })

  // Configuration for the observer
  const config = { childList: true, subtree: true, characterData: true }

  // Start observing the target node for configured mutations
  observer.observe(document.body, config)
})
