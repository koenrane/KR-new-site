const normalOnReady = require("./onReady.cjs")

module.exports = async (page, scenario, vp) => {
  normalOnReady(page, scenario, vp)

  // Bring up search
  await page.click("#search-icon")

  // Wait for search to be ready
  await page.waitForSelector("input#search-bar")
  await page.click("input#search-bar")
  await page.type("input#search-bar", "Lorem Ipsum")
}
