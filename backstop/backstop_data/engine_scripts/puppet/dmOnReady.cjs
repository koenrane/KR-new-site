const normalOnReady = require("./onReady.cjs")

module.exports = async (page, scenario, vp) => {
  await normalOnReady(page, scenario, vp)

  // Wait for the crucial "nav" event to fire
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const navHandler = () => {
        document.removeEventListener("nav", navHandler) // Cleanup immediately
        resolve()
      }
      document.addEventListener("nav", navHandler)
    })
  })

  // Wait for the checkbox to be visible (if necessary)
  await page.waitForSelector("span.darkmode #darkmode-toggle", { visible: true })

  // Trigger the change event on the checkbox
  await page.evaluate(() => {
    const toggleSwitch = document.querySelector("#darkmode-toggle")
    if (toggleSwitch) {
      toggleSwitch.dispatchEvent(new Event("change"))
    }
  })

  // Wait for the dark mode class to be applied (adjust the selector)
  await page.waitForSelector('html[saved-theme="dark"]', { timeout: 5000 })
}
