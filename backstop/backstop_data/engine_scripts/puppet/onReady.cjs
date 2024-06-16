// backstop_data/engine_scripts/puppet/onReady.cjs
const clickAndHoverHelper = require("./clickAndHoverHelper.cjs")

module.exports = async (page, scenario) => {
  await page.waitForSelector("body", { timeout: 5000 })
  clickAndHoverHelper(page, scenario)

  await page.waitForSelector("#header-video") // TODO kinda hacky
  await page.evaluate(() => {
    const hideMediaTypes = [".gif", ".mp4", ".webm"]

    document.querySelectorAll("img, video").forEach((img) => {
      const src = img?.src || img?.children[0]?.src
      if (hideMediaTypes.some((ext) => src.endsWith(ext))) {
        img.style.visibility = "hidden"
      }
    })
  })
}
