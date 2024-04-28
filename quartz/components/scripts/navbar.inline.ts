const hamburger = document.querySelector(".hamburger")
const menu = document.querySelector(".menu")

hamburger?.addEventListener("click", () => {
  menu?.classList.toggle("visible")
})

let lastScrollTop = 0 // Variable to keep track of last scroll position

window.addEventListener(
  "scroll",
  function () {
    let currentScroll = window.pageYOffset || document.documentElement.scrollTop

    if (currentScroll > lastScrollTop) {
      // Scrolling down
      document.querySelector("nav").classList.add("hidden")
    } else {
      // Scrolling up
      document.querySelector("nav").classList.remove("hidden")
    }
    if (currentScroll <= 0) {
      // At the top of the page
      document.querySelector("nav").classList.remove("hidden")
    }

    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll // For Mobile or negative scrolling
  },
  false,
)
