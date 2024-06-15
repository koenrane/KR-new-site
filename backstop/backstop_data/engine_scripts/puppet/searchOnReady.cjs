const normalOnReady = require("./onReady.cjs")

module.exports = async (page, scenario, vp) => {
  normalOnReady(page, scenario, vp)

  // Bring up search
  await page.waitForSelector("#search-icon")
  await page.click("#search-icon")

  // Wait for search to be ready
  await page.waitForSelector("input#search-bar")
  await page.evaluate(() => {
    const searchBar = document.querySelector("input#search-bar")
    console.log(searchBar)
    searchBar.click()
  })
  // await page.click("input#search-bar")
  // console.log("search bar clicked")
  await page.type("input#search-bar", "Lorem Ipsum")
}
