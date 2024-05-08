document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll(
    ".center h1, .center h2, .center h3, .center h4, .center h5, .center h6",
  )
  const navLinks = document.querySelectorAll("#toc-content a")

  function onScroll() {
    let currentSection = ""

    sections.forEach((section) => {
      const sectionTop = section.offsetTop
      if (scrollY >= sectionTop - 100) {
        currentSection = section.getAttribute("id")
      }
    })

    navLinks.forEach((link) => {
      link.classList.remove("active")
      if (currentSection && link.href.includes(currentSection)) {
        link.classList.add("active")
      }
    })
  }

  window.addEventListener("scroll", onScroll)
})
