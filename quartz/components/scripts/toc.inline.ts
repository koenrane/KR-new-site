document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll<HTMLElement>(".center h1, .center h2, .center h3")
  const navLinks = document.querySelectorAll<HTMLAnchorElement>("#toc-content a")

  let ticking = false

  function updateActiveLink() {
    let currentSection = ""
    const scrollPosition = window.scrollY + window.innerHeight / 3

    sections.forEach((section) => {
      const sectionTop = section.offsetTop
      if (scrollPosition >= sectionTop) {
        currentSection = section.id
      }
    })

    navLinks.forEach((link) => {
      link.classList.remove("active")
      const slug = link.href.split("#")[1]
      if (currentSection && slug === currentSection) {
        link.classList.add("active")
      }
    })
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateActiveLink()
        ticking = false
      })
      ticking = true
    }
  }

  window.addEventListener("scroll", onScroll)

  // Initial call to set active link on page load
  updateActiveLink()

  // Cleanup function
  return () => {
    window.removeEventListener("scroll", onScroll)
  }
})
