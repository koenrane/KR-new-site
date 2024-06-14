// backstop_data/engine_scripts/puppet/onReady.cjs
const clickAndHoverHelper = require("./clickAndHoverHelper.cjs")

module.exports = async (page, scenario, vp) => {
  await page.waitForSelector("body", { timeout: 5000 })
  clickAndHoverHelper(page, scenario)

  // Add a delay to wait for a specific frame -- synchronize GIFs
  await page.evaluate(() => {
    document.querySelectorAll("img").forEach((img) => {
      if (img.src.endsWith(".gif")) {
        img.style.visibility = "hidden"
      }
    })
  })
}
