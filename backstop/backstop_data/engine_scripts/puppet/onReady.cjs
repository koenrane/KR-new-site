// backstop_data/engine_scripts/puppet/onReady.cjs
const clickAndHoverHelper = require("./clickAndHoverHelper.cjs")

module.exports = async (page, scenario) => {
  await page.waitForSelector("body", { timeout: 500 })
  clickAndHoverHelper(page, scenario)

  await page.waitForSelector("#header-video") // TODO kinda hacky
  await page.evaluate(() => {
    const hideMediaTypes = [".gif", ".mp4", ".webm"]

    document.querySelectorAll("img, video").forEach((img) => {
      const src = img?.src || img?.children[0]?.src
      if (hideMediaTypes.some((ext) => src.endsWith(ext))) {
        img.style.visibility = "hidden"
      }
      // Backstop doesn't support AVIF for some reason
      if (src.endsWith(".avif")) {
        if (img?.src) {
          img.src = src.replace(".avif", ".png")
        } else {
          img.children[0].src = src.replace(".avif", ".png")
        }
      }
    })
  })

  // Prevent logging spam
  page.on("console", (msg) => {
    if (msg.text().includes("JSHandle:BackstopTools")) {
      return
    }
    console.log(msg.text())
  })
}
