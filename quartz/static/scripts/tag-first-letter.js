document.addEventListener("DOMContentLoaded", function () {
  const firstParagraph = document.querySelector("article > p:first-of-type")
  const firstLetter = firstParagraph.textContent.trim().charAt(0)
  firstParagraph.setAttribute("data-first-letter", firstLetter)
})
