document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll(".center h1, .center h2, .center h3")
  const navLinks = document.querySelectorAll("#toc-content a")

  function onScroll() {
    let currentSection = ""

    sections.forEach((section) => {
      const sectionTop = section.offsetTop
      if (scrollY + 300 >= sectionTop) {
        currentSection = section.getAttribute("id")
      }
    })

    navLinks.forEach((link) => {
      link.classList.remove("active")
      if (currentSection && link.href.endsWith(currentSection)) {
        link.classList.add("active")
      }
    })
  }

  window.addEventListener("scroll", onScroll)
})
